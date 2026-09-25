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

import { NEVADA_176A_ROUTE_KEY, NEVADA_176A_ROUTE_SAFETY_FACT_IDS } from "@/lib/rcap-engine/nevada-176a-branch";

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
  ],
  // Nevada NRS 176A.245 / .265 / .295. Two of these facts decide whether the
  // participant has a filing at all — subsection 1 is sealed by the court with
  // nothing filed and nothing to pay, subsection 2 is a petition the
  // participant files — and the third decides whether either branch is open,
  // because subsection 3 bars sealing outright for a charge under NRS 200.508
  // or NRS 200.5099. The evaluator resolves all three before a result is
  // issued; naming them here keeps the collection policy from classifying a
  // route-deciding fact as anything the participant could reach Checkout
  // without answering.
  [NEVADA_176A_ROUTE_KEY]: NEVADA_176A_ROUTE_SAFETY_FACT_IDS
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

export const MISSISSIPPI_NONCONVICTION_ROUTE = "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";

function isoCalendarDateUtc(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const timestamp = Date.UTC(year, month - 1, day);
  const roundTrip = new Date(timestamp);
  return roundTrip.getUTCFullYear() === year
    && roundTrip.getUTCMonth() === month - 1
    && roundTrip.getUTCDate() === day
    ? timestamp
    : null;
}

/** Shared pure participant-delivery filing authority. No storage, clock, or renderer dependency. */
export function mississippiParticipantDeliverySafety(
  facts: Readonly<Record<string, unknown>>,
  verifiedAt: string,
  generationPurpose: "participant_delivery" | "internal_review" = "participant_delivery"
): { safe: boolean; violations: string[] } {
  const fact = (id: string): string => {
    const answer = facts[id];
    const value = answer && typeof answer === "object" && !Array.isArray(answer)
      ? ((answer as { unknown?: boolean }).unknown === true ? undefined : (answer as { value?: unknown }).value)
      : answer;
    return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
  };
  const invalid: string[] = [];
  if (fact("actual_arrest") !== "Yes") invalid.push("actual_arrest must be Yes");
  if (fact("release_confirmed") !== "Yes") invalid.push("release_confirmed must be Yes");
  if (/citation only|no (custodial )?arrest/i.test(fact("record_type"))) {
    invalid.push("a citation-only record does not establish the actual arrest required by this route");
  }

  const fullSsnDigits = fact("social_security_number").replace(/\D/g, "");
  const lastFour = fact("social_security_number_last_four").replace(/\D/g, "");
  if (fullSsnDigits.length !== 9 || lastFour.length !== 4 || !fullSsnDigits.endsWith(lastFour)) {
    invalid.push("social_security_number does not match social_security_number_last_four");
  }

  // The certified disposition and the docket sheet are records the participant
  // fetches from a clerk. Expungement.ai cannot produce either, so neither is a
  // condition of producing what Expungement.ai CAN produce. The petition's
  // "attached as Exhibit A" sentence describes the filing package the
  // participant is instructed to assemble — obtain it, attach it behind the
  // petition, do not file without it — and refusing to compose until they have
  // been to the courthouse would block a purchase on a county clerk. Their
  // status stays a filing-readiness task, asked and tracked, never a gate.

  if (generationPurpose !== "internal_review") {
    const method = fact("mcic_identifier_delivery_method");
    const methodSource = fact("mcic_identifier_method_confirmation_source");
    const allowedMethods = new Set([
      "Confidential court-approved MCIC identifier addendum",
      "Court-approved MCIC identifier sheet",
      "Court-approved nonpublic certified copy",
      "Court-approved signed-order identifier channel"
    ]);
    if (!allowedMethods.has(method)) {
      invalid.push("the MCIC identifier-delivery method is not a protected court-approved channel");
    }
    const methodSourceMatch =
      /^Confirmed by (?:the )?[A-Za-z0-9 .,'-]*(?:Court|Clerk)(?:'s Office)? on (\d{4}-\d{2}-\d{2})$/i.exec(methodSource);
    const methodConfirmedAt = isoCalendarDateUtc(methodSourceMatch?.[1] ?? "");
    const verifiedTimestamp = new Date(verifiedAt).getTime();
    if (!methodSourceMatch || methodConfirmedAt === null || !Number.isFinite(verifiedTimestamp) || methodConfirmedAt > verifiedTimestamp) {
      invalid.push("the court of origin has not confirmed the MCIC identifier-delivery method");
    }
    // Not the service-address confirmation either. The specification offers
    // "To be confirmed before filing or service" as an answer and gives the
    // certificate an explicit court-confirmation placeholder for exactly that
    // state, so demanding the confirmed answer made the specification's own
    // second option unreachable. Confirming an address with a clerk is a
    // filing-readiness task.
  }

  return { safe: invalid.length === 0, violations: invalid };
}
