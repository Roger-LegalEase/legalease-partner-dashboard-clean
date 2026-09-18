#!/usr/bin/env node
/**
 * Read-only object-level diagnosis of the live promotion code refusal.
 *
 * Production's own Stripe secret key is read from the Vercel project that
 * serves expungement.ai, and every Stripe call below is a GET. Nothing is
 * created, updated, expired or deleted: not the promotion code, not the coupon,
 * not the product, not the Checkout Session. This script exists to name the
 * exact object-level mismatch behind Stripe's "This code is invalid." and to
 * stop the question being answered by inference.
 *
 * The key never leaves memory and never reaches stdout or the evidence file.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  HOSTED_VERCEL_PROJECT_ID,
  hostedVercelScopedUrl,
  resolveHostedVercelIdentity
} from "./rcap-hosted-acceptance-vercel-identity.mjs";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
// Either a promo_ id or the customer-facing code. A code that was created in
// the dashboard is known by the string customers type long before anyone has
// its id, and looking it up by that string is also the one query that
// distinguishes "this code does not exist in live mode" from every other
// reason Stripe refuses it.
const PROMOTION_CODE_ID = (process.env.RCAP_PROMOTION_CODE_ID ?? "").trim();
const PROMOTION_CODE = (process.env.RCAP_PROMOTION_CODE ?? "").trim();
const COUPON_ID = (process.env.RCAP_COUPON_ID ?? "").trim();
const CHECKOUT_SESSION_ID = (process.env.RCAP_CHECKOUT_SESSION_ID ?? "").trim();
const EXPECTED_PRODUCT_ID = (process.env.RCAP_EXPECTED_PRODUCT_ID ?? "prod_Sx3T2wUkaYKqg9").trim();
const DASHBOARD_PRODUCT_NAME = (process.env.RCAP_DASHBOARD_PRODUCT_NAME ?? "DIY Expungment").trim();

const EVIDENCE_DIR = resolve(process.cwd(), "production-canary-evidence");

/** Everything secret this process has seen, so nothing is printed by accident. */
const secrets = new Set();
function redact(text) {
  let out = String(text ?? "");
  for (const secret of secrets) {
    if (secret && secret.length >= 8) out = out.split(secret).join("[redacted]");
  }
  return out;
}
function say(line) {
  process.stdout.write(`${redact(line)}\n`);
}
function fail(message) {
  say(`STRIPE OBJECT DIAGNOSIS FAILED — ${message}`);
  process.exit(1);
}

async function getJson(url, { token, headers = {} } = {}) {
  const response = await fetch(url, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }
  });
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { status: response.status, ok: response.ok, json, text };
}

/** Stripe GET. The key is passed as a bearer token and never logged. */
async function stripeGet(secretKey, pathname) {
  const result = await getJson(`https://api.stripe.com${pathname}`, { token: secretKey });
  return result;
}

/**
 * Candidate live keys supplied directly by the runner, in preference order.
 *
 * Vercel marks the production STRIPE_SECRET_KEY "sensitive", which is
 * write-only by design: the API returns the entry without its value and no
 * flag changes that. So a key handed to this job is tried first, and only its
 * ABSENCE is reported — never its value, and never which name carried it in a
 * way that could be combined with anything else.
 */
const DIRECT_KEY_NAMES = [
  "RCAP_STRIPE_READ_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_LIVE_SECRET_KEY",
  "STRIPE_RESTRICTED_KEY"
];

function readDirectStripeKey() {
  const present = [];
  let chosen = null;
  for (const name of DIRECT_KEY_NAMES) {
    const value = (process.env[name] ?? "").trim();
    if (!value) continue;
    present.push(`${name}=${value.startsWith("sk_live_") || value.startsWith("rk_live_") ? "live" : value.startsWith("sk_test_") || value.startsWith("rk_test_") ? "test" : "unrecognised"}`);
    if (!chosen && (value.startsWith("sk_live_") || value.startsWith("rk_live_"))) chosen = value;
  }
  return { chosen, present };
}

/** The exact production value of one environment variable, decrypted. */
async function readProductionStripeKey(identity) {
  const listing = await getJson(
    hostedVercelScopedUrl(`/v9/projects/${encodeURIComponent(identity.projectId)}/env?decrypt=true`, identity),
    { token: VERCEL_TOKEN }
  );
  if (!listing.ok) {
    fail(`Vercel refused the production environment listing (HTTP ${listing.status}). Without it the production Stripe key cannot be resolved.`);
  }
  const entries = Array.isArray(listing.json?.envs) ? listing.json.envs : [];
  const candidates = entries.filter(entry =>
    entry?.key === "STRIPE_SECRET_KEY"
    && (Array.isArray(entry.target) ? entry.target.includes("production") : entry.target === "production"));
  if (candidates.length === 0) {
    fail("the Vercel project has no production STRIPE_SECRET_KEY entry");
  }
  // A "sensitive" variable is write-only by design: Vercel will not return it.
  const readable = candidates.find(entry => typeof entry.value === "string" && entry.value.startsWith("sk_"));
  if (!readable) {
    const types = candidates.map(entry => entry.type ?? "(no type)").join(", ");
    return { key: null, reason: `the production STRIPE_SECRET_KEY exists but Vercel did not return its value (type: ${types}); a sensitive variable cannot be read back through the API` };
  }
  secrets.add(readable.value);
  return { key: readable.value, reason: null };
}

async function main() {
  if (!VERCEL_TOKEN) fail("VERCEL_TOKEN is required to read the production Stripe key");
  if (!PROMOTION_CODE_ID && !PROMOTION_CODE) {
    fail("one of RCAP_PROMOTION_CODE_ID or RCAP_PROMOTION_CODE is required");
  }

  say("RCAP Stripe object diagnosis — read-only. No Stripe object is created, modified or deleted.");

  const identity = await resolveHostedVercelIdentity({ token: VERCEL_TOKEN });
  if (identity.projectId !== HOSTED_VERCEL_PROJECT_ID) {
    fail(`resolved the wrong Vercel project (${identity.projectId})`);
  }
  say(`Vercel project ${identity.projectName} (${identity.projectId}) in team ${identity.teamId}`);

  const direct = readDirectStripeKey();
  let secretKey = direct.chosen;
  let keySource = secretKey ? "supplied to the job" : null;
  if (secretKey) {
    secrets.add(secretKey);
  } else {
    const fromVercel = await readProductionStripeKey(identity);
    if (fromVercel.key) {
      secretKey = fromVercel.key;
      keySource = "Vercel production environment";
    } else {
      say(`Vercel could not supply the key: ${fromVercel.reason}.`);
      say(`Live keys handed to this job: ${direct.present.length ? direct.present.join(", ") : "none of " + DIRECT_KEY_NAMES.join(", ")}.`);
      fail("no live Stripe credential is reachable from this job, so the Stripe objects cannot be read. This is a credential blocker, not a finding about the promotion code.");
    }
  }
  const keyMode = secretKey.startsWith("sk_live_") || secretKey.startsWith("rk_live_") ? "live"
    : secretKey.startsWith("sk_test_") || secretKey.startsWith("rk_test_") ? "test" : "unknown";
  say(`Stripe key resolved from ${keySource} and masked; its prefix says mode=${keyMode}`);

  // 7. The account the production key actually belongs to.
  // A restricted key is commonly not granted Account read, and that is not a
  // reason to abandon the diagnosis: every other object below carries livemode
  // itself, and those are what the question turns on.
  const account = await stripeGet(secretKey, "/v1/account");
  const accountId = account.ok ? (account.json?.id ?? null) : null;
  const accountError = account.ok
    ? null
    : (account.json?.error?.message ?? account.json?.error?.code ?? `http_${account.status}`);
  if (!account.ok) {
    say(`/v1/account is not readable with this key (${accountError}); continuing, since livemode is carried by each object below.`);
  }

  // 1-4. The promotion code, its flags, its coupon and the coupon's product
  // restriction. A 404 here with a live key means the object lives in another
  // account or another mode, which is itself the answer.
  //
  // A lookup BY CODE is listed rather than retrieved, so it answers even when
  // the code does not exist: an empty list is the account stating it holds no
  // such code in this mode, which a 404 on an id cannot distinguish from a
  // typo. Every promotion code carrying the string is reported, because two of
  // them -- one active, one not -- is a shape that looks correct in a dashboard
  // and refuses at Checkout.
  let promo = null;
  let byCodeMatches = [];
  if (PROMOTION_CODE) {
    const listed = await stripeGet(
      secretKey,
      `/v1/promotion_codes?limit=100&code=${encodeURIComponent(PROMOTION_CODE)}&expand[]=data.coupon.applies_to`
    );
    byCodeMatches = Array.isArray(listed.json?.data) ? listed.json.data : [];
    // Prefer an active one; otherwise report whatever the account holds.
    promo = byCodeMatches.find(entry => entry?.active === true) ?? byCodeMatches[0] ?? null;
    if (promo) promo = { ok: true, status: 200, json: promo };
  }
  if (!promo && PROMOTION_CODE_ID) {
    promo = await stripeGet(
      secretKey,
      `/v1/promotion_codes/${encodeURIComponent(PROMOTION_CODE_ID)}?expand[]=coupon.applies_to`
    );
  }
  if (!promo) promo = { ok: false, status: 404, json: null };
  const promoFound = promo.ok;
  const promoError = promoFound
    ? null
    : (promo.json?.error?.code ?? promo.json?.error?.type
      ?? (PROMOTION_CODE ? `no live promotion code carries the code ${JSON.stringify(PROMOTION_CODE)}` : `http_${promo.status}`));

  const coupon = promoFound ? promo.json?.coupon ?? null : null;
  const couponFromId = COUPON_ID
    ? await stripeGet(secretKey, `/v1/coupons/${encodeURIComponent(COUPON_ID)}`)
    : null;
  const resolvedCoupon = coupon ?? (couponFromId?.ok ? couponFromId.json : null);
  const appliesToProducts = Array.isArray(resolvedCoupon?.applies_to?.products)
    ? resolvedCoupon.applies_to.products
    : null;

  // 5. Every product in this account carrying the dashboard's name. Two
  // products with the same name is exactly the shape that makes a dashboard
  // screenshot and an API object disagree.
  const named = [];
  let startingAfter = null;
  for (let page = 0; page < 10; page += 1) {
    const query = `/v1/products?limit=100${startingAfter ? `&starting_after=${encodeURIComponent(startingAfter)}` : ""}`;
    const listing = await stripeGet(secretKey, query);
    if (!listing.ok) break;
    const data = Array.isArray(listing.json?.data) ? listing.json.data : [];
    for (const product of data) {
      if (String(product?.name ?? "").trim().toLowerCase() === DASHBOARD_PRODUCT_NAME.toLowerCase()) {
        named.push({ id: product.id, name: product.name, active: product.active, created: product.created });
      }
    }
    if (!listing.json?.has_more || data.length === 0) break;
    startingAfter = data[data.length - 1]?.id ?? null;
    if (!startingAfter) break;
  }

  const expectedProduct = await stripeGet(secretKey, `/v1/products/${encodeURIComponent(EXPECTED_PRODUCT_ID)}`);

  // 6. What the refused Checkout Session was actually selling.
  //
  // The id is optional because the run that produced the latest refusal did not
  // capture it -- the checkout response body came back empty -- and the account
  // itself knows which Session is most recent. Listing newest-first and taking
  // the head is that same Session, read from the provider rather than from a
  // log that did not record it.
  const session = CHECKOUT_SESSION_ID
    ? await stripeGet(
      secretKey,
      `/v1/checkout/sessions/${encodeURIComponent(CHECKOUT_SESSION_ID)}?expand[]=line_items.data.price.product`
    )
    : await (async () => {
      // line_items is expandable on a RETRIEVE and not on a LIST, so the list
      // names the newest Session and the retrieve reads what it sells. Asking
      // the list to expand it is an HTTP 400, which run 35356458280 spent.
      const listed = await stripeGet(secretKey, "/v1/checkout/sessions?limit=1");
      const latestId = Array.isArray(listed.json?.data) ? listed.json.data[0]?.id ?? null : null;
      if (!latestId) return { ok: false, status: listed.status, json: listed.json };
      return await stripeGet(
        secretKey,
        `/v1/checkout/sessions/${encodeURIComponent(latestId)}?expand[]=line_items.data.price.product`
      );
    })();
  const sessionFound = session.ok;
  const lineItem = sessionFound ? session.json?.line_items?.data?.[0] ?? null : null;
  const sessionProduct = lineItem?.price?.product ?? null;
  const sessionProductId = typeof sessionProduct === "string" ? sessionProduct : sessionProduct?.id ?? null;

  // The verdict. Each branch names one object-level fact, in the order that
  // decides the outcome: an object in the wrong account or mode is refused
  // before any restriction is ever evaluated.
  const mismatches = [];
  if (!promoFound) {
    mismatches.push(`the promotion code ${PROMOTION_CODE_ID} is NOT readable with production's own Stripe key (${promoError}). It belongs to a different Stripe account or a different mode than the Checkout Session.`);
  } else {
    if (promo.json?.livemode !== true) {
      mismatches.push(`the promotion code is livemode=${promo.json?.livemode}, but the Checkout Session is live.`);
    }
    if (promo.json?.active !== true) {
      mismatches.push(`the promotion code is active=${promo.json?.active}.`);
    }
    if (resolvedCoupon && resolvedCoupon.valid !== true) {
      mismatches.push(`the coupon ${resolvedCoupon.id} is valid=${resolvedCoupon.valid}.`);
    }
    if (resolvedCoupon && resolvedCoupon.livemode !== true) {
      mismatches.push(`the coupon ${resolvedCoupon.id} is livemode=${resolvedCoupon.livemode}.`);
    }
    // An amount_off coupon carries its own currency and Stripe will not apply
    // it to an order in another one, which it reports as the same sentence it
    // uses for a code that does not exist.
    const sessionCurrency = sessionFound ? (session.json?.currency ?? null) : null;
    if (resolvedCoupon && resolvedCoupon.amount_off != null && sessionCurrency
      && String(resolvedCoupon.currency ?? "").toLowerCase() !== String(sessionCurrency).toLowerCase()) {
      mismatches.push(`the coupon gives amount_off in ${String(resolvedCoupon.currency ?? "(none)").toUpperCase()} but the Checkout Session is in ${String(sessionCurrency).toUpperCase()}.`);
    }
    if (appliesToProducts && sessionProductId && !appliesToProducts.includes(sessionProductId)) {
      mismatches.push(`the coupon is restricted to product(s) ${JSON.stringify(appliesToProducts)} but the Checkout Session sells ${sessionProductId}. A coupon matches on the line item's product, so it can only be refused.`);
    }
  }
  if (sessionFound && session.json?.livemode !== true) {
    mismatches.push(`the Checkout Session is livemode=${session.json?.livemode}.`);
  }
  if (!sessionFound) {
    mismatches.push(`the Checkout Session ${CHECKOUT_SESSION_ID} is NOT readable with production's own Stripe key (HTTP ${session.status}).`);
  }

  say("");
  say(`Promotion codes carrying that code: ${byCodeMatches.length
    ? byCodeMatches.map(entry => `${entry.id} (code=${JSON.stringify(entry.code)}, active=${entry.active}, livemode=${entry.livemode}, coupon=${entry.coupon?.id ?? "?"}, times_redeemed=${entry.times_redeemed}, max_redemptions=${entry.max_redemptions ?? "(none)"}, expires_at=${entry.expires_at ?? "(none)"}, customer=${entry.customer ?? "(none)"})`).join(" | ")
    : "(none in this account and mode)"}`);
  say(`Promotion code object: ${promoFound ? promo.json?.id : "NOT FOUND"}`);
  say(`Promotion code account/mode: ${promoFound ? `${accountId} / livemode=${promo.json?.livemode}` : `NOT FOUND with production's key (${promoError})`}`);
  say(`Promotion code active: ${promoFound ? String(promo.json?.active) : "(unreadable)"}`);
  say(`Promotion code restrictions: ${promoFound ? JSON.stringify(promo.json?.restrictions ?? null) : "(unreadable)"}`);
  say(`Coupon valid: ${resolvedCoupon ? `${resolvedCoupon.id} valid=${resolvedCoupon.valid} livemode=${resolvedCoupon.livemode} percent_off=${resolvedCoupon.percent_off ?? "(none)"} amount_off=${resolvedCoupon.amount_off ?? "(none)"} currency=${resolvedCoupon.currency ?? "(none)"} duration=${resolvedCoupon.duration ?? "(none)"}` : "(unreadable)"}`);
  say(`Coupon applies_to product ID: ${appliesToProducts ? JSON.stringify(appliesToProducts) : "(no product restriction on the coupon)"}`);
  say(`Dashboard ${DASHBOARD_PRODUCT_NAME} product ID: ${named.length ? named.map(p => `${p.id} (active=${p.active})`).join(", ") : "(no product with that exact name found)"}`);
  say(`Live Checkout Session: ${sessionFound
    ? `${session.json?.id} status=${session.json?.status} livemode=${session.json?.livemode} currency=${String(session.json?.currency ?? "").toUpperCase()} amount_subtotal=${session.json?.amount_subtotal} amount_total=${session.json?.amount_total} allow_promotion_codes=${session.json?.allow_promotion_codes}`
    : "(unreadable)"}`);
  say(`Live Checkout Session product ID: ${sessionProductId ?? "(unreadable)"}`);
  // The customer shape of the Session, reported as its own line because a
  // Session with no customer and no customer_creation completes as a guest:
  // Checkout records the transaction without creating a Customer object.
  say(`Live Checkout Session customer shape: ${sessionFound
    ? `mode=${JSON.stringify(session.json?.mode ?? null)}`
      + ` customer=${JSON.stringify(session.json?.customer ?? null)}`
      + ` customer_creation=${JSON.stringify(session.json?.customer_creation ?? null)}`
      + ` customer_email=${JSON.stringify(session.json?.customer_email ?? null)}`
      + ` payment_method_collection=${JSON.stringify(session.json?.payment_method_collection ?? null)}`
      + ` customer_details=${JSON.stringify(session.json?.customer_details ?? null)}`
      + ` payment_status=${JSON.stringify(session.json?.payment_status ?? null)}`
      + ` payment_intent=${JSON.stringify(session.json?.payment_intent ?? null)}`
      + ` total_details=${JSON.stringify(session.json?.total_details ?? null)}`
    : "(unreadable)"}`);
  say(`Live Checkout Session line item: ${lineItem
    ? `${JSON.stringify(lineItem.description ?? null)} amount_subtotal=${lineItem.amount_subtotal} price=${lineItem.price?.id ?? "(ad-hoc)"} unit_amount=${lineItem.price?.unit_amount}`
    : "(unreadable)"}`);
  say(`Discount headroom: coupon amount_off=${resolvedCoupon?.amount_off ?? "(none)"} vs Session amount_total=${sessionFound ? session.json?.amount_total : "(unreadable)"}`);
  say(`Production Stripe account ID: ${accountId ?? "(unreadable)"}`);
  say(`Expected product ${EXPECTED_PRODUCT_ID}: ${expectedProduct.ok ? `present, name=${JSON.stringify(expectedProduct.json?.name)}, active=${expectedProduct.json?.active}` : `NOT readable (HTTP ${expectedProduct.status})`}`);
  say(`MISMATCH: ${mismatches.length ? mismatches.join(" ALSO: ") : "none found — every object-level fact above is consistent."}`);

  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const evidence = {
    generatedFor: "live promotion code object-level diagnosis",
    readOnly: true,
    vercelProjectId: identity.projectId,
    stripeAccountId: accountId,
    stripeKeyMode: keyMode,
    promotionCodeId: PROMOTION_CODE_ID || null,
    promotionCodeString: PROMOTION_CODE || null,
    promotionCodesCarryingThatCode: byCodeMatches.map(e => ({ id: e.id, code: e.code, active: e.active, livemode: e.livemode, couponId: e.coupon?.id ?? null, timesRedeemed: e.times_redeemed ?? null, maxRedemptions: e.max_redemptions ?? null, expiresAt: e.expires_at ?? null, customer: e.customer ?? null })),
    resolvedPromotionCodeId: promoFound ? (promo.json?.id ?? null) : null,
    promotionCodeFound: promoFound,
    promotionCodeError: promoError,
    promotionCodeActive: promoFound ? promo.json?.active ?? null : null,
    promotionCodeLivemode: promoFound ? promo.json?.livemode ?? null : null,
    promotionCodeCode: promoFound ? promo.json?.code ?? null : null,
    promotionCodeRestrictions: promoFound ? promo.json?.restrictions ?? null : null,
    promotionCodeCustomer: promoFound ? promo.json?.customer ?? null : null,
    promotionCodeMaxRedemptions: promoFound ? promo.json?.max_redemptions ?? null : null,
    promotionCodeTimesRedeemed: promoFound ? promo.json?.times_redeemed ?? null : null,
    promotionCodeExpiresAt: promoFound ? promo.json?.expires_at ?? null : null,
    couponId: resolvedCoupon?.id ?? null,
    couponValid: resolvedCoupon?.valid ?? null,
    couponLivemode: resolvedCoupon?.livemode ?? null,
    couponPercentOff: resolvedCoupon?.percent_off ?? null,
    couponAmountOff: resolvedCoupon?.amount_off ?? null,
    couponCurrency: resolvedCoupon?.currency ?? null,
    couponAppliesToProducts: appliesToProducts,
    productsNamedLikeDashboard: named,
    expectedProductId: EXPECTED_PRODUCT_ID,
    expectedProductReadable: expectedProduct.ok,
    expectedProductName: expectedProduct.ok ? expectedProduct.json?.name ?? null : null,
    checkoutSessionId: CHECKOUT_SESSION_ID,
    checkoutSessionFound: sessionFound,
    checkoutSessionResolvedId: sessionFound ? (session.json?.id ?? null) : null,
    checkoutSessionCurrency: sessionFound ? (session.json?.currency ?? null) : null,
    checkoutSessionAmountTotal: sessionFound ? (session.json?.amount_total ?? null) : null,
    checkoutSessionLivemode: sessionFound ? session.json?.livemode ?? null : null,
    checkoutSessionAllowPromotionCodes: sessionFound ? session.json?.allow_promotion_codes ?? null : null,
    checkoutSessionStatus: sessionFound ? session.json?.status ?? null : null,
    checkoutSessionProductId: sessionProductId,
    mismatches
  };
  writeFileSync(
    resolve(EVIDENCE_DIR, "stripe-coupon-object-diagnosis.json"),
    `${redact(JSON.stringify(evidence, null, 2))}\n`
  );
  say("");
  say(`evidence written to production-canary-evidence/stripe-coupon-object-diagnosis.json`);
}

main().catch(error => fail(error?.message ?? String(error)));
