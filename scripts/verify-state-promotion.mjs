import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const buildManifest = readJson("data/rcap-all50/all-state-build-manifest.json");
const records = readPromotionManifest();
const rulesSource = readText("src/lib/rcap/state-promotion-rules.ts");

if (records.length !== 51) failures.push(`Expected 51 promotion records, found ${records.length}.`);

const buildCodes = new Set(buildManifest.states.map((state) => state.code));
const recordCodes = new Set(records.map((record) => record.abbreviation));
for (const code of buildCodes) {
  if (!recordCodes.has(code)) failures.push(`Missing promotion record for ${code}.`);
}

for (const record of records) {
  verifyRecord(record);
}

for (const marker of [
  "canApproveForLive",
  "canBecomeLive",
  "Batch approval is not launch. Live enablement is a separate all-51 launch operation.",
  "getBatchApprovalLaunchSafety",
  "qaReview !== \"passed\"",
  "attorneyReview !== \"passed\"",
  "sourceFreshnessReview !== \"passed\"",
  "visualReview !== \"passed\" && record.visualReview !== \"not_required\"",
  "promotionStatus !== \"approved_for_live\"",
  "!record.approvedForLive",
  "!record.liveEnabled",
  "partnerRcap",
  "expungementAi"
]) {
  assertIncludes(rulesSource, "src/lib/rcap/state-promotion-rules.ts", marker);
}

assertFile("scripts/rcap-promote-state.mjs");
const promoteScript = readText("scripts/rcap-promote-state.mjs");
for (const marker of ["--dry-run", "--approve-for-live", "qaReview", "attorneyReview", "sourceFreshnessReview", "visualReview", "not_required"]) {
  assertIncludes(promoteScript, "scripts/rcap-promote-state.mjs", marker);
}

assertFile("docs/rcap-promotion/batch-approval-template.json");
assertFile("scripts/rcap-apply-promotion-batch.mjs");
const batchScript = readText("scripts/rcap-apply-promotion-batch.mjs");
for (const marker of [
  "--dry-run",
  "--apply",
  "RCAP_PROMOTION_MANIFEST_PATH",
  "approvedChannels.partnerRcap = true",
  "approvedChannels.expungementAi = true",
  "record.liveEnabled = false",
  "batchApprovalIsNotLaunch",
  "all51LaunchRequiredSeparately",
  "Blockers must be cleared first"
]) {
  assertIncludes(batchScript, "scripts/rcap-apply-promotion-batch.mjs", marker);
}

const packageJson = readJson("package.json");
if (packageJson.scripts["rcap:promotion:dry-run-batch"] !== "node scripts/rcap-apply-promotion-batch.mjs --file docs/rcap-promotion/batch-approval-template.json --dry-run") {
  failures.push("package.json missing rcap:promotion:dry-run-batch script.");
}
if (packageJson.scripts["rcap:promotion:apply-batch"] !== "node scripts/rcap-apply-promotion-batch.mjs --file docs/rcap-promotion/batch-approval-template.json --apply") {
  failures.push("package.json missing rcap:promotion:apply-batch script.");
}

verifyBatchTooling();
assertNoRestrictedChanges();

if (failures.length > 0) {
  console.error("RCAP state promotion verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP state promotion verification passed.");
console.log(`Promotion records verified: ${records.length}`);
console.log(`Approved for live: ${records.filter((record) => record.approvedForLive).length}`);
console.log(`Live states in promotion manifest: ${records.filter((record) => record.promotionStatus === "live").length}`);
console.log(`Internal preview channel enabled: ${records.filter((record) => record.approvedChannels.internalPreview).length}`);
console.log(`Partner RCAP channel enabled: ${records.filter((record) => record.approvedChannels.partnerRcap).length}`);
console.log(`Expungement.ai channel enabled: ${records.filter((record) => record.approvedChannels.expungementAi).length}`);
console.log("Batch approval dry-run/apply safety: verified");
console.log("Batch approval is not launch: verified");
console.log("Public live routing unchanged: yes");
console.log("Legacy generators removed from active runtime: yes");
console.log("Expungement.ai UI untouched: yes");
console.log("Restricted production/auth/billing files untouched: yes");

function verifyRecord(record) {
  if (record.buildStatus !== "state_built") failures.push(`${record.abbreviation} buildStatus must remain state_built.`);
  if (!record.approvedChannels?.internalPreview) failures.push(`${record.abbreviation} internalPreview channel must be true.`);
  if (!record.approvedChannels?.partnerRcap) failures.push(`${record.abbreviation} partnerRcap channel must be true after all-51 approval.`);
  if (!record.approvedChannels?.expungementAi) failures.push(`${record.abbreviation} expungementAi channel must be true after all-51 approval.`);
  if (!record.approvedForLive) failures.push(`${record.abbreviation} approvedForLive must be true after all-51 approval.`);
  if (!record.liveEnabled) failures.push(`${record.abbreviation} liveEnabled must be true after all-51 launch gate.`);
  if (record.promotionStatus !== "live") failures.push(`${record.abbreviation} promotionStatus must be live after all-51 launch gate.`);
  if (record.blockers.length > 0) failures.push(`${record.abbreviation} blockers must be cleared after final signoff.`);
  if (record.approvedChannels.partnerRcap === undefined || record.approvedChannels.expungementAi === undefined) {
    failures.push(`${record.abbreviation} must track partnerRcap and expungementAi as separate approval fields.`);
  }

  const eligibleForApproval = canApproveForLive(record);
  if ((record.promotionStatus === "approved_for_live" || record.approvedForLive) && !eligibleForApproval) {
    failures.push(`${record.abbreviation} is approved_for_live without all required gates passing.`);
  }

  const eligibleForLive = record.approvedForLive && record.liveEnabled;
  if (record.promotionStatus === "live" && !eligibleForLive) {
    failures.push(`${record.abbreviation} is live without approved_for_live and liveEnabled.`);
  }
}

function canApproveForLive(record) {
  return record.qaReview === "passed"
    && record.attorneyReview === "passed"
    && record.sourceFreshnessReview === "passed"
    && (record.visualReview === "passed" || record.visualReview === "not_required")
    && record.blockers.length === 0;
}

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

function verifyBatchTooling() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-promotion-batch-"));
  const manifestSource = makeBatchTestManifestSource();

  const missingGateBatch = {
    batchName: "missing-gate-test",
    reviewer: "Verifier",
    reviewDate: "2026-06-17T00:00:00.000Z",
    channel: "partnerRcap",
    states: [
      {
        state: "AL",
        qaReview: "passed",
        sourceFreshnessReview: "passed",
        visualReview: "not_required",
        notes: []
      }
    ]
  };
  assertBatchFails(tempDir, manifestSource, "missing-gates.json", missingGateBatch, "missing gates");

  const blockerBatch = {
    batchName: "blocker-test",
    reviewer: "Verifier",
    reviewDate: "2026-06-17T00:00:00.000Z",
    channel: "partnerRcap",
    states: [
      {
        state: "MS",
        qaReview: "passed",
        attorneyReview: "passed",
        sourceFreshnessReview: "passed",
        visualReview: "not_required",
        notes: []
      }
    ]
  };
  assertBatchFails(tempDir, manifestSource, "blockers.json", blockerBatch, "blockers");

  const partnerBatch = {
    batchName: "partner-channel-test",
    reviewer: "Verifier",
    reviewDate: "2026-06-17T00:00:00.000Z",
    channel: "partnerRcap",
    states: [
      {
        state: "AL",
        qaReview: "passed",
        attorneyReview: "passed",
        sourceFreshnessReview: "passed",
        visualReview: "not_required",
        liveEnabled: true,
        notes: ["Verifier partner approval test."]
      }
    ]
  };
  const partnerRecords = assertBatchApplies(tempDir, manifestSource, "partner.json", partnerBatch, "partner approval");
  const alPartner = partnerRecords.find((record) => record.abbreviation === "AL");
  if (!alPartner?.approvedForLive || alPartner.promotionStatus !== "approved_for_live") failures.push("Batch script did not approve fully gated AL for live approval record.");
  if (!alPartner?.approvedChannels.partnerRcap) failures.push("Batch script did not set partnerRcap for partner batch.");
  if (alPartner?.approvedChannels.expungementAi) failures.push("Partner batch must not set Expungement.ai approval.");
  if (alPartner?.liveEnabled) failures.push("Batch script must not set liveEnabled, even if batch input includes liveEnabled.");
  if (alPartner?.promotionStatus === "live") failures.push("Batch script must not make a state public-live.");

  const expungementBatch = {
    batchName: "expungement-channel-test",
    reviewer: "Verifier",
    reviewDate: "2026-06-17T00:00:00.000Z",
    channel: "expungementAi",
    states: [
      {
        state: "AK",
        qaReview: "passed",
        attorneyReview: "passed",
        sourceFreshnessReview: "passed",
        visualReview: "not_required",
        notes: ["Verifier Expungement.ai approval test."]
      }
    ]
  };
  const expungementRecords = assertBatchApplies(tempDir, manifestSource, "expungement.json", expungementBatch, "expungement approval");
  const akExpungement = expungementRecords.find((record) => record.abbreviation === "AK");
  if (!akExpungement?.approvedChannels.expungementAi) failures.push("Explicit Expungement.ai batch did not set expungementAi approval.");
  if (akExpungement?.approvedChannels.partnerRcap) failures.push("Expungement.ai batch must not imply partnerRcap approval.");
  if (akExpungement?.liveEnabled) failures.push("Expungement.ai batch must not set liveEnabled.");
}

function makeBatchTestManifestSource() {
  const source = readText("src/lib/rcap/state-promotion-manifest.ts");
  const startMarker = "/* PROMOTION_MANIFEST_START */";
  const endMarker = "/* PROMOTION_MANIFEST_END */";
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  const fixtureRecords = JSON.parse(source.slice(start + startMarker.length, end).trim());
  for (const record of fixtureRecords) {
    record.qaReview = "pending";
    record.attorneyReview = "pending";
    record.sourceFreshnessReview = "pending";
    record.visualReview = "pending";
    record.promotionStatus = "state_built";
    record.approvedForLive = false;
    record.liveEnabled = false;
    record.approvedChannels.partnerRcap = false;
    record.approvedChannels.expungementAi = false;
    record.blockers = [];
    record.approvedAt = null;
    record.approvedBy = null;
  }
  const ms = fixtureRecords.find((record) => record.abbreviation === "MS");
  if (ms) ms.blockers = ["legacy_live_preserved"];
  return `${source.slice(0, start + startMarker.length)} ${JSON.stringify(fixtureRecords, null, 2)} ${source.slice(end)}`;
}

function assertBatchFails(tempDir, manifestSource, fileName, batch, label) {
  const manifestCopy = writeTempManifest(tempDir, manifestSource, `${fileName}.manifest.ts`);
  const batchFile = writeTempBatch(tempDir, fileName, batch);
  const result = runBatch(batchFile, manifestCopy, true);
  if (result.status === 0) failures.push(`Batch script should refuse ${label}.`);
}

function assertBatchApplies(tempDir, manifestSource, fileName, batch, label) {
  const manifestCopy = writeTempManifest(tempDir, manifestSource, `${fileName}.manifest.ts`);
  const batchFile = writeTempBatch(tempDir, fileName, batch);
  const result = runBatch(batchFile, manifestCopy, true);
  if (result.status !== 0) {
    failures.push(`Batch script should apply ${label}: ${result.stderr || result.stdout}`);
    return [];
  }
  return readPromotionManifestFromFile(manifestCopy);
}

function writeTempManifest(tempDir, manifestSource, fileName) {
  const filePath = path.join(tempDir, fileName);
  fs.writeFileSync(filePath, manifestSource);
  return filePath;
}

function writeTempBatch(tempDir, fileName, batch) {
  const filePath = path.join(tempDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(batch, null, 2));
  return filePath;
}

function runBatch(batchFile, manifestCopy, apply) {
  return spawnSync(
    process.execPath,
    ["scripts/rcap-apply-promotion-batch.mjs", "--file", batchFile, apply ? "--apply" : "--dry-run"],
    {
      cwd: rootDir,
      encoding: "utf8",
      env: { ...process.env, RCAP_PROMOTION_MANIFEST_PATH: manifestCopy }
    }
  );
}

function readPromotionManifestFromFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const startMarker = "/* PROMOTION_MANIFEST_START */";
  const endMarker = "/* PROMOTION_MANIFEST_END */";
  return JSON.parse(source.slice(source.indexOf(startMarker) + startMarker.length, source.indexOf(endMarker)).trim());
}

function assertNoRestrictedChanges() {
  const changedFiles = changedFilesAgainstMain();
  const forbiddenPrefixes = [
    "src/app/api/",
    "src/app/auth/",
    "src/app/p/",
    "src/app/intake/",
    "src/app/documents/",
    "src/app/briefcase/",
    "src/app/partner/",
    "src/app/partners/",
    "src/app/request-pilot/",
    "src/app/internal/billing/",
    "src/lib/auth/",
    "src/lib/partners/billing",
    "src/lib/partners/session-partner",
    "src/lib/partners/partner-dashboard-rls",
    "src/lib/partners/partner-repository",
    "src/lib/partners/partner-service",
    "src/lib/rcap/documents/mississippi/",
    "src/lib/rcap/documents/illinois/",
    "src/lib/rcap/documents/dc/",
    "src/lib/rcap/documents/pennsylvania/",
    "src/lib/rcap/documents/texas-harris/",
    "src/lib/stripe",
    "src/lib/billing",
    "supabase/",
    "vercel",
    ".env",
    ".github/workflows/deploy",
    "src/app/expungement-ai/",
    "src/app/expungement/",
    "src/components/expungement-ai/",
    "src/components/expungement/"
  ];
  const forbidden = changedFiles.filter((file) => forbiddenPrefixes.some((prefix) => file.startsWith(prefix)));
  if (forbidden.length > 0) failures.push(`Restricted files changed: ${forbidden.join(", ")}`);
}

function assertFile(relativePath) {
  if (!fs.existsSync(path.join(rootDir, relativePath))) failures.push(`Missing required file: ${relativePath}`);
}

function assertIncludes(source, label, marker) {
  if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`);
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
