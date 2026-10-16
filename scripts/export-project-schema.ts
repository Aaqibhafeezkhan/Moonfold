// @effect-diagnostics nodeBuiltinImport:off - Writes one generated file from the shell.
// Writes schemas/moonfold.json, the published JSON Schema for moonfold.json project files.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import { buildMoonfoldProjectFileJsonSchema } from "@moonfold/shared/moonfoldProjectFile";

const target = NodePath.resolve(import.meta.dirname, "..", "schemas", "moonfold.json");
NodeFS.mkdirSync(NodePath.dirname(target), { recursive: true });
NodeFS.writeFileSync(target, `${JSON.stringify(buildMoonfoldProjectFileJsonSchema(), null, 2)}\n`);
