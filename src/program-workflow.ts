import { parse, start, move, type GameState } from "./mind.js";
import { release } from "./release.js";
import { checkCapability } from "./capabilities.js";

export type ProgramInput = { source: string; beforeSource?: string; languageVersion?: string; requestedCapabilities?: string[] };
export type ProgramHandoff = { schemaVersion: 1; kind: "mind-program"; request: string; source: string; languageVersion: string; requestedCapabilities: string[]; provenance: { kind: "external-agent" | "manual"; agent?: string } };
const bounded = (s: unknown, max: number, name: string): string => {
  if (typeof s !== "string" || s.length > max) throw new Error(`Invalid or oversized ${name} (maximum ${max} characters)`);
  return s;
};
function requested(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 16 || value.some(c => typeof c !== "string" || !/^[a-z0-9-]{1,64}$/.test(c))) throw new Error("Expected at most 16 capability IDs");
  return [...new Set(value)];
}
export function readHandoff(value: unknown): ProgramHandoff {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected a program handoff object");
  const p = value as ProgramHandoff;
  if (p.schemaVersion !== 1 || p.kind !== "mind-program") throw new Error("Unsupported program handoff format");
  bounded(p.request, 4096, "request"); bounded(p.source, 65536, "source");
  // Unsupported pins remain visible for inspection; they are never silently upgraded.
  bounded(p.languageVersion, 64, "languageVersion");
  requested(p.requestedCapabilities);
  if (!p.provenance || !["external-agent", "manual"].includes(p.provenance.kind)) throw new Error("Expected external-agent or manual provenance");
  if (p.provenance.agent !== undefined) bounded(p.provenance.agent, 128, "agent name");
  return { schemaVersion: 1, kind: "mind-program", request: p.request, source: p.source, languageVersion: p.languageVersion, requestedCapabilities: requested(p.requestedCapabilities), provenance: { kind: p.provenance.kind, ...(p.provenance.agent ? { agent: p.provenance.agent } : {}) } };
}
function lineChanges(before: string, after: string) {
  const added: string[] = [], removed: string[] = [];
  const compare = (a: string, b: string, output: string[]) => {
    const counts = new Map<string, number>();
    for (const line of b.split("\n")) counts.set(line, (counts.get(line) ?? 0) + 1);
    for (const line of a.split("\n")) {
      const count = counts.get(line) ?? 0;
      if (count) counts.set(line, count - 1); else output.push(line);
    }
  };
  compare(after, before, added); compare(before, after, removed);
  return { changed: before !== after, added: added.slice(0, 100), removed: removed.slice(0, 100), truncated: added.length > 100 || removed.length > 100, note: "Added/removed lines; line reordering is not shown. Inspect the full source too." };
}
export function inspectProgram(input: ProgramInput) {
  const source = bounded(input.source, 65536, "source");
  const before = bounded(input.beforeSource ?? "", 65536, "beforeSource");
  const capabilities = requested(input.requestedCapabilities).map(checkCapability);
  const missingCapabilities = capabilities.filter(c => !c.supported).map(c => c.name);
  const errors: string[] = [];
  let summary: { title: string; player: { name: string; x: number; y: number }; collectibles: { name: string; x: number; y: number }[]; target: number } | undefined;
  let valid = false;
  try {
    const p = parse(source, { languageVersion: input.languageVersion });
    valid = true;
    summary = { title: p.title, player: p.player, collectibles: p.collectibles, target: p.target };
    const { width, height } = release.runtime.browserGrid;
    if ([p.player, ...p.collectibles].some(e => e.x < 0 || e.y < 0 || e.x >= width || e.y >= height)) errors.push(`Browser requires every entity inside its ${width}×${height} grid`);
  } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  if (missingCapabilities.length) errors.push(`Unavailable capabilities: ${missingCapabilities.join(", ")}. Request a language extension separately; this program cannot install one.`);
  return { source, languageVersion: input.languageVersion ?? release.languageVersion, valid, canRunInBrowser: valid && errors.length === 0, errors, capabilities, missingCapabilities, changes: lineChanges(before, source), summary };
}
export type Action = { type: "move"; dx: number; dy: number };
export function previewProgram(input: ProgramInput, actions: unknown = []) {
  const inspection = inspectProgram(input);
  if (!inspection.valid || inspection.missingCapabilities.length) return { status: "blocked" as const, errors: inspection.errors, trace: [] };
  // Preview uses core language semantics; it does not impose the browser grid.
  if (!Array.isArray(actions) || actions.length > 32) throw new Error("Expected at most 32 move actions");
  for (const a of actions) if (!a || a.type !== "move" || Object.keys(a).some(k => !["type", "dx", "dy"].includes(k)) || typeof a.dx !== "number" || typeof a.dy !== "number") throw new Error("Only data-only move actions with numeric dx/dy are accepted");
  const p = parse(input.source, { languageVersion: input.languageVersion });
  let state = start(p);
  const output = (s: GameState) => ({ player: s.player, collected: s.collected, remainingCount: s.remaining.length, won: s.won });
  const trace = [output(state)];
  for (let i = 0; i < actions.length; i++) {
    try { state = move(p, state, actions[i].dx, actions[i].dy); trace.push(output(state)); }
    catch (error) { return { status: "runtime-error" as const, failedAction: i + 1, errors: [error instanceof Error ? error.message : String(error)], trace }; }
  }
  return { status: state.won ? "won" as const : "ready" as const, errors: [], trace };
}
export function agentPrompt(request: string) {
  bounded(request, 4096, "request");
  return `Human request: ${request}\nUse MIND ${release.languageVersion}. Discover the spec/capabilities with MIND MCP when available. Current grammar: game "Title" { player Name at x y; collectible Name at x y; win when collected == positiveTarget; }. Exactly one player; unique names; safe integers; reachable target. Browser grid: x 0–15, y 0–11. No gravity, jumping, JavaScript, imports or invented syntax. Write real .mind source. Use mind_inspect_program and mind_preview_program when available. Return a JSON handoff with schemaVersion:1, kind:"mind-program", request, source, languageVersion, requestedCapabilities:[...], provenance:{kind:"external-agent",agent:"your actual agent name"}. Declare all capabilities needed for the request, including unavailable ones. Do not approve or install language extensions. A human will inspect and approve the program before applying it in the browser.`;
}
