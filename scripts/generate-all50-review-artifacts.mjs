import fs from "node:fs";
import path from "node:path";
import {
  BUILD_MANIFEST_PATH,
  REVIEW_ARTIFACT_DIR,
  buildManifest,
  buildSourceInventory,
  readJson,
  renderReviewArtifactIndex,
  renderStateReviewArtifact,
  writeJson,
  writeText
} from "./rcap-all50-lib.mjs";

let manifest;
if (fs.existsSync(BUILD_MANIFEST_PATH)) {
  manifest = readJson(BUILD_MANIFEST_PATH);
} else {
  const inventory = buildSourceInventory();
  manifest = buildManifest(inventory);
  writeJson(BUILD_MANIFEST_PATH, manifest);
}

const statesDir = path.join(REVIEW_ARTIFACT_DIR, "states");
writeText(path.join(REVIEW_ARTIFACT_DIR, "index.md"), renderReviewArtifactIndex(manifest));

for (const state of manifest.states) {
  writeText(path.join(statesDir, `${state.slug}.md`), renderStateReviewArtifact(state));
}

console.log("RCAP all-50 review artifacts generated.");
console.log(`Artifacts: ${manifest.states.length + 1}`);
console.log(`Wrote: ${REVIEW_ARTIFACT_DIR}`);
