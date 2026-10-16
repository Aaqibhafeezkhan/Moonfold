# Decisions

## D-1 Name: Moonfold (owner decision, 2026-10-15)

Availability check (this session; not legal advice):

- GitHub: no conflicting project. Similar names only: `ffwangyue/MoonFolder`, `WhalenKaiser/moonFold.py` (both dormant, unrelated).
- npm: `moonfold` and `@moonfold/cli` return 404 (free). Reserve the package name before first publish.
- Domains: `moonfold.com` and `moonfold.app` resolve to other owners. `moonfold.dev` and `moonfold.io` had no DNS record (may be free, unverified; check a registrar).
- Trademark (USPTO/EUIPO): **not checked** (no access from this container). Owner action.

Re-check 2026-10-16 (Windows machine):

- npm: `moonfold`, `@moonfold/cli`, `@moonfold/desktop` still 404 (free).
- GitHub: the org name `moonfold` is free, but a **personal account `Moonfold` exists** (created
  2023-05-24, 0 public repos). We cannot use `github.com/moonfold`; keep `Mr-Dark-debug/Moonfold`
  or register an org such as `moonfold-app` / `moonfoldhq` (owner's call, account action).
- Domains via RDAP: `moonfold.com` and `moonfold.app` registered; `moonfold.dev` returned "not
  found" from the registry (likely available). `.io`, `.ai`, `.sh` returned not found from
  rdap.org, which does not cover all ccTLDs, so they are unverified. Check at a registrar.
- Web search for "Moonfold" with trademark/software/app terms: no matching product or mark found.
  A formal USPTO/EUIPO search is still an owner action before launch.

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

### D-3 addendum (2026-10-16): SIWC subpages read

Read the app-server, token reference and preview-limitations pages of the SIWC open-source guide.

- With SIWC, an app passes the user's SIWC access token to a child `codex app-server` through its
  environment, restarts app-server with a fresh token when it refreshes (access tokens last one
  hour, refresh tokens 30 days and rotate), then re-initializes and resumes the thread.
- Preview limits: no hosted tools (image generation, file search, code interpreter, computer use,
  hosted MCP), storage off, streaming on, no response chaining over HTTP.
- `model/list` is not proof of access; only a completed turn proves it.
- `clientInfo.name` must stay stable and match the name given at SIWC registration.

Decision unchanged: Moonfold drives the user's own logged-in `codex` CLI. SIWC would add token
storage and refresh to Moonfold, and its preview removes features we want (hosted tools). Revisit
only if a feature needs direct Responses API calls; that needs owner registration.

## D-7 GitHub default branch (resolved)

`main` is the default branch on GitHub (checked 2026-10-16).

## D-8 Brand mark: the folded moon (2026-10-16)

Three concepts drawn and rendered at 256/128/32/16 px. Chosen: a moon disc with its cap folded
over along a crease (moon phase plus fold, which reads as handoff). Ink navy background, amber
accent. Details and files: docs/BRAND.md. Owner can override. Reverse image search is a Phase 1
item before the icon ships.

## D-9 Codex CLI version on the dev machine

The schema pin is codex-cli 0.163.0 (PROTOCOL.md). The owner's machine has 0.161.0 on PATH, which
T3 used for the Phase 0 smoke run. We do not upgrade the owner's global CLI. Phase 2 contract tests
pin and install 0.163.0 into a tools folder and point Moonfold's Codex binary path at it.

## D-10 Codex app REA: positioning

The installed Codex desktop app (26.1007) has a "hand off" that moves chats between checkout,
worktree, cloud and phone, but never to a different agent provider. Cross-provider handoff stays
Moonfold's headline. The app's plugin folder layout (manifest + skills + MCP config) is the format
Moonfold should read in Phase 3. Details: docs/CODEX-APP-REA.md.

## D-11 UX study without owner notes

The owner asked for Phase 0 to proceed without questions. docs/UX-STUDY.md is therefore built from
REA and public docs and says so; owner notes, when added, override it. This does not block Phase 1.
