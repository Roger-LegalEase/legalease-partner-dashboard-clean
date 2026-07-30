// Legal-design intake: validate, normalize and queue.
//
// Scans the intake directory for `<CODE>.memo.json`, validates each memo
// against the fifteen required fields, normalizes the implementable tracks into
// registry records, packet-set manifests, source relationships and per-strategy
// specifications, and writes the implementation queue.
//
// An invalid memo fails this script. That is the point: incomplete imports are
// rejected rather than partially applied, because a half-imported legal rule is
// worse than none.
//
// Importing enables nothing. Every normalized track is runtime_disabled.

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const { validateLegalDesignMemo } = await import("@/lib/rcap/legal-design/validate");
const { normalizeMemo, sourceRelationships } = await import("@/lib/rcap/legal-design/normalize");
const { ALL_JURISDICTION_CODES } = await import("@/lib/rcap/jurisdictions/packet-capability");

const root = process.cwd();
const INTAKE_DIR = path.join(root, "data/record-clearing/legal-design-intake");
const OUT_DIR = path.join(root, "data/record-clearing");

const strict = !process.argv.includes("--report-only");

fs.mkdirSync(INTAKE_DIR, { recursive: true });

const memoFiles = fs
  .readdirSync(INTAKE_DIR)
  .filter((name) => /^[A-Z]{2}\.memo\.json$/.test(name))
  .sort();

const errors = [];
const validated = [];
const rejected = [];

for (const fileName of memoFiles) {
  const code = fileName.slice(0, 2);
  const filePath = path.join(INTAKE_DIR, fileName);

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    rejected.push({ jurisdiction: code, file: fileName, issues: [`Memo is not valid JSON: ${error.message}`] });
    errors.push(`${fileName}: not valid JSON`);
    continue;
  }

  const result = validateLegalDesignMemo(parsed);

  if (result.jurisdiction && result.jurisdiction !== code) {
    result.issues.push({
      severity: "error",
      jurisdiction: code,
      trackId: null,
      field: "jurisdiction",
      message: `Memo declares ${result.jurisdiction} but the file is named ${fileName}.`
    });
  }

  const hardIssues = result.issues.filter((issue) => issue.severity === "error");
  if (hardIssues.length > 0 || result.jurisdiction !== code) {
    rejected.push({
      jurisdiction: code,
      file: fileName,
      issues: hardIssues.map((issue) => `${issue.trackId ? `${issue.trackId}: ` : ""}${issue.field} — ${issue.message}`)
    });
    errors.push(`${fileName}: ${hardIssues.length} validation error(s)`);
    continue;
  }

  validated.push({ code, memo: parsed, result });
}

// Normalize only what validated cleanly.
const normalizedMemos = validated.map(({ memo }) => normalizeMemo(memo));
const allTracks = normalizedMemos.flatMap((memo) => memo.tracks);
const allRelationships = normalizedMemos.flatMap((memo) => sourceRelationships(memo));

const received = new Set(validated.map((entry) => entry.code));
const outstanding = ALL_JURISDICTION_CODES.filter((code) => !received.has(code));

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

const registryRecords = {
  schemaVersion: 1,
  planOfRecord: "docs/record-clearing/PLAN_OF_RECORD_RELIEF_TRACK_STRATEGY.md",
  note:
    "Imported from legal-design memos. Every track is runtime_disabled: design approval is not output approval, and packet_ready additionally requires source approval, technical proof, visual review, a current source and runtime enablement.",
  jurisdictionsReceived: validated.length,
  jurisdictionsOutstanding: outstanding.length,
  trackCount: allTracks.length,
  packetReadyCount: 0,
  tracks: allTracks
};

const packetSetManifests = {
  schemaVersion: 1,
  packetSets: allTracks.map((track) => ({
    jurisdiction: track.jurisdiction,
    trackId: track.trackId,
    ...track.packetSet
  }))
};

const specifications = {
  schemaVersion: 1,
  customPleadingSpecs: allTracks.flatMap((track) =>
    track.packetSet.components
      .filter((component) => component.outputStrategy === "custom_pleading")
      .map((component) => ({
        jurisdiction: track.jurisdiction,
        trackId: track.trackId,
        componentId: component.componentId,
        role: component.role,
        venue: track.venue,
        authority: track.authority,
        rules: track.rules,
        stopConditions: track.selfHelpStopConditions,
        templateStatus: "not_drafted"
      }))
  ),
  officialFormAssignments: allTracks.flatMap((track) =>
    track.packetSet.components
      .filter((component) => component.outputStrategy === "official_pdf_fill")
      .map((component) => ({
        jurisdiction: track.jurisdiction,
        trackId: track.trackId,
        componentId: component.componentId,
        officialFormId: component.officialFormId,
        officialSourceUrl: component.officialSourceUrl,
        mappingStatus: "not_mapped"
      }))
  ),
  processGuidanceSpecs: allTracks
    .filter((track) => track.outputStrategy === "process_guidance")
    .map((track) => ({
      jurisdiction: track.jurisdiction,
      trackId: track.trackId,
      destination: track.destination,
      rules: track.rules,
      stopConditions: track.selfHelpStopConditions,
      guidanceStatus: "not_drafted"
    }))
};

const QUEUES = [
  ["A_official_pdf_acroform", "Official PDF fill, backed by a verified AcroForm"],
  ["B_official_pdf_overlay", "Official PDF fill, requiring a coordinate overlay"],
  ["C_custom_pleading", "Custom pleading"],
  ["D_staged_or_process_guidance", "Staged and process-guidance tracks"],
  ["E_local_variant", "Local, county, circuit, district and court-specific variants"],
  ["F_source_problem", "Missing, encrypted, XFA, stale or conflicting sources"]
];

const implementationQueue = {
  schemaVersion: 1,
  generatedFrom: "data/record-clearing/legal-design-intake",
  jurisdictionsReceived: validated.length,
  jurisdictionsOutstanding: outstanding.length,
  outstandingJurisdictions: outstanding,
  rejectedMemos: rejected,
  deferredTracks: normalizedMemos.flatMap((memo) =>
    memo.deferredTrackIds.map((trackId) => ({ jurisdiction: memo.jurisdiction, trackId }))
  ),
  batches: QUEUES.map(([id, label]) => {
    const tracks = allTracks.filter((track) => track.implementationQueue === id);
    return {
      batch: id,
      label,
      trackCount: tracks.length,
      tracks: tracks.map((track) => ({
        jurisdiction: track.jurisdiction,
        trackId: track.trackId,
        publicName: track.publicName,
        outputStrategy: track.outputStrategy,
        geographicScope: track.geographicScope,
        legalDesignStatus: track.legalDesignStatus,
        legalStatus: track.legalStatus,
        runtimeStatus: "runtime_disabled",
        blockers: track.blockers
      }))
    };
  })
};

fs.mkdirSync(OUT_DIR, { recursive: true });
write("legal-design-track-registry.json", registryRecords);
write("legal-design-packet-set-manifests.json", packetSetManifests);
write("legal-design-track-source-relationships.json", { schemaVersion: 1, relationships: allRelationships });
write("legal-design-specifications.json", specifications);
write("legal-design-implementation-queue.json", implementationQueue);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log("RCAP legal-design intake");
console.log(`1. Memos found: ${memoFiles.length}. Accepted: ${validated.length}. Rejected: ${rejected.length}.`);
console.log(`2. Jurisdictions outstanding: ${outstanding.length} of ${ALL_JURISDICTION_CODES.length}.`);
console.log(`3. Tracks imported: ${allTracks.length}. Deferred (not implementable yet): ${implementationQueue.deferredTracks.length}.`);
console.log("4. Implementation batches:");
for (const batch of implementationQueue.batches) {
  console.log(`     ${batch.batch}: ${batch.trackCount} — ${batch.label}`);
}
console.log(`5. Custom-pleading specs: ${specifications.customPleadingSpecs.length}. Official-form assignments: ${specifications.officialFormAssignments.length}. Guidance specs: ${specifications.processGuidanceSpecs.length}.`);
console.log("6. Tracks packet_ready: 0. Importing a memo enables nothing.");

if (rejected.length > 0) {
  console.error("");
  console.error("REJECTED MEMOS — incomplete imports are refused, not partially applied:");
  for (const entry of rejected) {
    console.error(`  ${entry.file}:`);
    for (const issue of entry.issues.slice(0, 12)) console.error(`    - ${issue}`);
    if (entry.issues.length > 12) console.error(`    ... and ${entry.issues.length - 12} more`);
  }
}

if (strict && errors.length > 0) {
  console.error("");
  console.error(`Legal-design intake failed: ${errors.length} memo(s) rejected.`);
  process.exit(1);
}

function write(name, value) {
  fs.writeFileSync(path.join(OUT_DIR, name), `${JSON.stringify(value, null, 2)}\n`);
}
