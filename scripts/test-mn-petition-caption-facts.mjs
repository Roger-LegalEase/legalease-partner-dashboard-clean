import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { mnPetitionCaptionFacts } = await import("../src/lib/rcap/render/mn-petition-caption-facts.ts");
const H = await import("../src/lib/expungement-ai/mn-two-county-source-facts.ts");
const C = await import("../src/lib/expungement-ai/record-fact-clarification.ts");
const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { renderMnPetitionCaptionPreview } = await import("./build-census-v1-mn_petition_609a02_subd3-set.mjs");
const profile = getProfileByJurisdiction("MN"), pathwayId = H.MN_PETITION_ROUTE;
// Deliberately synthetic: no entered court record, signature or service event.
const answers = { jurisdiction_scope: "State or local", court: "Hennepin District Court",
  charge: "Synthetic retained target charge", case_outcome: "Misdemeanor conviction",
  sentence_completion_date: "Yes", mn_sentence_discharge_date: "2020-01-01",
  mn_new_conviction_since_discharge: "no", mn_deciding_case_county: "Hennepin",
  county: "Ramsey", residency_or_location: "Duluth", mn_prosecuted_case_county: "Anoka",
  mn_prosecuting_city: "Saint Paul", signing_county: "Dakota" };
const origin = H.mnTargetOriginQuestion(profile, pathwayId, null);
const confirmation = C.recordFactConfirmationFor(`MN:${pathwayId}`, H.MN_TARGET_ORIGIN_ID, answers, origin);
assert(confirmation);
const preparation = { profile, pathwayId, specification: null, answers,
  confirmations: { [H.MN_TARGET_ORIGIN_ID]: confirmation } };
const before = structuredClone(preparation), checks = [];
const check = (name, run) => { run(); checks.push(name); };
check("explicit deciding county only", () => assert.deepEqual(mnPetitionCaptionFacts(preparation), { "matter.county": "Hennepin" }));
check("known wrapped county", () => assert.deepEqual(mnPetitionCaptionFacts({ ...preparation,
  answers: { ...answers, mn_deciding_case_county: { value: "St. Louis", unknown: false } } }), { "matter.county": "St. Louis" }));
for (const value of [undefined, "", "unknown", "I am not sure", { unknown: true }, { value: "Hennepin", unknown: true }, ["Hennepin"], "Hennepin\nRamsey"]) {
  check("unknown or invalid county refuses " + JSON.stringify(value), () => assert.throws(() => mnPetitionCaptionFacts({ ...preparation,
    answers: { ...answers, mn_deciding_case_county: value } }), /county/));
}
for (const patch of [{ pathwayId: H.MN_PROSECUTOR_ROUTE }, { specification: {} },
  { profile: { ...profile, profileVersion: "stale" } }, { confirmations: {} },
  { unresolved: [H.MN_CASE_COUNTY] }, { unresolved: [H.MN_TARGET_ORIGIN_ID] },
  { answers: { ...answers, court: "Different target court" } },
  { answers: { ...answers, jurisdiction_scope: "Federal" } },
  { answers: { ...answers, case_outcome: "Arrest or citation with no charge filed" } },
  { answers: { ...answers, mn_sentence_discharge_date: { unknown: true } } }]) {
  check("source stage or origin refuses " + checks.length, () => assert.throws(() => mnPetitionCaptionFacts({ ...preparation, ...patch })));
}
check("protected preparation unchanged", () => assert.deepEqual(preparation, before));
const held = H.mnProtectedStageCandidate(profile, pathwayId, null, answers);
check("qualification and authority remain held", () => { assert.equal(held.authority, false); assert.equal(held.qualificationCheckboxExportAllowed, false); });
console.log(JSON.stringify({ stage: "facts", status: "PASS", checks }));

const sourcePool = "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Minnesota";
const sources = [
  ["FEE102", "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/MN/04_SUPPORTING_PROCESS/MN__SUPPORT__FEE102__affidavit-to-request-fee-waiver__REV-2024-07__EN.pdf", 6],
  ["EXP102", path.join(sourcePool, "EXP102_Current-2.pdf"), 6],
  ["EXP104", path.join(sourcePool, "EXP104_Current.pdf"), 2],
  ["EXP105", path.join(sourcePool, "EXP105_Current.pdf"), 4]
];
const { PDFDocument } = await import("pdf-lib");
const { extractTextItems } = await import("./rcap-official-forms/rcap-pdf-anchor-capture.mjs");
const digest = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const out = process.env.RCAP_MN_CAPTION_OUTPUT;
if (out) { assert(!fs.existsSync(out), "Use a fresh output directory"); fs.mkdirSync(out, { recursive: true }); }
const outputs = [];
for (const [documentId, sourcePath, pages] of sources) {
  const sourceBytes = fs.readFileSync(sourcePath);
  const result = await renderMnPetitionCaptionPreview({ documentId, sourceBytes, preparation, includeFeeWaiver: documentId === "FEE102" });
  const doc = await PDFDocument.load(result.bytes);
  check(documentId + " exact page count", () => assert.equal(doc.getPageCount(), pages));
  const original = await PDFDocument.load(sourceBytes);
  check(documentId + " all original printed text preserved", () => {
    for (const [index, page] of original.getPages().entries()) {
      const key = item => JSON.stringify([item.x, item.y, item.text]);
      const remaining = extractTextItems(doc.getPages()[index]).map(key);
      for (const item of extractTextItems(page)) {
        const at = remaining.indexOf(key(item));
        assert(at >= 0, "Original printed text was removed or moved");
        remaining.splice(at, 1);
      }
    }
  });
  check(documentId + " only county added", () => {
    assert.equal(result.ink.addedGlyphs, "Hennepin".length);
    assert.equal(result.ink.glyphsOutsideMeasuredWriteBoxes, 0);
    assert.equal(result.report.written.length, 1);
    assert.deepEqual(result.report.expectedValues, ["Hennepin"]);
    assert(extractTextItems(doc.getPages()[0]).some(item => item.text === "Hennepin"));
    assert.equal(result.authority, false); assert.equal(result.qualificationCheckboxExportAllowed, false);
  });
  await assert.rejects(renderMnPetitionCaptionPreview({ documentId, sourceBytes: Buffer.concat([sourceBytes, Buffer.from("changed")]), preparation, includeFeeWaiver: true }), /source bytes/);
  await assert.rejects(renderMnPetitionCaptionPreview({ documentId, sourceBytes, preparation: { ...preparation, confirmations: {} }, includeFeeWaiver: true }), /origin/);
  await assert.rejects(renderMnPetitionCaptionPreview({ documentId, sourceBytes, preparation: { ...preparation,
    answers: { ...answers, mn_deciding_case_county: "X".repeat(2000) } }, includeFeeWaiver: true }), /refused/);
  if (documentId === "FEE102") await assert.rejects(renderMnPetitionCaptionPreview({ documentId, sourceBytes, preparation }), /not requested/);
  if (out) fs.writeFileSync(path.join(out, `${documentId}-held-caption.pdf`), result.bytes, { flag: "wx" });
  outputs.push({ documentId, sourcePath, sourceSha256: digest(sourceBytes), outputSha256: digest(result.bytes), pages,
    writeBox: result.writeBox, ink: result.ink, report: result.report });
  if (out) fs.writeFileSync(path.join(out, `${documentId}-RESULT.json`), JSON.stringify(outputs.at(-1), null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ stage: documentId, status: "PASS", output: outputs.at(-1) }));
}
check("all rendering preserves protected facts", () => assert.deepEqual(preparation, before));
const receipt = { status: "PASS_HELD_CAPTION_ONLY", checks, outputs, synthetic: true,
  canonicalFamilyRebuilt: false, authority: false, qualificationCheckboxExportAllowed: false };
if (out) fs.writeFileSync(path.join(out, "RESULT.json"), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(receipt, null, 2));
