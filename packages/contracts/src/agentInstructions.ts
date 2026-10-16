import * as Schema from "effect/Schema";

import { ProjectId } from "./baseSchemas.ts";

/**
 * Instruction files coding agents read on their own: a project's `AGENTS.md`
 * (Codex and most agents) and `CLAUDE.md` (Claude Code), and the user-level
 * files in the Codex and Claude homes. Moonfold edits the files directly, so
 * the instructions apply however the agent is started.
 */
export const AgentInstructionsFileId = Schema.Literals([
  "project-agents",
  "project-claude",
  "user-codex",
  "user-claude",
]);
export type AgentInstructionsFileId = typeof AgentInstructionsFileId.Type;

/** Larger files are not loaded into the editor. */
export const AGENT_INSTRUCTIONS_MAX_BYTES = 512 * 1024;

export const AgentInstructionsListInput = Schema.Struct({
  /** Without a project only the user-level files are listed. */
  projectId: Schema.optional(ProjectId),
});
export type AgentInstructionsListInput = typeof AgentInstructionsListInput.Type;

export const AgentInstructionsFile = Schema.Struct({
  id: AgentInstructionsFileId,
  path: Schema.String,
  /** Null when the file does not exist yet; saving creates it. */
  contents: Schema.NullOr(Schema.String),
  /** Identifies the contents this listing saw; a save from an older revision is refused. */
  revision: Schema.NullOr(Schema.String),
  /** True when the file is larger than the editor accepts; it is shown but not editable. */
  tooLarge: Schema.Boolean,
});
export type AgentInstructionsFile = typeof AgentInstructionsFile.Type;

export const AgentInstructionsList = Schema.Struct({
  files: Schema.Array(AgentInstructionsFile),
});
export type AgentInstructionsList = typeof AgentInstructionsList.Type;

export const AgentInstructionsWriteInput = Schema.Struct({
  id: AgentInstructionsFileId,
  projectId: Schema.optional(ProjectId),
  contents: Schema.String.check(Schema.isMaxLength(AGENT_INSTRUCTIONS_MAX_BYTES)),
  /** The revision the edit started from; null when the file did not exist. */
  expectedRevision: Schema.NullOr(Schema.String),
});
export type AgentInstructionsWriteInput = typeof AgentInstructionsWriteInput.Type;

export const AgentInstructionsWriteResult = Schema.Struct({
  revision: Schema.String,
});
export type AgentInstructionsWriteResult = typeof AgentInstructionsWriteResult.Type;

export class AgentInstructionsError extends Schema.TaggedError<AgentInstructionsError>()(
  "AgentInstructionsError",
  {
    reason: Schema.Literals(["project_not_found", "changed_on_disk", "too_large", "io"]),
    detail: Schema.String,
    cause: Schema.optional(Schema.Defect()),
  },
) {
  override get message(): string {
    return this.detail;
  }
}
