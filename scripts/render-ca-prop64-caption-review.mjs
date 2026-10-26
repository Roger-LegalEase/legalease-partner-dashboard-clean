// Review-only entrypoint. It reuses the actual section resolver and shared PDF
// finalizer; it never resets a family or creates a commercial approval.
import fs from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { register } from "node:module";
import { renderCaProp64CaptionReview } from "./build-census-v1-az_marijuana_expungement_arrest_no_charges-set.mjs";
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { caProp64Section } = await import("../src/lib/rcap-engine/california-prop64-facts.ts");
const inputFile = process.argv[2];
assert.ok(inputFile, "usage: node scripts/render-ca-prop64-caption-review.mjs input.json");
const input = JSON.parse(fs.readFileSync(inputFile, "utf8"));
assert.equal(input.reviewOnly, true, "explicit review input required");
assert.equal(input.recordSection, undefined, "use original record answers, not an unchecked preselected section");
let preparation = null;
const preparationFiles = [
  "scripts/render-ca-prop64-caption-review.mjs",
  "src/lib/expungement-ai/ca-prop64-document-preparation.ts",
  "src/lib/expungement-ai/ca-prop64-caption-facts.ts",
  "src/lib/expungement-ai/ca-prop64-contact-answer.ts",
  "src/lib/expungement-ai/ca-prop64-contact-questions.ts",
  "src/lib/expungement-ai/ca-prop64-contact-successor.ts",
  "src/lib/expungement-ai/ca-prop64-caption-answer.ts",
  "src/lib/expungement-ai/ca-prop64-caption-successor.ts",
  "src/lib/expungement-ai/packet-information.ts",
  "src/lib/expungement-ai/packet-contract-successors.ts",
  "src/lib/expungement-ai/question-answer-state.ts",
  "src/lib/rcap-engine/packet-planner.ts",
  "src/lib/rcap-engine/california-prop64-facts.ts"
];
const preparationHashes = () => Object.fromEntries(preparationFiles.map(file =>
  [file, createHash("sha256").update(fs.readFileSync(file)).digest("hex")]));
const preparationSource = input.protectedRecordFile ? preparationHashes() : null;
if (input.protectedRecordFile) {
  for (const key of ["facts", "variantId", "recordAnswers", "absentContactFactIds"]) assert.equal(input[key], undefined, `protected preparation cannot override ${key}`);
  const { caProp64ProtectedDocumentPreparation } = await import("../src/lib/expungement-ai/ca-prop64-document-preparation.ts");
  const recordBytes = fs.readFileSync(input.protectedRecordFile);
  preparation = caProp64ProtectedDocumentPreparation(JSON.parse(recordBytes));
  assert.ok(preparation, "exact protected CA adult preparation unavailable");
  preparation = { ...preparation, recordFileSha256: createHash("sha256").update(recordBytes).digest("hex"),
    custodyLimit: "Record hash validation is not proof of authorized acquisition; the caller's owner-read evidence remains required." };
}
const resolved = preparation ? preparation.sectionResolution : caProp64Section(input.recordAnswers ?? {});
const section = ["11357", "11358", "11359", "11360", "11362.1"].includes(resolved) ? resolved : undefined;
const report = await renderCaProp64CaptionReview({ ...input,
  ...(preparation ? { facts: preparation.facts, variantId: preparation.variantId, absentContactFactIds: preparation.absentContactFactIds } : {}), recordSection: section });
if (preparation) {
  assert.deepEqual(preparationHashes(), preparationSource, "protected preparation source changed during rendering");
  fs.writeFileSync(`${input.outputDirectory}/protected-preparation.json`, JSON.stringify({ ...preparation, sourceCodeSha256: preparationSource }, null, 2) + "\n", { flag: "wx" });
}
fs.writeFileSync(`${input.outputDirectory}/section-resolution.json`, JSON.stringify({
  recordAnswers: input.recordAnswers ?? {}, resolution: resolved ?? null,
  selectedSection: section ?? null, status: section ? "FACT_BOUND_NOT_ELIGIBILITY_AUTHORITY" : "UNRESOLVED_RETAINED_FOR_CORRECTION",
}, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ status: report.reviewStatus, artifacts: report.artifacts.length,
  written: report.artifacts.map(row => row.finalizerWritten.length), unresolved: report.unresolved.length,
  generationAllowed: report.generationAllowed }));
