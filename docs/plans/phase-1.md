# Phase 1 plan: rebrand and repo hygiene

Goal (BUILD-PLAN Phase 1): everything is Moonfold, no T3-hosted service is used, telemetry is
opt-in, attribution and community files exist, and the gate checks pass.

## Scope decisions

- **Remove `apps/mobile`.** The beta excludes mobile (BUILD-PLAN section 1). The app ships through
  T3's App Store/Play/EAS accounts, uses T3-forked native tarballs, and cannot be verified on this
  machine for iOS. Shipping it renamed but unverified would break the "real, verified" rule.
  Recoverable from git history. Mobile-only scripts, workflows, skills and docs go with it.
- **Remove `apps/marketing`.** It is T3's website with T3 imagery. Phase 8 builds a docs site.
- **Keep `infra/relay`, renamed, not deployed.** It is the remote-connect control plane. Moonfold
  does not deploy it in the beta (needs owner cloud accounts). The client side stays dormant
  because it only activates when a relay URL is injected at build time, which our builds do not do.
  Remove the deploy workflow.
- **Codemod, committed.** `scripts/brand-codemod.ts` applies an ordered, idempotent mapping from
  T3 identifiers to Moonfold identifiers (text and file names). Committing it lets us re-apply it
  after future upstream merges.
- **Brand check, committed.** `scripts/check-brand.ts` finds T3 brand tokens with word-aware
  matching (so `uint32` is not a hit) and an explicit allowlist for attribution (LICENSE, NOTICE,
  README credits, About screen, phase docs that describe the fork). It runs in CI.

## Name mapping

| From                                                   | To                                                             |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| `@t3tools/*` packages                                  | `@moonfold/*`                                                  |
| server package and bin `t3`                            | `moonfold`                                                     |
| `T3CODE_*` env vars                                    | `MOONFOLD_*`                                                   |
| `~/.t3` home                                           | `~/.moonfold`                                                  |
| `t3.json` project file                                 | `moonfold.json`                                                |
| `com.t3tools.t3code` app id                            | `dev.moonfold.app`                                             |
| `t3code` / `t3-code` / `t3_code`                       | `moonfold`                                                     |
| `T3 Code` (prose)                                      | `Moonfold`                                                     |
| `T3Foo`, `t3Foo`, `fooT3Bar`, `t3-foo`                 | `MoonfoldFoo`, `moonfoldFoo`, `fooMoonfoldBar`, `moonfold-foo` |
| `pingdotgg/t3code` used for releases, issues, feedback | `Mr-Dark-debug/Moonfold`                                       |

Upstream references in code comments (`pingdotgg/t3code` issue links) are attribution and stay.

## Hosted services

| Item                                                      | Action                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------- |
| PostHog telemetry (key embedded, default on)              | Remove embedded key, default off; opt-in needs user-supplied host and key |
| Relay OTLP traces                                         | Only with a build-time relay config (none in our builds)                  |
| `app.t3.codes` hosted web app                             | No hosted app; links that depend on it are removed or point to GitHub     |
| Install scripts on `t3.codes`                             | Serve from GitHub (raw scripts + Releases)                                |
| `t3.codes/schema/t3.json`                                 | Schema file in the repo, referenced by GitHub raw URL                     |
| Legal pages on `t3.codes`                                 | Link to repo `docs/legal/*` (privacy: local-first, no data collected)     |
| `t3.chat` link                                            | Remove                                                                    |
| Desktop update feed                                       | electron-builder publishes to `Mr-Dark-debug/Moonfold` GitHub Releases    |
| Server self-update (npm `t3`)                             | npm `moonfold`; disabled until the package exists                         |
| CI: Vercel, Discord, EAS, relay deploy, vouch/triage bots | Remove or rewrite for this repo                                           |

## Brand assets

Icon set from `assets/brand/` (docs/BRAND.md): PNG sizes, Windows `.ico`, Linux PNG set, macOS
`.icns`/Icon Composer input, favicons, web manifest icons, tray template. Replace every T3 image.

## Attribution and community

NOTICE, About screen with T3 Code credit and MIT notice, README rewrite with "not affiliated with
or endorsed by" wording, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue and PR templates,
THIRD_PARTY_LICENSES generation and a CI license check.

## Gate

1. `node scripts/check-brand.ts` reports no unallowed T3 tokens.
2. Lint, typecheck and the full test suite pass.
3. Desktop build launches; a network capture during startup shows no request to a T3 domain.
4. REA on the rebranded desktop asar and server bundle: no T3 endpoint, update feed or analytics.
