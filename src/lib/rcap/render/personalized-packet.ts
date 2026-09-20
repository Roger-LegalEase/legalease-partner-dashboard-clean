import { workerStaticPacketBinding } from "@/lib/rcap/fulfillment/worker-static-authority";
import "server-only";
import { loadMsPaidConsumerSuccessor, MS_PAID_SUCCESSOR_ROUTE } from "@/lib/rcap/fulfillment/paid-consumer-successor";

import { createHash } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getBriefcaseItemForWebhook } from "@/lib/expungement-ai/briefcase";
import { requireCurrentPacketVerification } from "@/lib/expungement-ai/packet-information";
import { packetFulfillmentAuthority } from "@/lib/expungement-ai/packet-fulfillment-authority";
import { consumerMatterIdForItem } from "@/lib/expungement-ai/consumer-identity";
import { CONSUMER_PACKET_SAFETY_DISCLAIMER } from "@/lib/expungement-ai/consumer-packet-safety";
import { composeParticipantDeliveryPacket } from "@/lib/rcap/grade-a/participant-packet";
import { composablePacketSpecificationFor } from "@/lib/rcap/grade-a/packet-specification";
import { GRADE_A_RENDERER_KIND, GRADE_A_RENDERER_VERSION } from "@/lib/rcap/grade-a/renderer";
import { normalizeLocale } from "@/lib/expungement-ai/localization";
import {
  renderParticipantPacketPdf, participantGuideMatter, resolveDeliveryLocale,
  PARTICIPANT_DELIVERY_VARIANT
} from "@/lib/rcap/render/participant-packet-assembly";
import { supplementalGuideIdentityFor } from "@/lib/rcap/supplemental/guide-registry";
import {
  GUIDE_RENDERER_KIND, GUIDE_RENDERER_VERSION, type GuideLocale
} from "@/lib/rcap/supplemental/guide-renderer";
import { stableStringify } from "@/lib/rcap/fulfillment/grade-a-registry";
import { buildRenderJobSpec, computeInputHash, type RenderJobClaim } from "@/lib/rcap/render/job-contract";
import type { PacketVerificationSnapshot } from "@/lib/expungement-ai/types";

export const PERSONALIZED_DELIVERY_ROUTE = "IL:felony-prostitution-relief";

/**
 * WHICH ROUTES BELONG TO PERSONALIZED DELIVERY. NOT WHICH MAY RENDER TODAY.
 *
 * These are two different questions and this answers only the first. The
 * earlier version answered both at once: Mississippi counted as a personalized
 * route only while `loadMsPaidConsumerSuccessor()` returned a decision, so the
 * moment that owner approval went stale the route stopped being personalized
 * rather than stopping being authorized.
 *
 * That is not a refusal. `renderClaimPacket` asks this predicate first and
 * falls through to `renderRcapPacketPdf` when it is false, so a stale approval
 * silently re-routed Mississippi onto the legacy generator -- a path ADR-0004
 * and AGENTS.md record as not an approved commercial fulfillment path. Losing
 * authority produced a downgrade, and nothing reported it, because from the
 * dispatcher's side nothing had gone wrong: it was told this was not a
 * personalized route and it believed it.
 *
 * So membership is static and authority is enforced where authority lives:
 * `packetFulfillmentAuthority` on the preparation path, and
 * `workerStaticPacketBinding` on the worker's. Both already refuse by
 * throwing. A route named here whose authority is stale or absent now reaches
 * those refusals instead of quietly leaving the lane.
 *
 * It is a set of exact route ids, not a registry and not a pattern. Nothing
 * joins by jurisdiction, family or resemblance.
 */
const PERSONALIZED_DELIVERY_ROUTES: ReadonlySet<string> = new Set([
  PERSONALIZED_DELIVERY_ROUTE,
  MS_PAID_SUCCESSOR_ROUTE
]);

export function isPersonalizedDeliveryRoute(routeId: string): boolean {
  return PERSONALIZED_DELIVERY_ROUTES.has(routeId);
}

/**
 * The commercial half of the old predicate, kept callable for anything that
 * genuinely needs to ask whether Mississippi's successor scope is live.
 *
 * Nothing on the rendering path may use it to decide which renderer runs.
 */
export function msPaidSuccessorAvailable(): boolean {
  return loadMsPaidConsumerSuccessor() !== null;
}

function uuidFor(seed: string) {
  const h = createHash("sha256").update(seed).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Derive the immutable worker input from a protected verification. No packet
 * content, route choice, spec, family, owner or verification comes from a body.
 */
type PersonalizedInput = {
  authUserId: string; briefcaseItemId: string; personId: string; matterId: string;
  verificationHash: string; snapshot: PacketVerificationSnapshot;
  /**
   * The matter's delivery language, from `currentPersonalizedVerification`.
   *
   * Required rather than optional: it is part of the immutable render identity
   * below, so a caller omitting it would not merely pick English, it would mint
   * a packet id that does not distinguish the two languages.
   */
  deliveryLocale: GuideLocale;
};
export function preparePersonalizedPacket(input: PersonalizedInput) {
  const { snapshot } = input;
  const authority = packetFulfillmentAuthority(snapshot.jurisdiction, snapshot.pathwayId, "packet generation", {trackId:snapshot.selectedTrackId});
  if (!authority.allowed) throw new Error(`personalized render authority refused: ${authority.reason}`);
  if (!authority.record.packetSpecificationFileSha256) throw new Error("personalized specification source hash missing");
  return prepareBoundPersonalizedPacket(input, {packetSpecificationSha256:authority.record.packetSpecificationSha256,
    packetSpecificationFileSha256:authority.record.packetSpecificationFileSha256});
}
function prepareBoundPersonalizedPacket(input: PersonalizedInput, binding: {packetSpecificationSha256: string; packetSpecificationFileSha256: string}) {
  const { snapshot } = input;
  const routeId = `${snapshot.jurisdiction}:${snapshot.pathwayId}`;
  if (!isPersonalizedDeliveryRoute(routeId)
    || input.matterId !== consumerMatterIdForItem(input.briefcaseItemId)
    || !/^[a-f0-9]{64}$/.test(input.verificationHash)) throw new Error("personalized render identity mismatch");
  const specification = composablePacketSpecificationFor(routeId);
  if (!specification) throw new Error("personalized specification unavailable");
  const facts: Record<string, string> = {};
  // Verification owns the snapshot. Server-owned fields take precedence, and
  // only fields named by this document set reach the composer.
  const merged = { ...snapshot.screeningAnswers, ...snapshot.prefilledAnswers, ...snapshot.packetAnswers, ...snapshot.serverFacts };
  for (const { factId } of specification.requiredFacts) {
    const answer = merged[factId];
    // Protected verification supports explicit-known answer wrappers. Never
    // stringify an object or turn an unknown answer into a participant fact.
    const value = answer && typeof answer === "object" && !Array.isArray(answer)
      ? ((answer as {unknown?: boolean}).unknown === true ? undefined : (answer as {value?: unknown}).value) : answer;
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
    specificationSha256: binding.packetSpecificationSha256,
    specificationFileSha256: binding.packetSpecificationFileSha256,
    provider: GRADE_A_RENDERER_KIND, providerVersion: GRADE_A_RENDERER_VERSION,
    /*
     * THE SUPPLEMENTAL GUIDE IS PART OF THE RENDER IDENTITY.
     *
     * The packet id is a uuid over this payload and the input hash is derived
     * from it, so everything named here is something the worker cannot change
     * without the job becoming a different job. Before §7 the guide was not in
     * it, which was harmless only while no guide was ever assembled: the
     * moment the delivered PDF depends on the guide's words, a guide edited
     * between generation and render would produce different participant bytes
     * under an identity that said nothing had changed, and the download's
     * re-render check would fail against a digest nobody could explain.
     *
     * `null` is written explicitly for a route with no guide. "This route has
     * no guide" and "nobody asked about a guide" must not serialise the same
     * way, or adding §7 to a route later would silently reuse the identity of
     * packets built before it.
     *
     * The variant is here for the same reason: `full` and `court_only` are
     * different documents, and a stored artifact of one must never verify as
     * the other.
     */
    supplementalGuide: supplementalGuideIdentityFor(routeId) ?? null,
    /*
     * Language is identity. English and Spanish are different documents, and
     * before this the payload could not tell them apart: the same matter, the
     * same guide and a different language produced the same packet id and the
     * same input hash. A worker could then serve one language's bytes for the
     * other's job, and the download's re-render would compare a Spanish packet
     * against an English digest.
     */
    deliveryLocale: input.deliveryLocale,
    assemblyVariant: PARTICIPANT_DELIVERY_VARIANT,
    assemblyKind: GUIDE_RENDERER_KIND, assemblyVersion: GUIDE_RENDERER_VERSION
  };
  const packetId = uuidFor(`rcap:personalized-packet:v1:${stableStringify(payload)}`);
  const built = buildRenderJobSpec({ packetId, state: snapshot.jurisdiction, pathway: snapshot.pathwayId,
    trackId: snapshot.selectedTrackId, briefcaseItemId: input.briefcaseItemId, packetFields: payload });
  if (!built.spec) throw new Error("personalized route cannot render");
  return {
    packet, specification, spec: built.spec,
    payload: {
      // The enqueue transactions insert this row as-is; every not-null column
      // without a database default must be present (safety_disclaimer has none).
      renderPacket: { id: packetId, user_id: input.authUserId, briefcase_id: input.briefcaseItemId,
        person_id: input.personId, state: snapshot.jurisdiction, jurisdiction: snapshot.jurisdiction,
        document_type: "source_driven_packet", pathway: "source_engine_packet_plan", status: "ready_for_review",
        safety_disclaimer: CONSUMER_PACKET_SAFETY_DISCLAIMER },
      renderInputPayload: { ...payload, inputHash: built.spec.inputHash }
    }
  };
}

export async function currentPersonalizedVerification(authUserId: string, briefcaseItemId: string) {
  const item = await getBriefcaseItemForWebhook(authUserId, briefcaseItemId);
  if (!item) throw new Error("personalized render owner unavailable");
  const verification = await requireCurrentPacketVerification(authUserId, item);
  /*
   * The delivery language rides with the verification because every caller that
   * prepares a personalized packet already asks for one, and pairing them here
   * is what stops a caller resolving the locale its own way -- or, as before,
   * not resolving it at all and letting the assembler default to English.
   *
   * It comes from the matter's durable attribution, written by the atomic claim
   * from the locale the participant was screening in. Never from a request.
   */
  return { ...verification, deliveryLocale: resolveDeliveryLocale(item.artifactRefs) };
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
  /*
   * The language this JOB was minted in, read back from the durable input.
   *
   * Not resolved again from the matter: a participant who switches language
   * after paying must not change the packet their paid job names. The payload
   * has already been proven to hash to `claim.inputHash` above, so this value
   * is as immutable as the rest of the render identity -- and because
   * `prepareBoundPersonalizedPacket` puts it back into the payload it derives
   * the packet id from, a mismatch between the stored locale and the one used
   * here fails the identity comparison below rather than rendering quietly in
   * the wrong language.
   */
  const jobLocale = normalizeLocale(typeof payload.deliveryLocale === "string" ? payload.deliveryLocale : null);
  const binding = workerStaticPacketBinding(claim.routeId, verification.snapshot.selectedTrackId);
  if (!binding) throw new Error("personalized static render authority refused");
  const prepared = prepareBoundPersonalizedPacket({ authUserId: payload.authUserId, briefcaseItemId: payload.briefcaseItemId,
    personId: claim.personId ?? "", matterId: claim.matterId ?? "", verificationHash: verification.hash,
    snapshot: verification.snapshot, deliveryLocale: jobLocale }, binding);
  if (prepared.spec.packetId !== claim.packetId || prepared.spec.inputHash !== claim.inputHash
    || prepared.spec.rendererKind !== claim.rendererKind || prepared.spec.rendererVersion !== claim.rendererVersion
    || prepared.spec.profileId !== claim.profileId || prepared.spec.profileVersion !== claim.profileVersion) {
    throw new Error("personalized render specification changed");
  }
  /*
   * Assembled, not rendered bare. This line used to be
   * `renderGradeAPacketPdf(prepared.packet)`, which returned the court-facing
   * documents and nothing else -- so every participant who paid received a
   * packet with no §7 guide, on a route whose specification had already
   * retired its own filing-instructions page in favour of one.
   *
   * The variant and the guide come from the same identity the job was built
   * with, through the single assembly function the download check also uses.
   */
  return renderParticipantPacketPdf(prepared.packet, {
    routeKey: claim.routeId,
    specification: prepared.specification,
    variant: PARTICIPANT_DELIVERY_VARIANT,
    // The locale the JOB was built with, read back from the validated payload
    // rather than resolved again. A participant who changes language after
    // paying must not make the worker render something other than the packet
    // their job identity names.
    locale: jobLocale,
    verifiedAt: verification.snapshot.verifiedAt,
    matter: participantGuideMatter(verification.snapshot, claim.packetId, jobLocale)
  });
}
