# Decisions

## D-1 Name: Moonfold (owner decision, 2026-10-15)

Availability check (this session; not legal advice):

- GitHub: no conflicting project. Similar names only: `ffwangyue/MoonFolder`, `WhalenKaiser/moonFold.py` (both dormant, unrelated).
- npm: `moonfold` and `@moonfold/cli` return 404 (free). Reserve the package name before first publish.
- Domains: `moonfold.com` and `moonfold.app` resolve to other owners. `moonfold.dev` and `moonfold.io` had no DNS record (may be free, unverified; check a registrar).
- Trademark (USPTO/EUIPO): **not checked** (no access from this container). Owner action.

## D-2 Base: T3 Code (MIT), imported with full history

`upstream` remote = `pingdotgg/t3code`. Merge commit `65a3bc9f5` joins upstream `main` (at `17e1087d3`) with our docs. `CLAUDE.md` is ours and imports upstream `AGENTS.md`. Keep upstream LICENSE; add NOTICE in Phase 1.

## D-3 Auth path

Source: developers.openai.com/siwc, its open-source subpage, and the app-server docs.

- App-server docs state app-server authentication "has never been permitted for commercial or hosted services".
- Sign in with ChatGPT (SIWC) lets open-source and locally hosted apps request permission to use the user's ChatGPT plan for eligible Responses API calls. Requires a stable opaque `ext_agent_host_id` (recommended `urn:uuid:` or jwk-thumbprint form, never user-identifying), state + nonce + PKCE with a loopback callback, token validation, `stream:true`, `store:false`. Paid or remotely hosted apps are out of scope.
- **Decision**: Moonfold is free, local and open source and never hosts or pools tokens (CLAUDE.md rule 7). Default path stays the user's own local `codex` CLI login, as T3 does today. SIWC registration for Moonfold's own direct API use is deferred until a feature needs it, and requires the owner to register. The SIWC subpages for app-server, preview limitations and token reference were **not read in full** (only the open-source overview); read them before any SIWC work.

## D-4 Handoff builds on T3's existing context handoff

T3 already has `ContextHandoffServiceV2` (textual, budgeted, no limit trigger, no redaction or preview). Phase 4 extends it (brief with plan/diff/open problems, limit triggers, redaction, preview, fallback order) instead of writing a second mechanism.

## D-5 Feature matrix starts from "T3 may already have it"

A keyword probe shows T3 already has substantial overlap with the Codex app (scheduled tasks, preview browser, usage, goals, plan/interaction modes, skills, memory, subagents, archive, pin, fork, compaction). Phase 2 and 3 become audit-and-fill, not build-from-zero. See FEATURE-MATRIX.md.

## D-6 REA applies to all targets (owner decision)

See CLAUDE.md "REA everywhere". Rule 3 (no copying names, logos, assets, UI strings) stays.

## D-7 Open question for owner

The GitHub default branch is currently `ccr-288ebe07-787onv`, not `main`. Set `main` as default in repo settings.
