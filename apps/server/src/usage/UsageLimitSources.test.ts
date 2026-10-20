import { expect, it } from "@effect/vitest";
import { UsageLimitSourceId } from "@moonfold/contracts";
import * as Effect from "effect/Effect";

import * as UsageLimitSources from "./UsageLimitSources.ts";

it.effect("never reads a usage hub, and refuses redemption through one", () =>
  Effect.gen(function* () {
    const sources = yield* UsageLimitSources.make;
    yield* sources.refresh;
    expect(yield* sources.current).toEqual([]);
    const error = yield* Effect.flip(
      sources.consumeResetCredit({
        sourceId: UsageLimitSourceId.make("hub"),
        accountId: "account",
        creditId: "credit",
      }),
    );
    expect(error.detail).toContain("pool provider logins");
  }),
);
