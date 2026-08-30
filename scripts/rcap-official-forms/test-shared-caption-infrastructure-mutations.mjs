#!/usr/bin/env node
// Proof that the shared caption-infrastructure verifier is not vacuous.
//
//   node scripts/rcap-official-forms/test-shared-caption-infrastructure-mutations.mjs
//
// A check that cannot fail proves nothing. Each mutation below breaks ONE of the
// six corrected defects in one specific way -- by deleting the rule, by
// neutering the predicate that carries it, or by putting back the exact code
// that had the defect -- and the verifier has to go red for every one.
//
// Two disciplines make the result meaningful. A green baseline is established
// first, because a suite that started red would report every mutation as
// detected while proving nothing. And every mutation is applied to a real file
// inside a try/finally and restored whatever happens, with the digests compared
// at the end: no mutation string is committed, and the tree this leaves behind
// is byte-identical to the one it found.
//
// Two of the six are corrections to a CENSUS-PRODUCING path rather than to the
// binder -- the caption harvest, and the region the flat-overlay path passes --
// so their mutations are checked against the assertions the verifier makes about
// those paths directly, and, for the harvest, against a measurement taken from a
// real page rather than from the module's text alone.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(rootDir);

const VERIFIER = "scripts/rcap-official-forms/verify-shared-caption-infrastructure-semantics.mjs";
const SEMANTICS = "scripts/rcap-official-forms/rcap-field-semantics.mjs";
const CAPTURE = "scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs";
const FINALIZE = "scripts/rcap-official-forms/rcap-official-form-finalize.mjs";
const PROFILES = "scripts/generate-rcap-flat-overlay-profiles.mjs";
const MASTER_LIST = "scripts/generate-rcap-problematic-pdf-master-list.mjs";

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

const results = [];
const must = (what, ok) => {
  results.push({ what, ok });
  console.log(`  ${ok ? "detected " : "UNDETECTED"} ${what}`);
};

console.log("shared caption infrastructure — mutations\n");

if (!verifierPasses()) {
  console.error("BASELINE IS RED: the verifier fails on unmutated sources, so no mutation below would prove anything.");
  process.exit(1);
}
console.log("  baseline: the verifier passes on clean sources\n");

// ---- DEFECT 1: the directly-above caption harvest must be cell-aware ---------
console.log("  defect 1 — a caption directly above a blank is that blank's only if it sits in the same cell");

// 1a. Put the defect back exactly: take the whole printed LINE, tested against
//     the whole line's extent, which is what reached across a table row.
must("restoring the whole-line harvest is caught",
  !underMutation(CAPTURE, (s) => s.replace(
    `        const text = cellTextAbove(line, rect);
        if (text === null) continue;`,
    `        const lineX2 = Math.max(...line.runs.map((r) => r.x2));
        if (!overlaps1d(line.x, lineX2, rect.x, rect.x + rect.width)) continue;
        const text = line.text;`)));

// 1b. Keep the call but neuter the cell chooser, so it hands back the whole line
//     again. A rule that is wired up but always answers with everything is the
//     failure a wiring check misses.
must("the cell chooser returning the whole line is caught",
  !underMutation(CAPTURE, (s) => s.replace(
    "function cellTextAbove(line, rect) {",
    "function cellTextAbove(line, rect) {\n  if (rect) return line.text;")));

// ---- DEFECT 2: the protections, added first ----------------------------------
console.log("\n  defect 2 — jurat, verification, oath, affidavit, certificate of mailing, court contact");

// 2a. Delete the court-contact rule outright.
must("removing the court_contact protect rule is caught",
  !underMutation(SEMANTICS, (s) => s.replace(/\n  \["court_contact", \/[^\n]*\n/, "\n")));

// 2b. Keep the rule but make it unreachable, by moving its owner words out of it.
must("narrowing court_contact so it no longer reaches a court address is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "[\"court_contact\", /\\b(court|courthouse|clerk)",
    "[\"court_contact\", /\\b(tribunal|courthouse|clerk)")));

// 2c. Take the officer constructions back out of the jurat rule.
must("removing the sworn-and-subscribed vocabulary from notarization is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "|sworn\\s*(to\\s*)?and\\s*subscribed|subscribed\\s*and\\s*sworn|sworn\\s*(or|\\/)\\s*affirmed|administer\\w*\\s*(of\\s*)?oaths?|\\baffiant\\b|\\bverification\\b|under\\s*penalty\\s*of\\s*perjury",
    "")));

// 2d. Take the certificate of mailing back out of the service block.
must("removing the certificate of mailing from the service-block rule is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "|certificate\\s*of\\s*mailing|proof\\s*of\\s*mailing|\\bcert\\s*of\\s*mailing\\b",
    "")));

// 2e. Take the affidavit, oath and verification clause back out of the heading
//     vocabulary, which is the channel that protects an area of a page.
must("removing the affidavit and oath headings from the region vocabulary is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "|^\\s*oaths?\\b|\\boath\\s*of\\s*(petitioner|applicant|movant|affiant|office)\\b|\\boaths?\\s*(and|or)\\s*affirmations?\\b|\\baffidavit\\b|sworn\\s*(or|\\/)\\s*affirmed|subscribed\\s*and\\s*sworn|sworn\\s*(to\\s*)?and\\s*subscribed|under\\s*penalty\\s*of\\s*perjury|true\\s*to\\s*the\\s*best\\s*of\\s*(my|his|her|their)\\s*(information|knowledge|belief)",
    "")));

// 2f. The squashed signature-date spelling, which is what a court's own date
//     blank and six Nebraska blanks turn on.
must("removing the squashed date-signed spelling from the signature rule is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "|\\bdate\\s*sign(?:ed)?\\b|\\bsign(?:ed)?\\s*date\\b",
    "")));

// 2g. The judgment stem.
must("putting the word boundary back in front of the judgment stem is caught",
  !underMutation(SEMANTICS, (s) => s.replace("\\bjudge\\b|judgm|", "\\bjudge\\b|\\bjudgm\\b|")));

// 2h. The venue recital.
must("removing the venue-recital refusal from participant.state is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "refuseWhen: /\\bstate\\s+of\\b(?!\\s*(?:residence|birth|issu|origin))|",
    "refuseWhen: /")));

// 2i. And the exception inside it, which is what keeps a real question about the
//     participant working. Widening a refusal is a defect in the other direction
//     and the verifier's controls have to catch it too.
must("dropping the exceptions from the venue-recital refusal is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "\\bstate\\s+of\\b(?!\\s*(?:residence|birth|issu|origin))",
    "\\bstate\\s+of\\b")));

// ---- DEFECT 3: "crime" in charge-value detection, narrowly -------------------
console.log("\n  defect 3 — crime is a charge value, and a crime victim is not");

must("removing crime from the charge vocabulary is caught",
  !underMutation(SEMANTICS, (s) => s.replace("|violations?|crimes?)\\b/i;", "|violations?)\\b/i;")));

must("neutering the charge-value predicate is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "export function captionDescribesChargeValue(subject) {\n  const text = String(subject ?? \"\");",
    "export function captionDescribesChargeValue(subject) {\n  if (subject !== null) return false;\n  const text = String(subject ?? \"\");")));

// The narrowing is half the correction. Widening `crime` to cover a victim
// caption is the failure this half exists to prevent.
must("dropping the crime-victim narrowing is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "text.replace(CRIME_WORD_THAT_NAMES_A_PERSON, \" \")", "text")));

must("widening the narrowing so it swallows an ordinary crime caption is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "export const CRIME_WORD_THAT_NAMES_A_PERSON =\n  /\\bcrime\\s*victims?",
    "export const CRIME_WORD_THAT_NAMES_A_PERSON =\n  /\\bcrimes?\\b|\\bcrime\\s*victims?")));

// ---- DEFECT 4: regionHeading through the flat-overlay binding ----------------
console.log("\n  defect 4 — the flat-overlay path passes the printed region it used to drop");

must("dropping regionHeading from the flat-overlay decideBinding call is caught",
  !underMutation(FINALIZE, (s) => s.replace(
    "        regionHeading: region.heading,\n        regionIsDocumentTitle: region.isDocumentTitle\n",
    "")));

must("removing the region measurement the flat path takes for itself is caught",
  !underMutation(FINALIZE, (s) => s.replace(
    "      const [context] = captureWidgetContext(page, [{ name: anchor.label, rect: anchor.writeBox }], {",
    "      const [context] = ([{ regionHeading: null }]) || captureWidgetContext(page, [{ name: anchor.label, rect: anchor.writeBox }], {")));

// ---- DEFECT 5: the generic Date matching path --------------------------------
console.log("\n  defect 5 — a bare Date binds nothing, and a date-named blank takes only a date");

must("removing the date-kind filter from the printed-label fallback is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "      .filter((d) => !fieldNameDeclaresADate(name) || d.valueType === \"date\");\n", "")));

must("neutering the date-name predicate is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "export function fieldNameDeclaresADate(name) {",
    "export function fieldNameDeclaresADate(name) {\n  if (name !== undefined) return false;")));

must("widening the date-name predicate past a name that says it holds a date is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "export const FIELD_NAME_DECLARES_A_DATE = /(?:^|\\s)dat(?:e|es|ed)(?:\\s|$)/;",
    "export const FIELD_NAME_DECLARES_A_DATE = /dat/;")));

must("putting the dead bare-Date alternative back into filing_date is caught",
  !underMutation(SEMANTICS, (s) => s.replace(
    "|today\\s*s?\\s*date|cert\\s*date/ },",
    "|today\\s*s?\\s*date|^\\s*dated?\\s*$|cert\\s*date|^date$|\\bdate\\b/ },")));

// ---- DEFECT 6: private/ excluded from the mounted-corpus walks ---------------
console.log("\n  defect 6 — a walk over the clone must not read the mounted source corpus");

must("letting the flat-overlay profile walk descend into private/ is caught",
  !underMutation(PROFILES, (s) => s.replace(
    'const skip = new Set(["node_modules", ".git", ".next", "tmp", "private"]);',
    'const skip = new Set(["node_modules", ".git", ".next", "tmp"]);')));

must("letting the currentness walk descend into private/ is caught",
  !underMutation(MASTER_LIST, (s) => s.replace(
    'const skip = new Set(["node_modules", ".git", ".next", "private"]);',
    'const skip = new Set(["node_modules", ".git", ".next"]);')));

// ---- the record itself must not be able to explain away a change ------------
console.log("\n  the record the verifier reads");

const RECORD = "data/rcap-grade-a/field-semantics/shared-caption-infrastructure-classification-diff.json";
must("adding one unrelated field to the recorded change set is caught",
  !underMutation(RECORD, (s) => {
    const record = JSON.parse(s);
    record.endToEnd.everyKey = [...record.endToEnd.everyKey,
      "data/rcap-all50/overlays/production/alabama/cr-65-expunge-petition-10-2024|-|Case No"];
    return `${JSON.stringify(record, null, 2)}\n`;
  }));

must("dropping one field that does move from the recorded change set is caught",
  !underMutation(RECORD, (s) => {
    const record = JSON.parse(s);
    record.endToEnd.everyKey = record.endToEnd.everyKey.slice(1);
    return `${JSON.stringify(record, null, 2)}\n`;
  }));

must("an unexplained row left in the committed record is caught",
  !underMutation(RECORD, (s) => {
    const record = JSON.parse(s);
    record.semanticsOnly.fieldsUnexplained = 1;
    record.semanticsOnly.changed[0].changeClass = "unexplained";
    return `${JSON.stringify(record, null, 2)}\n`;
  }));

must("a record that stopped covering every committed census is caught",
  !underMutation(RECORD, (s) => {
    const record = JSON.parse(s);
    record.censusesScanned -= 1;
    return `${JSON.stringify(record, null, 2)}\n`;
  }));

// ---- every file put back exactly as it was found -----------------------------
const drifted = [...TOUCHED.entries()].filter(([file, before]) => digest(file) !== before);
console.log(`\n  ${drifted.length === 0
  ? `every mutated file is byte-identical to how this suite found it (${TOUCHED.size} file(s))`
  : `FILES LEFT MUTATED: ${drifted.map(([f]) => f).join(", ")}`}`);

const undetected = results.filter((r) => !r.ok);
console.log("");
if (undetected.length || drifted.length) {
  if (undetected.length) console.error(`shared caption infrastructure mutations: ${undetected.length} went undetected.`);
  if (drifted.length) console.error(`shared caption infrastructure mutations: ${drifted.length} file(s) left mutated.`);
  process.exit(1);
}
console.log(`OK shared caption infrastructure mutations — ${results.length} mutations across ${TOUCHED.size} file(s), `
  + "every one caught, baseline green before and after.");
