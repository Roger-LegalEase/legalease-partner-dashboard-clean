import "server-only";

import { createHash } from "node:crypto";

import {
  consumerMatterIdForItem,
  CONSUMER_PERSON_NAMESPACE,
  resolveConsumerPersonId
} from "@/lib/expungement-ai/consumer-identity";
import { consumerPacketPaymentAuthority } from "@/lib/expungement-ai/consumer-payment-authority";
import { getBriefcaseItem } from "@/lib/expungement-ai/briefcase";
import { buildRenderJobSpec } from "@/lib/rcap/render/job-contract";
import { enqueueRenderJob } from "@/lib/rcap/render/job-queue";
import { resolveConsumerDeliveryAccess } from "@/lib/rcap/render/consumer-delivery-control";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * The application-side half of the paid consumer journey.
 *
 * Everything the render job is keyed on is derived here from the verified
 * session and the database, never from the request. The request carries exactly
 * one value — which Briefcase item — and even that is only used as a lookup
 * scoped to the session user, so naming someone else's item finds nothing
 * rather than reaching it.
 *
 * This function does not mark anything delivered. It creates a durable job and
 * stops; the worker renders it and the download route authorizes it. Keeping
 * that boundary is what makes "the application cannot manufacture a delivery"
 * true by structure rather than by care.
 */

export type ConsumerRenderOutcome =
  | { status: "queued"; jobId: string; briefcaseItemId: string; matterId: string; personId: string }
  | { status: "route_disabled"; reason: string }
  | { status: "unauthenticated" }
  | { status: "item_not_found" }
  | { status: "route_not_renderable"; reason: string }
  | { status: "payment_required"; reason: string }
  | { status: "identity_unresolved"; reason: string }
  | { status: "enqueue_failed"; reason: string };

const CONSUMER_PACKET_NAMESPACE = "rcap:consumer-packet:v1";

function deterministicUuid(seed: string): string {
  const h = createHash("sha256").update(seed).digest("hex");
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/**
 * Resolves the packet row this Briefcase item renders from, creating it once.
 *
 * The id is derived from the item, so a second request for the same item finds
 * the same packet, produces the same input hash, and lands on Phase 53's
 * idempotency rather than queueing a second job that would deliver twice.
 */
async function resolveConsumerPacketId(input: {
  authUserId: string;
  briefcaseItemId: string;
  jurisdiction: string;
  pathwayId: string;
}): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const packetId = deterministicUuid(`${CONSUMER_PACKET_NAMESPACE}:${input.briefcaseItemId}`);

  const existing = await supabase
    .from("rcap_document_packets")
    .select("id")
    .eq("id", packetId)
    .maybeSingle<{ id: string }>();

  if (existing.data?.id) return existing.data.id;

  const inserted = await supabase
    .from("rcap_document_packets")
    .insert({
      id: packetId,
      // The same reserved namespace the consumer person uses. It is not a
      // partner, and no partner accounting reads it: a consumer job carries a
      // null partner_id and takes the zero_charge path, so nothing here can
      // consume a partner's credit.
      partner_slug: CONSUMER_PERSON_NAMESPACE,
      user_id: input.authUserId,
      briefcase_id: input.briefcaseItemId,
      state: input.jurisdiction,
      jurisdiction: input.jurisdiction,
      pathway: input.pathwayId
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (inserted.data?.id) return inserted.data.id;

  const afterRace = await supabase
    .from("rcap_document_packets")
    .select("id")
    .eq("id", packetId)
    .maybeSingle<{ id: string }>();

  return afterRace.data?.id ?? null;
}

export async function requestConsumerPacketRender(input: {
  /** From the server-verified session. Never from the request body. */
  authUserId: string | null;
  briefcaseItemId: string;
}): Promise<ConsumerRenderOutcome> {
  if (!input.authUserId) return { status: "unauthenticated" };
  const authUserId = input.authUserId;

  // Checked before anything else touches the database, so a disabled route is
  // inert rather than merely unhelpful.
  const access = resolveConsumerDeliveryAccess({ subjectId: authUserId });
  if (!access.allowed) return { status: "route_disabled", reason: access.reason };

  // Scoped by user id, so this both resolves the item and proves ownership.
  // A request naming another user's item returns nothing to work with.
  const item = await getBriefcaseItem(authUserId, input.briefcaseItemId);
  if (!item) return { status: "item_not_found" };

  // Exact track identity from the item's own server-authored metadata, so a
  // deferred composed route is refused here — before a packet row is created,
  // before payment is consulted, before a person is resolved and before
  // anything is enqueued.
  const built = buildRenderJobSpec({
    packetId: deterministicUuid(`${CONSUMER_PACKET_NAMESPACE}:${item.id}`),
    state: item.state,
    pathway: item.pathwayLabel,
    profileId: item.state ?? "",
    profileVersion: "1.3.0",
    briefcaseItemId: item.id,
    trackId: item.selectedTrackId
      ?? (typeof item.artifactRefs?.selectedTrackId === "string" ? item.artifactRefs.selectedTrackId : null),
    packetFields: {}
  });
  if (!built.spec) return { status: "route_not_renderable", reason: built.route.reason };

  // The payment must already be server-authoritative. This asks the same
  // question finalization will ask, so the route cannot queue work the gate
  // will later refuse to deliver.
  const authority = await consumerPacketPaymentAuthority(item.id, authUserId);
  if (!authority.valid) return { status: "payment_required", reason: authority.reason };

  const person = await resolveConsumerPersonId(authUserId);
  if (!person.ok) return { status: "identity_unresolved", reason: person.reason };

  const packetId = await resolveConsumerPacketId({
    authUserId,
    briefcaseItemId: item.id,
    jurisdiction: built.route.jurisdiction,
    pathwayId: built.route.pathwayId
  });
  if (!packetId) return { status: "identity_unresolved", reason: "could not resolve a consumer packet record" };

  const matterId = consumerMatterIdForItem(item.id);

  const job = await enqueueRenderJob(built.spec, {
    mode: "consumer",
    consumerBriefcaseItemId: item.id,
    // Session-derived. The database independently loads the item's canonical
    // owner and refuses the insert unless the two agree.
    expectedConsumerAuthUserId: authUserId,
    personId: person.personId,
    matterId
  });

  if (!job) return { status: "enqueue_failed", reason: "the render queue refused or is unavailable" };

  return {
    status: "queued",
    jobId: job.id,
    briefcaseItemId: item.id,
    matterId,
    personId: person.personId
  };
}
