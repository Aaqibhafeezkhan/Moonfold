# Phase 3 plan: Codex-parity layer B (built by Moonfold)

Source: BUILD-PLAN Phase 3, docs/CODEX-APP-REA.md and docs/UX-STUDY.md (how the official app
presents each feature, in our own words), and a codebase audit on 2026-10-17. Order follows
BUILD-PLAN: scheduler, plugins and skills, memories, artifacts, browser pane, computer use last.

## What already exists (audit)

- **Scheduler**: interval, daily/weekly wall-clock and signed webhook triggers; each run launches a
  new thread or queues into a bound thread; MCP tools let agents create tasks bound to their own
  thread. Missing: one-off and cron schedules, per-task time zone, end date, run history (only
  `lastRun*` columns), run status that follows the agent's turn (today "succeeded" means the
  prompt was handed over), notification policy, binding a task to a chat from the UI, a skill
  picker, a PR auto-fix template, and running with the window closed on Windows.
- **Skills**: discovered per provider (Codex `skills/list`, Claude and others from their own
  folders) and offered in the composer. No Moonfold-owned skills or plugins.
- **Plugins**: none. User MCP servers are manageable for Codex only.
- **Memories**: none. Agent instructions files are editable (Phase 2).
- **Artifacts**: file previews for images, PDF, markdown, CSV/TSV, HTML, audio, video; HTML
  renders. Missing: docx and xlsx viewers, and a per-thread list of what the thread produced.
- **Browser pane**: per-thread tabs (native webview on desktop, streamed headless Chrome
  elsewhere), element and region annotations attached to the next prompt as structured context,
  21 MCP tools for agents. Missing: per-site permissions (browse, download, upload x ask, always,
  block) and annotations on streamed tabs.
- **Computer use**: none (Snap Shot captures a window for the user, not for agents).
- **Image input**: present for every adapter that accepts images. **Image generation**: none.

## Work items

1. **Scheduler**
   - New schedule kinds: `once` (a local date and time) and `cron` (five-field expression), both
     with an IANA time zone; optional end date for recurring kinds. The cron parser is ours (small,
     tested); no RRULE dependency. The UI offers presets (hourly at a minute, daily, weekdays,
     weekly, monthly on a day) that write cron, plus a custom field with a plain-language preview.
   - Run history: a `scheduled_task_runs` table (trigger, started, finished, status, thread, run,
     error). A reactor finishes a run when the thread's run settles, so status means the agent's
     outcome. The task form gets a history list linking to each run's thread.
   - Notification policy per task: every run, failures only, never. Applied by the client
     notification coordinator and by the desktop shell when no window is open.
   - Bind a task to an existing thread from the form (the heartbeat); skill picker in the prompt
     field; a "Fix this pull request" template that targets a PR thread's worktree and never the
     user's checkout.
   - Windows and Linux desktop: an opt-in "keep running in the background" (tray icon) so tasks run
     after the last window closes.
2. **Plugins and skills**
   - A Moonfold plugin store under the Moonfold home: install from a git URL or a local folder,
     update (git pull or re-copy), enable, disable, remove. A plugin is a folder with `SKILL.md`
     skills and an optional MCP config; the Codex plugin layout (manifest, `skills/`, MCP config)
     is read too, so Codex plugins load.
   - Delivery per provider, decided per adapter: skills and MCP servers reach Claude through the
     Agent SDK's local plugin option and session MCP config, and Codex through its skills folders
     and session MCP config. Providers without a way in are marked "not supported".
   - Settings → Plugins: list, detail with SKILL.md and MCP servers, install dialog, toggles.
     Before install the user sees what will run (commands of MCP servers). REA runs on any plugin
     we list or bundle.
3. **Memories**
   - Local SQLite store, global and per project, each memory a short editable text with its source.
   - Settings → Memories: list, add, edit, delete, global on/off. Per-thread "don't use memories".
   - Delivery: enabled memories are added to the session's runtime instructions at session start.
     Agents can propose a memory through an MCP tool; it is saved only when memories are on.
4. **Artifacts**
   - docx and xlsx viewers in the file preview (open-format renderers, license-checked).
   - Thread details panel → Artifacts: files the thread wrote or attached, images, HTML renders,
     each opening in the preview.
5. **Browser pane**
   - Per-site rules for agent browsing, downloads and uploads: ask, always, block, with inherited
     defaults. Asks appear as a prompt in the thread; decisions can be this-chat or always. Settings
     → Browser lists and edits the rules.
   - Annotations on streamed tabs if the stream can carry the overlay; otherwise documented.
6. **Computer use** (last)
   - Research first, written to docs/COMPUTER-USE.md. Windows ships first: a separate MCP server
     using UI Automation for reading and SendInput for acting, both built into Windows.
   - Off by default. Per-app approval (this chat or always), a visible indicator while active, a
     kill switch, and a full action log. macOS and Linux are documented and shipped only if they
     can be built and verified safely; this machine runs Windows.
7. **Image generation**: only through a provider's own tool (rendered in the thread when a
   provider produces images). No Moonfold-held image API key in this phase.

## Gate

- Each item: unit tests plus an integration test that drives it through its RPC or MCP surface
  with real persistence (and real git or real files where relevant), and a recorded live run
  against a real provider on this machine, logged in docs/QA-PHASE3.md.
- Security review of computer use and browser permissions by a separate reviewer subagent.
- REA gate (docs/REA.md) on the built app and on every third-party plugin, skill and MCP server we
  bundle or list. Results in docs/REA-PHASE3.md.
- Before merging: `vp run knip:check`, `vp check`, typecheck, tests vs the baseline, green CI.

## Out of scope

Cloud runs of tasks; a screen activity history; Moonfold-held image generation keys.
