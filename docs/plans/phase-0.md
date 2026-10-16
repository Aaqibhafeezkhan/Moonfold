# Phase 0 plan: recon and decisions (completion pass)

Phase 0 started in a cloud container on 2026-10-15 (see PROGRESS.md). This pass finishes it on
the owner's Windows machine. No product code changes; docs, brand concepts and verification only.

1. Toolchain on Windows: install `vp` 1.2.0, `vp i`, build server + web. Record Windows steps in DEV.md.
2. Gate run: unmodified fork in dev mode with an isolated home dir; real Codex and Claude Code turns
   on a scratch git project (never on this repo, never on `~/.t3/userdata`).
3. REA on the installed Codex desktop app: inventory, main process and preloads, plugin layout,
   feature inventory. Write docs/CODEX-APP-REA.md in our own words; feed FEATURE-MATRIX and a
   first UX-STUDY.md (owner notes pending).
4. Finish open REA items: server bundle re-run with narrower scope; attribute new hosts in
   NETWORK-AUDIT.
5. Read the remaining SIWC pages; update DECISIONS D-3.
6. Name availability re-check (npm, GitHub, RDAP, web search).
7. Brand: three logo concepts rendered at 256/128/32/16 px, pick one, master SVGs, docs/BRAND.md.
8. Baseline checks: lint, format, typecheck. Update PROGRESS.md. Commit on `phase-0-completion`,
   merge to `main`, push, delete the branch.

Out of scope: rebrand, endpoint removal, desktop packaging (Phase 1).
