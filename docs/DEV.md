# Moonfold dev setup

Verified on Linux x64 (Node 22.22 on the host, `vp` 1.2.0, pnpm 11.10.0 managed by `vp`). The repo declares Node `^24.13.1`; the build still succeeded on Node 22, but use Node 24 for anything you intend to ship.

## Install the toolchain

```sh
curl -fsSL https://vite.plus -o vp-install.sh   # inspect, then:
bash vp-install.sh
. "$HOME/.config/vite-plus/env"                  # puts vp on PATH
vp i                                             # ~2.5 min cold
```

## Run and build

| Task               | Command                                                                      |
| ------------------ | ---------------------------------------------------------------------------- |
| Dev (server + web) | `vp run dev` (read ports from the `[dev-runner]` line, open the pairing URL) |
| Dev (desktop)      | `vp run dev:desktop`                                                         |
| Build server + web | `vp run --filter t3 --filter @t3tools/web build` (about 2 min)               |
| Build desktop      | `vp run build:desktop`                                                       |
| Lint               | `vp lint --report-unused-disable-directives`                                 |
| Typecheck          | `vp run -r --concurrency-limit 2 typecheck`                                  |
| Tests (targeted)   | `vp test run <files>`                                                        |
| Format check       | `vp fmt --check`                                                             |
| Package desktop    | `pnpm run dist:desktop:linux` / `:dmg` / `:win` (see root `package.json`)    |

Upstream rule (AGENTS.md): do not run repo-wide checks locally unless needed; CI owns the full suite.

## Never

- Never run a dev server against `~/.t3/userdata` (the live T3 database).
- Never set `VITE_HTTP_URL` / `VITE_WS_URL` in dev.
- Never kill processes by name pattern.

## Not yet verified (see PROGRESS.md)

- `vp run dev` end to end in a browser.
- Desktop (Electron) build and launch: needs a display, not available in this cloud container.
- Codex and Claude Code sessions end to end: need the owner's logins.
