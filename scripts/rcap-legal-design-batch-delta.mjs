// Batch delta report for the packet-only product model.
//
// Reads a batch of legal-design memos, re-normalizes them, and reports what the
// packet-only model did to each one. The point of the report is the last two
// sections:
//
//   - a mutually exclusive partition of every track, which must sum to the
//     batch total, so no track can be quietly dropped or double-counted; and
//   - a count of tracks whose substantive legal conclusion changed, which must
//     be zero. Reclassifying a limitation is not permission to restate what
//     counsel decided. If this script ever reports a non-zero delta there, the
//     normalizer has overstepped and the run fails.
//
// Usage:
//   node scripts/rcap-legal-design-batch-delta.mjs                  # Batch 1
//   node scripts/rcap-legal-design-batch-delta.mjs --batch AL,AK    # explicit
//   node scripts/rcap-legal-design-batch-delta.mjs --json           # report only

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const { validateLegalDesignMemo } = await import("@/lib/rcap/legal-design/validate");
const { normalizeMemo, readinessCeilingFor } = await import("@/lib/rcap/legal-design/normalize");
const { LIMITATION_CLASSIFICATIONS, UNRESOLVED_QUESTION_IMPACTS } = await import(
  "@/lib/rcap/legal-design/types"
);

const root = process.cwd();

// --intake and --out exist so the verifier can drive this over a fixture
// directory. They do not let a fixture reach the real report: the default paths
// are the only ones the committed pipeline uses.
const intakeArg = process.argv.find((arg) => arg.startsWith("--intake="));
const outArg = process.argv.find((arg) => arg.startsWith("--out="));
const INTAKE_DIR = intakeArg
  ? path.resolve(root, intakeArg.slice("--intake=".length))
  : path.join(root, "data/record-clearing/legal-design-intake");
const OUT_PATH = outArg
  ? path.resolve(root, outArg.slice("--out=".length))
  : path.join(root, "data/record-clearing/legal-design-batch-delta-report.json");

/** The first legal-review batch. */
const BATCH_1 = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "HI", "ID"];

const batchArg = process.argv.find((arg) => arg.startsWith("--batch="));
const batchCodes = batchArg ? batchArg.slice("--batch=".length).split(",").map((c) => c.trim().toUpperCase()) : BATCH_1;
const jsonOnly = process.argv.includes("--json");

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

const missingMemos = [];
const rejectedMemos = [];
const normalized = [];

for (const code of batchCodes) {
  const filePath = path.join(INTAKE_DIR, `${code}.memo.json`);
  if (!fs.existsSync(filePath)) {
    missingMemos.push(code);
    continue;
  }

  let memo;
  try {
    memo = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    rejectedMemos.push({ code, issues: [`Not valid JSON: ${error.message}`] });
    continue;
  }

  const result = validateLegalDesignMemo(memo);
  if (!result.ok) {
    rejectedMemos.push({
      code,
      issues: result.issues
        .filter((issue) => issue.severity === "error")
        .map((issue) => `${issue.trackId ? `${issue.trackId}: ` : ""}${issue.field} — ${issue.message}`)
    });
    continue;
  }

  normalized.push({ code, memo, normalized: normalizeMemo(memo) });
}

// ---------------------------------------------------------------------------
// Count
// ---------------------------------------------------------------------------

const tracks = normalized.flatMap((entry) => entry.normalized.tracks);
const deferred = normalized.flatMap((entry) => entry.normalized.deferredTracks);

/** Counsel's own words, keyed by track, so the pipeline can be held to them. */
const asSubmitted = new Map();
for (const entry of normalized) {
  for (const track of entry.memo.tracks) {
    asSubmitted.set(`${entry.code}:${track.trackId}`, track);
  }
}

const limitationsByClassification = Object.fromEntries(
  LIMITATION_CLASSIFICATIONS.map((classification) => [
    classification,
    { limitations: 0, tracksAffected: 0 }
  ])
);
for (const track of tracks) {
  const seen = new Set();
  for (const limitation of track.legalDesignLimitations) {
    const bucket = limitationsByClassification[limitation.classification];
    if (!bucket) continue;
    bucket.limitations += 1;
    if (!seen.has(limitation.classification)) {
      bucket.tracksAffected += 1;
      seen.add(limitation.classification);
    }
  }
}

const questionsByImpact = Object.fromEntries(
  UNRESOLVED_QUESTION_IMPACTS.map((impact) => [impact, { questions: 0, tracksAffected: 0 }])
);
for (const track of tracks) {
  const seen = new Set();
  for (const question of track.unresolvedQuestions) {
    const bucket = questionsByImpact[question.impact];
    if (!bucket) continue;
    bucket.questions += 1;
    if (!seen.has(question.impact)) {
      bucket.tracksAffected += 1;
      seen.add(question.impact);
    }
  }
}

const tally = (selector) => {
  let items = 0;
  let tracksAffected = 0;
  for (const track of tracks) {
    const value = selector(track);
    items += value.length;
    if (value.length > 0) tracksAffected += 1;
  }
  return { items, tracksAffected };
};

const participantFilingRequirements = tally((track) => track.participantFilingRequirements);
const manualCompletionItems = tally((track) => track.manualCompletionItems);
const packetInstructions = tally((track) => track.packetInstructions);
const scopeRestrictions = tally((track) => track.scopeRestrictions);
const selfHelpBoundaries = tally((track) => track.selfHelpBoundaries);
const participantQuestions = tally((track) => track.participantQuestions);
const generationRequirements = tally((track) => track.generationRequirements);

const guidanceRereview = tracks.filter((track) => track.guidanceRereviewCandidate);
const guidancePreserved = tracks.filter(
  (track) => track.outputStrategy === "process_guidance" && !track.guidanceRereviewCandidate
);

// A track's substantive legal conclusion is counsel's decision, output
// strategy and geographic scope. Normalization may reorganize a limitation. It
// may not restate any of these.
const decisionChanged = [];
for (const track of tracks) {
  const submitted = asSubmitted.get(`${track.jurisdiction}:${track.trackId}`);
  if (!submitted) {
    decisionChanged.push({ jurisdiction: track.jurisdiction, trackId: track.trackId, reason: "no submitted memo" });
    continue;
  }
  const differences = [];
  if (submitted.legalDesignDecision.status !== track.legalDesignStatus) differences.push("legalDesignDecision.status");
  if (submitted.outputStrategy !== track.outputStrategy) differences.push("outputStrategy");
  if (submitted.geography.scope !== track.geographicScope) differences.push("geography.scope");
  if (submitted.geography.keys.join("|") !== track.geographyKeys.join("|")) differences.push("geography.keys");
  if (submitted.legalDesignDecision.limitations.length !== track.legalDesignLimitations.length) {
    differences.push("limitations dropped or invented");
  }
  if (submitted.unresolvedQuestions.length !== track.unresolvedQuestions.length) {
    differences.push("unresolvedQuestions dropped or invented");
  }
  if (differences.length > 0) {
    decisionChanged.push({ jurisdiction: track.jurisdiction, trackId: track.trackId, differences });
  }
}

// Mutually exclusive, and must cover every track.
const withBuildBlockers = tracks.filter((track) => track.buildBlockers.length > 0 || track.legalDesignBlockers.length > 0);
const withReleaseBlockersOnly = tracks.filter(
  (track) =>
    track.buildBlockers.length === 0 &&
    track.legalDesignBlockers.length === 0 &&
    track.releaseBlockers.length > 0
);
const clearOfLegalBlockers = tracks.filter(
  (track) =>
    track.buildBlockers.length === 0 && track.legalDesignBlockers.length === 0 && track.releaseBlockers.length === 0
);

const partitionTotal = withBuildBlockers.length + withReleaseBlockersOnly.length + clearOfLegalBlockers.length;
const reconciles = partitionTotal === tracks.length;

// No track may reach packet_ready while a release blocker is open, even with
// every platform gate green. Proven rather than asserted.
const ceilingViolations = tracks.filter(
  (track) => track.releaseBlockers.length > 0 && readinessCeilingFor(track) !== "runtime_disabled"
);

// The reconciliation model. Deferred is a disposition, not an absence: a track
// counsel could not settle is accounted for, and only an expected ID that
// appears in neither list is unaccounted.
const EXPECTED = JSON.parse(
  fs.readFileSync(
    "/workspaces/legalease-legal-review-import/batch-1-amended/expected/expected-track-ids.json",
    "utf8"
  )
).expected_track_ids_by_jurisdiction;

// Expected IDs describe the real Batch 1 corpus. A fixture directory has no
// relationship to it, so in fixture mode the batch is its own expectation and
// the reconciliation still proves the arithmetic without asserting a false gap.
const fixtureMode = Boolean(intakeArg);
const expectedIds = fixtureMode
  ? [...tracks.map((t) => `${t.jurisdiction}:${t.trackId}`), ...deferred.map((d) => `${d.jurisdiction}:${d.trackId}`)]
  : batchCodes.flatMap((code) => (EXPECTED[code] ?? []).map((id) => `${code}:${id}`));
const importedIds = tracks.map((track) => `${track.jurisdiction}:${track.trackId}`);
const deferredIds = deferred.map((entry) => `${entry.jurisdiction}:${entry.trackId}`);
const accountedIds = new Set([...importedIds, ...deferredIds]);
const unaccountedIds = expectedIds.filter((id) => !accountedIds.has(id));
const unexpectedIds = [...accountedIds].filter((id) => !expectedIds.includes(id));

const byJurisdiction = Object.fromEntries(
  batchCodes.map((code) => [
    code,
    {
      expected: (EXPECTED[code] ?? []).length,
      imported: importedIds.filter((id) => id.startsWith(`${code}:`)).length,
      deferred: deferredIds.filter((id) => id.startsWith(`${code}:`)).length
    }
  ])
);

const report = {
  schemaVersion: 1,
  batch: batchCodes,
  reconciliation_model: {
    fixtureMode,
    expectedTracks: expectedIds.length,
    importedTracks: importedIds.length,
    deferredLegalResearchTracks: deferredIds.length,
    totalAccountedTracks: importedIds.length + deferredIds.length,
    unaccountedTracks: unaccountedIds.length,
    unaccountedTrackIds: unaccountedIds,
    unexpectedTrackIds: unexpectedIds,
    byJurisdiction,
    reconciles:
      importedIds.length + deferredIds.length === expectedIds.length &&
      unaccountedIds.length === 0 &&
      unexpectedIds.length === 0
  },
  statusLanguage:
    "All imported tracks are runtime_disabled. Tracks deferred under legal_research_required are absent from runtime resolution and unreachable.",
  jurisdictionsExpected: batchCodes.length,
  jurisdictionsPresent: normalized.length,
  memosMissing: missingMemos,
  memosRejected: rejectedMemos,
  totalTracksProcessed: tracks.length,
  deferredTracks: deferred,
  generationRequirements,
  limitationsByClassification,
  participantFilingRequirements,
  manualCompletionItems,
  packetInstructions,
  participantQuestions,
  scopeRestrictions,
  selfHelpBoundaries,
  unresolvedQuestionsByImpact: questionsByImpact,
  buildBlockers: questionsByImpact.build_blocker,
  releaseBlockers: questionsByImpact.release_blocker,
  nonblockingResearchNotes: questionsByImpact.nonblocking_research_note,
  processGuidanceTracksRequiringLegalReReview: {
    count: guidanceRereview.length,
    tracks: guidanceRereview.map((track) => ({
      jurisdiction: track.jurisdiction,
      trackId: track.trackId,
      guidanceRationales: track.guidanceRationales
    }))
  },
  processGuidanceTracksPreserved: {
    count: guidancePreserved.length,
    tracks: guidancePreserved.map((track) => ({
      jurisdiction: track.jurisdiction,
      trackId: track.trackId,
      guidanceRationales: track.guidanceRationales
    }))
  },
  tracksWhoseSubstantiveLegalDecisionDidNotChange: tracks.length - decisionChanged.length,
  tracksWhoseSubstantiveLegalDecisionChanged: decisionChanged,
  reconciliation: {
    tracksWithBuildBlockers: withBuildBlockers.length,
    tracksWithReleaseBlockersOnly: withReleaseBlockersOnly.length,
    tracksClearOfLegalBlockers: clearOfLegalBlockers.length,
    partitionTotal,
    totalTracksProcessed: tracks.length,
    reconciles
  },
  releaseBlockerCeilingViolations: ceilingViolations.map((track) => ({
    jurisdiction: track.jurisdiction,
    trackId: track.trackId
  })),
  runtimeNote:
    "All imported tracks are runtime_disabled. Tracks deferred under legal_research_required are absent from runtime resolution and unreachable. No track is packet_ready, no jurisdiction is enabled, and the launch gate stays red."
};

fs.writeFileSync(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (jsonOnly) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("RCAP legal-design batch delta report");
  console.log(`   Batch: ${batchCodes.join(", ")}`);
  console.log(
    `   Jurisdictions: ${normalized.length} of ${batchCodes.length} present. Missing: ${missingMemos.length > 0 ? missingMemos.join(", ") : "none"}. Rejected: ${rejectedMemos.length}.`
  );
  console.log("");
  console.log(`1.  Imported tracks: ${tracks.length}. Deferred under legal_research_required: ${deferred.length}. Total accounted: ${tracks.length + deferred.length}.`);
  console.log("2.  Limitations by classification:");
  for (const [classification, counts] of Object.entries(limitationsByClassification)) {
    console.log(`      ${classification.padEnd(24)} ${String(counts.limitations).padStart(4)} across ${counts.tracksAffected} track(s)`);
  }
  console.log(`3.  Participant filing requirements: ${participantFilingRequirements.items} across ${participantFilingRequirements.tracksAffected} track(s).`);
  console.log(`4.  Manual completion items: ${manualCompletionItems.items} across ${manualCompletionItems.tracksAffected} track(s).`);
  console.log(`5.  Packet instructions: ${packetInstructions.items} across ${packetInstructions.tracksAffected} track(s).`);
  console.log(`6.  Scope restrictions: ${scopeRestrictions.items} across ${scopeRestrictions.tracksAffected} track(s).`);
  console.log(`7.  Self-help boundaries: ${selfHelpBoundaries.items} across ${selfHelpBoundaries.tracksAffected} track(s).`);
  console.log(`8.  Build blockers: ${questionsByImpact.build_blocker.questions} across ${questionsByImpact.build_blocker.tracksAffected} track(s).`);
  console.log(`9.  Release blockers: ${questionsByImpact.release_blocker.questions} across ${questionsByImpact.release_blocker.tracksAffected} track(s).`);
  console.log(`10. Nonblocking research notes: ${questionsByImpact.nonblocking_research_note.questions} across ${questionsByImpact.nonblocking_research_note.tracksAffected} track(s).`);
  console.log(`11. Process-guidance tracks requiring legal re-review: ${guidanceRereview.length}. Preserved as guidance: ${guidancePreserved.length}.`);
  console.log(`12. Tracks whose substantive legal decision did not change: ${tracks.length - decisionChanged.length} of ${tracks.length}.`);
  console.log("");
  console.log(
    `    Reconciliation: ${withBuildBlockers.length} build-blocked + ${withReleaseBlockersOnly.length} release-blocked only + ${clearOfLegalBlockers.length} clear = ${partitionTotal}, against ${tracks.length} processed. ${reconciles ? "Reconciles." : "DOES NOT RECONCILE."}`
  );
  console.log("");
  console.log("");
  console.log("    Reconciliation model:");
  console.log(`      expectedTracks              ${expectedIds.length}`);
  console.log(`      importedTracks              ${importedIds.length}`);
  console.log(`      deferredLegalResearchTracks ${deferredIds.length}`);
  console.log(`      totalAccountedTracks        ${importedIds.length + deferredIds.length}`);
  console.log(`      unaccountedTracks           ${unaccountedIds.length}${unaccountedIds.length ? " — " + unaccountedIds.join(", ") : ""}`);
  console.log("");
  console.log("    All imported tracks are runtime_disabled. Tracks deferred under legal_research_required");
  console.log("    are absent from runtime resolution and unreachable. None is packet_ready; launch gate red.");
  console.log(`    Written to ${path.relative(root, OUT_PATH)}`);
}

// ---------------------------------------------------------------------------
// Fail loudly
// ---------------------------------------------------------------------------

const failures = [];
if (!reconciles) {
  failures.push(`Partition sums to ${partitionTotal} but ${tracks.length} tracks were processed.`);
}
if (decisionChanged.length > 0) {
  failures.push(
    `${decisionChanged.length} track(s) had a substantive legal conclusion altered. Normalization may reclassify a limitation; it may not restate counsel's decision, output strategy or geography.`
  );
}
if (ceilingViolations.length > 0) {
  failures.push(`${ceilingViolations.length} track(s) with an open release blocker could still reach packet_ready.`);
}
if (rejectedMemos.length > 0) {
  failures.push(`${rejectedMemos.length} memo(s) failed validation and were not counted.`);
}
// An unaccounted ID while memos are still outstanding is progress, not a
// defect: the jurisdiction has not been imported yet. Once every batch memo is
// present the batch claims to be complete, and an unaccounted ID is then a real
// hole — a track that was dropped rather than imported or deferred.
if (unaccountedIds.length > 0 && missingMemos.length === 0) {
  failures.push(
    `${unaccountedIds.length} expected track ID(s) are neither imported nor deferred, with every batch memo present: ${unaccountedIds.join(", ")}.`
  );
}
if (unexpectedIds.length > 0) {
  failures.push(`${unexpectedIds.length} track ID(s) are not in the expected list: ${unexpectedIds.join(", ")}.`);
}

if (failures.length > 0) {
  console.error("");
  console.error("BATCH DELTA REPORT FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  for (const entry of rejectedMemos) {
    console.error(`  ${entry.code}:`);
    for (const issue of entry.issues.slice(0, 10)) console.error(`    - ${issue}`);
  }
  process.exit(1);
}

if (missingMemos.length > 0) {
  console.error("");
  console.error(
    `NOTE: ${missingMemos.length} of ${batchCodes.length} batch memos are absent from ${path.relative(root, INTAKE_DIR)}: ${missingMemos.join(", ")}.`
  );
  console.error("The report above covers only the memos present. It is not a report on the whole batch.");
}
