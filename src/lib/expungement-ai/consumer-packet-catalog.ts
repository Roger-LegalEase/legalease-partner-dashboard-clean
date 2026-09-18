import "server-only";

import type Stripe from "stripe";

import { resolveDeploymentEnvironment } from "@/lib/server-runtime-environment";

/**
 * The consumer packet as a Stripe catalog entry.
 *
 * Checkout used to describe the packet inline, with `price_data.product_data`.
 * Stripe honours that by creating a brand-new ad-hoc Product for every Session,
 * so no two Sessions ever sold the same Product and none of them sold the one
 * in the catalog. That is invisible until a coupon is restricted to a specific
 * product: such a coupon matches on the line item's Product, so against an
 * ad-hoc Product it can only be refused, and Stripe reports that refusal as the
 * same "This code is invalid." it uses for a code that does not exist.
 *
 * The line item now names the catalog Product directly, through
 * `price_data.product`, while the amount stays server-set. The coupon, its
 * value and every restriction on it remain in Stripe and are enforced by
 * Stripe; this module only makes sure we are selling the thing those
 * restrictions are written about.
 */

/**
 * The catalog Product the consumer packet is sold as in live mode: the Grade-A
 * catalog entry, $50.00 USD, active.
 *
 * This is the same Product id the acceptance Preview sells, because the live
 * entry was copied from the Grade-A sandbox catalog and Stripe preserved the
 * id. One id across both modes is the point: the Product the hosted acceptance
 * proves against and the Product Production charges for are now the same
 * catalog entry, so a coupon written about it means the same thing in both.
 *
 * It replaces prod_Sx3T2wUkaYKqg9, which live checkout sold while the live
 * coupons were written about this entry. Nothing was wrong with the Session,
 * the amount or the code: a coupon matches on the line item's Product, so one
 * restricted to this entry could only ever be refused against that one, and
 * Stripe reports that refusal as "This code is invalid."
 *
 * A Stripe Product id is a catalog identifier — it names what is for sale — and
 * is not a credential. `STRIPE_CONSUMER_PACKET_PRODUCT_ID` overrides it where an
 * environment sells a different catalog entry.
 */
export const CONSUMER_PACKET_CATALOG_PRODUCT_ID = "prod_VHEHkvH7dSvGv7";

export class ConsumerPacketCatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConsumerPacketCatalogError";
  }
}

/**
 * The Product this deployment must sell, or null where none is configured.
 *
 * Production always has one: the catalog entry the coupons are written against.
 * Preview and development fall back to null unless they are told otherwise,
 * because the test-mode Stripe account is a different account with its own
 * catalog, and a live Product id means nothing inside it. Those deployments
 * keep describing the packet inline, which is the behaviour they have always
 * had and which nothing in test mode depends on being a catalog entry.
 */
export function expectedCatalogProductId(): string | null {
  const configured = process.env.STRIPE_CONSUMER_PACKET_PRODUCT_ID?.trim();
  if (configured) {
    if (!configured.startsWith("prod_")) {
      throw new ConsumerPacketCatalogError("STRIPE_CONSUMER_PACKET_PRODUCT_ID is not a Stripe product id");
    }
    return configured;
  }
  return resolveDeploymentEnvironment() === "production" ? CONSUMER_PACKET_CATALOG_PRODUCT_ID : null;
}

/** Confirmed product ids, so the catalog is read once rather than per checkout. */
const confirmedProducts = new Set<string>();

/**
 * Confirms the catalog entry before a Session is built on it.
 *
 * The Product must exist and be active — selling an archived catalog entry is
 * not something to discover from a customer. Its default Price, where it has
 * one, must be the packet's price: active, one-time, USD, the regular amount.
 * A Product with no default Price is not a contradiction — the amount this
 * application charges is server-set either way — but a default Price that says
 * something else is, and that refuses rather than quietly charging past it.
 */
export async function confirmCatalogProduct(
  stripe: Stripe,
  productId: string,
  expectedUnitAmountCents: number,
  currency: string
): Promise<void> {
  if (confirmedProducts.has(productId)) return;

  const product = await stripe.products.retrieve(productId, { expand: ["default_price"] });
  if (product.deleted) throw new ConsumerPacketCatalogError(`${productId} is deleted`);
  if (!product.active) throw new ConsumerPacketCatalogError(`${productId} is not active`);

  const defaultPrice = product.default_price;
  if (defaultPrice && typeof defaultPrice !== "string") {
    if (!defaultPrice.active) {
      throw new ConsumerPacketCatalogError(`the default price of ${productId} is not active`);
    }
    if (defaultPrice.type !== "one_time") {
      throw new ConsumerPacketCatalogError(`the default price of ${productId} is ${defaultPrice.type}, not one_time`);
    }
    if ((defaultPrice.currency ?? "").toLowerCase() !== currency) {
      throw new ConsumerPacketCatalogError(`the default price of ${productId} is not ${currency}`);
    }
    if (defaultPrice.unit_amount !== expectedUnitAmountCents) {
      throw new ConsumerPacketCatalogError(
        `the default price of ${productId} is ${defaultPrice.unit_amount ?? "(absent)"}, not ${expectedUnitAmountCents}`
      );
    }
  }

  confirmedProducts.add(productId);
}

/** The Product id a reconciled line item is actually on, where it is expanded. */
export function lineItemProductId(line: Stripe.LineItem | undefined): string | null {
  const product = line?.price?.product;
  if (!product) return null;
  if (typeof product === "string") return product;
  return product.id ?? null;
}

export function isConsumerPacketCatalogError(error: unknown): error is ConsumerPacketCatalogError {
  return error instanceof ConsumerPacketCatalogError;
}
