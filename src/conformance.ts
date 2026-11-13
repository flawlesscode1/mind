import { isDeepStrictEqual } from "node:util";
import { parse, start, move } from "./mind.js";

export type Fixture = {
  id: string; source: string; languageVersion?: string;
  capabilities?: string[];
  expect: { error: string } | { states: unknown[] };
  actions?: { type: string; dx?: number; dy?: number }[];
};
export function fixtures(value: unknown): Fixture[] {
  if (!Array.isArray(value) || !value.length || value.length > 100) throw new Error("Expected 1–100 acceptance fixtures");
  if (Buffer.byteLength(JSON.stringify(value)) > 131072) throw new Error("Fixtures exceed 128 KiB");
  const ids = new Set<string>();
  for (const f of value) {
    if (!f || typeof f.id !== "string" || !/^[a-z0-9-]{1,64}$/.test(f.id) || ids.has(f.id)) throw new Error("Invalid or duplicate fixture ID");
    ids.add(f.id);
    if (typeof f.source !== "string" || f.source.length > 65536) throw new Error("Invalid fixture source");
    if (f.languageVersion !== undefined && (typeof f.languageVersion !== "string" || f.languageVersion.length > 64)) throw new Error("Invalid fixture language version");
    if (f.capabilities !== undefined && (!Array.isArray(f.capabilities) || f.capabilities.some((s: unknown) => typeof s !== "string" || !/^[a-z0-9-]{1,64}$/.test(s as string)))) throw new Error("Invalid fixture capabilities");
    if (!f.expect || typeof f.expect !== "object") throw new Error("Missing fixture expectation");
    if ("error" in f.expect) {
      if (typeof f.expect.error !== "string" || !f.expect.error || Object.keys(f.expect).length !== 1) throw new Error("Expected error substring");
      if (f.actions !== undefined) throw new Error("Negative fixtures test parsing only");
    } else if (!Array.isArray(f.expect.states) || f.expect.states.length !== (f.actions?.length ?? 0) + 1) throw new Error("Expected initial state and one state per action");
    if (f.actions !== undefined && (!Array.isArray(f.actions) || f.actions.length > 100 || f.actions.some((a: { type?: unknown }) => !a || typeof a.type !== "string"))) throw new Error("Invalid fixture actions");
  }
  return value;
}
export function runFixtures(input: Fixture[]) {
  return fixtures(input).map(f => {
    try {
      if ("error" in f.expect) {
        try { parse(f.source, { languageVersion: f.languageVersion }); }
        catch (e) {
          if (String(e).includes(f.expect.error)) return { id: f.id, passed: true };
          throw e;
        }
        throw new Error("Expected parsing to fail");
      }
      const program = parse(f.source, { languageVersion: f.languageVersion });
      let state = start(program);
      const states = [state];
      for (const action of f.actions ?? []) {
        if (action.type !== "move") throw new Error("Unsupported action: " + action.type);
        state = move(program, state, action.dx!, action.dy!); states.push(state);
      }
      if (!isDeepStrictEqual(states, f.expect.states)) throw new Error("Execution states differ from acceptance expectations");
      return { id: f.id, passed: true };
    } catch (error) { return { id: f.id, passed: false, error: String(error).slice(0, 1000) }; }
  });
}
