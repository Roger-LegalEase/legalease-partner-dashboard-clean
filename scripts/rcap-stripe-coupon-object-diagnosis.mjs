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
const PROMOTION_CODE_ID = (process.env.RCAP_PROMOTION_CODE_ID ?? "").trim();
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
    fail(`the production STRIPE_SECRET_KEY exists but Vercel did not return its value (type: ${types}). A sensitive variable cannot be read back through the API.`);
  }
  secrets.add(readable.value);
  return readable.value;
}

async function main() {
  if (!VERCEL_TOKEN) fail("VERCEL_TOKEN is required to read the production Stripe key");
  if (!PROMOTION_CODE_ID) fail("RCAP_PROMOTION_CODE_ID is required");
  if (!CHECKOUT_SESSION_ID) fail("RCAP_CHECKOUT_SESSION_ID is required");

  say("RCAP Stripe object diagnosis — read-only. No Stripe object is created, modified or deleted.");

  const identity = await resolveHostedVercelIdentity({ token: VERCEL_TOKEN });
  if (identity.projectId !== HOSTED_VERCEL_PROJECT_ID) {
    fail(`resolved the wrong Vercel project (${identity.projectId})`);
  }
  say(`Vercel project ${identity.projectName} (${identity.projectId}) in team ${identity.teamId}`);

  const secretKey = await readProductionStripeKey(identity);
  const keyMode = secretKey.startsWith("sk_live_") ? "live" : secretKey.startsWith("sk_test_") ? "test" : "unknown";
  say(`production STRIPE_SECRET_KEY resolved from Vercel and masked; its prefix says mode=${keyMode}`);

  // 7. The account the production key actually belongs to.
  const account = await stripeGet(secretKey, "/v1/account");
  if (!account.ok) fail(`Stripe refused /v1/account (HTTP ${account.status})`);
  const accountId = account.json?.id ?? null;

  // 1-4. The promotion code, its flags, its coupon and the coupon's product
  // restriction. A 404 here with a live key means the object lives in another
  // account or another mode, which is itself the answer.
  const promo = await stripeGet(
    secretKey,
    `/v1/promotion_codes/${encodeURIComponent(PROMOTION_CODE_ID)}?expand[]=coupon.applies_to`
  );
  const promoFound = promo.ok;
  const promoError = promoFound ? null : (promo.json?.error?.code ?? promo.json?.error?.type ?? `http_${promo.status}`);

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
  const session = await stripeGet(
    secretKey,
    `/v1/checkout/sessions/${encodeURIComponent(CHECKOUT_SESSION_ID)}?expand[]=line_items.data.price.product`
  );
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
  say(`Promotion code account/mode: ${promoFound ? `${accountId} / livemode=${promo.json?.livemode}` : `NOT FOUND with production's key (${promoError})`}`);
  say(`Promotion code active: ${promoFound ? String(promo.json?.active) : "(unreadable)"}`);
  say(`Coupon valid: ${resolvedCoupon ? `${resolvedCoupon.id} valid=${resolvedCoupon.valid} percent_off=${resolvedCoupon.percent_off ?? "(none)"} duration=${resolvedCoupon.duration ?? "(none)"}` : "(unreadable)"}`);
  say(`Coupon applies_to product ID: ${appliesToProducts ? JSON.stringify(appliesToProducts) : "(no product restriction on the coupon)"}`);
  say(`Dashboard ${DASHBOARD_PRODUCT_NAME} product ID: ${named.length ? named.map(p => `${p.id} (active=${p.active})`).join(", ") : "(no product with that exact name found)"}`);
  say(`Live Checkout Session product ID: ${sessionProductId ?? "(unreadable)"}`);
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
    promotionCodeId: PROMOTION_CODE_ID,
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
    couponAppliesToProducts: appliesToProducts,
    productsNamedLikeDashboard: named,
    expectedProductId: EXPECTED_PRODUCT_ID,
    expectedProductReadable: expectedProduct.ok,
    expectedProductName: expectedProduct.ok ? expectedProduct.json?.name ?? null : null,
    checkoutSessionId: CHECKOUT_SESSION_ID,
    checkoutSessionFound: sessionFound,
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
