/**
 * APPROVED LEGAL ROUTE CONTRACTS
 * -----------------------------
 * One contract per distinct statutory mechanism, transcribed from the approved
 * implementation authority. Nothing here is research: every field traces to a
 * row that legal already decided.
 *
 * Controlling inputs, in precedence order:
 *   1. LegalEase Mississippi Definitive Route Decisions (2026-08-24) — every MS route.
 *   2. Record Clearing Implementation Authority Reconciled (2026-08-24), sheet
 *      "Completed Decision Matrix" — the other 49 decision rows.
 *   3. LEGALEASE_LEGAL_AUTHORITY_INGESTION_DIRECTIVE (2026-08-24).
 *
 * The type exists to make three defects unrepresentable rather than merely
 * discouraged, because all three shipped before:
 *
 *   - a processing deadline stored as an eligibility clock. `timing.kind`
 *     forces the author to say which one a duration is, and
 *     `processingDeadlines` is the only place a post-filing period may live.
 *   - one grouped route covering several statutory mechanisms. A contract is
 *     keyed by `routeKey` (`JURISDICTION:pathwayId`) and carries exactly one
 *     `statute`; a mechanism that splits gets another contract, never a
 *     conditional inside an existing one.
 *   - checkout opening on relief the participant does not file for.
 *     `paymentAuthority` is derived and asserted against `outcomeMode` by
 *     `assertRouteContractInvariants`, so an automatic, no-filing, referral or
 *     active-case-admission route cannot carry an open checkout.
 */

/** Which product output the approved decision authorises for this route. */
export type RouteOutcomeMode =
  /** Participant files; a paid packet is the authorised output. */
  | "participant_packet"
  /** Participant files, but the packet may not be produced without attorney review. */
  | "attorney_review_packet"
  /** Administrative/agency application the participant submits (not a court filing). */
  | "agency_application"
  /** Relief happens by operation of law; product verifies status and guides correction. */
  | "automatic_relief"
  /** Nothing is filed by the participant on this stage; status/correction guidance only. */
  | "guidance_status"
  /** Hand-off to counsel or a program: active-case admission, contested nexus, enforcement. */
  | "referral"
  /** Legal answer exists but the product does not support this route yet. */
  | "unsupported";

/** Which stage of a multi-stage statutory mechanism this contract covers. */
export type RouteStage =
  | "single_stage"
  /** Entry into a diversion/nonadjudication/deferral program while the case is live. */
  | "active_case_admission"
  /** Relief that unlocks only after completion plus the qualifying disposition. */
  | "post_completion"
  /** The branch where the statute itself clears the record. */
  | "automatic"
  /** The branch used when the court or agency did not implement the statutory result. */
  | "enforcement";

/**
 * What a duration on this route actually is. The directive forbids treating any
 * of the last two as an eligibility clock, so they are separate kinds rather
 * than a flag on one.
 */
export type RouteTimingKind =
  /** A statutory minimum wait the participant must sit through. */
  | "elapsed_eligibility_clock"
  /** Relief unlocks on an event; there is no elapsed wait. */
  | "event_trigger"
  /** A backward-looking condition on prior history, not a wait from the case. */
  | "lookback"
  /** A statutory deadline by which the participant must file (bars late filing). */
  | "filing_deadline"
  /** No timing rule of any kind applies to this route. */
  | "none";

export type RouteTiming = {
  kind: RouteTimingKind;
  /** Absent for `event_trigger` / `none`. */
  value?: number;
  unit?: "days" | "months" | "years";
  /**
   * The screening fact the duration runs from. This is the clock anchor, and it
   * is stated per route precisely because sharing one anchor across routes is
   * the defect the authority names.
   */
  anchorFactId?: string;
  /**
   * Further facts the approved decision allows the clock to run from, in the
   * order the decision states. Present only where the decision itself says
   * "the later of" or names a disposition-dependent alternate — never as a
   * convenience for a route whose anchor is simply unknown.
   */
  anchorAlternates?: string[];
  /** The approved wording of the anchor, used as the compiled rule's condition text. */
  anchorText: string;
};

/** A post-filing or agency period. Never an eligibility clock. */
export type RouteProcessingDeadline = {
  label: string;
  /** Why it is not a participant wait. */
  note: string;
};

export type LegalRouteContract = {
  /** `JURISDICTION:pathwayId` — the same key the engine uses for a compiled route. */
  routeKey: string;
  jurisdiction: string;
  pathwayId: string;
  /** The approved decision this contract implements, e.g. `LD-MS-01`. */
  decisionId: string;
  /** The approved rule id from the decision matrix. */
  ruleId: string;
  /** The statutory mechanism in plain words. */
  mechanism: string;
  /** Exactly one controlling statute per contract. */
  statute: string;
  stage: RouteStage;
  outcomeMode: RouteOutcomeMode;
  timing: RouteTiming;
  processingDeadlines?: RouteProcessingDeadline[];
  /** Facts the approved decision requires before this route may resolve, in its own words. */
  requiredFacts: string[];
  /**
   * The screening question ids that carry `requiredFacts` today.
   *
   * Deliberately a subset: several approved facts have no published question
   * yet, and inventing an id here would assert a gate that does not exist. The
   * unmapped facts stay in `requiredFacts` so the gap is visible rather than
   * quietly dropped.
   */
  screeningFactIds?: string[];
  /** Approved exclusions and disqualifiers for this route. */
  exclusions?: string[];
  /** The approved packet family, or null where the decision authorises no packet. */
  packetFamily: string | null;
  /** Named components of the approved packet family. */
  packetComponents?: string[];
  /** ISO date from which this rule governs, where the decision specifies one. */
  effectiveFrom?: string;
  /** A rule this contract explicitly replaces, kept so a regression can name it. */
  supersedes?: {
    value?: number;
    unit?: "days" | "months" | "years";
    note: string;
  };
  notes?: string;
};

export type LegalAuthorityDecision = {
  id: string;
  jurisdiction: string;
  priority: "P0" | "P1" | "P2";
  ruleId: string;
  outputMode: string;
  affectedFlowCount: number;
  routeKeys: string[];
  effectiveDateNote: string;
};

export type LegalAuthorityBundle = {
  authorityVersion: string;
  sources: string[];
  decisions: LegalAuthorityDecision[];
  routes: LegalRouteContract[];
};

/** Outcome modes on which the participant files nothing at this stage. */
export const NO_PARTICIPANT_FILING_OUTCOMES: readonly RouteOutcomeMode[] = [
  "automatic_relief",
  "guidance_status",
  "referral",
  "unsupported"
];

/** Outcome modes on which a paid packet may exist at all. */
export const PACKET_BEARING_OUTCOMES: readonly RouteOutcomeMode[] = [
  "participant_packet",
  "attorney_review_packet",
  "agency_application"
];
