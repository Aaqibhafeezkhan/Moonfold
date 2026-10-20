/**
 * What the user's enabled Moonfold plugins give a provider session: skill folders and MCP
 * servers. Adapters read it when they start a session; each decides how its provider takes them.
 *
 * @module provider-core/server/ProviderPlugins
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

export interface ProviderPluginMcpServer {
  /** Unique across plugins, so two plugins' servers never collide. */
  readonly name: string;
  readonly command: string | null;
  readonly args: ReadonlyArray<string>;
  readonly cwd: string | null;
  readonly url: string | null;
  /** Literal values the plugin sets. */
  readonly env: Readonly<Record<string, string>>;
  /** Names passed through from the server's own environment. */
  readonly envVars: ReadonlyArray<string>;
}

export interface ProviderPluginBundle {
  /** Folders that each hold skill folders with a SKILL.md (Codex extra skill roots). */
  readonly skillRoots: ReadonlyArray<string>;
  /** Claude Code plugin folders, each with `.claude-plugin/plugin.json` and `skills/`. */
  readonly claudePluginDirs: ReadonlyArray<string>;
  readonly mcpServers: ReadonlyArray<ProviderPluginMcpServer>;
}

export const EMPTY_PROVIDER_PLUGIN_BUNDLE: ProviderPluginBundle = {
  skillRoots: [],
  claudePluginDirs: [],
  mcpServers: [],
};

export class ProviderPlugins extends Context.Service<
  ProviderPlugins,
  {
    /** The enabled plugins as they are now; read at each session start. */
    readonly read: Effect.Effect<ProviderPluginBundle>;
  }
>()("@moonfold/provider-core/server/ProviderPlugins") {}

/**
 * The enabled-plugins reader from the current context. Adapters capture it when they are built;
 * hosts without a plugin store (tests, one-off CLI runs) get a reader that returns no plugins.
 */
export const capture: Effect.Effect<Effect.Effect<ProviderPluginBundle>> = Effect.serviceOption(
  ProviderPlugins,
).pipe(
  Effect.map(
    Option.match({
      onNone: () => Effect.succeed(EMPTY_PROVIDER_PLUGIN_BUNDLE),
      onSome: (service) => service.read,
    }),
  ),
);
