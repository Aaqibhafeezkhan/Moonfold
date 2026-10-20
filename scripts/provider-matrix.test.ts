// @effect-diagnostics nodeBuiltinImport:off - Reads the checked-in README and check record.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";
import { describe, expect, it } from "vite-plus/test";

import {
  isVerified,
  normalizeTables,
  type ProviderCheck,
  renderProviderMatrix,
  replaceSection,
} from "./provider-matrix.ts";

const root = NodePath.resolve(NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)), "..");
const read = (file: string) => NodeFS.readFileSync(NodePath.join(root, file), "utf8");

describe("provider matrix", () => {
  const { checks } = JSON.parse(read("docs/provider-checks.json")) as {
    readonly checks: ReadonlyArray<ProviderCheck>;
  };

  it("lists a provider as verified only when every live check passed", () => {
    const passed = checks.find((check) => check.provider === "Codex")!;
    expect(isVerified(passed)).toBe(true);
    expect(isVerified({ ...passed, turn: "not run" })).toBe(false);
    expect(isVerified({ ...passed, limitSignal: "unit test only" })).toBe(false);
  });

  it("keeps the README in step with the recorded checks", () => {
    const readme = read("README.md");
    expect(normalizeTables(replaceSection(readme, renderProviderMatrix(checks)))).toBe(
      normalizeTables(readme),
    );
  });
});
