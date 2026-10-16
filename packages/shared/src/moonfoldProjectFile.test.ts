// @effect-diagnostics nodeBuiltinImport:off - Compares the committed schema file on disk.
import * as NodeFS from "node:fs";

import * as Schema from "effect/Schema";
import { describe, expect, it } from "vite-plus/test";

import {
  buildMoonfoldProjectFileJsonSchema,
  parseMoonfoldProjectFile,
  MoonfoldProjectFileFromJson,
} from "./moonfoldProjectFile.ts";

const decodeJson = Schema.decodeUnknownSync(MoonfoldProjectFileFromJson);

describe("buildMoonfoldProjectFileJsonSchema", () => {
  it("matches the committed schemas/moonfold.json", () => {
    const committed = NodeFS.readFileSync(
      new URL("../../../schemas/moonfold.json", import.meta.url),
      "utf8",
    );
    // Regenerate with: node scripts/export-project-schema.ts
    expect(JSON.parse(committed)).toEqual(buildMoonfoldProjectFileJsonSchema());
  });

  it("emits a draft 2020-12 schema with the published $id", () => {
    const schema = buildMoonfoldProjectFileJsonSchema();

    expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(schema.$id).toBe(
      "https://raw.githubusercontent.com/Mr-Dark-debug/Moonfold/main/schemas/moonfold.json",
    );
    expect(schema.type).toBe("object");
    expect(schema.additionalProperties).toBe(false);
  });

  it("documents every supported field", () => {
    const schema = buildMoonfoldProjectFileJsonSchema() as {
      properties: Record<
        string,
        {
          description?: string;
          items?: { properties: Record<string, unknown>; required: ReadonlyArray<string> };
        }
      >;
      required?: ReadonlyArray<string>;
    };

    expect(Object.keys(schema.properties).sort()).toEqual([
      "$schema",
      "defaultThreadEnvMode",
      "iconPath",
      "scripts",
      "worktreeSubmodules",
    ]);
    expect(schema.required).toBeUndefined();
    expect(schema.properties.iconPath?.description).toContain("Workspace-relative path");
    expect(schema.properties.defaultThreadEnvMode?.description).toContain("new threads start");

    const script = schema.properties.scripts?.items;
    expect(script?.required).toEqual(["name", "command"]);
    expect(Object.keys(script?.properties ?? {}).sort()).toEqual([
      "async",
      "autoOpenPreview",
      "command",
      "icon",
      "name",
      "previewUrl",
      "runOnSettle",
      "runOnWorktreeCreate",
    ]);
  });

  it("stays JSON-serializable", () => {
    const schema = buildMoonfoldProjectFileJsonSchema();
    expect(JSON.parse(JSON.stringify(schema))).toEqual(schema);
  });
});

describe("MoonfoldProjectFileFromJson", () => {
  it("decodes lenient JSONC with comments and trailing commas", () => {
    const decoded = decodeJson(`{
      // team scripts
      "iconPath": "assets/logo.svg",
      "scripts": [
        { "name": "Dev", "command": "pnpm dev", },
      ],
    }`);

    expect(decoded.iconPath).toBe("assets/logo.svg");
    expect(decoded.scripts?.[0]).toEqual({ name: "Dev", command: "pnpm dev" });
  });

  it("fails on malformed JSON", () => {
    expect(() => decodeJson("{ not json")).toThrow();
  });
});

describe("parseMoonfoldProjectFile", () => {
  it("returns the decoded file for valid contents", () => {
    expect(parseMoonfoldProjectFile('{ "defaultThreadEnvMode": "worktree" }')).toEqual({
      defaultThreadEnvMode: "worktree",
    });
  });

  it("returns null for malformed or invalid contents", () => {
    expect(parseMoonfoldProjectFile("{ not json")).toBeNull();
    expect(parseMoonfoldProjectFile('{ "defaultThreadEnvMode": "spaceship" }')).toBeNull();
  });
});
