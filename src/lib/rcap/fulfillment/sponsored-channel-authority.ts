import "server-only";
import fs from "node:fs";
import { createHash } from "node:crypto";
import type { GradeAFulfillmentRecord } from "./grade-a-authority";
import { resolveDeploymentEnvironment } from "@/lib/server-runtime-environment";
import decision from "@/../data/record-clearing/legal-decisions/2026-10-23-ms-nonconv-sponsored-preview.json";
import ordinaryInternalQaDecision from "@/../data/record-clearing/legal-decisions/2026-10-24-ms-nonconv-ordinary-internal-qa.json";

export type SponsoredChannelContext = {
  participantUserId: string;
  partnerSlug: string;
  registeredSpecificationSha256: string;
} & (
  | { acquisitionMode?: "clinic"; eventName: string; eventId: string }
  | { acquisitionMode: "partner"; eventName: null; eventId: null }
);
export type SponsoredChannelDecision = typeof decision | (
  Omit<typeof decision, "eventName" | "eventId" | "eventIdentitySource"> & {
    acquisitionMode: "partner"; eventName: null; eventId: null;
  }
);
export const sponsoredChannelDecisions: readonly SponsoredChannelDecision[] = [decision, ordinaryInternalQaDecision as SponsoredChannelDecision];
// Pin the adopted decision itself; edits require a new immutable decision.
const decisionDigests = new Set([
  "b33784d8509264f03466a379ac52028dc943477489ca4b9a4f1de94f3d7578f5",
  "316a211790dbdaca3bd260beac0a854076ebed618390b339b1d68b6a40381ebb"
]);
const sha256 = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");

/** Pure scope comparison; callers supply only protected server context. Packet
 * proof and database entitlement are independent gates, never created here. */
export function matchesSponsoredChannel(
  grant: SponsoredChannelDecision, canonical: GradeAFulfillmentRecord,
  trackId: string | null | undefined, surface: string,
  context: SponsoredChannelContext | undefined,
  runtime: { environment: string; channel: string; routeState: string; projectUrl: string; scope: string }
): boolean {
  const grantMode = "acquisitionMode" in grant ? grant.acquisitionMode : "clinic";
  if (!context || !["clinic", "partner"].includes(grantMode)
    || (context.acquisitionMode ?? "clinic") !== grantMode
    || (grantMode === "clinic" && (!grant.eventId || !grant.eventName))
    || (grantMode === "partner" && (grant.eventId !== null || grant.eventName !== null
      || context.eventId !== null || context.eventName !== null))
    || grant.approved !== true || grant.productionAuthorized !== false
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

// Temporary diagnostic source: remove before final worker-compatible application.
const ordinaryDiagnosticKeys = ["preview_env", "single_jurisdiction", "grant_found", "grant_digest", "approved", "production_closed", "public_closed", "payment_closed", "hosted_full_closed", "event_id_null", "event_name_null", "jurisdiction_matches", "project_url", "public_url_matches", "channel", "runtime_route_state", "grant_route_state", "scope_exact", "scope_digest"] as const;
type OrdinaryDiagnosticKey = typeof ordinaryDiagnosticKeys[number];
type OrdinaryDiagnostic = {
  predicates: Record<OrdinaryDiagnosticKey, boolean | null>;
  artifacts: { readable: boolean | null; hashMatches: boolean | null; filesystemCode: string | null }[];
};
export function diagnoseOrdinarySponsoredRouteRegistration(partnerSlug: string, jurisdictions: readonly string[]) {
  const observation: OrdinaryDiagnostic = {
    predicates: Object.fromEntries(ordinaryDiagnosticKeys.map(key => [key, null])) as OrdinaryDiagnostic["predicates"],
    artifacts: Array.from({length: 3}, () => ({readable: null, hashMatches: null, filesystemCode: null}))
  };
  const registration = prepareOrdinarySponsoredRouteRegistration(partnerSlug, jurisdictions, process.env, observation);
  return { schema: "ordinary-sponsored-guard-diagnostic/v1", passed: registration !== null, ...observation };
}

/** Prepares an exact scope registration for normal Start; it grants no participant entitlement. */
export function prepareOrdinarySponsoredRouteRegistration(
  partnerSlug: string, jurisdictions: readonly string[],
  env: Readonly<Record<string, string | undefined>> = process.env,
  observation?: OrdinaryDiagnostic
) {
  const check = (key: OrdinaryDiagnosticKey, passing: boolean) => {
    if (observation) observation.predicates[key] = passing;
    return passing;
  };
  if (!check("preview_env", env.VERCEL_ENV === "preview") || !check("single_jurisdiction", jurisdictions.length === 1)) return null;
  const grant = sponsoredChannelDecisions.find(candidate => "acquisitionMode" in candidate
    && candidate.acquisitionMode === "partner" && candidate.partnerSlug === partnerSlug);
  if (!check("grant_found", Boolean(grant)) || !grant) return null;
  if (!check("grant_digest", decisionDigests.has(sha256(JSON.stringify(grant))))
    || !check("approved", grant.approved === true)
    || !check("production_closed", grant.productionAuthorized === false)
    || !check("public_closed", grant.publicLaunchAuthorized === false)
    || !check("payment_closed", grant.liveConsumerPaymentAuthorized === false)
    || !check("hosted_full_closed", grant.hostedFullAuthorized === false)
    || !check("event_id_null", grant.eventId === null)
    || !check("event_name_null", grant.eventName === null)
    || !check("jurisdiction_matches", jurisdictions[0] === grant.routeId.split(":")[0])
    || !check("project_url", env.SUPABASE_URL === `https://${grant.acceptanceProjectRef}.supabase.co`)
    || !check("public_url_matches", env.NEXT_PUBLIC_SUPABASE_URL === env.SUPABASE_URL)
    || !check("channel", env.RCAP_SPONSORED_PREVIEW_CHANNEL === grant.channel)
    || !check("runtime_route_state", env.RCAP_CONSUMER_DELIVERY_ROUTE_STATE === "staging_scoped")
    || !check("grant_route_state", grant.routeState === "staging_scoped")
    || !check("scope_exact", env.RCAP_CONSUMER_DELIVERY_STAGING_SCOPE === grant.participantUserIds.join(","))
    || !check("scope_digest", sha256(env.RCAP_CONSUMER_DELIVERY_STAGING_SCOPE!) === grant.participantScopeSha256)) return null;
  let artifactIndex = 0;
  try {
    if (!grant.artifacts.every((artifact, index) => {
      artifactIndex = index;
      const bytes = fs.readFileSync(artifact.path);
      const matches = sha256(bytes) === artifact.sha256;
      if (observation?.artifacts[index]) {
        observation.artifacts[index].readable = true;
        observation.artifacts[index].hashMatches = matches;
      }
      return matches;
    })) return null;
  } catch (error) {
    if (observation?.artifacts[artifactIndex]) {
      observation.artifacts[artifactIndex].readable = false;
      const code = (error as NodeJS.ErrnoException | null)?.code;
      observation.artifacts[artifactIndex].filesystemCode = ["ENOENT", "EACCES", "EPERM", "EISDIR", "ENOTDIR", "EIO"].includes(code ?? "") ? code! : "OTHER";
    }
    return null;
  }
  return {
    schema: "rcap-ordinary-sponsored-route-registration/v1",
    decisionId: grant.decisionId,
    decisionSha256: sha256(JSON.stringify(grant)),
    routeKey: grant.routeId,
    packetSpecificationSha256: grant.packetSpecificationSha256,
    participantScopeSha256: grant.participantScopeSha256,
    partnerSlug: grant.partnerSlug
  };
}
