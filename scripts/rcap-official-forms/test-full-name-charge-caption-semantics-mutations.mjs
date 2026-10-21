#!/usr/bin/env node
// Proof that the charge-caption verifier is not vacuous.
//
//   node scripts/rcap-official-forms/test-full-name-charge-caption-semantics-mutations.mjs
//
// A verifier nobody has watched fail is the same class of thing as the defect it
// exists to catch. Each mutation below breaks the correction in one specific
// way and the verifier has to go red for it.
//
// Every mutation is applied to a real file and restored in a finally block, and
// a green baseline is established first: a suite that started red would report
// every mutation as detected while proving nothing.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(rootDir);

const VERIFIER = "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs";
const SEMANTICS = "scripts/rcap-official-forms/rcap-field-semantics.mjs";
const DIFF = "data/rcap-grade-a/field-semantics/full-name-charge-caption-classification-diff.json";
const AL_RECEIPT = "data/rcap-grade-a/packet-factory-24h/pf07/al-misd-nonconviction-90/shared-semantics-expectations.json";

/** True when the verifier passes. */
function verifierPasses() {
  try {
    execFileSync("node", [VERIFIER], { cwd: rootDir, stdio: "pipe" });
    return true;
  } catch { return false; }
}

const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, file))).digest("hex");
/** Every file this suite touched, with the digest it had before anything ran. */
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

console.log("full-name charge-caption mutations\n");

// A red baseline would make every mutation below look detected.
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

must("removing the exact AL arresting-agency correction is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    /^  \{\n    id: "al_cr65_participant_arresting_agency",[\s\S]*?^  \},\n/m, "")));
must("the AL supplement cannot make a protected agency certification writable",
  !underMutation(SEMANTICS, (s) => s.replace(
    "export function protectCategoryOf(name) {",
    'export function protectCategoryOf(name) {\n  if (name === "Agency certification") return null;')));
must("an AL receipt claiming a new automatic write is rejected",
  !underMutation(AL_RECEIPT, (s) => {
    const record = JSON.parse(s);
    record.projections.charge.rows[0].after.bindingWritable = true;
    return `${JSON.stringify(record, null, 2)}\n`;
  }));

// 10. Reintroducing the defective behaviour.
must("the predicate returning false for everything is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "export function captionDescribesChargeValue(subject) {\n  const text = String(subject ?? \"\");",
    "export function captionDescribesChargeValue(subject) {\n  if (subject !== null) return false;\n  const text = String(subject ?? \"\");")));

// 11. Deleting the refusal that carries the predicate.
must("removing refuseWhenCaption from the descriptor is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    ", refuseWhenCaption: captionDescribesChargeValue },",
    " },")));

// 11b. Deleting the fallback guard, which is what reaches the field NAME.
must("removing the printed-label fallback guard is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "    matches = descriptorsMatching(effectiveLabel)\n      .filter((d) => !(d.refuseWhenCaption && d.refuseWhenCaption(name, haystack(name))));",
    "    matches = descriptorsMatching(effectiveLabel);")));

// 12. Widening the expected-change set by one unrelated field.
must("adding one unrelated field to the expected-change set is caught",
  !underMutation(DIFF, (s) => {
    const record = JSON.parse(s);
    record.expectedChangeKeys = [...record.expectedChangeKeys, "data/rcap-all50/overlays/production/alabama/cr-65-expunge-petition-10-2024|Case No"];
    return `${JSON.stringify(record, null, 2)}\n`;
  }));

// 12b. And narrowing it by one field that does move.
must("dropping one field that does move from the expected-change set is caught",
  !underMutation(DIFF, (s) => {
    const record = JSON.parse(s);
    record.expectedChangeKeys = record.expectedChangeKeys.slice(1);
    return `${JSON.stringify(record, null, 2)}\n`;
  }));

// 9. Weakening a protect rule has to be caught by this verifier too, because a
// correction to the name descriptor is exactly the kind of work that could take
// a protect term with it.
must("dropping a term from a protect rule is caught",
  !underMutation(SEMANTICS, (s) => s.replace("\\bfpn\\b|finger\\s*print\\s*(number|no|#)|", "")));

// And the guard on the guard: a name caption must keep binding the name, so a
// predicate that fired on everything mentioning an offence would be caught too.
must("a predicate that also refuses genuine name captions is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "  return !ASKS_FOR_A_PERSONS_NAME_RE.test(text);",
    "  return true;")));

console.log("");
// Restoration is checked against the bytes this suite started with, not against
// git: both files are legitimately dirty relative to HEAD while this lane is in
// progress, and a git-based check would call that a leaked mutation.
const leaked = [...TOUCHED].filter(([file, digest]) => sha256(file) !== digest).map(([file]) => file);
if (leaked.length) {
  console.error(`FAIL: a mutation was left on disk: ${leaked.join(", ")}`);
  process.exit(1);
}
console.log(`  every mutated file is byte-identical to how this suite found it (${TOUCHED.size} file(s))`);
if (undetected) {
  console.error(`\nFAIL full-name charge-caption mutations (${undetected} undetected)`);
  process.exit(1);
}
console.log("\nOK full-name charge-caption mutations — every break in the correction turns the verifier red.");
