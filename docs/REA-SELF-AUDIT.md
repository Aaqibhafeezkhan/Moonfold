# REA self-audit (Phase 0)

Date: 2026-10-15. Tool: REA 6.5.0, `analyze-javascript-application`, `--artifact-format directory`. Target: our own unmodified build of the T3 base (commit `65a3bc9f5`).

## apps/web/dist: completed

- Subject sha256: `859b0eba331a6231e0b5d03e0f689947f270c2511426d84a693bf988abaf96af`
- 4,633 files inventoried, 2,342 JavaScript files parsed, 0 parse failures, about 4.2 M AST nodes, 108.6 MB text read.
- Electron surface: 0 browser windows, 0 preload entry points, 0 IPC operations, 0 native addons. Expected, since this is the renderer bundle only; the Electron main/preload audit needs the desktop build.
- Outbound hosts found as string literals: `chatgpt.com` (6), `claude.ai` (4), `app.t3.codes` (1).
  - `app.t3.codes` was already in NETWORK-AUDIT.md.
  - `chatgpt.com` and `claude.ai` are provider-login related; confirm in Phase 1 that they are links/redirects, not data flows.
- No analytics SDK host (PostHog etc.) appears in the web bundle: telemetry is sent from the server (`AnalyticsService.ts`), consistent with the manual audit.
- Limitation noted by REA: Electron relationships derive from inert syntax; reachability and defaults are not proven.

## apps/server/dist: incomplete

The run hit the tool's analysis timeout ("Analysis took too long") with partial observations only. Not used as evidence. Follow-up: re-run with `--source-path` per entry (`bin.mjs`, `binCli-*.mjs`, provider chunks) or a larger `--analysis-timeout-ms`.

## Not yet done

- Desktop (Electron) asar: needs `vp run build:desktop` and a packaging step; no display in this container. Phase 1 gate.
- Bundled native binaries (`native/resource-monitor`, mobile modules).
- Raw REA JSON (348 MB web, 132 MB server) is kept outside the repo.
