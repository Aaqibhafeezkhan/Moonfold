// @effect-diagnostics nodeBuiltinImport:off globalConsole:off - A synchronous repo-wide text codemod run from the shell.
// Rewrites T3 Code identifiers to Moonfold identifiers in tracked text files and file names.
//
// Run it again after merging upstream T3 Code changes: it is idempotent. Hosted T3 domains and
// upstream issue links are deliberately left untouched so `scripts/check-brand.ts` reports them
// for a human decision instead of turning them into made-up Moonfold domains.
//
//   node scripts/brand-codemod.ts            apply
//   node scripts/brand-codemod.ts --dry-run  report only
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

const repoRoot = NodePath.resolve(import.meta.dirname, "..");
const dryRun = process.argv.includes("--dry-run");

// Files that describe the fork itself, attribution, generated schemas and vendored references.
const EXCLUDED_PATHS: ReadonlyArray<RegExp> = [
  /^\.repos\//,
  /^docs\/protocol\//,
  /^docs\/plans\//,
  /^assets\/brand\//,
  /^pnpm-lock\.yaml$/,
  /^LICENSE$/,
  /^NOTICE$/,
  /^THIRD_PARTY_LICENSES/,
  /^CLAUDE\.md$/,
  /^BUILD-PLAN\.md$/,
  /^LAUNCH-PLAN\.md$/,
  /^PROGRESS\.md$/,
  /^docs\/(ARCHITECTURE|BRAND|CODEX-APP-REA|DECISIONS|DEV|FEATURE-MATRIX|NETWORK-AUDIT|PROTOCOL|REA|REA-SELF-AUDIT|REA-PHASE[0-9]+|UX-STUDY|UX-STUDY-TEMPLATE)\.md$/,
  /^scripts\/brand-codemod\.ts$/,
  /^scripts\/check-brand\.ts$/,
  /^README\.md$/,
  /^docs\/operations\/release\.md$/,
  /^CODE_OF_CONDUCT\.md$/,
  /^docs\/legal\//,
  /^apps\/web\/src\/components\/settings\/AboutMoonfold\.tsx$/,
];

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".icns",
  ".bmp",
  ".tiff",
  ".avif",
  ".ttf",
  ".otf",
  ".woff",
  ".woff2",
  ".eot",
  ".zip",
  ".tgz",
  ".gz",
  ".tar",
  ".7z",
  ".wasm",
  ".node",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".sqlite",
  ".db",
  ".mp3",
  ".mp4",
  ".mov",
  ".wav",
  ".webm",
  ".pdf",
  ".jar",
  ".keystore",
]);

// Matched first and kept verbatim.
const PROTECTED: ReadonlyArray<RegExp> = [
  // Attribution to the upstream project stays verbatim wherever it appears.
  /\[T3 Code\]\(https:\/\/github\.com\/pingdotgg\/t3code\)/g,
  /[A-Za-z0-9.-]*\bt3\.codes\b/g,
  /\bt3\.chat\b/g,
  /\bt3tools\.com\b/g,
  /\bT3 Tools\b/g,
  // Opaque blobs (hashes, base64 payloads in recorded fixtures).
  /(?=[A-Za-z0-9+=]*[0-9])(?=[A-Za-z0-9+=]*[A-Z])(?=[A-Za-z0-9+=]*[a-z])[A-Za-z0-9+=]{60,}/g,
];

// Applied in order to the unprotected text.
const RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/com\.t3tools\.t3code/g, "dev.moonfold.app"],
  [/com\.t3tools/g, "dev.moonfold"],
  [/@t3tools\//g, "@moonfold/"],
  [/pingdotgg\/t3code/g, "moonfold-dev/moonfold"],
  // A separate upstream org from pingdotgg; its mixed-case spellings (T3Tools/T3Code) map to
  // Moonfold/Moonfold, so the lowercase form must be moonfold/moonfold to stay case-equal.
  [/t3tools\/t3code/g, "moonfold/moonfold"],
  [/pingdotgg/g, "moonfold-dev"],
  [/PingDotGG/g, "Moonfold-Dev"],
  [/Pingdotgg/g, "Moonfold-dev"],
  [/T3Tools/g, "Moonfold"],
  [/t3tools/g, "moonfold"],
  [/T3 [Cc]ode/g, "Moonfold"],
  // URL-encoded spellings inside recorded requests and query strings.
  [/T3(?:\+|%20)[Cc]ode/g, "Moonfold"],
  [/(?<=%3A|%2F)t3(?=%3A|%2F|%2D)/g, "moonfold"],
  [/T3CODE/g, "MOONFOLD"],
  [/T3_CODE/g, "MOONFOLD"],
  [/T3-Code/g, "Moonfold"],
  [/T3-code/g, "Moonfold"],
  [/T3Code/g, "Moonfold"],
  [/T3code/g, "Moonfold"],
  [/t3Code/g, "moonfold"],
  [/t3code/g, "moonfold"],
  [/t3_code/g, "moonfold"],
  [/t3-code/g, "moonfold"],
  // SCREAMING_CASE parts: T3_FOO, FOO_T3, FOO_T3_BAR.
  [/(?<![A-Za-z0-9])T3(?=_[A-Z0-9])/g, "MOONFOLD"],
  [/(?<=_)T3(?![A-Za-z0-9])/g, "MOONFOLD"],
  // camelCase / PascalCase parts: fooT3Bar, isT3.
  [/(?<=[a-z])T3(?=[A-Z])/g, "Moonfold"],
  [/(?<=[a-z])T3(?![A-Za-z0-9])/g, "Moonfold"],
  // Tokens right after a string escape such as "\n" or "\t" in source text.
  [/(?<=\\[ntr])t3(?=[A-Z_-])/g, "moonfold"],
  [/(?<=\\[ntr])T3(?=[A-Z_ -])/g, "Moonfold"],
  // Standalone or leading words: T3, T3Foo, t3, t3Foo, t3-foo, .t3, /t3.
  [/(?<![A-Za-z0-9])T3(?![0-9])/g, "Moonfold"],
  [/(?<![A-Za-z0-9])t3(?![0-9])/g, "moonfold"],
];

// Tests and recorded fixtures use the upstream repository as example data; they get a consistent
// example slug. Everywhere else the slug is a real link and must point at this repository.
const REPOSITORY_SLUG = "Mr-Dark-debug/Moonfold";
const TEST_PATH =
  /(\.test\.[cm]?[jt]sx?$|\/fixtures\/|\/testkit\/|\/__tests__\/|mock[^/]*\.[cm]?[jt]s$)/;

export function rebrandFile(file: string, input: string): string {
  const isTest = TEST_PATH.test(file);
  const text = rebrandText(input, !isTest);
  return isTest ? text : text.replace(/moonfold-dev\/moonfold/g, REPOSITORY_SLUG);
}

// Upstream issue and PR links in comments and docs stay pointed at upstream history.
const UPSTREAM_LINK =
  /github\.com\/pingdotgg\/t3code\/(?:issues|pull|commit|blob|tree|discussions)\/[^\s)"'`>\]]+/g;

export function rebrandText(input: string, keepUpstreamLinks = true): string {
  type Segment = { readonly text: string; readonly locked: boolean };
  let segments: Array<Segment> = [{ text: input, locked: false }];
  for (const pattern of keepUpstreamLinks ? [UPSTREAM_LINK, ...PROTECTED] : PROTECTED) {
    const next: Array<Segment> = [];
    for (const segment of segments) {
      if (segment.locked) {
        next.push(segment);
        continue;
      }
      let last = 0;
      for (const match of segment.text.matchAll(pattern)) {
        const start = match.index ?? 0;
        if (start > last) next.push({ text: segment.text.slice(last, start), locked: false });
        next.push({ text: match[0], locked: true });
        last = start + match[0].length;
      }
      if (last < segment.text.length) next.push({ text: segment.text.slice(last), locked: false });
    }
    segments = next;
  }
  return segments
    .map((segment) =>
      segment.locked
        ? segment.text
        : RULES.reduce(
            (text, [pattern, replacement]) => text.replace(pattern, replacement),
            segment.text,
          ),
    )
    .join("");
}

function trackedFiles(): Array<string> {
  return NodeChildProcess.execFileSync("git", ["ls-files", "-z"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  })
    .split("\0")
    .filter((file) => file.length > 0);
}

function isExcluded(file: string): boolean {
  return EXCLUDED_PATHS.some((pattern) => pattern.test(file));
}

function isBinary(file: string, bytes: Buffer): boolean {
  return BINARY_EXTENSIONS.has(NodePath.extname(file).toLowerCase()) || bytes.includes(0);
}

// Antivirus scanners on Windows briefly lock files that were just written.
function writeWithRetry(file: string, text: string): void {
  for (let attempt = 1; ; attempt += 1) {
    try {
      NodeFS.writeFileSync(file, text);
      return;
    } catch (error) {
      if (attempt >= 5) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200 * attempt);
    }
  }
}

function main(): void {
  let changedFiles = 0;
  const renames: Array<readonly [string, string]> = [];
  for (const file of trackedFiles()) {
    if (isExcluded(file)) continue;
    const absolute = NodePath.join(repoRoot, file);
    if (!NodeFS.existsSync(absolute) || NodeFS.lstatSync(absolute).isSymbolicLink()) continue;
    const bytes = NodeFS.readFileSync(absolute);
    if (!isBinary(file, bytes)) {
      const before = bytes.toString("utf8");
      const after = rebrandFile(file, before);
      if (after !== before) {
        changedFiles += 1;
        if (!dryRun) writeWithRetry(absolute, after);
      }
    }
    const renamed = rebrandText(file);
    if (renamed !== file) renames.push([file, renamed]);
  }
  for (const [from, to] of renames) {
    if (dryRun) continue;
    NodeFS.mkdirSync(NodePath.dirname(NodePath.join(repoRoot, to)), { recursive: true });
    NodeChildProcess.execFileSync("git", ["mv", "-f", from, to], { cwd: repoRoot });
  }
  console.log(
    `${dryRun ? "[dry run] " : ""}rewrote ${changedFiles} files, renamed ${renames.length} paths`,
  );
}

if (import.meta.main) main();
