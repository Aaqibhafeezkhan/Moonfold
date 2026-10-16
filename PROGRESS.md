# Progress

## Phase 0: recon and decisions (complete, 2026-10-16)

Started 2026-10-15 in a cloud container; finished 2026-10-16 on the owner's Windows 11 machine.
Plan: docs/plans/phase-0.md.

### Done

- Docs added to repo; name set to Moonfold; REA applies to all targets (owner decision).
- Imported T3 Code (MIT) full history as `upstream` (merge `65a3bc9f5`); our `CLAUDE.md` imports upstream `AGENTS.md`.
- Toolchain: Linux (container) and now Windows: Node 24.14.1, `vp` 1.2.0, `vp i`, server + web build (1 m 44 s). Windows caveats in DEV.md.
- **Gate run on this machine** (unmodified fork, `vp run dev --home-dir D:/projects/Moonfold/.t3`, scratch git project):
  - Claude Code (Claude Haiku 5.5, CLI 2.1.293): turn completed, edited `calc.js`, diff panel showed +5/-1, result verified with `node` (`subtract(5,2) = 3`).
  - Codex (CLI 0.161.0): handshake, model list and turn start worked; the account was at its usage limit, so the turn ended with "Usage limit reached" and no reset time. Codex end-to-end editing is therefore **not** demonstrated yet; the limit path is.
- Codex desktop app (Store build 26.1007) reverse-engineered with REA: docs/CODEX-APP-REA.md. Fed into FEATURE-MATRIX.md (new rows) and a first docs/UX-STUDY.md.
- REA server-bundle re-run completed (was a timeout); new outbound hosts attributed in NETWORK-AUDIT.md.
- SIWC subpages read; D-3 decision unchanged with reasons (DECISIONS.md).
- Name re-check: npm free; GitHub user handle `Moonfold` is taken by someone else (org name free); `moonfold.dev` likely free.
- Brand: three concepts drawn, "folded moon" chosen, masters in `assets/brand/`, docs/BRAND.md.

### Verification (real output, 2026-10-16, Windows)

- `vp lint --report-unused-disable-directives`: exit 0, 0 errors, 924 warnings (all upstream code; no code changed in Phase 0).
- `vp fmt --check`: "All matched files use the correct format" (6,743 files) after formatting BUILD-PLAN.md, LAUNCH-PLAN.md and new docs.
- `vp run -r --concurrency-limit 2 typecheck`: exit 0, 0 errors across 32 tasks (Effect diagnostics are suggestions only).
- `vp test run packages/contracts/src/environmentHttp.test.ts packages/contracts/src/orchestrationV2.test.ts`: 2 files, 39 tests passed. Full suite not run (CI owns it; no code changed).
- Contract tests and e2e: none exist yet for Moonfold (Phase 2 adds contract tests).

### Not verified

- Codex completing an edit (account at usage limit at the time of the run). Re-run when the limit resets.
- Desktop (Electron) dev and packaged build; REA on the unpacked asar. Phase 1 gate.
- Owner's hands-on UX notes (UX-STUDY.md is built from REA and docs; D-11).
- Formal USPTO/EUIPO trademark search; reverse image search of the mark.

### Decisions

DECISIONS.md D-1 to D-11. New this pass: D-8 brand mark, D-9 Codex CLI version on the dev machine, D-10 cross-provider handoff stays unique (the official app's handoff is local/worktree/cloud only), D-11 UX study without owner notes.

### Open problems

- `.t3` dev home must always be passed explicitly in the main checkout (DEV.md).
- Running the server CLI while `vp run dev` is up restarts the dev server once (watch mode).
- The web dev client posts traces to `/api/observability/v1/traces` very frequently (hundreds of requests in a few minutes). Check in Phase 1 whether this is dev-only and whether it should be off by default.
- NETWORK-AUDIT TODOs: electron-builder publish owner/repo, server self-update, desktop telemetry publisher, `PreviewBrowser.ts` use of `storage.googleapis.com`.

### Next step

Phase 1 (rebrand and repo hygiene): start in plan mode, write docs/plans/phase-1.md. Rename to Moonfold, remove Clerk/relay/PostHog/app.t3.codes, telemetry opt-in, NOTICE + About + disclaimers, icon set from `assets/brand/`, desktop build + REA gate.
