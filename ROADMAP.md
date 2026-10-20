# Roadmap

What Moonfold is working toward, in rough order. It changes as beta feedback comes in; ideas go to
[Discussions](https://github.com/Mr-Dark-debug/Moonfold/discussions) and concrete work to
[issues](https://github.com/Mr-Dark-debug/Moonfold/issues). The reasoning behind past choices is
in [docs/DECISIONS.md](docs/DECISIONS.md).

## Now: the 0.1 beta

- **Handoff on more providers.** Verify the full handoff on Gemini CLI with an API key, Cursor,
  OpenCode and Antigravity, and teach the adapters that report limits as ordinary errors to
  report them as usage limits (docs/HANDOFF-SIGNALS.md).
- **Signed installers.** Apple notarization and Windows code signing, so the first launch needs
  no workaround (docs/operations/release.md#signing).
- **Faster start.** The app window shows in under a second, but it takes about 4 seconds before
  you can work; the goal is under 3. The server should start listening before providers and
  device support finish loading (docs/QA-REPORT.md, P-1).
- **`npx moonfold`.** Publish the `moonfold` package on npm.
- **Clean-machine checks** of every installer on macOS, Windows and Linux, including an update
  from one beta to the next.

## Next

- Smoother scrolling in very long threads: cache parsed markdown per message (QA-REPORT P-2).
- Computer use on macOS and Linux (Windows only today).
- Electron fuses tightened once the server ships as its own binary.
- One logging layer that redacts secrets everywhere, instead of per call site.
- Homebrew and winget packages (manifests are generated; submission waits for beta feedback).
- A command-line build for Intel Macs.

## Later

- Handoff between machines: continue a task on another environment, not only another agent.
- A self-hosted relay guide for Moonfold Connect, so remote access works without Tailscale or SSH.
- More providers as they ship command-line agents that run under the user's own login.

## Not planned

- Hosting, pooling or reselling provider logins or tokens. Moonfold runs each agent as your own
  local CLI with your own login, and stays that way.
- Telemetry on by default.
