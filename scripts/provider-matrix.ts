// @effect-diagnostics nodeBuiltinImport:off globalConsole:off - A small build-time script that rewrites one README section.
/**
 * Renders README's provider matrix from docs/provider-checks.json, the record of checks that ran
 * on real installs. `node scripts/provider-matrix.ts` rewrites the README section;
 * `--check` fails when the README is out of date.
 */
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

const START = "<!-- provider-matrix:start -->";
const END = "<!-- provider-matrix:end -->";

type Result = "pass" | "fail" | "not run" | "unit test only" | "none mapped";

export interface ProviderCheck {
  readonly provider: string;
  readonly cli: string;
  readonly platform: string;
  readonly date: string;
  readonly install: Result;
  readonly login: Result;
  readonly models: Result;
  readonly turn: Result;
  readonly limitSignal: Result;
  readonly handoff: Result;
  readonly notes: string;
}

const MARKS: Record<Result, string> = {
  pass: "✅",
  fail: "❌",
  "not run": "—",
  "unit test only": "tests",
  "none mapped": "none",
};

/** Verified means every live check passed; anything else is listed but not supported. */
export function isVerified(check: ProviderCheck): boolean {
  return [check.install, check.login, check.models, check.turn, check.limitSignal].every(
    (result) => result === "pass",
  );
}

export function renderProviderMatrix(checks: ReadonlyArray<ProviderCheck>): string {
  const rows = checks.map((check) =>
    [
      `**${check.provider}**`,
      isVerified(check) ? "Verified" : "Not verified",
      check.cli,
      MARKS[check.install],
      MARKS[check.login],
      MARKS[check.models],
      MARKS[check.turn],
      MARKS[check.limitSignal],
      MARKS[check.handoff],
      `${check.platform}, ${check.date}`,
    ].join(" | "),
  );
  return [
    START,
    "",
    "| Provider | Status | CLI checked | Install | Sign-in | Models | Turn | Limit signal | Handoff | Where, when |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row} |`),
    "",
    "Generated from [docs/provider-checks.json](./docs/provider-checks.json), which records only",
    "checks that ran on a real install. Notes for each provider are in that file.",
    "",
    END,
  ].join("\n");
}

/** Table text without alignment padding, which the Markdown formatter adds and changes. */
export function normalizeTables(text: string): string {
  return text
    .split("\n")
    .map((line) =>
      line.startsWith("|") ? line.replace(/ {2,}/g, " ").replace(/-{3,}/g, "---") : line,
    )
    .join("\n");
}

export function replaceSection(readme: string, section: string): string {
  const start = readme.indexOf(START);
  const end = readme.indexOf(END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`README is missing the ${START} … ${END} markers.`);
  }
  return readme.slice(0, start) + section + readme.slice(end + END.length);
}

if (process.argv[1] === NodeURL.fileURLToPath(import.meta.url)) {
  const root = NodePath.resolve(NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)), "..");
  const readmePath = NodePath.join(root, "README.md");
  const { checks } = JSON.parse(
    NodeFS.readFileSync(NodePath.join(root, "docs", "provider-checks.json"), "utf8"),
  ) as { readonly checks: ReadonlyArray<ProviderCheck> };
  const readme = NodeFS.readFileSync(readmePath, "utf8");
  const next = replaceSection(readme, renderProviderMatrix(checks));
  if (process.argv.includes("--check")) {
    if (normalizeTables(next) !== normalizeTables(readme)) {
      console.error(
        "README's provider matrix is out of date. Run: node scripts/provider-matrix.ts",
      );
      process.exit(1);
    }
  } else {
    NodeFS.writeFileSync(readmePath, next);
  }
}
