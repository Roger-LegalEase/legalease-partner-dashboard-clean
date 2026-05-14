import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const strict = process.argv.includes("--strict");
const failures = [];
const warnings = [];

const requiredFiles = [
  "docs/WILMA_STAGING_REHEARSAL.md",
  "docs/WILMA_GO_NO_GO.md",
  "docs/WILMA_LAUNCH_CHECKLIST.md",
  "docs/WILMA_STATE_QA.md",
  "docs/WILMA_SUPPORT_AND_REFUNDS.md",
  "docs/WILMA_KNOWN_LIMITATIONS.md",
  "scripts/wilma-launch-readiness.mjs",
  "scripts/wilma-smoke-test.mjs"
];

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    failures.push(`Missing required rehearsal artifact: ${relativePath}`);
  }
}

if (strict && !process.env.STAGING_BASE_URL) {
  failures.push("STAGING_BASE_URL is required in --strict mode.");
}

if (strict && !process.env.STAGING_ADMIN_EMAIL) {
  failures.push("STAGING_ADMIN_EMAIL is required in --strict mode.");
}

if (!process.env.STAGING_BASE_URL) {
  warnings.push("STAGING_BASE_URL is not set; using checklist-only rehearsal output.");
}

const steps = [
  "Wilma widget loads on the staging LegalEase page.",
  "Supported states show IL, PA, MD, DC, MS, and TX.",
  "Unsupported state path is blocked safely.",
  "Clean eligible path reaches email gate.",
  "Email capture creates or updates a lead.",
  "Paid CTA appears only after email capture.",
  "Checkout opens with the $50 wilma_document_prep product.",
  "Fake/browser payment-success POST is rejected.",
  "Verified test webhook creates exactly one order.",
  "Duplicate webhook replay does not duplicate documents or tracker.",
  "Document-generation handoff receives structured facts.",
  "Tracker/workspace handoff is created.",
  "Admin session list shows the session.",
  "Admin detail shows transcript, facts, decision, risk flags, events, order, and fulfillment.",
  "Abuse controls block message cap, session expiration, and rate-limit paths safely.",
  "Readiness script passes in staging or clearly identifies missing configuration."
];

console.log("Wilma staging rehearsal");
console.log("=======================");
console.log("");
console.log(`Mode: ${strict ? "strict" : "checklist"}`);
if (process.env.STAGING_BASE_URL) {
  console.log(`Staging base URL: ${process.env.STAGING_BASE_URL}`);
}
console.log("");
console.log("Rehearsal steps:");
for (const [index, step] of steps.entries()) {
  console.log(`${index + 1}. ${step}`);
}
console.log("");
console.log("Companion commands:");
console.log("- npm run wilma:readiness");
console.log("- npm run wilma:smoke");
console.log("- npm run typecheck");
console.log("- npm test");
console.log("- npm run lint");

if (warnings.length) {
  console.log("");
  console.log("Warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (failures.length) {
  console.error("");
  console.error("Wilma staging rehearsal gate failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}
