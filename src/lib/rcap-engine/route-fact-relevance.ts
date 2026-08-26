import type { EngineProfile } from "@/lib/rcap-engine/contracts";

type CompiledPathway = EngineProfile["pathways"][number];

/**
 * Which facts actually decide a given route.
 *
 * `ambiguityReason` used to treat an explicit "I'm not sure" on ANY rendered
 * prepayment question as ambiguity, without ever asking whether the question
 * belonged to the route the participant was on. Because a profile publishes its
 * route-scoped questions to everyone, that meant a Californian on the
 * dismissal/set-aside route could be sent to needs_review by an optional
 * Proposition 64 question that decides only the two HSC 11361.8 remedies. The
 * same shape blocked Hawaii's non-conviction route on hi_court_order_confirmed.
 *
 * So relevance is computed per route: a fact blocks only when the selected
 * pathway consumes it, or a still-viable pathway does, or packet selection does,
 * or it feeds an actual escalation condition. Nothing here removes a question,
 * and nothing here decides eligibility — it only decides whether uncertainty
 * about a fact is this participant's problem.
 */

/**
 * Facts every route in the engine reads before it will open a packet. These stay
 * blocking whatever route is selected, because uncertainty about them is
 * uncertainty about the matter itself.
 */
export const UNIVERSAL_PREPAY_FACT_IDS: ReadonlySet<string> = new Set([
  "ownership_scope",
  "jurisdiction_scope",
  "case_outcome",
  "offense_level",
  "charge",
  "pardon_status",
  "state_exclusion_categories",
  "pending_cases",
  "new_convictions_during_waiting_period",
  "sentence_completion_date",
  "financial_obligations",
  "court_requirements_completed",
  "special_preconditions_confirmed",
  "resolved_timing_bucket",
  "criminal_history"
]);

/**
 * Facts the route-specific safety gates in the evaluator read. Each gate already
 * guards on its own route key, so a fact only escalates for the route that reads
 * it. Keyed by `<JURISDICTION>:<pathway id>`, mirroring `routeSpecificSafetyGate`.
 */
export const ROUTE_ESCALATION_FACT_IDS: Readonly<Record<string, readonly string[]>> = {
  "CA:tool-4-arrest-record-sealing": ["case_outcome"],
  "CA:prop-64-currently-serving-petition-11361-8": ["ca_prop64_branch", "ca_prop64_qualifying_marijuana_offense", "ca_prop64_lesser_or_no_offense", "ca_prop64_relief_requested"],
  "CA:prop-64-completed-sentence-application-11361-8": ["ca_prop64_branch", "ca_prop64_qualifying_marijuana_offense", "ca_prop64_lesser_or_no_offense", "ca_prop64_relief_requested"],
  "NY:discretionary-conviction-sealing-by-petition-under-cpl-160-59": [
    "eligible_conviction_count", "new_convictions_during_waiting_period", "pending_cases",
    "ny_16059_total_eligible_convictions", "ny_16059_felony_convictions", "ny_16059_ineligible_offense",
    "ny_16059_sex_offender_registration", "ny_16059_pending_charge", "ny_16059_post_last_conviction_crime",
    "ny_16059_prior_sealing"
  ],
  "NY:conditional-treatment-sealing-under-cpl-160-58": ["ny_16058_treatment_program_completed", "sentence_completion_date"],
  "DC:dc_actual_innocence_expungement_16_803": ["actual_innocence_basis", "dc_offense_severity_group"],
  "DC:dc_motion_seal_felony_conviction_8yr_16_806": ["actual_innocence_basis", "dc_offense_severity_group"],
  "IL:felony-prostitution-relief": ["charge", "offense_level"],
  "HI:nonconviction-arrest-expungement": ["case_outcome", "hi_court_order_confirmed"],
  "DE:discretionary-court-expungement-under-11-del-c-4374": ["state_exclusion_categories"],
  "AK:confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40": ["case_outcome"],
  "MD:pardoned-conviction-expungement-under-crim-proc-10-105-a-8": ["pardon_signed_date"],
  "IN:conviction-expungement-with-sealed-confidential-access": ["in_prosecutor_consent_confirmed", "eligible_conviction_class"],
  "WI:adult-conviction-expungement-under-wis-stat-973-015": ["wi_expungement_ordered_at_sentencing", "wi_no_probation_jail_prison"]
};

function collectFieldIds(value: unknown, into: Set<string>) {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const entry of value) { if (typeof entry === "string") into.add(entry); else collectFieldIds(entry, into); }
    return;
  }
  if (typeof value !== "object") return;
  const node = value as Record<string, unknown>;
  for (const key of ["fields", "fieldIds", "fieldsReferenced", "triggerFields", "requiredFields", "requiredInputIds", "questionIds"]) {
    const entry = node[key];
    if (Array.isArray(entry)) for (const id of entry) if (typeof id === "string") into.add(id);
  }
  for (const entry of Object.values(node)) if (entry && typeof entry === "object") collectFieldIds(entry, into);
}

type DecisionRule = {
  candidatePathwayIds?: string[];
  when?: unknown;
};

/** Facts one pathway consumes: its own clauses, its rules, its escalation gate. */
export function pathwayRelevantFactIds(profile: EngineProfile, pathway: CompiledPathway): Set<string> {
  const relevant = new Set<string>(UNIVERSAL_PREPAY_FACT_IDS);

  collectFieldIds(pathway, relevant);

  // Ordered decision rules that name this pathway, plus the global ones that
  // name none — a rule with no candidate list applies wherever it matches.
  for (const rule of ((profile as { orderedDecisionRules?: DecisionRule[] }).orderedDecisionRules ?? [])) {
    const candidates = rule.candidatePathwayIds ?? [];
    if (candidates.length === 0 || candidates.includes(pathway.id)) collectFieldIds(rule, relevant);
  }

  // Exclusions are escalation conditions and apply to every route.
  collectFieldIds((profile as { exclusionRules?: unknown }).exclusionRules, relevant);

  // Packet selection, scoped to this route's own generator entry. The generator
  // block carries one entry per pathway, so collecting the whole thing would
  // hand every route every other route's packet facts — which is how the
  // Proposition 64 facts reached California's dismissal/set-aside remedy.
  const generator = (profile as { packetGenerator?: Record<string, unknown> }).packetGenerator ?? {};
  for (const [key, value] of Object.entries(generator)) {
    if (key === "pathways") {
      const entries = Array.isArray(value) ? value : [];
      const own = entries.find((entry) => (entry as { pathwayId?: string })?.pathwayId === pathway.id);
      if (own) collectFieldIds(own, relevant);
      continue;
    }
    collectFieldIds(value, relevant);
  }

  // The waiting rules, which any route may reach.
  collectFieldIds((profile as { waitingPeriodRules?: unknown }).waitingPeriodRules, relevant);

  for (const id of ROUTE_ESCALATION_FACT_IDS[`${profile.jurisdiction.code}:${pathway.id}`] ?? []) relevant.add(id);
  return relevant;
}

/**
 * Facts relevant to the participant right now.
 *
 * With a route selected, that route decides. With none selected, every pathway
 * is still viable, so the union applies and behaviour is unchanged from before
 * this module existed — uncertainty still blocks until the route is known.
 */
export function relevantFactIds(profile: EngineProfile, selectedPathway: CompiledPathway | undefined): Set<string> {
  if (selectedPathway) return pathwayRelevantFactIds(profile, selectedPathway);
  const union = new Set<string>(UNIVERSAL_PREPAY_FACT_IDS);
  for (const pathway of (profile.pathways ?? [])) {
    for (const id of pathwayRelevantFactIds(profile, pathway)) union.add(id);
  }
  return union;
}

/** Explicit route consumers authored in the optional state lifecycle envelope. */
export function routeConsumersForQuestion(profile: EngineProfile, questionId: string): readonly string[] {
  return profile.questionLifecycle?.routeConsumers[questionId] ?? [];
}
