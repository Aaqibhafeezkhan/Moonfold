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

function quoteArg(arg: string): string {
  return /^[\w@%+=:,./\\-]+$/.test(arg) ? arg : JSON.stringify(arg);
}
