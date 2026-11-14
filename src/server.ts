import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.PORT ?? 3000);
const routes: Record<string, [string, string]> = {
  "/": ["web/index.html", "text/html; charset=utf-8"],
  "/game.mind": ["examples/first_game.mind", "text/plain; charset=utf-8"],
  "/release.js": ["dist/src/release.js", "text/javascript; charset=utf-8"],
  "/mind.json": ["mind.json", "application/json"],
  "/mind.js": ["dist/src/mind.js", "text/javascript; charset=utf-8"]
};
export function createGameServer(gameFile = resolve(root, "examples/first_game.mind")) {
  return createServer(async (req, res) => {
    let pathname: string;
    try { pathname = new URL(req.url ?? "/", "http://localhost").pathname; }
    catch { res.writeHead(400); res.end("Invalid request target"); return; }
    const route = Object.hasOwn(routes, pathname) ? routes[pathname] : undefined;
    if (!route) { res.writeHead(404); res.end("Not found"); return; }
    try {
      const body = await readFile(pathname === "/game.mind" ? gameFile : resolve(root, route[0]));
      res.writeHead(200, { "Content-Type": route[1], "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
      res.end(body);
    } catch (error) {
      if (pathname === "/mind.json" && (error as NodeJS.ErrnoException).code === "ENOENT") { res.writeHead(404); res.end("Unpinned project"); return; }
      res.writeHead(500); res.end("Unable to load game resource");
    }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const gameFile = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : undefined;
  createGameServer(gameFile).listen(port, "127.0.0.1", () => console.log(`MIND browser runtime: http://127.0.0.1:${port}`));
}
