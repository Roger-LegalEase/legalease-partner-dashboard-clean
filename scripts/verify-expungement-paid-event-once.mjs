import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// The paid number is the most important metric on the Command Center scoreboard, and it now has TWO
// producers for a single payment: the Stripe webhook (authoritative) and the polled payment-confirm
// route. This verifies they collapse to exactly ONE funnel event and ONE product event, with no
// database and no network.

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();
const failures = [];

const CHECKOUT_SESSION_ID = "cs_test_paid_once_123";
const AMOUNT_CENTS = 5000;

// In-memory stand-in for `web_analytics_events`, honoring the real ON CONFLICT DO NOTHING semantics.
const storedEventIds = new Set();
let upsertAttempts = 0;

stubModule("src/lib/supabase/server.ts", {
  getSupabaseAdminClient: () => ({
    from: () => ({
      upsert: (row) => ({
        select: async () => {
          upsertAttempts += 1;
          if (storedEventIds.has(row.event_id)) return { data: [], error: null };
          storedEventIds.add(row.event_id);
          return { data: [{ event_id: row.event_id }], error: null };
        }
      })
    })
  })
});

const checkoutAnalytics = loadTsModule(path.join(rootDir, "src/lib/expungement-ai/checkout-analytics.ts"));

const sentProductEvents = [];
globalThis.fetch = async (url, init) => {
  sentProductEvents.push({ url, body: JSON.parse(init.body) });
  return new Response(JSON.stringify({ ok: true, autoApplied: true }), {
    status: 202,
    headers: { "content-type": "application/json" }
  });
};

process.env.LEGALEASE_OS_EVENTS_ENABLED = "true";
process.env.LEGALEASE_OS_EVENTS_ENDPOINT = "https://command-center.test/api/events/product";
process.env.LEGALEASE_OS_EVENTS_SECRET = "local-only-test-secret";

try {
  await verifyBothProducersCountOnce();
  await verifyWebhookAloneStillCounts();
  await verifyDistinctPaymentsEachCount();
  verifySeedIsDefinedInExactlyOnePlace();
  verifyBothCallSitesUseTheSharedHelper();
} catch (error) {
  failures.push(error instanceof Error ? (error.stack ?? error.message) : String(error));
}

if (failures.length) {
  console.error("Paid-event single-count verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Paid-event single-count verification passed.");
console.log(
  "Webhook + polled confirm for one payment produce exactly one funnel row and one payment_completed product event; the webhook alone still counts; distinct payments each count."
);

// The whole point: both producers fire for the same payment, in either order.
async function verifyBothProducersCountOnce() {
  reset();

  // 1. Stripe webhook. No Request — Stripe posts to a host with no product surface.
  await checkoutAnalytics.recordConsumerCheckoutCompleted({
    request: null,
    checkoutSessionId: CHECKOUT_SESSION_ID,
    state: "MS",
    amountCents: AMOUNT_CENTS,
    mode: "stripe"
  });

  // 2. The user returns to packet-ready and the confirm route polls.
  await checkoutAnalytics.recordConsumerCheckoutCompleted({
    request: requestFrom("expungement.ai"),
    checkoutSessionId: CHECKOUT_SESSION_ID,
    state: "MS",
    amountCents: AMOUNT_CENTS,
    mode: "stripe"
  });

  assert(upsertAttempts === 2, `Both producers must attempt a write; saw ${upsertAttempts}.`);
  assert(storedEventIds.size === 1, `Both producers must collapse to one funnel row; saw ${storedEventIds.size}.`);
  assert(
    sentProductEvents.length === 1,
    `Exactly one payment_completed must reach the Command Center; saw ${sentProductEvents.length}. The paid metric would be double-counted.`
  );

  const payload = sentProductEvents[0].body;
  assert(payload.eventType === "payment_completed", `Expected payment_completed, saw ${payload.eventType}.`);
  assert(payload.product === "expungement_ai", "Paid event must be attributed to the expungement_ai product.");
  assert(payload.metadata.amount === AMOUNT_CENTS, `Revenue must be sent in cents; saw ${payload.metadata.amount}.`);
  assert(payload.state === "MS", "Paid event must carry the jurisdiction.");

  // Order independence: the confirm poll can beat the webhook.
  reset();
  await checkoutAnalytics.recordConsumerCheckoutCompleted({
    request: requestFrom("expungement.ai"),
    checkoutSessionId: CHECKOUT_SESSION_ID,
    amountCents: AMOUNT_CENTS
  });
  await checkoutAnalytics.recordConsumerCheckoutCompleted({
    request: null,
    checkoutSessionId: CHECKOUT_SESSION_ID,
    amountCents: AMOUNT_CENTS
  });
  assert(sentProductEvents.length === 1, "Confirm-then-webhook ordering must also count exactly once.");

  // Stripe redelivers webhooks; a third and fourth delivery must still not count.
  await checkoutAnalytics.recordConsumerCheckoutCompleted({ request: null, checkoutSessionId: CHECKOUT_SESSION_ID, amountCents: AMOUNT_CENTS });
  await checkoutAnalytics.recordConsumerCheckoutCompleted({ request: null, checkoutSessionId: CHECKOUT_SESSION_ID, amountCents: AMOUNT_CENTS });
  assert(sentProductEvents.length === 1, "Stripe webhook redelivery must never re-count a payment.");
}

// A user who pays and never returns must still register as paid. This is the gap the webhook closes,
// and it only works because the asserted surface survives a webhook Host with no product surface.
async function verifyWebhookAloneStillCounts() {
  reset();
  await checkoutAnalytics.recordConsumerCheckoutCompleted({
    request: null,
    checkoutSessionId: "cs_test_never_returned",
    amountCents: AMOUNT_CENTS
  });
  assert(sentProductEvents.length === 1, "A paid webhook with no user return must still count.");
  assert(sentProductEvents[0].body.product === "expungement_ai", "Webhook-only paid event must keep the product surface.");

  // A webhook arriving on a host that maps to a DIFFERENT product must not be misattributed.
  reset();
  await checkoutAnalytics.recordConsumerCheckoutCompleted({
    request: requestFrom("legaleasepartner.com"),
    checkoutSessionId: "cs_test_wrong_host",
    amountCents: AMOUNT_CENTS
  });
  assert(sentProductEvents.length === 1, "A paid event must survive an unrelated Host.");
  assert(
    sentProductEvents[0].body.product === "expungement_ai",
    "The asserted product surface must win over the request Host, or the paid event is misattributed."
  );
}

async function verifyDistinctPaymentsEachCount() {
  reset();
  for (const id of ["cs_a", "cs_b", "cs_c"]) {
    await checkoutAnalytics.recordConsumerCheckoutCompleted({ request: null, checkoutSessionId: id, amountCents: AMOUNT_CENTS });
  }
  assert(sentProductEvents.length === 3, `Three distinct payments must produce three paid events; saw ${sentProductEvents.length}.`);
  assert(storedEventIds.size === 3, "Distinct checkout sessions must not collide.");
}

// Dedupe holds only while both producers derive the SAME seed. Keep that derivation in one file.
function verifySeedIsDefinedInExactlyOnePlace() {
  const helper = read("src/lib/expungement-ai/checkout-analytics.ts");
  assert(helper.includes("idempotencySeed: options.checkoutSessionId"), "The helper must seed idempotency with the checkout session id.");

  for (const callSite of [
    "src/lib/expungement-ai/checkout-reconciliation.ts",
    "src/app/api/expungement-ai/payment/confirm/route.ts"
  ]) {
    const source = read(callSite);
    assert(
      !source.includes("idempotencySeed"),
      `${callSite} must not define its own idempotency seed — a divergent seed silently doubles the paid metric.`
    );
    assert(
      !source.includes('recordServerFunnelEvent(request, "checkout_completed"'),
      `${callSite} must not emit checkout_completed directly; it must go through recordConsumerCheckoutCompleted.`
    );
  }
}

function verifyBothCallSitesUseTheSharedHelper() {
  const reconciliation = read("src/lib/expungement-ai/checkout-reconciliation.ts");
  assert(reconciliation.includes("scheduleConsumerCheckoutCompleted"), "The Stripe webhook path must emit the paid event.");
  // Serverless freezes the invocation once the response is sent; a floating promise never runs.
  assert(!reconciliation.includes("void recordConsumerCheckoutCompleted"), "The webhook must schedule the paid event with after(), not a floating promise.");
  // Payment state must be durable before we tell the scoreboard it was paid.
  const finalizeBody = reconciliation.slice(reconciliation.indexOf("async function finalizePaidCheckoutSession"));
  assert(
    finalizeBody.indexOf("updateBriefcasePaymentMetadataForWebhook") < finalizeBody.indexOf("scheduleConsumerCheckoutCompleted"),
    "The paid event must be emitted only after the payment state is recorded."
  );

  const confirm = read("src/app/api/expungement-ai/payment/confirm/route.ts");
  assert(confirm.includes("scheduleConsumerCheckoutCompleted"), "The confirm route must emit the paid event off the response path.");
  assert(!confirm.includes("void recordConsumerCheckoutCompleted"), "The confirm route must not use a floating promise for egress.");

  const helper = read("src/lib/expungement-ai/checkout-analytics.ts");
  assert(helper.includes("after(() => recordConsumerCheckoutCompleted"), "The scheduler must use after() so the egress survives the response.");
}

function reset() {
  storedEventIds.clear();
  sentProductEvents.length = 0;
  upsertAttempts = 0;
}

function requestFrom(host) {
  return new Request(`https://${host}/api/x`, { headers: { host } });
}

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function stubModule(relativePath, exports) {
  const resolved = path.join(rootDir, relativePath);
  moduleCache.set(resolved, { exports });
}

function loadTsModule(filename) {
  const resolved = path.resolve(filename);
  const cached = moduleCache.get(resolved);
  if (cached) return cached.exports;

  const source = fs.readFileSync(resolved, "utf8");
  let transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  transpiled = transpiled.replaceAll("import.meta.url", "require(\"node:url\").pathToFileURL(__filename).href");

  const mod = new Module(resolved);
  const compiledFilename = resolved + ".cjs";
  mod.filename = compiledFilename;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  moduleCache.set(resolved, mod);
  mod.require = (request) => {
    if (request === "server-only") return {};
    const nextFile = resolveTsRequest(request, path.dirname(resolved));
    if (nextFile?.endsWith(".json")) return require(nextFile);
    return nextFile ? loadTsModule(nextFile) : require(request);
  };
  mod._compile(transpiled, compiledFilename);
  return mod.exports;
}

function resolveTsRequest(request, basedir) {
  if (request.startsWith("@/")) {
    return resolveExistingModuleFile(path.join(rootDir, "src", request.slice(2)));
  }
  if (request.startsWith(".")) {
    return resolveExistingModuleFile(path.resolve(basedir, request));
  }
  return null;
}

function resolveExistingModuleFile(candidate) {
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  for (const extension of [".ts", ".tsx", ".js", ".json"]) {
    if (fs.existsSync(`${candidate}${extension}`)) return `${candidate}${extension}`;
  }
  for (const indexFile of ["index.ts", "index.tsx", "index.js"]) {
    const file = path.join(candidate, indexFile);
    if (fs.existsSync(file)) return file;
  }
  return null;
}
