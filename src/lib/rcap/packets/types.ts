// Packet-set model and the five independent readiness dimensions.
//
// Two things this file exists to make unrepresentable:
//
//   1. "One relief track equals one PDF." A packet set is an ordered set of
//      components — petition, proposed order, certificate of service, fee
//      waiver, instructions and so on — each with its own renderer strategy,
//      source, geographic scope and approval state.
//
//   2. "Technical success means legally ready." Research, technical, visual and
//      legal status are separate axes. A technical fixture can render, store
//      and download perfectly and still be nowhere near `packet_ready`, because
//      `packet_ready` additionally requires visual and legal approval that no
//      engineer or model may grant.
//
// Plan of record: docs/record-clearing/PLAN_OF_RECORD_RELIEF_TRACK_STRATEGY.md

export const PLAN_OF_RECORD_VERSION = "1.0.0";

/** The three approved output strategies. There is no fourth and no default. */
export type OutputStrategy = "custom_pleading" | "official_pdf_fill" | "process_guidance";

/**
 * The same three, at runtime.
 *
 * Exported so that every guard which asks "is this a renderer strategy?" asks it
 * of one list. A composition marker, an unresolved status and an omitted
 * strategy all fail this test, which is the only way they are meant to be
 * distinguished from the real three.
 */
export const OUTPUT_STRATEGIES: readonly OutputStrategy[] = [
  "custom_pleading",
  "official_pdf_fill",
  "process_guidance"
];

export type RendererStrategy =
  | "custom_pleading"
  | "acroform_fill"
  | "coordinate_overlay"
  | "unsupported_pending_conversion"
  | "process_guidance";

// ---------------------------------------------------------------------------
// Five independent status dimensions. Never merged into one field.
// ---------------------------------------------------------------------------

export type ResearchStatus =
  | "research_pending"
  | "primary_sources_found"
  | "research_draft_complete"
  | "authority_conflict";

export type TechnicalStatus =
  | "not_implemented"
  | "renderer_ready"
  | "technical_proof_passed"
  | "technical_proof_failed";

export type VisualStatus =
  | "not_reviewed"
  | "visual_review_pending"
  | "visual_review_passed"
  | "visual_review_failed";

export type LegalStatus =
  | "not_submitted"
  | "legal_review_pending"
  | "legal_approved"
  | "legal_rejected";

/**
 * What the platform can say about a track.
 *
 * `packet_ready` means LegalEase can reliably generate the correct forms and
 * instructions. It does not mean the participant is ready to file. They may
 * still need to obtain supporting records, complete fields left blank, sign,
 * notarize, pay a fee and serve parties. Those are participant filing
 * requirements, printed in the packet; none of them is an input to this status.
 *
 * There is deliberately no `filing_complete`. LegalEase never sees the
 * participant's final assembled filing, so it has nothing to base such a status
 * on, and claiming one would assert a fact about a court record we do not hold.
 * `FORBIDDEN_RUNTIME_STATUSES` keeps that decision enforced rather than assumed.
 */
export type RuntimeStatus =
  | "runtime_disabled"
  | "guidance_ready"
  | "packet_ready"
  | "stale_blocked"
  | "temporarily_disabled";

export const RUNTIME_STATUSES: readonly RuntimeStatus[] = [
  "runtime_disabled",
  "guidance_ready",
  "packet_ready",
  "stale_blocked",
  "temporarily_disabled"
];

/** Statuses that must never be added. See the note on `RuntimeStatus`. */
export const FORBIDDEN_RUNTIME_STATUSES: readonly string[] = [
  "filing_complete",
  "filed",
  "documents_verified",
  "eligibility_confirmed",
  "approved_by_staff"
];

export type GeographicScope =
  | "statewide"
  | "county"
  | "circuit"
  | "district"
  | "court_specific"
  | "agency_specific";

export type TrackStatuses = {
  research: ResearchStatus;
  technical: TechnicalStatus;
  visual: VisualStatus;
  legal: LegalStatus;
  /** Derived. Never authored directly — see computeRuntimeStatus. */
  runtime: RuntimeStatus;
};

// ---------------------------------------------------------------------------
// Packet set
// ---------------------------------------------------------------------------

export type PacketComponentRole =
  | "primary_filing"
  | "proposed_order"
  | "cover_sheet"
  | "certificate_of_service"
  | "affidavit"
  | "fee_waiver"
  | "attachment"
  | "continuation"
  | "instructions"
  | "local_addendum"
  | "process_guidance";

export type ComponentRequirement = "required" | "conditional";

export type PacketComponent = {
  /** Stable across versions. Used as the artifact key. */
  componentId: string;
  role: PacketComponentRole;
  outputStrategy: OutputStrategy;
  rendererStrategy: RendererStrategy;
  /** Approved template identity for pleading and guidance components. */
  templateId: string | null;
  /** Official source document for `official_pdf_fill` components. */
  sourcePath: string | null;
  sourceSha256: string | null;
  geographicScope: GeographicScope;
  requirement: ComponentRequirement;
  /** Participant-fact key that decides whether a conditional component renders. */
  conditionKey?: string;
  /** Position within the assembled packet. */
  order: number;
  approval: {
    visual: VisualStatus;
    legal: LegalStatus;
  };
  version: string;
  /** Flatten field appearances into page content. Only when the filing process requires it. */
  flatten?: boolean;
  /**
   * Regions of fixed printed language this component wants to cover and
   * rewrite. Declaring any region without a matching approved transformation
   * is refused by the overlay strategy.
   */
  redactionRegions?: readonly {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    replacementKey: string;
  }[];
  /**
   * Set only when a component is authorised to overwrite fixed language on an
   * official form. Absent means the overlay strategy must refuse to do so.
   */
  approvedTextTransformations?: readonly {
    id: string;
    reason: string;
    approvedBy: string;
  }[];
};

export type PacketSet = {
  packetSetId: string;
  version: string;
  components: readonly PacketComponent[];
};

// ---------------------------------------------------------------------------
// Relief track
// ---------------------------------------------------------------------------

export type RequiredInput = {
  key: string;
  label: string;
  required: boolean;
};

export type ReliefTrack = {
  jurisdiction: string;
  /** Stable relief-track identifier, unique within the jurisdiction. */
  trackId: string;
  publicName: string;
  /** Statutory or procedural mechanism. */
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  courtLevel: string;
  geographicScope: GeographicScope;
  /**
   * Normalized geography keys this track serves when scope is narrower than
   * statewide. Empty for statewide. A request outside this set fails closed.
   */
  geographyKeys: readonly string[];
  outputStrategy: OutputStrategy;
  packetSet: PacketSet;
  requiredInputs: readonly RequiredInput[];
  statuses: TrackStatuses;
  /** False withdraws readiness regardless of every other approval. */
  sourceCurrent: boolean;
  /**
   * A non-production fixture that exists only to prove the renderer, storage
   * and HTTP lifecycle. Never fulfils a real participant request.
   */
  technicalFixture: boolean;
  /** Hard off switch, independent of the computed runtime status. */
  runtimeDisabled: boolean;
  customerDeliverableDescription: string;
  notes?: string;
};

/**
 * The one place runtime readiness is decided.
 *
 * `packet_ready` requires source approved, technical proof passed, visual
 * review passed, legal approved, source current, and runtime enabled. Any
 * expiry or source change drops the track out of readiness automatically,
 * because this is recomputed rather than stored.
 *
 * Note the argument list: it takes no participant facts, no supporting
 * documents and no filing state. Readiness is a property of what LegalEase can
 * generate, not of how far along any one participant is.
 */
export function computeRuntimeStatus(track: {
  statuses: Omit<TrackStatuses, "runtime">;
  sourceCurrent: boolean;
  runtimeDisabled: boolean;
  outputStrategy: OutputStrategy;
  /**
   * Open legal questions counsel marked `release_blocker`.
   *
   * Engineering may build against them; the track may not ship while any is
   * open, however complete the build and however green the other gates. Absent
   * or zero means none are open — the parameter is optional so that existing
   * callers keep their meaning rather than silently acquiring a new gate.
   */
  openReleaseBlockers?: number;
}): RuntimeStatus {
  // Staleness is reported ahead of the disable switch: a changed source is a
  // withdrawal of readiness and is the more actionable answer.
  if (!track.sourceCurrent) return "stale_blocked";
  if (track.runtimeDisabled) return "runtime_disabled";
  if ((track.openReleaseBlockers ?? 0) > 0) return "runtime_disabled";

  const { research, technical, visual, legal } = track.statuses;

  if (legal === "legal_rejected" || visual === "visual_review_failed") {
    return "runtime_disabled";
  }

  const legallyApproved = legal === "legal_approved";
  const visuallyApproved = visual === "visual_review_passed";
  const technicallyProven = technical === "technical_proof_passed";
  const researchComplete = research === "research_draft_complete";

  if (!legallyApproved || !visuallyApproved || !technicallyProven || !researchComplete) {
    return "runtime_disabled";
  }

  // Process guidance is a real nationwide outcome, but it is never a filing
  // packet and must not be counted as one.
  return track.outputStrategy === "process_guidance" ? "guidance_ready" : "packet_ready";
}

/** True only for a track that may produce a court filing packet. */
export function isFilingPacketOutcome(strategy: OutputStrategy): boolean {
  return strategy === "custom_pleading" || strategy === "official_pdf_fill";
}

export function describeOutcome(strategy: OutputStrategy): string {
  switch (strategy) {
    case "custom_pleading":
      return "prepared court documents";
    case "official_pdf_fill":
      return "completed official forms";
    case "process_guidance":
      return "guided agency or administrative process";
  }
}
