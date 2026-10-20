import { RunId } from "@moonfold/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  scheduledRunAllowsNotification,
  scheduledRunNotifyPolicies,
} from "./scheduledRunNotifications";

describe("scheduled run notifications", () => {
  it("maps each recent run to its task's policy, defaulting to every run", () => {
    const policies = scheduledRunNotifyPolicies([
      { notify: "failures", recentRunIds: [RunId.make("run-a"), RunId.make("run-b")] },
      { recentRunIds: [RunId.make("run-c")] },
      { notify: "never" },
    ]);
    expect([...policies]).toEqual([
      ["run-a", "failures"],
      ["run-b", "failures"],
      ["run-c", "all"],
    ]);
  });

  it("keeps completions and failures to the policy but always asks for input", () => {
    expect(scheduledRunAllowsNotification(undefined, "completion", "ready")).toBe(true);
    expect(scheduledRunAllowsNotification("all", "completion", "ready")).toBe(true);
    expect(scheduledRunAllowsNotification("failures", "completion", "ready")).toBe(false);
    expect(scheduledRunAllowsNotification("failures", "input", "failed")).toBe(true);
    expect(scheduledRunAllowsNotification("failures", "input", "limited")).toBe(true);
    expect(scheduledRunAllowsNotification("never", "input", "failed")).toBe(false);
    expect(scheduledRunAllowsNotification("never", "input", "approval")).toBe(true);
    expect(scheduledRunAllowsNotification("never", "input", "input")).toBe(true);
  });
});
