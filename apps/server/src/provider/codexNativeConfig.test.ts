import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, describe, it } from "@effect/vitest";
import { ProviderDriverKind, ProviderInstanceId } from "@moonfold/contracts";
import * as CodexClient from "effect-codex-app-server/client";
import * as CodexReplay from "effect-codex-app-server/replay";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";

import { makeCodexNativeConfig } from "./codexNativeConfig.ts";

const USER_CWD = "/home/dev";

function transcript(
  scenario: string,
  entries: ReadonlyArray<CodexReplay.CodexAppServerReplayEntry>,
): CodexReplay.CodexAppServerReplayTranscript {
  return { provider: "codex", protocol: "codex.app-server", version: "0.161.0", scenario, entries };
}

const request = (id: number, method: string, params: unknown, result: unknown) =>
  [
    { type: "expect_outbound", label: method, frame: { id, method, params } },
    { type: "emit_inbound", label: method, frame: { id, result } },
  ] satisfies Array<CodexReplay.CodexAppServerReplayEntry>;

const notification = (method: string, params: unknown): CodexReplay.CodexAppServerReplayEntry => ({
  type: "emit_inbound",
  label: method,
  frame: { method, params },
});

/** A native config whose app-server replays `entries`, recording each directory it opens in. */
function replayConfig(
  scenario: string,
  entries: ReadonlyArray<CodexReplay.CodexAppServerReplayEntry>,
) {
  const opened: Array<string> = [];
  const config = makeCodexNativeConfig({
    driver: ProviderDriverKind.make("codex"),
    instanceId: ProviderInstanceId.make("codex"),
    userCwd: USER_CWD,
    open: (cwd) => {
      opened.push(cwd);
      return Layer.build(CodexReplay.layerReplay(transcript(scenario, entries))).pipe(
        Effect.flatMap((context) =>
          Effect.service(CodexClient.CodexAppServerClient).pipe(Effect.provide(context)),
        ),
        Effect.map((client) => ({ client })),
      );
    },
  });
  return { config, opened };
}

const mcpStatus = (overrides: Record<string, unknown>) => ({
  name: "server",
  runtimeStatus: null,
  pluginId: null,
  httpOrigin: null,
  serverInfo: null,
  serverCapabilities: null,
  tools: {},
  toolsError: null,
  resources: [],
  resourceTemplates: [],
  authStatus: "unsupported",
  ...overrides,
});

const skill = (name: string, path: string, enabled: boolean) => ({
  name,
  description: `${name} long description`,
  interface: { displayName: `${name} skill`, shortDescription: `${name} in short` },
  path,
  scope: "user",
  enabled,
});

describe("Codex native config", () => {
  it.effect("lists MCP servers with their auth, tools and startup errors", () =>
    Effect.gen(function* () {
      const { config, opened } = replayConfig("mcp-list", [
        ...request(
          1,
          "mcpServerStatus/list",
          { detail: "toolsAndAuthOnly" },
          {
            data: [
              mcpStatus({
                name: "remote-docs",
                httpOrigin: "https://docs.example.com",
                authStatus: "notLoggedIn",
                toolsError: "OAuth authorization required",
              }),
              mcpStatus({
                name: "files",
                runtimeStatus: "connected",
                tools: {
                  write: { name: "write", inputSchema: {} },
                  read: { name: "read", inputSchema: {} },
                },
                resources: [{ uri: "file:///a", name: "a" }],
              }),
            ],
          },
        ),
      ]);
      const { servers } = yield* config.listMcpServers();
      assert.deepEqual(opened, [USER_CWD]);
      assert.deepEqual(servers, [
        {
          name: "files",
          auth: "unsupported",
          state: "connected",
          origin: null,
          pluginId: null,
          toolNames: ["read", "write"],
          resourceCount: 1,
          error: null,
        },
        {
          name: "remote-docs",
          auth: "notLoggedIn",
          state: null,
          origin: "https://docs.example.com",
          pluginId: null,
          toolNames: [],
          resourceCount: 0,
          error: "OAuth authorization required",
        },
      ]);
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("streams the sign-in URL, then how the browser sign-in ended", () =>
    Effect.gen(function* () {
      const { config } = replayConfig("mcp-login", [
        ...request(
          1,
          "mcpServer/oauth/login",
          { name: "remote-docs", timeoutSecs: 300 },
          { authorizationUrl: "https://auth.example.com/authorize?state=abc" },
        ),
        notification("mcpServer/oauthLogin/completed", { name: "other", success: false }),
        notification("mcpServer/oauthLogin/completed", { name: "remote-docs", success: true }),
      ]);
      const events = yield* Stream.runCollect(config.loginMcpServer("remote-docs"));
      assert.deepEqual(Array.from(events), [
        { type: "authorizationUrl", url: "https://auth.example.com/authorize?state=abc" },
        { type: "completed", success: true, error: null },
      ]);
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("lists skills once each, in the project when one is given", () =>
    Effect.gen(function* () {
      const userSkill = skill("lint", "/home/dev/.agents/skills/lint/SKILL.md", true);
      const { config, opened } = replayConfig("skills-list", [
        ...request(
          1,
          "skills/list",
          { cwds: ["/work/app"] },
          {
            data: [
              {
                cwd: "/work/app",
                skills: [
                  userSkill,
                  userSkill,
                  {
                    ...skill("deploy", "/work/app/.agents/skills/deploy/SKILL.md", false),
                    scope: "repo",
                  },
                ],
                errors: [
                  { path: "/work/app/.agents/skills/bad/SKILL.md", message: "missing name" },
                ],
              },
            ],
          },
        ),
      ]);
      const result = yield* config.listSkills("/work/app");
      assert.deepEqual(opened, ["/work/app"]);
      assert.deepEqual(
        result.skills.map((entry) => [
          entry.name,
          entry.displayName,
          entry.description,
          entry.scope,
          entry.enabled,
        ]),
        [
          ["lint", "lint skill", "lint in short", "user", true],
          ["deploy", "deploy skill", "deploy in short", "repo", false],
        ],
      );
      assert.deepEqual(result.errors, [
        { path: "/work/app/.agents/skills/bad/SKILL.md", message: "missing name" },
      ]);
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("reports the enabled state Codex settles on after a skill change", () =>
    Effect.gen(function* () {
      const { config } = replayConfig("skills-write", [
        ...request(
          1,
          "skills/config/write",
          { path: "/home/dev/.agents/skills/lint/SKILL.md", enabled: false },
          { effectiveEnabled: true },
        ),
      ]);
      const result = yield* config.setSkillEnabled({
        path: "/home/dev/.agents/skills/lint/SKILL.md",
        enabled: false,
      });
      assert.deepEqual(result, { enabled: true });
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("lists hooks with what each one runs", () =>
    Effect.gen(function* () {
      const base = {
        currentHash: "h",
        enabled: true,
        isManaged: false,
        source: "user",
        sourcePath: "/home/dev/.codex/hooks.json",
        timeoutSec: 30,
        trustStatus: "trusted",
      };
      const { config } = replayConfig("hooks-list", [
        ...request(
          1,
          "hooks/list",
          { cwds: [USER_CWD] },
          {
            data: [
              {
                cwd: USER_CWD,
                hooks: [
                  {
                    ...base,
                    key: "tool",
                    displayOrder: 2,
                    eventName: "postToolUse",
                    handlerType: "mcpTool",
                    server: "audit",
                    tool: "record",
                  },
                  {
                    ...base,
                    key: "fmt",
                    displayOrder: 1,
                    eventName: "stop",
                    matcher: "*.ts",
                    handlerType: "command",
                    command: "pnpm fmt",
                  },
                ],
                warnings: ["hooks.json: unknown key"],
                errors: [],
              },
            ],
          },
        ),
      ]);
      const result = yield* config.listHooks(undefined);
      assert.deepEqual(
        result.hooks.map((hook) => [hook.key, hook.event, hook.handler, hook.target, hook.matcher]),
        [
          ["fmt", "stop", "command", "pnpm fmt", "*.ts"],
          ["tool", "postToolUse", "mcpTool", "audit/record", null],
        ],
      );
      assert.deepEqual(result.warnings, ["hooks.json: unknown key"]);
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  const skillsItem = {
    itemType: "SKILLS",
    description: "Migrate skills from ~/.claude/skills",
    cwd: null,
    details: { skills: [{ name: "synced" }], sessions: [] },
  };
  const sessionsItem = {
    itemType: "SESSIONS",
    description: "Migrate recent sessions",
    cwd: null,
    details: { sessions: [{ path: "/s/1.jsonl", cwd: "/work/app", title: "Fix the build" }] },
  };

  it.effect("imports only items Codex detects, and reports what came over", () =>
    Effect.gen(function* () {
      const detect = (id: number) =>
        request(
          id,
          "externalAgentConfig/detect",
          { includeHome: true },
          { items: [skillsItem, sessionsItem] },
        );
      const { config: detectConfig } = replayConfig("import-detect", detect(1));
      const { items } = yield* detectConfig.detectAgentImports(undefined);
      assert.deepEqual(
        items.map((item) => [item.kind, item.entries]),
        [
          ["SKILLS", ["synced"]],
          ["SESSIONS", ["Fix the build"]],
        ],
      );

      const { config } = replayConfig("import-run", [
        ...detect(1),
        ...request(
          2,
          "externalAgentConfig/import",
          { migrationItems: [sessionsItem] },
          { importId: "imp-1" },
        ),
        notification("externalAgentConfig/import/completed", {
          importId: "imp-1",
          itemTypeResults: [
            {
              itemType: "SESSIONS",
              successes: [{ itemType: "SESSIONS", title: "Fix the build" }],
              failures: [],
            },
          ],
        }),
      ]);
      const result = yield* config.importAgentConfig({
        cwd: undefined,
        itemIds: [items[1]!.id, "not-detected"],
      });
      assert.deepEqual(result, {
        results: [{ kind: "SESSIONS", imported: 1, failed: 0, errors: [] }],
      });
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("refuses an import when none of the chosen items is still detected", () =>
    Effect.gen(function* () {
      const { config } = replayConfig(
        "import-stale",
        request(1, "externalAgentConfig/detect", { includeHome: true }, { items: [skillsItem] }),
      );
      const error = yield* Effect.flip(
        config.importAgentConfig({ cwd: undefined, itemIds: ["gone"] }),
      );
      assert.equal(error.detail, "None of the selected items are still available.");
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("archives and unarchives Codex's copy of a thread", () =>
    Effect.gen(function* () {
      const thread = {
        id: "native-1",
        sessionId: "native-1",
        forkedFromId: null,
        preview: "",
        ephemeral: false,
        modelProvider: "openai",
        createdAt: 1782622440,
        updatedAt: 1782622440,
        status: { type: "notLoaded" },
        path: "/home/dev/.codex/sessions/native-1.jsonl",
        cwd: "/work/app",
        cliVersion: "0.161.0",
        source: "vscode",
        threadSource: null,
        agentNickname: null,
        agentRole: null,
        gitInfo: null,
        name: null,
        turns: [],
      };
      const archive = replayConfig("archive", [
        ...request(1, "thread/archive", { threadId: "native-1" }, {}),
      ]);
      yield* archive.config.setThreadArchived({ nativeThreadId: "native-1", archived: true });
      const unarchive = replayConfig("unarchive", [
        ...request(1, "thread/unarchive", { threadId: "native-1" }, { thread }),
      ]);
      yield* unarchive.config.setThreadArchived({ nativeThreadId: "native-1", archived: false });
    }).pipe(Effect.provide(NodeServices.layer)),
  );

  it.effect("reads account usage with days oldest first", () =>
    Effect.gen(function* () {
      const { config } = replayConfig("usage", [
        ...request(1, "account/usage/read", null, {
          summary: {
            lifetimeTokens: 4_000_000,
            peakDailyTokens: 900_000,
            longestRunningTurnSec: 3600,
            currentStreakDays: 2,
            longestStreakDays: 9,
          },
          dailyUsageBuckets: [
            { startDate: "2026-10-15", tokens: 500 },
            { startDate: "2026-10-01", tokens: 1200 },
          ],
        }),
      ]);
      assert.deepEqual(yield* config.readAccountUsage(), {
        lifetimeTokens: 4_000_000,
        peakDailyTokens: 900_000,
        currentStreakDays: 2,
        longestStreakDays: 9,
        longestTurnSeconds: 3600,
        days: [
          { date: "2026-10-01", tokens: 1200 },
          { date: "2026-10-15", tokens: 500 },
        ],
      });
    }).pipe(Effect.provide(NodeServices.layer)),
  );
});
