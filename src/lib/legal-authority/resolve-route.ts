/**
 * The one place a route's service outcome is decided.
 *
 * WHAT CONSUMES IT TODAY, precisely: the canonical evaluator, for payment
 * authority, and the verifiers that enter through it. The final-verification
 * service, packet planner, checkout service, sponsorship service, render-job
 * authority and Briefcase presentation do NOT yet call it, and two of those do
 * not exist as separate modules at all. Saying otherwise would make this
 * comment the kind of claim the rest of this file exists to prevent.
 *
 * As each is wired it reads this answer rather than deriving its own — two
 * readings of one contract disagree the first time either changes, and the
 * disagreement is invisible until a participant is told something wrong.
 *
 * Everything conditional here goes through one expression language. Branch
 * selection, packet-release preconditions and failure dispositions were three
 * mechanisms with three failure modes; the worst was the precondition, which
 * tested presence and would have accepted "refused" as written consent.
 */
import {
  legalRouteContract,
  routeDeliveryAuthority,
  routePaymentAuthority,
  type RouteDeliveryAuthority,
  type RoutePaymentAuthority
} from "@/lib/legal-authority/index";
import {
  evaluateCondition,
  PHASE_ORDER,
  type Condition,
  type FactSnapshotMap,
  type LifecyclePhase
} from "@/lib/legal-authority/conditions";
import {
  NO_PARTICIPANT_FILING_OUTCOMES,
  type DeliveryGate,
  type FailureDisposition,
  type LegalRouteContract,
  type PacketReleasePrecondition,
  type RouteOutcomeMode,
  type ServiceBranch
} from "@/lib/legal-authority/types";

/** What the participant is actually served on this route today. */
export type ServiceDisposition =
  | "participant_packet"
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
  /** Facts with provenance. A bare value may not authorise anything. */
  facts?: FactSnapshotMap;
  /** The matter's own clock. Required, never defaulted. */
  on: Date;
  /** Where in the matter's life this resolution is being asked for. */
  phase: LifecyclePhase;
  /** Delivery gates a SERVER record reports satisfied, by gate id. */
  closedGateIds?: readonly string[];
  legallyResolved?: boolean;
  /** The matter this resolution is for. A fact from another matter is refused. */
  matterId?: string;
  /** The authenticated owner. A fact owned by someone else is refused. */
  ownerUserId?: string;
};

export type RouteResolution = {
  routeKey: string;
  contract: LegalRouteContract | null;
  selectedBranchId: string | null;
  serviceDisposition: ServiceDisposition;
  outcomeMode: RouteOutcomeMode | null;
  packetFamily: string | null;
  requiredFacts: string[];
  missingFacts: string[];
  unsatisfiedPreconditions: Array<{ precondition: PacketReleasePrecondition; reason: string }>;
  /** Preconditions that cannot yet be proved at this phase. Not failures. */
  notYetApplicablePreconditions: Array<{ precondition: PacketReleasePrecondition; reason: string }>;
  openDeliveryGates: DeliveryGate[];
  openDeliveryGateIds: string[];
  paymentAuthority: RoutePaymentAuthority | null;
  sponsorshipAuthority: "open" | "closed";
  generationAuthority: "open" | "closed";
  commercialDeliveryAuthority: "open" | "closed";
  /** The one failure condition that is true, or null. Never a list of maybes. */
  selectedFailureDisposition: FailureDisposition | null;
  failureDispositions: FailureDisposition[];
  rejectedFacts: Array<{ factId: string; reason: string }>;
  delivery: RouteDeliveryAuthority | null;
  holdReason: string | null;
  phase: LifecyclePhase;
};

/**
 * Facts that do not belong to this matter and this owner are dropped before
 * anything reads them. A snapshot carrying another matter's id is not a weaker
 * fact; it is somebody else's, and using it would decide this participant's
 * route from a stranger's record.
 */
function admissibleFacts(input: RouteResolutionInput) {
  const facts: FactSnapshotMap = {};
  const rejectedFacts: Array<{ factId: string; reason: string }> = [];
  for (const [factId, snapshot] of Object.entries(input.facts ?? {})) {
    if (!snapshot) continue;
    if (input.matterId && snapshot.matterId && snapshot.matterId !== input.matterId) {
      rejectedFacts.push({ factId, reason: `the snapshot belongs to matter ${snapshot.matterId}, not ${input.matterId}` });
      continue;
    }
    if (input.ownerUserId && snapshot.ownerUserId && snapshot.ownerUserId !== input.ownerUserId) {
      rejectedFacts.push({ factId, reason: "the snapshot belongs to another participant" });
      continue;
    }
    facts[factId] = snapshot;
  }
  return { facts, rejectedFacts };
}

function firstSatisfied<T extends { selector?: Condition }>(
  candidates: readonly T[],
  facts: FactSnapshotMap,
  phase: LifecyclePhase
) {
  const missing: string[] = [];
  for (const candidate of candidates) {
    if (!candidate.selector) continue;
    const result = evaluateCondition(candidate.selector, facts, phase);
    if (result.satisfied) return { selected: candidate, missing: [] as string[] };
    for (const factId of result.missingFactIds) if (!missing.includes(factId)) missing.push(factId);
  }
  return { selected: null as T | null, missing };
}

export function resolveRoute(input: RouteResolutionInput): RouteResolution {
  const contract = legalRouteContract(input.jurisdiction, input.pathwayId) ?? null;
  const routeKey = `${String(input.jurisdiction).trim().toUpperCase()}:${input.pathwayId}`;
  const { facts, rejectedFacts } = admissibleFacts(input);

  if (!contract) {
    return {
      routeKey, contract: null, selectedBranchId: null,
      serviceDisposition: "needs_more_info", outcomeMode: null, packetFamily: null,
      requiredFacts: [], missingFacts: [], unsatisfiedPreconditions: [], notYetApplicablePreconditions: [],
      openDeliveryGates: [], openDeliveryGateIds: [],
      paymentAuthority: null, sponsorshipAuthority: "closed",
      generationAuthority: "closed", commercialDeliveryAuthority: "closed",
      selectedFailureDisposition: null, failureDispositions: [], rejectedFacts,
      delivery: null, holdReason: "no approved legal route contract governs this route",
      phase: input.phase
    };
  }

  const branches = contract.serviceBranches ?? [];
  const branchPick = firstSatisfied(branches, facts, input.phase);
  const selected: ServiceBranch | null = branchPick.selected;

  // The failure that is actually true, not the list of ones that could be.
  const failurePick = firstSatisfied(contract.failureDisposition ?? [], facts, input.phase);
  const selectedFailure: FailureDisposition | null = failurePick.selected;

  // Preconditions are truth tests. An unsatisfied one holds the packet closed
  // and says which fact and which value failed it.
  //
  // A precondition that may only decide from a later phase is a third state,
  // neither satisfied nor failed: during anonymous screening a consent document
  // cannot be proved, and treating that as a failure would tell every Georgia
  // participant they had been refused. It closes commercial actions — nothing
  // is sold before consent can be proved — without producing a handoff.
  const unsatisfiedPreconditions: Array<{ precondition: PacketReleasePrecondition; reason: string }> = [];
  const notYetApplicablePreconditions: Array<{ precondition: PacketReleasePrecondition; reason: string }> = [];
  const preconditionMissing: string[] = [];
  for (const precondition of contract.packetReleasePreconditions ?? []) {
    const requiredPhase = precondition.satisfiedWhen.requiredPhase;
    if (requiredPhase && PHASE_ORDER.indexOf(input.phase) < PHASE_ORDER.indexOf(requiredPhase)) {
      notYetApplicablePreconditions.push({ precondition, reason: `${precondition.id} is proved at ${requiredPhase}, not at ${input.phase}` });
      continue;
    }
    const result = evaluateCondition(precondition.satisfiedWhen, facts, input.phase);
    if (result.satisfied) continue;
    unsatisfiedPreconditions.push({ precondition, reason: result.reason ?? "unsatisfied" });
    for (const factId of result.missingFactIds) if (!preconditionMissing.includes(factId)) preconditionMissing.push(factId);
  }

  // A missing branch-selector fact only blocks where the branches are
  // exhaustive. Where they are exceptions to a default, the participant who
  // triggers none of them is the ordinary case, not an incomplete one.
  const branchMissing = contract.branchSelectionRequired === true && !selected ? branchPick.missing : [];
  const missingFacts = [...new Set([...branchMissing, ...preconditionMissing])];

  // Gate scoping by id. A gate named by a branch belongs to that branch alone;
  // a gate no branch names applies to the route.
  const gateOwners = new Map<string, string[]>();
  for (const branch of branches) {
    for (const gateId of branch.branchDeliveryGateIds ?? []) {
      gateOwners.set(gateId, [...(gateOwners.get(gateId) ?? []), branch.id]);
    }
  }
  const closedIds = new Set(input.closedGateIds ?? []);
  const scopedGates = (contract.deliveryGates ?? []).filter((gate) => {
    const owners = gateOwners.get(gate.id);
    if (owners && owners.length > 0) return selected ? owners.includes(selected.id) : false;
    return true;
  });
  const openGates = scopedGates.filter((gate) => !closedIds.has(gate.id));

  const effectiveContract: LegalRouteContract = selected
    ? {
        ...contract,
        outcomeMode: selected.outcomeMode,
        packetFamily: selected.packetFamily,
        ...(selected.stage ? { stage: selected.stage } : {}),
        ...(selected.packetComponents ? { packetComponents: selected.packetComponents } : {}),
        // A branch that states its own posture replaces the parent's; one that
        // does not inherits it.
        ...(selected.commercialPosture ? { commercialPosture: selected.commercialPosture } : {}),
        deliveryGates: openGates
      }
    : { ...contract, deliveryGates: openGates };

  const delivery = routeDeliveryAuthority(effectiveContract, input.on, {
    legallyResolved: input.legallyResolved ?? true,
    closedGateKinds: []
  });

  const outcomeMode = effectiveContract.outcomeMode;
  const filesNothing = NO_PARTICIPANT_FILING_OUTCOMES.includes(outcomeMode);
  const packetHeld = unsatisfiedPreconditions.length > 0;

  let serviceDisposition: ServiceDisposition;
  if (selectedFailure) {
    // A true failure condition decides the outcome. This is the difference
    // between a disposition that is recorded and one that happens.
    serviceDisposition = selectedFailure.disposition === "implementation_tracking"
      ? "process_guidance"
      : selectedFailure.disposition === "agency_correction"
        ? "process_guidance"
        : "handoff";
  } else if (missingFacts.length > 0) {
    serviceDisposition = "needs_more_info";
  } else if (packetHeld) {
    serviceDisposition = unsatisfiedPreconditions
      .some((entry) => entry.precondition.whenUnsatisfied === "fail_closed_handoff")
      ? "handoff"
      : "process_guidance";
  } else if (outcomeMode === "referral" || outcomeMode === "attorney_review_packet") {
    serviceDisposition = "handoff";
  } else if (filesNothing) {
    serviceDisposition = "process_guidance";
  } else if (delivery.generationAllowed) {
    serviceDisposition = "participant_packet";
  } else {
    serviceDisposition = "identified_not_yet_available";
  }

  const packetActionsClosed = packetHeld
    || Boolean(selectedFailure)
    || notYetApplicablePreconditions.length > 0
    || missingFacts.length > 0;

  // The raw delivery view does not know about preconditions or failures, so a
  // consumer reading delivery.paymentAllowed directly would have opened checkout
  // on a Georgia petition with no consent. The corrected view is what callers
  // get; the raw one is not returned.
  const correctedDelivery: RouteDeliveryAuthority = {
    ...delivery,
    generationAllowed: delivery.generationAllowed && !packetActionsClosed,
    paymentAllowed: delivery.paymentAllowed && !packetActionsClosed,
    sponsoredGenerationAllowed: delivery.sponsoredGenerationAllowed && !packetActionsClosed,
    commerciallyDeliverable: delivery.commerciallyDeliverable && !packetActionsClosed
  };

  return {
    routeKey,
    contract,
    selectedBranchId: selected?.id ?? null,
    serviceDisposition,
    outcomeMode,
    packetFamily: effectiveContract.packetFamily,
    requiredFacts: selected?.requiredFacts ?? contract.requiredFacts,
    missingFacts,
    unsatisfiedPreconditions,
    openDeliveryGates: openGates,
    openDeliveryGateIds: openGates.map((gate) => gate.id),
    paymentAuthority: packetActionsClosed ? "closed" : routePaymentAuthority(effectiveContract),
    sponsorshipAuthority: correctedDelivery.sponsoredGenerationAllowed ? "open" : "closed",
    generationAuthority: correctedDelivery.generationAllowed ? "open" : "closed",
    commercialDeliveryAuthority: correctedDelivery.commerciallyDeliverable ? "open" : "closed",
    selectedFailureDisposition: selectedFailure,
    failureDispositions: contract.failureDisposition ?? [],
    rejectedFacts,
    delivery: correctedDelivery,
    notYetApplicablePreconditions,
    holdReason: selectedFailure
      ? `${selectedFailure.when} — ${selectedFailure.disposition}`
      : unsatisfiedPreconditions[0]?.reason ?? delivery.holdReason,
    phase: input.phase
  };
}
