import type { DesktopUpdateChannel } from "@moonfold/contracts";

const NIGHTLY_VERSION_PATTERN = /^[^-+]+-nightly\.\d{8}\.\d+$/;
// Preview builds are the maintainers' test train, cut by hand from unreleased
// branches to exercise the release flow. They share nightly's branding but
// are packaged without an update feed (see
// isDesktopPreviewVersion in scripts/build-desktop-artifact.ts), so the
// channel a preview install reports is cosmetic: it never checks for updates
// and no updater feed ever lists a preview release.
const PRERELEASE_VERSION_PATTERN = /^[^-+]+-(?:nightly|preview)\.\d{8}\.\d+$/;

export function isNightlyDesktopVersion(version: string): boolean {
  return PRERELEASE_VERSION_PATTERN.test(version);
}

// Moonfold's betas (`0.1.0-beta.1`) are GitHub prereleases on the latest channel. A beta install
// has to accept prereleases, or the GitHub feed never offers it the next beta.
const TESTING_RELEASE_VERSION_PATTERN = /^[^-+]+-(?:alpha|beta|rc)\.\d+$/;

export function isTestingReleaseVersion(version: string): boolean {
  return TESTING_RELEASE_VERSION_PATTERN.test(version);
}

export function resolveDefaultDesktopUpdateChannel(appVersion: string): DesktopUpdateChannel {
  return NIGHTLY_VERSION_PATTERN.test(appVersion) ? "nightly" : "latest";
}
