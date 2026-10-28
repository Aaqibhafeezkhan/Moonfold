# REA gate: beta 3 third-party artifacts

Date: 2026-10-28. Tool: `rea-agents@6.5.0 analyze-javascript-application` (CLI; the REA MCP server
did not connect in this session). Static analysis only: nothing was executed by REA, and static
relationships do not prove runtime behaviour.

Moonfold does not bundle either package. DeepSeek Harness is installed on demand by the ACP
catalog (`npx`, pinned version) and Pi is the user's own install; both run as the user's local
CLI with the user's own configuration.

| Artifact                                 | License | Evidence id (prefix)   | Files parsed | Findings | Native addons | Electron surfaces | Hosts seen in code                                                                  |
| ---------------------------------------- | ------- | ---------------------- | ------------ | -------- | ------------- | ----------------- | ----------------------------------------------------------------------------------- |
| `@deepseek-ai/dsh@0.2.1-rc.2` (launcher) | MIT     | `ev_0d40a0db3ca6b701…` | 15           | 169      | 0             | 0                 | none in the launcher; providers come from its plugin packages and the user's config |
| `@earendil-works/pi-coding-agent@1.4.0`  | MIT     | `ev_2bc200cf6076d138…` | 1,166        | 6,803    | 0             | 0                 | github.com, pi.dev, claude.ai, platform.claude.com (sign-in and docs), localhost    |

Root artifact SHA-256: dsh `a7332571…4e86db`, Pi `0d4c94e9…83ec4a`. 0 integrity contradictions and
0 parse failures in both.

## Observations

- dsh's npm package is a launcher; the harness itself is spread over ~86 `@deepseek-ai/dsh-*`
  plugin packages. Its ACP server (`dsh --profile acp`) speaks standard ACP v1 over stdio and
  reports turn failures as JSON-RPC internal errors with the provider's message
  (`turn failed: …`), which is what Moonfold's ACP usage-limit matcher reads.
- dsh keeps sessions and credentials under `$DSH_HOME` (default `~/.dsh`). The live test used a
  scratch `DSH_HOME` routed to local Ollama; nothing was written to the owner's home.
- Pi's analysis hit REA's expansion budget, so coverage is partial (recorded as limitations, not
  absence). Pi's custom-provider API (`pi.registerProvider`) is what Moonfold's local-models
  extension calls.

## Unknowns

- dsh's plugin packages were not analysed one by one; Moonfold does not ship them.
- Runtime network behaviour was not captured; only static evidence.
