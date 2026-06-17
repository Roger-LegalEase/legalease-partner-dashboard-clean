import fs from "node:fs";
import path from "node:path";
import {
  BUILD_MANIFEST_PATH,
  LEGACY_GENERATOR_DIRS,
  REVIEW_INBOX_DIR,
  changedFilesFromGit,
  readJson
} from "./rcap-all50-lib.mjs";

// Verifier for the QA / attorney review inbox.
//
// Proves: all 51 review folders exist; each has the required artifacts; all 51
// jurisdictions are represented; missing overlays are recorded as pending (not a
// failure); legacy live generators are unchanged; Expungement.ai UI untouched.

const REQUIRED_FILES = [
  "REVIEW-MANIFEST.md",
  "source-inventory.json",
  "state-pack-summary.json",
  "forms-manifest.json",
  "guidance-summary.md",
  "pleading-summary.md",
  "qa-report.json",
  "attorney-review-notes.md",
  "visual-review-notes.md",
  "next-actions.md"
];

const FORBIDDEN_CHANGED_PREFIXES = [
  ...LEGACY_GENERATOR_DIRS.map((dir) => `${dir}/`),
  "src/app/expungement-ai/",
  "src/app/expungement/",
  "src/components/expungement-ai/",
  "src/components/expungement/"
];

const failures = [];

if (!fs.existsSync(BUILD_MANIFEST_PATH)) {
  failures.push("Missing build manifest; run rcap:build-all50 first.");
}

const manifest = fs.existsSync(BUILD_MANIFEST_PATH) ? readJson(BUILD_MANIFEST_PATH) : { states: [] };
const expected = manifest.states || [];
let overlayPendingCount = 0;

if (!fs.existsSync(REVIEW_INBOX_DIR)) {
  failures.push(`Review inbox directory missing: ${REVIEW_INBOX_DIR}`);
}

if (expected.length !== 51) {
  failures.push(`Expected 51 jurisdictions in manifest, found ${expected.length}.`);
}

for (const state of expected) {
  const dir = path.join(REVIEW_INBOX_DIR, state.slug);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    failures.push(`${state.code} missing review folder: ${state.slug}/`);
    continue;
  }
  for (const file of REQUIRED_FILES) {
    const target = path.join(dir, file);
    if (!fs.existsSync(target)) {
      failures.push(`${state.code} missing ${file}`);
    }
  }

  const qaPath = path.join(dir, "qa-report.json");
  if (fs.existsSync(qaPath)) {
    let qa;
    try {
      qa = readJson(qaPath);
    } catch {
      failures.push(`${state.code} qa-report.json is not valid JSON`);
      continue;
    }
    if (qa.pass !== true) {
      failures.push(`${state.code} qa-report.json did not pass: ${(qa.failedChecks || []).join(", ")}`);
    }
    if (qa.checks?.notBlockedFromStateBuiltByPendingReview !== true) {
      failures.push(`${state.code} is incorrectly blocked from state_built by a pending review.`);
    }
    if (qa.checks?.reviewStatusesTrackedSeparatelyFromBuildStatus !== true) {
      failures.push(`${state.code} review statuses are not tracked separately from buildStatus.`);
    }
    // Missing overlays must be recorded as pending, NOT as a failure.
    if (qa.hasOfficialForms === true) {
      overlayPendingCount += 1;
      if (!String(qa.overlay).startsWith("pending") || qa.pass !== true) {
        failures.push(`${state.code} has official forms but overlay-pending is not recorded as pending-not-failure.`);
      }
    }
  }
}

// Confirm visual-review-notes record overlay/sample/field-map as pending where applicable.
for (const state of expected) {
  const visualPath = path.join(REVIEW_INBOX_DIR, state.slug, "visual-review-notes.md");
  if (fs.existsSync(visualPath)) {
    const text = fs.readFileSync(visualPath, "utf8");
    if (!/PENDING|N\/A/.test(text)) {
      failures.push(`${state.code} visual-review-notes.md does not record pending/N-A overlay state.`);
    }
  }
}

const changed = changedFilesFromGit();
for (const file of changed) {
  if (FORBIDDEN_CHANGED_PREFIXES.some((prefix) => file.startsWith(prefix))) {
    failures.push(`Forbidden changed file (legacy/Expungement.ai): ${file}`);
  }
}

if (failures.length > 0) {
  console.error("All-50 review-inbox verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("All-50 review-inbox verification passed.");
console.log(`Review folders verified: ${expected.length}`);
console.log(`Required files per folder: ${REQUIRED_FILES.length}`);
console.log(`Jurisdictions with official PDFs (overlay pending, not failure): ${overlayPendingCount}`);
console.log("Legacy live generator files unchanged: yes");
console.log("Expungement.ai UI untouched: yes");
