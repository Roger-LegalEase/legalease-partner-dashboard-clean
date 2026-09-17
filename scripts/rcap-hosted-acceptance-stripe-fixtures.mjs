#!/usr/bin/env node
/**
 * Sandbox Stripe fixtures for hosted acceptance.
 *
 * The released correction makes Checkout sell a CATALOG Product, so that a
 * product-restricted coupon can match the line item. Acceptance has to exercise
 * that path rather than the inline fallback it replaced, and it cannot use the
 * live catalog entry or the live coupon: the acceptance environment holds a
 * test-mode key, in a different Stripe account, and must never hold anything
 * else.
 *
 * So the sandbox gets its own equivalents, created here and nowhere else:
 *
 *   - a Product, with a one-time USD price at the packet's regular amount, set
 *     as its default price;
 *   - a Coupon restricted to exactly that Product;
 *   - a Promotion Code for that coupon.
 *
 * This is test setup. The coupon and its restriction live in Stripe and are
 * enforced by Stripe, which is the whole point of the exercise — the
 * application gains no discount logic from any of it. Nothing here touches the
 * live account, whose key this job never holds.
 *
 * Idempotent by construction: every object is found by a fixture marker before
 * anything is created, so re-running reuses what exists instead of accumulating
 * duplicates that would make "which coupon applied?" unanswerable.
 *
 * Refuses any key that is not sk_test_. The prefix is checkable without reading
 * the value, and refusing before the first call is the only moment at which
 * refusing still costs nothing.
 */

import fs from "node:fs";
import path from "node:path";

const STRIPE_KEY = (process.env.HOSTED_STRIPE_TEST_SECRET ?? "").trim();
const PRICE_CENTS = Number(process.env.RCAP_ACCEPTANCE_PACKET_PRICE_CENTS ?? "5000");
const CURRENCY = "usd";

/** The marker every fixture carries, so it is found rather than re-created. */
const FIXTURE_KEY = "rcap_acceptance_fixture";
const FIXTURE_VALUE = "consumer_packet_catalog/v1";
const PRODUCT_NAME = "RCAP acceptance consumer packet";
/** Deterministic, so the payment journey can name it without being told. */
export const ACCEPTANCE_PROMOTION_CODE = "RCAPACCEPTANCEFREE";

const EVIDENCE_DIR = path.resolve(process.cwd(), "hosted-acceptance-evidence");
const EVIDENCE_FILE = path.join(EVIDENCE_DIR, "stripe-fixtures.json");

// A failure here is decided hundreds of log lines before the job ends, behind
// the end gate's own script echo, which is exactly the window the log API does
// not return. So the reason is written to the evidence bundle as well, where
// the end of the job can reprint it. Nothing secret is written: Stripe's
// message names the object or the permission, never the key.
function fail(message) {
  console.error(`STRIPE FIXTURES FAILED — ${message}`);
  try {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    fs.writeFileSync(EVIDENCE_FILE, `${JSON.stringify({
      schemaVersion: "rcap-hosted-acceptance-stripe-fixtures/v1",
      mode: "test",
      ok: false,
      failure: message,
      keyPresent: Boolean(STRIPE_KEY),
      keyPrefixAccepted: STRIPE_KEY.startsWith("sk_test_")
    }, null, 2)}\n`);
  } catch { /* the console line above is still the record */ }
  process.exit(1);
}

async function stripe(method, pathname, form) {
  const url = `https://api.stripe.com/v1/${pathname}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {})
    },
    ...(form ? { body: form.toString() } : {})
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    // The message, never the key and never the request body.
    fail(`Stripe ${method} ${pathname} returned ${response.status}: ${body?.error?.message ?? "(no message)"}`);
  }
  return body;
}

function carriesFixtureMarker(object) {
  return object?.metadata?.[FIXTURE_KEY] === FIXTURE_VALUE;
}

async function ensureProduct() {
  const listed = await stripe("GET", "products?limit=100&active=true");
  const existing = (listed?.data ?? []).find(carriesFixtureMarker);
  if (existing) return { product: existing, created: false };

  const form = new URLSearchParams();
  form.set("name", PRODUCT_NAME);
  form.set("description", "Test-mode catalog entry so hosted acceptance exercises the catalog-product Checkout path.");
  form.set(`metadata[${FIXTURE_KEY}]`, FIXTURE_VALUE);
  const product = await stripe("POST", "products", form);
  return { product, created: true };
}

async function ensurePrice(productId) {
  const listed = await stripe("GET", `prices?limit=100&active=true&product=${encodeURIComponent(productId)}`);
  const existing = (listed?.data ?? []).find(
    (price) => price.unit_amount === PRICE_CENTS && price.currency === CURRENCY && price.type === "one_time"
  );
  if (existing) return { price: existing, created: false };

  const form = new URLSearchParams();
  form.set("product", productId);
  form.set("currency", CURRENCY);
  form.set("unit_amount", String(PRICE_CENTS));
  form.set(`metadata[${FIXTURE_KEY}]`, FIXTURE_VALUE);
  const price = await stripe("POST", "prices", form);
  return { price, created: true };
}

async function setDefaultPrice(productId, priceId, currentDefault) {
  if (currentDefault === priceId) return false;
  const form = new URLSearchParams();
  form.set("default_price", priceId);
  await stripe("POST", `products/${encodeURIComponent(productId)}`, form);
  return true;
}

/**
 * A 100%-off coupon that applies to exactly one product.
 *
 * The restriction is the fixture's reason for existing: it is what makes the
 * acceptance journey prove the released correction rather than merely prove
 * that some discount can be applied to something.
 */
async function ensureCoupon(productId) {
  const listed = await stripe("GET", "coupons?limit=100");
  const existing = (listed?.data ?? []).find(
    (coupon) => carriesFixtureMarker(coupon)
      && coupon.valid
      && coupon.percent_off === 100
      && (coupon.applies_to?.products ?? []).length === 1
      && coupon.applies_to.products[0] === productId
  );
  if (existing) return { coupon: existing, created: false };

  const form = new URLSearchParams();
  form.set("percent_off", "100");
  form.set("duration", "once");
  // Stripe caps a coupon name at 40 characters; the restriction is expressed
  // by applies_to below, not by the display name.
  form.set("name", "RCAP acceptance 100% off");
  form.set("applies_to[products][0]", productId);
  form.set(`metadata[${FIXTURE_KEY}]`, FIXTURE_VALUE);
  const coupon = await stripe("POST", "coupons", form);
  return { coupon, created: true };
}

async function ensurePromotionCode(couponId) {
  const listed = await stripe("GET", `promotion_codes?limit=100&code=${encodeURIComponent(ACCEPTANCE_PROMOTION_CODE)}`);
  const existing = (listed?.data ?? []).find((promotion) => promotion.active && promotion.coupon?.id === couponId);
  if (existing) return { promotionCode: existing, created: false };

  // A stale code on a superseded coupon blocks the name; it is deactivated
  // rather than deleted, which Stripe does not allow anyway.
  for (const stale of listed?.data ?? []) {
    if (!stale.active) continue;
    const off = new URLSearchParams();
    off.set("active", "false");
    await stripe("POST", `promotion_codes/${encodeURIComponent(stale.id)}`, off);
  }

  const form = new URLSearchParams();
  form.set("coupon", couponId);
  form.set("code", ACCEPTANCE_PROMOTION_CODE);
  form.set(`metadata[${FIXTURE_KEY}]`, FIXTURE_VALUE);
  const promotionCode = await stripe("POST", "promotion_codes", form);
  return { promotionCode, created: true };
}

function emit(name, value) {
  const output = process.env.GITHUB_OUTPUT;
  if (output) fs.appendFileSync(output, `${name}=${value}\n`);
}

async function main() {
  if (!STRIPE_KEY) fail("HOSTED_STRIPE_TEST_SECRET is required");
  if (!STRIPE_KEY.startsWith("sk_test_")) {
    fail("HOSTED_STRIPE_TEST_SECRET is not an sk_test_ key; refusing to create fixtures outside the sandbox");
  }
  if (!Number.isInteger(PRICE_CENTS) || PRICE_CENTS <= 0) fail("the packet price must be a positive integer of cents");

  const { product, created: productCreated } = await ensureProduct();
  const { price, created: priceCreated } = await ensurePrice(product.id);
  const defaultPriceId = typeof product.default_price === "string" ? product.default_price : product.default_price?.id ?? null;
  const defaultPriceSet = await setDefaultPrice(product.id, price.id, defaultPriceId);
  const { coupon, created: couponCreated } = await ensureCoupon(product.id);
  const { promotionCode, created: promotionCodeCreated } = await ensurePromotionCode(coupon.id);

  const evidence = {
    schemaVersion: "rcap-hosted-acceptance-stripe-fixtures/v1",
    mode: "test",
    ok: true,
    productId: product.id,
    productName: product.name,
    priceId: price.id,
    priceUnitAmountCents: price.unit_amount,
    priceCurrency: price.currency,
    priceType: price.type,
    defaultPriceSetByThisRun: defaultPriceSet,
    couponId: coupon.id,
    couponPercentOff: coupon.percent_off,
    couponAppliesToProducts: coupon.applies_to?.products ?? [],
    promotionCodeId: promotionCode.id,
    promotionCode: ACCEPTANCE_PROMOTION_CODE,
    created: {
      product: productCreated,
      price: priceCreated,
      coupon: couponCreated,
      promotionCode: promotionCodeCreated
    },
    liveAccountUntouched: true,
    note: "Test-mode fixtures only. The coupon's product restriction is enforced by Stripe; the application holds no discount logic."
  };

  // The restriction is the thing being relied on, so it is asserted here rather
  // than assumed by the journey that follows.
  if (evidence.couponAppliesToProducts.length !== 1 || evidence.couponAppliesToProducts[0] !== product.id) {
    fail(`the acceptance coupon is not restricted to exactly ${product.id}`);
  }
  if (price.unit_amount !== PRICE_CENTS || price.currency !== CURRENCY || price.type !== "one_time") {
    fail(`the acceptance price is not a one-time ${CURRENCY} ${PRICE_CENTS}`);
  }

  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  fs.writeFileSync(EVIDENCE_FILE, `${JSON.stringify(evidence, null, 2)}\n`);

  emit("product_id", product.id);
  emit("price_id", price.id);
  emit("promotion_code", ACCEPTANCE_PROMOTION_CODE);

  console.log(
    `STRIPE FIXTURES READY — product ${product.id} (${product.name}), price ${price.id} ${price.unit_amount} ${price.currency} ${price.type},`
    + ` coupon ${coupon.id} ${coupon.percent_off}% restricted to [${evidence.couponAppliesToProducts.join(", ")}],`
    + ` promotion code ${ACCEPTANCE_PROMOTION_CODE}`
  );
  console.log(`STRIPE FIXTURES EVIDENCE — ${path.relative(process.cwd(), EVIDENCE_FILE)}`);
}

await main();
