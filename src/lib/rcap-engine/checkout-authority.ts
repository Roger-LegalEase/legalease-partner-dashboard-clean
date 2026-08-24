import routePaymentAuthority from "@/lib/rcap-engine/route-payment-authority.json";

/**
 * The single server-side answer to "may this participant pay for this route".
 *
 * Before this existed, `paymentAllowed` was the product of several independent
 * conditions computed in-line, and a route whose waiting rule never resolved
 * simply never entered the timing gate — so the participant's timing answer was
 * discarded and checkout opened anyway. Fourteen routes took money at the
 * shortest timing bucket and five took it while the participant had said the
 * case was still open.
 *
 * So the decision is one function, it is evaluated on the server inside the
 * authoritative evaluation, and it fails closed: every condition must be
 * affirmatively satisfied, and anything unrecognised is a refusal rather than a
 * pass. No client-supplied flag reaches it.
 */

export type CheckoutDenialCode =
  | "CASE_STILL_OPEN_OR_PENDING"
  | "WAITING_PERIOD_NOT_SATISFIED"
  | "TIMING_ANCHOR_MISSING"
  | "TIMING_ANSWER_NOT_CONSUMED_BY_THE_SELECTED_RULE"
  | "WAITING_RULE_RESOLUTION_MISSING"
  | "WAITING_RULE_RESOLUTION_AMBIGUOUS"
  | "WAITING_RULE_RESOLVED_BY_PROVISIONAL_PROSE_FALLBACK"
  | "BINDING_NOT_DURATION_PROVENANCE_VALIDATED"
  | "ROUTE_HELD_FOR_CORRECTION"
  | "ROUTE_LEGAL_OWNER_DECISION_REQUIRED"
  | "ROUTE_NOT_IN_THE_PAYMENT_AUTHORITY"
  | "ROUTE_NOT_OTHERWISE_PURCHASABLE";

export type CheckoutDenial = { code: CheckoutDenialCode; detail: string };

/** How the timing gate concluded, so the authority can tell "satisfied" from "never asked". */
export type TimingBasis =
  | "anchor_date"
  | "timing_bucket"
  | "authored_no_waiting_period"
  /**
   * A counsel-approved route override that ran its own statutory duration
   * against a date the participant supplied — Maryland's ten-year filing
   * deadline from the pardon date, Indiana's tiered conviction waits, New York
   * CPL 160.59. These are deterministic and route-specific; they simply live in
   * the evaluator rather than in the binding table.
   */
  | "route_override_anchor_date"
  /** A route override that concluded "satisfied" having asked the participant nothing. */
  | "route_override_without_a_participant_timing_fact"
  | "not_evaluated";

export type CheckoutAuthorityInput = {
  jurisdiction: string;
  pathwayId: string | undefined;
  /** What the rest of the evaluator concluded before this gate ran. */
  routePurchasableAtEvaluator: boolean;
  timingStatus: "satisfied" | "not_yet" | "needs_review" | "missing_anchor" | "not_applicable" | "not_evaluated";
  timingBasis: TimingBasis;
  /** The participant's own words about where the case stands. */
  resolvedTimingBucket: string;
  pendingCasesAffirmative: boolean;
};

export type CheckoutAuthorityDecision = {
  purchasable: boolean;
  denials: CheckoutDenial[];
  routeKey: string;
};

type AuthorityRoute = {
  waitingRuleResolution?: string;
  bindingClassification?: string | null;
  shardDisposition?: string | null;
  caseOpenExpresslyPermitted?: boolean;
  paymentEligible?: boolean;
  denials?: string[];
};

const ROUTES: Record<string, AuthorityRoute> =
  (routePaymentAuthority as { routes?: Record<string, AuthorityRoute> }).routes ?? {};

/** Bucket answers that mean the case is not finished. */
const OPEN_CASE_BUCKETS = new Set(["still_open", "not_resolved", "pending", "open"]);

/** Timing conclusions that prove the operative wait actually ran. */
const TIMING_BASES_THAT_CONSUMED_A_FACT = new Set<TimingBasis>(["anchor_date", "timing_bucket", "route_override_anchor_date"]);

/**
 * A counsel-approved route override carries its own duration and its own anchor,
 * so the binding table is not the authority for it and its absence is not a
 * fallback. The override still has to have consumed a participant date to
 * qualify — an override that concluded "satisfied" without asking anything does
 * not reach here.
 */
const SELF_AUTHORITATIVE_BASES = new Set<TimingBasis>(["route_override_anchor_date"]);

export function evaluateCheckoutAuthority(input: CheckoutAuthorityInput): CheckoutAuthorityDecision {
  const routeKey = `${input.jurisdiction}:${input.pathwayId ?? ""}`;
  const denials: CheckoutDenial[] = [];
  const deny = (code: CheckoutDenialCode, detail: string) => denials.push({ code, detail });

  // The participant's own account of the case comes first. A route may only
  // override it by naming itself in the authority with a source quote, and no
  // route does today.
  const route = input.pathwayId ? ROUTES[routeKey] : undefined;
  const caseOpenPermitted = route?.caseOpenExpresslyPermitted === true;
  if (!caseOpenPermitted) {
    if (OPEN_CASE_BUCKETS.has(input.resolvedTimingBucket.trim().toLowerCase())) {
      deny("CASE_STILL_OPEN_OR_PENDING", `The participant answered resolved_timing_bucket = "${input.resolvedTimingBucket}", and ${routeKey} does not expressly permit a packet while the case is open.`);
    }
    if (input.pendingCasesAffirmative) {
      deny("CASE_STILL_OPEN_OR_PENDING", `The participant reported a pending case, and ${routeKey} does not expressly permit a packet while one is open.`);
    }
  }

  // The operative waiting period must have run, and must have run against
  // something the participant actually told us.
  switch (input.timingStatus) {
    case "satisfied":
      break;
    case "missing_anchor":
      deny("TIMING_ANCHOR_MISSING", "The waiting rule names an anchor the participant has not supplied.");
      break;
    case "not_yet":
      deny("WAITING_PERIOD_NOT_SATISFIED", "The operative waiting period has not elapsed.");
      break;
    case "needs_review":
      deny("WAITING_RULE_RESOLUTION_AMBIGUOUS", "The waiting rule could not be resolved to a single answer.");
      break;
    case "not_applicable":
    case "not_evaluated":
    default:
      deny("WAITING_RULE_RESOLUTION_MISSING", `The waiting period was never evaluated for ${routeKey} (timing status "${input.timingStatus}").`);
      break;
  }

  if (input.timingStatus === "satisfied"
    && !TIMING_BASES_THAT_CONSUMED_A_FACT.has(input.timingBasis)
    && input.timingBasis !== "authored_no_waiting_period") {
    deny("TIMING_ANSWER_NOT_CONSUMED_BY_THE_SELECTED_RULE", `${routeKey} reported the waiting period satisfied on basis "${input.timingBasis}", which consumed no participant timing fact. A route that ignores the timing answer may not take money on the strength of it.`);
  }

  // The route's standing in the audited authority. Absent means refused.
  if (!input.pathwayId) {
    deny("ROUTE_NOT_IN_THE_PAYMENT_AUTHORITY", "No compiled pathway was resolved, so no route can be authorised for payment.");
  } else if (!route) {
    deny("ROUTE_NOT_IN_THE_PAYMENT_AUTHORITY", `${routeKey} has no row in the payment authority. A compiled route must be audited before it can sell.`);
  } else {
    const selfAuthoritative = SELF_AUTHORITATIVE_BASES.has(input.timingBasis);
    for (const recorded of route.denials ?? []) {
      // A binding-table denial says nothing about a route whose wait the
      // evaluator itself carries and has just run against a participant date.
      // The holds below still apply to it.
      if (recorded.startsWith("NO_AUTHORED_BINDING")) {
        if (!selfAuthoritative) deny("WAITING_RULE_RESOLVED_BY_PROVISIONAL_PROSE_FALLBACK", `${routeKey} has no authored binding; the provisional prose selector still decides it and may not reach checkout.`);
      } else if (recorded.startsWith("BINDING_HELD_FOR_LEGAL_REVIEW")) {
        if (!selfAuthoritative) deny("ROUTE_LEGAL_OWNER_DECISION_REQUIRED", `${routeKey} carries a binding held for legal review.`);
      } else if (recorded.startsWith("BINDING_NOT_DURATION_PROVENANCE_VALIDATED")) {
        if (!selfAuthoritative) deny("BINDING_NOT_DURATION_PROVENANCE_VALIDATED", `${routeKey}: ${recorded}`);
      } else if (recorded === "ROUTE_HELD_FOR_CORRECTION") deny("ROUTE_HELD_FOR_CORRECTION", `${routeKey} is held for correction by its Phase 3 shard.`);
      else if (recorded === "ROUTE_LEGAL_OWNER_DECISION_REQUIRED") deny("ROUTE_LEGAL_OWNER_DECISION_REQUIRED", `${routeKey} awaits a legal-owner decision.`);
      else deny("ROUTE_NOT_OTHERWISE_PURCHASABLE", `${routeKey}: ${recorded}`);
    }
  }

  // Everything the evaluator already refused stays refused. This gate only ever
  // subtracts.
  if (!input.routePurchasableAtEvaluator) {
    deny("ROUTE_NOT_OTHERWISE_PURCHASABLE", "The route is not purchasable on the existing packet, deliverability and launch conditions.");
  }

  return { purchasable: denials.length === 0, denials, routeKey };
}
