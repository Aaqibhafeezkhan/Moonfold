import type { ThreadTokenUsageGroup } from "@moonfold/client-runtime/state/thread-execution";

import { ThreadDetailsSection } from "./ThreadDetailsSection";
import { presentThreadUsageGroup } from "./ThreadUsageSection.logic";

/** The thread's own token use for each model, effort and speed it ran with. */
export function ThreadUsageSection(props: {
  readonly usage: ReadonlyArray<ThreadTokenUsageGroup>;
}) {
  if (props.usage.length === 0) return null;
  return (
    <ThreadDetailsSection headingId="thread-details-usage-heading" title="Usage">
      <ul className="flex flex-col gap-2 px-1.5">
        {props.usage.map((group) => {
          const row = presentThreadUsageGroup(group);
          return (
            <li key={row.label} className="flex flex-col text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate">{row.label}</span>
                <span className="font-medium tabular-nums">{row.total}</span>
              </div>
              <span className="text-2xs text-muted-foreground tabular-nums">{row.detail}</span>
            </li>
          );
        })}
      </ul>
    </ThreadDetailsSection>
  );
}
