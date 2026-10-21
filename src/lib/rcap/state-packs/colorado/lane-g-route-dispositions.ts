// Lane G — Colorado route dispositions.
//
// The three routes the captain envelope assigns, with what each one can
// actually produce today. Every claim here was measured in the lane run that
// wrote `data/rcap-all50/candidate-evidence/colorado/`: source presence
// against the mounted corpus, artifact digests recomputed from the bytes, and
// binding coverage counted out of the committed field maps.
//
// CORRECTION, 2026-09-15 (Roger Roman's instruction; the history above is kept
// and the entries below are restated). The two petition routes were recorded
// as blocked because "the issuing court's own filing guide names documents the
// pinned corpus does not contain". That was wrong in two ways, and both were
// checked against the bytes:
//
//   1. The documents were held. JDF 419, JDF 435, JDF 613 and JDF 614 sit in
//      the nationwide_recovery_pool_2026_09_02 custody that
//      data/rcap-all50/local-source-corpus-index.json declares, at the exact
//      digests the index records. They were filed under reference-only/ and
//      classified as "never a participant filing artifact"; the guides say the
//      opposite. JDF 416 (R: July 1, 2025) lists "JDF 419 Notice (Just do §§
//      A-C)" and "JDF 435 Order (just do §§ A-C)" under "File the Request";
//      JDF 611 (R: August 7, 2024) lists "JDF 613 Order (just do §§ A-C)" and
//      "JDF 614 Notice (Just do §§ A-C)" under the same heading. The petitioner
//      files them with the caption completed; the court completes the rest.
//   2. "Blocked" and "not a Grade-A candidate" are different facts. The filing
//      set is now buildable, which is a build fact. It is still not sellable,
//      still on commercial hold, still checkout-prohibited, and JDF 612 still
//      carries counsel status hard_gate_pending — those are the separate gates
//      the earlier record was right to keep, and they do not move here.
//
// What is built: caption-only overlay families for the four documents under
// data/rcap-all50/overlays/production/colorado/, produced and re-verified by
// scripts/rcap-official-forms/build-colorado-caption-only-families.mjs; the
// packet-set manifests name all four by official form id; the factory_v2
// registry admits both routes. What stays open is stated on each route below.
//
// The juvenile route is unchanged: the corpus still holds no JDF 302 and no
// juvenile material at all, so it stays blocked and guidance-free.

export type ColoradoRouteDisposition =
  | "grade_a_candidate"
  | "blocked_incomplete_official_filing_set"
  /** The official filing set is complete and buildable through the shared factory; nothing is sold. */
  | "packet_capable_not_sellable";

export type ColoradoServiceDisposition =
  | "packet_deliverable_pending_counsel_review"
  | "no_packet_delivered_and_no_guidance_substituted";

export interface ColoradoRouteComponent {
  /** Role the court's filing guide gives this document. */
  readonly role: "REQUEST" | "MOTION" | "PETITION" | "ORDER" | "NOTICE";
  /** Official form number, or null where the guide's digits could not be read first-hand. */
  readonly documentId: string | null;
  /** Overlay family that carries the census, classification and any artifacts. */
  readonly familySlug: string | null;
  /** Whether the participant completes it, as opposed to the court. For a proposed order or notice, the participant completes the caption (§§ A-C) and the court completes the rest. */
  readonly participantCompleted: boolean;
  readonly presentInMountedCorpus: boolean;
  /** What the participant writes on it, where that is less than the whole document. */
  readonly participantCompletes?: "caption_sections_a_to_c_only";
}

export interface ColoradoLaneGRoute {
  readonly routeId: string;
  readonly statute: string;
  readonly disposition: ColoradoRouteDisposition;
  readonly serviceDisposition: ColoradoServiceDisposition;
  /** Never opened by this lane: no Colorado route may reach checkout. */
  readonly commercialStatus: "hold";
  readonly checkoutProhibited: true;
  readonly requiredFilingComponents: number;
  readonly componentsPresentInCorpus: number;
  /** Fields the participant-completed component's specification binds, out of its total. */
  readonly specifiedBinding: { readonly bound: number; readonly total: number } | null;
  /** Fields the artifacts committed for that component actually carry. */
  readonly bindingRealizedInArtifacts: number | null;
  readonly components: readonly ColoradoRouteComponent[];
  readonly blockers: readonly string[];
  /** Review items that are open without blocking the build; stated so nobody reads "packet-capable" as "reviewed". */
  readonly openReviewItems?: readonly string[];
  /** Counsel status as recorded in the legal-authority records; restated here so a build fact is never read as a legal one. */
  readonly counselStatus?: "ratified_deployable" | "hard_gate_pending";
}

/** The 2026-09-15 correction, kept beside the routes it restates. */
export const COLORADO_LANE_G_CORRECTION_2026_09_15 = {
  recordedOn: "2026-09-15",
  instruction:
    "Restore the two participant-filed Colorado adult sealing routes as packet-capable factory_v2 routes, using the held Colorado Judicial Branch forms, preserving every eligibility, timing, exclusion, automatic-sealing and escalation gate, and making nothing sellable.",
  whatWasWrong:
    "The lane recorded JDF 419, JDF 435, JDF 613 and JDF 614 as absent (or, for the JDF 611 pair, as unidentified) and the two petition routes as blocked on that account. All four were held in the nationwide_recovery_pool_2026_09_02 custody at the digests the corpus index records, filed under reference-only/ and misclassified as court-only reference material. The issuing court's guides list all four under \"File the Request\" with \"just do §§ A-C\".",
  whatChanged: [
    "data/record-clearing/source-artifact-registry.json: the four rows are form candidates, with the superseded classification kept inside classificationCorrection.",
    "data/rcap-all50/local-source-corpus-index.json: each of the four recovery-pool entries carries an identityDetermination read from its printed face; formNumber stays null because the partial custody's invariant forbids a label-bindable form number there.",
    "data/rcap-all50/overlays/production/colorado/jdf-419-form-notice-en, jdf-435-form-order-en, jdf-613-form-order-en, jdf-614-form-notice-en: caption-only overlay families with digest-verified renders.",
    "data/record-clearing/legal-design-packet-set-manifests.json: both sets name all four documents by official form id, keep JDF 205/206 as a conditional guidance-instructed component, and record a superseding packetSetCompleteness entry.",
    "data/record-clearing/factory-v2-route-registry.json: regenerated; both adult routes read factoryV2Resolves true with no unmet build input."
  ],
  whatDidNotChange: [
    "No evaluator, eligibility, timing, exclusion, automatic-sealing or escalation logic.",
    "No legal-decision record, no counsel ratification status (JDF 417 ratified_deployable; JDF 612 hard_gate_pending).",
    "No Grade-A fulfillment record, no payment, checkout, sponsorship or credit behaviour: both routes resolve in shadow with sellable false.",
    "The juvenile route."
  ],
  openItems: [
    "Revision currency: the held JDF 419 and JDF 435 are R 8/19 flat forms with an unlettered caption band against a JDF 416 of R: July 1, 2025 that says \"§§ A-C\"; the held JDF 613 and JDF 614 are R: August 7, 2024 against a JDF 611 of the same date, while the track registry records JDF 612 and JDF 615 issuer revisions of 2025-07-01 that no mounted custody holds. The issuer's hosts were unreachable from the build environment on 2026-09-15 (egress proxy 403 on CONNECT to www.coloradojudicial.gov and www.courts.state.co.us).",
    "JDF 205/206: adopted at exact digest in custody user_upload_adopted_20260911, which is not mounted where this build ran; carried as a conditional guidance-instructed component, not rendered.",
    "Independent visual review of the four caption overlays; counsel review of both routes; the JDF 612 hard gate."
  ]
} as const;

const NON_CONVICTION: ColoradoLaneGRoute = {
  routeId: "CO:petition-based-non-conviction-sealing-jdf-417-24-72-704",
  statute: "C.R.S. § 24-72-704",
  disposition: "packet_capable_not_sellable",
  serviceDisposition: "packet_deliverable_pending_counsel_review",
  commercialStatus: "hold",
  checkoutProhibited: true,
  requiredFilingComponents: 4,
  componentsPresentInCorpus: 4,
  specifiedBinding: { bound: 59, total: 62 },
  bindingRealizedInArtifacts: 4,
  counselStatus: "ratified_deployable",
  components: [
    { role: "REQUEST", documentId: "JDF-417", familySlug: "jdf-417-form-petition-en", participantCompleted: true, presentInMountedCorpus: true },
    { role: "ORDER", documentId: "JDF-418", familySlug: "jdf-418-form-order-en", participantCompleted: false, presentInMountedCorpus: true },
    { role: "NOTICE", documentId: "JDF-419", familySlug: "jdf-419-form-notice-en", participantCompleted: true, presentInMountedCorpus: true, participantCompletes: "caption_sections_a_to_c_only" },
    { role: "ORDER", documentId: "JDF-435", familySlug: "jdf-435-form-order-en", participantCompleted: true, presentInMountedCorpus: true, participantCompletes: "caption_sections_a_to_c_only" },
  ],
  blockers: [
    "Commercial hold: no Grade-A fulfillment record exists for this route and packet family, so it sells nothing; the factory_v2 resolution is shadow-only (sellable false, creditConsumable false).",
    "The fee-waiver pair JDF 205/JDF 206, which JDF 416 names conditionally, is not in a mounted custody and is carried as a guidance-instructed conditional component rather than rendered.",
  ],
  openReviewItems: [
    "Revision currency of JDF 419 and JDF 435 (held R 8/19; named by JDF 416 R: July 1, 2025); the issuer was unreachable on 2026-09-15.",
    "Independent visual review of the two new caption overlays; the retained JDF 417 fixtures still carry the four-field render of 2026-08-12 (see data/rcap-all50/overlays/production/colorado/jdf-417-form-petition-en/specification/).",
  ],
};

const CONVICTION: ColoradoLaneGRoute = {
  routeId: "CO:petition-based-conviction-sealing-jdf-612-24-72-706",
  statute: "C.R.S. § 24-72-706",
  disposition: "packet_capable_not_sellable",
  serviceDisposition: "packet_deliverable_pending_counsel_review",
  commercialStatus: "hold",
  checkoutProhibited: true,
  requiredFilingComponents: 4,
  componentsPresentInCorpus: 4,
  specifiedBinding: { bound: 58, total: 63 },
  bindingRealizedInArtifacts: 6,
  counselStatus: "hard_gate_pending",
  components: [
    { role: "MOTION", documentId: "JDF-612", familySlug: "jdf-612-form-motion-en", participantCompleted: true, presentInMountedCorpus: true },
    { role: "ORDER", documentId: "JDF-615", familySlug: "jdf-615-form-order-en", participantCompleted: false, presentInMountedCorpus: true },
    { role: "NOTICE", documentId: "JDF-614", familySlug: "jdf-614-form-notice-en", participantCompleted: true, presentInMountedCorpus: true, participantCompletes: "caption_sections_a_to_c_only" },
    { role: "ORDER", documentId: "JDF-613", familySlug: "jdf-613-form-order-en", participantCompleted: true, presentInMountedCorpus: true, participantCompletes: "caption_sections_a_to_c_only" },
  ],
  blockers: [
    "Counsel hard gate: this route's counsel status is hard_gate_pending and the evaluator returns needs_review for it; packet-capable does not mean sellable and nothing here moves that gate.",
    "Commercial hold: no Grade-A fulfillment record exists for this route and packet family, so it sells nothing; the factory_v2 resolution is shadow-only (sellable false, creditConsumable false).",
    "The fee-waiver pair JDF 205/JDF 206, which JDF 611 names conditionally, is not in a mounted custody and is carried as a guidance-instructed conditional component rather than rendered.",
  ],
  openReviewItems: [
    "Revision currency: JDF 613 and JDF 614 are held at R: August 7, 2024, the same revision as the held JDF 611; the track registry records issuer revisions of 2025-07-01 for JDF 612 and JDF 615 that no mounted custody holds; the issuer was unreachable on 2026-09-15.",
    "Independent visual review of the two new caption overlays; the retained JDF 612 fixtures still carry the six-field render of 2026-08-12 (see data/rcap-all50/overlays/production/colorado/jdf-612-form-motion-en/specification/).",
  ],
};

const JUVENILE: ColoradoLaneGRoute = {
  routeId: "CO:juvenile-expungement-19-1-306",
  statute: "C.R.S. § 19-1-306",
  disposition: "blocked_incomplete_official_filing_set",
  serviceDisposition: "no_packet_delivered_and_no_guidance_substituted",
  commercialStatus: "hold",
  checkoutProhibited: true,
  requiredFilingComponents: 1,
  componentsPresentInCorpus: 0,
  specifiedBinding: null,
  bindingRealizedInArtifacts: null,
  components: [
    { role: "PETITION", documentId: "JDF-302", familySlug: null, participantCompleted: true, presentInMountedCorpus: false },
  ],
  blockers: [
    "The compiled Colorado profile states the juvenile remedy has its own form, JDF 302. No juvenile form of any number exists in the pinned corpus, and no Colorado overlay family covers one. No guidance fallback is emitted in its place either: the corpus holds no juvenile material at all, so the filing destination, fees, service rule and hearing stops could only come from recollection, which AGENTS.md forbids.",
  ],
};

export const COLORADO_LANE_G_ROUTES: readonly ColoradoLaneGRoute[] = [
  NON_CONVICTION,
  CONVICTION,
  JUVENILE,
];

/** No Colorado route this lane touched may be admitted or sold today. */
export const COLORADO_LANE_G_ANY_GRADE_A_CANDIDATE = COLORADO_LANE_G_ROUTES.some(
  (route) => route.disposition === "grade_a_candidate",
);

/** The two adult routes are packet-capable; neither is sellable, and the juvenile route is not packet-capable. */
export const COLORADO_LANE_G_PACKET_CAPABLE_ROUTE_IDS: readonly string[] = COLORADO_LANE_G_ROUTES.filter(
  (route) => route.disposition === "packet_capable_not_sellable",
).map((route) => route.routeId);
