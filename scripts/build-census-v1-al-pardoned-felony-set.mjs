#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAlabamaFamily, assertRepairInvariants } from "./build-census-v1-al-diversion-set.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MEMO_PATH = "data/record-clearing/legal-design-intake/AL.memo.json";
const out = path.join(ROOT, "data/rcap-all50/overlays/census-v1/al/al-pardoned-felony-set--official-pdf-fill");

/*
 * AL6-04, restated as a check that runs on the delivered packet.
 *
 * These assertions live here rather than in the shared host's
 * assertRepairInvariants because they are true of this family only. The three
 * other families that host builds DO make their elections, and each of their
 * ticks is backed by a memo exclusion, waiting period or participant input;
 * asserting "check nothing" against them would be wrong.
 *
 * What this guards is narrow and specific: that no box in CR-65 Section V is
 * ever again ticked on the participant's behalf, on a certification the form
 * itself calls conjunctive and the petition swears. All nine completeness
 * counters read zero while all eight were ticked, because the counters accept
 * the field map as their classification authority and can only ask whether a
 * write happened -- never whether the participant could truthfully swear it.
 */
const SECTION_V_BOXES = [
  "Check Box10.6", "Check Box11.0", "Check Box11.1", "Check Box11.2",
  "Check Box11.3", "Check Box11.4", "Check Box11.5", "Check Box11.6"
];

function assertPardonedFelonyInvariants(dir) {
  const fieldMap = JSON.parse(fs.readFileSync(path.join(dir, "production-field-map.json"), "utf8"));
  const instructions = fs.readFileSync(path.join(dir, "participant-instructions.md"), "utf8");
  const written = new Set(fieldMap.writes.map((row) => row.fieldId));

  // ROUTE_OPTIONS / AL6-04: not one limb of the sworn certification is ticked.
  for (const box of SECTION_V_BOXES) {
    assert.ok(!written.has(`CR-65:${box}`),
      `CR-65 Section V is a conjunctive sworn certification and this route may not tick it for the participant: ${box}`);
  }
  assert.equal(fieldMap.writes.filter((row) => row.documentId === "CR-65" && row.isSelectionControl).length, 0,
    "this route makes no election on the sworn petition");

  // Each limb comes back to the participant as a refused election, not silently.
  const refused = new Map(fieldMap.refusals.map((row) => [row.fieldId, row]));
  for (const box of SECTION_V_BOXES) {
    const row = refused.get(`CR-65:${box}`);
    assert.ok(row, `Section V box missing from the refusals: ${box}`);
    assert.equal(row.routeDetermined, false, `${box} must not be declared route-determined`);
  }

  // The guide must hand the certification back in full: every limb quoted as the
  // form prints it, with what the held record does and does not say about it.
  const memoBytes = fs.readFileSync(path.join(ROOT, MEMO_PATH));
  const track = JSON.parse(memoBytes.toString("utf8")).tracks.find((entry) => entry.trackId === "al-pardoned-felony");
  assert.ok(track, "the pardoned-felony track must be present in the memo");
  assert.ok(instructions.includes("The eight conditions you must certify yourself"),
    "the guide must name the certification it is handing back");
  for (const box of SECTION_V_BOXES) {
    assert.ok(instructions.includes(`### ${box} — left empty by this packet`),
      `the guide must account for every Section V box: ${box}`);
  }
  assert.match(instructions, /This packet checks none of them/,
    "the guide must say plainly that it checked nothing");

  // The record's own dispositive blocker must reach the participant, not be
  // quietly resolved in their favour by a tick.
  assert.ok(instructions.includes("The pardon withholds firearm rights and the restoration question controls."),
    "the firearm-restoration stop condition must be carried verbatim");
  assert.match(instructions, /UNRESOLVED IN THE HELD RECORD/,
    "the guide must mark the restoration limb as unresolved rather than certify it");

  // The record holds no waiting period for this route, so the 180-day limb may
  // never be presented as something the packet established.
  assert.equal((track.waitingPeriods ?? []).length, 0,
    "the memo records no waiting period for this route; if that changes, this repair must be re-reasoned");
  assert.ok(instructions.includes("The held record states no waiting period for this route at all."),
    "the guide must say the record holds no waiting period");
  assert.ok(instructions.includes(crypto.createHash("sha256").update(memoBytes).digest("hex")),
    "the guide must carry the digest of the record it quotes");
}

if (process.argv.includes("--check")) {
  assertRepairInvariants(out);
  assertPardonedFelonyInvariants(out);
  console.log("al-pardoned-felony-set: repair invariants PASS");
} else {
  await buildAlabamaFamily("al-pardoned-felony-set");
  assertRepairInvariants(out);
  assertPardonedFelonyInvariants(out);
}

export { assertPardonedFelonyInvariants };
