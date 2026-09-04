// The single authority on what a packet route may do.
//
// Every generation, download, payment and Briefcase consumer resolves through
// this function. It replaces the old implicit behaviour where an unlisted
// jurisdiction silently fell through to the Mississippi template, which meant a
// participant in a state we do not support could be handed another state's
// petition. Unknown input fails closed.

import fs from "node:fs";
import path from "node:path";

import { getProfileByJurisdiction, normalizeJurisdictionCode } from "@/lib/rcap-engine/profile-registry";
import { legalRouteContract, routeCheckoutIsClosed } from "@/lib/legal-authority/index";
import {
  factoryV2RouteFor
} from "@/lib/rcap/documents/factory-v2-registry";
import packetCorrectionRequired from "@/../data/rcap-ledger/packet-correction-required.json";
import {
  completeGuidanceForTrack,
  componentDeferralForTrack,
  exactDeferralForPathway,
  exactDeferralForTrack,
  terminalTreatmentForTrack,
  guidanceTracksForPathway
} from "@/lib/rcap/documents/guidance-packet-registry";
import {
  COMPLETE_PACKET_PROVEN,
  GRADE_A_ADMISSION_SCHEMA_VERSION
} from "@/lib/rcap/fulfillment/grade-a-authority";
import { fulfillmentAuthorityFor } from "@/lib/rcap/fulfillment/grade-a-admission";
import { getCurrentFulfillmentRecord } from "@/lib/rcap/fulfillment/grade-a-registry";
import { packetSpecificationFor } from "@/lib/rcap/grade-a/packet-specification";
import { resolveConsumerDeliveryRouteState } from "@/lib/rcap/render/consumer-delivery-control";
import type { RouteOutcome } from "@/lib/rcap/legal-decisions/controlling-route-effects";

export type PacketRouteKind =
  | "factory_v2"
  | "legacy_verified"
  | "guidance_only"
  | "typed_stop"
  | "disabled"
  | "component_deferral"
  | "exact_supported_deferral"
  | "packet_correction_required"
  | "legacy_retired"
  /**
   * The approved legal answer for this route is a hand-off to counsel or a
   * prosecutor rather than a self-filed participant packet. Fail-closed like
   * every other non-factory branch: no renderer, no sale, no credit.
   */
  | "handoff";

/**
 * Where a handoff route sends the participant. The vocabulary is the
 * controlling-decision one (`RouteOutcome` with kind "handoff" in
 * src/lib/rcap/legal-decisions/controlling-route-effects.ts), so the resolver
 * and the 2026-08-28 decision record cannot drift apart. A fact-dependent
 * controlling-decision handoff — Georgia consent not written, a South Carolina
 * solicitor denial — is decided by the legal-authority route resolver, which
 * holds participant facts; what THIS resolver classifies is the route-level
 * handoff the approved contract itself declares through its outcome mode.
 */
export type PacketRouteHandoffTarget = Extract<RouteOutcome, { kind: "handoff" }>["to"];

/**
 * The derived availability of a packet route: the one word a status surface,
 * the launch graph or an operator reads about what this route can serve today.
 *
 * DERIVED, never stored, and NOT a rollout mechanism. Per-route availability
 * describes what each route can truthfully serve within the consumer path;
 * flipping that path live remains a single nationwide owner-authorized action
 * through the consumer-delivery control (`RCAP_CONSUMER_DELIVERY_ROUTE_STATE`,
 * src/lib/rcap/render/consumer-delivery-control.ts) under `all51LaunchRule`,
 * which forbids partial state rollout. Nothing here can enable one state, one
 * route, or one participant.
 *
 * It is also deliberately blind to the state-promotion manifest
 * (src/lib/rcap/state-promotion-manifest.ts). PromotionStatus is
 * jurisdiction-scoped, and a jurisdiction-scoped fact standing in for a fact
 * about a ROUTE is the exact defect the LEGACY_RETIRED comment below records.
 */
export const PACKET_ROUTE_AVAILABILITIES = [
  /** A Grade-A-proven official-PDF packet route. Proof, not intention. */
  "PACKET_READY",
  /** A Grade-A-proven custom-pleading packet route. Proof, not intention. */
  "CUSTOM_PLEADING_READY",
  /** A guidance route with a registered complete-guidance treatment serving it. */
  "GUIDANCE_READY",
  /** The approved outcome is a counsel/prosecutor hand-off, and that is servable. */
  "HANDOFF_READY",
  /** A maintenance finding closes the route: packet correction, a problematic-PDF hold, a route-scoped maintenance hold, or the delivery path itself. */
  "MAINTENANCE_HOLD",
  /** A legal decision closes the route: authority-closed contract, pending independent review, or a route-scoped legal hold. */
  "LEGAL_HOLD",
  /** Everything else — explicitly including NO_RECORD. The only safe default. */
  "UNFINISHED"
] as const;

export type PacketRouteAvailability = (typeof PACKET_ROUTE_AVAILABILITIES)[number];

export type PacketRouteResolution = {
  routeKind: PacketRouteKind;
  jurisdiction: string;
  pathwayId: string;
  rendererKind: "packet_document_v1" | "none";
  /** A packet may be offered for sale only on a route that can produce an artifact. */
  sellable: boolean;
  /** Sponsored allocation or paid entitlement may be consumed only on these routes. */
  creditConsumable: boolean;
  /**
   * The derived availability word for this route. See
   * {@link PACKET_ROUTE_AVAILABILITIES} for the vocabulary and for what this
   * field is NOT: it is not a rollout mechanism and it never opens payment —
   * `sellable` and `creditConsumable` are untouched by it, and the two ready
   * states are reachable only through a Grade-A fulfillment record at the
   * admission schema version, read from the one canonical registry.
   */
  availability: PacketRouteAvailability;
  reason: string;
  /** Where a handoff route sends the participant. Present only when routeKind is "handoff". */
  handoffTo?: PacketRouteHandoffTarget;
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
    packetFamilyId: string | null;
    retiredLegacyRouteMigrated: boolean;
    exactRouteProductized: boolean;
    exactTrackSelectionRequired: boolean;
    obligationRouteKey?: string;
    legalApprovalEstablished?: boolean;
    legalApprovalRecordId?: string;
    postApprovalChangeAuditEstablished?: false;
    nextGate?: string;
  };
};

export type PacketRouteInput = {
  state?: string | null;
  pathway?: string | null;
  /**
   * Never accepted from this boundary. Packet-family identity is resolved from
   * the server-owned route specification; the presence of this field fails the
   * request closed even when its value happens to be correct.
   */
  packetFamilyId?: string | null;
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

/** Everything but the derived availability, which is computed over the whole resolution. */
type PacketRouteBaseResolution = Omit<PacketRouteResolution, "availability">;

const DISABLED: Omit<PacketRouteBaseResolution, "jurisdiction" | "pathwayId" | "reason"> = {
  routeKind: "disabled",
  rendererKind: "none",
  sellable: false,
  creditConsumable: false
};

// ---------------------------------------------------------------------------
// Availability inputs. All of them already exist elsewhere; none is a new
// switch. Every read is lazy and cached, and every read fails toward a
// non-ready state — an unreadable hold ledger cannot un-hold anything, because
// the two ready states are reachable only through the Grade-A authority, which
// fails closed on its own.
// ---------------------------------------------------------------------------

/**
 * Route-scoped operational holds, owned by the maintenance ledger. A row with
 * `releasedAt: null` holds the route; a released row is history. The file may
 * not exist yet — its owner ships it with its own verifier — and an absent or
 * unreadable ledger simply contributes no route-scoped holds.
 */
const ROUTE_HOLDS_PATH = "data/rcap-grade-a/maintenance/route-holds.json";

/**
 * The deployment-readiness config-completeness gate. The same block the release
 * readiness audit carries: a proven route is not servable while the application
 * and worker deploy targets it would be served from remain unnamed.
 */
const RELEASE_READINESS_PATH = "data/rcap-codex/release-readiness.json";

/**
 * The problematic-PDF register — the exact input the launch graph's
 * `pdfStatus.hold` is computed from (data/rcap-all50/problematic-pdf-register.json,
 * matched by `affectedTrackIds`). Read here rather than re-derived, so the
 * resolver and the graph cannot disagree about which tracks are held.
 */
const PROBLEMATIC_PDF_REGISTER_PATH = "data/rcap-all50/problematic-pdf-register.json";

type RouteScopedHold = {
  routeId: string;
  holdType: "MAINTENANCE_HOLD" | "LEGAL_HOLD";
  reason: string;
  releasedAt: string | null;
};

const HOLD_TYPES = new Set(["MAINTENANCE_HOLD", "LEGAL_HOLD"]);

/**
 * The parsed hold ledger. Per the carrier's own contract
 * (data/rcap-grade-a/maintenance/route-holds.json, verified by
 * scripts/verify-rcap-route-holds.mjs): an ABSENT ledger contributes no holds —
 * nothing here invents a hold or a release — but a PRESENT ledger that cannot
 * be fully parsed is read as "hold everything it cannot parse", never as "no
 * holds". A malformed row names no trustworthy route, so the failure mode is a
 * blanket maintenance hold rather than a hold that silently holds nothing.
 */
type RouteHoldLedger = {
  holdEverything: boolean;
  byRoute: Map<string, RouteScopedHold[]>;
};

let cachedRouteHolds: RouteHoldLedger | null = null;
let cachedDeploymentConfigIncomplete: boolean | null = null;
let cachedProblematicPdfTracks: Set<string> | null = null;

function readRepositoryJson(rel: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), rel), "utf8"));
}

function routeHoldLedger(): RouteHoldLedger {
  if (cachedRouteHolds) return cachedRouteHolds;

  const ledger: RouteHoldLedger = { holdEverything: false, byRoute: new Map() };
  let raw: string | null = null;
  try {
    raw = fs.readFileSync(path.join(process.cwd(), ROUTE_HOLDS_PATH), "utf8");
  } catch {
    // Absent ledger = no route-scoped holds.
    cachedRouteHolds = ledger;
    return ledger;
  }

  try {
    const parsed = JSON.parse(raw) as { holds?: unknown } | null;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.holds)) {
      throw new Error("route-holds ledger carries no holds array");
    }
    for (const candidate of parsed.holds) {
      const row = candidate as Partial<RouteScopedHold> | null;
      const routeId = typeof row?.routeId === "string" ? row.routeId.trim() : "";
      const wellFormed = Boolean(
        row
        && typeof row === "object"
        && routeId.includes(":")
        && !/[*?]/.test(routeId)
        && HOLD_TYPES.has(String(row.holdType))
        && candidate !== null
        && "releasedAt" in (candidate as Record<string, unknown>)
        && (row.releasedAt === null || typeof row.releasedAt === "string")
      );
      if (!wellFormed) throw new Error("route-holds ledger carries a row this reader cannot attribute to an exact route");
      if (row!.releasedAt !== null) continue; // a released row is history, not a hold
      const bucket = ledger.byRoute.get(routeId) ?? [];
      bucket.push(row as RouteScopedHold);
      ledger.byRoute.set(routeId, bucket);
    }
  } catch {
    // "Hold everything it cannot parse": a present-but-malformed ledger may be
    // holding routes this reader cannot identify, so every route is held.
    ledger.holdEverything = true;
    ledger.byRoute.clear();
  }

  cachedRouteHolds = ledger;
  return ledger;
}

function unreleasedHoldsFor(routeId: string): RouteScopedHold[] {
  return routeHoldLedger().byRoute.get(routeId) ?? [];
}

function deploymentConfigIncomplete(): boolean {
  if (cachedDeploymentConfigIncomplete === null) {
    try {
      const parsed = readRepositoryJson(RELEASE_READINESS_PATH) as {
        deploymentReadiness?: {
          applicationTarget?: unknown;
          finalApplicationShaRequired?: unknown;
          workerTarget?: unknown;
          immutableDigestRequired?: unknown;
        };
      } | null;
      const readiness = parsed?.deploymentReadiness;
      if (!readiness) {
        cachedDeploymentConfigIncomplete = true;
      } else {
        const applicationPinned = readiness.finalApplicationShaRequired !== true || Boolean(readiness.applicationTarget);
        const workerPinned = readiness.immutableDigestRequired !== true || Boolean(readiness.workerTarget);
        cachedDeploymentConfigIncomplete = !(applicationPinned && workerPinned);
      }
    } catch {
      // Readiness that cannot be established is not readiness.
      cachedDeploymentConfigIncomplete = true;
    }
  }
  return cachedDeploymentConfigIncomplete;
}

function problematicPdfTracks(): ReadonlySet<string> {
  if (!cachedProblematicPdfTracks) {
    cachedProblematicPdfTracks = new Set<string>();
    try {
      const parsed = readRepositoryJson(PROBLEMATIC_PDF_REGISTER_PATH) as {
        records?: { affectedTrackIds?: string[] }[];
      } | null;
      for (const record of parsed?.records ?? []) {
        for (const trackId of record.affectedTrackIds ?? []) {
          if (typeof trackId === "string" && trackId.trim()) cachedProblematicPdfTracks.add(trackId);
        }
      }
    } catch {
      // An unreadable register holds nothing extra. Safe, because MAINTENANCE_HOLD
      // and UNFINISHED are both non-ready: readiness itself is granted only by the
      // Grade-A authority, which fails closed independently of this register.
    }
  }
  return cachedProblematicPdfTracks;
}

/** Test-only: drop the availability input caches so a verifier can reload after a fixture write. */
export function resetRouteAvailabilityCachesForTest(): void {
  cachedRouteHolds = null;
  cachedDeploymentConfigIncomplete = null;
  cachedProblematicPdfTracks = null;
}

/** Every track id the resolution itself carries; track-scoped holds bind through these. */
function trackIdsFor(resolution: PacketRouteBaseResolution, input: PacketRouteInput): string[] {
  const ids = new Set<string>();
  const supplied = String(input.trackId ?? "").trim();
  if (supplied) ids.add(supplied);
  for (const id of resolution.guidanceTrackIds ?? []) ids.add(id);
  if (resolution.exactDeferralTrackId) ids.add(resolution.exactDeferralTrackId);
  for (const id of resolution.deferralComponentIds ?? []) ids.add(id);
  for (const id of resolution.factoryV2?.registryTrackIds ?? []) ids.add(id);
  return [...ids];
}

/**
 * Whether a proven route's packet is an official-PDF packet or a custom
 * pleading, read from the registered packet specification (document
 * `outputStrategy`) and, failing that, from whether the packet sets name any
 * official form. Informational flavour only — both states demand the same
 * Grade-A proof, and nothing rides on the distinction commercially.
 */
function provenReadyAvailability(routeId: string, resolution: PacketRouteBaseResolution): PacketRouteAvailability {
  const spec = packetSpecificationFor(routeId);
  const documents = (spec as { documents?: Array<{ outputStrategy?: string }> } | undefined)?.documents ?? [];
  if (documents.some((doc) => doc.outputStrategy === "official_pdf_fill")) return "PACKET_READY";
  if (documents.some((doc) => doc.outputStrategy === "custom_pleading")) return "CUSTOM_PLEADING_READY";
  return (resolution.factoryV2?.officialFormIds?.length ?? 0) > 0 ? "PACKET_READY" : "CUSTOM_PLEADING_READY";
}

/**
 * The derived availability. Order encodes what an operator is told first, on
 * the same principle the Grade-A disposition mapping states: the resolver's own
 * topmost finding first, then a legal hold before a technical one, then the
 * servable outcomes, and only then the two proven-ready states.
 *
 * The ready branch asks the Grade-A authority READ-ONLY through the existing
 * loader; it is not a second commercial decision and it opens nothing — the ten
 * governed admission points in Lane F remain the only place a commercial action
 * is admitted. And a proven route still reports MAINTENANCE_HOLD while the
 * consumer delivery path is not live nationwide or the deployment configuration
 * is incomplete: availability reflects the owner-authorized nationwide flip, it
 * never performs or substitutes for it.
 */
function deriveAvailability(resolution: PacketRouteBaseResolution, input: PacketRouteInput): PacketRouteAvailability {
  if (!resolution.jurisdiction) return "UNFINISHED";
  const routeId = `${resolution.jurisdiction}:${resolution.pathwayId}`;

  // The resolver's own topmost suppression: a proven-incomplete packet is a
  // maintenance finding about one route, and it outranks everything.
  if (resolution.routeKind === "packet_correction_required") return "MAINTENANCE_HOLD";

  // A present-but-unparseable hold ledger holds everything it cannot parse.
  if (routeHoldLedger().holdEverything) return "MAINTENANCE_HOLD";

  // Route-scoped ledger holds. A legal hold outranks a maintenance one.
  const holds = unreleasedHoldsFor(routeId);
  if (holds.some((hold) => hold.holdType === "LEGAL_HOLD")) return "LEGAL_HOLD";

  // A treatment awaiting independent review is a legal hold: nothing downstream
  // may read the suppression as an approval.
  if (resolution.treatmentReviewState === "pending_independent_review") return "LEGAL_HOLD";

  if (holds.some((hold) => hold.holdType === "MAINTENANCE_HOLD")) return "MAINTENANCE_HOLD";

  // The problematic-PDF hold, matched by track — the same input the launch
  // graph's pdfStatus.hold reads.
  const pdfTracks = problematicPdfTracks();
  if (trackIdsFor(resolution, input).some((trackId) => pdfTracks.has(trackId))) return "MAINTENANCE_HOLD";

  // The approved outcome is a hand-off, and serving that hand-off is the route
  // working, not the route failing.
  if (resolution.routeKind === "handoff") return "HANDOFF_READY";

  // An authority-closed contract is a legal decision about this route.
  const contract = legalRouteContract(resolution.jurisdiction, resolution.pathwayId);
  if (contract && routeCheckoutIsClosed(contract)) return "LEGAL_HOLD";

  // Guidance is servable only where a registered complete-guidance treatment
  // actually serves it; guidance with no registered track is unfinished work.
  if (resolution.routeKind === "guidance_only") {
    return (resolution.guidanceTrackIds?.length ?? 0) > 0 ? "GUIDANCE_READY" : "UNFINISHED";
  }

  // The two ready states. Only a current Grade-A fulfillment record at the
  // ADMISSION schema version, in state COMPLETE_PACKET_PROVEN, reaches them —
  // a v1 record can be proven under its own schema and still never be ready,
  // because it cannot have answered the fileability question.
  if (resolution.rendererKind === "packet_document_v1") {
    const record = getCurrentFulfillmentRecord(routeId);
    const authority = fulfillmentAuthorityFor(routeId);
    const proven = authority.state === COMPLETE_PACKET_PROVEN
      && record?.schemaVersion === GRADE_A_ADMISSION_SCHEMA_VERSION;
    if (proven) {
      // Proven, but the path it would be served on is dark or unpinned. The
      // nationwide flip and the deploy pinning belong to their owners; until
      // both stand, a proven route is under maintenance, not ready.
      if (resolveConsumerDeliveryRouteState() !== "live" || deploymentConfigIncomplete()) {
        return "MAINTENANCE_HOLD";
      }
      return provenReadyAvailability(routeId, resolution);
    }
  }

  // Everything else — NO_RECORD, INCOMPLETE, STALE, deferrals, typed stops,
  // disabled routes, retired legacy renderers with no proof. The only safe default.
  return "UNFINISHED";
}

export function resolvePacketRoute(input: PacketRouteInput): PacketRouteResolution {
  const base = resolvePacketRouteBase(input);
  return { ...base, availability: deriveAvailability(base, input) };
}

function resolvePacketRouteBase(input: PacketRouteInput): PacketRouteBaseResolution {
  const jurisdiction = normalizeJurisdictionCode(String(input.state ?? "")).toUpperCase();
  const pathwayId = String(input.pathway ?? "").trim();

  if (!jurisdiction) {
    return { ...DISABLED, jurisdiction: "", pathwayId, reason: "No jurisdiction was supplied; a packet route cannot be resolved." };
  }

  if (Object.prototype.hasOwnProperty.call(input, "packetFamilyId")) {
    return {
      ...DISABLED,
      jurisdiction,
      pathwayId,
      reason: "Client-supplied packet-family authority is not accepted; the server resolves the family from the exact route specification."
    };
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
  // A hand-off route, on the same terms and in the same place in the ladder:
  // after the terminal-treatment and guidance-track branches (an accepted
  // treatment keeps its more specific identity) and before the generic
  // authority-closed branch and factory_v2. Where the approved contract's
  // outcome mode is a referral or an attorney-review packet, the product's
  // answer IS the hand-off — serving it as anonymous "guidance" lost the one
  // fact the participant needs, which is who takes the matter next. The
  // controlling-decision hand-offs of 2026-08-28 (RouteOutcome kind "handoff"
  // in controlling-route-effects.ts) reach participants through these same
  // contracts and their failure dispositions; their fact-dependent branches are
  // selected by the legal-authority resolver, which holds the facts.
  // Fail-closed like every other branch: no renderer, no sale, no credit.
  const legalContract = legalRouteContract(jurisdiction, pathwayId);
  if (legalContract && (legalContract.outcomeMode === "referral" || legalContract.outcomeMode === "attorney_review_packet")) {
    const handoffTo: PacketRouteHandoffTarget = legalContract.outcomeMode === "attorney_review_packet"
      ? "retained_counsel"
      : "attorney_or_prosecutor";
    return {
      routeKind: "handoff",
      jurisdiction,
      pathwayId,
      rendererKind: "none",
      sellable: false,
      creditConsumable: false,
      handoffTo,
      reason: legalContract.outcomeMode === "attorney_review_packet"
        ? `${legalContract.routeKey} is an attorney-review route: a packet exists only through retained counsel's review, so nothing is sold or rendered here and the participant is handed to counsel.`
        : `${legalContract.routeKey} is a ${legalContract.stage} referral: the approved outcome is a hand-off to counsel or the prosecutor, not a self-filed packet, so checkout, credit and render stay closed.`
    };
  }
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

  // ADR-0004 remains a jurisdiction-wide retirement fence. One route may pass
  // it only when the factory registry validates either an exact migration
  // against its generated seven-input row or an exact track-only productization
  // against its packet-set manifest and registered specification. A missing,
  // malformed or mismatched crosswalk therefore falls back to the retired
  // renderer, never to a sibling or jurisdiction-wide factory grant.
  const exactFactoryRoute = factoryV2RouteFor(jurisdiction, pathwayId, input.trackId);
  const retiredLegacyRouteMigration = exactFactoryRoute?.retiredLegacyRouteMigration ?? null;
  const retiredLegacyExactProductization = exactFactoryRoute?.exactRouteProductization ?? null;
  if (LEGACY_VERIFIED.has(jurisdiction) && !retiredLegacyRouteMigration && !retiredLegacyExactProductization) {
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
  // has declined the route. A retired-legacy jurisdiction reaches it only for
  // an exact migration validated above; every sibling keeps the retired route.
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
  const factoryRoute = exactFactoryRoute;
  if (factoryRoute) {
    const exactProductization = factoryRoute.exactRouteProductization;
    return {
      routeKind: "factory_v2",
      jurisdiction,
      pathwayId,
      rendererKind: "packet_document_v1",
      sellable: false,
      creditConsumable: false,
      reason: exactProductization
        ? exactProductization.legalApproval
          ? `${jurisdiction} ${pathwayId} has an exact technical route/track/family mapping through packet set ${factoryRoute.packetSetIds.join(", ")} at profile version ${factoryRoute.profileVersion}. Owner legal approval ${exactProductization.legalApproval.legalDecisionRecordId} is preserved, but a post-approval substantive-change audit is not established; fulfillment authority, payment, sponsorship, credit, delivery, route opening and production remain closed.`
          : `${jurisdiction} ${pathwayId} has an exact technical route/track/family mapping through packet set ${factoryRoute.packetSetIds.join(", ")} at profile version ${factoryRoute.profileVersion}. Current owner legal approval and a post-approval change audit are not established; fulfillment authority, payment, sponsorship, credit, delivery, route opening and production remain closed.`
        : `${jurisdiction} ${pathwayId} builds through the shared packet factory from packet set ${factoryRoute.packetSetIds.join(", ")} at profile version ${factoryRoute.profileVersion}. The route resolves in shadow: legal approval, technical approval, PDF status, payment and public state are separate gates and none of them is granted here.`,
      factoryV2: {
        packetSetIds: factoryRoute.packetSetIds,
        registryTrackIds: factoryRoute.registryTrackIds,
        profileVersion: factoryRoute.profileVersion,
        requiredInputIds: factoryRoute.requiredInputIds,
        officialFormIds: factoryRoute.officialFormIds,
        packetFamilyId: factoryRoute.packetFamilyId,
        retiredLegacyRouteMigrated: factoryRoute.retiredLegacyRouteMigration !== null,
        exactRouteProductized: exactProductization !== null,
        exactTrackSelectionRequired: factoryRoute.exactTrackSelectionRequired,
        ...(exactProductization
          ? {
              legalApprovalEstablished: exactProductization.legalApproval !== null,
              ...(exactProductization.legalApproval
                ? { legalApprovalRecordId: exactProductization.legalApproval.legalDecisionRecordId }
                : {}),
              postApprovalChangeAuditEstablished: false as const,
              obligationRouteKey: exactProductization.obligationRouteKey,
              nextGate: exactProductization.nextGate
            }
          : {})
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
