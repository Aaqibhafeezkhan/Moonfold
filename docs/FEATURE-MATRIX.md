# Feature matrix

Sources: the public Codex app docs (learn.chatgpt.com index: settings, app-server, skills, plugins, automations, browser, computer use, memories, hooks, subagents, code review) and a first-pass probe of this repo. **"T3 today" is a keyword probe plus directory names, not a verified behavior check.** Every "has it" row needs a hands-on check in Phase 2. Specs here are in our own words.

Legend: **P** protocol-backed (use Codex app-server method), **B** build ourselves, **V** verify first, **S** skip.

| Feature                                                   | T3 today (evidence)                                                                                                       | Path                                               | Phase |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----- |
| Projects, threads, pin, archive                           | Present: pin/archive hits across server, web, contracts; `thread-sidebar.md`                                              | V, then P for Codex-native archive                 | 2     |
| Parallel threads, worktrees, PR flow, diff review         | Present: `worktree` toolkit, `source-control-*`, `pullRequest/`, `review/`, `source-control.md`                           | V                                                  | 2     |
| Goals with budget                                         | Partial: "goal" hits in server (35), web (2), contracts (2)                                                               | V, P (`thread/goal/*`)                             | 2     |
| Plan mode / plan items                                    | Present: interaction-mode hits (server 156, web 34, contracts 9)                                                          | V                                                  | 2     |
| Steer vs queue                                            | Present: "steer" hits (server 102, web 19)                                                                                | V; add setting if missing                          | 2     |
| Review mode (uncommitted, branch, commit, custom)         | Weak: `review/start` only in web (1 hit); `apps/server/src/review/` exists                                                | V, P (`review/start`)                              | 2     |
| Fork, revert, compact                                     | Present: fork (357 server hits), `CodexThreadRevert.ts`, compact hits                                                     | V                                                  | 2     |
| Approvals and permission profiles                         | Present: `permission-modes.md`                                                                                            | V, P (`permissionProfile/list`)                    | 2     |
| Model and effort pickers from the provider                | Present: `model-manifest.md`, `CodexChatGptModels.ts`, `ClaudeModelCatalog.ts`                                            | V (ensure `model/list` is used, no hard-coding)    | 2     |
| Usage and rate-limit meter                                | Partial: usage page (`usage.md`) covers token history and cost; `rateLimits` in server (24) but 0 in web                  | P (`account/rateLimits/*`), B for other providers  | 2, 4  |
| Skills manager                                            | Partial: SKILL.md hits server 28, web 4, contracts 1                                                                      | V, P (`skills/*`)                                  | 2     |
| MCP manager with OAuth and status                         | Partial: server MCP toolkits exist (T3 exposes its own tools); `mcpServerStatus` 1 hit                                    | P (`mcpServerStatus/list`, oauth)                  | 2     |
| AGENTS.md / personalization editor                        | Unknown                                                                                                                   | V, B                                               | 2     |
| Hooks viewer                                              | Weak: few hits                                                                                                            | P (`hooks/list`)                                   | 2     |
| Sub-agent tree                                            | Present (273 server hits for parent/subagent concepts)                                                                    | V                                                  | 2     |
| Import from other agents                                  | Present in some form: `thread-migration.md`, `outside-agents.md`, `browser-import.md`                                     | V                                                  | 2     |
| Settings parity (themes, fonts, shortcuts, notifications) | Present: `appearance.md`, `keybindings.md`, `mobile-notifications.md`                                                     | V against Codex settings doc                       | 2     |
| Pop-out chat, always on top                               | Partial: `preview-pip-preload.ts` in desktop                                                                              | V                                                  | 2     |
| Scheduled tasks                                           | Present: `apps/server/src/scheduledTasks/` (service, schedule, webhooks), `background-service.md`                         | V; likely audit only                               | 3     |
| Browser pane with page comments                           | Present: `apps/server/src/preview/`, `preview-pick-preload.ts`, MCP `preview` toolkits                                    | V; check element comments and per-site permissions | 3     |
| Computer use                                              | Partial: "snap shot" feature (accessibility capture); `computerUse` 5 hits                                                | B, per-OS, off by default                          | 3     |
| Artifacts viewer                                          | Partial: `html-renders.md`, `htmlRender/`                                                                                 | V, B for pdf/docx/xlsx                             | 3     |
| Plugins / marketplace                                     | Weak                                                                                                                      | B (git-repo based; do not use protocol `plugin/*`) | 3     |
| Memories                                                  | Unknown (keyword "memory" matches RAM telemetry, so the probe is meaningless)                                             | V, B                                               | 3     |
| Image input and generation                                | Image input likely (attachments); generation 0 hits                                                                       | V, B                                               | 3     |
| Provider handoff on limits                                | Basic textual handoff exists (`context-handoffs.md`); `UsageLimit` hits 37 server / 18 web may be T3's own limit handling | B on top of existing                               | 4     |
| More providers                                            | Present: Codex, Claude, Cursor, Grok, OpenCode, Antigravity, Pi, Muse, ACP; Gemini CLI via ACP is **V**                   | V, B                                               | 5     |
| Remote access, background service, mobile                 | Present (T3 Connect relay, Tailscale, SSH, mobile app)                                                                    | Rebuild or drop relay                              | 1, 7  |
| Voice, pets, appshots                                     | `voice-input.md` exists; others none                                                                                      | S for beta                                         | 8+    |

## Additions from REA of the Codex desktop app (2026-10-16)

Source: docs/CODEX-APP-REA.md (static evidence, not yet observed running). New or sharper rows:

| Feature                                                                    | T3 today          | Path                                    | Phase |
| -------------------------------------------------------------------------- | ----------------- | --------------------------------------- | ----- |
| Visible follow-up queue: edit, retry, pause after interrupt, side chat     | Steer exists      | B on top of steer                       | 2     |
| Editable plan file plus "implement plan" action                            | Plan mode exists  | B                                       | 2     |
| Move a running chat to a new or existing worktree, bring changes back      | Worktrees exist   | B                                       | 2     |
| Worktree retention (root folder, upstream fetch, auto-delete keep count)   | Unknown           | V, B                                    | 2     |
| Per-thread usage breakdown by model, effort, speed, cached tokens          | Usage page exists | P + B                                   | 2, 4  |
| Hooks list grouped by source with trust state                              | Weak              | P (`hooks/list`)                        | 2     |
| Hotkey quick window                                                        | None found        | B (desktop only)                        | 2     |
| Scheduled task notification policy and custom recurrence (RRULE)           | Scheduler exists  | V, B                                    | 3     |
| Chat-attached recurring task ("heartbeat"), PR auto-fix template           | Unknown           | B                                       | 3     |
| Browser per-site matrix: browse / download / upload x ask / always / block | Preview exists    | B                                       | 3     |
| Computer use per-app approvals with "this chat" vs "always"                | None              | B                                       | 3     |
| Plugin folder format compatible with Codex plugins                         | None              | B (read manifest + skills + MCP config) | 3     |
| Computer history (screen activity log)                                     | None              | S (privacy, out of scope)               | -     |
| Pets, floating Mini panel, hardware macro pad, realtime voice              | None              | S                                       | 8+    |

## Findings that change the plan

1. T3 is much closer to the Codex app than the build plan assumed. Phase 2/3 effort shifts from building to verifying, closing gaps (review mode, rate limits in UI, hooks, MCP status, plugins, image generation, memories) and parity polish.
2. Handoff is not greenfield. See DECISIONS D-4.
3. Biggest Phase 1 cost is not rebranding but removing Clerk/relay/PostHog/app.t3.codes dependencies.
4. The official app's own "handoff" moves chats between checkout, worktree, cloud and phone, not
   between providers (CODEX-APP-REA). Cross-provider handoff remains unique.
5. The unmodified T3 fork already surfaces a real Codex usage-limit error inline (observed
   2026-10-16), so Phase 4 can hook the existing error path instead of adding detection from zero.
