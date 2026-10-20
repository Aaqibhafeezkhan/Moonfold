import {
  EnvironmentId,
  ProjectId,
  ScheduledTaskId,
  ThreadId,
  type ScheduledTask,
  type ScheduledTaskNotifyPolicy,
  type ScheduledTaskUpsertSchedule,
  type ModelSelection,
  type RuntimeMode,
  type ProviderInteractionMode,
  type ServerSettings,
} from "@moonfold/contracts";
import { parseMaxDeliveryAge } from "@moonfold/client-runtime/scheduled-task-webhook";
import { cronError, isValidTimeZone } from "@moonfold/shared/cron";
import * as DateTime from "effect/DateTime";
import * as Option from "effect/Option";

import {
  resolveProjectSettings,
  type LegacyProjectSettingsFields,
} from "@moonfold/shared/projectSettings";
import type { ProviderInstanceEntry } from "../../providerInstances";

import type { ResolvedSettingsScope } from "./settingsScope";

/** Project IDs belong to an environment, including when a grouped project spans machines. */
export function matchesScheduledTaskScope(
  scope: ResolvedSettingsScope,
  environmentId: EnvironmentId,
  projectId: ProjectId,
): boolean {
  if (scope.kind === "unavailable" || !scope.environmentIds.includes(environmentId)) return false;
  if (scope.kind === "project" || scope.kind === "checkout") {
    return scope.members.some(
      (member) => member.environmentId === environmentId && member.id === projectId,
    );
  }
  return true;
}

export function validateScheduledTasksSearch(raw: Record<string, unknown>) {
  return {
    ...(typeof raw.environmentId === "string" && raw.environmentId.trim()
      ? { environmentId: EnvironmentId.make(raw.environmentId) }
      : {}),
    ...(typeof raw.taskId === "string" && raw.taskId.trim()
      ? { taskId: ScheduledTaskId.make(raw.taskId) }
      : {}),
    // Opens a new task that continues this thread on each run.
    ...(typeof raw.threadId === "string" && raw.threadId.trim()
      ? { threadId: ThreadId.make(raw.threadId) }
      : {}),
    ...(typeof raw.projectId === "string" && raw.projectId.trim()
      ? { projectId: ProjectId.make(raw.projectId) }
      : {}),
  };
}

export type ScheduleMode = "fixed" | "once" | "cron" | "interval" | "webhook";
export type WorkspaceMode = "root" | "worktree" | "existing_worktree";

export interface DraftState {
  readonly editingId: string | null;
  readonly title: string;
  readonly prompt: string;
  readonly enabled: boolean;
  readonly scheduleMode: ScheduleMode;
  readonly intervalMinutes: string;
  readonly timeOfDay: string;
  readonly weekdays: ReadonlySet<number>;
  /** One-off run as a local "YYYY-MM-DDTHH:MM" in `timeZone`. */
  readonly onceAt: string;
  readonly cronExpression: string;
  /** Optional last day ("YYYY-MM-DD") a cron task may run, in `timeZone`. */
  readonly cronUntil: string;
  /** IANA zone for one-off and cron schedules. */
  readonly timeZone: string;
  /** When runs notify: every run, failures only, or never. */
  readonly notify: ScheduledTaskNotifyPolicy;
  readonly projectId: string;
  readonly threadId: string;
  readonly workspaceMode: WorkspaceMode;
  readonly baseRef: string;
  readonly startFromOrigin: boolean;
  readonly existingWorktreePath: string;
  readonly modelKey: string;
  /** Not editable in the dialog, but preserved so editing an agent-created task keeps its modes. */
  readonly runtimeMode: RuntimeMode;
  readonly interactionMode: ProviderInteractionMode;
  /**
   * The task's original model selection. The picker only edits
   * `instanceId:model`; keeping the source object preserves provider options
   * (reasoning, temperature, …) when the model itself is left unchanged.
   */
  readonly baseModelSelection: ModelSelection | null;
  readonly signatureEnabled: boolean;
  readonly signatureHeader: string;
  readonly signatureEncoding: "hex" | "base64";
  readonly signaturePrefix: string;
  /** Write-only: empty keeps the secret already stored on the server. */
  readonly signatureSecret: string;
  /** Minutes as typed; empty runs every held request regardless of age. */
  readonly maxDeliveryAgeMinutes: string;
}

/** GitHub's signature settings, the most common sender. */
export const WEBHOOK_SIGNATURE_DEFAULTS = {
  signatureHeader: "x-hub-signature-256",
  signatureEncoding: "hex",
  signaturePrefix: "sha256=",
} as const;

/** Null when the draft's webhook age limit is invalid; the caller reports it and does not save. */
export function scheduleFromDraft(draft: DraftState): ScheduledTaskUpsertSchedule | null {
  if (draft.scheduleMode === "webhook") {
    const maxDeliveryAgeMinutes = parseMaxDeliveryAge(draft.maxDeliveryAgeMinutes);
    if (maxDeliveryAgeMinutes === undefined) return null;
    const secret = draft.signatureSecret.trim();
    return {
      type: "webhook",
      signature: draft.signatureEnabled
        ? {
            header: draft.signatureHeader.trim(),
            encoding: draft.signatureEncoding,
            prefix: draft.signaturePrefix,
            ...(secret ? { secret } : {}),
          }
        : null,
      maxDeliveryAgeMinutes,
    };
  }
  if (draft.scheduleMode === "interval") {
    const everyMs = Math.round(Number(draft.intervalMinutes) * 60_000);
    return { type: "interval", everyMs };
  }
  const timeZone = draft.timeZone.trim();
  if (draft.scheduleMode === "once") {
    return { type: "once", at: draft.onceAt, timeZone };
  }
  if (draft.scheduleMode === "cron") {
    return {
      type: "cron",
      expression: draft.cronExpression.trim().split(/\s+/).join(" "),
      timeZone,
      until: draft.cronUntil ? endOfLocalDay(draft.cronUntil, timeZone) : null,
    };
  }
  const selectedEveryDay = draft.weekdays.size === 0 || draft.weekdays.size === 7;
  return {
    type: "fixed_time",
    timeOfDay: draft.timeOfDay || "09:00",
    ...(selectedEveryDay ? {} : { weekdays: [...draft.weekdays].toSorted() }),
  };
}

export function taskToDraft(task: ScheduledTask): DraftState {
  const schedule = task.schedule;
  const weekdays =
    schedule.type === "fixed_time" && schedule.weekdays && schedule.weekdays.length > 0
      ? new Set(schedule.weekdays)
      : new Set([0, 1, 2, 3, 4, 5, 6]);
  return {
    editingId: task.id,
    title: task.title,
    prompt: task.prompt,
    enabled: task.enabled,
    scheduleMode: schedule.type === "fixed_time" ? "fixed" : schedule.type,
    intervalMinutes:
      schedule.type === "interval" ? String(Math.max(1, schedule.everyMs / 60_000)) : "15",
    timeOfDay: schedule.type === "fixed_time" ? schedule.timeOfDay : "09:00",
    weekdays,
    onceAt: schedule.type === "once" ? schedule.at : defaultOnceAt(),
    cronExpression: schedule.type === "cron" ? schedule.expression : "0 9 * * 1-5",
    cronUntil:
      schedule.type === "cron" && schedule.until != null
        ? localDate(schedule.until, schedule.timeZone)
        : "",
    timeZone:
      schedule.type === "once" || schedule.type === "cron" ? schedule.timeZone : browserTimeZone(),
    notify: task.notify ?? "all",
    projectId: task.projectId,
    threadId: task.threadId ?? "",
    workspaceMode: task.workspaceStrategy.type,
    baseRef: task.workspaceStrategy.type === "worktree" ? task.workspaceStrategy.baseRef : "main",
    startFromOrigin:
      task.workspaceStrategy.type === "worktree"
        ? (task.workspaceStrategy.startFromOrigin ?? false)
        : true,
    existingWorktreePath:
      task.workspaceStrategy.type === "existing_worktree"
        ? task.workspaceStrategy.worktreePath
        : "",
    modelKey: `${task.modelSelection.instanceId}:${task.modelSelection.model}`,
    runtimeMode: task.runtimeMode,
    interactionMode: task.interactionMode,
    baseModelSelection: task.modelSelection,
    ...(schedule.type === "webhook" && schedule.signature !== null
      ? {
          signatureEnabled: true,
          signatureHeader: schedule.signature.header,
          signatureEncoding: schedule.signature.encoding,
          signaturePrefix: schedule.signature.prefix,
        }
      : { signatureEnabled: false, ...WEBHOOK_SIGNATURE_DEFAULTS }),
    signatureSecret: "",
    maxDeliveryAgeMinutes:
      schedule.type === "webhook" && schedule.maxDeliveryAgeMinutes != null
        ? String(schedule.maxDeliveryAgeMinutes)
        : "",
  };
}

/** The viewer's own time zone, the default for new one-off and cron tasks. */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/** One hour from now, rounded to the minute, as a local "YYYY-MM-DDTHH:MM". */
export function defaultOnceAt(now: Date = new Date()): string {
  const at = new Date(now.getTime() + 60 * 60_000);
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

/** The last instant of a local date in a time zone, as an ISO string. */
function endOfLocalDay(date: string, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const zone = DateTime.zoneMakeNamed(timeZone);
  if (match === null || Option.isNone(zone)) return null;
  const end = DateTime.setParts(DateTime.setZone(DateTime.makeUnsafe(0), zone.value), {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: 23,
    minute: 59,
    second: 59,
    millisecond: 0,
  });
  return DateTime.formatIso(end);
}

/** The local "YYYY-MM-DD" date of an instant in a time zone. */
function localDate(iso: string, timeZone: string): string {
  const zone = DateTime.zoneMakeNamed(timeZone);
  const instant = DateTime.makeUnsafe(iso);
  const parts = DateTime.toParts(
    Option.isSome(zone) ? DateTime.setZone(instant, zone.value) : instant,
  );
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

/**
 * Starts a task that keeps a thread's pull request healthy: bound to the PR's thread, it checks
 * each hour and fixes failing checks or open review comments in that thread's worktree.
 */
export function applyPullRequestFixTemplate(draft: DraftState): DraftState {
  return {
    ...draft,
    title: draft.title.trim() ? draft.title : "Keep the pull request green",
    prompt: [
      "Check the pull request for this thread.",
      "If checks are failing or review comments are unresolved, fix them in this thread's worktree, commit, and push.",
      "If everything passes and nothing is open, reply that the pull request is green and change nothing.",
      "Never touch the project's main checkout and never create scheduled tasks.",
    ].join(" "),
    scheduleMode: "cron",
    cronExpression: "0 * * * *",
    notify: "failures",
  };
}

/** Appends a `$skill` mention, the form providers read as a request to use that skill. */
export function appendSkillMention(prompt: string, skillName: string): string {
  const mention = `$${skillName}`;
  if (prompt.includes(mention)) return prompt;
  const trimmed = prompt.replace(/\s+$/, "");
  return trimmed ? `${trimmed} ${mention} ` : `${mention} `;
}

/** Ready-made cron schedules the form offers before the custom expression. */
export const CRON_PRESETS: ReadonlyArray<{ readonly label: string; readonly expression: string }> =
  [
    { label: "Every hour", expression: "0 * * * *" },
    { label: "Every day at 09:00", expression: "0 9 * * *" },
    { label: "Weekdays at 09:00", expression: "0 9 * * 1-5" },
    { label: "Mondays at 09:00", expression: "0 9 * * 1" },
    { label: "First of the month at 09:00", expression: "0 9 1 * *" },
  ];

/** Use configured defaults before the catalog's advertised default model. */
export function scheduledTaskDefaultModel(
  settings: ServerSettings,
  project: (LegacyProjectSettingsFields & { readonly id: ProjectId }) | null,
  entries: readonly ProviderInstanceEntry[],
): ModelSelection | null {
  const available = entries.filter(
    (entry) =>
      entry.enabled &&
      entry.installed &&
      entry.isAvailable &&
      entry.snapshot.auth.status !== "unauthenticated",
  );
  const configured = resolveProjectSettings(settings, project?.id ?? null, project).settings
    .defaultModelSelection;
  for (const selection of [configured, settings.defaultModelSelection]) {
    if (
      selection &&
      available.some(
        (entry) =>
          entry.instanceId === selection.instanceId &&
          entry.models.find((model) => model.slug === selection.model)?.isLegacy !== true,
      )
    )
      return selection;
  }
  const models = available.flatMap((entry) =>
    entry.models
      .filter((model) => !model.isLegacy)
      .map((model) => ({ instanceId: entry.instanceId, model })),
  );
  const fallback = models.find(({ model }) => model.isDefault) ?? models[0];
  return fallback ? { instanceId: fallback.instanceId, model: fallback.model.slug } : null;
}

/** The instant a local "YYYY-MM-DDTHH:MM" names in a time zone, in epoch milliseconds. */
function localInstantMillis(at: string, timeZone: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(at);
  const zone = DateTime.zoneMakeNamed(timeZone);
  if (match === null || Option.isNone(zone)) return null;
  return DateTime.toEpochMillis(
    DateTime.setParts(DateTime.setZone(DateTime.makeUnsafe(0), zone.value), {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: Number(match[4]),
      minute: Number(match[5]),
      second: 0,
      millisecond: 0,
    }),
  );
}

/**
 * Why a one-off or repeating draft cannot be saved, or null when it can. A one-off whose time is
 * unchanged from the saved task may lie in the past (it already ran), so other edits still save.
 */
export function calendarScheduleProblem(
  draft: DraftState,
  now: Date = new Date(),
  saved: ScheduledTask["schedule"] | null = null,
): string | null {
  if (draft.scheduleMode !== "once" && draft.scheduleMode !== "cron") return null;
  const timeZone = draft.timeZone.trim();
  if (!isValidTimeZone(timeZone)) return `Unknown time zone "${timeZone}".`;
  if (draft.scheduleMode === "once") {
    const at = localInstantMillis(draft.onceAt, timeZone);
    if (at === null) return "Pick a date and time to run.";
    const unchanged =
      saved?.type === "once" && saved.at === draft.onceAt && saved.timeZone === timeZone;
    return at <= now.getTime() && !unchanged ? "Pick a time in the future." : null;
  }
  const expressionProblem = cronError(draft.cronExpression);
  if (expressionProblem !== null) return expressionProblem;
  if (draft.cronUntil && endOfLocalDay(draft.cronUntil, timeZone) === null) {
    return "Pick a valid last day, or leave it blank.";
  }
  return null;
}
