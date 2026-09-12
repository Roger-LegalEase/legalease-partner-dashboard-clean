#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");
const FAMILY = "composed-treatment:obligation:runtime-only:OK:human-trafficking-survivor-relief";
const OUT = "data/rcap-all50/overlays/census-v1/ok/composed-treatment:obligation:runtime-only:ok:human-trafficking-survivor-relief--custom-pleading";
const BUILDER = "scripts/build-census-v1-composed-treatment:obligation:runtime-only:OK:human-trafficking-survivor-relief.mjs";
let assertions = 0;
const check = (condition, message) => { assertions += 1; assert.ok(condition, message); };
const eq = (actual, expected, message) => { assertions += 1; assert.equal(actual, expected, message); };
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));

const builder = fs.readFileSync(path.join(ROOT, BUILDER), "utf8");
for (const phrase of [
  "OK-TRAFFICKING-SURVIVOR-22-OS-19C",
  "28 O.S. § 152(H)",
  "qualifying prostitution-related charge or conviction",
  "KEEP_BLOCK_BEGIN",
  "KEEP_BLOCK_END",
  "groupRows > slotsRemaining"
]) check(builder.includes(phrase), `builder must retain ${phrase}`);
check(!builder.includes('lines.push("", `Route: ${c.routeKey}`)'), "composed pages must not append an internal route key");

const receipt = readJson(`${OUT}/source-receipt.json`);
eq(receipt.committedRecords.length, 6, "six exact composition-source pins must remain bound");
eq(receipt.governingLegalDecision.decisionId, "OK-TRAFFICKING-SURVIVOR-22-OS-19C", "current decision must be separately bound");
eq(receipt.governingLegalDecision.disposition, "LEGAL_CLEAR", "stale universal legal hold must be superseded");
const decisionBytes = fs.readFileSync(path.join(ROOT, receipt.governingLegalDecision.path));
eq(receipt.governingLegalDecision.sha256, sha(decisionBytes), "governing decision hash must match current bytes");
eq(receipt.conditionalParticipantInputHandling.statusInFixtures, "NOT_SELECTED_OR_FABRICATED", "IFP election may not be fabricated");
check(receipt.conditionalParticipantInputHandling.participantMustProvide.length === 2, "IFP handoff must request financial facts and supporting documents");

const map = readJson(`${OUT}/production-field-map.json`);
eq(map.requiredBeforeFilingCount, 11, "existing C1-C9/O1-O2 handbacks must be preserved");
eq(map.conditionalParticipantInputs.length, 1, "IFP conditional input must be modeled once");
eq(map.conditionalParticipantInputs[0].status, "CONDITIONAL_PARTICIPANT_INPUT_NOT_SELECTED_IN_FIXTURE", "IFP input status must stay conditional and unselected");
check(/court decides/i.test(map.conditionalParticipantInputs[0].protectedDecision), "court must own IFP decision");

const guide = fs.readFileSync(path.join(ROOT, OUT, "participant-instructions.md"), "utf8");
for (const phrase of [
  "28 O.S. § 152(H)", "financial facts and supporting documents", "court decides the request",
  "30-day notice", "prostitution-related charge or conviction", "resulted from trafficking",
  "good-cause grounds", "neither decides qualification"
]) check(guide.includes(phrase), `guide must disclose ${phrase}`);
for (const bad of [
  /obligation:runtime-only/i, /ok-trafficking-survivor-19c-(?:primary|proposed|filing)/i,
  /outcome mode/i, /committed route/i, /compiled profile/i, /relayed research/i,
  /counsel has not confirmed/i, /legally blocked/i, /excluded offenses and clean-record rules/i,
  /FEE_AND_WAIVER/, /SELF_HELP_STOP/
]) check(!bad.test(guide), `guide must not expose internal or superseded copy: ${bad}`);

const internalPdfPatterns = [
  /obligation:runtime-only/i, /ok-trafficking-survivor-19c-(?:primary|proposed|filing)/i,
  /outcome mode/i, /committed route/i, /compiled profile/i, /relayed research/i,
  /source acquisition/i, /counsel has not confirmed/i, /legally blocked/i,
  /excluded offenses and clean-record rules/i, /\[\[KEEP_BLOCK_/i
];

function findPage(pageTexts, needle) {
  return pageTexts.findIndex((text) => text.includes(needle));
}
function assertSamePage(pageTexts, start, end, message) {
  const a = findPage(pageTexts, start);
  const b = findPage(pageTexts, end);
  check(a >= 0, `${message}: start is present`);
  check(b >= 0, `${message}: end is present`);
  eq(a, b, `${message}: content must stay on one page`);
}
// Negative controls prove the grouping test detects both historical shapes.
assert.throws(() => {
  const bad = ["B. THE PETITIONER", "Name: Sample"];
  assert.equal(findPage(bad, "B. THE PETITIONER"), findPage(bad, "Name: Sample"));
});
assertions += 1;
assert.throws(() => {
  const bad = ["[C8 - trafficking nexus evidence]", "...................................................................................."];
  assert.equal(findPage(bad, "[C8 - trafficking nexus evidence]"), findPage(bad, "...................................................................................."));
});
assertions += 1;
check(internalPdfPatterns.some((rx) => rx.test("Route: obligation:runtime-only:OK:human-trafficking-survivor-relief")), "negative control must detect old route-key copy");

const fixtures = {
  canonical: {
    "Jordan Avery Reyes": 5,
    "1991-04-17": 1,
    "42 Magnolia Street, Springfield 62704": 1,
    "555-0142": 1,
    "jordan.reyes@example.org": 1
  },
  boundary: {
    "Maria-Alejandra O'Shaughnessy-Whitfield": 5,
    "1968-12-31": 1,
    "1188 Upper Tallahatchie Crossing Road, Apartment 14B, Fort Saint Clairsville 39501-2214": 1,
    "(228) 555-0199 ext. 4417": 1,
    "maria.alejandra.oshaughnessy.whitfield@longmailexample.org": 1
  }
};
for (const [fixture, expectedValues] of Object.entries(fixtures)) {
  const bytes = fs.readFileSync(path.join(ROOT, OUT, "fixtures", `${fixture}.pdf`));
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  eq(pdf.getPageCount(), 6, `${fixture}: exact current packet page count`);
  const pageLines = pdf.getPages().map((page) => groupIntoLines(extractTextItems(page)).map((line) => line.text));
  const pageTexts = pageLines.map((lines) => lines.join(" ").replace(/\s+/g, " "));
  const allText = pageTexts.join(" ");
  for (const bad of internalPdfPatterns) check(!bad.test(allText), `${fixture}: delivered PDF must reject ${bad}`);
  for (const phrase of [
    "qualifying prostitution-related charge or conviction", "resulted from the petitioner being a victim of human trafficking",
    "good cause", "28 O.S. Sec. 152(H)", "financial facts and supporting documents",
    "court decides whether you may proceed", "30 days' notice", "vacates no conviction"
  ]) check(allText.includes(phrase), `${fixture}: delivered PDF must contain ${phrase}`);
  assertSamePage(pageTexts, "B. THE PETITIONER", `Name: ${Object.keys(expectedValues)[0]}`, `${fixture}: petitioner heading and identity`);
  assertSamePage(pageTexts, "B. THE PETITIONER", "Date of birth:", `${fixture}: petitioner heading and DOB`);
  for (let number = 1; number <= 9; number += 1) {
    const marker = `[C${number} -`;
    const page = findPage(pageTexts, marker);
    check(page >= 0, `${fixture}: ${marker} exists`);
    const labelIndex = pageLines[page].findIndex((line) => line.includes(marker));
    const after = pageLines[page].slice(labelIndex + 1);
    const dotRows = after.filter((line) => /^\.{30,}$/.test(line.trim())).length;
    check(dotRows >= 2, `${fixture}: ${marker} and both response rows stay together`);
  }
  assertSamePage(pageTexts, "D. THE REQUEST", "The petitioner asks the Court to grant", `${fixture}: request heading and first paragraph`);
  assertSamePage(pageTexts, "COSTS AND REQUESTING IN-FORMA-PAUPERIS STATUS", "court decides whether you may proceed", `${fixture}: IFP heading and complete handoff`);
  for (const [value, occurrences] of Object.entries(expectedValues)) {
    const normalized = value.replace(/\s+/g, " ");
    eq(allText.split(normalized).length - 1, occurrences, `${fixture}: exact held value occurrence count for ${value}`);
  }
  check(!new RegExp(`JUDGE OF THE DISTRICT COURT\\s+${Object.keys(expectedValues)[0]}`, "i").test(allText), `${fixture}: participant name must not enter judge signature`);
}

const counters = readJson(`${OUT}/reports/completeness-counters.json`);
check(counters.allNineZero === true, "builder completeness must report all nine zero");
eq(Object.keys(counters.counters).length, 9, "exactly nine completeness counters are reported");
for (const [name, value] of Object.entries(counters.counters)) eq(value, 0, `${name} must remain zero`);

console.log(JSON.stringify({ status: "PASS", assertions, fixtures: 2, requiredHandbacks: 11, sourcePins: 6 }, null, 2));
