// Local opt-in CLI only. No HTTP endpoint and no automatic run/approval.
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname, relative, isAbsolute, sep } from "node:path";
import { generateProgram } from "../dist/src/agents/codex.js";
import { readLimited } from "../dist/src/proposals.js";
const [requestFile, outputDirectory] = process.argv.slice(2);
try {
  if (!requestFile || !outputDirectory) throw new Error("Usage: node scripts/generate-program.mjs <request.txt> <new-directory-under-work>");
  const output = resolve(outputDirectory), root = resolve("work");
  if (output === root || isAbsolute(relative(root, output)) || relative(root, output) === ".." || relative(root, output).startsWith(".." + sep)) throw new Error("Output must be a new private directory under work/");
  const request = (await readLimited(requestFile, 16384)).trim();
  if (!request || request.length > 4096) throw new Error("Request must contain 1–4096 characters");
  await mkdir(dirname(output), { recursive: true, mode: 0o700 });
  await mkdir(output, { mode: 0o700 });
  const result = await generateProgram(request, output);
  await writeFile(resolve(output, "trace.json"), JSON.stringify({ ...result.trace, status: result.status, code: result.code, diagnostic: result.diagnostic, sourceSha256: result.sourceSha256 }, null, 2) + "\n", { mode: 0o600 });
  if (result.handoff) {
    await writeFile(resolve(output, "handoff.json"), JSON.stringify(result.handoff, null, 2) + "\n", { mode: 0o600 });
    await writeFile(resolve(output, "program.mind"), result.handoff.source, { mode: 0o600 });
    await writeFile(resolve(output, "inspection.json"), JSON.stringify(result.inspection, null, 2) + "\n", { mode: 0o600 });
  }
  console.log(JSON.stringify({ status: result.status, code: result.code, diagnostic: result.diagnostic, sourceSha256: result.sourceSha256, outputDirectory: output, humanApproval: "NOT GIVEN; this adapter never executes or applies MIND source" }, null, 2));
  if (result.status !== "generated") process.exitCode = 1;
} catch (error) { console.error(error.message); process.exitCode = 1; }
