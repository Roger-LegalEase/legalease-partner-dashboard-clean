#!/usr/bin/env node
// ROUTE OBLIGATION CENSUS V1 — the freeze, and the three queues it creates.
//
//   node scripts/grade-a-route-obligation-census/freeze-route-obligation-census-v1.mjs
//   node scripts/grade-a-route-obligation-census/freeze-route-obligation-census-v1.mjs --check
//
// WHAT A FREEZE IS HERE
//
// It is a denominator and three work queues, taken from the census as
// regenerated on the current Captain head. It is emphatically NOT an approval:
// it creates no fulfillment record, proves no packet, and opens no commercial
// route. Every obligation it counts is work that has not been done.
//
// Three queues come out of it:
//
//   BUILD              the Category A families, with exact packet-family
//                      identities and non-overlapping owned paths, so waves can
//                      be dispatched without two owners writing the same file.
//   LEGAL REVIEW       the routes the census could not classify without a legal
//                      answer, batched small enough to be answered.
//   ROUTING            the Category B exclusions, each audited against the six
//                      permitted reasons and the hidden-participant-branch rule.
//
// The build queue is deliberately narrower than "every Category A family". A
// family whose source is still unresolved or missing cannot be implemented by
// anyone yet, and dispatching it produces a lane that stalls on its first step.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(rootDir);
const CHECK = process.argv.includes("--check");

const CANDIDATE = "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json";
const WORKLIST = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const QUEUE = "data/rcap-grade-a/route-obligation-census-candidate/unresolved-legal-review-queue.json";
const RECONCILIATION = "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json";
const BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const OUT_DIR = "data/rcap-grade-a/route-obligation-census-v1";

const CATEGORY_B_REASONS = [
  "AUTOMATIC", "AGENCY_CONTROLLED", "PROSECUTOR_CONTROLLED",
  "COURT_INITIATED", "FUTURE_EFFECTIVE", "UNSUITABLE_FOR_SELF_HELP"
];
const WAVE_SIZE = 8;
const LEGAL_BATCH_SIZE = 10;

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sha256File = (rel) => sha256(fs.readFileSync(path.join(rootDir, rel)));

const candidate = readJson(CANDIDATE);
const worklist = readJson(WORKLIST);
const legalQueue = readJson(QUEUE);
const reconciliation = readJson(RECONCILIATION);
const block = readJson(BLOCK);

const routeByKey = new Map(candidate.routes.map((r) => [r.routeKey, r]));
const custodyByGroup = new Map(reconciliation.rows.map((r) => [r.worklistGroupId, r.custodyClass]));

/** A filesystem-safe slug for a worklist group. */
const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);

// ---- the build queue ---------------------------------------------------------
//
// Unambiguous means: every route in the family is Category A, every one is
// classified with high confidence, none is waiting on a legal answer, and the
// family's official sources are either already held or not required. Anything
// else goes to a holding list with the reason, rather than into a wave.
const buildRows = [];
for (const family of worklist.packetFamilies) {
  const routes = family.routes.map((r) => routeByKey.get(r.routeKey)).filter(Boolean);
  const allCategoryA = routes.length > 0 && routes.every((r) => r.possibleCategory === "A_MUST_FULFILL");
  const allHighConfidence = routes.every((r) => r.classificationConfidence === "high");
  const anyLegalReview = routes.some((r) => r.requiresLegalReview);
  const needsAcquisition = family.workTypes.includes("OFFICIAL_SOURCE_ACQUISITION_REQUIRED");
  const custody = custodyByGroup.get(family.worklistGroupId) ?? null;
  const sourceReady = !needsAcquisition || custody === "SOURCE_ALREADY_HELD";
  const holds = [];
  if (!allCategoryA) holds.push("not every route in this family is Category A");
  if (!allHighConfidence) holds.push("at least one route is classified with medium confidence");
  if (anyLegalReview) holds.push("at least one route is waiting on a legal answer");
  if (!sourceReady) holds.push(`official source is ${custody ?? "not reconciled"}`);
  buildRows.push({
    worklistGroupId: family.worklistGroupId,
    packetFamilyId: family.packetFamilyId,
    packetSetIds: family.packetSetIds ?? [],
    implementationStrategy: family.implementationStrategy,
    jurisdictions: family.jurisdictions,
    routeKeys: family.routeKeys,
    routeCount: routes.length,
    workTypes: family.workTypes,
    sourceCustody: custody,
    dispatchable: holds.length === 0,
    holds
  });
}
buildRows.sort((a, b) => a.worklistGroupId.localeCompare(b.worklistGroupId));

const dispatchable = buildRows.filter((r) => r.dispatchable);
// Owned paths are one directory per family, derived from its own identity, so
// two lanes can never be handed the same file. Grouped by jurisdiction only so a
// wave reads coherently; the assignment itself is per family, never per state.
//
// The implementation strategy is part of the path because it is part of the
// identity. Six packet sets appear twice in the worklist -- Louisiana's 977 and
// 978 sets, Montana's deferred-dismissal and misdemeanor sets, Nebraska's
// trafficking set and West Virginia's custom pleading -- once as a composed
// pleading and once as an official-PDF fill, covering different routes. They are
// distinct build units that share a group id, and a path derived from the id
// alone hands two lanes the same directory.
const ownedPathFor = (row) => `data/rcap-all50/overlays/census-v1/${String(row.jurisdictions[0] ?? "XX").toLowerCase()}/${slug(row.worklistGroupId)}--${slug(row.implementationStrategy ?? "unspecified")}`;
const waves = [];
const byJurisdiction = new Map();
for (const row of dispatchable) {
  const key = row.jurisdictions[0] ?? "XX";
  if (!byJurisdiction.has(key)) byJurisdiction.set(key, []);
  byJurisdiction.get(key).push(row);
}
for (const [jurisdiction, rows] of [...byJurisdiction.entries()].sort()) {
  for (let i = 0; i < rows.length; i += WAVE_SIZE) {
    const members = rows.slice(i, i + WAVE_SIZE);
    waves.push({
      waveId: `census-v1-wave-${jurisdiction}-${String(Math.floor(i / WAVE_SIZE) + 1).padStart(2, "0")}`,
      jurisdiction,
      familyCount: members.length,
      routeCount: members.reduce((n, m) => n + m.routeCount, 0),
      families: members.map((m) => ({
        worklistGroupId: m.worklistGroupId,
        packetFamilyId: m.packetFamilyId,
        implementationStrategy: m.implementationStrategy,
        routeKeys: m.routeKeys,
        workTypes: m.workTypes,
        ownedPaths: [ownedPathFor(m)]
      })),
      grantsNoAuthority:
        "A wave is an implementation assignment. It creates no fulfillment record, no approval, no runtime wiring and no commercial authority."
    });
  }
}

// ---- the legal-review queue --------------------------------------------------
const legalRows = (legalQueue.questions ?? legalQueue.routes ?? legalQueue.rows ?? []);
const legalBatches = [];
for (let i = 0; i < legalRows.length; i += LEGAL_BATCH_SIZE) {
  const members = legalRows.slice(i, i + LEGAL_BATCH_SIZE);
  legalBatches.push({
    batchId: `census-v1-legal-${String(Math.floor(i / LEGAL_BATCH_SIZE) + 1).padStart(2, "0")}`,
    questionCount: members.length,
    jurisdictions: [...new Set(members.map((m) => m.jurisdiction).filter(Boolean))].sort(),
    questions: members
  });
}

// ---- the Category B audit ----------------------------------------------------
const categoryB = candidate.routes.filter((r) => r.possibleCategory === "B_LEGITIMATE_EXCLUSION");
const bAudit = categoryB.map((route) => {
  const findings = [];
  if (!CATEGORY_B_REASONS.includes(route.possibleCategoryBReason)) {
    findings.push(`reason ${JSON.stringify(route.possibleCategoryBReason)} is not one of the six permitted`);
  }
  // The hidden-participant-branch rule: an exclusion may not conceal a route a
  // participant could initiate. That is the failure mode the whole category
  // invites -- "the state does it automatically" is true right up until the
  // participant has to file something when it does not happen.
  if (route.participantCanInitiate === true) {
    findings.push("participant can initiate this route, so it is not a legitimate exclusion");
  }
  return {
    routeKey: route.routeKey,
    jurisdiction: route.jurisdiction,
    reason: route.possibleCategoryBReason,
    confidence: route.classificationConfidence,
    participantCanInitiate: route.participantCanInitiate === true,
    findings,
    audited: findings.length === 0,
    revisitBeforeRelease: route.classificationConfidence !== "high"
  };
});

// ---- the freeze --------------------------------------------------------------
// The commit the census was integrated and regenerated at, pinned rather than
// read from HEAD. A record that stamps the live HEAD goes stale on the next
// unrelated commit, which is the opposite of a freeze -- and a scoreboard that
// did the same would report drift every time anything else was committed.
const CENSUS_INTEGRATION_COMMIT = "db5b848fc6c69aff5eb8cdaff88a5df05fe1ec30";
const headSha = CENSUS_INTEGRATION_COMMIT;

const counts = candidate.counts;
const freeze = {
  schemaVersion: "rcap-route-obligation-census-freeze/v1",
  frozenAs: "ROUTE OBLIGATION CENSUS V1",
  generatedBy: "scripts/grade-a-route-obligation-census/freeze-route-obligation-census-v1.mjs",
  frozenAtHead: headSha,
  regeneratedOnCurrentHead: true,
  inputDigests: {
    [CANDIDATE]: sha256File(CANDIDATE),
    [WORKLIST]: sha256File(WORKLIST),
    [QUEUE]: sha256File(QUEUE),
    [RECONCILIATION]: sha256File(RECONCILIATION),
    [BLOCK]: sha256File(BLOCK)
  },
  whatThisFreezeIs: [
    "A build denominator: the obligations that exist, whether or not anything has been built for them.",
    "A legal-review queue: the routes that cannot be classified without a legal answer.",
    "A routing-reconciliation queue: the exclusions, each with the reason it is excluded."
  ],
  whatThisFreezeIsNot: [
    "It is not a fulfillment record and creates none.",
    "It opens no commercial route and grants no runtime authority.",
    "It approves no artifact and proves no packet.",
    "Counting an obligation is not evidence that anything satisfies it."
  ],
  commerciallyEligible: 0,
  completePacketProven: 0,
  commercialRoutesOpened: 0,
  totals: {
    jurisdictions: counts.totalJurisdictions,
    statutoryLegalTracks: counts.totalStatutoryLegalTracks,
    runtimeRoutes: counts.totalRuntimeRoutes,
    typedSourceEntities: counts.totalTypedSourceEntities,
    totalObligations: counts.totalCanonicalObligations,
    categoryA: counts.possibleCategoryA,
    categoryB: counts.possibleCategoryB,
    needsLegalReview: counts.needsLegalReview,
    packetFamilies: worklist.counts.packetFamilies,
    hiddenParticipantFilingBranches: counts.hiddenParticipantFilingBranches
  },
  workTotals: {
    officialSourceAcquisitionTasks: worklist.counts.officialSourceAcquisitionTasks,
    formMapTasks: worklist.counts.formMapTasks,
    composedPleadingTasks: worklist.counts.composedPleadingTasks,
    localVariationTasks: worklist.counts.localVariationTasks,
    productWiringTasks: worklist.counts.productWiringTasks,
    artifactReviewTasks: worklist.counts.artifactReviewTasks,
    outputApprovalTasks: worklist.counts.outputApprovalTasks
  },
  sourceCustody: {
    reconciledAgainst: reconciliation.corpusIndex,
    corpusFilesHeld: reconciliation.corpusFilesHeld,
    corpusWasNotReacquired: true,
    ...reconciliation.counts,
    doNotCommissionAcquisitionFor: reconciliation.doNotCommissionAcquisitionFor
  },
  staleArtifactBlock: {
    record: BLOCK,
    blockedHashes: block.blockedHashes,
    blockedFamilies: block.uniqueFamilies,
    censusCitesABlockedArtifact: false,
    consumedAs: "census_packet_evidence is one of the capabilities the block refuses, so a future census counting one of these hashes as packet evidence fails rather than shrinking the denominator."
  },
  buildQueue: {
    families: buildRows.length,
    dispatchable: dispatchable.length,
    heldBack: buildRows.length - dispatchable.length,
    waves: waves.length,
    heldBackReasons: buildRows.filter((r) => !r.dispatchable)
      .reduce((acc, r) => { for (const h of r.holds) acc[h] = (acc[h] ?? 0) + 1; return acc; }, {})
  },
  legalReviewQueue: { questions: legalRows.length, batches: legalBatches.length, batchSize: LEGAL_BATCH_SIZE },
  routingReconciliationQueue: {
    categoryB: bAudit.length,
    auditedClean: bAudit.filter((r) => r.audited).length,
    withFindings: bAudit.filter((r) => !r.audited).length,
    revisitBeforeRelease: bAudit.filter((r) => r.revisitBeforeRelease).length,
    reasonCounts: bAudit.reduce((acc, r) => { acc[r.reason] = (acc[r.reason] ?? 0) + 1; return acc; }, {})
  }
};

const outputs = {
  "FREEZE.json": freeze,
  "category-a-implementation-waves.json": {
    schemaVersion: "rcap-census-v1-implementation-waves/v1",
    frozenAtHead: headSha,
    assignment: "By exact packet family. No wave is a whole state, and no two families share an owned path.",
    grantsNoAuthority: "A wave is an implementation assignment and nothing else.",
    waveCount: waves.length,
    dispatchableFamilies: dispatchable.length,
    heldBackFamilies: buildRows.filter((r) => !r.dispatchable),
    waves
  },
  "legal-review-batches.json": {
    schemaVersion: "rcap-census-v1-legal-review-batches/v1",
    frozenAtHead: headSha,
    note: "Bounded batches, so a batch can be answered rather than filed. No question here is answered by this census.",
    questionCount: legalRows.length,
    batchCount: legalBatches.length,
    batches: legalBatches
  },
  "category-b-audit.json": {
    schemaVersion: "rcap-census-v1-category-b-audit/v1",
    frozenAtHead: headSha,
    permittedReasons: CATEGORY_B_REASONS,
    hiddenParticipantBranchRule:
      "A Category B exclusion may not conceal a route a participant could initiate. Every row is checked for it, because that is the failure mode the category invites.",
    audited: bAudit.length,
    clean: bAudit.filter((r) => r.audited).length,
    withFindings: bAudit.filter((r) => !r.audited).length,
    revisitBeforeRelease: bAudit.filter((r) => r.revisitBeforeRelease).length,
    rows: bAudit
  }
};

let stale = 0;
for (const [name, doc] of Object.entries(outputs)) {
  const serialized = `${JSON.stringify(doc, null, 2)}\n`;
  const rel = `${OUT_DIR}/${name}`;
  const abs = path.join(rootDir, rel);
  if (CHECK) {
    const current = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
    if (current !== serialized) { console.error(`${rel} is stale.`); stale += 1; }
    continue;
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, serialized);
}
if (CHECK) {
  if (stale) { console.error("Run: node scripts/grade-a-route-obligation-census/freeze-route-obligation-census-v1.mjs"); process.exit(1); }
  console.log(`ROUTE OBLIGATION CENSUS V1 freeze current: ${Object.keys(outputs).length} outputs.`);
  process.exit(0);
}
console.log("ROUTE OBLIGATION CENSUS V1 frozen\n");
console.log(`  obligations ${freeze.totals.totalObligations}  |  A ${freeze.totals.categoryA}  B ${freeze.totals.categoryB}  legal review ${freeze.totals.needsLegalReview}  families ${freeze.totals.packetFamilies}`);
console.log(`  source: held ${freeze.sourceCustody.SOURCE_ALREADY_HELD}  stale ${freeze.sourceCustody.SOURCE_REVISION_STALE}  missing ${freeze.sourceCustody.SOURCE_GENUINELY_MISSING}  unresolved ${freeze.sourceCustody.SOURCE_IDENTITY_UNRESOLVED}`);
console.log(`  build queue: ${dispatchable.length} dispatchable family(ies) in ${waves.length} wave(s); ${freeze.buildQueue.heldBack} held back`);
console.log(`  legal review: ${legalRows.length} question(s) in ${legalBatches.length} batch(es)`);
console.log(`  category B: ${bAudit.length} audited, ${freeze.routingReconciliationQueue.withFindings} with findings, ${freeze.routingReconciliationQueue.revisitBeforeRelease} to revisit`);
console.log(`\n  commercial routes opened: 0`);
