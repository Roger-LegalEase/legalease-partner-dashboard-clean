import fs from "node:fs";
import path from "node:path";
import {
  BUILD_MANIFEST_PATH,
  BUILD_STATUSES,
  LEGACY_GENERATOR_DIRS,
  REVIEW_ARTIFACT_DIR,
  SOURCE_INVENTORY_PATH,
  STATES_PLUS_DC,
  changedFilesFromGit,
  readJson
} from "./rcap-all50-lib.mjs";

const failures = [];

function fail(message) {
  failures.push(message);
}

if (!fs.existsSync(SOURCE_INVENTORY_PATH)) {
  fail(`Missing source inventory: ${SOURCE_INVENTORY_PATH}`);
}

if (!fs.existsSync(BUILD_MANIFEST_PATH)) {
  fail(`Missing build manifest: ${BUILD_MANIFEST_PATH}`);
}

const inventory = fs.existsSync(SOURCE_INVENTORY_PATH) ? readJson(SOURCE_INVENTORY_PATH) : null;
const manifest = fs.existsSync(BUILD_MANIFEST_PATH) ? readJson(BUILD_MANIFEST_PATH) : null;

if (inventory) {
  if (inventory.states.length !== STATES_PLUS_DC.length) {
    fail(`Source inventory must contain ${STATES_PLUS_DC.length} jurisdictions, found ${inventory.states.length}.`);
  }

  for (const expected of STATES_PLUS_DC) {
    const entry = inventory.states.find((state) => state.code === expected.code);
    if (!entry) {
      fail(`Source inventory missing ${expected.code} ${expected.name}.`);
      continue;
    }
    if (!["resources_found", "missing"].includes(entry.status)) {
      fail(`${expected.code} source status must be resources_found or missing, got ${entry.status}.`);
    }
    if (!entry.resourceCounts || typeof entry.resourceCounts.total !== "number") {
      fail(`${expected.code} must have resourceCounts.`);
    }
    if (entry.status === "missing" && !entry.missingReason) {
      fail(`${expected.code} missing resources must have missingReason.`);
    }
  }
}

if (manifest) {
  if (manifest.states.length !== STATES_PLUS_DC.length) {
    fail(`Build manifest must contain ${STATES_PLUS_DC.length} jurisdictions, found ${manifest.states.length}.`);
  }

  for (const status of BUILD_STATUSES) {
    if (!manifest.buildStatuses.includes(status)) {
      fail(`Build manifest missing build status ${status}.`);
    }
  }

  for (const expected of STATES_PLUS_DC) {
    const entry = manifest.states.find((state) => state.code === expected.code);
    if (!entry) {
      fail(`Build manifest missing ${expected.code} ${expected.name}.`);
      continue;
    }
    if (entry.buildStatus !== "state_built") {
      fail(`${expected.code} must be markable as state_built without counsel/visual review; got ${entry.buildStatus}.`);
    }
    if (!entry.sourceInventory) {
      fail(`${expected.code} must receive a source inventory object.`);
    }
    if (!entry.reviewStatuses) {
      fail(`${expected.code} must track review statuses separately.`);
    } else {
      for (const key of ["qa", "visual", "counsel", "sourceFreshness"]) {
        if (!entry.reviewStatuses[key]) fail(`${expected.code} missing review status ${key}.`);
      }
    }
    if (entry.reviewStatuses?.counsel === "passed" || entry.reviewStatuses?.visual === "passed") {
      fail(`${expected.code} should not mark post-build review as passed in the build-first manifest.`);
    }
    if (!entry.artifacts?.guidancePacket || !entry.outputTypes?.includes("guidance_packet")) {
      fail(`${expected.code} must have guidance packet fallback metadata.`);
    }
    const artifactPath = path.join(path.dirname(BUILD_MANIFEST_PATH), "..", "..", entry.artifacts.reviewArtifact);
    if (!fs.existsSync(artifactPath)) {
      fail(`${expected.code} review artifact missing at ${entry.artifacts.reviewArtifact}.`);
    }
  }
}

for (const legacyDir of LEGACY_GENERATOR_DIRS) {
  if (!fs.existsSync(path.resolve(legacyDir))) {
    fail(`Legacy generator directory missing: ${legacyDir}`);
  }
}

const changedFiles = changedFilesFromGit();
const changedLegacyFiles = changedFiles.filter((file) => LEGACY_GENERATOR_DIRS.some((dir) => file.startsWith(`${dir}/`)));
if (changedLegacyFiles.length > 0) {
  fail(`Legacy generator files changed: ${changedLegacyFiles.join(", ")}`);
}

const expungementUiPatterns = [
  /^src\/app\/expungement-ai\//,
  /^src\/app\/expungement\//,
  /^src\/app\/\(expungement-ai\)\//,
  /^src\/components\/expungement-ai\//,
  /^src\/components\/expungement\//
];
const expungementUiChanges = changedFiles.filter((file) => expungementUiPatterns.some((pattern) => pattern.test(file)));
if (expungementUiChanges.length > 0) {
  fail(`Expungement.ai UI files changed: ${expungementUiChanges.join(", ")}`);
}

if (!fs.existsSync(path.join(REVIEW_ARTIFACT_DIR, "index.md"))) {
  fail("Review artifact index is missing.");
}

if (failures.length > 0) {
  console.error("RCAP all-50 build verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP all-50 build verification passed.");
console.log(`Jurisdictions verified: ${STATES_PLUS_DC.length}`);
console.log("Legacy generators preserved: yes");
console.log("Expungement.ai UI untouched: yes");
