import * as Schema from "effect/Schema";

import { ThreadId, TrimmedNonEmptyString } from "./baseSchemas.ts";

/** Move an idle thread from its project checkout into a new git worktree. */
export const ThreadMoveToWorktreeInput = Schema.Struct({
  threadId: ThreadId,
  branch: TrimmedNonEmptyString.check(Schema.isMaxLength(255)),
  /** Take the project checkout's uncommitted changes along into the worktree. */
  carryChanges: Schema.Boolean,
});
export type ThreadMoveToWorktreeInput = typeof ThreadMoveToWorktreeInput.Type;

/** Bring an idle thread's worktree work back into its project checkout. */
export const ThreadReturnToProjectInput = Schema.Struct({
  threadId: ThreadId,
});
export type ThreadReturnToProjectInput = typeof ThreadReturnToProjectInput.Type;

export const ThreadReturnToProjectResult = Schema.Struct({
  projectPath: Schema.String,
  /** The project checkout's branch, which now holds the work. */
  branch: Schema.String,
  /** The worktree branch merged into it, or null when it had no new commits. */
  mergedBranch: Schema.NullOr(Schema.String),
  /** Whether uncommitted changes came over from the worktree. */
  carriedChanges: Schema.Boolean,
});
export type ThreadReturnToProjectResult = typeof ThreadReturnToProjectResult.Type;
