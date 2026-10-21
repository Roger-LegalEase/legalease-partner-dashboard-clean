#!/usr/bin/env node
// Proof that the name/date verifier is not vacuous.
//
//   node scripts/rcap-official-forms/test-name-date-component-semantics-mutations.mjs
//
// A check that cannot fail proves nothing. Each mutation below breaks one of the
// two corrections in one specific way -- by deleting the rule, by neutering the
// predicate that carries it, or by widening it past what it was meant to reach --
// and the verifier has to go red for every one.
//
// Two disciplines make the result meaningful. A green baseline is established
// first, because a suite that started red would report every mutation as
// detected while proving nothing. And every mutation is applied to a real file
// inside a try/finally and restored whatever happens, with the digests compared
// at the end: no mutation string is committed, and the tree this leaves behind
// is byte-identical to the one it found.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(rootDir);

const VERIFIER = "scripts/rcap-official-forms/verify-name-date-component-semantics.mjs";
const SEMANTICS = "scripts/rcap-official-forms/rcap-field-semantics.mjs";
const RECORD = "data/rcap-grade-a/field-semantics/name-date-component-classification-diff.json";

function verifierPasses() {
  try { execFileSync("node", [VERIFIER], { cwd: rootDir, stdio: "pipe" }); return true; }
  catch { return false; }
}

const digest = (file) => crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, file))).digest("hex");
const TOUCHED = new Map();

/** Applies one edit, runs the verifier, and puts the file back whatever happens. */
function underMutation(file, mutate) {
  const abs = path.join(rootDir, file);
  const original = fs.readFileSync(abs);
  if (!TOUCHED.has(file)) TOUCHED.set(file, crypto.createHash("sha256").update(original).digest("hex"));
  try {
    const mutated = mutate(original.toString("utf8"));
    if (mutated === original.toString("utf8")) throw new Error(`mutation for ${file} changed nothing`);
    fs.writeFileSync(abs, mutated);
    return verifierPasses();
  } finally {
    fs.writeFileSync(abs, original);
  }
}

console.log("shared name/date field semantics — mutations\n");

if (!verifierPasses()) {
  console.error("BASELINE IS RED: the verifier fails on unmutated sources, so no mutation below would prove anything.");
  process.exit(1);
}
console.log("  baseline: the verifier passes on clean sources\n");

let undetected = 0;
const must = (name, caught) => {
  console.log(`  ${caught ? "detected " : "UNDETECTED"} ${name}`);
  if (!caught) undetected += 1;
};

// ---- DEFECT A: an arrest-date component must not become a name ---------------

console.log("  defect A — a date component must not take a name from its printed label");

// A1. Delete the guard outright. This is the exact defect: the label fallback
//     runs on DAY/MONTH/YEAR again and the harvested "Defendant" sentence binds
//     the participant's own name to the month of their arrest.
must("removing the date-component guard from the label fallback is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    " && !isDateComponentFieldName(name)) {",
    ") {")));

// A2. Leave the guard in place and neuter the predicate it calls. A rule that is
//     wired up but always answers "no" is the failure mode a wiring check misses.
must("the date-component predicate returning false for everything is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "export function isDateComponentFieldName(name) {",
    "export function isDateComponentFieldName(name) {\n  if (name !== undefined) return false;")));

// A3. Anchor the pattern loosely so it matches a component anywhere in a name
//     rather than being the whole of it. That silences DOB, Birthday and
//     DayPhone, which are date-ish names that are not date components.
must("widening the date-component pattern past a bare component is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "export const DATE_COMPONENT_FIELD_NAME = /^(?:day|month|year)(?:\\s+\\d{1,2})?$/;",
    "export const DATE_COMPONENT_FIELD_NAME = /(?:day|month|year)/;")));

// A4. Restrict the pattern to the unindexed spellings. The repeated trios --
//     "Day 01", "MONTH 1", "Year 02" -- are most of the corpus's instances, so a
//     rule that only covers the singular form looks right and fixes little.
must("dropping the indexed spellings of a date component is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "/^(?:day|month|year)(?:\\s+\\d{1,2})?$/",
    "/^(?:day|month|year)$/")));

// ---- DEFECT B: "First Middle and Last name" must be the whole name ----------

console.log("\n  defect B — a caption naming every part asks for the whole name");

// B1. Delete the refusal from participant.last_name. last_name is ordered ahead
//     of full_legal_name, so most-specific-first picks the surname again and the
//     defendant caption reads "Reyes".
must("removing the every-part refusal from participant.last_name is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "match: /last\\s*name|surname/, refuseWhenCaption: captionAsksForEveryNamePart }",
    "match: /last\\s*name|surname/ }")));

// B2. Neuter the predicate while leaving all three descriptors wired to it.
must("the every-part predicate returning false for everything is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "export function captionAsksForEveryNamePart(subject, hay = haystack(subject)) {",
    "export function captionAsksForEveryNamePart(subject, hay = haystack(subject)) {\n  if (subject !== undefined) return false;")));

// B3. Widen it to fire on ANY part word rather than all three. That takes
//     "First Name" and "Last Name" away from the descriptors that own them --
//     a caption asking for a surname would stop resolving to the surname.
must("widening the every-part rule to any single part is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "return NAME_PART_WORDS.every((re) => re.test(hay));",
    "return NAME_PART_WORDS.some((re) => re.test(hay));")));

// B4. Drop the requirement that the caption actually says "name". The three part
//     words then carry the rule on their own, which is what makes it a rule
//     about names rather than about the words first, middle and last.
must("dropping the word 'name' from the every-part rule is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    '  if (!/\\bnames?\\b/.test(hay)) return false;\n',
    "")));

// ---- the guards around both --------------------------------------------------

console.log("\n  the guards this correction must not loosen");

// C1. A protect rule quietly losing a term. This correction touches no protect
//     rule, and the verifier compares them term by term against the base commit.
must("weakening a protect rule is caught",
  !underMutation(SEMANTICS, (s) => s.replace('["race", /\\brace\\b|', '["race", /')));

// C2. The record and the projection drifting apart. The expected-change set is
//     asserted against a recomputed projection, not read as a claim.
must("a field removed from the committed expected-change set is caught",
  !underMutation(RECORD, (s) => {
    const record = JSON.parse(s);
    record.expectedChangeKeys = record.expectedChangeKeys.slice(1);
    return `${JSON.stringify(record, null, 2)}\n`;
  }));

// C3. A row in the record left unexplained. Every moved field has to be
//     attributable to a stated defect; "it moved" is not a justification.
must("an unexplained row in the committed record is caught",
  !underMutation(RECORD, (s) => {
    const record = JSON.parse(s);
    record.changed[0].changeClass = "unexplained";
    record.fieldsUnexplained = 1;
    return `${JSON.stringify(record, null, 2)}\n`;
  }));

// C4. The scan quietly narrowing back to one census filename, which is how
//     ar-arrest-seal-set — the family this correction was raised on — would drop
//     out of the blast radius entirely.
must("the record no longer covering the census-v1 family is caught",
  !underMutation(RECORD, (s) => {
    const record = JSON.parse(s);
    record.censusFiles = record.censusFiles.filter((f) => !f.endsWith("field-census.census-v1.json"));
    record.censusesScanned = record.censusFiles.length;
    return `${JSON.stringify(record, null, 2)}\n`;
  }));

// ---- the suite left the tree as it found it ---------------------------------
console.log("");
const notRestored = [...TOUCHED.entries()].filter(([file, was]) => digest(file) !== was);
if (notRestored.length) {
  console.error(`FILES NOT RESTORED: ${notRestored.map(([f]) => f).join(", ")}`);
  process.exit(1);
}
console.log(`  every mutated file restored byte-for-byte (${TOUCHED.size} file(s))`);

if (!verifierPasses()) {
  console.error("\nthe verifier does not pass after the suite: the tree was left mutated.");
  process.exit(1);
}

if (undetected) {
  console.error(`\nname/date mutations: ${undetected} mutation(s) went undetected.`);
  process.exit(1);
}
console.log(`\nOK name/date mutations — ${TOUCHED.size} file(s) mutated, every mutation caught, `
  + "baseline green before and after.");
