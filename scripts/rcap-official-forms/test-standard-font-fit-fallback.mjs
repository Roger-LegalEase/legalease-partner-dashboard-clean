#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createRequire } from "node:module";

import { extractTextItems } from "./rcap-pdf-anchor-capture.mjs";
import {
  finalizeFlatOverlay,
  finalizeOfficialForm,
  STANDARD_FONT_FALLBACK
} from "./rcap-official-form-finalize.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const boundaryEmail = "maria.alejandra.oshaughnessy.whitfield@longmailexample.org";
const shortEmail = "jordan.reyes@example.org";

async function acroSource() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const field = doc.getForm().createTextField("Email");
  field.addToPage(page, { x: 50, y: 700, width: 167.56, height: 12, borderWidth: 0 });
  return doc.save({ useObjectStreams: false, updateMetadata: false });
}

async function flatSource() {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  return doc.save({ useObjectStreams: false, updateMetadata: false });
}

async function narrativeSource() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const field = doc.getForm().createTextField("Address 1");
  field.addToPage(page, { x: 50, y: 700, width: 180, height: 12, borderWidth: 0 });
  return doc.save({ useObjectStreams: false, updateMetadata: false });
}

function digest(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

const source = await acroSource();
const census = [{
  name: "Email", type: "text", effectiveLabel: "Email", regionHeading: "Participant information",
  widgets: [{ page: 1, rect: { x: 50, y: 700, width: 167.56, height: 12 } }],
  multiline: false, maxLength: null
}];

const refused = await finalizeOfficialForm({
  sourceBytes: source, expectedSha256: digest(source), census,
  facts: { "participant.email": boundaryEmail },
  explicitMappings: { Email: "participant.email" }, minFontSize: 6, maxFontSize: 10
});
assert.equal(refused.report.written.length, 0, "Helvetica-only path must keep refusing the measured boundary value");
assert.equal(refused.report.unfittable.length, 1);
assert.equal(refused.report.standardFontFallbacks.length, 0);

const repaired = await finalizeOfficialForm({
  sourceBytes: source, expectedSha256: digest(source), census,
  facts: { "participant.email": boundaryEmail },
  explicitMappings: { Email: "participant.email" }, minFontSize: 6, maxFontSize: 10,
  standardFontFallbackByField: { Email: STANDARD_FONT_FALLBACK.TIMES_ROMAN }
});
assert.equal(repaired.report.unfittable.length, 0);
assert.equal(repaired.report.standardFontFallbacks.length, 1);
assert.equal(repaired.report.standardFontFallbacks[0].primaryOutcome, "refused");
assert.equal(repaired.report.standardFontFallbacks[0].fallbackFont, STANDARD_FONT_FALLBACK.TIMES_ROMAN);
const repairedDoc = await PDFDocument.load(repaired.bytes, { ignoreEncryption: true });
const repairedText = extractTextItems(repairedDoc.getPage(0)).map((item) => item.text).join("");
assert.ok(repairedText.includes(boundaryEmail), "the flattened bytes must read back the complete exact boundary email");

const canonical = await finalizeOfficialForm({
  sourceBytes: source, expectedSha256: digest(source), census,
  facts: { "participant.email": shortEmail },
  explicitMappings: { Email: "participant.email" }, minFontSize: 6, maxFontSize: 10,
  standardFontFallbackByField: { Email: STANDARD_FONT_FALLBACK.TIMES_ROMAN }
});
assert.equal(canonical.report.standardFontFallbacks.length, 0, "an opted-in field that fits Helvetica must retain Helvetica");
assert.equal(canonical.report.written[0].font, "Helvetica");

const longStreet = "1188 Southwest Martin Luther King Junior Boulevard, Apartment 1407";
const narrativeBytes = await narrativeSource();
const narrativeCensus = [{
  name: "Address 1", type: "text", effectiveLabel: "Submitted by — Address 1",
  regionHeading: "Signature of Defendant/Defendant's Attorney",
  widgets: [{ page: 1, rect: { x: 50, y: 700, width: 180, height: 12 } }],
  multiline: false, maxLength: null
}];
const narrativeRefused = await finalizeOfficialForm({
  sourceBytes: narrativeBytes, expectedSha256: digest(narrativeBytes), census: narrativeCensus,
  facts: { "participant.street_address": longStreet }, minFontSize: 6, maxFontSize: 10,
  narrativeAcrossFields: [{ factId: "participant.street_address", fields: ["Address 1"] }]
});
assert.equal(narrativeRefused.report.written.length, 0, "a narrative field still refuses the measured Helvetica overflow by default");
assert.equal(narrativeRefused.report.unfittable.length, 1);
assert.equal(narrativeRefused.report.standardFontFallbacks.length, 0);

const narrativeRepaired = await finalizeOfficialForm({
  sourceBytes: narrativeBytes, expectedSha256: digest(narrativeBytes), census: narrativeCensus,
  facts: { "participant.street_address": longStreet }, minFontSize: 6, maxFontSize: 10,
  narrativeAcrossFields: [{
    factId: "participant.street_address", fields: ["Address 1"],
    standardFontFallback: STANDARD_FONT_FALLBACK.TIMES_ROMAN
  }],
  standardFontFallbackByField: { "Address 1": STANDARD_FONT_FALLBACK.TIMES_ROMAN }
});
assert.equal(narrativeRepaired.report.unfittable.length, 0);
assert.equal(narrativeRepaired.report.written.length, 1);
assert.equal(narrativeRepaired.report.written[0].fontSize, 6);
assert.equal(narrativeRepaired.report.written[0].font, STANDARD_FONT_FALLBACK.TIMES_ROMAN);
assert.equal(narrativeRepaired.report.standardFontFallbacks.length, 1);
const narrativeDoc = await PDFDocument.load(narrativeRepaired.bytes, { ignoreEncryption: true });
const narrativeText = extractTextItems(narrativeDoc.getPage(0)).map((item) => item.text).join("");
assert.ok(narrativeText.includes(longStreet), "the narrative fallback appearance must read back the complete exact street address");

const protectedNarrative = await finalizeOfficialForm({
  sourceBytes: narrativeBytes, expectedSha256: digest(narrativeBytes),
  census: [{ ...narrativeCensus[0], effectiveLabel: "Judge Signature" }],
  facts: { "participant.street_address": longStreet }, minFontSize: 6, maxFontSize: 10,
  narrativeAcrossFields: [{
    factId: "participant.street_address", fields: ["Address 1"],
    standardFontFallback: STANDARD_FONT_FALLBACK.TIMES_ROMAN
  }],
  standardFontFallbackByField: { "Address 1": STANDARD_FONT_FALLBACK.TIMES_ROMAN }
});
assert.equal(protectedNarrative.report.written.length, 0, "a narrative fallback must never bypass the protected-caption gate");
assert.equal(protectedNarrative.report.standardFontFallbacks.length, 0);
assert.ok(protectedNarrative.report.refused.some((row) => row.reason === "protected_category"));

await assert.rejects(
  () => finalizeOfficialForm({
    sourceBytes: source, expectedSha256: digest(source), census,
    facts: { "participant.email": boundaryEmail }, explicitMappings: { Email: "participant.email" },
    standardFontFallbackByField: { Email: "Courier" }
  }),
  /unsupported standard-font fallback/
);

const flat = await flatSource();
const protectedResult = await finalizeFlatOverlay({
  sourceBytes: flat, expectedSha256: digest(flat),
  anchors: [{
    page: 1, label: "Judge Signature", factId: "participant.email",
    writeBox: { x: 50, y: 700, width: 167.56, height: 12 }, fontSize: 10,
    standardFontFallback: STANDARD_FONT_FALLBACK.TIMES_ROMAN
  }],
  explicitMappings: { "Judge Signature": "participant.email" },
  facts: { "participant.email": boundaryEmail }
});
assert.equal(protectedResult.report.written.length, 0, "a fallback must never bypass the protected-caption gate");
assert.equal(protectedResult.report.standardFontFallbacks.length, 0);
assert.ok(protectedResult.report.refused.some((row) => row.reason === "protected_category"));

console.log("PASS standard-font fit fallback: 25 assertions");
