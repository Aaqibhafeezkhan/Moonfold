import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, expect, it } from "@effect/vitest";
import * as HostProcess from "@moonfold/shared/HostProcess";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import {
  formatCliCommand,
  resolveRootCliCommand,
  resolveServerInstallation,
} from "./invocation.ts";

it("formats package runner commands from their cache entry paths", () => {
  for (const [entryPath, expected] of [
    ["/home/theo/.npm/_npx/abc123/node_modules/moonfold/dist/bin.mjs", "npx moonfold serve"],
    [
      "C:\\Users\\theo\\AppData\\Local\\npm-cache\\_npx\\abc\\node_modules\\moonfold\\dist\\bin.mjs",
      "npx moonfold serve",
    ],
    [
      "/home/theo/.cache/pnpm/dlx/abc/node_modules/moonfold/dist/bin.mjs",
      "pnpm dlx moonfold serve",
    ],
    [
      "/home/theo/.local/share/pnpm/.pnpm/dlx/abc/node_modules/moonfold/dist/bin.mjs",
      "pnpm dlx moonfold serve",
    ],
    [
      "C:\\Users\\theo\\AppData\\Local\\pnpm-cache\\dlx\\abc\\node_modules\\moonfold\\dist\\bin.mjs",
      "pnpm dlx moonfold serve",
    ],
    ["/home/theo/.bun/install/cache/moonfold@0.0.31/dist/bin.mjs", "bunx moonfold serve"],
    ["/tmp/bunx-1000-moonfold@latest/node_modules/moonfold/dist/bin.mjs", "bunx moonfold serve"],
    [
      "C:\\Users\\theo\\AppData\\Local\\Temp\\bunx-0-moonfold@latest\\node_modules\\moonfold\\dist\\bin.mjs",
      "bunx moonfold serve",
    ],
  ] as const) {
    assert.equal(formatCliCommand({ subcommand: "serve", entryPath, version: "0.0.31" }), expected);
  }
});

it("treats stable installs as direct invocations", () => {
  for (const entryPath of [
    "/usr/local/lib/node_modules/moonfold/dist/bin.mjs",
    "/home/theo/Code/work/moonfold/apps/server/dist/bin.mjs",
    "/home/theo/.moonfold/runtime/0.0.31/node_modules/moonfold/dist/bin.mjs",
    "",
  ]) {
    assert.equal(
      formatCliCommand({ subcommand: "serve", entryPath, version: "0.0.31" }),
      "moonfold serve",
    );
  }
});

it("re-suggests the prerelease channel only for prerelease builds", () => {
  for (const [version, expected] of [
    ["0.0.31-nightly.20260729", "npx moonfold@nightly serve"],
    ["0.0.31-preview.20260729.1", "npx moonfold@preview serve"],
    ["0.0.31-foo-preview.20260729.1", "npx moonfold serve"],
    ["0.0.31", "npx moonfold serve"],
  ] as const) {
    assert.equal(
      formatCliCommand({
        subcommand: "serve",
        entryPath: "/home/theo/.npm/_npx/abc123/node_modules/moonfold/dist/bin.mjs",
        version,
      }),
      expected,
    );
  }
});

it("formats serve suggestions to match the launching command", () => {
  assert.equal(
    formatCliCommand({
      subcommand: "serve",
      entryPath: "/home/theo/.npm/_npx/abc/node_modules/moonfold/dist/bin.mjs",
      version: "0.0.31-nightly.20260729",
    }),
    "npx moonfold@nightly serve",
  );
  assert.equal(
    formatCliCommand({
      subcommand: "serve",
      entryPath: "/tmp/bunx-1000-moonfold@latest/node_modules/moonfold/dist/bin.mjs",
      version: "0.0.31",
    }),
    "bunx moonfold serve",
  );
  assert.equal(
    formatCliCommand({
      subcommand: "serve",
      entryPath: "/usr/local/lib/node_modules/moonfold/dist/bin.mjs",
      version: "0.0.31-nightly.20260729",
    }),
    "moonfold serve",
  );
});

it.layer(NodeServices.layer)("root CLI commands", (it) => {
  /** `sudo moonfold browser setup` as this process would render it, with `moonfold` on PATH or not. */
  const rootCommand = (input: {
    readonly node: string;
    readonly entry: string;
    readonly path?: string;
    readonly env?: Record<string, string>;
    readonly executable?: boolean;
  }) =>
    resolveRootCliCommand("browser setup").pipe(
      Effect.provideService(HostProcess.ExecutablePath, input.node),
      Effect.provideService(HostProcess.Arguments, [input.node, input.entry]),
      Effect.provideService(HostProcess.IsExecutable, input.executable ?? false),
      Effect.provideService(HostProcess.Platform, "linux"),
      Effect.provideService(HostProcess.Environment, { PATH: input.path ?? "", ...input.env }),
    );

  /** A directory holding an executable `moonfold`, to stand in for one on PATH. */
  const pathWithMoonfold = Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const bin = yield* fs.makeTempDirectoryScoped();
    yield* fs.writeFileString(path.join(bin, "moonfold"), "#!/bin/sh\n", { mode: 0o755 });
    return bin;
  });

  it.effect("keeps a user-installed Node reachable when the command runs under sudo", () =>
    Effect.gen(function* () {
      const npx = "/home/theo/.npm/_npx/abc/node_modules/moonfold/dist/bin.mjs";
      // sudo's secure_path already has a system Node.
      expect(yield* rootCommand({ node: "/usr/bin/node", entry: npx })).toBe(
        "sudo npx moonfold browser setup",
      );
      // nvm, fnm, and tarball installs are dropped by sudo's PATH reset.
      expect(
        yield* rootCommand({ node: "/home/theo/.nvm/versions/node/v24/bin/node", entry: npx }),
      ).toBe('sudo env "PATH=$PATH" npx moonfold browser setup');
      expect(
        yield* rootCommand({
          node: "/home/theo/.local/node/bin/node",
          entry: "/home/theo/.local/lib/node_modules/moonfold/dist/bin.mjs",
          path: yield* pathWithMoonfold,
        }),
      ).toBe('sudo env "PATH=$PATH" moonfold browser setup');
    }).pipe(Effect.scoped),
  );

  it.effect("names this install's launcher when moonfold is not on PATH", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const home = yield* fs.makeTempDirectoryScoped();
      const shim = path.join(home, ".local bin", "moonfold");
      yield* fs.makeDirectory(path.dirname(shim), { recursive: true });
      yield* fs.writeFileString(shim, "#!/bin/sh\n", { mode: 0o755 });
      const desktop = {
        node: "/tmp/.mount_Moonfoldabc/moonfold",
        entry: "/tmp/.mount_Moonfoldabc/resources/app.asar/apps/server/dist/bin.mjs",
        env: { MOONFOLD_CLI_PATH: shim },
      };
      // The desktop app's shim, quoted for the shell and run as root as is.
      expect(yield* rootCommand(desktop)).toBe(`sudo '${shim}' browser setup`);
      // A `moonfold` the person put on PATH still wins.
      expect(yield* rootCommand({ ...desktop, path: yield* pathWithMoonfold })).toBe(
        'sudo env "PATH=$PATH" moonfold browser setup',
      );
      // A standalone binary names itself.
      expect(
        yield* rootCommand({
          node: "/opt/moonfold/moonfold",
          entry: "/opt/moonfold/moonfold",
          executable: true,
        }),
      ).toBe("sudo /opt/moonfold/moonfold browser setup");
      // A stale shim path, then no launcher at all, fall back to plain `moonfold`.
      expect(
        yield* rootCommand({ ...desktop, env: { MOONFOLD_CLI_PATH: path.join(home, "gone") } }),
      ).toBe('sudo env "PATH=$PATH" moonfold browser setup');
    }).pipe(Effect.scoped),
  );
});

it.layer(NodeServices.layer)("manual server installation ownership", (it) => {
  it.effect("recognizes runner caches for both script and executable packages", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = yield* fs.makeTempDirectoryScoped();
      for (const [relative, kind] of [
        ["npm/_npx/hash/node_modules/moonfold/dist/bin.mjs", "npx"],
        ["npm/_npx/hash/node_modules/@moonfold/moonfold-linux-x64/moonfold", "npx"],
        ["pnpm/dlx/hash/node_modules/moonfold/dist/bin.mjs", "pnpm-dlx"],
        [".bun/install/cache/moonfold/dist/bin.mjs", "bunx"],
      ] as const) {
        const entry = path.join(root, relative);
        yield* fs.makeDirectory(path.dirname(entry), { recursive: true });
        yield* fs.writeFileString(entry, "");
        const installation = yield* resolveServerInstallation.pipe(
          Effect.provideService(HostProcess.Arguments, ["node", entry]),
          Effect.provideService(HostProcess.ExecutablePath, entry),
          Effect.provideService(HostProcess.IsExecutable, entry.endsWith("/moonfold")),
        );
        expect(installation).toEqual({ kind });
      }
    }),
  );

  it.effect("requires the npm prefix's bin to point to the running package", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = yield* fs.makeTempDirectoryScoped();
      const prefix = path.join(root, "bunx-tools");
      const packageRoot = path.join(prefix, "lib/node_modules/moonfold");
      const entry = path.join(packageRoot, "dist/bin.mjs");
      const globalBin = path.join(prefix, "bin/moonfold");
      yield* fs.makeDirectory(path.dirname(entry), { recursive: true });
      yield* fs.makeDirectory(path.dirname(globalBin), { recursive: true });
      yield* fs.writeFileString(entry, "");
      yield* fs.writeFileString(
        path.join(packageRoot, "package.json"),
        '{"name":"moonfold","version":"0.0.45","bin":{"moonfold":"./dist/bin.mjs"}}',
      );
      const resolve = resolveServerInstallation.pipe(
        Effect.provideService(HostProcess.Arguments, ["node", entry]),
        Effect.provideService(HostProcess.IsExecutable, false),
        Effect.provideService(HostProcess.Platform, "linux"),
      );
      expect(yield* resolve).toBeNull();
      yield* fs.symlink(entry, globalBin);
      expect(yield* resolve).toEqual({ kind: "npm-global", prefix });
      yield* fs.remove(globalBin);
      yield* fs.writeFileString(globalBin, "an unrelated moonfold command");
      expect(yield* resolve).toBeNull();
      expect(yield* resolve.pipe(Effect.provideService(HostProcess.Platform, "win32"))).toBeNull();
    }),
  );

  it.effect("proves the native executable belongs to the npm launcher", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = yield* fs.makeTempDirectoryScoped();
      const prefix = path.join(root, "bunx-tools");
      const packageRoot = path.join(prefix, "lib/node_modules/moonfold");
      const launcher = path.join(packageRoot, "bin/moonfold.js");
      const entry = path.join(packageRoot, "node_modules/@moonfold/moonfold-linux-x64/moonfold");
      yield* fs.makeDirectory(path.dirname(launcher), { recursive: true });
      yield* fs.makeDirectory(path.dirname(entry), { recursive: true });
      yield* fs.makeDirectory(path.join(prefix, "bin"));
      yield* fs.writeFileString(launcher, "");
      yield* fs.writeFileString(entry, "");
      yield* fs.writeFileString(
        path.join(packageRoot, "package.json"),
        '{"name":"moonfold","version":"0.0.45","bin":{"moonfold":"./bin/moonfold.js"},"optionalDependencies":{"@moonfold/moonfold-linux-x64":"0.0.45"}}',
      );
      yield* fs.symlink(launcher, path.join(prefix, "bin/moonfold"));
      const resolve = resolveServerInstallation.pipe(
        Effect.provideService(HostProcess.ExecutablePath, entry),
        Effect.provideService(HostProcess.IsExecutable, true),
        Effect.provideService(HostProcess.Platform, "linux"),
      );
      for (const [version, expected] of [
        ["0.0.44", null],
        ["0.0.45", { kind: "npm-global", prefix }],
      ]) {
        yield* fs.writeFileString(
          path.join(path.dirname(entry), "package.json"),
          `{"name":"@moonfold/moonfold-linux-x64","version":"${version}"}`,
        );
        expect(yield* resolve).toEqual(expected);
      }
    }),
  );

  it.effect("leaves local, standalone, missing and unreadable installs unknown", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = yield* fs.makeTempDirectoryScoped();
      for (const relative of [
        "project/node_modules/moonfold/dist/bin.mjs",
        "project/apps/server/dist/bin.mjs",
        ".moonfold/runtime/0.0.45/moonfold",
        "missing/dist/bin.mjs",
      ]) {
        const entry = path.join(root, relative);
        if (!relative.startsWith("missing")) {
          yield* fs.makeDirectory(path.dirname(entry), { recursive: true });
          yield* fs.writeFileString(entry, "");
        }
        expect(
          yield* resolveServerInstallation.pipe(
            Effect.provideService(HostProcess.Arguments, ["node", entry]),
            Effect.provideService(HostProcess.IsExecutable, false),
          ),
        ).toBeNull();
      }
    }),
  );
});
