import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Correct treatment is a build input, not a completed-output verdict. The
// historical 346 family identities survive even when their treatment changes.
export const CT_DESTRUCTION = "agency-application-treatment:obligation:track-only:CT:ct-destruction-request";
export const CT_PROVISIONAL = "agency-application-treatment:obligation:track-only:CT:ct-provisional-pardon";
export const CT_ABSOLUTE = "agency-application-treatment:obligation:track-pathway:CT:ct-absolute-pardon:absolute-pardon-resulting-in-erasure";
export const WA_AUTOMATIC = "census-pending-family:WA:juvenile-record-sealing-under-rcw-13-50-260";
export const WA_GUIDANCE_DIRECTORY = "data/rcap-all50/guidance-packets/wa-juvenile-court-initiated";
export const GA_GUIDANCE = "rcap-ga-guidance-implementation";
export const GA_PETITION = "composed-treatment:obligation:runtime-only:GA:youthful-first-offender-restriction-route";
const WA_PREFIX = "obligation:runtime-contract-cohort:WA:juvenile-record-sealing-under-rcw-13-50-260:";
export const WA_MOTION_ROUTE = `${WA_PREFIX}participant_motion_branch`;
export const WA_GUIDANCE_ROUTES = [
  `${WA_PREFIX}acquittal_or_dismissal_immediate_automatic`,
  `${WA_PREFIX}scheduled_administrative_hearing_automatic`
];
const CT_MEMO = "data/record-clearing/legal-design-intake/CT.memo.json";
const WA_CORRECTION = "data/rcap-grade-a/chat-parallel-2026-09-07/chat6-source-legal/group-02-wa-guidance-ut-custody.json";
const GA_DECISION = "data/record-clearing/legal-decisions/2026-08-28-controlling-decisions.json";
const CENSUS = "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json";

function requireCondition(condition, message) {
  if (!condition) throw new Error(`Treatment reconciliation refused: ${message}`);
}
function readRecord(root, relative) {
  const bytes = fs.readFileSync(path.join(root, relative));
  return { value: JSON.parse(bytes), evidence: {
    path: relative, sha256: crypto.createHash("sha256").update(bytes).digest("hex")
  } };
}

export function loadTreatmentReconciliations(root) {
  const ct = readRecord(root, CT_MEMO);
  const wa = readRecord(root, WA_CORRECTION);
  const ga = readRecord(root, GA_DECISION);
  const census = readRecord(root, CENSUS);
  const map = new Map();
  for (const [familyId, trackId, nextAction] of [
    [CT_DESTRUCTION, "ct-destruction-request", "Complete existing guidance acceptance and source-receipt compatibility. A written-request upgrade requires the accepted destination/format confirmation recorded in the controlling addendum."],
    [CT_PROVISIONAL, "ct-provisional-pardon", "Complete existing guidance acceptance and source-receipt compatibility; bind the Board portal and distinguish the probation-officer branch. A supporting authorization form is not the Board application."],
    [CT_ABSOLUTE, "ct-absolute-pardon", "Complete existing guidance acceptance and current Board portal/document handoff. Preserve the portal application as the participant's later action; this guide does not submit it."]
  ]) {
    const track = ct.value.tracks.find(row => row.trackId === trackId);
    requireCondition(track?.outputStrategy === "process_guidance", `${trackId} no longer carries the approved guidance strategy`);
    requireCondition(track.components.every(row => row.outputStrategy === "process_guidance"), `${trackId} acquired an instrument component; review its changed scope`);
    const scope = track.legalDesignDecision?.limitations?.filter(row => row.classification === "scope_restriction").map(row => row.statement) ?? [];
    requireCondition(scope.length > 0, `${trackId} has no recorded scope restriction`);
    map.set(familyId, {
      familyId, implementationStrategy: "process_guidance", authority: [ct.evidence],
      sourceReconciliation: { implementationStrategyOverride: "process_guidance",
        guidanceAuthorityRecords: [ct.evidence],
        exactNextAction: nextAction, disposition: "GUIDANCE_MAPPING_REQUIRED" },
      authoritySelector: `tracks[trackId=${trackId}].legalDesignDecision`,
      scopeRestrictions: scope, nextExecutableAction: nextAction,
      stages: [{ stageId: "preparation_and_handoff", outputKind: "process_guidance", familyId,
        destination: track.destination, participantFilesGeneratedOutput: false,
        owedOutput: "Usable guidance and the exact authority handoff; no substitute application or request." }],
      separateParticipantAction: { description: track.rules.filing, dischargedByGuide: false },
      createsTerminalState: false, createsCommercialAuthority: false
    });
  }

  const correction = wa.value.rows.find(row => row.familyId === WA_AUTOMATIC);
  requireCondition(correction?.blankSourcesOwed === 0 && /court-initiated/.test(correction.resolution), "Washington correction is absent or no longer court-initiated");
  const routes = WA_GUIDANCE_ROUTES.map(key => census.value.routes.find(row => row.routeKey === key));
  requireCondition(routes.every(row => row?.processActor === "court" && row.participantCanInitiate === false), "Washington automatic cohort identities changed");
  const motion = census.value.routes.find(row => row.routeKey === WA_MOTION_ROUTE);
  requireCondition(motion?.participantCanInitiate === true && motion.currentOutputStrategy === "official_pdf_fill", "separate Washington participant motion obligation is absent");
  map.set(WA_AUTOMATIC, {
    familyId: WA_AUTOMATIC, implementationStrategy: "process_guidance",
    directory: WA_GUIDANCE_DIRECTORY,
    authority: [wa.evidence, census.evidence], authoritySelector: `rows[familyId=${WA_AUTOMATIC}]`,
    routes, sourceReconciliation: {
      group: "C", disposition: "GUIDANCE_MAPPING_REQUIRED",
      implementationStrategyOverride: "process_guidance", additionalRequiredSourceIds: [],
      guidanceAuthorityRecords: [wa.evidence],
      requireBoundAuthority: true,
      authorityBindings: [{ sourceId: "official-authority:RCW-13.50.260-1-2", title: "RCW 13.50.260(1)-(2)",
        issuingAuthority: "Washington State Legislature", officialUrl: "https://app.leg.wa.gov/rcw/default.aspx?cite=13.50.260" }],
      exactNextAction: "Complete court-initiated status guidance and its existing guidance acceptance; do not acquire JU motion forms against this family.",
      exactResidual: "No participant blank is owed on either court-initiated cohort. The separate subsection (3) motion remains an owed participant obligation."
    },
    stages: routes.map(row => ({ stageId: row.routeKey.slice(WA_PREFIX.length), routeKey: row.routeKey,
      outputKind: "process_guidance", familyId: WA_AUTOMATIC, destination: correction.destination,
      participantFilesGeneratedOutput: false })),
    preservedSeparateObligations: [{ routeKey: motion.routeKey, currentOutputStrategy: motion.currentOutputStrategy,
      participantCanInitiate: true, disposition: "separate_participant_motion_mapping_required",
      sourceFamilyAssociation: motion.packetFamilyId, dischargedByThisFamily: false }],
    nextExecutableAction: fs.existsSync(path.join(root, WA_GUIDANCE_DIRECTORY, "guidance-manifest.json"))
      ? "Independently accept the installed court-initiated status guide and exact selected branches. Preserve the separate participant-motion obligation; runtime installation is a separate requirement."
      : "Build and independently accept the case-specific court-initiated status guide, including restitution follow-up. Preserve the separate participant-motion obligation in the census.",
    createsTerminalState: false, createsCommercialAuthority: false
  });

  const decision = ga.value.decisions.find(row => row.decisionId === "CLD-2026-08-28-GA-RFO");
  requireCondition(decision?.affectedPacketFamilies.includes(GA_GUIDANCE), "Georgia controlling decision no longer names this family");
  requireCondition(decision.recordedAuthority.includes("Use a custom participant petition packet."), "Georgia petition authority changed");
  requireCondition(decision.recordedAuthority.includes("No consent means attorney/prosecutor handoff."), "Georgia consent boundary changed");
  map.set(GA_GUIDANCE, {
    familyId: GA_GUIDANCE, implementationStrategy: "custom_pleading", authority: [ga.evidence],
    authoritySelector: "decisions[decisionId=CLD-2026-08-28-GA-RFO]",
    stages: [
      { stageId: "pre_consent", outputKind: "process_guidance", familyId: GA_GUIDANCE,
        destination: "Attorney or prosecutor handoff", participantFilesGeneratedOutput: false },
      { stageId: "verified_written_consent", outputKind: "custom_pleading", familyId: GA_PETITION,
        destination: "Court of conviction", participantFilesGeneratedOutput: true,
        gate: "Verified written prosecutorial consent held as an actual document; the guide cannot satisfy it.",
        acceptanceRequired: "Exact petition candidate and all required selected components, route binding and independent acceptance." },
      { stageId: "qualifying_order_on_or_after_2026_07_01", outputKind: "process_guidance", familyId: GA_GUIDANCE,
        destination: "Restriction, sealing, agency-distribution and verification tracking", participantFilesGeneratedOutput: false }
    ],
    nextExecutableAction: "Retain pre-consent guidance; consume and complete the existing separate post-consent petition candidate and post-order tracking. Do not count the guidance as petition acceptance.",
    createsTerminalState: false, createsCommercialAuthority: false
  });
  return map;
}

// Shared by the queue and by scoped build dispatch. This changes actual build
// inputs before source/form/route selection; it does not relabel old outputs.
export function reconcileFamilyBuildInputs({ familyId, routes, implementationStrategy, sourceReconciliation }, treatments) {
  const treatment = treatments.get(familyId);
  if (!treatment) return { routes, implementationStrategy, sourceReconciliation, treatment: null };
  return { routes: treatment.routes ?? routes,
    implementationStrategy: treatment.implementationStrategy,
    sourceReconciliation: treatment.sourceReconciliation ?? sourceReconciliation,
    treatment };
}

export function guidanceSourceReadiness(root, familyId, reconciliation) {
  const records = reconciliation?.guidanceAuthorityRecords ?? [];
  if (![CT_DESTRUCTION, CT_PROVISIONAL, CT_ABSOLUTE, WA_AUTOMATIC].includes(familyId) || records.length === 0) {
    return { ready: false, records: [], reasons: [] };
  }
  const bound = [], reasons = [];
  for (const record of records) {
    try {
      const bytes = fs.readFileSync(path.join(root, record.path));
      const actual = crypto.createHash("sha256").update(bytes).digest("hex");
      if (actual !== record.sha256) throw new Error("record digest does not match current bytes");
      bound.push({ ...record, actualSha256: actual });
    } catch (error) { reasons.push(`GUIDANCE_AUTHORITY_UNBOUND: ${record.path}: ${error.message}`); }
  }
  return { ready: bound.length === records.length && reasons.length === 0, records: bound, reasons };
}

export function preserveTreatmentAcceptance(state, treatment, reviewedGuidance = null) {
  // Only the file-backed adapter can supply a current independent guide read.
  // A later factual/source/owner hold still takes precedence over that read.
  if (treatment?.familyId === WA_AUTOMATIC && reviewedGuidance?.eligible === true
    && reviewedGuidance.familyId === WA_AUTOMATIC
    && !["LEGAL_BLOCKED", "WRONG_DELIVERY_TYPE", "SOURCE_BLOCKED", "FAIL_REPAIR_REQUIRED"].includes(state)) {
    return "GUIDANCE_READY";
  }
  // In particular, category-B labels are not guide review and a Georgia
  // pre-consent guide is not acceptance of the later petition stage.
  if (treatment && ["LEGITIMATE_GUIDANCE_ONLY", "GUIDANCE_READY", "COMPLETE_PACKET_PROVEN", "VERIFIED_PASS"].includes(state)) {
    return "PRODUCT_PATH_PENDING";
  }
  return state;
}
