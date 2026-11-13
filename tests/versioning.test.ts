import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { digest } from "../src/proposals.js";
import { release, requireVersion } from "../src/release.js";
import { projectVersion } from "../src/project.js";
import { parse } from "../src/mind.js";
import { fixtures, runFixtures } from "../src/conformance.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const source = await readFile("examples/first_game.mind", "utf8");
const baseline = fixtures(JSON.parse(await readFile("conformance/v0.1.json", "utf8")));
test("conformance fixtures pass deterministically and every advertised capability has positive evidence", () => {
  assert.equal(digest(baseline), release.compatibility.conformance.sha256);
  const results = runFixtures(baseline);
  assert.ok(results.every(r => r.passed), JSON.stringify(results));
  assert.deepEqual(runFixtures(baseline), results);
  for (const [name, capability] of Object.entries(release.capabilities)) {
    if (capability.supported) {
      assert.ok(capability.fixtures.length);
      for (const id of capability.fixtures) assert.ok(baseline.some(f => f.id === id && f.capabilities?.includes(name) && "states" in f.expect && f.actions?.length));
    }
  }
  assert.equal(release.capabilities.gravity.supported, false);
  assert.equal(release.capabilities.jumping.supported, false);
});
test("legacy and pinned programs are equivalent; unsupported versions are actionable", () => {
  assert.deepEqual(parse(source), parse(source, { languageVersion: release.languageVersion }));
  assert.throws(() => parse(source, { languageVersion: "99.0.0" }), /Unsupported MIND.*supported:.*mind.json/);
  assert.throws(() => requireVersion(null), /Unsupported/);
  assert.throws(() => parse("x".repeat(65537)), /exceeds/);
});
test("project pins apply to CLI ancestors and malformed or unsupported pins fail closed", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "mind-pins-"));
  try {
    const nested = resolve(root, "src"); await mkdir(nested);
    const file = resolve(nested, "game.mind"); await writeFile(file, source);
    assert.equal(await projectVersion(file), release.languageVersion);
    await writeFile(resolve(root, "mind.json"), JSON.stringify({ languageVersion: release.languageVersion }));
    assert.equal(await projectVersion(file), release.languageVersion);
    const cli = resolve("dist/src/cli.js");
    assert.equal(spawnSync(process.execPath, [cli, file], { encoding: "utf8" }).status, 0);
    await writeFile(resolve(root, "mind.json"), '{"languageVersion":"99.0.0"}');
    await assert.rejects(projectVersion(file), /Unsupported/);
    const invalid = spawnSync(process.execPath, [cli, file], { encoding: "utf8" });
    assert.equal(invalid.status, 1); assert.match(invalid.stderr, /Unsupported/);
    await writeFile(resolve(root, "mind.json"), '{}'); await assert.rejects(projectVersion(file), /requires languageVersion/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("negative fixtures include unsupported syntax and unsupported versions", () => {
  const f = fixtures([{ id: "unsupported-version", source, languageVersion: "99.0.0", expect: { error: "Unsupported MIND" } }]);
  assert.equal(runFixtures(f)[0].passed, true);
  assert.ok(baseline.filter(f => "error" in f.expect).length >= 5);
  assert.throws(() => fixtures([{ id: "bad", source, expect: { error: ".*" }, actions: [] }]), /Negative fixtures/);
});
test("MCP discovery, version-aware intake, errors, and status remain non-privileged", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "mind-mcp-"));
  const client = new Client({ name: "mind-version-tests", version: "1" });
  const decode = (result: Awaited<ReturnType<typeof client.callTool>>) => {
    const content = result.content as { type: string; text: string }[];
    return JSON.parse(content[0].text);
  };
  try {
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [resolve("dist/src/mcp.js")], cwd: root, stderr: "pipe" }));
    const names = (await client.listTools()).tools.map(t => t.name);
    assert.ok(names.includes("mind_get_version")); assert.ok(names.includes("mind_list_capabilities"));
    assert.ok(!names.some(n => /approve|publish|candidate|verify/.test(n)));
    assert.deepEqual(decode(await client.callTool({ name: "mind_get_version" })), release);
    assert.equal(decode(await client.callTool({ name: "mind_list_capabilities" })).capabilities.gravity.supported, false);
    const spec = await client.callTool({ name: "mind_get_spec" }); assert.notEqual(spec.isError, true);
    const invalid = await client.callTool({ name: "mind_validate", arguments: { source, languageVersion: "99.0.0" } });
    assert.equal(invalid.isError, true); assert.match(JSON.stringify(invalid.content), /Unsupported MIND/);
    const valid = await client.callTool({ name: "mind_validate", arguments: { source, languageVersion: release.languageVersion } });
    assert.equal(decode(valid).languageVersion, release.languageVersion);
    const input = JSON.parse(await readFile("extensions/examples/gravity-jumping.json", "utf8"));
    const submitted = decode(await client.callTool({ name: "mind_propose_extension", arguments: input }));
    assert.equal(submitted.status, "proposed"); assert.equal(submitted.baseLanguageVersion, release.languageVersion);
    assert.equal(decode(await client.callTool({ name: "mind_get_proposal_status", arguments: { id: submitted.id } })).id, submitted.id);
    for (const request of [
      { name: "mind_get_version", arguments: { unexpected: true } },
      { name: "mind_propose_extension", arguments: { ...input, baseLanguageVersion: "99.0.0" } },
      { name: "mind_propose_extension", arguments: { ...input, title: "x".repeat(8193) } },
      { name: "mind_validate", arguments: { source: "x".repeat(65537) } },
      { name: "mind_propose_extension", arguments: { ...input, status: "approved" } },
      { name: "mind_approve", arguments: {} }
    ]) assert.equal((await client.callTool(request)).isError, true);
  } finally { await client.close(); await rm(root, { recursive: true, force: true }); }
});
