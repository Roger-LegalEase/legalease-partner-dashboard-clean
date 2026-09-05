import "server-only";

import type Stripe from "stripe";
import { absoluteExpungementAiUrl } from "@/lib/app-url";
import { getStripeServerClient, isProductionRuntime, isStripeConfigurationError } from "@/lib/stripe/server";
import { isConsumerPaymentAllowed } from "@/lib/expungement-ai/eligibility-adapter";
import { componentDeferralForTrack, exactDeferralForPathway, exactDeferralForTrack, terminalTreatmentForTrack } from "@/lib/rcap/documents/guidance-packet-registry";
import { packetRouteCanRender, resolvePacketRoute } from "@/lib/rcap/documents/packet-route-resolver";
import { assertPacketFulfillmentProven } from "@/lib/expungement-ai/packet-fulfillment-authority";
import {
  commercialRouteIdentity,
  finalVerificationSnapshotFrom,
  fulfillmentRequestContext,
  governCommercialAdmission,
  isOperationallySellable
} from "@/lib/rcap/render/commercial-admission";
import { getBriefcaseItem } from "@/lib/expungement-ai/briefcase";
import { consumerMatterIdForItem, resolveConsumerPersonId } from "@/lib/expungement-ai/consumer-identity";
import { requireCurrentPacketVerification } from "@/lib/expungement-ai/packet-information";
import {
  CONSUMER_PACKET_PRODUCT_ID,
  persistConsumerCheckoutBinding
} from "@/lib/expungement-ai/consumer-payment-authority";
import type {
  ConsumerBriefcaseItem,
  ExpungementAiEligibilityResult,
  PacketVerificationSnapshot
} from "@/lib/expungement-ai/types";

export const consumerPacketPriceCents = 5000;
export const consumerPacketCurrency = "usd" as const;

export type ConsumerCheckoutOutcome =
  | "checkout_created"
  | "checkout_reused"
  | "already_paid"
  | "payment_pending";

export type ConsumerPaymentIntent = {
  enabled: boolean;
  amountCents?: 5000;
  label: string;
};

export type ConsumerCheckoutResult = {
  mode: "stripe" | "dry_run";
  checkoutSessionId: string;
  checkoutUrl: string;
  amountCents: 5000;
  currency: typeof consumerPacketCurrency;
  outcome: ConsumerCheckoutOutcome;
  briefcaseItemId: string;
  alreadyPaid?: boolean;
  paymentPending?: boolean;
};

export function consumerPacketReadyUrl(briefcaseItemId: string): string {
  return absoluteExpungementAiUrl(`/briefcase/${encodeURIComponent(briefcaseItemId)}`);
}

type ConsumerCheckoutBinding = {
  userId: string;
  briefcaseItemId: string;
  productId: typeof CONSUMER_PACKET_PRODUCT_ID;
  personId: string;
  matterId: string;
  pathwayId: string;
  verificationHash: string;
};

export type ConsumerCheckoutStatus = {
  paid: boolean;
  mode: "stripe" | "dry_run";
  checkoutSessionId: string;
  paymentIntentId?: string;
  receiptUrl?: string;
  amountCents: 5000;
};

export function createConsumerPaymentPlaceholder(
  result: ExpungementAiEligibilityResult,
  pathwayId: string | null
): ConsumerPaymentIntent {
  // The placeholder is the first surface a participant sees. A component
  // deferral shows no amount at all, independently of the result booleans.
  const deferred = result.treatmentClassification === "component_deferral"
    || result.treatmentClassification === "exact_supported_deferral"
    || result.treatmentClassification === "terminal_treatment_candidate"
    || Boolean(componentDeferralForTrack(result.selectedTrackId ?? null))
    || Boolean(exactDeferralForTrack(result.selectedTrackId ?? null))
    || Boolean(terminalTreatmentForTrack(result.selectedTrackId ?? null))
    || Boolean(exactDeferralForPathway(result.state, pathwayId));
  // A price we cannot honour is not shown. The evaluator's payment gate and the
  // packet route resolver were independent of each other, so a participant on a
  // ratified route in a jurisdiction with no certified renderer saw a $50 offer
  // for a packet the download route would refuse with a 409. Guidance is not
  // sold, and neither is a packet we cannot produce.
  const canDeliver = packetRouteCanRender(resolvePacketRoute({
    state: result.state,
    pathway: pathwayId,
    trackId: result.selectedTrackId ?? null
  }));
  // Consumer payment authority. A price is not shown for a packet we cannot
  // prove we deliver, which is a stronger statement than the renderer check
  // beside it: that one asks whether the state can render, this one asks
  // whether this route produces the filing it promises.
  let fulfillmentProven = true;
  try {
    assertPacketFulfillmentProven(result.state, pathwayId, "consumer payment authority", { trackId: result.selectedTrackId });
  } catch {
    fulfillmentProven = false;
  }
  // Grade-A commercial authority, asked about the route with nobody in front of
  // it — which is exactly what a price placeholder is.
  //
  // Every check above this line is a proxy, and the proxies did not agree with
  // the authority. `canDeliver` asks whether the route's STATE can render, so it
  // is true for all five ADR-0004 `legacy_retired` generators and for every
  // shadow-only `factory_v2` route. `fulfillmentProven` reads
  // data/rcap-ledger/packet-fulfillment-records.json, which is not a Grade-A
  // fulfillment record: one row there — no admission point, no packet-family
  // binding the authority checks — put a live $50 direct-consumer price back on
  // `MS:eligible-felony-conviction-expungement-99-19-71` and on
  // `AL:human-trafficking-victim-expungement`, both of which resolve
  // `sellable: false`. Nothing on the current head consulted the authority that
  // ADR-0004 made the sole source of commercial permission, so the price was
  // held off those routes by an empty ledger rather than by a decision.
  //
  // This is not a second commercial rule. `isOperationallySellable` is the
  // exported reader over `launch_graph_commercial_status`, admission point 10 of
  // 10, whose single governed call site already lives inside
  // `commercial-admission.ts`; the lane-F acceptance verifier still finds one
  // call site for it. A route with no Grade-A record is refused here for the
  // same reason it is refused at Checkout: an absent record is a refusal.
  const routeSellable = isOperationallySellable(
    commercialRouteIdentity({ jurisdiction: result.state, pathwayId }).routeId
  );
  const enabled = !deferred && canDeliver && fulfillmentProven && routeSellable
    && isConsumerPaymentAllowed(result.resultCode, result.paymentAllowed);

  return {
    enabled,
    amountCents: enabled ? consumerPacketPriceCents : undefined,
    label: enabled ? "$50 one-time self-help packet payment" : "No payment available for this result"
  };
}

export async function createConsumerPacketCheckout({
  userId,
  item,
  successUrl,
  cancelUrl
}: {
  userId: string;
  item: ConsumerBriefcaseItem;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<ConsumerCheckoutResult> {
  // P0 double-charge guard: an already-paid Briefcase item must never mint a new
  // Stripe Checkout Session or demand a retroactive verification. Payment
  // columns are protected server evidence; this does not grant artifact access.
  if (item.paymentStatus === "paid") {
    return {
      mode: item.paymentProvider === "dry_run" ? "dry_run" : "stripe",
      checkoutSessionId: item.checkoutSessionId ?? "",
      checkoutUrl: consumerPacketReadyUrl(item.id),
      amountCents: consumerPacketPriceCents,
      currency: consumerPacketCurrency,
      outcome: "already_paid",
      briefcaseItemId: item.id,
      alreadyPaid: true
    };
  }

  // A completed provider Session is immutable payment evidence even while the
  // webhook is still recording protected payment columns. Recover that state
  // before asking for a current verification or resolving new-commerce
  // identity, so an invalidated verification can never open a replacement
  // Checkout Session for money Stripe already collected.
  let stripe: Stripe | null = null;
  let existing: Stripe.Checkout.Session | null = null;
  let existingLookupCompleted = false;
  if (item.checkoutSessionId?.startsWith("cs_")) {
    try {
      stripe = getStripeServerClient();
      existing = await stripe.checkout.sessions.retrieve(item.checkoutSessionId, {
        expand: ["line_items.data.price.product"]
      });
      existingLookupCompleted = true;
      if (existing.status === "complete") {
        return {
          mode: "stripe",
          checkoutSessionId: existing.id,
          checkoutUrl: consumerPacketReadyUrl(item.id),
          amountCents: consumerPacketPriceCents,
          currency: consumerPacketCurrency,
          outcome: "payment_pending",
          briefcaseItemId: item.id,
          paymentPending: true
        };
      }
    } catch (error) {
      if (!isStripeConfigurationError(error)) throw error;
      stripe = null;
    }
  }

  let verification;
  try {
    verification = await requireCurrentPacketVerification(userId, item);
  } catch {
    throw new ConsumerCheckoutReviewRequiredError();
  }
  const verifiedSnapshot = verification.snapshot;
  assertCheckoutAllowed(verifiedSnapshot);

  /**
   * Grade-A commercial admission, point 1 of 10 — `consumer_checkout`.
   *
   * Placed here because this is the last statement before a Stripe Checkout
   * Session can be created, and a session URL is a price the participant has
   * seen. Everything above it either returns money already collected (the
   * already-paid and completed-session recoveries, which mint no session) or
   * establishes the verification this admission is required to carry.
   *
   * `assertCheckoutAllowed` above stays exactly as it is. It refuses deferrals
   * and terminal treatments on their own terms; this refuses a route whose
   * packet was never proven. Neither subsumes the other, and this one never
   * opens a door the other closed.
   */
  const checkoutMatterId = consumerMatterIdForItem(item.id);
  const checkoutIdentity = commercialRouteIdentity({
    jurisdiction: verifiedSnapshot.jurisdiction,
    pathwayId: verifiedSnapshot.pathwayId
  });
  governCommercialAdmission("consumer_checkout", checkoutIdentity, fulfillmentRequestContext({
    participantUserId: userId,
    matterId: checkoutMatterId,
    matterOwnerUserId: userId,
    finalVerification: finalVerificationSnapshotFrom({
      snapshot: verifiedSnapshot,
      verificationHash: verification.hash,
      matterId: checkoutMatterId,
      ownerUserId: userId,
      packetFamilyId: checkoutIdentity.packetFamilyId
    })
  }));

  const person = await resolveConsumerPersonId(userId);
  if (!person.ok) throw new ConsumerCheckoutTemporarilyUnavailableError();
  const binding: ConsumerCheckoutBinding = {
    userId,
    briefcaseItemId: item.id,
    productId: CONSUMER_PACKET_PRODUCT_ID,
    personId: person.personId,
    matterId: consumerMatterIdForItem(item.id),
    pathwayId: verifiedSnapshot.pathwayId,
    verificationHash: verification.hash
  };

  const defaultSuccessUrl = absoluteExpungementAiUrl(`/briefcase/${encodeURIComponent(item.id)}?payment=return&session_id={CHECKOUT_SESSION_ID}`);
  const defaultCancelUrl = absoluteExpungementAiUrl(`/briefcase/${encodeURIComponent(item.id)}?checkout=canceled`);

  try {
    stripe ??= getStripeServerClient();
    existing = !existingLookupCompleted && item.checkoutSessionId?.startsWith("cs_")
      ? await stripe.checkout.sessions.retrieve(item.checkoutSessionId, {
        expand: ["line_items.data.price.product"]
      })
      : existing;

    if (existing && existing.status !== "expired" && existing.metadata?.verification_hash !== binding.verificationHash) {
      if (existing.status === "open") await stripe.checkout.sessions.expire(existing.id);
    } else if (existing && existing.status !== "expired") {
      const reusable = await reconcileReusableCheckoutSession({
        stripe,
        session: existing,
        binding,
        expectedSuccessUrl: successUrl ?? defaultSuccessUrl,
        expectedCancelUrl: cancelUrl ?? defaultCancelUrl
      });
      if (!reusable) {
        if (existing.status === "open") await stripe.checkout.sessions.expire(existing.id);
        throw new ConsumerCheckoutTemporarilyUnavailableError();
      }
      const bindingResult = await persistCheckoutBinding(binding, reusable.id, "stripe");
      if (bindingResult.outcome !== "bound") {
        if (bindingResult.outcome === "refused" && reusable.status === "open") {
          await stripe.checkout.sessions.expire(reusable.id);
        }
        throw new ConsumerCheckoutTemporarilyUnavailableError();
      }
      if (reusable.status === "open" && reusable.url) {
        return {
          mode: "stripe",
          checkoutSessionId: reusable.id,
          checkoutUrl: reusable.url,
          amountCents: consumerPacketPriceCents,
          currency: consumerPacketCurrency,
          outcome: "checkout_reused",
          briefcaseItemId: item.id
        };
      }
      if (reusable.status === "complete") {
        return {
          mode: "stripe",
          checkoutSessionId: reusable.id,
          checkoutUrl: consumerPacketReadyUrl(item.id),
          amountCents: consumerPacketPriceCents,
          currency: consumerPacketCurrency,
          outcome: "payment_pending",
          briefcaseItemId: item.id,
          paymentPending: true
        };
      }
      throw new ConsumerCheckoutTemporarilyUnavailableError();
    }

    const metadata = checkoutMetadata(binding, item);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl ?? defaultSuccessUrl,
      cancel_url: cancelUrl ?? defaultCancelUrl,
      client_reference_id: item.id,
      metadata,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: consumerPacketCurrency,
            unit_amount: consumerPacketPriceCents,
            product_data: {
              name: "Expungement.ai self-help packet",
              metadata: { product_id: CONSUMER_PACKET_PRODUCT_ID }
            }
          }
        }
      ]
    }, {
      idempotencyKey: checkoutIdempotencyKey(
        item.id,
        binding.verificationHash,
        verification.revision,
        item.checkoutSessionId
      )
    });

    if (session.status !== "open" || !session.url) {
      if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
      throw new ConsumerCheckoutTemporarilyUnavailableError();
    }
    const bindingResult = await persistCheckoutBinding(binding, session.id, "stripe");
    if (bindingResult.outcome !== "bound") {
      if (bindingResult.outcome === "refused" && session.status === "open") {
        await stripe.checkout.sessions.expire(session.id);
      }
      throw new ConsumerCheckoutTemporarilyUnavailableError();
    }

    return {
      mode: "stripe",
      checkoutSessionId: session.id,
      checkoutUrl: session.url ?? defaultCancelUrl,
      amountCents: consumerPacketPriceCents,
      currency: consumerPacketCurrency,
      outcome: "checkout_created",
      briefcaseItemId: item.id
    };
  } catch (error) {
    if (!isStripeConfigurationError(error)) throw error;
    if (!isConsumerCheckoutDryRunEnabled()) {
      throw new ConsumerCheckoutTemporarilyUnavailableError();
    }

    const dryRunSessionId = dryRunCheckoutSessionId(item.id);
    if ((await persistCheckoutBinding(binding, dryRunSessionId, "dry_run")).outcome !== "bound") {
      throw new ConsumerCheckoutTemporarilyUnavailableError();
    }

    return {
      mode: "dry_run",
      checkoutSessionId: dryRunSessionId,
      checkoutUrl: absoluteExpungementAiUrl(`/packet-ready?briefcaseItemId=${encodeURIComponent(item.id)}&session_id=${encodeURIComponent(dryRunSessionId)}&dry_run=1`),
      amountCents: consumerPacketPriceCents,
      currency: consumerPacketCurrency,
      outcome: "checkout_created",
      briefcaseItemId: item.id
    };
  }
}

function checkoutMetadata(binding: ConsumerCheckoutBinding, item: ConsumerBriefcaseItem): Record<string, string> {
  return {
    channel: "expungement_ai_consumer",
    user_id: binding.userId,
    briefcase_item_id: binding.briefcaseItemId,
    product_id: binding.productId,
    person_id: binding.personId,
    matter_id: binding.matterId,
    result_code: item.resultCode ?? "",
    source_session_id: item.sourceSessionId ?? "",
    jurisdiction: item.state,
    packet_type: item.packetType ?? "",
    pathway_id: binding.pathwayId,
    verification_hash: binding.verificationHash,
  };
}

async function persistCheckoutBinding(
  binding: ConsumerCheckoutBinding,
  checkoutSessionId: string,
  paymentProvider: "stripe" | "dry_run"
) {
  return persistConsumerCheckoutBinding({
    userId: binding.userId,
    briefcaseItemId: binding.briefcaseItemId,
    checkoutSessionId,
    paymentProvider,
    productId: binding.productId,
    personId: binding.personId,
    matterId: binding.matterId,
    expectedVerificationHash: binding.verificationHash
  });
}

async function reconcileReusableCheckoutSession({
  stripe,
  session,
  binding,
  expectedSuccessUrl,
  expectedCancelUrl
}: {
  stripe: Stripe;
  session: Stripe.Checkout.Session;
  binding: ConsumerCheckoutBinding;
  expectedSuccessUrl: string;
  expectedCancelUrl: string;
}): Promise<Stripe.Checkout.Session | null> {
  if (!checkoutSessionBaseBindingMatches(session, binding)) return null;
  if (!sameOrigin(session.success_url, expectedSuccessUrl) || !sameOrigin(session.cancel_url, expectedCancelUrl)) return null;

  const desired = {
    product_id: binding.productId,
    person_id: binding.personId,
    matter_id: binding.matterId,
    pathway_id: binding.pathwayId,
    verification_hash: binding.verificationHash
  };
  for (const [key, value] of Object.entries(desired)) {
    const existing = session.metadata?.[key];
    if (existing && existing !== value) return null;
  }

  const missing = Object.fromEntries(
    Object.entries(desired).filter(([key]) => !session.metadata?.[key])
  );
  if (Object.keys(missing).length > 0) {
    return stripe.checkout.sessions.update(session.id, {
      metadata: missing
    });
  }
  return session;
}

function checkoutSessionBaseBindingMatches(
  session: Stripe.Checkout.Session,
  binding: ConsumerCheckoutBinding
): boolean {
  const lineItems = session.line_items?.data ?? [];
  const line = lineItems[0];
  const product = line?.price?.product;
  const productName = product && typeof product !== "string" && !("deleted" in product)
    ? product.name
    : null;
  return session.mode === "payment"
    && session.client_reference_id === binding.briefcaseItemId
    && session.metadata?.channel === "expungement_ai_consumer"
    && session.metadata?.user_id === binding.userId
    && session.metadata?.briefcase_item_id === binding.briefcaseItemId
    && session.metadata?.pathway_id === binding.pathwayId
    && session.metadata?.verification_hash === binding.verificationHash
    && session.amount_total === consumerPacketPriceCents
    && (session.currency ?? "").toLowerCase() === "usd"
    && lineItems.length === 1
    && line?.quantity === 1
    && line.amount_total === consumerPacketPriceCents
    && productName === "Expungement.ai self-help packet";
}

function sameOrigin(actual: string | null, expected: string): boolean {
  if (!actual) return false;
  try {
    return new URL(actual).origin === new URL(expected).origin;
  } catch {
    return false;
  }
}

function checkoutIdempotencyKey(
  itemId: string,
  verificationHash: string,
  verificationRevision: number,
  previousSessionId?: string
) {
  // Concurrent requests for one protected authority converge on one Stripe
  // Session. A refused stale CAS forces a protected reload/rederivation; the
  // changed hash/revision then advances the key instead of returning the
  // expired stale-authority Session.
  return `${CONSUMER_PACKET_PRODUCT_ID}:${itemId}:${verificationHash}:${verificationRevision}:${previousSessionId ?? "initial"}`;
}

export async function getConsumerCheckoutStatus({
  item,
  checkoutSessionId
}: {
  item: ConsumerBriefcaseItem;
  checkoutSessionId: string;
}): Promise<ConsumerCheckoutStatus> {
  if (checkoutSessionId.startsWith("dryrun_") || item.paymentProvider === "dry_run") {
    if (!isConsumerCheckoutDryRunEnabled()) {
      return {
        paid: false,
        mode: "dry_run",
        checkoutSessionId,
        amountCents: consumerPacketPriceCents
      };
    }

    return {
      paid: true,
      mode: "dry_run",
      checkoutSessionId,
      amountCents: consumerPacketPriceCents
    };
  }

  const stripe = getStripeServerClient();
  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
    expand: ["payment_intent"]
  });
  const paymentIntent = typeof session.payment_intent === "string" ? undefined : session.payment_intent;

  // Bind the retrieved Stripe session to THIS Briefcase item before honoring "paid".
  // Without this, a user who legitimately paid for one item could pass that item's
  // paid session id to the confirm/status path for a different, unpaid item they own
  // and unlock a second packet for free. Mirror the bindings the signed webhook
  // enforces in checkout-reconciliation.ts. Fail closed (paid: false) on any mismatch.
  const sessionBoundToItem =
    session.client_reference_id === item.id &&
    session.metadata?.briefcase_item_id === item.id &&
    session.metadata?.channel === "expungement_ai_consumer" &&
    (!item.checkoutSessionId || item.checkoutSessionId === session.id);

  return {
    paid: sessionBoundToItem && session.payment_status === "paid",
    mode: "stripe",
    checkoutSessionId: session.id,
    paymentIntentId: paymentIntent?.id,
    receiptUrl: paymentIntent?.latest_charge && typeof paymentIntent.latest_charge !== "string" ? paymentIntent.latest_charge.receipt_url ?? undefined : undefined,
    amountCents: consumerPacketPriceCents
  };
}

/**
 * Reports the server-recorded payment state when the user returns from Stripe.
 *
 * This used to write `payment_status = 'paid'` itself, through the participant's
 * own Supabase client. That made it a second payment writer, and the weaker of
 * the two: it ran on a browser-initiated return, whereas the webhook runs on a
 * signature-verified event. Two writers also meant two provider identities for
 * one payment — the session/intent id here, the event id there — which can flip
 * `provider_event_id` on a row that the receipt uniqueness index depends on.
 *
 * So it now reads rather than writes. The signature-verified webhook is the only
 * thing that records a payment, and this reports what it recorded.
 *
 * The consequence worth naming: a user who returns before the webhook lands sees
 * an unpaid item for those seconds. That is the honest answer — the payment is
 * not yet server-recorded — and the webhook's own recovery path already handles
 * finishing a packet whose first delivery attempt failed.
 */
export async function recordConsumerPaymentConfirmation({
  userId,
  item,
  status
}: {
  userId: string;
  item: ConsumerBriefcaseItem;
  status: ConsumerCheckoutStatus;
}): Promise<ConsumerBriefcaseItem | null> {
  if (!status.paid) return item;

  // Re-read rather than trust the caller's copy: the webhook may have recorded
  // the payment between the page load and this call.
  const current = await getBriefcaseItem(userId, item.id);
  return current ?? item;
}

/**
 * A composed route whose official-form component is deferred can never be
 * checked out, whatever the item's stored booleans say. This reads the
 * server-owned track identity and denies BEFORE already-paid handling and
 * before any Stripe or dry-run session is created, so a mutated
 * paymentAllowed=true cannot buy an incomplete packet.
 */
/**
 * An exact supported deferral is refused independently of the item's own
 * booleans, matched by track id or by the pathway the item was saved under. A
 * corrupted item claiming packet_ready with paymentAllowed=true on a deferred
 * route still gets nothing.
 */
function assertNotExactDeferral(snapshot: PacketVerificationSnapshot) {
  const deferred = snapshot.treatmentClassification === "exact_supported_deferral"
    || Boolean(exactDeferralForTrack(snapshot.selectedTrackId))
    || Boolean(exactDeferralForPathway(snapshot.jurisdiction, snapshot.pathwayId));
  if (deferred) {
    throw new ConsumerCheckoutNotAllowedError("exact_supported_deferral");
  }
}

function assertNotComponentDeferral(snapshot: PacketVerificationSnapshot) {
  if (snapshot.treatmentClassification === "component_deferral"
    || snapshot.deferralComponentIds.length > 0
    || componentDeferralForTrack(snapshot.selectedTrackId)) {
    throw new ConsumerCheckoutNotAllowedError("component_deferral");
  }
}

/**
 * A pending terminal treatment refuses checkout on the same independent terms.
 * A candidate is not a weaker suppression than an accepted deferral — it is the
 * same suppression, with the review still open.
 */
function assertNotTerminalTreatment(snapshot: PacketVerificationSnapshot) {
  if (snapshot.treatmentClassification === "terminal_treatment_candidate"
    || terminalTreatmentForTrack(snapshot.selectedTrackId)) {
    throw new ConsumerCheckoutNotAllowedError("terminal_treatment_candidate");
  }
}

/**
 * The money gate may never be wider than the delivery gate.
 *
 * The evaluator decides whether a route is legally and technically ratified;
 * the packet route resolver decides whether an artifact can actually be
 * produced. Nothing bound the two together, so a route could be payable in a
 * jurisdiction whose packet route resolves to guidance — the participant paid
 * $50 and the download route answered 409, and buildRenderJobSpec returned no
 * job. That is charging for guidance, and it fails closed here.
 *
 * This does not reclassify the route. The pathway stays in the intended-sellable
 * denominator with `renderer_unavailable` recorded against it as an open
 * blocker in data/rcap-ledger/sellable-pathway-closure.json; what changes is
 * only that we stop taking money for a packet we cannot hand over.
 */
export function assertPacketRouteCanDeliver(
  snapshot: PacketVerificationSnapshot
): asserts snapshot is PacketVerificationSnapshot & { pathwayId: string } {
  if (!snapshot.pathwayId?.trim()) throw new ConsumerPacketNotDeliverableError("missing_verified_pathway");
  // Participant delivery. The route resolver below answers "can this state
  // render at all"; this answers "does this route deliver the packet it
  // promises", which is the question the resolver cannot reach.
  assertPacketFulfillmentProven(snapshot.jurisdiction, snapshot.pathwayId, "participant delivery", { trackId: snapshot.selectedTrackId });
  const route = resolvePacketRoute({
    state: snapshot.jurisdiction,
    pathway: snapshot.pathwayId,
    trackId: snapshot.selectedTrackId
  });
  if (!packetRouteCanRender(route)) {
    throw new ConsumerPacketNotDeliverableError(route.routeKind);
  }
}

export function assertCheckoutAllowed(
  snapshot: PacketVerificationSnapshot
): asserts snapshot is PacketVerificationSnapshot & { pathwayId: string } {
  // Checkout creation. The order is most-specific-refusal first, backstop last.
  //
  // Every one of these runs unconditionally, so the order changes which reason
  // a refusal carries and never whether it happens. The deferral and terminal
  // treatments know exactly why a particular route is closed and say so; the
  // fulfillment gate only knows that nothing proved this route delivers. Naming
  // the specific reason where one exists is better for the participant, better
  // in the logs, and it keeps each lane's own safeguard observable at this
  // boundary instead of being masked by a check standing in front of it — a
  // second door silently covering for a missing first one is exactly the
  // failure those lane suites were written to catch.
  //
  // The fulfillment gate goes last precisely because it is the backstop: it
  // refuses everything the specific safeguards let through, so reaching it means
  // a route survived every other test and still cannot prove it ships a packet.
  assertNotExactDeferral(snapshot);
  assertNotComponentDeferral(snapshot);
  assertNotTerminalTreatment(snapshot);
  assertPacketRouteCanDeliver(snapshot);
  assertPacketFulfillmentProven(snapshot.jurisdiction, snapshot.pathwayId, "checkout creation", { trackId: snapshot.selectedTrackId });
  const packetProduct = snapshot.packetType === "custom_pleading"
    || snapshot.packetType === "official_pdf_overlay"
    || snapshot.packetType === "legacy_packet";
  if (!packetProduct
    || !snapshot.jurisdiction?.trim()
    || !snapshot.paymentAllowed
    || !isConsumerPaymentAllowed(snapshot.resultCode ?? "guidance_only", snapshot.paymentAllowed)) {
    throw new ConsumerCheckoutNotAllowedError(snapshot.resultCode ?? "missing_result_code");
  }
}

export function isConsumerCheckoutDryRunEnabled(): boolean {
  return process.env.EXPUNGEMENT_AI_CHECKOUT_DRY_RUN === "true" && !isProductionRuntime();
}

export class ConsumerCheckoutNotAllowedError extends Error {
  constructor(readonly resultCode: string) {
    super(`Consumer checkout is not allowed for ${resultCode}.`);
    this.name = "ConsumerCheckoutNotAllowedError";
  }
}

export class ConsumerPacketNotDeliverableError extends Error {
  constructor(readonly routeKind: string) {
    super("This route cannot produce a packet yet, so it is not sold.");
    this.name = "ConsumerPacketNotDeliverableError";
  }
}

export class ConsumerCheckoutTemporarilyUnavailableError extends Error {
  constructor() {
    super("Consumer checkout is temporarily unavailable.");
    this.name = "ConsumerCheckoutTemporarilyUnavailableError";
  }
}

export class ConsumerCheckoutReviewRequiredError extends Error {
  constructor() {
    super("Complete the current final verification before starting Checkout.");
    this.name = "ConsumerCheckoutReviewRequiredError";
  }
}

function dryRunCheckoutSessionId(itemId: string) {
  return `dryrun_${itemId.replaceAll("-", "_")}`;
}
