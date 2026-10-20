/**
 * UsageLimitSources — quota sources outside this environment's provider CLIs.
 *
 * Upstream read CLIProxyAPI hubs here: proxies that pool several people's or accounts'
 * subscription logins and route traffic across them. Moonfold never proxies or pools provider
 * logins (CLAUDE.md rule 7), so no source kind is supported: the service reports no sources,
 * makes no network request, and refuses reset-credit redemption. Settings saved by an older
 * build still decode, and the client lists them only so their keys can be removed.
 *
 * @module usage/UsageLimitSources
 */
import {
  type ProviderConsumeResetCreditResult,
  UsageLimitSourceError,
  type UsageLimitSourceConsumeResetCreditInput,
  type UsageLimitSourceSnapshot,
} from "@moonfold/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";

export class UsageLimitSources extends Context.Service<
  UsageLimitSources,
  {
    readonly current: Effect.Effect<ReadonlyArray<UsageLimitSourceSnapshot>>;
    /** The current set followed by every change, with repeats dropped. */
    readonly streamChanges: Stream.Stream<ReadonlyArray<UsageLimitSourceSnapshot>>;
    /** Re-read every source now. Never fails; failures land on the snapshot. */
    readonly refresh: Effect.Effect<void>;
    readonly consumeResetCredit: (
      input: UsageLimitSourceConsumeResetCreditInput,
    ) => Effect.Effect<ProviderConsumeResetCreditResult, UsageLimitSourceError>;
  }
>()("moonfold/usage/UsageLimitSources") {}

const NO_SOURCES: ReadonlyArray<UsageLimitSourceSnapshot> = [];

/** @public Service construction is part of the canonical Effect module API. */
export const make = Effect.succeed(
  UsageLimitSources.of({
    current: Effect.succeed(NO_SOURCES),
    streamChanges: Stream.make(NO_SOURCES),
    refresh: Effect.void,
    consumeResetCredit: () =>
      Effect.fail(
        new UsageLimitSourceError({
          detail:
            "Usage hubs are not supported: they pool provider logins, which Moonfold never does.",
        }),
      ),
  }),
);

export const layer = Layer.effect(UsageLimitSources, make);
