import type { ProviderHookEntry } from "@moonfold/contracts";

const HOOK_SOURCE_GROUPS: ReadonlyArray<readonly [string, ReadonlyArray<string>]> = [
  ["Your Codex configuration", ["user"]],
  ["This project", ["project"]],
  ["Plugins", ["plugin"]],
  [
    "Managed by your organization",
    [
      "mdm",
      "cloudRequirements",
      "cloudManagedConfig",
      "legacyManagedConfigFile",
      "legacyManagedConfigMdm",
    ],
  ],
  ["Built into Codex", ["system"]],
  ["This session only", ["sessionFlags"]],
];

/** Hooks in the order Codex applies their sources, each group under a plain heading. */
export function groupHooksBySource(
  hooks: ReadonlyArray<ProviderHookEntry>,
): ReadonlyArray<readonly [string, ReadonlyArray<ProviderHookEntry>]> {
  const known = new Set(HOOK_SOURCE_GROUPS.flatMap(([, sources]) => sources));
  const groups = HOOK_SOURCE_GROUPS.map(
    ([label, sources]) => [label, hooks.filter((hook) => sources.includes(hook.source))] as const,
  );
  const other = hooks.filter((hook) => !known.has(hook.source));
  return [...groups, ["Other", other] as const].filter(([, entries]) => entries.length > 0);
}
