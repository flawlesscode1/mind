import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { once } from "node:events";
import { parse, start, move } from "../src/mind.js";
import { createGameServer } from "../src/server.js";

test("YC source executes deterministically and MCP client reports validity and unsupported mechanics", async () => {
  const source = await readFile("examples/yc_collect.mind", "utf8");
  const p = parse(source); let s = start(p);
  assert.equal(p.title, "Three Stars");
  for (let step = 1; step <= 6; step++) {
    s = move(p, s, 1, 0);
    assert.equal(s.collected, Math.floor(step / 2));
    assert.equal(s.won, step === 6);
  }
  const valid = spawnSync(process.execPath, ["scripts/yc-demo.mjs", "validate", "examples/yc_collect.mind"], { encoding: "utf8" });
  assert.equal(valid.status, 0, valid.stderr); assert.match(valid.stdout, /"valid": true/);
  for (const name of ["gravity", "jumping"]) {
    const capability = spawnSync(process.execPath, ["scripts/yc-demo.mjs", "capability", name], { encoding: "utf8" });
    assert.equal(capability.status, 0, capability.stderr); assert.match(capability.stdout, /"supported": false/);
  }
  const root = await mkdtemp(resolve(tmpdir(), "mind-yc-"));
  try {
    const path = resolve(root, "bad.mind"); await writeFile(path, "game invalid");
    const invalid = spawnSync(process.execPath, ["scripts/yc-demo.mjs", "validate", path], { encoding: "utf8" });
    assert.equal(invalid.status, 1); assert.match(invalid.stdout, /Expected quoted game title/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("browser serves the selected genuine source while the default example remains available", async () => {
  for (const filename of [undefined, resolve("examples/yc_collect.mind")]) {
    const server = createGameServer(filename).listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      const address = server.address(); assert.ok(address && typeof address !== "string");
      const source = await (await fetch(`http://127.0.0.1:${address.port}/game.mind`)).text();
      assert.equal(source, await readFile(filename ?? "examples/first_game.mind", "utf8"));
      const page = await (await fetch(`http://127.0.0.1:${address.port}/`)).text();
      assert.match(page, /href="\/game.mind"/);
    } finally { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
  }
});
