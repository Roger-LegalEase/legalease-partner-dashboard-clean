import "server-only";
import { readSponsoredChannelContext, readSponsoredRouteAuthority } from "@/lib/rcap/fulfillment/sponsored-channel-context";
import { packetFulfillmentAuthority } from "@/lib/expungement-ai/packet-fulfillment-authority";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { currentPersonalizedVerification, prepareBoundPersonalizedPacket, isPersonalizedDeliveryRoute } from "@/lib/rcap/render/personalized-packet";
import { workerStaticPacketBinding } from "@/lib/rcap/fulfillment/worker-static-authority";
import { currentSponsoredChannelAllowed } from "@/lib/rcap/fulfillment/sponsored-channel-authority";
import { readProtectedPacketArtifact } from "@/lib/expungement-ai/verification-cas";
import type { RenderJobRow } from "@/lib/rcap/render/job-queue";

/** Read the existing service-only registration and claimed Clinic scope. It is
 * an additional entitlement check, never a substitute for Grade-A authority. */
export async function sponsoredRenderAuthority(input: {
  routeId: string; sourceSessionId: string; briefcaseItemId: string; authUserId: string;
}, surface?: "sponsored entitlement" | "packet credit consumption") {
  // Existing delivered provenance retains its protected download checks. New
  // entitlement and credit creation explicitly require current channel scope.
  if (!surface) return readSponsoredRouteAuthority(input);
  const context = await readSponsoredChannelContext(input);
  if (!context) return null;
  const current = await currentPersonalizedVerification(input.authUserId, input.briefcaseItemId);
  const snapshot = current.snapshot;
  if (`${snapshot.jurisdiction}:${snapshot.pathwayId}` !== input.routeId) return null;
  if (!packetFulfillmentAuthority(snapshot.jurisdiction, snapshot.pathwayId, surface,
    { trackId: snapshot.selectedTrackId, sponsoredContext: context }).allowed) return null;
  return { valid: true as const, partner_id: context.partnerId, partner_slug: context.partnerSlug,
    clinic_event_id: context.eventId };
}

/** One post-claim result used before accounting and by artifact finalization.
 * This is static render/channel authority, never publication or dispatch proof. */
export async function sponsoredRenderJobAdmitted(jobId: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;
  const { data: job, error } = await supabase.from("packet_render_jobs").select("*").eq("id", jobId).maybeSingle();
  if (error || !job) return null;
  if (!job.sponsored_route_key) return { jobId, sponsored: false as const };
  try {
    if (job.sponsored_route_key !== job.route_id
      || !["validating", "artifact_validated", "delivered"].includes(job.status)) return null;
    const context = await readSponsoredChannelContext({ routeId: job.route_id,
      sourceSessionId: job.sponsored_session_id, briefcaseItemId: job.sponsored_consumer_briefcase_item_id,
      authUserId: job.sponsored_consumer_auth_user_id });
    if (!context || context.partnerId !== job.partner_id || context.eventId !== job.sponsored_clinic_event_id) return null;
    const current = await currentPersonalizedVerification(job.sponsored_consumer_auth_user_id, job.sponsored_consumer_briefcase_item_id);
    const snapshot = current.snapshot;
    if (`${snapshot.jurisdiction}:${snapshot.pathwayId}` !== job.route_id
      || current.hash !== job.sponsored_verification_hash) return null;
    const binding = workerStaticPacketBinding(job.route_id, snapshot.selectedTrackId);
    if (!binding || context.registeredSpecificationSha256 !== binding.packetSpecificationFileSha256
      || !currentSponsoredChannelAllowed(binding.staticRecord, snapshot.selectedTrackId,
        "packet credit consumption", context)) return null;
    const prepared = isPersonalizedDeliveryRoute(job.route_id)
      ? prepareBoundPersonalizedPacket({ authUserId: job.sponsored_consumer_auth_user_id,
        briefcaseItemId: job.sponsored_consumer_briefcase_item_id, personId: job.person_id, matterId: job.matter_id,
        verificationHash: current.hash, snapshot, deliveryLocale: current.deliveryLocale }, binding, "claimed_worker") : null;
    if (prepared && (prepared.spec.packetId !== job.packet_id || prepared.spec.inputHash !== job.input_hash)) return null;
    return { jobId, sponsored: true as const, current, prepared };
  } catch { return null; }
}

/** The worker has already validated and stored these bytes through its fenced
 * finalizer. The existing scoped transaction owns participant publication and
 * Clinic allowance consumption. Identical retries submit identical metadata. */
export async function finalizeSponsoredRenderArtifact(jobId: string,
  admitted?: NonNullable<Awaited<ReturnType<typeof sponsoredRenderJobAdmitted>>>): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return false;
  const { data: job, error } = await supabase.from("packet_render_jobs").select("*").eq("id", jobId).maybeSingle();
  if (error || !job) return false;
  const authority = admitted ?? await sponsoredRenderJobAdmitted(jobId);
  if (!authority || authority.jobId !== jobId || authority.sponsored !== Boolean(job.sponsored_route_key)) return false;
  if (!authority.sponsored) return true;
  if (!isPersonalizedDeliveryRoute(job.route_id)) return true;
  if (!["artifact_validated", "delivered"].includes(job.status) || job.delivery_eligibility !== "eligible"
    || !job.output_sha256 || !job.output_storage_path || !job.artifact_validated_at || !job.page_count) return false;
  const { current, prepared } = authority;
  if (!prepared || current.hash !== job.sponsored_verification_hash
    || prepared.spec.packetId !== job.packet_id || prepared.spec.inputHash !== job.input_hash) return false;
  const payload = prepared.payload.renderInputPayload;
  const { data, error: finalError } = await supabase.rpc("finalize_sponsored_packet_generation_for_route", {
    p_route_key: job.route_id, p_session_id: job.sponsored_session_id,
    p_briefcase_item_id: job.sponsored_consumer_briefcase_item_id,
    p_expected_verification_hash: current.hash, p_render_job_id: job.id,
    p_packet_artifact: {
      // The registration describes composition; renderJobId names the durable
      // delivery mechanism. No inline recomposition is used for this artifact.
      provider: "rcap_grade_a_composer_v1", source: "grade_a_packet_specification",
      packetId: job.sponsored_consumer_briefcase_item_id, renderPacketId: job.packet_id, renderJobId: job.id,
      contentType: "application/pdf", fileName: "record-clearing-packet.pdf",
      generatedAt: job.artifact_validated_at, verificationHash: current.hash,
      packetSpecificationId: payload.specificationId, packetSpecificationVersion: payload.specificationVersion,
      packetSpecificationSha256: payload.specificationSha256, packetFamily: payload.packetFamilyId,
      artifactSha256: job.output_sha256, pageCount: job.page_count, documentCount: prepared.packet.documents.length,
      storagePath: job.output_storage_path, downloadPath: `/api/rcap/packets/${job.id}/download`
    }
  });
  const result = Array.isArray(data) ? data[0] : data;
  return !finalError && result?.ok === true;
}

/** Technical artifact validation precedes scoped sponsored publication. A job
 * alone cannot expose bytes in the interval between those two transactions. */
export async function sponsoredRenderDeliveryReady(job: RenderJobRow, userId: string): Promise<boolean> {
  const binding = job.sponsoredBinding;
  if (!binding || binding.authUserId !== userId || binding.briefcaseItemId !== job.briefcaseItemId) return false;
  const scope = await sponsoredRenderAuthority({ routeId: job.routeId, sourceSessionId: binding.sourceSessionId,
    briefcaseItemId: binding.briefcaseItemId, authUserId: userId });
  if (!scope || scope.partner_id !== job.partnerId || scope.clinic_event_id !== binding.clinicEventId) return false;
  const read = await readProtectedPacketArtifact({ consumerAuthUserId: userId, briefcaseItemId: binding.briefcaseItemId });
  return read.ok && read.value.status === "ready" && read.value.entitlementSource === "partner_sponsorship"
    && read.value.artifact?.renderJobId === job.id && read.value.artifact?.artifactSha256 === job.outputSha256;
}
