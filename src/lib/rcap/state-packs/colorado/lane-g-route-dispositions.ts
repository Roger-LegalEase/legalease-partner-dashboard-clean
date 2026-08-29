// Lane G — Colorado route dispositions.
//
// The three routes the captain envelope assigns, with what each one can
// actually produce today. Every claim here was measured in the lane run that
// wrote `data/rcap-all50/overlays/production/colorado/lane-g/`: source presence
// against the mounted corpus, artifact digests recomputed from the bytes, and
// binding coverage counted out of the committed field maps.
//
// None of these routes is a Grade-A candidate. That is not a scheduling note:
// for every one of them the issuing court's own filing guide names documents
// the pinned corpus does not contain, so the filing set cannot be assembled at
// all. The blocked disposition is deliberate — a route that cannot produce its
// packet is recorded as blocked rather than quietly downgraded to a guidance
// packet, because a guidance fallback here would read as a finished product
// while the filing the participant actually has to make stays unbuilt.

export type ColoradoRouteDisposition =
  | "grade_a_candidate"
  | "blocked_incomplete_official_filing_set";

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
  /** Whether the participant completes it, as opposed to the court. */
  readonly participantCompleted: boolean;
  readonly presentInMountedCorpus: boolean;
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
  readonly components: readonly ColoradoRouteComponent[];
  readonly blockers: readonly string[];
}

const NON_CONVICTION: ColoradoLaneGRoute = {
  routeId: "CO:petition-based-non-conviction-sealing-jdf-417-24-72-704",
  statute: "C.R.S. § 24-72-704",
  disposition: "blocked_incomplete_official_filing_set",
  serviceDisposition: "no_packet_delivered_and_no_guidance_substituted",
  commercialStatus: "hold",
  checkoutProhibited: true,
  requiredFilingComponents: 4,
  componentsPresentInCorpus: 2,
  components: [
    { role: "REQUEST", documentId: "JDF-417", familySlug: "jdf-417-form-petition-en", participantCompleted: true, presentInMountedCorpus: true },
    { role: "ORDER", documentId: "JDF-418", familySlug: "jdf-418-form-order-en", participantCompleted: false, presentInMountedCorpus: true },
    { role: "NOTICE", documentId: "JDF-419", familySlug: null, participantCompleted: true, presentInMountedCorpus: false },
    { role: "ORDER", documentId: "JDF-435", familySlug: null, participantCompleted: false, presentInMountedCorpus: false },
  ],
  blockers: [
    "JDF-419 and JDF-435 are named by JDF-416 and are absent from the pinned corpus.",
    "The fee-waiver pair JDF-205 and JDF-206 is named by JDF-416 and is absent from the pinned corpus.",
    "JDF-417 binds 4 of its 62 fields; the agency name and address rows, the qualification elections and the certificate of service are classified manual and are not written by the product.",
  ],
};

const CONVICTION: ColoradoLaneGRoute = {
  routeId: "CO:petition-based-conviction-sealing-jdf-612-24-72-706",
  statute: "C.R.S. § 24-72-706",
  disposition: "blocked_incomplete_official_filing_set",
  serviceDisposition: "no_packet_delivered_and_no_guidance_substituted",
  commercialStatus: "hold",
  checkoutProhibited: true,
  requiredFilingComponents: 4,
  componentsPresentInCorpus: 2,
  components: [
    { role: "MOTION", documentId: "JDF-612", familySlug: "jdf-612-form-motion-en", participantCompleted: true, presentInMountedCorpus: true },
    { role: "ORDER", documentId: "JDF-615", familySlug: "jdf-615-form-order-en", participantCompleted: false, presentInMountedCorpus: true },
    { role: "NOTICE", documentId: null, familySlug: null, participantCompleted: true, presentInMountedCorpus: false },
    { role: "ORDER", documentId: null, familySlug: null, participantCompleted: false, presentInMountedCorpus: false },
  ],
  blockers: [
    "JDF-611 requires a Notice and a second Order; neither exists in the pinned corpus, and their form numbers could not be read first-hand because the guide's digits do not survive text extraction.",
    "The fee-waiver pair JDF-205 and JDF-206 is named by JDF-611 and is absent from the pinned corpus.",
    "JDF-612 binds 6 of its 63 fields; the substance of the motion is classified manual and is not written by the product.",
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
  components: [
    { role: "PETITION", documentId: "JDF-302", familySlug: null, participantCompleted: true, presentInMountedCorpus: false },
  ],
  blockers: [
    "The compiled Colorado profile states the juvenile remedy has its own form, JDF 302. No juvenile form of any number exists in the pinned corpus, and no Colorado overlay family covers one.",
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
