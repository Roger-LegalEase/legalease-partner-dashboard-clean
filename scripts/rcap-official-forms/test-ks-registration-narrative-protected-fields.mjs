#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { finalizeOfficialForm } from "./rcap-official-form-finalize.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const facts = { "matter.conviction_date": "2020-01-02" };

async function source(label) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const field = doc.getForm().createTextField("Date");
  field.addToPage(page, { x: 60, y: 700, width: 180, height: 18, borderWidth: 0 });
  return { bytes: await doc.save({ useObjectStreams: false, updateMetadata: false }), label };
}

const census = (effectiveLabel) => [{
  name: "Date", type: "text", effectiveLabel, regionHeading: null,
  widgets: [{ page: 1, rect: { x: 60, y: 700, width: 180, height: 18 } }],
  multiline: false, maxLength: null
}];

const original = await source("Conviction date");
const refused = await finalizeOfficialForm({
  sourceBytes: original.bytes, expectedSha256: digest(original.bytes), census: census(original.label),
  facts, narrativeAcrossFields: [{ factId: "matter.conviction_date", fields: ["Date"] }]
});
assert.equal(refused.report.written.length, 0);
assert.ok(refused.report.refused.some((row) => row.reason === "protected_category"));

const allowed = await finalizeOfficialForm({
  sourceBytes: original.bytes, expectedSha256: digest(original.bytes), census: census(original.label),
  facts, narrativeAcrossFields: [{
    factId: "matter.conviction_date", fields: ["Date"],
    allowProtectedCategories: ["disposition_or_hearing"]
  }]
});
assert.equal(allowed.report.written.length, 1);
assert.equal(allowed.report.written[0].field, "Date");

const unknown = await finalizeOfficialForm({
  sourceBytes: original.bytes, expectedSha256: digest(original.bytes), census: census(original.label),
  facts, narrativeAcrossFields: [{
    factId: "matter.conviction_date", fields: ["Date"],
    allowProtectedCategories: ["made_up_category"]
  }]
});
assert.equal(unknown.report.written.length, 0);
assert.ok(unknown.report.refused.some((row) => row.reason === "narrative_has_unknown_protected_category"));

const stillProtected = await finalizeOfficialForm({
  sourceBytes: original.bytes, expectedSha256: digest(original.bytes), census: census("Judge conviction date"),
  facts, narrativeAcrossFields: [{
    factId: "matter.conviction_date", fields: ["Date"],
    allowProtectedCategories: ["disposition_or_hearing"]
  }]
});
assert.equal(stillProtected.report.written.length, 0);
assert.ok(stillProtected.report.refused.some((row) => row.reason === "protected_category"));

for (const effectiveLabel of ["Judge signature", "Prosecutor signature", "Judge prosecutor signature"]) {
  const mixedProtected = await finalizeOfficialForm({
    sourceBytes: original.bytes, expectedSha256: digest(original.bytes), census: census(effectiveLabel),
    facts, narrativeAcrossFields: [{
      factId: "matter.conviction_date", fields: ["Date"],
      allowProtectedCategories: ["signature"]
    }]
  });
  assert.equal(mixedProtected.report.written.length, 0, effectiveLabel);
  assert.ok(
    mixedProtected.report.refused.some((row) => row.reason === "protected_category"),
    effectiveLabel
  );
}

console.log("PASS Kansas narrative protected-field opt-in: default deny, exact category opt-in, unknown category rejection, residual protection, and mixed signature/court/prosecutor protection");
