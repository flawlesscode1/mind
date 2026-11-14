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
    const file = { "/": "index.html", "/mind.js": "mind.js", "/program-workflow.js": "program-workflow.js", "/capabilities.js": "capabilities.js", "/workflow-ui.js": "workflow-ui.js", "/two-stars.handoff.json": "two-stars.handoff.json", "/release.js": "release.js", "/game.mind": "game.mind", "/mind.json": "mind.json" }[path];
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
  if (!publicUrl) {
    const delayed = await browser.newPage(); let releaseInitial; let requests = 0;
    await delayed.route("**/game.mind", async route => {
      requests++; await new Promise(resolve => { releaseInitial = resolve; }); await route.continue();
    });
    await delayed.goto(urls[0], { waitUntil: "commit" });
    await delayed.locator("#workshop-fields").waitFor();
    assert.equal(await delayed.locator("#inspect-program").isEnabled(), false, "Cannot inspect/apply while the initial runtime is loading");
    while (!releaseInitial) await new Promise(resolve => setTimeout(resolve, 10));
    releaseInitial();
    await delayed.waitForFunction(() => document.querySelector("#game").dataset.runtimeReady === "true");
    await delayed.waitForFunction(() => !document.querySelector("#workshop-fields").disabled);
    assert.equal(requests, 1, "The workshop must use the running source, not a competing source fetch");
    await delayed.close();
  }
  for (const url of urls) {
    const page = await browser.newPage();
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    const requested = []; page.on("request", req => requested.push(req.url()));
    const response = await page.goto(url);
    assert.equal(response.status(), 200);
    if (process.env.MIND_EXPECTED_REVISION) {
      assert.equal(await page.locator('meta[name="mind-build"]').getAttribute("content"), process.env.MIND_EXPECTED_REVISION, "Public site must match the deployed commit");
    }
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
    // Real human inspection/apply boundary, using the prepared external-agent
    // artifact. This tests replay honestly; it does not simulate an AI response.
    await page.locator("#draft-source").waitFor();
    await page.waitForFunction(() => document.querySelector("#draft-source").value.includes('game "Three Stars"'));
    assert.equal(await page.locator("#approve-program").isEnabled(), false);
    await page.getByRole("button", { name: "Load prepared Codex example (not live generation)", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("#draft-source").value.includes('game "Two Stars Together"'));
    assert.match(await page.locator("#title").textContent(), /Three Stars/);
    await page.locator("#draft-source").press("ArrowRight");
    await page.locator("#draft-source").press("ArrowRight");
    assert.equal(await page.locator("#status").textContent(), "Collected 0/3", "Editing must not move the running game");
    await page.getByRole("button", { name: "Inspect and validate", exact: true }).click();
    assert.match(await page.locator("#program-review").textContent(), /Expected victory: collect 2/);
    assert.match(await page.locator("#program-review").textContent(), /-   collectible Third at 7 1;/);
    assert.equal(await page.locator("#approve-program").isEnabled(), true);
    const candidate = await page.locator("#draft-source").inputValue();
    const originalRequest = await page.locator("#request").inputValue();
    await page.locator("#request").fill("A different human request");
    assert.equal(await page.locator("#approve-program").isEnabled(), false, "Request edits invalidate inspection");
    await page.locator("#request").fill(originalRequest);
    await page.getByRole("button", { name: "Inspect and validate", exact: true }).click();
    await page.locator("#draft-source").fill(candidate + "\n");
    assert.equal(await page.locator("#approve-program").isEnabled(), false, "Source edits invalidate inspection");
    await page.locator("#draft-capabilities").fill("gravity");
    await page.getByRole("button", { name: "Inspect and validate", exact: true }).click();
    assert.match(await page.locator("#review-status").textContent(), /Unavailable capabilities: gravity/);
    assert.equal(await page.locator("#approve-program").isEnabled(), false);
    await page.locator("#draft-capabilities").fill("player,collectible,movement,win");
    await page.locator("#draft-version").fill("99.0.0");
    await page.getByRole("button", { name: "Inspect and validate", exact: true }).click();
    assert.match(await page.locator("#review-status").textContent(), /Unsupported MIND/);
    assert.equal(await page.locator("#approve-program").isEnabled(), false);
    await page.locator("#draft-version").fill("0.1.0");
    await page.locator("#draft-source").fill("game invalid");
    await page.getByRole("button", { name: "Inspect and validate", exact: true }).click();
    assert.match(await page.locator("#review-status").textContent(), /Expected quoted/);
    assert.equal(await page.locator("#approve-program").isEnabled(), false);
    await page.locator("#draft-source").fill(candidate);
    await page.getByRole("button", { name: "Inspect and validate", exact: true }).click();
    await page.getByRole("button", { name: "Approve this source and run", exact: true }).click();
    assert.match(await page.locator("#title").textContent(), /Two Stars Together/);
    assert.equal(await page.locator("#status").textContent(), "Collected 0/2");
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator("#status").textContent(), "YOU WON! Collected 2/2");
    await page.getByRole("button", { name: "Restart", exact: true }).click();
    assert.equal(await page.locator("#status").textContent(), "Collected 0/2");
    assert.match(await page.locator("#source-code").textContent(), /Two Stars Together/);
    assert.match(await page.locator("#running-source-link").getAttribute("href"), /^blob:/);
    const liveSource = await page.locator("#running-source-link").evaluate(async link => (await fetch(link.href)).text());
    assert.equal(liveSource, candidate);
    assert.deepEqual(errors, []);
    console.log("PASS static browser and human inspection workflow:", page.url());
    await page.close();
  }
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
