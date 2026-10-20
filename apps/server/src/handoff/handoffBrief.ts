import type { OrchestrationV2ProviderGoal, OrchestrationV2TurnItem } from "@moonfold/contracts";
import { redactSecrets, type SecretFinding } from "@moonfold/shared/secretRedaction";

/** Why a thread moved to another provider. */
export type HandoffReason = "usage_limit" | "automatic" | "manual";

export interface HandoffBriefInput {
  /** The thread's turn items in timeline order. */
  readonly items: ReadonlyArray<OrchestrationV2TurnItem>;
  /** The provider-native goal of the outgoing thread, if one is set. */
  readonly goal: OrchestrationV2ProviderGoal | null;
  /** How the outgoing and incoming agents are named to the user, e.g. "Codex (gpt-5.6)". */
  readonly from: string;
  readonly to: string;
  readonly reason: HandoffReason;
  /** Approvals and questions still open when the previous agent stopped. */
  readonly pendingRequests: number;
  /** The workspace as it is now; null when it is not a git repository or could not be read. */
  readonly gitStatus: string | null;
  readonly diffStat: string | null;
  /** AGENTS.md or CLAUDE.md at the workspace root. */
  readonly instructions: { readonly file: string; readonly text: string } | null;
}

export interface HandoffBrief {
  readonly text: string;
  /** What the secret scan replaced; the preview shows these to the user. */
  readonly redactions: ReadonlyArray<SecretFinding>;
}

const LIMITS = {
  objective: 1_500,
  plan: 3_000,
  userMessages: 8,
  userMessage: 500,
  files: 50,
  gitStatusLines: 60,
  diffStatLines: 60,
  commandInput: 300,
  commandOutputLines: 20,
  commandOutput: 1_500,
  failure: 600,
  instructions: 4_000,
} as const;

function clip(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function oneLine(text: string, max: number): string {
  return clip(text.replace(/\s+/g, " "), max);
}

function clipLines(text: string, maxLines: number): string {
  const lines = text.trimEnd().split(/\r?\n/);
  return lines.length <= maxLines
    ? lines.join("\n")
    : [...lines.slice(0, maxLines), `… ${lines.length - maxLines} more lines`].join("\n");
}

function tailLines(text: string, maxLines: number, maxChars: number): string {
  const lines = text.trimEnd().split(/\r?\n/);
  const tail = lines.slice(-maxLines).join("\n");
  return tail.length <= maxChars ? tail : `…${tail.slice(tail.length - maxChars + 1)}`;
}

/** Fenced so the incoming agent reads it as quoted output; fences inside are broken up. */
function fenced(text: string): string {
  return ["```", text.replaceAll("```", "`​``"), "```"].join("\n");
}

const REASON_TEXT: Record<HandoffReason, (from: string) => string> = {
  usage_limit: (from) => `${from} reached its usage limit, so the user moved the task to you.`,
  automatic: (from) =>
    `${from} reached its usage limit, and Moonfold moved the task to you following the user's fallback order.`,
  manual: (from) => `The user moved the task from ${from} to you.`,
};

type Item<T extends OrchestrationV2TurnItem["type"]> = Extract<
  OrchestrationV2TurnItem,
  { type: T }
>;

const ofType =
  <T extends OrchestrationV2TurnItem["type"]>(type: T) =>
  (item: OrchestrationV2TurnItem): item is Item<T> =>
    item.type === type;

function objectiveSection(input: HandoffBriefInput): string | null {
  const goal =
    input.goal !== null && input.goal.status !== "complete" ? input.goal.objective : null;
  const first = input.items.find(ofType("user_message"))?.text ?? null;
  const objective = goal ?? first;
  if (objective === null || objective.trim() === "") return null;
  return [
    "## Objective",
    goal === null ? "The user's first request in this thread:" : "The goal set for this thread:",
    fenced(clip(objective, LIMITS.objective)),
  ].join("\n");
}

function planSection(items: ReadonlyArray<OrchestrationV2TurnItem>): string | null {
  const todo = items.findLast(ofType("todo_list"));
  if (todo !== undefined && todo.steps.length > 0) {
    const mark = { completed: "[x]", running: "[~]", pending: "[ ]" } as const;
    return [
      "## Plan",
      "`[x]` done, `[~]` in progress, `[ ]` not started.",
      ...todo.steps.map((step) => `- ${mark[step.status]} ${oneLine(step.text, 300)}`),
    ].join("\n");
  }
  const proposed = items.findLast(ofType("proposed_plan"));
  if (proposed !== undefined && proposed.markdown.trim() !== "") {
    return [
      "## Plan",
      "The latest plan proposed in this thread:",
      fenced(clip(proposed.markdown, LIMITS.plan)),
    ].join("\n");
  }
  return null;
}

function userMessagesSection(items: ReadonlyArray<OrchestrationV2TurnItem>): string | null {
  const later = items.filter(ofType("user_message")).slice(1);
  if (later.length === 0) return null;
  const recent = later.slice(-LIMITS.userMessages).toReversed();
  return [
    "## What the user said since",
    "Newest first. Constraints and decisions here still apply.",
    ...recent.map((message) => `- ${oneLine(message.text, LIMITS.userMessage)}`),
    ...(later.length > recent.length
      ? [`- … ${later.length - recent.length} earlier messages, in the history below.`]
      : []),
  ].join("\n");
}

function filesSection(items: ReadonlyArray<OrchestrationV2TurnItem>): string | null {
  const files = new Map<string, { additions: number; deletions: number; counted: boolean }>();
  for (const item of items) {
    if (item.type === "file_change") {
      const entry = files.get(item.fileName) ?? { additions: 0, deletions: 0, counted: false };
      files.set(item.fileName, {
        additions: entry.additions + (item.additions ?? 0),
        deletions: entry.deletions + (item.deletions ?? 0),
        counted: entry.counted || item.additions !== undefined || item.deletions !== undefined,
      });
    } else if (item.type === "checkpoint") {
      for (const file of item.files) {
        if (!files.has(file.path))
          files.set(file.path, { additions: 0, deletions: 0, counted: false });
      }
    }
  }
  if (files.size === 0) return null;
  const listed = [...files].slice(0, LIMITS.files);
  return [
    "## Files changed in this thread",
    ...listed.map(([path, change]) =>
      change.counted ? `- ${path} (+${change.additions} -${change.deletions})` : `- ${path}`,
    ),
    ...(files.size > listed.length ? [`- … ${files.size - listed.length} more files`] : []),
  ].join("\n");
}

function workspaceSection(input: HandoffBriefInput): string {
  if (input.gitStatus === null) {
    return "## Workspace now\nThe workspace is not a git repository, or its state could not be read.";
  }
  return [
    "## Workspace now",
    "`git status --short`:",
    fenced(
      input.gitStatus.trim() === "" ? "(clean)" : clipLines(input.gitStatus, LIMITS.gitStatusLines),
    ),
    ...(input.diffStat === null || input.diffStat.trim() === ""
      ? []
      : ["`git diff --stat`:", fenced(clipLines(input.diffStat, LIMITS.diffStatLines))]),
  ].join("\n");
}

function openProblemsSection(input: HandoffBriefInput): string | null {
  const commands = input.items.filter(ofType("command_execution"));
  const failedIndex = commands.findLastIndex(
    (command) =>
      (command.exitCode !== undefined && command.exitCode !== 0) ||
      command.outputIndicatesFailure === true,
  );
  const failed = failedIndex === -1 ? undefined : commands[failedIndex];
  // A failure the previous agent already fixed by rerunning the same command is not open.
  const rerunPassed =
    failed !== undefined &&
    commands
      .slice(failedIndex + 1)
      .some((command) => command.input === failed.input && command.exitCode === 0);
  const lastError = input.items.findLast(ofType("error"));
  const lines: Array<string> = [];
  if (failed !== undefined && !rerunPassed) {
    lines.push(
      `- The last failing command${failed.exitCode === undefined ? "" : ` (exit ${failed.exitCode})`}: \`${oneLine(failed.input, LIMITS.commandInput)}\``,
    );
    if (failed.output !== undefined && failed.output.trim() !== "") {
      lines.push(
        "  End of its output:",
        fenced(tailLines(failed.output, LIMITS.commandOutputLines, LIMITS.commandOutput)),
      );
    }
  }
  if (lastError !== undefined) {
    lines.push(
      `- The previous agent stopped with: ${oneLine(lastError.failure.message, LIMITS.failure)}`,
    );
  }
  if (input.pendingRequests > 0) {
    lines.push(
      `- ${input.pendingRequests === 1 ? "One approval or question was" : `${input.pendingRequests} approvals or questions were`} still open; ask the user again if you need it.`,
    );
  }
  return lines.length === 0 ? null : ["## Open problems", ...lines].join("\n");
}

function instructionsSection(input: HandoffBriefInput): string | null {
  if (input.instructions === null || input.instructions.text.trim() === "") return null;
  return [
    `## Project instructions (${input.instructions.file})`,
    fenced(clip(input.instructions.text, LIMITS.instructions)),
  ].join("\n");
}

/**
 * The brief a provider receives when a thread moves to it: built only from the thread's log and
 * the workspace, with no model call, so the same thread always gives the same brief. Secrets are
 * redacted before it is returned.
 */
export function buildHandoffBrief(input: HandoffBriefInput): HandoffBrief {
  const sections = [
    [
      "# Handoff brief",
      `${REASON_TEXT[input.reason](input.from)} You are ${input.to}. Moonfold built this brief from the thread's history; the earlier conversation follows it.`,
    ].join("\n"),
    objectiveSection(input),
    planSection(input.items),
    userMessagesSection(input.items),
    filesSection(input.items),
    workspaceSection(input),
    openProblemsSection(input),
    instructionsSection(input),
    [
      "## How to continue",
      "Check the workspace against this brief before changing anything, then continue with the first unfinished step. Do not redo finished work, and tell the user briefly where you are picking up.",
    ].join("\n"),
  ].filter((section): section is string => section !== null);
  const { text, findings } = redactSecrets(sections.join("\n\n"));
  return { text, redactions: findings };
}
