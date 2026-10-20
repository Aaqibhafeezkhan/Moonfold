# REA gate: Phase 6 (production build)

Date: 2026-10-20. Tool: REA 6.5.0 MCP server (`analyze_javascript_application`), plus a host-literal
scan of the same builds. Targets were built from the `phase-6-hardening` branch on Windows 11 x64.
Findings are our own summary; no code was copied.

## Desktop main process (`apps/desktop/dist-electron`)

- Artifact: directory sha256 `bd885fa453a14a69c6406d5462fdfa94ac941d14362383738f1ae90c21e978e1`
  (REA evidence `ev_6e066318fbe6074ac31d899cb5cc868545060108b69512a9614ac9762654783c`). Selected
  sources: `main.cjs`, `preload.cjs`, `boot.cjs`, `mac-permission-preload.cjs`, `compileCache.cjs`.
- Coverage: all 5 selected files parsed, no parse failures; the semantic graph hit its node ceiling,
  so relationship coverage is partial. Static observations, not runtime traces.
- Electron surface: 4 `BrowserWindow` construction sites, 13 explicit `webPreferences` objects,
  3 `contextBridge` APIs exposing 125 members, 10 main-process IPC handlers, 118 literal channels,
  5 sender-validation sites (the shared IPC wrapper's frame check), no utility processes, no native
  addon bindings.
- String check of the same file: the 7 window configurations Moonfold creates all set
  `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. The only
  `contextIsolation: false` strings are in messages about preview webviews, which run with the
  pinned picker preload only (QA-REPORT S-8).

## Server and web bundles (`apps/server/dist`, `apps/web/dist`)

- Host-literal scan for T3, PostHog, Clerk, Sentry, Datadog, Segment, Amplitude, Mixpanel and
  Vercel: none in the desktop build; in the server and web bundles only `clerk.com` and
  `dashboard.clerk.com` inside the Clerk library's own error messages, which are inert text.
- No new outbound endpoints compared with NETWORK-AUDIT.md.

## Dependencies changed in this phase

Overrides raised transitive packages to patched versions (seroval, @modelcontextprotocol/sdk,
proxy-addr, shell-quote, xml2js, source-map-js, valibot) and sharp moved to 0.35.5. All keep their
existing MIT, Apache-2.0, BSD or ISC licenses (sharp: Apache-2.0). No new packages were added.

## Not covered here

Installers and packaged fuses are Phase 7 artifacts; REA runs on them in that phase.
