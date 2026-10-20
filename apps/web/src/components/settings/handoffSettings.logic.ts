import type { ModelSelection } from "@moonfold/contracts";

/** The fallback order with the entry at `index` moved one place up (-1) or down (1). */
export function moveFallback(
  order: ReadonlyArray<ModelSelection>,
  index: number,
  direction: -1 | 1,
): ReadonlyArray<ModelSelection> {
  const destination = index + direction;
  if (index < 0 || index >= order.length || destination < 0 || destination >= order.length) {
    return order;
  }
  const next = [...order];
  [next[index], next[destination]] = [next[destination]!, next[index]!];
  return next;
}

export function handoffWarnLabel(percent: number | null): string {
  return percent === null ? "Off" : `At ${percent}% used`;
}

/** The model a picker shows for an instance before one is chosen: its default, else the first current one. */
export function defaultModelSlug(
  options:
    | ReadonlyArray<{
        slug: string;
        isDefault?: boolean | undefined;
        isLegacy?: boolean | undefined;
        isUnavailable?: boolean | undefined;
      }>
    | undefined,
): string | null {
  const available = (options ?? []).filter((option) => option.isUnavailable !== true);
  return (
    available.find((option) => option.isDefault === true)?.slug ??
    available.find((option) => option.isLegacy !== true)?.slug ??
    null
  );
}
