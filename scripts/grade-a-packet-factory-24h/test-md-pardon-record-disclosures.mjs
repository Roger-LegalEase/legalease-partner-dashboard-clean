#!/usr/bin/env node
/**
 * Regression protection for md_pardon_expungement-set.
 *
 * VF20 failed this family twice, both times on participant-facing copy that no
 * completeness counter reads.
 *
 *   1. FEE_AND_WAIVER. filing-instructions.md told the participant "Maryland
 *      charges a filing fee ... This packet does not state an amount, because
 *      no held source establishes one; ask the clerk." That is MISSOURI's
 *      sentence, true there because MO.memo.json says "No fee figure is
 *      published on this track". Carried into Maryland it asserts an absence
 *      the controlling record contradicts: MD.memo.json records rules.fees
 *      "$30 (CC-DC-CR-072B)." and conditions the fee_waiver component on
 *      "Where the participant cannot pay the $30 filing fee." The delivered
 *      petition prints "Filing Fees Are Not Refundable" and no amount.
 *
 *   2. SELF_HELP_STOP. The stops were a hand-written prose PARAPHRASE. The
 *      record declares three conditions; measured verbatim, NONE of the three
 *      was present, and the third - "The State's Attorney objects." - was
 *      absent in substance too: zero occurrences of "State's Attorney" in
 *      either instruction file. So the participant got the form's victim
 *      notice but was never told a prosecutor's objection is a
 *      stop-and-get-a-lawyer condition.
 *
 * A third, weaker, item was recorded by VF20 as an observation and is asserted
 * here too: the requiredBeforeFiling pardon document was disclosed in substance
 * but the record's own name for it, and the place the record says to get it,
 * were not printed, so a participant without the document was not told where to
 * go.
 *
 * None of these is visible to the nine counters - they range over this family's
 * field-map rows, and the defects are content. verify-packet-completeness.mjs
 * returned PASS_COMPLETE 32/146 with all nine zero while every one held.
 *
 * This test reads the two committed records and the DELIVERED bytes. It is
 * deliberately a test of the delivered files rather than of the builder's
 * intent: a builder that composes the right paragraph into bytes nobody shipped
 * is the same defect from the participant's side.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TRACK_ID = "md_pardon_expungement";
const MEMO = "data/record-clearing/legal-design-intake/MD.memo.json";
const REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const DIR = "data/rcap-all50/overlays/census-v1/md/md-pardon-expungement-set--official-pdf-fill";

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const trackOf = (rel) => {
  const found = readJson(rel).tracks.find((t) => t.trackId === TRACK_ID);
  assert.ok(found, `${rel} still carries the ${TRACK_ID} track`);
  return found;
};

/* Collapse whitespace and case only. Nothing else is normalised away: a test
 * that rewrote the record's own wording until it matched would be measuring
 * itself. */
const norm = (text) => String(text).replace(/\s+/g, " ").trim().toLowerCase();

const memoTrack = trackOf(MEMO);
const registryTrack = trackOf(REGISTRY);
const participant = norm(fs.readFileSync(path.join(ROOT, `${DIR}/participant-instructions.md`), "utf8"));
const filing = norm(fs.readFileSync(path.join(ROOT, `${DIR}/filing-instructions.md`), "utf8"));

const failures = [];
const expect = (present, label) => { if (!present) failures.push(label); };

/* Both records must agree before either is used. A test that silently picked
 * one of them would hide a divergence rather than report it. */
assert.deepEqual(
  memoTrack.selfHelpStopConditions, registryTrack.selfHelpStopConditions,
  "MD.memo.json and legal-design-track-registry.json state the same self-help stop conditions"
);
assert.deepEqual(
  memoTrack.rules?.fees, registryTrack.rules?.fees,
  "MD.memo.json and legal-design-track-registry.json state the same fees rule"
);

/* 1. Every requiredBeforeFiling supporting document is named in the delivered
 *    participant-instructions.md, with the record's own obtainedFrom. */
const requiredDocs = (memoTrack.supportingDocuments ?? []).filter((d) => d.requiredBeforeFiling === true);
assert.ok(requiredDocs.length > 0, "the memo still declares at least one requiredBeforeFiling document");
for (const doc of requiredDocs) {
  expect(participant.includes(norm(doc.name)),
    `REQUIRED_BEFORE_FILING document not named in participant-instructions.md: ${doc.name}`);
  expect(participant.includes(norm(doc.obtainedFrom)),
    `REQUIRED_BEFORE_FILING document "${doc.name}": obtainedFrom not stated: ${doc.obtainedFrom}`);
}

/* 2. Every self-help stop condition the record declares is printed verbatim in
 *    the delivered participant-instructions.md. All three were missing
 *    verbatim before this repair, not only the one VF20 named. */
const stops = memoTrack.selfHelpStopConditions ?? [];
assert.ok(stops.length > 0, "the memo still declares at least one self-help stop condition");
for (const [index, condition] of stops.entries()) {
  expect(participant.includes(norm(condition)),
    `selfHelpStopConditions[${index}] is not in participant-instructions.md: ${condition}`);
}

/* 3. The fee. The record's own words for rules.fees must reach both instruction
 *    files, and neither may tell the participant that no held source
 *    establishes the fee while the record establishes it. The second assertion
 *    is the one that catches Missouri boilerplate arriving again. */
const feeRule = memoTrack.rules?.fees ?? "";
assert.ok(feeRule, "the memo still states a fees rule for this track");
for (const [label, text] of [["participant-instructions.md", participant], ["filing-instructions.md", filing]]) {
  expect(text.includes(norm(feeRule)),
    `${label} does not state the fee the record establishes: ${feeRule}`);
  expect(!/no held source establishes one/.test(text),
    `${label} tells the participant no held source establishes the filing fee, while MD.memo.json states `
    + `rules.fees ${JSON.stringify(feeRule)}`);
}
expect(filing.includes(norm(memoTrack.rules?.feeWaiver ?? "")),
  `filing-instructions.md does not name the record's fee waiver: ${memoTrack.rules?.feeWaiver}`);

/* 4. rules.notice is what makes the third stop condition actionable - the
 *    participant does not start the objection, the court's service does. It is
 *    quoted beside the stops rather than paraphrased. */
const notice = memoTrack.rules?.notice ?? "";
assert.ok(notice, "the memo still states a notice rule for this track");
expect(participant.includes(norm(notice)),
  `participant-instructions.md does not state the record's notice rule: ${notice}`);

if (failures.length) {
  console.error(`MD_PARDON_DISCLOSURES_MISSING: ${failures.length} declared item(s) absent from or contradicted by the delivered bytes`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  `MD_PARDON_DISCLOSURES_OK: ${requiredDocs.length} required-before-filing document(s) with their obtainedFrom, `
  + `${stops.length} self-help stop condition(s), the record's fees, feeWaiver and notice rules are all present `
  + "verbatim in the delivered instructions, and neither file asserts the fee is unestablished."
);
