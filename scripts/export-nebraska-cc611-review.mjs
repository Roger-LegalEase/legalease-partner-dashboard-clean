import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const sourceDirectory = path.join(rootDir, "tmp/record-clearing-shadow/nebraska");
const reviewDirectory = path.join(rootDir, "tmp/review/nebraska");

const sourcePdfPath = path.join(sourceDirectory, "NE-CC-6-11-field-map-review.pdf");
const sourceJsonPath = path.join(sourceDirectory, "NE-CC-6-11-field-map-review.json");
const exportedPdfPath = path.join(reviewDirectory, "NE-CC-6-11-field-map-review-LATEST.pdf");
const exportedJsonPath = path.join(reviewDirectory, "NE-CC-6-11-field-map-review-LATEST.json");
const readmePath = path.join(reviewDirectory, "README.txt");

ensureFileExists(sourcePdfPath, "Nebraska CC 6:11 review PDF");
ensureFileExists(sourceJsonPath, "Nebraska CC 6:11 review JSON");

const reviewManifest = JSON.parse(fs.readFileSync(sourceJsonPath, "utf8"));
if (reviewManifest.status !== "visual_review_required") {
  console.error(`Expected review JSON status visual_review_required, found ${JSON.stringify(reviewManifest.status)}.`);
  process.exit(1);
}

fs.mkdirSync(reviewDirectory, { recursive: true });
fs.copyFileSync(sourcePdfPath, exportedPdfPath);
fs.copyFileSync(sourceJsonPath, exportedJsonPath);
fs.writeFileSync(readmePath, buildReadme());

console.log("Nebraska CC 6:11 review export complete.");
console.log("Status: visual_review_required");
console.log("Not live: yes");
console.log("Verified replacement: no");
console.log(`Exported JSON: ${path.relative(rootDir, exportedJsonPath)}`);
console.log("");
console.log("UPLOAD THIS FILE:");
console.log(path.relative(rootDir, exportedPdfPath));

function ensureFileExists(filePath, label) {
  if (fs.existsSync(filePath)) return;

  console.error(`Missing ${label}: ${path.relative(rootDir, filePath)}`);
  process.exit(1);
}

function buildReadme() {
  return [
    "Nebraska CC 6:11 shadow review artifact",
    "",
    "This is a shadow review artifact.",
    "Status remains visual_review_required.",
    "Not live.",
    "Not verified_replacement.",
    "",
    "File to upload/review:",
    "tmp/review/nebraska/NE-CC-6-11-field-map-review-LATEST.pdf",
    ""
  ].join("\n");
}
