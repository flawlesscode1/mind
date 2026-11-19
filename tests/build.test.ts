import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, cp, writeFile, readFile, symlink, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

test("a build removes retired compiled modules/tests and regenerates provenance", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "mind-clean-build-"));
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "pipe", encoding: "utf8" }).trim();
  try {
    for (const dir of ["src", "scripts", "dist/tests"]) await mkdir(resolve(root, dir), { recursive: true });
    for (const file of ["scripts/build.mjs", "src/provenance.ts", "tsconfig.json", "package.json", ".gitignore"]) await cp(file, resolve(root, file));
    await symlink(resolve("node_modules"), resolve(root, "node_modules"), "dir");
    await writeFile(resolve(root, "src/current.ts"), "export const current = 1;\n");
    await writeFile(resolve(root, "dist/retired.js"), "export const obsolete = true;\n");
    await writeFile(resolve(root, "dist/tests/retired.test.js"), "throw new Error('retired test from another branch');\n");
    await writeFile(resolve(root, "dist/build-info.json"), '{"sourceRevision":"stale"}');
    git("init"); git("add", "src", "scripts", "package.json", "tsconfig.json", ".gitignore"); git("-c", "user.name=MIND tests", "-c", "user.email=tests@example.invalid", "commit", "-m", "source checkout");
    execFileSync(process.execPath, ["scripts/build.mjs"], { cwd: root, stdio: "pipe" });
    await assert.rejects(access(resolve(root, "dist/retired.js")));
    await assert.rejects(access(resolve(root, "dist/tests/retired.test.js")));
    assert.match(await readFile(resolve(root, "dist/src/current.js"), "utf8"), /current = 1/);
    assert.equal(JSON.parse(await readFile(resolve(root, "dist/build-info.json"), "utf8")).sourceRevision, git("rev-parse", "HEAD"));
  } finally { await rm(root, { recursive: true, force: true }); }
});
