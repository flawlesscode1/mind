import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { parse } from "./mind.js";
import { checkCapability } from "./capabilities.js";
import { proposeExtension, getProposalStatus } from "./proposals.js";

const server = new Server({ name: "mind", version: "0.1.0" }, { capabilities: { tools: {} } });
const schema = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, required, additionalProperties: false });
const field = { type: "string" };
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [
  { name: "mind_get_spec", description: "Get the current implemented MIND language specification", inputSchema: schema({}) },
  { name: "mind_check_capability", description: "Check whether MIND supports a game mechanic", inputSchema: schema({ name: field }, ["name"]) },
  { name: "mind_validate", description: "Parse and validate MIND source", inputSchema: schema({ source: field }, ["source"]) },
  { name: "mind_propose_extension", description: "Submit an extension proposal for maintainer review; does not implement or publish it", inputSchema: schema({ title: field, motivation: field, syntax: field, semantics: field, tests: field, compatibility: field }, ["title","motivation","syntax","semantics","tests","compatibility"]) },
  { name: "mind_get_proposal_status", description: "Get a proposal's recorded status", inputSchema: schema({ id: field }, ["id"]) }
] }));
server.setRequestHandler(CallToolRequestSchema, async request => {
  const args = (request.params.arguments ?? {}) as Record<string, unknown>;
  const str = (name: string) => { if (typeof args[name] !== "string") throw new Error("Expected string: " + name); return args[name] as string; };
  try {
    let result: unknown;
    switch (request.params.name) {
      case "mind_get_spec": result = await readFile(resolve(process.cwd(), "language/spec.md"), "utf8"); break;
      case "mind_check_capability": result = checkCapability(str("name")); break;
      case "mind_validate": { const program = parse(str("source")); result = { valid: true, title: program.title, collectibleCount: program.collectibles.length }; break; }
      case "mind_propose_extension": result = await proposeExtension({ title: str("title"), motivation: str("motivation"), syntax: str("syntax"), semantics: str("semantics"), tests: str("tests"), compatibility: str("compatibility") }); break;
      case "mind_get_proposal_status": result = await getProposalStatus(str("id")); break;
      default: throw new Error("Unknown tool: " + request.params.name);
    }
    return { content: [{ type: "text", text: typeof result === "string" ? result : JSON.stringify(result, null, 2) }] };
  } catch (e) { return { isError: true, content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }] }; }
});
await server.connect(new StdioServerTransport());
