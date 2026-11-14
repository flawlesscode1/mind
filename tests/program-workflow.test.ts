import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { agentPrompt, inspectProgram, previewProgram, readHandoff } from "../src/program-workflow.js";

const beforeSource = await readFile("examples/yc_collect.mind", "utf8");
const handoff = readHandoff(JSON.parse(await readFile("examples/two-stars.handoff.json", "utf8")));
const source = await readFile("examples/two-stars.mind", "utf8");
const input = { source, beforeSource, languageVersion: handoff.languageVersion, requestedCapabilities: handoff.requestedCapabilities };
const actions = [{ type: "move", dx: 2, dy: 0 }, { type: "move", dx: 2, dy: 0 }];
test("actual agent handoff matches source and inspection explains executable changes", () => {
  assert.equal(handoff.source, source);
  const report = inspectProgram(input);
  assert.equal(report.valid, true); assert.equal(report.canRunInBrowser, true);
  assert.equal(report.summary!.title, "Two Stars Together"); assert.equal(report.summary!.target, 2);
  assert.equal(report.summary!.collectibles.length, 2);
  assert.ok(report.changes.removed.includes("  collectible Third at 7 1;"));
  assert.ok(report.changes.added.includes("  player Hero at 1 2;"));
  assert.equal(report.source, source);
  assert.equal(report.changes.truncated, false);
});
test("execution preview uses interpreter states and reports runtime failure without applying changes", () => {
  const result = previewProgram(input, actions);
  assert.equal(result.status, "won"); assert.deepEqual(result.trace.map(s => s.collected), [0, 1, 2]);
  assert.equal(result.trace[2].player.x, 5);
  const overflow = previewProgram({ source: source.replace("Hero at 1 2", "Hero at 9007199254740991 2") }, [{ type: "move", dx: 1, dy: 0 }]);
  assert.equal(overflow.status, "runtime-error"); assert.equal(overflow.trace.length, 1); assert.match(overflow.errors[0], /safe integer/);
  assert.throws(() => previewProgram(input, [{ type: "exec", code: "process.exit()" }]), /data-only move/);
  assert.throws(() => previewProgram(input, new Array(33).fill(actions[0])), /32/);
});
test("unsupported versions, syntax, browser bounds and capabilities are reported separately", () => {
  const syntax = inspectProgram({ source: source.replace("player Hero", "vehicle Hero") });
  assert.equal(syntax.valid, false); assert.match(syntax.errors[0], /Unsupported statement/);
  assert.equal(previewProgram({ source: "invalid" }).status, "blocked");
  const version = inspectProgram({ ...input, languageVersion: "99.0.0" });
  assert.equal(version.canRunInBrowser, false); assert.match(version.errors[0], /Unsupported MIND/);
  const bounds = inspectProgram({ source: source.replace("Hero at 1 2", "Hero at -1 2") });
  assert.equal(bounds.valid, true); assert.equal(bounds.canRunInBrowser, false); assert.match(bounds.errors[0], /16×12/);
  const missing = inspectProgram({ ...input, requestedCapabilities: ["gravity", "jumping", "constructor"] });
  assert.equal(missing.valid, true); assert.equal(missing.canRunInBrowser, false);
  assert.deepEqual(missing.missingCapabilities, ["gravity", "jumping", "constructor"]);
  assert.equal(previewProgram({ ...input, requestedCapabilities: ["gravity"] }, actions).status, "blocked");
});
test("handoff and request bounds prevent execution instructions from becoming host code", () => {
  const p = readHandoff({ ...handoff, ignoredCode: "import('node:child_process')" });
  assert.equal("ignoredCode" in p, false);
  assert.match(agentPrompt("Make two collectibles"), /mind_inspect_program/);
  assert.match(agentPrompt("Make two collectibles"), /A human will inspect/);
  assert.throws(() => agentPrompt("x".repeat(4097)), /oversized/);
  assert.throws(() => inspectProgram({ source: "x".repeat(65537) }), /oversized/);
  assert.throws(() => readHandoff({ ...handoff, schemaVersion: 2 }), /Unsupported/);
  assert.throws(() => readHandoff({ ...handoff, requestedCapabilities: ["../../exec"] }), /capability IDs/);
});
test("real external-agent MCP handoff: discover, inspect, execute preview, and reject unavailable requests", async () => {
  const client = new Client({ name: "codex-program-workflow", version: "1" });
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const result = await client.callTool({ name, arguments: args });
    assert.notEqual(result.isError, true, JSON.stringify(result));
    return JSON.parse((result.content as { text: string }[])[0].text);
  };
  try {
    await client.connect(new StdioClientTransport({ command: process.execPath, args: ["dist/src/mcp.js"], stderr: "pipe" }));
    assert.equal((await call("mind_get_version")).languageVersion, handoff.languageVersion);
    assert.equal((await call("mind_validate", { source, languageVersion: handoff.languageVersion })).valid, true);
    const inspected = await call("mind_inspect_program", input);
    assert.equal(inspected.canRunInBrowser, true); assert.equal(inspected.summary.target, 2);
    const result = await call("mind_preview_program", { ...input, actions });
    assert.equal(result.status, "won"); assert.equal(result.trace[2].collected, 2);
    const blocked = await call("mind_inspect_program", { ...input, requestedCapabilities: ["gravity"] });
    assert.deepEqual(blocked.missingCapabilities, ["gravity"]); assert.equal(blocked.canRunInBrowser, false);
    const malformed = await client.callTool({ name: "mind_preview_program", arguments: { ...input, actions: [{ type: "move", dx: 1, dy: 0, exec: "untrusted" }] } });
    assert.equal(malformed.isError, true);
  } finally { await client.close(); }
});
