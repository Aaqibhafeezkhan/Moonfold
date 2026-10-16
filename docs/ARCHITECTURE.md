# Moonfold architecture (inherited from T3 Code)

Source: `docs/internals/overview.md`, `AGENTS.md`, and the code. Moonfold keeps this architecture; deviations go in DECISIONS.md.

```mermaid
flowchart LR
  subgraph Clients
    W[apps/web React+Vite]
    D[apps/desktop Electron shell]
    M[apps/mobile React Native]
  end
  CR[packages/client-runtime shared client state]
  W --> CR
  M --> CR
  D --> W
  CR -- typed WebSocket RPC<br/>packages/contracts --> S
  subgraph S[apps/server]
    WS[ws.ts RPC / HTTP / MCP tools]
    O[Orchestrator v2 pure decide]
    ES[EventSink one DB transaction]
    P[(SQLite event log + projections + outbox)]
    EW[EffectWorker side effects]
    A[Provider adapters]
    CK[Checkpoint store hidden git refs]
    SCH[scheduledTasks]
    PRV[preview browser]
    WS --> O --> ES --> P
    P --> EW --> A
    EW --> CK
    EW -- results as commands --> O
  end
  A -- stdio/JSON-RPC --> CX[codex app-server]
  A --> CL[Claude Code]
  A --> OT[Cursor, Grok, OpenCode, Antigravity, Pi, Muse, ACP]
  S -. optional .-> RL[Moonfold Connect relay + Clerk auth, not deployed]
  S -. default ON .-> PH[PostHog telemetry]
  D -. electron-updater .-> UP[update feed]
```

## Workspace layout

- `apps/server`: WebSocket server, orchestration v2, providers, checkpoints, scheduled tasks, MCP toolkits, preview browser, usage, cloud/relay.
- `apps/web`, `apps/desktop`, `apps/mobile`, `apps/marketing`.
- `packages/contracts` (Effect/Schema wire types), `shared`, `client-runtime`, `provider-*` (core, acp, cursor, grok, opencode, pi, muse, testing), `effect-codex-app-server`, `effect-acp`, `source-control-*`, `ssh`, `tailscale`.

## Key facts for Moonfold

- **Source of truth is already an event log** (`orchestration-v2`): commands decided purely, events committed with projections and outbox in one transaction, side effects after commit. This matches our "provider sessions are caches" decision; Phase 4 extends it rather than adding a second log.
- **Provider adapter boundary**: `docs/internals/adding-a-provider.md`, `providers.md`. Codex adapter uses `packages/effect-codex-app-server` over `codex app-server` stdio.
- **Handoff already exists in basic form**: `ContextHandoffServiceV2` builds a budgeted textual selection when switching providers (`docs/internals/context-handoffs.md`, `docs/user/portable-handoffs.md`). It has no limit-triggered switching, plan/diff/open-problem brief, redaction or preview. Phase 4 builds on it.
- **Checkpoints** are hidden git refs per turn; revert must coordinate workspace and provider conversation.
- **Hosted dependencies** to remove or replace in Phase 1: see NETWORK-AUDIT.md.
- **Update mechanism**: `electron-updater` in `apps/desktop/src/electron/ElectronUpdater.ts`, manifests built in `.github/workflows/release.yml`.
