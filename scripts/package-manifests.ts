// @effect-diagnostics nodeBuiltinImport:off - A small release script that writes package manifests.
/**
 * Writes a Homebrew cask and winget manifests for one published release, from its SHA256SUMS.
 * They are prepared in `packaging/` and submitted to Homebrew and winget by hand
 * (docs/operations/release.md).
 *
 *   node scripts/package-manifests.ts <version> <SHA256SUMS>
 */
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

const REPOSITORY = "Mr-Dark-debug/Moonfold";
const HOMEPAGE = `https://github.com/${REPOSITORY}`;
const WINGET_ID = "MrDarkDebug.Moonfold";
const WINGET_MANIFEST_VERSION = "1.9.0";
const DESCRIPTION = "Open-source workspace for coding agents, with handoff between providers";

/** `sha256sum` output: one `<hash>  <file>` line per file, `*` marking binary mode. */
export function parseSha256Sums(text: string): ReadonlyMap<string, string> {
  const sums = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const match = /^([0-9a-f]{64}) [ *](.+)$/.exec(line.trim());
    if (match) sums.set(match[2]!, match[1]!);
  }
  return sums;
}

const required = (sums: ReadonlyMap<string, string>, file: string) => {
  const sum = sums.get(file);
  if (sum === undefined) throw new Error(`SHA256SUMS has no entry for ${file}.`);
  return sum;
};

const releaseUrl = (version: string, file: string) =>
  `${HOMEPAGE}/releases/download/v${version}/${file}`;

export function renderHomebrewCask(version: string, sums: ReadonlyMap<string, string>): string {
  const arm = required(sums, `Moonfold-${version}-arm64.dmg`);
  const intel = required(sums, `Moonfold-${version}-x64.dmg`);
  return [
    `cask "moonfold" do`,
    `  arch arm: "arm64", intel: "x64"`,
    ``,
    `  version "${version}"`,
    `  sha256 arm:   "${arm}",`,
    `         intel: "${intel}"`,
    ``,
    `  url "${HOMEPAGE}/releases/download/v#{version}/Moonfold-#{version}-#{arch}.dmg"`,
    `  name "Moonfold"`,
    `  desc "${DESCRIPTION}"`,
    `  homepage "${HOMEPAGE}"`,
    ``,
    `  livecheck do`,
    `    url :url`,
    `    strategy :github_latest`,
    `  end`,
    ``,
    `  auto_updates true`,
    `  depends_on macos: ">= :monterey"`,
    ``,
    `  app "Moonfold.app"`,
    `end`,
    ``,
  ].join("\n");
}

export function renderWingetManifests(
  version: string,
  sums: ReadonlyMap<string, string>,
): ReadonlyArray<{ readonly file: string; readonly content: string }> {
  const header = (type: string) =>
    `# yaml-language-server: $schema=https://aka.ms/winget-manifest.${type}.${WINGET_MANIFEST_VERSION}.schema.json\n\n`;
  const installers = (["x64", "arm64"] as const).map((arch) => {
    const file = `Moonfold-${version}-${arch}.exe`;
    return [
      `  - Architecture: ${arch}`,
      `    InstallerUrl: ${releaseUrl(version, file)}`,
      `    InstallerSha256: ${required(sums, file).toUpperCase()}`,
    ].join("\n");
  });
  return [
    {
      file: `${WINGET_ID}.yaml`,
      content:
        header("version") +
        [
          `PackageIdentifier: ${WINGET_ID}`,
          `PackageVersion: ${version}`,
          `DefaultLocale: en-US`,
          `ManifestType: version`,
          `ManifestVersion: ${WINGET_MANIFEST_VERSION}`,
          ``,
        ].join("\n"),
    },
    {
      file: `${WINGET_ID}.installer.yaml`,
      content:
        header("installer") +
        [
          `PackageIdentifier: ${WINGET_ID}`,
          `PackageVersion: ${version}`,
          `InstallerType: nullsoft`,
          `Scope: user`,
          `UpgradeBehavior: install`,
          `Installers:`,
          ...installers,
          `ManifestType: installer`,
          `ManifestVersion: ${WINGET_MANIFEST_VERSION}`,
          ``,
        ].join("\n"),
    },
    {
      file: `${WINGET_ID}.locale.en-US.yaml`,
      content:
        header("defaultLocale") +
        [
          `PackageIdentifier: ${WINGET_ID}`,
          `PackageVersion: ${version}`,
          `PackageLocale: en-US`,
          `Publisher: Moonfold contributors`,
          `PublisherUrl: ${HOMEPAGE}`,
          `PackageName: Moonfold`,
          `PackageUrl: ${HOMEPAGE}`,
          `License: MIT`,
          `LicenseUrl: ${HOMEPAGE}/blob/main/LICENSE`,
          `ShortDescription: ${DESCRIPTION}`,
          `ReleaseNotesUrl: ${HOMEPAGE}/releases/tag/v${version}`,
          `ManifestType: defaultLocale`,
          `ManifestVersion: ${WINGET_MANIFEST_VERSION}`,
          ``,
        ].join("\n"),
    },
  ];
}

if (process.argv[1] === NodeURL.fileURLToPath(import.meta.url)) {
  const [version, sumsPath] = process.argv.slice(2);
  if (version === undefined || sumsPath === undefined) {
    throw new Error("Usage: node scripts/package-manifests.ts <version> <SHA256SUMS>");
  }
  const root = NodePath.resolve(NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)), "..");
  const sums = parseSha256Sums(NodeFS.readFileSync(sumsPath, "utf8"));
  const caskDir = NodePath.join(root, "packaging", "homebrew", "Casks");
  NodeFS.mkdirSync(caskDir, { recursive: true });
  NodeFS.writeFileSync(NodePath.join(caskDir, "moonfold.rb"), renderHomebrewCask(version, sums));
  const wingetDir = NodePath.join(
    root,
    "packaging",
    "winget",
    "manifests",
    "m",
    "MrDarkDebug",
    "Moonfold",
    version,
  );
  NodeFS.mkdirSync(wingetDir, { recursive: true });
  for (const manifest of renderWingetManifests(version, sums)) {
    NodeFS.writeFileSync(NodePath.join(wingetDir, manifest.file), manifest.content);
  }
}
