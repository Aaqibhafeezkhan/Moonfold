# Phase 6 plan: hardening

Goal (BUILD-PLAN Phase 6): audit and harden what Phases 1 to 5 built, measure the CLAUDE.md
budgets, fix every medium or higher finding, and record the result in docs/QA-REPORT.md.

## Steps

1. Dependency audit of production dependencies (`vp pm audit -- --prod`). Override or bump what
   has a published fix; record why the rest cannot affect the shipped app.
2. Electron security review by a reviewer subagent that did not write the code: windows,
   webPreferences, IPC sender checks, CSP, navigation and window-open handlers, permission
   handlers, protocol handlers, webviews. Fix medium and higher.
3. Rule review: anything that pools or proxies provider logins (CLAUDE.md rule 7), reads provider
   tokens without the user asking, or reaches T3's hosted services (rule 6).
4. Secret-leak scan of real logs with the same scanner the handoff brief uses.
5. Remote-access threat model: pairing, sessions, cookies, scopes, transport.
6. Accessibility review of the UI Moonfold added (reviewer subagent), then fixes.
7. Performance against the budgets: server cold start and idle CPU/RAM, desktop cold start from
   trace spans, scrolling a 5,000-item thread with frame timing in a window the test launches.
8. Crash recovery: provider process death, app killed mid-turn, failed writes (disk full),
   offline. Existing recovery suites plus forced kills of the live app.
9. REA gate on the production build (desktop main process, server and web bundles).
10. QA-REPORT.md, REA-PHASE6.md, DECISIONS, PROGRESS; knip and `vp check`; merge.

## Out of scope

Packaging, signing and installers (Phase 7). REA of installers happens there.
