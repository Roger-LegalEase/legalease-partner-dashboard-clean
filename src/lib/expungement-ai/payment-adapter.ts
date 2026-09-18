import "server-only";

import { createHash } from "node:crypto";

import type Stripe from "stripe";
import { absoluteExpungementAiUrl } from "@/lib/app-url";
import { getStripeServerClient, isProductionRuntime, isStripeConfigurationError, stripeSecretKeyIsLiveMode } from "@/lib/stripe/server";
import { resolveDeploymentEnvironment } from "@/lib/server-runtime-environment";
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
  persistConsumerCheckoutBinding,
  readStoredConsumerCheckoutSession,
  replaceConsumerCheckoutSession
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
  /**
   * Present only when a Checkout Session id stored on this matter could not be
   * resolved and the order was allowed to continue anyway. It carries the
   * provider's own classification of that lookup and its request id, so a
   * recovery is auditable rather than silent.
   */
  storedSessionRecovery?: ConsumerCheckoutProviderFailure | null;
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
  // Preserved when a stored session could not be resolved and the order was
  // nevertheless allowed to continue. A recovery that leaves no trace is a
  // recovery nobody can audit: this carries the provider's classification and
  // its request id onto the successful response, so the decision is observable
  // from the outside instead of inferred from the absence of an error.
  let storedSessionRecovery: ConsumerCheckoutProviderFailure | null = null;
  // Set whenever this request will write a new Session over a predecessor the
  // matter still has stored. There are two ways to earn that, and both end the
  // same way:
  //
  //   - a stored OPEN Session was expired here because it was incompatible or
  //     stale, or
  //   - a stored Session was POSITIVELY PROVEN absent from the verified
  //     provider account and mode.
  //
  // The second case looks like "there is nothing to replace", and that reading
  // is what broke the live order. Nothing is stored *at Stripe*; the database
  // row still carries the exact old id. The initial writer refuses any new id
  // once one is stored, so this must select the compare-and-swap writer in both
  // cases, and it names the exact id that swap must still find stored.
  let replacedCheckoutSessionId: string | null = null;
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
      } else if (storedSessionIsAbsentFromTheVerifiedAccount(error, await stripeAccountIdentity(stripe))) {
        // The stored id names no Session in an account and mode this deployment
        // has POSITIVELY IDENTIFIED as the one it sells through. Both halves are
        // required. `resource_missing` on its own says only "not here", and
        // "here" is decided by whichever key the deployment is holding — so
        // without the identity check a rotated or mis-set key would turn a real,
        // unsettled order in the old account into a second checkout in the new
        // one. With the identity confirmed, the id can only ever have been
        // minted in this same account, so there is no order behind it.
        existing = null;
        existingLookupCompleted = true;
        // The id names nothing at the provider, but it is still the value in the
        // `checkout_session_id` column of this matter's row. A new Session
        // therefore has to be swapped in against that exact predecessor: the
        // initial writer sees a row that already holds a Session id and refuses
        // with `checkout_binding_conflict`, which is precisely what stopped the
        // live order from ever reaching a payable Checkout page.
        replacedCheckoutSessionId = item.checkoutSessionId as string;
        storedSessionRecovery = error instanceof ConsumerCheckoutTemporarilyUnavailableError
          ? error.providerFailure
          : null;
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
      // The id this order is replacing. The initial-binding writer refuses any
      // new Session once one is stored, so the Session created below is written
      // through the compare-and-swap writer instead, naming exactly this
      // predecessor. Without it the replacement is recorded nowhere and the
      // matter is left holding an expired Session.
      replacedCheckoutSessionId = existing.id;
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
          briefcaseItemId: item.id,
          storedSessionRecovery
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
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
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
    };
    // The catalog identity is part of the key: a Session created against a
    // different Product is a different order, and replaying the old key would
    // hand back the Session this release exists to stop using.
    const createKey = checkoutIdempotencyKey(
      item.id,
      binding.verificationHash,
      verification.revision,
      item.checkoutSessionId,
      catalogProductId
    );
    const created = await providerCall("create_session", () =>
      (stripe as Stripe).checkout.sessions.create(sessionParams, { idempotencyKey: createKey }));

    // An idempotent create does not create anything the second time. Stripe
    // replays the response body it stored when the key was first used, so
    // `created.status` is the status that Session had at the moment of the
    // ORIGINAL request — which, for a key first used by an attempt that then
    // failed to bind, was `open` and is now `expired`. Binding that id hands the
    // participant a dead Checkout page and tells this application it succeeded.
    // The status is therefore read back from the provider, not taken from the
    // create response.
    let session = await providerCall("retrieve_created_session", () =>
      (stripe as Stripe).checkout.sessions.retrieve(created.id));

    if (session.status === "expired") {
      // Exactly one successor, under a key derived from the expired Session's
      // own id. It is deterministic, so two concurrent requests that replay the
      // same expired Session derive the same successor key and Stripe returns
      // them the same single successor rather than two rival Sessions. A random
      // key would mint one Session per retry; a loop would mint one per
      // iteration. There is one attempt and no loop: if the successor is not
      // usable either, the request refuses.
      const successorKey = checkoutSuccessorIdempotencyKey(createKey, session.id, sessionParams);
      const successor = await providerCall("create_successor_session", () =>
        (stripe as Stripe).checkout.sessions.create(sessionParams, { idempotencyKey: successorKey }));
      // Freshly read for the same reason as above: the successor key may itself
      // be a replay from an earlier attempt.
      session = await providerCall("retrieve_successor_session", () =>
        (stripe as Stripe).checkout.sessions.retrieve(successor.id));
    }

    if (session.status !== "open" || !session.url) {
      if (session.status === "open") {
        await providerCall("expire_unusable_new_session", () => (stripe as Stripe).checkout.sessions.expire(session.id));
      }
      throw new ConsumerCheckoutTemporarilyUnavailableError();
    }
    // An initial binding and a replacement are different writes. The initial
    // writer refuses once any Session is stored — that refusal is what stops a
    // second Session being written over an existing order — so a replacement
    // goes through the compare-and-swap writer, naming the exact predecessor it
    // expired. Losing that race is not an error to overwrite: the winner is
    // reconciled and returned instead. The losing Session is expired only when
    // it is actually a different Session from the winner — under an idempotent
    // create the two can be the same id.
    if (replacedCheckoutSessionId) {
      const replacement = await replaceConsumerCheckoutSession({
        userId: binding.userId,
        briefcaseItemId: binding.briefcaseItemId,
        expectedCheckoutSessionId: replacedCheckoutSessionId,
        checkoutSessionId: session.id,
        paymentProvider: "stripe",
        productId: binding.productId,
        personId: binding.personId,
        matterId: binding.matterId,
        expectedVerificationHash: binding.verificationHash
      });
      if (replacement.outcome === "conflicted") {
        const conflictFailure: ConsumerCheckoutBindingFailure = {
          operation: "replacement",
          outcome: "conflicted",
          reason: "checkout_replacement_conflict"
        };
        // Losing the swap is not authority to expire anything.
        //
        // Creation is idempotent: two concurrent requests deriving the same key
        // are handed the SAME Session id. One wins the swap and that id becomes
        // the matter's order; the other is told `conflicted` — about the id it
        // is itself holding. Expiring "the Session this request created" would
        // destroy the order the winner just recorded and leave the matter
        // storing a Session nobody can pay. Convergence on one Session is the
        // correct outcome of that race, not a collision to clean up after.
        //
        // So the row is read again, here, after the swap has been decided. The
        // swap's own report of the winner is a snapshot taken inside the RPC and
        // may be null even when a binding exists; it is not a safe basis for
        // destroying an order. This read is what the decision below rests on.
        const stored = await readStoredConsumerCheckoutSession({
          userId: binding.userId,
          briefcaseItemId: binding.briefcaseItemId
        });
        // What the matter holds NOW, preferred over the swap's snapshot of it.
        const winner = (stored.readable ? stored.checkoutSessionId : null)
          ?? replacement.winningCheckoutSessionId;
        // Cleanup requires PROOF that this request's Session is not the stored
        // one. A read that could not be taken proves nothing, and neither does
        // a row holding no Session at all — in both cases the Session stays,
        // because the worst case of keeping it is an open Session that Stripe
        // will expire on its own, and the worst case of expiring it is a
        // participant holding a dead Checkout page for an order that was real.
        const candidateIsProvenOrphaned = stored.readable
          && typeof stored.checkoutSessionId === "string"
          && stored.checkoutSessionId !== session.id;
        const cleanupFailure = candidateIsProvenOrphaned && session.status === "open"
          ? await expireUnboundSession(stripe as Stripe, "expire_lost_replacement_session", session.id)
          : null;
        if (winner) {
          let winning: Stripe.Checkout.Session;
          try {
            winning = await providerCall("retrieve_winning_session", () =>
              (stripe as Stripe).checkout.sessions.retrieve(winner, {
                expand: ["line_items.data.price.product", "discounts.promotion_code"]
              }));
          } catch (error) {
            // The winner could not be read, so this request has no Session to
            // hand back — but the cause it reports is still the lost race, with
            // the provider call that failed named alongside it.
            throw new ConsumerCheckoutTemporarilyUnavailableError(
              error instanceof ConsumerCheckoutTemporarilyUnavailableError
                ? error.providerFailure
                : providerFailureOf(error, "retrieve_winning_session"),
              { bindingFailure: conflictFailure, cleanupFailure }
            );
          }
          if (winning.status === "open" && winning.url) {
            return {
              mode: "stripe",
              checkoutSessionId: winning.id,
              checkoutUrl: winning.url,
              amountCents: consumerPacketPriceCents,
              currency: consumerPacketCurrency,
              outcome: "checkout_reused",
              briefcaseItemId: item.id,
              storedSessionRecovery
            };
          }
          if (winning.status === "complete") {
            return {
              mode: "stripe",
              checkoutSessionId: winning.id,
              checkoutUrl: consumerPacketReadyUrl(item.id),
              amountCents: consumerPacketPriceCents,
              currency: consumerPacketCurrency,
              outcome: "payment_pending",
              briefcaseItemId: item.id,
              paymentPending: true,
              storedSessionRecovery
            };
          }
        }
        throw new ConsumerCheckoutTemporarilyUnavailableError(null, {
          bindingFailure: conflictFailure,
          cleanupFailure
        });
      }
      if (replacement.outcome !== "replaced") {
        // The compare-and-swap refused. That refusal — not whatever the tidy-up
        // expiry goes on to do — is the reason this request cannot continue.
        const bindingFailure: ConsumerCheckoutBindingFailure = {
          operation: "replacement",
          outcome: replacement.outcome,
          reason: bindingFailureReason(replacement.reason, "checkout_replacement_refused")
        };
        const cleanupFailure = session.status === "open"
          ? await expireUnboundSession(stripe as Stripe, "expire_unbound_new_session", session.id)
          : null;
        throw new ConsumerCheckoutTemporarilyUnavailableError(null, { bindingFailure, cleanupFailure });
      }
    } else {
      const bindingResult = await persistCheckoutBinding(binding, session.id, "stripe");
      if (bindingResult.outcome !== "bound") {
        const bindingFailure: ConsumerCheckoutBindingFailure = {
          operation: "initial_bind",
          outcome: bindingResult.outcome,
          reason: bindingFailureReason(bindingResult.reason, "checkout_binding_refused")
        };
        const cleanupFailure = bindingResult.outcome === "refused" && session.status === "open"
          ? await expireUnboundSession(stripe as Stripe, "expire_unbound_new_session", session.id)
          : null;
        throw new ConsumerCheckoutTemporarilyUnavailableError(null, { bindingFailure, cleanupFailure });
      }
    }

    return {
      mode: "stripe",
      checkoutSessionId: session.id,
      checkoutUrl: session.url ?? defaultCancelUrl,
      amountCents: consumerPacketPriceCents,
      currency: consumerPacketCurrency,
      outcome: "checkout_created",
      briefcaseItemId: item.id,
      storedSessionRecovery
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
    const dryRunBinding = await persistCheckoutBinding(binding, dryRunSessionId, "dry_run");
    if (dryRunBinding.outcome !== "bound") {
      throw new ConsumerCheckoutTemporarilyUnavailableError(null, {
        bindingFailure: {
          operation: "initial_bind",
          outcome: dryRunBinding.outcome,
          reason: bindingFailureReason(dryRunBinding.reason, "checkout_binding_refused")
        }
      });
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

function checkoutSuccessorIdempotencyKey(
  createKey: string,
  expiredSessionId: string,
  sessionParams: Stripe.Checkout.SessionCreateParams
) {
  // Stripe caps idempotency keys at 255 characters and refuses reuse of a key
  // with different request parameters. The old successor key appended a real
  // Checkout Session id to the already-long base key, which can exceed that
  // limit, and it survived request-shape changes without changing identity.
  //
  // Hash the complete successor identity instead: concurrent requests with the
  // same order and exact parameters still converge on one Session, while a
  // parameter-changing release gets a different key rather than colliding with
  // Stripe's stored request. The v2 prefix also guarantees no collision with
  // any successor key produced by the retired concatenated format.
  const digest = createHash("sha256")
    .update(JSON.stringify({ createKey, expiredSessionId, sessionParams }))
    .digest("hex");
  return `${CONSUMER_PACKET_PRODUCT_ID}:successor:v2:${digest}`;
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
  /**
   * The provider's own identifier for the failed request. It names the entry in
   * Stripe's request log, which is where the full request and response live, so
   * a refusal observed from the outside can be tied to the exact call that
   * produced it. It is an opaque handle, not a credential and not customer data.
   */
  requestId: string | null;
};

function providerFailureOf(error: unknown, phase: string): ConsumerCheckoutProviderFailure | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as {
    type?: unknown; rawType?: unknown; code?: unknown; param?: unknown; statusCode?: unknown; requestId?: unknown;
  };
  const type = typeof candidate.type === "string"
    ? candidate.type
    : (typeof candidate.rawType === "string" ? candidate.rawType : null);
  if (!type) return null;
  return {
    phase,
    type,
    code: typeof candidate.code === "string" ? candidate.code : null,
    param: typeof candidate.param === "string" ? candidate.param : null,
    statusCode: typeof candidate.statusCode === "number" ? candidate.statusCode : null,
    requestId: typeof candidate.requestId === "string" ? candidate.requestId : null
  };
}

/**
 * Why this application's own write of the Checkout Session id refused.
 *
 * This is the failure that used to vanish. When a binding refuses, the Session
 * that was just created has to be expired, and if that cleanup call also fails
 * its provider error propagated and became the only thing reported — so a
 * refusal by the database writer was read from the outside as a Stripe fault at
 * the `expire_unbound_new_session` phase, which is a different bug in a
 * different system. The primary cause is now carried explicitly.
 *
 * `operation` says which writer refused: `initial_bind` writes into a row with
 * no Session stored, `replacement` compare-and-swaps over a named predecessor.
 * `reason` is a bounded classification token from a fixed vocabulary — never a
 * database message, never SQL, never a stack.
 */
export type ConsumerCheckoutBindingFailure = {
  operation: "initial_bind" | "replacement";
  outcome: "refused" | "unavailable" | "conflicted";
  reason: string | null;
};

/**
 * The classification tokens a binding failure may carry outward.
 *
 * Every entry is a name this application or its own SQL chose. Anything else —
 * in particular a PostgREST or Postgres message, which is where free text and
 * statement fragments would come from — is reported as the generic token for
 * its shape instead of being passed through.
 */
const CONSUMER_CHECKOUT_BINDING_REASONS: ReadonlySet<string> = new Set([
  "invalid_expected_verification_hash",
  "checkout_binding_storage_unavailable",
  "checkout_binding_response_invalid",
  "checkout_binding_refused",
  "checkout_binding_conflict",
  "checkout_binding_invalid",
  "checkout_replacement_storage_unavailable",
  "checkout_replacement_response_invalid",
  "checkout_replacement_refused",
  "checkout_replacement_invalid",
  "checkout_replacement_conflict",
  "checkout_session_in_use",
  "verification_changed",
  "item_not_found",
  "already_paid"
]);

function bindingFailureReason(reason: string | undefined, fallback: string): string {
  return reason && CONSUMER_CHECKOUT_BINDING_REASONS.has(reason) ? reason : fallback;
}

/**
 * Expire a Session this request created but could not bind, and never let the
 * expiry's own failure stand in for the reason the binding refused.
 *
 * The cleanup's provider classification is returned so it can travel alongside
 * the primary failure. It is returned rather than thrown precisely so it cannot
 * replace it.
 */
async function expireUnboundSession(
  stripe: Stripe,
  phase: string,
  sessionId: string
): Promise<ConsumerCheckoutProviderFailure | null> {
  try {
    await providerCall(phase, () => stripe.checkout.sessions.expire(sessionId));
    return null;
  } catch (error) {
    if (error instanceof ConsumerCheckoutTemporarilyUnavailableError) return error.providerFailure;
    return providerFailureOf(error, phase);
  }
}

/**
 * The account and mode this deployment is actually talking to, read from the
 * provider rather than assumed from configuration.
 *
 * `null` when it cannot be established. A question that could not be answered
 * must never read as an answer, so every caller treats null as "not verified".
 */
export type StripeAccountIdentity = { accountId: string; livemode: boolean };

async function stripeAccountIdentity(stripe: Stripe | null): Promise<StripeAccountIdentity | null> {
  if (!stripe) return null;
  const livemode = stripeSecretKeyIsLiveMode();
  if (livemode === null) return null;
  try {
    // `GET /v1/accounts` with no id returns the account the key belongs to.
    // stripe-node supports it at runtime but its types only declare the
    // retrieve-by-id overload, so the no-argument form is spelled out here
    // rather than passing an id we do not have and are trying to learn.
    const account = await (stripe.accounts as unknown as {
      retrieve: () => Promise<Stripe.Account>;
    }).retrieve();
    if (typeof account.id !== "string" || !account.id.startsWith("acct_")) return null;
    return { accountId: account.id, livemode };
  } catch {
    // An identity that could not be read is not an identity. The caller refuses.
    return null;
  }
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
export function storedSessionIsAbsentFromTheVerifiedAccount(
  error: unknown,
  identity: StripeAccountIdentity | null
): boolean {
  // No verified identity, no conclusion. This is the half the first version of
  // this predicate was missing: `resource_missing` alone only says the id is
  // not in whichever account and mode this deployment happens to be holding a
  // key for, which is exactly the thing in question.
  if (!identity) return false;
  if (identity.accountId !== expectedStripeAccountId()) return false;
  if (identity.livemode !== (resolveDeploymentEnvironment() === "production")) return false;
  if (!(error instanceof ConsumerCheckoutTemporarilyUnavailableError)) return false;
  return error.providerFailure?.code === "resource_missing";
}

/**
 * The Stripe account this deployment is expected to sell through.
 *
 * A Stripe account id names a merchant; it is not a credential, and it appears
 * on every object the account owns. `STRIPE_ACCOUNT_ID` overrides it where a
 * deployment sells through a different account; null means no expectation is
 * configured, and an unconfigured expectation can verify nothing.
 */
function expectedStripeAccountId(): string | null {
  const configured = process.env.STRIPE_ACCOUNT_ID?.trim();
  if (configured) return configured.startsWith("acct_") ? configured : null;
  return resolveDeploymentEnvironment() === "production" ? PRODUCTION_STRIPE_ACCOUNT_ID : null;
}

/** The live merchant account expungement.ai sells through. */
const PRODUCTION_STRIPE_ACCOUNT_ID = "acct_1L62OmDLtltioGNK";

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
  /**
   * This application's own binding refusal, when that is the primary cause.
   *
   * Present exactly when the request got as far as writing the Session id and
   * the write refused. It is never overwritten by a cleanup failure.
   */
  readonly bindingFailure: ConsumerCheckoutBindingFailure | null;
  /**
   * A secondary failure of the expiry that runs after a refused binding. It is
   * reported so the orphaned Session is visible, and it is never the reported
   * cause: `bindingFailure` is.
   */
  readonly cleanupFailure: ConsumerCheckoutProviderFailure | null;

  constructor(
    /**
     * The provider operation that caused the PRIMARY refusal — nothing else.
     * A cleanup that failed after an unrelated primary cause belongs in
     * `cleanupFailure`, so this field never names a step that was merely
     * tidying up after the real failure.
     */
    readonly providerFailure: ConsumerCheckoutProviderFailure | null = null,
    details: {
      bindingFailure?: ConsumerCheckoutBindingFailure | null;
      cleanupFailure?: ConsumerCheckoutProviderFailure | null;
    } = {}
  ) {
    super("Consumer checkout is temporarily unavailable.");
    this.name = "ConsumerCheckoutTemporarilyUnavailableError";
    this.bindingFailure = details.bindingFailure ?? null;
    this.cleanupFailure = details.cleanupFailure ?? null;
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
