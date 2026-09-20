/**
 * The controlling legal decisions of 2026-08-28, as route effects.
 *
 * The decision record at
 * `data/record-clearing/legal-decisions/2026-08-28-controlling-decisions.json`
 * is the authority. This module is its executable projection: the gates, splits,
 * fee figures and retirements the product has to honour, in a form the route
 * contract and the packet layer can read.
 *
 * It never edits the imported hash-bound memos. The memos record what the law
 * said as of 2026-08-02; this records what the decision owner decided as of
 * 2026-08-28, and the two sit beside each other.
 */

export const CONTROLLING_DECISION_RECORD =
  "data/record-clearing/legal-decisions/2026-08-28-controlling-decisions.json";
export const REVIEWED_THROUGH = "2026-08-28";

export type RouteOutcome =
  | { kind: "packet"; family: string; unit: string }
  | { kind: "process_guidance"; reason: string }
  | { kind: "handoff"; to: "attorney_or_prosecutor" | "retained_counsel"; reason: string }
  | { kind: "implementation_tracking"; reason: string };

// ---------------------------------------------------------------------------
// Georgia — ga-rfo
// ---------------------------------------------------------------------------

export type GeorgiaRfoFacts = {
  /** Written prosecutorial consent. Anything short of written is not consent. */
  prosecutorConsent: "written" | "refused" | "silent" | "none";
  /** A qualifying order already granted, with its date. */
  qualifyingOrderDate?: string | null;
};

/** The date from which a qualifying order routes to implementation tracking. */
export const GEORGIA_RESTRICTION_IMPLEMENTATION_FROM = "2026-07-01";

export function georgiaRfoOutcome(facts: GeorgiaRfoFacts): RouteOutcome {
  // A granted order is not re-petitioned. After 1 July 2026 it moves to
  // restriction and sealing implementation and tracking, never to a second
  // sealing petition.
  if (facts.qualifyingOrderDate) {
    if (facts.qualifyingOrderDate >= GEORGIA_RESTRICTION_IMPLEMENTATION_FROM) {
      return {
        kind: "implementation_tracking",
        reason: "A qualifying order dated on or after 2026-07-01 moves to restriction and sealing implementation and tracking, not a second sealing petition."
      };
    }
    return {
      kind: "implementation_tracking",
      reason: "An order has already been granted. The route is implementation and tracking, not a further petition."
    };
  }

  // Consent is a prerequisite, not the relief. Silence is not consent.
  if (facts.prosecutorConsent !== "written") {
    return {
      kind: "handoff",
      to: "attorney_or_prosecutor",
      reason: "The O.C.G.A. § 42-8-66 petition requires written prosecutorial consent. Without it the route is an attorney or prosecutor handoff."
    };
  }

  return {
    kind: "packet",
    family: "rcap-ga-guidance-implementation",
    unit: "ga-rfo-participant-petition"
  };
}

/** Venue for the Georgia § 42-8-66 petition. */
export const GEORGIA_RFO_VENUE = "court_of_conviction" as const;

// ---------------------------------------------------------------------------
// Missouri — mo-311-326-minor-in-possession
// ---------------------------------------------------------------------------

export type MissouriFilingCode = "XG" | "X5" | "X1";

export type MissouriCodeDisposition =
  | { allowed: true; provisional: true; note: string }
  | { allowed: true; provisional: false; note: string }
  | { allowed: false; note: string };

export function missouriFilingCodeDisposition(
  code: MissouriFilingCode,
  clerkDirected: boolean
): MissouriCodeDisposition {
  if (code === "X5") {
    return { allowed: false, note: "X5 is prohibited." };
  }
  if (code === "X1") {
    return clerkDirected
      ? { allowed: true, provisional: false, note: "X1 is used only when the receiving clerk directs it." }
      : { allowed: false, note: "X1 is used only when the receiving clerk directs it." };
  }
  return { allowed: true, provisional: true, note: "XG is provisional pending receiving-clerk confirmation." };
}

/** The filing model for the § 311.326 petition. */
export const MISSOURI_311_326_FILING_MODEL = "new_miscellaneous_civil_matter" as const;

export type MissouriConvictionOrigin =
  | { kind: "state"; statute: "311.325" }
  | { kind: "municipal_ordinance"; expresslyAdopts311326: boolean };

export function missouri311326Scope(origin: MissouriConvictionOrigin): {
  inScope: boolean;
  route: "311.326" | "local_route" | "610.140_analysis_or_local_law_review";
  reason: string;
} {
  if (origin.kind === "state") {
    return { inScope: true, route: "311.326", reason: "A § 311.325 state conviction is within § 311.326." };
  }
  if (origin.expresslyAdopts311326) {
    return {
      inScope: false,
      route: "local_route",
      reason: "Express local adoption may create a separate local route; it is not § 311.326 itself."
    };
  }
  return {
    inScope: false,
    route: "610.140_analysis_or_local_law_review",
    reason: "A municipal ordinance conviction is not automatically within § 311.326. Mere equivalence routes to § 610.140 analysis or local-law review."
  };
}

/**
 * Everything the receiving clerk has to confirm before a final packet exists.
 * This is operational configuration, not open legal research.
 */
export const MISSOURI_CLERK_CONFIRMATION_GATE = [
  "final_caption",
  "filing_code",
  "fee",
  "service",
  "summons",
  "division_instructions"
] as const;

export function missouriPacketReleasable(confirmed: ReadonlySet<string>): boolean {
  return MISSOURI_CLERK_CONFIRMATION_GATE.every((item) => confirmed.has(item));
}

// ---------------------------------------------------------------------------
// North Dakota — nd-nonconviction-auto-close-verify
// ---------------------------------------------------------------------------

export const NORTH_DAKOTA_AUTO_CLOSE_EFFECTIVE_FROM = "2025-08-01";
export const NORTH_DAKOTA_WAIT_DAYS = 61;
export const NORTH_DAKOTA_VERIFY_ON_DAY = 62;

export type NorthDakotaRoute =
  | { branch: "pre_effective_date"; output: "official_petition_and_proposed_order" }
  | {
      branch: "post_effective_date";
      output: "automatic_closure_guidance";
      waitDays: number;
      verifyOnDay: number;
      escalation: readonly ["written_request_to_original_court_clerk", "motion_in_original_criminal_case"];
      agencyHistoryErrors: "bci_or_originating_agency_challenge";
      individualisedNoticePromised: false;
    };

export function northDakotaRoute(matterDate: string): NorthDakotaRoute {
  if (matterDate < NORTH_DAKOTA_AUTO_CLOSE_EFFECTIVE_FROM) {
    return { branch: "pre_effective_date", output: "official_petition_and_proposed_order" };
  }
  return {
    branch: "post_effective_date",
    output: "automatic_closure_guidance",
    waitDays: NORTH_DAKOTA_WAIT_DAYS,
    verifyOnDay: NORTH_DAKOTA_VERIFY_ON_DAY,
    escalation: ["written_request_to_original_court_clerk", "motion_in_original_criminal_case"],
    agencyHistoryErrors: "bci_or_originating_agency_challenge",
    // No individualized notice may be promised. Nothing in the statute or the
    // official publications says the participant is told.
    individualisedNoticePromised: false
  };
}

// ---------------------------------------------------------------------------
// South Carolina — sc_pti_17_22_150
// ---------------------------------------------------------------------------

/** The controlling administrative fee. The rescinded $150 must not appear. */
export const SOUTH_CAROLINA_PTI_ADMINISTRATIVE_FEE_CENTS = 25_000;
export const SOUTH_CAROLINA_PTI_SLED_FEE_CENTS = 0;
export const SOUTH_CAROLINA_CLERK_FEE_CENTS = 3_500;
export const SOUTH_CAROLINA_PTI_EXPECTED_TOTAL_CENTS = 28_500;
export const SOUTH_CAROLINA_RESCINDED_FEE_CENTS = 15_000;

/** The ordinary PTI custom-pleading packet is retired. */
export const SOUTH_CAROLINA_PTI_CUSTOM_PLEADING_RETIRED = true;

export type SouthCarolinaPtiFacts = {
  solicitorDecision: "granted" | "denied" | "pending";
  eligibilityContested: boolean;
};

export function southCarolinaPtiOutcome(facts: SouthCarolinaPtiFacts): RouteOutcome {
  if (facts.solicitorDecision === "denied" || facts.eligibilityContested) {
    return {
      kind: "handoff",
      to: "retained_counsel",
      reason: "Solicitor denial or contested eligibility becomes a retained-counsel handoff."
    };
  }
  return {
    kind: "process_guidance",
    reason: "Ordinary PTI treatment is solicitor-administered process guidance. The ordinary custom-pleading packet is retired."
  };
}

export function southCarolinaPtiFeeSchedule(clerkFeeApplies: boolean) {
  return {
    administrativeFeeCents: SOUTH_CAROLINA_PTI_ADMINISTRATIVE_FEE_CENTS,
    sledFeeCents: SOUTH_CAROLINA_PTI_SLED_FEE_CENTS,
    clerkFeeCents: clerkFeeApplies ? SOUTH_CAROLINA_CLERK_FEE_CENTS : 0,
    expectedTotalCents: SOUTH_CAROLINA_PTI_ADMINISTRATIVE_FEE_CENTS
      + SOUTH_CAROLINA_PTI_SLED_FEE_CENTS
      + (clerkFeeApplies ? SOUTH_CAROLINA_CLERK_FEE_CENTS : 0)
  };
}

/**
 * Guidance is never sold and never consumes a sponsored credit. The SC PTI
 * route is guidance, so both are closed.
 */
export function southCarolinaPtiCommercialPosture() {
  return { checkoutEnabled: false, sponsoredCreditsConsumed: 0, paymentAllowed: false };
}
