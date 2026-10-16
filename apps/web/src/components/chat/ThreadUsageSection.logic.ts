import type { ThreadTokenUsageGroup } from "@moonfold/client-runtime/state/thread-execution";
import { formatModelSlugName } from "@moonfold/shared/model";

import { formatContextWindowTokens } from "~/lib/contextWindow";

/** One row of a thread's usage breakdown: what ran, how much, and how much came from cache. */
export function presentThreadUsageGroup(group: ThreadTokenUsageGroup): {
  readonly label: string;
  readonly total: string;
  readonly detail: string;
} {
  const label = [formatModelSlugName(group.model), group.effort, group.speed]
    .filter((part) => part !== null)
    .join(" · ");
  const cachedShare =
    group.inputTokens > 0 ? Math.round((group.cachedInputTokens / group.inputTokens) * 100) : 0;
  const detail = [
    `${formatContextWindowTokens(group.inputTokens)} in (${cachedShare}% cached)`,
    `${formatContextWindowTokens(group.outputTokens)} out`,
    `${group.turns} ${group.turns === 1 ? "turn" : "turns"}`,
  ].join(" · ");
  return {
    label,
    total: `${group.partial ? "≥ " : ""}${formatContextWindowTokens(group.inputTokens + group.outputTokens)}`,
    detail,
  };
}
