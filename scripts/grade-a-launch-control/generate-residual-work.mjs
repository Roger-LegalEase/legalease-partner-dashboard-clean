#!/usr/bin/env node
// What the first wave did NOT finish, and nothing else.
//
//   node scripts/grade-a-launch-control/generate-residual-work.mjs [--check|--mutations]
//
// The point of a residual record is that the next wave can be dispatched from it
// without anyone re-reading eleven worker returns and deciding by hand what is
// left. So every row here is derived from an integrated record:
//
//   - open branch identities come from CATEGORY_B_INTEGRATION_STATUS.json, which
//     is itself generated from the seven lane returns;
//   - open mapping rows and pair bindings come from C9's own reconciliation;
//   - open source work comes from C10's own receipts;
//   - the already-answered queue comes from the retriage, minus anything the
//     integration status independently proves complete.
//
// Nothing completed appears here. That is checked, not asserted: a residual row
// whose route is COMPLETED in the integration status is a refusal, because
// re-dispatching finished work is how a wave spends a worker on nothing.
//
// C11 is still running. Its owned paths are recorded as RESERVED and no residual
// lane may claim them.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECK = process.argv.includes("--check");
const MUTATIONS = process.argv.includes("--mutations");
const OUT = "data/rcap-grade-a/launch-control/RESIDUAL_WORK.json";
const LC = "data/rcap-grade-a/launch-control";
const V1 = "data/rcap-grade-a/route-obligation-census-v1";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const status = read(`${LC}/CATEGORY_B_INTEGRATION_STATUS.json`);
const dispatch = read(`${LC}/ACTIVE_CODEX_ASSIGNMENTS.json`);
const review = read(`${LC}/WAVE_1_RETURN_REVIEW.json`);
const retriage = read(`${V1}/legal-review-queue-v2-retriage.json`);
const c8 = read("data/rcap-grade-a/already-answered-implementation/stopped.json");
const c9rows = read("data/rcap-grade-a/captain-route-mapping/reconciled.json");
const c9bind = read("data/rcap-grade-a/captain-route-mapping/stage-binding.json");
const c10id = read(`${V1}/identity-resolution/wave-2/resolved.json`);
const c10acq = read("data/rcap-grade-a/source-acquisition/wave-1/acquired.json");
const c12 = read("data/rcap-grade-a/participant-data-rights/hosted-acceptance.json");
const counsel = read(`${LC}/COUNSEL_DETERMINATION_DELTA.json`);
const c11Review = read(`${LC}/C11_RETURN_REVIEW.json`);
const c11Stops = read(`${LC}/C11_STOP_CLASSIFICATION.json`);
const stopsFor = (lane) => c11Stops.stops.filter((s) => s.lane === lane);

const completedRoutes = new Set(status.rows.filter((r) => r.integrationStatus === "COMPLETED").map((r) => r.routeKey));

// ---- R1: branch identities the wave stopped on -----------------------------------
const openIdentities = status.rows.filter((r) => r.integrationStatus === "STOPPED").map((r) => ({
  routeKey: r.routeKey,
  jurisdiction: r.jurisdiction,
  publicLabel: r.publicLabel,
  originalLane: r.laneKey,
  laneReportedStatus: r.laneReportedStatus,
  stopReason: r.stopReason,
  dispatchedReuseDecision: r.dispatchedReuseDecision,
  packetFamilyNamedNotCreated: r.packetFamilyNamedNotCreated,
  whatWouldSettleIt: /instrument identity/i.test(r.laneReportedStatus)
    ? "an exact document identity for the participant instrument, from a committed record rather than an inference"
    : /crosswalk/i.test(r.laneReportedStatus)
      ? "a confirmed binding to an existing Category A route, or proof that no existing route covers this branch"
      : /overlap/i.test(r.laneReportedStatus)
        ? "a decision on which of the overlapping existing routes owns this branch, so one identity does not resolve to two"
        : "the lane's recorded stop reason, resolved from committed evidence"
}));

// ---- R2: the already-answered engineering queue ----------------------------------
const alreadyAnswered = (retriage.rows ?? []).filter((r) => r.bucket === "ALREADY_ANSWERED").map((r) => r.routeKey).sort();
// "Except any route independently proven complete elsewhere" is computed, not
// assumed. The integration delta measured the overlap with the 55 at zero; this
// re-derives it from the integration status so the exclusion cannot go stale.
const alreadyAnsweredProvenElsewhere = alreadyAnswered.filter((k) => completedRoutes.has(k));
const alreadyAnsweredOpen = alreadyAnswered.filter((k) => !completedRoutes.has(k));

// ---- R3: mapping rows and pair bindings ------------------------------------------
const openMappingRows = (c9rows.rows ?? []).filter((r) => r.reconciliationStatus === "STOPPED_AND_REPORTED").map((r) => ({
  routeKey: r.routeKey,
  jurisdiction: r.jurisdiction,
  publicLabel: r.publicLabel,
  whatIsWrong: r.whatIsWrong,
  stopConditions: r.stopConditions
}));
// C9's stopConditions lists are ZERO-BASED INDICES into bindings[], while each
// binding carries a one-based pairOrdinal. Reading them as ordinals selected the
// neighbouring pair as well and reported 19 stopped bindings where C9 counted
// 13. The count is cross-checked against C9's own pairsStopped below.
const stoppedPairIndices = new Set([
  ...(c9bind.stopConditions?.duplicatePathwayClaim ?? []),
  ...(c9bind.stopConditions?.ambiguousExistingBranchCandidates ?? []),
  ...(c9bind.stopConditions?.missingCensusStage ?? [])
]);
const openPairBindings = (c9bind.bindings ?? [])
  .filter((_, index) => stoppedPairIndices.has(index))
  .map((b) => ({
    pairOrdinal: b.pairOrdinal,
    jurisdiction: b.jurisdiction,
    bStageRouteKey: b.bStage?.routeKey ?? null,
    aBranchRouteKey: b.aBranch?.routeKey ?? null,
    disposition: b.disposition,
    stopReasons: b.stopReasons ?? []
  }));

// ---- R4: source identity, acquisition and promotion -------------------------------
const openIdentityRows = (c10id.records ?? []).filter((r) => r.status === "UNRESOLVED_IDENTITY");
const openUrlRows = (c10id.records ?? []).filter((r) => r.officialUrlResolved === false);
// Egress is preserved PER EXACT SOURCE. C10's own HEAD probe reached five of the
// seven hosts it tested; a blanket "blocked on egress" would send the next
// worker to retry five hosts that answered and two that did not, which is the
// opposite of what the evidence supports.
const probe = c10acq.acquisition?.currentProbe?.results ?? [];
const egressByHost = probe.map((r) => ({
  authority: r.authority,
  url: r.url,
  httpStatus: r.httpStatus,
  reachableOnHeadProbe: r.reachable === true,
  instruction: r.reachable === true
    ? "reachable on a HEAD probe from a worker host; attempt acquisition and record the body's SHA-256"
    : "refused on a HEAD probe; do NOT retry this host — escalate it instead of spending a worker on it"
}));

// ---- assemble the residual lanes --------------------------------------------------
// C11 has returned, so its paths are released. The reservation stays recorded
// as history -- and as the reason a residual lane may now write where it could
// not before -- rather than being deleted.
const C11_PATHS = dispatch.assignments.find((a) => a.assignmentId === "C11_PACKET_FACTORY_ACCELERATOR")?.ownedPaths ?? [];
const C11_RETURNED = c11Review.verdict.startsWith("ACCEPTED");
const RESERVED_C11 = C11_RETURNED ? [] : C11_PATHS;

const lanes = [
  {
    residualLaneId: "R1_BRANCH_IDENTITY_REMAINDER",
    replaces: ["C1_SPLIT_AUTOMATIC_CORRECTION_STATUS", "C2_SPLIT_AUTOMATIC_COURT_PETITION", "C3_SPLIT_AGENCY_PROSECUTOR_APPLICATION", "C5_SPLIT_POST_ORDER_ENFORCEMENT"],
    what: "The branch identities the first wave stopped on, every one of them for a named reason recorded by the lane that stopped.",
    itemKind: "routeKey",
    items: openIdentities.map((r) => r.routeKey),
    detail: openIdentities,
    ownedPaths: ["data/rcap-grade-a/wave-2/r1-branch-identity-remainder/**"]
  },
  {
    residualLaneId: "R2_ALREADY_ANSWERED_ENGINEERING",
    replaces: ["C8_ALREADY_ANSWERED_ENGINEERING"],
    what: `The full ${alreadyAnsweredOpen.length}-row already-answered engineering queue. C8 audited every citation and implemented none, so the assignment stays open rather than being closed on an audit.`,
    itemKind: "routeKey",
    items: alreadyAnsweredOpen,
    detail: {
      citationAudit: c8.decisionRecordAudit,
      rowsImplementedByC8: c8.rowsImplemented,
      provenCompleteElsewhere: alreadyAnsweredProvenElsewhere,
      conflictToResolveFirst: (c8.stoppedRows ?? []).map((r) => ({
        routeKey: r.routeKey,
        retriageCitation: r.retriageCitation,
        controllingDecisionIds: r.controllingDecisionIds,
        recordEffect: r.recordEffect,
        captainOwns: "The conflict is between the retriage's cited aggregate decision and a newer counsel record. Resolving which controls is a Captain decision, not a worker's, and it is an input to this lane rather than part of it."
      })),
      whyTheWholeQueueIsResidual: "A per-row stop condition was written as if it stopped the lane. The rewritten assignment stops the ROW and continues, so one conflicted row cannot hold thirty-six others."
    },
    ownedPaths: ["data/rcap-grade-a/wave-2/r2-already-answered-engineering/**"]
  },
  {
    residualLaneId: "R3_ROUTE_MAPPING_REMAINDER",
    replaces: ["C9_ROUTE_MAPPING_RECONCILIATION"],
    what: `${openMappingRows.length} mapping rows C9 stopped on, plus ${openPairBindings.length} stage/branch pair bindings it could not settle.`,
    itemKind: "routeKey",
    items: [...openMappingRows.map((r) => r.routeKey), ...stopsFor("R3_ROUTE_MAPPING_REMAINDER").map((s) => s.familyId)],
    detail: { openMappingRows, openPairBindings, c11StopsRouted: stopsFor("R3_ROUTE_MAPPING_REMAINDER") },
    ownedPaths: ["data/rcap-grade-a/wave-2/r3-route-mapping-remainder/**"]
  },
  {
    residualLaneId: "R4_SOURCE_IDENTITY_AND_ACQUISITION",
    replaces: ["C10_SOURCE_IDENTITY_ACQUISITION"],
    what: `${openIdentityRows.length} unresolved identities, ${openUrlRows.length} unresolved official URLs, ${c10acq.summary.allocatedAcquisitionObligations} acquisition obligations and ${c10acq.summary.allocatedPromotionObligations} promotion candidates. Nothing was acquired and nothing was physically promoted, so none of it is closed.`,
    itemKind: "obligationKey",
    items: [...new Set([
      ...openIdentityRows.map((r) => r.obligationKey),
      ...openUrlRows.map((r) => r.obligationKey),
      ...stopsFor("R4_SOURCE_IDENTITY_AND_ACQUISITION").map((s) => s.familyId),
      "UT-402-MOTION-TO-REDUCE-FORM-IDENTITY"
    ])].sort(),
    detail: {
      unresolvedIdentities: openIdentityRows.length,
      unresolvedOfficialUrls: openUrlRows.length,
      acquisitionObligations: c10acq.summary.allocatedAcquisitionObligations,
      documentsAcquired: c10acq.summary.documentsAcquired,
      promotionObligations: c10acq.summary.allocatedPromotionObligations,
      promotionsCompleted: c10acq.summary.promotionObligationsPhysicallyCompleted,
      promotionBlocker: c10acq.promotion?.status ?? null,
      promotionExpectedInventoryRoot: c10acq.promotion?.expectedInventoryRoot ?? null,
      egressByExactSource: egressByHost,
      egressRule: "Per host, not per wave. A host that answered a HEAD probe is retried; a host that refused is escalated, never re-probed by the next worker.",
      c11StopsRouted: stopsFor("R4_SOURCE_IDENTITY_AND_ACQUISITION"),
      utahFormIdentity: counsel.sourceIdentityObligations[0] ?? null
    },
    ownedPaths: ["data/rcap-grade-a/wave-2/r4-source-identity-and-acquisition/**"]
  },
  {
    residualLaneId: "R6_COUNSEL_DETERMINATION_IMPLEMENTATION",
    replaces: [],
    what: `The four true counsel questions came back answered, and three of the four are Category A. This lane implements what each determination requires -- including New York's mandatory split into two date-specific subroutes and Utah's gate on ${counsel.counts.branchesGatedBehindConsent} of nine branches. It is new work, not a remainder: nobody was dispatched to build these because nobody could be until the determinations existed.`,
    itemKind: "routeKey",
    items: counsel.rows.map((r) => r.routeKey).sort(),
    detail: {
      decisionRecord: counsel.decisionRecord,
      decisionOwner: counsel.decisionOwner,
      perRoute: counsel.rows.map((r) => ({
        routeKey: r.routeKey,
        jurisdiction: r.jurisdiction,
        questionId: r.questionId,
        decisionId: r.decisionId,
        determinedCategory: r.determinedCategory,
        determinedCategoryBReason: r.determinedCategoryBReason,
        classification: r.classification,
        mandatorySubroutes: r.mandatorySubroutes,
        gatedBranches: r.gatedBranches,
        remainingEngineeringWork: r.remainingEngineeringWork,
        selfHelpStopConditions: r.selfHelpStopConditions
      })),
      denominatorRule: counsel.projectedDenominator.thisIsAProjectionNotAFact,
      sourceIdentityObligations: counsel.sourceIdentityObligations,
      hardStops: [
        "New York may not be built as one generic pre-November 1991 motion. The screening must ask the exact conviction date, and the date selects the motion theory.",
        "Utah's consent-dependent and joint-motion branches refuse without signed prosecutorial consent. A participant's assertion that the prosecutor agrees is not consent.",
        "Nebraska generates no merits pleading. This lane may build guidance, a deadline warning, a records checklist and referrals, and must stop before selecting, framing, drafting, verifying or filing any postconviction ground.",
        "Alabama's circuit petition is available only after the AJIC administrative process is exhausted; the packet must verify exhaustion before it generates."
      ]
    },
    ownedPaths: ["data/rcap-grade-a/wave-2/r6-counsel-determination-implementation/**"]
  },
  {
    residualLaneId: "R7_PACKET_REPAIR",
    replaces: [],
    what: `Repair work on the C11 return that needs no rebuild: ${c11Stops.builtFamilyRecordGap?.count ?? 0} built families missing a product-wiring record, and ${stopsFor("R7_PACKET_REPAIR").length} stopped famil(ies) whose blocker is a packet component rather than a source or a mapping.`,
    itemKind: "familyId",
    items: [...new Set([...(c11Stops.builtFamilyRecordGap?.families ?? []), ...stopsFor("R7_PACKET_REPAIR").map((s) => s.familyId)])].sort(),
    detail: {
      missingProductWiring: c11Stops.builtFamilyRecordGap,
      componentStops: stopsFor("R7_PACKET_REPAIR"),
      doNotRebuild: "None of the 43 built families is rerun. The artifacts are sound and byte-checked; what is missing is a record or a component specification.",
      excludedCorpusBinaries: {
        count: c11Review.exclusionList.length,
        why: "59 files were excluded from integration because their bytes are indexed private-corpus sources or court-source PDFs with no precedent in this tree.",
        nothingIsLost: c11Review.corpusBinariesToExclude.nothingIsLost,
        ifAVerifierNeedsThem: "Bind the source from MASTER_LIBRARY_SOURCE_DIR through the corpus bootstrap and compare against the family's own source-receipt.json. Do not re-commit the bytes."
      }
    },
    ownedPaths: ["data/rcap-grade-a/wave-2/r7-packet-repair/**"]
  },
  {
    residualLaneId: "R5_NONPRODUCTION_ACCEPTANCE",
    replaces: ["C12_NONPRODUCTION_ACCEPTANCE_PREP"],
    what: "Hosted participant-data-rights acceptance, held until the external environment is repaired. The standing one-time authorization is unspent.",
    itemKind: "environment",
    items: [],
    detail: {
      projectRef: c12.project?.ref ?? null,
      provenSyntheticForThisRun: c12.project?.provenSyntheticForThisRun ?? null,
      migrationApplied: c12.migration?.applied ?? null,
      migrationSha256: c12.migration?.sha256 ?? null,
      acceptanceCases: (c12.acceptanceCases ?? []).map((c) => ({ case: c.case, status: c.status })),
      authorizationConsumed: c12.authorizationConsumed,
      doNotRedispatchUntil: [
        "the pinned project can be currently proven synthetic from the executing session",
        "a credential authorized for that project's organization exists in the executing environment",
        "the host has enough free disk to install the dependency tree"
      ],
      preserved: "authorizationConsumed stays false. Roger's one-time authorization for the synthetic acceptance project was not spent and is not re-requested."
    },
    ownedPaths: ["data/rcap-grade-a/wave-2/r5-nonproduction-acceptance/**"]
  }
];

// ---- refusals ---------------------------------------------------------------------
const problems = [];
const seen = new Map();
for (const lane of lanes) {
  for (const item of lane.items) {
    if (seen.has(item)) problems.push(`${item} is claimed by both ${seen.get(item)} and ${lane.residualLaneId}`);
    else seen.set(item, lane.residualLaneId);
  }
  if (lane.itemKind === "routeKey") {
    for (const item of lane.items) {
      if (completedRoutes.has(item)) problems.push(`${lane.residualLaneId} carries ${item}, which the integration status reports COMPLETED`);
    }
  }
  if (lane.itemKind !== "environment" && lane.items.length === 0) {
    problems.push(`${lane.residualLaneId} has no items and is not an environment lane`);
  }
}
const paths = new Map();
for (const lane of lanes) {
  for (const p of lane.ownedPaths) {
    const root = p.replace(/\/?\*\*$/, "");
    if (paths.has(root) && paths.get(root) !== lane.residualLaneId) problems.push(`owned path ${root} is claimed twice`);
    paths.set(root, lane.residualLaneId);
    for (const reserved of RESERVED_C11) {
      const r = reserved.split("(")[0].trim().replace(/\/?\*\*$/, "");
      if (root === r || root.startsWith(`${r}/`) || r.startsWith(`${root}/`)) {
        problems.push(`${lane.residualLaneId} would write inside C11's reserved path ${r} while C11 is still running`);
      }
    }
  }
}
// Every stopped route in the integration status must be in a residual lane.
const residualRoutes = new Set(lanes.flatMap((l) => (l.itemKind === "routeKey" ? l.items : [])));
for (const r of status.rows.filter((x) => x.integrationStatus === "STOPPED")) {
  if (!residualRoutes.has(r.routeKey)) problems.push(`${r.routeKey} stopped in the wave and appears in no residual lane`);
}
if (openPairBindings.length !== c9bind.counts?.pairsStopped) {
  problems.push(`${openPairBindings.length} stopped pair bindings selected, but C9 counted ${c9bind.counts?.pairsStopped}`);
}
if (review.summary.stillRunning !== 0 && !C11_RETURNED) {
  problems.push(`the return review reports ${review.summary.stillRunning} lane(s) still running and C11 has not returned`);
}
// Every C11 stop must land in a lane, and no stop may be dropped.
{
  const laneItems = new Set(lanes.flatMap((l) => l.items));
  for (const stop of c11Stops.stops) {
    if (!laneItems.has(stop.familyId)) problems.push(`${stop.familyId} stopped in C11 and appears in no residual lane`);
  }
  for (const family of c11Stops.builtFamilyRecordGap?.families ?? []) {
    if (!laneItems.has(family)) problems.push(`${family} needs a wiring record and appears in no residual lane`);
  }
}

if (problems.length > 0) {
  console.error(`residual work: ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 12)) console.error(`  - ${p}`);
  process.exit(1);
}

const doc = {
  schemaVersion: "rcap-grade-a-residual-work/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-residual-work.mjs",
  question: "After the first wave, what is genuinely left?",
  derivedFrom: {
    integrationStatus: `${LC}/CATEGORY_B_INTEGRATION_STATUS.json`,
    returnReview: `${LC}/WAVE_1_RETURN_REVIEW.json`,
    c8: "data/rcap-grade-a/already-answered-implementation/stopped.json",
    c9: ["data/rcap-grade-a/captain-route-mapping/reconciled.json", "data/rcap-grade-a/captain-route-mapping/stage-binding.json"],
    c10: [`${V1}/identity-resolution/wave-2/resolved.json`, "data/rcap-grade-a/source-acquisition/wave-1/acquired.json"],
    c12: "data/rcap-grade-a/participant-data-rights/hosted-acceptance.json",
    c11Review: `${LC}/C11_RETURN_REVIEW.json`,
    c11StopClassification: `${LC}/C11_STOP_CLASSIFICATION.json`,
    counselDeterminations: `${LC}/COUNSEL_DETERMINATION_DELTA.json`
  },
  nothingCompletedIsRepeated:
    "Every route here is STOPPED in the integration status, and the generator refuses if a COMPLETED route appears. The already-answered queue is filtered against the same record rather than against a remembered claim that the overlap is zero.",
  notYetResidual: {
    laneStillRunning: C11_RETURNED ? null : "C11_PACKET_FACTORY_ACCELERATOR",
    reservedPaths: RESERVED_C11,
    releasedPaths: C11_RETURNED ? C11_PATHS : [],
    rule: C11_RETURNED
      ? "C11 has returned and its path ownership is released. Its 43 built families are integrated and are not rebuilt; its 4 stops are classified by blocker and routed to the lane that can resolve each one."
      : "C11's families and owned paths are untouched and unassigned. Nothing here may write inside them, and the generator refuses if a residual lane tries."
  },
  notDispatchable:
    "This record describes work; it dispatches none. A residual wave is dispatched only after a new Captain head and a new ownership manifest are committed, by the same two-commit method.",
  commercialPosture:
    "No residual lane opens a commercial route, proves a packet, or consumes an authorization. C12's one-time nonproduction authorization remains unspent.",
  counts: {
    residualLanes: lanes.length,
    counselDeterminationRoutes: counsel.rows.length,
    c11StoppedFamilies: c11Stops.counts.stoppedFamilies,
    c11BuiltFamiliesNeedingRepair: c11Stops.counts.builtFamiliesMissingWiring,
    c11CorpusBinariesExcluded: c11Review.exclusionList.length,
    residualRoutes: openIdentities.length,
    residualAlreadyAnsweredRows: alreadyAnsweredOpen.length,
    residualMappingRows: openMappingRows.length,
    residualPairBindings: openPairBindings.length,
    residualSourceIdentities: openIdentityRows.length,
    residualOfficialUrls: openUrlRows.length,
    residualAcquisitions: c10acq.summary.allocatedAcquisitionObligations,
    residualPromotions: c10acq.summary.allocatedPromotionObligations,
    counselDeterminationSubroutes: counsel.counts.subroutesRequired,
    counselDeterminationGatedBranches: counsel.counts.branchesGatedBehindConsent,
    totalDistinctItems: seen.size,
    collisions: 0
  },
  lanes
};

const serialized = JSON.stringify(doc, null, 2) + "\n";
const outPath = path.join(ROOT, OUT);

if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  if (current !== serialized) { console.error(`${OUT} is stale or missing. Run the generator.`); process.exit(1); }
  console.log(`residual work current: ${lanes.length} lane(s), ${seen.size} distinct item(s).`);
  process.exit(0);
}

if (MUTATIONS) {
  const original = fs.readFileSync(outPath);
  const cases = [
    { name: "a completed route re-dispatched as residual is caught", mutate: (j) => { const l = j.lanes[0]; l.items.push([...new Set(read(`${LC}/CATEGORY_B_INTEGRATION_STATUS.json`).rows.filter((r) => r.integrationStatus === "COMPLETED").map((r) => r.routeKey))][0]); return j; } },
    { name: "a stopped route dropped from the residual is caught", mutate: (j) => { j.lanes[0].items.pop(); return j; } },
    { name: "a residual lane claiming C11's reserved paths is caught", mutate: (j) => { j.lanes[0].ownedPaths = ["data/rcap-all50/overlays/census-v1/**"]; return j; } },
    { name: "two lanes claiming one item is caught", mutate: (j) => { j.lanes[2].items.push(j.lanes[0].items[0]); return j; } },
    { name: "an understated acquisition count is caught", mutate: (j) => { j.counts.residualAcquisitions = 0; return j; } },
    { name: "the spent-authorization claim is caught", mutate: (j) => { const l = j.lanes.find((x) => x.residualLaneId === "R5_NONPRODUCTION_ACCEPTANCE"); l.detail.authorizationConsumed = true; return j; } },
    { name: "a counsel-determined route dropped from the residual is caught", mutate: (j) => { const l = j.lanes.find((x) => x.residualLaneId === "R6_COUNSEL_DETERMINATION_IMPLEMENTATION"); l.items.pop(); return j; } },
    { name: "New York's mandatory split collapsed in the residual is caught", mutate: (j) => { const l = j.lanes.find((x) => x.residualLaneId === "R6_COUNSEL_DETERMINATION_IMPLEMENTATION"); const r = l.detail.perRoute.find((x) => x.mandatorySubroutes.length > 1); r.mandatorySubroutes = [r.mandatorySubroutes[0]]; return j; } }
  ];
  let undetected = 0;
  console.log("mutations:");
  try {
    for (const testCase of cases) {
      fs.writeFileSync(outPath, JSON.stringify(testCase.mutate(JSON.parse(original.toString("utf8"))), null, 2) + "\n");
      let caught = false;
      try { execFileSync(process.execPath, [fileURLToPath(import.meta.url), "--check"], { cwd: ROOT, stdio: "pipe" }); } catch { caught = true; }
      console.log(`  ${caught ? "detected " : "MISSED   "} ${testCase.name}`);
      if (!caught) undetected += 1;
      fs.writeFileSync(outPath, original);
    }
  } finally { fs.writeFileSync(outPath, original); }
  const restored = fs.readFileSync(outPath).equals(original);
  console.log(`\n  every mutated file restored byte-for-byte: ${restored}`);
  if (!restored || undetected > 0) { console.error("the residual record proves less than it claims."); process.exit(1); }
  console.log(`\nOK residual mutations — ${cases.length} case(s), every mutation caught.`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, serialized);
console.log(`Wrote ${OUT}\n`);
for (const l of lanes) console.log(`  ${l.residualLaneId.padEnd(40)} ${String(l.items.length).padStart(3)} ${l.itemKind}(s)`);
console.log(`\n  routes ${doc.counts.residualRoutes} · already-answered ${doc.counts.residualAlreadyAnsweredRows} · mapping ${doc.counts.residualMappingRows} · pairs ${doc.counts.residualPairBindings}`);
console.log(`  identities ${doc.counts.residualSourceIdentities} · urls ${doc.counts.residualOfficialUrls} · acquisitions ${doc.counts.residualAcquisitions} · promotions ${doc.counts.residualPromotions}`);
