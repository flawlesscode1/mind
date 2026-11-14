import { createHash, randomUUID, verify as verifySignature } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, readdir, lstat, rename, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { sourceDigest, compiledDigest } from "./provenance.js";
import { release, requireVersion } from "./release.js";
import { checkCapability } from "./capabilities.js";
import { fixtures, runFixtures, type Fixture } from "./conformance.js";

const exec = promisify(execFile);
export const limits = { fieldBytes: 8192, inputBytes: 65536, recordBytes: 262144, records: 100, storageBytes: 5242880 };
export type ProposalInput = {
  baseLanguageVersion: string; title: string; motivation: string; syntax: string;
  semantics: string; tests: string; compatibility: string; capabilities: string[];
};
export type Candidate = { id: string; sourceRevision: string; targetLanguageVersion: string; fixtureHash: string; fixtures: Fixture[] };
export type Evidence = {
  id: string; candidateId: string; sourceRevision: string; fixtureHash: string;
  baselineHash: string; nodeVersion: string; createdAt: string; passed: boolean;
  results: { id: string; passed: boolean; error?: string }[];
};
export type Status = "proposed" | "candidate" | "verified" | "approved" | "published" | "rejected" | "failed";
export type Authorization = { keyId: string; signature: string };
export type Proposal = ProposalInput & {
  schemaVersion: 1; id: string; status: Status; createdAt: string;
  candidate?: Candidate; verification?: Evidence;
  approval?: Authorization; publication?: Authorization;
  previousCandidates?: { candidate: Candidate; verification?: Evidence }[];
  history: { status: Status; at: string; detail: string }[];
};
export const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function text(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string" || !value.trim() || Buffer.byteLength(value) > limits.fieldBytes) throw new Error(`Invalid or oversized field: ${name}`);
}
function input(value: unknown): ProposalInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected proposal object");
  const p = value as ProposalInput;
  const fields = ["baseLanguageVersion", "title", "motivation", "syntax", "semantics", "tests", "compatibility", "capabilities"];
  if (Object.keys(p).some(k => !fields.includes(k))) throw new Error("Unexpected proposal field");
  for (const key of fields.slice(0, -1)) text(p[key as keyof ProposalInput], key);
  requireVersion(p.baseLanguageVersion);
  if (!Array.isArray(p.capabilities) || !p.capabilities.length || p.capabilities.length > 16 || p.capabilities.some(c => typeof c !== "string" || !/^[a-z0-9-]{1,64}$/.test(c)) || new Set(p.capabilities).size !== p.capabilities.length) throw new Error("Expected 1–16 unique capability IDs");
  if (Buffer.byteLength(JSON.stringify(p)) > limits.inputBytes) throw new Error("Proposal exceeds 64 KiB");
  return structuredClone(p);
}
function id(value: string) { if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value)) throw new Error("Invalid proposal ID"); return value; }
function transition(p: Proposal, status: Status, detail: string) {
  if (p.history.length >= 32) throw new Error("Proposal history limit reached");
  p.status = status; p.history.push({ status, at: new Date().toISOString(), detail });
}
export async function readLimited(path: string, maxBytes: number): Promise<string> {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > maxBytes) throw new Error("File exceeds size limit or is not a regular file");
    const bytes = Buffer.alloc(maxBytes + 1);
    let size = 0;
    while (size < bytes.length) {
      const chunk = await file.read(bytes, size, bytes.length - size, null);
      if (!chunk.bytesRead) break;
      size += chunk.bytesRead;
    }
    if (size > maxBytes) throw new Error("File exceeds size limit");
    return bytes.subarray(0, size).toString("utf8");
  } finally { await file.close(); }
}

// The local filesystem owner is trusted. Agents only get submit/status through MCP.
// A cross-process exclusive lock makes quotas and transitions atomic. Stale locks
// fail closed and require the owner to inspect/remove them after a crashed writer.
export class ProposalStore {
  constructor(readonly folder = resolve(process.cwd(), "extensions/proposals"), readonly quota = limits, readonly repository = process.cwd()) {}
  private async locked<T>(action: () => Promise<T>): Promise<T> {
    await mkdir(this.folder, { recursive: true, mode: 0o700 });
    if (!(await lstat(this.folder)).isDirectory() || (await lstat(this.folder)).isSymbolicLink()) throw new Error("Invalid proposal directory");
    const lockPath = resolve(this.folder, ".lock");
    const lock = await open(lockPath, "wx", 0o600).catch(() => { throw new Error("Proposal store busy; inspect .lock if a writer crashed"); });
    try { return await action(); } finally { await lock.close(); await unlink(lockPath); }
  }
  private path(proposalId: string) { return resolve(this.folder, id(proposalId) + ".json"); }
  private async save(p: Proposal, fresh = false) {
    const body = JSON.stringify(p, null, 2) + "\n";
    if (Buffer.byteLength(body) > this.quota.recordBytes) throw new Error("Proposal record size limit exceeded");
    const entries = (await readdir(this.folder)).filter(n => n !== ".lock");
    if (fresh && entries.length >= this.quota.records) throw new Error("Proposal count limit exceeded");
    let bytes = 0;
    for (const name of entries) {
      if (name === p.id + ".json") continue;
      const stat = await lstat(resolve(this.folder, name));
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Unexpected proposal storage entry");
      bytes += stat.size;
    }
    if (bytes + Buffer.byteLength(body) > this.quota.storageBytes) throw new Error("Proposal storage limit exceeded");
    const temporary = resolve(this.folder, `.${randomUUID()}.tmp`);
    const file = await open(temporary, "wx", 0o600);
    try { await file.writeFile(body); await file.sync(); } finally { await file.close(); }
    try { await rename(temporary, this.path(p.id)); } finally { await unlink(temporary).catch(() => {}); }
  }
  async submit(value: unknown): Promise<Proposal> {
    const fields = input(value);
    return this.locked(async () => {
      const p: Proposal = { ...fields, schemaVersion: 1, id: randomUUID(), status: "proposed", createdAt: new Date().toISOString(), history: [] };
      transition(p, "proposed", "Untrusted design request; no code executed"); await this.save(p, true); return p;
    });
  }
  async get(proposalId: string): Promise<Proposal> {
    const p = JSON.parse(await readLimited(this.path(proposalId), this.quota.recordBytes)) as Proposal;
    if (p.schemaVersion !== 1 || p.id !== proposalId || !["proposed", "candidate", "verified", "approved", "published", "rejected", "failed"].includes(p.status) || !Array.isArray(p.history)) throw new Error("Invalid persisted proposal record");
    input(Object.fromEntries(["baseLanguageVersion", "title", "motivation", "syntax", "semantics", "tests", "compatibility", "capabilities"].map(k => [k, p[k as keyof Proposal]])));
    if (p.candidate && (p.candidate.fixtureHash !== digest(fixtures(p.candidate.fixtures)) || !/^[a-f0-9]{40}$/.test(p.candidate.sourceRevision) || p.candidate.id !== digest({ sourceRevision: p.candidate.sourceRevision, targetLanguageVersion: p.candidate.targetLanguageVersion, fixtureHash: p.candidate.fixtureHash }))) throw new Error("Invalid candidate record");
    if (["candidate", "verified", "approved", "published", "failed"].includes(p.status) && !p.candidate) throw new Error("Missing candidate");
    if (["verified", "approved", "published"].includes(p.status)) this.verified(p);
    return p;
  }
  private verified(p: Proposal): Evidence {
    const e = p.verification;
    if (!e || !p.candidate || !e.passed || e.candidateId !== p.candidate.id || e.sourceRevision !== p.candidate.sourceRevision || e.fixtureHash !== p.candidate.fixtureHash || e.id !== digest({ ...e, id: undefined }) || !e.results.length || e.results.some(r => !r.passed)) throw new Error("Exact candidate has no passing verification");
    return e;
  }
  async candidate(proposalId: string, sourceRevision: string, targetLanguageVersion: string, acceptance: unknown) {
    if (!/^[a-f0-9]{40}$/.test(sourceRevision)) throw new Error("Candidate requires a full 40-character Git commit SHA");
    if (!/^\d+\.\d+\.\d+$/.test(targetLanguageVersion)) throw new Error("Target must be an exact language version");
    const tests = fixtures(acceptance);
    return this.locked(async () => {
      const p = await this.get(proposalId);
      if (!["proposed", "candidate", "failed"].includes(p.status)) throw new Error("Candidate cannot replace a verified, approved, published or rejected proposal");
      if (p.candidate) (p.previousCandidates ??= []).push({ candidate: p.candidate, ...(p.verification ? { verification: p.verification } : {}) });
      const binding = { sourceRevision, targetLanguageVersion, fixtureHash: digest(tests) };
      p.candidate = { id: digest(binding), ...binding, fixtures: structuredClone(tests) };
      delete p.verification;
      transition(p, "candidate", p.candidate.id); await this.save(p); return p;
    });
  }
  async verify(proposalId: string) {
    return this.locked(async () => {
      const p = await this.get(proposalId);
      if (p.status !== "candidate" || !p.candidate) throw new Error("Verification requires candidate state");
      const candidate = p.candidate;
      const results: Evidence["results"] = [];
      let baselineHash = "";
      const check = (name: string, passed: boolean, error: string) => results.push({ id: name, passed, ...(passed ? {} : { error }) });
      try {
        const revision = (await exec("git", ["rev-parse", "HEAD"], { cwd: this.repository })).stdout.trim();
        const dirty = (await exec("git", ["status", "--porcelain", "--untracked-files=normal"], { cwd: this.repository })).stdout.trim();
        check("source-revision", revision === candidate.sourceRevision && !dirty, "Verify from a clean checkout of the exact candidate revision; rebuild with npm run build");
        const build = JSON.parse(await readLimited(resolve(this.repository, "dist/build-info.json"), 4096));
        check("build-provenance", build.sourceRevision === revision && build.sourceDigest === sourceDigest(this.repository) && build.compiledDigest === compiledDigest(), "Stale build; run npm run build in the candidate checkout");
        requireVersion(candidate.targetLanguageVersion);
        const baseline = fixtures(JSON.parse(await readLimited(resolve(this.repository, "conformance/v0.1.json"), 131072)));
        baselineHash = digest(baseline);
        check("baseline-integrity", baselineHash === release.compatibility.conformance.sha256, "Baseline does not match the release manifest");
        results.push(...runFixtures(baseline).map(r => ({ ...r, id: "baseline/" + r.id })));
        results.push(...runFixtures(candidate.fixtures).map(r => ({ ...r, id: "candidate/" + r.id })));
        for (const capability of p.capabilities) {
          check("capability/" + capability, checkCapability(capability).supported === true, "Capability has no implemented release semantics");
          check("coverage/" + capability, candidate.fixtures.some(f => f.capabilities?.includes(capability) && "states" in f.expect && (f.actions?.length ?? 0) > 0), "Capability requires a positive execution fixture with actions");
        }
      } catch (error) { check("verification-error", false, String(error).slice(0, 1000)); }
      const evidence = { candidateId: candidate.id, sourceRevision: candidate.sourceRevision, fixtureHash: candidate.fixtureHash, baselineHash, nodeVersion: process.version, createdAt: new Date().toISOString(), passed: results.length > 0 && results.every(r => r.passed), results };
      p.verification = { ...evidence, id: digest(evidence) };
      transition(p, evidence.passed ? "verified" : "failed", p.verification.id); await this.save(p); return p;
    });
  }
  async reject(proposalId: string, reason: string) {
    text(reason, "reason");
    return this.locked(async () => { const p = await this.get(proposalId); if (["approved", "published", "rejected"].includes(p.status)) throw new Error("Cannot reject finalized proposal"); transition(p, "rejected", reason); await this.save(p); return p; });
  }
  async authorize(proposalId: string, action: "approve" | "publish", authorization: Authorization, trustedKeys: Record<string, string>) {
    return this.locked(async () => {
      const p = await this.get(proposalId);
      if (p.status !== (action === "approve" ? "verified" : "approved")) throw new Error("Invalid lifecycle transition");
      this.verified(p);
      if (action === "publish") {
        if (!p.approval || !this.validAuthorization(p, "approve", p.approval, trustedKeys)) throw new Error("Approval authorization is invalid or revoked");
        const currentRevision = (await exec("git", ["rev-parse", "HEAD"], { cwd: this.repository })).stdout.trim();
        const dirty = (await exec("git", ["status", "--porcelain", "--untracked-files=normal"], { cwd: this.repository })).stdout.trim();
        if (currentRevision !== p.candidate!.sourceRevision || dirty) throw new Error("Publication requires the exact clean verified checkout");
        const build = JSON.parse(await readLimited(resolve(this.repository, "dist/build-info.json"), 4096));
        if (build.sourceRevision !== currentRevision || build.sourceDigest !== sourceDigest(this.repository) || build.compiledDigest !== compiledDigest()) throw new Error("Publication requires a matching fresh build");
        if (p.candidate!.targetLanguageVersion !== release.languageVersion) throw new Error("Publication requires a matching committed release manifest");
      }
      if (!this.validAuthorization(p, action, authorization, trustedKeys)) throw new Error("Authorized maintainer signature required");
      if (action === "approve") p.approval = authorization; else p.publication = authorization;
      transition(p, action === "approve" ? "approved" : "published", authorization.keyId); await this.save(p); return p;
    });
  }
  private validAuthorization(p: Proposal, action: "approve" | "publish", authorization: Authorization, keys: Record<string, string>) {
    if (!authorization || !Object.hasOwn(keys, authorization.keyId) || typeof authorization.signature !== "string") return false;
    try { return verifySignature(null, Buffer.from(authorizationPayload(p, action)), keys[authorization.keyId], Buffer.from(authorization.signature, "base64")); } catch { return false; }
  }
}
export function authorizationPayload(p: Proposal, action: "approve" | "publish") {
  if (!p.candidate || !p.verification) throw new Error("Missing verification binding");
  return JSON.stringify({ action, proposalId: p.id, candidateId: p.candidate.id, verificationId: p.verification.id, baseLanguageVersion: p.baseLanguageVersion, targetLanguageVersion: p.candidate.targetLanguageVersion });
}
const store = new ProposalStore();
export const proposeExtension = (value: unknown) => store.submit(value);
export const getProposalStatus = (proposalId: string) => store.get(proposalId);
