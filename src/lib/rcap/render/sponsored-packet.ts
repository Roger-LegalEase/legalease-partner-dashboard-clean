import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { currentPersonalizedVerification, preparePersonalizedPacket, PERSONALIZED_DELIVERY_ROUTE } from "@/lib/rcap/render/personalized-packet";
import { artifactStorageContext, commercialRouteIdentity, finalVerificationSnapshotFrom,
  fulfillmentRequestContext, governArtifactAttachment } from "@/lib/rcap/render/commercial-admission";
import { readProtectedPacketArtifact } from "@/lib/expungement-ai/verification-cas";
import type { RenderJobRow } from "@/lib/rcap/render/job-queue";

/** Read the existing service-only registration and claimed Clinic scope. It is
 * an additional entitlement check, never a substitute for Grade-A authority. */
export async function sponsoredRenderAuthority(input: {
  routeId: string; sourceSessionId: string; briefcaseItemId: string; authUserId: string;
}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("sponsored_packet_render_authority", {
    p_route_key: input.routeId, p_session_id: input.sourceSessionId,
    p_briefcase_item_id: input.briefcaseItemId, p_consumer_auth_user_id: input.authUserId
  });
  const row = Array.isArray(data) ? data[0] : data;
  return !error && row?.valid === true ? row as {
    valid: true; partner_id: string; partner_slug: string; clinic_event_id: string;
  } : null;
}

/** The worker has already validated and stored these bytes through its fenced
 * finalizer. The existing scoped transaction owns participant publication and
 * Clinic allowance consumption. Identical retries submit identical metadata. */
export async function finalizeSponsoredRenderArtifact(jobId: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return false;
  const { data: job, error } = await supabase.from("packet_render_jobs").select("*").eq("id", jobId).maybeSingle();
  if (error || !job) return false;
  if (job.route_id !== PERSONALIZED_DELIVERY_ROUTE || !job.sponsored_route_key) return true;
  if (!["artifact_validated", "delivered"].includes(job.status) || job.delivery_eligibility !== "eligible"
    || !job.output_sha256 || !job.output_storage_path || !job.artifact_validated_at || !job.page_count) return false;
  const current = await currentPersonalizedVerification(job.sponsored_consumer_auth_user_id, job.sponsored_consumer_briefcase_item_id);
  if (current.hash !== job.sponsored_verification_hash) return false;
  const prepared = preparePersonalizedPacket({ authUserId: job.sponsored_consumer_auth_user_id,
    briefcaseItemId: job.sponsored_consumer_briefcase_item_id, personId: job.person_id, matterId: job.matter_id,
    verificationHash: current.hash, snapshot: current.snapshot });
  if (prepared.spec.packetId !== job.packet_id || prepared.spec.inputHash !== job.input_hash) return false;
  const authority = await sponsoredRenderAuthority({ routeId: job.route_id, sourceSessionId: job.sponsored_session_id,
    briefcaseItemId: job.sponsored_consumer_briefcase_item_id, authUserId: job.sponsored_consumer_auth_user_id });
  if (!authority || authority.partner_id !== job.partner_id || authority.clinic_event_id !== job.sponsored_clinic_event_id) return false;
  const identity = commercialRouteIdentity({ jurisdiction: current.snapshot.jurisdiction, pathwayId: current.snapshot.pathwayId });
  governArtifactAttachment(identity, fulfillmentRequestContext({
    participantUserId: job.sponsored_consumer_auth_user_id, matterOwnerUserId: job.sponsored_consumer_auth_user_id,
    matterId: job.matter_id,
    finalVerification: finalVerificationSnapshotFrom({ snapshot: current.snapshot, verificationHash: current.hash,
      matterId: job.matter_id, ownerUserId: job.sponsored_consumer_auth_user_id, packetFamilyId: identity.packetFamilyId }),
    storage: artifactStorageContext({ privateStorage: true, artifactSha256: job.output_sha256, repeatDownload: false })
  }));
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
