import { readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";

const root = fileURLToPath(new URL("../", import.meta.url));
const html = await readFile(path.join(root, "src/index.html"), "utf8");
const css = await readFile(path.join(root, "src/styles.css"), "utf8");
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(ids.length, new Set(ids).size, "Duplicate HTML IDs");
assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, "Expected exactly one h1");
for (const [, fragment] of html.matchAll(/href="#([^"]+)"/g)) {
  assert(ids.includes(fragment), `Broken section link: #${fragment}`);
}
for (const [, fragment] of html.matchAll(/aria-(?:controls|labelledby)="([^"]+)"/g)) {
  for (const id of fragment.split(" ")) assert(ids.includes(id), `Broken ARIA reference: ${id}`);
}
for (const [, attributes] of html.matchAll(/<img\b([^>]+)>/g)) {
  assert(/\balt="/.test(attributes), "Image missing alt attribute");
  assert(
    /\bwidth="/.test(attributes) && /\bheight="/.test(attributes),
    "Image missing intrinsic dimensions",
  );
}
const assets = new Set(
  [...html.matchAll(/(?:src|href|content)="(\/assets\/[^"#?]+)"/g)].map((match) => match[1]),
);
for (const [, set] of html.matchAll(/srcset="([^"]+)"/g)) {
  for (const source of set.split(",")) assets.add(source.trim().split(/\s+/)[0]);
}
for (const [, source] of css.matchAll(/url\(['"]?(\/assets\/[^)'"\s]+)/g)) assets.add(source);
for (const asset of assets) await access(path.join(root, "public", asset));
for (const [, anchor] of html.matchAll(/<a\b([^>]*target="_blank"[^>]*)>/g)) {
  assert(/rel="[^"]*noopener/.test(anchor), "External tab missing noopener");
}
for (const file of ["styles.css", "main.js"]) await access(path.join(root, "src", file));
assert(css.includes("prefers-reduced-motion"), "Reduced motion styles missing");
const config = JSON.parse(await readFile(path.join(root, "vercel.json"), "utf8"));
assert.equal(config.outputDirectory, "dist");
console.log(
  `Source checks passed: ${ids.length} unique IDs, ${assets.size} local assets, valid section and ARIA targets, image dimensions, metadata, reduced motion, and Vercel output configuration.`,
);
