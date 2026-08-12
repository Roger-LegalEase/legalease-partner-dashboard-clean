// The single authority on what a packet route may do.
//
// Every generation, download, payment and Briefcase consumer resolves through
// this function. It replaces the old implicit behaviour where an unlisted
// jurisdiction silently fell through to the Mississippi template, which meant a
// participant in a state we do not support could be handed another state's
// petition. Unknown input fails closed.

import { getProfileByJurisdiction, normalizeJurisdictionCode } from "@/lib/rcap-engine/profile-registry";
import { componentDeferralForTrack, guidanceTracksForPathway } from "@/lib/rcap/documents/guidance-packet-registry";

export type PacketRouteKind = "factory_v2" | "legacy_verified" | "guidance_only" | "typed_stop" | "disabled" | "component_deferral";

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

const LEGACY_VERIFIED = new Set<string>(LEGACY_VERIFIED_JURISDICTIONS);

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

  const profile = getProfileByJurisdiction(jurisdiction);
  if (!profile) {
    return { ...DISABLED, jurisdiction, pathwayId, reason: `No compiled profile exists for ${jurisdiction}.` };
  }

  if (LEGACY_VERIFIED.has(jurisdiction)) {
    return {
      routeKind: "legacy_verified",
      jurisdiction,
      pathwayId,
      rendererKind: "packet_document_v1",
      sellable: true,
      creditConsumable: true,
      reason: `${jurisdiction} renders its packet document through the browser-free renderer.`
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
