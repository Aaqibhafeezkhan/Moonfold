# {{APP_NAME}} project rules

Replace {{APP_NAME}} once the name is decided in Phase 0 (see docs/DECISIONS.md).

## What this project is

An open-source desktop, web and mobile-ready control surface for coding agents. It is a fork of T3 Code (MIT) with three goals:

1. Match the publicly documented feature set of OpenAI's Codex app (projects, threads, goals, plan mode, review, skills, plugins, MCP, scheduled tasks, browser pane, computer use, memories, settings, themes).
2. Keep every T3 Code feature (multi-provider, git worktrees, PR flow, diff review, remote access, permission modes).
3. Headline feature: provider handoff. When one agent hits a usage limit, the same task continues in another agent (Codex, Claude Code, Gemini CLI, Cursor, OpenCode, ...) with the context preserved.

## Legal and clean-room rules (never break these)

1. Never download, unpack, decompile, disassemble, deobfuscate or inspect the official ChatGPT or Codex desktop app (DMG, EXE, MSIX, app.asar, resources) or any other proprietary app binary. Do not point REA or similar tools at them. REA is allowed only on our own builds, open-source code, and targets whose license explicitly permits analysis.
2. Allowed sources for Codex behavior: official public docs (learn.chatgpt.com, developers.openai.com), the open-source openai/codex repo (Apache-2.0) including codex-rs/app-server, the schema produced by `codex app-server generate-ts` from the CLI installed on this machine, and hands-on usage notes written by the owner. Write every spec in our own words. Do not paste doc text into the product or the repo.
3. No names, logos, icons, sprites, sounds, fonts with restrictive licenses or copied UI strings from OpenAI, ChatGPT, Codex, Anthropic, Google, Cursor or T3 in our branding. Provider names appear only nominatively ("works with Codex CLI"). Include "not affiliated with or endorsed by" wording in README and About.
4. Keep T3 Code's MIT LICENSE and copyright notice. Add NOTICE with attributions. Credit upstream on the About screen and in the README.
5. Every new dependency: check the license. MIT, Apache-2.0, BSD, ISC are fine. GPL, AGPL, SSPL or unknown need explicit owner approval. Keep THIRD_PARTY_LICENSES generated and current.
6. Do not use T3's hosted services (relay, update feed, telemetry, domains, app stores). Remove or replace them. Telemetry is off by default and opt-in only.
7. Never proxy, pool, resell or share anyone's provider login or tokens. Each provider runs as the user's own local CLI with the user's own login. The app is local-first and never becomes a hosted token service.

## Engineering rules

- Real data only. No mock data, no fake screens, no placeholder buttons. A feature that is not finished is not rendered (use a build-time flag), it is never shown as if it worked. Test fixtures live under tests/fixtures and never ship in the app.
- Everything user-visible must work against real providers on a real machine before it is called done.
- Use the repo's own toolchain, lint rules and architecture conventions (read AGENTS.md and docs/internals first). Extend existing patterns before inventing new ones.
- The Codex app-server protocol has experimental parts. Pin the Codex CLI version, generate the schema at build time, write contract tests against it, and never call methods documented as under development from shipped code.
- Security: Electron contextIsolation on, nodeIntegration off, sandbox on, strict IPC allowlist, CSP, no remote code. Remote access requires authentication and TLS or an equivalent tunnel. Default permission mode is the safest one. Secrets never go into logs, handoff briefs or crash reports. Redact before sending context to another provider and show the user what will be sent.
- Accessibility: keyboard reachable, visible focus, contrast AA, reduced motion respected.
- Performance budgets: cold start under 3 s on a mid laptop, 60 fps scrolling on a 5,000-item thread, idle CPU near zero, idle RAM reasonable. Measure, do not guess.

## Workflow

- At the start of every session read this file, PROGRESS.md and the current phase in BUILD-PLAN.md. Update PROGRESS.md at the end (done, decisions, open problems, next step) so a fresh session can resume cold.
- Start each phase in plan mode. Write the plan to docs/plans/<phase>.md, then implement.
- Commit small and often with conventional commits. One logical change per commit. Never commit secrets or build output.
- Use subagents for parallel research, test writing and code review. Keep the main loop for integration and decisions.
- Before saying a task is done: run lint, typecheck, unit tests, contract tests and the relevant e2e tests, and paste the real command output summary in PROGRESS.md. If something cannot be verified on this machine, say so plainly instead of claiming success.
- Ask the owner only for decisions that are theirs (name, branding choices, accounts, money, signing certificates). Otherwise pick the best option, record it in docs/DECISIONS.md and continue.
- Do not add features outside the current phase. Do not rewrite working upstream code without a written reason.

## Commands

Fill this section at the end of Phase 0 with the exact install, dev, build, lint, typecheck, test, e2e and package commands for this repo.
