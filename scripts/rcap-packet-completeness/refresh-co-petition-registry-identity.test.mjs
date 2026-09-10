/*
 * An identity refresh that cannot refuse is a rubber stamp. These drive the real
 * equivalence proof, not a model of it, and each one must FAIL.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { equivalenceProof } from "./refresh-co-petition-registry-identity.mjs";

const TRACK = "co_petition_seal_arrest";
const base = () => new Map([
  [TRACK, { trackId: TRACK, rules: { requiredBeforeFiling: ["a", "b"] } }],
  ["co_motion_seal_conviction", { trackId: "co_motion_seal_conviction", rules: { fees: "x" } }]
]);

test("identical registries prove equivalence", () => {
  const proof = equivalenceProof({ oldTracks: base(), newTracks: base(), track: TRACK });
  assert.deepEqual(proof.changedTracks, []);
  assert.equal(proof.trackCount, 2);
});

test("an edit to an UNRELATED track still proves equivalence, and names it", () => {
  const b = base();
  b.set("co_motion_seal_conviction", { trackId: "co_motion_seal_conviction", rules: { fees: "y" } });
  const proof = equivalenceProof({ oldTracks: base(), newTracks: b, track: TRACK });
  assert.deepEqual(proof.changedTracks, ["co_motion_seal_conviction"]);
});

test("an edit to the BOUND track refuses", () => {
  const b = base();
  b.set(TRACK, { trackId: TRACK, rules: { requiredBeforeFiling: ["a", "b", "c"] } });
  assert.throws(() => equivalenceProof({ oldTracks: base(), newTracks: b, track: TRACK }),
    /the bound track co_petition_seal_arrest CHANGED/);
});

test("a one-character edit inside the bound track refuses", () => {
  const b = base();
  b.set(TRACK, { trackId: TRACK, rules: { requiredBeforeFiling: ["a", "B"] } });
  assert.throws(() => equivalenceProof({ oldTracks: base(), newTracks: b, track: TRACK }),
    /CHANGED/);
});

test("a registry that gained a track refuses", () => {
  const b = base();
  b.set("something_new", { trackId: "something_new" });
  assert.throws(() => equivalenceProof({ oldTracks: base(), newTracks: b, track: TRACK }),
    /gained or lost a track/);
});

test("a registry that lost the bound track refuses", () => {
  const b = base();
  b.delete(TRACK);
  assert.throws(() => equivalenceProof({ oldTracks: base(), newTracks: b, track: TRACK }),
    /missing from one side|gained or lost/);
});
