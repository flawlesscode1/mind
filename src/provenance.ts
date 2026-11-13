import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function sourceDigest(root = process.cwd()): string {
  const paths = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean).sort();
  const hash = createHash("sha256");
  for (const path of paths) { hash.update(path + "\0"); hash.update(readFileSync(resolve(root, path))); hash.update("\0"); }
  return hash.digest("hex");
}
export function compiledDigest(folder = fileURLToPath(new URL(".", import.meta.url))): string {
  const hash = createHash("sha256");
  for (const name of readdirSync(folder).filter(n => n.endsWith(".js")).sort()) { hash.update(name + "\0"); hash.update(readFileSync(resolve(folder, name))); hash.update("\0"); }
  return hash.digest("hex");
}
if (process.argv[2] === "--write-build-info" && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync("dist/build-info.json", JSON.stringify({
    sourceRevision: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    sourceDigest: sourceDigest(), compiledDigest: compiledDigest()
  }, null, 2) + "\n");
}
