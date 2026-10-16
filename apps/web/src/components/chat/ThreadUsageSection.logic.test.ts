import { describe, expect, it } from "vite-plus/test";

import { presentThreadUsageGroup } from "./ThreadUsageSection.logic";

describe("presentThreadUsageGroup", () => {
  it("names the model configuration and shows totals with the cached share", () => {
    expect(
      presentThreadUsageGroup({
        model: "gpt-5.4",
        effort: "high",
        speed: "fast",
        turns: 3,
        inputTokens: 40_000,
        cachedInputTokens: 30_000,
        outputTokens: 2_500,
        reasoningTokens: 900,
        partial: false,
      }),
    ).toEqual({
      label: "GPT-5.4 · high · fast",
      total: "43k",
      detail: "40k in (75% cached) · 2.5k out · 3 turns",
    });
  });

  it("marks partial totals as a lower bound", () => {
    const row = presentThreadUsageGroup({
      model: "custom-model",
      effort: null,
      speed: null,
      turns: 1,
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 12,
      reasoningTokens: 0,
      partial: true,
    });
    expect(row.label).toBe("custom-model");
    expect(row.total).toBe("≥ 12");
    expect(row.detail).toBe("0 in (0% cached) · 12 out · 1 turn");
  });
});
