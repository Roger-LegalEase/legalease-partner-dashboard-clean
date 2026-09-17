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
import { reconcileConsumerOrder } from "@/lib/expungement-ai/consumer-order-reconciliation";
import {
  confirmCatalogProduct,
  expectedCatalogProductId,
  isConsumerPacketCatalogError,
  lineItemProductId
} from "@/lib/expungement-ai/consumer-packet-catalog";
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
  /**
   * The regular price of the packet. A promotion code is entered on Stripe's
   * page after this result is produced, so the amount finally due is read back
   * from the Session and is not this number.
   */
  amountCents: number;
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
  /** Settled: paid, or completed at no cost because a discount cleared it. */
  paid: boolean;
  mode: "stripe" | "dry_run";
  checkoutSessionId: string;
  paymentIntentId?: string;
  receiptUrl?: string;
  /** What was actually collected. Zero on a fully discounted order. */
  amountCents: number;
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
      existing = await providerCall("recover_completed_session", () =>
        (stripe as Stripe).checkout.sessions.retrieve(item.checkoutSessionId as string, {
          expand: ["line_items.data.price.product", "discounts.promotion_code"]
        }));
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
      if (isStripeConfigurationError(error)) {
        stripe = null;
      } else if (storedSessionNamesNothing(error)) {
        // The stored id names no Session in the account this deployment sells
        // through — a leftover from a different mode or a different account. It
        // is evidence of nothing, so it protects nothing: the order continues
        // and a current Session is minted below. The double-charge guard that
        // matters is the server-recorded payment status above, which is
        // unaffected by an unreadable id.
        existing = null;
        existingLookupCompleted = true;
      } else {
        // Any other refusal leaves the question open: this id may name a
        // COMPLETED Session whose webhook has not landed yet, and minting a
        // replacement over money already collected is the one outcome this
        // block exists to prevent. It refuses, with the provider's own
        // classification, rather than guessing.
        throw error;
      }
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
    // Which catalog Product this deployment sells, and the Price on it. Both are
    // resolved before any Session is inspected or created, because the answer
    // decides whether an existing open Session is still the right order and what
    // a new one is built from.
    const catalogProductId = expectedCatalogProductId();
    if (catalogProductId) {
      await providerCall("confirm_catalog_product", () =>
        confirmCatalogProduct(stripe as Stripe, catalogProductId, consumerPacketPriceCents, consumerPacketCurrency));
    }
    existing = !existingLookupCompleted && item.checkoutSessionId?.startsWith("cs_")
      ? await providerCall("retrieve_existing_session", () =>
        (stripe as Stripe).checkout.sessions.retrieve(item.checkoutSessionId as string, {
          expand: ["line_items.data.price.product", "discounts.promotion_code"]
        }))
      : existing;

    // An open Session created before promotion codes were enabled offers no
    // field to enter one, so reusing it would look to the customer like their
    // code being refused. It is expired and replaced, which is the same thing
    // this branch already does for a stale verification. Only an OPEN session
    // is replaced: a completed order is money that changed hands and is never
    // disowned over a capability flag, and expiring nothing leaves it intact.
    const openWithoutPromotionCodes = existing?.status === "open" && existing.allow_promotion_codes !== true;
    // The same reasoning, for the same reason one step deeper. An open Session
    // built from an ad-hoc Product sells something the catalog does not contain,
    // so a coupon restricted to the catalog Product can only be refused on it —
    // and the customer would read that refusal as their code being rejected.
    // Replacing it is the supported path; a completed order is again untouched.
    const openOnTheWrongProduct = existing?.status === "open"
      && catalogProductId !== null
      && lineItemProductId(existing.line_items?.data?.[0]) !== catalogProductId;
    if (existing && existing.status !== "expired"
      && (existing.metadata?.verification_hash !== binding.verificationHash
        || openWithoutPromotionCodes
        || openOnTheWrongProduct)) {
      if (existing.status === "open") {
        await providerCall("expire_replaced_session", () => (stripe as Stripe).checkout.sessions.expire(existing!.id));
      }
    } else if (existing && existing.status !== "expired") {
      const reusable = await reconcileReusableCheckoutSession({
        stripe,
        session: existing,
        binding,
        expectedSuccessUrl: successUrl ?? defaultSuccessUrl,
        expectedCancelUrl: cancelUrl ?? defaultCancelUrl
      });
      if (!reusable) {
        if (existing.status === "open") {
          await providerCall("expire_unreusable_session", () => (stripe as Stripe).checkout.sessions.expire(existing!.id));
        }
        throw new ConsumerCheckoutTemporarilyUnavailableError();
      }
      const bindingResult = await persistCheckoutBinding(binding, reusable.id, "stripe");
      if (bindingResult.outcome !== "bound") {
        if (bindingResult.outcome === "refused" && reusable.status === "open") {
          await providerCall("expire_unbindable_session", () => (stripe as Stripe).checkout.sessions.expire(reusable.id));
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
    const session = await providerCall("create_session", () => (stripe as Stripe).checkout.sessions.create({
      mode: "payment",
      success_url: successUrl ?? defaultSuccessUrl,
      cancel_url: cancelUrl ?? defaultCancelUrl,
      client_reference_id: item.id,
      metadata,
      // Customers may redeem Stripe promotion codes on the hosted page. The
      // codes, their coupons and every restriction on them — eligible product,
      // customer, expiry, redemption limit — live in Stripe and are enforced by
      // Stripe. This application deliberately owns none of that: it reads the
      // discount the provider actually applied and reconciles the order against
      // it. A discount changes the amount due and nothing else, so eligibility,
      // ownership, verification and document access are unaffected below.
      allow_promotion_codes: true,
      // The line item names the catalog Product, so a coupon restricted to that
      // Product actually matches it. The amount stays server-set: the price
      // this application will charge is not delegated to the catalog, and the
      // reconciliation below still requires it to be the regular price exactly.
      //
      // `product_data` is what created the defect — Stripe makes a fresh ad-hoc
      // Product for every Session given one, so no Session ever sold the
      // catalog Product. It survives only outside production, where the
      // test-mode account is a different account and a live Product id names
      // nothing in it.
      line_items: [
        {
          quantity: 1,
          price_data: catalogProductId
            ? {
              currency: consumerPacketCurrency,
              unit_amount: consumerPacketPriceCents,
              product: catalogProductId
            }
            : {
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
      // The catalog identity is part of the key: a Session created against a
      // different Product is a different order, and replaying the old key would
      // hand back the Session this release exists to stop using.
      idempotencyKey: checkoutIdempotencyKey(
        item.id,
        binding.verificationHash,
        verification.revision,
        item.checkoutSessionId,
        catalogProductId
      )
    }));

    if (session.status !== "open" || !session.url) {
      if (session.status === "open") {
        await providerCall("expire_unusable_new_session", () => (stripe as Stripe).checkout.sessions.expire(session.id));
      }
      throw new ConsumerCheckoutTemporarilyUnavailableError();
    }
    const bindingResult = await persistCheckoutBinding(binding, session.id, "stripe");
    if (bindingResult.outcome !== "bound") {
      if (bindingResult.outcome === "refused" && session.status === "open") {
        await providerCall("expire_unbound_new_session", () => (stripe as Stripe).checkout.sessions.expire(session.id));
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
    // A catalog this application cannot read unambiguously is an unavailable
    // checkout, never a Session built on a guess. It is not a dry-run trigger
    // either: the dry run exists for a missing Stripe configuration, and here
    // Stripe is configured and answering.
    if (isConsumerPacketCatalogError(error)) throw new ConsumerCheckoutTemporarilyUnavailableError();
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
    return providerCall("update_reusable_session_metadata", () => stripe.checkout.sessions.update(session.id, {
      metadata: missing
    }));
  }
  return session;
}

/**
 * Whether an existing Session is still the order this application would create.
 *
 * The pricing half is the shared reconciliation: our product, quantity one, USD,
 * the regular price, and a total that is the regular price less whatever
 * discount Stripe applied. `expectSettled` is false because a reusable session
 * is normally still open, and an open session is not expected to be paid.
 *
 * Whether the session offers a promotion-code field is decided separately, by
 * the caller, because it is a reason to replace an *open* session and never a
 * reason to disown a completed one.
 */
function checkoutSessionBaseBindingMatches(
  session: Stripe.Checkout.Session,
  binding: ConsumerCheckoutBinding
): boolean {
  const reconciliation = reconcileConsumerOrder(
    session,
    session.line_items?.data ?? [],
    binding,
    { expectSettled: false }
  );
  return reconciliation.ok;
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
  previousSessionId?: string,
  catalogProductId?: string | null
) {
  // Concurrent requests for one protected authority converge on one Stripe
  // Session. A refused stale CAS forces a protected reload/rederivation; the
  // changed hash/revision then advances the key instead of returning the
  // expired stale-authority Session. The catalog product is part of the key for
  // the same reason: a Session on a different Product is a different order.
  return `${CONSUMER_PACKET_PRODUCT_ID}:${itemId}:${verificationHash}:${verificationRevision}`
    + `:${previousSessionId ?? "initial"}:${catalogProductId ?? "inline"}`;
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

  // A no-cost order is settled too. Stripe reports `no_payment_required` and
  // completes the session without collecting, so a customer who redeemed a
  // 100%-off code would otherwise be told on return that they had not paid,
  // forever. The entitlement itself is still decided by the server-recorded
  // payment row, not by this reader.
  const noCost = session.payment_status === "no_payment_required";
  const settled = session.payment_status === "paid" || (noCost && session.status === "complete");

  return {
    paid: sessionBoundToItem && settled,
    mode: "stripe",
    checkoutSessionId: session.id,
    paymentIntentId: paymentIntent?.id,
    receiptUrl: paymentIntent?.latest_charge && typeof paymentIntent.latest_charge !== "string" ? paymentIntent.latest_charge.receipt_url ?? undefined : undefined,
    // What Stripe collected, which is nothing on a fully discounted order.
    amountCents: noCost ? 0 : session.amount_total ?? consumerPacketPriceCents
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

/**
 * What a provider call refused with, reduced to the provider's own public
 * classification.
 *
 * Stripe's type, code and param name a configuration fault exactly — a missing
 * resource, an unusable parameter, the account it was asked of. None of them is
 * a credential. The free-text message is deliberately left out so nothing
 * incidental travels with it, and `phase` says which call refused, because
 * "checkout failed" without that is the state this field exists to end.
 */
export type ConsumerCheckoutProviderFailure = {
  phase: string;
  type: string;
  code: string | null;
  param: string | null;
  statusCode: number | null;
};

function providerFailureOf(error: unknown, phase: string): ConsumerCheckoutProviderFailure | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { type?: unknown; rawType?: unknown; code?: unknown; param?: unknown; statusCode?: unknown };
  const type = typeof candidate.type === "string"
    ? candidate.type
    : (typeof candidate.rawType === "string" ? candidate.rawType : null);
  if (!type) return null;
  return {
    phase,
    type,
    code: typeof candidate.code === "string" ? candidate.code : null,
    param: typeof candidate.param === "string" ? candidate.param : null,
    statusCode: typeof candidate.statusCode === "number" ? candidate.statusCode : null
  };
}

/**
 * One provider call, with the call named.
 *
 * A Stripe error thrown out of any of these used to leave the route as an
 * unhandled 500 with an empty body: no sentence for the participant, and
 * nothing an operator could act on. Every provider call in this path now
 * refuses through this, so the refusal is classified and says which step it
 * came from. Errors this module already classifies pass through untouched.
 */
/**
 * Whether the provider's refusal means "this id names nothing here".
 *
 * Stripe answers `resource_missing` for an id that does not exist in the
 * account and mode the request was made with. That is the one refusal a stored
 * Checkout Session id can earn that carries no risk of overwriting a real
 * order, because there is no order behind it to overwrite.
 */
function storedSessionNamesNothing(error: unknown): boolean {
  if (!(error instanceof ConsumerCheckoutTemporarilyUnavailableError)) return false;
  return error.providerFailure?.code === "resource_missing";
}

async function providerCall<T>(phase: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (isStripeConfigurationError(error) || isConsumerPacketCatalogError(error)) throw error;
    const failure = providerFailureOf(error, phase);
    if (!failure) throw error;
    throw new ConsumerCheckoutTemporarilyUnavailableError(failure);
  }
}

export class ConsumerCheckoutTemporarilyUnavailableError extends Error {
  constructor(readonly providerFailure: ConsumerCheckoutProviderFailure | null = null) {
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
