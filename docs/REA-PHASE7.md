# REA gate: Phase 7 (release artifacts)

Date: 2026-10-20. Artifacts: the `0.1.0-beta.1` dry-run builds from `.github/workflows/release.yml`
(GitHub-hosted runners). Tools: REA 6.5.0 (`inspect_electron_fuses`,
`analyze_javascript_application`), Windows Authenticode status, and a host-literal scan. Our own
summary; no code was copied.

## Linux x64 (`Moonfold-0.1.0-beta.1-amd64.deb`, `-x86_64.AppImage`)

- The .deb installs to `/opt/Moonfold (Beta)` (beta builds carry "(Beta)" in the product name).
- Electron fuses (REA evidence `ev_dbe04383fdeef4db59f6109440f61982bcf7c069c93c6515e316dd0bd7bcc19f`,
  binary sha256 `ee9faf5bb9fe78a750cc5099863c85c4459e7f04c387fd1f111c83e4e8c57c97`): Electron's
  defaults. `RunAsNode` on (the app starts its bundled server that way), cookie encryption off,
  `NODE_OPTIONS` and `--inspect` honoured, ASAR integrity and app-from-ASAR-only off. Recorded as
  QA-REPORT S-13 (accepted low); flipping them needs a separate server binary first.
- `app.asar` (sha256 `4444501cfc1ef0c8bcfd3583f225c3dd94b0e55c361468dabfb271eaf8b0a7d0`, REA evidence
  `ev_45c0ebf551954557e7e82dc21e198fb5b1e5c864c9eea52a1a07f169fb956a04`): main process and preloads
  match the Phase 6 build: 4 window construction sites, 13 explicit `webPreferences`, 4
  `contextBridge` APIs, 10 main-process IPC handlers, 5 sender-validation sites, no native addon
  bindings in the main process.
- Update feed (`resources/app-update.yml`): GitHub provider, owner `Mr-Dark-debug`, repo
  `Moonfold`. `resources/package-type` is `deb`, so electron-updater updates the .deb in place.
- Hosts in `app.asar`: no T3, PostHog, Sentry, Datadog, Segment, Amplitude or Mixpanel hosts.
  Clerk appears only in the Clerk library's error messages. One Vercel blob-storage URL is a logo
  inside the Cursor provider SDK, next to `api.cursor.com`; it is used only when Cursor runs.

## Windows x64 (`Moonfold-0.1.0-beta.1-x64.exe`)

- Installer sha256 `57F03BC278EB475329FD9CE4CC953FC3A3BF03D50049EBDAAB2F6DE8DF0FD850`,
  Authenticode status `NotSigned` (expected for the beta; docs/operations/release.md#signing).
- Installed silently per user into a scratch folder on Windows 11, launched on a scratch Moonfold
  home: the renderer reached the backend (bearer token and connection catalog IPC). Uninstalled
  silently with no files, shortcuts or uninstall registry entry left.
- The CLI archive `moonfold-0.1.0-beta.1-win32-x64.zip` installed through `scripts/install.ps1`
  from a local mirror of the release layout, checksum verified, and `moonfold --version` printed
  `moonfold v0.1.0-beta.1`.

## macOS and arm64 builds

Built on GitHub-hosted runners in the same run. They were not executed here (no macOS or arm64
machine). The Intel macOS CLI single-executable crashed with SIGSEGV in its own smoke test, so
releases ship no Intel macOS CLI archive; the Intel macOS desktop app builds normally.
