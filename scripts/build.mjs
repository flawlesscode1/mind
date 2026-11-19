import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
// Remove retired modules/tests from previous checkouts before compiling.
rmSync("dist", { recursive: true, force: true });
for (const args of [["node_modules/typescript/bin/tsc"], ["dist/src/provenance.js", "--write-build-info"]]) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
