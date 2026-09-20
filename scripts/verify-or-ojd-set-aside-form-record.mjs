#!/usr/bin/env node

/**
 * The Oregon OJD set-aside form record says what the form says, or it fails.
 *
 * `data/record-clearing/legal-decisions/2026-09-20-or-ojd-set-aside-form-covers-all-three-branches.json`
 * answers a question the 2026-09-19 case-mode record left open, and it answers
 * it by quoting the controlling OJD packet. Every one of those quotes is a
 * claim about a legal form a participant will file. A record that paraphrases
 * a form while presenting the paraphrase in quotation marks is worse than one
 * that says nothing, because the next reader has no way to tell which it is.
 *
 * So this control does two things and nothing else:
 *
 *   1. the form's bytes still hash to the sha256 the record binds -- the same
 *      sha256 the packet specification already binds, so a form that is
 *      silently revised cannot keep the record's citations alive;
 *   2. every quoted string in the record appears verbatim in the text of those
 *      exact bytes.
 *
 * WHY QUOTED FIELDS ARE NAMED RATHER THAN INFERRED
 *
 * The record mixes quotation with Captain prose, deliberately: the reasoning
 * has to live next to the evidence. Guessing which fields are quotes from
 * their contents would mean this control decides what it is allowed to check,
 * which is how a check quietly stops asking. The key names below are the
 * record's declaration of what it holds out as verbatim, and adding a quoted
 * field without adding its key here is the one failure mode this cannot see --
 * which is why the count is printed rather than just the verdict.
 *
 * WHEN THE CORPUS IS NOT PRESENT
 *
 * The form lives in the private source library, which is not part of every
 * checkout. Absent corpus is reported as SKIPPED with the reason and exits 0.
 * It is not reported as a pass: a control that cannot see its subject has not
 * checked it, and saying so is the whole difference.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const RECORD = "data/record-clearing/legal-decisions/2026-09-20-or-ojd-set-aside-form-covers-all-three-branches.json";

/** The record's own declaration of which fields are verbatim form text. */
const QUOTED_STRING_KEYS = new Set([
  "printedText", "printedQualifier", "title", "titleContinuation", "titleSecondInstrument",
  "caption", "captionSecondLine", "citedAuthorityOnTheForm", "printedCondition",
  "formRevisionPrintedOnEveryPage", "certificateHeading", "certificateTextLine1", "certificateTextLine2"
]);
const QUOTED_LIST_KEYS = new Set(["statements", "universal", "printedBullets"]);

/**
 * Quotes that sit inside Captain prose rather than in a field of their own.
 * Named explicitly so the prose cannot drift away from the form either.
 */
const INLINE_QUOTES = [
  ["consequenceForTheSplit.whatStands", "You can file 60 days after the prosecutor says they won't file charges, or you can file any time after your case was dismissed or you were acquitted"],
  ["observationNotActedOn.what", "upon entry of the order, the conviction, arrest, citation, charge or other proceeding"],
  ["sectionContentTheFormSupplies.serviceAndNotice.alsoServedByTheState", "Oregon State Police will send the results to the prosecuting attorney."]
];

const CORPUS_CANDIDATES = [
  "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1",
  "../legalease-partner-dashboard-clean/private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1"
];

const normalize = value => value
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/—/g, "--")
  .replace(/…/g, "...")
  .replace(/\s+/g, " ")
  .trim();

function collectQuotes(node, trail, out) {
  if (Array.isArray(node)) {
    node.forEach((value, index) => collectQuotes(value, `${trail}[${index}]`, out));
    return;
  }
  if (!node || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node)) {
    const here = trail ? `${trail}.${key}` : key;
    if (QUOTED_STRING_KEYS.has(key) && typeof value === "string") out.push([here, value]);
    else if (QUOTED_LIST_KEYS.has(key) && Array.isArray(value)) {
      value.forEach((entry, index) => out.push([`${here}[${index}]`, entry]));
    } else collectQuotes(value, here, out);
  }
}

const record = JSON.parse(fs.readFileSync(path.join(ROOT, RECORD), "utf8"));

const corpusRoot = CORPUS_CANDIDATES
  .map(candidate => path.resolve(ROOT, candidate))
  .find(candidate => fs.existsSync(candidate));

if (!corpusRoot) {
  console.log("SKIPPED verify-or-ojd-set-aside-form-record — the private source library is not in this checkout, so the form's bytes could not be read and nothing was verified");
  process.exit(0);
}

const formPath = path.join(corpusRoot, record.sourceRead.location);
if (!fs.existsSync(formPath)) {
  console.error(`FAIL verify-or-ojd-set-aside-form-record — the source library is present but ${record.sourceRead.location} is not in it`);
  process.exit(1);
}

const actualSha256 = createHash("sha256").update(fs.readFileSync(formPath)).digest("hex");
if (actualSha256 !== record.sourceRead.sha256) {
  console.error("FAIL verify-or-ojd-set-aside-form-record — the form's bytes are not the bytes this record was written from");
  console.error(`  record binds  ${record.sourceRead.sha256}`);
  console.error(`  form hashes   ${actualSha256}`);
  console.error("  The citations in this record name page positions in a specific revision. Re-read the form and re-derive them; do not re-point the hash.");
  process.exit(1);
}

let formText;
try {
  formText = execFileSync("pdftotext", ["-layout", formPath, "-"], { encoding: "utf8", maxBuffer: 1 << 24 });
} catch {
  console.log("SKIPPED verify-or-ojd-set-aside-form-record — pdftotext is unavailable, so the quotes could not be compared against the form");
  process.exit(0);
}
const haystack = normalize(formText);

const quotes = [];
collectQuotes(record, "", quotes);
for (const [where, quote] of INLINE_QUOTES) quotes.push([`${where} (inline)`, quote]);

const failures = quotes.filter(([, quote]) =>
  // "..." marks an elision the record makes; each side of it must still be verbatim.
  !normalize(quote).split("...").map(part => part.trim()).filter(Boolean)
    .every(fragment => haystack.includes(fragment)));

for (const [where, quote] of failures) {
  console.error(`  NOT VERBATIM  ${where}`);
  console.error(`    ${JSON.stringify(quote.slice(0, 140))}`);
}

if (failures.length) {
  console.error(`FAIL verify-or-ojd-set-aside-form-record — ${failures.length} of ${quotes.length} quoted strings are not in the form`);
  process.exit(1);
}

console.log(`OK verify-or-ojd-set-aside-form-record — ${quotes.length} quoted strings verbatim in ${path.basename(formPath)} at sha256 ${actualSha256.slice(0, 12)}…`);
