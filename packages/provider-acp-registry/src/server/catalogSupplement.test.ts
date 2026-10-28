import { describe, expect, it } from "vitest";

import { messageReportsUsageLimit } from "./adapter.ts";
import { ACP_CATALOG_SUPPLEMENT, withCatalogSupplement } from "./catalogSupplement.ts";

describe("ACP catalog supplement", () => {
  it("adds supplement agents after the Registry and lets the Registry win on the same id", () => {
    const registry = [
      { id: "gemini", source: "registry" },
      { id: "deepseek-harness", source: "registry" },
    ];
    const supplement = [
      { id: "deepseek-harness", source: "supplement" },
      { id: "another", source: "supplement" },
    ];
    expect(withCatalogSupplement(registry, supplement)).toEqual([
      { id: "gemini", source: "registry" },
      { id: "deepseek-harness", source: "registry" },
      { id: "another", source: "supplement" },
    ]);
  });

  it("pins DeepSeek Harness to an exact npx version launched with its ACP profile", () => {
    const entry = ACP_CATALOG_SUPPLEMENT.find(
      (candidate) => (candidate as { id: string }).id === "deepseek-harness",
    ) as {
      version: string;
      distribution: { npx: { package: string; args: ReadonlyArray<string> } };
    };
    expect(entry.distribution.npx.package).toBe(`@deepseek-ai/dsh@${entry.version}`);
    expect(entry.distribution.npx.args).toEqual(["--profile", "acp"]);
  });
});

describe("messageReportsUsageLimit", () => {
  it.each([
    "turn failed: 402 Insufficient Balance",
    "turn failed: insufficient_quota",
    "credits exhausted for this account",
    "turn failed: 429 Rate Limit Reached",
    "Quota reached for the current window",
    "RESOURCE_EXHAUSTED",
  ])("treats %j as a usage limit", (message) => {
    expect(messageReportsUsageLimit(message)).toBe(true);
  });

  it.each(["turn failed: connection reset", "insufficient permissions to write file", "429x"])(
    "does not treat %j as a usage limit",
    (message) => {
      expect(messageReportsUsageLimit(message)).toBe(false);
    },
  );
});
