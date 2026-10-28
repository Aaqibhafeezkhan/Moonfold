import type { ScheduledTask } from "@moonfold/contracts";
import { describe, expect, it } from "vite-plus/test";

import { pendingScheduledSends } from "./scheduledSendBanner";

const task = (patch: Partial<ScheduledTask> & { id: string }): ScheduledTask =>
  ({
    title: "Scheduled: x",
    prompt: "x",
    enabled: true,
    schedule: { type: "once", at: "2026-10-28T09:00", timeZone: "UTC" },
    threadId: "thread-1",
    nextRunAt: "2026-10-28T09:00:00.000Z",
    lastRunStatus: "never",
    ...patch,
  }) as unknown as ScheduledTask;

describe("pendingScheduledSends", () => {
  it("keeps this thread's waiting one-off messages, soonest first", () => {
    const pending = pendingScheduledSends(
      [
        task({ id: "later", nextRunAt: "2026-10-29T09:00:00.000Z" }),
        task({ id: "sooner", nextRunAt: "2026-10-28T08:00:00.000Z" }),
        task({ id: "other-thread", threadId: "thread-2" as ScheduledTask["threadId"] }),
        task({ id: "sent", nextRunAt: null, lastRunStatus: "succeeded" }),
        task({ id: "off", enabled: false }),
        task({ id: "sending", lastRunStatus: "running" }),
        task({
          id: "recurring",
          schedule: { type: "cron", expression: "0 9 * * *", timeZone: "UTC" },
        }),
      ],
      "thread-1" as ScheduledTask["threadId"] & string as never,
    );
    expect(pending.map((entry) => entry.id)).toEqual(["sooner", "later"]);
  });
});
