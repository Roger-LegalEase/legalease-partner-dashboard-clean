import "server-only";
import fs from "node:fs";
import { createHash } from "node:crypto";
import type { GradeAFulfillmentRecord } from "./grade-a-authority";
import { resolveDeploymentEnvironment } from "@/lib/server-runtime-environment";
import decision from "@/../data/record-clearing/legal-decisions/2026-09-25-ms-nonconv-sponsored-preview.json";

export type SponsoredChannelContext = {
  participantUserId: string;
  partnerSlug: string;
  eventName: string;
  eventId: string;
  registeredSpecificationSha256: string;
};
export type SponsoredChannelDecision = typeof decision;
export const sponsoredChannelDecisions: readonly SponsoredChannelDecision[] = [decision];
// Pin the adopted decision itself; edits require a new immutable decision.
const decisionDigests = new Set(["4550b2bbeff33c890892d1a845e774981b38230ba538c7240928446cc5353f30"]);
const sha256 = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");

/** Pure scope comparison; callers supply only protected server context. Packet
 * proof and database entitlement are independent gates, never created here. */
export function matchesSponsoredChannel(
  grant: SponsoredChannelDecision, canonical: GradeAFulfillmentRecord,
  trackId: string | null | undefined, surface: string,
  context: SponsoredChannelContext | undefined,
  runtime: { environment: string; channel: string; routeState: string; projectUrl: string; scope: string }
): boolean {
  if (!context || grant.approved !== true || grant.productionAuthorized !== false
    || grant.publicLaunchAuthorized !== false || grant.liveConsumerPaymentAuthorized !== false
    || grant.hostedFullAuthorized !== false || runtime.environment !== "preview"
    || runtime.channel !== grant.channel || runtime.routeState !== grant.routeState
    || runtime.routeState !== "staging_scoped"
    || runtime.projectUrl !== `https://${grant.acceptanceProjectRef}.supabase.co`
    || !grant.surfaces.includes(surface)
    || canonical.routeId !== grant.routeId || canonical.packetFamilyId !== grant.packetFamilyId
    || trackId !== grant.trackId || canonical.packetSpecification.sha256 !== grant.packetSpecificationSha256
    || context.registeredSpecificationSha256 !== grant.packetSpecificationSha256
    || context.partnerSlug !== grant.partnerSlug || context.eventName !== grant.eventName || context.eventId !== grant.eventId
    || !grant.participantUserIds.includes(context.participantUserId)) return false;
  const scope = runtime.scope.split(",").map(s => s.trim()).filter(Boolean);
  // Order is part of the owner's explicit scope fingerprint; no extra IDs or duplicates.
  if (sha256(scope.join(",")) !== grant.participantScopeSha256
    || sha256(grant.participantUserIds.join(",")) !== grant.participantScopeSha256
    || scope.length !== grant.participantUserIds.length
    || !scope.every(id => grant.participantUserIds.includes(id))) return false;
  return grant.artifacts.some(a => a.variant === "full" && a.locale === "en"
    && a.sha256 === canonical.artifactValidation.artifactSha256);
}

export function currentSponsoredChannelAllowed(
  canonical: GradeAFulfillmentRecord, trackId: string | null | undefined,
  surface: string, context?: SponsoredChannelContext
): boolean {
  const runtime = {
    environment: resolveDeploymentEnvironment(),
    channel: process.env.RCAP_SPONSORED_PREVIEW_CHANNEL ?? "",
    routeState: process.env.RCAP_CONSUMER_DELIVERY_ROUTE_STATE ?? "",
    projectUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    scope: process.env.RCAP_CONSUMER_DELIVERY_STAGING_SCOPE ?? ""
  };
  return sponsoredChannelDecisions.some(grant => {
    if (!decisionDigests.has(sha256(JSON.stringify(grant)))
      || !matchesSponsoredChannel(grant, canonical, trackId, surface, context, runtime)) return false;
    try {
      // Every approved variant is pinned to actual bytes. No artifact or channel
      // decision can migrate silently when a guide or specification changes.
      return grant.artifacts.every(a => sha256(fs.readFileSync(a.path)) === a.sha256);
    } catch { return false; }
  });
}
