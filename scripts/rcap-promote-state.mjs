import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(rootDir, "src/lib/rcap/state-promotion-manifest.ts");
const args = parseArgs(process.argv.slice(2));

const gateNames = new Set(["qaReview", "attorneyReview", "sourceFreshnessReview", "visualReview"]);
const gateStatuses = new Set(["passed", "failed", "pending"]);

main();

function main() {
  if (!args.state) fail("Missing --state.");
  if (!args.reviewer) fail("Missing --reviewer.");

  const source = fs.readFileSync(manifestPath, "utf8");
  const records = readManifestRecords(source);
  const record = findRecord(records, args.state);
  if (!record) fail(`Unknown state: ${args.state}`);

  const before = structuredClone(record);

  if (args.gate || args.status) {
    applyGateUpdate(record, args);
  }

  if (args.approveForLive) {
    applyApproveForLive(record, args.reviewer);
  }

  if (!args.gate && !args.approveForLive) {
    fail("Specify --gate with --status, or --approve-for-live.");
  }

  record.reviewerNotes = unique([
    ...record.reviewerNotes,
    `${new Date().toISOString()} ${args.reviewer}: ${describeChange(before, record)}`
  ]);

  if (args.dryRun) {
    console.log("RCAP promotion dry run.");
    console.log(JSON.stringify({ before, after: record }, null, 2));
    return;
  }

  const nextSource = writeManifestRecords(source, records);
  fs.writeFileSync(manifestPath, nextSource);
  console.log(`Updated ${record.abbreviation} promotion record.`);
}

function applyGateUpdate(record, parsedArgs) {
  if (!parsedArgs.gate) fail("Missing --gate.");
  if (!parsedArgs.status) fail("Missing --status.");
  if (!gateNames.has(parsedArgs.gate)) fail(`Unsupported gate: ${parsedArgs.gate}`);

  const allowedStatuses = parsedArgs.gate === "visualReview" ? new Set([...gateStatuses, "not_required"]) : gateStatuses;
  if (!allowedStatuses.has(parsedArgs.status)) fail(`Unsupported status ${parsedArgs.status} for ${parsedArgs.gate}.`);

  record[parsedArgs.gate] = parsedArgs.status;

  const failedBlocker = `${parsedArgs.gate}_failed`;
  if (parsedArgs.status === "failed") {
    record.blockers = unique([...record.blockers, failedBlocker]);
    record.promotionStatus = "blocked";
    return;
  }

  record.blockers = record.blockers.filter((blocker) => blocker !== failedBlocker);
  if (record.blockers.length === 0 && record.promotionStatus === "blocked") {
    record.promotionStatus = "review_in_progress";
  } else if (record.promotionStatus === "state_built") {
    record.promotionStatus = "review_in_progress";
  }
}

function applyApproveForLive(record, reviewer) {
  const eligibility = canApproveForLive(record);
  if (!eligibility.eligible) {
    fail(`Cannot approve ${record.abbreviation} for live: ${eligibility.reasons.join(" ")}`);
  }
  record.promotionStatus = "approved_for_live";
  record.approvedForLive = true;
  record.approvedAt = new Date().toISOString();
  record.approvedBy = reviewer;
}

function canApproveForLive(record) {
  const reasons = [];
  if (record.qaReview !== "passed") reasons.push("QA review must pass.");
  if (record.attorneyReview !== "passed") reasons.push("Attorney review must pass.");
  if (record.sourceFreshnessReview !== "passed") reasons.push("Source freshness review must pass.");
  if (record.visualReview !== "passed" && record.visualReview !== "not_required") {
    reasons.push("Visual review must pass or be marked not_required.");
  }
  if (record.blockers.length > 0) reasons.push("Blockers must be cleared.");
  return { eligible: reasons.length === 0, reasons };
}

function describeChange(before, after) {
  const changes = [];
  for (const key of ["qaReview", "attorneyReview", "sourceFreshnessReview", "visualReview", "promotionStatus", "approvedForLive"]) {
    if (before[key] !== after[key]) changes.push(`${key} ${before[key]} -> ${after[key]}`);
  }
  return changes.length > 0 ? changes.join("; ") : "no-op";
}

function readManifestRecords(source) {
  const start = source.indexOf("/* PROMOTION_MANIFEST_START */");
  const end = source.indexOf("/* PROMOTION_MANIFEST_END */");
  if (start === -1 || end === -1 || start > end) fail("Promotion manifest markers are missing or malformed.");
  const json = source.slice(start + "/* PROMOTION_MANIFEST_START */".length, end).trim();
  return JSON.parse(json);
}

function writeManifestRecords(source, records) {
  const startMarker = "/* PROMOTION_MANIFEST_START */";
  const endMarker = "/* PROMOTION_MANIFEST_END */";
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  const json = ` ${JSON.stringify(records, null, 2)} `;
  return `${source.slice(0, start + startMarker.length)}${json}${source.slice(end)}`;
}

function findRecord(records, state) {
  const normalized = state.toLowerCase();
  return records.find((record) =>
    record.slug === normalized || record.abbreviation.toLowerCase() === normalized || record.jurisdiction.toLowerCase() === normalized
  );
}

function parseArgs(rawArgs) {
  const parsed = { dryRun: false, approveForLive: false };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--approve-for-live") parsed.approveForLive = true;
    else if (arg === "--state") parsed.state = rawArgs[++index];
    else if (arg === "--gate") parsed.gate = rawArgs[++index];
    else if (arg === "--status") parsed.status = rawArgs[++index];
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
