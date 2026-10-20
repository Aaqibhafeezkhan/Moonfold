# REA gate: Phase 5 (providers)

Date: 2026-10-20. Tool: REA MCP server (`analyze_javascript_application`), plus targeted string
inspection of the same files where REA's coverage was partial. Findings are our own summary; no
code was copied.

## Gemini CLI 0.43.0 (`@google/gemini-cli`, Apache-2.0)

- Artifact: global npm install, directory sha256 `731378431c1a6a47b6327885067fd4fe614f04ce95990701c3d64c90d3c37c4f`
  (REA evidence `ev_1610dd81b386fffef760e4ae94cedd16fcebb8d8c526b0961ade1816abba1a9e`).
- Coverage: REA inventoried all 226 files and parsed `package.json` and the bundle chunk that holds
  authentication and quota handling; its semantic pass ran out of a 2 GiB heap on that 14 MB chunk,
  so the graph is partial. The facts below come from the inventory plus string inspection of that
  chunk and the other bundle files, and are static observations, not runtime traces.
- ACP: `gemini --acp` (the older `--experimental-acp` still parses). Auth methods advertised at
  `initialize`: Google login (`oauth-personal`), Gemini API key, Vertex AI. Observed live on this
  machine: the Google login is refused at `session/new` with JSON-RPC `-32000` and an
  `IneligibleTierError` whose reason is `UNSUPPORTED_CLIENT` for the free individual tier.
- Endpoints referenced: `cloudcode-pa.googleapis.com` (Code Assist, overridable by
  `CODE_ASSIST_ENDPOINT`), `generativelanguage.googleapis.com` (API key), `aiplatform.googleapis.com`
  (Vertex AI), Google OAuth (`oauth2.googleapis.com`), Cloud Resource Manager, and
  `monitoring.googleapis.com` for telemetry export.
- Credentials read from: `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GOOGLE_APPLICATION_CREDENTIALS`,
  `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `GOOGLE_GENAI_USE_VERTEXAI`, and the OAuth files in
  `~/.gemini`.
- Limit signals: the CLI separates `RetryableQuotaError` (retried internally) from
  `TerminalQuotaError` (ends the turn). Quota errors originate from gRPC `RESOURCE_EXHAUSTED` / HTTP 429. Moonfold maps terminal limit wording to `usage_limit` (DECISIONS D-36).
- Note for users: the CLI's own usage statistics default to on (`privacy.usageStatisticsEnabled`);
  that is Gemini CLI's setting, separate from Moonfold, which collects nothing by default.

## Antigravity, Cursor, OpenCode, Grok

Not analyzed in this phase: Antigravity's ACP server was not installed here (a managed download),
and the other CLIs are not installed. Their adapters are inherited from upstream and listed as not
verified in the README provider matrix.

## Moonfold changes in this phase

No new dependencies. The ACP registry adapter gained an agent-agnostic limit-wording check.
