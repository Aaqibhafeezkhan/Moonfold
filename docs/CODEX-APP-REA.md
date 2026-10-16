# Codex desktop app: REA findings (Phase 0)

Date: 2026-10-16. Analyst: Claude Code session on the owner's Windows 11 machine.
Rules: CLAUDE.md "Legal and clean-room rules". This file describes behavior in our own words.
No code, assets, icons or UI strings from the target are copied into Moonfold. Names of
internal files are quoted only as evidence locators.

## Target

| Field                | Value                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------- |
| Package              | MSIX `OpenAI.Codex` 26.1007.9446.0 x64 (Microsoft Store install)                          |
| Electron app         | package version 26.1007.71326, Electron 42.3.0, built with Electron Forge + Vite          |
| `app.asar`           | 567 MB, sha256 `356c13dc715816436fa1cf31e9f77863f62ea7b7cacc465b397313246eb29325`         |
| Extracted tree       | sha256 `110ed9e7336e7dd61831aa369bcdb008ce1b49f540c56c9df68f7401e5078137` (REA directory) |
| Launcher `Codex.exe` | 20 KB stub, no Electron fuse sentinel (fuse state unknown, see limitations)               |

Extraction used `@electron/asar` 3.4.1 into the session scratchpad. Nothing from the target is in the repo.

## REA evidence

| Evidence ID (prefix) | Operation                                          | Result                                                                                                                                                                                                                                       |
| -------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ev_84cdafe6…`       | `inspect_electron_fuses` on `Codex.exe`            | No sentinel in the launcher stub. Fuses live in the real Electron binary under the package; not inspected.                                                                                                                                   |
| `ev_e242ea78…`       | `analyze_javascript_application` (asar, inventory) | 16,197 files inventoried. 8 native binaries have integrity metadata that disagrees with observed bytes (expected after native rebuilds; treated as untrusted).                                                                               |
| `ev_4cb9d3db…`       | same, directory, main process + preloads selected  | 7 JS files parsed, 1.34 M AST nodes, 3 `contextBridge` APIs, 38 IPC operations (36 with computed channel names), 12 sender-validation checks. Two large bootstrap files were cut short by REA's result budget; their module facts were kept. |

Coverage is partial by design: we selected the main-process and preload sources. The 14,770
renderer chunks were inventoried by name and sampled with targeted text reads, not parsed by REA.
Static analysis does not prove what runs; nothing here was executed.

## Architecture observations

- **Two products in one shell.** The renderer bundle carries both the coding agent and the general
  chat product (consumer widgets, medical calculators, sports schedules, image generation, voice).
  The coding surface is a set of routes inside a larger app. Moonfold stays a focused coding tool.
- **One typed message bus over IPC.** The preload exposes one bridge object. The view sends typed
  messages to main through a single invoke channel and receives events on a single channel. Worker
  traffic gets a per-worker channel pair. A "shared object" store is snapshotted synchronously at
  preload time and kept in sync by update messages, so the first paint has settings without a
  round trip. Large payloads are streamed as chunked token sequences with acknowledgements.
  _Takeaway:_ T3 already uses a typed WebSocket protocol; keep it. The synchronous bootstrap
  snapshot is worth copying as an idea for cold-start time (budget: under 3 s).
- **Separate worker process** (`worker.js`, about 2.4 MB) next to the main process, likely owning
  the app-server connection and heavy work off the main thread. _Takeaway:_ T3's split (Node
  server process plus Electron shell) already gives us this.
- **Bundled helpers:** a full `codex` CLI binary, a code-mode host, a command runner, a Windows
  sandbox service and its setup tool, ripgrep, a bundled Node runtime for computer use, a LaTeX
  engine, and native addons for HID devices, Windows account info, the updater and remote-control
  device keys. _Takeaway:_ Moonfold relies on the user's own installed CLIs (rule 7) and should not
  bundle provider binaries.
- **Error reporting** is wired into the preload (Sentry IPC bridge). Moonfold's equivalent stays
  off by default (rule 6).

## Plugin and skill format (confirmed from shipped files)

The app ships nine bundled plugins (browser, chrome, code review, app tools, computer use, deep
research, LaTeX, unified computer use, visualize). The on-disk layout is:

- A marketplace folder with an index file listing plugins, each with a display name.
- Each plugin is a folder holding a manifest (name, version, description, author, homepage,
  repository, license, keywords, a pointer to an MCP server config, and display metadata such as
  category, capabilities, default prompt, brand colour and light/dark logos), optional `skills/`
  folders with `SKILL.md` files, optional scripts and assets, and an optional MCP server config
  that points at a local server script.
- Plugins carry signatures in a sibling folder.

This matches the plan in BUILD-PLAN section 3: a plugin is skills plus MCP config plus assets,
installable from a git repo or folder. Moonfold should read this layout so plugins written for
Codex load, without depending on the app-server `plugin/*` methods (still marked under development).

## Feature inventory (coding-relevant)

Each line: what the target does, then the Moonfold implication. "T3" means T3 Code already has
something comparable per FEATURE-MATRIX.md (to verify in Phase 2).

### Threads and composer

- **Queue vs steer.** Follow-ups typed during a running turn either queue or steer. The user can
  switch the default from the queued message's menu. Queued messages can be edited, deleted, retried
  after a send failure, or opened as a side chat. Interrupting a turn pauses the queue until resumed.
  Moonfold: T3 has steer; add the paused-queue state, retry, and "open as side chat".
- **Side chat.** A temporary secondary conversation attached to a thread, which can expire.
  Moonfold: Phase 2 candidate; low priority.
- **Goal panel.** A thread goal is editable in a side panel with revert and last-updated time.
  Moonfold: protocol-backed (`thread/goal/*`), Phase 2.
- **Plan files.** Plans are saved as files, open in an editable side panel, and an "implement this
  plan" action sends the plan back as the next prompt. Moonfold: T3 has plan mode; add editable
  plan file and implement action.
- **Fork** into a new thread, including into a worktree (fails if the source has no directory).
- **Thread summary panel** showing changes, artifacts, images, attached scheduled task and usage.
- **Per-thread usage breakdown** by model, reasoning effort and speed tier, including cached input
  tokens. Moonfold: feeds the Phase 4 usage meters.
- **Hotkey window** and **Mini**: a global-shortcut quick window and an optional floating compact
  panel. **Pets**: a customizable floating mascot. Moonfold: hotkey window is a Phase 2 candidate;
  pets and Mini stay out of beta scope (BUILD-PLAN "voice, pets, appshots" = stretch).
- **Annotations and comments** attach to the composer as structured context (artifact comments,
  browser element comments, diff comments).

### Local handoff (not cross-provider)

The target has a "hand off" flow that moves a chat between the main checkout and a worktree (new
or existing), creating or checking out a branch and optionally bringing changes back. It also hands
work between desktop, cloud and mobile. **It does not move a task to a different agent provider.**
Moonfold's headline cross-provider handoff remains a real differentiator.

### Worktrees and git

- Worktree settings: custom root folder, fetch upstream before creating, automatic deletion of old
  worktrees with a keep count (with a confirm step when turning it off), per-worktree conversation
  list and manual delete. Moonfold: T3 has worktrees; add the retention policy and root setting.
- Git actions: new branch, commit, rebase, create PR, GitLab merge requests, PR side panel with
  checks, comments, revisions and an in-app PR review view.
- **PR auto-fix automation:** a recurring "heartbeat" turn that re-checks the live PR state and
  keeps fixing it, with guardrails (do not modify the user's checkout, do not create more
  automations). Moonfold: Phase 3 scheduler can express this as a built-in automation template.

### Review

- Review mode from a slash command: review uncommitted changes, or review against a chosen base
  branch. A separate safety review can pause a chat until the user acknowledges findings.
- Code review settings page and a bundled code-review plugin (MCP server). Moonfold: protocol
  `review/start` plus our own UI, Phase 2.

### Automations (scheduled tasks)

- Fields: name, prompt, project, model, reasoning effort, sandbox mode guidance.
- Schedules: hourly with minute, daily, weekly with weekdays, monthly with day of month, one-off
  date, end date, and a custom recurrence rule editor (RRULE).
- Runs locally or in the cloud. Can be standalone or attached to an existing chat ("heartbeat"
  that continues that chat).
- Notification policy per automation: all runs, important updates, failures only, or none for
  completed runs.
- List page with search, detail side panel, pause/resume, delete with confirmation, next-run label.
- The app can suggest an automation from a conversation.
- Moonfold: T3 has `scheduledTasks/`. Phase 3 audits against this list; RRULE editor, notification
  policy and chat-attached heartbeat are likely gaps. Cloud runs are out of scope (local-first).

### Browser use

- Built-in browser plus a Chrome extension route. Per-site permissions in a matrix of browse,
  download and upload, each with default / always allow / block, with inherited defaults and a
  "blocked by network policy" state. Browsing data can be cleared. Element comments attach to the
  prompt. Moonfold: matches the Phase 3 browser-pane spec; T3 has `preview/` to extend.

### Computer use

- Per-app approval prompts (this conversation only vs always), an "elevated risk" label, an
  always-allowed apps list, a locked-screen use toggle, live control of Office apps, and per-chat
  read/send permissions for the Messages app (macOS).
- **Computer history**: an opt-in screen-activity history with a privacy confirmation, per-app
  recording allow list, timeline, delete and clear, and suggestions to turn observed work into
  skills or automations. Moonfold: computer use is Phase 3, off by default; computer history is a
  privacy-heavy feature and stays out of scope unless the owner asks.

### Skills, plugins, MCP, hooks

- Skills page with cards, detail view and SKILL.md contents; plugins page with install, detail,
  enable/disable, share and marketplace sources; MCP server elicitation requests surface as panels;
  MCP app views can render inside a thread.
- Hooks settings list hooks by source: managed config (cloud or local), project, session flags,
  with trusted/untrusted state. Moonfold: protocol `hooks/list`, Phase 2, show source and trust.
- `AGENTS.md` editor exists. Moonfold: Phase 2 personalization/instructions editor.

### Settings layout (coding-relevant sections)

General, Appearance (themes; code themes such as GitHub, Catppuccin, Ayu, Material families and
the app's own light/dark), Notifications, Keyboard shortcuts (searchable, grouped into general,
navigation, project, panel, skill, task and configuration), Personalization, MCP, Plugins, Skills,
Browser use, Computer use, Local environments, Worktrees, Git, Code review, Usage, Account,
Data controls, Archived chats, Import (from other agents), Connections, Storage, Open-source
licenses. Moonfold Phase 2 settings parity uses this as the checklist, together with the public
settings docs.

### Out of scope for Moonfold (observed, deliberately skipped)

Consumer chat widgets, cloud environments and cloud automations (hosted), parental controls and
age verification, billing, a hardware macro-pad integration ("micro" device with joystick and
keys), realtime voice, pets, Mini, mobile pairing through the vendor's relay.

## Limitations and unknowns

- Renderer chunks were not REA-parsed (14,770 files); the inventory above comes from chunk names
  and localization descriptions, which describe intent but not behavior. Each item needs a
  hands-on check by the owner (docs/UX-STUDY.md) before we treat it as a spec.
- Electron fuses, window options and CSP of the real Electron binary were not inspected.
- No runtime observation was done. Nothing in this document shows network endpoints of the target.

## Follow-ups

- Inspect the packaged Electron binary's fuses and `webPreferences` for a security baseline to
  match or beat (Phase 6).
- Compare this inventory against the next Codex app release with `compare_application_versions`
  when it ships.
