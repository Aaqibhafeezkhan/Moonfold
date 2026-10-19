/**
 * Plugins installed in Moonfold: a folder of `SKILL.md` skills and optional MCP servers, from a
 * git repository or a local folder. Codex (`.codex-plugin/plugin.json`) and Claude Code
 * (`.claude-plugin/plugin.json`) plugin folders load as they are.
 */
import * as Schema from "effect/Schema";

import { TrimmedNonEmptyString } from "./baseSchemas.ts";

export const PluginId = TrimmedNonEmptyString.check(Schema.isPattern(/^[a-z0-9][a-z0-9._-]{0,63}$/))
  .pipe(Schema.brand("PluginId"))
  .annotate({ description: "Folder name of an installed plugin." });
export type PluginId = typeof PluginId.Type;

export const PluginSource = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("git"),
    url: TrimmedNonEmptyString.check(Schema.isMaxLength(2048)),
    /** Branch or tag; the repository's default branch when absent. */
    ref: Schema.optional(TrimmedNonEmptyString.check(Schema.isMaxLength(255))),
  }),
  Schema.Struct({
    type: Schema.Literal("folder"),
    path: TrimmedNonEmptyString.check(Schema.isMaxLength(4096)),
  }),
]);
export type PluginSource = typeof PluginSource.Type;

export const PluginSkill = Schema.Struct({
  name: TrimmedNonEmptyString,
  description: Schema.NullOr(Schema.String),
  /** The skill's SKILL.md inside the installed plugin. */
  path: TrimmedNonEmptyString,
});
export type PluginSkill = typeof PluginSkill.Type;

/** An MCP server a plugin brings. Shown before the plugin is enabled, since it runs a program. */
export const PluginMcpServer = Schema.Struct({
  name: TrimmedNonEmptyString,
  /** The program and arguments a local server runs, or null for a remote server. */
  command: Schema.NullOr(Schema.String),
  args: Schema.Array(Schema.String),
  /** Working directory of a local server, inside the plugin. */
  cwd: Schema.NullOr(Schema.String),
  /** URL of a remote server, or null for a local one. */
  url: Schema.NullOr(Schema.String),
  /** Environment variables passed through from the server's environment by name. */
  envVars: Schema.Array(Schema.String),
});
export type PluginMcpServer = typeof PluginMcpServer.Type;

export const InstalledPlugin = Schema.Struct({
  id: PluginId,
  name: TrimmedNonEmptyString,
  version: Schema.NullOr(Schema.String),
  description: Schema.NullOr(Schema.String),
  source: PluginSource,
  /** Plugins start disabled: nothing a plugin brings reaches an agent until the user enables it. */
  enabled: Schema.Boolean,
  /** Layouts the folder follows: Moonfold's own skills folder, Codex's or Claude Code's plugin. */
  formats: Schema.Array(Schema.Literals(["skills", "codex", "claude"])),
  skills: Schema.Array(PluginSkill),
  mcpServers: Schema.Array(PluginMcpServer),
  installedAt: Schema.String,
  updatedAt: Schema.String,
});
export type InstalledPlugin = typeof InstalledPlugin.Type;

export const PluginListResult = Schema.Struct({
  plugins: Schema.Array(InstalledPlugin),
  /** Where plugins live on the environment's machine. */
  directory: Schema.String,
});
export type PluginListResult = typeof PluginListResult.Type;

export const PluginInstallInput = Schema.Struct({ source: PluginSource });
export type PluginInstallInput = typeof PluginInstallInput.Type;

export const PluginIdInput = Schema.Struct({ id: PluginId });
export type PluginIdInput = typeof PluginIdInput.Type;

export const PluginSetEnabledInput = Schema.Struct({ id: PluginId, enabled: Schema.Boolean });
export type PluginSetEnabledInput = typeof PluginSetEnabledInput.Type;

export const PluginMutationResult = Schema.Struct({ plugin: InstalledPlugin });
export type PluginMutationResult = typeof PluginMutationResult.Type;

export class PluginError extends Schema.TaggedError<PluginError>()("PluginError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Defect()),
}) {}
