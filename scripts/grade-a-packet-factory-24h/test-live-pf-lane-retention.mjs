#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { effectivePacketLaneCount, livePacketLaneByFamily } from "./pf-lane-retention.mjs";

const packetClaim = {
  subjectType: "packet-family",
  subjectId: "family-under-test",
  operation: "packet-build",
  lane: "PF17",
  released: false
};

const live = livePacketLaneByFamily([packetClaim]);
assert.equal(live.get("family-under-test"), "PF17");
assert.equal(effectivePacketLaneCount(16, live), 17);

const zeroPaddedLowLane = livePacketLaneByFamily([{ ...packetClaim, lane: "PF03" }]);
assert.equal(zeroPaddedLowLane.get("family-under-test"), "PF03");
assert.equal(effectivePacketLaneCount(16, zeroPaddedLowLane), 16);

const beyondElasticMaximum = livePacketLaneByFamily([{ ...packetClaim, lane: "PF25" }]);
assert.equal(beyondElasticMaximum.get("family-under-test"), "PF25");
assert.equal(effectivePacketLaneCount(16, beyondElasticMaximum), 25);

const released = livePacketLaneByFamily([{ ...packetClaim, released: true }]);
assert.equal(released.has("family-under-test"), false);
assert.equal(effectivePacketLaneCount(16, released), 16);

const truthyReleased = livePacketLaneByFamily([{ ...packetClaim, released: "true" }]);
assert.equal(truthyReleased.has("family-under-test"), false);

const ignored = livePacketLaneByFamily([
  { ...packetClaim, lane: "VF17" },
  { ...packetClaim, operation: "independent-verification" },
  { ...packetClaim, subjectType: "source-obligation" },
  { ...packetClaim, subjectId: "" },
  { ...packetClaim, lane: "PF0" },
  { ...packetClaim, lane: "PFnot-a-number" }
]);
assert.equal(ignored.size, 0);
assert.equal(effectivePacketLaneCount(16, ignored), 16);

const generatorSource = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "generate.mjs"),
  "utf8"
);
assert.doesNotMatch(generatorSource, /finding: `Thirty-two lanes/);
assert.doesNotMatch(generatorSource, /whyNotFewerBuilders: "The roster is kept at sixteen/);
assert.match(generatorSource, /PF_LANES \+ VF_LANES \+ FIX_LANES/);

console.log("OK live PF lane-retention regression");
