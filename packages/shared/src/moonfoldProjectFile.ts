import * as Exit from "effect/Exit";
import * as Schema from "effect/Schema";

import { MoonfoldProjectFile, MOONFOLD_PROJECT_FILE_SCHEMA_URL } from "@moonfold/contracts";

import { fromLenientJson } from "./schemaJson.ts";

/**
 * Codec between the raw `moonfold.json` file contents (lenient JSONC string) and the
 * decoded {@link MoonfoldProjectFile}.
 */
export const MoonfoldProjectFileFromJson = fromLenientJson(MoonfoldProjectFile);

const decodeMoonfoldProjectFile = Schema.decodeExit(MoonfoldProjectFileFromJson);

/**
 * Decode raw `moonfold.json` contents, treating invalid or malformed files as
 * absent. Clients use this to read optional defaults (scripts, thread env
 * mode) without surfacing decode errors to the user.
 */
export function parseMoonfoldProjectFile(contents: string): MoonfoldProjectFile | null {
  const decoded = decodeMoonfoldProjectFile(contents);
  return Exit.isSuccess(decoded) ? decoded.value : null;
}

/**
 * Build the publishable JSON Schema document for `moonfold.json` (draft 2020-12).
 *
 * Committed at `schemas/moonfold.json` and published at {@link MOONFOLD_PROJECT_FILE_SCHEMA_URL}
 * so editors get LSP support via a `$schema` reference. The shared test keeps the two in sync.
 */
export function buildMoonfoldProjectFileJsonSchema(): Record<string, unknown> {
  // Closed objects, as before effect rc.113 changed the generator default;
  // editors then flag unknown keys in moonfold.json.
  const document = Schema.toJsonSchemaDocument(MoonfoldProjectFile, { onExcessProperty: "error" });
  const jsonSchema: Record<string, unknown> = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: MOONFOLD_PROJECT_FILE_SCHEMA_URL,
    ...document.schema,
  };
  if (document.definitions && Object.keys(document.definitions).length > 0) {
    jsonSchema.$defs = document.definitions;
  }
  return jsonSchema;
}
