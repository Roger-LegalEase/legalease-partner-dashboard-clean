import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const sourceDirectory = path.join(rootDir, "tmp/record-clearing-shadow/pennsylvania");
const reviewDirectory = path.join(rootDir, "tmp/review/pennsylvania");

const sourcePleadingPath = path.join(sourceDirectory, "pennsylvania-expungement-pleading-sample.txt");
const sourceAuditPath = path.join(sourceDirectory, "pennsylvania-pleading-audit.json");
const exportedPleadingPath = path.join(reviewDirectory, "pennsylvania-expungement-pleading-LATEST.txt");
const exportedAuditPath = path.join(reviewDirectory, "pennsylvania-pleading-audit-LATEST.json");
const readmePath = path.join(reviewDirectory, "README.txt");

ensureFileExists(sourcePleadingPath, "Pennsylvania pleading sample");
ensureFileExists(sourceAuditPath, "Pennsylvania pleading audit");

fs.mkdirSync(reviewDirectory, { recursive: true });
fs.copyFileSync(sourcePleadingPath, exportedPleadingPath);
fs.copyFileSync(sourceAuditPath, exportedAuditPath);
fs.writeFileSync(readmePath, buildReadme());

console.log("Pennsylvania pleading review export complete.");
console.log("Lifecycle: replacement_candidate");
console.log("Not live: yes");
console.log("Verified replacement: no");
console.log(`Exported audit: ${path.relative(rootDir, exportedAuditPath)}`);
console.log("");
console.log("REVIEW THIS FILE:");
console.log(path.relative(rootDir, exportedPleadingPath));

function ensureFileExists(filePath, label) {
  if (fs.existsSync(filePath)) return;

  console.error(`Missing ${label}: ${path.relative(rootDir, filePath)}`);
  process.exit(1);
}

function buildReadme() {
  return [
    "- shadow review artifact",
    "- PA lifecycle is replacement_candidate",
    "- not verified_replacement",
    "- not live",
    "- counsel flags remain",
    "- file to review is pennsylvania-expungement-pleading-LATEST.txt",
    ""
  ].join("\n");
}
