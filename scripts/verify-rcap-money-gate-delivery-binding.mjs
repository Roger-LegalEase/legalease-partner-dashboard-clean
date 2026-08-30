#!/usr/bin/env node
// The money gate may never be wider than the delivery gate.
//
//   node scripts/verify-rcap-money-gate-delivery-binding.mjs
//   node scripts/verify-rcap-money-gate-delivery-binding.mjs --mutations
//
// "Do not charge for guidance" is a runtime property, not a report. The
// evaluator's payment gate and the packet route resolver used to be independent
// of each other: a route could be ratified and payable in a jurisdiction whose
// packet route resolves to guidance, so the participant paid $50, the download
// route answered 409 and buildRenderJobSpec produced no job.
//
// This verifier drives the real checkout guard and the real price placeholder
// over every jurisdiction and proves, in both directions:
//
//   * a route the resolver does not declare sellable is never offered a price
//     and never reaches Checkout; and
//   * a route the resolver does declare sellable still sells, so the legacy
//     verified generators (MS, IL, DC, PA, TX) are not fenced off by this guard.
//
// The gate is the resolver's own `sellable` decision, not renderer presence.
// The two agree for every route kind except factory_v2, which resolves WITH the
// shared renderer and WITHOUT permission to sell; asking only about the
// renderer put a price on every ratified shadow route.
//
// This verifier drives the pathway IDENTIFIER the runtime actually carries.
// eligibility-adapter.ts sets `pathwayLabel: engineResult.pathwayId`, so a
// Briefcase item holds the pathway id. Probing with `pathway.label` instead
// matched no compiled pathway at all, which meant factory_v2 was never once
// exercised here and the 60 payment-eligible shadow routes went unmeasured.
//
// It does not reclassify anything. Every route refused here stays in the
// intended-sellable denominator with an open blocker recorded against it.

import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
register("./lib/ts-esm-loader.mjs", import.meta.url);

const MUTATIONS = process.argv.includes("--mutations");

const {
  assertCheckoutAllowed,
  assertPacketRouteCanDeliver,
  createConsumerPaymentPlaceholder,
  ConsumerPacketNotDeliverableError
} = await import("../src/lib/expungement-ai/payment-adapter.ts");
const { packetRouteCanRender, packetRouteCanSell, resolvePacketRoute, LEGACY_VERIFIED_JURISDICTIONS } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");
const { buildRenderJobSpec } = await import("../src/lib/rcap/render/job-contract.ts");

const profiles = fs
  .readdirSync(path.join(rootDir, "src/lib/rcap-engine/compiled/profiles"))
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(rootDir, "src/lib/rcap-engine/compiled/profiles", f), "utf8")));

const routeMetadata = JSON.parse(fs.readFileSync(path.join(rootDir, "data/expungement-ai/route-product-metadata.json"), "utf8")).routes;

const failures = [];
let checks = 0;
const check = (condition, message) => { checks += 1; if (!condition) failures.push(message); };

/** A Briefcase item that clears every other checkout condition, so the only
 *  thing under test is whether the route can deliver. */
function payableItem(code, pathwayLabel) {
  return {
    id: `money-gate-${code}`,
    type: "packet",
    title: `${code} packet`,
    state: code,
    status: "packet_ready",
    resultCode: "packet_ready",
    createdAt: "2026-08-19T00:00:00.000Z",
    summary: "money gate probe",
    nextSteps: [],
    paymentAllowed: true,
    packetReady: true,
    pathwayLabel,
    packetType: "custom_pleading",
    selectedTrackId: null
  };
}

function eligibilityResult(code, pathwayLabel) {
  return {
    state: code,
    pathwayLabel,
    resultCode: "packet_ready",
    paymentAllowed: true,
    selectedTrackId: null,
    treatmentClassification: null
  };
}

// --------------------------------------------------------------------------- both directions, every jurisdiction
const payableRoutes = Object.entries(routeMetadata)
  .filter(([, meta]) => meta.paymentProductEligible === true)
  .map(([key]) => ({ jurisdiction: key.split(":")[0], pathwayId: key.slice(key.indexOf(":") + 1), key }));

let refusedCount = 0;
let soldCount = 0;

let factoryV2Probed = 0;

for (const profile of profiles) {
  const code = profile.jurisdiction.code;
  for (const pathway of profile.pathways) {
    // The runtime carries the pathway id in `pathwayLabel`; probe both that and
    // the human label so neither identifier can quietly escape the guard.
    for (const label of [...new Set([pathway.id, pathway.label])]) {
    const route = resolvePacketRoute({ state: code, pathway: label, trackId: null });
    const canSell = packetRouteCanSell(route);
    if (route.routeKind === "factory_v2") factoryV2Probed += 1;
    const item = payableItem(code, label);

    let threw = null;
    try {
      assertPacketRouteCanDeliver(item);
    } catch (error) {
      threw = error;
    }

    if (canSell) {
      check(threw === null, `${code}:${pathway.id}: the delivery guard refused a sellable route (${threw?.name})`);
      check(packetRouteCanRender(route), `${code}:${pathway.id}: a route resolved sellable without a renderer`);
      soldCount += 1;
    } else {
      check(threw instanceof ConsumerPacketNotDeliverableError,
        `${code}:${pathway.id}: a route that cannot render was allowed through the delivery guard`);
      refusedCount += 1;

      // The same route must also be refused by the whole checkout guard and
      // must never be shown a price.
      let checkoutThrew = null;
      try {
        assertCheckoutAllowed(item);
      } catch (error) {
        checkoutThrew = error;
      }
      check(checkoutThrew !== null, `${code}:${pathway.id}: assertCheckoutAllowed admitted a route the resolver does not declare sellable`);

      const placeholder = createConsumerPaymentPlaceholder(eligibilityResult(code, label));
      check(placeholder.enabled === false,
        `${code}:${pathway.id}: a $50 price was offered for a route the resolver does not declare sellable`);
      check(placeholder.amountCents === undefined,
        `${code}:${pathway.id}: an amount was quoted for a route the resolver does not declare sellable`);

      // No job, so no artifact finalization and no packet credit either.
      const built = buildRenderJobSpec({
        packetId: `money-gate-${code}`,
        state: code,
        pathway: label,
        trackId: null,
        packetFields: {}
      });
      check(built.spec === null,
        `${code}:${pathway.id}: a durable render job was built for a route that may not consume a credit`);
    }
    }
  }
}

// The probe must actually reach the shadow branch. Without this the verifier
// can pass while proving nothing about the route kind it exists to fence.
check(factoryV2Probed > 0,
  "no factory_v2 route was probed: the money-gate verifier is not exercising the shadow branch it fences");

// --------------------------------------------------------------------------- the legacy generators still sell
for (const code of LEGACY_VERIFIED_JURISDICTIONS) {
  const profile = profiles.find((p) => p.jurisdiction.code === code);
  check(Boolean(profile), `${code}: legacy verified jurisdiction has no compiled profile`);
  if (!profile) continue;
  const label = profile.pathways[0]?.label ?? "";
  const item = payableItem(code, label);
  let threw = null;
  try {
    assertCheckoutAllowed(item);
  } catch (error) {
    threw = error;
  }
  check(!(threw instanceof ConsumerPacketNotDeliverableError),
    `${code}: the delivery guard fenced off a legacy verified generator, which must keep selling`);
  const placeholder = createConsumerPaymentPlaceholder(eligibilityResult(code, label));
  check(placeholder.enabled === true, `${code}: a legacy verified generator lost its price`);
}

// --------------------------------------------------------------------------- the gate is measurably narrower
const payableAndNotSellable = payableRoutes.filter(({ jurisdiction, pathwayId }) => {
  const profile = profiles.find((p) => p.jurisdiction.code === jurisdiction);
  const pathway = profile?.pathways.find((p) => p.id === pathwayId);
  if (!pathway) return false;
  return !packetRouteCanSell(resolvePacketRoute({ state: jurisdiction, pathway: pathway.id, trackId: null }));
});

for (const route of payableAndNotSellable) {
  const item = payableItem(route.jurisdiction, route.pathwayId);

  // The delivery guard itself must be the one refusing, by type.
  let guardThrew = null;
  try {
    assertPacketRouteCanDeliver(item);
  } catch (error) {
    guardThrew = error;
  }
  check(guardThrew instanceof ConsumerPacketNotDeliverableError,
    `${route.key}: the evaluator marks this route payment-eligible and the resolver does not declare it sellable, yet the delivery guard admitted it`);

  // And the whole checkout guard must refuse it too. An accepted deferral or a
  // terminal treatment may reach it first and refuse with its own error; what
  // matters is that nothing admits it.
  let checkoutThrew = null;
  try {
    assertCheckoutAllowed(item);
  } catch (error) {
    checkoutThrew = error;
  }
  check(checkoutThrew !== null,
    `${route.key}: assertCheckoutAllowed admitted a payment-eligible route the resolver does not declare sellable`);
}

if (MUTATIONS) {
  // Prove the guard is what is doing the work: an item that bypasses it must be
  // caught by nothing else, so removing the guard would silently reopen the
  // charge. This asserts the failure mode rather than trusting the guard's name.
  // Take the mutation subject from the shadow branch specifically: factory_v2
  // is renderable, so a guard that asked only about the renderer would let it
  // straight through and this is the case that proves the binding is to
  // sellability.
  const undeliverable = profiles
    .flatMap((p) => p.pathways.map((pathway) => ({ code: p.jurisdiction.code, label: pathway.id })))
    .find(({ code, label }) => {
      const route = resolvePacketRoute({ state: code, pathway: label, trackId: null });
      return route.routeKind === "factory_v2" && !packetRouteCanSell(route);
    })
    ?? profiles
      .flatMap((p) => p.pathways.map((pathway) => ({ code: p.jurisdiction.code, label: pathway.id })))
      .find(({ code, label }) => !packetRouteCanSell(resolvePacketRoute({ state: code, pathway: label, trackId: null })));
  const item = payableItem(undeliverable.code, undeliverable.label);
  let withoutGuard = null;
  try {
    // Everything assertCheckoutAllowed does EXCEPT the delivery guard.
    const packetProduct = item.packetType === "custom_pleading";
    if (!packetProduct || item.status !== "packet_ready" || !item.state?.trim() || !item.pathwayLabel?.trim() || !item.paymentAllowed) {
      throw new Error("blocked by another condition");
    }
  } catch (error) {
    withoutGuard = error;
  }
  check(withoutGuard === null,
    "the mutation harness is stale: something other than the delivery guard now blocks this route, so this verifier is no longer testing the binding");
  console.log(`mutation: ${undeliverable.code}:${undeliverable.label} (${resolvePacketRoute({ state: undeliverable.code, pathway: undeliverable.label, trackId: null }).routeKind}) passes every other checkout condition and is stopped only by the delivery guard.`);
}

console.log(
  `money gate / delivery gate binding: ${checks} assertion(s) over ${profiles.length} jurisdictions; ` +
  `${soldCount} probe(s) resolved sellable and still sell, ${refusedCount} probe(s) are refused, ` +
  `${factoryV2Probed} of them reached the factory_v2 shadow branch; ` +
  `${payableAndNotSellable.length} evaluator-payable route(s) are held shut by this binding.`
);

if (failures.length > 0) {
  console.error(`\nverify-rcap-money-gate-delivery-binding FAILED — ${failures.length} problem(s):\n`);
  for (const failure of failures.slice(0, 40)) console.error(` - ${failure}`);
  if (failures.length > 40) console.error(` … and ${failures.length - 40} more`);
  process.exit(1);
}
console.log("No route can take money unless the packet route resolver declares it sellable, and every route it does declare sellable still sells.");
