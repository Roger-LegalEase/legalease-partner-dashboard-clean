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
import {
  protectedPacketInformationModelFor,
  requireCurrentPacketVerification,
  type ProtectedPacketInformationModel
} from "@/lib/expungement-ai/packet-information";
import { buildRenderJobSpec, RenderContractError } from "@/lib/rcap/render/job-contract";
import { enqueueVerifiedConsumerRender } from "@/lib/rcap/render/job-queue";
import { resolveConsumerDeliveryAccess } from "@/lib/rcap/render/consumer-delivery-control";
import {
  CommercialAdmissionDeniedError,
  commercialRouteIdentity,
  entitlementContext,
  finalVerificationSnapshotFrom,
  fulfillmentRequestContext,
  governProviderDispatch
} from "@/lib/rcap/render/commercial-admission";

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
  | { status: "enqueue_failed"; reason: string }
  | { status: "commercial_admission_denied"; reason: string };

const CONSUMER_PACKET_NAMESPACE = "rcap:consumer-packet:v1";
const CONSUMER_PACKET_STORAGE_PATHWAY = "source_engine_packet_plan";
const CONSUMER_PACKET_SAFETY_DISCLAIMER = "This personalized self-help packet is not legal advice and does not guarantee court approval. Review every answer and confirm current local filing requirements before filing.";

function deterministicUuid(seed: string): string {
  const h = createHash("sha256").update(seed).digest("hex");
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function canonicalPayloadHash(value: unknown): string {
  const canonicalize = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(canonicalize);
    if (!entry || typeof entry !== "object") return entry;
    return Object.fromEntries(
      Object.keys(entry as Record<string, unknown>)
        .sort()
        .map((key) => [key, canonicalize((entry as Record<string, unknown>)[key])])
    );
  };
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

function consumerPacketRow(input: {
  personId: string;
  jurisdiction: string;
  pathwayLabel: string;
  packetInformation: ProtectedPacketInformationModel;
  packetFields: Record<string, unknown>;
  verification: Awaited<ReturnType<typeof requireCurrentPacketVerification>>;
}) {
  const fullName = packetText(input.packetFields, "participant_full_legal_name", "full_legal_name", "name");
  const splitName = splitFullName(fullName);
  const county = packetText(input.packetFields, "county", "court_county");
  const court = packetText(input.packetFields, "court", "court_name");
  const charge = packetText(input.packetFields, "charge", "offense");
  const caseOutcome = packetText(input.packetFields, "case_outcome", "disposition");
  const criminalHistory = packetText(input.packetFields, "criminal_history");
  const generatedStatement = [
    `Authoritative screening result: ${input.verification.snapshot.resultCode ?? "packet_ready"}.`,
    `Matter pathway: ${input.pathwayLabel}.`,
    caseOutcome ? `Case outcome supplied: ${caseOutcome}.` : "",
    criminalHistory ? `Record information supplied: ${criminalHistory}.` : ""
  ].filter(Boolean).join("\n\n");
  const snapshotPlan = input.verification.snapshot.packetPlan;
  const packetReadyWhen = snapshotPlan && Array.isArray(snapshotPlan.packetReadyWhen)
    ? snapshotPlan.packetReadyWhen.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()))
    : [];

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
    filing_instructions: packetReadyWhen.length > 0
      ? packetReadyWhen
      : ["Review every generated document and confirm current local filing requirements before filing."],
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

function canonicalPacketFields(model: ProtectedPacketInformationModel) {
  return {
    ...model.initialAnswers,
    // Explicitly allowlisted protected facts are last. Arbitrary persisted
    // serverFacts never enter the model and therefore cannot reach rendering.
    ...model.serverFacts
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

  let verification;
  try {
    verification = await requireCurrentPacketVerification(authUserId, item);
  } catch {
    return { status: "route_not_renderable", reason: "current final verification is required" };
  }

  const packetInformation = protectedPacketInformationModelFor({
    status: "verified",
    reason: "current_protected_verification",
    ...verification
  });
  if (!packetInformation
    || packetInformation.stage !== "ready_to_generate"
    || packetInformation.missingInputIds.length > 0
    || !packetInformation.reviewedAt) {
    return { status: "route_not_renderable", reason: "packet information has not passed the accuracy review" };
  }
  const packetFields = canonicalPacketFields(packetInformation);
  const verifiedPathwayId = verification.snapshot.pathwayId;
  if (!verifiedPathwayId) {
    return { status: "route_contract_unverifiable", reason: "verified pathway identity is missing" };
  }
  const provisionalPacketId = deterministicUuid(`${CONSUMER_PACKET_NAMESPACE}:${item.id}:${verification.hash}`);

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
      packetId: provisionalPacketId,
      state: verification.snapshot.jurisdiction,
      pathway: verifiedPathwayId,
      briefcaseItemId: item.id,
      trackId: verification.snapshot.selectedTrackId,
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

  const renderPacketBody = consumerPacketRow({
    personId: person.personId,
    jurisdiction: built.route.jurisdiction,
    pathwayLabel: built.route.pathwayId,
    packetInformation,
    packetFields,
    verification
  });
  const renderInputPayloadBase = {
    schemaVersion: "expungement-ai-consumer-packet/v2",
    productId: CONSUMER_PACKET_PRODUCT_ID,
    authUserId,
    briefcaseItemId: item.id,
    personId: person.personId,
    matterId,
    jurisdiction: built.route.jurisdiction,
    pathwayId: built.route.pathwayId,
    reviewedAt: packetInformation.reviewedAt,
    verificationHash: verification.hash,
    packetFields
  };
  const renderPacketSeed = {
    partner_slug: CONSUMER_PERSON_NAMESPACE,
    user_id: authUserId,
    briefcase_id: item.id,
    intake_session_id: null,
    relief_outcome: "not_recorded",
    ...renderPacketBody
  };
  // The worker reads by packet id. Version the id by every exact row/input byte
  // so no later request can point an existing queued job at different source.
  const payloadVersionHash = canonicalPayloadHash({
    renderPacketSeed,
    renderInputPayloadBase,
    renderContract: {
      routeId: built.spec.routeId,
      rendererKind: built.spec.rendererKind,
      rendererVersion: built.spec.rendererVersion,
      sourceSha256: built.spec.sourceSha256,
      profileId: built.spec.profileId,
      profileVersion: built.spec.profileVersion
    }
  });
  const packetId = deterministicUuid(`${CONSUMER_PACKET_NAMESPACE}:${item.id}:${verification.hash}:${payloadVersionHash}`);
  const versioned = buildRenderJobSpec({
    packetId,
    state: verification.snapshot.jurisdiction,
    pathway: verifiedPathwayId,
    briefcaseItemId: item.id,
    trackId: verification.snapshot.selectedTrackId,
    packetFields
  });
  if (!versioned.spec) return { status: "route_not_renderable", reason: versioned.route.reason };
  const renderPacket = { id: packetId, ...renderPacketSeed };
  const inputHash = canonicalPayloadHash({
    renderPacket,
    renderInputPayload: renderInputPayloadBase,
    renderContractInputHash: versioned.spec.inputHash
  });
  const renderInputPayload = {
    ...renderInputPayloadBase,
    inputHash,
    renderContractInputHash: versioned.spec.inputHash
  };
  const verifiedSpec = { ...versioned.spec, inputHash };

  /**
   * Grade-A commercial admission, point 5 of 10 — `provider_dispatch`.
   *
   * In the internal function both entry points share, so the webhook path
   * cannot become the unguarded door. Strictly before
   * `enqueueVerifiedConsumerRender`, which is the first act that hands a job to
   * the worker and therefore the first act that puts participant data in front
   * of a provider.
   *
   * The entitlement is reported as already consumed once this matter has a
   * packet, and this is the one point the authority admits on a spent
   * entitlement: a failed render must retry under the same idempotency key
   * without consuming a second credit. Every other point refuses that, which is
   * why a retry re-dispatches rather than re-admitting generation.
   */
  const dispatchIdentity = commercialRouteIdentity({
    jurisdiction: verification.snapshot.jurisdiction,
    pathwayId: verifiedPathwayId
  });
  try {
    governProviderDispatch(dispatchIdentity, fulfillmentRequestContext({
      participantUserId: authUserId,
      matterId,
      matterOwnerUserId: authUserId,
      finalVerification: finalVerificationSnapshotFrom({
        snapshot: verification.snapshot,
        verificationHash: verification.hash,
        matterId,
        ownerUserId: authUserId,
        packetFamilyId: dispatchIdentity.packetFamilyId
      }),
      entitlement: entitlementContext({
        kind: "consumer_payment",
        // The provider event id is the single-use receipt, so a redispatch of
        // the same payment is the same key rather than a new one.
        idempotencyKey: authority.providerEventId,
        alreadyConsumed: item.packetStatus === "ready" || item.packetStatus === "downloaded",
        serverVerified: true
      })
    }));
  } catch (error) {
    // This function reports rather than throws, so its callers keep one shape.
    return {
      status: "commercial_admission_denied",
      reason: error instanceof CommercialAdmissionDeniedError
        ? `${error.denialCode}: ${error.decision.reason}`
        : error instanceof Error ? error.message : String(error)
    };
  }

  // No packet or input row is written before this call. The captain-owned RPC
  // compares protected verification, immutable-inserts these exact payloads,
  // and enqueues as one transaction.
  const job = await enqueueVerifiedConsumerRender(verifiedSpec, {
    mode: "consumer",
    consumerBriefcaseItemId: item.id,
    expectedConsumerAuthUserId: authUserId,
    personId: person.personId,
    matterId,
    expectedVerificationHash: verification.hash
  }, {
    renderPacket,
    renderInputPayload
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
