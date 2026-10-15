# Codex app-server protocol

- Pinned CLI for schema generation: **codex-cli 0.163.0** (`@openai/codex@0.163.0` from npm, 2026-10-15).
- Generated with:

```sh
codex app-server generate-ts --out docs/protocol/codex
codex app-server generate-json-schema --out docs/protocol/codex-json
```

- Output: `docs/protocol/codex` (TypeScript, ~3.1 MB) and `docs/protocol/codex-json` (JSON Schema, ~4.5 MB). Regenerate when bumping the pin. Phase 2 moves generation to build time and adds contract tests.
- Transport: stdio, newline-delimited JSON (default). WebSocket and Unix socket are experimental; we do not use them.
- Handshake: one `initialize` request per connection with `clientInfo`, then an `initialized` notification. Requests before that fail with `Not initialized`. `experimentalApi` capability is required for experimental methods.
- Existing T3 integration: `packages/effect-codex-app-server` and `apps/server/src/provider/Codex*.ts`. Moonfold reuses these; `clientInfo` is built in `buildCodexInitializeParams` (`apps/server/src/provider/CodexProvider.ts:408`, name from `CODEX_CLIENT_NAME`); rename to Moonfold in Phase 1.
- Auth modes in the protocol: API key, ChatGPT managed login, ChatGPT external tokens (experimental), Bedrock. See DECISIONS.md D-3.
