#!/usr/bin/env node
// Protection for adjudicative sections and records-custody clauses.
//
//   node scripts/verify-rcap-adjudicative-region-protection.mjs
//
// Gate B review wave 1 found the participant's own name written into two kinds
// of place the participant does not complete:
//
//   NC AOC-CR-288, side two, under the printed heading FINDINGS OF FACT, on
//   the judge's line for WHY a petitioner was found ineligible. The filed order
//   read "...If not eligible, it is because: Jordan Avery Reyes".
//
//   KY AOC-334, in the records-custody clause that directs every agency
//   holding records "in their custody regarding the above-named Defendant and
//   above-listed charge(s)" to expunge them. The two blanks under that clause
//   name the AGENCIES and the CHARGES; both took the participant's name.
//
// In each case the widget's region heading and its printed caption were
// captured, recorded in the committed census and map, and matched nothing in
// PROTECT_RULES — so the field NAME decided, and the field names contained
// "Petitioner" and "charges". These assertions fail if either rule is narrowed
// back, which is the only thing standing between the corpus and those bytes
// being produced again.
//
// The cases are driven from the committed field-census and field-classification
// of the affected families, so this verifies the real inputs rather than a
// restatement of them, and it needs no Master Library mount to run.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decideBinding, protectCategoryOf } from "./rcap-official-forms/rcap-field-semantics.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROD = path.join(rootDir, "data/rcap-all50/overlays/production");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

// familyPath -> [ [fieldName, expectation, category] ]
const CASES = [
  ["kentucky/aoc-334-form-en", [
    ["Text1", "refused", "agency"],
    ["listed charges", "refused", "agency"],
    ["Date", "refused", "court"],
    ["Case  No", "writable", "matter.case_number"],
    ["Defendant", "writable", "participant.full_legal_name"],
    ["Defendants Birthdate", "writable", "participant.date_of_birth"]
  ]],
  ["north-carolina/aoc-cr-288-form-en", [
    ["PetitionerIsEligibleBecauseText1", "refused", "court"],
    ["NamePetitioner", "writable", "participant.full_legal_name"],
    ["StreetAddr", "writable", "participant.street_address"],
    ["City", "writable", "participant.city"],
    ["County", "writable", "matter.county"],
    ["ConsJdgmntFileNum", "writable", "matter.case_number"]
  ]]
];

const problems = [];
let checks = 0;

for (const [family, expectations] of CASES) {
  const dir = path.join(PROD, family);
  const entries = readJson(path.join(dir, "field-classification.json")).entries ?? [];
  const map = readJson(path.join(dir, "production-field-map.json"));
  const byName = new Map(entries.map((e) => [e.name, e]));

  for (const [name, expectation, detail] of expectations) {
    const entry = byName.get(name);
    checks += 1;
    if (!entry) { problems.push(`${family}: ${name} is not in the committed classification`); continue; }
    const decision = decideBinding(
      { name: entry.name, pdfType: entry.type, effectiveLabel: entry.effectiveLabel, regionHeading: entry.regionHeading },
      { explicitMappings: {}, captionOnly: map.captionOnly === true, availableChargeRows: 1, documentAcceptsFill: true }
    );
    if (expectation === "refused") {
      if (decision.writable) {
        problems.push(`${family}: ${name} binds ${decision.factId}; it sits in a ${detail} region and must be refused`);
      } else if (decision.category !== detail) {
        problems.push(`${family}: ${name} is refused as ${decision.category}, expected ${detail}`);
      }
    } else if (!decision.writable) {
      problems.push(`${family}: ${name} is refused (${decision.reason}); it is a participant field and must still bind`);
    } else if (decision.factId !== detail) {
      problems.push(`${family}: ${name} binds ${decision.factId}, expected ${detail}`);
    }
  }
}

// Protection must not depend on what a field is called. Renaming the two
// offending fields to something innocuous must not unprotect them, because the
// region heading and the printed caption are what refuse them.
const RENAME_MUTATIONS = [
  ["north-carolina/aoc-cr-288-form-en", "PetitionerIsEligibleBecauseText1", "Notes1", "court"],
  ["kentucky/aoc-334-form-en", "listed charges", "Text9", "agency"]
];
for (const [family, original, innocuous, category] of RENAME_MUTATIONS) {
  const entries = readJson(path.join(PROD, family, "field-classification.json")).entries ?? [];
  const entry = entries.find((e) => e.name === original);
  checks += 1;
  if (!entry) { problems.push(`${family}: ${original} is not in the committed classification`); continue; }
  const decision = decideBinding(
    { name: innocuous, pdfType: entry.type, effectiveLabel: entry.effectiveLabel, regionHeading: entry.regionHeading },
    { explicitMappings: {}, availableChargeRows: 1, documentAcceptsFill: true }
  );
  if (decision.writable) {
    problems.push(`${family}: renaming ${original} to ${innocuous} unprotects it — protection is still decided by the field name`);
  } else if (decision.category !== category) {
    problems.push(`${family}: renamed ${original} refused as ${decision.category}, expected ${category}`);
  }
}

// The headings and clauses themselves, independent of any family.
const PHRASES = [
  ["FINDINGS OF FACT", "court"],
  ["CONCLUSIONS OF LAW", "court"],
  ["5. Petitioner is  is not eligible for an expunction", "court"],
  ["The above-named Defendant has successfully completed the terms", "court"],
  ["their custody regarding the above-named Defendant and above-listed charge(s)", "agency"],
  ["listed charges", "agency"],
  ["all agencies having records", "agency"]
];
for (const [phrase, expected] of PHRASES) {
  checks += 1;
  const got = protectCategoryOf(phrase);
  if (got !== expected) problems.push(`"${phrase}" classifies as ${got ?? "unprotected"}, expected ${expected}`);
}

// A heading that merely names the form must still not silence the page.
for (const benign of ["PETITION AND ORDER OF EXPUNCTION", "STATE OF NORTH CAROLINA", "Name And Address Of Petitioner"]) {
  checks += 1;
  const got = protectCategoryOf(benign);
  if (got === "court" || got === "agency") {
    problems.push(`"${benign}" is now protected as ${got}; it names the form, not a court-owned area`);
  }
}

if (problems.length) {
  console.error(`FAIL adjudicative-region protection — ${problems.length} problem(s) of ${checks} check(s)`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`OK adjudicative-region protection — ${checks} checks: findings-of-fact, eligibility and records-custody regions refuse participant facts, participant fields still bind, and renaming a protected field does not unprotect it`);
