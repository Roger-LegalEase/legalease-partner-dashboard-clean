// Behavioral + source-contract tests for the launch-blocker payment guards:
//   1. P0 double-charge guard (createConsumerPacketCheckout)
//   2. P1 webhook idempotency recovery (reconcileExpungementAiCheckoutEvent)
//   3. P1 packet-ready persisted-paid fallback (source contract)
//   4. Removal of legacy Stripe webhook secret diagnostics (source contract)
//
// TS modules are transpiled in-process; their "@/..." imports are replaced with
// lightweight mocks so we can assert real runtime behavior without a bundler.

import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadTsWithMocks(relPath, mocks) {
  const resolved = path.join(rootDir, relPath);
  const source = fs.readFileSync(resolved, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  const mod = new Module(resolved);
  const compiledFilename = resolved + ".cjs";
  mod.filename = compiledFilename;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  mod.require = (spec) => (spec in mocks ? mocks[spec] : require(spec));
  mod._compile(transpiled, compiledFilename);
  return mod.exports;
}

function read(relPath) {
  return fs.readFileSync(path.join(rootDir, relPath), "utf8");
}

const failures = [];
function contract(condition, message) {
  if (!condition) failures.push(message);
}

// ---------------------------------------------------------------------------
// 1 + 2 (behavioral) — double-charge guard
// ---------------------------------------------------------------------------

function buildPaymentAdapter({ onStripeCreate, onUpdateMetadata, isProduction = false } = {}) {
  const stripeCreateCalls = [];
  const updateMetadataCalls = [];

  const stripeClient = {
    checkout: {
      sessions: {
        create: async (args) => {
          stripeCreateCalls.push(args);
          return onStripeCreate
            ? onStripeCreate(args)
            : { id: "cs_test_new", url: "https://checkout.stripe.com/c/pay/cs_test_new" };
        }
      }
    }
  };

  const adapter = loadTsWithMocks("src/lib/expungement-ai/payment-adapter.ts", {
    "server-only": {},
    "@/lib/app-url": {
      absoluteExpungementAiUrl: (p) => `https://expungement.ai${p}`
    },
    "@/lib/stripe/server": {
      getStripeServerClient: () => stripeClient,
      isProductionRuntime: () => isProduction,
      isStripeConfigurationError: (e) => Boolean(e) && e.name === "StripeConfigurationError"
    },
    "@/lib/expungement-ai/eligibility-adapter": {
      isConsumerPaymentAllowed: () => true
    },
    "@/lib/expungement-ai/briefcase": {
      updateBriefcasePaymentMetadata: async (userId, itemId, metadata) => {
        updateMetadataCalls.push({ userId, itemId, metadata });
        return onUpdateMetadata ? onUpdateMetadata(metadata) : { id: itemId, ...metadata };
      }
    }
  });

  return { adapter, stripeCreateCalls, updateMetadataCalls };
}

async function testPaidItemNeverCreatesSession() {
  const { adapter, stripeCreateCalls, updateMetadataCalls } = buildPaymentAdapter();
  const item = {
    id: "b-123",
    paymentAllowed: true,
    resultCode: "packet_ready",
    paymentStatus: "paid",
    paymentProvider: "stripe",
    checkoutSessionId: "cs_prev",
    state: "MS"
  };

  const result = await adapter.createConsumerPacketCheckout({ userId: "u-1", item });

  assert.equal(stripeCreateCalls.length, 0, "paid item must NOT call stripe.checkout.sessions.create");
  assert.equal(updateMetadataCalls.length, 0, "paid item must NOT reset payment metadata");
  assert.equal(result.alreadyPaid, true, "paid item must report alreadyPaid");
  assert.ok(result.checkoutUrl.includes("/packet-ready"), "paid item must redirect to packet-ready");
  assert.ok(result.checkoutUrl.includes("b-123"), "paid item redirect must reference the briefcase item id");
}

async function testUnpaidEligibleItemCreatesSession() {
  const { adapter, stripeCreateCalls } = buildPaymentAdapter();
  const item = {
    id: "b-999",
    paymentAllowed: true,
    resultCode: "packet_ready",
    paymentStatus: "unpaid",
    state: "MS"
  };

  const result = await adapter.createConsumerPacketCheckout({ userId: "u-1", item });

  assert.equal(stripeCreateCalls.length, 1, "unpaid eligible item must create exactly one Stripe session");
  assert.equal(result.mode, "stripe", "unpaid eligible item must return stripe mode");
  assert.ok(!result.alreadyPaid, "unpaid item must not report alreadyPaid");
  assert.equal(result.checkoutUrl, "https://checkout.stripe.com/c/pay/cs_test_new", "unpaid item must return the Stripe checkout URL");
}

// ---------------------------------------------------------------------------
// 2 (behavioral) — webhook idempotency + recovery
// ---------------------------------------------------------------------------

function buildReconciliation({ claim, item }) {
  const generateCalls = [];
  const updateCalls = [];

  const supabase = {
    from: () => ({
      insert: async () => (claim === "ok" ? { error: null } : { error: { code: "23505" } })
    })
  };

  const reconModule = loadTsWithMocks("src/lib/expungement-ai/checkout-reconciliation.ts", {
    "server-only": {},
    stripe: {},
    "@/lib/expungement-ai/briefcase": {
      getBriefcaseItemForWebhook: async () => item,
      updateBriefcasePaymentMetadataForWebhook: async (userId, itemId, metadata) => {
        updateCalls.push({ userId, itemId, metadata });
        return { id: itemId, ...item, ...metadata };
      }
    },
    "@/lib/expungement-ai/packet-generation": {
      generatePaidConsumerPacket: async (args) => {
        generateCalls.push(args);
        return { packetStatus: "ready", canDownload: true };
      }
    },
    "@/lib/partners/billing": {
      reconcileStripeInvoiceEvent: async () => "ignored"
    },
    "@/lib/expungement-ai/payment-adapter": {
      consumerPacketPriceCents: 5000
    },
    "@/lib/supabase/server": {
      getSupabaseAdminClient: () => supabase
    }
  });

  return { reconModule, generateCalls, updateCalls };
}

function completedEvent(id = "evt_1") {
  return {
    id,
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_1",
        payment_status: "paid",
        client_reference_id: "b1",
        payment_intent: "pi_1",
        metadata: {
          channel: "expungement_ai_consumer",
          user_id: "u1",
          briefcase_item_id: "b1"
        }
      }
    }
  };
}

async function testFirstCompletedEventProcesses() {
  const { reconModule, generateCalls } = buildReconciliation({
    claim: "ok",
    item: { id: "b1", packetStatus: "pending" }
  });

  const outcome = await reconModule.reconcileExpungementAiCheckoutEvent(completedEvent());

  assert.equal(outcome, "processed", "first completed event must be processed");
  assert.equal(generateCalls.length, 1, "first completed event must generate the packet once");
}

async function testDuplicateReadyPacketIsNotRegenerated() {
  const { reconModule, generateCalls } = buildReconciliation({
    claim: "duplicate",
    item: { id: "b1", packetStatus: "ready" }
  });

  const outcome = await reconModule.reconcileExpungementAiCheckoutEvent(completedEvent());

  assert.equal(outcome, "duplicate", "duplicate delivery of a ready packet must be a no-op duplicate");
  assert.equal(generateCalls.length, 0, "duplicate delivery must NOT regenerate a ready packet");
}

async function testDuplicateRecoversPaidButNotReady() {
  const { reconModule, generateCalls } = buildReconciliation({
    claim: "duplicate",
    item: { id: "b1", packetStatus: "failed" }
  });

  const outcome = await reconModule.reconcileExpungementAiCheckoutEvent(completedEvent());

  assert.equal(outcome, "recovered", "duplicate delivery of a paid-but-unfinished packet must recover");
  assert.equal(generateCalls.length, 1, "recovery must run the re-entrant generation exactly once");
}

// ---------------------------------------------------------------------------
// 3 + 4 (source contract) — page + handler changes
// ---------------------------------------------------------------------------

function sourceContracts() {
  const packetReady = read("src/app/expungement-ai/packet-ready/page.tsx");
  contract(packetReady.includes('item?.paymentStatus === "paid"'), "Packet-ready must fall back to persisted paid state.");
  contract(packetReady.includes("persistedPaid"), "Packet-ready must derive persistedPaid without a session_id.");
  contract(packetReady.includes("getConsumerCheckoutStatus") && packetReady.includes("recordConsumerPaymentConfirmation"), "Packet-ready must still confirm Stripe returns when session_id is present.");

  const payPage = read("src/app/expungement-ai/pay/page.tsx");
  contract(payPage.includes('item.paymentStatus === "paid"'), "Pay page must branch on already-paid.");
  contract(payPage.includes("/expungement-ai/packet-ready?briefcaseItemId="), "Pay page must link a paid item to packet-ready.");

  const checkoutRoute = read("src/app/api/expungement-ai/checkout/route.ts");
  contract(checkoutRoute.includes("already_paid") || checkoutRoute.includes("alreadyPaid"), "Checkout route must surface an already_paid outcome.");

  const handler = read("src/lib/stripe/webhook-handler.ts");
  contract(!handler.includes("legacySecretPrefix") && !handler.includes("legacySecretLength"), "Webhook handler must not log secret prefix/length.");
  contract(!handler.includes("logLegacyDiagnostics"), "Webhook handler must not carry legacy diagnostics scaffolding.");
  contract(!handler.includes("rawBodyLength"), "Webhook handler must not log raw body length.");

  const legacyRoute = read("src/app/api/method/expungement.api.payment.stripe_webhook/route.ts");
  contract(!legacyRoute.includes("logLegacyDiagnostics"), "Legacy webhook route must not enable diagnostics.");
  contract(legacyRoute.includes("STRIPE_LEGACY_WEBHOOK_SECRET"), "Legacy webhook route must keep its route-specific secret.");
}

// ---------------------------------------------------------------------------

await testPaidItemNeverCreatesSession();
await testUnpaidEligibleItemCreatesSession();
await testFirstCompletedEventProcesses();
await testDuplicateReadyPacketIsNotRegenerated();
await testDuplicateRecoversPaidButNotReady();
sourceContracts();

if (failures.length) {
  console.error("Expungement.ai checkout guard tests failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai checkout guard tests passed.");
console.log("- Paid item does not create a Stripe session and redirects to packet-ready.");
console.log("- Unpaid eligible item still creates exactly one Stripe session.");
console.log("- Duplicate webhook does not regenerate a ready packet; recovers a paid-but-unfinished one.");
console.log("- Packet-ready persisted-paid fallback and legacy webhook diagnostics removal are in place.");
