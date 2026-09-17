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
const STRIPE_API_VERSION = "2024-06-20";
let lastServedApiVersion = null;

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
      // Pinned so `applies_to` is serialised on the coupon. The account's
      // default version did not return it, and a restriction that is set but
      // not echoed reads exactly like a restriction that was never applied.
      "Stripe-Version": STRIPE_API_VERSION,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {})
    },
    ...(form ? { body: form.toString() } : {})
  });
  const body = await response.json().catch(() => null);
  lastServedApiVersion = response.headers.get("stripe-version") ?? lastServedApiVersion;
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

  // A fixture coupon without the restriction is litter from an earlier attempt
  // and would be found again on every later run. It is deleted rather than left
  // to accumulate; only coupons carrying this fixture's own marker are touched.
  for (const stale of listed?.data ?? []) {
    if (!carriesFixtureMarker(stale)) continue;
    await stripe("DELETE", `coupons/${encodeURIComponent(stale.id)}`);
  }

  // `applies_to.products` is a scalar array. Stripe's own examples encode it as
  // applies_to[products][], and the indexed form this fixture used first was
  // accepted without error and produced applies_to=null -- a restriction asked
  // for and silently not set. Both encodings are attempted, in the documented
  // order, and each result is read back from Stripe before it is believed.
  const attempts = [];
  for (const key of ["applies_to[products][]", "applies_to[products][0]"]) {
    const form = new URLSearchParams();
    form.set("percent_off", "100");
    form.set("duration", "once");
    // Stripe caps a coupon name at 40 characters; the restriction is expressed
    // by applies_to, not by the display name.
    form.set("name", "RCAP acceptance 100% off");
    form.set(key, productId);
    form.set(`metadata[${FIXTURE_KEY}]`, FIXTURE_VALUE);
    const made = await stripe("POST", "coupons", form);
    const readBack = await stripe("GET", `coupons/${encodeURIComponent(made.id)}`);
    const products = readBack.applies_to?.products ?? [];
    if (products.length === 1 && products[0] === productId) return { coupon: readBack, created: true };
    attempts.push(
      `${key} -> create returned ${JSON.stringify({
        id: made.id,
        percent_off: made.percent_off,
        applies_to: made.applies_to ?? null,
        livemode: made.livemode
      })}, read-back applies_to=${JSON.stringify(readBack.applies_to ?? null)}`
    );
    // An unrestricted coupon is not left behind to be found by a later run.
    await stripe("DELETE", `coupons/${encodeURIComponent(made.id)}`);
  }
  // Does this account reject unknown parameters at all? If it silently accepts
  // one that cannot exist, then applies_to was dropped the same way and the
  // account is serving an API version that does not carry it.
  let unknownParameterRejected = null;
  {
    const probe = new URLSearchParams();
    probe.set("percent_off", "100");
    probe.set("duration", "once");
    probe.set("rcap_parameter_that_cannot_exist", "1");
    const response = await fetch("https://api.stripe.com/v1/coupons", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_KEY}`,
        "Stripe-Version": STRIPE_API_VERSION,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: probe.toString()
    });
    const probeBody = await response.json().catch(() => null);
    unknownParameterRejected = !response.ok;
    if (response.ok && probeBody?.id) {
      await stripe("DELETE", `coupons/${encodeURIComponent(probeBody.id)}`);
    }
  }
  // Stripe accepts applies_to on this account -- it rejects genuinely unknown
  // parameters, and did not reject this one -- and then does not persist it, at
  // the API version it confirms serving. That is a sandbox limitation, not an
  // encoding mistake, and it is not something this fixture can code around.
  //
  // So the fixture stops short of claiming a restriction it does not have. The
  // coupon is still Stripe's, still 100% off, still redeemed through Stripe's
  // own page; what it cannot do in this account is carry the product
  // restriction. The claim the release actually turns on -- that the Session's
  // line item is on the catalog Product -- is proved separately by the payment
  // journey, which reads the Product back from Stripe, and that case is
  // required and unchanged.
  const unrestricted = new URLSearchParams();
  unrestricted.set("percent_off", "100");
  unrestricted.set("duration", "once");
  unrestricted.set("name", "RCAP acceptance 100% off");
  unrestricted.set(`metadata[${FIXTURE_KEY}]`, FIXTURE_VALUE);
  const made = await stripe("POST", "coupons", unrestricted);
  const coupon = await stripe("GET", `coupons/${encodeURIComponent(made.id)}`);
  return {
    coupon,
    created: true,
    restrictionRefusedBy: {
      attempts,
      servedApiVersion: lastServedApiVersion,
      requestedApiVersion: STRIPE_API_VERSION,
      accountRejectsUnknownParameters: unknownParameterRejected
    }
  };
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
  const { coupon, created: couponCreated, restrictionRefusedBy = null } = await ensureCoupon(product.id);
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
  evidence.couponRestrictedToProduct = evidence.couponAppliesToProducts.length === 1
    && evidence.couponAppliesToProducts[0] === product.id;
  evidence.restrictionRefusedBy = restrictionRefusedBy;
  if (!evidence.couponRestrictedToProduct) {
    // Stated, not hidden. Acceptance must not be read as proving a restriction
    // this account would not store.
    evidence.note = "This sandbox account accepts applies_to and does not persist it, so the acceptance coupon"
      + " carries no product restriction. The released correction is proved instead by"
      + " checkout_line_item_is_on_the_catalog_product, which reads the Session's Product back from Stripe.";
    console.log(
      `STRIPE FIXTURES NOTE — the sandbox coupon is NOT product-restricted: ${JSON.stringify(restrictionRefusedBy)}`
    );
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
