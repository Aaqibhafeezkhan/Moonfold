import { assert, it } from "@effect/vitest";
import type { Command } from "effect/cli";

import { cli } from "./binCli.ts";

type Requirements<C> =
  C extends Command.Command<infer _Name, infer _Input, infer _Context, infer _Error, infer R>
    ? R
    : never;
type HasAny<T> = 0 extends 1 & T ? true : false;

// Compile-time guard: if the CLI's requirements widen to `any`, a missing service would only
// surface at startup. The assignment below stops compiling when that happens.
const cliRequirementsAreTyped: HasAny<Requirements<typeof cli>> = false;

it("keeps the CLI's service requirements fully typed", () => {
  assert.isFalse(cliRequirementsAreTyped);
});
