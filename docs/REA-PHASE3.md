# REA gate: Phase 3

Date: 2026-10-19. REA 6.5.0 through its MCP tools, on Windows 11. Raw Evidence stays in the
analysis session; this page is the summary (docs/REA.md, step 5).

## Targets

| Target                                              | How                                                                   | Evidence                                                              | Result                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mammoth@1.13.0` (new web dependency, BSD-2-Clause) | `analyze_javascript_application`, directory, summary                  | `ev_d75dcb3f3b4ac99966b8f38e84e4678d086b6aaf5ebf3ee4df31e3302b28c1e9` | 88 files, 85 parsed, 0 parse failures. Request family: 0 relations (no fetch, WebSocket or http). Child-process relations: 2, both in `test/main.tests.js`, which is not bundled. Its transitive packages (lop, underscore, xmlbuilder, @xmldom/xmldom, dingbat-to-unicode, base64-js, argparse) are MIT or BSD. |
| Built web client (`apps/web/dist`)                  | Host-literal scan of every chunk                                      | Scratch list, 36 hosts                                                | The mammoth chunk is loaded on first use and holds XML namespace names only (openxmlformats, microsoft, purl.oclc.org, zwobble), with no `fetch` call. No new endpoint.                                                                                                                                          |
| Phase 3 source diff (`main...HEAD`, non-test)       | Host-literal scan of added lines                                      | n/a                                                                   | Only `schemas.openxmlformats.org` (XML namespaces in the .xlsx reader) and `github.com` (placeholder text in the plugin installer). Phase 3 adds no endpoint of its own.                                                                                                                                         |
| Computer-use helper                                 | Source review (a PowerShell script embedded in the server, no binary) | n/a                                                                   | Uses only Windows built-ins: UI Automation, `SendInput`, `EnumWindows`, `PrintWindow`. No network, no files written besides the script itself under the Moonfold home.                                                                                                                                           |
| Bundled plugins, skills, MCP servers                | n/a                                                                   | n/a                                                                   | Moonfold bundles and lists none; plugins come only from sources the user enters.                                                                                                                                                                                                                                 |

## Network behaviour added in Phase 3

- **Plugins**: `git clone` of a repository URL the user enters (https or ssh only; option-like
  URLs refused), and nothing else. Recorded in NETWORK-AUDIT.md.
- **Agent browsing rules**: no traffic of their own; they decide whether the agent's own browser
  request goes ahead.
- **Office previews**: read the file from the environment through the existing signed asset URL.
- **Computer use, memories, scheduler**: no network.

## Closed from earlier audits

- `storage.googleapis.com` in the server bundle (NETWORK-AUDIT "TODO read") is the Chrome for
  Testing download of the preview browser (`apps/server/src/preview/PreviewBrowser.ts`). A live
  run on 2026-10-19 downloaded it into the Moonfold home's `tools/chrome-headless-shell` folder the
  first time an agent opened a page.
