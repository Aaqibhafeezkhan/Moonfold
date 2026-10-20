// @effect-diagnostics nodeBuiltinImport:off globalConsole:off - A maintainer audit script that reads log files.
/**
 * Scans Moonfold log files for credentials with the same scanner the handoff brief uses, and
 * prints counts by kind and file. Values are never printed.
 *
 *   node scripts/scan-logs-for-secrets.ts <logs-dir>
 */
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import { mergeSecretFindings, redactSecrets } from "@moonfold/shared/secretRedaction";

const root = process.argv[2];
if (root === undefined) {
  console.error("Usage: node scripts/scan-logs-for-secrets.ts <logs-dir>");
  process.exit(2);
}

const files: Array<string> = [];
const walk = (directory: string) => {
  for (const entry of NodeFS.readdirSync(directory, { withFileTypes: true })) {
    const full = NodePath.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(log|ndjson|txt|json)$/.test(entry.name)) files.push(full);
  }
};
walk(root);

let total = 0;
const all: Array<ReturnType<typeof redactSecrets>["findings"]> = [];
for (const file of files) {
  const text = NodeFS.readFileSync(file, "utf8");
  const { findings } = redactSecrets(text);
  if (findings.length === 0) continue;
  all.push(findings);
  const count = findings.reduce((sum, finding) => sum + finding.count, 0);
  total += count;
  console.log(
    `${NodePath.relative(root, file)}: ${findings.map((f) => `${f.kind}×${f.count}`).join(", ")}`,
  );
}
console.log(
  `Scanned ${files.length} files; ${total} findings: ${
    mergeSecretFindings(all)
      .map((f) => `${f.kind}×${f.count}`)
      .join(", ") || "none"
  }`,
);
