#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

import {
  assertCurrentParticipantCopy,
  composedBody
} from "../build-census-v1-ma-bmc-multi-set.mjs";
import { extractTextItems, groupIntoLines } from "../rcap-official-forms/rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const OUT = path.join(ROOT, "data/rcap-all50/overlays/census-v1/ma/ma-bmc-multi-set--custom-pleading");
const DECISION = path.join(ROOT, "data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json");
const INTERNAL_ROUTE = "obligation:track-only:MA:ma-bmc-multi";
let assertions = 0;
const ok = (value, message) => { assertions += 1; assert.ok(value, message); };
const equal = (actual, expected, message) => { assertions += 1; assert.equal(actual, expected, message); };
const match = (actual, expected, message) => { assertions += 1; assert.match(actual, expected, message); };
const noMatch = (actual, expected, message) => { assertions += 1; assert.doesNotMatch(actual, expected, message); };

async function pdfText(file) {
  const bytes = fs.readFileSync(file);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages().map((page) => groupIntoLines(extractTextItems(page)).map((line) => line.text).join("\n"));
  return { bytes, pages, text: pages.join("\n") };
}

const canonicalFacts = {
  "participant.full_legal_name": "Jordan Avery Reyes",
  "participant.date_of_birth": "1991-04-17",
  "participant.street_address": "77 Meridian Street, East Boston, MA 02128",
  "participant.phone": "617-555-0142",
  "participant.email": "jordan.reyes@example.org"
};
const boundaryFacts = {
  "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
  "participant.date_of_birth": "1968-12-31",
  "participant.street_address": "1188 Commonwealth Harbourside Crossing Avenue, Apartment 14B, Dorchester, Massachusetts 02124-2214",
  "participant.phone": "(617) 555-0199 ext. 4417",
  "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
};

for (const [fixture, facts] of Object.entries({ canonical: canonicalFacts, boundary: boundaryFacts })) {
  const primary = composedBody("primary_filing", facts);
  const instructions = composedBody("instructions", facts);
  assertCurrentParticipantCopy(primary, `${fixture}/primary source`); assertions += 7;
  assertCurrentParticipantCopy(instructions, `${fixture}/instructions source`); assertions += 7;
  match(primary, /THREE OR MORE criminal records from TWO OR MORE divisions/, `${fixture}: threshold retained`);
  match(primary, /dismissal or a nolle prosequi/, `${fixture}: qualifying dispositions retained`);
  match(primary, /Suffolk County District Attorney at least 30 days before the final hearing/, `${fixture}: notice retained`);
  match(instructions, /CORI and certified court dockets are recommended sources/, `${fixture}: records are recommended`);
  match(instructions, /not universal filing attachments/, `${fixture}: records are not mandatory attachments`);
  noMatch(instructions, /whether the BMC publishes one is an open question/i, `${fixture}: stale vehicle hold removed`);
}

for (const mutation of [
  `clean\nRoute: ${INTERNAL_ROUTE}`,
  "The filing-vehicle question is still unresolved",
  "Request your own CORI before completing the petition"
]) {
  assertions += 1;
  assert.throws(() => assertCurrentParticipantCopy(mutation, "negative control"), /stale or internal participant phrase remains/);
}

const guide = fs.readFileSync(path.join(OUT, "participant-instructions.md"), "utf8");
assertCurrentParticipantCopy(guide, "generated guide"); assertions += 7;
match(guide, /Records recommended for checking your case facts/, "guide labels records as recommended");
match(guide, /neither is a universal filing attachment/, "guide rejects false prerequisite");
match(guide, /Fill those blanks accurately from reliable court records/, "case facts remain required");
match(guide, /three or more/, "guide retains record threshold");
match(guide, /two or more/, "guide retains division threshold");
match(guide, /dismissal or a nolle prosequi/, "guide retains dispositions");
match(guide, /venue division/, "guide retains venue");
match(guide, /at least \*\*30 days before the final hearing\*\*/, "guide retains notice");
match(guide, /There is no filing fee/, "guide retains fee rule");
noMatch(guide, /_Route:/, "guide does not expose route key");

const map = JSON.parse(fs.readFileSync(path.join(OUT, "production-field-map.json"), "utf8"));
equal(map.routeKeys[0], INTERNAL_ROUTE, "machine map retains route key");
equal(map.requiredBeforeFilingCount, 6, "six participant case/narrative facts remain required");
equal(map.maps[0].canonicalWrites.length, 5, "five participant identity/contact facts remain written on petition");
equal(map.maps[1].canonicalWrites.length, 1, "participant name remains written on instructions");
equal(map.maps[0].canonicalRefusals.filter((row) => row.requiredBeforeFiling === true).length, 6, "all six required blanks remain classified");
equal(map.maps[0].canonicalRefusals.filter((row) => row.category === "signature_or_date_participant_completion").length, 2, "signature and date remain protected");

const receipt = JSON.parse(fs.readFileSync(path.join(OUT, "source-receipt.json"), "utf8"));
equal(receipt.routeKey, INTERNAL_ROUTE, "machine receipt retains route key");
equal(receipt.additiveLegalDecision.decisionId, "MA-BMC-CONSOLIDATED-THREE-PLUS-RECORDS", "receipt binds current decision ID");
const decisionBytes = fs.readFileSync(DECISION);
equal(receipt.additiveLegalDecision.sha256, crypto.createHash("sha256").update(decisionBytes).digest("hex"), "receipt binds exact decision bytes");
equal(receipt.compositionSources.length, 2, "existing two composition sources remain separately bound");

for (const [fixture, facts] of Object.entries({ canonical: canonicalFacts, boundary: boundaryFacts })) {
  const artifact = await pdfText(path.join(OUT, `fixtures/${fixture}.pdf`));
  equal(artifact.pages.length, 4, `${fixture}: two components remain four pages total`);
  noMatch(artifact.text, new RegExp(INTERNAL_ROUTE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${fixture}: route key absent from PDF`);
  noMatch(artifact.text, /filing-vehicle question is still unresolved/i, `${fixture}: stale vehicle hold absent from PDF`);
  noMatch(artifact.text, /whether the BMC publishes one is an open question/i, `${fixture}: speculative form text absent from PDF`);
  match(artifact.text, /CORI and certified court dockets are recommended sources/, `${fixture}: recommended-source text is readable`);
  match(artifact.text, /not universal filing attachments/, `${fixture}: attachment status is readable`);
  match(artifact.text, /THREE OR MORE/, `${fixture}: threshold is readable`);
  match(artifact.text, /TWO OR MORE/, `${fixture}: division threshold is readable`);
  match(artifact.text, /Suffolk County District Attorney at least 30 days before the final hearing/, `${fixture}: notice is readable`);
  for (const value of Object.values(facts)) ok(artifact.text.replace(/\s+/g, " ").includes(value), `${fixture}: known fact readable: ${value}`);
}

const counters = JSON.parse(fs.readFileSync(path.join(OUT, "reports/completeness-counters.json"), "utf8"));
ok(counters.allNineZero, "builder reports all nine counters zero");
equal(Object.values(counters.counters).reduce((sum, value) => sum + value, 0), 0, "all builder counter values are zero");

console.log(JSON.stringify({ status: "PASS", familyId: "ma-bmc-multi-set", assertions, negativeControls: 3 }, null, 2));
