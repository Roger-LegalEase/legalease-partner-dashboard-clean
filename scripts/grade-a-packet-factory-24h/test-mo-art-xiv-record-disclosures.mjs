#!/usr/bin/env node
/**
 * Regression protection for mo-art-xiv-marijuana-set.
 *
 * VF20 failed this family on REQUIRED_BEFORE_FILING: MO.memo.json's
 * mo-art-xiv-marijuana track marks the "Certified docket sheet and judgment for
 * each case" requiredBeforeFiling true, and the words "certified", "docket" and
 * "judgment" appeared ZERO times in either delivered instruction file. The
 * repository's REQUIRED_BEFORE_FILING_CONDITIONS require such an item to be
 * DISCLOSED - named in participant-instructions.md as something to obtain and
 * submit, not mentioned in passing.
 *
 * Re-reading the record while repairing that turned up the same shape in the
 * stop conditions. The builder carried a one-sentence hand-written PARAPHRASE
 * of the eleven conditions the record declares. Measured verbatim, all eleven
 * were absent, and seven were absent in substance too - distribution to a
 * minor, violence, driving under the influence, a class A/B/C marijuana felony,
 * more than three pounds or an unclear quantity, an arguable Article XIV
 * sections 1 and 2 question, and a Case.net/Highway Patrol disagreement. A
 * paraphrase keeps only what its author happened to think of.
 *
 * No completeness counter can see either loss. The nine counters range over
 * this family's field-map rows and both defects are ABSENT CONTENT rather than
 * an unclassified blank, so verify-packet-completeness.mjs returned
 * PASS_COMPLETE with all nine zero while both held.
 *
 * So this test reads the two committed records and the DELIVERED bytes and
 * asserts, item by item, that nothing the record declares is missing. It is
 * deliberately a test of the delivered file rather than of the builder's
 * intent: a builder that composes the right paragraph into bytes nobody
 * shipped is the same defect from the participant's side.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TRACK_ID = "mo-art-xiv-marijuana";
const MEMO = "data/record-clearing/legal-design-intake/MO.memo.json";
const REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const DIR = "data/rcap-all50/overlays/census-v1/mo/mo-art-xiv-marijuana-set--official-pdf-fill";
const INSTRUCTIONS = `${DIR}/participant-instructions.md`;
const FILING = `${DIR}/filing-instructions.md`;

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const trackOf = (rel) => {
  const found = readJson(rel).tracks.find((t) => t.trackId === TRACK_ID);
  assert.ok(found, `${rel} still carries the ${TRACK_ID} track`);
  return found;
};

/* Collapse whitespace and case only. Nothing else is normalised away: a test
 * that rewrote the record's own wording until it matched would be measuring
 * itself. Line wrapping is the one difference between a committed string and
 * the same string in a markdown file that is not a difference in what it says. */
const norm = (text) => String(text).replace(/\s+/g, " ").trim().toLowerCase();

const memoTrack = trackOf(MEMO);
const registryTrack = trackOf(REGISTRY);
const delivered = norm(fs.readFileSync(path.join(ROOT, INSTRUCTIONS), "utf8"));
const deliveredFiling = norm(fs.readFileSync(path.join(ROOT, FILING), "utf8"));

const failures = [];
const expect = (present, label) => { if (!present) failures.push(label); };

/* The two records must agree before either is used. If the memo and the track
 * registry ever diverge, a test that silently picked one of them would hide the
 * divergence rather than report it. */
assert.deepEqual(
  memoTrack.selfHelpStopConditions, registryTrack.selfHelpStopConditions,
  "MO.memo.json and legal-design-track-registry.json state the same self-help stop conditions"
);

/* 1. Every requiredBeforeFiling supporting document is named in the delivered
 *    participant-instructions.md, with the record's own obtainedFrom and
 *    howToObtain, so a participant who does not have it is told where to go. */
const requiredDocs = (memoTrack.supportingDocuments ?? []).filter((d) => d.requiredBeforeFiling === true);
assert.ok(requiredDocs.length > 0, "the memo still declares at least one requiredBeforeFiling document");
for (const doc of requiredDocs) {
  expect(delivered.includes(norm(doc.name)),
    `REQUIRED_BEFORE_FILING document not named in participant-instructions.md: ${doc.name}`);
  expect(delivered.includes(norm(doc.obtainedFrom)),
    `REQUIRED_BEFORE_FILING document "${doc.name}": obtainedFrom not stated: ${doc.obtainedFrom}`);
  expect(delivered.includes(norm(doc.howToObtain)),
    `REQUIRED_BEFORE_FILING document "${doc.name}": howToObtain not stated`);
}

/* 2. Every self-help stop condition the record declares is printed verbatim in
 *    the delivered participant-instructions.md. */
const stops = memoTrack.selfHelpStopConditions ?? [];
assert.ok(stops.length > 0, "the memo still declares at least one self-help stop condition");
for (const [index, condition] of stops.entries()) {
  expect(delivered.includes(norm(condition)),
    `selfHelpStopConditions[${index}] is not in participant-instructions.md: ${condition}`);
}

/* 3. The withdrawn corroboration must not come back. The binary prints
 *    "Expunge Marijuana Criminal/Arrest Records  X#" on page 4 only, at x
 *    213.48-224.36, inside the ASSOCIATE column (header x 195.72-243.69) and
 *    NOT the CIRCUIT column (header x 250.08-284.02), whose cell is empty on
 *    that row while the neighbouring expungement rows carry XG and X5 there.
 *    The value X# is supported by the census destination record; it is not
 *    supported by a CIRCUIT row, because the form has none. */
const fieldMap = norm(fs.readFileSync(path.join(ROOT, `${DIR}/production-field-map.json`), "utf8"));
const findings = norm(fs.readFileSync(path.join(ROOT, `${DIR}/build-findings.json`), "utf8"));

expect(!fieldMap.includes("carries the circuit row"),
  "production-field-map.json again asserts the FI-05 marijuana row is a CIRCUIT row; it is printed in ASSOCIATE");
expect(fieldMap.includes("associate column"),
  "production-field-map.json no longer records that X# sits in the ASSOCIATE column");
expect(findings.includes("that corroboration was false and is withdrawn"),
  "build-findings.json no longer records that the CIRCUIT-column corroboration was false and withdrawn");
expect(findings.includes("associate column"),
  "build-findings.json no longer records that X# sits in the ASSOCIATE column");

/* 4. The false-absence sentence Missouri's fee copy is entitled to must stay
 *    true of Missouri. MO.memo.json says of this track "No fee figure is
 *    published on this track", so filing-instructions.md may say the held
 *    sources establish no fee - and must stop saying it the moment the record
 *    does publish one. This is the same defect Maryland carried, in the
 *    direction it could travel next. */
const feeRule = memoTrack.rules?.fees ?? "";
assert.ok(feeRule, "the memo still states a fees rule for this track");
if (!/no fee figure is published/i.test(feeRule)) {
  expect(!/no held source establishes one/.test(deliveredFiling),
    "MO.memo.json now publishes a fee figure, but filing-instructions.md still tells the participant no held "
    + "source establishes one");
}

if (failures.length) {
  console.error(`MO_ART_XIV_DISCLOSURES_MISSING: ${failures.length} declared item(s) absent from the delivered bytes`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  `MO_ART_XIV_DISCLOSURES_OK: ${requiredDocs.length} required-before-filing document(s) with their obtainedFrom `
  + `and howToObtain, and ${stops.length} self-help stop condition(s), are present verbatim in the delivered `
  + "participant-instructions.md; the withdrawn CIRCUIT-column corroboration has not reappeared; and the fee "
  + "copy still matches what the record publishes."
);
