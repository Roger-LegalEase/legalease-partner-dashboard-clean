// The planner must not count a pin on a record generate.mjs's own convergence rewrites
// each run: the decider exempts SOURCE_RELATIONSHIP_REGISTRY.json by name
// (CONVERGENCE_REWRITTEN_RECORDS), and a planner that still counted it refused every
// family whose receipt pins it, with "no adapter describes" a record nobody decides on.
//
//   node --test scripts/grade-a-packet-factory-24h/repin-convergence-rewritten.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { CONVERGENCE_REWRITTEN_RECORDS, driftedPinsOf, sha256 } from "./repin-lapsed-source-identities.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REGISTRY = "data/rcap-grade-a/packet-factory-24h/SOURCE_RELATIONSHIP_REGISTRY.json";
const OTHER = "data/record-clearing/legal-design-track-registry.json";
const digestOf = (rel) => sha256(fs.readFileSync(path.join(ROOT, rel)));
const receipt = (pins) => ({ schemaVersion: "test", familyId: "test-family", compositionSources: pins });
const WRONG = "0".repeat(64);

test("the exemption names exactly the decider's record", () => {
  assert.deepEqual([...CONVERGENCE_REWRITTEN_RECORDS], [REGISTRY]);
});

test("a stale pin on the convergence-rewritten registry is not drift", () => {
  const drifted = driftedPinsOf(receipt([{ pathInRepository: REGISTRY, sha256: WRONG }, { pathInRepository: OTHER, sha256: digestOf(OTHER) }]));
  assert.deepEqual(drifted.map((d) => d.at), []);
});

test("every other stale pin is still drift", () => {
  const drifted = driftedPinsOf(receipt([{ pathInRepository: REGISTRY, sha256: WRONG }, { pathInRepository: OTHER, sha256: WRONG }]));
  assert.deepEqual(drifted.map((d) => d.at), [OTHER]);
  assert.equal(drifted[0].now, digestOf(OTHER));
});
