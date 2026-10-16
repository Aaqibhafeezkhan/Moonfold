import { assert, describe, it } from "@effect/vitest";
import {
  ProviderDriverKind,
  ProviderInstanceId,
  ThreadId,
  type OrchestrationV2DomainEvent,
} from "@moonfold/contracts";
import type { ProviderInstance } from "@moonfold/provider-core/server/driver";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { ProviderDriverError } from "../provider/Errors.ts";
import * as ProviderInstanceRegistry from "../provider/ProviderInstanceRegistry.ts";
import * as Orchestrator from "./Orchestrator.ts";
import * as ProjectionStore from "./ProjectionStore.ts";
import * as ProviderThreadArchiveSync from "./ProviderThreadArchiveSync.ts";

const threadId = ThreadId.make("thread-1");
const codexId = ProviderInstanceId.make("codex");
const otherId = ProviderInstanceId.make("other");

const providerThread = (
  id: string,
  providerInstanceId: ProviderInstanceId,
  nativeId: string | null,
) => ({
  id,
  providerInstanceId,
  nativeThreadRef:
    nativeId === null
      ? null
      : { driver: ProviderDriverKind.make("codex"), nativeId, strength: "strong" },
});

function testLayer(calls: Array<[string, boolean]>, failFor?: string) {
  const codex = {
    instanceId: codexId,
    enabled: true,
    nativeConfig: {
      setThreadArchived: ({
        nativeThreadId,
        archived,
      }: {
        nativeThreadId: string;
        archived: boolean;
      }) => {
        calls.push([nativeThreadId, archived]);
        return nativeThreadId === failFor
          ? Effect.fail(
              new ProviderDriverError({
                driver: ProviderDriverKind.make("codex"),
                instanceId: codexId,
                detail: "Codex is not reachable.",
              }),
            )
          : Effect.void;
      },
    },
  } as unknown as ProviderInstance;
  // An instance without the capability keeps its own copy as it is.
  const other = { instanceId: otherId, enabled: true } as unknown as ProviderInstance;
  return ProviderThreadArchiveSync.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        Layer.mock(Orchestrator.OrchestratorV2)({}),
        Layer.mock(ProjectionStore.ProjectionStoreV2)({
          getThreadRecords: () =>
            Effect.succeed({
              providerThreads: [
                providerThread("pt-1", codexId, "native-1"),
                providerThread("pt-2", codexId, null),
                providerThread("pt-3", otherId, "native-3"),
                providerThread("pt-4", codexId, "native-4"),
              ],
            } as never),
        }),
        Layer.mock(ProviderInstanceRegistry.ProviderInstanceRegistry)({
          getInstance: (instanceId) =>
            Effect.succeed(
              instanceId === codexId ? codex : instanceId === otherId ? other : undefined,
            ),
        }),
      ),
    ),
  );
}

const event = (type: "thread.archived" | "thread.unarchived") =>
  ({ type, threadId }) as unknown as OrchestrationV2DomainEvent;

describe("ProviderThreadArchiveSync", () => {
  it.effect("archives and unarchives every native thread of providers that support it", () => {
    const calls: Array<[string, boolean]> = [];
    return Effect.gen(function* () {
      const sync = yield* ProviderThreadArchiveSync.ProviderThreadArchiveSync;
      yield* sync.handle(event("thread.archived"));
      yield* sync.handle(event("thread.unarchived"));
      assert.deepEqual(calls, [
        ["native-1", true],
        ["native-4", true],
        ["native-1", false],
        ["native-4", false],
      ]);
    }).pipe(Effect.provide(testLayer(calls)));
  });

  it.effect("keeps going when the provider cannot archive one thread", () => {
    const calls: Array<[string, boolean]> = [];
    return Effect.gen(function* () {
      const sync = yield* ProviderThreadArchiveSync.ProviderThreadArchiveSync;
      yield* sync.handle(event("thread.archived"));
      assert.deepEqual(calls, [
        ["native-1", true],
        ["native-4", true],
      ]);
    }).pipe(Effect.provide(testLayer(calls, "native-1")));
  });
});
