#!/usr/bin/env node
// Behavioural tests for the three defects that stopped the live $0 order.
//
// The live order failed with a Stripe fault reported at the
// `expire_unbound_new_session` phase. That was never the cause. The matter had
// a Checkout Session id stored that no longer existed at Stripe; the adapter
// correctly proved it absent, and then wrote the replacement through the
// INITIAL binding writer — which refuses any new id once the row holds one. The
// refusal was real, the tidy-up expiry that followed also failed, and only the
// tidy-up's error survived to be reported.
//
// Three behaviours are proven here, against the real module rather than a
// description of it. Stripe and the payment-authority writers are deterministic
// in-memory doubles; no provider and no hosted project is contacted.
//
//   1. A Session proven absent from the verified account is REPLACED through
//      the compare-and-swap writer, naming the exact old stored id.
//   2. An idempotent create whose replayed body says `open` is read back from
//      the provider, and an expired replay earns exactly one deterministic
//      successor rather than a bound dead Session.
//   3. A binding refusal is the reported cause even when the cleanup expiry
//      fails too.

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
  mod.require = (specifier) => {
    if (specifier in mocks) return mocks[specifier];
    if (specifier.startsWith("@/")) {
      throw new Error(`test harness is missing a mock for ${specifier}`);
    }
    return require(specifier);
  };
  mod._compile(transpiled, compiledFilename);
  return mod.exports;
}

const USER = "11111111-1111-4111-8111-111111111111";
const ITEM = "22222222-2222-4222-8222-222222222222";
const PERSON = "33333333-3333-4333-8333-333333333333";
const MATTER = "44444444-4444-4444-8444-444444444444";
const PRODUCT = "expungement_packet";
const PATHWAY_ID = "pa-path-a-non-conviction-expungement";
const APP_ORIGIN = "https://example.invalid";
const ACCOUNT = "acct_testdouble00000";
const HASH = "a".repeat(64);
const REVISION = 4;

// The verified-absence branch will only conclude absence when the account this
// deployment is holding a key for is positively identified as the one it sells
// through. The double answers with this account, and the environment expects it.
process.env.STRIPE_ACCOUNT_ID = ACCOUNT;

/** A Stripe API error as stripe-node surfaces it. */
function stripeError({ code = null, statusCode = 400, type = "invalid_request_error", requestId = "req_test" } = {}) {
  return Object.assign(new Error("stripe refused"), { type, code, param: null, statusCode, requestId });
}

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

function openSession(id) {
  return { id, mode: "payment", status: "open", url: `https://checkout.stripe.com/c/pay/${id}` };
}

/**
 * @param sessions   id -> session object, or a function that may throw
 * @param creates    ordered list of session objects the create call returns
 * @param replace    the compare-and-swap writer's answer
 * @param persist    the initial writer's answer
 * @param expire     optional error the expire call throws
 */
function buildAdapter({
  sessions = {},
  creates = [],
  replace = { outcome: "replaced" },
  persist = { outcome: "bound" },
  expireThrows = null,
  // Shared across two adapters to model two concurrent requests talking to the
  // SAME Stripe: an idempotency key one of them has already used hands the
  // other the identical Session, which is the whole point of the key.
  idempotency = new Map()
} = {}) {
  const createCalls = [];
  const retrieveCalls = [];
  const expireCalls = [];
  const persistCalls = [];
  const replaceCalls = [];
  const queued = [...creates];

  const stripeClient = {
    accounts: { retrieve: async () => ({ id: ACCOUNT }) },
    checkout: {
      sessions: {
        create: async (params, options) => {
          createCalls.push({ params, options });
          const key = options?.idempotencyKey;
          // A real idempotent create returns the STORED response body for a key
          // it has seen, whatever that object's status has since become.
          if (key && idempotency.has(key)) return idempotency.get(key);
          const next = queued.shift();
          if (!next) throw new Error("test double ran out of sessions to create");
          if (key) idempotency.set(key, next.createResponse ?? next);
          return next.createResponse ?? next;
        },
        retrieve: async (id, params) => {
          retrieveCalls.push({ id, params });
          const entry = sessions[id];
          if (typeof entry === "function") return entry();
          if (!entry) throw stripeError({ code: "resource_missing", statusCode: 404 });
          return entry;
        },
        expire: async (id) => {
          expireCalls.push(id);
          if (expireThrows) throw expireThrows;
          return { id, status: "expired" };
        }
      }
    }
  };

  const adapter = loadTsWithMocks("src/lib/expungement-ai/payment-adapter.ts", {
    "server-only": {},
    "@/lib/app-url": { absoluteExpungementAiUrl: (pathname) => `${APP_ORIGIN}/expungement-ai${pathname}` },
    "@/lib/stripe/server": {
      getStripeServerClient: () => stripeClient,
      isProductionRuntime: () => false,
      isStripeConfigurationError: (error) => error?.name === "StripeConfigurationError",
      stripeSecretKeyIsLiveMode: () => false
    },
    "@/lib/server-runtime-environment": { resolveDeploymentEnvironment: () => "preview" },
    "@/lib/expungement-ai/eligibility-adapter": { isConsumerPaymentAllowed: () => true },
    "@/lib/rcap/documents/guidance-packet-registry": {
      componentDeferralForTrack: () => null,
      exactDeferralForPathway: () => null,
      exactDeferralForTrack: () => null,
      terminalTreatmentForTrack: () => null
    },
    "@/lib/rcap/documents/packet-route-resolver": {
      packetRouteCanRender: () => true,
      resolvePacketRoute: () => ({ kind: "factory_v2", canRender: true })
    },
    "@/lib/expungement-ai/packet-fulfillment-authority": { assertPacketFulfillmentProven: () => {} },
    "@/lib/rcap/render/commercial-admission": {
      commercialRouteIdentity: () => ({ packetFamilyId: "pa_custom_pleading" }),
      finalVerificationSnapshotFrom: () => ({}),
      fulfillmentRequestContext: (input) => input,
      governCommercialAdmission: () => {},
      isOperationallySellable: () => true
    },
    "@/lib/expungement-ai/briefcase": { getBriefcaseItem: async () => null },
    "@/lib/expungement-ai/consumer-identity": {
      resolveConsumerPersonId: async () => ({ ok: true, personId: PERSON }),
      consumerMatterIdForItem: () => MATTER
    },
    "@/lib/expungement-ai/packet-information": {
      requireCurrentPacketVerification: () => ({
        hash: HASH,
        revision: REVISION,
        snapshot: {
          jurisdiction: "PA",
          pathwayId: PATHWAY_ID,
          selectedTrackId: null,
          treatmentClassification: null,
          deferralComponentIds: [],
          packetType: "custom_pleading",
          resultCode: "packet_ready",
          paymentAllowed: true,
          packetPlan: null
        }
      })
    },
    "@/lib/expungement-ai/consumer-payment-authority": {
      CONSUMER_PACKET_PRODUCT_ID: PRODUCT,
      persistConsumerCheckoutBinding: async (input) => {
        persistCalls.push(input);
        return persist;
      },
      replaceConsumerCheckoutSession: async (input) => {
        replaceCalls.push(input);
        return typeof replace === "function" ? replace(input) : replace;
      }
    },
    // Every case here starts from a matter with either no stored Session or one
    // that resolves to nothing, so the reuse reconciliation is never reached. It
    // throws rather than answering, so a future case cannot quietly lean on a
    // stub standing in for the real pricing and binding reconciliation.
    "@/lib/expungement-ai/consumer-order-reconciliation": {
      reconcileConsumerOrder: () => {
        throw new Error("no case in this suite reuses a stored Session; the real reconciliation is not stubbed");
      }
    },
    "@/lib/expungement-ai/consumer-packet-catalog": {
      confirmCatalogProduct: async () => {},
      expectedCatalogProductId: () => null,
      isConsumerPacketCatalogError: () => false,
      lineItemProductId: () => null
    }
  });

  return { adapter, createCalls, retrieveCalls, expireCalls, persistCalls, replaceCalls };
}

let passed = 0;
const ok = (label) => {
  console.log(`ok   ${label}`);
  passed += 1;
};

const OLD_ABSENT = "cs_live_old_absent";
const baseKey = `${PRODUCT}:${ITEM}:${HASH}:${REVISION}:${OLD_ABSENT}:inline`;

// ---------------------------------------------------------------------------
// 1. A Session proven absent from the verified account is REPLACED, not re-bound
// ---------------------------------------------------------------------------
{
  const NEW = "cs_live_new";
  const h = buildAdapter({
    // OLD_ABSENT is deliberately absent from the store: retrieving it answers
    // `resource_missing`, which against the verified account is absence.
    sessions: { [NEW]: openSession(NEW) },
    creates: [openSession(NEW)]
  });
  const result = await h.adapter.createConsumerPacketCheckout({
    userId: USER,
    item: eligibleItem({ checkoutSessionId: OLD_ABSENT })
  });

  assert.equal(h.persistCalls.length, 0,
    "the INITIAL binding writer must not be used when the row still holds a Session id — it refuses, and that refusal is what broke the live order");
  ok("verified absence does not use the initial binding writer");

  assert.equal(h.replaceCalls.length, 1, "the compare-and-swap writer is used, exactly once");
  ok("verified absence uses the compare-and-swap writer");

  assert.equal(h.replaceCalls[0].expectedCheckoutSessionId, OLD_ABSENT,
    "the swap must name the exact id the database row still carries, not null and not the new id");
  ok("the compare-and-swap names the exact old stored session id");

  assert.equal(h.replaceCalls[0].checkoutSessionId, NEW);
  assert.equal(h.replaceCalls[0].expectedVerificationHash, HASH);
  assert.equal(result.checkoutSessionId, NEW);
  assert.equal(result.outcome, "checkout_created");
  ok("the new session becomes the stored session id");

  assert.deepEqual(result.storedSessionRecovery, {
    phase: "recover_completed_session",
    type: "invalid_request_error",
    code: "resource_missing",
    param: null,
    statusCode: 404,
    requestId: "req_test"
  }, "the original provider classification of the absent lookup must survive onto the response");
  ok("storedSessionRecovery preserves the original resource_missing classification");

  assert.equal(h.createCalls.length, 1, "exactly one Session is created");
  assert.equal(h.expireCalls.length, 0, "a Session that bound successfully is never expired");
  ok("no duplicate Session is created and none becomes authoritative");
}

// A paid matter can never be replaced, however the stored id resolves.
{
  const h = buildAdapter({ creates: [openSession("cs_live_never")] });
  const result = await h.adapter.createConsumerPacketCheckout({
    userId: USER,
    item: eligibleItem({ paymentStatus: "paid", checkoutSessionId: OLD_ABSENT })
  });
  assert.equal(result.alreadyPaid, true);
  assert.equal(h.createCalls.length, 0);
  assert.equal(h.replaceCalls.length, 0, "a paid matter must never have its Session replaced");
  assert.equal(h.persistCalls.length, 0);
  ok("a paid matter can never be replaced");
}

// ---------------------------------------------------------------------------
// 2. An idempotent create is read back, and an expired replay earns ONE successor
// ---------------------------------------------------------------------------
{
  const REPLAYED = "cs_live_replayed";
  const SUCCESSOR = "cs_live_successor";
  const h = buildAdapter({
    sessions: {
      // What the replayed create SAYS, versus what the Session actually is now.
      [REPLAYED]: { id: REPLAYED, mode: "payment", status: "expired", url: null },
      [SUCCESSOR]: openSession(SUCCESSOR)
    },
    // The create response body is the one Stripe stored at the first use of the
    // key: `open`, with a URL. It is a lie about the present.
    creates: [openSession(REPLAYED), openSession(SUCCESSOR)]
  });
  const result = await h.adapter.createConsumerPacketCheckout({
    userId: USER,
    item: eligibleItem({ checkoutSessionId: OLD_ABSENT })
  });

  assert.ok(h.retrieveCalls.some((call) => call.id === REPLAYED),
    "the Session the create returned must be read back from the provider, not trusted");
  ok("the created Session is freshly retrieved instead of trusting the create response");

  assert.ok(!h.replaceCalls.some((call) => call.checkoutSessionId === REPLAYED),
    "an expired Session must never be bound");
  assert.ok(!h.persistCalls.some((call) => call.checkoutSessionId === REPLAYED));
  ok("the expired replayed Session is never bound");

  assert.equal(h.createCalls.length, 2, "exactly one successor is created — no loop, no retry storm");
  assert.equal(h.createCalls[0].options.idempotencyKey, baseKey);
  assert.equal(h.createCalls[1].options.idempotencyKey, `${baseKey}:successor:${REPLAYED}`,
    "the successor key is derived from the expired Session's own id, so concurrent requests derive the same one");
  ok("exactly one deterministic successor is created under <base>:successor:<expired-session-id>");

  assert.ok(h.retrieveCalls.some((call) => call.id === SUCCESSOR),
    "the successor is freshly retrieved too — its key may itself be a replay");
  ok("the successor Session is freshly retrieved");

  assert.equal(h.replaceCalls.length, 1);
  assert.equal(h.replaceCalls[0].expectedCheckoutSessionId, OLD_ABSENT);
  assert.equal(h.replaceCalls[0].checkoutSessionId, SUCCESSOR);
  assert.equal(result.checkoutSessionId, SUCCESSOR);
  assert.equal(result.checkoutUrl, `https://checkout.stripe.com/c/pay/${SUCCESSOR}`);
  ok("the successor is the Session that is compare-and-swapped in and returned");
}

// The successor key carries nothing random: the same inputs derive it again.
{
  const REPLAYED = "cs_live_replayed";
  const keys = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const h = buildAdapter({
      sessions: {
        [REPLAYED]: { id: REPLAYED, mode: "payment", status: "expired", url: null },
        cs_live_successor: openSession("cs_live_successor")
      },
      creates: [openSession(REPLAYED), openSession("cs_live_successor")]
    });
    await h.adapter.createConsumerPacketCheckout({
      userId: USER,
      item: eligibleItem({ checkoutSessionId: OLD_ABSENT })
    });
    keys.push(h.createCalls[1].options.idempotencyKey);
  }
  assert.equal(keys[0], keys[1], "the successor key must be deterministic, never a fresh random retry key");
  ok("the successor idempotency key is deterministic across attempts");
}

// A successor that is ALSO unusable refuses. It does not try a third time.
{
  const REPLAYED = "cs_live_replayed";
  const SUCCESSOR = "cs_live_successor";
  const h = buildAdapter({
    sessions: {
      [REPLAYED]: { id: REPLAYED, mode: "payment", status: "expired", url: null },
      [SUCCESSOR]: { id: SUCCESSOR, mode: "payment", status: "expired", url: null }
    },
    creates: [openSession(REPLAYED), openSession(SUCCESSOR)]
  });
  await assert.rejects(
    h.adapter.createConsumerPacketCheckout({ userId: USER, item: eligibleItem({ checkoutSessionId: OLD_ABSENT }) }),
    (error) => error?.name === "ConsumerCheckoutTemporarilyUnavailableError"
  );
  assert.equal(h.createCalls.length, 2, "there is one successor attempt and no loop");
  assert.equal(h.replaceCalls.length, 0, "nothing unusable is bound");
  ok("an unusable successor refuses rather than looping");
}

// ---------------------------------------------------------------------------
// 3. Losing the compare-and-swap race
// ---------------------------------------------------------------------------

// (A) SAME-ID convergence. Creation is idempotent, so two concurrent requests
//     deriving the same key are handed the SAME Session. One wins the swap and
//     that id becomes authoritative; the other is told `conflicted` with the
//     winning id -- which is the id it is itself holding. Expiring it would
//     destroy the order the winner just recorded.
{
  const WON = "cs_live_converged";
  // One Stripe, two requests: the shared idempotency store is what makes the
  // second create hand back the first request's Session rather than a new one.
  const stripe = new Map();
  const shared = {
    sessions: { [OLD_ABSENT]: undefined, [WON]: openSession(WON) },
    creates: [openSession(WON)],
    idempotency: stripe
  };

  const winnerRequest = buildAdapter({ ...shared, replace: { outcome: "replaced" } });
  const first = await winnerRequest.adapter.createConsumerPacketCheckout({
    userId: USER,
    item: eligibleItem({ checkoutSessionId: OLD_ABSENT })
  });
  assert.equal(first.checkoutSessionId, WON);

  // The second request reaches Stripe with the same key and is handed the same
  // Session; its swap then finds OLD already replaced, by that very id.
  const loserRequest = buildAdapter({
    ...shared,
    replace: { outcome: "conflicted", winningCheckoutSessionId: WON }
  });
  const second = await loserRequest.adapter.createConsumerPacketCheckout({
    userId: USER,
    item: eligibleItem({ checkoutSessionId: OLD_ABSENT })
  });

  assert.equal(loserRequest.createCalls.length, 1);
  assert.equal(loserRequest.createCalls[0].options.idempotencyKey, baseKey,
    "both requests derive the same deterministic key, which is why they converge");
  assert.equal(loserRequest.replaceCalls[0].checkoutSessionId, WON,
    "the loser is holding the very Session that won");
  ok("two concurrent requests converge on one Session through the deterministic key");

  assert.deepEqual(loserRequest.expireCalls, [],
    "the winning Session must never be expired -- doing so leaves the matter storing a Session nobody can pay");
  ok("the loser does not expire the winning Session when it is its own");

  assert.ok(loserRequest.retrieveCalls.some((call) => call.id === WON),
    "the winner is freshly retrieved before anything is returned");
  ok("the winner is freshly retrieved");

  assert.equal(second.outcome, "checkout_reused");
  assert.equal(second.checkoutSessionId, WON);
  assert.equal(second.checkoutUrl, `https://checkout.stripe.com/c/pay/${WON}`);
  ok("an OPEN winner is returned to the loser as checkout_reused");
}

// A COMPLETE winner that is this request's own Session is reported as pending,
// and is likewise never expired.
{
  const WON = "cs_live_converged_complete";
  // Open when this request reads back what it created; complete by the time it
  // reads the winner, because the request that won the swap was paid in between.
  let reads = 0;
  const h = buildAdapter({
    sessions: {
      [WON]: () => (reads++ === 0
        ? openSession(WON)
        : { id: WON, mode: "payment", status: "complete", url: null })
    },
    creates: [openSession(WON)],
    replace: { outcome: "conflicted", winningCheckoutSessionId: WON }
  });
  const result = await h.adapter.createConsumerPacketCheckout({
    userId: USER,
    item: eligibleItem({ checkoutSessionId: OLD_ABSENT })
  });
  assert.equal(result.outcome, "payment_pending");
  assert.equal(result.paymentPending, true);
  assert.equal(result.checkoutSessionId, WON);
  assert.deepEqual(h.expireCalls, [], "money already collected is never expired");
  ok("a COMPLETE winner that is this request's own Session is reported as pending, not expired");
}

// A winner that is this request's own Session but is neither open nor complete
// refuses -- and is still not expired, because it is the authoritative order.
{
  const WON = "cs_live_converged_odd";
  let reads = 0;
  const h = buildAdapter({
    sessions: {
      [WON]: () => (reads++ === 0
        ? openSession(WON)
        : { id: WON, mode: "payment", status: "expired", url: null })
    },
    creates: [openSession(WON)],
    replace: { outcome: "conflicted", winningCheckoutSessionId: WON }
  });
  let thrown = null;
  try {
    await h.adapter.createConsumerPacketCheckout({ userId: USER, item: eligibleItem({ checkoutSessionId: OLD_ABSENT }) });
  } catch (error) {
    thrown = error;
  }
  assert.equal(thrown?.name, "ConsumerCheckoutTemporarilyUnavailableError");
  assert.deepEqual(thrown.bindingFailure, {
    operation: "replacement",
    outcome: "conflicted",
    reason: "checkout_replacement_conflict"
  });
  assert.deepEqual(h.expireCalls, [], "an unusable winner is still the stored order, and expiring it helps nobody");
  ok("an unusable winner refuses without expiring the authoritative Session");
}

// (B) DIFFERENT-ID conflict. Here this request really is holding a Session
//     nobody recorded, so that one -- and only that one -- is expired.
{
  const MINE = "cs_live_mine";
  const WON = "cs_live_theirs";
  const h = buildAdapter({
    sessions: { [MINE]: openSession(MINE), [WON]: openSession(WON) },
    creates: [openSession(MINE)],
    replace: { outcome: "conflicted", winningCheckoutSessionId: WON }
  });
  const result = await h.adapter.createConsumerPacketCheckout({
    userId: USER,
    item: eligibleItem({ checkoutSessionId: OLD_ABSENT })
  });

  assert.deepEqual(h.expireCalls, [MINE], "only this request's own losing Session is expired");
  assert.ok(!h.expireCalls.includes(WON), "the winner is never expired");
  ok("a genuinely different losing Session is expired, and only it");

  assert.ok(h.retrieveCalls.some((call) => call.id === WON));
  assert.equal(result.outcome, "checkout_reused");
  assert.equal(result.checkoutSessionId, WON);
  ok("the winner is retrieved and reused");
}

// The losing expiry failing does not change what is reported: the conflict is
// still the primary cause when the winner cannot be handed back.
{
  const MINE = "cs_live_mine";
  const WON = "cs_live_theirs";
  const h = buildAdapter({
    sessions: { [MINE]: openSession(MINE) },
    creates: [openSession(MINE)],
    replace: { outcome: "conflicted", winningCheckoutSessionId: WON },
    expireThrows: stripeError({ code: null, statusCode: 400, requestId: "req_lost_cleanup" })
  });
  let thrown = null;
  try {
    await h.adapter.createConsumerPacketCheckout({ userId: USER, item: eligibleItem({ checkoutSessionId: OLD_ABSENT }) });
  } catch (error) {
    thrown = error;
  }
  assert.deepEqual(h.expireCalls, [MINE]);
  assert.deepEqual(thrown?.bindingFailure, {
    operation: "replacement",
    outcome: "conflicted",
    reason: "checkout_replacement_conflict"
  });
  assert.equal(thrown?.cleanupFailure?.phase, "expire_lost_replacement_session");
  assert.equal(thrown?.cleanupFailure?.requestId, "req_lost_cleanup");
  assert.equal(thrown?.providerFailure?.phase, "retrieve_winning_session",
    "the provider call that actually blocked this request is the winner read, not the tidy-up");
  ok("a failed losing-session expiry stays secondary to the conflict");
}

// No winner at all: this request's unbound Session is cleaned up and the
// conflict is the primary failure.
{
  const MINE = "cs_live_mine";
  const h = buildAdapter({
    sessions: { [MINE]: openSession(MINE) },
    creates: [openSession(MINE)],
    replace: { outcome: "conflicted", winningCheckoutSessionId: null }
  });
  let thrown = null;
  try {
    await h.adapter.createConsumerPacketCheckout({ userId: USER, item: eligibleItem({ checkoutSessionId: OLD_ABSENT }) });
  } catch (error) {
    thrown = error;
  }
  assert.deepEqual(h.expireCalls, [MINE], "with no winner named, this request's own Session is the one to clean up");
  assert.deepEqual(thrown?.bindingFailure, {
    operation: "replacement",
    outcome: "conflicted",
    reason: "checkout_replacement_conflict"
  });
  assert.equal(thrown?.cleanupFailure, null);
  ok("a conflict naming no winner cleans up this request's Session and reports the conflict");
}

// ---------------------------------------------------------------------------
// 4. A cleanup failure never becomes the reported cause
// ---------------------------------------------------------------------------
{
  const NEW = "cs_live_new";
  const h = buildAdapter({
    sessions: { [NEW]: openSession(NEW) },
    creates: [openSession(NEW)],
    replace: { outcome: "refused", reason: "checkout_binding_invalid" },
    expireThrows: stripeError({ code: null, statusCode: 400, requestId: "req_cleanup" })
  });
  let thrown = null;
  try {
    await h.adapter.createConsumerPacketCheckout({ userId: USER, item: eligibleItem({ checkoutSessionId: OLD_ABSENT }) });
  } catch (error) {
    thrown = error;
  }

  assert.ok(thrown, "the request must refuse");
  assert.equal(thrown.name, "ConsumerCheckoutTemporarilyUnavailableError");
  assert.deepEqual(thrown.bindingFailure, {
    operation: "replacement",
    outcome: "refused",
    reason: "checkout_binding_invalid"
  }, "the compare-and-swap refusal is the primary cause and must be reported as such");
  ok("a refused replacement is preserved as the primary bindingFailure");

  assert.equal(h.expireCalls.length, 1, "the unbound Session is still expired");
  assert.equal(thrown.cleanupFailure?.phase, "expire_unbound_new_session");
  assert.equal(thrown.cleanupFailure?.type, "invalid_request_error");
  assert.equal(thrown.cleanupFailure?.requestId, "req_cleanup");
  ok("the cleanup failure is reported separately, as cleanupFailure");

  assert.equal(thrown.providerFailure, null,
    "providerFailure names only the provider operation that caused the PRIMARY refusal — a failed tidy-up is not one");
  ok("the cleanup failure cannot replace the primary binding failure");
}

{
  const NEW = "cs_live_new";
  const h = buildAdapter({
    sessions: { [NEW]: openSession(NEW) },
    creates: [openSession(NEW)],
    persist: { outcome: "refused", reason: "checkout_binding_conflict" },
    expireThrows: stripeError({ code: null, statusCode: 400, requestId: "req_cleanup" })
  });
  let thrown = null;
  try {
    await h.adapter.createConsumerPacketCheckout({ userId: USER, item: eligibleItem() });
  } catch (error) {
    thrown = error;
  }
  assert.deepEqual(thrown?.bindingFailure, {
    operation: "initial_bind",
    outcome: "refused",
    reason: "checkout_binding_conflict"
  });
  assert.equal(thrown?.cleanupFailure?.phase, "expire_unbound_new_session");
  assert.equal(thrown?.providerFailure, null);
  ok("a refused initial bind is preserved the same way, and named as initial_bind");
}

// A database message is never passed outward as a reason.
{
  const NEW = "cs_live_new";
  const rawMessage = 'duplicate key value violates unique constraint "briefcase_items_checkout_session_id_key"';
  const h = buildAdapter({
    sessions: { [NEW]: openSession(NEW) },
    creates: [openSession(NEW)],
    replace: { outcome: "unavailable", reason: rawMessage }
  });
  let thrown = null;
  try {
    await h.adapter.createConsumerPacketCheckout({ userId: USER, item: eligibleItem({ checkoutSessionId: OLD_ABSENT }) });
  } catch (error) {
    thrown = error;
  }
  assert.equal(thrown?.bindingFailure?.operation, "replacement");
  assert.equal(thrown?.bindingFailure?.outcome, "unavailable");
  assert.equal(thrown?.bindingFailure?.reason, "checkout_replacement_refused",
    "an unrecognised reason is reported as its generic classification");
  assert.ok(!JSON.stringify(thrown.bindingFailure).includes("constraint"),
    "no database message, SQL fragment or free provider text may travel outward");
  ok("an unrecognised reason is reduced to a bounded classification token");
}

console.log(`test-consumer-checkout-binding-recovery passed: ${passed}/${passed}`);
