// Replays a real prepared agent handoff via MCP. This command does not call a
// model, impersonate a human approval, apply changes, or publish an extension.
import { readFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readHandoff } from "../dist/src/program-workflow.js";
const client = new Client({ name: "mind-program-demo", version: "1" });
try {
  const handoff = readHandoff(JSON.parse(await readFile("examples/two-stars.handoff.json", "utf8")));
  console.log("Prepared external-agent artifact replay; no model invoked by this command.");
  console.log("Human request:", handoff.request);
  console.log("Generated source:\n" + handoff.source);
  await client.connect(new StdioClientTransport({ command: process.execPath, args: ["dist/src/mcp.js"], stderr: "inherit" }));
  const call = async (name, args = {}) => {
    const response = await client.callTool({ name, arguments: args });
    if (response.isError) throw new Error(JSON.stringify(response.content));
    const result = JSON.parse(response.content[0].text);
    console.log(name + ":", JSON.stringify(result, null, 2)); return result;
  };
  await call("mind_get_version");
  const input = { source: handoff.source, beforeSource: await readFile("examples/yc_collect.mind", "utf8"), languageVersion: handoff.languageVersion, requestedCapabilities: handoff.requestedCapabilities };
  const review = await call("mind_inspect_program", input);
  if (!review.canRunInBrowser) throw new Error("Candidate is not runnable");
  const preview = await call("mind_preview_program", { ...input, actions: [{ type: "move", dx: 2, dy: 0 }, { type: "move", dx: 2, dy: 0 }] });
  if (preview.status !== "won") throw new Error("Expected an actual winning interpreter trace");
  await call("mind_check_capability", { name: "gravity" });
  console.log("Now inspect and explicitly approve the handoff in the browser workshop. The preview has not applied it.");
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await client.close(); }
