// The single authority on what a packet route may do.
//
// Every generation, download, payment and Briefcase consumer resolves through
// this function. It replaces the old implicit behaviour where an unlisted
// jurisdiction silently fell through to the Mississippi template, which meant a
// participant in a state we do not support could be handed another state's
// petition. Unknown input fails closed.

import { getProfileByJurisdiction, normalizeJurisdictionCode } from "@/lib/rcap-engine/profile-registry";
import { legalRouteContract, routeCheckoutIsClosed } from "@/lib/legal-authority/index";
import { factoryV2RouteFor } from "@/lib/rcap/documents/factory-v2-registry";
import packetCorrectionRequired from "@/../data/rcap-ledger/packet-correction-required.json";
import {
  completeGuidanceForTrack,
  componentDeferralForTrack,
  exactDeferralForPathway,
  exactDeferralForTrack,
  terminalTreatmentForTrack,
  guidanceTracksForPathway
} from "@/lib/rcap/documents/guidance-packet-registry";

export type PacketRouteKind =
  | "factory_v2"
  | "legacy_verified"
  | "guidance_only"
  | "typed_stop"
  | "disabled"
  | "component_deferral"
  | "exact_supported_deferral"
  | "packet_correction_required"
  | "legacy_retired";

export type PacketRouteResolution = {
  routeKind: PacketRouteKind;
  jurisdiction: string;
  pathwayId: string;
  rendererKind: "packet_document_v1" | "none";
  /** A packet may be offered for sale only on a route that can produce an artifact. */
  sellable: boolean;
  /** Sponsored allocation or paid entitlement may be consumed only on these routes. */
  creditConsumable: boolean;
  reason: string;
  /**
   * Lane-B complete-guidance treatments serving this guidance route, when any
   * are registered. Informational only: their presence never makes the route
   * sellable or credit-consumable.
   */
  guidanceTrackIds?: string[];
  /** Every deferred official-form component id, when routeKind is component_deferral. */
  deferralComponentIds?: string[];
  /** The serving track id, when routeKind is exact_supported_deferral. */
  exactDeferralTrackId?: string;
  /**
   * Present only while a treatment is a candidate rather than an accepted
   * decision. A route carrying this is already non-sellable; the field records
   * that no independent reviewer has closed it yet, so nothing downstream can
   * read the suppression as an approval.
   */
  treatmentReviewState?: "pending_independent_review";
  /**
   * The build inputs the shared factory was handed, when routeKind is
   * factory_v2. Present so a shadow render is traceable to the exact packet set
   * and profile version it came from. Its presence never implies sellability:
   * a factory_v2 route is non-sellable and non-credit-consumable by
   * construction until the separate approval, technical, PDF, payment and route
   * state gates are satisfied elsewhere.
   */
  factoryV2?: {
    packetSetIds: string[];
    registryTrackIds: string[];
    profileVersion: string;
    requiredInputIds: string[];
    officialFormIds: string[];
  };
};

export type PacketRouteInput = {
  state?: string | null;
  pathway?: string | null;
  /**
   * The server-owned composed-route track id. Never populated from an
   * unverified client body: the caller resolves it from the screening
   * evaluation or from server-owned Briefcase metadata.
   */
  trackId?: string | null;
};

/**
 * Jurisdictions whose packet document renders through the browser-free renderer
 * on the deployed runtime. A legacy route earns its place here only while it
 * passes the same artifact proof every other route passes; drop a code from this
 * set and the route fences itself to guidance rather than serving a wrong packet.
 */
export const LEGACY_VERIFIED_JURISDICTIONS = ["MS", "IL", "DC", "PA", "TX"] as const;

/**
 * The same five, named for what they are now.
 *
 * Roger Roman retired their commercial authority on 2026-08-28 (ADR-0004). They
 * are retained as assets and history: their renderers still exist so an
 * already-generated artifact stays reachable, and their document components are
 * implementation references and comparison evidence during migration. What they
 * no longer do is authorize anything.
 *
 * The old branch returned `sellable: true, creditConsumable: true` for every
 * route in the jurisdiction, which is jurisdiction-only sellability — a
 * statement about a STATE standing in for a fact about a ROUTE. That is what
 * let a Mississippi route with no document type of its own be classified
 * sellable, and it is why this constant is kept under a second name rather than
 * quietly reused: the list is the same, and what it grants is not.
 */
const LEGACY_RETIRED_JURISDICTIONS = LEGACY_VERIFIED_JURISDICTIONS;

const LEGACY_VERIFIED = new Set<string>(LEGACY_VERIFIED_JURISDICTIONS);

/**
 * Only a row whose status is "closed" acts. A row is a finding, and a finding
 * that has been corrected stays on the record with its evidence rather than
 * being deleted; `status` is what says whether it still bites.
 */
const PACKET_CORRECTION_ROWS: ReadonlyMap<string, { classification: string }> = new Map(
  (packetCorrectionRequired as { rows: { routeKey: string; status: string; classification: string }[] }).rows
    .filter((row) => row.status === "closed")
    .map((row) => [row.routeKey, { classification: row.classification }])
);

function packetCorrectionFor(jurisdiction: string, pathwayId: string) {
  return PACKET_CORRECTION_ROWS.get(`${jurisdiction}:${pathwayId}`) ?? null;
}

const DISABLED: Omit<PacketRouteResolution, "jurisdiction" | "pathwayId" | "reason"> = {
  routeKind: "disabled",
  rendererKind: "none",
  sellable: false,
  creditConsumable: false
};

export function resolvePacketRoute(input: PacketRouteInput): PacketRouteResolution {
  const jurisdiction = normalizeJurisdictionCode(String(input.state ?? "")).toUpperCase();
  const pathwayId = String(input.pathway ?? "").trim();

  if (!jurisdiction) {
    return { ...DISABLED, jurisdiction: "", pathwayId, reason: "No jurisdiction was supplied; a packet route cannot be resolved." };
  }

  /**
   * A proven-incomplete packet closes the route before anything else is asked.
   *
   * This sits above every other classification, including the legacy-verified
   * jurisdictions, because LEGACY_VERIFIED classifies a whole STATE while this
   * is a finding about one ROUTE: Mississippi renders through the browser-free
   * renderer, and that says nothing about whether a particular Mississippi
   * route produces the filing it promises. The § 99-15-59 route is
   * payment-allowed at the evaluator and its consumer artifact is a 1,165-byte
   * status summary with no petition, no proposed order, no filing destination,
   * no fee instruction and no service step. A partial packet is worse than
   * none, because it is a document a person may carry to a clerk.
   *
   * Distinct from component_deferral and exact_supported_deferral on purpose.
   * Those record that a legal treatment or an official-form component is not
   * ready. Here the legal treatment is settled and the generator runs; what it
   * produces is not the packet. Recording it as a deferral would send a
   * packet-construction defect to the legal queue.
   */
  const correction = packetCorrectionFor(jurisdiction, pathwayId);
  if (correction) {
    return {
      routeKind: "packet_correction_required",
      jurisdiction,
      pathwayId,
      rendererKind: "none",
      sellable: false,
      creditConsumable: false,
      reason: `${jurisdiction}:${pathwayId} generates an incomplete packet (${correction.classification}); checkout, sponsored credit, render and participant delivery are closed until it is corrected.`
    };
  }

  // Component deferral has PRIORITY over every other classification,
  // including the legacy-verified jurisdictions. A composed route missing an
  // official-form component is not sellable in Illinois or Texas either, and
  // an invalid deferral record is treated exactly as strictly as a valid one:
  // a broken treatment is not permission.
  const deferral = componentDeferralForTrack(input.trackId ?? null);
  if (deferral) {
    return {
      routeKind: "component_deferral",
      jurisdiction,
      pathwayId,
      rendererKind: "none",
      sellable: false,
      creditConsumable: false,
      reason: deferral.classification === "component_deferral"
        ? `${deferral.trackId} is a composed route whose official-form component(s) are deferred; it serves the component deferral treatment and never a paid packet.`
        : `${deferral.trackId} carries an invalid component-deferral record (${deferral.invalidReason ?? "unspecified"}); the route fails closed and never opens payment or credit.`,
      deferralComponentIds: deferral.componentIds
    };
  }

  // An exact supported deferral also has PRIORITY over the legacy-verified
  // jurisdictions, and for the same reason: LEGACY_VERIFIED classifies a whole
  // state, while a deferral is a decision about one route. Texas expunction
  // after a qualifying dismissal is the case that made this necessary — the
  // accepted treatment tells the participant no packet is prepared or sold,
  // and without this the resolver offered them a Harris-County packet for $50.
  // Matched by exact track id when the caller has one, otherwise by the
  // compiled pathway the participant actually arrived through.
  //
  // A deferral that an independent review returned for correction is NOT an
  // accepted decision, so it does not outrank a treatment that carries a
  // current approval. It still suppresses the route when nothing else serves
  // the track — a treatment under correction is never a reason to start selling
  // — but where an approved terminalization treatment exists for the same
  // track, the participant gets the approved one. Texas expunction after an
  // acquittal is the case that made this necessary: its lane-B packet carries a
  // reviewer-identified participant-safety defect, and without this the runtime
  // served that packet while the ledger counted the approved treatment.
  const exactCandidate = exactDeferralForTrack(input.trackId ?? null)
    ?? exactDeferralForPathway(jurisdiction, pathwayId);
  const supersededByApprovedTreatment = Boolean(
    exactCandidate?.underCorrection && terminalTreatmentForTrack(input.trackId ?? null)
  );
  const exact = supersededByApprovedTreatment ? null : exactCandidate;
  if (exact) {
    return {
      routeKind: "exact_supported_deferral",
      jurisdiction,
      pathwayId,
      rendererKind: "none",
      sellable: false,
      creditConsumable: false,
      reason: exact.classification === "exact_supported_deferral"
        ? `${exact.trackId} is served by an accepted exact supported deferral: no packet is prepared or sold for this route, and the participant receives the deferral treatment.`
        : `${exact.trackId} carries an invalid exact-deferral record (${exact.invalidReason ?? "unspecified"}); the route fails closed and never opens payment or credit.`,
      exactDeferralTrackId: exact.trackId
    };
  }

  // A terminalization-window treatment binds on the same terms and with the same
  // priority over LEGACY_VERIFIED, but it is checked after the accepted
  // deferrals because an accepted decision outranks a pending one. It suppresses
  // the sale immediately and carries pending_independent_review with it, so the
  // route is closed now and stays a candidate until a reviewer who did not
  // author the treatment closes it. An invalid record is refused on exactly the
  // same terms as a valid one: a broken treatment is not permission.
  const treatment = terminalTreatmentForTrack(input.trackId ?? null);
  if (treatment) {
    return {
      routeKind: "exact_supported_deferral",
      jurisdiction,
      pathwayId,
      rendererKind: "none",
      sellable: false,
      creditConsumable: false,
      reason: treatment.classification === "terminal_treatment_candidate"
        ? `${treatment.trackId} is served by a ${treatment.treatment} treatment awaiting independent review: no packet is prepared, promised or sold for this route.`
        : `${treatment.trackId} carries an invalid terminal-treatment record (${treatment.invalidReason ?? "unspecified"}); the route fails closed and never opens payment or credit.`,
      exactDeferralTrackId: treatment.trackId,
      treatmentReviewState: "pending_independent_review"
    };
  }

  // A complete-guidance track, matched by exact track id, on the same terms and
  // with the same priority over LEGACY_VERIFIED. Several guidance tracks bind to
  // no compiled pathway — the Illinois 2028 automatic-sealing act and both
  // Alaska tracks — so a caller holding only the server-owned track id used to
  // fall through to the jurisdiction's classification. In Illinois and Texas
  // that classification is sellable, which meant a route whose accepted
  // treatment is that the participant files nothing could still be offered a
  // packet. Guidance is guidance in a legacy state too.
  const guidance = completeGuidanceForTrack(input.trackId ?? null);
  if (guidance) {
    return {
      routeKind: "guidance_only",
      jurisdiction,
      pathwayId,
      rendererKind: "none",
      sellable: false,
      creditConsumable: false,
      reason: `${guidance.trackId} is served by an accepted complete-guidance treatment; no packet is prepared or sold for this route.`,
      guidanceTrackIds: [guidance.trackId]
    };
  }

  // Approved legal route contracts outrank jurisdiction-wide renderer support.
  // Legacy verification means Mississippi can render a packet; it does not
  // mean every Mississippi stage is a participant-filed product. Exact
  // deferrals and complete treatments above retain their more specific route
  // identity; otherwise active-case, automatic, enforcement, referral and
  // attorney-review stages fail closed here before any legacy/factory route.
  const legalContract = legalRouteContract(jurisdiction, pathwayId);
  if (legalContract && routeCheckoutIsClosed(legalContract)) {
    return {
      routeKind: "guidance_only",
      jurisdiction,
      pathwayId,
      rendererKind: "none",
      sellable: false,
      creditConsumable: false,
      reason: `${legalContract.routeKey} is authority-closed at stage ${legalContract.stage}; no participant packet is sold and no packet credit is consumed.`
    };
  }

  const profile = getProfileByJurisdiction(jurisdiction);
  if (!profile) {
    return { ...DISABLED, jurisdiction, pathwayId, reason: `No compiled profile exists for ${jurisdiction}.` };
  }

  if (LEGACY_VERIFIED.has(jurisdiction)) {
    return {
      routeKind: "legacy_retired",
      jurisdiction,
      pathwayId,
      // The renderer stays. An artifact already generated for a participant
      // must remain reachable, and the components are migration evidence.
      rendererKind: "packet_document_v1",
      // The authority does not. Commercial authority now comes only from a
      // Grade-A fulfillment record keyed to an exact route and packet family.
      sellable: false,
      creditConsumable: false,
      reason: `${jurisdiction}'s legacy generator is retired as a commercial fulfillment path (ADR-0004). It renders for historical access and migration comparison only, and authorizes no checkout, sponsorship, credit or delivery.`
    };
  }

  // routeType is present in the compiled profile JSON but is not declared on the
  // engine's pathway type, so it is read defensively rather than asserted.
  const pathway = pathwayId ? profile.pathways.find((candidate) => candidate.id === pathwayId) : undefined;
  const routeType = pathway ? (pathway as { routeType?: string }).routeType : undefined;
  if (routeType === "out_of_scope") {
    return {
      routeKind: "typed_stop",
      jurisdiction,
      pathwayId,
      rendererKind: "none",
      sellable: false,
      creditConsumable: false,
      reason: `${jurisdiction} ${pathwayId} is a recorded product-scope exclusion.`
    };
  }

  // factory_v2: ONE shared branch, reached only after every suppression above
  // has declined the route, and only outside the legacy-verified jurisdictions,
  // whose live generators keep their own route.
  //
  // Admission is decided entirely by the generated registry, on seven build
  // inputs — authoritative profile and pathway, exact packet set, packet
  // specification, required participant fields, a named source or approved
  // composed document, and a deterministic fixture. There is no renderer per
  // pathway: every route here is handed to the same packet_document_v1 factory,
  // and what differs between routes is the packet set it is given.
  //
  // The route resolves in shadow. sellable and creditConsumable stay false,
  // because being buildable is not the same question as being approved,
  // technically current, free of a problematic-PDF hold, or public. Those gates
  // live elsewhere and are recorded per route in the registry; a later change
  // that wants to sell one of these routes has to satisfy them explicitly rather
  // than inherit permission from the fact that the factory can build it.
  const factoryRoute = factoryV2RouteFor(jurisdiction, pathwayId);
  if (factoryRoute) {
    return {
      routeKind: "factory_v2",
      jurisdiction,
      pathwayId,
      rendererKind: "packet_document_v1",
      sellable: false,
      creditConsumable: false,
      reason: `${jurisdiction} ${pathwayId} builds through the shared packet factory from packet set ${factoryRoute.packetSetIds.join(", ")} at profile version ${factoryRoute.profileVersion}. The route resolves in shadow: legal approval, technical approval, PDF status, payment and public state are separate gates and none of them is granted here.`,
      factoryV2: {
        packetSetIds: factoryRoute.packetSetIds,
        registryTrackIds: factoryRoute.registryTrackIds,
        profileVersion: factoryRoute.profileVersion,
        requiredInputIds: factoryRoute.requiredInputIds,
        officialFormIds: factoryRoute.officialFormIds
      }
    };
  }

  const guidanceTracks = guidanceTracksForPathway(jurisdiction, pathwayId);
  return {
    routeKind: "guidance_only",
    jurisdiction,
    pathwayId,
    rendererKind: "none",
    sellable: false,
    creditConsumable: false,
    reason: `${jurisdiction} has a compiled profile but no certified packet renderer, so it serves guidance.`,
    ...(guidanceTracks.length > 0 ? { guidanceTrackIds: guidanceTracks.map((track) => track.trackId) } : {})
  };
}

/** True only when the route can produce a validated artifact. */
export function packetRouteCanRender(resolution: PacketRouteResolution) {
  return resolution.rendererKind !== "none";
}
