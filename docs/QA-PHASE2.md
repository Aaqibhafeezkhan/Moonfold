# Phase 2 gate: Codex-parity layer A

Date: 2026-10-16. Machine: Windows 11 x64, Codex CLI 0.161.0 (schema pinned to 0.163.0), Claude
Code CLI 2.1.293. Plan: docs/plans/phase-2.md. Every item below was exercised on a real project
(a scratch git repository, never this repo) against the real provider, through the web client
served by `vp run dev --home-dir D:/projects/Moonfold/.moonfold` or the desktop app from
`vp run dev:desktop`. "Unit only" marks an item whose live run is still owed.

## Codex protocol features

| Item                     | How it was exercised                                                                                                  | Result                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Pinned protocol contract | `apps/server` contract test checks every Codex method Moonfold calls against the schema generated from the pinned CLI | Pass                                                                                 |
| Review mode              | `/review` in the composer and the diff panel Review button on uncommitted changes                                     | Codex entered and left review mode and reported no actionable bugs in the change     |
| Goal token budget        | `/goal --budget 60k <objective>`                                                                                      | Codex edited `calc.js`; the banner ended at "Goal complete · 30k / 60k tokens"       |
| MCP, skills, hooks       | Codex provider card in Settings: listed MCP servers and skills, toggled a skill off and on                            | `config.toml` changed and was restored by the toggle back                            |
| Import from other agents | Provider card section opened against the real Codex                                                                   | Section loaded; detect and import paths are covered by unit tests, no import was run |
| Account usage            | Provider card usage section opened against the real Codex                                                             | Loaded from `account/usage/read`                                                     |
| Hook runs in the thread  | Unit only (no hooks configured on this machine)                                                                       | `hook/started` and `hook/completed` map to thread notices in tests                   |
| Archive sync             | Archived and unarchived a persisted Codex thread                                                                      | Codex's own copy followed both ways                                                  |
| Permission profiles      | Unit only                                                                                                             | Allowed profiles map to runtime modes in tests                                       |

## Features built by Moonfold

| Item                                 | How it was exercised                                                                                                                  | Result                                                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Keybinding search by keystroke       | Pressed a shortcut in the search box                                                                                                  | The matching rows were listed                                                                                                            |
| Pop-out chat, keep on top            | Opened a thread in its own window in the desktop app (driven over CDP)                                                                | Window opened with the sidebar collapsed; keep-on-top applied only to the pop-out                                                        |
| Agent instructions (Personalization) | Opened Settings → Personalization                                                                                                     | Showed the real `~/.codex/AGENTS.md` and a not-yet-existing `~/.claude/CLAUDE.md`; saving was not tried to leave the owner's files alone |
| Keep only recent worktrees           | Storage settings row                                                                                                                  | Row present; retention covered by `storageCleanup` tests                                                                                 |
| Move to a new worktree               | Thread menu → Move to new worktree…, with uncommitted changes                                                                         | Changes moved into the new worktree, project folder left clean, no stash left behind                                                     |
| Bring back to project folder         | After a commit in the worktree                                                                                                        | "Merged feature/review-request into main"; `main` fast-forwarded                                                                         |
| Move to an existing worktree         | Existing worktree tab in the same dialog                                                                                              | Listed the project's other worktree; thread re-pointed, path stored as git lists it                                                      |
| Per-thread usage                     | Thread details panel → Usage on a Codex thread and a Claude thread                                                                    | Codex: "GPT-6-Astra · 172k · 82% cached"; Claude: "Claude Haiku 5.5 · 471k · 86% cached"                                                 |
| Ask on the side                      | Asked a Codex thread which function the goal added, and a Claude thread which error `divide` throws                                   | Both answered correctly from the conversation; nothing joined either thread                                                              |
| Quick window (desktop)               | Recorded Ctrl+Alt+K in Settings → General, pressed it through Windows                                                                 | Opened on top with a new draft, hid on the second press, came back on the third; Turn off released the key                               |
| Edit a proposed plan                 | Claude Haiku 5.5 in plan mode proposed a plan for `divide(a, b)`; the plan menu's Edit plan changed its error message, then Implement | Claude wrote `divide` with the edited message ("Cannot divide by zero"), so Implement sent the edited plan                               |
| Send a failed message again          | Unit only                                                                                                                             | The failed run's text and attachments are sent again                                                                                     |

## Defects found by the gate and fixed

- A move to a new worktree followed the "start new worktrees from origin" setting and failed in a
  repository without a remote (it would also have put carried changes on a different base). Fixed
  in `921c8f976`; the real-git tests now run with that setting on.
- The usage breakdown first lived in the composer's context meter, which is off by default.
  Moved to the thread details panel (`cf3a3792d`).

## Other providers

Claude Code (Haiku 5.5) was the second provider: plan editing, side questions and the usage
breakdown were exercised on a Claude thread (rows above). Move and return, the quick window,
pop-out and the instructions editor do not depend on the provider. Codex-only items (review,
goal budgets, the provider card sections, archive sync, permission profiles) are hidden for other
providers.

The run surfaced one more defect, fixed before the merge: a slash command Claude answers locally
reports zero usage and was counted as a turn in the breakdown.

## Automated checks (2026-10-16/17, this machine)

- `vp run -r --concurrency-limit 2 typecheck`: exit 0. `vp fmt --check`: clean. Brand and icon
  checks: clean.
- `vp lint --report-unused-disable-directives`: 0 errors in tracked code (the only errors are in
  the untracked `moonfold-website/` folder).
- Tests compared with the unmodified baseline worktree on the same machine: web 6869/6869,
  client-runtime 2088/2088, contracts 667/667, and every other package green except the
  Windows-only failures the baseline shares. Server: 94 failed, 6022 passed, the same 89 failing
  cases as the baseline (4 differ only by the rebrand in their titles). Desktop: the same 33.
  Three timeouts (provider-acp terminal snapshots, provider-cursor discovery scan, the Knip CLI
  test) also fail in the baseline under the same load.
