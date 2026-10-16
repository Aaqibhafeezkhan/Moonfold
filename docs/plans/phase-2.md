# Phase 2 plan: Codex-parity layer A (protocol-backed)

Source: BUILD-PLAN Phase 2 rows, the codebase audit of 2026-10-16 (summarized below), and
docs/CODEX-APP-REA.md for how the official app presents each feature (described in our own words).

## Already present (verify, no new work)

Steer vs queue with a General setting; fork, revert and compact; sub-agent tree; plan mode and
plan items; usage limits page and composer meter; model and effort pickers from `model/list`;
four permission modes; archive and pin in Moonfold's own store; keybinding editor with recording,
conflict warnings and reset.

## Work items, in order

1. **Pinned protocol and contract tests.** `packages/effect-codex-app-server` regenerates its schema
   from the `openai/codex` main branch. Pin it to the schema produced by the pinned CLI (0.163.0)
   and add a contract test that every method Moonfold calls exists in the pinned schema with the
   params shape we send. Nothing marked experimental is called without `experimentalApi`.
2. **Review mode** (`review/start`). Targets: uncommitted changes, against a base branch, a
   commit, custom instructions. Entry points: `/review` slash command, command palette, a button
   in the diff panel. Codex only; other providers do not offer native review, so the entry points
   are hidden for them.
3. **Goal token budget.** The `/goal` command and the goal banner accept an optional token budget;
   the banner shows used versus budget from the goal object.
4. **MCP manager** (Settings → MCP): Codex MCP servers with live status
   (`mcpServerStatus/list`), OAuth sign-in (`mcpServer/oauth/login`), and reload
   (`config/mcpServer/reload`).
5. **Skills manager** (Settings → Skills): list (`skills/list`), enable or disable
   (`skills/config/write`), live refresh on `skills/changed`, and a read-only SKILL.md viewer.
6. **Instructions editor** (Settings → Personalization): edit the project's `AGENTS.md` and, for
   Claude, `CLAUDE.md`, plus the user-level files. File based, so it works for every provider.
7. **Hooks viewer**: `hooks/list` in settings, `hook/started` and `hook/completed` shown in the
   thread timeline.
8. **Import from other agents**: `externalAgentConfig/detect` and `externalAgentConfig/import`
   from Settings, with progress.
9. **Account usage**: `account/usage/read` on the Usage page.
10. **Archive sync**: archiving a Codex thread also calls `thread/archive`; unarchive mirrors it.
11. **Keybindings**: search by pressing the keystroke as well as by name.
12. **Pop-out chat** (desktop): open a thread in its own window, with an always-on-top toggle.

Each item ships with server handler, contract or command schema, client operation, UI, and tests
(unit plus a contract test against the pinned schema). The gate (docs/QA-PHASE2.md) exercises each
item against a real `codex app-server` where the account allows it, and records which providers
support it.

## Out of scope here

Collaboration-mode presets (not in the stable schema), `plugin/*` methods (under development),
memories (Phase 3).
