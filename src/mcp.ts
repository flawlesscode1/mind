import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { parse } from "./mind.js";
import { checkCapability } from "./capabilities.js";
import { proposeExtension, getProposalStatus, limits } from "./proposals.js";
import { release } from "./release.js";

const server = new Server({ name: "mind", version: release.languageVersion }, { capabilities: { tools: {} } });
const schema = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, required, additionalProperties: false });
const field = { type: "string", minLength: 1, maxLength: limits.fieldBytes };
const proposalFields = ["baseLanguageVersion", "title", "motivation", "syntax", "semantics", "tests", "compatibility", "capabilities"];
const tools = [
  { name: "mind_get_version", description: "Discover the active release manifest, supported versions and capability metadata", inputSchema: schema({}) },
  { name: "mind_get_spec", description: "Get the implemented MIND language specification", inputSchema: schema({}) },
  { name: "mind_list_capabilities", description: "List implemented and unavailable capabilities for the active release", inputSchema: schema({}) },
  { name: "mind_check_capability", description: "Check a game mechanic in the active release", inputSchema: schema({ name: field }, ["name"]) },
  { name: "mind_validate", description: "Validate language semantics, not the browser-only grid bounds", inputSchema: schema({ source: { type: "string", maxLength: 65536 }, languageVersion: field }, ["source"]) },
  { name: "mind_propose_extension", description: "Store an untrusted, version-aware design request; never executes, approves or publishes code", inputSchema: schema({ ...Object.fromEntries(proposalFields.slice(0, -1).map(k => [k, field])), capabilities: { type: "array", minItems: 1, maxItems: 16, uniqueItems: true, items: { type: "string", pattern: "^[a-z0-9-]{1,64}$" } } }, proposalFields) },
  { name: "mind_get_proposal_status", description: "Inspect lifecycle state, exact candidate and persisted verification evidence", inputSchema: schema({ id: field }, ["id"]) }
];
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async request => {
  try {
    const tool = tools.find(t => t.name === request.params.name);
    if (!tool) throw new Error("Unknown tool: " + request.params.name);
    const args = request.params.arguments ?? {};
    // The SDK's low-level server does not enforce advertised per-tool schemas.
    if (Buffer.byteLength(JSON.stringify(args)) > 262144) throw new Error("Tool arguments exceed 256 KiB");
    const properties = tool.inputSchema.properties;
    if (Object.keys(args).some(key => !Object.hasOwn(properties, key))) throw new Error("Unexpected tool argument");
    for (const key of tool.inputSchema.required) if (!Object.hasOwn(args, key)) throw new Error("Missing tool argument: " + key);
    const str = (key: string) => {
      if (typeof args[key] !== "string" || (args[key] as string).length > (key === "source" ? 65536 : limits.fieldBytes)) throw new Error("Invalid or oversized string: " + key);
      return args[key] as string;
    };
    let result: unknown;
    switch (request.params.name) {
      case "mind_get_version": result = release; break;
      case "mind_list_capabilities": result = { languageVersion: release.languageVersion, capabilities: release.capabilities }; break;
      case "mind_get_spec": result = await readFile(fileURLToPath(new URL("../../language/spec.md", import.meta.url)), "utf8"); break;
      case "mind_check_capability": result = checkCapability(str("name")); break;
      case "mind_validate": {
        const program = parse(str("source"), { languageVersion: args.languageVersion === undefined ? undefined : str("languageVersion") });
        result = { valid: true, languageVersion: release.languageVersion, title: program.title, collectibleCount: program.collectibles.length, runtimeProfile: "language (browser grid not checked)" }; break;
      }
      case "mind_propose_extension": result = await proposeExtension(args); break;
      case "mind_get_proposal_status": result = await getProposalStatus(str("id")); break;
    }
    return { content: [{ type: "text" as const, text: typeof result === "string" ? result : JSON.stringify(result, null, 2) }] };
  } catch (e) { return { isError: true, content: [{ type: "text" as const, text: e instanceof Error ? e.message : String(e) }] }; }
});
await server.connect(new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: 524288 }));
