# Codex app-server protocol

- Pinned CLI for schema generation: **codex-cli 0.163.0** (`@openai/codex@0.163.0` from npm, 2026-10-15).
- Generated with:

```sh
codex app-server generate-ts --out docs/protocol/codex
codex app-server generate-json-schema --out docs/protocol/codex-json
```

- Output: `docs/protocol/codex` (TypeScript, ~3.1 MB) and `docs/protocol/codex-json` (JSON Schema, ~4.5 MB). Regenerate when bumping the pin. Phase 2 moves generation to build time and adds contract tests.
- Installed on the owner's Windows machine: codex-cli 0.161.0 on PATH (older than the pin; see DECISIONS D-9). The Codex desktop app bundles its own CLI, which Moonfold does not use.
- Observed 2026-10-16 through the unmodified T3 adapter: handshake, model list and `turn/start` worked; the account was at its usage limit, so the turn ended with a usage-limit error and no reset time. That error shape is the first Phase 4 trigger.
- Transport: stdio, newline-delimited JSON (default). WebSocket and Unix socket are experimental; we do not use them.
- Handshake: one `initialize` request per connection with `clientInfo`, then an `initialized` notification. Requests before that fail with `Not initialized`. `experimentalApi` capability is required for experimental methods.
- Existing T3 integration: `packages/effect-codex-app-server` and `apps/server/src/provider/Codex*.ts`. Moonfold reuses these; `clientInfo` is built in `buildCodexInitializeParams` (`apps/server/src/provider/CodexProvider.ts:408`, name from `CODEX_CLIENT_NAME`); rename to Moonfold in Phase 1.
- Auth modes in the protocol: API key, ChatGPT managed login, ChatGPT external tokens (experimental), Bedrock. See DECISIONS.md D-3.
