#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const USER = "11111111-1111-4111-8111-111111111111";
const OTHER_USER = "99999999-9999-4999-8999-999999999999";
const ITEM = "22222222-2222-4222-8222-222222222222";
const OTHER_ITEM = "88888888-8888-4888-8888-888888888888";
const PERSON = "33333333-3333-4333-8333-333333333333";
const MATTER = "44444444-4444-4444-8444-444444444444";
const NOW = new Date("2026-09-01T12:00:00.000Z");
const RECEIPT_URL = "https://pay.stripe.com/receipts/acct_test/ch_test";

function loadTs(relPath, mocks) {
  const resolved = path.join(root, relPath);
  let source = fs.readFileSync(resolved, "utf8");
  if (process.env.TASK49_BASELINE_VIEWS && relPath.endsWith("BriefcaseViews.tsx")) {
    source = execFileSync("git", ["show", `${process.env.TASK49_BASELINE_VIEWS}:${relPath}`], { encoding: "utf8" });
  }
  const mutation = process.env.TASK49_RECEIPT_MUTATION;
  if (relPath.endsWith("consumer-payment-receipt.ts")) {
    if (mutation === "owner") source = source.replace('.eq("user_id", consumerAuthUserId)', '')
      .replace('if (row.user_id !== consumerAuthUserId', 'if (false')
      .replace('consumerPacketPaymentAuthority(row.id, consumerAuthUserId,', 'consumerPacketPaymentAuthority(row.id, row.user_id,')
      .replace('validReceiptReference(row, input.consumerAuthUserId, input.reference', 'validReceiptReference(row, row.user_id, input.reference');
    if (mutation === "refund") source = source.replace('!["paid", "refunded"].includes(row.payment_status)', 'row.payment_status !== "paid"');
    if (mutation === "amount") source = source.replaceAll('amountCents: row.amount_cents!', 'amountCents: CONSUMER_PACKET_PRICE_CENTS');
  }
  if (relPath.endsWith("briefcase-consumer-presentation.ts") && mutation === "legal") {
    source = source.replace('  const paymentHistory = await', '  if (item.paymentState !== "paid") return { ...item, paymentHistory: null };\n  const paymentHistory = await');
  }
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX
    }
  }).outputText;
  const mod = new Module(resolved);
  const filename = `${resolved}.cjs`;
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  mod.require = (specifier) => Object.hasOwn(mocks, specifier) ? mocks[specifier] : require(specifier);
  mod._compile(transpiled, filename);
  return mod.exports;
}

function paymentRow(overrides = {}) {
  return {
    id: ITEM,
    user_id: USER,
    payment_status: "paid",
    payment_provider: "stripe",
    checkout_session_id: "cs_test_exact",
    payment_intent_id: "pi_test_exact",
    amount_cents: 5000,
    regular_price_cents: 5000,
    discount_cents: 0,
    currency: "usd",
    receipt_url: RECEIPT_URL,
    provider_event_id: "evt_test_exact",
    payment_authority: "server_webhook",
    payment_product_id: "expungement_packet",
    payment_person_id: PERSON,
    payment_matter_id: MATTER,
    source_session_id: null,
    ...overrides
  };
}

function stripeSession(row, overrides = {}) {
  return {
    id: row.checkout_session_id,
    mode: "payment",
    payment_status: "paid",
    client_reference_id: row.id,
    amount_total: row.amount_cents,
    amount_subtotal: 5000,
    status: "complete",
    total_details: { amount_discount: 5000 - row.amount_cents, amount_tax: 0, amount_shipping: 0 },
    line_items: { data: [{ quantity: 1, currency: "usd", amount_subtotal: 5000, amount_total: row.amount_cents,
      price: { unit_amount: 5000, product: { id: "prod_packet", name: "Expungement.ai self-help packet" } } }] },
    currency: "usd",
    metadata: {
      channel: "expungement_ai_consumer",
      user_id: row.user_id,
      briefcase_item_id: row.id,
      product_id: "expungement_packet",
      person_id: row.payment_person_id,
      matter_id: row.payment_matter_id,
      pathway_id: "original-pathway", verification_hash: "a".repeat(64)
    },
    payment_intent: {
      id: row.payment_intent_id,
      latest_charge: { id: "ch_test_exact", receipt_url: RECEIPT_URL }
    },
    ...overrides
  };
}

function harness(initialRow = paymentRow(), { sponsored = false, stripeOverrides = {}, stripeFails = false } = {}) {
  let row = initialRow;
  const reads = [];
  const authorityReads = [];
  const stripeRetrievals = [];
  const admin = {
    from(table) {
      const filters = new Map();
      return {
        select() { return this; },
        eq(column, value) { filters.set(column, value); return this; },
        async maybeSingle() {
          reads.push({ table, filters: Object.fromEntries(filters) });
          if (table === "screening_sessions") {
            return {
              data: sponsored ? { flow_mode: "rcap", partner_benefit_active: true, partner_slug: "fixture-partner" } : null,
              error: null
            };
          }
          if (table !== "consumer_briefcase_items"
            || filters.get("id") !== row.id
            || (filters.has("user_id") && filters.get("user_id") !== row.user_id)) return { data: null, error: null };
          return { data: row, error: null };
        }
      };
    }
  };
  const stripe = {
    checkout: {
      sessions: {
        retrieve: async (id) => {
          stripeRetrievals.push(id);
          if (stripeFails) throw new Error("provider failure");
          return stripeSession(row, stripeOverrides);
        }
      }
    },
    charges: {
      retrieve: async () => ({ receipt_url: RECEIPT_URL })
    }
  };
  const order = loadTs("src/lib/expungement-ai/consumer-order-reconciliation.ts", {
    "@/lib/expungement-ai/consumer-payment-authority": {
      CONSUMER_PACKET_CURRENCY: "usd", CONSUMER_PACKET_PRICE_CENTS: 5000, CONSUMER_PACKET_PRODUCT_ID: "expungement_packet"
    },
    "@/lib/expungement-ai/consumer-packet-catalog": {
      expectedCatalogProductId: () => "prod_packet", lineItemProductId: line => line.price.product.id
    }
  });
  const receipt = loadTs("src/lib/expungement-ai/consumer-payment-receipt.ts", {
    "@/lib/expungement-ai/consumer-order-reconciliation": order,
    "server-only": {},
    "@/lib/expungement-ai/consumer-payment-authority": {
      CONSUMER_PACKET_CURRENCY: "usd",
      CONSUMER_PACKET_PRICE_CENTS: 5000,
      CONSUMER_PACKET_PRODUCT_ID: "expungement_packet",
      consumerPacketPaymentAuthority: async (itemId, userId, binding) => {
        authorityReads.push({ itemId, userId, binding });
        return {
          valid: itemId === row.id
            && userId === row.user_id
            && binding.productId === row.payment_product_id
            && binding.personId === row.payment_person_id
            && binding.matterId === row.payment_matter_id,
          reason: "fixture",
          providerEventId: row.provider_event_id
        };
      }
    },
    "@/lib/expungement-ai/consumer-identity": {
      consumerMatterIdForItem: (itemId) => itemId === ITEM ? MATTER : `matter:${itemId}`
    },
    "@/lib/stripe/server": { getStripeServerClient: () => stripe },
    "@/lib/supabase/server": { getSupabaseAdminClient: () => admin }
  });
  return {
    receipt,
    reads,
    authorityReads,
    stripeRetrievals,
    setRow(next) { row = next; }
  };
}

const h = harness();
const action = await h.receipt.createConsumerPaymentReceiptAction({
  consumerAuthUserId: USER,
  briefcaseItemId: ITEM,
  now: NOW
});
assert.ok(action, "a server-recorded exact-matter Stripe payment must expose a receipt action");
assert.equal(action.amountCents, 5000);
assert.equal(action.currency, "USD");
assert.equal(action.provider, "Stripe");
assert.equal(action.status, "paid");
assert.ok(action.actionPath.startsWith("/api/expungement-ai/payment/receipt?"));
assert.ok(!action.actionPath.includes("pay.stripe.com"), "the provider receipt URL must never enter presentation data");
assert.ok(!action.actionPath.includes("evt_test_exact"), "provider event identity must remain server-side");

const actionUrl = new URL(action.actionPath, "https://expungement.ai");
const reference = actionUrl.searchParams.get("reference");
assert.ok(reference);
const resolved = await h.receipt.resolveConsumerPaymentReceipt({
  consumerAuthUserId: USER,
  briefcaseItemId: ITEM,
  reference,
  now: NOW
});
assert.deepEqual(resolved, { status: "available", receiptUrl: RECEIPT_URL });
const replay = await h.receipt.resolveConsumerPaymentReceipt({
  consumerAuthUserId: USER,
  briefcaseItemId: ITEM,
  reference,
  now: new Date(NOW.getTime() + 60_000)
});
assert.equal(replay.status, "available", "repeat receipt access must reuse payment evidence without another charge");
assert.equal(h.stripeRetrievals.length, 0, "stored verified receipt authority needs no Checkout or payment mutation");

assert.equal((await h.receipt.resolveConsumerPaymentReceipt({
  consumerAuthUserId: OTHER_USER,
  briefcaseItemId: ITEM,
  reference,
  now: NOW
})).status, "denied", "a different user must receive no receipt existence signal");
assert.equal((await h.receipt.resolveConsumerPaymentReceipt({
  consumerAuthUserId: USER,
  briefcaseItemId: OTHER_ITEM,
  reference,
  now: NOW
})).status, "denied", "a guessed or cross-matter id must fail closed");
assert.equal((await h.receipt.resolveConsumerPaymentReceipt({
  consumerAuthUserId: USER,
  briefcaseItemId: ITEM,
  reference,
  now: new Date(NOW.getTime() + 20 * 60_000)
})).status, "denied", "an expired receipt reference must fail closed");

const authorityReadsBeforeRefund = h.authorityReads.length;
h.setRow(paymentRow({ payment_status: "refunded" }));
const refundedAction = await h.receipt.createConsumerPaymentReceiptAction({
  consumerAuthUserId: USER,
  briefcaseItemId: ITEM,
  now: NOW
});
assert.ok(refundedAction, "a refund must preserve the owner-scoped payment-history receipt action");
assert.equal(refundedAction.status, "refunded", "receipt presentation must retain the truthful refunded status");
assert.deepEqual(await h.receipt.resolveConsumerPaymentReceipt({
  consumerAuthUserId: USER,
  briefcaseItemId: ITEM,
  reference,
  now: NOW
}), { status: "available", receiptUrl: RECEIPT_URL },
"a refund must preserve the original receipt without restoring fulfillment authority");
assert.equal(h.authorityReads.length, authorityReadsBeforeRefund,
  "refunded receipt history must not consult or restore paid fulfillment authority");

h.setRow(paymentRow({ payment_status: "unpaid" }));
assert.equal((await h.receipt.resolveConsumerPaymentReceipt({
  consumerAuthUserId: USER,
  briefcaseItemId: ITEM,
  reference,
  now: NOW
})).status, "denied", "a genuinely unpaid or revoked record must invalidate the old receipt reference");

for (const override of [
  { payment_provider: "dry_run" },
  { amount_cents: 4999 },
  { currency: "cad" },
  { payment_intent_id: null },
  { payment_matter_id: "77777777-7777-4777-8777-777777777777" }
]) {
  const invalid = harness(paymentRow(override));
  assert.equal(await invalid.receipt.createConsumerPaymentReceiptAction({
    consumerAuthUserId: USER,
    briefcaseItemId: ITEM,
    now: NOW
  }), null, `invalid payment evidence must not create a receipt action: ${JSON.stringify(override)}`);
}

const sponsored = harness(paymentRow({ source_session_id: "sponsored-session" }), { sponsored: true });
assert.equal(await sponsored.receipt.createConsumerPaymentReceiptAction({
  consumerAuthUserId: USER,
  briefcaseItemId: ITEM,
  now: NOW
}), null, "sponsored matters must not display a consumer receipt without a distinct real consumer payment");

const providerResolved = harness(paymentRow({ receipt_url: null }));
const providerAction = await providerResolved.receipt.createConsumerPaymentReceiptAction({
  consumerAuthUserId: USER,
  briefcaseItemId: ITEM,
  now: NOW
});
const providerReference = new URL(providerAction.actionPath, "https://expungement.ai").searchParams.get("reference");
assert.deepEqual(await providerResolved.receipt.resolveConsumerPaymentReceipt({
  consumerAuthUserId: USER,
  briefcaseItemId: ITEM,
  reference: providerReference,
  now: NOW
}), { status: "available", receiptUrl: RECEIPT_URL }, "missing stored URL must resolve from the exact Stripe payment");
assert.deepEqual(providerResolved.stripeRetrievals, ["cs_test_exact"]);

// Current-compatible order cases: use the real reconciliation function in the harness.
for (const amount of [3750, 4000, 4999]) {
  const discounted = harness(paymentRow({ amount_cents: amount, discount_cents: 5000 - amount, receipt_url: null }));
  const history = await discounted.receipt.readConsumerPaymentHistory({ consumerAuthUserId: USER, briefcaseItemId: ITEM, now: NOW });
  assert.equal(history.amountCents, amount, "history displays collected amount, not list price");
  const ref = new URL(history.receipt.actionPath, "https://local.test").searchParams.get("reference");
  assert.equal((await discounted.receipt.resolveConsumerPaymentReceipt({ consumerAuthUserId: USER, briefcaseItemId: ITEM, reference: ref, now: NOW })).status, "available",
    "a reconciled discounted order keeps its receipt");
  discounted.setRow(paymentRow({ amount_cents: amount - 1, discount_cents: 5001 - amount }));
  assert.equal((await discounted.receipt.resolveConsumerPaymentReceipt({ consumerAuthUserId: USER, briefcaseItemId: ITEM, reference: ref, now: NOW })).status, "denied",
    "changing protected collected amount invalidates the reference even when the new arithmetic reconciles");
}
const zero = harness(paymentRow({ amount_cents: 0, discount_cents: 5000, payment_intent_id: null, receipt_url: null }));
const zeroHistory = await zero.receipt.readConsumerPaymentHistory({ consumerAuthUserId: USER, briefcaseItemId: ITEM, now: NOW });
assert.equal(zeroHistory.amountCents, 0);
assert.equal(zeroHistory.status, "paid");
assert.equal(zeroHistory.noCharge, true);
assert.equal(zeroHistory.receipt, null, "no-charge orders do not invent a charge receipt");
assert.equal(zero.stripeRetrievals.length, 0, "a legitimate no-cost order does not wait for a nonexistent PaymentIntent");
assert.equal(zero.authorityReads.length, 1, "zero-cost history respects current paid-row authority");

const historicalRefund = harness(paymentRow({ payment_status: "refunded", payment_authority: "server_admin",
  regular_price_cents: null, discount_cents: null, amount_cents: 4000, receipt_url: null }));
const historicalHistory = await historicalRefund.receipt.readConsumerPaymentHistory({ consumerAuthUserId: USER, briefcaseItemId: ITEM, now: NOW });
assert.equal(historicalHistory.status, "refunded");
assert.equal(historicalHistory.amountCents, 4000);
assert.ok(historicalHistory.receipt);
assert.equal(historicalRefund.authorityReads.length, 0, "historical refund history does not grant paid fulfillment authority");
assert.equal(historicalRefund.stripeRetrievals.length, 1, "missing historical price fields require the actual bound provider order");
const unavailableHistory = harness(paymentRow({ payment_status: "refunded", regular_price_cents: null, discount_cents: null }), { stripeFails: true });
assert.equal(await unavailableHistory.receipt.readConsumerPaymentHistory({ consumerAuthUserId: USER, briefcaseItemId: ITEM, now: NOW }), null,
  "missing historical order evidence is not fabricated");
const outage = harness(paymentRow({ receipt_url: null }), { stripeFails: true });
const outageHistory = await outage.receipt.readConsumerPaymentHistory({ consumerAuthUserId: USER, briefcaseItemId: ITEM, now: NOW });
assert.equal(outageHistory.amountCents, 5000, "provider outage does not erase protected financial history");
assert.equal((await outage.receipt.resolveConsumerPaymentReceipt({ consumerAuthUserId: USER, briefcaseItemId: ITEM,
  reference: new URL(outageHistory.receipt.actionPath, "https://local.test").searchParams.get("reference"), now: NOW })).status, "temporarily_unavailable");
for (const stripeOverrides of [{ amount_total: 4999 }, { currency: "cad" }, { client_reference_id: OTHER_ITEM },
  { metadata: { ...stripeSession(paymentRow()).metadata, user_id: OTHER_USER } },
  { metadata: { ...stripeSession(paymentRow()).metadata, product_id: "wrong" } }]) {
  const mismatch = harness(paymentRow({ receipt_url: null }), { stripeOverrides });
  const a = await mismatch.receipt.createConsumerPaymentReceiptAction({ consumerAuthUserId: USER, briefcaseItemId: ITEM, now: NOW });
  assert.equal((await mismatch.receipt.resolveConsumerPaymentReceipt({ consumerAuthUserId: USER, briefcaseItemId: ITEM,
    reference: new URL(a.actionPath, "https://local.test").searchParams.get("reference"), now: NOW })).status, "denied",
    "provider amount/currency/product/owner/matter mismatch refuses the receipt");
}

const receiptReads = [];
let presentedReceipt = action;
const unavailableLegalPresentation = {
  id: ITEM,
  paymentState: "unavailable",
  authorityStatus: "unavailable"
};
const consumerPresentation = loadTs("src/lib/expungement-ai/briefcase-consumer-presentation.ts", {
  "server-only": {},
  "@/lib/expungement-ai/briefcase-presentation-authority": {
    decorateBriefcaseItemForPresentation: async () => unavailableLegalPresentation
  },
  "@/lib/expungement-ai/consumer-payment-receipt": {
    readConsumerPaymentHistory: async (input) => {
      receiptReads.push(input);
      return { amountCents: presentedReceipt.amountCents, currency: "USD", status: presentedReceipt.status, receipt: presentedReceipt, noCharge: false };
    }
  }
});
const durablePaymentPresentation = await consumerPresentation.decorateConsumerBriefcaseItemForPresentation({
  consumerAuthUserId: USER,
  item: { id: ITEM }
});
assert.deepEqual(receiptReads, [{ consumerAuthUserId: USER, briefcaseItemId: ITEM }],
  "receipt authority must resolve even when legal or artifact presentation is unavailable");
assert.equal(durablePaymentPresentation.paymentState, "unavailable", "financial history must never overwrite generation-facing authority");
assert.equal(durablePaymentPresentation.paymentHistory.status, "paid", "financial history survives unavailable legal presentation");
assert.equal(durablePaymentPresentation.paymentHistory.receipt, action,
  "receipt presentation must resolve independently of legal and artifact presentation");

presentedReceipt = refundedAction;
const refundedPaymentPresentation = await consumerPresentation.decorateConsumerBriefcaseItemForPresentation({
  consumerAuthUserId: USER,
  item: { id: ITEM }
});
assert.equal(refundedPaymentPresentation.paymentHistory.status, "refunded",
  "payment history must present a refund as refunded rather than paid");
assert.equal(refundedPaymentPresentation.paymentHistory.receipt, refundedAction,
  "refunded payment history must keep its receipt action");

const moduleSource = fs.readFileSync(path.join(root, "src/lib/expungement-ai/consumer-payment-receipt.ts"), "utf8");
const confirmSource = fs.readFileSync(path.join(root, "src/app/api/expungement-ai/payment/confirm/route.ts"), "utf8");
const paymentsViewSource = fs.readFileSync(path.join(root, "src/components/expungement-ai/BriefcaseViews.tsx"), "utf8");
assert.ok(!moduleSource.includes("createConsumerPacketCheckout"), "receipt access cannot create Checkout or a charge");
assert.ok(!confirmSource.includes("receiptUrl: status.receiptUrl"), "browser polling must not receive a raw provider receipt URL");
assert.ok(paymentsViewSource.includes('item.paymentHistory!.status === "refunded"')
  && paymentsViewSource.includes('k="payment.refunded"'),
"payment history must render an explicit localized refunded label");

// Execute the actual HTTP boundary with synthetic sessions and the real receipt resolver.
let endpointOwner = USER;
const endpointHarness = harness();
const endpointAction = await endpointHarness.receipt.createConsumerPaymentReceiptAction({ consumerAuthUserId: USER, briefcaseItemId: ITEM });
const endpoint = loadTs("src/app/api/expungement-ai/payment/receipt/route.ts", {
  "next/server": { NextResponse: {
    json: (body, init) => new Response(JSON.stringify(body), init),
    redirect: (url, status) => new Response(null, { status, headers: { location: url } })
  } },
  "@/lib/expungement-ai/auth": { requireConsumerBriefcaseSession: async () => ({ userId: endpointOwner }) },
  "@/lib/expungement-ai/consumer-payment-receipt": endpointHarness.receipt
});
const receiptRequest = new URL(endpointAction.actionPath, "https://local.test");
const okResponse = await endpoint.GET({ nextUrl: receiptRequest });
assert.equal(okResponse.status, 303);
assert.equal(okResponse.headers.get("location"), RECEIPT_URL);
assert.match(okResponse.headers.get("cache-control"), /no-store/);
assert.equal(okResponse.headers.get("referrer-policy"), "no-referrer");
endpointOwner = OTHER_USER;
const deniedUser = await endpoint.GET({ nextUrl: receiptRequest });
endpointOwner = USER;
const wrongMatterUrl = new URL(receiptRequest);
wrongMatterUrl.searchParams.set("briefcaseItemId", OTHER_ITEM);
const deniedMatter = await endpoint.GET({ nextUrl: wrongMatterUrl });
assert.equal(deniedUser.status, 404);
assert.equal(deniedMatter.status, 404);
assert.equal(await deniedUser.text(), await deniedMatter.text(), "wrong owner and matter get the same generic response");
assert.match(deniedUser.headers.get("cache-control"), /no-store/);

// Unsafe stored receipt targets cannot become redirects, even on an authorized row.
for (const receipt_url of ["http://pay.stripe.com/receipts/x", "https://evil.test/receipt", "https://pay.stripe.com.evil.test/x", "https://user@pay.stripe.com/x", "https://pay.stripe.com:444/x"]) {
  const unsafe = harness(paymentRow({ receipt_url }), { stripeFails: true });
  const action = await unsafe.receipt.createConsumerPaymentReceiptAction({ consumerAuthUserId: USER, briefcaseItemId: ITEM, now: NOW });
  const result = await unsafe.receipt.resolveConsumerPaymentReceipt({ consumerAuthUserId: USER, briefcaseItemId: ITEM,
    reference: new URL(action.actionPath, "https://local.test").searchParams.get("reference"), now: NOW });
  assert.equal(result.status, "temporarily_unavailable", "unsafe redirect must not escape the receipt boundary");
}

// Render the actual payment-history view; history never changes the base paymentState.
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const icon = () => null;
const { PaymentsView } = loadTs("src/components/expungement-ai/BriefcaseViews.tsx", {
  "next/link": ({ children, ...props }) => React.createElement("a", props, children),
  "lucide-react": { ArrowRight: icon, Check: icon, CreditCard: icon, Download: icon, LifeBuoy: icon, ShieldCheck: icon },
  "@/components/expungement-ai/WilmaBubble": { WilmaBubble: icon },
  "@/lib/expungement-ai/frontend/briefcase-presentation": {},
  "@/components/expungement-ai/LocalizationProvider": {
    LocalizedText: ({ fallback }) => React.createElement("span", null, fallback),
    LocalizedRuntimeText: ({ children }) => children
  }
});
const htmlFor = paymentHistory => renderToStaticMarkup(React.createElement(PaymentsView, { items: [{
  id: ITEM, title: "Synthetic matter", paymentState: "paid", artifact: { status: "unavailable" }, paymentHistory
}] }));
const zeroHtml = htmlFor(zeroHistory);
assert.match(zeroHtml, /\$0\.00/);
assert.match(zeroHtml, /No charge/);
assert.doesNotMatch(zeroHtml, /View receipt|temporarily unavailable|\$50/);
const refundHtml = htmlFor(historicalHistory);
assert.match(refundHtml, /\$40\.00/);
assert.match(refundHtml, /refunded/);
assert.match(refundHtml, /View receipt/);
assert.doesNotMatch(refundHtml, /pay\.stripe\.com/);

console.log("Expungement.ai consumer payment receipt tests passed: owner/matter/provider binding, refund history, repeat access, expiry, revocation, sponsorship, and cross-user denial.");
