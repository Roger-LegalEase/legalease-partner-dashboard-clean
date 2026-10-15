import {WY_1501_ROUTE,WY_1501_SOURCE,WY_1501_COPY,wy1501Context,wy1501Facts} from "@/lib/rcap-engine/wyoming-1501-facts";
import { texasGuidanceFinancialApplies, texasNondisclosureTimingContract, texasNondisclosureClock, TX_ND_ROUTES, TX_ND_TIMING_COPY, TX_ND_FACT_IDS } from "@/lib/rcap-engine/texas-nondisclosure-facts";
import { westVirginiaGuidanceFinancialApplies } from "@/lib/rcap-engine/west-virginia-guidance-financial";
import { southDakotaGuidanceFinancialApplies } from "@/lib/rcap-engine/south-dakota-guidance-financial";
import { southCarolinaGuidanceFinancialApplies } from "@/lib/rcap-engine/south-carolina-guidance-financial";
import { newJerseyMarijuanaStatusFinancialApplies } from "@/lib/rcap-engine/new-jersey-marijuana-status-financial";
import { oklahomaCleanSlateFinancialApplies } from "@/lib/rcap-engine/oklahoma-clean-slate-financial";
import { WY_1401_ROUTE, WY_1401_SOURCE, WY_1401_COPY, wy1401Context, wy1401Facts } from "@/lib/rcap-engine/wyoming-1401-facts";
import { newMexicoGuidanceFinancialApplies } from "@/lib/rcap-engine/new-mexico-guidance-financial";
import { montanaRecordFinancialApplies } from "@/lib/rcap-engine/montana-record-correction-financial";
import { CA_12034_ROUTE, CA_12034_SOURCE, CA_12034_COPY, ca12034Contract, ca12034Context, ca12034Facts, ca12034KnownConviction } from "@/lib/rcap-engine/california-1203-4-facts";
import { ndFirstOffenseFacts, ND_FIRST_OFFENSE_SOURCE, ND_FIRST_OFFENSE_COPY } from "@/lib/rcap-engine/north-dakota-first-offense-facts";
import { oregonDispositionFilingFacts, OR_DISPOSITION_COPY } from "@/lib/rcap-engine/oregon-disposition-identity";
import { montanaDeferredFacts, MT_DEFERRED_COPY, MT_DEFERRED_SOURCE } from "@/lib/rcap-engine/montana-deferred-facts";
import { missouriMarijuanaStatusDecision, MO_MARIJUANA_COPY, MO_MARIJUANA_STATUS_SOURCE } from "@/lib/rcap-engine/missouri-marijuana-status-facts";
import { missouriClosedRecordQuestionApplies } from "@/lib/rcap-engine/missouri-closed-record-facts";
import { georgiaPardonPetitionPlan } from "@/lib/expungement-ai/ga-pardon-petition-readiness";
import { maineNonconvictionQuestionApplies, maineMissingFinancialCorrectionPathway } from "@/lib/rcap-engine/maine-nonconviction-facts";
import { louisianaAutomationStatusQuestionApplies } from "@/lib/rcap-engine/louisiana-automation-status";
import { nebraskaNonconvictionQuestionApplies, nebraskaMissingFinancialCorrectionPathway } from "@/lib/rcap-engine/nebraska-nonconviction-facts";
import { AR_RECORD_ORIGIN_ID, AR_RECORD_ORIGIN_SOURCE, AR_RECORD_ORIGIN_COPY, arkansasRecordOrigin, arkansasRecordOriginApplies } from "@/lib/rcap-engine/arkansas-record-origin";
import { GA_PARDON_ROUTE, GA_PARDON_COPY, GA_PARDON_SOURCE, georgiaPardonFacts } from "@/lib/rcap-engine/georgia-pardon-facts";
import { convictionReliefRequest, convictionOutcomeCompatible, CONVICTION_RELIEF_COPY, CONVICTION_RELIEF_SOURCE } from "@/lib/rcap-engine/conviction-relief-request";
import { MS_EXACT_TIMING_FACT_IDS, MS_TIMING_MISSING_TEXT, MS_TIMING_MULTIPLE_MISSING_TEXT, msExactCalendarDate } from "@/lib/rcap-engine/mississippi-exact-timing";
import { pathwayFromContext } from "@/lib/rcap-engine/pathway-context";
import { caProp64Facts, caProp64Pathway, caProp64ApplicationRequested, CA_PROP64_SOURCE, CA_PROP64_REASON_COPY, CA_PROP64_PROCEDURE_COPY, CA_PROP64_LEGACY_IDS } from "@/lib/rcap-engine/california-prop64-facts";
import { isCaProp64Pathway, CA_PROP64_COMPLETED } from "@/lib/expungement-ai/ca-prop64-choices";
import { ny16059Requested, ny16059History, ny16059Clock, NY_16059_ROUTE, NY_16059_SOURCE, NY_16059_REASON_COPY, NY_16059_LEGACY_IDS } from "@/lib/rcap-engine/new-york-16059-facts";
import { deAdultConviction, delawareConvictionDecision, delawareConvictionRoute, DE_COURT, DE_SBI, DE_SOURCE, DE_REASON_TEXT } from "@/lib/rcap-engine/delaware-conviction-rules";
import { MS_PROGRAM_COMPLETION_PATHWAYS, msProgramCompletionPredicates } from "@/lib/rcap-engine/mississippi-program-completion";
import { MS_CONDITIONAL_DISCHARGE_PATHWAY, msConditionalDischargePredicates } from "@/lib/rcap-engine/mississippi-conditional-discharge";
import { isIndependentPaidFinancialFact } from "@/lib/expungement-ai/court-completion-reuse";
import { kansasRecordScopeFromAnswers } from "@/lib/rcap-engine/kansas-record-scope";
import { KS_REGISTRATION_ROUTE, KS_REGISTRATION_SOURCE, KS_REGISTRATION_REVIEW_COPY } from "@/lib/rcap-engine/kansas-district-facts";
import { caProp64Choice, CA_PROP64_CURRENT } from "@/lib/expungement-ai/ca-prop64-choices";
import { caProp64RecordQuestions } from "@/lib/expungement-ai/ca-prop64-record-facts";
import { caProp64RecordAnswerState } from "@/lib/expungement-ai/ca-prop64-record-answer";
import { mississippiProgramRouteFromAnswers, selectComposedRoute } from "@/lib/rcap-engine/composed-route-selector";
import { georgiaFirstOffenderFromAnswers, GA_ORIGINAL_FIRST_OFFENDER_PATHWAY, GA_FIRST_OFFENDER_GUIDANCE, isGeorgiaFirstOffenderGuidance } from "@/lib/rcap-engine/georgia-first-offender";
import { illinoisCannabisFromAnswers, IL_CANNABIS_PATHWAY } from "@/lib/rcap-engine/illinois-cannabis-facts";
import { pathwayExcludedByKnownFacts, FACTUAL_PATHWAY_EXCLUSION_COPY } from "@/lib/rcap-engine/factual-pathway-exclusions";
import "server-only";

import crypto from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { answerText, isAffirmative, isExplicitUnknownAnswer, isNegative, requiredMissingPublicQuestionIds, validatePublicAnswerQuestionIds } from "@/lib/rcap-engine/answer-normalization";
import type { EngineProfile, PublicJurisdictionProfile, PublicQuestion, ScreeningAnswerValue, ScreeningEvaluation, ScreeningEvaluationRequest, ScreeningReason, ScreeningResultCode } from "@/lib/rcap-engine/contracts";
import { assertProfileVersion, getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import { isPacketPlanFulfillmentReady, packetPlanForPathway } from "@/lib/rcap-engine/packet-planner";
import { projectPublicProfile } from "@/lib/rcap-engine/public-profile-projection";
import { legalRouteContract, routeIsAutomaticOrNoFiling as legalRouteIsAutomaticOrNoFiling, routePaymentAuthority } from "@/lib/legal-authority/index";
import { resolveRoute } from "@/lib/legal-authority/resolve-route";
import type { FactSnapshotMap } from "@/lib/legal-authority/conditions";
import { relevantFactIds } from "@/lib/rcap-engine/route-fact-relevance";
import {
  NEVADA_176A_BRANCH_FACT_IDS,
  NEVADA_176A_ROUTE_KEY,
  NEVADA_176A_SUBSECTION_1_GUIDANCE,
  NEVADA_176A_SUBSECTION_3_BARRED_TEXT,
  NEVADA_176A_SUBSECTION_3_UNRESOLVED_TEXT,
  NEVADA_176A_UNRESOLVED_BRANCH_TEXT,
  nevada176AQuestionApplies,
  nevada176ABranch,
  nevada176ASubsection3
} from "@/lib/rcap-engine/nevada-176a-branch";
import routeKindAdjudications from "@/../data/rcap-ledger/route-kind-adjudications.json";
import routePresentationConflicts from "@/../data/rcap-ledger/route-presentation-conflicts.json";
import packetCorrectionRequired from "@/../data/rcap-ledger/packet-correction-required.json";
import routeRatificationRegistry from "@/../data/record-clearing/legal-decisions/route-ratification-registry.json";

const SAFE_RESULT_ORDER: ScreeningResultCode[] = [
  "hard_stop",
  "likely_not_eligible",
  "needs_more_info",
  "not_yet",
  "needs_review",
  "guidance_only",
  "packet_ready_with_caution",
  "packet_ready"
];

/**
 * Per-route legal ratification, projected from the one controlling registry.
 *
 * These Sets used to be hand-maintained literals here, and the compiled profiles
 * carried a second `lawrenceRatification` block that said something different:
 * 80 routes ratified in one, 53 in the other, 40 in common. Two editable records
 * of the same legal fact is not redundancy, it is a coin flip — and a route
 * counsel holds to guidance was picked as a build candidate off the wrong one.
 *
 * So the registry is the authority and both structures are projections of it.
 * Nothing here may be edited to add or remove a route: a status changes when
 * counsel decides it changes, in
 * data/record-clearing/legal-decisions/route-ratification-registry.json, and the
 * projections follow. Runtime usage never established legal authority; it only
 * ever recorded someone's reading of it.
 */
const ROUTE_RATIFICATION_REGISTRY = routeRatificationRegistry as {
  routes: Array<{ routeKey: string; status: string; cautionOverride: boolean }>;
};

const RATIFIED_DEPLOYABLE_ROUTES = new Set<string>(
  ROUTE_RATIFICATION_REGISTRY.routes
    .filter((entry) => entry.status === "ratified_deployable")
    .map((entry) => entry.routeKey)
);

// Legally signed-off administrative-application packet routes. These are the ONLY non-court-petition
// routes permitted to open payment (Hawaii HCJDC 159(b) and Maryland § 10-103 agency applications). Every other automatic / admin /
// board / pardon / prosecutor / no-filing route stays guidance-only. Adding a route here requires the
// same legal signoff and both-direction verifier proof as a court-petition route.
const ADMINISTRATIVE_APPLICATION_PACKET_ROUTES = new Set([
  "HI:nonconviction-arrest-expungement",
  "HI:first-time-drug-conviction",
  "HI:dui-under-21-conviction",
  "MD:police-record-expungement-when-no-charge-was-filed-under-10-103"
]);
const HI_ADMIN_CONVICTION_ROUTES = new Set([
  "HI:first-time-drug-conviction",
  "HI:dui-under-21-conviction"
]);

// Held routes that carry corrected wait/anchor logic but did NOT pass both-direction proof during
// Target 51 Batch 1 (a qualifying case did not open payment — a required intake fact/anchor is missing,
// or the relief is automatic and not a paid product). They stay held (no payment) pending that work;
// see docs/expungement-ai/LEGAL_ACTION_REQUIRED.md. WY:adult-non-conviction is automatic-relief and is
// held as a non-paid product.
const CORRECTED_AWAITING_RECONFIRM_ROUTES = new Set<string>(
  ROUTE_RATIFICATION_REGISTRY.routes
    .filter((entry) => entry.status === "corrected_awaiting_reconfirmation")
    .map((entry) => entry.routeKey)
);

// Ratified routes whose compiled source rule is conservatively `needs_review` but which Lawrence
// ratified (2026-07-01) as caution-tier packet routes (e.g. discretionary court set-asides). The
// review short-circuit is skipped for these so the caution packet + payment can open; they still
// pass every timing, precondition, exclusion, and pending-charge gate first.
const RATIFIED_CAUTION_OVERRIDE_ROUTES = new Set<string>(
  ROUTE_RATIFICATION_REGISTRY.routes
    .filter((entry) => entry.cautionOverride === true)
    .map((entry) => entry.routeKey)
);

const HARD_GATE_PENDING_ROUTES = new Set<string>(
  ROUTE_RATIFICATION_REGISTRY.routes
    .filter((entry) => entry.status === "hard_gate_pending")
    .map((entry) => entry.routeKey)
);

const HELD_GUIDANCE_ROUTES = new Set<string>(
  ROUTE_RATIFICATION_REGISTRY.routes
    .filter((entry) => entry.status === "held_guidance")
    .map((entry) => entry.routeKey)
);

const APPROVED_RELEASE_GUIDANCE_ROUTES = new Set<string>(
  ROUTE_RATIFICATION_REGISTRY.routes
    .filter((entry) => entry.status === "approved_release_guidance")
    .map((entry) => entry.routeKey)
);

const INTENTIONAL_UNSUPPORTED_ROUTES = new Set<string>(
  ROUTE_RATIFICATION_REGISTRY.routes
    .filter((entry) => entry.status === "intentional_unsupported")
    .map((entry) => entry.routeKey)
);

export class UnsupportedJurisdictionError extends Error {
  constructor(readonly jurisdiction: string) {
    super(`Unsupported jurisdiction: ${jurisdiction}`);
    this.name = "UnsupportedJurisdictionError";
  }
}

export class ProfileVersionMismatchError extends Error {
  constructor(readonly currentProfileVersion: string) {
    super("Profile version mismatch.");
    this.name = "ProfileVersionMismatchError";
  }
}

export class InvalidAnswerError extends Error {
  constructor(readonly invalidQuestionIds: string[]) {
    super(`Unknown question ids: ${invalidQuestionIds.join(", ")}`);
    this.name = "InvalidAnswerError";
  }
}

export function evaluateScreening(request: ScreeningEvaluationRequest): ScreeningEvaluation {
  const profile = getProfileByJurisdiction(request.jurisdiction);
  if (!profile) throw new UnsupportedJurisdictionError(request.jurisdiction);

  const version = assertProfileVersion(profile, request.profileVersion);
  if (!version.ok) throw new ProfileVersionMismatchError(version.currentProfileVersion);

  const publicProfile = projectPublicProfile(profile);
  const invalidQuestionIds = validatePublicAnswerQuestionIds(publicProfile, request.answers);
  if (invalidQuestionIds.length > 0) throw new InvalidAnswerError(invalidQuestionIds);

  return evaluateAgainstProfile(profile, request);
}

export function evaluationHash(evaluation: ScreeningEvaluation, answers: Record<string, unknown>) {
  return crypto.createHash("sha256").update(JSON.stringify({
    jurisdiction: evaluation.jurisdiction,
    profileVersion: evaluation.profileVersion,
    matterId: evaluation.matterId,
    resultCode: evaluation.resultCode,
    pathwayId: evaluation.pathwayId,
    reasonCodes: evaluation.reasons.map((reason) => reason.code),
    answers
  })).digest("hex");
}

function evaluateAgainstProfile(profile: EngineProfile, request: ScreeningEvaluationRequest): ScreeningEvaluation {
  const evaluated = evaluateProfileRules(profile, request);
  if (!evaluated.pathwayId || !arkansasRecordOriginApplies(profile.jurisdiction.code, evaluated.pathwayId)
    || ["hard_stop", "likely_not_eligible"].includes(evaluated.resultCode)) return evaluated;
  const origin = arkansasRecordOrigin(request.answers);
  if (origin === "arkansas") return evaluated;
  const code = origin === "unknown" ? "unknown" : "outside";
  const text = AR_RECORD_ORIGIN_COPY[code][0];
  // Tighten only the record-origin predicate. Preserve the existing route,
  // source/form plan and all independent legal/fulfillment holds.
  return { ...evaluated, resultCode: code === "unknown" ? "needs_more_info" : "likely_not_eligible",
    reasons: [reason("AR", `record_origin_${code}`, text, AR_RECORD_ORIGIN_SOURCE)],
    missingQuestionIds: code === "unknown" ? [AR_RECORD_ORIGIN_ID] : [], nextSteps: [text], paymentAllowed: false };
}

function evaluateProfileRules(profile: EngineProfile, request: ScreeningEvaluationRequest): ScreeningEvaluation {
  const answers = request.answers;
  const jurisdiction = profile.jurisdiction.code;
  const hardStop = hardStopReason(profile, answers);
  if (hardStop) return result(profile, request, "hard_stop", [hardStop]);

  const publicProfile = projectPublicProfile(profile);
  const preselectedPathway = selectPathway(profile, answers);
  if (ca12034Context(profile, preselectedPathway?.id, answers)) {
    const facts = ca12034Facts(answers);
    const contextIds = [
      ...(["Yes", "I am helping someone complete their own check"].includes(answers.ownership_scope as string) ? [] : ["ownership_scope"]),
      ...(answers.jurisdiction_scope === "State or local" ? [] : ["jurisdiction_scope"])
    ];
    const code = contextIds.length ? "missing" : facts.code;
    const text = CA_12034_COPY[code][0];
    const selected = !contextIds.length && ca12034KnownConviction(answers);
    const plan = selected ? packetPlanForPathway(profile, CA_12034_ROUTE) : undefined;
    const ready = !contextIds.length && facts.status === "preparation";
    const evaluated = result(profile, request, ready ? "needs_review"
      : contextIds.length || facts.status === "missing" ? "needs_more_info"
      : facts.status === "not_yet" ? "not_yet" : "needs_review",
      [reason("CA", `probation_${code}`, text, CA_12034_SOURCE)],
      { ...(selected ? { pathwayId: CA_12034_ROUTE } : {}), ...(plan ? {packetPlan:plan} : {}),
        missingQuestionIds: [...contextIds, ...facts.ids], paymentAllowed:false });
    // This is preparation for the participant's stated election, not a merits
    // or exclusion-list determination. The actual Grade-A authority gate stays separate.
    return {...evaluated, userLabel:text, nextSteps:[text]};
  }
  if (wy1501Context(profile,preselectedPathway?.id,answers)) {
    const facts=wy1501Facts(answers,evaluationToday().toISOString().slice(0,10));
    const contextIds=[...(["Yes","I am helping someone complete their own check"].includes(answers.ownership_scope as string)?[]:["ownership_scope"]),...(answers.jurisdiction_scope==="State or local"?[]:["jurisdiction_scope"])];
    const code=contextIds.length?"missing":facts.code,text=WY_1501_COPY[code][0],plan=contextIds.length?undefined:packetPlanForPathway(profile,WY_1501_ROUTE);
    const evaluated=result(profile,request,contextIds.length||facts.status==="missing"?"needs_more_info":facts.status==="excluded"?"likely_not_eligible":facts.status==="not_yet"?"not_yet":"needs_review",[reason("WY",`misdemeanor_${code}`,text,WY_1501_SOURCE)],{...(contextIds.length?{}:{pathwayId:WY_1501_ROUTE}),...(plan?{packetPlan:plan}:{}),missingQuestionIds:[...contextIds,...facts.ids],paymentAllowed:false});
    return {...evaluated,userLabel:text,nextSteps:[text]};
  }
  if (wy1401Context(profile,preselectedPathway?.id,answers)) {
    const facts=wy1401Facts(answers,evaluationToday().toISOString().slice(0,10));
    const contextIds=[...(["Yes","I am helping someone complete their own check"].includes(answers.ownership_scope as string)?[]:["ownership_scope"]),...(answers.jurisdiction_scope==="State or local"?[]:["jurisdiction_scope"])];
    const code=contextIds.length?"missing":facts.code, text=WY_1401_COPY[code][0];
    const plan=contextIds.length?undefined:packetPlanForPathway(profile,WY_1401_ROUTE);
    const evaluated=result(profile,request,contextIds.length||facts.status==="missing"?"needs_more_info":facts.status==="excluded"?"likely_not_eligible":facts.status==="not_yet"?"not_yet":"needs_review",
      [reason("WY",`nonconviction_${code}`,text,WY_1401_SOURCE)],
      {...(contextIds.length?{}:{pathwayId:WY_1401_ROUTE}),...(plan?{packetPlan:plan}:{}),missingQuestionIds:[...contextIds,...facts.ids],paymentAllowed:false});
    return {...evaluated,userLabel:text,nextSteps:[text]};
  }
  const ndPossession = ndFirstOffenseFacts(profile, preselectedPathway?.id, answers, evaluationToday().toISOString().slice(0, 10));
  if (preselectedPathway && ndPossession.status !== "not_applicable") {
    const contextIds = [
      ...(["Yes", "I am helping someone complete their own check"].includes(answers.ownership_scope as string) ? [] : ["ownership_scope"]),
      ...(answers.jurisdiction_scope === "State or local" ? [] : ["jurisdiction_scope"])
    ];
    const code = contextIds.length || ndPossession.status === "missing" ? "needs_more_info"
      : ndPossession.status === "excluded" ? "likely_not_eligible" : "needs_review";
    const text = ND_FIRST_OFFENSE_COPY[contextIds.length ? "missing" : ndPossession.code][0];
    const plan = packetPlanForPathway(profile, preselectedPathway.id);
    // Only factual eligibility is classified. No generic timing bucket,
    // neighbouring-route wait, composed track or commercial permission follows.
    return result(profile, request, code,
      [reason("ND", `first_possession_${contextIds.length ? "missing" : ndPossession.code}`, text, ND_FIRST_OFFENSE_SOURCE)],
      { pathwayId: preselectedPathway.id, ...(plan ? {packetPlan: plan} : {}),
        missingQuestionIds: [...contextIds, ...ndPossession.ids], paymentAllowed: false });
  }
  const oregon = jurisdiction === "OR" ? selectComposedRoute({
    jurisdiction, pathwayId: preselectedPathway?.id,
    oregonDispositionSource: { profileVersion: profile.profileVersion,
      sourceFingerprint: profile.source?.sourceCorpusSha256 ?? "", answers }
  }) : null;
  if (oregon?.status === "held_configuration" || oregon?.status === "configuration_clarification") {
    const currentPath = oregon.status === "held_configuration" ? oregon.configuration.pathwayId : undefined;
    const held = (code: ScreeningResultCode, reasonCode: string, text: string, ids: string[] = []) => ({
      ...result(profile, request, code, [reason("OR", reasonCode, text, "OR-disposition-configurations.v1;LWD-2026-08-29-OR-SUBSECTION")],
        { pathwayId: currentPath, missingQuestionIds: ids, paymentAllowed: false, cautions: [OR_DISPOSITION_COPY.caution[0]] }),
      userLabel: text, nextSteps: [text]
    });
    if (oregon.status === "configuration_clarification") return held("needs_more_info", "disposition_configuration_uncertain", OR_DISPOSITION_COPY.clarify[0], oregon.missingQuestionIds);
    // Keep the exact existing category guard. It is a preliminary review, not
    // proof of the statutory offense predicates, and never a new statewide ban.
    if (!Array.isArray(answers.state_exclusion_categories) || !answers.state_exclusion_categories.length) {
      return held("needs_more_info", "missing_required_facts", "Required public screening facts are missing.", ["state_exclusion_categories"]);
    }
    const excluded = exclusionReason(profile, answers);
    if (excluded) return { ...held("needs_review", "disposition_exclusion_review", excluded.text, ["state_exclusion_categories"]), reasons: [excluded] };
    if (answers.pending_cases !== "No") return held(answers.pending_cases === "Yes" ? "needs_review" : "needs_more_info", "disposition_pending_review", OR_DISPOSITION_COPY.pending[0], ["pending_cases"]);
    const facts = oregonDispositionFilingFacts(answers, evaluationToday().toISOString().slice(0, 10));
    const text = facts.code === "disposition_facts_supported" ? OR_DISPOSITION_COPY.supported[0]
      : facts.code === "identity" ? OR_DISPOSITION_COPY.clarify[0] : OR_DISPOSITION_COPY[facts.code][0];
    const code = facts.status === "missing" ? "needs_more_info" : facts.status === "not_yet" ? "not_yet" : "needs_review";
    // Source-specific disposition facts replace only the retired generic
    // conviction-clock path. Packet/case facts and actual authority are separate.
    return held(code, `disposition_${facts.code}`, text, facts.ids);
  }
  const mtDeferred = jurisdiction === "MT" ? montanaDeferredFacts(profile, preselectedPathway?.id, answers) : null;
  if (mtDeferred && mtDeferred.context !== "not_applicable" && preselectedPathway) {
    const contextIds = [
      ...(typeof answers.ownership_scope === "string" && ["Yes", "I am helping someone complete their own check"].includes(answers.ownership_scope) ? [] : ["ownership_scope"]),
      ...(answers.jurisdiction_scope === "State or local" ? [] : ["jurisdiction_scope"])
    ];
    if (contextIds.length) return result(profile, request,
      contextIds.some(id => answers[id] === undefined || answers[id] === null || answers[id] === "") ? "needs_more_info" : "needs_review",
      [reason("MT", "deferred_context_missing", MT_DEFERRED_COPY.context_missing[0], MT_DEFERRED_SOURCE)],
      { missingQuestionIds: contextIds, paymentAllowed: false });
    const guidance = ["existing_order_followup", "felony_statutory_request_context", "misdemeanor_discretionary_request_context"].includes(mtDeferred.context);
    const resultCode = guidance ? "guidance_only" : mtDeferred.context === "term_not_terminated" ? "not_yet"
      : mtDeferred.context === "facts_unresolved" && mtDeferred.ids.some(id => answers[id] === undefined || answers[id] === "") ? "needs_more_info" : "needs_review";
    const plan = guidance ? packetPlanForPathway(profile, preselectedPathway.id) : undefined;
    return result(profile, request, resultCode,
      [reason("MT", `deferred_${mtDeferred.context}`, MT_DEFERRED_COPY[mtDeferred.context][0], MT_DEFERRED_SOURCE)],
      { pathwayId: preselectedPathway.id, missingQuestionIds: guidance ? [] : mtDeferred.ids,
        ...(plan ? { packetPlan: plan } : {}), paymentAllowed: false });
  }

  // Exact selected Article XIV status contract: custody and original record
  // facts decide guidance/referral, never the generic payment-completion gate.
  // Ownership and jurisdiction must already be explicit; hard stops ran above.
  const moMarijuana = jurisdiction === "MO"
    ? missouriMarijuanaStatusDecision(profile, preselectedPathway?.id, answers) : null;
  if (moMarijuana && preselectedPathway) {
    const unresolvedContext = [
      ...(typeof answers.ownership_scope === "string" && ["Yes", "I am helping someone complete their own check"].includes(answers.ownership_scope) ? [] : ["ownership_scope"]),
      ...(answers.jurisdiction_scope === "State or local" ? [] : ["jurisdiction_scope"])
    ];
    if (unresolvedContext.length) return result(profile, request,
      unresolvedContext.some(id => answers[id] === undefined || answers[id] === null || answers[id] === "") ? "needs_more_info" : "needs_review",
      [reason("MO", "marijuana_context_missing", MO_MARIJUANA_COPY.context_missing[0], MO_MARIJUANA_STATUS_SOURCE)],
      { missingQuestionIds: unresolvedContext, paymentAllowed: false });
    const text = MO_MARIJUANA_COPY[moMarijuana.code][0];
    const plan = moMarijuana.status === "guidance" ? packetPlanForPathway(profile, preselectedPathway.id) : undefined;
    return result(profile, request, moMarijuana.status === "missing" ? "needs_more_info" : moMarijuana.status === "review" ? "needs_review" : "guidance_only",
      [reason("MO", `marijuana_${moMarijuana.code}`, text, MO_MARIJUANA_STATUS_SOURCE)],
      { pathwayId: preselectedPathway.id, missingQuestionIds: moMarijuana.ids,
        ...(plan ? { packetPlan: plan } : {}), paymentAllowed: false });
  }

  const missingQuestionIds = requiredMissingPublicQuestionIds(publicProfile, answers)
    .filter(id => montanaRecordFinancialApplies(profile, preselectedPathway?.id, answers, id))
    .filter(id => newMexicoGuidanceFinancialApplies(profile, preselectedPathway?.id, answers, id))
    .filter(id => newJerseyMarijuanaStatusFinancialApplies(profile, preselectedPathway?.id, answers, id))
    .filter(id => texasGuidanceFinancialApplies(profile, preselectedPathway?.id, answers, id))
    .filter(id => westVirginiaGuidanceFinancialApplies(profile, preselectedPathway?.id, answers, id))
    .filter(id => southDakotaGuidanceFinancialApplies(profile, preselectedPathway?.id, answers, id))
    .filter(id => southCarolinaGuidanceFinancialApplies(profile, preselectedPathway?.id, answers, id))
    .filter(id => oklahomaCleanSlateFinancialApplies(profile, preselectedPathway?.id, answers, id))
    .filter(id => nevada176AQuestionApplies(jurisdiction, preselectedPathway?.id, id))
    .filter(id => missouriClosedRecordQuestionApplies(jurisdiction, preselectedPathway?.id, answers, id, profile))
    .filter(id => maineNonconvictionQuestionApplies(jurisdiction, preselectedPathway?.id, answers, id))
    .filter(id => nebraskaNonconvictionQuestionApplies(jurisdiction, preselectedPathway?.id, answers, id))
    .filter(id => louisianaAutomationStatusQuestionApplies(jurisdiction, preselectedPathway?.id, id));
  if (missingQuestionIds.length > 0) {
    return result(profile, request, "needs_more_info", [reason(jurisdiction, "missing_required_facts", "Required public screening facts are missing.")], {
      missingQuestionIds,
      ...(nebraskaMissingFinancialCorrectionPathway(jurisdiction, preselectedPathway?.id, answers, missingQuestionIds)
        || maineMissingFinancialCorrectionPathway(jurisdiction, preselectedPathway?.id, answers, missingQuestionIds)
        ? { pathwayId: preselectedPathway!.id } : {})
    });
  }

  if (jurisdiction === "GA" && preselectedPathway?.id === GA_PARDON_ROUTE) {
    const facts = georgiaPardonFacts(answers, evaluationToday().toISOString().slice(0, 10));
    const petitionPlan = georgiaPardonPetitionPlan(profile, answers, evaluationToday());
    if (petitionPlan) return result(profile, request, "packet_ready_with_caution",
      [reason("GA", `pardon_${facts.code}`, GA_PARDON_COPY[facts.code][0], GA_PARDON_SOURCE)],
      { pathwayId: GA_PARDON_ROUTE, packetPlan: petitionPlan, paymentAllowed: true });
    return result(profile, request, facts.status === "missing" ? "needs_more_info" : facts.status === "excluded" ? "likely_not_eligible" : "needs_review",
      [reason("GA", `pardon_${facts.code}`, GA_PARDON_COPY[facts.code][0], GA_PARDON_SOURCE)],
      { pathwayId: GA_PARDON_ROUTE, missingQuestionIds: facts.ids, paymentAllowed: false });
  }

  if (jurisdiction === "NY" && preselectedPathway?.id === NY_16059_ROUTE) {
    const history = ny16059History(answers);
    if (history.status !== "satisfied") return result(profile, request,
      history.status === "missing" ? "needs_more_info" : history.status === "excluded" ? "likely_not_eligible" : "needs_review",
      [reason("NY", `ny_16059_${history.code}`, NY_16059_REASON_COPY[history.code!][0], NY_16059_SOURCE)],
      { pathwayId: NY_16059_ROUTE, missingQuestionIds: history.ids ?? [], paymentAllowed: false });
  }

  const caDecision = jurisdiction === "CA" && (isCaProp64Pathway(jurisdiction, preselectedPathway?.id) || caProp64ApplicationRequested(answers))
    ? caProp64Facts(answers, evaluationToday().toISOString().slice(0, 10)) : null;
  if (caDecision && caDecision.status !== "satisfied") return result(profile, request,
    caDecision.status === "missing" ? "needs_more_info" : "needs_review",
    [reason("CA", `ca_prop64_${caDecision.code}`, CA_PROP64_REASON_COPY[caDecision.code!][0], CA_PROP64_SOURCE)],
    { ...(preselectedPathway ? { pathwayId: preselectedPathway.id } : {}), missingQuestionIds: caDecision.ids, paymentAllowed: false });

  // Check exact DE adult-conviction predicates before automatic guidance or
  // broad legacy categories can swallow a statutory exception or wrong tier.
  const deDecision = jurisdiction === "DE" ? delawareConvictionDecision(answers, evaluationToday().toISOString().slice(0, 10)) : null;
  if (deDecision && !["not_applicable", "satisfied"].includes(deDecision.status)) {
    const code = deDecision.status === "missing" ? "needs_more_info" : deDecision.status === "excluded" ? "likely_not_eligible" : deDecision.status === "not_yet" ? "not_yet" : "needs_review";
    return result(profile, request, code, [reason("DE", deDecision.code!, DE_REASON_TEXT[deDecision.code!], DE_SOURCE)], {
      ...(preselectedPathway ? { pathwayId: preselectedPathway.id } : {}), missingQuestionIds: deDecision.ids ?? [], paymentAllowed: false
    });
  }
  const exclusion = deDecision?.status === "satisfied" || caDecision?.status === "satisfied" ? undefined : exclusionReason(profile, answers);
  if (exclusion) return result(profile, request, exclusion.code.endsWith("unknown") ? "needs_review" : "likely_not_eligible", [exclusion]);

  const unknownDateQuestionIds = requiredUnknownPublicDateQuestionIds(publicProfile, answers);
  if (unknownDateQuestionIds.length > 0) {
    return result(profile, request, "needs_more_info", [reason(jurisdiction, "waiting_anchor_missing", "We need the case date, dismissal date, disposition date, or completion date used to check the waiting period.")], {
      missingQuestionIds: unknownDateQuestionIds,
      paymentAllowed: false
    });
  }

  const programRoute = jurisdiction === "MS" ? mississippiProgramRouteFromAnswers(answers) : null;
  if (programRoute?.status === "clarification") {
    return result(profile, request, "needs_more_info", [reason(jurisdiction, "program_order_or_closure_missing", "We need the program named in the court order and whether the court has entered the required dismissal or closure. Completing program tasks alone does not establish that the case was closed.", "LD-MS-01")], {
      missingQuestionIds: programRoute.missingQuestionIds,
      paymentAllowed: false
    });
  }
  const originalFirstOffender = jurisdiction === "GA" ? georgiaFirstOffenderFromAnswers(answers, evaluationToday().toISOString().slice(0, 10)) : null;
  if (originalFirstOffender?.status === "clarification") {
    return result(profile, request, "needs_more_info", [reason(jurisdiction, "original_first_offender_facts_missing", "Check whether the original sentence imposed First Offender treatment, its current status, and the sentencing or discharge date requested. Completing a program or requesting retroactive treatment does not establish those facts.", "LD-GA-01; GA.memo:ga-fo-*; HB162:sections3-4")], {
      missingQuestionIds: originalFirstOffender.missingQuestionIds,
      paymentAllowed: false
    });
  }
  const kansasScope = jurisdiction === "KS" ? kansasRecordScopeFromAnswers(answers) : null;
  if (kansasScope?.status === "clarification") {
    return result(profile, request, "needs_more_info", [reason(jurisdiction, "record_court_scope_missing", ["district_state_law", "municipal_appealed_to_district"].includes(String(answers.ks_record_court_scope)) ? "Check the requested detail about the law, court, final case outcome and the help you want. A city police arrest, charge level, program admission or optional legal-name hint does not establish the procedure. Record facts are checked separately from your request." : "Check the law, court, final case outcome and any diversion agreement. A city police arrest, charge level or program admission alone does not establish a municipal conviction or fulfilled diversion.", "KS.memo;KSA21-6614(a),(b),(f),(i);22-4908(i);12-4516;12-4516a")], {
      missingQuestionIds: kansasScope.missingQuestionIds, paymentAllowed: false
    });
  }
  if (kansasScope?.status === "district_review") {
    const text = {
      appeal_scope: "This municipal case was appealed to district court. The district-court procedure and form must match that appeal; the original municipal packet or an unrelated district procedure cannot substitute. The source provides for the district clerk to send an expungement order to municipal court, but the applicable filing details still need review.",
      program_record: "The arrangement entered is not a diversion agreement. A generic program or deferred-disposition answer cannot establish the district-court diversion procedure. Review the actual agreement or order and its final disposition.",
      registration_only: "You asked about ending registration without also requesting expungement. Those are separate requests. The combined record-clearing route cannot stand in for your request; the registration-only procedure and delivery scope need review.",
      registration_basis: "The registration record entered does not establish drug-only registration. The drug-offender registration procedure cannot be assumed for another category, mixed obligations or no current duty. Review the actual registration orders and the relief requested.",
      specialty_program: "The answers do not establish completed requirements of a specialty court established under K.S.A. 20-173. Ordinary treatment or diversion cannot substitute. Review the actual program record and other record-clearing options.",
      coercion_record: "The final statute entered is not K.S.A. 21-6419 or former K.S.A. 21-3512. The prostitution-specific coercion procedure cannot be established by the optional menu or a general description. Review the final record and other available procedures.",
      coercion_acts: "This request needs a private review of the circumstances and the applicable procedure. No account of coercion or supporting evidence will be invented, and this result does not deny every record-clearing option."
    }[kansasScope.code];
    return result(profile, request, "needs_review", [reason("KS", `district_${kansasScope.code}_review`, text, "KS.memo;KSA21-6614(a)(3),(b),(f);22-4908(a),(i)")], { paymentAllowed: false });
  }
  if (kansasScope?.status === "district_arrest") {
    return result(profile, request, "needs_review", [reason(jurisdiction, "district_arrest_route_requires_binding", "This district-court arrest record needs review under the applicable arrest-record procedure. It cannot be substituted into a municipal ordinance packet or a conviction-and-diversion packet.", "KS.memo:ks-22-2410-arrest;KSA22-2410")], { paymentAllowed: false });
  }
  const cannabis = jurisdiction === "IL" ? illinoisCannabisFromAnswers(answers) : null;
  if (cannabis?.status === "clarification") {
    return result(profile, request, "needs_more_info", [reason(jurisdiction, "cannabis_record_facts_missing", "Check the cannabis statute, final case outcome and requested next step. A charge level or completed program alone does not establish a qualifying conviction; nonfinancial completion is separate from money paid.", "IL.memo:il-cannabis-auto,il-cannabis-vacate;20-ILCS-2630/5.2(i)")], {
      missingQuestionIds: cannabis.missingQuestionIds,
      paymentAllowed: false
    });
  }
  const reliefRequest = convictionReliefRequest(profile, answers);
  if (reliefRequest.status === "clarification" || reliefRequest.status === "review") {
    const code = reliefRequest.status === "clarification" ? "missing" : reliefRequest.code;
    return result(profile, request, reliefRequest.status === "clarification" ? "needs_more_info" : "needs_review",
      [reason(jurisdiction, `conviction_relief_${code}`, CONVICTION_RELIEF_COPY[code][0], CONVICTION_RELIEF_SOURCE)], {
        missingQuestionIds: reliefRequest.status === "clarification" ? reliefRequest.missingQuestionIds : [], paymentAllowed: false
      });
  }
  const ambiguity = ambiguityReason(profile, publicProfile, answers, preselectedPathway);
  if (ambiguity) {
    const financialUnknown = ambiguity.text === "financial_obligations is uncertain and requires source review.";
    return result(profile, request, "needs_review", [financialUnknown ? { ...ambiguity, text: FINANCIAL_CLARIFICATION_TEXT } : ambiguity], {
      ...(financialUnknown ? { missingQuestionIds: ["financial_obligations"] } : {}),
      ...(preselectedPathway ? { pathwayId: preselectedPathway.id } : {})
    });
  }

  if (jurisdiction === "KS" && preselectedPathway?.id === KS_REGISTRATION_ROUTE) {
    // KS-02: a petition, with unproved statutory facts; neither automatic relief
    // nor a payment/waiver finding may be inferred from the broad old answers.
    return result(profile, request, "needs_review", [reason("KS", "registration_statutory_facts_review", KS_REGISTRATION_REVIEW_COPY[0], KS_REGISTRATION_SOURCE)], {
      pathwayId: KS_REGISTRATION_ROUTE, paymentAllowed: false
    });
  }
  const preRouteSafetyGate = preselectedPathway ? routeSpecificSafetyGate(profile, answers, preselectedPathway) : undefined;
  if (preselectedPathway && preRouteSafetyGate) {
    const code = preRouteSafetyGate.code.endsWith("not_eligible") ? "likely_not_eligible" : "needs_review";
    return result(profile, request, code, [preRouteSafetyGate], {
      pathwayId: preselectedPathway.id,
      paymentAllowed: false
    });
  }
  const preAuthorityGate = preselectedPathway ? legalAuthorityGate(profile, preselectedPathway) : undefined;
  if (preselectedPathway && preAuthorityGate) {
    return result(profile, request, "needs_review", [preAuthorityGate], {
      pathwayId: preselectedPathway.id,
      paymentAllowed: false
    });
  }
  if (preselectedPathway && routeIsIntentionalUnsupported(profile, preselectedPathway)) {
    const plan = packetPlanForPathway(profile, preselectedPathway.id);
    return result(profile, request, "not_covered_yet", [reason(jurisdiction, "intentional_unsupported_route", "LegalEase intentionally does not support this source-defined route as a participant service.", preselectedPathway.sourceRef)], {
      pathwayId: preselectedPathway.id,
      ...(plan ? { packetPlan: plan } : {}),
      paymentAllowed: false
    });
  }
  const preMissingProductFacts = preselectedPathway ? missingProductFactIds(profile, answers, preselectedPathway) : [];
  if (preselectedPathway && preMissingProductFacts.length > 0) {
    return result(profile, request, "needs_more_info", [reason(jurisdiction, "court_petition_preconditions_missing", "Required court-petition precondition facts are missing.")], {
      pathwayId: preselectedPathway.id,
      missingQuestionIds: preMissingProductFacts,
      paymentAllowed: false
    });
  }
  const preCorrection = preselectedPathway ? packetCorrectionReason(profile, preselectedPathway) : undefined;
  if (preselectedPathway && preCorrection) {
    const plan = packetPlanForPathway(profile, preselectedPathway.id);
    return result(profile, request, "needs_review", [preCorrection], {
      pathwayId: preselectedPathway.id,
      ...(plan ? { packetPlan: plan } : {}),
      paymentAllowed: false
    });
  }
  const preConflict = preselectedPathway ? presentationConflictReason(profile, preselectedPathway, answers) : undefined;
  if (preselectedPathway && preConflict) {
    const plan = packetPlanForPathway(profile, preselectedPathway.id);
    return result(profile, request, "needs_review", [preConflict], {
      pathwayId: preselectedPathway.id,
      ...(plan ? { packetPlan: plan } : {}),
      paymentAllowed: false
    });
  }
  const activeProgramReferral = preselectedPathway ? activeProgramReferralReason(profile, answers, preselectedPathway) : undefined;
  if (preselectedPathway && activeProgramReferral) {
    return result(profile, request, "needs_review", [activeProgramReferral], {
      pathwayId: preselectedPathway.id,
      paymentAllowed: false
    });
  }
  // Execute the exact retained TX event/subtype clock before mixed legacy
  // summaries can classify petitioned nondisclosure as automatic guidance.
  // Automatic information remains available even with missing timing facts.
  const txClock = preselectedPathway ? texasNondisclosureClock(profile, preselectedPathway.id, answers, evaluationToday().toISOString().slice(0,10)) : null;
  if (txClock && preselectedPathway && preselectedPathway.id !== TX_ND_ROUTES[0] && txClock.status !== "elapsed") {
    const plan = packetPlanForPathway(profile, preselectedPathway.id);
    return result(profile, request, txClock.status === "missing" ? "needs_more_info" : txClock.status === "not_yet" ? "not_yet" : "needs_review",
      [reason("TX", `nondisclosure_${txClock.code}`, TX_ND_TIMING_COPY[txClock.status][0], `TX.memo;GovtCode${txClock.section}`)],
      { pathwayId: preselectedPathway.id, ...(plan ? {packetPlan:plan} : {}), missingQuestionIds: txClock.ids, paymentAllowed: false });
  }
  const preProductGuidance = preselectedPathway ? productGuidanceReason(profile, answers, preselectedPathway) : undefined;
  if (preselectedPathway && preProductGuidance) {
    const plan = packetPlanForPathway(profile, preselectedPathway.id);
    return result(profile, request, "guidance_only", [preProductGuidance], {
      pathwayId: preselectedPathway.id,
      ...(plan ? { packetPlan: plan } : {}),
      paymentAllowed: false
    });
  }
  // Backstop for the same structural fact when the product-guidance checks
  // above stop firing (e.g. a later ratification flips the court-filed
  // classification): a selected automatic/no-filing pathway resolves to
  // guidance before any compiled rule can route it toward a packet.
  if (preselectedPathway && routeIsAutomaticOrNoFiling(profile, preselectedPathway)) {
    const plan = packetPlanForPathway(profile, preselectedPathway.id);
    return result(profile, request, "guidance_only", [reason(jurisdiction, "automatic_or_no_filing_route", guidanceTextForPathway(profile, preselectedPathway), preselectedPathway.sourceRef)], {
      pathwayId: preselectedPathway.id,
      ...(plan ? { packetPlan: plan } : {}),
      paymentAllowed: false
    });
  }
  if (preselectedPathway && routeBranchIsAutomaticOrNoFiling(profile, answers, preselectedPathway)) {
    const plan = packetPlanForPathway(profile, preselectedPathway.id);
    return result(profile, request, "guidance_only", [reason(jurisdiction, "automatic_or_no_filing_branch", NEVADA_176A_SUBSECTION_1_GUIDANCE, preselectedPathway.sourceRef)], {
      pathwayId: preselectedPathway.id,
      ...(plan ? { packetPlan: plan } : {}),
      paymentAllowed: false
    });
  }

  const route = matchCompiledRuleRoute(profile, publicProfile, answers);
  if (!route.ok) {
    // Same correction as the timing gate below: where the participant's named
    // pathway was already resolved, say which one it was. A compiled rule that
    // short-circuits to needs_more_info, or an exact route rule the facts did
    // not satisfy, is still a fact about a specific route.
    const failedPathwayPlan = route.selectedPathwayId ? packetPlanForPathway(profile, route.selectedPathwayId) : undefined;
    return result(profile, request, route.resultCode, [route.reason], {
      ...(route.selectedPathwayId ? { pathwayId: route.selectedPathwayId } : {}),
      ...(failedPathwayPlan ? { packetPlan: failedPathwayPlan } : {}),
      paymentAllowed: false
    });
  }

  const safetyGate = routeSpecificSafetyGate(profile, answers, route.pathway);
  if (safetyGate) {
    const code = safetyGate.code.endsWith("not_eligible") ? "likely_not_eligible" : "needs_review";
    return result(profile, request, code, [safetyGate], {
      pathwayId: route.pathway.id,
      paymentAllowed: false
    });
  }

  const pathway = route.pathway;
  const authorityGate = legalAuthorityGate(profile, pathway);
  if (authorityGate) {
    return result(profile, request, "needs_review", [authorityGate], {
      pathwayId: pathway.id,
      paymentAllowed: false
    });
  }
  if (routeIsIntentionalUnsupported(profile, pathway)) {
    const unsupportedPlan = packetPlanForPathway(profile, pathway.id);
    return result(profile, request, "not_covered_yet", [reason(jurisdiction, "intentional_unsupported_route", "LegalEase intentionally does not support this source-defined route as a participant service.", pathway.sourceRef)], {
      pathwayId: pathway.id,
      ...(unsupportedPlan ? { packetPlan: unsupportedPlan } : {}),
      paymentAllowed: false
    });
  }
  const missingProductFacts = missingProductFactIds(profile, answers, pathway);
  if (missingProductFacts.length > 0) {
    return result(profile, request, "needs_more_info", [reason(jurisdiction, "court_petition_preconditions_missing", "Required court-petition precondition facts are missing.")], {
      pathwayId: pathway.id,
      missingQuestionIds: missingProductFacts,
      paymentAllowed: false
    });
  }
  const packetCorrection = packetCorrectionReason(profile, pathway);
  if (packetCorrection) {
    const plan = packetPlanForPathway(profile, pathway.id);
    return result(profile, request, "needs_review", [packetCorrection], {
      pathwayId: pathway.id,
      ...(plan ? { packetPlan: plan } : {}),
      paymentAllowed: false
    });
  }
  const presentationConflict = presentationConflictReason(profile, pathway, answers);
  if (presentationConflict) {
    const plan = packetPlanForPathway(profile, pathway.id);
    return result(profile, request, "needs_review", [presentationConflict], {
      pathwayId: pathway.id,
      ...(plan ? { packetPlan: plan } : {}),
      paymentAllowed: false
    });
  }
  const guidanceOnlyProduct = productGuidanceReason(profile, answers, pathway);
  if (guidanceOnlyProduct) {
    const plan = packetPlanForPathway(profile, pathway.id);
    return result(profile, request, "guidance_only", [guidanceOnlyProduct], {
      pathwayId: pathway.id,
      ...(plan ? { packetPlan: plan } : {}),
      paymentAllowed: false
    });
  }
  const plan = packetPlanForPathway(profile, pathway.id);
  // Structural, not plan-driven: an automatic/no-filing route resolves to
  // guidance even if its packet plan is missing or mislabeled. A matched
  // packet-ready rule (MI rule-11 before its correction) must not be able to
  // steer such a route toward checkout.
  if (routeIsAutomaticOrNoFiling(profile, pathway)) {
    return result(profile, request, "guidance_only", [reason(jurisdiction, "automatic_or_no_filing_route", guidanceTextForPathway(profile, pathway), route.rule.sourceRef ?? pathway.sourceRef)], {
      pathwayId: pathway.id,
      ...(plan ? { packetPlan: plan } : {}),
      paymentAllowed: false
    });
  }

  // The same structural veto, one level down: a route whose sections carry two
  // mechanisms is automatic or participant-filed according to the participant's
  // own case. Both gates run before the timing gate, because the automatic
  // branch has no waiting period to evaluate and a participant on it should be
  // told their relief is already happening rather than asked for a date.
  const unresolvedBranch = unresolvedRouteBranchReason(profile, answers, pathway);
  if (unresolvedBranch) {
    return result(profile, request, "needs_more_info", [unresolvedBranch.reason], {
      pathwayId: pathway.id,
      ...(plan ? { packetPlan: plan } : {}),
      missingQuestionIds: unresolvedBranch.missingQuestionIds,
      paymentAllowed: false
    });
  }
  if (routeBranchIsAutomaticOrNoFiling(profile, answers, pathway)) {
    return result(profile, request, "guidance_only", [reason(jurisdiction, "automatic_or_no_filing_branch", NEVADA_176A_SUBSECTION_1_GUIDANCE, route.rule.sourceRef ?? pathway.sourceRef)], {
      pathwayId: pathway.id,
      ...(plan ? { packetPlan: plan } : {}),
      paymentAllowed: false
    });
  }

  // The pathway is already resolved by the time the timing gate runs, and every
  // other branch on this path reports it. These three dropped it, so a
  // participant whose route was identified correctly and then stalled on a date
  // was told nothing about which route they were on — and a reachability audit
  // read the same silence as "landed on a different pathway". 118 of the 121
  // intended-paid pathways that failed the audit failed here, having resolved
  // the right route. Reporting the identity changes no result code, no
  // eligibility conclusion and no payment decision: all three stay exactly as
  // they were, paymentAllowed included.
  const timing = evaluateCompiledTiming(profile, answers, route.rule, route.pathway);
  if (timing.status === "missing_anchor") {
    return result(profile, request, "needs_more_info", [timing.reason], {
      pathwayId: pathway.id,
      ...(plan ? { packetPlan: plan } : {}),
      missingQuestionIds: timing.missingQuestionIds,
      paymentAllowed: false
    });
  }
  if (timing.status === "not_yet") {
    return result(profile, request, "not_yet", [timing.reason], {
      pathwayId: pathway.id,
      ...(plan ? { packetPlan: plan } : {}),
      cautions: ["A source-defined timing or completion condition is not satisfied."],
      paymentAllowed: false
    });
  }
  if (timing.status === "needs_review") {
    return result(profile, request, "needs_review", [timing.reason], {
      pathwayId: pathway.id,
      ...(plan ? { packetPlan: plan } : {}),
      paymentAllowed: false
    });
  }

  const legalContract = legalRouteContract(profile.jurisdiction.code, pathway.id);
  if (legalContract?.outcomeMode === "referral") {
    return result(profile, request, "needs_review", [reason(jurisdiction, "legal_authority_referral_required", "This route is limited to attorney-review referral after its source-defined timing facts are confirmed.", pathway.sourceRef)], {
      pathwayId: pathway.id,
      ...(plan ? { packetPlan: plan } : {}),
      paymentAllowed: false
    });
  }

  const postTimingPolicy = postTimingPolicyReason(profile, pathway);
  if (postTimingPolicy) {
    return result(profile, request, "needs_review", [postTimingPolicy], {
      pathwayId: pathway.id,
      ...(plan ? { packetPlan: plan } : {}),
      paymentAllowed: false
    });
  }

  const ruleCode = route.rule.then?.suggestedResultCode;
  if (ruleCode === "needs_review" && !routeIsRatifiedCautionOverride(profile, pathway)) {
    return result(profile, request, "needs_review", [reason(jurisdiction, `compiled_rule_review.${route.rule.id}`, "The matched compiled source rule requires review before a packet decision.", route.rule.sourceRef ?? pathway.sourceRef)], {
      paymentAllowed: false
    });
  }
  const selectedCode: ScreeningResultCode = ruleCode === "packet_ready" || ruleCode === "packet_ready_with_caution"
    ? ruleCode
    : sourceCaution(profile, answers, pathway.id) ? "packet_ready_with_caution" : "packet_ready";
  const paymentAllowed = route.deterministic === true
    && Boolean(plan)
    && !routeIsAutomaticOrNoFiling(profile, pathway)
    && !routeBranchIsAutomaticOrNoFiling(profile, answers, pathway)
    && !unresolvedRouteBranchReason(profile, answers, pathway)
    && routeIsRatifiedDeployable(profile, pathway)
    && (isCourtFiledPetitionRoute(profile, pathway) || routeIsAdministrativeApplicationPacket(profile, pathway))
    && isPacketPlanFulfillmentReady(plan);
  // The canonical resolver decides what this route does today. The evaluator
  // reads its answer rather than re-deriving one: a second derivation is a
  // second legal engine, and the two disagree the first time either changes.
  const resolution = resolveRoute({
    jurisdiction: profile.jurisdiction.code,
    pathwayId: pathway.id,
    facts: routeResolutionFacts(answers),
    on: evaluationToday(),
    // Free screening. An exact-date or document-backed condition may not
    // control here, and the resolver enforces that rather than the caller.
    phase: "PRELIMINARY_SCREENING"
  });
  const legallyAuthorizedPayment = resolution.contract
    ? resolution.paymentAuthority === "packet_checkout" && resolution.delivery?.paymentAllowed === true
    : pathway.legalAuthority?.paymentAuthority !== "closed" && pathway.legalAuthority?.paymentAuthority !== "attorney_review_required";

  // The resolver's answer, not only its payment bit.
  //
  // Until now the evaluator read `paymentAuthority` off the resolution and
  // discarded everything else, so a route the contract had identified as a real
  // participant petition that is not yet deliverable came back as
  // `packet_ready_with_caution` with payment quietly closed. That reads to a
  // participant as "your packet is ready" and to an operator as a checkout bug.
  //
  // `identified_not_yet_available` is the resolver saying: this is your route,
  // we know which packet it produces, and it cannot be produced yet. Screening
  // says exactly that, names the family so the answer is useful, and closes
  // checkout, sponsorship and generation together.
  if (resolution.contract && resolution.serviceDisposition === "identified_not_yet_available") {
    // `needs_more_info`, deliberately, and not the two neighbours it resembles.
    // `not_covered_yet` maps to `unsupported_jurisdiction` in the adapter and to
    // `guidance_saved` in the Briefcase — the route is covered, identified, and
    // is not guidance. `guidance_only` says the same thing worse. This code maps
    // to `needs_case_details` and `needs_info`, which is what is true: the route
    // is known and something is still outstanding.
    //
    // No missingQuestionIds. The outstanding condition is a verified document
    // held after authentication, not a public screening question, and naming a
    // non-public id here would ask a participant for something the answer
    // validator would then reject.
    return result(profile, request, "needs_more_info", [reason(
      jurisdiction,
      "route_identified_packet_not_yet_available",
      preliminaryUnavailabilityText(resolution),
      pathway.sourceRef
    )], {
      pathwayId: pathway.id,
      ...(plan ? { packetPlan: plan } : {}),
      cautions: ["This is a preliminary screening result. Nothing is filed, purchased or generated by it."],
      paymentAllowed: false
    });
  }

  return result(profile, request, selectedCode, [reason(jurisdiction, `compiled_rule_match.${route.rule.id}`, `Compiled source rule ${route.rule.id} matches ${pathway.label}.`, route.rule.sourceRef ?? pathway.sourceRef)], {
    pathwayId: pathway.id,
    packetPlan: plan,
    paymentAllowed: paymentAllowed && legallyAuthorizedPayment
  });
}

/**
 * What to tell a participant whose route is identified and not yet deliverable.
 *
 * Built from the contract rather than written per state: the packet family
 * names what the route produces, and the preconditions a participant must still
 * satisfy are named separately from the work we have not finished, because they
 * are different kinds of "not yet" and a participant can only act on the first.
 */
function preliminaryUnavailabilityText(resolution: ReturnType<typeof resolveRoute>) {
  const family = resolution.packetFamily ? `the ${resolution.packetFamily}` : "a participant packet";
  const participantConditions = [
    ...(resolution.notYetApplicablePreconditions ?? []),
    ...(resolution.unsatisfiedPreconditions ?? [])
  ].map((entry) => entry.precondition?.requires ?? entry.precondition?.id).filter(Boolean);
  const sentences = [`This route may lead to ${family}. It is a preliminary result: nothing is filed, purchased or generated by it.`];
  if (participantConditions.length > 0) {
    sentences.push(`It stays conditional until ${participantConditions.join("; and ")}.`);
  }
  if ((resolution.openDeliveryGateIds ?? []).length > 0) {
    sentences.push("The packet itself is not yet available to generate.");
  }
  return sentences.join(" ");
}

/**
 * The facts a branch selector may read during screening, each labelled with the
 * provenance it actually has.
 *
 * The whitelist limits WHICH facts reach the resolver; the provenance label
 * limits what they may decide. A condition requiring verified_record refuses a
 * screening answer even when the value is right, so an exact date recalled in
 * free screening cannot select a statute.
 */
function routeResolutionFacts(answers: Record<string, ScreeningAnswerValue>): FactSnapshotMap {
  const facts: FactSnapshotMap = {};
  for (const key of AUTHENTICATED_ROUTE_FACT_IDS) {
    const value = answerText(answers[key]).trim();
    // A screening answer is labelled a screening answer. It may identify a
    // candidate route; a condition that demands verified provenance will refuse
    // it, which is the point. Nothing here is promoted by being whitelisted.
    if (value) facts[key] = { value, provenance: "screening_answer" };
  }
  return facts;
}

/**
 * Fact ids a branch selector or packet-release precondition may name. Kept as
 * an explicit list rather than "whatever the answers contain" so that adding a
 * screening question can never silently start deciding which statute governs.
 */
const AUTHENTICATED_ROUTE_FACT_IDS: readonly string[] = [
  "nd_qualifying_disposition_date"
];

function legalAuthorityGate(profile: EngineProfile, pathway: CompiledPathway): ScreeningReason | undefined {
  const contract = legalRouteContract(profile.jurisdiction.code, pathway.id);
  const authority = pathway.legalAuthority;
  const paymentAuthority = contract ? routePaymentAuthority(contract) : authority?.paymentAuthority;
  if (paymentAuthority === "attorney_review_required") {
    return reason(profile.jurisdiction.code, "legal_authority_attorney_review_required", "This route requires attorney review before any participant packet or checkout may proceed.", pathway.sourceRef);
  }
  const effectiveFrom = contract?.effectiveFrom ?? authority?.effectiveFrom;
  const supersedes = contract?.supersedes ?? authority?.supersedes;
  // `!supersedes` is not a leak, and I removed it before checking.
  //
  // It reads like a bug: a past effectiveFrom passes the comparison below on
  // its own, so the exemption can only act on a contract whose date has NOT
  // arrived, which looked like declaring a route in force before its statute.
  // Removing it broke the pre-effective Mississippi proof, and that proof is
  // the answer. `supersedes` means an earlier rule governed before this date
  // and still does until it arrives — Mississippi § 99-19-71 pre-2026-07-01
  // uses the superseded five-year clock. Refusing the route outright would
  // deny relief that is available under the rule actually in force.
  //
  // The residual risk is narrower than the one I imagined and is not fixed
  // here: this falls through to the compiled rules, so a future-effective
  // supersession applies the OLD rule pre-effective only for as long as the
  // compiled rules still carry it. If a contract's new rule is compiled in
  // before its effective date, that is what a pre-effective participant gets.
  // The resolver's own effectiveDateGate models this properly; this gate is
  // the older parallel path.
  if (effectiveFrom && !supersedes) {
    const effective = parseIsoDate(effectiveFrom);
    if (!effective || evaluationToday().getTime() < effective.getTime()) {
      return reason(profile.jurisdiction.code, "legal_authority_not_in_force", `This route is not in force before ${effectiveFrom}.`, pathway.sourceRef);
    }
  }
  return undefined;
}

function hardStopReason(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>): ScreeningReason | undefined {
  const jurisdiction = profile.jurisdiction.code;
  if (isNegative(answers.ownership_scope)) {
    return reason(jurisdiction, "ownership_scope_hard_stop", "The consumer flow can only evaluate a person checking their own record.");
  }
  const scope = answerText(answers.jurisdiction_scope);
  if (scope.toLowerCase().includes("federal")) {
    return reason(jurisdiction, "federal_or_out_of_scope", "Federal matters are outside this state record-clearing engine.");
  }
  return undefined;
}

function exclusionReason(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>): ScreeningReason | undefined {
  const jurisdiction = profile.jurisdiction.code;
  const categories = Array.isArray(answers.state_exclusion_categories)
    ? answers.state_exclusion_categories.map(String)
    : answerText(answers.state_exclusion_categories).split("|");
  const normalized = categories.map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (normalized.some((value) => value.includes("not sure"))) {
    return reason(jurisdiction, "state_exclusion_unknown", "A source-defined exclusion category is uncertain and requires review.");
  }
  const selectedExclusions = normalized.filter((value) => !value.includes("none of these"));
  if (selectedExclusions.length > 0) {
    // These legacy categories do not identify a Delaware statutory exclusion.
    // In particular, § 4373(b) limits mandatory relief, while § 4374(a)(2)
    // expressly permits consideration of those misdemeanors after seven years.
    // The pardon and juvenile mechanisms have separate rules as well. Keep
    // payment closed until the offense and mechanism are established; do not
    // turn a broad pre-route answer into a statewide legal denial.
    if (jurisdiction === "DE") {
      return reason(jurisdiction, "state_exclusion_scope_unknown", "We need the exact offense and disposition from the court record. Delaware's mandatory, discretionary, pardon and juvenile procedures have different exclusions; this category alone does not establish ineligibility.", "https://delcode.delaware.gov/title11/c043/sc07/index.html");
    }
    return reason(jurisdiction, "state_exclusion_selected", "A source-defined exclusion or review-required category was selected.");
  }
  return undefined;
}

function ambiguityReason(
  profile: EngineProfile,
  publicProfile: PublicJurisdictionProfile,
  answers: Record<string, ScreeningAnswerValue>,
  selectedPathway: CompiledPathway | undefined
): ScreeningReason | undefined {
  const jurisdiction = publicProfile.jurisdiction.code;
  // Only consider questions the frontend actually renders. The full engine profile carries hidden
  // internal `source_question_*` questions that are never shown and never answered; scanning those
  // would treat every completed screening as ambiguous. Missing/empty public answers are not
  // ambiguity here — required public answers are enforced by requiredMissingPublicQuestionIds().
  const legalFields = publicProfile.questions.filter((question) => question.contextOnly !== true && isPrepaymentQuestion(question));
  const relevant = relevantFactIds(profile, selectedPathway);
  const ambiguous = legalFields
    .filter(question => !TX_ND_FACT_IDS.includes(question.id))
    .filter(question => montanaRecordFinancialApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => newMexicoGuidanceFinancialApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => newJerseyMarijuanaStatusFinancialApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => texasGuidanceFinancialApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => westVirginiaGuidanceFinancialApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => southDakotaGuidanceFinancialApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => southCarolinaGuidanceFinancialApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => oklahomaCleanSlateFinancialApplies(profile, selectedPathway?.id, answers, question.id))
    .filter(question => nevada176AQuestionApplies(jurisdiction, selectedPathway?.id, question.id))
    .filter(question => missouriClosedRecordQuestionApplies(jurisdiction, selectedPathway?.id, answers, question.id, profile))
    .filter(question => maineNonconvictionQuestionApplies(jurisdiction, selectedPathway?.id, answers, question.id))
    .filter(question => nebraskaNonconvictionQuestionApplies(jurisdiction, selectedPathway?.id, answers, question.id))
    .filter(question => louisianaAutomationStatusQuestionApplies(jurisdiction, selectedPathway?.id, question.id))
    .filter((question) => relevant.has(question.id))
    // Current NY history/offense/clock gates always require their explicit facts.
    // Retired ambiguous fields and elapsed buckets remain raw saved context.
    .filter(question => profile.jurisdiction.code !== "NY" || selectedPathway?.id !== NY_16059_ROUTE
      || ![...NY_16059_LEGACY_IDS, "resolved_timing_bucket"].includes(question.id))
    .filter(question => !isCaProp64Pathway(jurisdiction, selectedPathway?.id)
      || ![...CA_PROP64_LEGACY_IDS, "state_exclusion_categories", "resolved_timing_bucket", "pending_cases", "new_convictions_during_waiting_period", "financial_obligations", "court_requirements_completed"].includes(question.id))
    .find((question) => isExplicitUnknownAnswer(answers[question.id]));
  if (ambiguous) return reason(jurisdiction, "source_fact_unknown", `${ambiguous.id} is uncertain and requires source review.`);
  return undefined;
}

function requiredUnknownPublicDateQuestionIds(publicProfile: PublicJurisdictionProfile, answers: Record<string, ScreeningAnswerValue>) {
  return publicProfile.questions
    .filter((question) => question.required && question.contextOnly !== true && isPrepaymentQuestion(question))
    .filter((question) => question.type === "date_or_unknown")
    .filter((question) => isExplicitUnknownAnswer(answers[question.id]))
    .map((question) => question.id);
}

function isPrepaymentQuestion(question: PublicQuestion) {
  if (question.lifecyclePhase) return question.lifecyclePhase.startsWith("prepay_");
  return !["record_readiness", "case_details", "packet_information"].includes(question.stage);
}

function selectPathway(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>) {
  if (profile.jurisdiction.code === "CA" && caProp64Pathway(answers)) return profile.pathways.find(p => p.id === caProp64Pathway(answers));
  if (profile.jurisdiction.code === "CA" && caProp64ApplicationRequested(answers)) return undefined;
  if (profile.jurisdiction.code === "NY" && ny16059Requested(answers)) return profile.pathways.find(p => p.id === NY_16059_ROUTE);
  if (profile.jurisdiction.code === "DE" && deAdultConviction(answers) && !isAffirmative(answers.pardon_status)) {
    const id = delawareConvictionRoute(answers);
    return profile.pathways.find(pathway => pathway.id === id);
  }
  if (profile.jurisdiction.code === "KS") {
    const scope = kansasRecordScopeFromAnswers(answers);
    if (scope.status === "selected") return profile.pathways.find(pathway => pathway.id === scope.pathwayId);
    if (scope.status === "clarification" || scope.status === "district_arrest" || scope.status === "district_review") return undefined;
  }
  if (profile.jurisdiction.code === "IL") {
    const cannabis = illinoisCannabisFromAnswers(answers);
    if (cannabis.status === "selected") return profile.pathways.find(pathway => pathway.id === cannabis.pathwayId);
    if (cannabis.status === "clarification") return undefined;
  }
  if (profile.jurisdiction.code === "GA") {
    const firstOffender = georgiaFirstOffenderFromAnswers(answers, evaluationToday().toISOString().slice(0, 10));
    if (firstOffender.status === "selected") return profile.pathways.find(pathway => pathway.id === firstOffender.pathwayId);
    if (firstOffender.status === "clarification") return undefined;
  }
  if (profile.jurisdiction.code === "MS") {
    const programRoute = mississippiProgramRouteFromAnswers(answers);
    if (programRoute.status === "selected") return profile.pathways.find(pathway => pathway.id === programRoute.pathwayId);
    if (programRoute.status === "clarification") return undefined;
  }
  const reliefRequest = convictionReliefRequest(profile, answers);
  if (reliefRequest.status === "selected") return profile.pathways.find(pathway => pathway.id === reliefRequest.pathwayId);
  if (reliefRequest.status !== "not_applicable") return undefined;
  const context = answerText(answers.possible_pathway_context).toLowerCase();
  if (context) {
    const requested = pathwayFromContext(profile, context);
    return requested && !pathwayExcludedByKnownFacts(profile.jurisdiction.code, answers, requested.id) && convictionOutcomeCompatible(profile.jurisdiction.code, answers, requested.id) ? requested : undefined;
  }

  const candidates = profile.pathways.filter(pathway => !pathwayExcludedByKnownFacts(profile.jurisdiction.code, answers, pathway.id)
    && convictionOutcomeCompatible(profile.jurisdiction.code, answers, pathway.id));
  const outcome = answerText(answers.case_outcome).toLowerCase();
  const automatic = candidates.find((pathway) => /automatic|clean slate|no-filing/i.test(`${pathway.label} ${pathway.summary}`));
  if (/automatic|clean slate/.test(context) && automatic) return automatic;

  const nonConviction = candidates.find((pathway) => /non[- ]conviction|dismiss|acquit|arrest/i.test(`${pathway.label} ${pathway.summary}`));
  if (/dismiss|acquit|no charge|not prosecuted|arrest/.test(outcome) && nonConviction) return nonConviction;

  const juvenile = candidates.find((pathway) => /juvenile|minor/i.test(`${pathway.label} ${pathway.summary}`));
  if (/juvenile|minor/.test(outcome) && juvenile) return juvenile;

  // A pardoned conviction is still a conviction by token, so the pardon branch
  // must run before the generic conviction branch or MD pardon participants
  // land on the first "non-conviction"-labeled pathway (label token overlap).
  if (profile.jurisdiction.code === "MD" && /pardon/.test(outcome)) {
    const pardoned = candidates.find((pathway) => /pardon/i.test(pathway.label));
    if (pardoned) return pardoned;
  }

  const conviction = candidates.find((pathway) => /conviction|misdemeanor|felony/i.test(`${pathway.label} ${pathway.summary}`));
  if (/conviction|misdemeanor|felony/.test(outcome) && conviction) return conviction;

  return undefined;
}


function sourceCaution(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, pathwayId: string) {
  const pathway = profile.pathways.find((candidate) => candidate.id === pathwayId);
  const text = `${pathway?.label ?? ""} ${pathway?.summary ?? ""}`.toLowerCase();
  return text.includes("caution") || text.includes("review") || isAffirmative(answers.prior_relief);
}

function routeKey(profile: EngineProfile, pathway: CompiledPathway) {
  return `${profile.jurisdiction.code}:${pathway.id}`;
}

function routeIsRatifiedDeployable(profile: EngineProfile, pathway: CompiledPathway) {
  return RATIFIED_DEPLOYABLE_ROUTES.has(routeKey(profile, pathway));
}

function routeIsCorrectedAwaitingReconfirm(profile: EngineProfile, pathway: CompiledPathway) {
  return CORRECTED_AWAITING_RECONFIRM_ROUTES.has(routeKey(profile, pathway));
}

function routeIsRatifiedCautionOverride(profile: EngineProfile, pathway: CompiledPathway) {
  return RATIFIED_CAUTION_OVERRIDE_ROUTES.has(routeKey(profile, pathway));
}

function routeIsHardGatePending(profile: EngineProfile, pathway: CompiledPathway) {
  return HARD_GATE_PENDING_ROUTES.has(routeKey(profile, pathway));
}

function routeIsHeldGuidance(profile: EngineProfile, pathway: CompiledPathway) {
  return HELD_GUIDANCE_ROUTES.has(routeKey(profile, pathway));
}

function routeIsApprovedReleaseGuidance(profile: EngineProfile, pathway: CompiledPathway) {
  return APPROVED_RELEASE_GUIDANCE_ROUTES.has(routeKey(profile, pathway));
}

function routeIsIntentionalUnsupported(profile: EngineProfile, pathway: CompiledPathway) {
  return INTENTIONAL_UNSUPPORTED_ROUTES.has(routeKey(profile, pathway));
}

// A legally signed-off administrative-application packet route (currently only the Hawaii HCJDC 159(b)
// application). Payment is permitted for these EXACTLY like a user-filed court petition, but the
// product copy must label them administrative applications, never court petitions.
function routeIsAdministrativeApplicationPacket(profile: EngineProfile, pathway: CompiledPathway) {
  return ADMINISTRATIVE_APPLICATION_PACKET_ROUTES.has(routeKey(profile, pathway));
}

function routeSpecificSafetyGate(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, pathway: CompiledPathway): ScreeningReason | undefined {
  if (profile.jurisdiction.code === "KS") {
    const scope = kansasRecordScopeFromAnswers(answers);
    if (scope.status === "selected" && scope.branch === "district_unfulfilled_diversion") {
      return reason("KS", "district_diversion_not_fulfilled", "The district-court diversion agreement remains unfulfilled. Admission, another program's completion or a municipal agreement does not start this completed-diversion clock. Review the agreement and any applicable alternative procedure.", "KSA21-6614(a)(2);KS.memo:ks-21-6614-diversion");
    }
    if (scope.status === "selected" && scope.branch === "unfulfilled_diversion") {
      return reason("KS", "municipal_diversion_not_fulfilled", "The answer says the diversion agreement remains unfulfilled. Do not start a completed-diversion waiting period from admission or arrest. Review the agreement and any specific statutory exception before choosing a filing procedure.", "KSA12-4516(a)(2),(b);KS.memo:ks-12-4516-municipal");
    }
  }
  if (profile.jurisdiction.code === "IL" && pathway.id === IL_CANNABIS_PATHWAY) {
    const cannabis = illinoisCannabisFromAnswers(answers);
    if (cannabis.status === "selected" && cannabis.branch === "other_felony") {
      return reason("IL", "cannabis_conviction_class_outside_motion", "The cannabis motion covers misdemeanor and Class 4 felony convictions. The class entered is outside that motion's scope. Review the final record and other available remedies; this is not a denial of every record-clearing option.", "20-ILCS-2630/5.2(i)(3);IL.memo:il-cannabis-vacate");
    }
    if (cannabis.status === "selected" && answers.il_cannabis_next_step === "status_check") {
      return reason("IL", "cannabis_status_check_requires_record_review", "Checking whether this cannabis record was already cleared does not request a motion to set aside a conviction. Review the current criminal-history record and the applicable automatic or pardon process. This result does not confirm that expungement occurred or open a filing packet.", "IL.memo:il-cannabis-auto;20-ILCS-2630/5.2(i)");
    }
  }
  if (profile.jurisdiction.code === "GA") {
    const firstOffender = georgiaFirstOffenderFromAnswers(answers, evaluationToday().toISOString().slice(0, 10));
    if (firstOffender.status === "selected" && firstOffender.pathwayId === pathway.id && firstOffender.branch === "revoked") {
      return reason("GA", "original_first_offender_revoked", "The record says the First Offender sentence was revoked and guilt was adjudicated. The original First Offender restriction and sealing procedure cannot be treated as a successful discharge. Get help reviewing the final order and any other available procedure.", "HB162:section3:42-8-62.1(c),(g); GA.memo:ga-fo-*");
    }
  }
  const msRecordClassGate = msFelonyRecordClassSafetyGate(profile, answers, pathway);
  if (msRecordClassGate) return msRecordClassGate;
  const caGate = caRouteSafetyGate(profile, answers, pathway);
  if (caGate) return caGate;
  const nyGate = nyCpl16059SafetyGate(profile, answers, pathway);
  if (nyGate) return nyGate;
  const nyTreatmentGate = nyCpl16058SafetyGate(profile, answers, pathway);
  if (nyTreatmentGate) return nyTreatmentGate;
  const dcGate = dcSafetyGate(profile, answers, pathway);
  if (dcGate) return dcGate;
  const ilProstitutionGate = ilFelonyProstitutionSafetyGate(profile, answers, pathway);
  if (ilProstitutionGate) return ilProstitutionGate;
  const hiAdminGate = hiAdminApplicationSafetyGate(profile, answers, pathway);
  if (hiAdminGate) return hiAdminGate;
  const deGate = deSuperiorExpungementSafetyGate(profile, answers, pathway);
  if (deGate) return deGate;
  const akGate = akCourtViewExclusionSafetyGate(profile, answers, pathway);
  if (akGate) return akGate;
  const mdPardonGate = mdPardonDeadlineSafetyGate(profile, answers, pathway);
  if (mdPardonGate) return mdPardonGate;
  const mdPoliceRecordGate = mdPoliceRecordDeadlineSafetyGate(profile, answers, pathway);
  if (mdPoliceRecordGate) return mdPoliceRecordGate;
  const nvSubsection3 = nevada176ASubsection3Gate(profile, answers, pathway);
  if (nvSubsection3) return nvSubsection3;
  return undefined;
}

/**
 * LD-MS-01 retains this exact felony-conviction route. The adopted ms-fel track
 * (legal-design-track-registry.json) covers conviction / felony_conviction.
 * An optional remedy hint cannot establish a final felony conviction. Charge
 * severity is not the final disposition. A pardon, program or combined
 * conviction/adjudication answer also does not establish that record class.
 * This guard never selects a replacement route or establishes eligibility.
 */
function msFelonyRecordClassSafetyGate(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, pathway: CompiledPathway): ScreeningReason | undefined {
  if (profile.jurisdiction.code !== "MS" || pathway.id !== "eligible-felony-conviction-expungement-99-19-71") return undefined;
  if (answers.case_outcome === "Felony conviction") return undefined;
  if (!["Dismissed, no-billed, nolle prosequi, or not prosecuted", "Misdemeanor conviction",
    "Arrest or citation with no charge filed", "Acquitted or found not guilty"].includes(answerText(answers.case_outcome))) {
    return reason("MS", "felony_route_case_outcome_unconfirmed",
      "This option requires a final felony conviction in this case. The outcome entered does not confirm that fact. Check the final court record or get help identifying the disposition; the original charge level does not establish a conviction.",
      "LD-MS-01; legal-design-track-registry:ms-fel:recordTypes,dispositions");
  }
  return reason("MS", "felony_route_case_outcome_conflict",
    "The case outcome you entered does not match this felony-conviction option. Review the case outcome or get help confirming which option applies.",
    "LD-MS-01; legal-design-track-registry:ms-fel:recordTypes,dispositions");
}

// Nevada NRS 176A.245(3), 176A.265(3) and 176A.295(3): the court may not order
// sealing under the section where the charge was under NRS 200.508 or
// NRS 200.5099, whether the defendant was discharged from probation, the case
// was dismissed, or the judgment was set aside.
//
// It bars BOTH branches, so it runs here — before the branch is resolved —
// rather than inside the branch gates. An unanswered bar is `needs_review`, not
// permission: the approved petition asserts in terms that the petitioner was
// not so charged, and a packet must not have a participant swear to something
// the product never established.
function nevada176ASubsection3Gate(
  profile: EngineProfile,
  answers: Record<string, ScreeningAnswerValue>,
  pathway: CompiledPathway
): ScreeningReason | undefined {
  if (routeKey(profile, pathway) !== NEVADA_176A_ROUTE_KEY) return undefined;
  const bar = nevada176ASubsection3(answers);
  if (bar === "not_barred") return undefined;
  return bar === "barred"
    ? reason(profile.jurisdiction.code, "nv_176a_subsection_3_not_eligible", NEVADA_176A_SUBSECTION_3_BARRED_TEXT, pathway.sourceRef)
    : reason(profile.jurisdiction.code, "nv_176a_subsection_3_not_established", NEVADA_176A_SUBSECTION_3_UNRESOLVED_TEXT, pathway.sourceRef);
}

// Maryland pardoned-conviction deadline bar (counsel approved 2026-08-11): Md. Crim. Proc.
// § 10-105(c)(4) bars the pardon-based petition more than 10 years after the Governor signed the
// pardon. A missing date is not a bar — the timing carve-out asks for it instead.
function mdPardonDeadlineSafetyGate(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, pathway: CompiledPathway): ScreeningReason | undefined {
  if (routeKey(profile, pathway) !== "MD:pardoned-conviction-expungement-under-crim-proc-10-105-a-8") return undefined;
  const pardonDate = parseDateAnswer(answers.pardon_signed_date);
  if (!pardonDate) return undefined;
  const deadline = addDuration(pardonDate, 10, "years");
  if (deadline && deadline < evaluationToday()) {
    return reason(profile.jurisdiction.code, "md_pardon_deadline_not_eligible", "Md. Crim. Proc. \u00a7 10-105(c)(4) bars filing the pardon-based expungement petition more than 10 years after the Governor signed the pardon.", pathway.sourceRef);
  }
  return undefined;
}

// Maryland police-record request deadline under Crim. Proc. § 10-103 (LD-MD-03).
// This is a maximum filing window, never a minimum wait: a request made more
// than eight years after the arrest/incident is barred, while every date on or
// before the exact eight-year boundary remains timely.
function mdPoliceRecordDeadlineSafetyGate(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, pathway: CompiledPathway): ScreeningReason | undefined {
  if (routeKey(profile, pathway) !== "MD:police-record-expungement-when-no-charge-was-filed-under-10-103") return undefined;
  const arrestDate = parseDateAnswer(answers.arrest_date);
  if (!arrestDate) return undefined;
  const deadline = addDuration(arrestDate, 8, "years");
  if (deadline && deadline < evaluationToday()) {
    return reason(profile.jurisdiction.code, "md_police_record_deadline_not_eligible", "Md. Crim. Proc. § 10-103 requires the written police-record expungement request within eight years of the arrest or incident; this filing deadline has passed.", pathway.sourceRef);
  }
  return undefined;
}

// Alaska TF-810 CourtView exclusion request gate (legal signoff 2026-07-01). The paid TF-810 packet is
// limited to the CourtView-removal category: a case that ended in acquittal or dismissal (AS 22.35.030 /
// Admin. R. 40, § 1). An ordinary conviction — including a marijuana-possession conviction, which stays
// no-payment until 2027-01-01 — has no CourtView-removal or general-expungement packet and remains
// guidance-only. This keeps Alaska narrow: CourtView removal, never general expungement.
function akCourtViewExclusionSafetyGate(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, pathway: CompiledPathway): ScreeningReason | undefined {
  if (profile.jurisdiction.code !== "AK" || pathway.id !== "confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40") return undefined;
  const jurisdiction = profile.jurisdiction.code;
  const outcome = normalizeCaseOutcome(answers.case_outcome);
  const raw = answerText(answers.case_outcome).toLowerCase();
  if (!["dismissed", "acquitted"].includes(outcome) && !/no conviction|not convicted|non-conviction|dismiss|acquit/.test(raw)) {
    return reason(jurisdiction, "ak_courtview_removal_requires_acquittal_or_dismissal_not_eligible", "Alaska CourtView removal (Form TF-810) is limited to a case that ended in acquittal or dismissal; an ordinary conviction has no CourtView-removal or general-expungement packet and stays guidance-only.", pathway.sourceRef);
  }
  return undefined;
}

// Delaware § 4374 discretionary Superior/Family Court expungement gate (legal signoff 2026-07-01).
// § 4374(b) adds its own exclusions to § 4372(f). Section 4373(b) is the
// mandatory-track list, not a discretionary exclusion: § 4374(a)(2) addresses
// its misdemeanors expressly. Broad legacy category answers require exact
// offense/record review and cannot prove either eligibility or ineligibility.
// Section 4375 post-pardon and juvenile relief remain separate mechanisms.
function deSuperiorExpungementSafetyGate(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, pathway: CompiledPathway): ScreeningReason | undefined {
  if (profile.jurisdiction.code !== "DE" || pathway.id !== "discretionary-court-expungement-under-11-del-c-4374") return undefined;
  const jurisdiction = profile.jurisdiction.code;
  if (delawareConvictionRoute(answers) === DE_COURT && delawareConvictionDecision(answers, evaluationToday().toISOString().slice(0, 10)).status === "satisfied") return undefined;
  // Section4374(a) identifies conviction predicates. A mandatory-eligible
  // case may be included WITH a discretionary request under (d)(2), but the
  // broad dismissed/arrest/program answer alone does not establish that
  // underlying conviction. Prosecutor-initiated (h) is a different actor.
  if (!["Misdemeanor conviction", "Felony conviction"].includes(answerText(answers.case_outcome))) {
    return reason(jurisdiction, "de_4374_conviction_scope_unconfirmed", "This answer does not establish the conviction records required for a discretionary request. Review the final outcomes for every case requested, including any conviction supporting a combined petition. A dismissal or program answer alone cannot open this conviction packet; mandatory, pardon and prosecutor-initiated procedures have separate requirements.", "11-Del-C-4374(a),(d)(2),(h);DE.memo:de_discretionary_superior_court,de_discretionary_family_court");
  }
  const raw = Array.isArray(answers.state_exclusion_categories)
    ? answers.state_exclusion_categories.map((value) => String(value).toLowerCase())
    : [answerText(answers.state_exclusion_categories).toLowerCase()];
  const values = raw.filter((value) => value.trim().length > 0);
  if (values.length === 0 || values.some((value) => /not sure|unknown/.test(value)) || isExplicitUnknownAnswer(answers.state_exclusion_categories)) {
    return reason(jurisdiction, "de_4374_exclusion_unconfirmed", "We need the exact offense and disposition to check Delaware §§ 4372(f) and 4374(b). A misdemeanor listed in § 4373(b) may instead be considered under § 4374(a)(2), subject to its seven-year waiting period and other conditions.", pathway.sourceRef);
  }
  if (values.some((value) => !/none of these/.test(value))) {
    return reason(jurisdiction, "de_4374_exclusion_unconfirmed", "This category alone does not establish a Delaware discretionary exclusion. Check the exact conviction against §§ 4372(f) and 4374(b), and the separate eligibility conditions in § 4374(a), before preparing a packet.", pathway.sourceRef);
  }
  return undefined;
}

// Hawaii HCJDC 159(b) administrative application gate (legal signoff 2026-07-01).
// Non-conviction track (HRS § 831-3.2): opens only for an arrest/charge that did not result in a
// conviction. Conviction track (§§ 706-622.5/.8/.9, 291E-64(e)): opens only when the applicant
// confirms they already hold a Court Order Granting Expungement to attach — the HCJDC application
// requires that order. Missing/unsure court-order confirmation fails closed (no payment).
function hiAdminApplicationSafetyGate(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, pathway: CompiledPathway): ScreeningReason | undefined {
  if (profile.jurisdiction.code !== "HI" || !ADMINISTRATIVE_APPLICATION_PACKET_ROUTES.has(routeKey(profile, pathway))) return undefined;
  const jurisdiction = profile.jurisdiction.code;
  if (pathway.id === "nonconviction-arrest-expungement") {
    const outcome = normalizeCaseOutcome(answers.case_outcome);
    const raw = answerText(answers.case_outcome).toLowerCase();
    if (!["arrest_no_charge", "dismissed", "acquitted"].includes(outcome) && !/no conviction|not convicted|non-conviction/.test(raw)) {
      return reason(jurisdiction, "hi_831_3_2_nonconviction_required_not_eligible", "The Hawaii HCJDC § 831-3.2 non-conviction application requires an arrest or charge that did not result in a conviction; a conviction record uses the conviction-expungement track.", pathway.sourceRef);
    }
  }
  if (HI_ADMIN_CONVICTION_ROUTES.has(routeKey(profile, pathway))) {
    if (!answerText(answers.hi_court_order_confirmed).trim() || isExplicitUnknownAnswer(answers.hi_court_order_confirmed)) {
      return reason(jurisdiction, "hi_court_order_confirmation_missing", "The Hawaii HCJDC conviction-expungement application requires an attached Court Order Granting Expungement; confirm whether you already have that order before an application packet can open.", pathway.sourceRef);
    }
    if (!isAffirmative(answers.hi_court_order_confirmed)) {
      return reason(jurisdiction, "hi_court_order_not_confirmed_not_eligible", "The Hawaii HCJDC conviction-expungement application cannot be assembled without a Court Order Granting Expungement to attach. Obtain that order from the sentencing court first; this is guidance only until the order exists.", pathway.sourceRef);
    }
  }
  return undefined;
}

function ilFelonyProstitutionSafetyGate(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, pathway: CompiledPathway): ScreeningReason | undefined {
  if (profile.jurisdiction.code !== "IL" || pathway.id !== "felony-prostitution-relief") return undefined;
  // 20 ILCS 2630/5.2(j) relief is limited to a Class 4 felony prostitution conviction. A non-felony
  // prostitution record uses a different sealing route, so the felony-prostitution packet must not
  // open for a misdemeanor. Ratified by Lawrence 2026-07-01.
  const level = `${answerText(answers.offense_level)} ${answerText(answers.charge)}`.toLowerCase();
  if (!/felony/.test(level)) {
    return reason(profile.jurisdiction.code, "il_prostitution_felony_required_not_eligible", "20 ILCS 2630/5.2(j) prostitution-conviction relief is limited to a Class 4 felony conviction; a misdemeanor prostitution record uses a different sealing route.", pathway.sourceRef);
  }
  return undefined;
}

function caRouteSafetyGate(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, pathway: CompiledPathway): ScreeningReason | undefined {
  if (profile.jurisdiction.code !== "CA") return undefined;
  const jurisdiction = profile.jurisdiction.code;
  if (pathway.id === "tool-4-arrest-record-sealing") {
    const outcome = normalizeCaseOutcome(answers.case_outcome);
    const rawOutcome = answerText(answers.case_outcome).toLowerCase();
    if (!["arrest_no_charge", "dismissed", "acquitted"].includes(outcome) && !/no conviction|not convicted/.test(rawOutcome)) {
      return reason(jurisdiction, "ca_85191_nonconviction_required_not_eligible", "California PC 851.91 arrest-record sealing requires an arrest that did not result in conviction; conviction routes must use a different petition pathway.", pathway.sourceRef);
    }
  }
  if (pathway.id === "prop-64-currently-serving-petition-11361-8" || pathway.id === "prop-64-completed-sentence-application-11361-8") {
    const branch = caProp64Choice("ca_prop64_branch", answers.ca_prop64_branch);
    if (pathway.id === "prop-64-currently-serving-petition-11361-8" && branch !== "currently-serving petition") {
      return reason(jurisdiction, "ca_prop64_currently_serving_branch_not_confirmed", "The HSC § 11361.8 currently-serving petition branch must be confirmed before packet support opens.", pathway.sourceRef);
    }
    if (pathway.id === "prop-64-completed-sentence-application-11361-8") {
      if (branch !== "completed-sentence application") {
        return reason(jurisdiction, "ca_prop64_completed_sentence_branch_not_confirmed", "The HSC § 11361.8 completed-sentence application branch must be confirmed before packet support opens.", pathway.sourceRef);
      }
      const requested = caProp64Choice("ca_prop64_relief_requested", answers.ca_prop64_relief_requested);
      if (requested !== "dismissal/sealing" && requested !== "redesignation") {
        return reason(jurisdiction, "ca_prop64_relief_requested_missing", "The completed-sentence HSC § 11361.8 application must confirm dismissal/sealing or redesignation is requested.", pathway.sourceRef);
      }
    }
    if (pathway.id === CA_PROP64_CURRENT && isAffirmative(answers.sentence_completion_date)
      || pathway.id === CA_PROP64_COMPLETED && isNegative(answers.sentence_completion_date)) {
      return reason(jurisdiction, "ca_prop64_sentence_status_conflict", "The sentence status and completion answers for this case do not agree. Review both answers before continuing.", pathway.sourceRef);
    }
    if (caProp64RecordQuestions(profile, profile.questions, pathway.id)
      .some((question) => caProp64RecordAnswerState(question.id, answers[question.id]) !== "known_valid")) {
      return reason(jurisdiction, "ca_prop64_record_details_unconfirmed", "Review the court and charge details for this case before continuing.", pathway.sourceRef);
    }
  }
  return undefined;
}

function nyCpl16058SafetyGate(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, pathway: CompiledPathway): ScreeningReason | undefined {
  if (profile.jurisdiction.code !== "NY" || pathway.id !== "conditional-treatment-sealing-under-cpl-160-58") return undefined;
  const jurisdiction = profile.jurisdiction.code;
  if (!answerText(answers.ny_16058_treatment_program_completed).trim()) {
    return reason(jurisdiction, "ny_16058_treatment_completion_missing", "NY CPL 160.58 requires confirmed Article 220/221 or CPL 410.91 treatment/diversion/DTAP completion before a packet decision.", pathway.sourceRef);
  }
  if (!isAffirmative(answers.ny_16058_treatment_program_completed)) {
    return reason(jurisdiction, "ny_16058_treatment_completion_not_eligible", "NY CPL 160.58 requires treatment/diversion/DTAP completion; a standalone three-year wait does not qualify this route.", pathway.sourceRef);
  }
  if (isNegative(answers.sentence_completion_date)) {
    return reason(jurisdiction, "ny_16058_sentence_completion_not_eligible", "NY CPL 160.58 requires sentence completion before this route can be considered.", pathway.sourceRef);
  }
  return undefined;
}

function nyCpl16059SafetyGate(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, pathway: CompiledPathway): ScreeningReason | undefined {
  if (profile.jurisdiction.code !== "NY" || pathway.id !== "discretionary-conviction-sealing-by-petition-under-cpl-160-59") return undefined;
  const jurisdiction = profile.jurisdiction.code;
  if (isAffirmative(answers.ny_16059_requested_excluded) || isAffirmative(answers.ny_16059_sex_offender_registration)) {
    return reason(jurisdiction, "ny_16059_offense_bar_not_eligible", "NY CPL 160.59 excludes sex offenses, Article 263 offenses, felony Article 125 offenses, violent felonies, Class A felonies, ineligible attempts/conspiracies, and records requiring sex-offender registration.", pathway.sourceRef);
  }
  if (!isNegative(answers.ny_16059_requested_excluded) || !isNegative(answers.ny_16059_sex_offender_registration)) {
    return reason(jurisdiction, "ny_16059_offense_bar_missing", "NY CPL 160.59 offense-exclusion facts must be confirmed before a packet decision.", pathway.sourceRef);
  }
  // The broad pending_cases question also covers probation/supervision. Only
  // the scoped charge fact can establish this charge-specific bar; completion
  // and timing remain evaluated by their existing separate predicates.
  if (isAffirmative(answers.ny_16059_undisposed_arrest)) {
    return reason(jurisdiction, "ny_16059_undisposed_arrest_not_eligible", "This sealing application cannot proceed while an arrest remains unresolved, even if no charge has been filed. Confirm its disposition before continuing.", "CPL160.59(3)(e)");
  }
  if (isAffirmative(answers.ny_16059_pending_charge)) {
    return reason(jurisdiction, "ny_16059_pending_charge_not_eligible", "NY CPL 160.59 does not open while a criminal charge is pending.", pathway.sourceRef);
  }
  if (isAffirmative(answers.new_convictions_during_waiting_period) || isAffirmative(answers.ny_16059_later_conviction_entered)) {
    return reason(jurisdiction, "ny_16059_post_last_conviction_crime_not_eligible", "NY CPL 160.59 bars a later criminal conviction after the last conviction for which sealing is requested.", pathway.sourceRef);
  }
  if (!isNegative(answers.ny_16059_undisposed_arrest)) {
    return reason(jurisdiction, "ny_16059_arrest_status_unconfirmed", "Check whether any arrest is still unresolved. An answer about pending charges or supervision does not establish the status of an arrest with no charge filed.", "CPL160.59(3)(e)");
  }
  // CPL160.59(3)(f) compares entry of a later conviction, even for conduct
  // predating the requested conviction. Neither Yes nor No to the legacy
  // question about a later "crime" establishes that distinct fact. Retain the
  // earlier answer; an explicit current No can resolve its ambiguity.
  if (!isNegative(answers.ny_16059_later_conviction_entered)) {
    return reason(jurisdiction, "ny_16059_later_conviction_unconfirmed", "The earlier answer does not establish whether there was a later conviction. Check the disposition and date of the later case before deciding this sealing request.", pathway.sourceRef);
  }
  if (!isNegative(answers.ny_16059_pending_charge)) return reason(jurisdiction, "ny_16059_pending_charge_missing", "NY CPL 160.59 gate facts must be confirmed before a packet decision.", pathway.sourceRef);
  return undefined;
}

function dcSafetyGate(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, pathway: CompiledPathway): ScreeningReason | undefined {
  if (profile.jurisdiction.code !== "DC") return undefined;
  const jurisdiction = profile.jurisdiction.code;
  if (pathway.id === "dc_motion_seal_felony_conviction_8yr_16_806") {
    const severity = answerText(answers.dc_offense_severity_group).toLowerCase();
    if (!severity.includes("not in offense severity group 1, 2, or 3")) {
      return reason(jurisdiction, "felony_severity_group_not_cleared", "A DC felony § 16-806 packet cannot open until the offense is confirmed not to be in Offense Severity Group 1, 2, or 3.", pathway.sourceRef);
    }
  }
  if (pathway.id === "dc_actual_innocence_expungement_16_803") {
    const basis = answerText(answers.actual_innocence_basis).toLowerCase();
    if (!basis.includes("offense did not occur") && !basis.includes("wrong person")) {
      return reason(jurisdiction, "actual_innocence_basis_not_established", "A DC § 16-803 actual-innocence packet requires facts that the offense did not occur or was not committed by the person; dismissal alone is not enough.", pathway.sourceRef);
    }
  }
  return undefined;
}

/**
 * Routes whose participant-facing text and whose contract describe different
 * things. Held on that, specifically.
 *
 * Georgia's legacy first-offender route is the case this exists for. Its
 * contract is right — § 42-8-62.1 under LD-GA-01 — and its compiled summary and
 * rule clauses are the whole Georgia restriction-and-sealing chapter, naming
 * five other mechanisms that have their own routes and never naming § 42-8-62.1
 * at all. The canonical resolver reads the contract and calls the route a
 * sellable participant packet with no open gates. Nothing sells today only
 * because an unrelated Lawrence hold happens to close it, and that hold could be
 * lifted without anyone looking at this.
 */
const PRESENTATION_CONFLICT_ROUTE_KEYS: ReadonlySet<string> = new Set(
  (routePresentationConflicts as { rows: { routeKey: string; status: string }[] }).rows
    .filter((row) => row.status === "held")
    .map((row) => row.routeKey)
);

/**
 * The presentation conflict, as a reason.
 *
 * It runs ahead of every product-guidance and hold check, because those answer
 * "what does this route do" and this one answers "do we know what we are
 * showing this participant". Placed after them it would never fire: Georgia's
 * legacy route is already caught by the Lawrence guidance hold, so the check
 * would look present and prove nothing.
 *
 * `needs_review`, not `guidance_only`. A held petition route is not guidance,
 * and describing it as guidance is the same class of error as the conflict.
 */
/**
 * Routes proven to generate something that is not the packet they promise.
 *
 * The packet route resolver already closes these for offer, render and
 * delivery, and the payment adapter ANDs its answer with the evaluator's. That
 * is enough to stop a sale and not enough to stop a lie: the evaluator would
 * still report packet_ready_with_caution with paymentAllowed true, which reads
 * to a participant as "your packet is ready" and to every downstream ledger as
 * a sellable route. Mississippi § 99-15-59 is the proven case.
 *
 * `needs_review`, because the route is legally eligible and the packet is the
 * defect. Calling it guidance would be the same error corrected for Georgia.
 */
const PACKET_CORRECTION_ROUTE_KEYS: ReadonlySet<string> = new Set(
  (packetCorrectionRequired as { rows: { routeKey: string; status: string }[] }).rows
    .filter((row) => row.status === "closed")
    .map((row) => row.routeKey)
);

function packetCorrectionReason(profile: EngineProfile, pathway: CompiledPathway): ScreeningReason | undefined {
  if (!PACKET_CORRECTION_ROUTE_KEYS.has(`${profile.jurisdiction.code}:${pathway.id}`)) return undefined;
  return reason(
    profile.jurisdiction.code,
    "packet_correction_required",
    "This route is eligible, and the packet it currently produces is not the complete filing it should be, so no packet decision, checkout or sponsored generation may proceed until it is corrected.",
    pathway.sourceRef
  );
}

function presentationConflictReason(profile: EngineProfile, pathway: CompiledPathway, answers: Record<string, ScreeningAnswerValue>): ScreeningReason | undefined {
  if (!PRESENTATION_CONFLICT_ROUTE_KEYS.has(`${profile.jurisdiction.code}:${pathway.id}`)) return undefined;
  if (profile.jurisdiction.code === "GA" && pathway.id === GA_ORIGINAL_FIRST_OFFENDER_PATHWAY) {
    const selected = georgiaFirstOffenderFromAnswers(answers, evaluationToday().toISOString().slice(0, 10));
    if (selected.status === "selected" && selected.branch !== "revoked") {
      return reason("GA", `original_first_offender_${selected.branch}`, GA_FIRST_OFFENDER_GUIDANCE[selected.branch][0],
        selected.branch === "active_pre2026" ? "O.C.G.A. § 42-8-62.1(c); HB 162 § 3 (2026)"
          : selected.branch === "sentencing_post2026" ? "O.C.G.A. § 42-8-62.1(b); HB 162 § 3 (2026)"
          : selected.branch === "discharged_pre2026" ? "O.C.G.A. § 42-8-62.2(c); HB 162 § 4 (2026)"
          : "O.C.G.A. § 42-8-62.2(b), (e)–(f); HB 162 § 4 (2026)");
    }
  }
  return reason(
    profile.jurisdiction.code,
    "route_presentation_conflicts_with_its_contract",
    "This route's description and the packet its legal authority defines do not describe the same mechanism, so no packet decision or checkout may proceed until the description is corrected.",
    pathway.sourceRef
  );
}

function postTimingPolicyReason(profile: EngineProfile, pathway: CompiledPathway): ScreeningReason | undefined {
  const jurisdiction = profile.jurisdiction.code;
  // The exact DWI clock replaces the old unexecuted-timing review, not the
  // separate adopted source predicates absent from this compiled questionnaire.
  // TX.memo tracks 12/15/17 require qualifying offense, record and collision
  // evidence. Calendar arithmetic cannot manufacture those facts or readiness.
  if (pathway.id === TX_ND_ROUTES[3] && texasNondisclosureTimingContract(profile, pathway.id)) {
    return reason("TX", "nondisclosure_dwi_source_facts_review", TX_ND_TIMING_COPY.dwi_source_review[0], "TX.memo:tracks/12,15,17;GovtCode411.0726,411.0731,411.0736");
  }
  if (routeIsCorrectedAwaitingReconfirm(profile, pathway)) {
    return reason(jurisdiction, "lawrence_reconfirmation_required", "Lawrence corrected this route's timing or anchor; it must be re-confirmed before a paid packet decision.", pathway.sourceRef);
  }
  if (routeIsHardGatePending(profile, pathway)) {
    return reason(jurisdiction, "route_gate_pending_lawrence_review", "This route requires the named substantive gate implementation and verification before a paid packet decision.", pathway.sourceRef);
  }
  return undefined;
}

function specialRouteTiming(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, rule: CompiledRule, pathway: CompiledPathway): TimingResult | undefined {
  const key = routeKey(profile, pathway);
  const txClock = texasNondisclosureClock(profile, pathway.id, answers, evaluationToday().toISOString().slice(0,10));
  if (txClock) return txClock.status === "elapsed" ? {status:"satisfied"} : txClock.status === "missing"
    ? { status:"missing_anchor", missingQuestionIds:txClock.ids, reason:reason("TX", `nondisclosure_${txClock.code}`, TX_ND_TIMING_COPY.missing[0], `TX.memo;GovtCode${txClock.section}`) }
    : { status:txClock.status === "not_yet" ? "not_yet" : "needs_review", reason:reason("TX", `nondisclosure_${txClock.code}`, TX_ND_TIMING_COPY[txClock.status][0], `TX.memo;GovtCode${txClock.section}`) };
  if (key === "MD:pardoned-conviction-expungement-under-crim-proc-10-105-a-8") {
    // Crim. Proc. § 10-105(a)(8) carries no minimum wait; § 10-105(c)(4) is the
    // opposite constraint — filing is barred more than 10 years AFTER the
    // Governor signed the pardon. The generic engine parses waiting rules as
    // minimum waits, so this route asks for the pardon date instead; the
    // passed-deadline bar is enforced by mdPardonDeadlineSafetyGate.
    const pardonDate = parseDateAnswer(answers.pardon_signed_date);
    if (!pardonDate) {
      return {
        status: "missing_anchor",
        reason: reason(profile.jurisdiction.code, "md_pardon_date_needed", "The date the Governor signed the pardon is needed to confirm the \u00a7 10-105(c)(4) ten-year filing deadline.", rule.sourceRef ?? pathway.sourceRef),
        missingQuestionIds: ["pardon_signed_date"]
      };
    }
    return { status: "satisfied" };
  }
  if (key === "MD:police-record-expungement-when-no-charge-was-filed-under-10-103") {
    return timingFromExactAnchor(profile, answers, rule, pathway, "arrest_date", { value: 0, unit: "days", raw: "filing deadline checked separately" }, "The § 10-103 arrest-date filing deadline is evaluated as a maximum window, not a minimum wait.");
  }
  if (key === NEVADA_176A_ROUTE_KEY) {
    // NRS 176A.245, 176A.265 and 176A.295 prescribe a waiting period on one
    // branch only. Subsection 1 has none at all — the court seals once the
    // discharge or dismissal happens — and subsection 2 allows the petition
    // "not sooner than 7 years after" the conditional dismissal or the setting
    // aside of the judgment. The generic engine found no duration for this
    // pathway and sent both branches to needs_review with
    // `waiting_rule_not_executed`, which is a failure to compute rather than an
    // answer. An unresolved branch is left to its own gate; this function must
    // not pick a duration for a mechanism that is not established.
    const branch = nevada176ABranch(answers);
    if (branch === "subsection_1_automatic") return { status: "satisfied" };
    if (branch === "subsection_2_petition") {
      return timingFromAnchor(
        profile,
        answers,
        rule,
        pathway,
        "disposition_date",
        { value: 7, unit: "years", raw: "7 years" },
        "Subsection 2 of NRS 176A.245, 176A.265 and 176A.295 allows the petition not sooner than seven years after the conditional dismissal or the setting aside of the judgment of conviction."
      );
    }
  }
  if (key === "CA:tool-1-dismissal-set-aside" || key === "CA:tool-4-arrest-record-sealing") return { status: "satisfied" };
  if (key === "CA:prop-64-currently-serving-petition-11361-8" || key === "CA:prop-64-completed-sentence-application-11361-8") return { status: "satisfied" };
  if (key === "NY:conditional-treatment-sealing-under-cpl-160-58") return { status: "satisfied" };
  if (key === "NY:discretionary-conviction-sealing-by-petition-under-cpl-160-59") {
    const clock = ny16059Clock(answers, evaluationToday().toISOString().slice(0, 10));
    if (clock.status === "satisfied") return { status: "satisfied" };
    const clockReason = reason("NY", `ny_16059_${clock.code}`, NY_16059_REASON_COPY[clock.code!][0], NY_16059_SOURCE);
    if (clock.status === "missing") return { status: "missing_anchor", reason: clockReason, missingQuestionIds: clock.ids ?? [] };
    return { status: clock.status === "not_yet" ? "not_yet" : "needs_review", reason: clockReason };
  }
  if (key === "IN:non-conviction-arrest-or-criminal-charge-expungement") {
    return timingFromAnchor(profile, answers, rule, pathway, "arrest_date", { value: 1, unit: "years", raw: "1 year" }, "IC 35-38-9-1 one-year non-conviction wait runs from the arrest, charge, or allegation date.");
  }
  if (key === "IN:juvenile-allegation-expungement") {
    return timingFromAnchor(profile, answers, rule, pathway, "arrest_date", { value: 1, unit: "years", raw: "1 year" }, "Indiana juvenile allegation correction uses one year from allegation when there was no adjudication.");
  }
  if (key === "IN:conviction-expungement-with-sealed-confidential-access") {
    const offense = `${answerText(answers.offense_level)} ${answerText(answers.eligible_conviction_class)} ${answerText(answers.charge)}`.toLowerCase();
    if (/misdemeanor/.test(offense)) {
      return timingFromAnchor(profile, answers, rule, pathway, "conviction_date", { value: 5, unit: "years", raw: "5 years" }, "IC 35-38-9 misdemeanor tier requires five years from conviction.");
    }
    if (/level 6|class d/.test(offense)) {
      const convictionTiming = timingFromAnchor(profile, answers, rule, pathway, "conviction_date", { value: 8, unit: "years", raw: "8 years" }, "IC 35-38-9 Level 6/Class D tier requires eight years from conviction.");
      const completionTiming = timingFromAnchor(profile, answers, rule, pathway, "sentence_completion_actual_date", { value: 3, unit: "years", raw: "3 years" }, "IC 35-38-9 Level 6/Class D tier also requires three years from sentence completion.");
      return latestTimingResult(convictionTiming, completionTiming);
    }
    if (/felony|level [1-5]|class [abc]/.test(offense)) {
      if (!isAffirmative(answers.in_prosecutor_consent_confirmed)) {
        return {
          status: "needs_review",
          reason: reason(profile.jurisdiction.code, "in_prosecutor_consent_required", "Higher-felony Indiana expungement tiers require prosecutor-consent facts before a packet decision.", rule.sourceRef ?? pathway.sourceRef)
        };
      }
      return timingFromAnchor(profile, answers, rule, pathway, "conviction_date", { value: 10, unit: "years", raw: "10 years" }, "IC 35-38-9 higher-felony tier requires the corrected felony wait and prosecutor-consent gate.");
    }
    return {
      status: "needs_review",
      reason: reason(profile.jurisdiction.code, "in_conviction_tier_not_determined", "Indiana conviction expungement requires misdemeanor, Level 6/Class D, or higher-felony tier facts before timing can be applied.", rule.sourceRef ?? pathway.sourceRef)
    };
  }
  if (key === "ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05") {
    return timingFromAnchor(profile, answers, rule, pathway, "disposition_date", { value: 0, unit: "days", raw: "event-based" }, "North Dakota non-conviction closing is event-based, not a generic three-year wait.");
  }
  if (key === "ND:deferred-imposition-dismissal-and-sealing") {
    return timingFromAnchor(profile, answers, rule, pathway, "discharge_date", { value: 0, unit: "days", raw: "event-based" }, "North Dakota deferred-imposition relief runs from dismissal/discharge event, not a generic three-year wait.");
  }
  if (key === "WY:adult-non-conviction-expungement-w-s-7-13-1401") {
    return timingFromAnchor(profile, answers, rule, pathway, "disposition_date", { value: 180, unit: "days", raw: "180 days" }, "Wyoming's 180-day correction applies only to non-conviction relief.");
  }
  if (key === "TN:pathway-1-free-non-conviction-expunction-under-tenn-code-40-32-101-a-40-32-106") {
    return timingFromAnchor(profile, answers, rule, pathway, "disposition_date", { value: 0, unit: "days", raw: "no wait" }, "Tennessee non-conviction expunction has no five-year wait after dismissal, no true bill, or not guilty disposition.");
  }
  if (profile.jurisdiction.code === "MS" && Object.hasOwn(MS_PROGRAM_COMPLETION_PATHWAYS, pathway.id)) {
    const selected = mississippiProgramRouteFromAnswers(answers);
    const source = pathway.id === "nonadjudication-under-99-15-26" ? "LD-MS-01;99-15-26(4)-(5)" : "LD-MS-01;99-15-123(1)-(3)";
    const facts = msProgramCompletionPredicates(pathway.id, answers);
    if (selected.status !== "selected" || selected.pathwayId !== pathway.id || facts.status === "missing") {
      return { status: "missing_anchor", missingQuestionIds: facts.status === "missing" ? facts.ids : ["ms_program_order", "ms_program_record_status"],
        reason: reason("MS", "program_completion_event_missing", "Check the program order, successful completion, final case disposition, and arrest and release record. A program name or elapsed time alone does not establish the completed event.", source) };
    }
    if (facts.status === "review") {
      return { status: "needs_review", reason: reason("MS", "program_arrest_release_conflict", "This procedure requires an arrest and release in the case. Check the recorded answer before continuing; this does not decide whether another remedy is available.", source) };
    }
    // Dates can corroborate a completed event; they cannot replace it. Do not
    // require an invented disposition date on the statutory no-disposition limb.
    const dates = new Map<string, Date>();
    for (const id of ["ms_program_completion_date", "ms_program_disposition_date"]) {
      if (answers[id] === undefined || answers[id] === "") continue;
      const date = parseDateAnswer(answers[id]);
      if (!date || date.toISOString().slice(0, 10) !== answerText(answers[id]) || date > evaluationToday()) {
        return { status: "missing_anchor", missingQuestionIds: [id], reason: reason("MS", "program_completion_date_invalid", "Check the supplied program completion or disposition date. It must be a real calendar date for an event that has already occurred.", source) };
      }
      dates.set(id, date);
    }
    const completion = dates.get("ms_program_completion_date"), disposition = dates.get("ms_program_disposition_date");
    if (answers.ms_program_final_disposition === "no_disposition" && disposition
      || completion && disposition && disposition < completion) {
      return { status: "needs_review", reason: reason("MS", "program_completion_dates_conflict", "The recorded dates or disposition conflict. Check the completion and case records; do not substitute a date for a disposition that was never entered.", source) };
    }
    return { status: "satisfied" };
  }
  if (key === `MS:${MS_CONDITIONAL_DISCHARGE_PATHWAY}`) {
    // LD-MS-01 / §41-29-150(d)(1)-(2): an event, not an elapsed conviction
    // clock. Do not let an optional route label establish deferred adjudication,
    // the qualifying subsection, first use, or discharge AND dismissal.
    const selected = mississippiProgramRouteFromAnswers(answers);
    if (selected.status !== "selected" || selected.pathwayId !== pathway.id) {
      return { status: "missing_anchor", missingQuestionIds: ["ms_program_order", "ms_program_record_status"],
        reason: reason("MS", "conditional_discharge_record_facts_missing", "Check the conditional-discharge order, completion and final dismissal. A drug charge or finished probation alone does not establish this procedure.", "legal-authority:LD-MS-01;41-29-150(d)") };
    }
    const facts = msConditionalDischargePredicates(answers);
    if (facts.status === "missing") {
      return { status: "missing_anchor", missingQuestionIds: facts.ids,
        reason: reason("MS", "conditional_discharge_record_facts_missing", "Check the conditional-discharge order, completion and final dismissal. A drug charge or finished probation alone does not establish this procedure.", "legal-authority:LD-MS-01;41-29-150(d)") };
    }
    if (facts.status === "review") {
      return { status: "needs_review", reason: reason("MS", "conditional_discharge_predicate_conflict", "The recorded subsection, earlier controlled-substance conviction, earlier conditional discharge, or judgment of guilt needs review under this specific procedure. This does not decide whether a different remedy is available.", "legal-authority:LD-MS-01;41-29-150(d)") };
    }
    // Anonymous screening can establish an already-entered event. Exact order
    // dates remain packet facts. If supplied, they must not contradict that
    // event; a broad timing bucket never substitutes for it.
    for (const id of ["discharge_date"]) {
      if (answers[id] !== undefined && answers[id] !== "") {
        const date = parseDateAnswer(answers[id]);
        if (!date || date.toISOString().slice(0, 10) !== answerText(answers[id]) || date > evaluationToday()) {
          return { status: "missing_anchor", missingQuestionIds: [id], reason: reason("MS", "conditional_discharge_event_date_conflict", "The discharge or dismissal date must describe an event that has already occurred. Check the court record before continuing.", "legal-authority:LD-MS-01;41-29-150(d)(2)") };
        }
      }
    }
    return { status: "satisfied" };
  }
  if (key === "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal") {
    return timingFromAnchor(profile, answers, rule, pathway, "disposition_date", { value: 0, unit: "days", raw: "event-based" }, "MS non-conviction expungement runs from the case ending in dismissal, no disposition, or acquittal.");
  }
  if (key === "MS:additional-justice-or-municipal-court-misdemeanor-relief") {
    return timingFromExactAnchor(profile, answers, rule, pathway, "ms_last_conviction_date_any_court", { value: 2, unit: "years", raw: "2 years" }, "Miss. Code Ann. §§ 9-11-15(3) and 21-23-7(6) use two years from the participant's last conviction in any court for the corresponding lower-court route.");
  }
  if (key === "MS:first-offense-dui-expungement") {
    return timingFromExactAnchor(profile, answers, rule, pathway, "ms_successful_sentence_completion_date", { value: 5, unit: "years", raw: "5 years" }, "Miss. Code Ann. § 63-11-30 requires five years from successful completion of every term and condition of the DUI sentence.");
  }
  if (key === "MS:minor-in-possession-underage-alcohol-expungement") {
    const outcome = answerText(answers.case_outcome).toLowerCase();
    if (outcome.includes("dismiss") || outcome.includes("acquit") || outcome.includes("discharge")) {
      return timingFromExactAnchor(profile, answers, rule, pathway, "ms_mip_dismissal_or_discharge_date", { value: 1, unit: "years", raw: "1 year" }, "Miss. Code Ann. § 67-3-70 requires one year from dismissal or discharge for this underage-alcohol route.");
    }
    const fineImposed = answerText(answers.ms_mip_fine_imposed).toLowerCase();
    if (!fineImposed) {
      return {
        status: "missing_anchor",
        reason: reason(profile.jurisdiction.code, "ms_mip_fine_status_missing", "We need to know whether the court imposed a fine before the exact underage-alcohol clock can be evaluated.", rule.sourceRef ?? pathway.sourceRef),
        missingQuestionIds: ["ms_mip_fine_imposed"]
      };
    }
    if (fineImposed.includes("unsure") || fineImposed.includes("unknown") || fineImposed.includes("not sure")) {
      return {
        status: "needs_review",
        reason: reason(profile.jurisdiction.code, "ms_mip_fine_status_uncertain", "The court-record fine status must be confirmed before the exact underage-alcohol clock can be evaluated.", rule.sourceRef ?? pathway.sourceRef)
      };
    }
    if (isNegative(answers.ms_mip_fine_imposed)) {
      return timingFromExactAnchor(profile, answers, rule, pathway, "ms_mip_sentence_completion_date", { value: 1, unit: "years", raw: "1 year" }, "Miss. Code Ann. § 67-3-70 requires one year from sentence completion when no fine was imposed.");
    }
    if (isAffirmative(answers.ms_mip_fine_imposed)) {
      return latestExactAnchorTiming(profile, answers, rule, pathway, ["ms_mip_sentence_completion_date", "ms_mip_fine_payment_date"], { value: 1, unit: "years", raw: "1 year" }, "Miss. Code Ann. § 67-3-70 requires one year from the later of sentence completion or payment of the imposed fine.");
    }
    return {
      status: "needs_review",
      reason: reason(profile.jurisdiction.code, "ms_mip_fine_status_uncertain", "The court-record fine status must be confirmed before the exact underage-alcohol clock can be evaluated.", rule.sourceRef ?? pathway.sourceRef)
    };
  }
  // ---- Missouri (corrected, awaiting Lawrence reconfirmation) ----
  // Section 311.326 runs one year from the twenty-first birthday, which is
  // twenty-two years from the date of birth. The date of birth is an identity
  // date, so anonymous screening never asks for it: screening answers the
  // approximate threshold and final verification runs the exact clock. The
  // earlier version anchored on a `twenty_first_birthday` question no Missouri
  // profile published, so this rule could not evaluate against anything.
  if (key === "MO:first-minor-in-possession-alcohol-expungement-under-311-326") {
    const born = parseDateAnswer(answers.date_of_birth);
    if (born) {
      const earliest = addDuration(born, 22, "years");
      if (!earliest) {
        return {
          status: "needs_review",
          reason: reason(profile.jurisdiction.code, "waiting_rule_not_executed", "The source-specific waiting period needs review before a packet decision.", rule.sourceRef ?? pathway.sourceRef)
        };
      }
      if (earliest > evaluationToday()) {
        return {
          status: "not_yet",
          reason: reason(profile.jurisdiction.code, "waiting_period_not_satisfied", `Mo. Rev. Stat. § 311.326 requires one year from the person's twenty-first birthday. The source-specific waiting period runs until ${earliest.toISOString().slice(0, 10)}.`, rule.sourceRef ?? pathway.sourceRef)
        };
      }
      return { status: "satisfied" };
    }
    const threshold = answers.mo_at_least_twenty_two;
    if (isNegative(threshold)) {
      return {
        status: "not_yet",
        reason: reason(profile.jurisdiction.code, "waiting_period_not_satisfied", "Mo. Rev. Stat. § 311.326 requires one year from the person's twenty-first birthday, and that year has not yet run.", rule.sourceRef ?? pathway.sourceRef)
      };
    }
    if (isAffirmative(threshold)) {
      // Preliminary only. The exact date of birth is a final-verification
      // precondition on the route contract, not a screening fact.
      return { status: "satisfied" };
    }
    return {
      status: "missing_anchor",
      reason: reason(profile.jurisdiction.code, "waiting_anchor_missing", "We need to know whether at least one year has passed since the person's twenty-first birthday before the § 311.326 clock can be evaluated.", rule.sourceRef ?? pathway.sourceRef),
      missingQuestionIds: ["mo_at_least_twenty_two"]
    };
  }
  // The compiled profile only exposes disposition_date as a date anchor; the true statutory clock is
  // completion of the authorized disposition. disposition_date is used as the available proxy anchor
  // and flagged for Lawrence in the ratification worksheet.
  if (key === "MO:general-arrest-charge-plea-trial-or-conviction-expungement-under-rsmo-610-140") {
    const level = `${answerText(answers.offense_level)} ${answerText(answers.case_outcome)} ${answerText(answers.charge)}`.toLowerCase();
    if (/felony/.test(level)) {
      return timingFromAnchor(profile, answers, rule, pathway, "disposition_date", { value: 3, unit: "years", raw: "3 years" }, "RSMo 610.140 sets a three-year wait for a felony conviction, running from completion of the authorized disposition (disposition date used as the available anchor).");
    }
    return timingFromAnchor(profile, answers, rule, pathway, "disposition_date", { value: 1, unit: "years", raw: "1 year" }, "RSMo 610.140 sets a one-year wait for a misdemeanor, ordinance, or infraction conviction, running from completion of the authorized disposition (disposition date used as the available anchor).");
  }
  if (key === "MO:first-intoxication-related-traffic-or-boating-expungement-under-610-130") {
    return timingFromAnchor(profile, answers, rule, pathway, "disposition_date", { value: 10, unit: "years", raw: "10 years" }, "RSMo 610.130 sets a ten-year wait for a first intoxication-related traffic or boating offense (disposition date used as the available anchor for sentence completion).");
  }
  if (key === "MO:stolen-or-mistaken-identity-expungement-under-610-145") {
    return { status: "satisfied" };
  }
  // ---- Louisiana (corrected, awaiting Lawrence reconfirmation) ----
  // disposition_date is the available anchor proxy for completion of sentence/probation/parole.
  // Fee/admin rows (Art. 983 fee cap; DWI-diversion 5-year-from-arrest) are separated from the
  // eligibility clean-period waits and flagged for Lawrence. 894(B)/893(E) are the set-aside routes
  // (event-based once the set-aside is granted); the 5yr/10yr clean-period routes are distinct.
  if (key === "LA:non-conviction-arrest-expungement") {
    return timingFromAnchor(profile, answers, rule, pathway, "disposition_date", { value: 0, unit: "days", raw: "event-based" }, "Louisiana non-conviction (dismissal/acquittal/DA decline) expungement has no clean-period wait; the DWI-pretrial-diversion 5-year-from-arrest rule is flagged for Lawrence.");
  }
  if (key === "LA:misdemeanor-article-894-b-set-aside-followed-by-expungement") {
    return timingFromAnchor(profile, answers, rule, pathway, "disposition_date", { value: 0, unit: "days", raw: "event-based after set-aside" }, "Louisiana Art. 894(B) misdemeanor set-aside-then-expungement is event-based once the set-aside is granted; the set-aside-granted precondition is flagged for Lawrence.");
  }
  if (key === "LA:misdemeanor-five-year-clean-period-expungement") {
    return timingFromAnchor(profile, answers, rule, pathway, "disposition_date", { value: 5, unit: "years", raw: "5 years" }, "Louisiana Art. 977 misdemeanor clean-period expungement requires five years from completion of sentence/probation/parole (disposition date used as the available anchor).");
  }
  if (key === "LA:first-offense-marijuana-expungement-after-90-days-art-998") {
    return timingFromExactAnchor(profile, answers, rule, pathway, "conviction_date", { value: 90, unit: "days", raw: "90 days" }, "Louisiana Art. 998 first-offense marijuana expungement requires 90 days from conviction.");
  }
  if (key === "LA:felony-article-893-e-set-aside-followed-by-expungement") {
    return timingFromAnchor(profile, answers, rule, pathway, "disposition_date", { value: 0, unit: "days", raw: "event-based after set-aside" }, "Louisiana Art. 893(E) felony set-aside-then-expungement is event-based once the set-aside is granted; the set-aside-granted precondition and Art. 978(B) exclusions are flagged for Lawrence.");
  }
  if (key === "LA:felony-ten-year-clean-period-expungement") {
    return timingFromAnchor(profile, answers, rule, pathway, "disposition_date", { value: 10, unit: "years", raw: "10 years" }, "Louisiana Art. 978 felony clean-period expungement requires ten years from completion of sentence/probation/parole (disposition date used as the available anchor).");
  }
  // ---- Nebraska (corrected, awaiting Lawrence reconfirmation) ----
  // Neb. Rev. Stat. § 29-2264 set-aside is a SET-ASIDE, not sealing/erasure: the conviction stays
  // visible with a set-aside notation. No fixed numeric wait; the remedy runs from satisfactory
  // completion of the sentence, enforced by the generic completion blockers above.
  if (key === "NE:set-aside-probation-fine-community-service" || key === "NE:set-aside-incarceration-one-year-or-less") {
    return timingFromAnchor(profile, answers, rule, pathway, "disposition_date", { value: 0, unit: "days", raw: "runs from sentence completion" }, "Nebraska § 29-2264 conviction SET-ASIDE (record stays visible with a set-aside notation, not sealed) runs from satisfactory completion of the sentence; there is no fixed waiting period.");
  }
  // ---- Virginia (corrected, awaiting Lawrence reconfirmation) ----
  // Effective law pinned as of 2026-07-01. Regime 1 non-conviction expungement (§ 19.2-392.2) is
  // long-standing and event-based. Petition-based sealing (§ 19.2-392.12/.12:1) became effective
  // 2026-07-01; its 7yr (misdemeanor) / 10yr (Class 5/6 felony or larceny) waits are wired, but OES
  // form-readiness and the full exclusion / felony-history-bar list are flagged for Lawrence.
  if (key === "VA:regime-1-expungement-available-now") {
    return timingFromAnchor(profile, answers, rule, pathway, "disposition_date", { value: 0, unit: "days", raw: "event-based" }, "Virginia § 19.2-392.2 expungement of non-convictions has no waiting period.");
  }
  if (key === "VA:petition-based-sealing") {
    const level = `${answerText(answers.offense_level)} ${answerText(answers.case_outcome)} ${answerText(answers.charge)}`.toLowerCase();
    if (/felony/.test(level)) {
      return timingFromAnchor(profile, answers, rule, pathway, "disposition_date", { value: 10, unit: "years", raw: "10 years" }, "Virginia § 19.2-392.12 petition-based sealing of an eligible Class 5/6 felony or larceny requires ten years from conviction or release, whichever is later (disposition date used as the available anchor).");
    }
    return timingFromAnchor(profile, answers, rule, pathway, "disposition_date", { value: 7, unit: "years", raw: "7 years" }, "Virginia § 19.2-392.12 petition-based sealing of an eligible misdemeanor requires seven conviction-free years (disposition date used as the available anchor).");
  }
  // ---- Maine (corrected, awaiting Lawrence reconfirmation) ----
  // disposition_date is the available anchor proxy for "sentence fully satisfied".
  if (key === "ME:adult-conviction-sealing") {
    return timingFromAnchor(profile, answers, rule, pathway, "disposition_date", { value: 4, unit: "years", raw: "4 years" }, "Maine CR-218 adult conviction sealing (eligible Class E crimes) requires four years after the sentence is fully satisfied (disposition date used as the available anchor).");
  }
  // ---- Alaska TF-810 CourtView exclusion request (legal signoff 2026-07-01) ----
  // AS 22.35.030 / Admin. R. 40(a): a case that ended in acquittal or dismissal is excluded from the
  // public online index 60 days after the acquittal or dismissal. disposition_date is the acquittal/
  // dismissal date anchor.
  if (key === "AK:confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40") {
    return timingFromExactAnchor(profile, answers, rule, pathway, "disposition_date", { value: 60, unit: "days", raw: "60 days" }, "Alaska CourtView exclusion (Form TF-810 · AS 22.35.030 / Admin. R. 40) is available 60 days after the acquittal or dismissal.");
  }
  // Delaware's exact mechanism, history and exclusions establish the tier.
  // Preserve the conviction/release dependency; generic disposition/buckets
  // are never substitutes for these independently named source anchors.
  if (profile.jurisdiction.code === "DE" && [DE_COURT, DE_SBI].includes(pathway.id)) {
    const de = delawareConvictionDecision(answers, evaluationToday().toISOString().slice(0, 10));
    if (de.status === "satisfied") return { status: "satisfied" };
    if (de.status === "missing") return { status: "missing_anchor", missingQuestionIds: de.ids ?? [], reason: reason("DE", de.code!, DE_REASON_TEXT[de.code!], DE_SOURCE) };
    if (de.status !== "not_applicable") return { status: de.status === "not_yet" ? "not_yet" : "needs_review", reason: reason("DE", de.code!, DE_REASON_TEXT[de.code!], DE_SOURCE) };
  }
  // ---- Massachusetts § 100A CORI conviction sealing (legal signoff 2026-07-01) ----
  // M.G.L. c. 276 § 100A sealing runs three years (misdemeanor) or seven years (felony) from the later
  // of disposition or release from custody/supervision, with no disqualifying conviction during the
  // period. This is record SEALING (Commissioner of Probation Petition to Seal), not expungement.
  if (key === "MA:adult-conviction-sealing-under-m-g-l-c-276-100a") {
    const level = `${answerText(answers.offense_level)} ${answerText(answers.case_outcome)} ${answerText(answers.charge)}`.toLowerCase();
    if (/felony/.test(level)) {
      return latestAnchorTiming(profile, answers, rule, pathway, ["conviction_date", "release_date", "disposition_date", "sentence_completion_actual_date"], { value: 7, unit: "years", raw: "7 years" }, "M.G.L. c. 276 § 100A sealing of a felony conviction requires seven years from the later of disposition or release from custody/supervision (later of the available anchors used).");
    }
    return latestAnchorTiming(profile, answers, rule, pathway, ["conviction_date", "release_date", "disposition_date", "sentence_completion_actual_date"], { value: 3, unit: "years", raw: "3 years" }, "M.G.L. c. 276 § 100A sealing of a misdemeanor conviction requires three years from the later of disposition or release from custody/supervision (later of the available anchors used).");
  }
  // ---- Illinois felony-prostitution relief (corrected, awaiting Lawrence reconfirmation) ----
  // 20 ILCS 2630/5.2(j) motion to vacate/expunge a Class 4 felony prostitution conviction is
  // event-based once any sentence/condition is completed. The Class-4-felony-prostitution offense
  // gate and the trafficking-survivor (5.2(h)) overlap are flagged for Lawrence.
  if (key === "IL:felony-prostitution-relief") {
    return timingFromAnchor(profile, answers, rule, pathway, "disposition_date", { value: 0, unit: "days", raw: "event-based after sentence completion" }, "Illinois 20 ILCS 2630/5.2(j) relief for a Class 4 felony prostitution conviction is available after any sentence or condition is completed; there is no additional waiting period.");
  }
  // ---- Idaho withheld-judgment set-aside (corrected, awaiting Lawrence reconfirmation) ----
  // I.C. § 19-2604(1) set-aside dismisses the charge and restores civil rights after successful
  // completion of a withheld judgment; it is a discretionary court motion (caution-tier once
  // ratified) and is a SET-ASIDE, not an expungement. Event-based once probation is completed
  // (disposition_date used as the available anchor for completion of the withheld-judgment term).
  if (key === "ID:withheld-judgment-idaho-code-19-2604-review-branch") {
    return timingFromAnchor(profile, answers, rule, pathway, "disposition_date", { value: 0, unit: "days", raw: "event-based after probation completion" }, "Idaho § 19-2604(1) set-aside (dismisses the charge and restores civil rights; not an expungement) is available after successful completion of the withheld judgment; there is no additional waiting period.");
  }
  // ---- Hawaii HCJDC 159(b) administrative application (legal signoff 2026-07-01) ----
  // Event-based, not a numeric waiting period. Non-conviction eligibility is established once the
  // arrest/charge resolved without a conviction (HRS § 831-3.2); conviction eligibility is established
  // by the attached Court Order Granting Expungement (gated in hiAdminApplicationSafetyGate).
  if (key === "HI:nonconviction-arrest-expungement") {
    return { status: "satisfied" };
  }
  if (key === "HI:first-time-drug-conviction" || key === "HI:dui-under-21-conviction") {
    return { status: "satisfied" };
  }
  return undefined;
}

function latestAnchorTiming(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, rule: CompiledRule, pathway: CompiledPathway, anchorIds: string[], duration: CompiledDuration, text: string): TimingResult {
  const dates = anchorIds
    .map((id) => ({ id, date: parseDateAnswer(answers[id]) }))
    .filter((candidate): candidate is { id: string; date: Date } => Boolean(candidate.date));
  if (dates.length === 0) {
    const bucketTiming = timingFromResolvedBucket(profile, answers, rule, pathway, duration, text);
    if (bucketTiming) return bucketTiming;
    const askable = answerableAnchorIds(profile, anchorIds);
    if (askable.length === 0) {
      return {
        status: "needs_review",
        reason: reason(profile.jurisdiction.code, "waiting_anchor_not_publicly_askable", `The source-specific waiting period runs from ${anchorIds.join(", ")}, and this profile publishes no public question for any of them.`, rule.sourceRef ?? pathway.sourceRef)
      };
    }
    return {
      status: "missing_anchor",
      reason: reason(profile.jurisdiction.code, "waiting_anchor_missing", `One of ${askable.join(", ")} is needed before the source-specific waiting period can be evaluated.`, rule.sourceRef ?? pathway.sourceRef),
      missingQuestionIds: askable
    };
  }
  const latest = dates.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
  const syntheticAnswers = { ...answers, [latest.id]: latest.date.toISOString().slice(0, 10) };
  return timingFromAnchor(profile, syntheticAnswers, rule, pathway, latest.id, duration, text);
}

function parseExactTimingAnchor(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, id: string) {
  return profile.jurisdiction.code === "MS" && MS_EXACT_TIMING_FACT_IDS.some(fact => fact === id)
    ? msExactCalendarDate(answerText(answers[id])) : parseDateAnswer(answers[id]);
}

function latestExactAnchorTiming(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, rule: CompiledRule, pathway: CompiledPathway, anchorIds: string[], duration: CompiledDuration, text: string): TimingResult {
  const askable = answerableAnchorIds(profile, anchorIds);
  const missing = askable.filter((id) => !parseExactTimingAnchor(profile, answers, id));
  if (missing.length > 0) {
    return {
      status: "missing_anchor",
      reason: reason(profile.jurisdiction.code, "waiting_anchor_missing", (profile.jurisdiction.code === "MS" && missing.every(id => MS_TIMING_MISSING_TEXT[id]) ? missing.length === 1 ? MS_TIMING_MISSING_TEXT[missing[0]] : MS_TIMING_MULTIPLE_MISSING_TEXT : `The exact ${missing.join(", ")} value is needed before the source-specific waiting period can be evaluated.`), rule.sourceRef ?? pathway.sourceRef),
      missingQuestionIds: missing
    };
  }
  if (askable.length !== anchorIds.length) {
    return {
      status: "needs_review",
      reason: reason(profile.jurisdiction.code, "waiting_anchor_not_publicly_askable", `The source-specific waiting period runs from ${anchorIds.join(", ")}, and every exact anchor must be publicly askable.`, rule.sourceRef ?? pathway.sourceRef)
    };
  }
  const latest = anchorIds
    .map((id) => ({ id, date: parseExactTimingAnchor(profile, answers, id) as Date }))
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
  return timingFromExactAnchor(profile, answers, rule, pathway, latest.id, duration, text);
}

function timingFromExactAnchor(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, rule: CompiledRule, pathway: CompiledPathway, anchorId: string, duration: CompiledDuration, text: string): TimingResult {
  const jurisdiction = profile.jurisdiction.code;
  const askable = answerableAnchorIds(profile, [anchorId]);
  if (askable.length === 0) {
    return {
      status: "needs_review",
      reason: reason(jurisdiction, "waiting_anchor_not_publicly_askable", `The source-specific waiting period runs from ${anchorId}, and this exact anchor is not publicly askable.`, rule.sourceRef ?? pathway.sourceRef)
    };
  }
  const anchor = parseExactTimingAnchor(profile, answers, anchorId);
  if (!anchor) {
    return {
      status: "missing_anchor",
      reason: reason(jurisdiction, "waiting_anchor_missing", (profile.jurisdiction.code === "MS" && MS_TIMING_MISSING_TEXT[anchorId] || `The exact ${anchorId} value is needed before the source-specific waiting period can be evaluated.`), rule.sourceRef ?? pathway.sourceRef),
      missingQuestionIds: [anchorId]
    };
  }
  const earliest = addDuration(anchor, duration.value, duration.unit);
  if (!earliest) {
    return {
      status: "needs_review",
      reason: reason(jurisdiction, "waiting_rule_not_executed", "The source-specific waiting period needs review before a packet decision.", rule.sourceRef ?? pathway.sourceRef)
    };
  }
  if (earliest > evaluationToday()) {
    return {
      status: "not_yet",
      reason: reason(jurisdiction, "waiting_period_not_satisfied", `${text} The source-specific waiting period runs until ${earliest.toISOString().slice(0, 10)}.`, rule.sourceRef ?? pathway.sourceRef)
    };
  }
  return { status: "satisfied" };
}

function timingFromAnchor(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, rule: CompiledRule, pathway: CompiledPathway, anchorId: string, duration: CompiledDuration, text: string): TimingResult {
  const jurisdiction = profile.jurisdiction.code;
  const anchor = parseDateAnswer(answers[anchorId]);
  if (!anchor) {
    const bucketTiming = timingFromResolvedBucket(profile, answers, rule, pathway, duration, text);
    if (bucketTiming) return bucketTiming;
    const askable = answerableAnchorIds(profile, [anchorId]);
    if (askable.length === 0) {
      return {
        status: "needs_review",
        reason: reason(jurisdiction, "waiting_anchor_not_publicly_askable", `The corrected source-specific waiting period runs from ${anchorId}, and this profile publishes no public question for it.`, rule.sourceRef ?? pathway.sourceRef)
      };
    }
    return {
      status: "missing_anchor",
      reason: reason(jurisdiction, "waiting_anchor_missing", `The ${askable.join(", ")} value is needed before the corrected source-specific waiting period can be evaluated.`, rule.sourceRef ?? pathway.sourceRef),
      missingQuestionIds: askable
    };
  }
  const earliest = addDuration(anchor, duration.value, duration.unit);
  if (!earliest) {
    return {
      status: "needs_review",
      reason: reason(jurisdiction, "waiting_rule_not_executed", "The corrected source-specific waiting period needs review before a packet decision.", rule.sourceRef ?? pathway.sourceRef)
    };
  }
  if (earliest > evaluationToday()) {
    return {
      status: "not_yet",
      reason: reason(jurisdiction, "waiting_period_not_satisfied", `${text} The source-specific waiting period runs until ${earliest.toISOString().slice(0, 10)}.`, rule.sourceRef ?? pathway.sourceRef)
    };
  }
  return { status: "satisfied" };
}

function timingFromResolvedBucket(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, rule: CompiledRule, pathway: CompiledPathway, duration: CompiledDuration, text: string): TimingResult | undefined {
  const jurisdiction = profile.jurisdiction.code;
  const bucket = answerText(answers[RESOLVED_TIMING_BUCKET_FIELD_ID]);
  if (!bucket) return undefined;
  if (bucket === "not_sure") {
    return {
      status: "missing_anchor",
      reason: reason(jurisdiction, "timing_bucket_unknown", "We need one more detail before we can prepare the right packet.", rule.sourceRef ?? pathway.sourceRef),
      missingQuestionIds: [RESOLVED_TIMING_BUCKET_FIELD_ID]
    };
  }
  if (bucket === "still_open") {
    return {
      status: "not_yet",
      reason: reason(jurisdiction, "case_still_open", "This may not be ready yet. Most record-clearing paths require the case to be resolved first.", rule.sourceRef ?? pathway.sourceRef)
    };
  }
  const window = TIMING_BUCKET_WINDOWS[bucket];
  if (!window) return undefined;
  const requiredYears = durationInYears(duration);
  if (requiredYears === undefined) {
    return {
      status: "needs_review",
      reason: reason(jurisdiction, "waiting_rule_not_executed", "We need one more detail before we can prepare the right packet.", rule.sourceRef ?? pathway.sourceRef)
    };
  }
  if (requiredYears <= 0) return { status: "satisfied" };
  if (window.minYears >= requiredYears) return { status: "satisfied" };
  const overlapsBoundary = window.maxYears === undefined ? false : window.maxYears > requiredYears;
  return {
    status: "not_yet",
    reason: reason(jurisdiction, overlapsBoundary ? "timing_bucket_overlaps_waiting_period" : "timing_bucket_too_recent", `${text} This may not be ready yet. The timing estimate does not clearly satisfy the waiting period.`, rule.sourceRef ?? pathway.sourceRef)
  };
}

function durationInYears(duration: CompiledDuration) {
  if (duration.unit === "years") return duration.value;
  if (duration.unit === "months") return duration.value / 12;
  if (duration.unit === "days") return duration.value / 365;
  return undefined;
}

function latestTimingResult(first: TimingResult, second: TimingResult): TimingResult {
  if (first.status === "needs_review" || first.status === "missing_anchor" || first.status === "not_yet") return first;
  if (second.status === "needs_review" || second.status === "missing_anchor" || second.status === "not_yet") return second;
  return { status: "satisfied" };
}

function guidanceTextForPathway(profile: EngineProfile, pathway: CompiledPathway) {
  if (profile.jurisdiction.code === "DC" && (pathway.id === "dc_auto_expungement_16_802" || pathway.id === "dc_auto_sealing_16_805")) {
    return "DC has an automatic sealing law, but the court says automatic sealing is not currently operating. You may still have a motion-based option.";
  }
  if (profile.jurisdiction.code === "DC" && pathway.id === "dc_juvenile_sealing_16_2335") {
    return "DC juvenile sealing is guidance-only in the adult flow; no adult Criminal Division packet is generated.";
  }
  return "The selected source-defined route is automatic or guidance-only.";
}

function missingProductFactIds(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, pathway: CompiledPathway) {
  if (profile.jurisdiction.code !== "WI" || pathway.id !== "adult-conviction-expungement-under-wis-stat-973-015") return [];
  const missing: string[] = [];
  if (!answerText(answers.wi_expungement_ordered_at_sentencing).trim()) missing.push("wi_expungement_ordered_at_sentencing");
  if (!answerText(answers.wi_no_probation_jail_prison).trim()) missing.push("wi_no_probation_jail_prison");
  return missing;
}

function activeProgramReferralReason(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, pathway: CompiledPathway): ScreeningReason | undefined {
  const jurisdiction = profile.jurisdiction.code;
  const legalContract = legalRouteContract(jurisdiction, pathway.id);
  // LD-MS-01 keeps active-case admission separate from post-completion
  // expungement. Only the fact-selected route and its exact compiled guidance
  // rule can take this branch; an optional remedy label cannot authorize it.
  const programRoute = jurisdiction === "MS" ? mississippiProgramRouteFromAnswers(answers) : null;
  if (programRoute?.status === "selected" && programRoute.pathwayId === pathway.id
    && answers.ms_program_record_status === "active"
    && legalContract?.outcomeMode === "referral" && legalContract.stage === "active_case_admission"
    && profile.orderedDecisionRules?.some(rule => rule.when?.backendPathwayId === pathway.id
      && rule.sourceRef === "legal-authority:LD-MS-01"
      && rule.stage === "pathway_routing"
      && rule.then?.suggestedResultCode === "guidance_only"
      && rule.then?.frontendAction === "save_state_guidance_no_checkout")) {
    return reason(jurisdiction, "active_program_admission_referral", "This case is still in the program or admission stage. Discuss the active case with your lawyer or the program office. Admission is discretionary; this result does not establish admission eligibility, successful completion, dismissal, or expungement. No expungement packet opens at this stage.", "legal-authority:LD-MS-01");
  }
  return undefined;
}

function productGuidanceReason(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, pathway: CompiledPathway): ScreeningReason | undefined {
  const jurisdiction = profile.jurisdiction.code;
  const legalContract = legalRouteContract(jurisdiction, pathway.id);
  if (legalContract?.outcomeMode === "referral") return undefined;
  if (routeIsApprovedReleaseGuidance(profile, pathway)) {
    return reason(
      jurisdiction,
      "approved_release_guidance_only",
      "Roger Roman and the LegalEase legal team approved state-specific guidance as the complete service behavior for this release. No paid court packet opens for this route.",
      pathway.sourceRef
    );
  }
  if (routeIsHeldGuidance(profile, pathway)) {
    return reason(jurisdiction, "lawrence_hold_guidance_only", "Lawrence marked this petition route guidance-only for this release; no paid court packet opens for this route yet.", pathway.sourceRef);
  }
  if (jurisdiction === "WI" && pathway.id === "adult-conviction-expungement-under-wis-stat-973-015") {
    if (!isAffirmative(answers.wi_expungement_ordered_at_sentencing)) {
      return reason(jurisdiction, "no_sentencing_expungement_order", "Wisconsin CR-266 support is guidance-only unless the sentencing court already ordered expungement at sentencing.", pathway.sourceRef);
    }
    if (!isAffirmative(answers.wi_no_probation_jail_prison)) {
      return reason(jurisdiction, "cr_266_sentence_type_not_confirmed", "Wisconsin CR-266 support is guidance-only unless the record confirms no probation, jail, or prison sentence.", pathway.sourceRef);
    }
  }
  if (!isCourtFiledPetitionRoute(profile, pathway) && !routeIsAdministrativeApplicationPacket(profile, pathway)) {
    return reason(jurisdiction, "guidance_only_no_user_filed_court_petition", guidanceTextForProductRoute(profile, pathway), pathway.sourceRef);
  }
  return undefined;
}

function guidanceTextForProductRoute(profile: EngineProfile, pathway: CompiledPathway) {
  if (profile.jurisdiction.code === "DC" && (pathway.id === "dc_auto_expungement_16_802" || pathway.id === "dc_auto_sealing_16_805")) {
    return "DC has an automatic sealing law, but the court says automatic sealing is not currently operating. You may still have a motion-based option.";
  }
  if (profile.jurisdiction.code === "AK") {
    return "Alaska has no general user-filed court petition packet for conviction sealing; the available routes here are guidance-only or narrow agency/support paths.";
  }
  if (profile.jurisdiction.code === "CT" && pathway.id === "absolute-pardon-resulting-in-erasure") {
    return "Connecticut absolute pardon relief is handled through the Board of Pardons and Paroles ePardon portal; this is portal-assisted guidance, not a court filing packet.";
  }
  if (profile.jurisdiction.code === "GA" && pathway.id === "non-conviction-record-restriction-through-the-agency-prosecutor-process") {
    return "Georgia's agency/prosecutor restriction route is guidance-only; paid packets are limited to user-filed court petition routes.";
  }
  return "This route is guidance-only because it is automatic, board/portal-based, prosecutor/agency-only, or otherwise not a user-filed court petition/motion/pleading.";
}

function result(
  profile: EngineProfile,
  request: ScreeningEvaluationRequest,
  resultCode: ScreeningResultCode,
  reasons: ScreeningReason[],
  overrides: Partial<ScreeningEvaluation> = {}
): ScreeningEvaluation {
  const paymentAllowed = overrides.paymentAllowed === true && (resultCode === "packet_ready" || resultCode === "packet_ready_with_caution");
  const convictionRequestReason = reasons.find(item => Object.keys(CONVICTION_RELIEF_COPY)
    .some(code => item.code === `${profile.jurisdiction.code.toLowerCase()}.conviction_relief_${code}`));
  const specificNextStep = convictionRequestReason ?? reasons.find(item => Object.entries(GA_PARDON_COPY).some(([code, [text]]) => item.code === `ga.pardon_${code}` && item.text === text)) ?? reasons.find(isGeorgiaFirstOffenderGuidance);
  return {
    jurisdiction: profile.jurisdiction.code,
    profileVersion: profile.profileVersion,
    matterId: request.matterId,
    resultCode,
    userLabel: labelForResult(resultCode),
    reasons,
    missingQuestionIds: overrides.missingQuestionIds ?? [],
    cautions: [...(overrides.cautions ?? []), ...(overrides.pathwayId === TX_ND_ROUTES[0]
      && texasNondisclosureTimingContract(profile, overrides.pathwayId)
      && TX_ND_FACT_IDS.some(id => Object.hasOwn(request.answers, id))
      ? [TX_ND_TIMING_COPY[texasNondisclosureClock(profile, overrides.pathwayId, request.answers, evaluationToday().toISOString().slice(0,10))!.status][0]] : []), ...(isCaProp64Pathway(profile.jurisdiction.code, overrides.pathwayId)
      ? [CA_PROP64_PROCEDURE_COPY[overrides.pathwayId === CA_PROP64_CURRENT ? "current" : "completed"][0]] : [])],
    nextSteps: specificNextStep ? [specificNextStep.text] : overrides.missingQuestionIds?.includes("financial_obligations")
      ? [FINANCIAL_CLARIFICATION_TEXT, FINANCIAL_OTHER_QUESTIONS_TEXT] : nextStepsForResult(resultCode),
    paymentAllowed,
    ...(overrides.pathwayId ? { pathwayId: overrides.pathwayId } : {}),
    ...(overrides.packetPlan ? { packetPlan: overrides.packetPlan } : {})
  };
}

const FINANCIAL_CLARIFICATION_TEXT = "Review your saved answer about court-ordered financial obligations. Keep an unsure answer if you do not know, and update it when you have the information.";
const FINANCIAL_OTHER_QUESTIONS_TEXT = "Also review any other questions marked as needing more information.";

function labelForResult(resultCode: ScreeningResultCode) {
  const labels: Record<ScreeningResultCode, string> = {
    packet_ready: "A source-defined packet pathway may be available.",
    packet_ready_with_caution: "A source-defined packet pathway may be available with cautions.",
    needs_more_info: "We need one more detail before we can prepare the right packet.",
    not_yet: "A timing or completion condition is not satisfied yet.",
    guidance_only: "This route is guidance-only or automatic relief verification.",
    not_covered_yet: "This record type is not covered yet.",
    likely_not_eligible: "The answers appear to hit a source-defined exclusion.",
    needs_review: "We need one more detail before we can prepare the right packet.",
    hard_stop: "This matter is outside the self-help state screening scope."
  };
  return labels[resultCode];
}

function nextStepsForResult(resultCode: ScreeningResultCode) {
  const nextSteps: Record<ScreeningResultCode, string[]> = {
    packet_ready: ["Your packet has been started. A few details may still be needed before it is ready to file.", "Complete packet fields in Briefcase after payment.", "External documents affect filing readiness, not checkout eligibility."],
    packet_ready_with_caution: ["Your packet has been started. A few details may still be needed before it is ready to file.", "Review the cautions and complete packet fields in Briefcase after payment.", "Do not file until external documents, fees, fingerprints, and instructions are complete."],
    needs_more_info: [
      "We need the case date, dismissal date, disposition date, or completion date used to check the waiting period.",
      "Save your progress and update your answers when you have that detail."
    ],
    not_yet: ["Save the timing result.", "Confirm the anchor date from records.", "Return when the source-defined wait may be satisfied."],
    guidance_only: ["Review the state-specific guidance.", "Verify the record status with the listed source.", "Do not pay for a filing packet for this route."],
    not_covered_yet: ["Save this result.", "Request follow-up.", "Consider legal aid or attorney help."],
    likely_not_eligible: ["Review the source-backed reason.", "Do not use automated packet generation.", "Consider legal aid or attorney help."],
    needs_review: ["Gather court records.", "Save the result.", "Save your progress and update your answers when you have that detail."],
    hard_stop: ["Do not use this state self-help packet flow.", "Gather the relevant record.", "Contact legal aid or an attorney."]
  };
  return nextSteps[resultCode];
}

function reason(jurisdiction: string, suffix: string, text: string, sourceRef?: string): ScreeningReason {
  return {
    code: `${jurisdiction.toLowerCase()}.${suffix}`,
    text,
    ...(sourceRef ? { sourceRef } : {})
  };
}


type CompiledRule = EngineProfile["orderedDecisionRules"][number];
type CompiledPathway = EngineProfile["pathways"][number];

type RouteMatch =
  | {
    ok: true;
    deterministic: true;
    rule: CompiledRule;
    pathway: CompiledPathway;
  }
  | {
    ok: false;
    resultCode: Exclude<ScreeningResultCode, "packet_ready" | "packet_ready_with_caution">;
    reason: ScreeningReason;
    // The pathway the participant named, when one was resolved before the
    // failure. Reporting it changes no result code and no payment decision; it
    // only stops a resolved route from being reported as no route at all.
    selectedPathwayId?: string;
  };

type TimingResult =
  | { status: "satisfied" | "not_applicable"; reason?: undefined; missingQuestionIds?: undefined }
  | { status: "not_yet" | "needs_review"; reason: ScreeningReason; missingQuestionIds?: undefined }
  | { status: "missing_anchor"; reason: ScreeningReason; missingQuestionIds: string[] };

type CompiledDuration = {
  value: number;
  unit: string;
  raw?: string;
};

type SelectedWaitingRule = {
  id?: string;
  text: string;
  anchor?: string;
  duration: CompiledDuration;
  routeScore: number;
};

const RESOLVED_TIMING_BUCKET_FIELD_ID = "resolved_timing_bucket";
const COURT_REQUIREMENTS_FIELD_ID = "court_requirements_completed";

const publicQuestionIdCache = new WeakMap<EngineProfile, Set<string>>();

function publicQuestionIds(profile: EngineProfile): Set<string> {
  const cached = publicQuestionIdCache.get(profile);
  if (cached) return cached;
  const ids = new Set(projectPublicProfile(profile).questions.map((question) => question.id));
  publicQuestionIdCache.set(profile, ids);
  return ids;
}

/**
 * Only ever ask for a fact the participant can actually give.
 *
 * The timing gate names the exact anchor it wanted — disposition_date,
 * arrest_date and so on — but not every profile publishes every anchor as a
 * public question. Naming one that is not published produces an unanswerable
 * request: the client supplies the id, the request validator rejects it as not a
 * public question, the evaluator asks again, and the exchange loops until it is
 * abandoned. That is how IN:non-conviction-arrest-or-criminal-charge-expungement
 * spun on arrest_date.
 *
 * So the anchors are filtered to the ones this profile actually offers, and if
 * none survives the request falls back to the timing bucket, which every profile
 * that can reach this gate now publishes.
 */
function answerableAnchorIds(profile: EngineProfile, anchorIds: string[]): string[] {
  const published = publicQuestionIds(profile);
  const answerable = anchorIds.filter((id) => published.has(id));
  if (answerable.length > 0) return answerable;
  return published.has(RESOLVED_TIMING_BUCKET_FIELD_ID) ? [RESOLVED_TIMING_BUCKET_FIELD_ID] : [];
}

type TimingBucketWindow = {
  minYears: number;
  maxYears?: number;
};

const TIMING_BUCKET_WINDOWS: Record<string, TimingBucketWindow> = {
  lt_1_year: { minYears: 0, maxYears: 1 },
  years_1_to_2: { minYears: 1, maxYears: 2 },
  years_2_to_3: { minYears: 2, maxYears: 3 },
  years_3_to_5: { minYears: 3, maxYears: 5 },
  years_5_to_7: { minYears: 5, maxYears: 7 },
  years_7_to_10: { minYears: 7, maxYears: 10 },
  gt_10_years: { minYears: 10 }
};

function matchCompiledRuleRoute(profile: EngineProfile, publicProfile: PublicJurisdictionProfile, answers: Record<string, ScreeningAnswerValue>): RouteMatch {
  const jurisdiction = profile.jurisdiction.code;
  const selectedPathway = selectPathway(profile, answers);
  // Complete DE factual predicates select the exact retained route rule;
  // broad source prose and array ordering cannot select a different result.
  if (jurisdiction === "DE" && selectedPathway && delawareConvictionRoute(answers) === selectedPathway.id
    && delawareConvictionDecision(answers, evaluationToday().toISOString().slice(0, 10)).status === "satisfied") {
    const exact = profile.orderedDecisionRules.find(rule => rule.id === `route-${selectedPathway.id}` && rule.when.backendPathwayId === selectedPathway.id);
    if (exact) return { ok: true, deterministic: true, rule: exact, pathway: selectedPathway };
  }
  // Exact conduct facts satisfy the legacy rule predicates; participant legal
  // self-certifications are neither required nor synthesized into saved answers.
  if (selectedPathway && isCaProp64Pathway(jurisdiction, selectedPathway.id)
    && caProp64Facts(answers, evaluationToday().toISOString().slice(0, 10)).status === "satisfied") {
    const exact = profile.orderedDecisionRules.find(rule => rule.id === `route-${selectedPathway.id}`
      && rule.when.backendPathwayId === selectedPathway.id && rule.candidatePathwayIds?.length === 1
      && rule.candidatePathwayIds[0] === selectedPathway.id);
    if (exact) return { ok: true, deterministic: true, rule: exact, pathway: selectedPathway };
  }
  const requestedPathwayContext = answerText(answers.possible_pathway_context).trim();
  if (requestedPathwayContext && !selectedPathway) {
    const requested = pathwayFromContext(profile, requestedPathwayContext.toLowerCase());
    const excluded = requested && pathwayExcludedByKnownFacts(jurisdiction, answers, requested.id);
    return {
      ok: false,
      resultCode: "needs_review",
      reason: excluded && (jurisdiction === "IL" || jurisdiction === "GA")
        ? reason(jurisdiction, "pathway_conflicts_with_saved_fact", FACTUAL_PATHWAY_EXCLUSION_COPY[jurisdiction])
        : reason(jurisdiction, "pathway_context_not_matched", "The selected pathway context did not match a deterministic compiled pathway before a packet decision.")
    };
  }
  // This boundary also applies to singleton/backend compiled fallbacks. A
  // compiled broad outcome token cannot bypass the factual request above.
  const reliefRequest = convictionReliefRequest(profile, answers);
  if (reliefRequest.status === "clarification" || reliefRequest.status === "review") return {
    ok: false, resultCode: "needs_review",
    reason: reason(jurisdiction, "conviction_relief_missing", CONVICTION_RELIEF_COPY.missing[0], CONVICTION_RELIEF_SOURCE)
  };
  const publicQuestionIds = new Set(publicProfile.questions.map((question) => question.id));
  const outcome = normalizeCaseOutcome(answers.case_outcome);
  const exactRouteRules = selectedPathway
    ? [...(profile.orderedDecisionRules ?? [])].filter((rule) => compiledRouteRuleMatchesPathway(rule, selectedPathway))
    : [];
  const matchedRules = [...(profile.orderedDecisionRules ?? [])]
    .filter(rule => !(rule.candidatePathwayIds?.length === 1 && rule.candidatePathwayIds.some(id => pathwayExcludedByKnownFacts(jurisdiction, answers, id)))
      && !(typeof rule.when.backendPathwayId === "string" && pathwayExcludedByKnownFacts(jurisdiction, answers, rule.when.backendPathwayId)))
    .filter(rule => !(rule.candidatePathwayIds?.length === 1 && !convictionOutcomeCompatible(jurisdiction, answers, rule.candidatePathwayIds[0]))
      && !(typeof rule.when.backendPathwayId === "string" && !convictionOutcomeCompatible(jurisdiction, answers, rule.when.backendPathwayId)))
    .filter((rule) => resultCodeIsKnown(rule.then?.suggestedResultCode))
    .filter((rule) => !["likely_not_eligible", "not_yet", "guidance_only"].includes(rule.then?.suggestedResultCode ?? ""))
    .filter((rule) => !String(rule.sourceRef ?? "").includes("exclusions:"))
    .filter((rule) => fieldsPresentOrInternal([...(rule.when?.requiredFields ?? []), ...(rule.when?.fieldsReferenced ?? [])], publicQuestionIds, answers))
    .filter((rule) => caseOutcomeMatches(rule.when?.caseOutcomes ?? [], outcome))
    .filter((rule) => {
      const candidates = rule.candidatePathwayIds ?? [];
      if (!selectedPathway) return candidates.length === 1;
      return candidates.length === 0 || candidates.includes(selectedPathway.id);
    })
    .filter((rule) => !selectedPathway || compiledRuleRelevantToPathway(rule, selectedPathway));
  const routeSpecificRules = selectedPathway
    ? matchedRules.filter((rule) => compiledRouteRuleMatchesPathway(rule, selectedPathway))
    : [];
  const selectedCandidateRules = selectedPathway
    ? matchedRules.filter((rule) => (rule.candidatePathwayIds ?? []).includes(selectedPathway.id))
    : [];
  if (selectedPathway && exactRouteRules.length > 0 && routeSpecificRules.length === 0 && selectedCandidateRules.length === 0) {
    return {
      ok: false,
      resultCode: "needs_review",
      reason: reason(jurisdiction, "selected_pathway_rule_not_matched", "The selected pathway has a compiled route rule, but the collected facts did not satisfy it before a packet decision.", selectedPathway.sourceRef),
      selectedPathwayId: selectedPathway?.id
    };
  }
  const rules = (routeSpecificRules.length > 0 ? routeSpecificRules : selectedCandidateRules.length > 0 ? selectedCandidateRules : matchedRules)
    .sort((left, right) => {
      const priority = (left.priority ?? Number.MAX_SAFE_INTEGER) - (right.priority ?? Number.MAX_SAFE_INTEGER);
      if (priority !== 0) return priority;
      if (selectedPathway) {
        const relevance = compiledRulePathwayScore(right, selectedPathway) - compiledRulePathwayScore(left, selectedPathway);
        if (relevance !== 0) return relevance;
      }
      return safeResultRank(left.then?.suggestedResultCode) - safeResultRank(right.then?.suggestedResultCode);
    });

  if (rules.length === 0) {
    return {
      ok: false,
      resultCode: "needs_review",
      reason: reason(jurisdiction, "no_deterministic_compiled_rule_match", "No deterministic compiled source rule matched these answers before a packet decision."),
      selectedPathwayId: selectedPathway?.id
    };
  }

  const first = rules[0];
  const sameRank = rules.filter((rule) =>
    (rule.priority ?? Number.MAX_SAFE_INTEGER) === (first.priority ?? Number.MAX_SAFE_INTEGER)
    && safeResultRank(rule.then?.suggestedResultCode) === safeResultRank(first.then?.suggestedResultCode)
  );
  const selected = selectedPathway ?? pathwayFromRule(profile, first, answers);
  if (!selected) {
    return {
      ok: false,
      resultCode: "needs_review",
      reason: reason(jurisdiction, `ambiguous_compiled_rule_match.${first.id}`, "The matched compiled source rule did not identify one deterministic pathway.", first.sourceRef),
      selectedPathwayId: selectedPathway?.id
    };
  }
  // A singleton/backend source-fragment fallback cannot restore Tool 1 after
  // the specific conviction contract refused the supplied disposition.
  if (ca12034Contract(profile, selected.id)) return {
    ok:false, resultCode:"needs_review",
    reason:reason("CA", "probation_outcome", CA_12034_COPY.outcome[0], CA_12034_SOURCE)
  };
  if (sameRank.length > 1 && !selectedPathway) {
    return {
      ok: false,
      resultCode: "needs_review",
      reason: reason(jurisdiction, `ambiguous_compiled_rule_match.${first.id}`, "Multiple compiled source rules matched at the same priority and safety rank.", first.sourceRef)
    };
  }

  const code = first.then?.suggestedResultCode;
  if (code && ["hard_stop", "needs_more_info"].includes(code)) {
    return {
      ok: false,
      resultCode: code as "hard_stop" | "needs_more_info",
      reason: reason(jurisdiction, `compiled_rule_match.${first.id}`, `Compiled source rule ${first.id} matched before a packet decision.`, first.sourceRef),
      selectedPathwayId: selectedPathway?.id
    };
  }

  return {
    ok: true,
    deterministic: true,
    rule: first,
    pathway: selected
  };
}

function evaluateCompiledTiming(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, rule: CompiledRule, pathway: CompiledPathway): TimingResult {
  const jurisdiction = profile.jurisdiction.code;
  // The DE decision has already checked current supervision, restitution,
  // court relief and the precise pending/history statutory exceptions. Do not
  // apply the older blanket Yes/No gates again and erase those exceptions.
  if (jurisdiction === "DE" && delawareConvictionRoute(answers) === pathway.id) {
    const exact = specialRouteTiming(profile, answers, rule, pathway);
    if (exact) return exact;
  }
  // §11361.8 has no generic paid-balance, pending-case or later-conviction
  // waiting gate. Conduct and sentence-branch contradictions are checked above.
  // The serving public-safety decision remains with the court.
  if (isCaProp64Pathway(jurisdiction, pathway.id)
    && caProp64Facts(answers, evaluationToday().toISOString().slice(0, 10)).status === "satisfied") return { status: "satisfied" };
  const courtRequirement = answerText(answers[COURT_REQUIREMENTS_FIELD_ID]);
  const cannabis = jurisdiction === "IL" && pathway.id === IL_CANNABIS_PATHWAY ? illinoisCannabisFromAnswers(answers) : null;
  // §5.2(i)(3) and the adopted il-cannabis-vacate contract distinguish money
  // from nonfinancial completion. Never rewrite an unpaid answer as paid. This
  // exact candidate still reaches the source-contract review below, not payment.
  const cannabisNonfinancialComplete = cannabis?.status === "selected" && cannabis.branch === "conviction"
    && answers.il_cannabis_nonfinancial_complete === "yes";
  const financialApplies = montanaRecordFinancialApplies(profile, pathway.id, answers, "financial_obligations")
    && newMexicoGuidanceFinancialApplies(profile, pathway.id, answers, "financial_obligations")
    && oklahomaCleanSlateFinancialApplies(profile, pathway.id, answers, "financial_obligations")
    && newJerseyMarijuanaStatusFinancialApplies(profile, pathway.id, answers, "financial_obligations")
    && southCarolinaGuidanceFinancialApplies(profile, pathway.id, answers, "financial_obligations")
    && southDakotaGuidanceFinancialApplies(profile, pathway.id, answers, "financial_obligations")
    && westVirginiaGuidanceFinancialApplies(profile, pathway.id, answers, "financial_obligations")
    && texasGuidanceFinancialApplies(profile, pathway.id, answers, "financial_obligations");
  const unpaidFinancialAnswer = financialApplies && isNegative(answers.financial_obligations) && !cannabisNonfinancialComplete;
  const paymentMeaningNeedsClarification = unpaidFinancialAnswer && courtRequirement === "yes"
    && isIndependentPaidFinancialFact(routeKey(profile, pathway), profile.questions.find(question => question.id === "financial_obligations"));
  if (courtRequirement === "no" || isNegative(answers.sentence_completion_date) || unpaidFinancialAnswer && !paymentMeaningNeedsClarification || isAffirmative(answers.pending_cases) || isAffirmative(answers.new_convictions_during_waiting_period)) {
    return {
      status: "not_yet",
      reason: reason(jurisdiction, "timing_or_completion_blocker", "This may not be ready yet. Most record-clearing paths require court-ordered requirements to be completed first.", rule.sourceRef)
    };
  }
  if (paymentMeaningNeedsClarification) {
    return {
      status: "needs_review",
      reason: reason(jurisdiction, "payment_and_completion_meaning_unconfirmed", "You reported that court requirements are complete but that not all amounts were paid. Check whether any amount was waived, changed, converted to a civil judgment, or remains unpaid, including restitution. Keep the payment answer as recorded; completing requirements does not by itself prove payment or a legal exception.", rule.sourceRef)
    };
  }
  const unresolvedCompletionIds = [
    ...(courtRequirement === "not_sure" ? [COURT_REQUIREMENTS_FIELD_ID] : []),
    ...(isExplicitUnknownAnswer(answers.sentence_completion_date) ? ["sentence_completion_date"] : []),
    ...(financialApplies && isExplicitUnknownAnswer(answers.financial_obligations) && !cannabisNonfinancialComplete ? ["financial_obligations"] : [])
  ];
  if (unresolvedCompletionIds.length) {
    return {
      status: "missing_anchor",
      reason: reason(jurisdiction, "court_requirements_unknown", unresolvedCompletionIds.includes("financial_obligations")
        ? FINANCIAL_CLARIFICATION_TEXT : "We need one more detail before we can prepare the right packet.", rule.sourceRef),
      missingQuestionIds: unresolvedCompletionIds
    };
  }
  if (isNegative(answers.special_preconditions_confirmed) || isExplicitUnknownAnswer(answers.special_preconditions_confirmed)) {
    return {
      status: "needs_review",
      reason: reason(jurisdiction, "special_preconditions_unconfirmed", "We need one more detail before we can prepare the right packet.", rule.sourceRef)
    };
  }
  if (cannabis?.status === "selected" && cannabis.branch === "conviction") {
    if (answers.il_cannabis_nonfinancial_complete === "no") {
      return { status: "not_yet", reason: reason(jurisdiction, "cannabis_nonfinancial_conditions_incomplete", "The cannabis motion requires completion of the nonfinancial sentence and conditions. The answer says a nonfinancial requirement remains; paying a balance alone does not complete it.", "20-ILCS-2630/5.2(i)(3);IL.memo:il-cannabis-vacate") };
    }
    return { status: "needs_review", reason: reason(jurisdiction, "cannabis_motion_source_contract_review", "The record may fit the separate cannabis-conviction motion. Unpaid financial obligations alone do not establish that its nonfinancial completion requirement is unmet. The applicable form and route still require review before a packet can be prepared.", "20-ILCS-2630/5.2(i)(3);IL.memo:il-cannabis-vacate;LD-IL-02") };
  }
  if (profile.jurisdiction.code === "WI" && pathway.id === "adult-conviction-expungement-under-wis-stat-973-015") {
    return { status: "satisfied" };
  }
  const routeOverride = specialRouteTiming(profile, answers, rule, pathway);
  if (routeOverride) return routeOverride;

  const contract = legalRouteContract(profile.jurisdiction.code, pathway.id);
  const authority = pathway.legalAuthority;
  const effectiveFrom = contract?.effectiveFrom ?? authority?.effectiveFrom;
  const supersedes = contract?.supersedes ?? authority?.supersedes;
  const effective = effectiveFrom ? parseIsoDate(effectiveFrom) : undefined;
  const beforeEffective = Boolean(effectiveFrom) && (!effective || evaluationToday().getTime() < effective.getTime());
  const authorityDuration = beforeEffective && typeof supersedes?.value === "number" && supersedes.unit
    ? { value: supersedes.value, unit: supersedes.unit, raw: `${supersedes.value} ${supersedes.unit}` }
    : undefined;
  const compiledRuleWait = normalizeDuration(authorityDuration ?? compiledRuleDuration(rule));
  const selectedWaitingRule = compiledRuleWait
    ? {
      text: rule.when?.sourceConditionText ?? "",
      anchor: undefined,
      duration: compiledRuleWait,
      routeScore: Number.MAX_SAFE_INTEGER
    }
    : bestWaitingRuleForPathway(profile, pathway, answers);
  const duration = selectedWaitingRule?.duration;
  if (!duration) {
    if (!packetLikePathway(profile, pathway)) return { status: "not_applicable" };
    if (packetLikeResult(rule.then?.suggestedResultCode) || packetLikePathway(profile, pathway)) {
      return {
        status: "needs_review",
        reason: reason(jurisdiction, "waiting_rule_not_executed", "The source-specific waiting period needs review before a packet decision.", rule.sourceRef ?? pathway.sourceRef)
      };
    }
    return { status: "not_applicable" };
  }

  const anchorId = chooseTimingAnchor(rule, pathway, answers, selectedWaitingRule, jurisdiction);
  if (!anchorId) {
    if (!packetLikePathway(profile, pathway)) return { status: "not_applicable" };
    // The rule's own text does not name an anchor this evaluator recognises, so
    // there is no exact date to run the duration from. That is not the same as
    // having no timing information: the participant has already been asked how
    // long ago the case resolved, and the duration is known. Running the wait
    // against that bucket is the honest answer, and it is the same computation
    // used everywhere else the exact anchor is absent.
    //
    // Refusing here sent 92 intended-paid pathways to needs_review with no
    // pathway resolved at all, which reads as "this route does not work" when
    // what actually happened is that a compiled rule phrased its anchor in words
    // the anchor chooser does not match.
    const bucketTiming = timingFromResolvedBucket(profile, answers, rule, pathway, duration, "The court or agency makes the final decision.");
    if (bucketTiming) return bucketTiming;
    if (publicQuestionIds(profile).has(RESOLVED_TIMING_BUCKET_FIELD_ID)) {
      return {
        status: "missing_anchor",
        reason: reason(jurisdiction, "waiting_anchor_missing", "We need one more detail before we can prepare the right packet.", rule.sourceRef ?? pathway.sourceRef),
        missingQuestionIds: [RESOLVED_TIMING_BUCKET_FIELD_ID]
      };
    }
    return {
      status: "needs_review",
      reason: reason(jurisdiction, "waiting_anchor_not_determined", "We need the case date, dismissal date, disposition date, or completion date used to check the waiting period.", rule.sourceRef ?? pathway.sourceRef)
    };
  }
  const anchor = parseDateAnswer(answers[anchorId]);
  if (!anchor) {
    const bucketTiming = timingFromResolvedBucket(profile, answers, rule, pathway, duration, "The court or agency makes the final decision.");
    if (bucketTiming) return bucketTiming;
    // The bucket stays the preferred ask here — it is the coarse question a
    // participant can answer from memory. It is only replaced when a profile
    // does not publish it, and then only by an anchor that profile does publish.
    const askable = publicQuestionIds(profile).has(RESOLVED_TIMING_BUCKET_FIELD_ID)
      ? [RESOLVED_TIMING_BUCKET_FIELD_ID]
      : answerableAnchorIds(profile, [anchorId]);
    if (askable.length === 0) {
      return {
        status: "needs_review",
        reason: reason(jurisdiction, "waiting_anchor_not_publicly_askable", `The waiting period runs from ${anchorId}, and this profile publishes no public question for it or for the timing bucket.`, rule.sourceRef ?? pathway.sourceRef)
      };
    }
    return {
      status: "missing_anchor",
      reason: reason(jurisdiction, "waiting_anchor_missing", "We need one more detail before we can prepare the right packet.", rule.sourceRef ?? pathway.sourceRef),
      missingQuestionIds: askable
    };
  }

  const earliest = addDuration(anchor, duration.value, duration.unit);
  if (!earliest) {
    return {
      status: "needs_review",
      reason: reason(jurisdiction, "waiting_rule_not_executed", "The source-specific waiting period needs review before a packet decision.", rule.sourceRef ?? pathway.sourceRef)
    };
  }
  if (earliest > evaluationToday()) {
    return {
      status: "not_yet",
      reason: reason(jurisdiction, "waiting_period_not_satisfied", `This may not be ready yet. The waiting period appears to run until ${earliest.toISOString().slice(0, 10)}. The court or agency makes the final decision.`, rule.sourceRef ?? pathway.sourceRef)
    };
  }
  return { status: "satisfied" };
}

function fieldsPresentOrInternal(fields: string[], publicQuestionIds: Set<string>, answers: Record<string, ScreeningAnswerValue>) {
  return fields.every((field) => {
    if (!publicQuestionIds.has(field)) return true;
    const value = answers[field];
    if (value === undefined || value === null) return false;
    if (Array.isArray(value)) return value.length > 0;
    return String(value).trim() !== "";
  });
}

function normalizeCaseOutcome(value: ScreeningAnswerValue | undefined) {
  const text = answerText(value).toLowerCase();
  if (/arrest|citation/.test(text) && /no charge/.test(text)) return "arrest_no_charge";
  if (/dismiss|nolle|no-bill|not prosecuted|quash/.test(text)) return "dismissed";
  if (/acquit|not guilty/.test(text)) return "acquitted";
  if (/diversion|deferred|program|supervision/.test(text)) return "diversion_or_deferred";
  if (/misdemeanor/.test(text)) return "convicted_misdemeanor";
  if (/felony/.test(text)) return "convicted_felony";
  if (/juvenile|minor/.test(text)) return "juvenile";
  if (/pardon/.test(text)) return "pardon";
  if (/conviction|convicted|adjudication/.test(text)) return "convicted_other";
  return text.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function caseOutcomeMatches(caseOutcomes: string[], outcome: string) {
  if (outcome.startsWith("convicted_") && caseOutcomes.includes("convicted_other")) return true;
  return caseOutcomes.length === 0 || caseOutcomes.includes(outcome);
}

function pathwayFromRule(profile: EngineProfile, rule: CompiledRule, answers: Record<string, ScreeningAnswerValue>) {
  const candidates = rule.candidatePathwayIds ?? [];
  if (candidates.length !== 1) return undefined;
  return profile.pathways.find((pathway) => pathway.id === candidates[0]
    && !pathwayExcludedByKnownFacts(profile.jurisdiction.code, answers, pathway.id)
    && convictionOutcomeCompatible(profile.jurisdiction.code, answers, pathway.id));
}

function compiledRuleRelevantToPathway(rule: CompiledRule, pathway: CompiledPathway) {
  const candidates = rule.candidatePathwayIds ?? [];
  if (candidates.includes(pathway.id)) return true;
  const ruleText = `${rule.id} ${rule.when?.sourceConditionText ?? ""} ${rule.sourceRef ?? ""}`.toLowerCase();
  const labelTokens = `${pathway.id} ${pathway.label}`.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 5);
  return labelTokens.some((token) => ruleText.includes(token));
}

function compiledRulePathwayScore(rule: CompiledRule, pathway: CompiledPathway) {
  const ruleText = `${rule.id} ${rule.when?.sourceConditionText ?? ""} ${rule.sourceRef ?? ""}`.toLowerCase();
  const labelTokens = `${pathway.id} ${pathway.label}`.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 5);
  return labelTokens.filter((token) => ruleText.includes(token)).length + (rule.candidatePathwayIds?.includes(pathway.id) ? 1 : 0);
}

function compiledRouteRuleMatchesPathway(rule: CompiledRule, pathway: CompiledPathway) {
  return rule.when?.backendPathwayId === pathway.id || rule.id === `route-${pathway.id}`;
}

function safeResultRank(value: unknown) {
  const index = SAFE_RESULT_ORDER.indexOf(value as ScreeningResultCode);
  return index === -1 ? SAFE_RESULT_ORDER.indexOf("needs_review") : index;
}

function resultCodeIsKnown(value: unknown) {
  return SAFE_RESULT_ORDER.includes(value as ScreeningResultCode);
}

function packetLikeResult(value: unknown) {
  return value === "packet_ready" || value === "packet_ready_with_caution";
}

function packetLikePathway(profile: EngineProfile, pathway: CompiledPathway) {
  return isCourtFiledPetitionRoute(profile, pathway);
}

/**
 * A route on which relief happens without the participant filing anything can
 * never be a paid packet: there is nothing to sell. This is a structural fact
 * of the pathway — routeType, filingRequired, or a verification-and-guidance
 * packet plan — and deliberately does NOT consult ratification: ratifying a
 * jurisdiction for deployment must never convert an automatic route into a
 * sellable one (lane-B report: MI rule-11 steered the automatic 92-day
 * misdemeanor set-aside toward checkout).
 */
/**
 * The same structural fact, where the route's own authority makes it depend on
 * the participant's case rather than on the route.
 *
 * `routeIsAutomaticOrNoFiling` asks whether a ROUTE has a participant filing.
 * Nevada's NRS 176A.245 / .265 / .295 track has one on one branch and none on
 * the other, from the identical sections, so the question can only be answered
 * once the branch is known. On the automatic branch the answer is the same as
 * for a structurally automatic route — nothing is filed, so nothing may be sold
 * — and the participant gets the same guidance treatment.
 *
 * `unresolved` is deliberately NOT automatic here. It is handled by its own gate
 * before this one runs, because calling it automatic would hide a real petition
 * from a participant who has one.
 */
function routeBranchIsAutomaticOrNoFiling(
  profile: EngineProfile,
  answers: Record<string, ScreeningAnswerValue>,
  pathway: CompiledPathway
): boolean {
  if (routeKey(profile, pathway) !== NEVADA_176A_ROUTE_KEY) return false;
  return nevada176ABranch(answers) === "subsection_1_automatic";
}

/**
 * A route whose mechanism depends on a branch the participant's answers have not
 * established yet.
 *
 * Fail closed, and say which questions decide it. Neither guess is acceptable:
 * assuming the automatic branch withholds a petition the participant is entitled
 * to file, and assuming the petition branch offers a packet to someone whose
 * relief happens on its own and costs nothing.
 */
function unresolvedRouteBranchReason(
  profile: EngineProfile,
  answers: Record<string, ScreeningAnswerValue>,
  pathway: CompiledPathway
): { reason: ScreeningReason; missingQuestionIds: string[] } | undefined {
  if (routeKey(profile, pathway) !== NEVADA_176A_ROUTE_KEY) return undefined;
  if (nevada176ABranch(answers) !== "unresolved") return undefined;
  return {
    reason: reason(profile.jurisdiction.code, "nv_176a_branch_not_established", NEVADA_176A_UNRESOLVED_BRANCH_TEXT, pathway.sourceRef),
    missingQuestionIds: [...NEVADA_176A_BRANCH_FACT_IDS]
  };
}

function routeIsAutomaticOrNoFiling(profile: EngineProfile, pathway: CompiledPathway): boolean {
  const contract = legalRouteContract(profile.jurisdiction.code, pathway.id);
  if (contract) return legalRouteIsAutomaticOrNoFiling(contract);
  const routeType = (pathway as { routeType?: string }).routeType;
  if (routeType === "automatic") return true;
  if ((pathway as { filingRequired?: boolean }).filingRequired === false) return true;
  const plan = packetPlanForPathway(profile, pathway.id);
  return plan?.mode === "automatic_relief_verification_and_guidance";
}

/**
 * Routes whose contract-declared kind has been adjudicated and applied.
 *
 * A row that is merely present changes nothing; only `status: "applied"` does.
 * The distinction is the point: the file records every disagreement so none is
 * lost, and a decision is a separate act from noticing one is needed.
 */
const ADJUDICATED_CONTRACT_ROUTE_KINDS: ReadonlySet<string> = new Set(
  (routeKindAdjudications as { rows: { routeKey: string; status: string }[] }).rows
    .filter((row) => row.status === "applied")
    .map((row) => row.routeKey)
);

/**
 * A contract that declares a participant packet and names the family it
 * produces. The declaration alone; whether it governs is a separate question
 * answered by the adjudication ledger.
 */
export function contractDeclaresParticipantPacket(jurisdiction: string, pathwayId: string) {
  const contract = legalRouteContract(jurisdiction, pathwayId);
  return contract?.outcomeMode === "participant_packet"
    && typeof contract.packetFamily === "string"
    && contract.packetFamily.trim().length > 0;
}

/**
 * @param options.ignoreContractDeclaration run the pre-contract heuristics only.
 *   The route-kind audit needs both verdicts to find where they disagree; it is
 *   not a runtime switch and no evaluation path passes it.
 */
export function isCourtFiledPetitionRoute(
  profile: EngineProfile,
  pathway: CompiledPathway,
  options?: { ignoreContractDeclaration?: boolean }
) {
  const code = profile.jurisdiction.code;
  if (texasNondisclosureTimingContract(profile, pathway.id)) return pathway.id !== TX_ND_ROUTES[0];
  const text = `${pathway.id} ${pathway.label} ${pathway.summary}`.toLowerCase();
  const plan = packetPlanForPathway(profile, pathway.id);
  // Structural veto before any ratification shortcut: an automatic/no-filing
  // route is not a court-filed petition, whatever else is true of its state.
  if (routeIsAutomaticOrNoFiling(profile, pathway)) return false;

  // Alaska: the ONLY user-filed court route is the TF-810 CourtView exclusion request (AS 22.35.030 /
  // Admin. R. 40), filed at the local trial court. Every other Alaska route (mistaken-identity DPS
  // sealing, SIS set-aside, juvenile, pardon) stays non-court / guidance-only.
  if (code === "AK") return pathway.id === "confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40";
  // Hawaii HCJDC routes are administrative applications, not court petitions. They are paid via
  // routeIsAdministrativeApplicationPacket, and must never be described as court filings.
  if (routeIsAdministrativeApplicationPacket(profile, pathway)) return false;

  // The controlling legal contract is the authority on what a route is. Where
  // one declares a participant packet and names the packet family, that is a
  // participant-filed route, whatever its prose reads like.
  //
  // Everything below this line is a per-jurisdiction list or a keyword test
  // over the pathway's own label and summary. Those exist for routes that carry
  // no contract; they are not a second opinion on routes that do. Georgia's
  // § 42-8-66 petition is why this is here: the keyword test read "retroactive
  // First Offender treatment, exoneration and discharge", found no filing word,
  // and returned a participant petition as "guidance-only because it is
  // automatic, board/portal-based, prosecutor/agency-only, or otherwise not a
  // user-filed court petition" — four things it is not.
  //
  // This decides what the route IS, never whether it may sell. Payment stays
  // the AND of this and the canonical resolver's own authority, and the
  // resolver holds § 42-8-66 closed on its consent precondition either way.
  // Applied only where the disagreement has been adjudicated. Twenty-five routes
  // across sixteen jurisdictions carry a contract that declares a participant
  // packet while these heuristics call them non-court, and four of them would
  // move straight to a ready-packet presentation. Flipping all of them inside a
  // Georgia correction would be the flattening this workstream exists to
  // prevent, so each is recorded in data/rcap-ledger/route-kind-adjudications.json
  // with both verdicts and the result code the change would produce, and only an
  // adjudicated row takes effect. The audit fails if a disagreement appears with
  // no row, so the pending list cannot grow silently.
  if (options?.ignoreContractDeclaration !== true && contractDeclaresParticipantPacket(code, pathway.id)
    && ADJUDICATED_CONTRACT_ROUTE_KINDS.has(`${code}:${pathway.id}`)) return true;

  if (code === "CT" && pathway.id === "absolute-pardon-resulting-in-erasure") return false;
  if (code === "CT" && pathway.id === "petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202") return true;
  if (code === "DC") return pathway.id === "dc_actual_innocence_expungement_16_803"
    || pathway.id === "dc_motion_seal_nonconviction_16_806"
    || pathway.id === "dc_motion_seal_misdemeanor_conviction_5yr_16_806"
    || pathway.id === "dc_motion_seal_felony_conviction_8yr_16_806";
  if (code === "GA" && pathway.id === "non-conviction-record-restriction-through-the-agency-prosecutor-process") return false;
  if (code === "GA" && pathway.id === "automatic-restriction-of-qualifying-post-july-1-2013-non-convictions") return false;
  if (code === "GA" && (
    pathway.id === "sb-288-misdemeanor-conviction-restriction-and-sealing"
    || pathway.id === "restriction-and-sealing-of-a-pardoned-felony"
    || pathway.id === "youthful-first-offender-restriction-route"
  )) return true;
  if (code === "NY" && (pathway.id === "conditional-treatment-sealing-under-cpl-160-58" || pathway.id === "discretionary-conviction-sealing-by-petition-under-cpl-160-59")) return true;
  if (code === "CA" && (pathway.id === "tool-1-dismissal-set-aside" || pathway.id === "tool-3-petition-based-felony-sealing" || pathway.id === "tool-4-arrest-record-sealing")) return true;
  if (code === "IL" && pathway.id !== "clean-slate-automatic-sealing") return true;
  if (code === "MD" && (
    pathway.id === "adult-non-conviction-expungement-under-crim-proc-10-105"
    || pathway.id === "eligible-conviction-expungement-under-crim-proc-10-110"
    || pathway.id === "cannabis-specific-expungement"
    || pathway.id === "second-chance-act-shielding"
    || pathway.id === "juvenile-expungement"
  )) return true;
  if (code === "WI" && pathway.id === "adult-conviction-expungement-under-wis-stat-973-015") return true;
  if (routeIsRatifiedDeployable(profile, pathway)) return true;
  // Corrected-but-awaiting-reconfirm routes are user-filed court petitions/motions that we have
  // classified as such during the build; treat them as court-filed so they reach the reconfirm
  // hold instead of dropping to the generic non-court guidance branch. Payment is still clamped by
  // the routeIsRatifiedDeployable gate in the payment calculation.
  if (routeIsCorrectedAwaitingReconfirm(profile, pathway)) return true;

  if (/automatic|no filing|without any petition|without a petition|by operation of law|clean slate automatic/.test(text)) return false;
  if (/board of pardons|epardon|pardon portal|executive clemency|governor.?s pardon|executive-pardon|pardon guidance/.test(text)) return false;
  if (/agency\/prosecutor|prosecutor-agreed|prosecutor process|agency-only|prosecutor-only/.test(text)) return false;
  if (/department of|state police|dps|doj|cbi|cib|fingerprint|criminal-history|criminal history|data destruction|record correction|record removal|record deletion|administrative sealing/.test(text) && !/petition|motion|court/.test(text)) return false;
  if (plan?.mode === "official_form_overlay_or_source_form_set") return true;

  return /petition|motion|pleading|apply to .*court|file .*court|filed .*court|sentencing court|convicting court|circuit court|district court|superior court|municipal court|trial court|court form|forms? [a-z0-9-]*\d/i.test(text);
}

function bestWaitingRuleForPathway(profile: EngineProfile, pathway: CompiledPathway, answers: Record<string, ScreeningAnswerValue>): SelectedWaitingRule | undefined {
  const texts = `${pathway.id} ${pathway.label} ${pathway.summary}`.toLowerCase();
  const offenseLevel = answerText(answers.offense_level).toLowerCase();
  const charge = answerText(answers.charge).toLowerCase();
  const caseOutcome = normalizeCaseOutcome(answers.case_outcome);
  const requestedWaitId = answerText(answers.waiting_rule_id).trim();
  const routeTokens = texts.split(/[^a-z0-9]+/).filter((token) => token.length > 5);
  const candidates = [
    ...compiledWaitingRules(profile),
    ...pathwayWaitingRules(pathway).map((ruleText, index) => ({ id: `pathway-wait-${index}`, ruleText, duration: parseDurationFromText(ruleText), fieldsReferenced: [], anchor: undefined }))
  ]
    .map((rule) => ({
      id: rule.id,
      duration: normalizeDuration(rule.duration) ?? parseDurationFromText(rule.ruleText ?? ""),
      text: String(rule.ruleText ?? ""),
      anchor: typeof rule.anchor === "string" ? rule.anchor : undefined,
      routeScore: routeTokens.filter((token) => String(rule.ruleText ?? "").toLowerCase().includes(token)).length,
      fieldsReferenced: rule.fieldsReferenced ?? []
    }))
    .filter((rule) => rule.duration)
    .filter((rule) => waitingTextRelevant(rule.text, texts, offenseLevel, charge, caseOutcome));
  if (candidates.length === 0) return undefined;
  const explicit = requestedWaitId
    ? candidates.find((candidate) => candidate.id === requestedWaitId)
    : undefined;
  if (explicit?.duration) {
    return {
      id: explicit.id,
      text: explicit.text,
      anchor: explicit.anchor,
      duration: explicit.duration,
      routeScore: explicit.routeScore
    };
  }
  const atomicCandidates = candidates.filter((candidate) => !textHasMultipleDurations(candidate.text));
  const scoredCandidates = atomicCandidates.length > 0 ? atomicCandidates : candidates;
  const classSpecific = caseOutcome === "arrest_no_charge"
    ? scoredCandidates.find((candidate) => waitingClassMatches(candidate.text, offenseLevel, charge))
    : undefined;
  if (classSpecific?.duration) {
    return {
      id: classSpecific.id,
      text: classSpecific.text,
      anchor: classSpecific.anchor,
      duration: classSpecific.duration,
      routeScore: classSpecific.routeScore
    };
  }
  const distinctDurations = new Set(scoredCandidates
    .map((candidate) => candidate.duration)
    .filter((duration): duration is CompiledDuration => duration !== undefined && duration.value > 0)
    .map((duration) => `${duration.value}:${duration.unit}`));
  if (distinctDurations.size > 1) {
    return {
      text: "Multiple source waiting-period rows could apply.",
      duration: { value: -1, unit: "ambiguous" },
      routeScore: 0
    };
  }
  scoredCandidates.sort((left, right) => durationDays(right.duration) - durationDays(left.duration) || right.routeScore - left.routeScore);
  const selected = scoredCandidates[0];
  if (!selected?.duration) return undefined;
  return {
    id: selected.id,
    text: selected.text,
    anchor: selected.anchor,
    duration: selected.duration,
    routeScore: selected.routeScore
  };
}

function waitingTextRelevant(text: string, pathwayText: string, offenseLevel: string, charge: string, caseOutcome: string) {
  const normalized = text.toLowerCase();
  const tokens = pathwayText.split(/[^a-z0-9]+/).filter((token) => token.length > 5);
  if (tokens.some((token) => normalized.includes(token))) return true;
  if (caseOutcome === "arrest_no_charge" && /arrest|no charge|no charges|charge filed/.test(normalized)) {
    if (/class a|class b/.test(charge)) return /class a|class b|arrest-only|arrest only|offense level/.test(normalized);
    if (/class c/.test(charge)) return /class c|arrest-only|arrest only|offense level/.test(normalized);
    if (/felony/.test(charge) || offenseLevel.includes("felony")) return /felony|arrest-only|arrest only|offense level/.test(normalized);
    return /arrest-only|arrest only|offense level|no charges/.test(normalized);
  }
  if (caseOutcome === "dismissed" && /dismiss|nolle|non-conviction|nonconviction/.test(normalized)) return true;
  if (caseOutcome === "acquitted" && /acquit|not guilty/.test(normalized)) return true;
  if (caseOutcome.includes("convicted") && /conviction|convicted|misdemeanor|felony/.test(normalized)) {
    if (offenseLevel.includes("felony")) return /felony|conviction|convicted/.test(normalized);
    if (offenseLevel.includes("misdemeanor")) return /misdemeanor|conviction|convicted/.test(normalized);
    return true;
  }
  return false;
}

function waitingClassMatches(text: string, offenseLevel: string, charge: string) {
  const normalized = text.toLowerCase();
  if (/class a|class b/.test(charge)) return /class a|class b/.test(normalized);
  if (/class c/.test(charge)) return /class c/.test(normalized);
  if (/felony/.test(charge) || offenseLevel.includes("felony")) return /felony/.test(normalized);
  return false;
}

function parseDurationFromText(text: string) {
  const lower = text.toLowerCase();
  const numeric = lower.match(/\b(\d+)\s*(day|days|month|months|year|years|yr|yrs)\b/);
  if (numeric) return { value: Number(numeric[1]), unit: normalizeDurationUnit(numeric[2]), raw: numeric[0] };
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const word = lower.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s*(day|days|month|months|year|years)\b/);
  if (word) return { value: words[word[1]], unit: normalizeDurationUnit(word[2]), raw: word[0] };
  if (/immediate|no waiting period|upon event/.test(lower)) return { value: 0, unit: "days", raw: "immediate/upon event" };
  return undefined;
}

function textHasMultipleDurations(text: string) {
  return (text.toLowerCase().match(/\b(\d+)\s*(day|days|month|months|year|years|yr|yrs)\b/g) ?? []).length > 1;
}

function compiledRuleDuration(rule: CompiledRule) {
  return (rule.when as { duration?: unknown } | undefined)?.duration;
}

function pathwayWaitingRules(pathway: CompiledPathway) {
  const rules = (pathway as { waitingRules?: unknown }).waitingRules;
  return Array.isArray(rules) ? rules.map(String) : [];
}

function compiledWaitingRules(profile: EngineProfile) {
  const rules = profile.waitingPeriodRules;
  return Array.isArray(rules)
    ? rules as Array<{ id?: string; duration?: unknown; ruleText?: string; anchor?: string | null; fieldsReferenced?: string[] }>
    : [];
}

function normalizeDuration(value: unknown): CompiledDuration | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as { value?: unknown; unit?: unknown; raw?: unknown };
  if (typeof candidate.value !== "number" || typeof candidate.unit !== "string") return undefined;
  return {
    value: candidate.value,
    unit: normalizeDurationUnit(candidate.unit),
    ...(typeof candidate.raw === "string" ? { raw: candidate.raw } : {})
  };
}

function normalizeDurationUnit(unit: string) {
  if (unit.startsWith("day")) return "days";
  if (unit.startsWith("month")) return "months";
  if (unit.startsWith("ambiguous")) return "ambiguous";
  return "years";
}

function durationDays(duration: CompiledDuration | undefined) {
  if (!duration) return Number.MAX_SAFE_INTEGER;
  if (duration.unit === "days") return duration.value;
  if (duration.unit === "months") return duration.value * 31;
  if (duration.unit === "ambiguous") return Number.MAX_SAFE_INTEGER;
  return duration.value * 366;
}

function chooseTimingAnchor(rule: CompiledRule, pathway: CompiledPathway, answers: Record<string, ScreeningAnswerValue>, waitingRule?: SelectedWaitingRule, jurisdiction?: string) {
  // The adopted TX memo anchors nondisclosure to discharge/dismissal or
  // sentence/supervision completion. The legacy compiled summaries interleave
  // Chapter 55A arrest-based expunction prose. Neither that prose nor a saved
  // arrest answer may turn arrest into a nondisclosure clock. This removes only
  // the invalid fallback; it does not establish a subtype, duration or completion.
  const excludesArrest = jurisdiction === "TX" && [
    "automatic-nondisclosure-for-qualifying-nonviolent-misdemeanor-deferred-adjudication-411-07",
    "petitioned-nondisclosure-after-completed-deferred-adjudication-411-0725",
    "petitioned-nondisclosure-for-an-eligible-conviction-411-0735",
    "first-offense-dwi-nondisclosure"
  ].includes(pathway.id);
  const permittedAnchor = (field: string) => !excludesArrest || field !== "arrest_date";
  const configured = [rule.when?.timingAnchorFactId, ...(rule.when?.timingAnchorAlternateFactIds ?? [])]
    .filter((field): field is string => typeof field === "string" && field.length > 0)
    .filter(permittedAnchor)
    .filter((field) => answerText(answers[field]).trim() !== "");
  if (configured.length > 0) {
    const dated = configured
      .map((field) => ({ field, date: parseDateAnswer(answers[field]) }))
      .filter((candidate): candidate is { field: string; date: Date } => Boolean(candidate.date));
    if (dated.length > 0) {
      return dated.reduce((latest, candidate) => candidate.date.getTime() > latest.date.getTime() ? candidate : latest).field;
    }
    return configured[0];
  }
  const text = `${waitingRule?.text ?? ""} ${waitingRule?.anchor ?? ""} ${rule.when?.sourceConditionText ?? ""} ${pathway.summary ?? ""}`.toLowerCase();
  const fields = rule.when?.fieldsReferenced ?? [];
  const preferred = [
    ...(text.includes("arrest") ? ["arrest_date"] : []),
    ...(text.includes("last conviction") || text.includes("most recent conviction") ? ["last_conviction_date", "conviction_date", "disposition_date"] : []),
    ...(text.includes("conviction") || text.includes("convicted") ? ["conviction_date", "last_conviction_date", "disposition_date"] : []),
    ...(text.includes("release") ? ["release_date", "sentence_completion_actual_date", "disposition_date"] : []),
    ...(text.includes("probation") || text.includes("parole") || text.includes("supervision") ? ["probation_parole_supervision_end_date", "sentence_completion_actual_date", "discharge_date", "disposition_date"] : []),
    ...(text.includes("sentenc") ? ["sentencing_date", "sentence_completion_actual_date", "disposition_date"] : []),
    ...(text.includes("completion") || text.includes("satisfied") || text.includes("discharge") ? ["sentence_completion_actual_date", "discharge_date", "disposition_date"] : []),
    ...fields.filter((field) => field.endsWith("_date")),
    "disposition_date",
    "arrest_date",
    "sentence_completion_actual_date",
    "release_date",
    "sentencing_date",
    "discharge_date",
    "last_conviction_date",
    "conviction_date",
    "probation_parole_supervision_end_date"
  ];
  return preferred.find((field) => permittedAnchor(field) && answerText(answers[field]).trim() !== "");
}

function parseDateAnswer(value: ScreeningAnswerValue | undefined) {
  const text = answerText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return undefined;
  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Today, for every waiting-period calculation the evaluator makes.
 *
 * RCAP_EVALUATOR_TODAY pins this so the 284-pathway witness replay is
 * deterministic. That pin is a TEST instrument and is refused in production.
 *
 * It was previously honoured unconditionally. Nothing set it in production, so
 * nothing had gone wrong — but the failure it allows is silent and severe: an
 * environment that carried the variable, by inheritance or by a copied
 * deployment config, would compute every waiting period against a frozen date.
 * Eligibility would be decided against a day that is not today, and the result
 * would look entirely normal, because a wrong date produces a confident answer
 * rather than an error. A participant would be told they must keep waiting, or
 * told they may file when they may not.
 *
 * A determinism pin for a test suite must not be able to decide a real person's
 * eligibility, so in production the authoritative clock is the only source.
 */
/**
 * Whether this process is running somewhere a real person's eligibility is decided.
 *
 * Deliberately generous about what counts. The first version of this guard tested
 * `NODE_ENV === "production"` exactly, which meant `Production`, `PRODUCTION` and
 * `prod` all sailed past it and honoured the date pin. A guard against a
 * catastrophic-but-silent failure must not turn on the spelling of an
 * environment variable, so anything beginning with "prod" in any case counts,
 * and Vercel's own VERCEL_ENV is consulted too because a deployment can set that
 * without NODE_ENV agreeing.
 *
 * Unset NODE_ENV deliberately does NOT count. Every verifier and generator in
 * this repository runs with it unset, and the 284-pathway replay depends on the
 * pin working there; refusing on unset would break the determinism this pin
 * exists to provide while protecting nothing real, because the worker image and
 * the Next.js production build both set NODE_ENV=production explicitly.
 */
function looksLikeProduction() {
  const nodeEnv = String(process.env.NODE_ENV ?? "").trim().toLowerCase();
  const vercelEnv = String(process.env.VERCEL_ENV ?? "").trim().toLowerCase();
  return nodeEnv.startsWith("prod") || vercelEnv.startsWith("prod");
}

const historicalEvaluationClock = new AsyncLocalStorage<number>();

/** Server-owned snapshot compatibility proof only. The current eligibility
 * result is always evaluated outside this scope. Never accepts a request clock,
 * never changes process.env, and cannot leak a date into another owner's read. */
export function compareAtProtectedSnapshotTime<T>(timestamp: unknown, compare: () => T): T | null {
  if (typeof timestamp !== "string") return null;
  const saved = new Date(timestamp);
  if (!Number.isFinite(saved.getTime()) || saved.toISOString().replace(".000Z", "Z") !== timestamp.replace(".000Z", "Z") || saved.getTime() > evaluationToday().getTime()) return null;
  return historicalEvaluationClock.run(saved.getTime(), compare);
}

function evaluationToday() {
  const pinned = process.env.RCAP_EVALUATOR_TODAY;
  if (pinned && looksLikeProduction()) {
    throw new Error(
      "RCAP_EVALUATOR_TODAY is set in a production environment. It pins the evaluator's idea of today for deterministic tests, and honouring it here would decide waiting periods against a frozen date. Unset it; production uses the authoritative clock."
    );
  }
  return new Date(historicalEvaluationClock.getStore() ?? (pinned ? `${pinned}T00:00:00.000Z` : Date.now()));
}

function addDuration(date: Date, value: number, unit: string) {
  const next = new Date(date.getTime());
  if (unit === "days") {
    next.setUTCDate(next.getUTCDate() + value);
    return next;
  }
  if (unit === "months") {
    next.setUTCMonth(next.getUTCMonth() + value);
    return next;
  }
  if (unit === "years") {
    next.setUTCFullYear(next.getUTCFullYear() + value);
    return next;
  }
  return undefined;
}
