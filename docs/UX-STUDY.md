# UX study: Codex app workflows

Sources, in order of authority:

1. Owner's hands-on notes (template: `docs/UX-STUDY-TEMPLATE.md`). **Not collected yet.** The owner
   asked the build to proceed without blocking on questions, so this first version is built from
   sources 2 and 3. When the owner adds notes, they override anything below.
2. REA static analysis of the installed Codex desktop app (`docs/CODEX-APP-REA.md`).
3. Public Codex docs as summarized in `docs/FEATURE-MATRIX.md`.

Everything is in our own words. "Expect" means what the target appears to do from static evidence;
it has not been observed running. "Moonfold" lists what we take from it.

## 1. Start a project and a first chat

- Expect: pick a folder as a project; a project picker sits in the composer; a consent step before
  the app reads a folder; new-thread page with a prompt box.
- Moonfold: T3 flow already does this (verified on this machine 2026-10-16: add project, new thread,
  pick provider/model, send). Keep the folder-consent idea for remote environments.

## 2. Parallel threads and worktrees

- Expect: start a thread in the current checkout or a new worktree; move a running chat to a worktree
  later and optionally bring the changes back; worktree settings for root folder, upstream fetch and
  automatic cleanup with a keep count.
- Moonfold: T3 has worktrees. Gaps: move-to-worktree mid-chat, retention policy, root setting.

## 3. Goal

- Expect: a goal attached to the thread, editable in a side panel, with revert and "updated" time.
- Moonfold: protocol `thread/goal/*` (Phase 2); also the objective seed for the Phase 4 handoff brief.

## 4. Plan mode

- Expect: plan saved as a file, editable in a side panel, one action to implement it.
- Moonfold: T3 interaction modes exist; add plan file plus implement action.

## 5. Steer vs queue

- Expect: default follow-up behavior is switchable; queued messages are visible, editable, retryable,
  pausable after an interrupt, and can be split into a side chat.
- Moonfold: add the visible queue states. The setting lives in General.

## 6. Review

- Expect: review uncommitted changes or against a base branch from a slash command; diff comments
  attach to the prompt; PR side panel with checks and comments.
- Moonfold: T3 has diff review and PR flow; add review mode via `review/start` (Phase 2).

## 7. Fork, revert, compact

- Expect: fork into a new thread or a worktree; compaction cadence exists.
- Moonfold: T3 has these per FEATURE-MATRIX; verify on Codex and Claude.

## 8. Permissions and approvals

- Expect: sandbox mode drives defaults; per-app approvals for computer use (this chat vs always,
  elevated-risk label); per-site browser permissions for browse, download, upload.
- Moonfold: default to the safest mode (CLAUDE.md). Reuse the three-way (ask / always / block) model
  for browser and computer use in Phase 3.

## 9. Scheduled tasks

- Expect: name, prompt, project, model, effort; hourly to monthly plus custom recurrence; standalone or
  attached to a chat; notification policy (all, important, failures only, none for success).
- Moonfold: Phase 3 audit of T3 `scheduledTasks/` against this list. Cloud runs are out of scope.

## 10. Browser pane and element comments

- Expect: built-in browser, element comments into the prompt, per-site permission matrix, clear data.
- Moonfold: extend T3 `preview/` in Phase 3.

## 11. Skills and plugins

- Expect: skills page with cards and SKILL.md view; plugins as folders with a manifest, skills, an MCP
  server config and assets; marketplace sources; enable, disable, share.
- Moonfold: read the same folder layout (see CODEX-APP-REA "Plugin and skill format"), git-based
  install, no use of the under-development `plugin/*` protocol methods.

## 12. MCP servers

- Expect: settings page for MCP; elicitation requests appear in-thread; MCP app views render in a
  side panel.
- Moonfold: `mcpServerStatus/list` and OAuth login (Phase 2).

## 13. AGENTS.md, personalization, memories

- Expect: an AGENTS.md editor; personalization settings; memories managed behind a gate.
- Moonfold: editor plus local, visible, editable memories (Phase 2 and 3).

## 14. Theme, fonts, shortcuts, notifications

- Expect: app light/dark plus many code themes; searchable shortcuts grouped by area; notification
  settings.
- Moonfold: T3 has appearance and keybindings docs; Phase 2 parity pass.

## 15. Usage and rate limits

- Expect: usage settings page and a per-thread breakdown by model, effort and speed tier.
- Moonfold: Phase 2 meter plus Phase 4 per-provider meters. Observed on this machine: a real Codex
  turn returned a usage-limit error with no reset time, which T3 shows inline as "Usage limit
  reached". This is the first Phase 4 trigger to handle.

## 16. Archive and restore

- Expect: archived chats settings page with restore and bulk delete.
- Moonfold: T3 has archive; verify restore path (reverse state rule in AGENTS.md).

## Owner notes

Add notes per workflow here using the template format. Leave the sections above as the baseline.
