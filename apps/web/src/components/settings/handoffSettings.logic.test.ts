import { ProviderInstanceId } from "@moonfold/contracts";
import { describe, expect, it } from "vite-plus/test";

import { defaultModelSlug, handoffWarnLabel, moveFallback } from "./handoffSettings.logic";

const a = { instanceId: ProviderInstanceId.make("codex"), model: "a" };
const b = { instanceId: ProviderInstanceId.make("claudeAgent"), model: "b" };
const c = { instanceId: ProviderInstanceId.make("grok"), model: "c" };

describe("moveFallback", () => {
  it("swaps an entry with its neighbour and stops at the ends", () => {
    expect(moveFallback([a, b, c], 1, -1)).toEqual([b, a, c]);
    expect(moveFallback([a, b, c], 1, 1)).toEqual([a, c, b]);
    expect(moveFallback([a, b, c], 0, -1)).toEqual([a, b, c]);
    expect(moveFallback([a, b, c], 2, 1)).toEqual([a, b, c]);
  });

  it("labels the usage warning", () => {
    expect(handoffWarnLabel(null)).toBe("Off");
    expect(handoffWarnLabel(90)).toBe("At 90% used");
  });
});

describe("defaultModelSlug", () => {
  it("picks the default model, else the first current one", () => {
    expect(defaultModelSlug([{ slug: "old", isLegacy: true }, { slug: "new" }])).toBe("new");
    expect(defaultModelSlug([{ slug: "a" }, { slug: "b", isDefault: true }])).toBe("b");
    expect(defaultModelSlug([{ slug: "x", isUnavailable: true }])).toBeNull();
    expect(defaultModelSlug(undefined)).toBeNull();
  });
});
