import { describe, expect, it } from "vite-plus/test";

import { parseSha256Sums, renderHomebrewCask, renderWingetManifests } from "./package-manifests.ts";

const hash = (digit: string) => digit.repeat(64);
const sums = parseSha256Sums(
  [
    `${hash("a")}  Moonfold-0.1.0-beta.1-arm64.dmg`,
    `${hash("b")} *Moonfold-0.1.0-beta.1-x64.dmg`,
    `${hash("c")}  Moonfold-0.1.0-beta.1-x64.exe`,
    `${hash("d")}  Moonfold-0.1.0-beta.1-arm64.exe`,
    "",
  ].join("\n"),
);

describe("package manifests", () => {
  it("reads sha256sum output in text and binary mode", () => {
    expect(sums.get("Moonfold-0.1.0-beta.1-x64.dmg")).toBe(hash("b"));
    expect(sums.size).toBe(4);
  });

  it("pins both macOS architectures in the cask", () => {
    const cask = renderHomebrewCask("0.1.0-beta.1", sums);
    expect(cask).toContain(`version "0.1.0-beta.1"`);
    expect(cask).toContain(`sha256 arm:   "${hash("a")}",`);
    expect(cask).toContain(`intel: "${hash("b")}"`);
  });

  it("lists each Windows installer with its own URL and hash", () => {
    const installer = renderWingetManifests("0.1.0-beta.1", sums).find((manifest) =>
      manifest.file.endsWith(".installer.yaml"),
    );
    expect(installer?.content).toContain(
      "InstallerUrl: https://github.com/Mr-Dark-debug/Moonfold/releases/download/v0.1.0-beta.1/Moonfold-0.1.0-beta.1-arm64.exe",
    );
    expect(installer?.content).toContain(`InstallerSha256: ${hash("d").toUpperCase()}`);
  });

  it("refuses a release missing an installer", () => {
    expect(() => renderHomebrewCask("0.2.0", sums)).toThrow(/Moonfold-0.2.0-arm64.dmg/);
  });
});
