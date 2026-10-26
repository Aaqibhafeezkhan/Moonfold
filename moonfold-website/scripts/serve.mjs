import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const production = process.argv.includes("--dist");
const port = Number(process.env.PORT || 4317);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
  ".xml": "application/xml",
};
const server = createServer(async (request, response) => {
  try {
    const route = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relative = route === "/" ? "index.html" : route.replace(/^\/+/, "");
    const base = production
      ? path.join(root, "dist")
      : path.join(
          root,
          relative.startsWith("assets/") || ["robots.txt", "sitemap.xml"].includes(relative)
            ? "public"
            : "src",
        );
    const target = path.resolve(base, relative);
    if (!target.startsWith(base + path.sep) || !(await stat(target)).isFile())
      throw new Error("Not found");
    response.writeHead(200, {
      "Content-Type": types[path.extname(target)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(await readFile(target));
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("Not found");
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Moonfold website: http://127.0.0.1:${port} | PID ${process.pid} | ${production ? "dist" : "source"}`,
  ),
);
