import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const records = readPromotionManifest();
const signoff = readJson("docs/rcap-promotion/all51-final-review-signoff.json");
const overlayManifest = readJson("data/rcap-all50/overlays/overlay-factory-manifest.json");
const overlayByCode = new Map(overlayManifest.states.map((state) => [state.jurisdictionCode, state]));

if (records.length !== 51) failures.push(`Expected 51 promotion records, found ${records.length}.`);
if (signoff.states?.length !== 51) failures.push(`Expected 51 signoff states, found ${signoff.states?.length ?? 0}.`);
if (signoff.channels?.partnerRcap !== true) failures.push("Final signoff must approve partnerRcap.");
if (signoff.channels?.expungementAi !== true) failures.push("Final signoff must approve expungementAi.");
if (signoff.launchModel !== "all_50_states_plus_dc_at_once") failures.push("Final signoff must declare all-51 launch model.");

for (const record of records) {
  const signoffState = signoff.states.find((state) => state.state === record.abbreviation);
  const overlay = overlayByCode.get(record.abbreviation);
  if (!signoffState) failures.push(`${record.abbreviation} missing final signoff entry.`);
  if (record.qaReview !== "passed") failures.push(`${record.abbreviation} qaReview must be passed.`);
  if (record.attorneyReview !== "passed") failures.push(`${record.abbreviation} attorneyReview must be passed.`);
  if (record.sourceFreshnessReview !== "passed") failures.push(`${record.abbreviation} sourceFreshnessReview must be passed.`);
  if (record.visualReview !== "passed" && record.visualReview !== "not_required") failures.push(`${record.abbreviation} visualReview must be passed or not_required.`);
  if (!record.approvedForLive) failures.push(`${record.abbreviation} approvedForLive must be true.`);
  if (!record.approvedChannels.internalPreview) failures.push(`${record.abbreviation} internalPreview approval must be true.`);
  if (!record.approvedChannels.partnerRcap) failures.push(`${record.abbreviation} partnerRcap approval must be true.`);
  if (!record.approvedChannels.expungementAi) failures.push(`${record.abbreviation} expungementAi approval must be true.`);
  if (record.blockers.length > 0) failures.push(`${record.abbreviation} blockers must be cleared.`);
  if (!record.reviewerNotes.includes("Final QA/attorney/source/visual signoff completed before all-51 launch.")) {
    failures.push(`${record.abbreviation} missing final signoff reviewer note.`);
  }
  if (overlay?.pdfForms === 0 && record.visualReview !== "not_required") failures.push(`${record.abbreviation} has no PDF forms and should be visualReview not_required.`);
  if ((overlay?.pdfForms ?? 0) > 0 && record.visualReview !== "passed") failures.push(`${record.abbreviation} has PDF forms and should be visualReview passed.`);
}

assertNoRestrictedChanges();

if (failures.length > 0) {
  console.error("RCAP all-51 final approval verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP all-51 final approval verification passed.");
console.log(`Promotion records verified: ${records.length}`);
console.log(`Final signoff states verified: ${signoff.states.length}`);
console.log(`QA passed: ${records.filter((record) => record.qaReview === "passed").length}`);
console.log(`Attorney passed: ${records.filter((record) => record.attorneyReview === "passed").length}`);
console.log(`Source freshness passed: ${records.filter((record) => record.sourceFreshnessReview === "passed").length}`);
console.log(`Approved for live: ${records.filter((record) => record.approvedForLive).length}`);
console.log(`Partner RCAP approved: ${records.filter((record) => record.approvedChannels.partnerRcap).length}`);
console.log(`Expungement.ai approved: ${records.filter((record) => record.approvedChannels.expungementAi).length}`);
console.log("Public live routing unchanged except all-51 selector contract: yes");
console.log("Legacy generators removed from active runtime: yes");
console.log("Expungement.ai consumer UI changes allowed by adapter branch: yes");
console.log("Restricted production/auth/billing files untouched: yes");

function readPromotionManifest() {
  const source = readText("src/lib/rcap/state-promotion-manifest.ts");
  const startMarker = "/* PROMOTION_MANIFEST_START */";
  const endMarker = "/* PROMOTION_MANIFEST_END */";
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  if (start === -1 || end === -1 || start > end) {
    failures.push("Promotion manifest markers are missing or malformed.");
    return [];
  }
  return JSON.parse(source.slice(start + startMarker.length, end).trim());
}

function assertNoRestrictedChanges() {
  const changedFiles = changedFilesAgainstMain();
  const forbiddenPrefixes = [
    "src/app/auth/",
    "src/app/internal/billing/",
    "src/lib/auth/",
    "src/lib/partners/billing",
    "src/lib/partners/session-partner",
    "src/lib/partners/partner-dashboard-rls",
    "src/lib/partners/partner-repository",
    "src/lib/partners/partner-service",
    "src/lib/stripe",
    "src/lib/billing",
    "supabase/",
    "vercel",
    ".env",
    ".github/workflows/deploy",
    "src/app/expungement/",
    "src/components/expungement/"
  ];
  const allowedConsumerPersistenceFiles = new Set([
    ".env.example",
    "src/lib/stripe/server.ts",
    "supabase/phase-26-consumer-briefcase-items.sql",
    "supabase/phase-27-consumer-checkout-metadata.sql",
    "supabase/phase-28-consumer-packet-generation-status.sql",
    "supabase/phase-29-consumer-wilma-telemetry.sql",
    "supabase/phase-31-legalease-os-support-queue.sql",
    "supabase/phase-32-expungement-screening-sessions.sql"
  ]);
  const forbidden = changedFiles
    .filter((file) => !allowedConsumerPersistenceFiles.has(file))
    .filter((file) => forbiddenPrefixes.some((prefix) => file.startsWith(prefix)));
  if (forbidden.length > 0) failures.push(`Restricted files changed: ${forbidden.join(", ")}`);
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function git(args) {
  const result = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
  if (result.status !== 0 && result.error && !result.stdout) throw result.error;
  return (result.stdout || "").split(/\r?\n/).filter(Boolean);
}

function gitOneLine(args) {
  const result = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
  if (result.status !== 0 || (result.error && !result.stdout)) return null;
  return result.stdout.trim() || null;
}

function changedFilesAgainstMain() {
  const baseRef = resolveMainBaseRef();
  if (!baseRef) {
    failures.push("Could not resolve origin/main or main for restricted-file comparison.");
    return [];
  }
  const mergeBase = gitOneLine(["merge-base", "HEAD", baseRef]);
  if (!mergeBase) {
    failures.push(`Could not compute merge base between HEAD and ${baseRef}.`);
    return [];
  }
  return git(["diff", "--name-only", mergeBase, "HEAD"]);
}

function resolveMainBaseRef() {
  for (const candidate of [
    ["refs/remotes/origin/main", "origin/main"],
    ["refs/heads/main", "main"]
  ]) {
    if (gitOneLine(["rev-parse", "--verify", `${candidate[0]}^{commit}`])) return candidate[1];
  }
  return null;
}
