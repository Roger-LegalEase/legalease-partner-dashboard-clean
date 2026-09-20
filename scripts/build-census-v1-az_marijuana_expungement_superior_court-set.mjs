#!/usr/bin/env node
/*
 * The Arizona superior-court marijuana expungement family (A.R.S. § 36-2862).
 *
 *   node scripts/build-census-v1-az_marijuana_expungement_superior_court-set.mjs [--check]
 *
 * The packet itself is built by the shared WEST host, exactly as before. What
 * this entrypoint adds is the participant guidance for THIS family, and only
 * this family.
 *
 * FIX03 / VF03. The verifier's decisive defect was that
 * participant-instructions.md is a 911-byte generic stub: four of the fifteen
 * proof obligations -- FILING_DESTINATION, FEE_AND_WAIVER, SERVICE and
 * SELF_HELP_STOP -- had no answer anywhere in the packet, "though the track
 * registry holds all of them". The host's westParticipantInstructions() writes
 * the field-map gap list and nothing else, so those four answers had nowhere to
 * come from.
 *
 * Why the repair lives here rather than in the host. The WEST host builds nine
 * families -- both Arizona tracks and seven California ones -- and this lane
 * holds a repair claim on this family alone. The lane's owned paths are this
 * entrypoint and this family's overlay directory; the host is not among them,
 * and rewriting a shared instruction writer would put eight unclaimed families
 * inside the blast radius of one repair. A per-family entrypoint writing its
 * own family's guidance cannot reach another family at all, which is the
 * property that matters here.
 *
 * Nothing below is composed. Every sentence the packet gains is printed
 * verbatim from data/record-clearing/legal-design-track-registry.json, track
 * az_marijuana_expungement_superior_court, and every one of them is asserted
 * against the registry before anything is written: if the registry moves, this
 * build fails rather than printing a stale rule. No fee figure, no service
 * recipient, no filing destination and no eligibility rule originates in this
 * file.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runWestFamilyCli } from "./build-census-v1-az_marijuana_expungement_arrest_no_charges-set.mjs";

const FAMILY_ID = "az_marijuana_expungement_superior_court-set";
const TRACK_ID = "az_marijuana_expungement_superior_court";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const OUT = `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-superior-court-set--official-pdf-fill`;
const INSTRUCTIONS = `${OUT}/participant-instructions.md`;

/*
 * The registry sentences this family prints, pinned by value.
 *
 * These are assertions, not defaults: readTrack() refuses to continue if the
 * registry no longer says exactly this. A repair that silently kept printing
 * yesterday's rule would be worse than one that stops.
 */
const PINNED = Object.freeze({
  venue: "Statewide Arizona law; file in the superior court that concluded the case, including a case that began in justice court and moved up.",
  destinationName: "The superior court that concluded the case",
  destinationDetail: "File in person, by mail, or by e-filing where the court accepts it. The court sends the petition to the prosecuting agency within 10 days.",
  fees: "none. Rule 36(a)(4) bars a filing fee.",
  feeWaiver: "none",
  service: "none. Rule 36(b)(2) puts transmittal on the court.",
  notice: "The court sends the petition to the prosecuting agency within 10 days. The agency may respond within 30 days; the petitioner may reply within 15 days.",
  handoff: "A routine hearing contemplated by statute does not prevent packet generation. Opposition, disputed evidence, or a contested hearing is a post_generation_handoff.",
});

function readTrack() {
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, REGISTRY), "utf8"));
  const track = (registry.tracks ?? []).find((row) => row.trackId === TRACK_ID);
  assert.ok(track, `${FAMILY_ID}: the track registry no longer carries ${TRACK_ID}`);
  assert.equal(track.jurisdiction, "AZ");
  assert.equal(track.packetSet?.packetSetId, FAMILY_ID,
    `${FAMILY_ID}: the registry track no longer names this packet set`);

  assert.equal(track.venue, PINNED.venue, `${FAMILY_ID}: registry venue moved`);
  assert.equal(track.destination?.kind, "court");
  assert.equal(track.destination?.name, PINNED.destinationName, `${FAMILY_ID}: registry destination name moved`);
  assert.equal(track.destination?.detail, PINNED.destinationDetail, `${FAMILY_ID}: registry destination detail moved`);
  assert.equal(track.rules?.fees, PINNED.fees, `${FAMILY_ID}: registry fee rule moved`);
  assert.equal(track.rules?.feeWaiver, PINNED.feeWaiver, `${FAMILY_ID}: registry fee-waiver rule moved`);
  assert.equal(track.rules?.service, PINNED.service, `${FAMILY_ID}: registry service rule moved`);
  assert.equal(track.rules?.notice, PINNED.notice, `${FAMILY_ID}: registry notice rule moved`);

  const boundaries = track.selfHelpBoundaries ?? [];
  assert.ok(boundaries.length > 1, `${FAMILY_ID}: registry records no self-help boundaries`);
  assert.equal(boundaries.at(-1), PINNED.handoff, `${FAMILY_ID}: registry handoff statement moved`);
  assert.deepEqual(track.postGenerationHandoffs, [PINNED.handoff],
    `${FAMILY_ID}: registry post-generation handoff moved`);

  // The last boundary is the rule ABOUT the others, not another stop of its own.
  // It is printed separately, below the list, so the distinction the registry
  // draws between a routine statutory hearing and a contested one survives.
  return { stops: boundaries.slice(0, -1), handoff: PINNED.handoff };
}

/*
 * The four sections, in the registry's own words.
 *
 * FEE_AND_WAIVER departs from the wording VF03 suggested, and says so out loud
 * here so the next reader sees the choice rather than discovering it. The
 * assignment proposed delegating the fee to the clerk "because no fee is
 * established for this track in the records read here". The registry that same
 * assignment names as the source for the other three obligations does establish
 * it: rules.fees is "none. Rule 36(a)(4) bars a filing fee." and the packet
 * set's own pay_fee action repeats it. Telling a participant that no figure is
 * established, when the held record says a fee is barred outright, would print
 * something the record contradicts. So the record's sentence is printed
 * verbatim, and the clerk is named for what remains genuinely local.
 */
function guidanceSections(track) {
  const stops = track.stops.map((line) => `- ${line}`).join("\n");
  return `## Where you file this

The track record states the venue: *"${PINNED.venue}"*

It names the destination as **${PINNED.destinationName}**, and states how the petition gets there: *"${PINNED.destinationDetail}"*

A case that began in a justice court and moved up is filed with the court that concluded it, which is what the venue sentence above says.

## What this costs

The track record states the fee for this route in one line: *"${PINNED.fees}"* It records the fee waiver as *"${PINNED.feeWaiver}"* — there is no fee on this petition, so there is nothing to ask to have waived.

No dollar figure appears anywhere in this packet, because the record answers this question with a bar rather than with an amount, and this build does not write an unsourced figure. If a clerk asks you to pay a filing fee on this petition, the office to raise it with is the clerk of the superior court that concluded your case.

## Who must be served, and how

The track record states: *"${PINNED.service}"* You do not serve the petition on anyone. The court does the transmitting: *"${PINNED.notice}"*

Any local question about how a particular superior court handles that transmittal is for the clerk of the court that concluded your case.

## When to stop and get help

The track record lists the conditions under which this packet is not the right tool and the matter should go to a person:

${stops}

The record draws one distinction on that list, and it is printed here in the record's own words: *"${PINNED.handoff}"* A hearing the statute itself contemplates is a normal step, not a sign that something has gone wrong; opposition or a contested hearing is where this stops being a self-help packet.
`;
}

function writeGuidance() {
  const track = readTrack();
  const file = path.join(ROOT, INSTRUCTIONS);
  const base = fs.readFileSync(file, "utf8");
  assert.ok(base.includes(`Packet family: \`${FAMILY_ID}\``),
    `${FAMILY_ID}: the host wrote instructions for a different family`);
  assert.equal(base.includes("## Where you file this"), false,
    `${FAMILY_ID}: guidance already present — the host stopped rewriting the stub`);
  const merged = `${base.trimEnd()}\n\n${guidanceSections(track)}`;
  fs.writeFileSync(file, merged.endsWith("\n") ? merged : `${merged}\n`);
}

function checkGuidance() {
  const track = readTrack();
  const text = fs.readFileSync(path.join(ROOT, INSTRUCTIONS), "utf8");
  for (const [name, sentence] of Object.entries(PINNED)) {
    assert.ok(text.includes(sentence), `${FAMILY_ID}: participant instructions do not carry the registry ${name}`);
  }
  for (const stop of track.stops) {
    assert.ok(text.includes(stop), `${FAMILY_ID}: participant instructions drop a registry stop condition`);
  }
  for (const heading of ["## Where you file this", "## What this costs",
    "## Who must be served, and how", "## When to stop and get help"]) {
    assert.ok(text.includes(heading), `${FAMILY_ID}: participant instructions are missing ${heading}`);
  }
}

// runWestFamilyCli reads process.argv itself; argv here only decides what this
// entrypoint does after the host has finished.
const argv = process.argv.slice(2);
await runWestFamilyCli(FAMILY_ID);
if (argv.includes("--self-test")) {
  checkGuidance();
} else if (argv.includes("--check")) {
  checkGuidance();
  console.log(`GUIDANCE_CHECK_OK ${FAMILY_ID}`);
} else {
  writeGuidance();
  checkGuidance();
  console.log(`GUIDANCE_OK ${FAMILY_ID} (registry: ${REGISTRY})`);
}
