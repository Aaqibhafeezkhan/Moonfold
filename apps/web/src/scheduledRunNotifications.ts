import type { ScheduledTask, ScheduledTaskNotifyPolicy } from "@moonfold/contracts";

/** The notify policy of each orchestration run a scheduled task started recently. */
export function scheduledRunNotifyPolicies(
  tasks: ReadonlyArray<Pick<ScheduledTask, "notify" | "recentRunIds">>,
): ReadonlyMap<string, ScheduledTaskNotifyPolicy> {
  const policies = new Map<string, ScheduledTaskNotifyPolicy>();
  for (const task of tasks) {
    for (const runId of task.recentRunIds ?? []) policies.set(runId, task.notify ?? "all");
  }
  return policies;
}

/**
 * Whether a thread notification about a scheduled run passes its task's policy. Runs no task
 * started always notify, and so does anything waiting on the user (input or an approval), since
 * the agent cannot go on without them.
 */
export function scheduledRunAllowsNotification(
  policy: ScheduledTaskNotifyPolicy | undefined,
  kind: "completion" | "input",
  status: string,
): boolean {
  if (policy === undefined || policy === "all") return true;
  if (kind === "input" && (status === "input" || status === "approval")) return true;
  if (policy === "never") return false;
  return kind === "input" && (status === "failed" || status === "limited");
}
