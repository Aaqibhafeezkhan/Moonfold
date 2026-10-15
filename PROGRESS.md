# Progress

## Phase 0: recon and decisions (in progress, 2026-10-15)

### Done

- Docs added to repo; name set to Moonfold; REA applies to all targets (owner decision).
- Imported T3 Code (MIT) full history as `upstream` (merge `65a3bc9f5`); our `CLAUDE.md` imports upstream `AGENTS.md`.
- Toolchain installed (`vp` 1.2.0); `vp i` succeeded; server + web build succeeded (about 2 min).
- Codex CLI 0.163.0 installed outside the repo; schema generated to `docs/protocol/`.
- Docs written: DEV, ARCHITECTURE, NETWORK-AUDIT, PROTOCOL, FEATURE-MATRIX, UX-STUDY-TEMPLATE, REA, REA-SELF-AUDIT, DECISIONS.
- REA run on `apps/web/dist` (completed) and `apps/server/dist` (timed out).

### Not verified (cannot be done in this container)

- Gate item "Codex and Claude Code work end to end": needs the owner's logins and a display. `claude` is installed here; `codex` was installed only for schema generation. No provider session was started.
- `vp run dev` in a browser, desktop build/launch. Build ran on Node 22; repo requires Node 24.
- No lint, typecheck or test run (upstream says CI owns repo-wide checks).
- Trademark search; `moonfold.dev/.io` registrar check.
- NETWORK-AUDIT TODOs: electron-builder publish owner/repo, server self-update, desktop telemetry publisher. SIWC subpages beyond the open-source overview not read.

### Decisions

See docs/DECISIONS.md (D-1 to D-7). Key: T3 already has much of the Codex parity and a basic provider handoff, so Phases 2-4 are audit-and-extend.

### Open problems

- GitHub default branch is the working branch, not `main`.
- `docs/UX-STUDY.md` needs the owner's notes (template is ready).
- Server REA re-run with narrower scope.

### Next step

Owner: fill UX-STUDY-TEMPLATE, check trademark/domains, set default branch. Then Phase 1 (rebrand, remove Clerk/relay/PostHog/app.t3.codes).
