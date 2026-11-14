import { readLimited, ProposalStore, authorizationPayload } from "./proposals.js";

const [command, proposalId, ...args] = process.argv.slice(2);
const store = new ProposalStore();
const json = async (path: string | undefined, limit = 131072) => {
  if (!path) throw new Error("Missing JSON file argument");
  return JSON.parse(await readLimited(path, limit));
};
try {
  let result: unknown;
  switch (command) {
    case "submit": result = await store.submit(await json(proposalId, 65536)); break;
    case "status": result = await store.get(proposalId); break;
    case "candidate": result = await store.candidate(proposalId, args[0], args[1], await json(args[2])); break;
    case "verify": {
      const p = await store.verify(proposalId); result = p;
      if (p.status !== "verified") process.exitCode = 1;
      break;
    }
    case "reject": result = await store.reject(proposalId, args.join(" ")); break;
    case "approval-payload": case "publication-payload":
      result = authorizationPayload(await store.get(proposalId), command === "approval-payload" ? "approve" : "publish"); break;
    case "approve": case "publish": {
      const policy = await json("extensions/maintainers.json", 16384);
      if (policy.schemaVersion !== 1 || !policy.keys || typeof policy.keys !== "object") throw new Error("Invalid maintainer policy");
      result = await store.authorize(proposalId, command, await json(args[0], 16384), policy.keys); break;
    }
    default: throw new Error("Usage: extension submit <proposal.json> | status <id> | candidate <id> <full-sha> <target-version> <fixtures.json> | verify <id> | reject <id> <reason> | approval-payload/publication-payload <id> | approve/publish <id> <signature.json>");
  }
  console.log(typeof result === "string" ? result : JSON.stringify(result, null, 2));
} catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
