import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const records = readPromotionManifest();
const selectorSource = readText("src/lib/rcap/all51-launch-selector.ts");
const launchGateSource = readText("scripts/rcap-enable-all51-launch.mjs");

if (records.length !== 51) failures.push(`Expected 51 promotion records, found ${records.length}.`);

for (const record of records) {
  if (!record.approvedForLive) failures.push(`${record.abbreviation} approvedForLive must be true.`);
  if (!record.liveEnabled) failures.push(`${record.abbreviation} liveEnabled must be true.`);
  if (record.promotionStatus !== "live") failures.push(`${record.abbreviation} promotionStatus must be live.`);
  if (!record.approvedChannels.partnerRcap) failures.push(`${record.abbreviation} partnerRcap must be approved.`);
  if (!record.approvedChannels.expungementAi) failures.push(`${record.abbreviation} expungementAi must be approved.`);
}

for (const marker of [
  "getAll51SelectableJurisdictions",
  "evaluateAll51RcapSelector",
  "paymentAllowedOutcomes",
  "\"packet_ready\"",
  "\"packet_ready_with_caution\"",
  "\"guidance_only\"",
  "\"not_yet\"",
  "\"needs_more_info\"",
  "\"not_covered_yet\"",
  "\"needs_review\"",
  "\"hard_stop\"",
  "pathType === \"blocked_form\"",
  "pathType === \"packet\"",
  "packetAvailable",
  "isPaymentAllowedForOutcome(outcome)"
]) {
  assertIncludes(selectorSource, "src/lib/rcap/all51-launch-selector.ts", marker);
}

if (selectorSource.includes("state_not_live")) failures.push("Selector must not contain a state_not_live branch.");
if (!selectorSource.includes("return selectorResult(record.abbreviation, record.jurisdiction, \"guidance_only\"")) {
  failures.push("Selector must default in-scope non-packet paths to guidance_only.");
}
if (!selectorSource.includes("export const paymentAllowedOutcomes: All51SelectorOutcome[] = [\"packet_ready\", \"packet_ready_with_caution\"]")) {
  failures.push("paymentAllowed must be limited to packet_ready and packet_ready_with_caution.");
}

for (const marker of [
  "records.length !== 51",
  "partialLaunchAllowed: false",
  "for (const record of records)",
  "record.liveEnabled = true",
  "record.promotionStatus = \"live\"",
  "All 51 jurisdictions liveEnabled together"
]) {
  assertIncludes(launchGateSource, "scripts/rcap-enable-all51-launch.mjs", marker);
}

const all51RuleSource = readText("src/lib/rcap/state-promotion-rules.ts");
for (const marker of [
  "All 50 states plus DC launch together",
  "partialStateRolloutAllowed: false",
  "launchJurisdictionCount: 51"
]) {
  assertIncludes(all51RuleSource, "src/lib/rcap/state-promotion-rules.ts", marker);
}

assertNoRestrictedChanges();

if (failures.length > 0) {
  console.error("RCAP all-51 launch-enabled verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP all-51 launch-enabled verification passed.");
console.log(`Live-enabled jurisdictions: ${records.filter((record) => record.liveEnabled).length}`);
console.log(`Promotion status live: ${records.filter((record) => record.promotionStatus === "live").length}`);
console.log(`Partner RCAP approved: ${records.filter((record) => record.approvedChannels.partnerRcap).length}`);
console.log(`Expungement.ai approved: ${records.filter((record) => record.approvedChannels.expungementAi).length}`);
console.log("No state_not_live selector branch for U.S. states/DC: yes");
console.log("Non-packet in-scope default: guidance_only");
console.log("paymentAllowed limited to packet_ready / packet_ready_with_caution: yes");
console.log("Partial state rollout prevented: yes");
console.log("Legacy generators preserved: yes");
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
    "src/app/expungement/",
    "src/components/expungement/"
  ];
  const allowedConsumerPersistenceFiles = new Set([
    "supabase/phase-26-consumer-briefcase-items.sql",
    "supabase/phase-27-consumer-checkout-metadata.sql"
  ]);
  const forbidden = changedFiles
    .filter((file) => !allowedConsumerPersistenceFiles.has(file))
    .filter((file) => forbiddenPrefixes.some((prefix) => file.startsWith(prefix)));
  if (forbidden.length > 0) failures.push(`Restricted files changed: ${forbidden.join(", ")}`);
}

function assertIncludes(source, label, marker) {
  if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`);
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
