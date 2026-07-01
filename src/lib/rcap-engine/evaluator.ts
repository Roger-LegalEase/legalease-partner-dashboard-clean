import "server-only";

import crypto from "node:crypto";
import { answerText, isAffirmative, isExplicitUnknownAnswer, isNegative, requiredMissingPublicQuestionIds, validatePublicAnswerQuestionIds } from "@/lib/rcap-engine/answer-normalization";
import type { EngineProfile, PublicJurisdictionProfile, ScreeningAnswerValue, ScreeningEvaluation, ScreeningEvaluationRequest, ScreeningReason, ScreeningResultCode } from "@/lib/rcap-engine/contracts";
import { assertProfileVersion, getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import { isPacketPlanFulfillmentReady, packetPlanForPathway } from "@/lib/rcap-engine/packet-planner";
import { projectPublicProfile } from "@/lib/rcap-engine/public-profile-projection";

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

const RATIFIED_DEPLOYABLE_ROUTES = new Set([
  "AR:situation-a-non-convictions",
  "AR:situation-b-misdemeanor-convictions",
  "AR:situation-c-felony-convictions",
  "CA:tool-1-dismissal-set-aside",
  "CA:tool-3-petition-based-felony-sealing",
  "CA:tool-4-arrest-record-sealing",
  "CT:petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202",
  "IL:adult-non-conviction-expungement",
  "IL:expungement-after-eligible-supervision-or-qualified-probation",
  "IL:adult-conviction-sealing",
  "IL:cannabis-specific-automatic-or-petition-expungement",
  "IL:criminal-identity-theft-mistaken-identity-relief",
  "IL:juvenile-automatic-or-petition-expungement",
  "KS:specialty-court-accelerated",
  "MD:adult-non-conviction-expungement-under-crim-proc-10-105",
  "ND:general-conviction-sealing-under-n-d-c-c-chapter-12-60-1",
  "ND:first-offense-possession-sealing",
  "ND:marijuana-specific-summary-pardon-or-sealing-relief",
  "NJ:marijuana-hashish-expungement-under-n-j-s-a-2c-52-5-1-5-2-and-6-1",
  "NJ:arrest-dismissal-and-other-non-conviction-expungement-under-n-j-s-a-2c-52-6",
  "NM:no-conviction-released-without-conviction",
  "NM:cannabis-sentence-dismissal-incarcerated-person-pathway",
  "OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c",
  "IA:nonconviction-901c2",
  "KY:misdemeanor-violation-traffic-conviction",
  "MN:petition-based-expungement-under-609a-02-03",
  "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal",
  "MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59",
  "MS:first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1",
  "MS:additional-justice-or-municipal-court-misdemeanor-relief",
  "MS:eligible-felony-conviction-expungement-99-19-71",
  "MS:nonadjudication-under-99-15-26",
  "MS:pretrial-intervention-or-diversion-expungement",
  "MS:first-offense-controlled-substance-conditional-discharge-relief",
  "MS:intervention-court-completion-expungement",
  "MS:first-offense-dui-expungement",
  "MS:dui-nonadjudication",
  "MS:minor-in-possession-underage-alcohol-expungement",
  "MS:human-trafficking-survivor-vacatur-and-expungement",
  "MT:misdemeanor-conviction-expungement-under-mont-code-46-18-1104",
  "MT:deferred-sentence-dismissal-or-confidentiality-route",
  "MT:marijuana-related-redesignation-expungement-under-mmrta",
  "CO:petition-based-non-conviction-sealing-jdf-417-24-72-704",
  "DC:dc_actual_innocence_expungement_16_803",
  "DC:dc_motion_seal_nonconviction_16_806",
  "DC:dc_motion_seal_misdemeanor_conviction_5yr_16_806",
  "DC:dc_motion_seal_felony_conviction_8yr_16_806",
  "GA:sb-288-misdemeanor-conviction-restriction-and-sealing",
  "WI:adult-conviction-expungement-under-wis-stat-973-015",
  // ---- Lawrence ratification: 2026-07-01 ----
  // Basis: Lawrence reviewed and confirmed the corrected wait / anchor / gate for each held petition
  // route in docs/RCAP_HELD_ROUTE_RATIFICATION_WORKSHEET.md as legally correct, including VA OES
  // form-readiness. Promoted from CORRECTED_AWAITING_RECONFIRM to deployable; the $50 clamp now opens
  // for qualifying cases (still gated by state_exclusion_categories where present and by the
  // source-listed special_preconditions_confirmed gate everywhere, per the engine's ratified model).
  // MO — RSMo ch. 610: 610.140 (felony 3yr / misd 1yr), 610.130 (10yr), 610.145 (event)
  "MO:general-arrest-charge-plea-trial-or-conviction-expungement-under-rsmo-610-140",
  "MO:first-intoxication-related-traffic-or-boating-expungement-under-610-130",
  "MO:stolen-or-mistaken-identity-expungement-under-610-145",
  // LA — La. C.Cr.P. arts. 894/893/977/978/998: 894(B)/893(E) set-aside (event) split from the
  // 5yr (misd) / 10yr (felony) clean-period routes; 998 marijuana 90-day
  "LA:non-conviction-arrest-expungement",
  "LA:misdemeanor-article-894-b-set-aside-followed-by-expungement",
  "LA:misdemeanor-five-year-clean-period-expungement",
  "LA:first-offense-marijuana-expungement-after-90-days-art-998",
  "LA:felony-article-893-e-set-aside-followed-by-expungement",
  "LA:felony-ten-year-clean-period-expungement",
  // NE — Neb. Rev. Stat. § 29-2264 conviction SET-ASIDE (record stays visible), runs from completion
  "NE:set-aside-probation-fine-community-service",
  "NE:set-aside-incarceration-one-year-or-less",
  // VA — § 19.2-392.2 non-conviction expungement (event) + § 19.2-392.12 petition sealing (misd 7yr / felony 10yr)
  "VA:regime-1-expungement-available-now",
  "VA:petition-based-sealing",
  // ME — 15 M.R.S. §§ 2261–2264 CR-218 adult conviction sealing (Class E), 4yr
  "ME:adult-conviction-sealing",
  // IL — 20 ILCS 2630/5.2(j) felony-prostitution relief (event; Class 4 felony hard gate)
  "IL:felony-prostitution-relief",
  // ID — Idaho Code § 19-2604(1) withheld-judgment set-aside (event; caution-tier)
  "ID:withheld-judgment-idaho-code-19-2604-review-branch",
  // ---- Lawrence ratification 2026-07-01 (gate-coded hard-gate routes) ----
  // These two families already have coded, tested substantive gates (caRouteSafetyGate,
  // nyCpl16059SafetyGate). Lawrence confirmed them; promoted from HARD_GATE_PENDING to deployable.
  // NY CPL 160.59 — 10yr wait, ≤2 convictions / ≤1 felony, offense-exclusion + pending + prior-sealing gate
  "NY:discretionary-conviction-sealing-by-petition-under-cpl-160-59",
  // CA HSC § 11361.8 Prop 64 — qualifying-marijuana + lesser/no-offense + branch gate
  "CA:prop-64-currently-serving-petition-11361-8",
  "CA:prop-64-completed-sentence-application-11361-8",
  // ---- Hawaii administrative application packet (legal signoff 2026-07-01) ----
  // NOT court petitions. These are the HCJDC 159(b) application to the Hawaii Criminal Justice Data
  // Center (Dept. of the Attorney General) under HRS § 831-3.2 (non-conviction) and §§ 706-622.5/.8/.9,
  // 291E-64(e) (conviction). Payment opens via isLegallyApprovedAdministrativeApplicationRoute, gated
  // by hiAdminApplicationSafetyGate. The conviction tracks require a confirmed Court Order Granting
  // Expungement to attach; without it they fail closed. See docs/expungement-ai/HAWAII_ADMIN_APPLICATION_PACKET.md.
  "HI:nonconviction-arrest-expungement",
  "HI:first-time-drug-conviction",
  "HI:dui-under-21-conviction",
  // ---- Target 51 Batch 1 — legal reconfirmation (signoff 2026-07-01) ----
  // CORRECTED_AWAITING_RECONFIRM routes that were built with corrected route-specific wait/anchor/gate
  // logic and were held only for legal reconfirmation. Legal signed off 2026-07-01; only those PROVEN
  // both-direction (open when qualifying, block when disqualified) by verify-rcap-no-generic-fallbacks
  // + all51-provability are promoted. The remaining held routes stayed in CORRECTED because a
  // qualifying case did not open payment (missing intake fact / anchor) — they need more than a
  // reconfirmation and were NOT promoted.
  "IN:conviction-expungement-with-sealed-confidential-access",
  "ND:deferred-imposition-dismissal-and-sealing",
  "NY:conditional-treatment-sealing-under-cpl-160-58",
  "TN:pathway-1-free-non-conviction-expunction-under-tenn-code-40-32-101-a-40-32-106",
  // ---- Target 51 Batch 1 — ready-pending-ratification first-paid routes (signoff 2026-07-01) ----
  // Untiered routes that already reach packet_ready deterministically (compiled source-rule match +
  // route-specific source waiting rule + exclusion gates); held from payment only by non-ratification.
  // FL: § 943.0585 court-ordered expunction (non-conviction). SD: § 23A-3-27 adult arrest-record
  // expungement (non-conviction).
  "FL:court-ordered-expunction-943-0585",
  "SD:adult-arrest-record-expungement-under-sdcl-23a-3-27",
  // ---- Target 51 Batch 2 — route-metadata first-paid routes (signoff 2026-07-01) ----
  // Real user-filed court routes the text heuristic did not recognize; ratifying gives them explicit
  // court-route recognition (isCourtFiledPetitionRoute returns true for ratified routes). Each is
  // proven both-direction by verify-rcap-no-generic-fallbacks + all51-provability; any that did not
  // open payment when qualifying was reverted and held (see LEGAL_ACTION_REQUIRED.md). AK is excluded
  // (jurisdiction hard-coded non-court); MA/PA excluded (held-guidance / legacy-preserved).
  "AL:eligible-conviction-expungement-under-the-redeemer-act",
  "AZ:remedy-1-record-sealing",
  // DE:discretionary-court-expungement-under-11-del-c-4374 held: a qualifying case did not open
  // payment in both-direction proof (needs an intake fact/anchor beyond metadata). See LEGAL_ACTION_REQUIRED.md.
  "MI:misdemeanor-marijuana-set-aside-under-mcl-780-621e",
  "NC:dismissal-and-not-guilty-expunction-under-g-s-15a-146",
  "NH:annulment-after-dismissal-acquittal-or-nonprosecution",
  // NV:controlled-substance-possession-sealing-under-nrs-453-3365 held: compiled summary/id mismatch
  // (summary is trafficking-victim NRS 179.247, not the § 453.3365 drug route) and an ambiguous
  // multi-wait that fails closed. Needs a clean NV route selection + source fix. See LEGAL_ACTION_REQUIRED.md.
  "OH:adult-non-conviction-sealing-or-expungement-under-2953-33",
  "OK:acquittal-dismissal-or-other-no-conviction-expungement",
  "RI:path-f-marijuana-possession-expungement",
  "SC:diversion-or-program-completion-expungement",
  "TX:expunction-after-acquittal-not-guilty-disposition-chapter-55a",
  "UT:path-i-traffic-offense-expungement-or-deletion",
  "VT:dui-sealing",
  "WA:non-conviction-record-deletion-under-rcw-10-97-060",
  "WV:accelerated-treatment-recovery-job-readiness-expungement-under-61-11-26a",
  "WY:felony-conviction-expungement-w-s-7-13-1502"
]);

// Legally signed-off administrative-application packet routes. These are the ONLY non-court-petition
// routes permitted to open payment (Hawaii HCJDC 159(b) application). Every other automatic / admin /
// board / pardon / prosecutor / no-filing route stays guidance-only. Adding a route here requires the
// same legal signoff and both-direction verifier proof as a court-petition route.
const ADMINISTRATIVE_APPLICATION_PACKET_ROUTES = new Set([
  "HI:nonconviction-arrest-expungement",
  "HI:first-time-drug-conviction",
  "HI:dui-under-21-conviction"
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
const CORRECTED_AWAITING_RECONFIRM_ROUTES = new Set([
  "IN:non-conviction-arrest-or-criminal-charge-expungement",
  "IN:juvenile-allegation-expungement",
  "ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05",
  "WY:adult-non-conviction-expungement-w-s-7-13-1401"
]);

// Ratified routes whose compiled source rule is conservatively `needs_review` but which Lawrence
// ratified (2026-07-01) as caution-tier packet routes (e.g. discretionary court set-asides). The
// review short-circuit is skipped for these so the caution packet + payment can open; they still
// pass every timing, precondition, exclusion, and pending-charge gate first.
const RATIFIED_CAUTION_OVERRIDE_ROUTES = new Set([
  "ID:withheld-judgment-idaho-code-19-2604-review-branch"
]);

const HARD_GATE_PENDING_ROUTES = new Set([
  "MD:eligible-conviction-expungement-under-crim-proc-10-110",
  "MD:cannabis-specific-expungement",
  "MD:second-chance-act-shielding",
  "NJ:regular-expungement-under-n-j-s-a-2c-52-2-2c-52-3",
  "OR:set-aside-of-eligible-convictions-under-ors-137-225-1-a",
  "TN:pathway-3-eligible-conviction-expunction-under-40-32-101-g-40-32-107",
  "TN:pathway-4-two-offense-expunction-under-40-32-101-k",
  "KS:conviction-or-diversion-216614",
  "KY:felony-conviction-431073",
  "MI:set-aside-by-application-under-mcl-780-621",
  "NC:nonviolent-conviction-expunction-under-g-s-15a-145-5",
  "NH:conviction-annulment-under-rsa-651-5",
  "NV:general-conviction-record-sealing-under-nrs-179-245",
  "OH:adult-conviction-sealing-or-expungement-under-ohio-rev-code-2953-32",
  "OK:other-eligible-misdemeanor-conviction-expungement",
  "OK:one-eligible-nonviolent-felony-conviction-expungement",
  "OK:not-more-than-two-eligible-felony-convictions-expungement",
  "RI:path-a-first-offender-conviction-expungement",
  "RI:path-b-multiple-misdemeanor-expungement",
  "SC:eligible-conviction-expungement",
  "SD:suspended-imposition-of-sentence-sealing",
  "TX:petitioned-nondisclosure-after-completed-deferred-adjudication-411-0725",
  "TX:petitioned-nondisclosure-for-an-eligible-conviction-411-0735",
  "UT:path-d-petition-based-expungement-with-a-bci-certificate-of-eligibility",
  "UT:path-e-petition-based-non-conviction-expungement",
  "UT:path-f-petition-based-conviction-expungement",
  "VT:adult-conviction-expungement-narrow-statutory-route",
  "VT:adult-misdemeanor-conviction-sealing",
  "VT:adult-felony-conviction-sealing",
  "WA:adult-misdemeanor-gross-misdemeanor-vacation-under-rcw-9-96-060",
  "WA:adult-felony-vacation-under-rcw-9-94a-640",
  "WV:eligible-conviction-expungement-under-w-va-code-61-11-26",
  "ND:dui-record-sealing-under-the-separate-dui-statute",
  "IA:misdemeanor-901c3",
  "IA:public-intoxication-12346",
  "IA:underage-alcohol-12347",
  "IA:minor-prostitution-7251",
  "CO:petition-based-conviction-sealing-jdf-612-24-72-706",
  "FL:court-ordered-sealing-943-059",
  "FL:lawful-self-defense-expunction-943-0578",
  "GA:restriction-and-sealing-of-a-pardoned-felony",
  "IL:human-trafficking-survivor-vacatur-and-expungement"
]);

const HELD_GUIDANCE_ROUTES = new Set([
  "CA:tool-5-proposition-64-marijuana-relief",
  "IN:conviction-expungement-with-records-marked-expunged",
  "KS:prostitution-coercion",
  "MD:juvenile-expungement",
  "NJ:clean-slate-petition-under-n-j-s-a-2c-52-5-3",
  "NM:dna-sample-profile-expungement",
  "OR:marijuana-specific-set-aside-redesignation",
  "TN:pathway-2-diversion-expunction-under-40-15-105-40-35-313",
  "ID:non-conviction-fingerprint-and-criminal-history-expungement-under-idaho-code-67-3004-10",
  // Trafficking-survivor vacatur requires a "offense resulted from trafficking" nexus that cannot be
  // modeled from a single collected fact; held guidance-only (fail safe) until the nexus is modelable.
  "ID:human-trafficking-survivor-vacatur-and-expungement",
  "LA:first-offender-pardon-felony-expungement",
  "LA:interim-expungement-of-a-felony-arrest-reduced-to-a-misdemeanor-conviction",
  "LA:expungement-by-redaction-for-multi-person-records",
  "LA:human-trafficking-survivor-expungement-fee-exempt-route",
  "LA:immediate-expungement-after-successful-court-program-completion-art-985-3",
  "MA:adult-conviction-sealing-under-m-g-l-c-276-100a",
  "MA:court-requested-sealing-for-dismissal-or-nolle-prosequi-100c",
  "MA:juvenile-record-sealing-under-100b",
  "MA:time-based-expungement-under-100f-100j",
  "MA:non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k",
  "MA:marijuana-only-expungement",
  "ME:sex-trafficking-sexual-exploitation-survivor-sealing",
  "ME:adult-non-conviction-record-relief",
  "ME:pardon-route",
  "ME:juvenile-sealing",
  "MO:closed-record-outcome-under-rsmo-610-105",
  "MO:false-information-or-qualifying-arrest-record-expungement-under-610-122-123",
  "MO:marijuana-expungement-under-missouri-constitution-article-xiv",
  "MO:first-minor-in-possession-alcohol-expungement-under-311-326",
  "NE:trafficking-survivor-set-aside-and-seal",
  "NE:pardon-then-seal",
  "NE:law-enforcement-error-expungement",
  "NE:juvenile-petition-backstop",
  "MI:human-trafficking-related-set-aside-application",
  "WI:human-trafficking-prostitution-relief-under-973-015-2m",
  "PA:path-a-non-conviction-expungement",
  "PA:path-b-complete-acquittal-not-guilty-expungement",
  "PA:path-c-summary-conviction-expungement",
  "PA:path-d-ard-expungement",
  "PA:path-e-age-70-expungement",
  "PA:path-f-deceased-person-expungement",
  "PA:path-g-underage-drinking-conviction-expungement",
  "PA:path-h-pardon-based-expungement",
  "PA:path-i-petition-for-limited-access",
  "PA:path-k-human-trafficking-vacatur-expungement",
  "FL:juvenile-diversion-expunction-943-0582",
  "FL:early-juvenile-expunction-943-0515",
  "GA:youthful-first-offender-restriction-route"
]);

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
  const answers = request.answers;
  const jurisdiction = profile.jurisdiction.code;
  const hardStop = hardStopReason(profile, answers);
  if (hardStop) return result(profile, request, "hard_stop", [hardStop]);

  const publicProfile = projectPublicProfile(profile);
  const missingQuestionIds = requiredMissingPublicQuestionIds(publicProfile, answers);
  if (missingQuestionIds.length > 0) {
    return result(profile, request, "needs_more_info", [reason(jurisdiction, "missing_required_facts", "Required public screening facts are missing.")], {
      missingQuestionIds
    });
  }

  const exclusion = exclusionReason(profile, answers);
  if (exclusion) return result(profile, request, exclusion.code.endsWith("unknown") ? "needs_review" : "likely_not_eligible", [exclusion]);

  const ambiguity = ambiguityReason(publicProfile, answers);
  if (ambiguity) return result(profile, request, "needs_review", [ambiguity]);

  const preselectedPathway = selectPathway(profile, answers);
  const preRouteSafetyGate = preselectedPathway ? routeSpecificSafetyGate(profile, answers, preselectedPathway) : undefined;
  if (preselectedPathway && preRouteSafetyGate) {
    const code = preRouteSafetyGate.code.endsWith("not_eligible") ? "likely_not_eligible" : "needs_review";
    return result(profile, request, code, [preRouteSafetyGate], {
      pathwayId: preselectedPathway.id,
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
  const preProductGuidance = preselectedPathway ? productGuidanceReason(profile, answers, preselectedPathway) : undefined;
  if (preselectedPathway && preProductGuidance) {
    const plan = packetPlanForPathway(profile, preselectedPathway.id);
    return result(profile, request, "guidance_only", [preProductGuidance], {
      pathwayId: preselectedPathway.id,
      ...(plan ? { packetPlan: plan } : {}),
      paymentAllowed: false
    });
  }

  const route = matchCompiledRuleRoute(profile, publicProfile, answers);
  if (!route.ok) {
    return result(profile, request, route.resultCode, [route.reason], {
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
  const missingProductFacts = missingProductFactIds(profile, answers, pathway);
  if (missingProductFacts.length > 0) {
    return result(profile, request, "needs_more_info", [reason(jurisdiction, "court_petition_preconditions_missing", "Required court-petition precondition facts are missing.")], {
      pathwayId: pathway.id,
      missingQuestionIds: missingProductFacts,
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
  if (plan?.mode === "automatic_relief_verification_and_guidance") {
    return result(profile, request, "guidance_only", [reason(jurisdiction, "automatic_or_no_filing_route", guidanceTextForPathway(profile, pathway), route.rule.sourceRef ?? pathway.sourceRef)], {
      pathwayId: pathway.id,
      packetPlan: plan,
      paymentAllowed: false
    });
  }

  const timing = evaluateCompiledTiming(profile, answers, route.rule, route.pathway);
  if (timing.status === "missing_anchor") {
    return result(profile, request, "needs_more_info", [timing.reason], {
      missingQuestionIds: timing.missingQuestionIds,
      paymentAllowed: false
    });
  }
  if (timing.status === "not_yet") {
    return result(profile, request, "not_yet", [timing.reason], {
      cautions: ["A source-defined timing or completion condition is not satisfied."],
      paymentAllowed: false
    });
  }
  if (timing.status === "needs_review") {
    return result(profile, request, "needs_review", [timing.reason], {
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
    && routeIsRatifiedDeployable(profile, pathway)
    && (isCourtFiledPetitionRoute(profile, pathway) || routeIsAdministrativeApplicationPacket(profile, pathway))
    && isPacketPlanFulfillmentReady(plan);

  return result(profile, request, selectedCode, [reason(jurisdiction, `compiled_rule_match.${route.rule.id}`, `Compiled source rule ${route.rule.id} matches ${pathway.label}.`, route.rule.sourceRef ?? pathway.sourceRef)], {
    pathwayId: pathway.id,
    packetPlan: plan,
    paymentAllowed
  });
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
    return reason(jurisdiction, "state_exclusion_selected", "A source-defined exclusion or review-required category was selected.");
  }
  return undefined;
}

function ambiguityReason(publicProfile: PublicJurisdictionProfile, answers: Record<string, ScreeningAnswerValue>): ScreeningReason | undefined {
  const jurisdiction = publicProfile.jurisdiction.code;
  // Only consider questions the frontend actually renders. The full engine profile carries hidden
  // internal `source_question_*` questions that are never shown and never answered; scanning those
  // would treat every completed screening as ambiguous. Missing/empty public answers are not
  // ambiguity here — required public answers are enforced by requiredMissingPublicQuestionIds().
  const legalFields = publicProfile.questions.filter((question) => question.contextOnly !== true && question.stage !== "case_details" && question.stage !== "record_readiness");
  const ambiguous = legalFields.find((question) => isExplicitUnknownAnswer(answers[question.id]));
  if (ambiguous) return reason(jurisdiction, "source_fact_unknown", `${ambiguous.id} is uncertain and requires source review.`);
  return undefined;
}

function selectPathway(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>) {
  const context = answerText(answers.possible_pathway_context).toLowerCase();
  if (context) {
    const exactContext = profile.pathways.find((pathway) => normalizeContextMatch(pathway.label) === normalizeContextMatch(context));
    if (exactContext) return exactContext;

    const byStatuteNumber = profile.pathways.find((pathway) => numericContextMatch(context, `${pathway.id} ${pathway.label} ${pathway.summary}`));
    if (byStatuteNumber) return byStatuteNumber;

    const byContext = profile.pathways.find((pathway) => contextTokenMatch(context, pathway.label) || contextTokenMatch(context, pathway.summary));
    if (byContext) return byContext;

    return undefined;
  }

  const outcome = answerText(answers.case_outcome).toLowerCase();
  const automatic = profile.pathways.find((pathway) => /automatic|clean slate|no-filing/i.test(`${pathway.label} ${pathway.summary}`));
  if (/automatic|clean slate/.test(context) && automatic) return automatic;

  const nonConviction = profile.pathways.find((pathway) => /non[- ]conviction|dismiss|acquit|arrest/i.test(`${pathway.label} ${pathway.summary}`));
  if (/dismiss|acquit|no charge|not prosecuted|arrest/.test(outcome) && nonConviction) return nonConviction;

  const juvenile = profile.pathways.find((pathway) => /juvenile|minor/i.test(`${pathway.label} ${pathway.summary}`));
  if (/juvenile|minor/.test(outcome) && juvenile) return juvenile;

  const conviction = profile.pathways.find((pathway) => /conviction|misdemeanor|felony/i.test(`${pathway.label} ${pathway.summary}`));
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

// A legally signed-off administrative-application packet route (currently only the Hawaii HCJDC 159(b)
// application). Payment is permitted for these EXACTLY like a user-filed court petition, but the
// product copy must label them administrative applications, never court petitions.
function routeIsAdministrativeApplicationPacket(profile: EngineProfile, pathway: CompiledPathway) {
  return ADMINISTRATIVE_APPLICATION_PACKET_ROUTES.has(routeKey(profile, pathway));
}

function routeSpecificSafetyGate(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, pathway: CompiledPathway): ScreeningReason | undefined {
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
    const branch = answerText(answers.ca_prop64_branch).toLowerCase();
    if (!isAffirmative(answers.ca_prop64_qualifying_marijuana_offense)) {
      return reason(jurisdiction, "ca_prop64_qualifying_marijuana_offense_missing_or_not_eligible", "HSC § 11361.8 packet support requires a confirmed qualifying marijuana conviction.", pathway.sourceRef);
    }
    if (!isAffirmative(answers.ca_prop64_lesser_or_no_offense)) {
      return reason(jurisdiction, "ca_prop64_lesser_or_no_offense_missing_or_not_eligible", "HSC § 11361.8 packet support requires confirmation that the offense would be no offense or a lesser offense under Prop 64/AUMA.", pathway.sourceRef);
    }
    if (pathway.id === "prop-64-currently-serving-petition-11361-8" && !branch.includes("currently")) {
      return reason(jurisdiction, "ca_prop64_currently_serving_branch_not_confirmed", "The HSC § 11361.8 currently-serving petition branch must be confirmed before packet support opens.", pathway.sourceRef);
    }
    if (pathway.id === "prop-64-completed-sentence-application-11361-8") {
      if (!branch.includes("completed")) {
        return reason(jurisdiction, "ca_prop64_completed_sentence_branch_not_confirmed", "The HSC § 11361.8 completed-sentence application branch must be confirmed before packet support opens.", pathway.sourceRef);
      }
      const requested = answerText(answers.ca_prop64_relief_requested).toLowerCase();
      if (!/dismiss|seal|redesignat/.test(requested)) {
        return reason(jurisdiction, "ca_prop64_relief_requested_missing", "The completed-sentence HSC § 11361.8 application must confirm dismissal/sealing or redesignation is requested.", pathway.sourceRef);
      }
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
  const totalConvictions = numericAnswer(answers.ny_16059_total_eligible_convictions ?? answers.eligible_conviction_count);
  if (totalConvictions === undefined) {
    return reason(jurisdiction, "ny_16059_numerosity_missing", "NY CPL 160.59 requires the total eligible conviction count before a packet decision.", pathway.sourceRef);
  }
  if (totalConvictions > 2) {
    return reason(jurisdiction, "ny_16059_numerosity_not_eligible", "NY CPL 160.59 is limited to no more than two eligible convictions.", pathway.sourceRef);
  }
  const felonyConvictions = numericAnswer(answers.ny_16059_felony_convictions);
  if (felonyConvictions === undefined) {
    return reason(jurisdiction, "ny_16059_felony_count_missing", "NY CPL 160.59 requires the felony conviction count before a packet decision.", pathway.sourceRef);
  }
  if (felonyConvictions > 1) {
    return reason(jurisdiction, "ny_16059_felony_count_not_eligible", "NY CPL 160.59 is limited to no more than one felony conviction.", pathway.sourceRef);
  }
  if (isAffirmative(answers.ny_16059_ineligible_offense) || isAffirmative(answers.ny_16059_sex_offender_registration)) {
    return reason(jurisdiction, "ny_16059_offense_bar_not_eligible", "NY CPL 160.59 excludes sex offenses, Article 263 offenses, felony Article 125 offenses, violent felonies, Class A felonies, ineligible attempts/conspiracies, and records requiring sex-offender registration.", pathway.sourceRef);
  }
  if (!answerText(answers.ny_16059_ineligible_offense).trim() || !answerText(answers.ny_16059_sex_offender_registration).trim()) {
    return reason(jurisdiction, "ny_16059_offense_bar_missing", "NY CPL 160.59 offense-exclusion facts must be confirmed before a packet decision.", pathway.sourceRef);
  }
  if (isAffirmative(answers.ny_16059_pending_charge) || isAffirmative(answers.pending_cases)) {
    return reason(jurisdiction, "ny_16059_pending_charge_not_eligible", "NY CPL 160.59 does not open while a criminal charge is pending.", pathway.sourceRef);
  }
  if (isAffirmative(answers.ny_16059_post_last_conviction_crime) || isAffirmative(answers.new_convictions_during_waiting_period)) {
    return reason(jurisdiction, "ny_16059_post_last_conviction_crime_not_eligible", "NY CPL 160.59 requires no crime after the last conviction before the packet decision.", pathway.sourceRef);
  }
  if (isAffirmative(answers.ny_16059_prior_sealing)) {
    return reason(jurisdiction, "ny_16059_prior_sealing_cap_not_eligible", "NY CPL 160.59 prior-sealing caps must be clear before a packet decision.", pathway.sourceRef);
  }
  for (const id of ["ny_16059_pending_charge", "ny_16059_post_last_conviction_crime", "ny_16059_prior_sealing"]) {
    if (!answerText(answers[id]).trim() || isExplicitUnknownAnswer(answers[id])) {
      return reason(jurisdiction, `${id}_missing`, "NY CPL 160.59 gate facts must be confirmed before a packet decision.", pathway.sourceRef);
    }
  }
  return undefined;
}

function numericAnswer(value: ScreeningAnswerValue | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = answerText(value);
  if (!text.trim()) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
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

function postTimingPolicyReason(profile: EngineProfile, pathway: CompiledPathway): ScreeningReason | undefined {
  const jurisdiction = profile.jurisdiction.code;
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
  if (key === "CA:tool-1-dismissal-set-aside" || key === "CA:tool-4-arrest-record-sealing") return { status: "satisfied" };
  if (key === "CA:prop-64-currently-serving-petition-11361-8" || key === "CA:prop-64-completed-sentence-application-11361-8") return { status: "satisfied" };
  if (key === "NY:conditional-treatment-sealing-under-cpl-160-58") return { status: "satisfied" };
  if (key === "NY:discretionary-conviction-sealing-by-petition-under-cpl-160-59") {
    return latestAnchorTiming(profile, answers, rule, pathway, ["sentencing_date", "release_date"], { value: 10, unit: "years", raw: "10 years" }, "NY CPL 160.59 requires ten years from the later of sentencing or release; release captures incarceration tolling when present.");
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
  // ---- Missouri (corrected, awaiting Lawrence reconfirmation) ----
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
    return timingFromAnchor(profile, answers, rule, pathway, "disposition_date", { value: 90, unit: "days", raw: "90 days" }, "Louisiana Art. 998 first-offense marijuana expungement requires 90 days from conviction (disposition date used as the available anchor).");
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
    return {
      status: "missing_anchor",
      reason: reason(profile.jurisdiction.code, "waiting_anchor_missing", `One of ${anchorIds.join(", ")} is needed before the source-specific waiting period can be evaluated.`, rule.sourceRef ?? pathway.sourceRef),
      missingQuestionIds: anchorIds
    };
  }
  const latest = dates.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
  const syntheticAnswers = { ...answers, [latest.id]: latest.date.toISOString().slice(0, 10) };
  return timingFromAnchor(profile, syntheticAnswers, rule, pathway, latest.id, duration, text);
}

function timingFromAnchor(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, rule: CompiledRule, pathway: CompiledPathway, anchorId: string, duration: CompiledDuration, text: string): TimingResult {
  const jurisdiction = profile.jurisdiction.code;
  const anchor = parseDateAnswer(answers[anchorId]);
  if (!anchor) {
    return {
      status: "missing_anchor",
      reason: reason(jurisdiction, "waiting_anchor_missing", `The ${anchorId} date is needed before the corrected source-specific waiting period can be evaluated.`, rule.sourceRef ?? pathway.sourceRef),
      missingQuestionIds: [anchorId]
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

function productGuidanceReason(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, pathway: CompiledPathway): ScreeningReason | undefined {
  const jurisdiction = profile.jurisdiction.code;
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
  return {
    jurisdiction: profile.jurisdiction.code,
    profileVersion: profile.profileVersion,
    matterId: request.matterId,
    resultCode,
    userLabel: labelForResult(resultCode),
    reasons,
    missingQuestionIds: overrides.missingQuestionIds ?? [],
    cautions: overrides.cautions ?? [],
    nextSteps: nextStepsForResult(resultCode),
    paymentAllowed,
    ...(overrides.pathwayId ? { pathwayId: overrides.pathwayId } : {}),
    ...(overrides.packetPlan ? { packetPlan: overrides.packetPlan } : {})
  };
}

function labelForResult(resultCode: ScreeningResultCode) {
  const labels: Record<ScreeningResultCode, string> = {
    packet_ready: "A source-defined packet pathway may be available.",
    packet_ready_with_caution: "A source-defined packet pathway may be available with cautions.",
    needs_more_info: "More case details are required.",
    not_yet: "A timing or completion condition is not satisfied yet.",
    guidance_only: "This route is guidance-only or automatic relief verification.",
    not_covered_yet: "This record type is not covered yet.",
    likely_not_eligible: "The answers appear to hit a source-defined exclusion.",
    needs_review: "The answers require source review before a packet decision.",
    hard_stop: "This matter is outside the self-help state screening scope."
  };
  return labels[resultCode];
}

function nextStepsForResult(resultCode: ScreeningResultCode) {
  const nextSteps: Record<ScreeningResultCode, string[]> = {
    packet_ready: ["Save this result.", "Confirm every packet field.", "Generate the source-driven self-help packet only after payment is allowed."],
    packet_ready_with_caution: ["Review the cautions.", "Confirm every packet field.", "Do not file until the packet and instructions are reviewed."],
    needs_more_info: ["Answer the missing source-defined questions.", "Use court records when possible.", "Run the evaluation again."],
    not_yet: ["Save the timing result.", "Confirm the anchor date from records.", "Return when the source-defined wait may be satisfied."],
    guidance_only: ["Review the state-specific guidance.", "Verify the record status with the listed source.", "Do not pay for a filing packet for this route."],
    not_covered_yet: ["Save this result.", "Request follow-up.", "Consider legal aid or attorney help."],
    likely_not_eligible: ["Review the source-backed reason.", "Do not use automated packet generation.", "Consider legal aid or attorney help."],
    needs_review: ["Gather court records.", "Save the result.", "Get source review before any filing packet is generated."],
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

function contextTokenMatch(context: string, value: string) {
  const stopwords = new Set(["pathway", "record", "records", "sealing", "expungement", "erasure", "petition", "relief", "compiled", "source"]);
  if (numericContextMatch(context, value)) return true;
  const tokens = value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 4 && !stopwords.has(token));
  return tokens.some((token) => context.includes(token));
}

function numericContextMatch(context: string, value: string) {
  const numericTokens = value.toLowerCase().match(/\b\d{2,}(?:-\d+)?\b/g) ?? [];
  return numericTokens
    .filter((token) => token.includes("-") || token.replace(/\D/g, "").length >= 3)
    .some((token) => context.includes(token));
}

function normalizeContextMatch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
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

function matchCompiledRuleRoute(profile: EngineProfile, publicProfile: PublicJurisdictionProfile, answers: Record<string, ScreeningAnswerValue>): RouteMatch {
  const jurisdiction = profile.jurisdiction.code;
  const selectedPathway = selectPathway(profile, answers);
  const requestedPathwayContext = answerText(answers.possible_pathway_context).trim();
  if (requestedPathwayContext && !selectedPathway) {
    return {
      ok: false,
      resultCode: "needs_review",
      reason: reason(jurisdiction, "pathway_context_not_matched", "The selected pathway context did not match a deterministic compiled pathway before a packet decision.")
    };
  }
  const publicQuestionIds = new Set(publicProfile.questions.map((question) => question.id));
  const outcome = normalizeCaseOutcome(answers.case_outcome);
  const exactRouteRules = selectedPathway
    ? [...(profile.orderedDecisionRules ?? [])].filter((rule) => compiledRouteRuleMatchesPathway(rule, selectedPathway))
    : [];
  const matchedRules = [...(profile.orderedDecisionRules ?? [])]
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
      reason: reason(jurisdiction, "selected_pathway_rule_not_matched", "The selected pathway has a compiled route rule, but the collected facts did not satisfy it before a packet decision.", selectedPathway.sourceRef)
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
      reason: reason(jurisdiction, "no_deterministic_compiled_rule_match", "No deterministic compiled source rule matched these answers before a packet decision.")
    };
  }

  const first = rules[0];
  const sameRank = rules.filter((rule) =>
    (rule.priority ?? Number.MAX_SAFE_INTEGER) === (first.priority ?? Number.MAX_SAFE_INTEGER)
    && safeResultRank(rule.then?.suggestedResultCode) === safeResultRank(first.then?.suggestedResultCode)
  );
  const selected = selectedPathway ?? pathwayFromRule(profile, first);
  if (!selected) {
    return {
      ok: false,
      resultCode: "needs_review",
      reason: reason(jurisdiction, `ambiguous_compiled_rule_match.${first.id}`, "The matched compiled source rule did not identify one deterministic pathway.", first.sourceRef)
    };
  }
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
      reason: reason(jurisdiction, `compiled_rule_match.${first.id}`, `Compiled source rule ${first.id} matched before a packet decision.`, first.sourceRef)
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
  if (isNegative(answers.sentence_completion_date) || isNegative(answers.financial_obligations) || isAffirmative(answers.pending_cases) || isAffirmative(answers.new_convictions_during_waiting_period)) {
    return {
      status: "not_yet",
      reason: reason(jurisdiction, "timing_or_completion_blocker", "The source-defined completion, supervision, or pending-case condition is not satisfied.", rule.sourceRef)
    };
  }
  if (isNegative(answers.special_preconditions_confirmed) || isExplicitUnknownAnswer(answers.special_preconditions_confirmed)) {
    return {
      status: "needs_review",
      reason: reason(jurisdiction, "special_preconditions_unconfirmed", "Source-listed special preconditions must be confirmed before a packet decision.", rule.sourceRef)
    };
  }
  if (profile.jurisdiction.code === "WI" && pathway.id === "adult-conviction-expungement-under-wis-stat-973-015") {
    return { status: "satisfied" };
  }
  const routeOverride = specialRouteTiming(profile, answers, rule, pathway);
  if (routeOverride) return routeOverride;

  const compiledRuleWait = normalizeDuration(compiledRuleDuration(rule));
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

  const anchorId = chooseTimingAnchor(rule, pathway, answers, selectedWaitingRule);
  if (!anchorId) {
    if (!packetLikePathway(profile, pathway)) return { status: "not_applicable" };
    return {
      status: "needs_review",
      reason: reason(jurisdiction, "waiting_anchor_not_determined", "The source-specific waiting period has no safely executable date anchor.", rule.sourceRef ?? pathway.sourceRef)
    };
  }
  const anchor = parseDateAnswer(answers[anchorId]);
  if (!anchor) {
    return {
      status: "missing_anchor",
      reason: reason(jurisdiction, "waiting_anchor_missing", `The ${anchorId} date is needed before the source-specific waiting period can be evaluated.`, rule.sourceRef ?? pathway.sourceRef),
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
      reason: reason(jurisdiction, "waiting_period_not_satisfied", `The source-specific waiting period runs until ${earliest.toISOString().slice(0, 10)}.`, rule.sourceRef ?? pathway.sourceRef)
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

function pathwayFromRule(profile: EngineProfile, rule: CompiledRule) {
  const candidates = rule.candidatePathwayIds ?? [];
  if (candidates.length !== 1) return undefined;
  return profile.pathways.find((pathway) => pathway.id === candidates[0]);
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

function isCourtFiledPetitionRoute(profile: EngineProfile, pathway: CompiledPathway) {
  const code = profile.jurisdiction.code;
  const text = `${pathway.id} ${pathway.label} ${pathway.summary}`.toLowerCase();
  const plan = packetPlanForPathway(profile, pathway.id);

  if (code === "AK") return false;
  // Hawaii HCJDC routes are administrative applications, not court petitions. They are paid via
  // routeIsAdministrativeApplicationPacket, and must never be described as court filings.
  if (routeIsAdministrativeApplicationPacket(profile, pathway)) return false;
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

function chooseTimingAnchor(rule: CompiledRule, pathway: CompiledPathway, answers: Record<string, ScreeningAnswerValue>, waitingRule?: SelectedWaitingRule) {
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
  return preferred.find((field) => parseDateAnswer(answers[field]));
}

function parseDateAnswer(value: ScreeningAnswerValue | undefined) {
  const text = answerText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return undefined;
  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function evaluationToday() {
  return new Date(process.env.RCAP_EVALUATOR_TODAY ? `${process.env.RCAP_EVALUATOR_TODAY}T00:00:00.000Z` : Date.now());
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
