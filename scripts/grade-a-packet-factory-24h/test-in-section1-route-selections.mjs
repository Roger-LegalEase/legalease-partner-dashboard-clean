#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { settledIndianaSection1ParticipantSelections }
  from "../lib/indiana-cca-section1-route-selections.mjs";
import { readTrackWaitingPeriods } from "../lib/indiana-cca-section1-guide.mjs";

const root = path.resolve(new URL("../..", import.meta.url).pathname);
let assertions = 0;
const equal = (...args) => { assertions += 1; assert.equal(...args); };
const deepEqual = (...args) => { assertions += 1; assert.deepEqual(...args); };
const ok = (...args) => { assertions += 1; assert.ok(...args); };
const throws = (...args) => { assertions += 1; assert.throws(...args); };

const facts = {
  "deterministic.filing_date": "2026-08-12",
  "matter.disposition": "all_charges_dismissed_before_trial",
  "matter.charges": [
    { arrest_date: "2019-03-08", disposition_date: "2020-01-15" },
    { arrest_date: "2021-09-02", disposition_date: "2022-02-14" }
  ]
};
const arrestTrack = readTrackWaitingPeriods({ rootDir: root, trackId: "in_arrest_no_charges" });
const sectionTrack = readTrackWaitingPeriods({ rootDir: root, trackId: "in_section1_petition" });
const arrest = settledIndianaSection1ParticipantSelections({
  trackId: arrestTrack.trackId, dispositions: arrestTrack.dispositions, facts
});
const section = settledIndianaSection1ParticipantSelections({
  trackId: sectionTrack.trackId, dispositions: sectionTrack.dispositions, facts
});

deepEqual(Object.keys(arrest), ["Check Box19", "Check Box25"]);
deepEqual(Object.keys(section), ["Check Box17", "Check Box19", "Check Box25"]);
equal(arrest["Check Box19"].checked, true);
equal(arrest["Check Box25"].checked, true);
equal(section["Check Box25"].checked, true);
equal(section["Check Box17"].checked, true);
equal(section["Check Box19"].checked, true);
ok(arrest["Check Box19"].basis.includes("arrested_no_charges_filed"));
ok(arrest["Check Box25"].basis.includes("2022-02-14"));

// The nearby branch asserts that the prosecutor declined charges. The route
// says only that charges were not filed and cannot settle that stronger fact.
equal(Object.hasOwn(arrest, "Check Box15"), false);
equal(Object.hasOwn(section, "Check Box15"), false);
// Unsupported acquittal and appellate branches remain participant answers.
for (const name of ["Check Box21", "Check Box23"]) {
  equal(Object.hasOwn(section, name), false);
}
// Court FINDINGS use separate even-numbered controls and are never returned.
for (const name of ["Check Box16", "Check Box18", "Check Box20", "Check Box22", "Check Box24", "Check Box27", "Check Box28", "Check Box30"]) {
  equal(Object.hasOwn(arrest, name), false);
  equal(Object.hasOwn(section, name), false);
}

const tooEarly = settledIndianaSection1ParticipantSelections({
  trackId: sectionTrack.trackId,
  dispositions: sectionTrack.dispositions,
  facts: { "deterministic.filing_date": "2022-10-01", "matter.disposition": "all_charges_dismissed_before_trial",
    "matter.charges": [{ arrest_date: "2022-02-01", disposition_date: "2022-02-14" }] }
});
equal(Object.hasOwn(tooEarly, "Check Box25"), false);
const anniversary = settledIndianaSection1ParticipantSelections({
  trackId: sectionTrack.trackId,
  dispositions: sectionTrack.dispositions,
  facts: { "deterministic.filing_date": "2023-02-14", "matter.disposition": "all_charges_dismissed_before_trial",
    "matter.charges": [{ arrest_date: "2022-02-01", disposition_date: "2022-02-14" }] }
});
equal(anniversary["Check Box25"].checked, true);
throws(() => settledIndianaSection1ParticipantSelections({
  trackId: arrestTrack.trackId, dispositions: ["all_charges_dismissed"], facts
}), /exact governed no-charges disposition/);

// The current builders must keep the settled participant controls out of the
// broad unwritable list and must pass the helper into the finalizer.
for (const [builder, expected] of [
  ["scripts/build-census-v1-in_arrest_no_charges-set.mjs", ["Check Box19", "Check Box25"]],
  ["scripts/build-census-v1-in_section1_petition-set.mjs", ["Check Box17", "Check Box19", "Check Box25"]]
]) {
  const source = fs.readFileSync(path.join(root, builder), "utf8");
  ok(source.includes("settledIndianaSection1ParticipantSelections"));
  ok(source.includes("selectionsFromHeldFacts:"));
  for (const field of expected) ok(source.includes(`\"${field}\"`));
}

console.log(JSON.stringify({ result: "PASS", assertions, families: 2,
  positiveSelections: { arrestNoCharges: Object.keys(arrest), section1: Object.keys(section) },
  negativeControls: 22 }));
