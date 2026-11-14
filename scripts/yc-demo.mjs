// A real MCP client for recording validation and capability discovery. No LLM
// is called here: generation belongs to the external coding agent/session.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const [command, value] = process.argv.slice(2);
const root = fileURLToPath(new URL("../", import.meta.url));
const client = new Client({ name: "mind-yc-demo", version: "1.0.0" });
try {
  if (!["validate", "capability"].includes(command) || !value) throw new Error("Usage: node scripts/yc-demo.mjs validate <file.mind> | capability <name>");
  const request = command === "validate"
    ? { name: "mind_validate", arguments: { source: await readFile(value, "utf8") } }
    : { name: "mind_check_capability", arguments: { name: value } };
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL("../dist/src/mcp.js", import.meta.url))], cwd: root, stderr: "inherit" }));
  const result = await client.callTool(request);
  console.log("MCP tool:", request.name);
  for (const item of result.content ?? []) if (item.type === "text") console.log(item.text);
  if (result.isError) process.exitCode = 1;
} catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
finally { await client.close(); }
