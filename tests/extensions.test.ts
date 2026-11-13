import test from "node:test";
import assert from "node:assert/strict";
import { checkCapability } from "../src/capabilities.js";
test("supported mechanic is reported", () => assert.equal(checkCapability("movement").supported, true));
test("missing platformer mechanics are reported", () => assert.equal(checkCapability("gravity").supported, false));
test("unknown mechanic is not falsely supported", () => assert.equal(checkCapability("teleportation").supported, false));
