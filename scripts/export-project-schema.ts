// @effect-diagnostics nodeBuiltinImport:off - Writes one generated file from the shell.
// Writes schemas/moonfold.json, the published JSON Schema for moonfold.json project files.
import * as FS from "node:fs";
import * as Path from "node:path";

import { buildMoonfoldProjectFileJsonSchema } from "@moonfold/shared/moonfoldProjectFile";

const target = Path.resolve(import.meta.dirname, "..", "schemas", "moonfold.json");
FS.mkdirSync(Path.dirname(target), { recursive: true });
FS.writeFileSync(target, `${JSON.stringify(buildMoonfoldProjectFileJsonSchema(), null, 2)}\n`);
