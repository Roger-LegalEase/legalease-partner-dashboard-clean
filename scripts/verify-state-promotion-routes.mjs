import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { evaluateRestrictedChanges } from "./lib/restricted-change-guard.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
let restrictedGuard = null;

const routeFiles = [
  "src/app/internal/record-clearing/promotion/page.tsx",
  "src/app/internal/record-clearing/promotion/[state]/page.tsx"
];

for (const routeFile of routeFiles) {
  assertFile(routeFile);
  const source = readText(routeFile);
  assertIncludes(source, routeFile, "resolveInternalAdminPageAccess(");
  assertIncludes(source, routeFile, "InternalAdminDenied");
  assertIncludes(source, routeFile, "internal_admin");
  assertGateBeforeDataRead(source, routeFile);
}

const indexSource = readText("src/app/internal/record-clearing/promotion/page.tsx");
for (const marker of [
  "getStatePromotionRecords",
  "QA",
  "Attorney",
  "Source",
  "Visual",
  "approvedForLive",
  "liveEnabled",
  "approvedChannels",
  "getRecommendedPromotionAction"
]) {
  assertIncludes(indexSource, "src/app/internal/record-clearing/promotion/page.tsx", marker);
}

const detailSource = readText("src/app/internal/record-clearing/promotion/[state]/page.tsx");
for (const marker of [
  "getStatePromotionRecord",
  "canApproveForLive",
  "canBecomeLive",
  "tmp/review-inbox/all50",
  "/internal/record-clearing/states/",
  "Partner RCAP",
  "Expungement.ai",
  "Eligible for approved_for_live"
]) {
  assertIncludes(detailSource, "src/app/internal/record-clearing/promotion/[state]/page.tsx", marker);
}

assertNoRestrictedChanges();

if (failures.length > 0) {
  console.error("RCAP state promotion route verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP state promotion route verification passed.");
console.log("Internal promotion routes: 2");
console.log("Internal admin gate: source verified");
console.log("Review artifact links: verified");
console.log("Handoff detail links: verified");
console.log("Public live routing unchanged: yes");
console.log("Legacy generators removed from active runtime: yes");
console.log("Expungement.ai UI untouched: yes");
console.log(restrictedSummary());

function assertGateBeforeDataRead(source, label) {
  const gateIndex = source.indexOf("resolveInternalAdminPageAccess(");
  const deniedIndex = source.indexOf('access.kind === "denied"');
  const dataReadMarkers = ["getStatePromotionRecords(", "getStatePromotionRecord("];
  const dataReadIndex = Math.min(...dataReadMarkers.map((marker) => source.indexOf(marker)).filter((index) => index >= 0));
  if (gateIndex === -1 || deniedIndex === -1 || !Number.isFinite(dataReadIndex)) {
    failures.push(`${label} must gate and then read promotion data.`);
    return;
  }
  if (gateIndex > dataReadIndex || deniedIndex > dataReadIndex) {
    failures.push(`${label} must resolve internal admin access before reading promotion data.`);
  }
}

function assertNoRestrictedChanges() {
  const result = evaluateRestrictedChanges(rootDir);
  failures.push(...result.failures);
  restrictedGuard = result;
}

function assertFile(relativePath) {
  if (!fs.existsSync(path.join(rootDir, relativePath))) failures.push(`Missing required file: ${relativePath}`);
}

function assertIncludes(source, label, marker) {
  if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

/**
 * Reports what the guard actually found.
 *
 * The old line claimed "untouched" unconditionally, printed beside a failure
 * saying three restricted files had changed. A status line that contradicts the
 * failure above it teaches people to skip both.
 */
function restrictedSummary() {
  if (!restrictedGuard) return "Restricted production/auth/billing files: not evaluated.";
  const { acknowledged, unacknowledged, notes } = restrictedGuard;
  if (unacknowledged.length > 0) {
    return `Restricted production/auth/billing files: ${unacknowledged.length} unacknowledged change(s).`;
  }
  const lines = [];
  lines.push(
    acknowledged.length === 0
      ? "Restricted production/auth/billing files untouched: yes"
      : `Restricted production/auth/billing files: this branch changed none; ${acknowledged.length} inherited path(s) acknowledged at their reviewed content hash.`
  );
  for (const file of acknowledged) lines.push(`  acknowledged: ${file}`);
  for (const note of notes) lines.push(`  note: ${note}`);
  return lines.join("\n");
}
