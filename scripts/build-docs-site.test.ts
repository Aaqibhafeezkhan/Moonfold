// @effect-diagnostics nodeBuiltinImport:off - Builds the real docs into a temporary folder.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { describe, expect, it } from "vite-plus/test";

import { buildDocsSite, headingSlug, rewriteDocLink } from "./build-docs-site.ts";

describe("docs site", () => {
  it("keeps sibling pages on the site and sends other repository files to GitHub", () => {
    expect(rewriteDocLink("./install.md#opening-an-unsigned-build")).toBe(
      "install.html#opening-an-unsigned-build",
    );
    expect(rewriteDocLink("providers-codex.md")).toBe("providers-codex.html");
    expect(rewriteDocLink("../operations/release.md")).toBe(
      "https://github.com/Mr-Dark-debug/Moonfold/blob/main/docs/operations/release.md",
    );
    expect(rewriteDocLink("https://example.com/a.md")).toBe("https://example.com/a.md");
    expect(rewriteDocLink("#usage-hubs")).toBe("#usage-hubs");
  });

  it("makes heading anchors the way GitHub does", () => {
    expect(headingSlug("Connect with ChatGPT")).toBe("connect-with-chatgpt");
    expect(headingSlug("The `moonfold` command")).toBe("the-moonfold-command");
  });

  it("builds a page per user doc whose in-page links resolve", () => {
    const root = NodePath.resolve(import.meta.dirname, "..");
    const output = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "moonfold-docs-site-"));
    try {
      const count = buildDocsSite(NodePath.join(root, "docs", "user"), output);
      const files = NodeFS.readdirSync(output).filter((file) => file.endsWith(".html"));
      expect(files).toHaveLength(count + 1);
      for (const file of files) {
        const html = NodeFS.readFileSync(NodePath.join(output, file), "utf8");
        for (const [, target, anchor] of html.matchAll(/href="([a-z0-9-]+\.html)#([^"]+)"/g)) {
          const linked = NodeFS.readFileSync(NodePath.join(output, target!), "utf8");
          expect(linked, `${file} links to ${target}#${anchor}`).toContain(`id="${anchor}"`);
        }
      }
    } finally {
      NodeFS.rmSync(output, { recursive: true, force: true });
    }
  });
});
