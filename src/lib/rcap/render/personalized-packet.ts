import "server-only";

import { createHash } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getBriefcaseItemForWebhook } from "@/lib/expungement-ai/briefcase";
import { requireCurrentPacketVerification } from "@/lib/expungement-ai/packet-information";
import { packetFulfillmentAuthority } from "@/lib/expungement-ai/packet-fulfillment-authority";
import { consumerMatterIdForItem } from "@/lib/expungement-ai/consumer-identity";
import { composeParticipantDeliveryPacket } from "@/lib/rcap/grade-a/participant-packet";
import { composablePacketSpecificationFor } from "@/lib/rcap/grade-a/packet-specification";
import { renderGradeAPacketPdf, GRADE_A_RENDERER_KIND, GRADE_A_RENDERER_VERSION } from "@/lib/rcap/grade-a/renderer";
import { stableStringify } from "@/lib/rcap/fulfillment/grade-a-registry";
import { buildRenderJobSpec, computeInputHash, type RenderJobClaim } from "@/lib/rcap/render/job-contract";
import type { PacketVerificationSnapshot } from "@/lib/expungement-ai/types";

export const PERSONALIZED_DELIVERY_ROUTE = "IL:felony-prostitution-relief";

function uuidFor(seed: string) {
  const h = createHash("sha256").update(seed).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Derive the immutable worker input from a protected verification. No packet
 * content, route choice, spec, family, owner or verification comes from a body.
 */
export function preparePersonalizedPacket(input: {
  authUserId: string; briefcaseItemId: string; personId: string; matterId: string;
  verificationHash: string; snapshot: PacketVerificationSnapshot;
}) {
  const { snapshot } = input;
  const routeId = `${snapshot.jurisdiction}:${snapshot.pathwayId}`;
  if (routeId !== PERSONALIZED_DELIVERY_ROUTE
    || input.matterId !== consumerMatterIdForItem(input.briefcaseItemId)
    || !/^[a-f0-9]{64}$/.test(input.verificationHash)) throw new Error("personalized render identity mismatch");
  const authority = packetFulfillmentAuthority(snapshot.jurisdiction, snapshot.pathwayId, "packet generation", {
    trackId: snapshot.selectedTrackId
  });
  if (!authority.allowed) throw new Error(`personalized render authority refused: ${authority.reason}`);
  const specification = composablePacketSpecificationFor(routeId);
  if (!specification) throw new Error("personalized specification unavailable");
  const facts: Record<string, string> = {};
  // Verification owns the snapshot. Server-owned fields take precedence, and
  // only fields named by this document set reach the composer.
  const merged = { ...snapshot.screeningAnswers, ...snapshot.prefilledAnswers, ...snapshot.packetAnswers, ...snapshot.serverFacts };
  for (const { factId } of specification.requiredFacts) {
    const value = merged[factId];
    if (typeof value === "string" || typeof value === "number") facts[factId] = String(value);
  }
  const packet = composeParticipantDeliveryPacket(specification, {
    routeKey: routeId, jurisdiction: snapshot.jurisdiction, pathwayId: snapshot.pathwayId ?? "",
    facts, verificationHash: input.verificationHash, verifiedAt: snapshot.verifiedAt
  });
  const payload = {
    schemaVersion: "rcap-personalized-render/v1", authUserId: input.authUserId,
    briefcaseItemId: input.briefcaseItemId, personId: input.personId, matterId: input.matterId,
    verificationHash: input.verificationHash, snapshot, routeId,
    trackId: snapshot.selectedTrackId, packetFamilyId: specification.packetFamily,
    specificationId: specification.specificationId, specificationVersion: specification.specificationVersion,
    specificationSha256: authority.record.packetSpecificationSha256,
    specificationFileSha256: authority.record.packetSpecificationFileSha256,
    provider: GRADE_A_RENDERER_KIND, providerVersion: GRADE_A_RENDERER_VERSION
  };
  const packetId = uuidFor(`rcap:personalized-packet:v1:${stableStringify(payload)}`);
  const built = buildRenderJobSpec({ packetId, state: snapshot.jurisdiction, pathway: snapshot.pathwayId,
    trackId: snapshot.selectedTrackId, briefcaseItemId: input.briefcaseItemId, packetFields: payload });
  if (!built.spec) throw new Error("personalized route cannot render");
  return {
    packet, spec: built.spec,
    payload: {
      renderPacket: { id: packetId, user_id: input.authUserId, briefcase_id: input.briefcaseItemId,
        person_id: input.personId, state: snapshot.jurisdiction, jurisdiction: snapshot.jurisdiction,
        document_type: "source_driven_packet", pathway: "source_engine_packet_plan", status: "ready_for_review" },
      renderInputPayload: { ...payload, inputHash: built.spec.inputHash }
    }
  };
}

export async function currentPersonalizedVerification(authUserId: string, briefcaseItemId: string) {
  const item = await getBriefcaseItemForWebhook(authUserId, briefcaseItemId);
  if (!item) throw new Error("personalized render owner unavailable");
  return requireCurrentPacketVerification(authUserId, item);
}

/** The executable worker's adapter. It renders the current protected facts,
 * comparing every immutable job/input identity before invoking the real composer.
 */
export async function renderPersonalizedClaim(claim: RenderJobClaim): Promise<Buffer> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error("personalized render storage unavailable");
  const { data: row, error } = await supabase.from("rcap_document_packet_inputs")
    .select("input_payload").eq("document_packet_id", claim.packetId).maybeSingle();
  if (error || !row?.input_payload) throw new Error("personalized render input unavailable");
  const payload = row.input_payload as Record<string, unknown>;
  if (payload.schemaVersion !== "rcap-personalized-render/v1"
    || payload.inputHash !== claim.inputHash
    || payload.routeId !== claim.routeId
    || payload.personId !== claim.personId || payload.matterId !== claim.matterId
    || typeof payload.authUserId !== "string" || typeof payload.briefcaseItemId !== "string") {
    throw new Error("personalized render input binding mismatch");
  }
  const hashPayload = { ...payload };
  delete hashPayload.inputHash;
  if (computeInputHash({ ...claim, packetFields: hashPayload }) !== claim.inputHash) {
    throw new Error("personalized render input hash mismatch");
  }
  const verification = await currentPersonalizedVerification(payload.authUserId, payload.briefcaseItemId);
  if (verification.hash !== payload.verificationHash || stableStringify(verification.snapshot) !== stableStringify(payload.snapshot)) {
    throw new Error("personalized render verification changed");
  }
  const prepared = preparePersonalizedPacket({ authUserId: payload.authUserId, briefcaseItemId: payload.briefcaseItemId,
    personId: claim.personId ?? "", matterId: claim.matterId ?? "", verificationHash: verification.hash, snapshot: verification.snapshot });
  if (prepared.spec.packetId !== claim.packetId || prepared.spec.inputHash !== claim.inputHash
    || prepared.spec.rendererKind !== claim.rendererKind || prepared.spec.rendererVersion !== claim.rendererVersion
    || prepared.spec.profileId !== claim.profileId || prepared.spec.profileVersion !== claim.profileVersion) {
    throw new Error("personalized render specification changed");
  }
  return renderGradeAPacketPdf(prepared.packet);
}
