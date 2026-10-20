# Plugins

A plugin gives agents extra skills and, optionally, MCP servers. Manage plugins in
**Settings → Plugins**. Each environment has its own plugins, installed on that environment's
machine.

## Add a plugin

Choose **Add plugin**, then either paste a git repository URL (with an optional branch or tag) or
give the path of a folder on the environment's machine. Moonfold reads three layouts as they are:

- a Codex plugin (`.codex-plugin/plugin.json`, with an `.mcp.json` for its servers),
- a Claude Code plugin (`.claude-plugin/plugin.json`, with `skills/` and `.mcp.json`),
- a plain folder of skills, each skill in its own folder with a `SKILL.md`.

A folder is copied when you add it. After you edit the original, choose **Reload from folder**.
A repository plugin updates with **Update from repository**.

## Turn a plugin on

Plugins start turned off, so nothing from a plugin reaches an agent until you choose to. When you
turn on a plugin that has MCP servers, Moonfold lists the programs it lets agents start on that
machine. **Details** shows the skills and servers at any time.

If an update changes a plugin's MCP servers, Moonfold turns the plugin off again so you can review
them before you turn it back on.

## Which agents use plugins

Enabled plugins reach new Codex and Claude Code turns. A skill is available to the agent like
its own skills; a plugin's MCP tools ask for approval under the thread's permission mode. Other
providers do not load plugins yet.

Turning a plugin on or off applies from the next turn. In a Codex thread that is already running,
a plugin's MCP servers change when the thread's session next starts.

Claude Code starts a plugin's MCP servers in the project folder. A server written for Claude Code
refers to its own files through `${CLAUDE_PLUGIN_ROOT}`, which works. A server that expects to
start inside the plugin's folder works with Codex but may not with Claude Code.
