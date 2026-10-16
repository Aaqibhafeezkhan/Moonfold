import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, describe, it } from "@effect/vitest";
import {
  ProjectId,
  ProviderDriverKind,
  ProviderInstanceId,
  type ProviderSkillEntry,
} from "@moonfold/contracts";
import type { ProviderInstance } from "@moonfold/provider-core/server/driver";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Stream from "effect/Stream";

import * as ProjectService from "../project/ProjectService.ts";
import * as ProviderInstanceRegistry from "./ProviderInstanceRegistry.ts";
import * as ProviderNativeConfigService from "./ProviderNativeConfigService.ts";

const codexId = ProviderInstanceId.make("codex");
const plainId = ProviderInstanceId.make("plain");
const projectId = ProjectId.make("project-1");

type NativeConfig = NonNullable<ProviderInstance["nativeConfig"]>;

const unused = () => Effect.die("unused");

function nativeConfig(
  skills: ReadonlyArray<ProviderSkillEntry>,
  seenCwds: Array<string | undefined>,
) {
  return {
    listMcpServers: unused,
    loginMcpServer: () => Stream.die("unused"),
    reloadMcpServers: unused,
    listSkills: (cwd) => {
      seenCwds.push(cwd);
      return Effect.succeed({ skills, errors: [] });
    },
    setSkillEnabled: unused,
    listHooks: unused,
    detectAgentImports: unused,
    importAgentConfig: unused,
    readAccountUsage: unused,
    setThreadArchived: unused,
  } satisfies NativeConfig;
}

function testLayer(config: NativeConfig) {
  const instance = (instanceId: ProviderInstanceId, withConfig: boolean) =>
    ({
      instanceId,
      driverKind: ProviderDriverKind.make("codex"),
      enabled: true,
      ...(withConfig ? { nativeConfig: config } : {}),
    }) as unknown as ProviderInstance;
  const instances = [instance(codexId, true), instance(plainId, false)];
  return ProviderNativeConfigService.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        Layer.mock(ProviderInstanceRegistry.ProviderInstanceRegistry)({
          getInstance: (instanceId) =>
            Effect.succeed(instances.find((entry) => entry.instanceId === instanceId)),
        }),
        Layer.mock(ProjectService.ProjectService)({
          getById: (id) =>
            Effect.succeed(
              id === projectId
                ? Option.some({ workspaceRoot: "/work/app" } as never)
                : Option.none(),
            ),
        }),
        NodeServices.layer,
      ),
    ),
  );
}

describe("ProviderNativeConfigService", () => {
  it.effect("reads a listed SKILL.md and refuses any other file", () =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const directory = yield* fileSystem.makeTempDirectoryScoped();
      const skillPath = path.join(directory, "SKILL.md");
      const secretPath = path.join(directory, "secret.txt");
      yield* fileSystem.writeFileString(skillPath, "# Lint\nRun the linter.");
      yield* fileSystem.writeFileString(secretPath, "do not read");
      const seenCwds: Array<string | undefined> = [];
      const skills: Array<ProviderSkillEntry> = [
        {
          name: "lint",
          displayName: null,
          description: "Run the linter",
          path: skillPath,
          scope: "repo",
          enabled: true,
          pluginId: null,
        },
      ];

      yield* Effect.gen(function* () {
        const service = yield* ProviderNativeConfigService.ProviderNativeConfigService;
        assert.deepEqual(
          yield* service.readSkill({ instanceId: codexId, projectId, path: skillPath }),
          { contents: "# Lint\nRun the linter.", truncated: false },
        );
        // The project's directory decides which skills are listed.
        assert.deepEqual(seenCwds, ["/work/app"]);

        const refused = yield* Effect.flip(
          service.readSkill({ instanceId: codexId, path: secretPath }),
        );
        assert.equal(refused.detail, "That skill is not one this provider lists.");
      }).pipe(Effect.provide(testLayer(nativeConfig(skills, seenCwds))));
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );

  it.effect("explains when a provider does not expose its configuration", () =>
    Effect.gen(function* () {
      const service = yield* ProviderNativeConfigService.ProviderNativeConfigService;
      const unsupported = yield* Effect.flip(service.listSkills({ instanceId: plainId }));
      assert.equal(
        unsupported.detail,
        "This provider does not expose its configuration to Moonfold.",
      );
      const missingProject = yield* Effect.flip(
        service.listSkills({ instanceId: codexId, projectId: ProjectId.make("missing") }),
      );
      assert.equal(missingProject.detail, "Project not found.");
    }).pipe(Effect.provide(testLayer(nativeConfig([], [])))),
  );
});
