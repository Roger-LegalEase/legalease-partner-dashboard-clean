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
  return loadResolvedTsModule(path.join(rootDir, relPath), mocks, new Map());
}

function loadResolvedTsModule(resolved, mocks, cache) {
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const transpiled = ts.transpileModule(fs.readFileSync(resolved, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  const mod = new Module(resolved);
  cache.set(resolved, mod);
  const compiledFilename = `${resolved}.cjs`;
  mod.filename = compiledFilename;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  mod.require = (specifier) => {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
    if (!specifier.startsWith("@/")) return require(specifier);
    const candidate = resolveRepositoryAlias(specifier);
    if (/\.tsx?$/.test(candidate)) return loadResolvedTsModule(candidate, mocks, cache);
    return require(candidate);
  };
  mod._compile(transpiled, compiledFilename);
  return mod.exports;
}

function resolveRepositoryAlias(specifier) {
  const aliasBase = path.join(rootDir, "src", specifier.slice(2));
  const candidate = [aliasBase, `${aliasBase}.ts`, `${aliasBase}.tsx`, `${aliasBase}.js`, path.join(aliasBase, "index.ts")]
    .find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
  if (!candidate) {
    throw new Error(`Unresolved repository alias in checkout fixture loader: ${specifier}`);
  }
  return candidate;
}

assert.throws(
  () => resolveRepositoryAlias("@/lib/expungement-ai/definitely-missing-checkout-fixture"),
  /Unresolved repository alias in checkout fixture loader/,
  "future unresolved aliases must fail with an explicit fixture-loader error"
);

function read(relPath) {
  return fs.readFileSync(path.join(rootDir, relPath), "utf8");
}

const USER = "11111111-1111-4111-8111-111111111111";
const ITEM = "22222222-2222-4222-8222-222222222222";
const PERSON = "33333333-3333-4333-8333-333333333333";
const MATTER = "44444444-4444-4444-8444-444444444444";
const PRODUCT = "expungement_packet";
const PATHWAY_ID = "pa-path-a-non-conviction-expungement";
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
      pathway_id: PATHWAY_ID,
      packet_type: "custom_pleading",
      verification_hash: "a".repeat(64)
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
    "@/lib/expungement-ai/verification-cas": {
      storedPacketVerificationHash: () => null
    },
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
  persistOutcome = "bound",
  reviewReady = true,
  verificationSnapshotOverrides = {},
  verificationHash = "a".repeat(64),
  verificationRevision = 4,
  stripeConfigurationError = null
} = {}) {
  const createCalls = [];
  const retrieveCalls = [];
  const updateCalls = [];
  const expireCalls = [];
  const persistCalls = [];
  const routeInputs = [];
  let verificationCalls = 0;

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
        expire: async (id) => {
          expireCalls.push(id);
          return { id, status: "expired" };
        }
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
    // The delivery gate the payment adapter consults before it will sell.
    // Stubbed permissive here on purpose: these cases exercise the OTHER
    // checkout guards, and a route that cannot render would short-circuit them
    // all, so every assertion below would pass for the wrong reason. The real
    // binding — no route may take money for a packet it cannot produce — is
    // proven against the real resolver by
    // scripts/verify-rcap-money-gate-delivery-binding.mjs, over every
    // jurisdiction, with its own mutations.
    "@/lib/rcap/documents/packet-route-resolver": {
      packetRouteCanRender: () => true,
      resolvePacketRoute: (input) => {
        routeInputs.push(input);
        return { kind: "factory_v2", canRender: true };
      }
    },
    "@/lib/expungement-ai/packet-fulfillment-authority": {
      assertPacketFulfillmentProven: () => ({ proven: true })
    },
    "@/lib/rcap/render/commercial-admission": {
      commercialRouteIdentity: ({ jurisdiction, pathwayId }) => ({
        routeId: `${jurisdiction}:${pathwayId}`,
        jurisdiction,
        pathwayId,
        packetFamilyId: "fixture-family"
      }),
      finalVerificationSnapshotFrom: (input) => input,
      fulfillmentRequestContext: (input) => input,
      governCommercialAdmission: () => ({ admitted: true }),
      isOperationallySellable: () => true
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
        return { outcome: persistOutcome };
      }
    },
    "@/lib/expungement-ai/packet-information": {
      requireCurrentPacketVerification: () => {
        verificationCalls += 1;
        if (!reviewReady) throw new Error("current final verification is required");
        return {
          hash: verificationHash,
          snapshot: {
            jurisdiction: "PA",
            pathwayId: PATHWAY_ID,
            selectedTrackId: null,
            treatmentClassification: null,
            deferralComponentIds: [],
            packetType: "custom_pleading",
            resultCode: "packet_ready",
            paymentAllowed: true,
            packetPlan: null,
            ...verificationSnapshotOverrides
          },
          revision: verificationRevision
        };
      }
    }
  });

  return {
    adapter,
    createCalls,
    retrieveCalls,
    updateCalls,
    expireCalls,
    persistCalls,
    routeInputs,
    verificationCalls: () => verificationCalls
  };
}

async function checkoutBehavior() {
  {
    const h = buildPaymentAdapter({ reviewReady: false });
    const result = await h.adapter.createConsumerPacketCheckout({
      userId: USER,
      item: eligibleItem({ paymentStatus: "paid", checkoutSessionId: "cs_test_paid" })
    });
    assert.equal(result.alreadyPaid, true);
    assert.equal(h.createCalls.length, 0, "paid matter must never create another Session");
    assert.equal(h.persistCalls.length, 0, "paid matter must never be reset to unpaid");
    assert.equal(h.verificationCalls(), 0, "already-paid access must not demand a new current verification");
  }

  {
    const h = buildPaymentAdapter();
    const result = await h.adapter.createConsumerPacketCheckout({
      userId: USER,
      item: eligibleItem({
        pathwayLabel: null,
        selectedTrackId: "participant-forged-track",
        treatmentClassification: "exact_supported_deferral",
        artifactRefs: {
          selectedTrackId: "participant-forged-track",
          treatmentClassification: "terminal_treatment_candidate"
        }
      })
    });
    assert.equal(result.outcome, "checkout_created", "writable route/display fields cannot suppress protected checkout authority");
    assert.ok(!("commercialFlow" in (eligibleItem().artifactRefs ?? {})), "checkout remains available after the writable commercialFlow mirror is deleted");
    assert.equal(h.routeInputs.at(-1)?.pathway, PATHWAY_ID);
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
    const h = buildPaymentAdapter({ verificationSnapshotOverrides: { packetType: "guidance_packet" } });
    await assert.rejects(
      h.adapter.createConsumerPacketCheckout({ userId: USER, item: eligibleItem() }),
      (error) => error?.name === "ConsumerCheckoutNotAllowedError"
    );
    assert.equal(h.createCalls.length, 0, "a mutated payment boolean cannot make a guidance matter purchasable");
  }

  {
    const h = buildPaymentAdapter({ verificationSnapshotOverrides: { pathwayId: null } });
    await assert.rejects(
      h.adapter.createConsumerPacketCheckout({ userId: USER, item: eligibleItem() }),
      (error) => error?.name === "ConsumerPacketNotDeliverableError"
    );
    assert.equal(h.createCalls.length, 0, "missing canonical pathway identity must fail before Checkout exists");
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
    assert.equal(h.createCalls[0].options.idempotencyKey, `${PRODUCT}:${ITEM}:${"a".repeat(64)}:4:initial`);
    assert.equal(h.persistCalls.length, 1);
    assert.equal(h.persistCalls[0].checkoutSessionId, "cs_test_new");
    assert.equal(h.persistCalls[0].expectedVerificationHash, "a".repeat(64), "checkout binding carries the exact verified snapshot hash");
    assert.equal(h.routeInputs.at(-1)?.pathway, PATHWAY_ID, "checkout delivery uses the protected machine pathway id, never the human label");
    assert.equal(h.createCalls[0].params.metadata.pathway_id, PATHWAY_ID, "Stripe metadata carries the protected machine pathway id");
    assert.equal(h.createCalls[0].params.metadata.verification_hash, "a".repeat(64), "Stripe metadata carries the protected verification hash");
    assert.ok(!("pathway_label" in h.createCalls[0].params.metadata), "Stripe metadata cannot fall back to a writable human pathway label");
    assert.ok(!("reviewed_input_hash" in h.createCalls[0].params.metadata), "the obsolete participant-JSON hash contract is removed");
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
    const completeOldAuthority = openSession({
      status: "complete",
      payment_status: "paid",
      url: null,
      metadata: { ...openSession().metadata, verification_hash: "f".repeat(64) }
    });
    const h = buildPaymentAdapter({ retrievedSession: completeOldAuthority, reviewReady: false });
    const result = await h.adapter.createConsumerPacketCheckout({
      userId: USER,
      item: eligibleItem({ checkoutSessionId: completeOldAuthority.id })
    });
    assert.equal(result.outcome, "payment_pending", "a completed paid Session cannot be replaced after verification changes");
    assert.equal(h.createCalls.length, 0, "webhook lag cannot open a second payable Session");
    assert.equal(h.expireCalls.length, 0, "completed Sessions are immutable provider evidence");
    assert.equal(h.verificationCalls(), 0, "completed provider payment evidence returns before demanding a new current verification");
  }

  {
    const reusable = openSession();
    const h = buildPaymentAdapter({ retrievedSession: reusable, persistOutcome: "refused" });
    await assert.rejects(
      h.adapter.createConsumerPacketCheckout({
        userId: USER,
        item: eligibleItem({ checkoutSessionId: reusable.id })
      }),
      (error) => error?.name === "ConsumerCheckoutTemporarilyUnavailableError"
    );
    assert.deepEqual(h.expireCalls, [reusable.id], "a reused open Session must be expired when binding CAS refuses");
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
    assert.deepEqual(h.expireCalls, [mismatch.id], "an invalid reusable binding is expired so its old URL cannot remain payable");
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
    assert.deepEqual(h.expireCalls, [stale.id], "an invalid reusable return origin is expired so its old URL cannot remain payable");
  }

  {
    const expired = openSession({ status: "expired", url: null });
    const h = buildPaymentAdapter({ retrievedSession: expired });
    await h.adapter.createConsumerPacketCheckout({
      userId: USER,
      item: eligibleItem({ checkoutSessionId: expired.id })
    });
    assert.equal(h.createCalls.length, 1);
    assert.equal(h.createCalls[0].options.idempotencyKey, `${PRODUCT}:${ITEM}:${"a".repeat(64)}:4:${expired.id}`);
  }

  {
    const h = buildPaymentAdapter({ persistOutcome: "refused" });
    await assert.rejects(
      h.adapter.createConsumerPacketCheckout({ userId: USER, item: eligibleItem() }),
      (error) => error?.name === "ConsumerCheckoutTemporarilyUnavailableError"
    );
    assert.equal(h.createCalls.length, 1);
    assert.equal(h.persistCalls.length, 1, "a Session is never returned until its exact DB binding persists");
    assert.deepEqual(h.expireCalls, ["cs_test_new"], "a Session created before failed verification CAS must be expired");
  }

  {
    const concurrent = buildPaymentAdapter();
    await Promise.all([
      concurrent.adapter.createConsumerPacketCheckout({ userId: USER, item: eligibleItem() }),
      concurrent.adapter.createConsumerPacketCheckout({ userId: USER, item: eligibleItem() })
    ]);
    assert.equal(
      concurrent.createCalls[0].options.idempotencyKey,
      concurrent.createCalls[1].options.idempotencyKey,
      "concurrent creates for one protected authority must converge on one Stripe idempotency key"
    );

    const stale = buildPaymentAdapter({ persistOutcome: "refused", verificationHash: "a".repeat(64), verificationRevision: 4 });
    await assert.rejects(
      stale.adapter.createConsumerPacketCheckout({ userId: USER, item: eligibleItem() }),
      (error) => error?.name === "ConsumerCheckoutTemporarilyUnavailableError"
    );
    const rederived = buildPaymentAdapter({ persistOutcome: "refused", verificationHash: "b".repeat(64), verificationRevision: 5 });
    await assert.rejects(
      rederived.adapter.createConsumerPacketCheckout({ userId: USER, item: eligibleItem() }),
      (error) => error?.name === "ConsumerCheckoutTemporarilyUnavailableError"
    );
    assert.notEqual(
      stale.createCalls[0].options.idempotencyKey,
      rederived.createCalls[0].options.idempotencyKey,
      "rederived protected authority after CAS refusal advances the Stripe idempotency key"
    );
  }

  {
    const h = buildPaymentAdapter({ persistOutcome: "unavailable" });
    await assert.rejects(
      h.adapter.createConsumerPacketCheckout({ userId: USER, item: eligibleItem() }),
      (error) => error?.name === "ConsumerCheckoutTemporarilyUnavailableError"
    );
    assert.deepEqual(h.expireCalls, [], "ambiguous binding transport failure cannot expire a Session that may have committed");
  }
}

async function protectedCasBehavior() {
  const calls = [];
  let refusePersist = false;
  let omitDraftOnRead = false;
  const snapshot = { schemaVersion: "expungement-ai/final-verification/v1", pathwayId: PATHWAY_ID };
  const draftSnapshot = {
    schemaVersion: "expungement-ai/protected-packet-draft/v1",
    capturedAt: "2026-08-26T00:00:00.000Z",
    jurisdiction: "PA",
    profileVersion: "1.3.0",
    profileAuthorityFingerprint: "c".repeat(64),
    requiredInputIds: [],
    packetFamilyIdentifiers: { mode: null, sourceFormIds: [] },
    screeningAnswers: {},
    packetAnswers: {},
    serverFacts: { jurisdiction: "PA", pathway_id: PATHWAY_ID },
    prefilledAnswers: {},
    dependencies: { commercialFlowVersion: 1, entitlementSource: "consumer_payment", productId: PRODUCT }
  };
  const admin = {
    async rpc(name, args) {
      calls.push({ name, args });
      if (name === "get_consumer_packet_verification_authority") {
        return { data: {
          status: "verified",
          reason: "explicit_final_verification",
          hash: "a".repeat(64),
          snapshot,
          revision: 4,
          ...(omitDraftOnRead ? {} : { draft_hash: "d".repeat(64), draft_snapshot: draftSnapshot })
        }, error: null };
      }
      if (name === "persist_consumer_packet_verification") {
        if (refusePersist) return { data: null, error: { message: "expected revision mismatch" } };
        return { data: { status: "verified", reason: "explicit_final_verification", hash: "b".repeat(64), snapshot, draft_hash: "d".repeat(64), draft_snapshot: draftSnapshot, revision: 5 }, error: null };
      }
      if (name === "get_consumer_packet_artifact_authority") {
        return { data: { status: "absent", revision: 0, verification_hash: null, entitlement_source: null, artifact: null }, error: null };
      }
      if (name === "attach_consumer_packet_artifact_if_verified") {
        return {
          data: {
            status: "ready",
            revision: 1,
            verification_hash: args.p_expected_verification_hash,
            entitlement_source: args.p_entitlement_source,
            artifact: args.p_artifact
          },
          error: null
        };
      }
      throw new Error(`unexpected protected CAS RPC ${name}`);
    }
  };
  const cas = loadTsWithMocks("src/lib/expungement-ai/verification-cas.ts", {
    "server-only": {},
    "@/lib/supabase/server": { getSupabaseAdminClient: () => admin }
  });

  const readVerification = await cas.readProtectedPacketVerification({ consumerAuthUserId: USER, briefcaseItemId: ITEM });
  assert.equal(readVerification.ok, true);
  assert.equal(readVerification.value.revision, 4);

  const transition = {
    expectedPriorHash: "a".repeat(64),
    expectedPriorRevision: 4,
    answerDelta: { court: "Court of Common Pleas" },
    packetInformationMetadata: { stage: "ready_to_generate", serverFacts: { jurisdiction: "PA", pathway_id: PATHWAY_ID } },
    nextVerification: {
      status: "verified",
      reason: "explicit_final_verification",
      hash: "b".repeat(64),
      snapshot,
      draftHash: "d".repeat(64),
      draftSnapshot,
      revision: 5
    }
  };
  const persisted = await cas.persistProtectedPacketVerification({
    consumerAuthUserId: USER,
    briefcaseItemId: ITEM,
    transition
  });
  assert.equal(persisted.ok, true);
  const persistCall = calls.find((call) => call.name === "persist_consumer_packet_verification");
  assert.equal(persistCall.args.p_expected_prior_revision, 4);
  assert.equal(persistCall.args.p_expected_prior_hash, "a".repeat(64));
  assert.deepEqual(persistCall.args.p_answer_delta, transition.answerDelta);
  assert.deepEqual(persistCall.args.p_next_verification_snapshot, snapshot);
  assert.equal(persistCall.args.p_next_draft_hash, "d".repeat(64));
  assert.deepEqual(persistCall.args.p_next_draft_snapshot, draftSnapshot);
  assert.ok(!("p_artifact_refs_patch" in persistCall.args), "stale full artifact patches cannot enter protected persistence");

  const missingDraftPersist = await cas.persistProtectedPacketVerification({
    consumerAuthUserId: USER,
    briefcaseItemId: ITEM,
    transition: {
      ...transition,
      nextVerification: {
        status: "verified",
        reason: "explicit_final_verification",
        hash: "b".repeat(64),
        snapshot,
        revision: 5
      }
    }
  });
  assert.deepEqual(missingDraftPersist, { ok: false, reason: "next_draft_required" });

  omitDraftOnRead = true;
  const missingDraftRead = await cas.readProtectedPacketVerification({
    consumerAuthUserId: USER,
    briefcaseItemId: ITEM
  });
  assert.deepEqual(missingDraftRead, { ok: false, reason: "protected_verification_authority_missing" });
  omitDraftOnRead = false;

  refusePersist = true;
  const beforeStale = calls.filter((call) => call.name === "persist_consumer_packet_verification").length;
  const stale = await cas.persistProtectedPacketVerification({ consumerAuthUserId: USER, briefcaseItemId: ITEM, transition });
  const afterStale = calls.filter((call) => call.name === "persist_consumer_packet_verification").length;
  assert.equal(stale.ok, false);
  assert.equal(afterStale - beforeStale, 1, "a stale verify is refused once and never retried over a later fact save");

  const artifactRead = await cas.readProtectedPacketArtifact({ consumerAuthUserId: USER, briefcaseItemId: ITEM });
  assert.equal(artifactRead.ok, true);
  assert.equal(artifactRead.value.status, "absent");
  const artifact = { provider: "rcap_source_engine", source: "source_driven_packet_plan", packetId: ITEM };
  const attached = await cas.attachConsumerPacketArtifactIfVerified({
    consumerAuthUserId: USER,
    briefcaseItemId: ITEM,
    expectedVerificationHash: "b".repeat(64),
    entitlementSource: "consumer_payment",
    artifact
  });
  assert.equal(attached.ok, true);
  assert.deepEqual(attached.value.artifact, artifact);
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
          reviewed_input_hash: "a".repeat(64),
          verification_hash: "a".repeat(64)
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
  sponsorship = null,
  protectedArtifactReady = false
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
    "@/lib/expungement-ai/consumer-payment-receipt": {
      stripeReceiptUrlForCheckoutSession: async () => "https://pay.stripe.com/receipts/fixture"
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
      requireCurrentPacketVerification: () => ({ hash: "a".repeat(64), snapshot: {} })
    },
    "@/lib/expungement-ai/verification-cas": {
      readProtectedPacketArtifact: async () => ({
        ok: true,
        value: protectedArtifactReady
          ? { status: "ready", revision: 1, verificationHash: "a".repeat(64), entitlementSource: "consumer_payment", artifact: { packetId: ITEM } }
          : { status: "absent", revision: 0, verificationHash: null, entitlementSource: null, artifact: null }
      })
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
    assert.equal(h.paymentCalls[0].expectedVerificationHash, "a".repeat(64), "payment entitlement carries the Checkout-bound verification hash");
    assert.equal(h.paymentCalls[0].receiptUrl, "https://pay.stripe.com/receipts/fixture", "verified Stripe authority records the provider receipt");
    assert.equal(h.renderCalls.length, 1, "signed payment must enqueue one durable render request");
    assert.equal(h.statusCalls[0].packetStatus, "pending", "webhook status remains pending until artifact completion");
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
    assert.equal(outcome, "recovered", "writable packet_status Ready cannot suppress protected recovery");
    assert.equal(h.renderCalls.length, 1);
    assert.equal(h.statusCalls[0].packetStatus, "pending", "ready is forbidden until protected artifact completion");
  }

  {
    const h = buildReconciliation({
      claim: "duplicate",
      paymentOutcome: "already_paid",
      protectedArtifactReady: true,
      item: eligibleItem({ checkoutSessionId: "cs_test_bound", packetStatus: "ready", paymentStatus: "paid" })
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
    serverFacts: { jurisdiction: "PA", pathway_id: PATHWAY_ID },
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
      protectedPacketInformationModelFor: () => model,
      requireCurrentPacketVerification: () => {
        if (model?.stage !== "ready_to_generate") throw new Error("current final verification is required");
        return {
          hash: "a".repeat(64),
          snapshot: { pathwayId: PATHWAY_ID, selectedTrackId: null, resultCode: "packet_ready", packetPlan: null },
          revision: 4
        };
      }
    },
    "@/lib/rcap/render/job-contract": {
      buildRenderJobSpec: (input) => {
        buildCalls.push(input);
        return {
          spec: {
            packetId: input.packetId,
            routeId: `PA:${PATHWAY_ID}`,
            rendererKind: "packet_document_v1",
            rendererVersion: "1.0.0",
            sourceSha256: null,
            profileId: "PA",
            profileVersion: "1.3.0",
            briefcaseItemId: ITEM,
            inputHash: "a".repeat(64)
          },
          route: { jurisdiction: "PA", pathwayId: PATHWAY_ID }
        };
      }
    },
    "@/lib/rcap/render/job-queue": {
      enqueueVerifiedConsumerRender: async (spec, identity, payload) => {
        enqueueCalls.push({ spec, identity, payload });
        return { id: "job_exact_matter" };
      }
    },
    "@/lib/rcap/render/consumer-delivery-control": {
      resolveConsumerDeliveryAccess: () => ({ allowed: true })
    },
    "@/lib/rcap/render/commercial-admission": {
      CommercialAdmissionDeniedError: class CommercialAdmissionDeniedError extends Error {},
      commercialRouteIdentity: ({ jurisdiction, pathwayId }) => ({
        routeId: `${jurisdiction}:${pathwayId}`,
        jurisdiction,
        pathwayId,
        packetFamilyId: "fixture-family"
      }),
      entitlementContext: (input) => input,
      finalVerificationSnapshotFrom: (input) => input,
      fulfillmentRequestContext: (input) => input,
      governCommercialAdmission: () => ({ admitted: true })
    },
    "@/lib/supabase/server": {
      getSupabaseAdminClient: () => supabase
    }
  });

  return {
    renderRequest,
    item,
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
    assert.equal(h.item.paymentStatus, "paid");
    assert.ok(!("commercialFlow" in (h.item.artifactRefs ?? {})), "post-payment render does not require the writable commercialFlow mirror");
    assert.equal(h.buildCalls.length, 2, "provisional and immutable-version packet specs are both built from the exact pathway");
    assert.equal(h.buildCalls[0].pathway, PATHWAY_ID);
    assert.equal(h.buildCalls[1].pathway, PATHWAY_ID);
    assert.equal(h.buildCalls[0].trackId, null);
    assert.equal(h.buildCalls[1].trackId, null);
    assert.equal(h.buildCalls[0].packetFields.participant_full_legal_name, "Alex Acceptance");
    assert.equal(h.buildCalls[0].packetFields.jurisdiction, "PA");
    assert.equal(h.packetRows.length, 0, "application performs no packet-row write before atomic enqueue");
    assert.equal(h.inputSnapshots.length, 0, "application performs no mutable input upsert before atomic enqueue");
    assert.equal(h.enqueueCalls.length, 1);
    assert.deepEqual(h.enqueueCalls[0].identity, {
      mode: "consumer",
      consumerBriefcaseItemId: ITEM,
      expectedConsumerAuthUserId: USER,
      personId: PERSON,
      matterId: MATTER,
      expectedVerificationHash: "a".repeat(64)
    });
    assert.equal(h.enqueueCalls[0].payload.renderPacket.pathway, "source_engine_packet_plan");
    assert.equal(h.enqueueCalls[0].payload.renderPacket.petitioner_first_name, "Alex");
    assert.equal(h.enqueueCalls[0].payload.renderPacket.petitioner_last_name, "Acceptance");
    assert.equal(h.enqueueCalls[0].payload.renderPacket.court_county, "Allegheny");
    assert.equal(h.enqueueCalls[0].payload.renderPacket.person_id, PERSON);
    assert.equal(h.enqueueCalls[0].payload.renderInputPayload.productId, PRODUCT);
    assert.equal(h.enqueueCalls[0].payload.renderInputPayload.matterId, MATTER);
    assert.equal(h.enqueueCalls[0].payload.renderInputPayload.pathwayId, PATHWAY_ID);
    assert.equal(h.enqueueCalls[0].payload.renderInputPayload.packetFields.charge, "Synthetic test charge");
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
  assert.ok(!renderRequest.includes('from("rcap_document_packet_inputs")'), "application cannot mutate worker inputs before CAS enqueue");
  assert.ok(renderRequest.includes("enqueueVerifiedConsumerRender(verifiedSpec"));
  assert.ok(renderRequest.includes("renderPacket,") && renderRequest.includes("renderInputPayload"));

  const packetGenerateButton = read("src/components/expungement-ai/PacketGenerateButton.tsx");
  assert.ok(packetGenerateButton.includes('mode: "sponsored_sync" | "paid_durable"'));
  assert.ok(packetGenerateButton.includes('"/api/expungement-ai/packet/render"'));
  assert.ok(packetGenerateButton.includes("durable && response.status !== 202"));
  const durableAccepted = packetGenerateButton.slice(
    packetGenerateButton.indexOf("if (durable) {"),
    packetGenerateButton.indexOf('trackFunnelEvent("packet_generated"')
  );
  assert.ok(durableAccepted.includes('setStatus("preparing")') && durableAccepted.includes("return;"));
  assert.ok(!durableAccepted.includes('trackFunnelEvent("packet_generated"'), "202 may mean preparing, never generated");
  const verificationClientPath = path.join(rootDir, "src/components/expungement-ai/packet-verification-client.ts");
  const verificationActionPath = path.join(rootDir, "src/components/expungement-ai/PacketVerificationAction.tsx");
  if (fs.existsSync(verificationClientPath) && fs.existsSync(verificationActionPath)) {
    const verificationClient = fs.readFileSync(verificationClientPath, "utf8");
    const verificationAction = fs.readFileSync(verificationActionPath, "utf8");
    assert.ok(verificationClient.includes("if (!verified)"), "no packet action exists before protected verification");
    assert.ok(verificationClient.includes('if (mode === "paid")'));
    assert.ok(verificationClient.includes('mode: "paid_durable"') && verificationClient.includes('label: "Prepare updated packet"'));
    assert.ok(verificationClient.includes("openPacket: packetReady"), "paid/sponsored Ready keeps immutable packet access");
    assert.ok(verificationClient.includes('packetReady ? null : { mode: "sponsored_sync"'), "sponsored Ready cannot duplicate generation");
    assert.ok(verificationAction.includes("const nextActions = packetVerificationActions({ verified, packetReady, mode })"));
    assert.ok(verificationAction.includes("nextActions.openPacket") && verificationAction.includes("Open my packet"));
    assert.ok(verificationAction.includes('nextActions.generation?.mode === "paid_durable"'));
    assert.ok(verificationAction.includes('mode="paid_durable"') && verificationAction.includes("label={nextActions.generation.label}"));
    assert.ok(verificationAction.includes('mode="sponsored_sync"'));
    assert.ok(verificationAction.includes("nextActions.checkout"));
  }

  const legacyPacketReturn = read("src/app/expungement-ai/packet-ready/page.tsx");
  assert.ok(legacyPacketReturn.includes("getBriefcaseItem") && legacyPacketReturn.includes("redirect("));
  assert.ok(!legacyPacketReturn.includes("generatePaidConsumerPacket"), "legacy success URL must not synchronously generate");
  assert.ok(!legacyPacketReturn.includes("recordConsumerPaymentConfirmation"), "browser return must not write payment");
  assert.ok(!legacyPacketReturn.includes("getConsumerCheckoutStatus"), "signed webhook state, not browser polling, is authoritative");

  const pendingClaim = read("src/app/api/expungement-ai/screening/pending/claim/route.ts");
  const legacySave = read("src/app/api/expungement-ai/screening/save-result/route.ts");
  const saveIntent = read("src/components/expungement-ai/BriefcaseSaveIntent.tsx");
  const briefcase = read("src/lib/expungement-ai/briefcase.ts");
  const claimService = read("src/lib/expungement-ai/claim/claim-service.ts");
  // Persistence moved into the one atomic claim transaction. The old shape wrote
  // the Briefcase item first and then tried to mark the pending result claimed,
  // which is the arrangement Contract SS4 forbids.
  assert.ok(pendingClaim.includes("claimPendingScreeningResult("));
  assert.ok(claimService.includes('supabase.rpc("claim_pending_screening_result"'));
  assert.ok(claimService.includes("clampAuthoritativeMatterInput"));
  assert.ok(!pendingClaim.includes('error: "briefcase_persistence_failed"'));
  assert.ok(pendingClaim.includes('claim.reason === "storage_unavailable" ? 503'));
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
await protectedCasBehavior();
await webhookBehavior();
await renderRequestBehavior();
sourceContracts();

console.log("Expungement.ai matter-level checkout guard tests passed.");
console.log("- Final review gates Checkout and exact matter metadata is persisted before return.");
console.log("- An open legacy Session is patched and reused; mismatches fail closed without duplication.");
console.log("- Signed events reject sponsored or conflicting evidence and enqueue durable Phase 53 work.");
console.log("- Reviewed packet fields are snapshotted, hashed and persisted into the worker source row.");
