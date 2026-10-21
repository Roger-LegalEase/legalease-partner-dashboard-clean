#!/usr/bin/env node
/**
 * Regression protection for de_mandatory_expungement-set.
 *
 * Two disclosures owed by the committed Delaware record have been deleted from
 * this family's delivered bytes twice, and no completeness counter can see
 * either one. The nine counters range over the twelve field-map rows; both of
 * these defects are ABSENT CONTENT, not a field-map blank, so
 * verify-packet-completeness.mjs returns PASS_COMPLETE either way.
 *
 *   1. VF01 failed REQUIRED_BEFORE_FILING at 71b369461 because the certified
 *      Delaware criminal history -- the one supportingDocuments entry this
 *      track marks requiredBeforeFiling: true -- was named nowhere. FIX54
 *      restored it (integrated 61e208dd1). Commit ea96a068f rewrote the
 *      builder's own instructions[1] and deleted it again. The repository's
 *      REQUIRED_BEFORE_FILING_CONDITIONS require DISCLOSED: "the item is named
 *      in the packet's participant-instructions.md".
 *
 *   2. selfHelpStopConditions[2] (a prior granted expungement within ten years)
 *      and [4] (a Sec. 4201(c)/Beau Biden Act offence where the only route is a
 *      pardon) were printed nowhere, in the guide or the instructions. A
 *      hand-written prose paraphrase of the stop list is what allowed that: the
 *      paraphrase spoke of "prior or later convictions", which is a different
 *      fact from a prior expungement that was GRANTED, and that is the fact
 *      that bars this route.
 *
 * So this test reads the two committed records and the delivered bytes and
 * asserts, item by item, that nothing declared is missing. It is deliberately
 * a test of the DELIVERED FILE rather than of the builder's intent: a builder
 * that composes the right paragraph into bytes nobody shipped is the same
 * defect from the participant's side.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sanitizePdfText } from "../rcap-custom-pleading/composed-family-host.mjs";
import { FAMILY } from "../build-census-v1-de_mandatory_expungement-set.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TRACK_ID = "de_mandatory_expungement";
const MEMO = "data/record-clearing/legal-design-intake/DE.memo.json";
const REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const INSTRUCTIONS = "data/rcap-all50/overlays/census-v1/de/de-mandatory-expungement-set--official-pdf-fill/participant-instructions.md";

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const track = (rel) => {
  const found = readJson(rel).tracks.find((t) => t.trackId === TRACK_ID);
  assert.ok(found, `${rel} still carries the ${TRACK_ID} track`);
  return found;
};

/* Collapse whitespace and case only. Nothing else is normalised away: a test
 * that rewrote the record's own wording until it matched would be measuring
 * itself. Line wrapping is the one difference between a committed string and
 * the same string in a markdown file that is not a difference in what it says. */
const norm = (text) => String(text).replace(/\s+/g, " ").trim().toLowerCase();

const memoTrack = track(MEMO);
const registryTrack = track(REGISTRY);
const delivered = norm(fs.readFileSync(path.join(ROOT, INSTRUCTIONS), "utf8"));

const failures = [];
const expect = (present, label) => { if (!present) failures.push(label); };

/* 1. Every requiredBeforeFiling supporting document is NAMED in the delivered
 *    participant-instructions.md, and the memo's own required-before-filing
 *    limitation and filing rule are restated there rather than paraphrased. */
const requiredDocs = (memoTrack.supportingDocuments ?? []).filter((d) => d.requiredBeforeFiling === true);
assert.ok(requiredDocs.length > 0, "the memo still declares at least one requiredBeforeFiling document");
for (const doc of requiredDocs) {
  expect(delivered.includes(norm(doc.name)), `REQUIRED_BEFORE_FILING document not named in participant-instructions.md: ${doc.name}`);
}

const rbfLimitation = (memoTrack.legalDesignDecision?.limitations ?? [])
  .find((l) => l.classification === "required_before_filing");
assert.ok(rbfLimitation, "the memo still carries a required_before_filing limitation");
expect(delivered.includes(norm(rbfLimitation.statement)),
  "the memo's required_before_filing limitation is not stated in participant-instructions.md");
expect(delivered.includes(norm(memoTrack.rules.filing)),
  "the memo's rules.filing statement is not stated in participant-instructions.md");

/* 2. Every self-help stop condition is printed, verbatim, in the delivered
 *    instructions AND on the composed guide page. Both records must agree
 *    first: if the memo and the track registry ever diverge, a test that
 *    silently picked one of them would hide the divergence. */
assert.deepEqual(
  memoTrack.selfHelpStopConditions, registryTrack.selfHelpStopConditions,
  "DE.memo.json and legal-design-track-registry.json state the same self-help stop conditions"
);

const composed = norm(sanitizePdfText(
  FAMILY.composedBody("agency_preparation_guide", FAMILY.fixtures.canonical)
));
for (const [index, condition] of memoTrack.selfHelpStopConditions.entries()) {
  expect(delivered.includes(norm(condition)),
    `selfHelpStopConditions[${index}] is not in participant-instructions.md: ${condition}`);
  expect(composed.includes(norm(sanitizePdfText(condition))),
    `selfHelpStopConditions[${index}] is not on the composed guide page: ${condition}`);
}

if (failures.length) {
  console.error(`DE_MANDATORY_DISCLOSURES_MISSING: ${failures.length} declared item(s) absent from the delivered bytes`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`DE_MANDATORY_DISCLOSURES_OK: ${requiredDocs.length} required-before-filing document(s), the memo's required_before_filing limitation and filing rule, and ${memoTrack.selfHelpStopConditions.length} self-help stop condition(s) are all present in the delivered participant-instructions.md and on the composed guide page.`);
