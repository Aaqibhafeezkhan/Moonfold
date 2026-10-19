import { assert, it } from "@effect/vitest";
import { DEFAULT_CLIENT_SETTINGS, type ClientSettings } from "@moonfold/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import { beforeEach, vi } from "vite-plus/test";

const shortcuts = vi.hoisted(() => ({
  held: new Map<string, () => void>(),
  taken: new Set<string>(),
}));

vi.mock("electron", () => ({
  globalShortcut: {
    register: (accelerator: string, callback: () => void) => {
      if (shortcuts.taken.has(accelerator)) return false;
      shortcuts.held.set(accelerator, callback);
      return true;
    },
    unregister: (accelerator: string) => {
      shortcuts.held.delete(accelerator);
    },
  },
}));

import * as DesktopClientSettings from "../settings/DesktopClientSettings.ts";
import * as DesktopQuickWindow from "./DesktopQuickWindow.ts";
import * as DesktopWindow from "./DesktopWindow.ts";

const chord = {
  key: " ",
  metaKey: false,
  ctrlKey: true,
  shiftKey: false,
  altKey: true,
  modKey: false,
} as const;
const withShortcut = (
  quickWindowShortcut: ClientSettings["quickWindowShortcut"],
): ClientSettings => ({ ...DEFAULT_CLIENT_SETTINGS, quickWindowShortcut });

let toggles = 0;
const backgroundSettings: Array<boolean> = [];
const layer = DesktopQuickWindow.layer.pipe(
  Layer.provide(
    Layer.mergeAll(
      DesktopClientSettings.layerTest(Option.some(withShortcut(chord))),
      Layer.mock(DesktopWindow.DesktopWindow)({
        setRunInBackground: (enabled) =>
          Effect.sync(() => {
            backgroundSettings.push(enabled);
          }),
        toggleQuickWindow: Effect.sync(() => {
          toggles += 1;
        }),
      }),
    ),
  ),
);

beforeEach(() => {
  shortcuts.held.clear();
  shortcuts.taken.clear();
  toggles = 0;
  backgroundSettings.length = 0;
});

it.effect("passes the background-mode setting to the window service", () =>
  Effect.gen(function* () {
    const quickWindow = yield* DesktopQuickWindow.DesktopQuickWindow;
    yield* quickWindow.configure({ ...withShortcut(null), desktopRunInBackground: true });
    yield* quickWindow.configure({ ...withShortcut(null), desktopRunInBackground: false });
    assert.deepStrictEqual(backgroundSettings, [true, false]);
  }).pipe(Effect.provide(layer)),
);

it.effect("holds the saved hotkey from startup and toggles the window with it", () =>
  Effect.gen(function* () {
    const quickWindow = yield* DesktopQuickWindow.DesktopQuickWindow;
    yield* quickWindow.initialize;
    const status = yield* quickWindow.status;
    assert.strictEqual(status.accelerator, "Control+Alt+Space");
    shortcuts.held.get("Control+Alt+Space")?.();
    yield* Effect.yieldNow;
    assert.strictEqual(toggles, 1);
  }).pipe(Effect.provide(layer)),
);

it.effect("reports a hotkey another app holds, and lets go when turned off", () =>
  Effect.gen(function* () {
    const quickWindow = yield* DesktopQuickWindow.DesktopQuickWindow;
    shortcuts.taken.add("Control+Alt+Space");
    yield* quickWindow.configure(withShortcut(chord));
    const blocked = yield* quickWindow.status;
    assert.strictEqual(blocked.accelerator, null);
    assert.include(blocked.message ?? "", "already used");

    shortcuts.taken.clear();
    yield* quickWindow.configure(withShortcut({ ...chord, shiftKey: true }));
    assert.strictEqual((yield* quickWindow.status).accelerator, "Control+Alt+Shift+Space");
    yield* quickWindow.configure(withShortcut(null));
    assert.deepStrictEqual(yield* quickWindow.status, { accelerator: null, message: null });
    assert.strictEqual(shortcuts.held.size, 0);
  }).pipe(Effect.provide(layer)),
);

it.effect("releases the hotkey while a new one is recorded", () =>
  Effect.gen(function* () {
    const quickWindow = yield* DesktopQuickWindow.DesktopQuickWindow;
    yield* quickWindow.configure(withShortcut(chord));
    yield* quickWindow.setSuppressed(true);
    assert.strictEqual(shortcuts.held.size, 0);
    yield* quickWindow.setSuppressed(false);
    assert.isTrue(shortcuts.held.has("Control+Alt+Space"));
  }).pipe(Effect.provide(layer)),
);
