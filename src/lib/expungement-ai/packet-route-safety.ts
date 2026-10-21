/**
 * The facts a route's own safety gate reads.
 *
 * `mississippiNonConvictionPacketSafety` re-checks a set of facts before a
 * packet may be sold, because screening owns the route and the builder may
 * complete it but may not quietly contradict it. Those fact ids were written
 * inline in that function, which made them invisible to anything that needed
 * to know which facts decide a paid route — including the collection policy,
 * whose whole job is to keep such a fact in front of the participant before
 * Checkout.
 *
 * Naming them here changes no gate and no threshold. The gate still lives with
 * its own logic; this is the list it reads, in one place, so the collection
 * layer cannot classify a route-deciding fact as anything else.
 */

/**
 * Mississippi non-conviction: the neutral answers the gate requires, exactly
 * as the gate requires them. The gate is the authority for what each answer
 * must be; this is the authority for which facts it looks at.
 */
export const MISSISSIPPI_NON_CONVICTION_NEUTRAL_FACTS: ReadonlyArray<readonly [string, string]> = [
  ["pending_cases", "No"],
  ["trafficking_status", "No"],
  ["prior_relief", "No"],
  ["sentence_completion_date", "Yes"],
  ["financial_obligations", "Yes"],
  ["nonadjudication_or_diversion", "No"],
  ["open_co_defendant_matter", "No"],
  ["actual_arrest", "Yes"],
  ["release_confirmed", "Yes"]
];

/** The wording fact the same gate reads through its own pattern checks. */
export const MISSISSIPPI_NON_CONVICTION_WORDING_FACT = "disposition_record_wording";

const ROUTE_SAFETY_GATE_FACT_IDS: Readonly<Record<string, readonly string[]>> = {
  "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal": [
    ...MISSISSIPPI_NON_CONVICTION_NEUTRAL_FACTS.map(([factId]) => factId),
    MISSISSIPPI_NON_CONVICTION_WORDING_FACT
  ]
};

/**
 * Fact ids a route-specific safety gate reads, or an empty list where the
 * route has no gate of its own. A route with no entry is not thereby declared
 * safe; it simply has no additional gate beyond the evaluator's.
 */
export function routeSafetyGateFactIds(jurisdiction: string, pathwayId: string | null): readonly string[] {
  return ROUTE_SAFETY_GATE_FACT_IDS[`${jurisdiction}:${pathwayId ?? ""}`] ?? [];
}

export function routeHasSafetyGate(jurisdiction: string, pathwayId: string | null): boolean {
  return routeSafetyGateFactIds(jurisdiction, pathwayId).length > 0;
}
