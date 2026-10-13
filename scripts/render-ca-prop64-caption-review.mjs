// Review-only entrypoint. It reuses the actual section resolver and shared PDF
// finalizer; it never resets a family or creates a commercial approval.
import fs from "node:fs";
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
const resolved = caProp64Section(input.recordAnswers ?? {});
const section = ["11357", "11358", "11359", "11360", "11362.1"].includes(resolved) ? resolved : undefined;
const report = await renderCaProp64CaptionReview({ ...input, recordSection: section });
fs.writeFileSync(`${input.outputDirectory}/section-resolution.json`, JSON.stringify({
  recordAnswers: input.recordAnswers ?? {}, resolution: resolved ?? null,
  selectedSection: section ?? null, status: section ? "FACT_BOUND_NOT_ELIGIBILITY_AUTHORITY" : "UNRESOLVED_RETAINED_FOR_CORRECTION",
}, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ status: report.reviewStatus, artifacts: report.artifacts.length,
  written: report.artifacts.map(row => row.finalizerWritten.length), unresolved: report.unresolved.length,
  generationAllowed: report.generationAllowed }));
