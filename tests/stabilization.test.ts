import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { get } from "node:http";
import { once } from "node:events";
import { runInNewContext } from "node:vm";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { parse, start, move } from "../src/mind.js";
import { checkCapability } from "../src/capabilities.js";
import { createGameServer } from "../src/server.js";

const source = (x: string | number = 0, y: string | number = 0) =>
  `game "Test" { player P at ${x} ${y}; collectible C at 1 0; win when collected == 1; }`;

test("safe integer literal boundaries and invalid programs", () => {
  for (const value of [Number.MIN_SAFE_INTEGER, 0, Number.MAX_SAFE_INTEGER]) {
    assert.equal(parse(source(value, value)).player.x, value);
    assert.equal(parse(source(value, value)).player.y, value);
  }
  for (const value of ["9007199254740992", "9007199254740993", "-9007199254740992", "9".repeat(310)]) {
    assert.throws(() => parse(source(value)), /safe integer/);
    assert.throws(() => parse(source(0, value)), /safe integer/);
    assert.throws(() => parse(source().replace("C at 1", `C at ${value}`)), /safe integer/);
    assert.throws(() => parse(source().replace("collected == 1", `collected == ${value}`)), /safe integer/);
  }
  for (const value of ["1.5", "Infinity", "NaN"]) assert.throws(() => parse(source(value)));
});

test("movement rejects unsafe deltas and results without mutating state", () => {
  const p = parse(source(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER));
  const s = start(p);
  const snapshot = structuredClone(s);
  for (const [dx, dy] of [[1, 0], [0, -1], [Infinity, 0], [0, NaN], [0.5, 0], [2 ** 53, 0], [0, -(2 ** 53)]]) {
    assert.throws(() => move(p, s, dx, dy), /safe integer/);
    assert.deepEqual(s, snapshot);
  }
  assert.equal(move(p, s, -1, 1).player.x, Number.MAX_SAFE_INTEGER - 1);
  const invalid = { ...p, player: { ...p.player, x: Infinity } };
  assert.throws(() => start(invalid), /safe integer/);
  assert.throws(() => move(p, { ...s, player: invalid.player }, 0, 0), /safe integer/);
});

test("inherited capability names are unknown with complete responses", () => {
  for (const name of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
    assert.deepEqual(checkCapability(name), {
      name: name.toLowerCase(), supported: false,
      detail: "Unknown capability; requires review", languageVersion: "0.1.0"
    });
  }
  assert.equal(checkCapability(" MOVEMENT ").supported, true);
});

test("malformed HTTP target returns 400 and server continues serving", async () => {
  const server = createGameServer().listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const request = (path: string) => new Promise<number | undefined>((resolve, reject) => {
    get({ host: "127.0.0.1", port: address.port, path }, response => {
      response.resume(); response.on("end", () => resolve(response.statusCode));
    }).on("error", reject);
  });
  try {
    assert.equal(await request("http://["), 400);
    assert.equal(await request("/"), 200);
    assert.equal(await request("/missing"), 404);
  } finally { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
});

// Execute the actual browser module with a minimal DOM/canvas adapter. This tests
// initialization and event behavior without maintaining a second implementation.
async function browser(sourceText: string) {
  const html = await readFile("web/index.html", "utf8");
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)![1]
    .replace('import { parse, start, move } from "./mind.js";', "");
  type KeyEvent = { key: string; preventDefault?: () => void };
  const listeners: Record<string, (event?: KeyEvent) => void> = {};
  let starts = 0;
  const status = { textContent: "" };
  const restart = { disabled: true, addEventListener: (_: string, listener: () => void) => { listeners.restart = listener; } };
  const ctx = new Proxy({}, { get: () => () => {} });
  const elements: Record<string, unknown> = {
    "#game": { width: 640, height: 480, getContext: () => ctx },
    "#status": status, "#title": { textContent: "" }, "#restart": restart
  };
  await runInNewContext(`(async () => {${script}\n})()`, {
    parse, move, start: (p: Parameters<typeof start>[0]) => { starts++; return start(p); },
    document: { querySelector: (key: string) => elements[key] },
    window: { addEventListener: (key: string, listener: () => void) => { listeners[key] = listener; } },
    fetch: async () => ({ ok: true, text: async () => sourceText }),
    console: { error: () => {} }
  });
  return { status, restart, listeners, starts: () => starts };
}

test("browser rejects invalid programs and Restart cannot bypass initialization", async () => {
  for (const text of [source(20), source(-1), source(0, 12), source("9007199254740993"), "invalid"]) {
    const page = await browser(text);
    assert.match(page.status.textContent, /^Error:/);
    if (text === source(20)) assert.match(page.status.textContent, /16×12 demo grid/);
    const error = page.status.textContent;
    assert.equal(page.restart.disabled, true);
    page.listeners.restart(); // Even invoking a disabled button's handler cannot start.
    page.listeners.keydown({ key: "ArrowRight" });
    assert.equal(page.starts(), 0);
    assert.equal(page.status.textContent, error);
  }
});

test("valid browser program plays, wins and restarts", async () => {
  const page = await browser(source());
  assert.equal(page.restart.disabled, false);
  assert.equal(page.status.textContent, "Collected 0/1");
  page.listeners.keydown({ key: "ArrowRight", preventDefault() {} });
  assert.match(page.status.textContent, /YOU WON!/);
  page.listeners.restart();
  assert.equal(page.status.textContent, "Collected 0/1");
  assert.equal(page.starts(), 2);
});

test("MCP validator reports numeric limits but accepts browser-only out-of-grid coordinates", async () => {
  const client = new Client({ name: "mind-regression", version: "1.0.0" });
  try {
    await client.connect(new StdioClientTransport({ command: process.execPath, args: ["dist/src/mcp.js"], stderr: "pipe" }));
    for (const text of [source(), source(20), source(-1)]) {
      const result = await client.callTool({ name: "mind_validate", arguments: { source: text } });
      assert.notEqual(result.isError, true);
      assert.match(JSON.stringify(result.content), /valid/);
    }
    const invalid = await client.callTool({ name: "mind_validate", arguments: { source: source("9007199254740993") } });
    assert.equal(invalid.isError, true);
    assert.match(JSON.stringify(invalid.content), /safe integer/);
    const capability = await client.callTool({ name: "mind_check_capability", arguments: { name: "__proto__" } });
    assert.match(JSON.stringify(capability.content), /supported\\": false/);
  } finally { await client.close(); }
});
