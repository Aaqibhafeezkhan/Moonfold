import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import { assert, describe, it } from "@effect/vitest";
import { ThreadId } from "@moonfold/contracts";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";

import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as ComputerUseHelper from "./ComputerUseHelper.ts";
import * as ComputerUseService from "./ComputerUseService.ts";

const WINDOWS = [
  {
    window: "1",
    title: "Untitled - Notepad",
    app: "notepad.exe",
    pid: 10,
    width: 800,
    height: 600,
    minimized: false,
  },
  {
    window: "2",
    title: "Moonfold (Dev) - Google Chrome",
    app: "chrome.exe",
    pid: 11,
    width: 800,
    height: 600,
    minimized: false,
  },
  {
    window: "3",
    title: "User Account Control",
    app: "consent.exe",
    pid: 12,
    width: 400,
    height: 300,
    minimized: false,
  },
];

function makeHarness() {
  const calls: Array<{ op: string; args: Readonly<Record<string, unknown>> }> = [];
  let stops = 0;
  const helper = Layer.succeed(ComputerUseHelper.ComputerUseHelper, {
    supported: true,
    request: (op, args = {}) =>
      Effect.sync(() => {
        calls.push({ op, args });
        return op === "listWindows" ? { windows: WINDOWS } : {};
      }),
    stop: Effect.sync(() => {
      stops += 1;
    }),
    resume: Effect.void,
  });
  const layer = ComputerUseService.layer.pipe(
    Layer.provideMerge(Layer.mergeAll(helper, SqlitePersistence.layerMemory, NodeCrypto.layer)),
  );
  return { calls, stops: () => stops, layer };
}

const thread = ThreadId.make("thread-1");

const nextRequest = (computer: ComputerUseService.ComputerUseService["Service"]) =>
  computer.pending.pipe(
    Stream.filter((pending) => pending.requests.length > 0),
    Stream.runHead,
    Effect.map((pending) => Option.getOrThrow(pending).requests[0]!),
  );

describe("isBlockedWindow", () => {
  it("keeps Moonfold and Windows security screens out of reach", () => {
    assert.isTrue(ComputerUseService.isBlockedWindow("moonfold.exe", "Moonfold"));
    assert.isTrue(
      ComputerUseService.isBlockedWindow("chrome.exe", "Moonfold (Dev) - Google Chrome"),
    );
    assert.isTrue(ComputerUseService.isBlockedWindow("consent.exe", "User Account Control"));
    // The shell, system tools and password managers would hand over far more than one app.
    for (const app of [
      "explorer.exe",
      "applicationframehost.exe",
      "systemsettings.exe",
      "keepassxc.exe",
    ]) {
      assert.isTrue(ComputerUseService.isBlockedWindow(app, "Window"));
    }
    assert.isTrue(ComputerUseService.isBlockedWindow("electron.exe", "DevTools - localhost:5733/"));
    assert.isFalse(ComputerUseService.isBlockedWindow("notepad.exe", "Untitled - Notepad"));
  });
});

it.effect("does nothing until the user turns computer use on", () => {
  const harness = makeHarness();
  return Effect.gen(function* () {
    const computer = yield* ComputerUseService.ComputerUseService;
    assert.strictEqual((yield* computer.state).enabled, false);
    const refused = yield* computer.listApps(thread).pipe(Effect.flip);
    assert.include(refused.message, "turned off");
    assert.deepStrictEqual(harness.calls, []);
  }).pipe(Effect.provide(harness.layer));
});

it.effect("lists reachable windows only and asks before the first use of an app", () => {
  const harness = makeHarness();
  return Effect.gen(function* () {
    const computer = yield* ComputerUseService.ComputerUseService;
    yield* computer.setEnabled(true);
    const apps = yield* computer.listApps(thread);
    // Unapproved windows show their app, never their title.
    assert.deepStrictEqual(
      apps.map((app) => [app.app, app.title, app.approved]),
      [["notepad.exe", "", false]],
    );

    const typing = yield* computer
      .act({ threadId: thread, window: "1" }, "type", "5 characters", { text: "hello" })
      .pipe(Effect.forkChild);
    const request = yield* nextRequest(computer);
    assert.deepInclude(request, {
      threadId: thread,
      app: "notepad.exe",
      windowTitle: "Untitled - Notepad",
    });
    yield* computer.answer({ id: request.id, answer: "allow_thread" });
    yield* Fiber.join(typing);
    assert.deepStrictEqual(harness.calls.at(-1), {
      op: "type",
      args: { text: "hello", window: "1" },
    });

    // Approved for this thread now: no second question.
    yield* computer.act({ threadId: thread, window: "1" }, "key", "enter", { keys: "enter" });

    // The log records what was done, never what was typed.
    const log = (yield* computer.state).log;
    assert.deepStrictEqual(
      log.map((entry) => [entry.action, entry.app, entry.detail, entry.outcome]),
      [
        ["key", "notepad.exe", "enter", "done"],
        ["type", "notepad.exe", "5 characters", "done"],
        ["list_apps", null, "1 windows", "done"],
      ],
    );
    assert.isFalse(JSON.stringify(log).includes("hello"));
  }).pipe(Effect.provide(harness.layer));
});

it.effect("refuses blocked windows without asking", () => {
  const harness = makeHarness();
  return Effect.gen(function* () {
    const computer = yield* ComputerUseService.ComputerUseService;
    yield* computer.setEnabled(true);
    for (const window of ["2", "3"]) {
      const refused = yield* computer
        .act({ threadId: thread, window }, "click", "left click at 1,1", { x: 1, y: 1 })
        .pipe(Effect.asVoid, Effect.flip);
      assert.include(refused.message, "cannot use this window");
    }
    assert.isFalse(harness.calls.some((call) => call.op === "click"));
  }).pipe(Effect.provide(harness.layer));
});

it.effect("'always allow' saves the app; removing it asks again", () => {
  const harness = makeHarness();
  return Effect.gen(function* () {
    const computer = yield* ComputerUseService.ComputerUseService;
    yield* computer.setEnabled(true);
    const reading = yield* computer
      .act({ threadId: thread, window: "1" }, "read", "up to 300 elements", {})
      .pipe(Effect.forkChild);
    const request = yield* nextRequest(computer);
    yield* computer.answer({ id: request.id, answer: "always_allow" });
    yield* Fiber.join(reading);
    assert.deepStrictEqual(
      (yield* computer.state).allowedApps.map((app) => app.app),
      ["notepad.exe"],
    );
    // Another thread needs no approval for an always-allowed app.
    yield* computer.act({ threadId: ThreadId.make("thread-2"), window: "1" }, "read", "x", {});

    yield* computer.removeApp("notepad.exe");
    const again = yield* computer
      .act({ threadId: ThreadId.make("thread-2"), window: "1" }, "read", "x", {})
      .pipe(Effect.forkChild);
    const second = yield* nextRequest(computer);
    yield* computer.answer({ id: second.id, answer: "deny" });
    const denied = yield* Fiber.join(again).pipe(Effect.asVoid, Effect.flip);
    assert.include(denied.message, "declined");
  }).pipe(Effect.provide(harness.layer));
});

it.effect("stop turns computer use off, refuses waiting requests and ends the helper", () => {
  const harness = makeHarness();
  return Effect.gen(function* () {
    const computer = yield* ComputerUseService.ComputerUseService;
    yield* computer.setEnabled(true);
    const waiting = yield* computer
      .act({ threadId: thread, window: "1" }, "click", "left click at 5,5", { x: 5, y: 5 })
      .pipe(Effect.forkChild);
    yield* nextRequest(computer);
    yield* computer.stop;
    const refused = yield* Fiber.join(waiting).pipe(Effect.asVoid, Effect.flip);
    assert.include(refused.message, "declined");
    assert.strictEqual((yield* computer.state).enabled, false);
    assert.isAtLeast(harness.stops(), 1);
    assert.isFalse(harness.calls.some((call) => call.op === "click"));
  }).pipe(Effect.provide(harness.layer));
});
