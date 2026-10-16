# Release

Moonfold's release pipeline is being rebuilt for this repository (BUILD-PLAN Phase 7). The
inherited T3 Code release workflows were removed because they published to T3's hosting, signing
and package-manager accounts.

## Until the pipeline lands

Build installers locally from a clean checkout:

```bash
vp i
vp run build:desktop
pnpm run dist:desktop:win     # or dist:desktop:dmg / dist:desktop:linux
```

Artifacts land in `release/`. Local builds have no update feed: `scripts/build-desktop-artifact.ts`
only writes an electron-builder `publish` entry when `MOONFOLD_DESKTOP_UPDATE_REPOSITORY` or
`GITHUB_REPOSITORY` is set, so a CI build in this repository publishes updates to its own GitHub
Releases and a local build publishes nowhere.

## What Phase 7 adds

- GitHub Actions builds for macOS (arm64, x64), Windows (x64) and Linux (AppImage, `.deb`).
- Auto-update from this repository's GitHub Releases, checksums and an SBOM per release.
- Signing documentation: unsigned betas trigger Gatekeeper and SmartScreen warnings until the
  owner provides an Apple Developer ID and a Windows signing option.
- An REA pass over every artifact before publishing (docs/REA.md).

## Version scheme

Stable versions look like `0.1.0`. Nightly builds use `-nightly.<yyyymmdd>.<run>`, which the
desktop updater treats as the nightly channel (`resolveDesktopUpdateChannel`).
