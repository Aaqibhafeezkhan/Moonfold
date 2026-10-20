import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import { assert, it } from "@effect/vitest";
import { MemoryText, ProjectId, ThreadId } from "@moonfold/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as MemoryStore from "./MemoryStore.ts";

const layer = MemoryStore.layer.pipe(
  Layer.provideMerge(Layer.mergeAll(SqlitePersistence.layerMemory, NodeCrypto.layer)),
);
const text = Schema.decodeSync(MemoryText);
const projectA = ProjectId.make("project-a");
const projectB = ProjectId.make("project-b");
const thread = ThreadId.make("thread-1");

it.effect("delivers memories for every project and the thread's own project", () =>
  Effect.gen(function* () {
    const store = yield* MemoryStore.MemoryStore;
    assert.deepStrictEqual(yield* store.list, { enabled: true, memories: [] });
    assert.strictEqual(yield* store.forTurn({ threadId: thread, projectId: projectA }), undefined);

    yield* store.upsert({ text: text("Answer in British English."), projectId: null });
    yield* store.upsert({ text: text("Run pnpm, not npm."), projectId: projectA });
    yield* store.upsert({ text: text("Deploys go through staging."), projectId: projectB });
    yield* store.remember({
      text: text("The user's name is Sam."),
      projectId: null,
      threadId: thread,
    });

    assert.deepStrictEqual(yield* store.forTurn({ threadId: thread, projectId: projectA }), {
      user: ["Answer in British English.", "Run pnpm, not npm."],
      agent: ["The user's name is Sam."],
    });
  }).pipe(Effect.provide(layer)),
);

it.effect("an edited agent memory becomes the user's own", () =>
  Effect.gen(function* () {
    const store = yield* MemoryStore.MemoryStore;
    const saved = yield* store.remember({
      text: text("Prefers tabs."),
      projectId: projectA,
      threadId: thread,
    });
    assert.strictEqual(saved.source, "agent");
    assert.strictEqual(saved.threadId, thread);

    const edited = yield* store.upsert({
      id: saved.id,
      text: text("Prefers two-space indents."),
      projectId: projectA,
    });
    assert.strictEqual(edited.source, "user");
    assert.strictEqual(edited.text, "Prefers two-space indents.");

    yield* store.remove(saved.id);
    assert.deepStrictEqual((yield* store.list).memories, []);
  }).pipe(Effect.provide(layer)),
);

it.effect("turning memories off stops delivery and saving, and on again restores both", () =>
  Effect.gen(function* () {
    const store = yield* MemoryStore.MemoryStore;
    yield* store.upsert({ text: text("Keep replies short."), projectId: null });

    yield* store.setEnabled(false);
    assert.strictEqual((yield* store.list).enabled, false);
    assert.strictEqual(yield* store.forTurn({ threadId: thread, projectId: projectA }), undefined);
    const refused = yield* store
      .remember({ text: text("Likes dark mode."), projectId: null, threadId: thread })
      .pipe(Effect.flip);
    assert.include(refused.message, "turned off");

    yield* store.setEnabled(true);
    assert.deepStrictEqual(yield* store.forTurn({ threadId: thread, projectId: projectA }), {
      user: ["Keep replies short."],
      agent: [],
    });
  }).pipe(Effect.provide(layer)),
);

it.effect("a thread can opt out of memories and back in", () =>
  Effect.gen(function* () {
    const store = yield* MemoryStore.MemoryStore;
    yield* store.upsert({ text: text("Keep replies short."), projectId: null });

    assert.deepStrictEqual(yield* store.setThreadOptOut({ threadId: thread, optedOut: true }), {
      threadId: thread,
      optedOut: true,
    });
    assert.strictEqual((yield* store.threadStatus(thread)).optedOut, true);
    assert.strictEqual(yield* store.forTurn({ threadId: thread, projectId: projectA }), undefined);
    const refused = yield* store
      .remember({ text: text("Likes dark mode."), projectId: null, threadId: thread })
      .pipe(Effect.flip);
    assert.include(refused.message, "this thread");

    // Other threads keep receiving memories.
    const other = ThreadId.make("thread-2");
    assert.notStrictEqual(
      yield* store.forTurn({ threadId: other, projectId: projectA }),
      undefined,
    );

    yield* store.setThreadOptOut({ threadId: thread, optedOut: false });
    assert.strictEqual((yield* store.threadStatus(thread)).optedOut, false);
    assert.notStrictEqual(
      yield* store.forTurn({ threadId: thread, projectId: projectA }),
      undefined,
    );
  }).pipe(Effect.provide(layer)),
);
