// Focused behavioral checks for the Expungement.ai matter-level payment gate.
// Stripe and Supabase are deterministic in-memory doubles. No provider or
// hosted project is contacted by this test.

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
  const transpiled = ts.transpileModule(fs.readFileSync(resolved, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  const mod = new Module(resolved);
  const compiledFilename = `${resolved}.cjs`;
  mod.filename = compiledFilename;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  mod.require = (specifier) => (specifier in mocks ? mocks[specifier] : require(specifier));
  mod._compile(transpiled, compiledFilename);
  return mod.exports;
}

function read(relPath) {
  return fs.readFileSync(path.join(rootDir, relPath), "utf8");
}

const USER = "11111111-1111-4111-8111-111111111111";
const ITEM = "22222222-2222-4222-8222-222222222222";
const PERSON = "33333333-3333-4333-8333-333333333333";
const MATTER = "44444444-4444-4444-8444-444444444444";
const PRODUCT = "expungement_packet";
const APP_ORIGIN = "https://axis-serving-believed-century.trycloudflare.com";

function eligibleItem(overrides = {}) {
  return {
    id: ITEM,
    paymentAllowed: true,
    resultCode: "packet_ready",
    paymentStatus: "unpaid",
    packetStatus: "not_started",
    state: "PA",
    status: "packet_ready",
    pathwayLabel: "Path A — Non-conviction expungement",
    packetType: "custom_pleading",
    artifactRefs: {},
    ...overrides
  };
}

function openSession(overrides = {}) {
  return {
    id: "cs_test_legacy",
    mode: "payment",
    status: "open",
    payment_status: "unpaid",
    client_reference_id: ITEM,
    amount_total: 5000,
    currency: "usd",
    success_url: `${APP_ORIGIN}/expungement-ai/packet-ready?briefcaseItemId=${ITEM}`,
    cancel_url: `${APP_ORIGIN}/expungement-ai/pay?briefcaseItemId=${ITEM}`,
    url: "https://checkout.stripe.com/c/pay/cs_test_legacy",
    metadata: {
      channel: "expungement_ai_consumer",
      user_id: USER,
      briefcase_item_id: ITEM,
      jurisdiction: "PA",
      pathway_label: "Path A — Non-conviction expungement",
      packet_type: "custom_pleading",
      reviewed_input_hash: "a".repeat(64)
    },
    line_items: {
      data: [{
        quantity: 1,
        amount_total: 5000,
        price: { product: { id: "prod_legacy", name: "Expungement.ai self-help packet" } }
      }]
    },
    ...overrides
  };
}

function buildAuthoritativeBriefcasePersistence({ insertError = true } = {}) {
  const insertCalls = [];
  const existingQuery = {
    eq() { return this; },
    maybeSingle: async () => ({ data: null, error: null })
  };
  const admin = {
    from(table) {
      assert.equal(table, "consumer_briefcase_items");
      return {
        select: () => existingQuery,
        insert: (row) => {
          insertCalls.push(row);
          return {
            select: () => ({
              single: async () => insertError
                ? { data: null, error: { code: "42501" } }
                : { data: row, error: null }
            })
          };
        }
      };
    }
  };
  const persistence = loadTsWithMocks("src/lib/expungement-ai/briefcase.ts", {
    "server-only": {},
    "@/lib/supabase/server": { getSupabaseAdminClient: () => admin },
    "@/lib/supabase/auth-server": { createServerSupabaseAuthClient: async () => null },
    "@/lib/expungement-ai/save-result-policy": { findItemForSession: () => null },
    "@/lib/rcap/documents/guidance-packet-registry": {
      componentDeferralBundle: () => null,
      componentDeferralForTrack: () => null,
      exactDeferralBundle: () => null,
      exactDeferralForPathway: () => null,
      exactDeferralForTrack: () => null,
      terminalTreatmentBundle: () => null,
      terminalTreatmentForTrack: () => null
    }
  });
  return { persistence, insertCalls };
}

function authoritativeSaveItem(userId = USER) {
  return {
    userId,
    itemType: "result",
    jurisdiction: "PA",
    pathwayLabel: "Path A — Non-conviction expungement",
    resultCode: "packet_ready",
    packetType: "custom_pleading",
    paymentAllowed: true,
    status: "packet_ready",
    summary: "A path may be available.",
    nextSteps: ["Complete packet information."],
    artifactRefs: { productId: PRODUCT },
    paymentStatus: "unpaid",
    sourceSessionId: "55555555-5555-4555-8555-555555555555"
  };
}

async function authoritativePersistenceBehavior() {
  {
    const h = buildAuthoritativeBriefcasePersistence();
    await assert.rejects(
      h.persistence.saveAuthoritativeScreeningResultToBriefcase({
        authenticatedUserId: USER,
        item: authoritativeSaveItem("66666666-6666-4666-8666-666666666666")
      }),
      (error) => error?.name === "AuthoritativeBriefcasePersistenceError"
    );
    assert.equal(h.insertCalls.length, 0, "service writer must reject an owner mismatch before database access");
  }

  {
    const h = buildAuthoritativeBriefcasePersistence({ insertError: true });
    await assert.rejects(
      h.persistence.saveAuthoritativeScreeningResultToBriefcase({
        authenticatedUserId: USER,
        item: authoritativeSaveItem()
      }),
      (error) => error?.name === "AuthoritativeBriefcasePersistenceError"
    );
    assert.equal(h.insertCalls.length, 1);
    assert.equal(h.insertCalls[0].user_id, USER);
    assert.equal(h.insertCalls[0].payment_allowed, true);
    assert.equal(h.insertCalls[0].payment_status, "unpaid");
    assert.equal(h.insertCalls[0].amount_cents, 5000);
  }
}

function buildPaymentAdapter({
  retrievedSession = null,
  persistResult = true,
  reviewReady = true,
  stripeConfigurationError = null
} = {}) {
  const createCalls = [];
  const retrieveCalls = [];
  const updateCalls = [];
  const persistCalls = [];

  const stripeClient = {
    checkout: {
      sessions: {
        create: async (params, options) => {
          createCalls.push({ params, options });
          return {
            id: "cs_test_new",
            mode: "payment",
            status: "open",
            url: "https://checkout.stripe.com/c/pay/cs_test_new"
          };
        },
        retrieve: async (id, params) => {
          retrieveCalls.push({ id, params });
          return retrievedSession;
        },
        update: async (id, params) => {
          updateCalls.push({ id, params });
          return { ...retrievedSession, metadata: { ...retrievedSession.metadata, ...params.metadata } };
        },
        expire: async (id) => ({ id, status: "expired" })
      }
    }
  };

  const adapter = loadTsWithMocks("src/lib/expungement-ai/payment-adapter.ts", {
    "server-only": {},
    "@/lib/app-url": {
      absoluteExpungementAiUrl: (pathname) => `${APP_ORIGIN}/expungement-ai${pathname}`
    },
    "@/lib/stripe/server": {
      getStripeServerClient: () => {
        if (stripeConfigurationError) throw stripeConfigurationError;
        return stripeClient;
      },
      isProductionRuntime: () => false,
      isStripeConfigurationError: (error) => error?.name === "StripeConfigurationError"
    },
    "@/lib/expungement-ai/eligibility-adapter": {
      isConsumerPaymentAllowed: () => true
    },
    "@/lib/rcap/documents/guidance-packet-registry": {
      componentDeferralForTrack: () => null,
      exactDeferralForPathway: () => null,
      exactDeferralForTrack: () => null,
      terminalTreatmentForTrack: () => null
    },
    "@/lib/expungement-ai/briefcase": {
      getBriefcaseItem: async () => null
    },
    "@/lib/expungement-ai/consumer-identity": {
      resolveConsumerPersonId: async () => ({ ok: true, personId: PERSON }),
      consumerMatterIdForItem: () => MATTER
    },
    "@/lib/expungement-ai/consumer-payment-authority": {
      CONSUMER_PACKET_PRODUCT_ID: PRODUCT,
      persistConsumerCheckoutBinding: async (input) => {
        persistCalls.push(input);
        return persistResult;
      }
    },
    "@/lib/expungement-ai/packet-information": {
      packetInformationModelFor: () => reviewReady
        ? { stage: "ready_to_generate", missingInputIds: [], reviewedAt: "2026-08-15T00:00:00.000Z" }
        : null,
      packetInformationReviewSafety: () => ({ safe: reviewReady }),
      reviewedPacketInputHash: () => "a".repeat(64)
    }
  });

  return { adapter, createCalls, retrieveCalls, updateCalls, persistCalls };
}

async function checkoutBehavior() {
  {
    const h = buildPaymentAdapter();
    const result = await h.adapter.createConsumerPacketCheckout({
      userId: USER,
      item: eligibleItem({ paymentStatus: "paid", checkoutSessionId: "cs_test_paid" })
    });
    assert.equal(result.alreadyPaid, true);
    assert.equal(h.createCalls.length, 0, "paid matter must never create another Session");
    assert.equal(h.persistCalls.length, 0, "paid matter must never be reset to unpaid");
  }

  {
    const h = buildPaymentAdapter({ reviewReady: false });
    await assert.rejects(
      h.adapter.createConsumerPacketCheckout({ userId: USER, item: eligibleItem() }),
      (error) => error?.name === "ConsumerCheckoutReviewRequiredError"
    );
    assert.equal(h.createCalls.length, 0, "Checkout must not exist before final review");
  }

  {
    const h = buildPaymentAdapter();
    await assert.rejects(
      h.adapter.createConsumerPacketCheckout({
        userId: USER,
        item: eligibleItem({ packetType: "guidance_packet" })
      }),
      (error) => error?.name === "ConsumerCheckoutNotAllowedError"
    );
    assert.equal(h.createCalls.length, 0, "a mutated payment boolean cannot make a guidance matter purchasable");
  }

  {
    const h = buildPaymentAdapter();
    const result = await h.adapter.createConsumerPacketCheckout({ userId: USER, item: eligibleItem() });
    assert.equal(result.checkoutSessionId, "cs_test_new");
    assert.equal(result.amountCents, 5000);
    assert.equal(result.currency, "usd");
    assert.equal(result.outcome, "checkout_created");
    assert.equal(h.createCalls.length, 1);
    assert.equal(h.createCalls[0].params.mode, "payment");
    assert.equal(h.createCalls[0].params.line_items[0].price_data.unit_amount, 5000);
    assert.equal(h.createCalls[0].params.line_items[0].price_data.currency, "usd");
    assert.deepEqual(
      Object.fromEntries(["user_id", "briefcase_item_id", "product_id", "person_id", "matter_id"].map((key) => [key, h.createCalls[0].params.metadata[key]])),
      { user_id: USER, briefcase_item_id: ITEM, product_id: PRODUCT, person_id: PERSON, matter_id: MATTER }
    );
    assert.equal(h.createCalls[0].options.idempotencyKey, `${PRODUCT}:${ITEM}:initial`);
    assert.equal(h.persistCalls.length, 1);
    assert.equal(h.persistCalls[0].checkoutSessionId, "cs_test_new");
    assert.ok(!("paymentStatus" in h.persistCalls[0]), "beginning Checkout cannot assert paid");
  }

  {
    const legacy = openSession();
    const h = buildPaymentAdapter({ retrievedSession: legacy });
    const result = await h.adapter.createConsumerPacketCheckout({
      userId: USER,
      item: eligibleItem({ checkoutSessionId: legacy.id })
    });
    assert.equal(result.checkoutSessionId, legacy.id, "legacy open Session must be reused");
    assert.equal(result.amountCents, 5000, "reused Session must return the normalized amount");
    assert.equal(result.currency, "usd", "reused Session must return the normalized currency");
    assert.equal(result.outcome, "checkout_reused", "reused Session must report reuse");
    assert.equal(h.createCalls.length, 0, "missing new metadata must not mint a replacement Session");
    assert.equal(h.retrieveCalls.length, 1);
    assert.equal(h.updateCalls.length, 1);
    assert.deepEqual(
      Object.fromEntries(["product_id", "person_id", "matter_id"].map((key) => [key, h.updateCalls[0].params.metadata[key]])),
      { product_id: PRODUCT, person_id: PERSON, matter_id: MATTER }
    );
    assert.equal(h.persistCalls[0].checkoutSessionId, legacy.id);
  }

  {
    const mismatch = openSession({ metadata: { ...openSession().metadata, matter_id: "wrong-matter" } });
    const h = buildPaymentAdapter({ retrievedSession: mismatch });
    await assert.rejects(
      h.adapter.createConsumerPacketCheckout({
        userId: USER,
        item: eligibleItem({ checkoutSessionId: mismatch.id })
      }),
      (error) => error?.name === "ConsumerCheckoutTemporarilyUnavailableError"
    );
    assert.equal(h.createCalls.length, 0, "mismatched open Session must fail closed, not duplicate");
    assert.equal(h.updateCalls.length, 0, "mismatched metadata must not be overwritten");
  }

  {
    const stale = openSession({ success_url: "https://dead.example/return" });
    const h = buildPaymentAdapter({ retrievedSession: stale });
    await assert.rejects(
      h.adapter.createConsumerPacketCheckout({
        userId: USER,
        item: eligibleItem({ checkoutSessionId: stale.id })
      }),
      (error) => error?.name === "ConsumerCheckoutTemporarilyUnavailableError"
    );
    assert.equal(h.createCalls.length, 0, "an open Session returning to another origin must not be replaced silently");
  }

  {
    const expired = openSession({ status: "expired", url: null });
    const h = buildPaymentAdapter({ retrievedSession: expired });
    await h.adapter.createConsumerPacketCheckout({
      userId: USER,
      item: eligibleItem({ checkoutSessionId: expired.id })
    });
    assert.equal(h.createCalls.length, 1);
    assert.equal(h.createCalls[0].options.idempotencyKey, `${PRODUCT}:${ITEM}:${expired.id}`);
  }

  {
    const h = buildPaymentAdapter({ persistResult: false });
    await assert.rejects(
      h.adapter.createConsumerPacketCheckout({ userId: USER, item: eligibleItem() }),
      (error) => error?.name === "ConsumerCheckoutTemporarilyUnavailableError"
    );
    assert.equal(h.createCalls.length, 1);
    assert.equal(h.persistCalls.length, 1, "a Session is never returned until its exact DB binding persists");
  }
}

function completedEvent(overrides = {}) {
  const base = {
    id: "evt_test_paid",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_bound",
        mode: "payment",
        payment_status: "paid",
        amount_total: 5000,
        currency: "usd",
        client_reference_id: ITEM,
        payment_intent: "pi_test_bound",
        metadata: {
          channel: "expungement_ai_consumer",
          user_id: USER,
          briefcase_item_id: ITEM,
          product_id: PRODUCT,
          person_id: PERSON,
          matter_id: MATTER,
          reviewed_input_hash: "a".repeat(64)
        }
      }
    }
  };
  return {
    ...base,
    ...overrides,
    data: { object: { ...base.data.object, ...(overrides.data?.object ?? {}) } }
  };
}

function buildReconciliation({
  claim = "new",
  paymentOutcome = "recorded_paid",
  item = eligibleItem({ checkoutSessionId: "cs_test_bound", sourceSessionId: undefined }),
  sponsorship = null
} = {}) {
  const paymentCalls = [];
  const renderCalls = [];
  const statusCalls = [];
  const claimCalls = [];

  const supabase = {
    from(table) {
      if (table === "processed_stripe_events") {
        return {
          insert: async (row) => {
            claimCalls.push(row);
            return claim === "new" ? { error: null } : { error: { code: "23505" } };
          }
        };
      }
      if (table === "screening_sessions") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: sponsorship, error: null })
            })
          })
        };
      }
      throw new Error(`unexpected table ${table}`);
    }
  };

  const reconciliation = loadTsWithMocks("src/lib/expungement-ai/checkout-reconciliation.ts", {
    "server-only": {},
    stripe: {},
    "@/lib/expungement-ai/briefcase": {
      getBriefcaseItemForWebhook: async () => item,
      updateBriefcasePacketStatusForWebhook: async (userId, itemId, packetStatus) => {
        statusCalls.push({ userId, itemId, packetStatus });
        return { ...item, packetStatus };
      }
    },
    "@/lib/expungement-ai/consumer-payment-authority": {
      CONSUMER_PACKET_CURRENCY: "usd",
      CONSUMER_PACKET_PRODUCT_ID: PRODUCT,
      recordConsumerPacketPayment: async (input) => {
        paymentCalls.push(input);
        return { outcome: paymentOutcome, briefcaseItemId: ITEM, providerEventId: "evt_original" };
      },
      isPaidOutcome: (outcome) => outcome === "recorded_paid",
      isAlreadyRecordedOutcome: (outcome) => outcome === "already_paid"
    },
    "@/lib/expungement-ai/checkout-analytics": {
      scheduleConsumerCheckoutCompleted: () => undefined
    },
    "@/lib/expungement-ai/consumer-identity": {
      resolveConsumerPersonId: async () => ({ ok: true, personId: PERSON }),
      consumerMatterIdForItem: () => MATTER
    },
    "@/lib/expungement-ai/consumer-render-request": {
      requestConsumerPacketRenderForWebhook: async (input) => {
        renderCalls.push(input);
        return { status: "queued", jobId: "job_same" };
      }
    },
    "@/lib/expungement-ai/payment-adapter": {
      consumerPacketPriceCents: 5000
    },
    "@/lib/expungement-ai/packet-information": {
      reviewedPacketInputHash: () => "a".repeat(64)
    },
    "@/lib/supabase/server": {
      getSupabaseAdminClient: () => supabase
    }
  });

  return { reconciliation, paymentCalls, renderCalls, statusCalls, claimCalls };
}

async function webhookBehavior() {
  {
    const h = buildReconciliation();
    const outcome = await h.reconciliation.reconcileExpungementAiCheckoutEvent(completedEvent());
    assert.equal(outcome, "processed");
    assert.equal(h.paymentCalls.length, 1);
    assert.deepEqual(
      Object.fromEntries(["briefcaseItemId", "checkoutSessionId", "productId", "personId", "matterId", "amountCents", "currency"].map((key) => [key, h.paymentCalls[0][key]])),
      {
        briefcaseItemId: ITEM,
        checkoutSessionId: "cs_test_bound",
        productId: PRODUCT,
        personId: PERSON,
        matterId: MATTER,
        amountCents: 5000,
        currency: "usd"
      }
    );
    assert.equal(h.renderCalls.length, 1, "signed payment must enqueue one durable render request");
    assert.equal(h.statusCalls[0].packetStatus, "pending");
  }

  {
    const h = buildReconciliation({ claim: "duplicate", paymentOutcome: "already_paid" });
    const outcome = await h.reconciliation.reconcileExpungementAiCheckoutEvent(completedEvent());
    assert.equal(outcome, "recovered");
    assert.equal(h.renderCalls.length, 1, "retry must converge through the idempotent durable queue");
  }

  {
    const h = buildReconciliation({
      claim: "duplicate",
      paymentOutcome: "already_paid",
      item: eligibleItem({ checkoutSessionId: "cs_test_bound", packetStatus: "ready" })
    });
    const outcome = await h.reconciliation.reconcileExpungementAiCheckoutEvent(completedEvent());
    assert.equal(outcome, "duplicate");
    assert.equal(h.paymentCalls.length, 0);
    assert.equal(h.renderCalls.length, 0);
  }

  {
    const h = buildReconciliation({ paymentOutcome: "duplicate_provider_event" });
    await assert.rejects(
      h.reconciliation.reconcileExpungementAiCheckoutEvent(completedEvent()),
      /payment writer refused the event: duplicate_provider_event/
    );
    assert.equal(h.renderCalls.length, 0, "a provider event attached elsewhere must fail closed");
  }

  {
    const h = buildReconciliation({
      item: eligibleItem({ checkoutSessionId: "cs_test_bound", sourceSessionId: "sponsored-session" }),
      sponsorship: {
        session_id: "sponsored-session",
        flow_mode: "rcap",
        partner_benefit_active: true,
        partner_slug: "we-must-vote"
      }
    });
    await assert.rejects(
      h.reconciliation.reconcileExpungementAiCheckoutEvent(completedEvent()),
      /partner-sponsored RCAP matters cannot enter the consumer payment writer/
    );
    assert.equal(h.claimCalls.length, 0);
    assert.equal(h.paymentCalls.length, 0);
  }

  {
    const h = buildReconciliation();
    const wrongMatter = completedEvent({
      data: { object: { metadata: { ...completedEvent().data.object.metadata, matter_id: "wrong" } } }
    });
    await assert.rejects(
      h.reconciliation.reconcileExpungementAiCheckoutEvent(wrongMatter),
      /product, person or matter metadata does not match/
    );
    assert.equal(h.claimCalls.length, 0);
    assert.equal(h.paymentCalls.length, 0);
  }
}

function buildRenderRequest({ reviewReady = true, existingPacket = null } = {}) {
  const packetRows = [];
  const packetUpdates = [];
  const inputSnapshots = [];
  const buildCalls = [];
  const enqueueCalls = [];

  const mutationChain = (data) => ({
    eq() { return this; },
    select() { return this; },
    async maybeSingle() { return { data, error: null }; }
  });
  const supabase = {
    from(table) {
      if (table === "rcap_document_packets") {
        return {
          select() {
            return {
              eq() { return this; },
              async maybeSingle() { return { data: existingPacket, error: null }; }
            };
          },
          update(row) {
            packetUpdates.push(row);
            return mutationChain({ id: existingPacket?.id });
          },
          insert(row) {
            packetRows.push(row);
            return mutationChain({ id: row.id });
          }
        };
      }
      if (table === "rcap_document_packet_inputs") {
        return {
          upsert(row, options) {
            inputSnapshots.push({ row, options });
            return mutationChain({ document_packet_id: row.document_packet_id });
          }
        };
      }
      throw new Error(`unexpected render table ${table}`);
    }
  };

  const item = eligibleItem({
    summary: "The saved screening result identifies the Pennsylvania non-conviction pathway.",
    nextSteps: ["Confirm the current filing instructions before filing."],
    checkoutSessionId: "cs_test_bound",
    paymentStatus: "paid"
  });
  const model = reviewReady ? {
    stateCode: "PA",
    stateName: "Pennsylvania",
    pathwayId: "path-a-non-conviction-expungement",
    pathwayLabel: item.pathwayLabel,
    packetPlan: null,
    questions: [],
    initialAnswers: {
      participant_full_legal_name: "Alex Acceptance",
      county: "Allegheny",
      court: "Court of Common Pleas",
      charge: "Synthetic test charge",
      disposition_date: "2025-01-02",
      criminal_history: "The listed charge was dismissed."
    },
    requiredInputIds: ["participant_full_legal_name", "county", "court", "charge", "disposition_date", "criminal_history"],
    missingInputIds: [],
    stage: "ready_to_generate",
    updatedAt: "2026-08-15T00:00:00.000Z",
    reviewedAt: "2026-08-15T00:00:00.000Z"
  } : null;

  const renderRequest = loadTsWithMocks("src/lib/expungement-ai/consumer-render-request.ts", {
    "server-only": {},
    "@/lib/expungement-ai/consumer-identity": {
      CONSUMER_PERSON_NAMESPACE: "expungement-ai-consumer",
      resolveConsumerPersonId: async () => ({ ok: true, personId: PERSON }),
      consumerMatterIdForItem: () => MATTER
    },
    "@/lib/expungement-ai/consumer-payment-authority": {
      CONSUMER_PACKET_PRODUCT_ID: PRODUCT,
      consumerPacketPaymentAuthority: async () => ({ valid: true, reason: "authorized", providerEventId: "evt_paid" })
    },
    "@/lib/expungement-ai/briefcase": {
      getBriefcaseItem: async () => item,
      getBriefcaseItemForWebhook: async () => item
    },
    "@/lib/expungement-ai/packet-information": {
      packetInformationModelFor: () => model,
      packetInformationReviewSafety: () => ({ safe: model.stage === "ready_to_generate" }),
      reviewedPacketInputHash: () => "a".repeat(64)
    },
    "@/lib/rcap/render/job-contract": {
      buildRenderJobSpec: (input) => {
        buildCalls.push(input);
        return {
          spec: {
            packetId: input.packetId,
            routeId: `PA:${item.pathwayLabel}`,
            rendererKind: "packet_document_v1",
            rendererVersion: "1.0.0",
            sourceSha256: null,
            profileId: "PA",
            profileVersion: "1.3.0",
            briefcaseItemId: ITEM,
            inputHash: "a".repeat(64)
          },
          route: { jurisdiction: "PA", pathwayId: item.pathwayLabel }
        };
      }
    },
    "@/lib/rcap/render/job-queue": {
      enqueueRenderJob: async (spec, identity) => {
        enqueueCalls.push({ spec, identity });
        return { id: "job_exact_matter" };
      }
    },
    "@/lib/rcap/render/consumer-delivery-control": {
      resolveConsumerDeliveryAccess: () => ({ allowed: true })
    },
    "@/lib/supabase/server": {
      getSupabaseAdminClient: () => supabase
    }
  });

  return {
    renderRequest,
    packetRows,
    packetUpdates,
    inputSnapshots,
    buildCalls,
    enqueueCalls
  };
}

async function renderRequestBehavior() {
  {
    const h = buildRenderRequest();
    const outcome = await h.renderRequest.requestConsumerPacketRenderForWebhook({
      authUserId: USER,
      briefcaseItemId: ITEM
    });
    assert.equal(outcome.status, "queued");
    assert.equal(h.buildCalls.length, 1);
    assert.equal(h.buildCalls[0].packetFields.participant_full_legal_name, "Alex Acceptance");
    assert.equal(h.buildCalls[0].packetFields.jurisdiction, "PA");
    assert.equal(h.packetRows.length, 1);
    assert.equal(h.packetRows[0].pathway, "source_engine_packet_plan", "storage uses the schema-admitted source pathway");
    assert.equal(h.packetRows[0].petitioner_first_name, "Alex");
    assert.equal(h.packetRows[0].petitioner_last_name, "Acceptance");
    assert.equal(h.packetRows[0].court_county, "Allegheny");
    assert.equal(h.packetRows[0].person_id, PERSON);
    assert.equal(h.inputSnapshots.length, 1, "the full reviewed answer snapshot must persist before enqueue");
    assert.equal(h.inputSnapshots[0].options.onConflict, "document_packet_id");
    assert.equal(h.inputSnapshots[0].row.input_payload.productId, PRODUCT);
    assert.equal(h.inputSnapshots[0].row.input_payload.matterId, MATTER);
    assert.equal(h.inputSnapshots[0].row.input_payload.packetFields.charge, "Synthetic test charge");
    assert.equal(h.enqueueCalls.length, 1);
    assert.deepEqual(h.enqueueCalls[0].identity, {
      mode: "consumer",
      consumerBriefcaseItemId: ITEM,
      expectedConsumerAuthUserId: USER,
      personId: PERSON,
      matterId: MATTER
    });
  }

  {
    const h = buildRenderRequest({ reviewReady: false });
    const outcome = await h.renderRequest.requestConsumerPacketRenderForWebhook({
      authUserId: USER,
      briefcaseItemId: ITEM
    });
    assert.equal(outcome.status, "route_not_renderable");
    assert.equal(h.buildCalls.length, 0);
    assert.equal(h.packetRows.length, 0);
    assert.equal(h.enqueueCalls.length, 0, "unreviewed answers cannot enter the durable worker queue");
  }
}

function sourceContracts() {
  const reconciliation = read("src/lib/expungement-ai/checkout-reconciliation.ts");
  assert.ok(reconciliation.includes("requestConsumerPacketRenderForWebhook"));
  assert.ok(!reconciliation.includes("generatePaidConsumerPacket"), "webhook must not call legacy synchronous generation");

  const button = read("src/app/expungement-ai/pay/ConsumerCheckoutButton.tsx");
  assert.ok(button.includes("try {") && button.includes("catch {") && button.includes("finally {"));
  assert.ok(button.includes("Pay $50 and generate my packet"));

  const route = read("src/app/api/expungement-ai/checkout/route.ts");
  assert.ok(route.includes("ConsumerCheckoutReviewRequiredError") && route.includes("status: 409"));

  const renderRequest = read("src/lib/expungement-ai/consumer-render-request.ts");
  assert.ok(!renderRequest.includes("packetFields: {}"), "render idempotency must include reviewed packet answers");
  assert.ok(renderRequest.includes('pathway: CONSUMER_PACKET_STORAGE_PATHWAY'));
  assert.ok(renderRequest.includes('from("rcap_document_packet_inputs")'));

  const packetGenerateButton = read("src/components/expungement-ai/PacketGenerateButton.tsx");
  const reviewPage = read("src/app/briefcase/[packetId]/review/page.tsx");
  assert.ok(packetGenerateButton.includes('mode: "sponsored_sync" | "paid_durable"'));
  assert.ok(packetGenerateButton.includes('"/api/expungement-ai/packet/render"'));
  assert.ok(packetGenerateButton.includes("durable && response.status !== 202"));
  const durableAccepted = packetGenerateButton.slice(
    packetGenerateButton.indexOf("if (durable) {"),
    packetGenerateButton.indexOf('trackFunnelEvent("packet_generated"')
  );
  assert.ok(durableAccepted.includes('setStatus("preparing")') && durableAccepted.includes("return;"));
  assert.ok(!durableAccepted.includes('trackFunnelEvent("packet_generated"'), "202 may mean preparing, never generated");
  assert.ok(reviewPage.includes('mode="paid_durable"'), "paid correction/retry must use the durable render route");
  assert.ok(reviewPage.includes('label="Prepare updated packet"'), "paid corrections must expose an explicit same-matter update action");
  assert.ok(!reviewPage.includes('model.missingInputIds.length === 0 && item.packetStatus !== "ready"'), "a ready artifact must not block a paid correction render");
  assert.ok(reviewPage.includes('mode="sponsored_sync"'), "sponsored generation must keep its existing endpoint");

  const legacyPacketReturn = read("src/app/expungement-ai/packet-ready/page.tsx");
  assert.ok(legacyPacketReturn.includes("getBriefcaseItem") && legacyPacketReturn.includes("redirect("));
  assert.ok(!legacyPacketReturn.includes("generatePaidConsumerPacket"), "legacy success URL must not synchronously generate");
  assert.ok(!legacyPacketReturn.includes("recordConsumerPaymentConfirmation"), "browser return must not write payment");
  assert.ok(!legacyPacketReturn.includes("getConsumerCheckoutStatus"), "signed webhook state, not browser polling, is authoritative");

  const pendingClaim = read("src/app/api/expungement-ai/screening/pending/claim/route.ts");
  const legacySave = read("src/app/api/expungement-ai/screening/save-result/route.ts");
  const saveIntent = read("src/components/expungement-ai/BriefcaseSaveIntent.tsx");
  const briefcase = read("src/lib/expungement-ai/briefcase.ts");
  assert.ok(pendingClaim.includes("saveAuthoritativeScreeningResultToBriefcase"));
  assert.ok(pendingClaim.includes('error: "briefcase_persistence_failed"') && pendingClaim.includes("status: 503"));
  assert.ok(briefcase.includes("getSupabaseAdminClient()") && briefcase.includes("user_id: input.authenticatedUserId"));
  assert.ok(briefcase.includes("direct Briefcase creation is retired"));
  assert.ok(legacySave.includes("screening_save_result_retired") && legacySave.includes("status: 410"));
  assert.ok(!legacySave.includes("saveScreeningResultToBriefcase") && !legacySave.includes("paymentAllowed"));
  assert.ok(!saveIntent.includes("/api/expungement-ai/screening/save-result"));

  const packageSource = read("package.json");
  assert.ok(packageSource.includes('"start:hosted-preview"'));
  assert.ok(packageSource.includes("VERCEL_ENV=preview VERCEL_TARGET_ENV=preview"));
  assert.ok(packageSource.includes("HOSTED_STRIPE_TEST_SECRET"));
}

await authoritativePersistenceBehavior();
await checkoutBehavior();
await webhookBehavior();
await renderRequestBehavior();
sourceContracts();

console.log("Expungement.ai matter-level checkout guard tests passed.");
console.log("- Final review gates Checkout and exact matter metadata is persisted before return.");
console.log("- An open legacy Session is patched and reused; mismatches fail closed without duplication.");
console.log("- Signed events reject sponsored or conflicting evidence and enqueue durable Phase 53 work.");
console.log("- Reviewed packet fields are snapshotted, hashed and persisted into the worker source row.");
