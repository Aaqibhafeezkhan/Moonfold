import type { PluginMcpServer, PluginSource } from "@moonfold/contracts";

/** Where a plugin came from, as one line. */
export function pluginSourceLabel(source: PluginSource): string {
  return source.type === "git"
    ? `${source.url}${source.ref === undefined ? "" : ` @ ${source.ref}`}`
    : source.path;
}

/** What an MCP server runs: its command line, or the remote server's URL. */
export function mcpServerSummary(server: PluginMcpServer): string {
  if (server.url !== null) return server.url;
  return [server.command ?? "", ...server.args.map(quoteArg)].join(" ").trim();
}

/** The values a server's environment is given, as `NAME=value` pairs, or null when none. */
export function mcpServerEnvironment(server: PluginMcpServer): string | null {
  const entries = Object.entries(server.env);
  return entries.length === 0
    ? null
    : entries.map(([name, value]) => `${name}=${quoteArg(value)}`).join(" ");
}

function quoteArg(arg: string): string {
  return /^[\w@%+=:,./\\-]+$/.test(arg) ? arg : JSON.stringify(arg);
}
