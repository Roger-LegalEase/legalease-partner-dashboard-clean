#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import { makeAgencyGuidanceFamily } from "../build-census-v1-agency-application-treatment:obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const read = (relative) => fs.readFileSync(path.join(root, relative));
const normalized = (value) => String(value).replace(/\s+/g, " ").trim();
const specs = [
  {
    familyId: "agency-application-treatment:obligation:track-only:CT:ct-destruction-request",
    dir: "data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-destruction-request--official-pdf-fill",
    pages: 1,
    requiredFacts: 4,
    positive: [/Superior Court clerk/i, /three years/i, /physical destruction/i]
  },
  {
    familyId: "agency-application-treatment:obligation:track-only:CT:ct-provisional-pardon",
    dir: "data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-provisional-pardon--official-pdf-fill",
    pages: 2,
    requiredFacts: 5,
    positive: [/more than 90 days/i, /epardonportal\.ct\.gov/i, /does not erase/i]
  },
  {
    familyId: "agency-application-treatment:obligation:track-pathway:CT:ct-absolute-pardon:absolute-pardon-resulting-in-erasure",
    dir: "data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-pathway:ct:ct-absolute-pardon:absolute-pardon-resulting-in-erasure--official-pdf-fill",
    pages: 2,
    requiredFacts: 5,
    positive: [/October 1, 1974/i, /epardonportal\.ct\.gov/i, /Board decides/i]
  }
];
const forbidden = [
  /obligation:(?:track-only|track-pathway):CT:/i,
  /committed (?:review|record)/i,
  /source[- ]acquisition/i,
  /source receipt/i,
  /no stable participant application document has been identified/i,
  /lawfully generate/i,
  /review artifact/i,
  /this build/i,
  /egress proxy/i
];
const fixtureFacts = {
  canonical: ["Jordan Avery Reyes", "1991-04-17", "42 Larkspur Street, Hartford, CT 06103", "860-555-0142", "jordan.reyes@example.org"],
  boundary: ["Maria-Alejandra O'Shaughnessy-Whitfield", "1968-12-31", "1188 Upper Connecticut River Crossing Road, Apartment 14B, West Hartford, Connecticut 06119-2214", "(203) 555-0199 ext. 4417", "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"]
};
let assertions = 0;
const check = (condition, message) => { assertions += 1; assert.ok(condition, message); };
let factReads = 0;
let sourceBindings = 0;
for (const spec of specs) {
  const guide = read(`${spec.dir}/participant-instructions.md`).toString("utf8");
  const map = JSON.parse(read(`${spec.dir}/production-field-map.json`));
  const counters = JSON.parse(read(`${spec.dir}/reports/completeness-counters.json`));
  const receipt = JSON.parse(read(`${spec.dir}/source-receipt.json`));
  check(counters.allNineZero === true, `${spec.familyId}: all nine counters remain zero`);
  check(map.requiredBeforeFiling.length === spec.requiredFacts, `${spec.familyId}: required confirmations preserved`);
  for (const source of receipt.compositionSources) {
    const bytes = read(source.path);
    check(sha(bytes) === source.sha256 && bytes.length === source.byteLength, `${spec.familyId}: source pin ${source.path}`);
    sourceBindings += 1;
  }
  for (const role of ["canonical", "boundary"]) {
    const pdfPath = `${spec.dir}/fixtures/${role}.pdf`;
    const bytes = read(pdfPath);
    const pdf = await PDFDocument.load(bytes);
    check(pdf.getPageCount() === spec.pages, `${spec.familyId}/${role}: page count preserved`);
    check(pdf.getForm().getFields().length === 0, `${spec.familyId}/${role}: guide has no actor widgets`);
    const text = execFileSync("pdftotext", ["-layout", path.join(root, pdfPath), "-"], { encoding: "utf8" });
    const normalizedText = normalized(text);
    for (const value of fixtureFacts[role]) {
      check(normalizedText.includes(normalized(value)), `${spec.familyId}/${role}: held fact is readable: ${value}`);
      factReads += 1;
    }
    for (const pattern of forbidden) check(!pattern.test(normalizedText), `${spec.familyId}/${role}: internal copy absent: ${pattern}`);
    for (const pattern of spec.positive) check(pattern.test(normalizedText), `${spec.familyId}/${role}: participant action preserved: ${pattern}`);
  }
  for (const pattern of forbidden) check(!pattern.test(guide), `${spec.familyId}/guide: internal copy absent: ${pattern}`);
  for (const pattern of spec.positive) check(pattern.test(guide), `${spec.familyId}/guide: participant action preserved: ${pattern}`);
}
for (const pattern of forbidden) check(pattern.test(`ROUTE: obligation:track-only:CT:x committed review source-acquisition source receipt no stable participant application document has been identified lawfully generate review artifact this build egress proxy`),
  `negative control detects ${pattern}`);
const presentationFixture = {
  familyId: "synthetic", buildScript: "synthetic", outDir: "synthetic", jurisdiction: "XX",
  routeKey: "obligation:track-only:XX:synthetic", legalName: "Synthetic", routeName: "synthetic route",
  title: "Synthetic guide", statutes: [], compositionSources: [], composedFrom: "synthetic",
  formIdentityNote: "synthetic", sections: [], requiredFacts: [], instructions: [], buildFindings: [], counselQuestions: []
};
const normal = makeAgencyGuidanceFamily(presentationFixture);
const direct = makeAgencyGuidanceFamily({ ...presentationFixture, participantPresentation: "direct" });
const facts = Object.fromEntries(Object.keys(fixtureFacts.canonical).map((key) => [key, ""]));
check(/ROUTE: obligation:track-only:XX:synthetic/.test(normal.composedBody("agency_preparation_guide", facts)),
  "default shared presentation retains internal route metadata for unchanged callers");
check(/source receipt/.test(normal.participantInstructions([])),
  "default shared presentation retains the existing provenance sentence for unchanged callers");
check(!/obligation:track-only:XX:synthetic/.test(direct.composedBody("agency_preparation_guide", facts)),
  "direct presentation suppresses route metadata");
check(!/source receipt/.test(direct.participantInstructions([])),
  "direct presentation suppresses implementation provenance");
assert.equal(factReads, 30);
assert.equal(sourceBindings, 16);
console.log(JSON.stringify({ result: "PASS", families: specs.length, assertions, negativeControls: forbidden.length, factReads, sourceBindings }));
