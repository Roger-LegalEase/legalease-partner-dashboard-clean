import "server-only";

import { createHash } from "node:crypto";

import {
  consumerMatterIdForItem,
  CONSUMER_PERSON_NAMESPACE,
  resolveConsumerPersonId
} from "@/lib/expungement-ai/consumer-identity";
import {
  CONSUMER_PACKET_PRODUCT_ID,
  consumerPacketPaymentAuthority
} from "@/lib/expungement-ai/consumer-payment-authority";
import { getBriefcaseItem, getBriefcaseItemForWebhook } from "@/lib/expungement-ai/briefcase";
import { packetInformationModelFor, type PacketInformationModel } from "@/lib/expungement-ai/packet-information";
import type { ConsumerBriefcaseItem } from "@/lib/expungement-ai/types";
import { buildRenderJobSpec, RenderContractError } from "@/lib/rcap/render/job-contract";
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
  // The route resolved but the server could not derive a verifiable job
  // specification for it — a corpus inconsistency, not anything the
  // participant did or can fix. Fail before the durable job exists.
  | { status: "route_contract_unverifiable"; reason: string }
  | { status: "enqueue_failed"; reason: string };

const CONSUMER_PACKET_NAMESPACE = "rcap:consumer-packet:v1";
const CONSUMER_PACKET_STORAGE_PATHWAY = "source_engine_packet_plan";
const CONSUMER_PACKET_SAFETY_DISCLAIMER = "This personalized self-help packet is not legal advice and does not guarantee court approval. Review every answer and confirm current local filing requirements before filing.";

function deterministicUuid(seed: string): string {
  const h = createHash("sha256").update(seed).digest("hex");
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/**
 * Resolves the packet row this Briefcase item renders from, creating it once.
 *
 * The id is derived from the item, so a retry with the same reviewed answers
 * finds the same packet and lands on Phase 53's idempotency. A later correction
 * keeps the same paid matter but changes the answer-bound input hash, allowing
 * a corrected render without creating another payment entitlement.
 */
async function resolveConsumerPacketId(input: {
  authUserId: string;
  briefcaseItemId: string;
  personId: string;
  matterId: string;
  jurisdiction: string;
  pathwayLabel: string;
  item: ConsumerBriefcaseItem;
  packetInformation: PacketInformationModel;
  packetFields: Record<string, unknown>;
}): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const packetId = deterministicUuid(`${CONSUMER_PACKET_NAMESPACE}:${input.briefcaseItemId}`);
  const packetRow = consumerPacketRow(input);

  const existing = await supabase
    .from("rcap_document_packets")
    .select("id, partner_slug, user_id, briefcase_id")
    .eq("id", packetId)
    .maybeSingle<{
      id: string;
      partner_slug: string;
      user_id: string | null;
      briefcase_id: string | null;
    }>();

  if (existing.error) return null;
  if (existing.data && (
    existing.data.partner_slug !== CONSUMER_PERSON_NAMESPACE
    || existing.data.user_id !== input.authUserId
    || existing.data.briefcase_id !== input.briefcaseItemId
  )) return null;

  const saved = existing.data
    ? await supabase
      .from("rcap_document_packets")
      .update(packetRow)
      .eq("id", packetId)
      .eq("user_id", input.authUserId)
      .eq("briefcase_id", input.briefcaseItemId)
      .select("id")
      .maybeSingle<{ id: string }>()
    : await supabase
      .from("rcap_document_packets")
      .insert({
        id: packetId,
        // The same reserved namespace the consumer person uses. It is not a
        // partner, and no partner accounting reads it: a consumer job carries
        // a null partner_id and takes the zero_charge path, so nothing here can
        // consume a partner's credit.
        partner_slug: CONSUMER_PERSON_NAMESPACE,
        user_id: input.authUserId,
        briefcase_id: input.briefcaseItemId,
        ...packetRow
      })
      .select("id")
      .maybeSingle<{ id: string }>();

  if (saved.error || saved.data?.id !== packetId) return null;

  // Preserve the full reviewed answer snapshot even where the legacy packet
  // table has no dedicated column. The immutable worker renders the common
  // court-facing fields above; future renderer revisions can consume the same
  // source payload without trusting browser input or reconstructing history.
  const inputs = await supabase
    .from("rcap_document_packet_inputs")
    .upsert({
      document_packet_id: packetId,
      partner_slug: CONSUMER_PERSON_NAMESPACE,
      intake_session_id: null,
      input_payload: {
        schemaVersion: "expungement-ai-consumer-packet/v1",
        productId: CONSUMER_PACKET_PRODUCT_ID,
        authUserId: input.authUserId,
        briefcaseItemId: input.briefcaseItemId,
        personId: input.personId,
        matterId: input.matterId,
        jurisdiction: input.jurisdiction,
        pathwayLabel: input.pathwayLabel,
        reviewedAt: input.packetInformation.reviewedAt,
        packetFields: input.packetFields
      }
    }, { onConflict: "document_packet_id" })
    .select("document_packet_id")
    .maybeSingle<{ document_packet_id: string }>();

  if (inputs.error || inputs.data?.document_packet_id !== packetId) return null;

  return packetId;
}

function consumerPacketRow(input: {
  personId: string;
  jurisdiction: string;
  pathwayLabel: string;
  item: ConsumerBriefcaseItem;
  packetInformation: PacketInformationModel;
  packetFields: Record<string, unknown>;
}) {
  const fullName = packetText(input.packetFields, "participant_full_legal_name", "full_legal_name", "name");
  const splitName = splitFullName(fullName);
  const county = packetText(input.packetFields, "county", "court_county");
  const court = packetText(input.packetFields, "court", "court_name");
  const charge = packetText(input.packetFields, "charge", "offense");
  const caseOutcome = packetText(input.packetFields, "case_outcome", "disposition");
  const criminalHistory = packetText(input.packetFields, "criminal_history");
  const generatedStatement = [
    input.item.summary?.trim(),
    `Matter pathway: ${input.pathwayLabel}.`,
    caseOutcome ? `Case outcome supplied: ${caseOutcome}.` : "",
    criminalHistory ? `Record information supplied: ${criminalHistory}.` : ""
  ].filter(Boolean).join("\n\n");

  return {
    person_id: input.personId,
    state: input.jurisdiction,
    jurisdiction: input.jurisdiction,
    document_type: "source_driven_packet",
    // rcap_document_packets intentionally stores a constrained source-packet
    // classification. The exact authoritative route remains on the render job
    // (`PA:Path A …`) and in the immutable input snapshot above.
    pathway: CONSUMER_PACKET_STORAGE_PATHWAY,
    status: "ready_for_review",
    petitioner_first_name: splitName.firstName,
    petitioner_last_name: splitName.lastName,
    petitioner_city: packetText(input.packetFields, "residency_or_location", "city"),
    petitioner_county: county,
    court_county: county,
    court_name: court,
    cause_number: packetText(input.packetFields, "cause_number", "case_number", "docket_number"),
    charge,
    offense_date: packetText(input.packetFields, "offense_date"),
    arrest_date: packetText(input.packetFields, "arrest_date"),
    arresting_agency: packetText(input.packetFields, "arresting_agency"),
    agency_case_number: packetText(input.packetFields, "agency_case_number", "otn"),
    disposition_date: packetText(input.packetFields, "disposition_date"),
    conviction_date: packetText(input.packetFields, "conviction_date"),
    sentence_completion_date: packetText(input.packetFields, "sentence_completion_date"),
    needs_record_review: true,
    generated_plain_text: generatedStatement,
    filing_instructions: input.item.nextSteps,
    county_court_instructions: court || county
      ? [`Confirm the current filing location and local requirements with ${court || `${county} County court`}.`]
      : [],
    missing_fields: input.packetInformation.missingInputIds,
    safety_disclaimer: CONSUMER_PACKET_SAFETY_DISCLAIMER
  };
}

function packetText(fields: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = fields[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
    if (Array.isArray(value)) {
      const joined = value.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim())).join(", ");
      if (joined) return joined;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = (value as { value?: unknown }).value;
      if (typeof nested === "string" && nested.trim()) return nested.trim();
      if (typeof nested === "number") return String(nested);
    }
  }
  return null;
}

function splitFullName(value: string | null): { firstName: string | null; lastName: string | null } {
  if (!value) return { firstName: null, lastName: null };
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) ?? null };
}

function canonicalPacketFields(item: ConsumerBriefcaseItem, model: PacketInformationModel) {
  return {
    ...model.initialAnswers,
    // These two are server-resolved facts. Put them last so a legacy screening
    // answer can never override the authoritative state or pathway.
    jurisdiction: model.stateCode,
    pathway_id: model.pathwayId ?? item.pathwayLabel ?? ""
  };
}

export async function requestConsumerPacketRender(input: {
  /** From the server-verified session. Never from the request body. */
  authUserId: string | null;
  briefcaseItemId: string;
}): Promise<ConsumerRenderOutcome> {
  return requestConsumerPacketRenderInternal(input, "session");
}

/**
 * The signed webhook has no participant request cookie, so it must re-read the
 * same item through the service-role client. This is not exported to a route;
 * the caller supplies the user and item identities taken from verified Stripe
 * metadata and the function independently rechecks the canonical item owner.
 */
export async function requestConsumerPacketRenderForWebhook(input: {
  authUserId: string;
  briefcaseItemId: string;
}): Promise<ConsumerRenderOutcome> {
  return requestConsumerPacketRenderInternal(input, "service");
}

async function requestConsumerPacketRenderInternal(input: {
  authUserId: string | null;
  briefcaseItemId: string;
}, lookup: "session" | "service"): Promise<ConsumerRenderOutcome> {
  if (!input.authUserId) return { status: "unauthenticated" };
  const authUserId = input.authUserId;

  // Checked before anything else touches the database, so a disabled route is
  // inert rather than merely unhelpful.
  const access = resolveConsumerDeliveryAccess({ subjectId: authUserId });
  if (!access.allowed) return { status: "route_disabled", reason: access.reason };

  // Scoped by user id, so this both resolves the item and proves ownership.
  // A request naming another user's item returns nothing to work with.
  const item = lookup === "service"
    ? await getBriefcaseItemForWebhook(authUserId, input.briefcaseItemId)
    : await getBriefcaseItem(authUserId, input.briefcaseItemId);
  if (!item) return { status: "item_not_found" };

  const packetInformation = packetInformationModelFor(item);
  if (!packetInformation
    || packetInformation.stage !== "ready_to_generate"
    || packetInformation.missingInputIds.length > 0
    || !packetInformation.reviewedAt) {
    return { status: "route_not_renderable", reason: "packet information has not passed the accuracy review" };
  }
  const packetFields = canonicalPacketFields(item, packetInformation);

  // Exact track identity from the item's own server-authored metadata, so a
  // deferred composed route is refused here — before a packet row is created,
  // before payment is consulted, before a person is resolved and before
  // anything is enqueued.
  //
  // The profile identity and version are no longer passed in. They used to be:
  // `profileId: item.state` — a stored Briefcase display value — beside a
  // literal `profileVersion: "1.3.0"` that no compiled profile has ever
  // carried. Every consumer job was therefore stamped with an unknown profile
  // version, the worker's allowlist refused the claim before rendering, and no
  // paid packet could ever be delivered (hosted run 32195867963). Both are now
  // derived inside buildRenderJobSpec from the compiled profile the route
  // itself resolved against, so the browser, Stripe metadata and a stale
  // stored value have no way to name them.
  let built;
  try {
    built = buildRenderJobSpec({
      packetId: deterministicUuid(`${CONSUMER_PACKET_NAMESPACE}:${item.id}`),
      state: item.state,
      pathway: item.pathwayLabel,
      briefcaseItemId: item.id,
      trackId: item.selectedTrackId
        ?? (typeof item.artifactRefs?.selectedTrackId === "string" ? item.artifactRefs.selectedTrackId : null),
      packetFields
    });
  } catch (error) {
    // A route that resolves but cannot be described by a verifiable
    // specification stops here, before a person is resolved, before payment
    // authority is consulted and before any durable row exists.
    return {
      status: "route_contract_unverifiable",
      reason: error instanceof RenderContractError
        ? `${error.errorCode}: ${error.message}`
        : error instanceof Error ? error.message : String(error)
    };
  }
  if (!built.spec) return { status: "route_not_renderable", reason: built.route.reason };

  const person = await resolveConsumerPersonId(authUserId);
  if (!person.ok) return { status: "identity_unresolved", reason: person.reason };

  const matterId = consumerMatterIdForItem(item.id);

  // The authority includes every immutable identity that will be copied into
  // the durable job. A paid row for another item, person, matter or product is
  // not close enough and cannot authorize enqueue.
  const authority = await consumerPacketPaymentAuthority(item.id, authUserId, {
    productId: CONSUMER_PACKET_PRODUCT_ID,
    personId: person.personId,
    matterId
  });
  if (!authority.valid) return { status: "payment_required", reason: authority.reason };

  const packetId = await resolveConsumerPacketId({
    authUserId,
    briefcaseItemId: item.id,
    personId: person.personId,
    matterId,
    jurisdiction: built.route.jurisdiction,
    pathwayLabel: built.route.pathwayId,
    item,
    packetInformation,
    packetFields
  });
  if (!packetId) return { status: "identity_unresolved", reason: "could not resolve a consumer packet record" };

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
