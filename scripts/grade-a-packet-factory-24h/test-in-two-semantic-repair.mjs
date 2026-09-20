#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

import {
  IN_SECTION1_SOURCE_SHA, assertIndianaSection1Fixture,
  indianaSection1OccurrenceManagedFields
} from "../lib/indiana-cca-section1-occurrence-repair.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");
const root = path.resolve(new URL("../..", import.meta.url).pathname);
let assertions = 0;
const ok = (...args) => { assertions += 1; assert.ok(...args); };
const equal = (...args) => { assertions += 1; assert.equal(...args); };
const deepEqual = (...args) => { assertions += 1; assert.deepEqual(...args); };
const throws = (...args) => { assertions += 1; assert.throws(...args); };
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));

const families = [
  ["in_arrest_no_charges-set", "in-arrest-no-charges-set--official-pdf-fill", "in_arrest_no_charges"],
  ["in_section1_petition-set", "in-section1-petition-set--official-pdf-fill", "in_section1_petition"]
];

for (const [familyId, leaf, trackId] of families) {
  const base = `data/rcap-all50/overlays/census-v1/in/${leaf}`;
  const receipt = read(`${base}/source-receipt.json`);
  const actual = read(`${base}/reports/actual-writes.json`);
  const map = read(`${base}/production-field-map.json`);
  const names = read(`${base}/reports/participant-name-placement.json`);
  const guide = fs.readFileSync(path.join(root, base, "participant-instructions.md"), "utf8");

  deepEqual(receipt.documents.map((d) => d.sha256), [IN_SECTION1_SOURCE_SHA.packet, IN_SECTION1_SOURCE_SHA.inserts]);
  equal(actual.artifacts.length, 4);
  equal(names.placementsOutsideTheAllowlist, 0);
  ok(names.placements.some((row) => row.proofKind === "exact_positioned_page_content"));
  for (const artifact of actual.artifacts) {
    equal(artifact.occurrenceWritesExpected, artifact.occurrenceWritesReadExactlyOnce);
    equal(artifact.occurrenceWritesMissing, 0);
    equal(artifact.occurrenceWritesDuplicated, 0);
    equal(artifact.protectedOccurrenceWrites, 0);
    ok(artifact.occurrenceWrites.every((row) => row.exactPositionedTextRuns === 1));
    ok(artifact.occurrenceWrites.every((row) => row.sourceSha256 === IN_SECTION1_SOURCE_SHA[row.documentKey]));
    ok(artifact.occurrenceWrites.every((row) => !/(judge|judicial|prosecutor|signature|approved by|findings)/i.test(row.field)));
    const pdf = await PDFDocument.load(fs.readFileSync(path.join(root, artifact.file)), { updateMetadata: false });
    equal(pdf.getForm().getFields().length, 0);
    equal(pdf.getPageCount(), artifact.documentId.includes("INSERT") && artifact.fixture === "boundary" ? 12
      : artifact.documentId.includes("INSERT") ? 4 : 15);
    if (artifact.documentId.includes("BUNDLE")) {
      const court = artifact.occurrenceWrites.filter((row) => row.field === "DD-cap-CourtType");
      const county = artifact.occurrenceWrites.filter((row) => row.field === "County");
      deepEqual(court.map((row) => row.localSourcePage).sort((a, b) => a - b), [1, 3, 7, 9]);
      ok(court.every((row) => row.value === (artifact.fixture === "canonical" ? "SUPERIOR" : "CIRCUIT")));
      deepEqual(county.map((row) => row.localSourcePage).sort((a, b) => a - b), [5, 13, 13]);
      ok(county.every((row) => row.value === (artifact.fixture === "canonical" ? "Marion" : "Saint Joseph")));
      ok(!county.some((row) => row.localSourcePage === 12 || row.localSourcePage === 14));
    }
  }
  equal(actual.artifacts.find((a) => a.documentId.includes("INSERT") && a.fixture === "boundary").insertSetCount, 3);
  ok(map.documents.every((doc) => doc.writeBoxes
    .filter((row) => row.writeKind === "source_measured_occurrence_overlay")
    .every((row) => row.rectBasis === "exact_occurrence_rect_measured_from_pinned_source_widget")));
  const insert = map.documents.find((doc) => doc.documentId.includes("INSERT"));
  const packet = map.documents.find((doc) => doc.documentId.includes("BUNDLE"));
  equal(packet.fields.find((row) => row.field === "DD-cap-CourtType")?.decision, "write");
  equal(packet.fields.find((row) => row.field === "DD-cap-CourtType")?.factId, "matter.court_type");
  equal(packet.fields.find((row) => row.field === "County")?.decision, "write");
  for (const field of ["PetitionerAliases", "LEA1", "LEA2", "LEA3"]) {
    equal(packet.fields.find((row) => row.field === field)?.requiredBeforeFiling, true);
    equal(packet.partialFills.find((row) => row.field === field)?.writtenOccurrences.startsWith("none"), true);
  }
  ok(packet.partialFills.find((row) => row.field === "County")?.leftBlankOccurrences.includes("page 12"));
  ok(packet.partialFills.find((row) => row.field === "County")?.leftBlankOccurrences.includes("page 14"));
  for (const field of ["Check Box16", "Check Box18", "Check Box20", "Check Box22", "Check Box24", "Check Box27", "Check Box28", "Check Box30"]) {
    equal(insert.fields.find((row) => row.field === field)?.decision, "refuse");
  }
  for (const field of ["NameArrestingOfficer", "ArrestingAgency", "LEACaseNumber"])
    ok(insert.fields.find((row) => row.field === field)?.conditionDescription?.includes("known or available"));
  ok(guide.includes("three certificates of service"));
  ok(guide.includes("public until the order is granted"));
  ok(guide.includes("does not delete or destroy"));
  ok(guide.includes("Expunged pursuant to I.C. § 35-38-9-1"));
  ok(guide.includes("NOT expunged"));
  ok(guide.includes("county where the charges were filed"));
  ok(guide.includes("county of arrest if no charges were filed"));
  ok(guide.includes("no filing fee"));
  ok(guide.includes("no fee-waiver application is needed"));
  ok(guide.includes("petition page 3, list every other name or alias used"));
  ok(guide.includes("petition page 5, identify each applicable"));
  ok(!/Check Box\d+|PetFullSSN|data\/record-clearing|selfHelpStopConditions/.test(guide));
  if (familyId === "in_arrest_no_charges-set") ok(/court sets a hearing/i.test(guide));
  else {
    ok(guide.includes("agrees **in writing**"));
    ok(guide.includes("Silence is not agreement"));
  }
  assertIndianaSection1Fixture({
    "fixture.synthetic": true, "participant.state": "IN", "matter.court": "Marion Superior Court",
    "matter.charges": [{ arrest_date: "2023-07-01", arrest_city: "Indianapolis", disposition: trackId === "in_arrest_no_charges"
      ? "arrested_no_charges_filed" : "all_charges_dismissed_before_trial",
    ...(trackId === "in_section1_petition" ? { case_number: "49D01-2307-CM-000001", charge: "Trespass",
      disposition_date: "2023-08-01", charges_filed_date: "2023-07-03" } : {}) }]
  }, trackId);
}

// Historical generic fixtures remain negative controls; they are not silently
// rewritten into participant facts merely to make two routes differ.
const old = { "fixture.synthetic": true, "participant.state": "XX", "matter.court": "District Court",
  "matter.charges": [{ arrest_date: "2019-03-08", conviction_date: "2019-11-02" }] };
throws(() => assertIndianaSection1Fixture(old, "in_arrest_no_charges"), /Indiana/);
throws(() => assertIndianaSection1Fixture({ ...old, "participant.state": "IN" }, "in_arrest_no_charges"), /circuit or superior/);
throws(() => assertIndianaSection1Fixture({ ...old, "participant.state": "IN", "matter.court": "Marion Superior Court",
  "matter.charges": [{ arrest_date: "2019-03-08", arrest_city: "Indianapolis", disposition: "arrested_no_charges_filed" }] }, "in_arrest_no_charges"), /after June 30, 2022/);
throws(() => assertIndianaSection1Fixture({ ...old, "participant.state": "IN", "matter.court": "Marion Superior Court",
  "matter.charges": [{ arrest_date: "2023-03-08", arrest_city: "Indianapolis", disposition: "all_charges_dismissed_before_trial", conviction_date: "2023-05-01",
    case_number: "49D01-2303-CM-1", charge: "Trespass", disposition_date: "2023-06-01", charges_filed_date: "2023-03-10" }] },
"in_section1_petition"), /must not carry a conviction date/);

deepEqual(indianaSection1OccurrenceManagedFields("packet").includes("PetDOB"), true);
deepEqual(indianaSection1OccurrenceManagedFields("inserts").includes("ChargeDisposition-Ct1"), true);
throws(() => indianaSection1OccurrenceManagedFields("order"), /unsupported Indiana document/);

console.log(JSON.stringify({ result: "PASS", families: 2, assertions,
  sourceOccurrenceDocuments: 8, protectedFindingsControlsChecked: 16, invalidFixtureNegativeControls: 5 }));
