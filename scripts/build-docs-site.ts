// @effect-diagnostics nodeBuiltinImport:off - A static site build run from the shell and CI.
/**
 * Builds the user documentation site published on GitHub Pages from `docs/user/*.md`. Pages keep
 * their file names (`install.md` becomes `install.html`); links that leave `docs/user` point at
 * the file on GitHub.
 *
 *   node scripts/build-docs-site.ts [output-dir]   (default: site/)
 */
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

import { Marked } from "marked";

import { monoMark, MOONFOLD_COLORS, placeMark } from "./lib/brand-mark.ts";

const REPOSITORY_URL = "https://github.com/Mr-Dark-debug/Moonfold";

/** Sidebar sections; pages not listed fall into "More". */
const SECTIONS: ReadonlyArray<{ readonly title: string; readonly pages: ReadonlyArray<string> }> = [
  {
    title: "Get started",
    pages: ["install", "welcome-wizard", "updating", "remote-access", "background-service"],
  },
  {
    title: "Work with agents",
    pages: [
      "thread-sidebar",
      "composer",
      "permission-modes",
      "provider-handoff",
      "usage",
      "scheduled-tasks",
      "memories",
      "plugins",
      "agent-instructions",
      "artifacts",
      "computer-use",
      "agent-browsing",
    ],
  },
  {
    title: "Providers",
    pages: [
      "providers-codex",
      "providers-claude",
      "providers-gemini",
      "providers-acp",
      "cursor",
      "providers-opencode",
      "providers-antigravity",
      "providers-pi",
      "providers-muse",
    ],
  },
];

export interface DocPage {
  readonly name: string;
  readonly title: string;
  readonly markdown: string;
}

const escapeHtml = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/** Rewrites a link found in docs/user: sibling pages become .html, anything else goes to GitHub. */
export function rewriteDocLink(href: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("#")) return href;
  const [path = "", hash] = href.split("#", 2);
  const suffix = hash === undefined ? "" : `#${hash}`;
  const sibling = /^(?:\.\/)?([a-z0-9-]+)\.md$/i.exec(path);
  if (sibling) return `${sibling[1]}.html${suffix}`;
  const resolved = NodePath.posix.normalize(NodePath.posix.join("docs/user", path));
  if (resolved.startsWith("..")) return href;
  return `${REPOSITORY_URL}/blob/main/${resolved}${suffix}`;
}

/** GitHub's heading anchor: lowercase, punctuation dropped, spaces to hyphens. */
export function headingSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s/g, "-");
}

export function readDocPages(directory: string): ReadonlyArray<DocPage> {
  return NodeFS.readdirSync(directory)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const markdown = NodeFS.readFileSync(NodePath.join(directory, file), "utf8");
      const title = /^#\s+(.+)$/m.exec(markdown)?.[1]?.trim() ?? file;
      return { name: file.slice(0, -3), title, markdown };
    });
}

function navigation(pages: ReadonlyArray<DocPage>, current: string): string {
  const byName = new Map(pages.map((page) => [page.name, page]));
  const listed = new Set(SECTIONS.flatMap((section) => section.pages));
  const sections = [
    ...SECTIONS,
    {
      title: "More",
      pages: pages
        .filter((page) => !listed.has(page.name))
        .map((page) => page.name)
        .toSorted(),
    },
  ];
  return sections
    .map((section) => {
      const items = section.pages
        .map((name) => byName.get(name))
        .filter((page) => page !== undefined)
        .map(
          (page) =>
            `<li><a href="${page.name}.html"${page.name === current ? ' aria-current="page"' : ""}>${escapeHtml(page.title)}</a></li>`,
        );
      return items.length === 0
        ? ""
        : `<h2>${escapeHtml(section.title)}</h2><ul>${items.join("")}</ul>`;
    })
    .join("");
}

const STYLE = `:root{--bg:#fbfaf6;--fg:#1b2254;--muted:#4a5288;--accent:#3d4fe6;--line:#e6e2d6;--code:#f1eee4}
@media (prefers-color-scheme:dark){:root{--bg:#0a0e26;--fg:#ece9de;--muted:#a3abd6;--accent:#8c9bff;--line:#252c5e;--code:#141a3d}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:var(--accent)}a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.skip{position:absolute;left:-999px}.skip:focus{left:16px;top:8px;background:var(--bg);padding:4px 8px}
header{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--line)}
header a{color:var(--fg);text-decoration:none;font-weight:700}header svg{width:28px;height:28px}
.layout{display:grid;grid-template-columns:260px minmax(0,1fr);max-width:1180px;margin:0 auto}
nav{padding:16px;border-right:1px solid var(--line)}nav h2{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:18px 0 6px}
nav ul{list-style:none;margin:0;padding:0}nav li a{display:block;padding:3px 0;color:var(--fg);text-decoration:none}
nav li a[aria-current]{color:var(--accent);font-weight:600}
main{padding:16px 32px 64px;min-width:0}main h1{font-size:32px;line-height:1.2}
pre{background:var(--code);padding:12px;overflow-x:auto;border-radius:6px}code{background:var(--code);padding:1px 4px;border-radius:4px}
pre code{padding:0}table{border-collapse:collapse;display:block;overflow-x:auto}th,td{border:1px solid var(--line);padding:6px 10px;text-align:left;vertical-align:top}
blockquote{margin:0;padding-left:12px;border-left:3px solid var(--line);color:var(--muted)}
footer{max-width:1180px;margin:0 auto;padding:16px;color:var(--muted);font-size:14px;border-top:1px solid var(--line)}
@media (max-width:760px){.layout{grid-template-columns:1fr}nav{border-right:0;border-bottom:1px solid var(--line)}main{padding:16px}}`;

const MARK = `<svg viewBox="0 0 1024 1024" aria-hidden="true">${monoMark(placeMark(960, 512, 512), MOONFOLD_COLORS.periwinkle)}</svg>`;

function page(input: { title: string; nav: string; body: string; editUrl?: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(input.title)} · Moonfold docs</title>
<style>${STYLE}</style>
</head>
<body>
<a class="skip" href="#content">Skip to content</a>
<header>${MARK}<a href="index.html">Moonfold docs</a><span style="flex:1"></span><a href="${REPOSITORY_URL}">GitHub</a></header>
<div class="layout">
<nav aria-label="Documentation">${input.nav}</nav>
<main id="content">${input.body}</main>
</div>
<footer>Moonfold is open source under the MIT license. It is not affiliated with or endorsed by the makers of the agents it runs. <a href="${input.editUrl ?? `${REPOSITORY_URL}/edit/main/docs/user`}">Edit this page</a>.</footer>
</body>
</html>
`;
}

const INDEX = `# Moonfold documentation

Moonfold runs the coding agents you already use (Codex, Claude Code, Gemini CLI and other agent
CLIs) on your own machine with your own logins, in one desktop and web app. When an agent hits its
usage limit, Moonfold can continue the same task in another agent with the context carried over.

- New here? Start with [Install Moonfold](install.md).
- Hit a usage limit? Read [Provider handoff](provider-handoff.md).
- Working from another device? See [Remote access](remote-access.md).

Downloads are on the [releases page](${REPOSITORY_URL}/releases).
`;

export function buildDocsSite(sourceDir: string, outputDir: string): number {
  const pages = readDocPages(sourceDir);
  const slugCounts = new Map<string, number>();
  const marked = new Marked({
    gfm: true,
    walkTokens: (token) => {
      if (token.type === "link") token.href = rewriteDocLink(token.href);
    },
    renderer: {
      heading({ tokens, depth, text }) {
        const base = headingSlug(text);
        const seen = slugCounts.get(base) ?? 0;
        slugCounts.set(base, seen + 1);
        const id = seen === 0 ? base : `${base}-${seen}`;
        return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
      },
    },
  });
  NodeFS.rmSync(outputDir, { recursive: true, force: true });
  NodeFS.mkdirSync(outputDir, { recursive: true });
  for (const doc of pages) {
    slugCounts.clear();
    const body = marked.parse(doc.markdown, { async: false });
    NodeFS.writeFileSync(
      NodePath.join(outputDir, `${doc.name}.html`),
      page({
        title: doc.title,
        nav: navigation(pages, doc.name),
        body,
        editUrl: `${REPOSITORY_URL}/edit/main/docs/user/${doc.name}.md`,
      }),
    );
  }
  slugCounts.clear();
  NodeFS.writeFileSync(
    NodePath.join(outputDir, "index.html"),
    page({
      title: "Documentation",
      nav: navigation(pages, ""),
      body: marked.parse(INDEX, { async: false }),
    }),
  );
  // GitHub Pages would otherwise run Jekyll over the output.
  NodeFS.writeFileSync(NodePath.join(outputDir, ".nojekyll"), "");
  return pages.length;
}

if (process.argv[1] === NodeURL.fileURLToPath(import.meta.url)) {
  const root = NodePath.resolve(NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)), "..");
  const output = NodePath.resolve(process.argv[2] ?? NodePath.join(root, "site"));
  const count = buildDocsSite(NodePath.join(root, "docs", "user"), output);
  process.stdout.write(`Built ${count} pages into ${output}\n`);
}
