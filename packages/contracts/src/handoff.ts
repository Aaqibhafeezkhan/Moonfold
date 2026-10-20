/**
 * Provider handoff: moving a thread to another provider, with a brief built from its history,
 * when the current one reaches its usage limit or the user asks. The user previews what is sent
 * and chooses which providers may receive a project's threads.
 */
import * as Schema from "effect/Schema";

import { ThreadId } from "./baseSchemas.ts";
import { ModelSelection } from "./modelSelection.ts";
import { ProviderInstanceId } from "./providerInstance.ts";

/** Ask before moving a limited thread, or move it to the first fallback without asking. */
export const ProviderHandoffMode = Schema.Literals(["ask", "auto"]);
export type ProviderHandoffMode = typeof ProviderHandoffMode.Type;

export const MIN_HANDOFF_WARN_PERCENT = 50;
export const MAX_HANDOFF_WARN_PERCENT = 99;
export const HandoffWarnPercent = Schema.Int.check(
  Schema.isBetween({ minimum: MIN_HANDOFF_WARN_PERCENT, maximum: MAX_HANDOFF_WARN_PERCENT }),
);

export const ProviderHandoffSettings = Schema.Struct({
  mode: ProviderHandoffMode,
  /** Where a limited thread continues, in order; the first allowed, enabled one is offered. */
  fallbackOrder: Schema.Array(ModelSelection),
  /** Providers that may receive a thread's context; null allows every enabled provider. */
  allowedProviders: Schema.NullOr(Schema.Array(ProviderInstanceId)),
  /** Offer a handoff once a provider reports this share of a usage window used; null is off. */
  warnAtUsagePercent: Schema.NullOr(HandoffWarnPercent),
});
export type ProviderHandoffSettings = typeof ProviderHandoffSettings.Type;

export const DEFAULT_PROVIDER_HANDOFF_SETTINGS: ProviderHandoffSettings = {
  mode: "ask",
  fallbackOrder: [],
  allowedProviders: null,
  warnAtUsagePercent: null,
};

/** Whether `instanceId` may receive context under these settings. */
export function handoffAllowsProvider(
  settings: Pick<ProviderHandoffSettings, "allowedProviders">,
  instanceId: ProviderInstanceId,
): boolean {
  return settings.allowedProviders === null || settings.allowedProviders.includes(instanceId);
}

/** Why a thread moved: its provider hit a limit, the fallback order moved it, or the user did. */
export const HandoffReason = Schema.Literals(["usage_limit", "automatic", "manual"]);
export type HandoffReason = typeof HandoffReason.Type;

export const HandoffRedaction = Schema.Struct({
  kind: Schema.String,
  count: Schema.Int,
});
export type HandoffRedaction = typeof HandoffRedaction.Type;

export const HandoffPreviewInput = Schema.Struct({
  threadId: ThreadId,
  target: ModelSelection,
  reason: HandoffReason,
});
export type HandoffPreviewInput = typeof HandoffPreviewInput.Type;

export const HandoffPreview = Schema.Struct({
  /** The selection the thread moves from. */
  from: ModelSelection,
  /** The brief exactly as it would be sent now, with secrets already redacted. */
  brief: Schema.String,
  redactions: Schema.Array(HandoffRedaction),
  /** Earlier messages that follow the brief, within the target model's budget. */
  historyMessages: Schema.Int,
  /** Null when the handoff can go ahead; otherwise why it cannot. */
  blockedReason: Schema.NullOr(Schema.String),
});
export type HandoffPreview = typeof HandoffPreview.Type;

/** The brief a handoff sent, kept on its record; read on demand, never streamed. */
export const HandoffSentBrief = Schema.Struct({
  text: Schema.String,
  redactions: Schema.Array(HandoffRedaction),
});
export type HandoffSentBrief = typeof HandoffSentBrief.Type;

export const HandoffBriefInput = Schema.Struct({
  threadId: ThreadId,
  contextHandoffId: Schema.String,
});
export type HandoffBriefInput = typeof HandoffBriefInput.Type;

export const HandoffBriefResult = Schema.NullOr(HandoffSentBrief);
export type HandoffBriefResult = typeof HandoffBriefResult.Type;

export const HandoffStartInput = HandoffPreviewInput;
export type HandoffStartInput = typeof HandoffStartInput.Type;

export class HandoffError extends Schema.TaggedError<HandoffError>()("HandoffError", {
  message: Schema.String,
}) {}

/**
 * The first selection in the fallback order a thread on `current` can move to: allowed, on
 * another provider instance, and available (enabled and not itself at its limit), as the
 * caller judges.
 */
export function nextHandoffTarget(input: {
  readonly settings: Pick<ProviderHandoffSettings, "fallbackOrder" | "allowedProviders">;
  readonly current: ModelSelection;
  readonly isAvailable: (selection: ModelSelection) => boolean;
}): ModelSelection | null {
  return (
    input.settings.fallbackOrder.find(
      (selection) =>
        selection.instanceId !== input.current.instanceId &&
        handoffAllowsProvider(input.settings, selection.instanceId) &&
        input.isAvailable(selection),
    ) ?? null
  );
}
