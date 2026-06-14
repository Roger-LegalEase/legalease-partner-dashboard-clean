import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();

const {
  reconcilePartnerBillingInvoiceEvent
} = loadTsModule(path.join(rootDir, "src/lib/partners/billing-reconciliation.ts"));

await testInvoicePaidUpdatesStatusAndPaidAt();
await testProcessedPaidEventRepairsUnpaidBillingRow();
await testMissingMetadataFallbackByStripeInvoiceId();
await testNoMatchingBillingRowFailsWithoutProcessedRecord();
await testDuplicatePaidAfterSuccessfulProcessingIsIdempotent();
await testSupportedEventCannotBeRecordedAsIgnored();
await testUnsupportedEventCanBeIgnored();
await testFinalizedDoesNotRegressPaidState();

console.log("Billing reconciliation regression tests passed.");

async function testInvoicePaidUpdatesStatusAndPaidAt() {
  const store = createStore({
    rows: [
      row({ id: "11111111-1111-4111-8111-111111111111", status: "invoice_created", stripeInvoiceId: "in_paid_metadata" })
    ]
  });

  const outcome = await reconcilePartnerBillingInvoiceEvent(paidEvent({
    eventId: "evt_paid_metadata",
    invoiceId: "in_paid_metadata",
    billingRequestId: "11111111-1111-4111-8111-111111111111",
    paidAt: 1760000000
  }), store);

  assert.equal(outcome, "processed");
  assert.equal(store.rows.get("11111111-1111-4111-8111-111111111111").status, "paid");
  assert.equal(store.rows.get("11111111-1111-4111-8111-111111111111").paidAt, "2025-10-09T08:53:20.000Z");
  assert.equal(store.processedEvents.get("evt_paid_metadata").eventType, "invoice.paid");
}

async function testProcessedPaidEventRepairsUnpaidBillingRow() {
  const store = createStore({
    rows: [
      row({
        id: "22222222-2222-4222-8222-222222222222",
        status: "invoice_created",
        stripeInvoiceId: "in_paid_duplicate_bad",
        updatedAt: "2026-01-01T00:00:00.000Z"
      })
    ],
    processedEvents: [{ eventId: "evt_paid_duplicate_bad", eventType: "invoice.paid", relatedObjectId: "in_paid_duplicate_bad" }]
  });

  const outcome = await reconcilePartnerBillingInvoiceEvent(paidEvent({
    eventId: "evt_paid_duplicate_bad",
    invoiceId: "in_paid_duplicate_bad",
    billingRequestId: "22222222-2222-4222-8222-222222222222",
    paidAt: 1760000000
  }), store);

  const repaired = store.rows.get("22222222-2222-4222-8222-222222222222");
  assert.equal(outcome, "processed");
  assert.equal(repaired.status, "paid");
  assert.equal(repaired.paidAt, "2025-10-09T08:53:20.000Z");
  assert.notEqual(repaired.updatedAt, "2026-01-01T00:00:00.000Z");
  assert.equal(store.processedEvents.size, 1);
}

async function testMissingMetadataFallbackByStripeInvoiceId() {
  const store = createStore({
    rows: [
      row({ id: "33333333-3333-4333-8333-333333333333", status: "invoice_created", stripeInvoiceId: "in_paid_fallback" })
    ]
  });

  const outcome = await reconcilePartnerBillingInvoiceEvent(paidEvent({
    eventId: "evt_paid_fallback",
    invoiceId: "in_paid_fallback",
    paidAt: 1760000001
  }), store);

  assert.equal(outcome, "processed");
  assert.equal(store.rows.get("33333333-3333-4333-8333-333333333333").status, "paid");
  assert.ok(store.rows.get("33333333-3333-4333-8333-333333333333").paidAt);
}

async function testNoMatchingBillingRowFailsWithoutProcessedRecord() {
  const store = createStore({ rows: [] });

  await assert.rejects(
    reconcilePartnerBillingInvoiceEvent(paidEvent({
      eventId: "evt_paid_missing_row",
      invoiceId: "in_paid_missing_row",
      paidAt: 1760000002
    }), store),
    /Unable to find billing request/
  );

  assert.equal(store.processedEvents.has("evt_paid_missing_row"), false);
}

async function testDuplicatePaidAfterSuccessfulProcessingIsIdempotent() {
  const store = createStore({
    rows: [
      row({
        id: "44444444-4444-4444-8444-444444444444",
        status: "paid",
        stripeInvoiceId: "in_paid_duplicate_ok",
        paidAt: "2025-10-09T08:53:20.000Z"
      })
    ],
    processedEvents: [{ eventId: "evt_paid_duplicate_ok", eventType: "invoice.paid", relatedObjectId: "in_paid_duplicate_ok" }]
  });

  const outcome = await reconcilePartnerBillingInvoiceEvent(paidEvent({
    eventId: "evt_paid_duplicate_ok",
    invoiceId: "in_paid_duplicate_ok",
    billingRequestId: "44444444-4444-4444-8444-444444444444",
    paidAt: 1760000000
  }), store);

  assert.equal(outcome, "duplicate");
  assert.equal(store.updateCount, 0);
}

async function testSupportedEventCannotBeRecordedAsIgnored() {
  const store = createStore({ rows: [] });

  await assert.rejects(
    reconcilePartnerBillingInvoiceEvent(finalizedEvent({
      eventId: "evt_finalized_missing_row",
      invoiceId: "in_finalized_missing_row"
    }), store),
    /Unable to find billing request/
  );

  assert.equal(store.recordedIgnoredSupportedEvent, false);
  assert.equal(store.processedEvents.has("evt_finalized_missing_row"), false);
}

async function testUnsupportedEventCanBeIgnored() {
  const store = createStore({ rows: [] });

  const outcome = await reconcilePartnerBillingInvoiceEvent({
    id: "evt_unsupported",
    type: "invoice.created",
    data: { object: { id: "in_unsupported" } }
  }, store);

  assert.equal(outcome, "ignored");
  assert.equal(store.processedEvents.get("evt_unsupported").eventType, "invoice.created");
}

async function testFinalizedDoesNotRegressPaidState() {
  const store = createStore({
    rows: [
      row({
        id: "55555555-5555-4555-8555-555555555555",
        status: "paid",
        stripeInvoiceId: "in_finalized_after_paid",
        paidAt: "2025-10-09T08:53:20.000Z"
      })
    ]
  });

  const outcome = await reconcilePartnerBillingInvoiceEvent(finalizedEvent({
    eventId: "evt_finalized_after_paid",
    invoiceId: "in_finalized_after_paid",
    billingRequestId: "55555555-5555-4555-8555-555555555555"
  }), store);

  assert.equal(outcome, "processed");
  assert.equal(store.rows.get("55555555-5555-4555-8555-555555555555").status, "paid");
  assert.equal(store.updateCount, 0);
}

function createStore({ rows, processedEvents = [] }) {
  const store = {
    rows: new Map(rows.map((item) => [item.id, { ...item }])),
    processedEvents: new Map(processedEvents.map((item) => [item.eventId, { ...item }])),
    updateCount: 0,
    recordedIgnoredSupportedEvent: false,
    async hasProcessedStripeEvent(stripeEventId) {
      return this.processedEvents.has(stripeEventId);
    },
    async recordProcessedStripeEvent(stripeEventId, eventType, relatedObjectId) {
      if (["invoice.finalized", "invoice.paid", "invoice.payment_failed", "invoice.voided"].includes(eventType)) {
        const current = [...this.rows.values()].find((item) => item.stripeInvoiceId === relatedObjectId);
        if (!current || (eventType === "invoice.paid" && current.status !== "paid")) {
          this.recordedIgnoredSupportedEvent = true;
        }
      }

      this.processedEvents.set(stripeEventId, { eventId: stripeEventId, eventType, relatedObjectId });
    },
    async findBillingRequestById(billingRequestId) {
      return this.rows.get(billingRequestId) ?? null;
    },
    async findBillingRequestByStripeInvoiceId(stripeInvoiceId) {
      return [...this.rows.values()].find((item) => item.stripeInvoiceId === stripeInvoiceId) ?? null;
    },
    async updateBillingRequestFromInvoice(update) {
      const current = this.rows.get(update.billingRequestId);
      if (!current) {
        return null;
      }

      this.updateCount += 1;
      const next = {
        ...current,
        status: update.status,
        paidAt: update.status === "paid" ? update.paidAt ?? new Date(0).toISOString() : undefined,
        stripeInvoiceId: update.stripeInvoiceId,
        updatedAt: "2026-01-01T00:00:01.000Z"
      };
      this.rows.set(update.billingRequestId, next);
      return next;
    }
  };

  return store;
}

function row(input) {
  return {
    paidAt: undefined,
    stripeInvoiceId: undefined,
    ...input
  };
}

function paidEvent({ eventId, invoiceId, billingRequestId, paidAt }) {
  return {
    id: eventId,
    type: "invoice.paid",
    data: {
      object: {
        id: invoiceId,
        customer: "cus_test",
        hosted_invoice_url: "https://invoice.stripe.com/test",
        metadata: billingRequestId ? { partner_billing_request_id: billingRequestId } : {},
        status_transitions: { paid_at: paidAt }
      }
    }
  };
}

function finalizedEvent({ eventId, invoiceId, billingRequestId }) {
  return {
    id: eventId,
    type: "invoice.finalized",
    data: {
      object: {
        id: invoiceId,
        customer: "cus_test",
        hosted_invoice_url: "https://invoice.stripe.com/test",
        metadata: billingRequestId ? { partner_billing_request_id: billingRequestId } : {}
      }
    }
  };
}

function loadTsModule(filename) {
  const resolved = path.resolve(filename);
  const cached = moduleCache.get(resolved);
  if (cached) {
    return cached.exports;
  }

  const source = fs.readFileSync(resolved, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  const mod = new Module(resolved);
  mod.filename = resolved;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  moduleCache.set(resolved, mod);
  mod.require = require;
  mod._compile(transpiled, resolved);
  return mod.exports;
}
