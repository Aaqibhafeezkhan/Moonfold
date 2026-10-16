import * as Schema from "effect/Schema";

import {
  ForwardCompatibleArray,
  NonNegativeInt,
  ProjectId,
  TrimmedNonEmptyString,
} from "./baseSchemas.ts";
import { ProviderInstanceId } from "./providerInstance.ts";

/**
 * Configuration a provider keeps in its own home (MCP servers, skills, hooks,
 * agent imports, account usage), read and changed through the provider's own
 * CLI. Codex implements it through `codex app-server`; other providers do not
 * expose it, and the server answers with `ProviderSetupError`.
 */

/** A project adds its own config to the user-level config; without one only user config is read. */
const OptionalProject = Schema.optional(ProjectId);

export const ProviderNativeConfigInput = Schema.Struct({
  instanceId: ProviderInstanceId,
  projectId: OptionalProject,
});
export type ProviderNativeConfigInput = typeof ProviderNativeConfigInput.Type;

// MCP servers

export const ProviderMcpServerAuth = Schema.Literals([
  "unknown",
  "unsupported",
  "notLoggedIn",
  "bearerToken",
  "oAuth",
]);
export type ProviderMcpServerAuth = typeof ProviderMcpServerAuth.Type;

export const ProviderMcpServer = Schema.Struct({
  name: Schema.String,
  auth: ProviderMcpServerAuth,
  /** Connection state when the provider reports one ("connected", "failed", ...). */
  state: Schema.NullOr(Schema.String),
  /** Origin of a remote (HTTP) server; null for a local command server. */
  origin: Schema.NullOr(Schema.String),
  /** Plugin that bundles this server, when it came from one. */
  pluginId: Schema.NullOr(Schema.String),
  toolNames: Schema.Array(Schema.String),
  resourceCount: NonNegativeInt,
  /** Why the provider could not start the server or list its tools. */
  error: Schema.NullOr(Schema.String),
});
export type ProviderMcpServer = typeof ProviderMcpServer.Type;

export const ProviderMcpServerList = Schema.Struct({
  servers: ForwardCompatibleArray(ProviderMcpServer),
});
export type ProviderMcpServerList = typeof ProviderMcpServerList.Type;

export const ProviderMcpServerLoginInput = Schema.Struct({
  instanceId: ProviderInstanceId,
  name: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
});
export type ProviderMcpServerLoginInput = typeof ProviderMcpServerLoginInput.Type;

/** A sign-in streams the URL to open, then how it ended. */
export const ProviderMcpServerLoginEvent = Schema.Union([
  Schema.Struct({ type: Schema.Literal("authorizationUrl"), url: Schema.String }),
  Schema.Struct({
    type: Schema.Literal("completed"),
    success: Schema.Boolean,
    error: Schema.NullOr(Schema.String),
  }),
]);
export type ProviderMcpServerLoginEvent = typeof ProviderMcpServerLoginEvent.Type;

// Skills

export const ProviderSkillEntry = Schema.Struct({
  name: Schema.String,
  displayName: Schema.NullOr(Schema.String),
  description: Schema.String,
  path: Schema.String,
  /** "user", "repo", "system", "admin", ... as the provider reports it. */
  scope: Schema.String,
  enabled: Schema.Boolean,
  pluginId: Schema.NullOr(Schema.String),
});
export type ProviderSkillEntry = typeof ProviderSkillEntry.Type;

export const ProviderSkillList = Schema.Struct({
  skills: ForwardCompatibleArray(ProviderSkillEntry),
  errors: Schema.Array(Schema.Struct({ path: Schema.String, message: Schema.String })),
});
export type ProviderSkillList = typeof ProviderSkillList.Type;

export const ProviderSkillSetEnabledInput = Schema.Struct({
  instanceId: ProviderInstanceId,
  path: TrimmedNonEmptyString.check(Schema.isMaxLength(4_096)),
  enabled: Schema.Boolean,
});
export type ProviderSkillSetEnabledInput = typeof ProviderSkillSetEnabledInput.Type;

export const ProviderSkillSetEnabledResult = Schema.Struct({
  /** What the provider settled on; config at another level can override the request. */
  enabled: Schema.Boolean,
});
export type ProviderSkillSetEnabledResult = typeof ProviderSkillSetEnabledResult.Type;

export const ProviderSkillReadInput = Schema.Struct({
  instanceId: ProviderInstanceId,
  projectId: OptionalProject,
  path: TrimmedNonEmptyString.check(Schema.isMaxLength(4_096)),
});
export type ProviderSkillReadInput = typeof ProviderSkillReadInput.Type;

export const ProviderSkillReadResult = Schema.Struct({
  contents: Schema.String,
  truncated: Schema.Boolean,
});
export type ProviderSkillReadResult = typeof ProviderSkillReadResult.Type;

// Hooks

export const ProviderHookEntry = Schema.Struct({
  key: Schema.String,
  /** Lifecycle event the hook runs on ("preToolUse", "stop", ...). */
  event: Schema.String,
  /** "command", "mcpTool", "prompt" or "agent". */
  handler: Schema.String,
  /** The command line, or `server/tool` for an MCP tool hook; null for other handlers. */
  target: Schema.NullOr(Schema.String),
  matcher: Schema.NullOr(Schema.String),
  source: Schema.String,
  sourcePath: Schema.String,
  enabled: Schema.Boolean,
  /** Whether the user has trusted this exact hook definition. */
  trust: Schema.String,
  managed: Schema.Boolean,
  timeoutSec: NonNegativeInt,
});
export type ProviderHookEntry = typeof ProviderHookEntry.Type;

export const ProviderHookList = Schema.Struct({
  hooks: ForwardCompatibleArray(ProviderHookEntry),
  warnings: Schema.Array(Schema.String),
  errors: Schema.Array(Schema.Struct({ path: Schema.String, message: Schema.String })),
});
export type ProviderHookList = typeof ProviderHookList.Type;

// Importing configuration from other agents

export const ProviderAgentImportItem = Schema.Struct({
  /** Opaque item the provider detected; sent back unchanged to import it. */
  id: Schema.String,
  /** "SKILLS", "SESSIONS", "MCP_SERVER_CONFIG", ... as the provider reports it. */
  kind: Schema.String,
  description: Schema.String,
  cwd: Schema.NullOr(Schema.String),
  /** Names of what the item would bring over (skills, servers, session titles). */
  entries: Schema.Array(Schema.String),
});
export type ProviderAgentImportItem = typeof ProviderAgentImportItem.Type;

export const ProviderAgentImportDetectResult = Schema.Struct({
  items: ForwardCompatibleArray(ProviderAgentImportItem),
});
export type ProviderAgentImportDetectResult = typeof ProviderAgentImportDetectResult.Type;

export const ProviderAgentImportInput = Schema.Struct({
  instanceId: ProviderInstanceId,
  projectId: OptionalProject,
  itemIds: Schema.Array(Schema.String).check(Schema.isMinLength(1), Schema.isMaxLength(64)),
});
export type ProviderAgentImportInput = typeof ProviderAgentImportInput.Type;

export const ProviderAgentImportResult = Schema.Struct({
  results: Schema.Array(
    Schema.Struct({
      kind: Schema.String,
      imported: NonNegativeInt,
      failed: NonNegativeInt,
      errors: Schema.Array(Schema.String),
    }),
  ),
});
export type ProviderAgentImportResult = typeof ProviderAgentImportResult.Type;

// Account usage

export const ProviderAccountUsage = Schema.Struct({
  lifetimeTokens: Schema.NullOr(NonNegativeInt),
  peakDailyTokens: Schema.NullOr(NonNegativeInt),
  currentStreakDays: Schema.NullOr(NonNegativeInt),
  longestStreakDays: Schema.NullOr(NonNegativeInt),
  longestTurnSeconds: Schema.NullOr(NonNegativeInt),
  /** Days with usage, oldest first, as `YYYY-MM-DD`. */
  days: Schema.Array(Schema.Struct({ date: Schema.String, tokens: NonNegativeInt })),
});
export type ProviderAccountUsage = typeof ProviderAccountUsage.Type;
