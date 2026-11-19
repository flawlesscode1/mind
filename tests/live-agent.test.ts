// Provider fixtures below are synthetic contract tests, not live AI evidence.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { generateProgram, invokeCodex, summarizeEvents, validateGeneration, type ProviderResult } from "../src/agents/codex.js";

const source = await readFile("examples/two-stars.mind", "utf8");
const successful: ProviderResult = { exitCode: 0, outcome: "closed", eventCounts: { "turn.completed": 1 }, toolUsed: false, output: { source, requestedCapabilities: ["movement", "collectible", "win"] } };
test("provider output cannot assert its own validity, version, provenance or approval", () => {
  const p = validateGeneration("Two stars", successful.output);
  assert.equal(p.inspection.canRunInBrowser, true); assert.equal(p.handoff.request, "Two stars");
  assert.equal(p.handoff.languageVersion, "0.1.0"); assert.equal(p.sourceSha256.length, 64);
  assert.throws(() => validateGeneration("Two", { ...successful.output as object, valid: true }), /Unexpected provider/);
  assert.throws(() => validateGeneration("Two", { source }), /requires requestedCapabilities/);
});
test("generation contract independently validates output without executing or approving it", async () => {
  const result = await generateProgram("Two stars", "/unused", async (prompt) => {
    assert.match(prompt, /use no tools/); assert.match(prompt, /human must explicitly approve/);
    return successful;
  });
  assert.equal(result.status, "generated"); assert.equal("approval" in result, false);
  assert.equal("trace" in result, true); assert.equal("preview" in result, false);
  const invalid = await generateProgram("Two", "/unused", async () => ({ ...successful, output: { source: "not MIND", requestedCapabilities: [] } }));
  assert.equal(invalid.status, "invalid");
  const unsupported = await generateProgram("Gravity", "/unused", async () => ({ ...successful, output: { source, requestedCapabilities: ["gravity"] } }));
  assert.equal(unsupported.status, "invalid");
});
test("provider failures, timeouts, unexpected tools and missing output never become success", async () => {
  for (const changes of [
    { exitCode: 1, failureCode: "provider-runtime-read-only" },
    { outcome: "timeout" as const }, { outcome: "unavailable" as const },
    { outcome: "output-limit" as const }, { toolUsed: true }, { output: undefined }
  ]) {
    const result = await generateProgram("Two", "/unused", async () => ({ ...successful, ...changes }));
    assert.equal(result.status, "blocked"); assert.equal("handoff" in result, false);
  }
  let called = false;
  await assert.rejects(generateProgram("x".repeat(4097), "/unused", async () => { called = true; return successful; }), /4096/);
  assert.equal(called, false);
});
test("sanitized trace keeps counts, not model reasoning, commands, messages or credential text", async () => {
  const events = summarizeEvents([
    JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "SECRET-MESSAGE" } }),
    JSON.stringify({ type: "item.completed", item: { type: "reasoning", text: "SECRET-REASONING" } }),
    JSON.stringify({ type: "item.started", item: { type: "command_execution", command: "SECRET-COMMAND" } }),
    JSON.stringify({ type: "__proto__" }), "SECRET-RAW"
  ].join("\n"));
  assert.equal(events.toolUsed, true); assert.equal(events.eventCounts["item.completed"], 2);
  assert.equal(Object.hasOwn(events.eventCounts, "__proto__"), true);
  assert.doesNotMatch(JSON.stringify(events), /SECRET/);
  const result = await generateProgram("Nonsecret request", "/unused", async () => ({ ...successful, rawStderr: "SECRET-AUTH" }));
  assert.doesNotMatch(JSON.stringify(result.trace), /SECRET-AUTH/);
});
test("invalid provider timeout is rejected before spawning Codex", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "mind-agent-"));
  try { await assert.rejects(invokeCodex("request", root, 0), /timeout/); }
  finally { await rm(root, { recursive: true, force: true }); }
});
