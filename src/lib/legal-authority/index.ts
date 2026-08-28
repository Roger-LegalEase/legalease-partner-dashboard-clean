import {
  NO_PARTICIPANT_FILING_OUTCOMES,
  PACKET_BEARING_OUTCOMES,
  type DeliveryGateKind,
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
import nationalReportRoutes from "@/lib/legal-authority/routes/national-report-2026-08-28.json";

/**
 * The approved authority, assembled once.
 *
 * The route files are split along the same seams the implementation is
 * committed in — P0/effective-date, Mississippi, route splits, single routes,
 * and the 2026-08-28 national report — so a batch can be reverted on its own
 * without leaving the registry half-applied.
 *
 * Order matters. ROUTE_BY_KEY is built by Map insertion, so a later file's
 * contract for the same routeKey replaces an earlier one. The national report
 * is the latest authority, so it sits last and its decisions govern.
 */
const ROUTE_FILES = [p0Routes, mississippiRoutes, routeSplitRoutes, singleRoutes, nationalReportRoutes] as unknown as Array<{
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

/**
 * What a route may actually do today, as distinct from what the law says.
 *
 * The national report of 2026-08-28 is explicit that these are different
 * questions: "A resolved legal question does not automatically make a route
 * commercially ready." So none of the four allow-flags below is set by legal
 * resolution. Each is derived from the payment authority, the open delivery
 * gates and the effective-date gate, and every one of them fails closed.
 */
export type RouteDeliveryAuthority = {
  /** True when an adopted authority answers this route's legal question. */
  legallyResolved: boolean;
  /** Gates still standing between that answer and a releasable route. */
  openDeliveryGates: DeliveryGateKind[];
  /** May a packet artifact be generated at all. */
  generationAllowed: boolean;
  /** May consumer checkout open. */
  paymentAllowed: boolean;
  /** May a sponsored generation consume a partner credit. */
  sponsoredGenerationAllowed: boolean;
  /** May a finished packet be handed to a participant. */
  commerciallyDeliverable: boolean;
  /** The first reason delivery is held, or null when nothing holds it. */
  holdReason: string | null;
  /** Every reason, in the order found. A single reason hides the rest. */
  holdReasons: string[];
  effectiveDateStatus: "in_force" | "future_effective" | "unknown";
};

/**
 * Gates that stop a packet being generated at all, not merely sold.
 *
 * artifact_legal_review is deliberately NOT here. Its whole purpose is that a
 * candidate must be rendered for counsel to review, so a gate that blocked
 * generation would make itself impossible to close.
 */
const GENERATION_BLOCKING_GATES: readonly DeliveryGateKind[] = [
  "source_acquisition",
  "local_filing_configuration",
  "artifact_generation",
  "future_effective"
];

/** Gates that permit a candidate to exist but stop it reaching a participant. */
const DELIVERY_BLOCKING_GATES: readonly DeliveryGateKind[] = [
  "artifact_legal_review",
  "scheduled_legal_reread"
];

/**
 * Delivery authority for a route on a given day.
 *
 * `on` is required rather than defaulted to now: a route whose availability
 * depends on a date must be evaluated against the matter's own clock, and a
 * hidden `new Date()` is how a future-effective route goes live in one caller
 * and not another.
 *
 * Every flag fails closed, and each of the seven rules below exists because the
 * opposite would ship something:
 *
 *   an unresolved legal question closes everything, because a route nobody has
 *   decided is not a route anyone may sell;
 *   a null packet family closes generation, because there is no packet to
 *   personalise and a renderer asked for one would invent it;
 *   a no-participant-filing outcome closes generation, because the participant
 *   files nothing and a generated filing would be a document with no purpose;
 *   a declared commercial posture may close what the derivation opens and never
 *   the reverse.
 */
export function routeDeliveryAuthority(
  route: LegalRouteContract,
  on: Date,
  options: { legallyResolved?: boolean; closedGateKinds?: readonly DeliveryGateKind[] } = {}
): RouteDeliveryAuthority {
  const legallyResolved = options.legallyResolved ?? true;
  const closed = new Set(options.closedGateKinds ?? []);
  // A gate the caller reports satisfied is no longer open. Everything else
  // declared on the contract still is: an undeclared status is not a closed one.
  const openDeliveryGates = (route.deliveryGates ?? [])
    .map((gate) => gate.kind)
    .filter((kind) => !closed.has(kind));
  const payment = routePaymentAuthority(route);

  const notBefore = route.effectiveDateGate?.notBefore;
  let effectiveDateStatus: RouteDeliveryAuthority["effectiveDateStatus"] = "in_force";
  if (notBefore) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(notBefore)) effectiveDateStatus = "unknown";
    else {
      const at = new Date(`${notBefore}T00:00:00.000Z`);
      effectiveDateStatus = Number.isNaN(at.getTime()) ? "unknown"
        : on.getTime() >= at.getTime() ? "in_force" : "future_effective";
    }
  }
  if (!routeRuleInForceOn(route, on)) effectiveDateStatus = "future_effective";

  const holds: string[] = [];
  if (!legallyResolved) holds.push("the route's legal question is not resolved");
  if (effectiveDateStatus !== "in_force") {
    holds.push(effectiveDateStatus === "future_effective"
      ? `the rule is not operative before ${notBefore ?? route.effectiveFrom}`
      : `the effective date ${notBefore ?? route.effectiveFrom} cannot be read`);
  }
  for (const kind of openDeliveryGates) {
    const gate = (route.deliveryGates ?? []).find((candidate) => candidate.kind === kind);
    holds.push(`${kind} is open: ${(gate?.items ?? []).join("; ")}`);
  }
  if (route.artifactApprovalRequired) holds.push("a rendered candidate and hash must be reviewed before release");
  if (payment !== "packet_checkout") holds.push(`payment authority is ${payment}`);
  if (route.packetFamily === null) holds.push("the route binds no packet family, so there is nothing to personalise");

  const dateClear = effectiveDateStatus === "in_force";
  const generationBlocked = openDeliveryGates.some((kind) => GENERATION_BLOCKING_GATES.includes(kind));
  const deliveryBlocked = openDeliveryGates.some((kind) => DELIVERY_BLOCKING_GATES.includes(kind));

  const generationAllowed = legallyResolved
    && dateClear
    && !generationBlocked
    && route.packetFamily !== null
    && !NO_PARTICIPANT_FILING_OUTCOMES.includes(route.outcomeMode);

  const paymentAllowed = legallyResolved
    && dateClear
    && payment === "packet_checkout"
    && !generationBlocked
    && !deliveryBlocked;

  // A sponsored generation spends a partner credit, so it needs what a paid one
  // needs except the consumer checkout. Guidance is never sponsored.
  const sponsoredGenerationAllowed = generationAllowed && payment !== "closed" && !deliveryBlocked;

  const commerciallyDeliverable = paymentAllowed
    && generationAllowed
    && !route.artifactApprovalRequired;

  // The declared posture is a one-way valve: it may close what the derivation
  // opens, never open what the derivation closes.
  const posture = route.commercialPosture;
  const finalPayment = paymentAllowed && (posture ? posture.checkoutEnabled : true);
  const finalSponsored = sponsoredGenerationAllowed && (posture ? posture.sponsoredGenerationEnabled : true);
  const finalDeliverable = commerciallyDeliverable && (posture ? posture.checkoutEnabled : true);
  if (posture && !posture.checkoutEnabled && paymentAllowed) holds.push(`the declared commercial posture closes checkout: ${posture.note}`);

  return {
    legallyResolved,
    openDeliveryGates,
    generationAllowed,
    paymentAllowed: finalPayment,
    sponsoredGenerationAllowed: finalSponsored,
    commerciallyDeliverable: finalDeliverable,
    holdReason: holds[0] ?? null,
    holdReasons: holds,
    effectiveDateStatus
  };
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
    // A precondition collected in anonymous screening cannot gate a packet: the
    // participant has not authenticated, so nothing said there is reliable
    // enough to open one. The report is explicit that written prosecutor
    // consent is not collected in anonymous screening.
    for (const precondition of route.packetReleasePreconditions ?? []) {
      if (precondition.collectedAt === "anonymous_screening") {
        fail(routeKey, "precondition_in_anonymous_screening", `${precondition.id} gates packet release on an answer given before authentication`);
      }
      if (!precondition.requires.trim()) fail(routeKey, "precondition_without_requirement", `${precondition.id} names no condition to satisfy`);
    }

    // A declared commercial posture may close what the derived authority opens,
    // never open what it closes. Storing "checkout enabled" on a route the
    // outcome mode closes is the exact combination the derived-payment design
    // exists to make unrepresentable.
    if (route.commercialPosture?.checkoutEnabled && payment !== "packet_checkout") {
      fail(routeKey, "declared_checkout_on_closed_route", `commercialPosture opens checkout on a route whose payment authority is ${payment}`);
    }
    if (route.commercialPosture && route.commercialPosture.packetCreditsConsumed > 0 && payment === "closed") {
      fail(routeKey, "credits_on_closed_route", "a route with no packet may not consume a sponsored packet credit");
    }
    if (route.commercialPosture?.sponsoredGenerationEnabled && payment === "closed") {
      fail(routeKey, "sponsored_generation_on_closed_route", "sponsored generation may not run on a route that sells no packet");
    }

    // A future effective date and an open checkout cannot both be declared.
    if (route.effectiveDateGate?.notBefore && route.commercialPosture?.checkoutEnabled) {
      fail(routeKey, "checkout_before_effective_date", `checkout is declared open while the rule is gated to ${route.effectiveDateGate.notBefore}`);
    }

    // A service branch records a different outcome on the same statute. One
    // that binds a packet family its outcome mode cannot carry is the same
    // defect the top-level check catches, one level down.
    for (const branch of route.serviceBranches ?? []) {
      if (branch.packetFamily !== null && !PACKET_BEARING_OUTCOMES.includes(branch.outcomeMode)) {
        fail(routeKey, "branch_packet_on_non_packet_outcome", `service branch ${branch.id} binds a packet to a ${branch.outcomeMode} outcome`);
      }
      if (!branch.when.trim()) fail(routeKey, "branch_without_condition", `service branch ${branch.id} names no condition`);
    }

    for (const gate of route.deliveryGates ?? []) {
      if (gate.items.length === 0) fail(routeKey, "delivery_gate_without_items", `${gate.kind} names nothing that would close it`);
      if (!gate.owner.trim()) fail(routeKey, "delivery_gate_without_owner", `${gate.kind} names no owner`);
    }

    for (const deadline of route.processingDeadlines ?? []) {
      if (!deadline.note.trim()) fail(routeKey, "processing_deadline_unlabelled", `${deadline.label} must say why it is not a participant wait`);
    }
  }

  return violations;
}

export type { LegalRouteContract, LegalAuthorityDecision, RouteOutcomeMode, RouteStage };
