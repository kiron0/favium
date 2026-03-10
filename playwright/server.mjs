import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { cwd } from "node:process";
import { extname, join, normalize } from "node:path";

const root = cwd();
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

createServer(async (request, response) => {
  const requestPath =
    request.url === "/" ? "/playwright/fixtures/index.html" : request.url ?? "/";
  const safePath = normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, safePath);

  try {
    const content = await readFile(filePath);
    const extension = extname(filePath);

    response.writeHead(200, {
      "Content-Type": contentTypes[extension] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(content);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(4173, "127.0.0.1");
