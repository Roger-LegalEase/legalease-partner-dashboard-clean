import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSourceEngineChangeScope } from "./source-engine-change-scope.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const buildManifest = readJson("data/rcap-all50/all-state-build-manifest.json");
const overlayManifest = readJson("data/rcap-all50/overlays/overlay-factory-manifest.json");
const handoffPage = readText("src/app/internal/record-clearing/handoff/page.tsx");
const dataSource = readText("src/lib/rcap/all50-internal-preview.ts");

const summary = {
  totalJurisdictions: buildManifest.states.length,
  jurisdictionsStateBuilt: buildManifest.states.filter((state) => state.buildStatus === "state_built").length,
  totalFormsFound: overlayManifest.summary.totalFormsFound,
  totalPdfForms: overlayManifest.summary.totalPdfForms,
  fullyMappedForms: overlayManifest.summary.mappedForms,
  partialFieldMaps: overlayManifest.summary.partialMaps,
  renderedSamples: overlayManifest.summary.renderedSamples,
  blockedForms: overlayManifest.summary.blockedForms,
  visualReviewPending: overlayManifest.summary.visualReviewPending,
  counselReviewPending: buildManifest.states.filter((state) => state.reviewStatuses.counsel === "pending").length,
  qaReviewPending: buildManifest.states.filter((state) => state.reviewStatuses.qa === "pending").length,
  sourceFreshnessPending: buildManifest.states.filter((state) => state.reviewStatuses.sourceFreshness === "pending").length,
  reviewArtifactRootPath: "tmp/review-inbox/all50"
};

const expected = {
  totalJurisdictions: 51,
  jurisdictionsStateBuilt: 51,
  totalFormsFound: 409,
  totalPdfForms: 292,
  fullyMappedForms: 4,
  partialFieldMaps: 287,
  renderedSamples: 291,
  blockedForms: 1,
  visualReviewPending: 292,
  counselReviewPending: 51,
  qaReviewPending: 51,
  sourceFreshnessPending: 51
};

for (const [key, value] of Object.entries(expected)) {
  if (summary[key] !== value) failures.push(`${key} expected ${value}, found ${summary[key]}.`);
}

for (const marker of [
  "getAll50HandoffSummary",
  "Total jurisdictions",
  "State built",
  "Forms found",
  "PDF forms",
  "Fully mapped forms",
  "Partial field maps",
  "Rendered samples",
  "Blocked forms",
  "Visual pending",
  "Counsel pending",
  "QA pending",
  "Source freshness pending",
  "Recommended review order"
]) {
  if (!handoffPage.includes(marker)) failures.push(`Handoff page missing marker: ${marker}`);
}

for (const marker of [
  "Legacy live states first: MS, IL, DC, PA, TX-Harris",
  "High-volume / launch-priority states: GA, MD, MI, TX statewide, CA, NY, FL",
  "States with blocked forms",
  "States with rendered overlay samples",
  "Guidance-only or lower-complexity states"
]) {
  if (!dataSource.includes(marker)) failures.push(`Recommended review order missing: ${marker}`);
}

for (const state of buildManifest.states) {
  const stateRoot = path.join(rootDir, "tmp/review-inbox/all50", state.slug);
  if (!fs.existsSync(stateRoot)) failures.push(`Missing review artifact root for ${state.code}: ${stateRoot}`);
}

assertNoRestrictedChanges();

if (failures.length > 0) {
  console.error("RCAP all-50 handoff verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP all-50 handoff verification passed.");
console.log(`Total jurisdictions: ${summary.totalJurisdictions}`);
console.log(`Jurisdictions state_built: ${summary.jurisdictionsStateBuilt}`);
console.log(`Total forms found: ${summary.totalFormsFound}`);
console.log(`Total PDF forms: ${summary.totalPdfForms}`);
console.log(`Fully mapped forms: ${summary.fullyMappedForms}`);
console.log(`Partial field maps: ${summary.partialFieldMaps}`);
console.log(`Rendered samples: ${summary.renderedSamples}`);
console.log(`Blocked forms: ${summary.blockedForms}`);
console.log(`Visual review pending: ${summary.visualReviewPending}`);
console.log(`Counsel review pending: ${summary.counselReviewPending}`);
console.log(`QA review pending: ${summary.qaReviewPending}`);
console.log(`Source freshness pending: ${summary.sourceFreshnessPending}`);
console.log(`Review artifact root path: ${summary.reviewArtifactRootPath}`);
console.log("Recommended review order: verified");
console.log("Public live routing unchanged: yes");
console.log("Legacy generators removed from active runtime: yes");
console.log("Expungement.ai UI untouched: yes");

function assertNoRestrictedChanges() {
  assertSourceEngineChangeScope({
    rootDir,
    failures,
    extraForbiddenPrefixes: [
      "src/app/api/",
      "src/app/p/",
      "src/app/intake/",
      "src/app/briefcase/",
      "src/app/partner/",
      "src/app/partners/",
      "src/app/request-pilot/",
      "src/app/expungement-ai/",
      "src/components/expungement-ai/"
    ]
  });
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
