import type { ProviderHookEntry } from "@moonfold/contracts";
import { describe, expect, it } from "vite-plus/test";

import { groupHooksBySource } from "./CodexNativeConfigSections.logic";

const hook = (key: string, source: string): ProviderHookEntry => ({
  key,
  event: "stop",
  handler: "command",
  target: "echo",
  matcher: null,
  source,
  sourcePath: "/x",
  enabled: true,
  trust: "trusted",
  managed: false,
  timeoutSec: 30,
});

describe("groupHooksBySource", () => {
  it("groups hooks under plain headings in source order and keeps unknown sources", () => {
    const groups = groupHooksBySource([
      hook("p", "project"),
      hook("m1", "mdm"),
      hook("u", "user"),
      hook("m2", "cloudManagedConfig"),
      hook("x", "somethingNew"),
    ]);
    expect(groups.map(([label, hooks]) => [label, hooks.map((entry) => entry.key)])).toEqual([
      ["Your Codex configuration", ["u"]],
      ["This project", ["p"]],
      ["Managed by your organization", ["m1", "m2"]],
      ["Other", ["x"]],
    ]);
  });
});
