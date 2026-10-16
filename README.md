<p align="center">
  <img src="assets/brand/moonfold-app-icon.svg" width="96" height="96" alt="Moonfold">
</p>

# Moonfold

Moonfold is an open-source workspace for the coding agents you already use. It runs Codex,
Claude Code, Cursor, Grok Build, OpenCode, Antigravity and other agent CLIs on your own machine,
with your own logins, and gives them one desktop and web interface: projects, parallel threads,
git worktrees, diff review, pull requests, scheduled tasks, and remote access from another device.

The goal that sets Moonfold apart is **provider handoff**: when one agent hits its usage limit
mid-task, the same task continues in another agent with the plan, the diff and the open problems
carried over. That work is in progress; see [Status](#status).

Moonfold is a fork of [T3 Code](https://github.com/pingdotgg/t3code) and keeps its MIT license.
See [NOTICE](./NOTICE) for attribution.

## Status

Moonfold is pre-release. There are no published installers yet; build it from source.

| Area                                                  | State                           |
| ----------------------------------------------------- | ------------------------------- |
| Multi-provider threads, worktrees, diff and PR flow   | Works (inherited from Moonfold) |
| Rebrand, local-first defaults, no hosted services     | Done                            |
| Codex-app parity features (goals, review, hooks, ...) | In progress                     |
| Provider handoff on usage limits                      | In progress                     |
| Signed installers for macOS, Windows and Linux        | Planned                         |

## Requirements

Install and sign in to at least one provider CLI with your own account:

- Codex: install the [Codex CLI](https://developers.openai.com/codex/cli) and run `codex login`
- Claude Code: install [Claude Code](https://claude.com/product/claude-code) and run `claude auth login`
- Cursor: install the [Cursor CLI](https://cursor.com/cli) and run `agent login`
- Grok Build: install the [Grok Build CLI](https://x.ai/cli) and run `grok login`
- OpenCode: install [OpenCode](https://opencode.ai) and run `opencode auth login`
- Antigravity: enable it in Settings, then use **Install Antigravity** and **Sign in with Google**

Moonfold never proxies, pools or shares provider logins. Each agent runs as your own local CLI.

## Build from source

You need Node.js 24 and the Vite+ `vp` command.

```bash
curl -fsSL https://vite.plus | bash
```

On Windows, in PowerShell:

```powershell
irm https://vite.plus/ps1 | iex
```

Then:

```bash
git clone https://github.com/Mr-Dark-debug/Moonfold
cd Moonfold
vp i
vp run dev
```

Open the pairing URL that the dev runner prints. `vp run dev:desktop` starts the Electron app.
More detail, including Windows notes, is in [docs/DEV.md](./docs/DEV.md).

## Privacy

Moonfold is local-first. It collects no usage data by default and talks only to the services your
agents and integrations need. See [docs/legal/privacy.md](./docs/legal/privacy.md) and
[docs/user/telemetry.md](./docs/user/telemetry.md).

## Documentation

- [Install and first run](./docs/user/install.md)
- [Permission modes](./docs/user/permission-modes.md)
- [Keyboard shortcuts](./docs/user/keybindings.md)
- [Project settings](./docs/user/project-settings.md)
- [Remote access from another machine](./docs/user/remote-access.md)
- [Connect outside agents over MCP](./docs/user/outside-agents.md)
- [Source control integrations](./docs/user/source-control.md)
- [Codex](./docs/user/providers-codex.md) and [Claude](./docs/user/providers-claude.md) accounts

Architecture: [docs/internals/overview.md](./docs/internals/overview.md).

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) first. Feature ideas go to
[Discussions](https://github.com/Mr-Dark-debug/Moonfold/discussions/categories/ideas). Report
security problems privately as described in [SECURITY.md](./.github/SECURITY.md).

## License and trademarks

MIT. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE).

Moonfold is an independent project. It is not affiliated with or endorsed by OpenAI, Anthropic,
Google, Cursor (Anysphere), xAI, OpenCode, or T3 Tools. Product names are used only to describe
compatibility.
