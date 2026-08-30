#!/usr/bin/env node
// The packet-family product path fence.
//
//   node scripts/verify-rcap-packet-family-product-readiness.mjs
//   node scripts/verify-rcap-packet-family-product-readiness.mjs --mutations
//
// A completed packet family is connected to the paid product path only when its
// precheck passes. The precheck itself is generated into
// data/record-clearing/packet-family-product-readiness.json; this verifier
// proves the runtime honours it, by driving the shipped resolver, the shipped
// checkout guard and the shipped job builder over every route every family
// claims.
//
// The invariant, in both directions:
//
//   * a route served by a family that is not product-ready is not sellable, is
//     not credit-consumable, is shown no price, is refused at Checkout, and
//     produces no durable render job — so no artifact is finalized and no packet
//     credit is drawn; and
//   * the legacy verified generators (MS, IL, DC, PA, TX) are not fenced off by
//     any of this. They serve no factory_v2 family and keep selling.
//
// It creates no approval and it makes nothing sellable. A family that becomes
// product-ready still needs the separate route-enablement decision that the
// owner legal decision on record expressly withholds.

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01";

import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
register("./lib/ts-esm-loader.mjs", import.meta.url);

const MUTATIONS = process.argv.includes("--mutations");
const LEDGER_PATH = "data/record-clearing/packet-family-product-readiness.json";

const {
  packetRouteCanRender,
  packetRouteCanSell,
  packetRouteCanConsumeCredit,
  resolvePacketRoute,
  LEGACY_VERIFIED_JURISDICTIONS
} = await import("../src/lib/rcap/documents/packet-route-resolver.ts");
const {
  assertCheckoutAllowed,
  assertPacketRouteCanDeliver,
  createConsumerPaymentPlaceholder,
  ConsumerPacketNotDeliverableError
} = await import("../src/lib/expungement-ai/payment-adapter.ts");
const { buildRenderJobSpec } = await import("../src/lib/rcap/render/job-contract.ts");

const ledger = JSON.parse(fs.readFileSync(path.join(rootDir, LEDGER_PATH), "utf8"));

const failures = [];
let checks = 0;
const check = (condition, message) => { checks += 1; if (!condition) failures.push(message); };

/** A Briefcase item that clears every checkout condition except the route. */
const payableItem = (jurisdiction, pathwayId) => ({
  id: `family-fence-${jurisdiction}-${pathwayId}`,
  type: "packet",
  title: `${jurisdiction} packet`,
  state: jurisdiction,
  status: "packet_ready",
  resultCode: "packet_ready",
  createdAt: "2026-08-19T00:00:00.000Z",
  summary: "packet family fence probe",
  nextSteps: [],
  paymentAllowed: true,
  packetReady: true,
  pathwayLabel: pathwayId,
  packetType: "custom_pleading",
  selectedTrackId: null
});

const eligibilityResult = (jurisdiction, pathwayId) => ({
  state: jurisdiction,
  pathwayLabel: pathwayId,
  resultCode: "packet_ready",
  paymentAllowed: true,
  selectedTrackId: null,
  treatmentClassification: null
});

// --------------------------------------------------------------------------- the ledger itself
check(ledger.createsApproval === false, "the readiness ledger must not claim to create an approval");
check(ledger.makesNothingSellable === true, "the readiness ledger must record that it makes nothing sellable");
check(ledger.families.length > 0, "the readiness ledger records no packet families");
check(
  (ledger.ownerLegalDecision?.doesNotAuthorize ?? []).includes("turning any route public or sellable"),
  "the owner legal decision no longer withholds route enablement; the fence's premise has changed and must be re-read before anything is wired"
);

for (const family of ledger.families) {
  const conditions = Object.values(family.precheck);
  check(
    family.productReady === (conditions.every(Boolean) && family.refusals.length === 0),
    `${family.familyId}: productReady disagrees with its own precheck conditions`
  );
  check(
    family.productReady || family.refusals.length > 0,
    `${family.familyId}: refused with no reason recorded`
  );
}

// --------------------------------------------------------------------------- the fence, route by route
let probedRoutes = 0;
let factoryV2Routes = 0;
let legacyRoutes = 0;

for (const family of ledger.families) {
  if (family.productReady) continue;
  for (const routeKey of family.routeKeys) {
    const jurisdiction = routeKey.slice(0, routeKey.indexOf(":"));
    const pathwayId = routeKey.slice(routeKey.indexOf(":") + 1);
    const route = resolvePacketRoute({ state: jurisdiction, pathway: pathwayId, trackId: null });

    // A preserved legacy generator owns its own route. The counsel manifest
    // records packet families in MS, IL, DC, PA and TX too, but those routes are
    // served by the live generators that predate the factory and that this
    // sprint is required to keep working — the factory registry refuses them
    // with legacyGeneratorOwnsThisJurisdiction and the resolver never reaches
    // the factory branch for them. The fence is about routes a family would
    // serve, so a legacy route is asserted to still belong to its generator and
    // then left alone.
    if (route.routeKind === "legacy_verified") {
      check(LEGACY_VERIFIED_JURISDICTIONS.includes(jurisdiction),
        `${routeKey}: resolved legacy_verified outside the preserved legacy jurisdictions`);
      legacyRoutes += 1;
      continue;
    }

    probedRoutes += 1;
    if (route.routeKind === "factory_v2") factoryV2Routes += 1;

    check(route.sellable === false,
      `${routeKey}: resolved sellable while its packet family ${family.familyId} is not product-ready`);
    check(route.creditConsumable === false,
      `${routeKey}: resolved credit-consumable while its packet family ${family.familyId} is not product-ready`);
    check(packetRouteCanSell(route) === false,
      `${routeKey}: the money gate opens on a family that is not product-ready`);
    check(packetRouteCanConsumeCredit(route) === false,
      `${routeKey}: the credit gate opens on a family that is not product-ready`);

    const item = payableItem(jurisdiction, pathwayId);

    let guardThrew = null;
    try {
      assertPacketRouteCanDeliver(item);
    } catch (error) {
      guardThrew = error;
    }
    check(guardThrew instanceof ConsumerPacketNotDeliverableError,
      `${routeKey}: the delivery guard admitted a route whose packet family is not product-ready`);

    let checkoutThrew = null;
    try {
      assertCheckoutAllowed(item);
    } catch (error) {
      checkoutThrew = error;
    }
    check(checkoutThrew !== null,
      `${routeKey}: Checkout admitted a route whose packet family is not product-ready`);

    const placeholder = createConsumerPaymentPlaceholder(eligibilityResult(jurisdiction, pathwayId));
    check(placeholder.enabled === false,
      `${routeKey}: a price was offered for a route whose packet family is not product-ready`);
    check(placeholder.amountCents === undefined,
      `${routeKey}: an amount was quoted for a route whose packet family is not product-ready`);

    const built = buildRenderJobSpec({
      packetId: `family-fence-${jurisdiction}`,
      state: jurisdiction,
      pathway: pathwayId,
      trackId: null,
      packetFields: {}
    });
    check(built.spec === null,
      `${routeKey}: a durable render job was built for a route whose packet family is not product-ready, which is the path into artifact finalization and packet-credit accounting`);
  }
}

check(probedRoutes > 0, "no route was probed: every family in the ledger claims no routes, so this verifier proves nothing");
check(factoryV2Routes > 0, "no probed route reached the factory_v2 branch, so the fence this verifier exists for is untested");

// --------------------------------------------------------------------------- the legacy generators are untouched
// Every route a packet family claims in a preserved legacy jurisdiction must
// still resolve to that jurisdiction's live generator, must still be sellable,
// and must still be shown a price. The fence narrows the factory branch; it may
// never reach across and close a generator this sprint is required to preserve.
for (const jurisdiction of LEGACY_VERIFIED_JURISDICTIONS) {
  const claimed = ledger.families
    .flatMap((family) => family.routeKeys)
    .filter((key) => key.startsWith(`${jurisdiction}:`));
  for (const routeKey of claimed) {
    const pathwayId = routeKey.slice(routeKey.indexOf(":") + 1);
    const route = resolvePacketRoute({ state: jurisdiction, pathway: pathwayId, trackId: null });

    // The legacy generator must never be re-pointed at the factory.
    check(route.routeKind !== "factory_v2",
      `${routeKey}: a preserved legacy route was admitted to the shared factory; the live generator must keep its own route`);

    // An accepted deferral, component deferral or complete-guidance treatment
    // is a decision about one route and outranks the jurisdiction's
    // classification by design — Texas expunction after a qualifying dismissal
    // is the case that established it. Those suppressions are not this fence,
    // and asserting a price for them would re-open exactly what they closed.
    if (route.routeKind !== "legacy_verified") continue;

    check(packetRouteCanSell(route),
      `${routeKey}: the packet-family fence closed a preserved legacy generator`);
    const placeholder = createConsumerPaymentPlaceholder(eligibilityResult(jurisdiction, pathwayId));
    check(placeholder.enabled === true,
      `${routeKey}: a preserved legacy generator lost its price`);
  }
}

// --------------------------------------------------------------------------- mutations
if (MUTATIONS) {
  // 1. Prove the fence is load-bearing: the probed routes are renderable, so a
  //    gate that asked only whether a renderer exists would admit every one.
  const renderableButFenced = ledger.families
    .filter((family) => !family.productReady)
    .flatMap((family) => family.routeKeys)
    .map((routeKey) => ({
      routeKey,
      route: resolvePacketRoute({
        state: routeKey.slice(0, routeKey.indexOf(":")),
        pathway: routeKey.slice(routeKey.indexOf(":") + 1),
        trackId: null
      })
    }))
    .filter(({ route }) => route.routeKind !== "legacy_verified" && packetRouteCanRender(route) && !packetRouteCanSell(route));
  check(renderableButFenced.length > 0,
    "mutation: no probed route is renderable-but-not-sellable, so this verifier would still pass against the old renderer-only gate and proves nothing");
  console.log(`mutation: ${renderableButFenced.length} probed route(s) can render and may not sell; a renderer-only gate would have admitted all of them.`);

  // 2. Prove a product-ready family would not be admitted by accident either.
  //    Readiness is necessary, never sufficient: the route still has to be
  //    declared sellable by the resolver, and no decision on record does that.
  const readyFamilies = ledger.families.filter((family) => family.productReady);
  for (const family of readyFamilies) {
    for (const routeKey of family.routeKeys) {
      const route = resolvePacketRoute({
        state: routeKey.slice(0, routeKey.indexOf(":")),
        pathway: routeKey.slice(routeKey.indexOf(":") + 1),
        trackId: null
      });
      check(route.routeKind !== "factory_v2" || route.sellable === false,
        `mutation ${routeKey}: a product-ready family made a factory_v2 route sellable without a route-enablement decision`);
    }
  }
  console.log(`mutation: ${readyFamilies.length} product-ready family(ies); readiness alone opened no route.`);
}

console.log(
  `packet-family product path fence: ${checks} assertion(s); ` +
  `${ledger.totals.productReady}/${ledger.totals.families} families product-ready; ` +
  `${probedRoutes} route(s) fenced, ${factoryV2Routes} of them on the factory_v2 branch; ` +
  `${legacyRoutes} preserved legacy route(s) left selling.`
);

if (failures.length > 0) {
  console.error(`\nverify-rcap-packet-family-product-readiness FAILED — ${failures.length} problem(s):\n`);
  for (const failure of failures.slice(0, 40)) console.error(` - ${failure}`);
  if (failures.length > 40) console.error(` … and ${failures.length - 40} more`);
  process.exit(1);
}
console.log("No route served by a packet family that is not product-ready can take money, consume a credit, or produce a render job.");
