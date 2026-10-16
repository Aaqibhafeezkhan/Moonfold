import {
  CommandId,
  MessageId,
  type ProjectId,
  type ThreadId,
  type ThreadMoveToWorktreeInput,
  type ThreadReturnToProjectResult,
  WorktreeMcpFailure,
  type WorktreeMcpContinuationStatus,
  type WorktreeMcpHandoffInput,
  type WorktreeMcpHandoffResult,
  type WorktreeMcpSetupScriptStatus,
  type WorktreeMcpStatusResult,
} from "@moonfold/contracts";
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Crypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";

import * as GitWorkflowService from "../git/GitWorkflowService.ts";
import * as ThreadManagementService from "../orchestration-v2/ThreadManagementService.ts";
import * as ProjectService from "../project/ProjectService.ts";
import * as ProjectSetupScriptRunner from "../project/ProjectSetupScriptRunner.ts";
import * as ServerSettings from "../serverSettings.ts";
import * as VcsStatusBroadcaster from "../vcs/VcsStatusBroadcaster.ts";
import type { McpInvocationScope, McpThreadCaller } from "./McpInvocationContext.ts";
import * as GitVcsDriver from "../vcs/GitVcsDriver.ts";

/** The thread a handoff moves, and the seed its command ids derive from. */
interface HandoffTarget {
  readonly thread: Pick<McpThreadCaller, "threadId" | "providerSessionId">;
}

export class WorktreeMcpService extends Context.Service<
  WorktreeMcpService,
  {
    readonly handoff: (
      scope: McpInvocationScope,
      input: WorktreeMcpHandoffInput,
    ) => Effect.Effect<WorktreeMcpHandoffResult, WorktreeMcpFailure>;
    readonly status: (
      scope: McpInvocationScope,
    ) => Effect.Effect<WorktreeMcpStatusResult, WorktreeMcpFailure>;
    /**
     * The user moves an idle thread from the project folder into a new worktree or an existing
     * one, optionally with the folder's uncommitted changes.
     */
    readonly moveToNewWorktree: (
      input: ThreadMoveToWorktreeInput,
    ) => Effect.Effect<WorktreeMcpHandoffResult, WorktreeMcpFailure>;
    /**
     * The user brings an idle thread's worktree work back to the project checkout: the worktree
     * branch is merged into the checkout's branch, uncommitted changes come over, and the thread
     * points at the project folder again. The checkout must be clean, so a failure undoes itself.
     */
    readonly returnToProject: (
      threadId: ThreadId,
    ) => Effect.Effect<ThreadReturnToProjectResult, WorktreeMcpFailure>;
  }
>()("moonfold/mcp/WorktreeMcpService") {}

function failure(code: WorktreeMcpFailure["code"], message: string): WorktreeMcpFailure {
  return new WorktreeMcpFailure({ code, message });
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

const asOperationFailed = (prefix: string) =>
  Effect.mapError((error: unknown) =>
    failure("operation_failed", `${prefix}: ${errorMessage(error)}`),
  );

const make = Effect.gen(function* () {
  const crypto = yield* Crypto.Crypto;
  const path = yield* Path.Path;
  const threadManagement = yield* ThreadManagementService.ThreadManagementService;
  const projects = yield* ProjectService.ProjectService;
  const serverSettings = yield* ServerSettings.ServerSettingsService;
  const gitWorkflow = yield* GitWorkflowService.GitWorkflowService;
  const setupScriptRunner = yield* ProjectSetupScriptRunner.ProjectSetupScriptRunner;
  const vcsStatusBroadcaster = yield* VcsStatusBroadcaster.VcsStatusBroadcaster;
  const git = yield* GitVcsDriver.GitVcsDriver;

  const runGit = (cwd: string, args: ReadonlyArray<string>) =>
    git
      .execute({ operation: `WorktreeTransfer.${args[0]}`, cwd, args })
      .pipe(asOperationFailed(`git ${args.join(" ")} failed in ${cwd}`));

  const hasUncommittedChanges = (cwd: string) =>
    runGit(cwd, ["status", "--porcelain"]).pipe(
      Effect.map((result) => result.stdout.trim().length > 0),
    );

  /**
   * Moves uncommitted work (tracked and untracked) from one checkout of the repository to
   * another through the shared stash. `to` must start clean: when the work does not apply
   * there, the partial apply is discarded and the work returns to `from`.
   */
  const carryUncommittedChanges = Effect.fn("WorktreeMcpService.carryUncommittedChanges")(
    function* (from: string, to: string) {
      if (!(yield* hasUncommittedChanges(from))) return false;
      yield* runGit(from, [
        "stash",
        "push",
        "--include-untracked",
        "--message",
        "moonfold: move uncommitted changes",
      ]);
      const applied = yield* git
        .execute({
          operation: "WorktreeTransfer.apply",
          cwd: to,
          args: ["stash", "apply"],
          allowNonZeroExit: true,
        })
        .pipe(asOperationFailed(`git stash apply failed in ${to}`));
      if (applied.exitCode !== 0) {
        yield* runGit(to, ["reset", "--hard", "HEAD"]);
        yield* runGit(to, ["clean", "-fd"]);
        yield* runGit(from, ["stash", "pop"]);
        return yield* failure(
          "operation_failed",
          `The uncommitted changes in ${from} do not apply cleanly in ${to}; they were left where they were.`,
        );
      }
      yield* runGit(from, ["stash", "drop"]);
      return true;
    },
  );

  // Serializes handoffs per thread: two concurrent calls could otherwise both
  // pass the worktreePath === null check and each create a worktree, leaving
  // one untracked on disk.
  const handoffThreadsInFlight = new Set<string>();

  // Worktree tools act on the calling thread's own checkout binding.
  const requireThreadScope = (scope: McpInvocationScope) =>
    scope.thread === undefined
      ? Effect.fail(
          failure(
            "thread_credential_required",
            "Worktree handoff and status act as the calling Moonfold thread, so they need an agent running inside Moonfold.",
          ),
        )
      : Effect.succeed(scope as McpInvocationScope & { readonly thread: McpThreadCaller });

  const requireCapability = (scope: McpInvocationScope) =>
    scope.capabilities.has("worktree")
      ? Effect.void
      : Effect.fail(
          failure("capability_denied", "This MCP credential does not grant worktree capabilities."),
        );

  const loadThread = (scope: HandoffTarget) =>
    threadManagement.getThreadRecords(scope.thread.threadId, []).pipe(
      Effect.mapError((error) =>
        error._tag === "OrchestratorProjectionError"
          ? failure("thread_not_found", `Thread '${scope.thread.threadId}' was not found.`)
          : failure(
              "operation_failed",
              `Unable to read thread ${scope.thread.threadId}: ${errorMessage(error)}`,
            ),
      ),
      Effect.filterOrFail(
        (projection) => projection.thread.deletedAt === null,
        () => failure("thread_not_found", `Thread '${scope.thread.threadId}' was not found.`),
      ),
    );

  const loadProject = (scope: HandoffTarget, projectId: ProjectId) =>
    projects.getById(projectId).pipe(
      asOperationFailed(`Unable to read project ${projectId}`),
      Effect.flatMap(
        Option.match({
          onNone: () =>
            Effect.fail(
              failure(
                "project_not_found",
                `Project '${projectId}' was not found for thread '${scope.thread.threadId}'.`,
              ),
            ),
          onSome: Effect.succeed,
        }),
      ),
    );

  const readDefaultStartFromOrigin = serverSettings.getSettings.pipe(
    Effect.map((settings) => settings.newWorktreesStartFromOrigin),
    asOperationFailed("Unable to read server settings"),
  );

  const handoffIds = (scope: HandoffTarget) =>
    crypto.randomUUIDv4().pipe(
      Effect.map((uuid) => {
        const part = (kind: string, operation: string) =>
          [kind, "mcp", encodeURIComponent(scope.thread.providerSessionId), operation, uuid].join(
            ":",
          );
        return {
          commandId: CommandId.make(part("command", "worktree-handoff")),
          continuationCommandId: CommandId.make(part("command", "worktree-continuation")),
          continuationMessageId: MessageId.make(part("message", "worktree-continuation")),
        };
      }),
      Effect.orDie,
    );

  const performHandoff = Effect.fn("WorktreeMcpService.performHandoff")(function* (
    scope: HandoffTarget,
    input: WorktreeMcpHandoffInput,
    options: { readonly carryChanges?: boolean } = {},
  ) {
    const alreadyInWorktree = (worktreePath: string) =>
      failure(
        "already_in_worktree",
        `Thread '${scope.thread.threadId}' is already attached to worktree '${worktreePath}'.`,
      );

    const projection = yield* loadThread(scope);
    if (projection.thread.worktreePath !== null) {
      return yield* alreadyInWorktree(projection.thread.worktreePath);
    }
    // An archived thread would accept the binding but refuse the continuation
    // message (and any other follow-up), so reject the handoff outright.
    if (projection.thread.archivedAt !== null) {
      return yield* failure(
        "invalid_request",
        `Thread '${scope.thread.threadId}' is archived and cannot be handed off to a worktree.`,
      );
    }

    const project = yield* loadProject(scope, projection.thread.projectId);
    const projectCwd = project.workspaceRoot;

    if (input.path !== undefined && !path.isAbsolute(input.path)) {
      return yield* failure(
        "invalid_request",
        `path must be an absolute filesystem path, got '${input.path}'. A relative path would be created relative to the project workspace but stored verbatim as the thread's worktree binding.`,
      );
    }

    // The repo check runs regardless of whether baseRef was supplied, so a
    // non-repository workspace fails with an actionable error instead of an
    // opaque git failure further down.
    const localStatus = yield* gitWorkflow
      .localStatus({ cwd: projectCwd })
      .pipe(asOperationFailed("Unable to read git status"));
    if (!localStatus.isRepo) {
      return yield* failure(
        "invalid_request",
        `Project workspace '${projectCwd}' is not a git repository.`,
      );
    }

    // Fail fast with an actionable message when the branch already exists:
    // the git driver deliberately keeps stderr out of its errors, so letting
    // `git worktree add` fail would surface only an opaque failure. The
    // existence check uses the complete local branch list (exact match); the
    // paginated substring search only enriches the message with the checkout
    // location when available.
    const localBranchNames = yield* gitWorkflow
      .listLocalBranchNames(projectCwd)
      .pipe(asOperationFailed("Unable to list branches"));
    if (localBranchNames.includes(input.branch)) {
      const existingRef = yield* gitWorkflow
        .listRefs({ cwd: projectCwd, query: input.branch, refKind: "local" })
        .pipe(
          Effect.map((result) =>
            result.refs.find((ref) => ref.name === input.branch && ref.isRemote !== true),
          ),
          Effect.orElseSucceed(() => undefined),
        );
      const checkoutPath = existingRef?.worktreePath ?? null;
      return yield* failure(
        "invalid_request",
        `Branch '${input.branch}' already exists${
          checkoutPath === null ? "" : ` and is checked out at '${checkoutPath}'`
        }. Choose a different branch name, or delete the existing branch${
          checkoutPath === null ? "" : " and its worktree"
        } first.`,
      );
    }

    let baseRef = input.baseRef;
    if (baseRef === undefined) {
      if (localStatus.refName === null) {
        return yield* failure(
          "invalid_request",
          "Could not determine the current branch of the project workspace (detached HEAD?). Pass baseRef explicitly.",
        );
      }
      baseRef = localStatus.refName;
    }

    const startFromOrigin = input.startFromOrigin ?? (yield* readDefaultStartFromOrigin);

    let worktreeBaseRef = baseRef;
    if (startFromOrigin) {
      yield* gitWorkflow
        .fetchRemote({ cwd: projectCwd, remoteName: "origin" })
        .pipe(asOperationFailed("Unable to fetch origin"));
      const resolvedRemoteBase = yield* gitWorkflow
        .resolveRemoteTrackingCommit({
          cwd: projectCwd,
          refName: baseRef,
          fallbackRemoteName: "origin",
        })
        .pipe(asOperationFailed(`Unable to resolve the remote-tracking commit of '${baseRef}'`));
      worktreeBaseRef = resolvedRemoteBase.commitSha;
    }

    const ids = yield* handoffIds(scope);

    // uninterruptibleMask: only the potentially slow worktree creation itself
    // stays interruptible (restore). From the moment it succeeds, through the
    // binding, continuation queue, setup script launch, and result
    // construction, there is no interruptible gap: a client cancel can
    // therefore neither orphan the created worktree before the rollback is
    // armed, nor skip setting up a worktree the thread was just bound to
    // (once the binding commits, the scheduled session detach can sever this
    // request's connection and interrupt the fiber).
    return yield* Effect.uninterruptibleMask((restore) =>
      Effect.gen(function* () {
        const worktree = yield* restore(
          gitWorkflow
            .createWorktree({
              cwd: projectCwd,
              refName: worktreeBaseRef,
              newRefName: input.branch,
              baseRefName: baseRef,
              path: input.path ?? null,
            })
            .pipe(asOperationFailed("Unable to create the worktree")),
        );
        const worktreePath = worktree.worktree.path;

        // Shared shape for "the handoff already succeeded, so report the failure
        // in the result instead of failing the call" (continuation, setup script).
        const reportFailed = (logMessage: string) =>
          Effect.catchCause((cause: Cause.Cause<unknown>) => {
            const detail = errorMessage(Cause.squash(cause));
            return Effect.logWarning(logMessage, {
              threadId: scope.thread.threadId,
              worktreePath,
              detail,
            }).pipe(Effect.as({ status: "failed", detail } as const));
          });

        // suspend: build the rollback only if cleanup actually runs. Removing
        // the worktree must succeed before deleting its freshly created branch;
        // otherwise the branch may still be checked out there.
        const removeCreatedWorktree = Effect.suspend(() =>
          gitWorkflow.removeWorktree({ cwd: projectCwd, path: worktreePath, force: true }).pipe(
            Effect.andThen(
              Effect.suspend(() =>
                gitWorkflow.deleteLocalBranch({
                  cwd: projectCwd,
                  refName: worktree.worktree.refName,
                  force: true,
                }),
              ),
            ),
          ),
        ).pipe(Effect.ignoreCause({ log: true }));

        // Moving a thread takes its uncommitted work along when asked. A failure puts the work
        // back in the project checkout and removes the new worktree.
        if (options.carryChanges === true) {
          yield* carryUncommittedChanges(projectCwd, worktreePath).pipe(
            Effect.onError((cause) =>
              Cause.hasInterruptsOnly(cause) ? Effect.void : removeCreatedWorktree,
            ),
          );
        }

        const recheckAndBind = Effect.gen(function* () {
          // The projection was read before the potentially slow git work
          // above; a concurrent binding (for example from the UI) could have
          // attached the thread in the meantime. Re-check before committing so
          // the race cannot leave a second, untracked worktree.
          const recheck = yield* loadThread(scope);
          if (recheck.thread.worktreePath !== null) {
            return yield* alreadyInWorktree(recheck.thread.worktreePath);
          }
          // Mirror the up-front archived check: the thread may have been
          // archived during the slow git work, and an archived thread must
          // not be bound to a fresh worktree it can never use.
          if (recheck.thread.archivedAt !== null) {
            return yield* failure(
              "invalid_request",
              `Thread '${scope.thread.threadId}' was archived while the worktree was being created; the handoff was rolled back.`,
            );
          }
          yield* threadManagement
            .dispatch({
              type: "thread.metadata.update",
              commandId: ids.commandId,
              threadId: scope.thread.threadId,
              branch: worktree.worktree.refName,
              worktreePath,
              expectedWorktreePath: null,
            })
            .pipe(
              Effect.catchCause((cause) =>
                // Interrupt-only causes propagate unchanged: whether the
                // dispatch committed is unknown, so neither a typed failure
                // nor a rollback would be correct. Failures and defects
                // (including mixed causes) map to a typed operation_failed.
                Cause.hasInterruptsOnly(cause)
                  ? Effect.failCause(cause as Cause.Cause<never>)
                  : Effect.fail(
                      failure(
                        "operation_failed",
                        `Unable to re-point the thread at the worktree: ${errorMessage(Cause.squash(cause))}`,
                      ),
                    ),
              ),
            );
        }).pipe(
          // onError: the worktree was already created, so any failure between
          // here and the committed binding (recheck read, recheck race,
          // dispatch typed failure or defect) must remove it again so a failed
          // handoff leaves nothing behind on disk. Interrupt-only causes skip
          // the removal: the binding may have committed, and force-deleting a
          // worktree the thread now points at would be worse than leaking one.
          Effect.onError((cause) =>
            Cause.hasInterruptsOnly(cause) ? Effect.void : removeCreatedWorktree,
          ),
        );

        // Queue the continuation right after the binding commits: the detach
        // that the metadata update schedules will terminate the calling
        // session, and a durably queued message is what guarantees the thread
        // re-launches inside the worktree. When the dying run reaches a
        // terminal state the orchestrator promotes the queued run, which
        // derives its cwd from the updated projection.
        // suspend: build the send effect only when the binding has succeeded,
        // so a failed dispatch never even constructs the continuation call.
        const queueContinuation: Effect.Effect<WorktreeMcpContinuationStatus, WorktreeMcpFailure> =
          Effect.suspend(() =>
            input.continuationPrompt === undefined
              ? Effect.succeed<WorktreeMcpContinuationStatus>({ status: "skipped" })
              : threadManagement
                  .sendToThread({
                    projectId: projection.thread.projectId,
                    commandId: ids.continuationCommandId,
                    threadId: scope.thread.threadId,
                    messageId: ids.continuationMessageId,
                    text: input.continuationPrompt,
                    attachments: [],
                    mode: "queue",
                    createdBy: "agent",
                    creationSource: "mcp",
                  })
                  .pipe(
                    Effect.map((sendResult): WorktreeMcpContinuationStatus => ({
                      status: "scheduled",
                      delivery: sendResult.delivery,
                    })),
                    // catchCause via reportFailed: the binding is already recorded,
                    // so a failed continuation must be reported, not fail the handoff.
                    reportFailed("worktree handoff continuation failed to queue"),
                  ),
          );

        const continuation = yield* recheckAndBind.pipe(Effect.andThen(queueContinuation));

        yield* vcsStatusBroadcaster
          .refreshStatus(worktreePath)
          .pipe(Effect.ignoreCause({ log: true }), Effect.forkDetach);

        let setupScript: WorktreeMcpSetupScriptStatus = { status: "skipped" };
        if (input.runSetupScript ?? true) {
          setupScript = yield* setupScriptRunner
            .runForThread({
              threadId: scope.thread.threadId,
              projectId: projection.thread.projectId,
              projectCwd,
              worktreePath,
              project: {
                id: project.id,
                workspaceRoot: project.workspaceRoot,
                scripts: project.scripts,
              },
            })
            .pipe(
              Effect.map((result): WorktreeMcpSetupScriptStatus =>
                result.status === "started"
                  ? {
                      status: "started",
                      scriptName: result.scriptName,
                      terminalId: result.terminalId,
                    }
                  : { status: "no-script" },
              ),
              // catchCause via reportFailed: the thread is already re-pointed at the
              // worktree, so even a defect in the setup runner must not fail the handoff.
              reportFailed("worktree handoff setup script failed"),
            );
        }

        const result: WorktreeMcpHandoffResult = {
          worktreePath,
          branch: worktree.worktree.refName,
          baseRef,
          startedFromOrigin: startFromOrigin,
          setupScript,
          continuation,
          note:
            continuation.status === "scheduled"
              ? "Handoff recorded. Changing the workspace detaches this provider session, so the current turn ends shortly after this call; the queued continuation prompt then starts the next turn inside the worktree with the conversation preserved. The worktree is not removed automatically when the thread is deleted."
              : "Handoff recorded. Changing the workspace detaches this provider session, so the current turn ends shortly after this call; the conversation continues inside the worktree when the thread receives its next message. Pass continuationPrompt to resume automatically. The worktree is not removed automatically when the thread is deleted.",
        };
        return result;
      }),
    );
  });

  // One workspace change per thread at a time. uninterruptibleMask: the guard acquisition and
  // the registration of the releasing finalizer happen with no interruptible gap in between. An
  // interrupt landing between a bare add() and the start of an ensured effect would otherwise
  // leak the guard entry and block every future handoff for this thread until restart.
  const exclusively = <A>(
    threadId: ThreadId,
    effect: Effect.Effect<A, WorktreeMcpFailure>,
  ): Effect.Effect<A, WorktreeMcpFailure> =>
    Effect.uninterruptibleMask((restore) =>
      Effect.suspend(() => {
        if (handoffThreadsInFlight.has(threadId)) {
          return Effect.fail(
            failure(
              "handoff_in_progress",
              `A worktree handoff is already in progress for thread '${threadId}'.`,
            ),
          );
        }
        handoffThreadsInFlight.add(threadId);
        return restore(effect).pipe(
          Effect.ensuring(Effect.sync(() => handoffThreadsInFlight.delete(threadId))),
        );
      }),
    );

  const handoff: WorktreeMcpService["Service"]["handoff"] = Effect.fn("WorktreeMcpService.handoff")(
    function* (callerScope, input) {
      yield* requireCapability(callerScope);
      const scope = yield* requireThreadScope(callerScope);
      return yield* exclusively(scope.thread.threadId, performHandoff(scope, input));
    },
  );

  const userTarget = (threadId: ThreadId): HandoffTarget => ({
    thread: { threadId, providerSessionId: `user:${threadId}` },
  });

  /** A user moves files under a thread only while its agent is not working in them. */
  const requireIdle = (target: HandoffTarget) =>
    loadThread(target).pipe(
      Effect.tap(() =>
        threadManagement.getThreadRecords(target.thread.threadId, ["runs"]).pipe(
          asOperationFailed(`Unable to read thread ${target.thread.threadId}`),
          Effect.filterOrFail(
            ({ runs }) =>
              !runs.some((run) =>
                ["preparing", "starting", "running", "waiting"].includes(run.status),
              ),
            () =>
              failure(
                "invalid_request",
                "The agent is still working in this thread. Stop it or wait for it to finish first.",
              ),
          ),
        ),
      ),
    );

  /**
   * The repository's worktrees by resolved path: the path as git spells it (how thread worktree
   * paths are stored) and the branch checked out there.
   */
  const listWorktrees = (cwd: string) =>
    runGit(cwd, ["worktree", "list", "--porcelain"]).pipe(
      Effect.map((result) => {
        const worktrees = new Map<string, { path: string; branch: string | null }>();
        let current: { path: string; branch: string | null } | null = null;
        for (const line of result.stdout.split(/\r?\n/)) {
          if (line.startsWith("worktree ")) {
            current = { path: line.slice("worktree ".length), branch: null };
            worktrees.set(path.resolve(current.path), current);
          } else if (current !== null && line.startsWith("branch ")) {
            current.branch = line.slice("branch ".length).replace(/^refs\/heads\//, "");
          }
        }
        return worktrees;
      }),
    );

  const performMoveToExisting = Effect.fn("WorktreeMcpService.performMoveToExisting")(function* (
    threadId: ThreadId,
    requestedPath: string,
    carryChanges: boolean,
  ) {
    const target = userTarget(threadId);
    const projection = yield* requireIdle(target);
    if (projection.thread.worktreePath !== null) {
      return yield* failure(
        "already_in_worktree",
        `This thread already works in ${projection.thread.worktreePath}. Bring it back to the project folder first.`,
      );
    }
    const project = yield* loadProject(target, projection.thread.projectId);
    const projectCwd = project.workspaceRoot;
    const resolved = path.resolve(requestedPath);
    if (resolved === path.resolve(projectCwd)) {
      return yield* failure("invalid_request", "This thread already works in the project folder.");
    }
    const worktree = (yield* listWorktrees(projectCwd)).get(resolved);
    if (worktree === undefined) {
      return yield* failure(
        "invalid_request",
        `${requestedPath} is not a worktree of ${projectCwd}.`,
      );
    }
    const { path: worktreePath, branch } = worktree;
    let carried = false;
    if (carryChanges) {
      // The carry undoes a failed apply with a hard reset, so the target must have nothing
      // of its own to lose.
      if (yield* hasUncommittedChanges(worktreePath)) {
        return yield* failure(
          "invalid_request",
          `${worktreePath} has uncommitted changes of its own. Commit or stash them there, or move without taking changes along.`,
        );
      }
      carried = yield* carryUncommittedChanges(projectCwd, worktreePath);
    }
    const ids = yield* handoffIds(target);
    yield* threadManagement
      .dispatch({
        type: "thread.metadata.update",
        commandId: ids.commandId,
        threadId,
        branch,
        worktreePath,
        expectedWorktreePath: null,
      })
      .pipe(asOperationFailed("Unable to point the thread at the worktree"));
    yield* Effect.forEach([projectCwd, worktreePath], (cwd) =>
      vcsStatusBroadcaster
        .refreshStatus(cwd)
        .pipe(Effect.ignoreCause({ log: true }), Effect.forkDetach),
    );
    const result: WorktreeMcpHandoffResult = {
      worktreePath,
      branch: branch ?? "HEAD",
      baseRef: branch ?? "HEAD",
      startedFromOrigin: false,
      setupScript: { status: "skipped" },
      continuation: { status: "skipped" },
      note: carried
        ? "The thread now works in the existing worktree, with the project folder's uncommitted changes."
        : "The thread now works in the existing worktree.",
    };
    return result;
  });

  const moveToNewWorktree: WorktreeMcpService["Service"]["moveToNewWorktree"] = (input) => {
    const target = userTarget(input.threadId);
    if ("worktreePath" in input) {
      return exclusively(
        input.threadId,
        performMoveToExisting(input.threadId, input.worktreePath, input.carryChanges),
      );
    }
    return exclusively(
      input.threadId,
      requireIdle(target).pipe(
        Effect.andThen(
          // The thread's work (and any carried changes) sits on the local checkout, so the new
          // branch starts there, never from origin's tip.
          performHandoff(
            target,
            { branch: input.branch, startFromOrigin: false },
            { carryChanges: input.carryChanges },
          ),
        ),
      ),
    );
  };

  const performReturn = Effect.fn("WorktreeMcpService.performReturn")(function* (
    threadId: ThreadId,
  ) {
    const target = userTarget(threadId);
    const projection = yield* requireIdle(target);
    const worktreePath = projection.thread.worktreePath;
    if (worktreePath === null) {
      return yield* failure("invalid_request", "This thread already works in the project folder.");
    }
    const project = yield* loadProject(target, projection.thread.projectId);
    const projectCwd = project.workspaceRoot;
    if (path.resolve(worktreePath) === path.resolve(projectCwd)) {
      return yield* failure("invalid_request", "This thread already works in the project folder.");
    }
    if (yield* hasUncommittedChanges(projectCwd)) {
      return yield* failure(
        "invalid_request",
        `${projectCwd} has uncommitted changes. Commit or stash them first, so the thread's work can come back cleanly.`,
      );
    }
    const projectStatus = yield* gitWorkflow
      .localStatus({ cwd: projectCwd })
      .pipe(asOperationFailed("Unable to read git status"));
    const projectBranch = projectStatus.refName;
    if (projectBranch === null) {
      return yield* failure(
        "invalid_request",
        `${projectCwd} is not on a branch (detached HEAD). Switch to a branch first.`,
      );
    }
    const worktreeBranch =
      projection.thread.branch ??
      (yield* gitWorkflow
        .localStatus({ cwd: worktreePath })
        .pipe(asOperationFailed("Unable to read the worktree's git status"))).refName;

    let mergedBranch: string | null = null;
    if (worktreeBranch !== null && worktreeBranch !== projectBranch) {
      const ahead = yield* runGit(projectCwd, [
        "rev-list",
        "--count",
        `${projectBranch}..${worktreeBranch}`,
      ]);
      if (Number.parseInt(ahead.stdout.trim(), 10) > 0) {
        const merged = yield* git
          .execute({
            operation: "WorktreeTransfer.merge",
            cwd: projectCwd,
            args: ["merge", "--no-edit", worktreeBranch],
            allowNonZeroExit: true,
          })
          .pipe(asOperationFailed(`git merge failed in ${projectCwd}`));
        if (merged.exitCode !== 0) {
          yield* runGit(projectCwd, ["merge", "--abort"]);
          return yield* failure(
            "operation_failed",
            `Merging ${worktreeBranch} into ${projectBranch} conflicts, so nothing was changed. Resolve it in the worktree (for example by merging ${projectBranch} there) and try again.`,
          );
        }
        mergedBranch = worktreeBranch;
      }
    }

    const carriedChanges = yield* carryUncommittedChanges(worktreePath, projectCwd);

    const ids = yield* handoffIds(target);
    yield* threadManagement
      .dispatch({
        type: "thread.metadata.update",
        commandId: ids.commandId,
        threadId,
        branch: projectBranch,
        worktreePath: null,
        expectedWorktreePath: worktreePath,
      })
      .pipe(asOperationFailed("Unable to point the thread at the project folder"));
    yield* Effect.forEach([projectCwd, worktreePath], (cwd) =>
      vcsStatusBroadcaster
        .refreshStatus(cwd)
        .pipe(Effect.ignoreCause({ log: true }), Effect.forkDetach),
    );
    return { projectPath: projectCwd, branch: projectBranch, mergedBranch, carriedChanges };
  });

  const returnToProject: WorktreeMcpService["Service"]["returnToProject"] = (threadId) =>
    exclusively(threadId, performReturn(threadId));

  const status: WorktreeMcpService["Service"]["status"] = Effect.fn("WorktreeMcpService.status")(
    function* (callerScope) {
      yield* requireCapability(callerScope);
      const scope = yield* requireThreadScope(callerScope);
      const projection = yield* loadThread(scope);
      const project = yield* loadProject(scope, projection.thread.projectId);

      const defaultStartFromOrigin = yield* readDefaultStartFromOrigin;

      const result: WorktreeMcpStatusResult = {
        attached: projection.thread.worktreePath !== null,
        worktreePath: projection.thread.worktreePath,
        branch: projection.thread.branch,
        projectWorkspaceRoot: project.workspaceRoot,
        defaultStartFromOrigin,
      };
      return result;
    },
  );

  return WorktreeMcpService.of({ handoff, status, moveToNewWorktree, returnToProject });
});

export const layer: Layer.Layer<
  WorktreeMcpService,
  never,
  | Crypto.Crypto
  | Path.Path
  | ThreadManagementService.ThreadManagementService
  | ProjectService.ProjectService
  | ServerSettings.ServerSettingsService
  | GitWorkflowService.GitWorkflowService
  | ProjectSetupScriptRunner.ProjectSetupScriptRunner
  | VcsStatusBroadcaster.VcsStatusBroadcaster
  | GitVcsDriver.GitVcsDriver
> = Layer.effect(WorktreeMcpService, make);
