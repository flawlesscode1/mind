import test from "node:test";
import assert from "node:assert/strict";
import { parse, start, move } from "../src/mind.js";
const source = 'game "Test" { player Hero at 0 0; collectible Star at 1 0; win when collected == 1; }';
test("parses a MIND game", () => { const p = parse(source); assert.equal(p.title, "Test"); assert.equal(p.collectibles.length, 1); });
test("collecting wins", () => { const p = parse(source); const s = move(p, start(p), 1, 0); assert.equal(s.won, true); assert.equal(s.collected, 1); });
test("rejects unsupported statements", () => assert.throws(() => parse(source.replace("player Hero", "vehicle Hero"))));
test("rejects duplicate names", () => assert.throws(() => parse(source.replace("Star at", "Hero at"))));
