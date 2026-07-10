import { createHmac } from "node:crypto";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Verifies the Command Center product-event emitter + bridge without network access:
// payload shape, HMAC signature, retry replay semantics, PII posture, event mapping, and the
// `stored` gate that keeps retried deliveries from double-counting revenue.

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();
const failures = [];

const productEvents = loadTsModule(path.join(rootDir, "src/lib/analytics/product-events.ts"));
const bridge = loadTsModule(path.join(rootDir, "src/lib/analytics/command-center-bridge.ts"));

const SECRET = "local-only-test-secret";
const ENDPOINT = "https://command-center.test/api/events/product";
const enabledEnv = {
  LEGALEASE_OS_EVENTS_ENABLED: "true",
  LEGALEASE_OS_EVENTS_ENDPOINT: ENDPOINT,
  LEGALEASE_OS_EVENTS_SECRET: SECRET
};
const fixedNow = new Date("2026-07-09T12:00:00.000Z");

const baseRow = {
  event_id: "b3f1c2d4-5e6a-4b7c-8d9e-0f1a2b3c4d5e",
  occurred_at: "2026-07-09T11:59:00.000Z",
  domain: "expungement.ai",
  product_surface: "expungement_ai",
  event_name: "pageview",
  path: "/",
  query: null,
  page_title: null,
  referrer_domain: null,
  referrer_url: null,
  utm_source: "google",
  utm_medium: null,
  utm_campaign: "summer-clean",
  utm_term: null,
  utm_content: null,
  visitor_id: "11111111-2222-4333-8444-555555555555",
  session_id: "66666666-7777-4888-8999-aaaaaaaaaaaa",
  user_id: null,
  partner_slug: null,
  jurisdiction: "MS",
  device_type: "desktop",
  user_agent_family: "chrome",
  ip_hash: null,
  country: "US",
  region: null,
  event_meta: {}
};

const row = (overrides) => ({ ...baseRow, ...overrides });

try {
  await verifySignatureOverExactBody();
  await verifyRetryReplaysIdenticalBodyAndTimestamp();
  await verifyNoRetryOnClientError();
  await verifyDisabledAndUnconfiguredNoSend();
  verifyEventTypeAllowlist();
  verifyEventMapping();
  verifyIdentityIsOpaqueAndStable();
  verifyMetadataIsAmountsOnly();
  verifyStoredGateWiring();
  verifyEmitterIsServerOnly();
} catch (error) {
  failures.push(error instanceof Error ? (error.stack ?? error.message) : String(error));
}

if (failures.length) {
  console.error("Command Center product event verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Command Center product event verification passed.");
console.log(
  "Signature over exact body, retry replay identity, 4xx no-retry, disabled no-send, event mapping, opaque identity, amounts-only metadata, and the stored-gate wiring verified without network access."
);

async function verifySignatureOverExactBody() {
  const captured = [];
  const result = await productEvents.emitProductEvent(
    { eventType: "landing_page_viewed", anonymousId: "anon-1", timestamp: "2026-07-09T11:59:00.000Z" },
    {
      configEnv: enabledEnv,
      now: () => fixedNow,
      fetcher: async (url, init) => {
        captured.push({ url, init });
        return jsonResponse(200, { ok: true, autoApplied: true });
      }
    }
  );

  assert(result.sent === true, "Emitter must report sent on 2xx.");
  assert(result.autoApplied === true, "Emitter must surface autoApplied from the response body.");
  assert(captured.length === 1, "A 2xx must not retry.");

  const { url, init } = captured[0];
  assert(url === ENDPOINT, "Emitter must POST the configured endpoint.");
  assert(init.method === "POST", "Emitter must use POST.");

  const timestamp = init.headers["x-legalease-os-timestamp"];
  assert(timestamp === String(Math.floor(fixedNow.getTime() / 1000)), "Timestamp header must be unix seconds.");

  // The signature must cover the exact bytes sent — recompute it from the literal body string.
  const expected = createHmac("sha256", SECRET).update(`${timestamp}.${init.body}`).digest("hex");
  assert(
    init.headers["x-legalease-os-signature"] === `sha256=${expected}`,
    "Signature must be lowercase hex HMAC-SHA256 over `<timestamp>.<rawBody>` and match the sent body byte-for-byte."
  );

  const payload = JSON.parse(init.body);
  assert(payload.product === "expungement_ai", "Payload product must be expungement_ai.");
  assert(payload.eventType === "landing_page_viewed", "Payload eventType mismatch.");
  assert(payload.timestamp === "2026-07-09T11:59:00.000Z", "Payload timestamp must be the occurrence time, not now().");
  assert(!("userId" in payload), "userId must be omitted when absent, not sent as empty.");
}

async function verifyRetryReplaysIdenticalBodyAndTimestamp() {
  const captured = [];
  const result = await productEvents.emitProductEvent(
    { eventType: "payment_completed", anonymousId: "anon-2", timestamp: "2026-07-09T11:00:00.000Z", metadata: { amount: 5000 } },
    {
      configEnv: enabledEnv,
      now: () => fixedNow,
      sleep: async () => {},
      fetcher: async (url, init) => {
        captured.push(init);
        return captured.length < 3 ? jsonResponse(503, { error: "unavailable" }) : jsonResponse(200, { autoApplied: true });
      }
    }
  );

  assert(result.sent === true, "Emitter must succeed once a retry lands.");
  assert(captured.length === 3, `Expected 3 attempts on 5xx, saw ${captured.length}.`);

  const bodies = new Set(captured.map((init) => init.body));
  const timestamps = new Set(captured.map((init) => init.headers["x-legalease-os-timestamp"]));
  const signatures = new Set(captured.map((init) => init.headers["x-legalease-os-signature"]));

  // Identity-based dedupe on the receiver only protects us if every retry is byte-identical.
  assert(bodies.size === 1, "Retries must replay the identical raw body.");
  assert(timestamps.size === 1, "Retries must replay the identical timestamp.");
  assert(signatures.size === 1, "Retries must replay the identical signature.");
}

async function verifyNoRetryOnClientError() {
  let calls = 0;
  const result = await productEvents.emitProductEvent(
    { eventType: "landing_page_viewed", anonymousId: "anon-3", timestamp: fixedNow.toISOString() },
    {
      configEnv: enabledEnv,
      now: () => fixedNow,
      sleep: async () => {},
      fetcher: async () => {
        calls += 1;
        return jsonResponse(401, { error: "Invalid product event signature." });
      }
    }
  );

  assert(calls === 1, "A 4xx is permanent; the emitter must not retry it.");
  assert(result.sent === false && result.skippedReason === "send_failed", "A 4xx must report send_failed.");
  assert(result.status === 401, "Emitter must surface the status code.");
}

async function verifyDisabledAndUnconfiguredNoSend() {
  const cases = [
    [{ ...enabledEnv, LEGALEASE_OS_EVENTS_ENABLED: "false" }, "disabled"],
    [{ ...enabledEnv, LEGALEASE_OS_EVENTS_ENABLED: undefined }, "disabled"],
    [{ ...enabledEnv, LEGALEASE_OS_EVENTS_ENDPOINT: "" }, "missing_endpoint"],
    [{ ...enabledEnv, LEGALEASE_OS_EVENTS_SECRET: "" }, "missing_secret"]
  ];

  for (const [configEnv, expectedReason] of cases) {
    let calls = 0;
    const result = await productEvents.emitProductEvent(
      { eventType: "landing_page_viewed", anonymousId: "anon-4", timestamp: fixedNow.toISOString() },
      { configEnv, now: () => fixedNow, fetcher: async () => { calls += 1; return jsonResponse(200, {}); } }
    );
    assert(calls === 0, `Emitter must not call fetch when ${expectedReason}.`);
    assert(result.skippedReason === expectedReason, `Expected skippedReason ${expectedReason}, saw ${result.skippedReason}.`);
  }
}

function verifyEventTypeAllowlist() {
  for (const required of ["landing_page_viewed", "expungement_intake_started", "payment_started", "payment_completed"]) {
    assert(productEvents.isProductEventType(required), `${required} must be a supported product event type.`);
  }
  assert(!productEvents.isProductEventType("engine.health_changed"), "OS-loops event types must not be accepted here.");
  assert(!productEvents.isProductEventType("screening_started"), "Internal analytics names must not be sent as product event types.");
}

function verifyEventMapping() {
  const cases = [
    [row({ event_name: "pageview", path: "/" }), "landing_page_viewed"],
    [row({ event_name: "pageview", path: "/expungement-ai" }), "landing_page_viewed"],
    [row({ event_name: "pageview", path: "/pricing" }), null],
    [row({ event_name: "screening_started", path: null }), "expungement_intake_started"],
    [row({ event_name: "checkout_started", path: null }), "payment_started"],
    [row({ event_name: "checkout_completed", path: null }), "payment_completed"],
    [row({ event_name: "packet_generated", path: null }), "packet_generated"],
    // Non-funnel + other-surface rows must never reach the Command Center product funnel.
    [row({ event_name: "state_selected", path: null }), null],
    [row({ event_name: "partner_landing_viewed", product_surface: "legalease_partner" }), null],
    [row({ event_name: "pageview", path: "/", product_surface: "legalease" }), null]
  ];

  for (const [input, expected] of cases) {
    const mapped = bridge.mapRowToProductEvent(input);
    const actual = mapped?.eventType ?? null;
    assert(actual === expected, `Row ${input.event_name} ${input.path ?? ""} (${input.product_surface}) mapped to ${actual}, expected ${expected}.`);
  }

  const mapped = bridge.mapRowToProductEvent(row({}));
  assert(mapped.timestamp === baseRow.occurred_at, "Product event timestamp must be the row's occurred_at.");
  assert(mapped.campaignSlug === "summer-clean", "campaignSlug must carry utm_campaign.");
  assert(mapped.source === "google", "source must carry utm_source.");
  assert(mapped.state === "MS", "state must carry the row jurisdiction.");
}

function verifyIdentityIsOpaqueAndStable() {
  const a = bridge.mapRowToProductEvent(row({}));
  const b = bridge.mapRowToProductEvent(row({ event_id: "different-event-id" }));
  assert(a.anonymousId === b.anonymousId, "anonymousId must be stable per visitor across events.");
  assert(a.anonymousId !== baseRow.visitor_id, "anonymousId must not be the raw first-party visitor id.");
  assert(!a.anonymousId.includes(baseRow.visitor_id), "anonymousId must not embed the raw visitor id.");

  // Falls back through session, then the event itself, so a cookie-less visit still counts.
  const noVisitor = bridge.mapRowToProductEvent(row({ visitor_id: null }));
  assert(noVisitor.anonymousId === productEvents.hashProductEventIdentity(baseRow.session_id), "Must fall back to session id.");
  const noIds = bridge.mapRowToProductEvent(row({ visitor_id: null, session_id: null }));
  assert(noIds.anonymousId === productEvents.hashProductEventIdentity(baseRow.event_id), "Must fall back to event id.");

  const authed = bridge.mapRowToProductEvent(row({ event_name: "checkout_completed", path: null, user_id: "user-abc" }));
  assert(authed.userId && authed.userId !== "user-abc", "userId must be hashed, never sent raw.");
}

function verifyMetadataIsAmountsOnly() {
  const paid = bridge.mapRowToProductEvent(
    row({ event_name: "checkout_completed", path: null, event_meta: { amount_cents: 5000, mode: "live", result: "paid" } })
  );
  assert(paid.metadata.amount === 5000, "payment_completed must forward amount_cents as metadata.amount (cents).");
  assert(Object.keys(paid.metadata).length === 1, "payment_completed metadata must carry only the amount.");

  const started = bridge.mapRowToProductEvent(row({ event_name: "checkout_started", path: null, event_meta: { amount_cents: 5000 } }));
  assert(Object.keys(started.metadata).length === 0, "Only payment_completed carries an amount.");

  const noAmount = bridge.mapRowToProductEvent(row({ event_name: "checkout_completed", path: null, event_meta: {} }));
  assert(Object.keys(noAmount.metadata).length === 0, "Missing amount must not emit a zero/NaN amount.");

  // Defense in depth: the emitter's own sanitizer drops PII-shaped metadata keys.
  const payload = productEvents.buildProductEventPayload({
    eventType: "payment_completed",
    timestamp: fixedNow.toISOString(),
    metadata: { amount: 5000, email: "person@example.com", case_number: "CR-1", stripe_payment_intent: "pi_123" }
  });
  assert(payload.metadata.amount === 5000, "Amount must survive sanitization.");
  for (const forbidden of ["email", "case_number", "stripe_payment_intent"]) {
    assert(!(forbidden in payload.metadata), `Metadata key ${forbidden} must be redacted before egress.`);
  }
}

function verifyStoredGateWiring() {
  const routeSource = read("src/app/api/analytics/web/route.ts");
  assert(routeSource.includes("forwardEventToCommandCenter"), "Ingest route must bridge to the Command Center.");
  assert(routeSource.includes("if (result.stored)"), "Ingest route must forward only newly-stored rows.");
  assert(routeSource.includes("void forwardEventToCommandCenter"), "Ingest route must not await the bridge.");

  const serverEvents = read("src/lib/analytics/server-events.ts");
  assert(serverEvents.includes("if (result.stored)"), "Server funnel emitter must forward only newly-stored rows.");

  const repository = read("src/lib/analytics/web-analytics-repository.ts");
  assert(
    repository.includes("ignoreDuplicates: true") && repository.includes('.select("event_id")'),
    "Repository must report `stored` from the inserted-row set so duplicates never re-emit."
  );
  assert(repository.includes("stored: (data?.length ?? 0) > 0"), "Repository `stored` must reflect an actual insert.");

  // Both paid-event producers funnel through one helper, which owns the amount + idempotency seed.
  // `verify-expungement-paid-event-once.mjs` proves they cannot double-count.
  const checkoutAnalytics = read("src/lib/expungement-ai/checkout-analytics.ts");
  assert(checkoutAnalytics.includes("amount_cents"), "Checkout completion must record the amount for funnel revenue.");
  assert(checkoutAnalytics.includes("idempotencySeed"), "Checkout completion must stay idempotent per checkout session.");
  assert(checkoutAnalytics.includes('productSurface: "expungement_ai"'), "Paid event must assert its product surface.");

  for (const callSite of [
    "src/app/api/expungement-ai/payment/confirm/route.ts",
    "src/lib/expungement-ai/checkout-reconciliation.ts"
  ]) {
    assert(read(callSite).includes("recordConsumerCheckoutCompleted"), `${callSite} must emit the paid event via the shared helper.`);
  }
}

function verifyEmitterIsServerOnly() {
  const source = read("src/lib/analytics/product-events.ts");
  assert(source.startsWith('import "server-only";'), "The emitter must be server-only so the secret never ships to a browser.");
  assert(!source.includes("NEXT_PUBLIC_"), "The emitter must never read a public env var for the secret.");

  const bridgeSource = read("src/lib/analytics/command-center-bridge.ts");
  assert(bridgeSource.startsWith('import "server-only";'), "The bridge must be server-only.");

  // The secret must never be logged, and the response body must never be logged.
  assert(!/logSecurity\w+\([^)]*secret/i.test(source), "The emitter must never log the secret.");
  assert(source.includes("status: lastStatus ?? \"network_error\""), "Failures must log a status code only.");
}

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
    const candidate = path.join(rootDir, "src", request.slice(2));
    return resolveExistingModuleFile(candidate);
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
