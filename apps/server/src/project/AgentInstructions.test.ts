import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, describe, it } from "@effect/vitest";
import { ProjectId } from "@moonfold/contracts";
import * as HostProcess from "@moonfold/shared/HostProcess";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";

import * as AgentInstructions from "./AgentInstructions.ts";
import * as ProjectService from "./ProjectService.ts";

const projectId = ProjectId.make("project-1");

/** Runs `body` with a temporary home and project, never the real ~/.codex or ~/.claude. */
const withSandbox = <A, E>(
  body: (paths: {
    readonly home: string;
    readonly project: string;
  }) => Effect.Effect<
    A,
    E,
    AgentInstructions.AgentInstructions | FileSystem.FileSystem | Path.Path
  >,
) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = yield* fileSystem.makeTempDirectoryScoped();
    const home = path.join(root, "home");
    const project = path.join(root, "project");
    yield* fileSystem.makeDirectory(project, { recursive: true });
    const layer = AgentInstructions.layer.pipe(
      Layer.provide(
        Layer.mock(ProjectService.ProjectService)({
          getById: (id) =>
            Effect.succeed(
              id === projectId ? Option.some({ workspaceRoot: project } as never) : Option.none(),
            ),
        }),
      ),
    );
    return yield* body({ home, project }).pipe(
      Effect.provide(layer),
      Effect.provideService(HostProcess.HomeDirectory, home),
      Effect.provideService(HostProcess.Environment, {}),
    );
  }).pipe(Effect.scoped, Effect.provide(NodeServices.layer));

describe("AgentInstructions", () => {
  it.effect("lists the project and user files, creating one on first save", () =>
    withSandbox(({ home, project }) =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const instructions = yield* AgentInstructions.AgentInstructions;
        yield* fileSystem.writeFileString(path.join(project, "AGENTS.md"), "# Rules\nUse tabs.\n");

        const { files } = yield* instructions.list({ projectId });
        assert.deepEqual(
          files.map((file) => [file.id, file.path, file.contents]),
          [
            ["project-agents", path.join(project, "AGENTS.md"), "# Rules\nUse tabs.\n"],
            ["project-claude", path.join(project, "CLAUDE.md"), null],
            ["user-codex", path.join(home, ".codex", "AGENTS.md"), null],
            ["user-claude", path.join(home, ".claude", "CLAUDE.md"), null],
          ],
        );

        // A missing file, and its missing home directory, are created by the first save.
        yield* instructions.write({
          id: "user-claude",
          contents: "Be brief.\n",
          expectedRevision: null,
        });
        assert.equal(
          yield* fileSystem.readFileString(path.join(home, ".claude", "CLAUDE.md")),
          "Be brief.\n",
        );
        // Without a project only the user files are listed.
        const userOnly = yield* instructions.list({});
        assert.deepEqual(
          userOnly.files.map((file) => [file.id, file.contents]),
          [
            ["user-codex", null],
            ["user-claude", "Be brief.\n"],
          ],
        );
      }),
    ),
  );

  it.effect("refuses to overwrite a file that changed since it was read", () =>
    withSandbox(({ project }) =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const instructions = yield* AgentInstructions.AgentInstructions;
        const filePath = path.join(project, "AGENTS.md");
        yield* fileSystem.writeFileString(filePath, "first\n");
        const opened = (yield* instructions.list({ projectId })).files[0]!;

        // Someone edits the file in their editor meanwhile.
        yield* fileSystem.writeFileString(filePath, "edited elsewhere\n");
        const refused = yield* Effect.flip(
          instructions.write({
            id: "project-agents",
            projectId,
            contents: "mine\n",
            expectedRevision: opened.revision,
          }),
        );
        assert.equal(refused.reason, "changed_on_disk");
        assert.equal(yield* fileSystem.readFileString(filePath), "edited elsewhere\n");

        // Saving from the current revision works and returns the new one.
        const current = (yield* instructions.list({ projectId })).files[0]!;
        const saved = yield* instructions.write({
          id: "project-agents",
          projectId,
          contents: "mine\n",
          expectedRevision: current.revision,
        });
        assert.equal(saved.revision, AgentInstructions.instructionsRevision("mine\n"));
      }),
    ),
  );

  it.effect("needs a known project for project files", () =>
    withSandbox(() =>
      Effect.gen(function* () {
        const instructions = yield* AgentInstructions.AgentInstructions;
        const noProject = yield* Effect.flip(
          instructions.write({ id: "project-claude", contents: "x", expectedRevision: null }),
        );
        assert.equal(noProject.reason, "project_not_found");
        const unknown = yield* Effect.flip(
          instructions.list({ projectId: ProjectId.make("missing") }),
        );
        assert.equal(unknown.reason, "project_not_found");
      }),
    ),
  );
});
