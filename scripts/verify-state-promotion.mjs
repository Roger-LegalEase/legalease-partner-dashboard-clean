import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const legacyLiveStates = new Set(["MS", "IL", "DC", "PA", "TX"]);

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

assertNoRestrictedChanges();

if (failures.length > 0) {
  console.error("RCAP state promotion verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP state promotion verification passed.");
console.log(`Promotion records verified: ${records.length}`);
console.log(`Approved for live: ${records.filter((record) => record.promotionStatus === "approved_for_live").length}`);
console.log(`Live states in promotion manifest: ${records.filter((record) => record.promotionStatus === "live").length}`);
console.log(`Internal preview channel enabled: ${records.filter((record) => record.approvedChannels.internalPreview).length}`);
console.log(`Legacy live preserved markers: ${records.filter((record) => record.blockers.includes("legacy_live_preserved")).length}`);
console.log("Public live routing unchanged: yes");
console.log("Legacy generators preserved: yes");
console.log("Expungement.ai UI untouched: yes");
console.log("Restricted production/auth/billing files untouched: yes");

function verifyRecord(record) {
  if (record.buildStatus !== "state_built") failures.push(`${record.abbreviation} buildStatus must remain state_built.`);
  if (!record.approvedChannels?.internalPreview) failures.push(`${record.abbreviation} internalPreview channel must be true.`);
  if (record.approvedChannels?.expungementAi !== false) failures.push(`${record.abbreviation} expungementAi channel must be false initially.`);

  const isLegacy = legacyLiveStates.has(record.abbreviation);
  if (isLegacy) {
    if (!record.approvedChannels.partnerRcap) failures.push(`${record.abbreviation} legacy partnerRcap channel should preserve existing live status.`);
    if (!record.blockers.includes("legacy_live_preserved")) failures.push(`${record.abbreviation} missing legacy_live_preserved marker.`);
  } else if (record.approvedChannels.partnerRcap) {
    failures.push(`${record.abbreviation} partnerRcap must remain false until promotion approval.`);
  }

  if (record.approvedChannels.partnerRcap === undefined || record.approvedChannels.expungementAi === undefined) {
    failures.push(`${record.abbreviation} must track partnerRcap and expungementAi as separate approval fields.`);
  }

  const eligibleForApproval = canApproveForLive(record);
  if ((record.promotionStatus === "approved_for_live" || record.approvedForLive) && !eligibleForApproval) {
    failures.push(`${record.abbreviation} is approved_for_live without all required gates passing.`);
  }

  const eligibleForLive = record.promotionStatus === "approved_for_live" && record.approvedForLive && record.liveEnabled;
  if (record.promotionStatus === "live" && !eligibleForLive) {
    failures.push(`${record.abbreviation} is live without approved_for_live and liveEnabled.`);
  }

  if (record.buildStatus === "state_built" && record.promotionStatus === "live") {
    failures.push(`${record.abbreviation} became live from state_built without promotion gates.`);
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
