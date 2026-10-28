# Beta 3 plan: more agents, local models, prompt profiles, scheduled send

Date: 2026-10-28. Branch: `beta-3` (merged to `main` when every gate below passes).
Owner brief: the "CTO plan" of 2026-10-28 (integrations, prompt profiles, scheduled send, Codex
parity). This file is the checked version of that brief: every claim was verified against this
repository and against the real tools on this machine, and the scope was cut to what can be built
and proven here.

## What the brief got right, and what it did not

| Brief says                                                                                                                                                  | Checked                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DeepSeek Harness ships an ACP profile                                                                                                                       | True. `@deepseek-ai/dsh` (MIT, 0.2.1-rc.2 on npm), `dsh --profile acp` serves standard ACP v1 over stdio: sessions, `session/set_config_option` for `model` and `reasoning_effort`, MCP servers. No modes, plans, terminals or elicitation.                                                          |
| Install with `npm i -g @deepseek-ai/deepseek-harness`                                                                                                       | Wrong package name; that one does not exist. It is `@deepseek-ai/dsh`.                                                                                                                                                                                                                               |
| "The ACP rail is built; only a preset is needed"                                                                                                            | Partly. Moonfold reads the public ACP Registry; dsh is not in it. A user can already add it as a local command, but on Windows the npm shim `dsh.cmd` is rejected. There is no catalog of our own.                                                                                                   |
| dsh needs a fixed DeepSeek opener we must inject                                                                                                            | Not ours to inject. dsh assembles its own system prompt; a client adding an opener would duplicate it.                                                                                                                                                                                               |
| Pi is integrated; custom endpoints are "reserved"                                                                                                           | Pi is integrated (RPC, models, thinking levels, skills in the `$` menu). Nothing is reserved for endpoints: they live in Pi's own `models.json`. Pi supports Ollama, LM Studio, vLLM and llama.cpp that way. Pi's npm package is `@earendil-works/pi-coding-agent` (1.4.0); Moonfold needs ≥ 0.80.5. |
| Ollama via Codex is broken                                                                                                                                  | Not re-checked; irrelevant once local models go through Pi and dsh.                                                                                                                                                                                                                                  |
| Composer slash commands are `model, plan, default` only                                                                                                     | True. The send button has no context menu.                                                                                                                                                                                                                                                           |
| The scheduler can attach to a thread                                                                                                                        | True. A task with `threadId` queues its prompt into that thread (`sendToThread`, mode `queue`). One-off `once` schedules exist. Text only: scheduled runs carry no attachments.                                                                                                                      |
| Review, rate limits, hooks, MCP status, memories, plugins, per-site browser rules, per-app computer-use approvals, per-thread usage, hotkey window are open | Already shipped in Phases 2 and 3 (PROGRESS.md). Not in scope again.                                                                                                                                                                                                                                 |
| Pieces for Developers integration                                                                                                                           | Out of scope: a separate commercial memory product; Moonfold already has local memories.                                                                                                                                                                                                             |
| Native Ollama provider                                                                                                                                      | Ollama is a model server, not a coding agent. A native provider would mean writing our own agent loop and tools. Local models go through harnesses that already have one (Pi, dsh, OpenCode).                                                                                                        |

## Scope

### 1. DeepSeek Harness as a listed agent (D-53)

- A small built-in supplement to the ACP Registry catalog, in `provider-acp-registry`: entries with
  the registry's own schema, shown and installed exactly like registry agents. First entry:
  DeepSeek Harness, `npx` distribution `@deepseek-ai/dsh@<pinned>` with args `--profile acp`.
  `npx` is what makes it work on Windows, where the local `dsh.cmd` shim is refused.
- Usage limits: dsh classifies exhausted quota as `QUOTA`/`ACCOUNT_QUOTA` and rate limits as
  `RATE_LIMIT`. Extend the shared ACP limit matcher with exhausted balance/credit wording so these
  end runs as `usage_limit` (generic text, no per-agent branch).
- Docs: `docs/user/providers-deepseek-harness.md`, the providers table, HANDOFF-SIGNALS.
- Verify live: install, create a thread, run a turn, cancel a turn, change model and reasoning
  effort, against dsh routed to local Ollama (no paid key on this machine).

### 2. Local models: Ollama and LM Studio (D-56)

- Server: detect OpenAI-compatible local servers on loopback (Ollama `:11434`, LM Studio
  `:1234`), list their models. Read-only, short timeouts, loopback only.
- Settings → Providers → Pi: "Local models" section that writes the endpoint into an agent
  directory Moonfold owns for that Pi instance (`PI_CODING_AGENT_DIR` pointing at a copy layered
  over the user's), never editing the user's own `~/.pi` without being asked. Models appear in the
  composer picker as `ollama/<model>`.
- Handoff: a local model is just a provider/model pair, so it can be the last entry of the
  fallback order. Document "continue locally when everything else is limited".
- Verify live: Pi 1.4.0 + Ollama `qwen2.5:1.5b` completes a small task in a scratch repo; a
  thread hands off from Claude to the local model.

### 3. Prompt profiles (D-54)

- Contract `promptProfiles`: `{ id, name, description, instructions, source: builtin | user }`,
  built-ins written in our own words: **Moonfold default** (adds nothing), **Careful engineer**
  (small diffs, run tests, explain), **Terminal-first** (Codex-inspired: patch discipline,
  sandbox awareness), **Minimal** (short answers). Custom profiles: free text, 64 KB cap.
- Selection: an environment default in Settings → Personalization, a per-thread override in the
  composer's traits menu; the thread records which profile applied.
- Storage: user profiles and the default in `settings.json` (`promptProfiles`,
  `defaultPromptProfileId`); the thread's override is an optional `promptProfileId` set through
  `thread.metadata.update`, so no new command or migration.
- Delivery: resolved once per turn next to memories (`RunExecutionService`) into
  `ProviderAdapterV2TurnInput.promptProfile`, then through each adapter's existing instructions
  channel: Codex as an `additionalContext` application entry (resent only when it changes; not
  `developerInstructions`, which cannot change after thread start, and not the collaboration-mode
  text, which a model's own mode text replaces); Claude in `systemPrompt.append` and the query
  policy key, like memories; ACP agents (registry, Grok, Antigravity), Cursor, Muse and OpenCode
  through the runtime-instructions block they already send. Pi: the runtime block on the turn.
  AGENTS.md / CLAUDE.md untouched. A handoff carries the thread, so the new provider gets the same
  profile on its next turn.
- Verify live: the same prompt on Codex with two profiles gives visibly different behaviour;
  unit tests per adapter for the delivery path.

### 4. Scheduled send (D-55)

- Right-click (and long-press) on the send button → "Schedule send…": date, time, the thread's
  current agent, model and effort preselected and changeable. `/timed` slash command opens the
  same dialog; `/timed tomorrow 9am fix the test` pre-fills time and text.
- Implementation: a one-off scheduled task bound to the thread (`once` schedule, `threadId`), so
  it survives restarts, queues behind running work, and shows in the thread's automations panel.
  Pending sends show above the composer with Edit and Cancel.
- After a usage limit, the limit notice offers "Schedule for reset" with the reset time filled in.
- Attachments: not supported by scheduled runs; the dialog says so when the draft has any.
- Verify live: schedule two minutes ahead, restart the server, the message is sent and answered.

### 5. Release 0.1.0-beta.3

CHANGELOG, `docs/releases/v0.1.0-beta.3.md`, user docs for each feature, website docs regenerated,
REA gate on the new third-party artifacts (dsh, Pi), tag after main CI is green.

## Not in beta 3 (and why)

- Native Ollama/LM Studio provider with our own agent loop: see above.
- Pieces integration, VS Code extension, `moonfold.json` enterprise lock-down, strict local-only
  network mode, OAuth connectors registry, a hosted plugin store: each is a product of its own;
  tracked in ROADMAP "Later".
- Injecting `.cursorrules` into other agents: Cursor-specific; AGENTS.md and CLAUDE.md are already
  read by the agents that support them.

## Gates

- Targeted tests for every changed module; typecheck of changed packages; `vp fmt --check`,
  `vp check`, `vp run knip:check`, brand check.
- Live checks above, recorded in `docs/QA-BETA3.md` with real output.
- REA gate on `@deepseek-ai/dsh` and `@earendil-works/pi-coding-agent` (docs/REA-BETA3.md).
- Temporary tools installed for testing (dsh, Pi under `D:\moonfold-temp-tools`, a scratch
  `DSH_HOME` and Pi agent dir) are removed at the end; the owner's own configs are not touched.
