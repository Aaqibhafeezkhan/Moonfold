# Moonfold build plan

The name is **Moonfold** (confirmed by the owner). "Super Code" was rejected because several active projects already use "Supercode" (see section 1).

## 0. How to run this plan

Honest scope: this is weeks of work, not hours. The plan is split into phases that each end in something runnable, so you always have a working app and never a half-built pile.

How to drive Claude Code:

1. Create an empty GitHub repo (not a GitHub "fork" button repo, see Phase 0 step 1). Open a terminal in it, copy CLAUDE.md and BUILD-PLAN.md into the root.
2. One phase per fresh session. Start each session with: `Read CLAUDE.md, PROGRESS.md and BUILD-PLAN.md section for phase N. Enter plan mode, write the plan, then execute it.`
3. Do not move to the next phase until the gate of the current one passes. Gates are real commands and real manual checks, not "looks done".

Model and settings:

- Main model: Opus 5.5 at high effort. Use xhigh for Phase 0 (architecture) and Phase 4 (handoff engine). Avoid max.
- Subagents on Sonnet 5.5: `export CLAUDE_CODE_SUBAGENT_MODEL=claude-sonnet-5-5`. Or run `claude --model opusplan` (Opus plans, Sonnet executes) for the mechanical phases (2, 3, 5, 8).
- Set model and effort at the start of a session. Switching `/model` mid-session throws away the prompt cache and gets expensive.
- Opus and Sonnet have separate weekly limits on Pro and Max. If Opus runs out, continue with Sonnet 5.5 at high effort and keep the plan files as your memory.

## 1. Product definition

One line: the open-source workspace where Codex, Claude Code, Gemini CLI and friends live in one app, and where your task keeps going when one of them hits its limit.

Why this can stand out: T3 Code and its forks already give a good multi-provider UI. The gap is (a) near-parity with the Codex app's workflow features and (b) real cross-agent continuity. The demo that sells it: Codex hits its usage limit mid-task, you press one button, Claude Code picks up with the plan, diff and open problems intact.

Name check (done during research):

- saharmor/supercode (voice control for IDEs) exists.
- volter-ai/supercode, a Rust "glue tool" for Claude Code, Codex, Gemini CLI, Grok and opencode sessions, is a direct competitor under that exact name.
- A terminal "Supercode" SWE agent already launched on Product Hunt, and there are more by the same name on GitHub and Go/Rust registries.

The name is Moonfold. Phase 0 still verifies availability (GitHub org and repo, npm, domain, trademark search) and records any conflict in docs/DECISIONS.md. It does not reopen the choice.

Non-goals for the beta: hosted cloud service, accounts, billing, resale of tokens, mobile apps (T3's mobile client stays out of scope unless it comes for free with the fork).

## 2. Architecture decisions (confirm in Phase 0)

- Base: T3 Code, MIT, pnpm workspace, Vite+ (`vp`), Electron desktop, web app, event-sourced server. Keep its provider adapter model.
- Codex integration: spawn the user's own `codex app-server` over stdio (the transport OpenAI documents as default; WebSocket and Unix socket are experimental). Handshake with `initialize` then `initialized`, set `clientInfo` to our app name.
- Other providers: through T3's existing adapters (Claude Code, Cursor, OpenCode, Grok, Antigravity). Add a Gemini CLI adapter. Evaluate the Agent Client Protocol (ACP) as a generic adapter layer for Gemini CLI and others before writing bespoke ones.
- Source of truth: our own provider-agnostic event log in SQLite (T3 already projects provider events into SQLite). Provider-native sessions are caches, our log is the record. This is what makes handoff possible.
- Pin Codex CLI version, generate TypeScript schema at build (`codex app-server generate-ts`), contract-test against it.
- Auth: each provider uses the user's own local login. OpenAI states that app-server authentication has never been permitted for commercial or hosted services and recommends "Sign in with ChatGPT" (developers.openai.com/siwc) for open-source apps. Phase 0 must read that page and document which path we follow. The app stays free, local and open source.

## 3. Feature matrix (public Codex app features vs what we build)

Source of truth for Codex features: official docs index at learn.chatgpt.com/llms.txt and the pages below. "Verify T3" means check in Phase 0 whether T3 already has it.

| Feature                                                                                                                   | How we get it                                                                                                                        | Phase |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| Projects, chats, threads, pinned, archived                                                                                | T3 has projects/threads; add archive/pin via `thread/archive`, `thread/metadata/update`                                              | 2     |
| Parallel threads, worktrees, PR flow, diff review                                                                         | T3 has these; verify and polish                                                                                                      | 2     |
| Goals with token budget                                                                                                   | `thread/goal/set/get/clear`, `thread/goal/updated`                                                                                   | 2     |
| Plan mode, plan items                                                                                                     | `turn/plan/updated`, `plan` items, collaboration modes                                                                               | 2     |
| Steer vs queue follow-up setting                                                                                          | `turn/steer` vs queued `turn/start`; setting in General                                                                              | 2     |
| Review mode (uncommitted, branch, commit, custom)                                                                         | `review/start`                                                                                                                       | 2     |
| Fork, revert, compact thread                                                                                              | `thread/fork`, `thread/revert`, `thread/compact/start`                                                                               | 2     |
| Approvals and permission profiles                                                                                         | approval requests, `permissionProfile/list`; T3 has permission modes                                                                 | 2     |
| Model and effort pickers                                                                                                  | `model/list` (never hard-code), per-provider equivalents                                                                             | 2     |
| Usage and rate-limit meter, usage profile                                                                                 | `account/rateLimits/read`, `account/rateLimits/updated`, `account/usage/read`                                                        | 2     |
| Skills manager                                                                                                            | `skills/list`, `skills/config/write`, `skills/changed`, SKILL.md editor                                                              | 2     |
| MCP manager with OAuth and status                                                                                         | `mcpServerStatus/list`, `mcpServer/oauth/login`, `config/mcpServer/reload`                                                           | 2     |
| AGENTS.md and personalization editor                                                                                      | files plus `config/read`, `config/value/write`                                                                                       | 2     |
| Hooks viewer                                                                                                              | `hooks/list`, `hook/started`, `hook/completed`                                                                                       | 2     |
| Sub-agent tree                                                                                                            | `thread/list` with `parentThreadId` (experimental), `collabToolCall` items                                                           | 2     |
| Import from other agents                                                                                                  | `externalAgentConfig/detect` and `import`; our own importer for non-Codex sources                                                    | 2     |
| Settings parity (General, Notifications, Appearance with themes and fonts, Keyboard shortcuts, Personalization, Archived) | build, using public docs as the checklist                                                                                            | 2     |
| Pop-out chat window, always on top                                                                                        | Electron BrowserWindow                                                                                                               | 2     |
| Scheduled tasks (standalone and inside a chat)                                                                            | our own scheduler: cron engine in the server, optional background service (T3 has one), runs a real turn with skills                 | 3     |
| Built-in browser pane with page comments                                                                                  | Electron WebContentsView, annotation overlay, comments become prompt context                                                         | 3     |
| Computer use                                                                                                              | our own MCP server, per-OS native automation, permission gated, off by default                                                       | 3     |
| Artifacts viewer (md, pdf, docx, xlsx, images, html)                                                                      | renderers for open formats                                                                                                           | 3     |
| Plugins (skills + MCP + apps bundle)                                                                                      | our own marketplace on git repos. The protocol's `plugin/*` methods are marked under development, so do not use them in shipped code | 3     |
| Memories                                                                                                                  | local memory store (SQLite), per-project and global, user controlled, visible and editable                                           | 3     |
| Image generation and image inputs                                                                                         | image input via `localImage` items; generation through an MCP tool, provider agnostic                                                | 3     |
| Voice, pets, appshots                                                                                                     | stretch goals, only after everything above is solid                                                                                  | 8+    |
| Provider handoff on limits                                                                                                | our event log plus handoff engine                                                                                                    | 4     |
| Gemini CLI and more providers                                                                                             | adapters, ACP evaluation                                                                                                             | 5     |
| Remote access, background service, mobile pairing                                                                         | T3 has them; rebuild on our own relay or drop for beta                                                                               | 1, 7  |

## 4. Phases

### Phase 0: recon and decisions (no product features)

Prompt:

```
Phase 0. Recon and decisions only. The only code change allowed is making the fork build and run.

1. Create this repo from T3 Code with full history: clone https://github.com/pingdotgg/t3code, keep it as the `upstream` remote, push to our new non-fork origin. Keep MIT LICENSE and copyright intact.
2. Read README, AGENTS.md, CLAUDE.md, CONTRIBUTING.md, docs/internals/overview.md and docs/user/*. Install the toolchain (vp, pnpm), build, run desktop and web. Write exact commands to docs/DEV.md.
3. Map the architecture into docs/ARCHITECTURE.md with a mermaid diagram: workspace layout, provider adapter interface, orchestration and event store, WebSocket protocol, desktop shell, remote relay, update mechanism, telemetry.
4. Audit every outbound domain, analytics call, update feed and relay in the repo. Write docs/NETWORK-AUDIT.md with file and line for each.
5. Install the Codex CLI. Run `codex app-server generate-ts --out docs/protocol/codex` and `generate-json-schema`. Record the CLI version in docs/PROTOCOL.md.
6. Read the official Codex docs index at learn.chatgpt.com/llms.txt and the feature, settings, app-server, skills, plugins, automations, browser, computer use, memories, hooks, subagents pages. Write docs/FEATURE-MATRIX.md in our own words: each public feature, whether T3 already has it, and the implementation path (protocol-backed, build ourselves, skip).
7. Black-box UX study (owner does this, Claude prepares it). Claude writes docs/UX-STUDY-TEMPLATE.md: a checklist of every workflow in the official Codex app that the public docs describe (start a project, run parallel threads, set a goal, plan mode, steer a running turn, review a diff, schedule a task, open the browser pane, install a skill or plugin, change settings and themes). The owner uses the official app normally, with their own account, and fills in short written notes per workflow: what the user does, what they see, what felt good, what felt bad, what is missing. Notes are in the owner's own words. No screenshots or assets are copied into the repo. REA analysis (step 8) can supplement these notes. Claude turns the notes into docs/UX-STUDY.md and feeds it into FEATURE-MATRIX.md. Our UI is designed from these notes and from T3's existing UI, not from pixels of someone else's product.
8. Learn REA and make it a standing tool. Install it (`npx rea-agents setup`). Run `analyze-javascript-application` on our own freshly built desktop app (the unpacked asar from step 2) and use the result as an independent cross-check of docs/NETWORK-AUDIT.md: any T3 domain, update feed, relay or analytics endpoint that REA finds and the manual audit missed gets added. Write the result to docs/REA-SELF-AUDIT.md. Then write docs/REA.md: which REA commands we use, on which target types, and the checklist "REA gate" that later phases reference. REA is applied everywhere in this project on every target we are allowed to analyze: our own builds and installers, the T3 base, every dependency and bundled binary, open-source provider CLIs and adapters (codex, gemini-cli, opencode, and so on), third-party plugins, skills and MCP servers before we ship or recommend them, the official ChatGPT and Codex desktop apps and other proprietary binaries, and anything else. There are no excluded targets. Findings are written up in our own words (see CLAUDE.md rule 3 on copying).
9. Read developers.openai.com/siwc and the Sign in with ChatGPT cookbook. Decide and document the auth path.
10. Name availability check for Moonfold: GitHub org and repo, npm, domain, USPTO and EUIPO quick search, top web results. Report conflicts and alternatives for the owner. The name stays Moonfold unless the owner says otherwise.
11. Write docs/DECISIONS.md and fill the Commands section of CLAUDE.md. Update PROGRESS.md.
```

Gate: the unmodified fork runs with Codex and Claude Code working end to end on this machine. DEV, ARCHITECTURE, NETWORK-AUDIT, PROTOCOL, FEATURE-MATRIX, UX-STUDY and REA-SELF-AUDIT and REA docs exist. The Moonfold availability check is recorded.

### Phase 1: rebrand and repo hygiene

Prompt:

```
Phase 1. Rename everything to Moonfold: package names, bundle and app IDs, protocol handlers, config and data directories, window titles, installer names, update channel names, docs, URLs. Remove or replace every T3-hosted endpoint found in NETWORK-AUDIT.md (update feed, relay, telemetry). Telemetry becomes opt-in and off by default.
Add NOTICE and an About screen crediting T3 Code and its license. Add README disclaimer ("not affiliated with or endorsed by OpenAI, Anthropic, Google, Cursor or T3 Tools"). Add THIRD_PARTY_LICENSES generation and a CI license check.
Create the logo and icon set from section 6 of this file. Replace all T3 imagery.
Add CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue and PR templates.
```

Gate: `grep -ri "t3"` shows only attribution and git history. App starts with no network calls to T3 domains (verify with a proxy capture, include the capture summary). REA gate: re-run REA on the rebranded build and confirm no T3 endpoint, update feed or analytics remains. Lint, typecheck, tests green.

### Phase 2: Codex-parity layer A (protocol-backed features)

Prompt:

```
Phase 2. Implement every "Phase 2" row of the feature matrix in section 3, using the generated app-server schema as the contract. Work feature by feature, each with: server handler, UI, settings if relevant, unit tests, contract test against the pinned schema, and an e2e test against a real `codex app-server` where the account allows it.
Rules: models and efforts come from `model/list`, never hard-coded. Experimental methods require `capabilities.experimentalApi` and a feature flag, and must degrade gracefully when the server rejects them. Settings screens follow the structure in the public settings docs: General, Notifications, Appearance (theme, accent, background, foreground, UI and code fonts, theme export), Keyboard shortcuts (search by name and by keystroke, rebind, reset), Personalization, Memories, Archived.
```

Gate: manual checklist per feature in docs/QA-PHASE2.md, every item exercised on a real project, with the Codex provider and at least one other provider where the feature applies.

### Phase 3: Codex-parity layer B (built by us)

Prompt:

```
Phase 3. Build the "Phase 3" rows: scheduler, browser pane with page comments, computer-use MCP server, artifacts viewer, plugin marketplace, memories, image input and generation.
Order: scheduler, plugins and skills marketplace, memories, artifacts viewer, browser pane, computer use last.
Scheduler: persistent jobs (cron and one-off), runs even when the window is closed via the background service, creates a real thread and turn, supports skills, notifies on completion, full run history.
Plugins: a plugin is a git repo or folder with SKILL.md files and an MCP config. Install, update, enable, disable, remove. Support the open SKILL.md convention so skills written for other agents load.
Browser pane: embedded Chromium view per thread, user can comment on elements, comments are attached to the next prompt as structured context, agent can drive it through an MCP tool with per-site permissions (browse, download, upload: ask, always, block).
Computer use: separate MCP server per OS, off by default, explicit permission screens, visible indicator while active, kill switch, full action log. Research current OS APIs first and write docs/COMPUTER-USE.md. If one OS cannot be done safely, ship the others and document it.
Memories: local only, user-visible, editable, per project and global, can be disabled per chat.
```

Gate: each feature demonstrated end to end by an automated e2e test plus a recorded manual run. Security review of computer use and browser permissions by a separate reviewer subagent. REA gate: run REA on the built app and on every third-party plugin, skill and MCP server we bundle or list in the marketplace.

### Phase 4: provider handoff engine (the headline feature)

Prompt:

```
Phase 4. Build cross-provider handoff.

Model: a "workspace thread" is ours. It contains segments, one per provider session. Our SQLite event log (turns, items, plans, diffs, approvals, errors, usage) is the source of truth. Provider-native sessions are disposable.

Triggers: (a) Codex `error` with `codexErrorInfo` of UsageLimitExceeded, (b) `account/rateLimits/updated` crossing a user-set threshold, (c) the equivalent limit signals from Claude Code, Gemini CLI and others (research each and document), (d) manual "Switch agent" button. Default is ask before switching. Optional auto-switch with an ordered fallback list per project.

Handoff brief, built deterministically from the log, no model needed for the skeleton:
- Objective (the active goal or the first user message of the task)
- Plan and step status (latest `turn/plan/updated`)
- Decisions and constraints stated by the user
- Files changed this task (aggregated `turn/diff/updated`) and current `git status` and `git diff --stat`
- Last N turns verbatim, older turns summarized
- Open problems: last failing command or test output, pending approvals
- Project instructions: AGENTS.md or CLAUDE.md contents
Optionally one summarization call on the incoming model to compress old turns, clearly marked in the UI.

Delivery per target: new native session in the target provider, brief as the first turn. For Codex as target use `thread/inject_items` to append prior context as model-visible history, then `turn/start`. Never reuse another provider's session file format.

Safety: secret scanning and redaction pass on the brief, a preview screen showing exactly what will be sent to the next provider, per-project allow list of providers.

UI: provider badge on every message segment, a visible "handed off from X to Y at <time>, reason" divider, switch back anytime, per-provider usage meters in the header, a fallback order editor.

Tests: golden brief tests from recorded event logs, fake provider adapters for deterministic e2e, a real-provider smoke test script (docs/SMOKE-HANDOFF.md) that the owner can run with their own logins, and a failure-injection test for each trigger.
```

Gate: demo script passes on a real project: start a task in Codex, force the limit path (simulate via fake adapter in CI, real limit or manual button locally), continue in Claude Code, finish the task, tests green, brief previewed and redacted.

### Phase 5: more providers

Prompt:

```
Phase 5. Add the Gemini CLI adapter (evaluate ACP first), verify the existing Cursor, OpenCode, Grok and Antigravity adapters on all three OSes, and add an OpenAI-compatible endpoint provider if the architecture allows it cleanly. Each provider gets: install detection, login status, model list, limit signals for handoff, docs page. A provider that cannot be verified on a real install is not listed as supported. Use REA on each open-source provider CLI and adapter to document its real limit signals, auth flow and network endpoints for docs and handoff triggers.
```

Gate: provider matrix in README generated from tests that actually ran.

### Phase 6: quality, security, performance

Prompt:

```
Phase 6. Hardening. Run: full unit, contract and e2e suites; Electron security audit (contextIsolation, sandbox, IPC allowlist, CSP, navigation and window-open handlers, protocol handlers); dependency audit; secret-leak scan of logs and crash reports; remote access threat model with authentication review; accessibility pass; performance profiling against the budgets in CLAUDE.md; crash recovery (provider process dies, app killed mid-turn, disk full, offline). Use a separate reviewer subagent that did not write the code. Run REA on the production build, every dependency and bundled binary, and each installer; add its findings to the audit. Fix everything rated medium or higher. Record results in docs/QA-REPORT.md.
```

Gate: QA-REPORT.md has no open high or medium items. Budgets met with measured numbers.

### Phase 7: packaging and beta release

Prompt:

```
Phase 7. Release pipeline on GitHub Actions: macOS (arm64 and x64), Windows (x64, arm64 if feasible), Linux (AppImage and .deb). Auto-update from our own GitHub Releases feed. Checksums and SBOM attached. Document signing: unsigned betas trigger macOS Gatekeeper and Windows SmartScreen warnings, so write clear first-run instructions and list what the owner needs for proper signing (Apple Developer account for notarization, a Windows code-signing option). Add a `npx` or one-line install path. Prepare Homebrew cask and winget manifests but do not submit until after beta feedback. Run REA on every release artifact before publishing (REA gate) and attach the summary. Cut v0.1.0-beta.1 as a GitHub pre-release with real release notes.
```

Gate: a clean VM or machine per OS installs the artifact, launches, signs in to a provider, completes a task and a handoff, and updates to a newer build.

### Phase 8: launch assets inside the repo

Prompt:

```
Phase 8. Create the assets listed in LAUNCH-PLAN.md section 2: README with a 20 second demo GIF of the handoff, comparison table that is accurate and links competitors fairly, docs site on GitHub Pages, social preview image 1280x640, short demo videos recorded from the real app (Playwright or screen recording, no mock data), CHANGELOG, ROADMAP, good-first-issues seeded with 15 real issues.
```

Gate: a stranger can go from README to a completed first task in under five minutes (test it on someone).

## 5. Definition of done for the beta

- Phases 0 to 7 gates passed. Handoff demonstrated on real providers.
- No mock data anywhere in the shipped app. No visible stub features.
- No T3 or OpenAI assets in the app. NOTICE and attributions present.
- Installers for macOS, Windows and Linux, tested on clean machines.
- QA-REPORT.md clean of high and medium issues.

## 6. Logo and brand brief

Goal: an original mark that reads as developer tooling, not a copy of anything. Look at ChatGPT, Claude Code, OpenCode and Cursor only to see the genre (simple geometric glyph, strong silhouette at 16 px). Do not echo their shapes or colors.

Concept: Moonfold. A moon (crescent or phase) combined with a fold, one path that folds over and continues, which also reads as handoff. Keep it to one idea.

Deliverables:

- Three distinct concepts as SVG, rendered and screenshot-checked at 1024, 128, 32 and 16 px. Pick one with the owner.
- Final master SVG, rounded-square app icon, macOS template tray icon (monochrome), Windows .ico, Linux PNG set, favicon, wordmark in an open-licensed font, light and dark variants, social preview 1280x640.
- Palette: not black and white (OpenAI), not clay orange (Anthropic), not near-black cube (Cursor). Suggest deep ink navy with one signal accent (amber or electric violet), then verify contrast.
- Do a reverse image search of the final mark and document the result in docs/BRAND.md.
