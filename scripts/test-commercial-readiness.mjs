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

// Resolve production TypeScript aliases; double only external side effects.
const REAL_MODULE_CACHE = new Map();

function aliasPath(specifier) {
  if (!specifier.startsWith("@/")) return null;
  // `@/*` is `./src/*`, which is also how the repository reaches its data files:
  // `@/../data/...json` normalises to `<root>/data/...json`.
  const base = path.join(rootDir, "src", specifier.slice(2));
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function requireFor(mocks) {
  return (specifier) => {
    if (specifier in mocks) return mocks[specifier];
    // `server-only` is a build-time marker with no runtime behaviour to test.
    if (specifier === "server-only" || specifier === "client-only") return {};
    const aliased = aliasPath(specifier);
    if (aliased) return aliased.endsWith(".json") ? require(aliased) : loadTsFile(aliased, mocks);
    return require(specifier);
  };
}

function loadTsFile(resolved, mocks) {
  const cached = REAL_MODULE_CACHE.get(resolved);
  if (cached) return cached;
  const transpiled = ts.transpileModule(fs.readFileSync(resolved, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  const mod = new Module(resolved);
  const compiledFilename = `${resolved}.cjs`;
  mod.filename = compiledFilename;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  mod.require = requireFor(mocks);
  mod._compile(transpiled, compiledFilename);
  // Only dependencies loaded for real are cached. The module under test is
  // loaded fresh each time, because each case gives it different doubles.
  REAL_MODULE_CACHE.set(resolved, mod.exports);
  return mod.exports;
}

function loadTsWithMocks(relPath, mocks) {
  const resolved = path.join(rootDir, relPath);
  REAL_MODULE_CACHE.delete(resolved);
  const loaded = loadTsFile(resolved, mocks);
  REAL_MODULE_CACHE.delete(resolved);
  return loaded;
}

function read(relPath) {
  return fs.readFileSync(path.join(rootDir, relPath), "utf8");
}

const USER = "11111111-1111-4111-8111-111111111111";
const ITEM = "22222222-2222-4222-8222-222222222222";
const PERSON = "33333333-3333-4333-8333-333333333333";
const MATTER = "44444444-4444-4444-8444-444444444444";
const PRODUCT = "expungement_packet";
/**
 * The route these guards run on must be one the product may actually sell.
 *
 * This fixture used to be `PA:pa-path-a-non-conviction-expungement`. Roger
 * retired the Pennsylvania legacy generator as a commercial fulfillment path on
 * 2026-08-28, so that route now has no Grade-A fulfillment record and
 * `assertCheckoutAllowed` refuses it outright — the positive cases below could
 * never reach the guard they were written to test. Commercial authority comes
 * from a Grade-A record and nothing else, so the positive cases move to a route
 * that holds one. The refusal itself is still proven, as a negative case, on a
 * route with no record.
 */
const JURISDICTION = "MS";
const PATHWAY_ID = "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
const TRACK_ID = "ms-nonconv";
const UNRECORDED_PATHWAY_ID = "pa-path-a-non-conviction-expungement";
const APP_ORIGIN = "https://axis-serving-believed-century.trycloudflare.com";

function eligibleItem(overrides = {}) {
  return {
    id: ITEM,
    paymentAllowed: true,
    resultCode: "packet_ready",
    paymentStatus: "unpaid",
    packetStatus: "not_started",
    state: JURISDICTION,
    status: "packet_ready",
    pathwayLabel: "Non-conviction expungement for dismissal, no disposition, or acquittal",
    packetType: "custom_pleading",
    artifactRefs: {},
    ...overrides
  };
}

function buildPaymentAdapter({
  retrievedSession = null,
  persistOutcome = "bound",
  reviewReady = true,
  verificationSnapshotOverrides = {},
  verificationHash = "a".repeat(64),
  verificationRevision = 4,
  stripeConfigurationError = null,
  sponsored = false,
  personAvailable = true
} = {}) {
  const createCalls = [];
  const retrieveCalls = [];
  const updateCalls = [];
  const expireCalls = [];
  const persistCalls = [];
  const routeInputs = [];
  let verificationCalls = 0;
  let lastSnapshot;

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
          return retrievedSession ?? (createCalls.length ? { id: "cs_test_new", mode: "payment", status: "open", url: "https://checkout.stripe.com/c/pay/cs_test_new" } : null);
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
    "@/lib/expungement-ai/briefcase": {
      isPartnerSponsoredPacketItem: async () => sponsored,
      getBriefcaseItem: async () => null
    },
    "@/lib/expungement-ai/consumer-identity": {
      resolveConsumerPersonId: async () => personAvailable ? ({ ok: true, personId: PERSON }) : ({ ok: false }),
      consumerMatterIdForItem: () => MATTER
    },
    "@/lib/expungement-ai/consumer-payment-authority": {
      CONSUMER_PACKET_PRODUCT_ID: PRODUCT,
      readStoredConsumerCheckoutSession: async () => ({ readable: true, checkoutSessionId: null }),
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
          snapshot: lastSnapshot = {
            jurisdiction: JURISDICTION,
            pathwayId: PATHWAY_ID,
            // The server-owned track, from the specification this route's
            // Grade-A record binds. A route match alone is not commercial
            // authority: the record names an exact track, family, provider and
            // specification, and the protected snapshot is where that comes
            // from. The forged-track case below still forges on the ITEM,
            // which is the writable surface, and must not win.
            selectedTrackId: TRACK_ID,
            treatmentClassification: null,
            deferralComponentIds: [],
            packetType: "custom_pleading",
            resultCode: "packet_ready",
            paymentAllowed: true,
            packetPlan: null,
            profileVersion: "2026-06-19-source-conversion-1",
            profileAuthorityFingerprint: "b".repeat(64),
            profileSourceFingerprint: "c".repeat(64),
            packetFamilyIdentifiers: { mode: "custom_pleading", sourceFormIds: [] },
            verifiedAt: new Date().toISOString(),
            packetAnswers: JSON.parse(read("data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-a.fixture.json")).facts,
            ...verificationSnapshotOverrides
          },
          revision: verificationRevision
        };
      }
    }
  });

  return {
    adapter,
    snapshot: () => lastSnapshot,
    createCalls,
    retrieveCalls,
    updateCalls,
    expireCalls,
    persistCalls,
    routeInputs,
    verificationCalls: () => verificationCalls
  };
}

const client = loadTsWithMocks("src/components/expungement-ai/packet-verification-client.ts", {});
const deny = { fulfillmentAvailable: false, checkoutAllowed: false, generationAllowed: false };
const allow = { fulfillmentAvailable: true, checkoutAllowed: true, generationAllowed: true };
const va = { jurisdiction: "VA", pathwayId: "regime-1-expungement-available-now", selectedTrackId: "va_exp_absolute_pardon" };
const cases = [
  ["proven MS / complete verified facts", {}, true],
  ["VA evaluator candidate without Grade-A record", { verificationSnapshotOverrides: va }, false],
  ["other unrecorded route", { verificationSnapshotOverrides: { jurisdiction: "PA", pathwayId: UNRECORDED_PATHWAY_ID } }, false],
  ["missing protected consumer identity", { personAvailable: false }, false],
  ["missing/stale verification", { reviewReady: false }, false],
  ["missing Packet Information render facts", { verificationSnapshotOverrides: { packetAnswers: {} } }, false],
  ["wrong exact track/family", { verificationSnapshotOverrides: { selectedTrackId: "wrong-track" } }, false],
  ["non packet result", { verificationSnapshotOverrides: { resultCode: "guidance_only" } }, false],
  ["evaluator candidate false", { verificationSnapshotOverrides: { paymentAllowed: false } }, false],
  ["missing verification fingerprint", { verificationSnapshotOverrides: { profileSourceFingerprint: null } }, false]
];
for (const [label, options, expected] of cases) {
  const h = buildPaymentAdapter(options);
  const item = eligibleItem();
  const permitted = await h.adapter.consumerPacketPurchaseAllowedNow(USER, item);
  assert.equal(permitted, expected, `${label}: server presentation`);
  assert.equal(h.createCalls.length + h.persistCalls.length, 0, "presentation must create no order");
  const actions = client.packetVerificationActions({ verified: true, packetReady: false, mode: "consumer",
    commercialActions: { ...deny, checkoutAllowed: permitted } });
  assert.equal(actions.checkout, expected, `${label}: CTA agrees with server`);
  if (expected) {
    const checkout = await h.adapter.createConsumerPacketCheckout({ userId: USER, item });
    assert.equal(checkout.outcome, "checkout_created");
    assert.equal(h.createCalls.length, 1);
  } else {
    await assert.rejects(() => h.adapter.createConsumerPacketCheckout({ userId: USER, item }));
    assert.equal(h.createCalls.length + h.persistCalls.length, 0, `${label}: no order`);
  }
  console.log(`PASS ${label}`);
}
assert.equal(await buildPaymentAdapter({ sponsored: true }).adapter.consumerPacketPurchaseAllowedNow(USER, eligibleItem()), false);
assert.equal(await buildPaymentAdapter().adapter.consumerPacketPurchaseAllowedNow(USER, eligibleItem({ paymentStatus: "paid" })), false);
for (const mode of ["consumer", "paid", "sponsored"]) {
  for (const verified of [false, true]) {
    const actions = client.packetVerificationActions({ verified, packetReady: false, mode, commercialActions: deny });
    assert.equal(actions.checkout, false);
    assert.equal(actions.generation, null);
  }
  assert.deepEqual(client.packetVerificationActions({ verified: false, packetReady: false, mode, commercialActions: allow }),
    { openPacket: false, checkout: false, generation: null }, "sponsorship cannot bypass verification");
}
assert.equal(client.packetVerificationActions({ verified: true, packetReady: false, mode: "consumer" }).checkout, false);
assert.equal(client.packetVerificationActions({ verified: true, packetReady: true, mode: "sponsored", commercialActions: allow }).generation, null);
assert.equal(client.packetVerificationActions({ verified: true, packetReady: true, mode: "paid", commercialActions: deny }).openPacket, true);
for (const [ok, payload, expected] of [[true, { readyToGenerate: true }, deny], [false, { commercialActions: allow }, deny], [true, { commercialActions: allow }, allow]]) {
  const response = await client.requestPacketVerification({ itemId: ITEM, answers: {}, fetchImpl: async () => ({ ok, json: async () => payload }) });
  assert.deepEqual(response.commercialActions, expected, "legacy verified response alone grants no commercial action");
}
console.log("PASS: checkout prerequisite truth table and participant action agreement; no provider contacted.");

// The real sponsored admission gates, with only persistence/entitlement reads
// doubled. No fulfillment record, commercial admission or verification verdict
// is fabricated by the production code under test.
const positive = buildPaymentAdapter();
await positive.adapter.requireConsumerPacketPurchaseReadiness(USER, eligibleItem());
const verifiedSnapshot = positive.snapshot();
function generationHarness({ snapshot = verifiedSnapshot, verified = true, benefit = true, sourceMatterId = MATTER, sponsoredContext = null } = {}) {
  const source = read("src/lib/expungement-ai/packet-generation.ts");
  const ast = ts.createSourceFile("generation.ts", source, ts.ScriptTarget.Latest, true);
  const mocks = {};
  for (const stmt of ast.statements) {
    if (ts.isImportDeclaration(stmt)) mocks[stmt.moduleSpecifier.text] = {};
  }
  for (const real of ["node:crypto", "@/lib/expungement-ai/packet-fulfillment-authority", "@/lib/rcap/render/commercial-admission", "@/lib/expungement-ai/eligibility-adapter"]) delete mocks[real];
  mocks["@/lib/expungement-ai/consumer-identity"] = { consumerMatterIdForItem: () => MATTER };
  mocks["@/lib/expungement-ai/packet-information"] = { requireCurrentPacketVerification: async () => {
    if (!verified) throw new Error("current final verification required");
    return { hash: "a".repeat(64), revision: 4, snapshot };
  } };
  mocks["@/lib/expungement-ai/briefcase-presentation-authority"] = { readTrustedBriefcasePresentationSource: async () => ({ ok: true, value: {
    product: "rcap_partner", partnerBenefitActive: benefit, partnerSlug: "test-partner", sourceSessionId: "test-session", matterId: sourceMatterId
  } }) };
  mocks["@/lib/expungement-ai/consumer-payment-authority"] = { consumerPacketPaymentAuthority: async () => ({ valid: false }) };
  mocks["@/lib/rcap/fulfillment/sponsored-channel-context"] = { readSponsoredChannelContext: async () => sponsoredContext };
  mocks["@/lib/rcap/render/personalized-packet"] = { isPersonalizedDeliveryRoute: () => true };
  mocks["@/lib/rcap/render/job-queue"] = { hasFinalizedPersonalizedRender: async () => false };
  return loadTsWithMocks("src/lib/expungement-ai/packet-generation.ts", mocks);
}
for (const [label, options, expected] of [
  ["existing MS sponsored-posture hold preserved", {}, false],
  ["sponsorship cannot bypass missing fulfillment", { snapshot: { ...verifiedSnapshot, ...va } }, false],
  ["sponsorship cannot bypass final verification", { verified: false }, false],
  ["partner context without active benefit", { benefit: false }, false]
]) {
  const generation = generationHarness(options);
  const checkGeneration = () => generation.assertPacketGenerationAllowed(USER, eligibleItem(), false, { paymentRequired: false, entitlement: { kind: "sponsored_credit", idempotencyKey: "test-credit", serverVerified: true, alreadyConsumed: false } });
  if (options.snapshot || options.verified === false) await assert.rejects(checkGeneration);
  else await checkGeneration();
  const allowed = await generation.packetGenerationAllowedNow(USER, eligibleItem());
  assert.equal(allowed, expected, label);
  assert.equal(Boolean(client.packetVerificationActions({ verified: true, packetReady: false, mode: "sponsored", commercialActions: { ...deny, generationAllowed: allowed } }).generation), expected);
  console.log(`PASS ${label}`);
}

// A valid current sponsored context may pass without consumer payment, but
// the trusted source's matter identity remains a separate mandatory gate.
{
  const grant = JSON.parse(read('data/record-clearing/legal-decisions/2026-09-25-ms-nonconv-sponsored-preview.json'));
  const env = {VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'preview',RCAP_SPONSORED_PREVIEW_CHANNEL:grant.channel,
    RCAP_CONSUMER_DELIVERY_ROUTE_STATE:grant.routeState,NEXT_PUBLIC_SUPABASE_URL:`https://${grant.acceptanceProjectRef}.supabase.co`,
    RCAP_CONSUMER_DELIVERY_STAGING_SCOPE:grant.participantUserIds.join(',')};
  const previous = Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));
  Object.assign(process.env,env);
  try {
    const sponsoredContext = {participantUserId:grant.participantUserIds[0],partnerSlug:grant.partnerSlug,eventName:grant.eventName,eventId:grant.eventId,registeredSpecificationSha256:grant.packetSpecificationSha256};
    assert.equal(await generationHarness({sponsoredContext}).packetGenerationAllowedNow(grant.participantUserIds[0],eligibleItem()),true,'verified sponsored matter is generation eligible without consumer payment authority');
    assert.equal(await generationHarness({sponsoredContext,sourceMatterId:'69eb4d66-d672-44be-854d-93e6022d2995'}).packetGenerationAllowedNow(grant.participantUserIds[0],eligibleItem()),false,'screening correlation cannot replace the canonical matter');
    assert.equal(await generationHarness({sponsoredContext,verified:false}).packetGenerationAllowedNow(grant.participantUserIds[0],eligibleItem()),false,'sponsorship cannot bypass final verification');
    console.log('PASS sponsored generation: canonical source admits, pending identity refuses, no consumer payment authority');
  } finally { for (const [key,value] of Object.entries(previous)) value===undefined?delete process.env[key]:process.env[key]=value; }
}

// Prove the refactor preserves checkout for EVERY route and every existing
// stored-order branch, not merely the positive/negative specimens above.
const { execFileSync } = await import("node:child_process");
const adapterPath = "src/lib/expungement-ai/payment-adapter.ts";
const baselineSha = process.env.TASK52_COMPARE_BASELINE;
if (baselineSha) {
const baseline = execFileSync("git", ["show", `${baselineSha}:${adapterPath}`], { cwd: rootDir, encoding: "utf8" });
const current = read(adapterPath);
function declaration(source, name) {
  const file = ts.createSourceFile("adapter.ts", source, ts.ScriptTarget.Latest, true);
  return file.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
}
const helper = declaration(current, "requireConsumerPacketPurchaseReadiness");
const gateBody = helper.body.statements.slice(0, -1).map(node => node.getFullText()).join("\n");
const inlined = current.replace('  const { verification, verifiedSnapshot, purchaseReadiness } = await requireConsumerPacketPurchaseReadiness(userId, item);', gateBody);
const printer = ts.createPrinter({ removeComments: true });
function normalizedFunction(source, name) {
  const node = declaration(source, name);
  return printer.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile());
}
for (const name of ["createConsumerPacketCheckout", "assertCheckoutAllowed", "getConsumerCheckoutStatus"]) {
  assert.equal(normalizedFunction(inlined, name), normalizedFunction(baseline, name), `${name}: identical existing behavior after inlining shared read`);
}
console.log(`PASS unchanged checkout/order branches for all routes (AST equivalence against ${baselineSha}).`);
}

// Render participant copy, rather than merely searching component source.
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const localization = { useLocalization: () => ({ locale: "en", t: (_key, fallback) => fallback, text: text => text }) };
const { ScreeningResult } = loadTsWithMocks("src/components/expungement-ai/screening/ScreeningResult.tsx", {
  "@/components/expungement-ai/LocalizationProvider": localization
});
const evaluation = {
  jurisdiction: "VA", pathwayId: va.pathwayId, pathwayLabel: "Regime 1 expungement", resultCode: "packet_ready", paymentAllowed: true,
  reasons: [], cautions: [], nextSteps: [], missingQuestionIds: [], userLabel: "Packet ready",
  packetPlan: { mode: "custom_pleading" }, consumerPacketAvailable: false, sponsoredPacketAvailable: false
};
for (const hasScreeningSession of [false, true]) {
  const html = renderToStaticMarkup(React.createElement(ScreeningResult, { evaluation, stateName: "Virginia", questionPromptById: {}, onEditAnswers() {}, onPacketAction() {}, hasScreeningSession }));
  assert.match(html, /A packet is not available for this route yet/);
  assert.match(html, /Regime 1 expungement/);
  assert.doesNotMatch(html, /\$50|We’ll prepare|You may be able to prepare an expungement packet|Verify the packet facts before payment/);
}
const { PacketVerificationAction } = loadTsWithMocks("src/components/expungement-ai/PacketVerificationAction.tsx", {
  "next/navigation": { useRouter: () => ({ refresh() {} }) },
  "@/components/expungement-ai/LocalizationProvider": localization,
  "@/components/expungement-ai/PacketGenerateButton": { PacketGenerateButton: props => React.createElement("button", null, props.label ?? "Prepare packet") }
});
for (const allowed of [false, true]) {
  const html = renderToStaticMarkup(React.createElement(PacketVerificationAction, {
    itemId: ITEM, verificationAnswers: {}, initiallyVerified: true, canVerify: true,
    mode: "consumer", commercialActions: allowed ? allow : deny
  }));
  assert.equal(html.includes("Pay $50 and generate my packet"), allowed, "rendered pay CTA follows authoritative server answer");
}
const { humanMatterState, matterCarePresentation } = loadTsWithMocks("src/lib/expungement-ai/frontend/briefcase-presentation.ts", {});
const presentation = { authorityStatus: "protected_verified", resultCode: "packet_ready", packetType: "custom_pleading", artifact: { status: "absent" }, packetDraft: { status: "available" }, packetProgress: "verified", paymentState: "unpaid", commercialActions: deny };
assert.equal(humanMatterState(presentation), "Packet not available yet");
assert.equal(humanMatterState({ ...presentation, packetDraft: { status: "unavailable" } }), "Packet not available yet");
assert.doesNotMatch(matterCarePresentation(presentation).blurb, /what to add|ready to generate/);
assert.equal(humanMatterState({ ...presentation, commercialActions: allow }), "Ready to generate");
assert.equal(humanMatterState({ ...presentation, artifact: { status: "ready" } }), "Packet ready");

const endpoint = loadTsWithMocks("src/app/api/expungement-ai/evaluate/route.ts", {
  "@/lib/expungement-ai/authoritative-screening-result": { evaluateAuthoritativeScreeningResult: () => ({ evaluation, selectedTrackId: va.selectedTrackId }) }
});
const response = await endpoint.POST(new Request("http://localhost/api/expungement-ai/evaluate", { method: "POST", body: JSON.stringify({ jurisdiction: "VA", profileVersion: "test", matterId: "test", answers: {} }) }));
const payload = await response.json();
assert.equal(payload.paymentAllowed, true, "legal candidate signal preserved");
assert.equal(payload.resultCode, "packet_ready", "legal result preserved");
assert.equal(payload.pathwayId, va.pathwayId, "route coverage preserved");
assert.equal(payload.consumerPacketAvailable, false);
assert.equal(payload.sponsoredPacketAvailable, false);
console.log("PASS rendered screening and verified pay CTA; route/legal result preserved and commercially unavailable.");
