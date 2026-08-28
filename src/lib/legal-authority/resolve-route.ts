/**
 * The one place a route's service outcome is decided.
 *
 * Every boundary that needs to know what a route does today — the evaluator,
 * final verification, the packet planner, the payment gate, the sponsorship
 * gate, Briefcase presentation — calls this and reads the answer. None of them
 * reconstructs a precondition, a gate or a branch from its own reading of the
 * contract, because two readings of the same contract disagree the first time
 * one of them is updated, and the disagreement is invisible until a participant
 * is told something wrong.
 */
import {
  legalRouteContract,
  routeDeliveryAuthority,
  routePaymentAuthority,
  type RouteDeliveryAuthority,
  type RoutePaymentAuthority
} from "@/lib/legal-authority/index";
import {
  NO_PARTICIPANT_FILING_OUTCOMES,
  type DeliveryGateKind,
  type FailureDisposition,
  type LegalRouteContract,
  type PacketReleasePrecondition,
  type RouteOutcomeMode,
  type ServiceBranch
} from "@/lib/legal-authority/types";

/** What the participant is actually served on this route today. */
export type ServiceDisposition =
  /** A personalised participant filing. */
  | "participant_packet"
  /** Process, verification or implementation guidance; nothing is filed. */
  | "process_guidance"
  /** The route is identified but its output does not exist yet. */
  | "identified_not_yet_available"
  /** A named fact is missing and the route cannot resolve without it. */
  | "needs_more_info"
  /** The matter leaves self-help. */
  | "handoff";

export type RouteResolutionInput = {
  jurisdiction: string;
  pathwayId: string;
  /**
   * Authenticated exact facts. Screening answers do not belong here: a branch
   * that decides which statute governs must not turn on a recalled date.
   */
  facts?: Record<string, string | undefined>;
  /** The matter's own clock. Required, never defaulted. */
  on: Date;
  /** Delivery gates the caller has confirmed satisfied. */
  closedGateKinds?: readonly DeliveryGateKind[];
  /** Whether an adopted authority answers this route's legal question. */
  legallyResolved?: boolean;
};

export type RouteResolution = {
  routeKey: string;
  /** Null when no contract governs this route; callers treat that as unchanged, never as authorised. */
  contract: LegalRouteContract | null;
  selectedBranchId: string | null;
  serviceDisposition: ServiceDisposition;
  outcomeMode: RouteOutcomeMode | null;
  packetFamily: string | null;
  requiredFacts: string[];
  missingFacts: string[];
  unmetPreconditions: PacketReleasePrecondition[];
  openDeliveryGates: DeliveryGateKind[];
  paymentAuthority: RoutePaymentAuthority | null;
  sponsorshipAuthority: "open" | "closed";
  generationAuthority: "open" | "closed";
  commercialDeliveryAuthority: "open" | "closed";
  failureDispositions: FailureDisposition[];
  delivery: RouteDeliveryAuthority | null;
  holdReason: string | null;
};

const parseDate = (value: string | undefined) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const at = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(at.getTime()) ? null : at;
};

/**
 * The branch a set of facts selects, plus the facts a selector needed and did
 * not get. A branch whose fact is missing does not silently lose: the route
 * reports the missing fact instead of quietly serving the default, because
 * serving the default is how a pre-effective-date matter is handed
 * post-effective-date guidance as though it were the right answer.
 */
function selectBranch(contract: LegalRouteContract, facts: Record<string, string | undefined>) {
  const branches = contract.serviceBranches ?? [];
  const missing: string[] = [];
  let selected: ServiceBranch | null = null;
  for (const branch of branches) {
    if (!branch.selector) continue;
    const raw = facts[branch.selector.factId];
    const value = parseDate(raw);
    if (!value) {
      if (!missing.includes(branch.selector.factId)) missing.push(branch.selector.factId);
      continue;
    }
    const boundary = parseDate(branch.selector.value);
    if (!boundary) continue;
    const matches = branch.selector.kind === "date_before"
      ? value.getTime() < boundary.getTime()
      : value.getTime() >= boundary.getTime();
    if (matches) { selected = branch; break; }
  }
  return { selected, missingSelectorFacts: missing };
}

export function resolveRoute(input: RouteResolutionInput): RouteResolution {
  const facts = input.facts ?? {};
  const contract = legalRouteContract(input.jurisdiction, input.pathwayId) ?? null;
  const routeKey = `${String(input.jurisdiction).trim().toUpperCase()}:${input.pathwayId}`;

  if (!contract) {
    return {
      routeKey,
      contract: null,
      selectedBranchId: null,
      serviceDisposition: "needs_more_info",
      outcomeMode: null,
      packetFamily: null,
      requiredFacts: [],
      missingFacts: [],
      unmetPreconditions: [],
      openDeliveryGates: [],
      paymentAuthority: null,
      sponsorshipAuthority: "closed",
      generationAuthority: "closed",
      commercialDeliveryAuthority: "closed",
      failureDispositions: [],
      delivery: null,
      holdReason: "no approved legal route contract governs this route"
    };
  }

  const { selected, missingSelectorFacts } = selectBranch(contract, facts);

  // Preconditions are unmet when the fact they name is absent. A precondition
  // has no "proceed on absence" branch by construction, so an absent one always
  // holds the packet closed.
  const unmetPreconditions = (contract.packetReleasePreconditions ?? [])
    .filter((precondition) => !String(facts[precondition.id] ?? "").trim());

  const missingFacts = [...new Set([
    ...missingSelectorFacts,
    ...unmetPreconditions.map((precondition) => precondition.id)
  ])];

  // Gate scoping. A gate named by any branch belongs to that branch alone; a
  // gate no branch names applies to the whole route. Without this, North
  // Dakota's artifact gate — which exists only for the unbuilt pre-2025
  // petition — would hold the post-2025 guidance branch too, closing the route
  // for the majority in order to describe the minority.
  const gateOwners = new Map<DeliveryGateKind, string[]>();
  for (const branch of contract.serviceBranches ?? []) {
    for (const kind of branch.branchDeliveryGates ?? []) {
      gateOwners.set(kind, [...(gateOwners.get(kind) ?? []), branch.id]);
    }
  }
  const gateApplies = (kind: DeliveryGateKind) => {
    const owners = gateOwners.get(kind);
    if (!owners || owners.length === 0) return true;
    return selected ? owners.includes(selected.id) : false;
  };
  const scopedGates = (contract.deliveryGates ?? []).filter((gate) => gateApplies(gate.kind));

  const effectiveContract: LegalRouteContract = selected
    ? { ...contract, outcomeMode: selected.outcomeMode, packetFamily: selected.packetFamily, deliveryGates: scopedGates }
    : { ...contract, deliveryGates: scopedGates };

  const delivery = routeDeliveryAuthority(effectiveContract, input.on, {
    legallyResolved: input.legallyResolved ?? true,
    closedGateKinds: input.closedGateKinds
  });

  const outcomeMode = effectiveContract.outcomeMode;
  const filesNothing = NO_PARTICIPANT_FILING_OUTCOMES.includes(outcomeMode);

  let serviceDisposition: ServiceDisposition;
  if (missingFacts.length > 0) {
    serviceDisposition = "needs_more_info";
  } else if (outcomeMode === "referral" || outcomeMode === "attorney_review_packet") {
    serviceDisposition = "handoff";
  } else if (filesNothing) {
    serviceDisposition = "process_guidance";
  } else if (delivery.generationAllowed) {
    serviceDisposition = "participant_packet";
  } else {
    // The route is identified and the participant does file something, but the
    // output is not available. This is not guidance: telling a pre-2025-08-01
    // North Dakota participant to verify an automatic closure that will not
    // happen would be a wrong answer presented as a complete one.
    serviceDisposition = "identified_not_yet_available";
  }

  return {
    routeKey,
    contract,
    selectedBranchId: selected?.id ?? null,
    serviceDisposition,
    outcomeMode,
    packetFamily: effectiveContract.packetFamily,
    requiredFacts: contract.requiredFacts,
    missingFacts,
    unmetPreconditions,
    openDeliveryGates: delivery.openDeliveryGates,
    paymentAuthority: routePaymentAuthority(effectiveContract),
    sponsorshipAuthority: delivery.sponsoredGenerationAllowed ? "open" : "closed",
    generationAuthority: delivery.generationAllowed ? "open" : "closed",
    commercialDeliveryAuthority: delivery.commerciallyDeliverable ? "open" : "closed",
    failureDispositions: contract.failureDisposition ?? [],
    delivery,
    holdReason: delivery.holdReason
  };
}
