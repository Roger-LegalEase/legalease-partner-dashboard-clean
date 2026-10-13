import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { CA_PROP64_FAMILY } from "./lib/ca-prop64-form-ownership.mjs";
import { caProp64CompletionInstructionsForReview, caProp64CompletionMetadataForReview } from "./build-census-v1-az_marijuana_expungement_arrest_no_charges-set.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.join(root, "data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill");
const read = (name) => JSON.parse(fs.readFileSync(path.join(directory, name), "utf8"));
let map = read("production-field-map.json");
const census = read("field-census.census-v1.json");
assert.equal(map.familyId, CA_PROP64_FAMILY);
assert.equal(map.generationAllowed, false);
assert.equal(map.runtimeSelectable, false);
const regenerated = caProp64CompletionMetadataForReview(census);
assert.deepEqual(regenerated.fieldMap.writes, map.writes, "Do not alter existing PDF writes in a metadata correction");
assert.deepEqual(regenerated.fieldMap.selections, map.selections, "Do not alter existing PDF branch controls");
map = regenerated.fieldMap;
for (const document of census.documents) {
  const current = regenerated.documents.find((row) => row.formNumber === document.formNumber);
  assert.deepEqual(current.fields, document.fields, "Measured source field geometry changed");
  document.dispositions = current.dispositions;
}
const outputs = {
  "production-field-map.json": JSON.stringify(map, null, 2) + "\n",
  "field-census.census-v1.json": JSON.stringify(census, null, 2) + "\n",
  "participant-instructions.md": caProp64CompletionInstructionsForReview(map),
};
for (const [name, bytes] of Object.entries(outputs)) {
  if (process.argv.includes("--write")) fs.writeFileSync(path.join(directory, name), bytes);
  else assert.equal(fs.readFileSync(path.join(directory, name), "utf8"), bytes, `${name}: completion metadata not current`);
}
console.log(JSON.stringify({ status: "PASS", mode: process.argv.includes("--write") ? "UPDATE_THREE_METADATA_FILES_ONLY" : "CHECK", refusals: map.refusals.length, regeneratedPdfs: 0, changedApprovalRecords: 0 }));
