import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.PORT ?? 3000);
const routes: Record<string, [string, string]> = {
  "/": ["web/index.html", "text/html; charset=utf-8"],
  "/game.mind": ["examples/first_game.mind", "text/plain; charset=utf-8"],
  "/mind.js": ["dist/src/mind.js", "text/javascript; charset=utf-8"]
};
const server = createServer(async (req, res) => {
  const route = routes[new URL(req.url ?? "/", "http://localhost").pathname];
  if (!route) { res.writeHead(404); res.end("Not found"); return; }
  try {
    const body = await readFile(resolve(root, route[0]));
    res.writeHead(200, { "Content-Type": route[1], "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    res.end(body);
  } catch { res.writeHead(500); res.end("Unable to load game resource"); }
});
server.listen(port, "127.0.0.1", () => console.log(`MIND browser runtime: http://127.0.0.1:${port}`));
