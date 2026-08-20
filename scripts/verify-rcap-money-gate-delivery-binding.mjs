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
//   * a route that cannot produce an artifact is never offered a price and
//     never reaches Checkout; and
//   * a route that can produce an artifact still sells, so the legacy verified
//     generators (MS, IL, DC, PA, TX) are not fenced off by this guard.
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
const { packetRouteCanRender, resolvePacketRoute, LEGACY_VERIFIED_JURISDICTIONS } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");

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

for (const profile of profiles) {
  const code = profile.jurisdiction.code;
  for (const pathway of profile.pathways) {
    const label = pathway.label;
    const canRender = packetRouteCanRender(resolvePacketRoute({ state: code, pathway: label, trackId: null }));
    const item = payableItem(code, label);

    let threw = null;
    try {
      assertPacketRouteCanDeliver(item);
    } catch (error) {
      threw = error;
    }

    if (canRender) {
      check(threw === null, `${code}:${pathway.id}: the delivery guard refused a route that can render (${threw?.name})`);
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
      check(checkoutThrew !== null, `${code}:${pathway.id}: assertCheckoutAllowed admitted a route that cannot produce a packet`);

      const placeholder = createConsumerPaymentPlaceholder(eligibilityResult(code, label));
      check(placeholder.enabled === false,
        `${code}:${pathway.id}: a $50 price was offered for a route that cannot produce a packet`);
      check(placeholder.amountCents === undefined,
        `${code}:${pathway.id}: an amount was quoted for a route that cannot produce a packet`);
    }
  }
}

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
const payableAndUndeliverable = payableRoutes.filter(({ jurisdiction, pathwayId }) => {
  const profile = profiles.find((p) => p.jurisdiction.code === jurisdiction);
  const pathway = profile?.pathways.find((p) => p.id === pathwayId);
  if (!pathway) return false;
  return !packetRouteCanRender(resolvePacketRoute({ state: jurisdiction, pathway: pathway.label, trackId: null }));
});

for (const route of payableAndUndeliverable) {
  const profile = profiles.find((p) => p.jurisdiction.code === route.jurisdiction);
  const pathway = profile.pathways.find((p) => p.id === route.pathwayId);
  let threw = null;
  try {
    assertCheckoutAllowed(payableItem(route.jurisdiction, pathway.label));
  } catch (error) {
    threw = error;
  }
  check(threw instanceof ConsumerPacketNotDeliverableError,
    `${route.key}: the evaluator marks this route payment-eligible and it cannot produce an artifact, yet checkout admitted it`);
}

if (MUTATIONS) {
  // Prove the guard is what is doing the work: an item that bypasses it must be
  // caught by nothing else, so removing the guard would silently reopen the
  // charge. This asserts the failure mode rather than trusting the guard's name.
  const undeliverable = profiles
    .flatMap((p) => p.pathways.map((pathway) => ({ code: p.jurisdiction.code, label: pathway.label })))
    .find(({ code, label }) => !packetRouteCanRender(resolvePacketRoute({ state: code, pathway: label, trackId: null })));
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
  console.log(`mutation: ${undeliverable.code} passes every other checkout condition and is stopped only by the delivery guard.`);
}

console.log(
  `money gate / delivery gate binding: ${checks} assertion(s) over ${profiles.length} jurisdictions; ` +
  `${soldCount} route(s) can deliver and still sell, ${refusedCount} route(s) cannot deliver and are refused, ` +
  `${payableAndUndeliverable.length} of them were payment-eligible before this binding.`
);

if (failures.length > 0) {
  console.error(`\nverify-rcap-money-gate-delivery-binding FAILED — ${failures.length} problem(s):\n`);
  for (const failure of failures.slice(0, 40)) console.error(` - ${failure}`);
  if (failures.length > 40) console.error(` … and ${failures.length - 40} more`);
  process.exit(1);
}
console.log("No route can take money for a packet it cannot produce, and every route that can produce one still sells.");
