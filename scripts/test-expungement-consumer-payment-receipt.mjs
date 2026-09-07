#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
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
  const transpiled = ts.transpileModule(fs.readFileSync(resolved, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
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
    amount_total: 5000,
    currency: "usd",
    metadata: {
      channel: "expungement_ai_consumer",
      user_id: row.user_id,
      briefcase_item_id: row.id,
      product_id: "expungement_packet",
      person_id: row.payment_person_id,
      matter_id: row.payment_matter_id
    },
    payment_intent: {
      id: row.payment_intent_id,
      latest_charge: { id: "ch_test_exact", receipt_url: RECEIPT_URL }
    },
    ...overrides
  };
}

function harness(initialRow = paymentRow(), { sponsored = false } = {}) {
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
          return stripeSession(row);
        }
      }
    },
    charges: {
      retrieve: async () => ({ receipt_url: RECEIPT_URL })
    }
  };
  const receipt = loadTs("src/lib/expungement-ai/consumer-payment-receipt.ts", {
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
    createConsumerPaymentReceiptAction: async (input) => {
      receiptReads.push(input);
      return presentedReceipt;
    }
  }
});
const durablePaymentPresentation = await consumerPresentation.decorateConsumerBriefcaseItemForPresentation({
  consumerAuthUserId: USER,
  item: { id: ITEM }
});
assert.deepEqual(receiptReads, [{ consumerAuthUserId: USER, briefcaseItemId: ITEM }],
  "receipt authority must resolve even when legal or artifact presentation is unavailable");
assert.equal(durablePaymentPresentation.paymentState, "paid",
  "receipt authority must preserve paid history when legal or artifact presentation is unavailable");
assert.equal(durablePaymentPresentation.paymentReceipt, action,
  "receipt presentation must resolve independently of legal and artifact presentation");

presentedReceipt = refundedAction;
const refundedPaymentPresentation = await consumerPresentation.decorateConsumerBriefcaseItemForPresentation({
  consumerAuthUserId: USER,
  item: { id: ITEM }
});
assert.equal(refundedPaymentPresentation.paymentState, "refunded",
  "payment history must present a refund as refunded rather than paid");
assert.equal(refundedPaymentPresentation.paymentReceipt, refundedAction,
  "refunded payment history must keep its receipt action");

const moduleSource = fs.readFileSync(path.join(root, "src/lib/expungement-ai/consumer-payment-receipt.ts"), "utf8");
const confirmSource = fs.readFileSync(path.join(root, "src/app/api/expungement-ai/payment/confirm/route.ts"), "utf8");
const paymentsViewSource = fs.readFileSync(path.join(root, "src/components/expungement-ai/BriefcaseViews.tsx"), "utf8");
assert.ok(!moduleSource.includes("createConsumerPacketCheckout"), "receipt access cannot create Checkout or a charge");
assert.ok(!confirmSource.includes("receiptUrl: status.receiptUrl"), "browser polling must not receive a raw provider receipt URL");
assert.ok(paymentsViewSource.includes('item.paymentState === "refunded"')
  && paymentsViewSource.includes('k="payment.refunded"'),
"payment history must render an explicit localized refunded label");

console.log("Expungement.ai consumer payment receipt tests passed: owner/matter/provider binding, refund history, repeat access, expiry, revocation, sponsorship, and cross-user denial.");
