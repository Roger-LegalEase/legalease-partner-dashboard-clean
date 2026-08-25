import {
  NO_PARTICIPANT_FILING_OUTCOMES,
  PACKET_BEARING_OUTCOMES,
  type LegalAuthorityBundle,
  type LegalAuthorityDecision,
  type LegalRouteContract,
  type RouteOutcomeMode,
  type RouteStage
} from "@/lib/legal-authority/types";

import authority from "@/lib/legal-authority/authority.json";
import p0Routes from "@/lib/legal-authority/routes/p0.json";
import mississippiRoutes from "@/lib/legal-authority/routes/mississippi.json";
import routeSplitRoutes from "@/lib/legal-authority/routes/route-splits.json";
import singleRoutes from "@/lib/legal-authority/routes/single-routes.json";

/**
 * The approved authority, assembled once.
 *
 * The route files are split along the same seams the implementation is
 * committed in — P0/effective-date, Mississippi, route splits, single routes —
 * so a batch can be reverted on its own without leaving the registry
 * half-applied.
 */
const ROUTE_FILES = [p0Routes, mississippiRoutes, routeSplitRoutes, singleRoutes] as unknown as Array<{
  routes: LegalRouteContract[];
}>;

export const LEGAL_AUTHORITY: LegalAuthorityBundle = {
  ...(authority as unknown as Omit<LegalAuthorityBundle, "routes">),
  routes: ROUTE_FILES.flatMap((file) => file.routes)
};

const ROUTE_BY_KEY: ReadonlyMap<string, LegalRouteContract> = new Map(
  LEGAL_AUTHORITY.routes.map((route) => [route.routeKey, route])
);

const DECISION_BY_ID: ReadonlyMap<string, LegalAuthorityDecision> = new Map(
  LEGAL_AUTHORITY.decisions.map((decision) => [decision.id, decision])
);

export function routeKeyFor(jurisdiction: string, pathwayId: string) {
  return `${String(jurisdiction ?? "").trim().toUpperCase()}:${String(pathwayId ?? "").trim()}`;
}

/**
 * The contract for a route, or undefined when this route carries no approved
 * decision. Undefined is not "no constraints": callers treat an unknown route
 * as unchanged by this authority, never as authorised.
 */
export function legalRouteContract(jurisdiction: string, pathwayId: string): LegalRouteContract | undefined {
  return ROUTE_BY_KEY.get(routeKeyFor(jurisdiction, pathwayId));
}

export function legalAuthorityDecision(decisionId: string) {
  return DECISION_BY_ID.get(decisionId);
}

export function routesForDecision(decisionId: string) {
  return LEGAL_AUTHORITY.routes.filter((route) => route.decisionId === decisionId);
}

export function routesForJurisdiction(jurisdiction: string) {
  const code = String(jurisdiction ?? "").trim().toUpperCase();
  return LEGAL_AUTHORITY.routes.filter((route) => route.jurisdiction === code);
}

export type RoutePaymentAuthority =
  /** A paid participant packet is the authorised output for this route. */
  | "packet_checkout"
  /** A packet exists but may not be sold until counsel has reviewed the matter. */
  | "attorney_review_required"
  /** No paid packet on this route, at this stage. */
  | "closed";

/**
 * Payment authority is DERIVED, never stored.
 *
 * Storing it would allow a contract to declare an automatic route sellable, and
 * that exact combination is what the directive forbids and what shipped before
 * (an automatic set-aside steered to checkout). Deriving it means the only way
 * to open checkout is to declare, in the same object, that the participant
 * actually files something at this stage.
 */
export function routePaymentAuthority(route: LegalRouteContract): RoutePaymentAuthority {
  if (NO_PARTICIPANT_FILING_OUTCOMES.includes(route.outcomeMode)) return "closed";
  if (route.stage === "active_case_admission" || route.stage === "automatic" || route.stage === "enforcement") return "closed";
  if (route.packetFamily === null) return "closed";
  if (route.outcomeMode === "attorney_review_packet") return "attorney_review_required";
  return "packet_checkout";
}

/** True when checkout, packet credit and render jobs must all stay closed. */
export function routeCheckoutIsClosed(route: LegalRouteContract) {
  return routePaymentAuthority(route) !== "packet_checkout";
}

/**
 * True when the route's relief happens without the participant filing anything.
 * Kept separate from `routeCheckoutIsClosed` because they answer different
 * questions: an active-case admission stage is not automatic, but neither sells.
 */
export function routeIsAutomaticOrNoFiling(route: LegalRouteContract) {
  return route.outcomeMode === "automatic_relief"
    || route.outcomeMode === "guidance_status"
    || route.stage === "automatic";
}

/**
 * Whether this route's rule is in force on the given day.
 *
 * Fail-closed on both sides: an unparseable `effectiveFrom` is treated as not
 * yet in force rather than assumed current, because the failure a wrong answer
 * causes here is a participant told they may file under a rule that does not
 * govern their filing.
 */
export function routeRuleInForceOn(route: LegalRouteContract, on: Date): boolean {
  if (!route.effectiveFrom) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(route.effectiveFrom)) return false;
  const effective = new Date(`${route.effectiveFrom}T00:00:00.000Z`);
  if (Number.isNaN(effective.getTime())) return false;
  return on.getTime() >= effective.getTime();
}

export type RouteContractViolation = {
  routeKey: string;
  code: string;
  message: string;
};

/**
 * Every structural rule the approved authority states, checked as data.
 *
 * This runs in the focused verifiers rather than only at review time, because
 * each rule below corresponds to a defect that reached production once already.
 */
export function assertRouteContractInvariants(routes: readonly LegalRouteContract[]): RouteContractViolation[] {
  const violations: RouteContractViolation[] = [];
  const seen = new Set<string>();
  const fail = (routeKey: string, code: string, message: string) => violations.push({ routeKey, code, message });

  for (const route of routes) {
    const { routeKey } = route;
    if (seen.has(routeKey)) fail(routeKey, "duplicate_route_key", "two contracts claim the same route");
    seen.add(routeKey);

    if (routeKey !== routeKeyFor(route.jurisdiction, route.pathwayId)) {
      fail(routeKey, "route_key_mismatch", `routeKey does not equal ${routeKeyFor(route.jurisdiction, route.pathwayId)}`);
    }
    if (!route.statute.trim()) fail(routeKey, "missing_statute", "a route contract must name exactly one controlling statute");
    if (route.requiredFacts.length === 0) fail(routeKey, "no_required_facts", "the approved decision names the facts this route must collect");
    if (!route.timing.anchorText.trim()) fail(routeKey, "missing_anchor_text", "the clock anchor must be stated in the approved wording");

    const hasDuration = typeof route.timing.value === "number";
    if (route.timing.kind === "elapsed_eligibility_clock" || route.timing.kind === "lookback" || route.timing.kind === "filing_deadline") {
      if (!hasDuration || !route.timing.unit) {
        fail(routeKey, "duration_missing", `${route.timing.kind} requires a value and unit`);
      }
      if (route.timing.kind === "elapsed_eligibility_clock" && !route.timing.anchorFactId) {
        fail(routeKey, "anchor_fact_missing", "an elapsed eligibility clock must name the fact it runs from");
      }
    }
    if ((route.timing.kind === "event_trigger" || route.timing.kind === "none") && hasDuration) {
      fail(routeKey, "duration_on_event_route", "an event-triggered route must not carry an elapsed duration");
    }

    const payment = routePaymentAuthority(route);
    if (payment === "packet_checkout" && NO_PARTICIPANT_FILING_OUTCOMES.includes(route.outcomeMode)) {
      fail(routeKey, "checkout_on_no_filing_route", "checkout must stay closed where the participant files nothing");
    }
    if (payment === "packet_checkout" && route.stage === "active_case_admission") {
      fail(routeKey, "checkout_on_active_admission", "an active-case admission stage must not open consumer checkout");
    }
    if (route.packetFamily !== null && !PACKET_BEARING_OUTCOMES.includes(route.outcomeMode)) {
      fail(routeKey, "packet_bound_to_non_packet_outcome", `${route.outcomeMode} routes must not bind a participant packet family`);
    }
    if (route.packetFamily === null && PACKET_BEARING_OUTCOMES.includes(route.outcomeMode)) {
      fail(routeKey, "packet_outcome_without_family", "a packet-bearing outcome must name the approved packet family");
    }
    for (const deadline of route.processingDeadlines ?? []) {
      if (!deadline.note.trim()) fail(routeKey, "processing_deadline_unlabelled", `${deadline.label} must say why it is not a participant wait`);
    }
  }

  return violations;
}

export type { LegalRouteContract, LegalAuthorityDecision, RouteOutcomeMode, RouteStage };
