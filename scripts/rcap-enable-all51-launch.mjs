import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = process.env.RCAP_PROMOTION_MANIFEST_PATH
  ? path.resolve(rootDir, process.env.RCAP_PROMOTION_MANIFEST_PATH)
  : path.join(rootDir, "src/lib/rcap/state-promotion-manifest.ts");
const args = parseArgs(process.argv.slice(2));

main();

function main() {
  if (args.dryRun === args.apply) fail("Specify exactly one of --dry-run or --apply.");
  if (args.apply && !args.reviewer) fail("Missing --reviewer for --apply.");

  const source = fs.readFileSync(manifestPath, "utf8");
  const records = readManifestRecords(source);
  const report = buildReport(records, args.reviewer ?? "dry-run");

  console.log(args.dryRun ? "RCAP all-51 launch dry run." : "RCAP all-51 launch apply report.");
  console.log(JSON.stringify(report, null, 2));

  if (!report.eligible) fail("All-51 launch gate refused launch.");
  if (args.dryRun) return;

  const launchedAt = new Date().toISOString();
  for (const record of records) {
    record.liveEnabled = true;
    record.promotionStatus = "live";
    record.reviewerNotes = unique([
      ...record.reviewerNotes,
      `${launchedAt} ${args.reviewer}: all-51 launch gate enabled; no partial state rollout.`
    ]);
  }

  fs.writeFileSync(manifestPath, writeManifestRecords(source, records));
  console.log("All 51 jurisdictions liveEnabled together.");
}

function buildReport(records, reviewer) {
  const failures = [];
  if (records.length !== 51) failures.push(`Expected 51 jurisdictions, found ${records.length}.`);

  for (const record of records) {
    const stateFailures = launchFailures(record);
    if (stateFailures.length > 0) {
      failures.push(`${record.abbreviation}: ${stateFailures.join(" ")}`);
    }
  }

  return {
    reviewer,
    totalJurisdictions: records.length,
    approvedForLive: records.filter((record) => record.approvedForLive).length,
    partnerRcapApproved: records.filter((record) => record.approvedChannels.partnerRcap).length,
    expungementAiApproved: records.filter((record) => record.approvedChannels.expungementAi).length,
    currentlyLiveEnabled: records.filter((record) => record.liveEnabled).length,
    afterApplyLiveEnabled: failures.length === 0 ? 51 : records.filter((record) => record.liveEnabled).length,
    partialLaunchAllowed: false,
    eligible: failures.length === 0,
    failures
  };
}

function launchFailures(record) {
  const failures = [];
  if (!record.approvedForLive) failures.push("approvedForLive must be true.");
  if (record.qaReview !== "passed") failures.push("qaReview must be passed.");
  if (record.attorneyReview !== "passed") failures.push("attorneyReview must be passed.");
  if (record.sourceFreshnessReview !== "passed") failures.push("sourceFreshnessReview must be passed.");
  if (record.visualReview !== "passed" && record.visualReview !== "not_required") {
    failures.push("visualReview must be passed or not_required.");
  }
  if (!record.approvedChannels.partnerRcap) failures.push("partnerRcap must be approved.");
  if (!record.approvedChannels.expungementAi) failures.push("expungementAi must be approved.");
  if (record.blockers.length > 0) failures.push("blockers must be cleared.");
  return failures;
}

function readManifestRecords(source) {
  const startMarker = "/* PROMOTION_MANIFEST_START */";
  const endMarker = "/* PROMOTION_MANIFEST_END */";
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  if (start === -1 || end === -1 || start > end) fail("Promotion manifest markers are missing or malformed.");
  return JSON.parse(source.slice(start + startMarker.length, end).trim());
}

function writeManifestRecords(source, records) {
  const startMarker = "/* PROMOTION_MANIFEST_START */";
  const endMarker = "/* PROMOTION_MANIFEST_END */";
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  return `${source.slice(0, start + startMarker.length)} ${JSON.stringify(records, null, 2)} ${source.slice(end)}`;
}

function parseArgs(rawArgs) {
  const parsed = { dryRun: false, apply: false };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--apply") parsed.apply = true;
    else if (arg === "--reviewer") parsed.reviewer = rawArgs[++index];
    else fail(`Unsupported argument: ${arg}`);
  }
  return parsed;
}

function unique(items) {
  return [...new Set(items)];
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
