// Reproducible proposal/verification demonstration. This command does not call
// a model, sign an approval, activate a capability, or run an approved trial.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ProposalStore, authorizationPayload, digest } from "../dist/src/proposals.js";
const client = new Client({ name: "mind-solid-tiles-demo", version: "1" });
try {
  const source = await readFile("extensions/examples/solid-tiles/game.mind", "utf8");
  const proposal = JSON.parse(await readFile("extensions/examples/solid-tiles/proposal.json", "utf8"));
  const fixtures = JSON.parse(await readFile("extensions/examples/solid-tiles/acceptance.json", "utf8"));
  await client.connect(new StdioClientTransport({ command: process.execPath, args: ["dist/src/mcp.js"], stderr: "inherit" }));
  const call = (name, args = {}) => client.callTool({ name, arguments: args });
  const decode = response => { if (response.isError) throw new Error(JSON.stringify(response.content)); return JSON.parse(response.content[0].text); };
  const discovery = decode(await call("mind_check_capability", { name: "solid-tiles" }));
  if (discovery.supported !== false) throw new Error("Demo expects solid tiles to remain unreleased");
  const catalog = decode(await call("mind_get_extension_catalog"));
  const oldValidation = await call("mind_validate", { source });
  if (!oldValidation.isError) throw new Error("Released parser must not accept candidate syntax");
  const submitted = decode(await call("mind_propose_extension", proposal));
  const revision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const store = new ProposalStore();
  await store.candidate(submitted.id, revision, "0.2.0", fixtures);
  const verified = await store.verify(submitted.id);
  if (verified.status !== "verified") throw new Error("Verification failed; inspect proposal " + submitted.id + ": " + JSON.stringify(verified.verification));
  const output = resolve("work/solid-tiles-demo", submitted.id);
  await mkdir(output, { recursive: true, mode: 0o700 });
  const review = { request: "Add a solid wall to the collectible game; prevent stepping onto it and allow a detour to the star.", provenance: "Source/proposal authored by the coding assistant during development; this command replays artifacts and does not invoke a model.", source, sourceHash: digest(source), discovery, catalog, releasedValidation: oldValidation, proposal: verified, status: "awaiting-human-maintainer-approval", approvedTrialExecuted: false };
  await writeFile(resolve(output, "review.json"), JSON.stringify(review, null, 2) + "\n", { mode: 0o600 });
  await writeFile(resolve(output, "approval-payload.json"), authorizationPayload(verified, "approve") + "\n", { mode: 0o600 });
  console.log(JSON.stringify({ proposalId: submitted.id, sourceRevision: revision, status: verified.status, candidateId: verified.candidate.id, verificationId: verified.verification.id, checksPassed: verified.verification.results.length, reviewDirectory: output, next: "Human reviews exact source/fixtures/commit and signs approval using an authorized key. No approval, trial or publication has occurred." }, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await client.close(); }
