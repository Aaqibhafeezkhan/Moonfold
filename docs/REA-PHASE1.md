# REA gate: Phase 1 (rebrand)

Date: 2026-10-16. Machine: Windows 11 x64. Checklist: docs/REA.md "REA gate".

## 1. Target

The rebranded build from `vp run build:desktop` at the end of Phase 1:

- `apps/desktop/dist-electron` (Electron main, preload and helpers)
- `apps/server/dist` (server and CLI, including the bundled web client)
- `apps/web/dist` (web client)

The packaged installer (`app.asar`) could not be produced here: `scripts/build-desktop-artifact.ts`
requires Visual Studio Build Tools with the Spectre-mitigated libraries, which this machine lacks.
The asar contains the same `dist-electron`, server and web output, so the gate analyzes those
directories. The asar itself is analyzed in Phase 7 when CI builds installers.

## 2. REA analysis

| Target                             | Evidence (parent)                                                     | Result                                                                                                                                                                                                                                                                                              |
| ---------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/desktop/dist-electron`       | `ev_7c07bb002d93a6e9ec146c1d2097f9179fa735d9a9481895306d41de1f8110a2` | 25 files, 13 parsed, 0 parse failures, 0.85 M AST nodes. 4 `BrowserWindow` constructions, 13 explicit `webPreferences`, 4 `contextBridge` APIs exposing 122 members, 270 IPC operations (115 literal channels), 7 sender-validation observations. Recorded for the Phase 6 Electron security audit. |
| `apps/server/dist` (Phase 0 build) | `ev_befef4252bc99f05a3b213450697880230b51935769f6e363cdb37394efd27a5` | See REA-SELF-AUDIT.md.                                                                                                                                                                                                                                                                              |

## 3. Outbound endpoints

Host-literal scan of all three built outputs for T3 and analytics endpoints (`t3.codes`,
`t3.chat`, `t3tools.com`, `posthog.com`, PostHog keys, `relay.t3*`):

- None found in `dist-electron`, `apps/server/dist` or `apps/web/dist`.
- `pingdotgg/t3code` appears only as the About screen's attribution link and one preserved code
  comment that links an upstream pull request. Neither is fetched.

## 4. Runtime capture

The built desktop app was started with an isolated `MOONFOLD_HOME`, Chromium NetLog
(`--log-net-log`, capture mode Everything), and one-second sampling of TCP connections owned by
its whole process tree, for 75 seconds.

| Remote              | Process                            | What it is                                                                     |
| ------------------- | ---------------------------------- | ------------------------------------------------------------------------------ |
| 185.199.111.133:443 | Moonfold server (Electron as Node) | GitHub (`cdn-185-199-111-133.github.com`): model manifest from this repository |
| 104.16.3.34:443     | Moonfold server                    | npm registry (Cloudflare 104.16.x.34 rotation): provider CLI update check      |
| 160.79.104.10:443   | `claude.exe` (user's CLI)          | Anthropic, the user's own Claude Code login probe                              |
| 104.18.32.47:443    | `codex.exe` (user's CLI)           | OpenAI via Cloudflare, the user's own Codex probe                              |

NetLog showed no external request from the Electron renderer or main process other than Windows
proxy auto-discovery (`wpad`). No T3 domain, relay, update feed or analytics endpoint was
contacted. The live `~/.t3` directory of the owner's T3 Code install was not modified (last
modified 2026-10-07).

## 5. Result

Pass, with the packaging limitation in section 1 carried to Phase 7.
