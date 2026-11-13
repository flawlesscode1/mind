import { readFileSync } from "node:fs";
import { parse, start, move } from "./mind.js";
const path = process.argv[2];
if (!path) { console.error("Usage: node dist/src/cli.js <file.mind>"); process.exit(1); }
try {
  const program = parse(readFileSync(path, "utf8"));
  let state = start(program);
  console.log("MIND:", program.title);
  console.log("Initial:", JSON.stringify(state));
  const first = program.collectibles[0];
  if (first) state = move(program, state, first.x - state.player.x, first.y - state.player.y);
  console.log("After moving to first collectible:", JSON.stringify(state));
} catch (error) { console.error(error); process.exitCode = 1; }
