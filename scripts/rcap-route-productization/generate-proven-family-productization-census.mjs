#!/usr/bin/env node
// PROVEN-FAMILY PRODUCTIZATION CENSUS
//
//   node scripts/rcap-route-productization/generate-proven-family-productization-census.mjs
//   node scripts/rcap-route-productization/generate-proven-family-productization-census.mjs --check
//
// One question: for every COMPLETE_PACKET_PROVEN packet family, what exactly
// stands between it and an open route, measured rather than assumed?
//
// The chain a proven family must walk is:
//
//   proven packet -> exact runtime route -> route-scoped artifact ->
//   current legal approval -> runtime wiring -> fulfillment-authority record ->
//   hosted consumer canary -> hosted sponsored canary -> operationally sellable
//
// This file builds no registry, no authority system and no launch graph. Every
// value below is copied or arithmetically derived from a record that already
// exists, and each row names the file it came from. In particular, the twenty-two
// generator preconditions P01..P22 are read off
// scripts/generate-rcap-grade-a-fulfillment-authority.mjs — they are that
// generator's own refusals, restated per family so a family's distance from a
// record is a measurement rather than an opinion.
//
// This census creates no approval, opens no route, sets no price, and grants no
// commercial authority. It writes one report and nothing else.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECK = process.argv.includes("--check");
const OUT = "data/rcap-grade-a/route-productization/PROVEN_FAMILY_PRODUCTIZATION_CENSUS.json";

const OWNER_SEPTEMBER = "OWN-ADOPT-2026-09-02-BATCH-53";
const OWNER_AUGUST = "auth-2026-08-19-owner-legal-approval-completed-output";
// The generator carries a codified track-authority memo input for these four
// jurisdictions only. A custom-pleading family outside them has no authority
// input for the generator to bind, whatever else it holds.
const CODIFIED_TRACK_JURISDICTIONS = new Set(["DC", "IL", "MS", "WY"]);

const INPUTS = {
  masterQueue: "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json",
  firstRouteCohort: "data/rcap-grade-a/FIRST_ROUTE_COHORT.json",
  routeObligationCrosswalk: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
  launchGraph: "data/rcap-ledger/launch-graph.json",
  routeRatification: "data/record-clearing/legal-decisions/route-ratification-registry.json",
  fulfillmentRegistry: "data/rcap-grade-a/fulfillment-authority-registry.json",
  fulfillmentProjection: "data/rcap-grade-a/fulfillment-authority-projection.json",
  ownerBatchAdoption: "data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json",
  counselManifest: "data/rcap-ledger/completed-output-counsel-manifest.json",
  postApprovalAudit: "data/rcap-grade-a/legal-decisions/POST_APPROVAL_CHANGE_AUDIT_2026-09-02.json",
  rasterQueue: "data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json",
  verifierReturns: "data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json",
  routeArtifactAcceptance: "data/rcap-grade-a/route-artifact-acceptance/ROUTE_ARTIFACT_ACCEPTANCE.json",
  witnessFixtures: "data/rcap-ledger/public-witness-fixtures.json",
  factoryV2Registry: "data/record-clearing/factory-v2-route-registry.json",
  hostedAcceptanceJourneys: "data/rcap-all50/hosted-acceptance-journeys.json"
};

const readBytes = (rel) => fs.readFileSync(path.join(ROOT, rel));
const read = (rel) => JSON.parse(readBytes(rel).toString("utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const fileSha256 = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? sha256(readBytes(rel)) : null);
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const queue = read(INPUTS.masterQueue);
const cohort = read(INPUTS.firstRouteCohort);
const crosswalk = read(INPUTS.routeObligationCrosswalk);
const launchGraph = read(INPUTS.launchGraph);
const ratification = read(INPUTS.routeRatification);
const fulfillment = read(INPUTS.fulfillmentRegistry);
const projection = read(INPUTS.fulfillmentProjection);
const ownerAdoption = read(INPUTS.ownerBatchAdoption);
const counselManifest = read(INPUTS.counselManifest);
const postApprovalAudit = read(INPUTS.postApprovalAudit);
const rasterQueue = read(INPUTS.rasterQueue);
const verifierReturns = read(INPUTS.verifierReturns);
const routeArtifacts = read(INPUTS.routeArtifactAcceptance);
const witnessFixtures = read(INPUTS.witnessFixtures);
const factoryV2 = read(INPUTS.factoryV2Registry);

// ---------------------------------------------------------------- indexes ---
const crosswalkByRouteKey = new Map(crosswalk.routes.map((r) => [r.routeKey, r]));
const launchByRouteId = new Map(launchGraph.rows.map((r) => [r.pathwayKey, r]));
const ratifyByRouteId = new Map(ratification.routes.map((r) => [r.routeKey, r]));
const factoryByRouteId = new Map(factoryV2.routes.map((r) => [r.pathwayKey, r]));
const recordByRouteId = new Map(fulfillment.records.map((r) => [r.routeId, r]));
const projectionByRouteId = new Map(projection.routes.map((r) => [r.routeId, r]));
const cohortRowByFamily = new Map((cohort.allRows ?? []).map((r) => [r.familyId, r]));
const cohortFamilies = new Set((cohort.cohort ?? []).map((r) => r.familyId));
const auditByFamily = new Map(postApprovalAudit.families.map((f) => [f.familyId, f]));
const augustApprovedFamily = new Map(counselManifest.families.map((f) => [f.familyId, f]));
const witnessByRouteId = new Map(witnessFixtures.fixtures.map((f) => [f.pathwayKey, f]));

const rasterByFamily = new Map();
for (const row of [...rasterQueue.rows, ...(rasterQueue.historicalRasterRows ?? [])]) {
  const prior = rasterByFamily.get(row.familyId);
  if (!prior || (prior.currentRasterState !== "RASTER_PASS" && row.currentRasterState === "RASTER_PASS")) {
    rasterByFamily.set(row.familyId, row);
  }
}

const currentVerifierRowsByFamily = new Map();
for (const row of verifierReturns.rows) {
  if (!row.familyId || row.superseded !== false) continue;
  if (!currentVerifierRowsByFamily.has(row.familyId)) currentVerifierRowsByFamily.set(row.familyId, []);
  currentVerifierRowsByFamily.get(row.familyId).push(row);
}

const routeArtifactRowsByFamily = new Map();
for (const row of routeArtifacts.rows ?? []) {
  if (!routeArtifactRowsByFamily.has(row.familyId)) routeArtifactRowsByFamily.set(row.familyId, []);
  routeArtifactRowsByFamily.get(row.familyId).push(row);
}

const septemberPinsByFamily = new Map();
const septemberQualificationByFamily = new Map();
for (const qualification of ownerAdoption.adoption.qualifications ?? []) {
  for (const familyId of qualification.families ?? []) {
    septemberPinsByFamily.set(familyId, (qualification.digestConditionRecordedPerFamily ?? {})[familyId] ?? null);
    septemberQualificationByFamily.set(familyId, qualification.ownerNote);
  }
}

const SPEC_DIR = "data/record-clearing/packet-specifications";
const specByRouteId = new Map();
for (const file of fs.readdirSync(path.join(ROOT, SPEC_DIR)).sort()) {
  if (!file.endsWith(".json")) continue;
  const rel = path.posix.join(SPEC_DIR, file);
  const doc = read(rel);
  for (const key of [doc.routeKey, ...(doc.routeKeys ?? [])].filter(Boolean)) {
    if (!specByRouteId.has(key)) specByRouteId.set(key, { path: rel, doc });
  }
}

// ------------------------------------------------- route identity per key ---
// The crosswalk is the existing answer to "what runtime route is this?" and it
// is read rather than recomputed. Where it says null, the route has no runtime
// identity, and this census records the absence rather than inventing one.
function routesFor(family) {
  return family.routeKeys.map((routeKey) => {
    const entry = crosswalkByRouteKey.get(routeKey) ?? null;
    let routeId = entry?.routeContractId ?? null;
    if (!routeId && entry?.runtimePathwayId) routeId = `${family.jurisdiction}:${entry.runtimePathwayId}`;
    const launch = routeId ? launchByRouteId.get(routeId) ?? null : null;
    const spec = routeId ? specByRouteId.get(routeId) ?? null : specByRouteId.get(routeKey) ?? null;
    const witness = routeId ? witnessByRouteId.get(routeId) ?? null : null;
    const record = routeId ? recordByRouteId.get(routeId) ?? null : null;
    const projected = routeId ? projectionByRouteId.get(routeId) ?? null : null;
    return {
      obligationRouteKey: routeKey,
      obligationRouteKind: routeKey.split(":")[1] ?? null,
      exactRuntimeRouteId: routeId,
      exactRuntimeRouteIdSource: routeId
        ? (entry?.routeContractId ? `${INPUTS.routeObligationCrosswalk}:routeContractId` : `${INPUTS.routeObligationCrosswalk}:runtimePathwayId`)
        : null,
      whyThereIsNoRuntimeRouteId: routeId
        ? null
        : `${INPUTS.routeObligationCrosswalk} carries runtimePathwayId=null and routeContractId=null for this obligation; currentServiceDisposition=${entry?.currentServiceDisposition ?? "absent"}`,
      currentServiceDisposition: entry?.currentServiceDisposition ?? null,
      currentCommercialState: entry?.currentCommercialState ?? null,
      inLaunchGraph: Boolean(launch),
      launchGraphAvailability: launch?.availability ?? null,
      launchGraphUnmetOperationalGates: launch?.unmetOperationalGates ?? null,
      launchGraphPaymentAllowed: launch?.operationalGates?.paymentAllowed ?? null,
      launchGraphOperationallySellable: launch?.operationallySellable ?? null,
      launchGraphFulfillmentAuthorityAdmitted: launch?.fulfillmentAuthorityAdmitted ?? null,
      factoryV2Admitted: routeId ? Boolean(factoryByRouteId.get(routeId)?.admitted) : null,
      ratificationStatus: routeId
        ? (ratifyByRouteId.get(routeId)?.status ?? "absent_from_route_ratification_registry")
        : "no_runtime_route_to_ratify",
      ratificationDecisionAuthority: routeId ? ratifyByRouteId.get(routeId)?.decisionAuthority ?? null : null,
      packetSpecification: spec
        ? {
          path: spec.path,
          sha256: fileSha256(spec.path),
          legalSectionsBound: spec.doc.legalSectionsBound === true,
          legalSectionsBoundByOwnerDecisionRecordId: spec.doc.legalSectionsBoundBy?.ownerDecisionRecordId ?? null,
          approvedArtifactCount: spec.doc.approvedArtifacts?.length ?? 0
        }
        : null,
      publicWitnessFixture: witness
        ? { present: true, expectedPaymentAllowed: witness.expected?.paymentAllowed ?? null }
        : { present: false, expectedPaymentAllowed: null },
      fulfillmentAuthorityRecord: record
        ? {
          exists: true,
          recordId: record.recordId,
          schemaVersion: record.schemaVersion,
          projectedState: projected?.state ?? null,
          projectedCommercialStatus: projected?.commercialStatus ?? null,
          missingProof: projected?.missingProof ?? []
        }
        : { exists: false, recordId: null, schemaVersion: null, projectedState: null, projectedCommercialStatus: null, missingProof: [] }
    };
  });
}

// ------------------------------- the generator's own preconditions, P01..P22 --
// Each entry restates one refusal in scripts/generate-rcap-grade-a-fulfillment-authority.mjs.
const PRECONDITION_CATALOGUE = {
  P01: "the obligation route resolves to an exact runtime route id",
  P02: "a packet specification file names that exact route",
  P03: "specification.legalSectionsBound === true",
  P04: `specification.legalSectionsBoundBy.ownerDecisionRecordId === ${OWNER_SEPTEMBER}`,
  P05: "specification.approvedArtifacts holds exactly the canonical and boundary fixtures",
  P06: "public-witness-fixtures.json carries a fixture for the exact route",
  P07: "that fixture expects paymentAllowed === false",
  P08: `${OWNER_SEPTEMBER} pins both shipping fixtures for the family`,
  P09: "those pinned digests still match the bytes on disk",
  P10: "a post-approval change-audit row exists for the family",
  P11: "that audit verdict is COVERED_BY_EXISTING_APPROVAL",
  P12: `that audit was reviewed against ${OWNER_SEPTEMBER}`,
  P13: "that audit sets mayEnterTheFirstCohort = true",
  P14: "that audit binds both current shipping fixture hashes",
  P15: "that audit carries current raster pins",
  P16: "the family has exactly one current independent-verification registry row",
  P17: "that row is a PASS_COMPLETE_INDEPENDENT independent verdict",
  P18: "that row carries no failed or unmeasured obligations",
  P19: "the family's current raster state is RASTER_PASS",
  P20: "its raster receipt is a successful governed pass",
  P21: "its raster receipt covers the whole family",
  P22: "the generator carries a codified track-authority memo input for the jurisdiction"
};

function preconditionsFor(family, routes) {
  const unmet = [];
  const add = (id, detail) => unmet.push({ id, requirement: PRECONDITION_CATALOGUE[id], measured: detail });

  if (!routes.every((r) => r.exactRuntimeRouteId)) {
    add("P01", `${routes.filter((r) => !r.exactRuntimeRouteId).length} of ${routes.length} obligation route keys resolve to no runtime route id`);
  }
  if (!routes.every((r) => r.packetSpecification)) add("P02", "no packet specification names every route this family serves");
  if (!routes.every((r) => r.packetSpecification?.legalSectionsBound === true)) add("P03", "legalSectionsBound is false or the specification is absent");
  if (!routes.every((r) => r.packetSpecification?.legalSectionsBoundByOwnerDecisionRecordId === OWNER_SEPTEMBER)) {
    add("P04", `bound by ${[...new Set(routes.map((r) => r.packetSpecification?.legalSectionsBoundByOwnerDecisionRecordId ?? "nothing"))].join(", ")}`);
  }
  if (!routes.every((r) => r.packetSpecification?.approvedArtifactCount === 2)) {
    add("P05", `approvedArtifacts count ${[...new Set(routes.map((r) => r.packetSpecification?.approvedArtifactCount ?? 0))].join(", ")}`);
  }
  if (!routes.every((r) => r.publicWitnessFixture.present)) add("P06", "at least one route has no public witness fixture");
  if (routes.some((r) => r.publicWitnessFixture.expectedPaymentAllowed === true)) {
    add("P07", `the evaluator currently allows payment for ${routes.filter((r) => r.publicWitnessFixture.expectedPaymentAllowed === true).map((r) => r.exactRuntimeRouteId).join(", ")}`);
  }

  const pins = septemberPinsByFamily.get(family.familyId) ?? null;
  if (!pins || pins.length !== 2) add("P08", pins ? `${pins.length} pinned fixtures` : `family is outside ${OWNER_SEPTEMBER}`);
  else {
    const drifted = pins.filter((p) => fileSha256(p.file) !== p.sha256);
    if (drifted.length) add("P09", `${drifted.length} pinned digest(s) no longer match the bytes on disk`);
  }

  const audit = auditByFamily.get(family.familyId) ?? null;
  if (!audit) add("P10", "no row in POST_APPROVAL_CHANGE_AUDIT_2026-09-02.json");
  else {
    if (audit.verdict !== "COVERED_BY_EXISTING_APPROVAL") add("P11", `verdict is ${audit.verdict}`);
    if (audit.reviewedAgainstApprovalRecordId !== OWNER_SEPTEMBER) {
      add("P12", `row cites ${audit.reviewedAgainstApprovalRecordId ?? "no approval record"}`);
    }
    if (audit.mayEnterTheFirstCohort !== true) add("P13", "mayEnterTheFirstCohort is not true");
    if ((audit.currentShippingArtifact?.fixtures?.length ?? 0) !== 2) add("P14", "the row is narrative and binds no current fixture hashes");
    if (!audit.currentRasterPins) add("P15", "the row carries no current raster pins");
  }

  const currentRows = currentVerifierRowsByFamily.get(family.familyId) ?? [];
  if (currentRows.length !== 1) add("P16", `${currentRows.length} current non-superseded verifier rows`);
  const pass = currentRows.find((r) => r.isIndependentVerification && r.verdict === "PASS_COMPLETE_INDEPENDENT") ?? null;
  if (!pass) add("P17", `current verdicts: ${currentRows.map((r) => r.verdict).join(", ") || "none"}`);
  else if ((pass.failedObligations?.length ?? 0) > 0 || (pass.unmeasuredObligations?.length ?? 0) > 0) {
    add("P18", `${pass.failedObligations?.length ?? 0} failed and ${pass.unmeasuredObligations?.length ?? 0} unmeasured obligations`);
  }

  const raster = rasterByFamily.get(family.familyId) ?? null;
  if (raster?.currentRasterState !== "RASTER_PASS") add("P19", `raster state ${raster?.currentRasterState ?? "not enrolled"}`);
  else {
    if (raster.rasterReceipt?.verdict !== "RASTER_PASS" || raster.rasterReceipt?.jobConclusion !== "success") {
      add("P20", `receipt verdict ${raster.rasterReceipt?.verdict ?? "absent"} / job ${raster.rasterReceipt?.jobConclusion ?? "absent"}`);
    }
    if (raster.rasterReceipt?.coversTheWholeFamily !== true) add("P21", "receipt does not cover the whole family");
  }

  if (!CODIFIED_TRACK_JURISDICTIONS.has(family.jurisdiction)) {
    add("P22", `${family.jurisdiction} has no codified track-authority input in the generator`);
  }
  return unmet;
}

// -------------------------------------------- preconditions grouped into steps --
// A "step" is one coherent unit of work with one owner. Distance to a
// fulfillment-authority record is the number of distinct steps a family still
// owes, not the number of preconditions, because several preconditions close
// together the moment one document is written.
const STEPS = {
  S1_compileRuntimePathway: {
    preconditions: ["P01"],
    owner: "engineering",
    onlyRogerCanDoThis: false,
    work: "compile a runtime pathway for the obligation so it acquires a jurisdiction:pathwayId identity"
  },
  S2_authorPacketSpecification: {
    preconditions: ["P02"],
    owner: "engineering",
    onlyRogerCanDoThis: false,
    work: "author the route's packet specification under data/record-clearing/packet-specifications/"
  },
  S3_bindSpecificationToTheOwnerDecision: {
    preconditions: ["P03", "P04", "P05"],
    owner: "engineering, only once an owner decision covers the family",
    onlyRogerCanDoThis: false,
    work: "set legalSectionsBound, legalSectionsBoundBy and approvedArtifacts on the specification, citing the owner decision that already covers the family"
  },
  S4_obtainCompletedOutputOwnerApproval: {
    preconditions: ["P08"],
    owner: "Roger",
    onlyRogerCanDoThis: true,
    work: "adopt the family's completed output and pin its exact shipping-artifact digests"
  },
  S5_reReviewAfterDigestDrift: {
    preconditions: ["P09"],
    owner: "Roger",
    onlyRogerCanDoThis: true,
    work: "re-review the family because an approved shipping-artifact digest moved"
  },
  S6_expandThePostApprovalChangeAuditRow: {
    preconditions: ["P10", "P12", "P13", "P14", "P15"],
    owner: "a Captain audit lane reading diffs",
    onlyRogerCanDoThis: false,
    work: "write or expand the family's post-approval change-audit row to the machine-checkable shape"
  },
  S7_newOwnerDecision: {
    preconditions: ["P11"],
    owner: "Roger",
    onlyRogerCanDoThis: true,
    work: "make a new decision, because the audit already ruled the changes require one"
  },
  S8_produceOneCurrentIndependentPass: {
    preconditions: ["P16", "P17", "P18"],
    owner: "an independent verifier lane",
    onlyRogerCanDoThis: false,
    work: "leave exactly one current PASS_COMPLETE_INDEPENDENT row over the current bytes"
  },
  S9_obtainAGovernedRasterPass: {
    preconditions: ["P19", "P20", "P21"],
    owner: "the central raster acceptance workflow",
    onlyRogerCanDoThis: false,
    work: "take the family through central raster acceptance until its receipt binds the current digests"
  },
  S10_addThePublicWitnessFixture: {
    preconditions: ["P06"],
    owner: "engineering",
    onlyRogerCanDoThis: false,
    work: "regenerate public-witness-fixtures.json so the exact route acquires its probe row"
  },
  S11_resolveTheOpenEvaluatorPaymentGate: {
    preconditions: ["P07"],
    owner: "Roger",
    onlyRogerCanDoThis: true,
    work: "decide what to do about a route whose evaluator payment gate is already open while its fulfillment layer refuses"
  },
  S12_addTheCodifiedTrackAuthorityInput: {
    preconditions: ["P22"],
    owner: "engineering",
    onlyRogerCanDoThis: false,
    work: "add the jurisdiction's codified track-authority memo input to the generator, pinned by digest"
  }
};
const STEP_BY_PRECONDITION = new Map();
for (const [stepId, step] of Object.entries(STEPS)) {
  for (const id of step.preconditions) STEP_BY_PRECONDITION.set(id, stepId);
}
function stepsFor(unmet) {
  const seen = new Map();
  for (const u of unmet) {
    const stepId = STEP_BY_PRECONDITION.get(u.id);
    if (!stepId) continue;
    if (!seen.has(stepId)) seen.set(stepId, { stepId, ...STEPS[stepId], closesPreconditions: [] });
    seen.get(stepId).closesPreconditions.push(u.id);
  }
  return [...seen.values()];
}

// ------------------------------------------------------ the chain, per family --
const CHAIN = [
  "provenPacket",
  "exactRuntimeRoute",
  "routeScopedArtifact",
  "currentLegalApproval",
  "runtimeWiring",
  "fulfillmentAuthorityRecord",
  "hostedConsumerCanary",
  "hostedSponsoredCanary",
  "operationallySellable"
];

function chainFor(family, routes, unmetPreconditions) {
  const withRoute = routes.filter((r) => r.exactRuntimeRouteId);
  const artifactRows = routeArtifactRowsByFamily.get(family.familyId) ?? [];
  const raster = rasterByFamily.get(family.familyId) ?? null;
  const septemberNote = septemberQualificationByFamily.get(family.familyId) ?? null;
  const august = augustApprovedFamily.get(family.familyId) ?? null;
  const audit = auditByFamily.get(family.familyId) ?? null;
  const pins = septemberPinsByFamily.get(family.familyId) ?? null;
  const digestsCurrent = pins ? pins.every((p) => fileSha256(p.file) === p.sha256) : null;

  return {
    provenPacket: {
      met: family.state === "COMPLETE_PACKET_PROVEN",
      basis: `${INPUTS.masterQueue}:families[${family.familyId}].state=${family.state}`
    },
    exactRuntimeRoute: {
      met: withRoute.length === routes.length && routes.length > 0,
      routeIds: withRoute.map((r) => r.exactRuntimeRouteId),
      obligationKeysWithoutARuntimeRoute: routes.filter((r) => !r.exactRuntimeRouteId).map((r) => r.obligationRouteKey)
    },
    routeScopedArtifact: {
      met: artifactRows.length > 0 || (family.routeCount === 1 && family.artifactStatus === "RENDERED"),
      basis: artifactRows.length > 0
        ? `${INPUTS.routeArtifactAcceptance} carries ${artifactRows.length} per-route artifact row(s) for this family`
        : family.routeCount === 1 && family.artifactStatus === "RENDERED"
          ? "one route, one family: the family assembly is the route artifact"
          : `the family serves ${family.routeCount} routes and no per-route artifact row exists, so the family assembly is not route-scoped`,
      rasterState: raster?.currentRasterState ?? "NOT_ENROLLED"
    },
    currentLegalApproval: {
      met: Boolean(septemberNote || august) && digestsCurrent !== false && audit?.verdict === "COVERED_BY_EXISTING_APPROVAL",
      instrument: septemberNote ? OWNER_SEPTEMBER : august ? OWNER_AUGUST : null,
      ownerQualification: septemberNote,
      approvedShippingDigestsStillCurrent: digestsCurrent,
      postApprovalChangeAuditVerdict: audit?.verdict ?? "no_post_approval_change_audit_row",
      auditIsMachineCheckable: audit ? Boolean(audit.currentShippingArtifact && audit.currentRasterPins) : false
    },
    runtimeWiring: {
      met: withRoute.length > 0 && withRoute.every((r) => r.inLaunchGraph),
      routesInLaunchGraph: withRoute.filter((r) => r.inLaunchGraph).map((r) => r.exactRuntimeRouteId),
      routesAbsentFromLaunchGraph: withRoute.filter((r) => !r.inLaunchGraph).map((r) => r.exactRuntimeRouteId)
    },
    fulfillmentAuthorityRecord: {
      met: withRoute.length > 0 && withRoute.every((r) => r.fulfillmentAuthorityRecord.exists),
      routesWithARecord: withRoute.filter((r) => r.fulfillmentAuthorityRecord.exists).map((r) => r.exactRuntimeRouteId),
      unmetGeneratorPreconditionCount: unmetPreconditions.length
    },
    hostedConsumerCanary: {
      met: false,
      basis: "no hosted consumer canary receipt exists in this repository for any route; the only hosted-canary return on record, data/rcap-grade-a/codex-cloud/cs2-hosted-canary-first4-4ceb/RETURN.json, records zero canaries executed"
    },
    hostedSponsoredCanary: {
      met: false,
      basis: "no hosted sponsored canary receipt exists in this repository for any route"
    },
    operationallySellable: {
      met: false,
      basis: withRoute.length
        ? withRoute.map((r) => `${r.exactRuntimeRouteId}: operationallySellable=${r.launchGraphOperationallySellable ?? "absent from the launch graph"}`).join("; ")
        : "there is no runtime route that could be sellable"
    }
  };
}

// ------------------------------------------------------------ next action ---
// One action per family, chosen as the earliest unmet link in the chain, and
// named against the mechanism that would close it. Where an action can only be
// taken by the decision owner or an external issuer, it is marked so.
function nextActionFor(family, routes, chain, unmet) {
  const unmetIds = new Set(unmet.map((u) => u.id));
  const dispositions = [...new Set(routes.map((r) => String(r.currentServiceDisposition)))];
  const commercialStates = [...new Set(routes.map((r) => String(r.currentCommercialState)))];

  if (!chain.exactRuntimeRoute.met) {
    if (dispositions.includes("product_scope_exclusion")) {
      return {
        blocker: "PRODUCT_SCOPE_EXCLUSION",
        owner: "nobody",
        onlyRogerCanDoThis: false,
        action: "None. This route is typed out of the product, so there is nothing to productize.",
        why: `${INPUTS.routeObligationCrosswalk} types this obligation currentServiceDisposition=product_scope_exclusion.`
      };
    }
    if (dispositions.some((d) => d.startsWith("current_decision"))) {
      return {
        blocker: "DECISION_BRANCH_HAS_NO_RUNTIME_ROUTE",
        owner: "legal design, then engineering",
        onlyRogerCanDoThis: false,
        action: "Adjudicate this decision branch into an approved legal-design track and compile a runtime pathway for it, before any route identity can exist.",
        why: `The obligation is a decision branch, not a route: currentCommercialState=${commercialStates.join(", ")} and the crosswalk carries no runtimePathwayId.`
      };
    }
    if (dispositions.some((d) => d.startsWith("unit_parent_represented_by_runtime"))) {
      return {
        blocker: "UNIT_HAS_NO_ROUTE_OF_ITS_OWN",
        owner: "engineering",
        onlyRogerCanDoThis: false,
        action: "Compile a runtime pathway for this unit, or record an explicit unit-to-parent route binding; the parent route id may not stand in for the unit.",
        why: `currentServiceDisposition=${dispositions.join(", ")}; currentCommercialState=${commercialStates.join(", ")}.`
      };
    }
    if (dispositions.includes("explicit_legal_design_unit")) {
      return {
        blocker: "LEGAL_DESIGN_UNIT_HAS_NO_RUNTIME_ROUTE",
        owner: "engineering",
        onlyRogerCanDoThis: false,
        action: "Compile a runtime pathway for this legal-design unit so it acquires a jurisdiction:pathwayId identity.",
        why: `currentCommercialState=${commercialStates.join(", ")} and the crosswalk carries no runtimePathwayId.`
      };
    }
    return {
      blocker: "NO_COMPILED_RUNTIME_PATHWAY",
      owner: "engineering",
      onlyRogerCanDoThis: false,
      action: "Add a compiled runtime pathway under src/lib/rcap-engine/compiled/profiles/ for this obligation, exactly as the Kansas municipal lane did, so screening, the Briefcase, payment and rendering have a route id to agree on.",
      why: `${INPUTS.routeObligationCrosswalk} carries runtimePathwayId=null for ${chain.exactRuntimeRoute.obligationKeysWithoutARuntimeRoute.join(", ")}; currentServiceDisposition=${dispositions.join(", ")}.`
    };
  }

  if (chain.fulfillmentAuthorityRecord.met) {
    return {
      blocker: "AWAITING_HOSTED_CANARIES_AND_THE_LAUNCH_GATES",
      owner: "Roger",
      onlyRogerCanDoThis: true,
      action: `A fulfillment-authority record exists for ${chain.fulfillmentAuthorityRecord.routesWithARecord.join(", ")}. What remains is outside this repository: a page-by-page visual review by a named reviewer, a hosted consumer canary and a hosted sponsored canary in a non-production hosted environment, and then the owner-controlled gates. Remaining launch-graph gates: ${[...new Set(routes.flatMap((r) => r.launchGraphUnmetOperationalGates ?? []))].join(", ") || "none"}.`,
      why: "Every in-repository link is closed for this family; the next three links each need a hosted environment or a named human."
    };
  }

  // Has a runtime route but no record: name the earliest generator refusal that
  // is not itself downstream of a decision only the owner can make.
  if (unmetIds.has("P08") && !septemberQualificationByFamily.has(family.familyId) && !augustApprovedFamily.has(family.familyId)) {
    return {
      blocker: "NO_COMPLETED_OUTPUT_LEGAL_APPROVAL_FOR_THIS_FAMILY",
      owner: "Roger",
      onlyRogerCanDoThis: true,
      action: `Roger must adopt family ${family.familyId} at the completed-output level, naming its exact shipping-artifact digests, as ${OWNER_SEPTEMBER} did for 53 other families. No agent may write this record.`,
      why: `The family appears in neither ${OWNER_AUGUST} nor ${OWNER_SEPTEMBER}, so the generator has no legal authority to bind.`
    };
  }
  if (unmetIds.has("P09")) {
    return {
      blocker: "APPROVED_SHIPPING_DIGEST_MOVED_SINCE_APPROVAL",
      owner: "Roger",
      onlyRogerCanDoThis: true,
      action: `Roger must re-review family ${family.familyId}: its approved shipping-artifact digest no longer matches the bytes on disk.`,
      why: `${OWNER_SEPTEMBER} carries the travelling condition that any shipping-artifact digest change requires re-review.`
    };
  }
  if (unmetIds.has("P11")) {
    return {
      blocker: "AUDIT_ALREADY_RULED_A_NEW_OWNER_DECISION_IS_REQUIRED",
      owner: "Roger",
      onlyRogerCanDoThis: true,
      action: `Roger must make a new decision for family ${family.familyId}; the post-approval change audit already ruled the changes fall on the list that requires one.`,
      why: `${INPUTS.postApprovalAudit} verdict is ${auditByFamily.get(family.familyId)?.verdict}.`
    };
  }
  if (unmetIds.has("P03") || unmetIds.has("P04")) {
    return {
      blocker: "SPECIFICATION_LEGAL_SECTIONS_UNBOUND",
      owner: "Roger, then engineering",
      onlyRogerCanDoThis: true,
      action: `Bind the packet specification's legal sections to an owner decision. legalSectionsBoundBy names an owner decision record and a post-approval audit verdict, so the binding is a legal act: Roger must first cover this family's completed output under ${OWNER_SEPTEMBER} or a successor, and only then can the specification carry the binding.`,
      why: `${routes.map((r) => `${r.exactRuntimeRouteId}: legalSectionsBound=${r.packetSpecification?.legalSectionsBound ?? "no specification"}`).join("; ")}.`
    };
  }
  if (unmetIds.has("P02")) {
    return {
      blocker: "NO_PACKET_SPECIFICATION",
      owner: "engineering",
      onlyRogerCanDoThis: false,
      action: "Author the route's packet specification under data/record-clearing/packet-specifications/, covering the nine completeness dimensions as the fourteen existing specifications do.",
      why: "No packet specification file names this family's runtime routes."
    };
  }
  if (unmetIds.has("P05")) {
    return {
      blocker: "SPECIFICATION_BINDS_NO_APPROVED_ARTIFACTS",
      owner: "engineering",
      onlyRogerCanDoThis: false,
      action: "Add the approvedArtifacts block to the specification, binding the canonical and boundary fixtures with their exact digests, byte lengths, page counts and components.",
      why: "The specification is legally bound but carries no approvedArtifacts, so the generator has no artifact identity to copy into the record."
    };
  }
  if (unmetIds.has("P10") || unmetIds.has("P12") || unmetIds.has("P14") || unmetIds.has("P15")) {
    return {
      blocker: "NO_MACHINE_CHECKABLE_POST_APPROVAL_CHANGE_AUDIT_ROW",
      owner: "Captain lane, reading diffs",
      onlyRogerCanDoThis: false,
      action: `Expand this family's row in ${INPUTS.postApprovalAudit} to the machine-checkable shape the DC, IL, MS, NV, VA and WY rows already carry: reviewedAgainstApprovalRecordId, currentShippingArtifact fixture hashes, currentSourceIdentity, currentIndependentVerification and currentRasterPins. The row classifies diffs against the decision record's own two lists; it creates no approval.`,
      why: unmet.filter((u) => ["P10", "P12", "P14", "P15"].includes(u.id)).map((u) => `${u.id}: ${u.measured}`).join("; ")
    };
  }
  if (unmetIds.has("P16") || unmetIds.has("P17") || unmetIds.has("P18")) {
    return {
      blocker: "NO_SINGLE_CURRENT_INDEPENDENT_PASS",
      owner: "an independent verifier lane",
      onlyRogerCanDoThis: false,
      action: "Run an independent verifier lane over the current bytes and leave exactly one current PASS_COMPLETE_INDEPENDENT row with its verified base, superseding the others.",
      why: unmet.filter((u) => ["P16", "P17", "P18"].includes(u.id)).map((u) => `${u.id}: ${u.measured}`).join("; ")
    };
  }
  if (unmetIds.has("P19") || unmetIds.has("P20") || unmetIds.has("P21")) {
    return {
      blocker: "NO_GOVERNED_RASTER_PASS",
      owner: "the central raster acceptance workflow",
      onlyRogerCanDoThis: false,
      action: "Take the family through the central raster acceptance workflow until its row is RASTER_PASS, bound to the current canonical and boundary digests and covering the whole family.",
      why: unmet.filter((u) => ["P19", "P20", "P21"].includes(u.id)).map((u) => `${u.id}: ${u.measured}`).join("; ")
    };
  }
  if (unmetIds.has("P06")) {
    return {
      blocker: "NO_PUBLIC_WITNESS_FIXTURE",
      owner: "engineering",
      onlyRogerCanDoThis: false,
      action: "Regenerate data/rcap-ledger/public-witness-fixtures.json with scripts/generate-rcap-witness-divergence-diagnosis.mjs so the exact route acquires its probe row.",
      why: "The generator refuses a record for a route the witness fixtures do not reach."
    };
  }
  if (unmetIds.has("P07")) {
    return {
      blocker: "EVALUATOR_ALREADY_ALLOWS_PAYMENT_FOR_THIS_ROUTE",
      owner: "Roger",
      onlyRogerCanDoThis: true,
      action: `Decide what to do about a route whose evaluator gate is already open while its fulfillment layer refuses: ${routes.filter((r) => r.publicWitnessFixture.expectedPaymentAllowed === true).map((r) => r.exactRuntimeRouteId).join(", ")}. The generator refuses to write a record for a route whose witness fixture no longer expects payment to stay closed.`,
      why: "public-witness-fixtures.json records expected.paymentAllowed=true for this route, measured against the real evaluator."
    };
  }
  if (unmetIds.has("P22")) {
    return {
      blocker: "NO_CODIFIED_TRACK_AUTHORITY_INPUT_FOR_THIS_JURISDICTION",
      owner: "engineering, after the legal instrument is settled",
      onlyRogerCanDoThis: false,
      action: `Add a codified track-authority input for ${family.jurisdiction} to CODIFIED_TRACK_INPUTS in scripts/generate-rcap-grade-a-fulfillment-authority.mjs, pinning the jurisdiction's legal-design memo by digest. The generator carries DC, IL, MS and WY only.`,
      why: `${family.jurisdiction} has no entry in the generator's codified track-authority table.`
    };
  }
  return {
    blocker: "READY_FOR_FULFILLMENT_AUTHORITY_GENERATION",
    owner: "engineering",
    onlyRogerCanDoThis: false,
    action: "Add this route to EXACT_PRODUCTIZED_ROUTES in scripts/generate-rcap-grade-a-fulfillment-authority.mjs and regenerate.",
    why: "Every one of the generator's twenty-two preconditions is met and no record exists."
  };
}

// ------------------------------------------------------------------ rows ----
function rowFor(family) {
  const routes = routesFor(family);
  const unmet = preconditionsFor(family, routes);
  const chain = chainFor(family, routes, unmet);
  const remainingSteps = stepsFor(unmet);
  const na = nextActionFor(family, routes, chain, unmet);
  const firstUnmetLink = CHAIN.find((link) => !chain[link].met) ?? null;
  return {
    familyId: family.familyId,
    jurisdiction: family.jurisdiction,
    factoryState: family.state,
    implementationStrategy: family.implementationStrategy,
    routeCount: family.routeCount,
    inFirstRouteCohort: cohortFamilies.has(family.familyId),
    firstRouteCohortUnmetConditions: cohortRowByFamily.get(family.familyId)?.unmetConditions ?? null,
    routes,
    chain,
    chainFirstUnmetLink: firstUnmetLink,
    unmetGeneratorPreconditions: unmet,
    unmetGeneratorPreconditionCount: unmet.length,
    remainingStepsToAFulfillmentRecord: remainingSteps,
    remainingStepCount: remainingSteps.length,
    remainingStepsOnlyRogerCanTake: remainingSteps.filter((x) => x.onlyRogerCanDoThis).map((x) => x.stepId),
    blocker: na.blocker,
    blockerOwner: na.owner,
    onlyRogerCanDoThis: na.onlyRogerCanDoThis,
    singleNextAction: na.action,
    why: na.why
  };
}

const provenFamilies = queue.families.filter((f) => f.state === "COMPLETE_PACKET_PROVEN").map(rowFor)
  .sort((a, b) => a.unmetGeneratorPreconditionCount - b.unmetGeneratorPreconditionCount || a.familyId.localeCompare(b.familyId));

// ------------------------------------ PRODUCT_PATH_PENDING, measured ---------
// Each pending family's state has a named cause in the factory's own records.
// This reads the cause; it does not infer one.
// The verifier lanes' own evidence files carry a productPathReview block that
// names the exact route-delivery defect and the smallest repair. Read it rather
// than infer a cause.
const laneProductPathReviewCache = new Map();
function laneProductPathReviewFor(familyId) {
  if (laneProductPathReviewCache.has(familyId)) return laneProductPathReviewCache.get(familyId);
  let found = null;
  for (const row of verifierReturns.rows ?? []) {
    if (row.familyId !== familyId || !row.evidencePath || !exists(row.evidencePath)) continue;
    const evidence = read(row.evidencePath);
    const match = (evidence.rows ?? []).find((r) => r.itemId === familyId && r.productPathReview);
    if (match) { found = match.productPathReview; break; }
  }
  laneProductPathReviewCache.set(familyId, found);
  return found;
}

function pendingRowFor(family) {
  const routes = routesFor(family);
  const verifierRow = (verifierReturns.rows ?? [])
    .find((r) => r.familyId === family.familyId && r.verdict === "PRODUCT_PATH_PENDING") ?? null;
  const reconciliation = family.sourceReconciliation ?? null;
  const reclassification = family.executionReclassification ?? null;

  let mechanism = null;
  let pendingOn = null;
  let owner = null;
  let onlyRoger = false;
  let smallestExactRepair = null;
  if (reconciliation?.disposition === "PRODUCT_PATH_PENDING" && reconciliation.permissionHold) {
    mechanism = "source_permission_hold";
    pendingOn = reconciliation.permissionHold;
    owner = "Roger — an issuer permission negotiation";
    onlyRoger = true;
  } else if (reconciliation?.disposition === "PRODUCT_PATH_PENDING") {
    mechanism = "source_reconciliation_product_question";
    pendingOn = reconciliation.productQuestion ?? reconciliation.exactNextAction;
    owner = "legal design plus engineering";
  } else if (reclassification?.stateOverride === "PRODUCT_PATH_PENDING") {
    mechanism = "execution_reclassification";
    pendingOn = reclassification.nextExecutableAction;
    owner = reclassification.executionOwner ?? "engineering";
  } else if (verifierRow?.exactRouteDeliveryDefect) {
    mechanism = "exact_route_delivery_defect";
    pendingOn = verifierRow.exactRouteDeliveryDefect;
    owner = "legal design plus engineering";
  } else {
    const laneReview = laneProductPathReviewFor(family.familyId);
    if (laneReview) {
      mechanism = "derived_route_product_graph_stale";
      pendingOn = laneReview.exactRouteDeliveryDefect;
      smallestExactRepair = laneReview.smallestExactRepair ?? null;
      owner = "engineering";
    } else {
      mechanism = "unattributed";
      pendingOn = "no PRODUCT_PATH_PENDING cause is recorded anywhere in the factory's inputs for this family";
      owner = "unknown";
    }
  }
  return {
    familyId: family.familyId,
    jurisdiction: family.jurisdiction,
    routes: routes.map((r) => ({
      obligationRouteKey: r.obligationRouteKey,
      exactRuntimeRouteId: r.exactRuntimeRouteId,
      inLaunchGraph: r.inLaunchGraph,
      ratificationStatus: r.ratificationStatus
    })),
    pendingMechanism: mechanism,
    actuallyPendingOn: pendingOn,
    smallestExactRepair,
    owner,
    onlyRogerCanDoThis: onlyRoger,
    sourceReconciliation: reconciliation,
    executionReclassification: reclassification
      ? { executionOwner: reclassification.executionOwner, nextExecutableAction: reclassification.nextExecutableAction, ownerDecision: reclassification.ownerDecision }
      : null,
    independentVerdict: family.selectedIndependentVerdict ?? null
  };
}

const pendingRows = queue.families.filter((f) => f.state === "PRODUCT_PATH_PENDING").map(pendingRowFor)
  .sort((a, b) => a.familyId.localeCompare(b.familyId));

const pendingByMechanism = {};
for (const row of pendingRows) pendingByMechanism[row.pendingMechanism] = (pendingByMechanism[row.pendingMechanism] ?? 0) + 1;

// ------------------------------------------------------------- counters -----
const byBlocker = {};
for (const row of provenFamilies) byBlocker[row.blocker] = (byBlocker[row.blocker] ?? 0) + 1;
const byFirstUnmetLink = {};
for (const row of provenFamilies) byFirstUnmetLink[row.chainFirstUnmetLink ?? "none"] = (byFirstUnmetLink[row.chainFirstUnmetLink ?? "none"] ?? 0) + 1;
const preconditionFailureFrequency = {};
for (const row of provenFamilies) {
  for (const u of row.unmetGeneratorPreconditions) {
    preconditionFailureFrequency[u.id] = (preconditionFailureFrequency[u.id] ?? 0) + 1;
  }
}

const describeStep = (r) => ({
  familyId: r.familyId,
  jurisdiction: r.jurisdiction,
  routeIds: r.chain.exactRuntimeRoute.routeIds,
  remainingStepCount: r.remainingStepCount,
  remainingSteps: r.remainingStepsToAFulfillmentRecord.map((x) => ({
    stepId: x.stepId, owner: x.owner, work: x.work, closesPreconditions: x.closesPreconditions
  })),
  ownerApprovalAlreadyCoveringTheFamily: r.chain.currentLegalApproval.instrument
});

// One bounded engineering step: exactly one step remains, and no part of it is
// an owner, counsel, issuer, credential or Production action.
const oneBoundedStep = provenFamilies
  .filter((r) => r.remainingStepCount === 1 && r.remainingStepsOnlyRogerCanTake.length === 0 && !r.chain.fulfillmentAuthorityRecord.met)
  .map(describeStep);

// The nearest cohort behind it: every remaining step is engineering-ownable,
// but more than one remains. Reported because "exactly one step" would
// otherwise hide the families that are close and unblocked.
const engineeringOwnableButMoreThanOneStep = provenFamilies
  .filter((r) => r.remainingStepCount > 1 && r.remainingStepsOnlyRogerCanTake.length === 0 && !r.chain.fulfillmentAuthorityRecord.met)
  .map(describeStep)
  .sort((a, b) => a.remainingStepCount - b.remainingStepCount || a.familyId.localeCompare(b.familyId));

const blockedOnRoger = provenFamilies
  .filter((r) => r.remainingStepsOnlyRogerCanTake.length > 0 || r.onlyRogerCanDoThis)
  .map((r) => ({
    familyId: r.familyId,
    jurisdiction: r.jurisdiction,
    routeIds: r.chain.exactRuntimeRoute.routeIds,
    blocker: r.blocker,
    theAskOnlyRogerCanAnswer: r.remainingStepsToAFulfillmentRecord
      .filter((x) => x.onlyRogerCanDoThis)
      .map((x) => ({ stepId: x.stepId, ask: x.work, closesPreconditions: x.closesPreconditions })),
    andThenTheseRemainForEngineering: r.remainingStepsToAFulfillmentRecord.filter((x) => !x.onlyRogerCanDoThis).map((x) => x.stepId),
    singleNextAction: r.singleNextAction,
    why: r.why
  }));

const readyForGeneration = provenFamilies.filter((r) => r.blocker === "READY_FOR_FULFILLMENT_AUTHORITY_GENERATION");

const evaluatorPaymentOpenWithoutARecord = launchGraph.rows
  .filter((r) => r.operationalGates?.paymentAllowed === true && !recordByRouteId.has(r.pathwayKey))
  .map((r) => ({ routeId: r.pathwayKey, availability: r.availability, unmetOperationalGates: r.unmetOperationalGates }));

const document = {
  schemaVersion: "rcap-proven-family-productization-census/v1",
  generatedBy: "scripts/rcap-route-productization/generate-proven-family-productization-census.mjs",
  question: "For every COMPLETE_PACKET_PROVEN packet family, what exactly stands between it and an open route, and which single action closes the nearest link?",
  createsApproval: false,
  changesRuntime: false,
  opensAnyRoute: false,
  productionTouched: false,
  paymentTripleTouched: false,
  whatThisIsNot: [
    "not a registry: the controlling registry of fulfillment authority remains data/rcap-grade-a/fulfillment-authority-registry.json",
    "not an authority system: every legal fact here is copied from an owner decision record and none is created",
    "not a launch graph: route gates are read from data/rcap-ledger/launch-graph.json",
    "not a plan: each row names a measured state and the mechanism that would change it"
  ],
  theChain: CHAIN,
  // The derived route/product graph was stale when this census was first taken,
  // and one PRODUCT_PATH_PENDING family names that staleness as its exact
  // defect. Each generator below was re-run from its own inputs. None of them
  // opens a route: every regeneration moved the repository in the closing
  // direction or only re-pinned an input digest.
  derivedGraphRegenerationsThisCensusDependsOn: [
    {
      generator: "scripts/generate-rcap-witness-divergence-diagnosis.mjs",
      whyItWasStale: "the two Kansas municipal routes were compiled into the runtime after the fixtures were last taken, so 260 fixtures covered 262 launch-graph rows",
      effect: "both Kansas routes acquired a probe row; one Oregon route's observed expected.paymentAllowed moved from true to false",
      opensAnything: false
    },
    {
      generator: "scripts/generate-rcap-factory-v2-registry.mjs",
      whyItWasStale: "named by data/rcap-grade-a/packet-factory-24h/vf01/rows.json as the exact route-delivery defect behind va_exp_absolute_pardon-set",
      effect: "added renderer_unavailable blockers to routes that had none; no route gained an admission",
      opensAnything: false
    },
    {
      generator: "scripts/generate-rcap-launch-graph.mjs",
      whyItWasStale: "its evidence-input digests trailed the regenerated closure and factory registry",
      effect: "re-pinned input digests; operationallySellable stayed 0 and paymentAllowed stayed 28",
      opensAnything: false
    },
    {
      generator: "scripts/generate-rcap-hosted-acceptance-journeys.mjs",
      whyItWasStale: "probes were taken against the earlier route graph",
      effect: "re-ran every golden-journey probe; no probe opened payment",
      opensAnything: false
    },
    {
      generator: "scripts/generate-rcap-grade-a-fulfillment-authority.mjs",
      whyItWasStale: "the raster queue moved in the commit this lane branched from, so the Illinois and DC records bound stale receipt rows and the authority verifier failed",
      effect: "re-bound the current raster receipt rows; the same 14 records, the same 5 commercially eligible, no record added or removed",
      opensAnything: false
    }
  ],
  generatorPreconditionCatalogue: PRECONDITION_CATALOGUE,
  generatorPreconditionSource: "scripts/generate-rcap-grade-a-fulfillment-authority.mjs",
  stepCatalogue: STEPS,
  inputs: Object.fromEntries(Object.entries(INPUTS).map(([name, rel]) => [rel, fileSha256(rel)])),
  counters: {
    provenFamilies: provenFamilies.length,
    provenFamiliesWithEveryObligationResolvedToARuntimeRoute: provenFamilies.filter((r) => r.chain.exactRuntimeRoute.met).length,
    provenFamiliesWithNoRuntimeRouteAtAll: provenFamilies.filter((r) => r.chain.exactRuntimeRoute.routeIds.length === 0).length,
    provenFamiliesWithARouteScopedArtifact: provenFamilies.filter((r) => r.chain.routeScopedArtifact.met).length,
    provenFamiliesWithCurrentLegalApproval: provenFamilies.filter((r) => r.chain.currentLegalApproval.met).length,
    provenFamiliesInsideAnyOwnerApproval: provenFamilies.filter((r) => r.chain.currentLegalApproval.instrument).length,
    provenFamiliesWithAFulfillmentAuthorityRecord: provenFamilies.filter((r) => r.chain.fulfillmentAuthorityRecord.met).length,
    provenFamiliesMeetingEveryGeneratorPrecondition: provenFamilies.filter((r) => r.unmetGeneratorPreconditionCount === 0).length,
    provenFamiliesWithAtLeastOneStepOnlyRogerCanTake: blockedOnRoger.length,
    provenFamiliesOneBoundedEngineeringStepFromARecord: oneBoundedStep.length,
    provenFamiliesEngineeringOwnableButMoreThanOneStepAway: engineeringOwnableButMoreThanOneStep.length,
    provenFamiliesReadyForGenerationNow: readyForGeneration.length,
    hostedConsumerCanariesOnRecord: 0,
    hostedSponsoredCanariesOnRecord: 0,
    operationallySellableRoutes: launchGraph.rows.filter((r) => r.operationallySellable).length,
    routesWhereTheEvaluatorAllowsPaymentButNoFulfillmentRecordExists: evaluatorPaymentOpenWithoutARecord.length
  },
  byBlocker,
  byFirstUnmetChainLink: byFirstUnmetLink,
  generatorPreconditionFailureFrequency: preconditionFailureFrequency,
  oneBoundedEngineeringStepFromAFulfillmentRecord: {
    note: "Exactly one step remains and no part of it is an owner, counsel, issuer, credential or Production action. Steps are defined in this generator's STEPS table and each names the generator preconditions it closes.",
    families: oneBoundedStep
  },
  engineeringOwnableButMoreThanOneStepAway: {
    note: "Every remaining step is engineering-ownable, but more than one remains. These are the families a build lane can carry to a record without waiting on anyone.",
    families: engineeringOwnableButMoreThanOneStep
  },
  blockedOnAnActionOnlyRogerCanTake: {
    note: "Named-counsel approval, an issuer permission, a credential or a Production action. No agent may substitute for any of these.",
    families: blockedOnRoger
  },
  readyForFulfillmentAuthorityGenerationNow: readyForGeneration.map((r) => ({ familyId: r.familyId, routeIds: r.chain.exactRuntimeRoute.routeIds })),
  evaluatorPaymentOpenWithoutAFulfillmentRecord: {
    note: "These routes already return paymentAllowed=true at the evaluator while the fulfillment registry has no record for them. The registry fails closed, so nothing is sellable; the disagreement between the two layers is recorded here rather than resolved.",
    routes: evaluatorPaymentOpenWithoutARecord
  },
  productPathPending: {
    note: "What the twenty PRODUCT_PATH_PENDING families are actually pending on, read from the factory's own cause records rather than assumed.",
    byMechanism: pendingByMechanism,
    families: pendingRows
  },
  provenFamilies
};

const serialized = `${JSON.stringify(document, null, 2)}\n`;
const outAbs = path.join(ROOT, OUT);
if (CHECK) {
  const current = exists(OUT) ? readBytes(OUT).toString("utf8") : null;
  if (current !== serialized) {
    console.error(`Regeneration required — ${OUT} does not match its evidence.`);
    process.exit(1);
  }
  console.log(`${OUT} is current.`);
} else {
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, serialized);
  console.log(`wrote ${OUT}`);
}

console.log(`  proven families: ${document.counters.provenFamilies}`);
console.log(`  with every obligation resolved to a runtime route: ${document.counters.provenFamiliesWithEveryObligationResolvedToARuntimeRoute}`);
console.log(`  with a fulfillment-authority record: ${document.counters.provenFamiliesWithAFulfillmentAuthorityRecord}`);
console.log(`  meeting every generator precondition: ${document.counters.provenFamiliesMeetingEveryGeneratorPrecondition}`);
console.log(`  one bounded engineering step away: ${oneBoundedStep.length}`);
console.log(`  engineering-ownable but more than one step away: ${engineeringOwnableButMoreThanOneStep.length}`);
console.log(`  with at least one step only Roger can take: ${blockedOnRoger.length}`);
console.log(`  ready for generation now: ${readyForGeneration.length}`);
console.log(`  operationally sellable routes: ${document.counters.operationallySellableRoutes}`);
