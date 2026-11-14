import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { once } from "node:events";
import { chromium } from "playwright";

let server;
const publicUrl = process.argv[2];
let urls;
if (publicUrl) {
  const url = new URL(publicUrl);
  if (url.protocol !== "https:") throw new Error("Public smoke test requires HTTPS");
  urls = [url.href];
} else {
  server = createServer(async (req, res) => {
    const path = new URL(req.url, "http://localhost").pathname.replace(/^\/mind\//, "/");
    const file = { "/": "index.html", "/mind.js": "mind.js", "/release.js": "release.js", "/game.mind": "game.mind", "/mind.json": "mind.json" }[path];
    if (!file) { res.writeHead(404); res.end(); return; }
    try {
      const body = await readFile(resolve("_site", file));
      res.writeHead(200, { "Content-Type": file.endsWith(".js") ? "text/javascript" : file.endsWith(".html") ? "text/html" : "text/plain" }); res.end(body);
    } catch { res.writeHead(404); res.end(); }
  }).listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  urls = [base + "/", base + "/mind/"];
}
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
  for (const url of urls) {
    const page = await browser.newPage();
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    const requested = []; page.on("request", req => requested.push(req.url()));
    const response = await page.goto(url);
    assert.equal(response.status(), 200);
    await page.waitForFunction(() => document.querySelector("#status")?.textContent === "Collected 0/3");
    assert.match(await page.title(), /MIND/);
    assert.match(await page.locator("#source-code").textContent(), /collectible Third at 7 1/);
    assert.match(await page.locator("body").textContent(), /does not perform live AI generation/);
    const moduleUrl = new URL("./mind.js", page.url()).href;
    const sourceUrl = new URL("./game.mind", page.url()).href;
    assert.ok(requested.includes(moduleUrl)); assert.ok(requested.includes(sourceUrl));
    assert.equal(new URL(await page.locator('a[href="./game.mind"]').getAttribute("href"), page.url()).href, sourceUrl);
    const sourceResponse = await page.request.get(sourceUrl); assert.equal(sourceResponse.status(), 200);
    assert.match(await sourceResponse.text(), /game "Three Stars"/);
    for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator("#status").textContent(), "YOU WON! Collected 3/3");
    await page.getByRole("button", { name: "Restart" }).click();
    assert.equal(await page.locator("#status").textContent(), "Collected 0/3");
    assert.deepEqual(errors, []);
    // The public artifact is the actual interpreter, not a precomputed game.
    const unsupported = await page.evaluate(async moduleUrl => {
      const { parse } = await import(moduleUrl);
      try { parse('game "Unsupported" { gravity 1; }'); return "accepted"; }
      catch (error) { return error.message; }
    }, moduleUrl);
    assert.match(unsupported, /Unsupported statement/);
    console.log("PASS static browser smoke:", page.url());
    await page.close();
  }
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
