import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile, copyFile, rm } from "node:fs/promises";
import { resolve, dirname, relative } from "node:path";

const output = resolve("_site");
await rm(output, { recursive: true, force: true });
await mkdir(output);
const revision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const html = (await readFile("web/index.html", "utf8")).replace("</head>", `<meta name="mind-build" content="${revision}"></head>`);
await writeFile(resolve(output, "index.html"), html);
await copyFile("examples/yc_collect.mind", resolve(output, "game.mind"));
await writeFile(resolve(output, ".nojekyll"), "");
// Copy the actual compiler output and its relative browser-module dependencies.
// PR #2 adds release.js; this traverses that import without copying Node/MCP code.
const visited = new Set();
async function browserModule(path) {
  const name = relative(resolve("dist/src"), path);
  if (name.startsWith("..") || !name.endsWith(".js")) throw new Error("Browser module outside dist/src");
  if (visited.has(name)) return;
  visited.add(name);
  const source = await readFile(path, "utf8");
  for (const match of source.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g)) {
    if (!match[1].startsWith(".")) throw new Error("Non-browser import: " + match[1]);
    await browserModule(resolve(dirname(path), match[1]));
  }
  await mkdir(dirname(resolve(output, name)), { recursive: true });
  await copyFile(path, resolve(output, name));
}
await browserModule(resolve("dist/src/mind.js"));
// Preserve project pins when building after PR #2 is merged.
try { await copyFile("mind.json", resolve(output, "mind.json")); }
catch (error) { if (error.code !== "ENOENT") throw error; }
console.log("Static MIND playground built in _site/");
