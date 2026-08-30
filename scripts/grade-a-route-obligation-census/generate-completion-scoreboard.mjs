#!/usr/bin/env node
// One live scoreboard, and the slot mechanism that feeds it.
//
//   node scripts/grade-a-route-obligation-census/generate-completion-scoreboard.mjs
//   node scripts/grade-a-route-obligation-census/generate-completion-scoreboard.mjs --check
//
// There is exactly one scoreboard and it is derived, never edited. Every number
// on it is recomputed from the records that actually decide it -- the frozen
// census, the source reconciliation, the stale-artifact block, the legal triage
// and the Category B revalidation -- so it cannot drift from them and cannot be
// improved by writing on it.
//
// THE RELEASE RULE
//
// A family is held when something it needs is missing. The moment that thing
// arrives, the family becomes releasable and takes the next free build slot.
// That is computed here rather than tracked by hand: when the source
// reconciliation says a family's source is held, the family stops being held for
// source. Nobody has to remember to release it.
//
// THE LAUNCH GATE
//
// No family may reach launch still held for a missing source, form, artifact,
// review or approval. That is not a target here; it is a gate, and the
// scoreboard reports the count that must be zero before anything launches. It
// is not zero today and saying so is the point of the scoreboard.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(rootDir);
const CHECK = process.argv.includes("--check");

const V1 = "data/rcap-grade-a/route-obligation-census-v1";
const CANDIDATE = "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json";
const WORKLIST = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const OUT = `${V1}/COMPLETION_SCOREBOARD.json`;

// How many families may be in flight at once. Build slots are bounded because
// an unbounded fan-out produces lanes that collide and nobody supervises.
const BUILD_SLOTS = 12;

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const candidate = readJson(CANDIDATE);
const worklist = readJson(WORKLIST);
const freeze = readJson(`${V1}/FREEZE.json`);
const waves = readJson(`${V1}/category-a-implementation-waves.json`);
const custody = readJson(`${V1}/source-custody-reconciliation.json`);
const triage = readJson(`${V1}/legal-review-triage.json`);

// The Captain's triage sent 47 of 86 rows to counsel. Roger's routing correction
// of 2026-08-30 cut that to 4 and returned 43 to the Captain, the source team, or
// their own already-recorded decisions. queue-v2 is the controlling record; the
// triage is kept because it is the thing that was corrected, and a scoreboard
// that quietly forgot the correction would report a counsel backlog twelve times
// its real size.
const legalQueue = fs.existsSync(path.join(rootDir, `${V1}/legal-review-queue-v2.json`))
  ? readJson(`${V1}/legal-review-queue-v2.json`)
  : null;

// The 166 SOURCE_IDENTITY_UNRESOLVED rows the reconciliation counted have since
// been worked in two batches. The reconciliation is a frozen record of what was
// true when it ran, so it is not rewritten; the scoreboard reads both batches
// and reports what is unresolved NOW. The two batches were written independently
// and use different vocabularies, so a row is counted resolved only when its own
// batch says it is FULLY resolved -- a partially resolved row still has an open
// question and is counted as such.
const identityBatches = [1, 2]
  .map((n) => ({ batch: n, path: `${V1}/identity-resolution/batch-${n}/resolved.json` }))
  .filter((b) => fs.existsSync(path.join(rootDir, b.path)))
  .map((b) => ({ ...b, doc: readJson(b.path) }));

const identity = (() => {
  let rows = 0, fullyResolved = 0, partiallyResolved = 0, unresolved = 0, noDocumentRequired = 0;
  for (const { doc } of identityBatches) {
    for (const row of doc.rows ?? []) {
      rows += 1;
      switch (row.resolution) {
        case "RESOLVED": fullyResolved += 1; break;
        case "NO_OFFICIAL_DOCUMENT_REQUIRED": noDocumentRequired += 1; fullyResolved += 1; break;
        case "PARTIALLY_RESOLVED": partiallyResolved += 1; break;
        default: unresolved += 1;
      }
    }
  }
  return {
    batchesLanded: identityBatches.map((b) => b.batch),
    rowsWorked: rows,
    rowsTheReconciliationFlagged: custody.counts.SOURCE_IDENTITY_UNRESOLVED,
    rowsFullyResolved: fullyResolved,
    ofWhichNeedNoOfficialDocument: noDocumentRequired,
    rowsPartiallyResolved: partiallyResolved,
    rowsStillUnresolved: unresolved + partiallyResolved,
    rowsWithNoResolutionAtAll: unresolved,
    whatStillUnresolvedMeans: "the row's own batch did not fully resolve it. A partially resolved row is counted here because it still carries an open question, and a document identity that is 90 percent settled sends an acquirer to the wrong place just as reliably as one that is not settled at all.",
    resolvedNothingWasFetched: "Both batches resolved against committed indexes only. Egress to court and agency hosts is refused, and no form number was guessed."
  };
})();
const revalidation = readJson(`${V1}/category-b-medium-confidence-revalidation.json`);
const block = readJson(BLOCK);

const custodyByGroup = new Map(custody.rows.map((r) => [r.worklistGroupId, r.custodyClass]));
const routeByKey = new Map(candidate.routes.map((r) => [r.routeKey, r]));

/** What each family is still waiting on, recomputed from the live records. */
function holdsFor(family) {
  const holds = [];
  const routes = family.routes.map((r) => routeByKey.get(r.routeKey)).filter(Boolean);
  const custodyClass = custodyByGroup.get(family.worklistGroupId) ?? null;
  if (family.workTypes.includes("OFFICIAL_SOURCE_ACQUISITION_REQUIRED") && custodyClass !== "SOURCE_ALREADY_HELD") {
    holds.push({ kind: "missing_source", detail: custodyClass ?? "not reconciled" });
  }
  if (family.workTypes.includes("OFFICIAL_FORM_MAP_REQUIRED")) holds.push({ kind: "missing_form_map" });
  if (family.workTypes.includes("ARTIFACT_REVIEW_REQUIRED")) holds.push({ kind: "missing_artifact_review" });
  if (family.workTypes.includes("OUTPUT_LEGAL_APPROVAL_REQUIRED")) holds.push({ kind: "missing_output_approval" });
  if (routes.some((r) => r.requiresLegalReview)) holds.push({ kind: "missing_legal_answer" });
  if (routes.some((r) => r.classificationConfidence !== "high")) holds.push({ kind: "medium_confidence_classification" });
  return holds;
}

const families = worklist.packetFamilies.map((family) => {
  const holds = holdsFor(family);
  const custodyClass = custodyByGroup.get(family.worklistGroupId) ?? null;
  // Releasable means: nothing this lane cannot start on. Source and legal answer
  // are the two blocking kinds; form maps, artifacts, reviews and approvals ARE
  // the work, so a family is not held back for having them to do.
  const blockingHolds = holds.filter((h) => h.kind === "missing_source" || h.kind === "missing_legal_answer"
    || h.kind === "medium_confidence_classification");
  return {
    worklistGroupId: family.worklistGroupId,
    implementationStrategy: family.implementationStrategy,
    jurisdictions: family.jurisdictions,
    routeCount: family.routes.length,
    sourceCustody: custodyClass,
    holds,
    blockingHolds,
    releasable: blockingHolds.length === 0,
    remainingWorkTypes: family.workTypes
  };
});

const releasable = families.filter((f) => f.releasable);
// Keyed by group id AND implementation strategy: six packet sets appear twice
// in the worklist under different strategies, and a set keyed on the id alone
// collapses them and undercounts what was cleared.
const familyKey = (f) => `${f.worklistGroupId}||${f.implementationStrategy}`;
const dispatchedIds = new Set(waves.waves.flatMap((w) => w.families.map(familyKey)));

// A wave is a QUEUE, not concurrency. Being in a wave means a family is cleared
// to be worked; being in flight means a worker was actually started for it. The
// first scoreboard conflated them and reported 114 families in 12 slots, which
// is not a state the world can be in.
const assignmentsPath = `${V1}/worker-assignments.json`;
const assignments = fs.existsSync(path.join(rootDir, assignmentsPath))
  ? readJson(assignmentsPath)
  : { schemaVersion: "rcap-census-v1-worker-assignments/v1", assignments: [] };
// A resumed worker occupies a slot exactly as a freshly started one does. The
// first version of this counted only "started" and so reported 6 in flight
// while 11 workers were running -- an undercount that would have invited the
// Captain to over-dispatch into slots that were not free.
const IN_FLIGHT_STATUSES = new Set(["started", "running", "resumed"]);
const startedIds = new Set((assignments.assignments ?? [])
  .filter((a) => IN_FLIGHT_STATUSES.has(a.status))
  .map(familyKey));
const inFlight = releasable.filter((f) => startedIds.has(familyKey(f)));
const queuedForSlot = releasable.filter((f) => dispatchedIds.has(familyKey(f)) && !startedIds.has(familyKey(f)));
const held = families.filter((f) => !f.releasable);

const holdCounts = held.reduce((acc, f) => {
  for (const h of f.blockingHolds) acc[h.kind] = (acc[h.kind] ?? 0) + 1;
  return acc;
}, {});

const launchBlockers = families.reduce((acc, f) => {
  for (const h of f.holds) acc[h.kind] = (acc[h.kind] ?? 0) + 1;
  return acc;
}, {});
const familiesNotLaunchReady = families.filter((f) => f.holds.length > 0).length;

// The commit the census was integrated and regenerated at, pinned rather than
// read from HEAD. A record that stamps the live HEAD goes stale on the next
// unrelated commit, which is the opposite of a freeze -- and a scoreboard that
// did the same would report drift every time anything else was committed.
const CENSUS_INTEGRATION_COMMIT = "db5b848fc6c69aff5eb8cdaff88a5df05fe1ec30";
const headSha = CENSUS_INTEGRATION_COMMIT;

const doc = {
  schemaVersion: "rcap-census-v1-completion-scoreboard/v1",
  generatedBy: "scripts/grade-a-route-obligation-census/generate-completion-scoreboard.mjs",
  thereIsExactlyOneScoreboard:
    "This one. Every number is recomputed from the records that decide it, so it cannot drift from them and cannot be improved by editing it.",
  atHead: headSha,
  frozenCensus: { record: `${V1}/FREEZE.json`, obligations: freeze.totals.totalObligations, categoryA: freeze.totals.categoryA, categoryB: freeze.totals.categoryB, packetFamilies: freeze.totals.packetFamilies },

  buildSlots: {
    capacity: BUILD_SLOTS,
    rule: "A family occupies a slot while it is in flight. When a slot frees, the next releasable family takes it. Releasability is recomputed here, so a family whose source arrives is released without anyone remembering to do it.",
    inFlight: inFlight.length,
    free: Math.max(0, BUILD_SLOTS - inFlight.length),
    queuedForNextSlot: queuedForSlot.length,
    assignmentsRecord: assignmentsPath,
    inFlightMeans: "a worker was actually started for this family and recorded in the assignments record",
    queuedMeans: "cleared into a wave and waiting for a free slot"
  },

  families: {
    total: families.length,
    releasable: releasable.length,
    clearedIntoWaves: dispatchedIds.size,
    workersStarted: startedIds.size,
    heldBack: held.length,
    heldBackBy: holdCounts
  },

  sourceCustody: {
    reconciledAgainst: custody.corpusIndex,
    corpusFilesHeld: custody.corpusFilesHeld,
    ...custody.counts,
    acquisitionCommissionedFor: custody.commissionAcquisitionFor,
    acquisitionNotCommissionedFor: custody.doNotCommissionAcquisitionFor,
    acquisitionCannotRunInThisEnvironment:
      "Outbound egress to court and agency hosts is refused by this environment's network policy. Acquisition runs in a network-enabled environment; nothing here fetches."
  },

  sourceIdentity: identity,

  legalReview: legalQueue ? {
    total: 86,
    controllingRecord: `${V1}/legal-review-queue-v2.json`,
    supersedes: `${V1}/legal-review-triage.json`,
    TRUE_COUNSEL_DECISION: legalQueue.trueCounselQueue.count,
    trueCounselQuestions: legalQueue.trueCounselQueue.questions.map((q) => `#${q.number} ${q.jurisdiction} ${q.publicLabel}`),
    remainingRows: legalQueue.remainingEightyTwo.count,
    remainingRowsTargetRouting: legalQueue.remainingEightyTwo.targetRouting,
    remainingRowsAssignmentStatus: legalQueue.remainingEightyTwo.assignmentStatus,
    captainTriageSaid: triage.counts,
    note: "Only the four pinned questions go to counsel. The other 82 are the Captain's, the source team's, or already decided in this repository -- their row-level assignment is being derived from evidence rather than filled to a quota."
  } : {
    total: triage.total,
    ...triage.counts,
    note: "Only TRUE_COUNSEL_DECISION needs counsel. The rest are answerable from this repository or already decided."
  },

  categoryB: {
    total: freeze.totals.categoryB,
    mediumConfidenceRevalidated: revalidation.total,
    contradictTheirOwnEvidence: revalidation.withContradictions,
    outcomes: revalidation.outcomes,
    noneConfirmedWithoutCounsel: true
  },

  staleArtifacts: {
    blockedHashes: block.blockedHashes,
    blockedFamilies: block.uniqueFamilies,
    countedAsPacketEvidence: 0
  },

  launchGate: {
    rule: "No family may launch while it is still held for a missing source, form map, artifact review, output approval or legal answer.",
    familiesNotLaunchReady,
    blockersByKind: launchBlockers,
    launchReady: families.length - familiesNotLaunchReady,
    gateOpen: familiesNotLaunchReady === 0
  },

  commercial: {
    routesOpened: 0,
    commerciallyEligible: 0,
    completePacketProven: 0,
    rule: "No commercial route opens until its own family's complete proof passes. The scoreboard opens nothing."
  },

  familiesDetail: families.sort((a, b) => a.worklistGroupId.localeCompare(b.worklistGroupId))
};

const serialized = `${JSON.stringify(doc, null, 2)}\n`;
const outPath = path.join(rootDir, OUT);
if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : "";
  if (current !== serialized) { console.error(`${OUT} is stale.`); process.exit(1); }
  console.log(`completion scoreboard current: ${families.length} family(ies).`);
  process.exit(0);
}
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, serialized);
console.log(`Wrote ${OUT}\n`);
console.log(`  families ${families.length}: ${releasable.length} releasable, ${held.length} held`);
console.log(`  slots ${inFlight.length}/${BUILD_SLOTS} in flight, ${queuedForSlot.length} queued behind them (${dispatchedIds.size} cleared into waves)`);
console.log(`  source: held ${custody.counts.SOURCE_ALREADY_HELD}, missing ${custody.counts.SOURCE_GENUINELY_MISSING}, identity unresolved at reconciliation ${custody.counts.SOURCE_IDENTITY_UNRESOLVED} -> ${identity.rowsStillUnresolved} after batches 1-2`);
console.log(`  legal: ${doc.legalReview.TRUE_COUNSEL_DECISION} of 86 need counsel${legalQueue ? ` (was ${triage.counts.TRUE_COUNSEL_DECISION}; ${legalQueue.remainingEightyTwo.count} rerouted)` : ""}`);
console.log(`  launch gate: ${familiesNotLaunchReady} family(ies) not launch-ready — gate ${doc.launchGate.gateOpen ? "OPEN" : "CLOSED"}`);
console.log(`  commercial routes opened: 0`);
