import "server-only";

import fulfillmentRecords from "@/../data/rcap-ledger/packet-fulfillment-records.json";

/**
 * The one server-authoritative answer to "may this route take money".
 *
 * Six surfaces used to answer that question independently — checkout creation,
 * consumer payment authority, sponsored entitlement, packet generation,
 * packet-credit consumption and participant delivery — and each of them read a
 * different proxy for the same fact. A route could satisfy every one of them
 * and still hand a participant a text file.
 *
 * That is what happened. `buildConsumerPacketArtifact` takes no branch on
 * jurisdiction, pathway, packet family or plan mode: it returns
 * `contentType: "text/plain"` with the route's own metadata and the packet
 * plan's readiness conditions under a heading that reads FILING CHECKLIST.
 * Fifty-four routes could take money or a sponsored credit and every one of
 * them would have delivered that. Twenty-six had checkout open.
 *
 * None of the proxies could have caught it, and this gate refuses each of them
 * by name:
 *
 *   - an evaluator result code says the participant is eligible, not that a
 *     packet exists;
 *   - a packet plan says which facts a packet would need, not that anything
 *     renders one;
 *   - a packet family name is a legal statement about what a route produces,
 *     not evidence that it was built;
 *   - legacy-jurisdiction status classifies a STATE, and says nothing about
 *     one route inside it;
 *   - `paymentAllowed` copied from a profile is a stored opinion, and the
 *     thing that must be true is a present fact about an artifact.
 *
 * So commercial authority is granted only by an exact fulfillment record that
 * names all nine of the things below, and the absence of a record is a refusal
 * rather than a gap. The ledger is empty: nothing is proven yet, so nothing
 * sells.
 */
export type PacketFulfillmentRecord = {
  routeKey: string;
  packetFamily: string;
  artifactProvider: string;
  packetComponents: string[];
  contentType: string;
  sourceIdentities: string[];
  renderer: string;
  verificationBinding: string;
  privateDelivery: boolean;
  repeatDownload: boolean;
  provenBy: string;
  provenOn: string;
};

export type PacketFulfillmentDecision =
  | { allowed: true; record: PacketFulfillmentRecord }
  | { allowed: false; reason: string; missing: string[] };

/** Providers that may deliver a purchased packet. A text summary is not one. */
const APPROVED_ARTIFACT_PROVIDERS = new Set(["rcap_legacy_mississippi", "rcap_packet_factory_v2"]);

/**
 * Content types a filing packet may be delivered as.
 *
 * `text/plain` is deliberately absent and must stay absent. Adding it would
 * make the defect this gate exists for indistinguishable from a fixed route.
 */
const APPROVED_CONTENT_TYPES = new Set(["application/pdf"]);

/** Every component a purchased filing packet must carry. */
export const REQUIRED_PACKET_COMPONENTS = [
  "primary filing or application",
  "proposed order where required",
  "attachments or schedules",
  "filing destination",
  "fee or waiver instructions",
  "service or notice",
  "post-filing steps"
] as const;

const RECORDS: ReadonlyMap<string, PacketFulfillmentRecord> = new Map(
  ((fulfillmentRecords as { records?: PacketFulfillmentRecord[] }).records ?? [])
    .map((record) => [record.routeKey, record])
);

export function packetFulfillmentRouteKey(jurisdiction: string | null | undefined, pathwayId: string | null | undefined) {
  return `${String(jurisdiction ?? "").trim().toUpperCase()}:${String(pathwayId ?? "").trim()}`;
}

/**
 * Whether this route may open commercial authority.
 *
 * Every field is checked rather than trusted for being present, because a
 * record that merely exists is the same class of evidence as a packet family
 * name — a statement about intent. A record must name a family, an approved
 * provider, every required component, an approved content type, at least one
 * source identity, a renderer, the verification binding, and both delivery
 * properties, or it does not grant anything.
 */
/**
 * What a record is missing, as a pure function of the record.
 *
 * Separated from the lookup so it can be exercised directly. Testing it by
 * writing rows into the ledger and re-importing the module would mean mutating
 * a tracked file to prove a rule about tracked files, and a module cache makes
 * the second import a lie anyway.
 */
export function packetFulfillmentShortfall(record: PacketFulfillmentRecord | undefined): string[] {
  if (!record) return ["fulfillment record"];
  const missing: string[] = [];
  if (!record.packetFamily?.trim()) missing.push("packet family");
  if (!APPROVED_ARTIFACT_PROVIDERS.has(record.artifactProvider)) missing.push(`approved artifact provider (got ${record.artifactProvider})`);
  if (!APPROVED_CONTENT_TYPES.has(record.contentType)) missing.push(`approved content type (got ${record.contentType})`);
  for (const component of REQUIRED_PACKET_COMPONENTS) {
    if (!record.packetComponents?.includes(component)) missing.push(`component: ${component}`);
  }
  if (!(record.sourceIdentities?.length > 0)) missing.push("current source or form identities");
  if (!record.renderer?.trim()) missing.push("renderer or approved legacy generator");
  if (!record.verificationBinding?.trim()) missing.push("current final-verification binding");
  if (record.privateDelivery !== true) missing.push("private delivery support");
  if (record.repeatDownload !== true) missing.push("repeat-download support");
  if (!record.provenBy?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(String(record.provenOn))) {
    missing.push("the proof that established it, and the date");
  }
  return missing;
}

export function packetFulfillmentAuthority(
  jurisdiction: string | null | undefined,
  pathwayId: string | null | undefined
): PacketFulfillmentDecision {
  const routeKey = packetFulfillmentRouteKey(jurisdiction, pathwayId);
  const record = RECORDS.get(routeKey);
  const missing = packetFulfillmentShortfall(record);
  if (!record) {
    return {
      allowed: false,
      reason: `${routeKey} has no packet fulfillment record, so no commercial authority is granted. A route sells only what it can prove it delivers.`,
      missing
    };
  }
  if (missing.length > 0) {
    return {
      allowed: false,
      reason: `${routeKey} has a fulfillment record that does not prove delivery.`,
      missing
    };
  }
  return { allowed: true, record };
}

export class PacketFulfillmentNotProvenError extends Error {
  constructor(readonly routeKey: string, readonly missing: string[], surface: string) {
    super(`${surface} refused: ${routeKey} cannot prove it delivers the packet it promises (missing ${missing.join(", ")}).`);
    this.name = "PacketFulfillmentNotProvenError";
  }
}

/**
 * The assertion each commercial surface calls. The surface name is required so
 * a refusal says which boundary refused, rather than leaving six identical
 * errors to be told apart by a stack trace.
 */
export function assertPacketFulfillmentProven(
  jurisdiction: string | null | undefined,
  pathwayId: string | null | undefined,
  surface:
    | "checkout creation"
    | "consumer payment authority"
    | "sponsored entitlement"
    | "packet generation"
    | "packet credit consumption"
    | "participant delivery"
): void {
  const decision = packetFulfillmentAuthority(jurisdiction, pathwayId);
  if (decision.allowed) return;
  throw new PacketFulfillmentNotProvenError(
    packetFulfillmentRouteKey(jurisdiction, pathwayId),
    decision.missing,
    surface
  );
}
