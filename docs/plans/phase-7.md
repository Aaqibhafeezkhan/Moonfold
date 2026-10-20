# Phase 7 plan: packaging and beta release

Goal (BUILD-PLAN Phase 7): a release pipeline on GitHub Actions for macOS, Windows and Linux that
publishes to this repository's GitHub Releases with checksums and an SBOM, an update feed the
desktop app follows, signing documentation, a one-line install path, Homebrew and winget
manifests (not submitted), REA on the artifacts, and v0.1.0-beta.1 as a GitHub prerelease.

## Steps

1. Rebuild `release.yml` and `release-desktop.yml` from upstream's MIT pipeline without T3's
   services (relay config, Clerk keys, Discord, Vercel, AUR, npm publishing, Blacksmith runners).
   Targets: macOS arm64 and x64 (dmg), Windows x64 and arm64 (NSIS), Linux x64 and arm64
   (AppImage and .deb). CLI archives per target for the install scripts; Windows embeds the
   same-arch Linux archive as its WSL runtime.
2. Publish job: merged electron-updater manifests, CycloneDX SBOM, `SHA256SUMS`, release notes
   from `docs/releases/<tag>.md`, prerelease for `-beta.N`.
3. Dry runs from a `release-dry-run/<version>` branch, since `workflow_dispatch` only works once
   the workflow is on `main`.
4. Update channel: beta installs must accept GitHub prereleases or they never see the next beta.
5. Install path: the existing install scripts read CLI archives from GitHub Releases; make their
   default channel include betas. `npx` needs the owner's npm account, so the docs stop
   promising it and the app stops waiting on npm for server updates.
6. Signing: document what the owner needs for Apple notarization and Windows signing; the
   workflow signs only when those secrets exist. First-run instructions for unsigned builds.
7. Homebrew cask and winget manifests generated from a release's `SHA256SUMS`.
8. REA on the dry-run artifacts (fuses, app.asar, update feed config, hosts); install the
   Windows build on this machine with a scratch home, launch it, measure the packaged cold start.
9. Merge, tag `v0.1.0-beta.1`, confirm the published release.

## Not possible here

The BUILD-PLAN gate asks for clean machines per OS and an update to a newer build. Only Windows
11 is available, the providers on this machine are at their usage limits until November, and an
update needs a second published release. Those parts are recorded as not verified.
