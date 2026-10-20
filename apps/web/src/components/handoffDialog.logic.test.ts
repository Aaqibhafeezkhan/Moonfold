import { describe, expect, it } from "vite-plus/test";

import { handoffRedactionSummary, handoffUsageWarning } from "./handoffDialog.logic";

describe("handoffRedactionSummary", () => {
  it("names what the scan replaced, by kind and count", () => {
    expect(handoffRedactionSummary([])).toBeNull();
    expect(handoffRedactionSummary([{ kind: "openai_key", count: 1 }])).toBe(
      "Redacted 1 OpenAI key.",
    );
    expect(
      handoffRedactionSummary([
        { kind: "secret_assignment", count: 2 },
        { kind: "jwt", count: 1 },
        { kind: "url_credentials", count: 1 },
      ]),
    ).toBe("Redacted 2 secret values, 1 JSON web token and 1 password in a URL.");
  });
});

describe("handoffUsageWarning", () => {
  const now = Date.parse("2026-10-20T10:00:00.000Z");
  const usage = {
    checkedAt: "2026-10-20T09:59:00.000Z",
    windows: [
      {
        id: "five_hour",
        kind: "session" as const,
        label: "5-hour",
        usedPercent: 92,
        resetsAt: "2026-10-20T12:00:00.000Z",
      },
      { id: "weekly", kind: "weekly" as const, label: "Weekly", usedPercent: 81 },
      {
        id: "old",
        kind: "other" as const,
        label: "Old",
        usedPercent: 99,
        resetsAt: "2026-10-20T09:00:00.000Z",
      },
    ],
  };

  it("names the fullest window past the threshold that has not reset", () => {
    expect(handoffUsageWarning(usage, 80, now)?.id).toBe("five_hour");
    expect(handoffUsageWarning(usage, 95, now)).toBeNull();
    expect(handoffUsageWarning(usage, null, now)).toBeNull();
    expect(handoffUsageWarning(undefined, 80, now)).toBeNull();
  });
});
