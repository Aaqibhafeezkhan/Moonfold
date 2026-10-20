import { describe, expect, it } from "@effect/vitest";

import {
  DEFAULT_PROVIDER_HANDOFF_SETTINGS,
  handoffAllowsProvider,
  nextHandoffTarget,
} from "./handoff.ts";
import { ProviderInstanceId } from "./providerInstance.ts";

const codex = { instanceId: ProviderInstanceId.make("codex"), model: "gpt-5.6-luna" };
const claude = { instanceId: ProviderInstanceId.make("claudeAgent"), model: "claude-sonnet-5-5" };
const cursor = { instanceId: ProviderInstanceId.make("cursor"), model: "auto" };

describe("handoff targets", () => {
  it("allows every provider until the project lists some", () => {
    expect(handoffAllowsProvider(DEFAULT_PROVIDER_HANDOFF_SETTINGS, cursor.instanceId)).toBe(true);
    expect(
      handoffAllowsProvider({ allowedProviders: [claude.instanceId] }, cursor.instanceId),
    ).toBe(false);
  });

  it("picks the first allowed, available fallback on another provider", () => {
    const settings = {
      fallbackOrder: [codex, cursor, claude],
      allowedProviders: [codex.instanceId, claude.instanceId],
    };
    expect(nextHandoffTarget({ settings, current: codex, isAvailable: () => true })).toEqual(
      claude,
    );
    expect(
      nextHandoffTarget({
        settings,
        current: codex,
        isAvailable: (selection) => selection.instanceId !== claude.instanceId,
      }),
    ).toBeNull();
    expect(
      nextHandoffTarget({
        settings: DEFAULT_PROVIDER_HANDOFF_SETTINGS,
        current: codex,
        isAvailable: () => true,
      }),
    ).toBeNull();
  });
});
