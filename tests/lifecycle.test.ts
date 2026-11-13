import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { mkdtemp, readFile, writeFile, mkdir, rm, cp, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { ProposalStore, limits, authorizationPayload } from "../src/proposals.js";
import { compiledDigest, sourceDigest } from "../src/provenance.js";

const input = JSON.parse(await readFile("extensions/examples/gravity-jumping.json", "utf8"));
const baseline = JSON.parse(await readFile("conformance/v0.1.json", "utf8"));
const gravity = JSON.parse(await readFile("extensions/examples/gravity-jumping.tests.json", "utf8"));
const temporary = () => mkdtemp(resolve(tmpdir(), "mind-lifecycle-"));
async function repository() {
  const root = await temporary();
  for (const name of ["src", "conformance", "package.json", "package-lock.json", ".gitignore"]) await cp(name, resolve(root, name), { recursive: true });
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init"); git("add", "."); git("-c", "user.name=Tests", "-c", "user.email=tests@example.invalid", "commit", "-m", "candidate fixture checkout");
  await mkdir(resolve(root, "dist"));
  await writeFile(resolve(root, "dist/build-info.json"), JSON.stringify({ sourceRevision: git("rev-parse", "HEAD"), sourceDigest: sourceDigest(root), compiledDigest: compiledDigest() }));
  return { root, revision: git("rev-parse", "HEAD"), store: new ProposalStore(resolve(root, "extensions/proposals"), limits, root) };
}
test("intake is inert, strictly versioned, bounded, and path-constrained", async () => {
  const root = await temporary(); const store = new ProposalStore(root);
  try {
    const p = await store.submit({ ...input, syntax: "$(touch /tmp/never-run); import('node:child_process')" });
    assert.equal((await store.get(p.id)).status, "proposed");
    for (const invalid of [{ ...input, baseLanguageVersion: "2.0.0" }, { ...input, title: "x".repeat(8193) }, { ...input, status: "published" }, { ...input, capabilities: ["__proto__"] }, { ...input, title: 10 }]) await assert.rejects(store.submit(invalid));
    await assert.rejects(store.get("../../etc/passwd"), /Invalid proposal ID/);
    await assert.rejects(store.candidate(p.id, "main", "0.1.0", baseline), /full 40/);
    await assert.rejects(store.candidate(p.id, "a".repeat(40), "0.1.0", []), /acceptance fixtures/);
    await store.reject(p.id, "Needs a language design");
    await assert.rejects(store.candidate(p.id, "a".repeat(40), "0.1.0", baseline), /cannot replace/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("storage quotas, lock contention, record validation, and symlinks fail closed", async () => {
  const root = await temporary();
  try {
    const store = new ProposalStore(root, { ...limits, records: 1 });
    const p = await store.submit(input); await assert.rejects(store.submit(input), /count limit/);
    await assert.rejects(new ProposalStore(root, { ...limits, storageBytes: 1 }).submit(input), /storage limit/);
    await assert.rejects(new ProposalStore(root, { ...limits, recordBytes: 1 }).submit(input), /record size/);
    await writeFile(resolve(root, ".lock"), "busy"); await assert.rejects(store.submit(input), /busy/); await rm(resolve(root, ".lock"));
    await writeFile(resolve(root, p.id + ".json"), '{"status":"published"}'); await assert.rejects(store.get(p.id), /Invalid persisted/);
    await rm(resolve(root, p.id + ".json")); await symlink(resolve("package.json"), resolve(root, p.id + ".json")); await assert.rejects(store.get(p.id));
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("gravity/jumping produce persisted failed evidence, never availability or approval", async () => {
  const { root, store, revision } = await repository();
  try {
    const p = await store.submit(input);
    await store.candidate(p.id, revision, "0.1.0", gravity);
    const result = await store.verify(p.id);
    assert.equal(result.status, "failed");
    assert.ok(result.verification!.results.some(r => r.id === "source-revision" && r.passed));
    assert.ok(result.verification!.results.some(r => r.id === "build-provenance" && r.passed));
    assert.ok(result.verification!.results.some(r => r.error?.includes("Unsupported action: tick")));
    assert.ok(result.verification!.results.some(r => r.id === "capability/gravity" && !r.passed));
    assert.deepEqual((await store.get(p.id)).verification, result.verification);
    await assert.rejects(store.authorize(p.id, "approve", { keyId: "none", signature: "" }, {}), /Invalid lifecycle/);
    await store.candidate(p.id, revision, "0.1.0", gravity);
    assert.equal((await store.get(p.id)).previousCandidates![0].verification!.id, result.verification!.id);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("compatible candidate verifies and requires exact Ed25519 maintainer receipts for approval/publication", async () => {
  const { root, store, revision } = await repository();
  try {
    const p = await store.submit({ ...input, capabilities: ["movement"], title: "Movement compatibility control" });
    await store.candidate(p.id, revision, "0.1.0", baseline);
    const verified = await store.verify(p.id); assert.equal(verified.status, "verified", JSON.stringify(verified.verification));
    await assert.rejects(store.verify(p.id), /candidate state/);
    await assert.rejects(store.candidate(p.id, revision, "0.1.0", baseline), /cannot replace/);
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const keys = { maintainer: publicKey.export({ type: "spki", format: "pem" }).toString() };
    const receipt = (action: "approve" | "publish") => ({ keyId: "maintainer", signature: sign(null, Buffer.from(authorizationPayload(verified, action)), privateKey).toString("base64") });
    await assert.rejects(store.authorize(p.id, "approve", receipt("approve"), {}), /signature required/);
    await assert.rejects(store.authorize(p.id, "publish", receipt("publish"), keys), /Invalid lifecycle/);
    await assert.rejects(store.authorize(p.id, "approve", receipt("publish"), keys), /signature required/);
    const approved = await store.authorize(p.id, "approve", receipt("approve"), keys); assert.equal(approved.status, "approved");
    await assert.rejects(store.authorize(p.id, "publish", receipt("publish"), {}), /revoked/);
    await writeFile(resolve(root, "dirty"), "changed after approval");
    await assert.rejects(store.authorize(p.id, "publish", receipt("publish"), keys), /exact clean/);
    await rm(resolve(root, "dirty"));
    const buildPath = resolve(root, "dist/build-info.json"); const build = await readFile(buildPath, "utf8");
    await writeFile(buildPath, '{}');
    await assert.rejects(store.authorize(p.id, "publish", receipt("publish"), keys), /fresh build/);
    await writeFile(buildPath, build);
    const published = await store.authorize(p.id, "publish", receipt("publish"), keys); assert.equal(published.status, "published");
    const other = await store.submit({ ...input, capabilities: ["movement"] });
    await store.candidate(other.id, revision, "0.1.0", baseline); await store.verify(other.id);
    await assert.rejects(store.authorize(other.id, "approve", receipt("approve"), keys), /signature required/);
    assert.deepEqual(published.history.map(e => e.status), ["proposed", "candidate", "verified", "approved", "published"]);
    await assert.rejects(store.reject(p.id, "Too late"), /finalized/);
    const tampered = structuredClone(published); tampered.candidate!.fixtures[0].source += "garbage";
    await writeFile(resolve(store.folder, p.id + ".json"), JSON.stringify(tampered)); await assert.rejects(store.get(p.id), /Invalid candidate/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("wrong revisions, dirty trees, stale builds, and missing positive coverage cannot verify", async () => {
  const { root, store, revision } = await repository();
  try {
    const p = await store.submit({ ...input, capabilities: ["movement"] });
    await store.candidate(p.id, "a".repeat(40), "0.1.0", baseline); assert.equal((await store.verify(p.id)).status, "failed");
    await writeFile(resolve(root, "untracked"), "dirty");
    await store.candidate(p.id, revision, "0.1.0", baseline); assert.equal((await store.verify(p.id)).status, "failed"); await rm(resolve(root, "untracked"));
    const buildPath = resolve(root, "dist/build-info.json"); const build = await readFile(buildPath, "utf8");
    await writeFile(buildPath, '{}'); await store.candidate(p.id, revision, "0.1.0", baseline); const stale = await store.verify(p.id); assert.equal(stale.status, "failed"); assert.ok(stale.verification!.results.some(r => r.id === "build-provenance" && !r.passed));
    await writeFile(buildPath, build);
    await store.candidate(p.id, revision, "0.1.0", baseline.filter((f: { expect: { error?: string } }) => f.expect.error));
    const negative = await store.verify(p.id); assert.equal(negative.status, "failed"); assert.ok(negative.verification!.results.some(r => r.id === "coverage/movement" && !r.passed));
  } finally { await rm(root, { recursive: true, force: true }); }
});
