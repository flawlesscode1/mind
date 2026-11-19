import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parse } from "../src/mind.js";
import { fixtures, runFixtures } from "../src/conformance.js";
import { candidateProfile, executeCandidate, hasSolidTileCoverage, solidTiles } from "../src/extension-candidates.js";
import { checkCapability } from "../src/capabilities.js";
import { release } from "../src/release.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const source = await readFile("extensions/examples/solid-tiles/game.mind", "utf8");
const acceptance = fixtures(JSON.parse(await readFile("extensions/examples/solid-tiles/acceptance.json", "utf8")));
const actions = JSON.parse(await readFile("extensions/examples/solid-tiles/actions.json", "utf8"));
test("solid tiles are executable candidate semantics, never released v0.1 syntax or capabilities", () => {
  assert.throws(() => parse(source), /Unsupported statement: wall/);
  assert.throws(() => parse(source, { languageVersion: "0.2.0" }), /Unsupported MIND language version/);
  assert.equal(release.languageVersion, "0.1.0"); assert.equal(checkCapability("solid-tiles").supported, false);
  const profile = candidateProfile("0.2.0")!;
  assert.equal(profile.metadata.active, false); assert.equal(profile.metadata.released, false);
  const results = runFixtures(acceptance, profile.engine);
  assert.ok(results.every(r => r.passed), JSON.stringify(results));
  assert.deepEqual(results, runFixtures(acceptance, profile.engine));
  assert.equal(hasSolidTileCoverage(acceptance[0]), true);
  const fakeCoverage = { ...acceptance[0], source: source.replace("  wall Stone at 2 1;\n", "") };
  assert.equal(hasSolidTileCoverage(fakeCoverage), false);
});
test("candidate execution blocks destinations without mutation and preserves the explicit large-delta rule", () => {
  const result = executeCandidate("0.2.0", source, actions);
  assert.deepEqual(result.trace[0], result.trace[1]);
  assert.equal(result.trace[0].player.x, 1); assert.equal(result.trace.at(-1)!.won, true);
  assert.equal(result.walls![0].name, "Stone"); assert.equal(result.released, false);
  const jumpOver = executeCandidate("0.2.0", source, [{ type: "move", dx: 2, dy: 0 }]);
  assert.equal(jumpOver.trace.at(-1)!.won, true);
  assert.throws(() => executeCandidate("0.2.0", source, [{ type: "move", dx: 0.5, dy: 0 }]), /safe integer/);
  assert.throws(() => executeCandidate("0.2.0", source.replace("Hero at 1 1", "Hero at 9007199254740991 1"), [{ type: "move", dx: 1, dy: 0 }]), /safe integer/);
  assert.throws(() => executeCandidate("0.2.0", source, [{ type: "exec" }]), /data-only/);
  assert.throws(() => executeCandidate("0.2.0", source, new Array(33).fill(actions[0])), /32/);
  assert.throws(() => executeCandidate("99.0.0", source, []), /No installed candidate/);
});
test("MCP catalog distinguishes candidate code from active language; public validation stays closed", async () => {
  const client = new Client({ name: "extension-candidate-test", version: "1" });
  try {
    await client.connect(new StdioClientTransport({ command: process.execPath, args: ["dist/src/mcp.js"], stderr: "pipe" }));
    const catalog = await client.callTool({ name: "mind_get_extension_catalog" });
    const data = JSON.parse((catalog.content as { text: string }[])[0].text);
    assert.equal(data.activeLanguageVersion, "0.1.0"); assert.deepEqual(data.candidates, [solidTiles]);
    const invalid = await client.callTool({ name: "mind_validate", arguments: { source } });
    assert.equal(invalid.isError, true);
    assert.match(JSON.stringify(invalid.content), /Unsupported statement: wall/);
    const tools = (await client.listTools()).tools.map(t => t.name);
    assert.ok(!tools.some(t => /approve|publish|trial/.test(t)));
  } finally { await client.close(); }
});
