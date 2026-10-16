# REA in Moonfold

REA 6.5.0 (`rea-agents` on npm, MIT, github.com/morluto/rea). Applies to every target (CLAUDE.md "REA everywhere").

## Install

`npx rea-agents setup` registers MCP entries in `~/.claude.json` and `~/.codex/config.toml` and installs a skill. It was **not** run in the cloud container; the CLI works without registration:

```sh
npm install --prefix <tools-dir> rea-agents
<tools-dir>/node_modules/.bin/rea doctor
```

## Commands used so far

- `rea analyze-javascript-application <path> --artifact-format directory|asar --format json --analysis-timeout-ms 120000`: static reconstruction of an Electron/JS app or bundle. Large bundles (the server dist) hit the 120 s per-file timeout; pass `--source-path` to analyze selected files or raise the timeout.

On the owner's Windows machine REA 6.5.0 is installed globally and registered as an MCP server for
Claude Code, so agents call the tools directly (`analyze_javascript_application`,
`inspect_analysis_view`, `inspect_electron_fuses`, ...). Patterns that worked (2026-10-16):

- Large bundles: pass `detail: "summary"`, select `source_paths`, raise `max_heap_mb` (4096-8192)
  and `analysis_timeout_ms` (up to 900000). Page the retained parent Evidence with
  `inspect_analysis_view` instead of re-running.
- Store-installed Electron apps (MSIX under `C:\Program Files\WindowsApps`): `app.asar` is
  readable; analyze it in place for inventory, then extract it with `npx @electron/asar extract`
  into a scratch folder to select main-process files by path.
- Renderer bundles with thousands of chunks: inventory by chunk name first, then select the files
  that answer a question. Do not parse everything.
- Outbound-host cross-check: combine REA with a host-literal scan and source-map attribution.

## REA gate (end of Phases 1, 3, 5, 6, 7, and on every new dependency or third-party artifact)

1. Build the target (unpacked asar / dist / installer).
2. Run the matching REA analysis; keep the JSON outside the repo (it is 100+ MB) and commit a summary.
3. Extract: outbound hosts, update/relay/analytics endpoints, IPC surface, native addons, sender validation.
4. Diff against NETWORK-AUDIT.md; add anything new.
5. Record in `docs/REA-<phase>.md` and summarize in PROGRESS.md.
