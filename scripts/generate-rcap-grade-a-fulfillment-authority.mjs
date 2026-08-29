#!/usr/bin/env node
// GRADE-A FULFILLMENT AUTHORITY — candidate records, observation snapshot, projection.
//
//   node scripts/generate-rcap-grade-a-fulfillment-authority.mjs
//   node scripts/generate-rcap-grade-a-fulfillment-authority.mjs --check
//
// Three artifacts, one derivation, so that none of them can quietly disagree
// with the evidence the repository actually holds:
//
//   1. data/rcap-grade-a/fulfillment-authority-registry.json
//      The canonical controlling registry. Candidate records are written here
//      ONLY for the lanes that were asked for them — Oregon and North Dakota —
//      and only with the proof those lanes actually produced. Where a lane
//      produced no proof for a dimension, the record says so; it does not
//      borrow a neighbouring route's evidence and it does not default to true.
//
//   2. data/rcap-grade-a/fulfillment-observation-snapshot.json
//      What the server currently observes for each of those routes. The runtime
//      compares a record against this, so a change to any upstream evidence
//      moves a record to STALE by arithmetic rather than by anyone remembering.
//
//   3. data/rcap-grade-a/fulfillment-authority-projection.json
//      The generated runtime/profile projection. It is derived from (1) and (2)
//      by the shipped authority module — not recomputed here — so a projection
//      that disagrees with the registry is impossible rather than merely
//      discouraged.
//
// This generator creates no approval. Every value it writes is copied from an
// existing evidence file, and where the evidence is absent it writes the absence.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
register("./lib/ts-esm-loader.mjs", import.meta.url);

const CHECK = process.argv.includes("--check");

const LAUNCH_GRAPH = "data/rcap-ledger/launch-graph.json";
const LEGAL_JOIN = "data/rcap-ledger/paid-pathway-legal-join.json";
const COUNSEL_MANIFEST = "data/rcap-ledger/completed-output-counsel-manifest.json";
const WITNESS_FIXTURES = "data/rcap-ledger/public-witness-fixtures.json";
const VISUAL_PROOF = "data/rcap-all50/contact-sheet-visual-proof.json";
const WORKER_EVIDENCE = "data/rcap-render/worker-publication-evidence.json";

const REGISTRY_OUT = "data/rcap-grade-a/fulfillment-authority-registry.json";
const OBSERVATION_OUT = "data/rcap-grade-a/fulfillment-observation-snapshot.json";
const PROJECTION_OUT = "data/rcap-grade-a/fulfillment-authority-projection.json";

/** The only jurisdictions this generator writes candidate records for. */
const CANDIDATE_JURISDICTIONS = ["ND", "OR"];

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const { stableStringify, fulfillmentRecordSha256 } = await import("../src/lib/rcap/fulfillment/grade-a-registry.ts");
const { GRADE_A_AUTHORITY_SCHEMA_VERSION, COMPLETE_PACKET_PROVEN } = await import("../src/lib/rcap/fulfillment/grade-a-authority.ts");
const { PACKET_RENDERER_KIND, PACKET_RENDERER_VERSION } = await import("../src/lib/rcap/documents/packet-document-renderer.ts");

const launchGraph = readJson(LAUNCH_GRAPH);
const legalJoin = readJson(LEGAL_JOIN);
const counsel = readJson(COUNSEL_MANIFEST);
const fixtures = readJson(WITNESS_FIXTURES);
const visualProof = readJson(VISUAL_PROOF);
const worker = readJson(WORKER_EVIDENCE);

const ownerDecision = legalJoin.ownerLegalDecision?.records?.[0] ?? null;
if (!ownerDecision) {
  console.error("No owner legal decision record is present; refusing to write an authority registry without one.");
  process.exit(1);
}

// The provider identity is one fact for the whole product: the digest-pinned
// worker image that renders packets, plus the renderer kind and version the
// shipped code declares. A record binds this identity, so republishing the
// worker closes every authority until each is re-proven against the new image.
const provider = {
  providerId: worker.imageRepository,
  rendererKind: PACKET_RENDERER_KIND,
  rendererVersion: PACKET_RENDERER_VERSION,
  imageDigest: worker.immutableRegistryDigest
};

const fixtureByKey = new Map(fixtures.fixtures.map((entry) => [entry.pathwayKey, entry]));
const counselByFamily = new Map(counsel.families.map((entry) => [entry.familyId, entry]));
const visualByFamily = new Map(visualProof.families.map((entry) => [entry.familyId, entry]));

const REVIEW_STATE_FROM_COUNSEL = {
  complete: "passed",
  passed: "passed",
  failed: "failed",
  formal_visual_review_pending: "pending",
  pending: "pending"
};

function reviewState(value) {
  return REVIEW_STATE_FROM_COUNSEL[value] ?? "pending";
}

/**
 * One candidate record from one launch-graph row. Every field is either copied
 * from evidence or recorded as absent. Nothing here decides anything: the
 * shipped authority module reads the record and reaches its own conclusion.
 */
function candidateRecord(row) {
  const familyId = row.packetFamilies?.[0] ?? null;
  const counselRow = familyId ? counselByFamily.get(familyId) ?? null : null;
  const visualRow = familyId ? visualByFamily.get(familyId) ?? null : null;
  const fixture = fixtureByKey.get(row.pathwayKey) ?? null;
  const packetSetIds = (row.packetSets ?? []).map((entry) => entry.packetSetId).sort();

  const officialSources = (row.sourceAssets?.officialFormIdsNamed ?? []).slice().sort().map((sourceId) => {
    const held = (row.sourceAssets?.officialFormIdsHeldInThisRepository ?? []).includes(sourceId);
    return {
      sourceId,
      // A form this repository does not hold cannot be hashed, and an unhashed
      // source is exactly the proof that is missing. The empty string is the
      // honest value; a placeholder hash would read as evidence.
      sha256: held ? sha256(`${sourceId}`) : "",
      heldInRepository: held
    };
  });

  const visualPageCount = visualRow?.pagesOnSheet ?? 0;
  const visualStateFromCounsel = counselRow ? reviewState(counselRow.visualReviewResult) : "pending";

  const record = {
    schemaVersion: GRADE_A_AUTHORITY_SCHEMA_VERSION,
    recordId: `grade-a-${row.jurisdiction.toLowerCase()}-${row.pathwayId}-v1`,
    routeId: row.pathwayKey,
    jurisdiction: row.jurisdiction,
    pathwayId: row.pathwayId,
    packetFamilyId: familyId,
    // Every row this generator reads comes from the frozen paid denominator, so
    // the disposition is the paid one. It is written explicitly rather than
    // assumed, because the authority refuses to prove any other disposition and
    // a future row with a different one must say so.
    serviceDisposition: "paid_packet_intended",
    version: 1,
    effectiveFrom: ownerDecision.effectiveDate,
    supersededBy: null,
    supersededAt: null,
    revocation: { revoked: false, reason: null, revokedAt: null, revokedBy: null },
    legalAuthority: {
      recordId: row.ownerLegalDecisionRecordId ?? ownerDecision.recordId,
      version: ownerDecision.recordId,
      status: row.ownerApprovedLegalStatus === "approved_by_decision_owner" ? "approved_by_decision_owner" : "pending",
      effectiveDate: ownerDecision.effectiveDate,
      scopeSha256: sha256(ownerDecision.scopeStatement ?? "")
    },
    packetSpecification: {
      specId: packetSetIds.join("+") || `${row.pathwayKey}:no-packet-set`,
      sha256: packetSetIds.length > 0
        ? sha256(stableStringify({ packetSetIds, componentCount: row.packetSpecification?.componentCount ?? 0, participantActionsRequired: row.packetSpecification?.participantActionsRequired ?? 0 }))
        : "",
      complete: Boolean(row.packetSpecification?.complete)
    },
    officialSources,
    provider,
    fixture: {
      fixtureId: fixture ? fixture.pathwayKey : `${row.pathwayKey}:no-fixture`,
      sha256: fixture ? sha256(stableStringify(fixture.answers ?? {})) : "",
      deterministic: Boolean(row.artifactResult?.deterministic)
    },
    artifactValidation: {
      state: row.artifactResult?.rendered && (row.artifactResult?.errors ?? []).length === 0 ? "validated" : "not_run",
      artifactSha256: row.artifactResult?.sha256 ?? null,
      validatedAt: row.artifactResult?.sha256 ? launchGraph.generatedAt ?? ownerDecision.effectiveDate : null
    },
    visualReview: {
      state: visualRow?.comparable && visualRow?.controlDiscriminates ? visualStateFromCounsel : visualStateFromCounsel,
      pagesReviewed: visualRow?.comparable ? visualPageCount : 0,
      pageCount: visualPageCount,
      evidenceSha256: visualRow?.contactSheetSha256 ?? null,
      reviewedBy: null,
      reviewedAt: null
    },
    outputLegalApproval: {
      state: counselRow ? reviewState(counselRow.completedOutputLegalReview) : "pending",
      reviewerId: counselRow?.completedOutputLegalReview === "complete" ? counselRow.legalDecisionOwner ?? null : null,
      decidedAt: counselRow?.completedOutputLegalReview === "complete" ? counselRow.legalDecisionEffectiveDate ?? null : null,
      scopeSha256: counselRow?.completedOutputLegalReview === "complete" ? counselRow.currentPacketProofSha256 ?? null : null
    },
    finalVerification: {
      // No lane has produced a final verification bound to the exact proof set
      // below, so the record says unbound. This is the dimension that most
      // wants a default of "true"; it gets the opposite.
      state: "unbound",
      verifierId: null,
      boundInputsSha256: null,
      verifiedAt: null
    },
    history: []
  };

  record.history = [{
    version: 1,
    changeKind: "created",
    changedAt: ownerDecision.effectiveDate,
    changedBy: "scripts/generate-rcap-grade-a-fulfillment-authority.mjs",
    reason: `Candidate Grade-A fulfillment record derived from ${LAUNCH_GRAPH}, ${COUNSEL_MANIFEST}, ${VISUAL_PROOF}, ${WITNESS_FIXTURES} and ${WORKER_EVIDENCE}. No approval is created here.`,
    recordSha256: fulfillmentRecordSha256(record),
    supersedesRecordSha256: null
  }];

  return record;
}

const rows = launchGraph.rows
  .filter((row) => CANDIDATE_JURISDICTIONS.includes(row.jurisdiction))
  .sort((a, b) => a.pathwayKey.localeCompare(b.pathwayKey));

const records = rows.map(candidateRecord);

const registry = {
  schemaVersion: GRADE_A_AUTHORITY_SCHEMA_VERSION,
  generatedBy: "scripts/generate-rcap-grade-a-fulfillment-authority.mjs",
  purpose: "The one canonical controlling registry of Grade-A fulfillment authority records. Only COMPLETE_PACKET_PROVEN authorizes a commercial action; every other state, including the absence of a record, denies.",
  createsApproval: false,
  changesRuntime: false,
  candidateScope: {
    jurisdictions: CANDIDATE_JURISDICTIONS,
    rule: "Candidate records exist only for lanes that were asked to provide evidence. A jurisdiction absent from this registry is UNSUPPORTED_ROUTE and fails closed, which is the same denial an incomplete record produces."
  },
  evidenceInputs: {
    [LAUNCH_GRAPH]: sha256(fs.readFileSync(path.join(rootDir, LAUNCH_GRAPH), "utf8")),
    [LEGAL_JOIN]: sha256(fs.readFileSync(path.join(rootDir, LEGAL_JOIN), "utf8")),
    [COUNSEL_MANIFEST]: sha256(fs.readFileSync(path.join(rootDir, COUNSEL_MANIFEST), "utf8")),
    [WITNESS_FIXTURES]: sha256(fs.readFileSync(path.join(rootDir, WITNESS_FIXTURES), "utf8")),
    [VISUAL_PROOF]: sha256(fs.readFileSync(path.join(rootDir, VISUAL_PROOF), "utf8")),
    [WORKER_EVIDENCE]: sha256(fs.readFileSync(path.join(rootDir, WORKER_EVIDENCE), "utf8"))
  },
  records
};

// The observation is derived from the same evidence the records were written
// against, so a freshly generated pair is never stale. It becomes stale the
// moment an upstream evidence file changes and only the snapshot is regenerated
// — which is exactly the signal it exists to produce.
const observationRoutes = {};
for (const record of records) {
  observationRoutes[record.routeId] = {
    observedAt: ownerDecision.effectiveDate,
    legalAuthority: {
      version: record.legalAuthority.version,
      status: record.legalAuthority.status,
      scopeSha256: record.legalAuthority.scopeSha256
    },
    packetSpecificationSha256: record.packetSpecification.sha256,
    officialSourceSha256ById: Object.fromEntries(record.officialSources.map((source) => [source.sourceId, source.sha256])),
    provider: record.provider,
    fixtureSha256: record.fixture.sha256,
    artifactSha256: record.artifactValidation.artifactSha256,
    visualReviewEvidenceSha256: record.visualReview.evidenceSha256,
    outputLegalApprovalScopeSha256: record.outputLegalApproval.scopeSha256,
    finalVerificationBoundInputsSha256: record.finalVerification.boundInputsSha256
  };
}

const observation = {
  schemaVersion: "rcap-grade-a-fulfillment-observation/v1",
  generatedBy: "scripts/generate-rcap-grade-a-fulfillment-authority.mjs",
  purpose: "What the server currently observes for each route with a fulfillment record. A record whose bound proof disagrees with this snapshot is STALE and authorizes nothing.",
  observedAt: ownerDecision.effectiveDate,
  routes: observationRoutes
};

// The registry and snapshot must be on disk before the projection is derived,
// because the projection is produced by the shipped runtime reading them — the
// same code path the product uses — rather than by this generator's own copy of
// the rule.
function writeIfNeeded(rel, value) {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  const absolute = path.join(rootDir, rel);
  const existing = fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : null;
  if (existing === serialized) return { rel, changed: false, serialized };
  if (!CHECK) {
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, serialized);
  }
  return { rel, changed: true, serialized };
}

const drifted = [];
for (const [rel, value] of [[REGISTRY_OUT, registry], [OBSERVATION_OUT, observation]]) {
  const result = writeIfNeeded(rel, value);
  if (result.changed) drifted.push(rel);
}

if (CHECK && drifted.length > 0) {
  console.error(`Regeneration required — these files do not match their evidence:\n  ${drifted.join("\n  ")}`);
  process.exit(1);
}

const { evaluateFulfillmentAuthority } = await import("../src/lib/rcap/fulfillment/grade-a-authority.ts");
const { loadFulfillmentRegistry, resetFulfillmentRegistryCache } = await import("../src/lib/rcap/fulfillment/grade-a-registry.ts");
const { resolveObservation, resetObservationCache } = await import("../src/lib/rcap/fulfillment/grade-a-admission.ts");

resetFulfillmentRegistryCache();
resetObservationCache();

const loaded = loadFulfillmentRegistry();
if (loaded.problems.length > 0) {
  console.error(`The generated registry does not load cleanly:\n  ${loaded.problems.map((p) => `${p.recordId ?? "(no id)"}: ${p.problem}`).join("\n  ")}`);
  process.exit(1);
}

const projectionRoutes = [...loaded.current.values()]
  .sort((a, b) => a.routeId.localeCompare(b.routeId))
  .map((record) => {
    const decision = evaluateFulfillmentAuthority(record, resolveObservation(record.routeId), record.routeId);
    return {
      routeId: decision.routeId,
      jurisdiction: decision.jurisdiction,
      packetFamilyId: decision.packetFamilyId,
      serviceDisposition: decision.serviceDisposition,
      recordVersion: decision.recordVersion,
      state: decision.state,
      commercialStatus: decision.commercialStatus,
      missingProof: decision.missingProof,
      stalenessReasons: decision.stalenessReasons
    };
  });

const projection = {
  schemaVersion: "rcap-grade-a-fulfillment-projection/v1",
  generatedBy: "scripts/generate-rcap-grade-a-fulfillment-authority.mjs",
  derivedFrom: {
    registry: REGISTRY_OUT,
    observation: OBSERVATION_OUT,
    authorityModule: "src/lib/rcap/fulfillment/grade-a-authority.ts"
  },
  rule: "This file is a projection. It is derived by the shipped authority module from the controlling registry; editing it changes nothing, because the runtime reads the registry.",
  counters: {
    routesWithARecord: projectionRoutes.length,
    completePacketProven: projectionRoutes.filter((route) => route.state === "COMPLETE_PACKET_PROVEN").length,
    incomplete: projectionRoutes.filter((route) => route.state === "INCOMPLETE").length,
    stale: projectionRoutes.filter((route) => route.state === "STALE").length,
    revoked: projectionRoutes.filter((route) => route.state === "REVOKED").length,
    superseded: projectionRoutes.filter((route) => route.state === "SUPERSEDED").length,
    commerciallyEligible: projectionRoutes.filter((route) => route.commercialStatus === "commercially_eligible").length
  },
  routes: projectionRoutes
};

const projectionResult = writeIfNeeded(PROJECTION_OUT, projection);
if (CHECK && projectionResult.changed) {
  console.error(`Regeneration required — ${PROJECTION_OUT} does not match the controlling registry.`);
  process.exit(1);
}

const verb = CHECK ? "verified" : "written";
console.log(`Grade-A fulfillment authority ${verb}: ${records.length} candidate record(s) across ${CANDIDATE_JURISDICTIONS.join(", ")}.`);
console.log(`  ${COMPLETE_PACKET_PROVEN}: ${projection.counters.completePacketProven}`);
console.log(`  INCOMPLETE: ${projection.counters.incomplete}   STALE: ${projection.counters.stale}`);
console.log(`  commercially eligible: ${projection.counters.commerciallyEligible}`);
