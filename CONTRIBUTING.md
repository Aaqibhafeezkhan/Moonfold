# Contributing to Moonfold

Thanks for helping. Moonfold is young, so focused contributions with clear evidence are the
easiest to review and merge.

## Setup

See [docs/DEV.md](docs/DEV.md) and the [development runbook](docs/operations/development.md) for
the toolchain (`vp`), dev servers, and platform notes. Read [AGENTS.md](AGENTS.md) and
[CLAUDE.md](CLAUDE.md): they describe the architecture conventions every change follows, including
the ones for coding agents.

## Before you start

- **Bugs:** open an issue with steps to reproduce, your OS, the Moonfold version, and the provider
  involved. Small, obvious fixes can go straight to a pull request.
- **Features and behavior changes:** start an
  [Ideas discussion](https://github.com/Mr-Dark-debug/Moonfold/discussions/categories/ideas) first
  and wait for a maintainer to agree on direction and scope. Link that agreement in your PR.
- **Security problems:** report them privately, as described in [SECURITY.md](.github/SECURITY.md).

## Pull requests

- Solve one problem per pull request. Keep unrelated cleanup out.
- Use a conventional commit title, for example `fix(web): keep the queue order after a restart`.
- Describe the problem in a sentence or two, then how you fixed it and how you verified it.
- Include evidence: the tests you added or ran, and for UI changes before/after screenshots or a
  short recording uploaded to the PR (do not commit them).
- Run the checks that cover your change before asking for review:

  ```bash
  vp lint --report-unused-disable-directives
  vp fmt --check
  vp run -r --concurrency-limit 2 typecheck
  vp test run <the test files you touched>
  node scripts/check-brand.ts
  ```

- Backend behavior changes need focused tests for that behavior. Tests must not depend on sleeps
  or polling.

## Rules that protect the project

- **Clean room.** Never paste code, assets, icons, fonts or UI strings from proprietary apps
  (including the official Codex, ChatGPT or Claude apps) into Moonfold. Describe behavior in your own
  words. See "Legal and clean-room rules" in [CLAUDE.md](CLAUDE.md).
- **Licenses.** New dependencies must be MIT, Apache-2.0, BSD or ISC. Anything else needs maintainer
  approval before you add it.
- **No hosted token services.** Moonfold runs each provider as the user's own local CLI. Do not add
  code that proxies, pools or shares provider logins or tokens.
- **Privacy.** Telemetry stays off by default. Never log secrets or include them in handoff briefs or
  crash reports.
- **Agent-written code is welcome**, with the same standard of evidence as any other contribution.

## License

By contributing, you agree that your contributions are licensed under the MIT License in
[LICENSE](LICENSE).
