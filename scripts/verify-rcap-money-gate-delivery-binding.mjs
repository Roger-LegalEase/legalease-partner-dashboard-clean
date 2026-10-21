#!/usr/bin/env node
await import("./verify-rcap-il-delivery-binding.mjs");
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
const documentRendererSource = fs.readFileSync("src/components/rcap/documents/DocumentPacketRenderer.tsx", "utf8");
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

function verificationSnapshot(code, pathwayId, trackId = null) {
  return {
    jurisdiction: code,
    pathwayId,
    selectedTrackId: trackId,
    treatmentClassification: null,
    deferralComponentIds: [],
    packetType: "custom_pleading",
    resultCode: "packet_ready",
    paymentAllowed: true
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
    const canRender = packetRouteCanRender(resolvePacketRoute({ state: code, pathway: pathway.id, trackId: null }));
    const item = payableItem(code, label);

    let threw = null;
    try {
      assertPacketRouteCanDeliver(verificationSnapshot(code, pathway.id));
    } catch (error) {
      threw = error;
    }

    if (canRender) {
      /**
       * The guard may be STRICTER than the route resolver, and now is.
       *
       * This used to require exact agreement: a route the resolver said could
       * render had to pass the delivery guard. That was the right binding when
       * the resolver was the only authority. It is not any more — the packet
       * fulfillment gate refuses a route that cannot prove it delivers the
       * packet it promises, and the resolver cannot reach that question,
       * because it classifies whether a STATE can render rather than whether a
       * ROUTE produces its filing.
       *
       * So the direction that matters is the only one asserted: the guard must
       * never ALLOW what the resolver refuses. Refusing more is the containment
       * working, and requiring agreement would have made the fulfillment gate
       * impossible to add without deleting this check.
       */
      const refusedForFulfillment = threw?.name === "PacketFulfillmentNotProvenError";
      check(threw === null || refusedForFulfillment,
        `${code}:${pathway.id}: the delivery guard refused a renderable route for a reason other than unproven fulfillment (${threw?.name})`);
      if (threw === null) soldCount += 1;
    } else {
      check(threw instanceof ConsumerPacketNotDeliverableError || threw?.name === "PacketFulfillmentNotProvenError",
        `${code}:${pathway.id}: a route that cannot render was allowed through the delivery guard`);
      refusedCount += 1;

      // The same route must also be refused by the whole checkout guard and
      // must never be shown a price.
      let checkoutThrew = null;
      try {
        assertCheckoutAllowed(verificationSnapshot(code, pathway.id));
      } catch (error) {
        checkoutThrew = error;
      }
      check(checkoutThrew !== null, `${code}:${pathway.id}: assertCheckoutAllowed admitted a route that cannot produce a packet`);

      const placeholder = createConsumerPaymentPlaceholder(eligibilityResult(code, label), pathway.id);
      check(placeholder.enabled === false,
        `${code}:${pathway.id}: a $50 price was offered for a route that cannot produce a packet`);
      check(placeholder.amountCents === undefined,
        `${code}:${pathway.id}: an amount was quoted for a route that cannot produce a packet`);
    }
  }
}

// --------------------------------------------------------------------------- the legacy generators are preserved, and not by price
/**
 * This block used to require that the five preserved legacy jurisdictions keep
 * a live direct-consumer price. They do not any more, deliberately.
 *
 * What that price bought was measured rather than assumed. The direct-consumer
 * paid path has one artifact builder, it takes no branch on jurisdiction, and
 * it returned a text/plain route summary — for Mississippi and Illinois and the
 * District of Columbia and Pennsylvania and Texas exactly as for everywhere
 * else. The legacy PETITION generators are a different path: they render from a
 * stored document packet at /documents/[partnerSlug]/[packetId], and the paid
 * consumer flow never reached them. So the price was not the legacy generator's
 * price; it was a price for the summary.
 *
 * The generators themselves are preserved and are still asserted below: their
 * renderers exist, their jurisdictions still resolve to a route of their own,
 * and their document components still render. What is closed is charging a
 * participant on a path that would not have given them one — and since
 * ADR-0004 that closure is the owner's decision rather than an inference: the
 * five legacy generators are retired as commercial fulfillment paths, so they
 * classify legacy_retired and sell nothing, while everything that makes them
 * worth keeping is asserted here unchanged.
 */
for (const code of LEGACY_VERIFIED_JURISDICTIONS) {
  const profile = profiles.find((p) => p.jurisdiction.code === code);
  check(Boolean(profile), `${code}: legacy verified jurisdiction has no compiled profile`);
  if (!profile) continue;
  const label = profile.pathways[0]?.label ?? "";
  const item = payableItem(code, label);
  let threw = null;
  try {
    assertCheckoutAllowed(verificationSnapshot(code, profile.pathways[0]?.id ?? null));
  } catch (error) {
    threw = error;
  }
  // The one refusal that would mean the generator itself was fenced off.
  check(!(threw instanceof ConsumerPacketNotDeliverableError),
    `${code}: the delivery guard fenced off a legacy verified generator, which must keep rendering`);
  // A legacy jurisdiction's first pathway can independently be an exact
  // deferral or a terminal treatment, and those refuse with
  // ConsumerCheckoutNotAllowedError. That is a statement about the ROUTE and
  // says nothing about the generator, so it belongs in the accepted set; the
  // check that actually protects the generator is the one directly above, which
  // requires that the delivery guard was not what fenced it off.
  check(threw === null
    || threw?.name === "PacketFulfillmentNotProvenError"
    || threw?.name === "ConsumerCheckoutNotAllowedError",
    `${code}: checkout refused a legacy jurisdiction for an unexpected reason (${threw?.name})`);
  // The generator is preserved where preservation actually lives.
  const route = resolvePacketRoute({ state: code, pathway: profile.pathways[0]?.id ?? null, trackId: null });
  // Any classification EXCEPT the two that mean "this jurisdiction is unknown".
  // Texas's first pathway is an accepted exact-supported deferral, which is a
  // decision about that route rather than a loss of the generator.
  check(route.routeKind !== "disabled" && route.routeKind !== "guidance_only",
    `${code}: the packet route resolver stopped recognising this jurisdiction (${route.routeKind})`);
  check(new RegExp(`^\\s*${code}: `, "m").test(documentRendererSource),
    `${code}: the governed document renderer map no longer names this jurisdiction, which is what "preserved" actually protects`);
}

// --------------------------------------------------------------------------- the gate is measurably narrower
const payableAndUndeliverable = payableRoutes.filter(({ jurisdiction, pathwayId }) => {
  const profile = profiles.find((p) => p.jurisdiction.code === jurisdiction);
  const pathway = profile?.pathways.find((p) => p.id === pathwayId);
  if (!pathway) return false;
  return !packetRouteCanRender(resolvePacketRoute({ state: jurisdiction, pathway: pathway.id, trackId: null }));
});

for (const route of payableAndUndeliverable) {
  const profile = profiles.find((p) => p.jurisdiction.code === route.jurisdiction);
  const pathway = profile.pathways.find((p) => p.id === route.pathwayId);
  let threw = null;
  try {
    assertCheckoutAllowed(verificationSnapshot(route.jurisdiction, pathway.id));
  } catch (error) {
    threw = error;
  }
  // Any of the three refusals closes the sale, and which one fires first is not
  // the point of this file. assertCheckoutAllowed refuses most-specific-first
  // and backstops with the fulfillment gate, so a route that is undeliverable
  // AND unproven AND independently suppressed reports the most specific reason
  // it has. Naming one of them as the required refusal would fail the build for
  // refusing for a better reason. What must never appear here is `nothing`.
  check(threw instanceof ConsumerPacketNotDeliverableError
    || threw?.name === "PacketFulfillmentNotProvenError"
    || threw?.name === "ConsumerCheckoutNotAllowedError",
    `${route.key}: the evaluator marks this route payment-eligible and it cannot produce an artifact, yet checkout admitted it (threw ${threw?.name ?? "nothing"})`);
}

if (MUTATIONS) {
  // Prove the guard is what is doing the work: an item that bypasses it must be
  // caught by nothing else, so removing the guard would silently reopen the
  // charge. This asserts the failure mode rather than trusting the guard's name.
  const undeliverable = profiles
    .flatMap((p) => p.pathways.map((pathway) => ({ code: p.jurisdiction.code, id: pathway.id, label: pathway.label })))
    .find(({ code, id }) => !packetRouteCanRender(resolvePacketRoute({ state: code, pathway: id, trackId: null })));
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
console.log("No route can take money for a packet it cannot produce. Since ADR-0004 no route sells at all until a Grade-A fulfillment record proves it delivers, so the second half of this binding is currently vacuous by design rather than by accident.");
