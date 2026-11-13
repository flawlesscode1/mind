import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
export type Proposal = {
  id: string; title: string; motivation: string; syntax: string;
  semantics: string; tests: string; compatibility: string;
  status: "proposed"; createdAt: string;
};
const folder = resolve(process.cwd(), "extensions/proposals");
export async function proposeExtension(input: Omit<Proposal, "id" | "status" | "createdAt">): Promise<Proposal> {
  for (const key of ["title","motivation","syntax","semantics","tests","compatibility"] as const) {
    if (!input[key]?.trim()) throw new Error("Missing proposal field: " + key);
  }
  const proposal: Proposal = { ...input, id: randomUUID(), status: "proposed", createdAt: new Date().toISOString() };
  await mkdir(folder, { recursive: true });
  await writeFile(resolve(folder, proposal.id + ".json"), JSON.stringify(proposal, null, 2) + "\n", { flag: "wx" });
  return proposal;
}
export async function getProposalStatus(id: string): Promise<Proposal> {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Invalid proposal ID");
  return JSON.parse(await readFile(resolve(folder, id + ".json"), "utf8")) as Proposal;
}
