import { describe, expect, it } from "vite-plus/test";

import {
  isNightlyDesktopVersion,
  isTestingReleaseVersion,
  resolveDefaultDesktopUpdateChannel,
} from "./updateChannels.ts";

describe("updateChannels", () => {
  it("keeps preview builds branded as nightly but on the latest update channel", () => {
    expect(isNightlyDesktopVersion("0.0.41-preview.20260911.7")).toBe(true);
    expect(resolveDefaultDesktopUpdateChannel("0.0.41-preview.20260911.7")).toBe("latest");
    expect(resolveDefaultDesktopUpdateChannel("0.0.41-nightly.20260911.7")).toBe("nightly");
  });

  it("treats betas as testing releases on the latest channel", () => {
    expect(isTestingReleaseVersion("0.1.0-beta.1")).toBe(true);
    expect(isTestingReleaseVersion("0.2.0-rc.3")).toBe(true);
    expect(isTestingReleaseVersion("0.1.0")).toBe(false);
    expect(isTestingReleaseVersion("0.1.0-nightly.20261020.1")).toBe(false);
    expect(resolveDefaultDesktopUpdateChannel("0.1.0-beta.1")).toBe("latest");
  });

  it("only matches the first prerelease identifier", () => {
    expect(isNightlyDesktopVersion("1.2.3-foo-preview.20260911.1")).toBe(false);
    expect(isNightlyDesktopVersion("1.2.3")).toBe(false);
  });
});
