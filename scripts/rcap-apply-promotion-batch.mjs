import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = process.env.RCAP_PROMOTION_MANIFEST_PATH
  ? path.resolve(rootDir, process.env.RCAP_PROMOTION_MANIFEST_PATH)
  : path.join(rootDir, "src/lib/rcap/state-promotion-manifest.ts");
const args = parseArgs(process.argv.slice(2));
const gateNames = ["qaReview", "attorneyReview", "sourceFreshnessReview", "visualReview"];
const validGateStatuses = new Set(["pending", "passed", "failed"]);
const validVisualStatuses = new Set(["pending", "passed", "failed", "not_required"]);
const validChannels = new Set(["internalPreview", "partnerRcap", "expungementAi"]);

main();

function main() {
  if (!args.file) fail("Missing --file.");
  if (args.dryRun === args.apply) fail("Specify exactly one of --dry-run or --apply.");

  const batch = readJson(path.resolve(rootDir, args.file));
  validateBatch(batch);

  const manifestSource = fs.readFileSync(manifestPath, "utf8");
  const records = readManifestRecords(manifestSource);
  const report = buildReport(batch, records);

  printReport(report, args.dryRun);

  if (args.dryRun) return;

  if (report.refused.length > 0) {
    fail(`Batch refused ${report.refused.length} state(s); manifest was not updated.`);
  }

  const nextSource = writeManifestRecords(manifestSource, records);
  fs.writeFileSync(manifestPath, nextSource);
  console.log(`Applied promotion batch ${batch.batchName}.`);
}

function buildReport(batch, records) {
  const report = {
    batchName: batch.batchName,
    reviewer: batch.reviewer,
    reviewDate: batch.reviewDate,
    channel: batch.channel,
    applied: [],
    refused: [],
    safety: {
      batchApprovalIsNotLaunch: true,
      liveEnabledChanged: false,
      publicRoutingChanged: false,
      all51LaunchRequiredSeparately: true
    }
  };

  for (const stateInput of batch.states) {
    const record = findRecord(records, stateInput.state);
    if (!record) {
      report.refused.push({ state: stateInput.state, reasons: ["Unknown state."] });
      continue;
    }

    const before = structuredClone(record);
    const reasons = refusalReasons(record, stateInput);
    if (reasons.length > 0) {
      report.refused.push({ state: record.abbreviation, reasons });
      continue;
    }

    for (const gate of gateNames) {
      if (stateInput[gate]) record[gate] = stateInput[gate];
    }

    if (batch.channel === "partnerRcap") record.approvedChannels.partnerRcap = true;
    if (batch.channel === "expungementAi") record.approvedChannels.expungementAi = true;
    if (batch.channel === "internalPreview") record.approvedChannels.internalPreview = true;

    if (canApproveForLive(record).eligible) {
      record.promotionStatus = "approved_for_live";
      record.approvedForLive = true;
      record.approvedAt = batch.reviewDate || new Date().toISOString();
      record.approvedBy = batch.reviewer;
    } else {
      record.promotionStatus = "review_in_progress";
      record.approvedForLive = false;
      record.approvedAt = null;
      record.approvedBy = null;
    }

    record.liveEnabled = false;
    record.reviewerNotes = unique([
      ...record.reviewerNotes,
      ...stateInput.notes.map((note) => `${batch.reviewDate || new Date().toISOString()} ${batch.reviewer}: ${note}`),
      `${batch.reviewDate || new Date().toISOString()} ${batch.reviewer}: batch ${batch.batchName} applied for ${batch.channel}; batch approval is not launch.`
    ]);

    const after = structuredClone(record);
    report.applied.push({ state: record.abbreviation, before, after });
  }

  report.safety.liveEnabledChanged = report.applied.some((entry) => entry.before.liveEnabled !== entry.after.liveEnabled);
  return report;
}

function refusalReasons(record, stateInput) {
  const reasons = [];

  if (record.blockers.length > 0) reasons.push(`Blockers must be cleared first: ${record.blockers.join(", ")}.`);

  for (const gate of gateNames) {
    const value = stateInput[gate];
    if (!value) reasons.push(`${gate} is required in batch input.`);
    const allowed = gate === "visualReview" ? validVisualStatuses : validGateStatuses;
    if (value && !allowed.has(value)) reasons.push(`${gate} has unsupported status: ${value}.`);
  }

  const proposed = { ...record };
  for (const gate of gateNames) {
    if (stateInput[gate]) proposed[gate] = stateInput[gate];
  }

  const approval = canApproveForLive(proposed);
  if (!approval.eligible) reasons.push(...approval.reasons);
  return unique(reasons);
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

function validateBatch(batch) {
  if (!batch || typeof batch !== "object") fail("Batch file must contain an object.");
  if (!batch.batchName) fail("Batch missing batchName.");
  if (!batch.reviewer && args.apply) fail("Batch missing reviewer.");
  if (!batch.reviewDate && args.apply) fail("Batch missing reviewDate.");
  if (!validChannels.has(batch.channel)) fail(`Unsupported channel: ${batch.channel}`);
  if (!Array.isArray(batch.states) || batch.states.length === 0) fail("Batch must include at least one state.");
  for (const state of batch.states) {
    if (!state.state) fail("Batch state entry missing state.");
    if (!Array.isArray(state.notes)) fail(`${state.state} notes must be an array.`);
  }
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

function findRecord(records, state) {
  const normalized = state.toLowerCase();
  return records.find((record) =>
    record.slug === normalized || record.abbreviation.toLowerCase() === normalized || record.jurisdiction.toLowerCase() === normalized
  );
}

function parseArgs(rawArgs) {
  const parsed = { dryRun: false, apply: false };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--file") parsed.file = rawArgs[++index];
    else if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--apply") parsed.apply = true;
    else fail(`Unsupported argument: ${arg}`);
  }
  return parsed;
}

function printReport(report, dryRun) {
  console.log(dryRun ? "RCAP promotion batch dry run." : "RCAP promotion batch apply report.");
  console.log(JSON.stringify(report, null, 2));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function unique(items) {
  return [...new Set(items)];
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
