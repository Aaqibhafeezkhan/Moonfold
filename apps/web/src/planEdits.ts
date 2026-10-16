import type { ScopedThreadRef } from "@moonfold/contracts";
import * as Schema from "effect/Schema";

import { getLocalStorageItem, useLocalStorage } from "./hooks/useLocalStorage";

/**
 * The user's own edit of a proposed plan, kept on this device until they implement it. The
 * agent's plan stays as it proposed it; implementing sends the edited text instead.
 */
const PlanEdit = Schema.NullOr(Schema.String);

export function planEditStorageKey(threadRef: ScopedThreadRef, planId: string): string {
  return `moonfold:plan-edit:${threadRef.environmentId}:${threadRef.threadId}:${planId}`;
}

/** The edited markdown, or null when the plan is unedited. */
export function usePlanEdit(
  threadRef: ScopedThreadRef | undefined,
  planId: string,
): readonly [string | null, (next: string | null) => void] {
  const [edit, setEdit] = useLocalStorage(
    threadRef === undefined ? "" : planEditStorageKey(threadRef, planId),
    null,
    PlanEdit,
  );
  return [threadRef === undefined ? null : edit, setEdit] as const;
}

/** The markdown to implement: the user's edit when there is one, else the agent's plan. */
export function readPlanMarkdownForImplementation(
  threadRef: ScopedThreadRef,
  plan: { readonly id: string; readonly planMarkdown: string },
): string {
  try {
    return (
      getLocalStorageItem(planEditStorageKey(threadRef, plan.id), PlanEdit) ?? plan.planMarkdown
    );
  } catch {
    return plan.planMarkdown;
  }
}
