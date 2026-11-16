// Fixed, reviewed candidate implementations. Proposal text can never select a
// module, load code, change this catalog, or activate a released capability.
import { parseSolidTilesCandidate, start, move, type GameState } from "./mind.js";
import type { Engine, Fixture } from "./conformance.js";

export const solidTiles = {
  id: "solid-tiles-v1", baseLanguageVersion: "0.1.0", targetLanguageVersion: "0.2.0",
  released: false, active: false,
  capabilities: ["solid-tiles"],
  syntax: "wall Identifier at integer integer;",
  semantics: "A wall blocks a movement destination. A blocked move returns the unchanged state; it collects nothing. Large deltas can cross a wall. No swept collision, gravity or jumping. Player/collectibles cannot start on walls.",
  approval: "Verification may execute isolated acceptance tests. Applying a candidate program requires signed maintainer approval of the exact verified candidate."
} as const;
const engine: Engine = {
  parse(source, options = {}) {
    if (options.languageVersion !== undefined && options.languageVersion !== solidTiles.targetLanguageVersion) throw new Error("Solid-tile candidate requires language version " + solidTiles.targetLanguageVersion);
    return parseSolidTilesCandidate(source);
  }, start,
  move(program, state, dx, dy) {
    // Reuse all safe-integer and state validation in the real interpreter. The
    // proposed transition is pure, so blocked movement does not mutate state.
    const proposed = move(program, state, dx, dy);
    return program.walls?.some(w => w.x === proposed.player.x && w.y === proposed.player.y) ? state : proposed;
  }
};
export function candidateProfile(version: string) {
  if (version !== solidTiles.targetLanguageVersion) return undefined;
  return { metadata: solidTiles, engine };
}
export function hasSolidTileCoverage(fixture: Fixture): boolean {
  if (!("states" in fixture.expect) || !fixture.actions?.length || !fixture.capabilities?.includes("solid-tiles")) return false;
  try {
    const p = engine.parse(fixture.source, { languageVersion: fixture.languageVersion });
    let state = engine.start(p);
    let blocked = false;
    for (const action of fixture.actions) {
      if (action.type !== "move") return false;
      const next = engine.move(p, state, action.dx!, action.dy!);
      if (!state.won && next === state && (action.dx || action.dy) && p.walls?.some(w => w.x === state.player.x + action.dx! && w.y === state.player.y + action.dy!)) blocked = true;
      state = next;
    }
    return blocked;
  } catch { return false; }
}
export function executeCandidate(version: string, source: string, actions: unknown) {
  const profile = candidateProfile(version);
  if (!profile) throw new Error("No installed candidate implementation for " + version);
  if (typeof source !== "string" || source.length > 65536) throw new Error("Candidate source exceeds 65536 characters");
  if (!Array.isArray(actions) || actions.length > 32) throw new Error("Expected at most 32 move actions");
  for (const a of actions) if (!a || a.type !== "move" || Object.keys(a).some(k => !["type", "dx", "dy"].includes(k)) || typeof a.dx !== "number" || typeof a.dy !== "number") throw new Error("Only data-only move actions are accepted");
  const program = profile.engine.parse(source, { languageVersion: version });
  let state = profile.engine.start(program);
  const trace: GameState[] = [state];
  for (const action of actions) { state = profile.engine.move(program, state, action.dx, action.dy); trace.push(state); }
  return { candidate: profile.metadata.id, released: false, languageVersion: version, walls: program.walls, trace };
}
