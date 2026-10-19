import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import { PluginId } from "@moonfold/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";

import * as ServerConfig from "../config.ts";
import * as GitVcsDriver from "../vcs/GitVcsDriver.ts";
import {
  isAllowedGitUrl,
  parsePluginMcpConfig,
  pluginIdFrom,
  PluginStore,
  layer as pluginStoreLayer,
  readSkillFrontmatter,
} from "./PluginStore.ts";

const storeLayer = pluginStoreLayer.pipe(
  Layer.provideMerge(GitVcsDriver.layer),
  Layer.provideMerge(ServerConfig.layerTest(process.cwd(), { prefix: "plugin-store-" })),
  Layer.provideMerge(NodeCrypto.layer),
  Layer.provideMerge(NodeServices.layer),
);

/** Writes a plugin folder from a map of relative paths to contents. */
const writePlugin = (files: Record<string, string>) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = yield* fs.makeTempDirectoryScoped({ prefix: "plugin-source-" });
    for (const [file, content] of Object.entries(files)) {
      yield* fs.makeDirectory(path.dirname(path.join(root, file)), { recursive: true });
      yield* fs.writeFileString(path.join(root, file), content);
    }
    return root;
  });

const codexPlugin = (args: ReadonlyArray<string>) => ({
  ".codex-plugin/plugin.json": JSON.stringify({
    name: "Release Helper",
    version: "1.2.0",
    description: "Drafts release notes.",
    mcpServers: "./.mcp.json",
  }),
  ".mcp.json": JSON.stringify({
    mcpServers: { notes: { command: "node", args, cwd: ".", env_vars: ["RELEASE_TOKEN"] } },
  }),
  "skills/draft-notes/SKILL.md":
    "---\nname: draft-notes\ndescription: Draft release notes.\n---\nWrite notes.",
  "server.mjs": "// MCP server",
});

describe("plugin folder parsing", () => {
  it("reads skill frontmatter and makes safe ids", () => {
    expect(
      readSkillFrontmatter('---\nname: "review"\ndescription: Review a diff\n---\nBody'),
    ).toEqual({
      name: "review",
      description: "Review a diff",
    });
    expect(readSkillFrontmatter("No frontmatter")).toEqual({ name: null, description: null });
    expect(pluginIdFrom("Release Helper!")).toBe("release-helper");
    expect(pluginIdFrom("tools.git")).toBe("tools");
  });

  it("reads Codex and Claude Code MCP configs relative to the plugin", () => {
    const join = (...parts: ReadonlyArray<string>) => parts.join("/");
    expect(
      parsePluginMcpConfig(
        {
          mcpServers: {
            local: {
              command: "${CLAUDE_PLUGIN_ROOT}/bin/server",
              env: { MODE: "${CLAUDE_PLUGIN_ROOT}/x" },
            },
            remote: { type: "http", url: "https://example.test/mcp" },
            off: { command: "node", enabled: false },
          },
        },
        "/plugins/p",
        join,
      ),
    ).toEqual([
      {
        name: "local",
        command: "/plugins/p/bin/server",
        args: [],
        cwd: "/plugins/p",
        url: null,
        envVars: [],
        env: { MODE: "/plugins/p/x" },
      },
      {
        name: "remote",
        command: null,
        args: [],
        cwd: null,
        url: "https://example.test/mcp",
        envVars: [],
        env: {},
      },
    ]);
  });

  it("only clones https and ssh remotes", () => {
    expect(isAllowedGitUrl("https://github.com/owner/plugin.git")).toBe(true);
    expect(isAllowedGitUrl("git@github.com:owner/plugin.git")).toBe(true);
    expect(isAllowedGitUrl("ssh://git@host/plugin.git")).toBe(true);
    expect(isAllowedGitUrl("--upload-pack=touch /tmp/x")).toBe(false);
    expect(isAllowedGitUrl("ext::sh -c touch% /tmp/x")).toBe(false);
    expect(isAllowedGitUrl("file:///tmp/repo")).toBe(false);
  });
});

describe("PluginStore", () => {
  it.effect("installs a Codex plugin disabled, and gives it to providers once enabled", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const store = yield* PluginStore;
      const { pluginsDir } = yield* ServerConfig.ServerConfig;
      const source = yield* writePlugin(codexPlugin(["./server.mjs"]));

      const installed = yield* store.install({ type: "folder", path: source });
      expect(installed).toMatchObject({
        id: "release-helper",
        name: "Release Helper",
        version: "1.2.0",
        enabled: false,
        formats: ["codex"],
        skills: [{ name: "draft-notes", description: "Draft release notes." }],
      });
      const sourceDir = path.join(pluginsDir, "release-helper", "source");
      expect(installed.mcpServers).toEqual([
        {
          name: "notes",
          command: "node",
          args: ["./server.mjs"],
          cwd: path.join(sourceDir, "."),
          url: null,
          envVars: ["RELEASE_TOKEN"],
        },
      ]);
      const view = path.join(pluginsDir, "release-helper", "view");
      expect(yield* fs.exists(path.join(view, "skills", "draft-notes", "SKILL.md"))).toBe(true);
      expect(yield* fs.readFileString(path.join(view, ".claude-plugin", "plugin.json"))).toContain(
        '"name":"release-helper"',
      );

      // Nothing reaches a provider while the plugin is disabled.
      expect(yield* store.bundle).toEqual({ skillRoots: [], claudePluginDirs: [], mcpServers: [] });
      yield* store.setEnabled(PluginId.make("release-helper"), true);
      const bundle = yield* store.bundle;
      expect(bundle.skillRoots).toEqual([path.join(view, "skills")]);
      expect(bundle.claudePluginDirs).toEqual([view]);
      expect(bundle.mcpServers).toMatchObject([
        { name: "release-helper-notes", command: "node", envVars: ["RELEASE_TOKEN"] },
      ]);
      expect((yield* store.list).plugins).toHaveLength(1);
    }).pipe(Effect.provide(storeLayer), Effect.scoped),
  );

  it.effect("turns a plugin off again when an update changes what its MCP server runs", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const store = yield* PluginStore;
      const source = yield* writePlugin(codexPlugin(["./server.mjs"]));
      const { id } = yield* store.install({ type: "folder", path: source });
      yield* store.setEnabled(id, true);

      // Same servers, new skill text: stays on.
      yield* fs.writeFileString(
        path.join(source, "skills", "draft-notes", "SKILL.md"),
        "---\nname: draft-notes\ndescription: Draft better notes.\n---\n",
      );
      const refreshed = yield* store.update(id);
      expect(refreshed.enabled).toBe(true);
      expect(refreshed.skills[0]?.description).toBe("Draft better notes.");

      // A different command: off until the user looks again.
      yield* fs.writeFileString(
        path.join(source, ".mcp.json"),
        JSON.stringify({ mcpServers: { notes: { command: "node", args: ["./other.mjs"] } } }),
      );
      const changed = yield* store.update(id);
      expect(changed.enabled).toBe(false);
      expect(changed.mcpServers[0]?.args).toEqual(["./other.mjs"]);
    }).pipe(Effect.provide(storeLayer), Effect.scoped),
  );

  it.effect("installs a plain skills folder and removes it completely", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const store = yield* PluginStore;
      const { pluginsDir } = yield* ServerConfig.ServerConfig;
      const source = yield* writePlugin({
        "summarize/SKILL.md": "---\nname: summarize\n---\nSummarize.",
        "lint/SKILL.md": "---\nname: lint-fix\n---\nFix lint.",
        "notes/readme.md": "Not a skill.",
      });
      const installed = yield* store.install({ type: "folder", path: source });
      expect(installed.formats).toEqual(["skills"]);
      expect(installed.skills.map((skill) => skill.name).toSorted()).toEqual([
        "lint-fix",
        "summarize",
      ]);
      expect(installed.mcpServers).toEqual([]);

      yield* store.remove(installed.id);
      expect((yield* store.list).plugins).toEqual([]);
      expect(yield* fs.exists(path.join(pluginsDir, installed.id))).toBe(false);
    }).pipe(Effect.provide(storeLayer), Effect.scoped),
  );

  it.effect("refuses folders with nothing to offer and keeps no partial install", () =>
    Effect.gen(function* () {
      const store = yield* PluginStore;
      const source = yield* writePlugin({ "README.md": "Just a readme." });
      const error = yield* Effect.flip(store.install({ type: "folder", path: source }));
      expect(error.message).toMatch(/No skills/);
      expect((yield* store.list).plugins).toEqual([]);
      const missing = yield* Effect.flip(
        store.install({ type: "folder", path: `${source}-missing` }),
      );
      expect(missing.message).toMatch(/does not exist/);
    }).pipe(Effect.provide(storeLayer), Effect.scoped),
  );
});
