#!/usr/bin/env node
import assert from "node:assert/strict";

let ownership;
try {
  ownership = await import("./path-ownership.mjs");
} catch {
  ownership = null;
}

assert.ok(ownership, "path ownership helpers must exist");

const { pathsOverlap, unresolvedHistoricalRepairPaths } = ownership;

const familyDirectory = "data/rcap-all50/overlays/census-v1/oh/oh-marijuana-expungement-set--custom-pleading/**";
const historicalGlob = "data/rcap-all50/overlays/census-v1/**/oh-marijuana-expungement-set*";

assert.equal(pathsOverlap(familyDirectory, historicalGlob), true,
  "an exact family directory must overlap an interior-** historical glob");
assert.equal(pathsOverlap(
  familyDirectory,
  "data/rcap-all50/overlays/census-v1/**/ut-pet-conviction-set*"
), false, "unrelated family globs must not collide");
assert.equal(pathsOverlap(
  "scripts/build-census-v1-family.mjs",
  "scripts/build-census-v1-*.mjs"
), true, "a concrete shared host must overlap its wildcard prohibition");

const historical = [
  { family: "oh_marijuana_expungement-set", ownedPath: historicalGlob },
  { family: "legacy_without_modern_claim-set", ownedPath: "data/legacy/**" },
  { family: "live_repair-set", ownedPath: "data/live/**" }
];
const claims = [
  {
    subjectType: "packet-family",
    subjectId: "oh_marijuana_expungement-set",
    operation: "rapid-repair",
    lane: "FIX03",
    released: true
  },
  {
    subjectType: "packet-family",
    subjectId: "live_repair-set",
    operation: "rapid-repair",
    lane: "FIX04",
    released: false
  }
];

assert.deepEqual(
  unresolvedHistoricalRepairPaths(historical, claims),
  [
    { lane: "WAVE_2_REPAIR:legacy_without_modern_claim-set", path: "data/legacy/**" }
  ],
  "any modern repair claim supersedes its historical pseudo-owner; only work with no modern claim stays protected"
);

console.log("OK path ownership recognizes glob collisions and retires only superseded historical holds");
