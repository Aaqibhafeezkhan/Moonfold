# Moonfold dev setup

Verified on Linux x64 (Node 22.22, cloud container) and on Windows 11 x64 (Node 24.14.1), both with `vp` 1.2.0 and pnpm 11.10.0 managed by `vp`. The repo declares Node `^24.13.1`; use Node 24.

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

## Windows (verified 2026-10-16, Windows 11, Node 24.14.1, vp 1.2.0)

```powershell
# Fetch and inspect the official installer first, then run it in a child PowerShell.
# Running it in-process under -ErrorAction Stop aborts on vp's informational stderr.
Invoke-WebRequest https://vite.plus/ps1 -OutFile vp-install.ps1
$env:VP_VERSION = "1.2.0"; powershell -NoProfile -ExecutionPolicy Bypass -File vp-install.ps1
```

- The `vp` shim in `%LOCALAPPDATA%\vite-plus\bin` failed from Git Bash with "Windows error 3"
  even though the `current` junction was valid. Put the real binary on PATH instead:
  `export PATH="/c/Users/<you>/AppData/Local/vite-plus/data/1.2.0/bin:$PATH"` (Git Bash).
- `vp i` then works as on Linux. Server + web build took 1 m 44 s.
- The main checkout is not a worktree, so pass an explicit home: `vp run dev --home-dir D:/projects/Moonfold/.t3`
  (`.t3` is gitignored). Without it the main checkout uses `~/.t3/dev/userdata`.
- Running `node apps/server/src/bin.ts ...` (for example `project add`) while `vp run dev` is up
  makes the dev server's file watcher restart the server once; reload the page afterwards.

## Not yet verified (see PROGRESS.md)

- Desktop (Electron) build and launch (`vp run dev:desktop`, `build:desktop`): Phase 1.
- macOS and Linux on real hardware since the Phase 0 container run.
