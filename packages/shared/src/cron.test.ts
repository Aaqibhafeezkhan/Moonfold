import * as DateTime from "effect/DateTime";
import { describe, expect, it } from "vite-plus/test";

import { cronError, describeCron, isValidTimeZone, nextCronOccurrence, parseCron } from "./cron.ts";

const at = (iso: string) => DateTime.makeUnsafe(iso);
const next = (expression: string, from: string, timeZone = "UTC") => {
  const result = nextCronOccurrence(parseCron(expression), at(from), timeZone);
  return result === null ? null : DateTime.formatIso(result);
};

describe("parseCron", () => {
  it("expands lists, ranges, steps and names", () => {
    const schedule = parseCron("*/15 9-17/4 1,15 jan-mar MON-FRI");
    expect(schedule.minutes).toEqual([0, 15, 30, 45]);
    expect(schedule.hours).toEqual([9, 13, 17]);
    expect([...schedule.daysOfMonth]).toEqual([1, 15]);
    expect([...schedule.months]).toEqual([1, 2, 3]);
    expect([...schedule.daysOfWeek]).toEqual([1, 2, 3, 4, 5]);
  });

  it("treats 7 as Sunday", () => {
    expect([...parseCron("0 0 * * 7").daysOfWeek]).toEqual([0]);
  });

  it("explains what is wrong", () => {
    expect(cronError("* * *")).toMatch(/five fields/);
    expect(cronError("61 * * * *")).toMatch(/minute must be between 0 and 59/);
    expect(cronError("0 5-2 * * *")).toMatch(/backwards/);
    expect(cronError("0 * * * */0")).toMatch(/step/);
    expect(cronError("0 9 * * mon")).toBeNull();
  });
});

describe("nextCronOccurrence", () => {
  it("finds the next minute strictly after the start", () => {
    expect(next("30 9 * * *", "2026-10-19T09:30:00.000Z")).toBe("2026-10-20T09:30:00.000Z");
    expect(next("30 9 * * *", "2026-10-19T09:29:59.000Z")).toBe("2026-10-19T09:30:00.000Z");
  });

  it("reads wall-clock time in the task's time zone", () => {
    // 09:00 in Berlin during summer time is 07:00 UTC.
    expect(next("0 9 * * *", "2026-07-01T00:00:00.000Z", "Europe/Berlin")).toBe(
      "2026-07-01T07:00:00.000Z",
    );
    // After the switch back to winter time it is 08:00 UTC.
    expect(next("0 9 * * *", "2026-11-01T00:00:00.000Z", "Europe/Berlin")).toBe(
      "2026-11-01T08:00:00.000Z",
    );
  });

  it("skips a wall-clock time a daylight-saving jump removes", () => {
    // 02:30 does not exist in New York on 2026-03-08.
    expect(next("30 2 * * *", "2026-03-08T00:00:00.000Z", "America/New_York")).toBe(
      "2026-03-09T06:30:00.000Z",
    );
  });

  it("matches either day field when both are restricted", () => {
    // The 1st of the month or a Monday: 2026-10-19 is a Monday.
    expect(next("0 8 1 * 1", "2026-10-18T12:00:00.000Z")).toBe("2026-10-19T08:00:00.000Z");
  });

  it("handles rules that match rarely or never", () => {
    expect(next("0 0 29 2 *", "2026-03-01T00:00:00.000Z")).toBe("2028-02-29T00:00:00.000Z");
    expect(next("0 0 31 2 *", "2026-03-01T00:00:00.000Z")).toBeNull();
  });

  it("returns null for an unknown time zone", () => {
    expect(next("0 9 * * *", "2026-10-19T00:00:00.000Z", "Mars/Olympus")).toBeNull();
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
  });
});

describe("describeCron", () => {
  it("names common shapes and leaves the rest alone", () => {
    expect(describeCron("5 * * * *")).toBe("Every hour at :05");
    expect(describeCron("0 9 * * *")).toBe("Every day at 09:00");
    expect(describeCron("0 9 * * 1-5")).toBe("Weekdays at 09:00");
    expect(describeCron("30 18 * * 5")).toBe("Fridays at 18:30");
    expect(describeCron("0 7 1 * *")).toBe("On day 1 of every month at 07:00");
    expect(describeCron("*/10 * * * *")).toBeNull();
  });
});
