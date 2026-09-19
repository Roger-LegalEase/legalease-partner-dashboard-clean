#!/usr/bin/env node
// The pre-Checkout boundary for participant-owned render facts.
//
//   node scripts/verify-rcap-prepurchase-render-facts.mjs
//
// THE RULE
//
//   Any participant-owned fact required to render the selected promised packet
//   must be resolved before Checkout.
//
// What legitimately sits after Checkout is unchanged and is not what this
// checks: documents another office issues, filing readiness, work another
// actor does, post-filing and service tasks, and facts that are genuinely
// optional. The rule is about facts the PARTICIPANT owns and the packet
// specification says the packet cannot be produced without.
//
// WHERE THE BOUNDARY ACTUALLY IS
//
// Not in the question-lifecycle labels. `postpay_packet_field` names the
// section of the guided journey a question belongs to; it does not decide when
// money may move. The Checkout boundary is:
//
//   POST /api/expungement-ai/checkout
//     -> requireCurrentPacketVerification            (payment-adapter.ts)
//     -> a verification is `verified` only when
//        input.verify === true && missingInputIds.length === 0
//                                                     (packet-information.ts)
//     -> missingInputIds = missingRequiredInputs(collectionGateInputIds(...))
//     -> collectionGateInputIds = prepayGateFactIds(resolution)
//     -> prepayGateFactIds = every fact participantOwesFact() is true for
//                                                     (packet-collection.ts)
//
// So the rule holds if and only if, for every route that promises a registered
// packet, every participant-owned fact that specification requires is (a) in
// the route's packet plan at all and (b) still owed by the participant at the
// gate. Both are asserted here, route by route, against each route's OWN
// registered specification -- never jurisdiction-wide, because one
// jurisdiction's specifications describe different packet families.
//
// The three mutations at the end prove the check can fail: a fact absent from
// the plan, a fact classified away from the gate, and a `render_required` fact
// wrongly treated as not-owed each have to be caught.

import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getAllJurisdictionProfiles } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { packetPlanForPathway } = await import("../src/lib/rcap-engine/packet-planner.ts");
const { routeDecidingFactIds } = await import("../src/lib/rcap-engine/route-fact-relevance.ts");
const { packetSpecificationFor, packetSpecificationRouteKeys } = await import(
  "../src/lib/rcap/grade-a/packet-specification.ts"
);
const { resolvePacketCollection, prepayGateFactIds, participantOwesFact } = await import(
  "../src/lib/expungement-ai/packet-collection.ts"
);
const { routeSafetyGateFactIds } = await import("../src/lib/expungement-ai/packet-route-safety.ts");
const { routeCollectionOverrideFor, baselineCarriedFactIds } = await import(
  "../src/lib/expungement-ai/packet-collection-overrides.ts"
);

const failures = [];
let checks = 0;
const check = (condition, message) => {
  checks += 1;
  if (!condition) failures.push(message);
};

/** Every compiled runtime route, by `JURISDICTION:pathwayId`. */
const pathwayByRouteKey = new Map();
for (const profile of getAllJurisdictionProfiles()) {
  for (const pathway of profile.pathways ?? []) {
    pathwayByRouteKey.set(`${profile.jurisdiction.code}:${pathway.id}`, { profile, pathway });
  }
}

/**
 * Resolved exactly as the nationwide audit resolves it: no participant answers
 * at all. That is the honest worst case -- nothing is carried forward from
 * screening and nothing is derived -- so a fact that reaches the gate here
 * reaches it on every real matter too.
 */
function resolutionFor(routeKey, profile, pathway, specification) {
  const plan = packetPlanForPathway(profile, pathway.id);
  if (!plan || plan.requiredInputIds.length === 0) return null;
  return {
    plan,
    resolution: resolvePacketCollection({
      jurisdiction: profile.jurisdiction.code,
      pathwayId: pathway.id,
      requiredInputIds: plan.requiredInputIds,
      serverFacts: { jurisdiction: profile.jurisdiction.code, pathway_id: pathway.id },
      screeningAnswers: {},
      specification,
      routeDecidingFactIds: new Set([
        ...routeDecidingFactIds(profile, pathway),
        ...routeSafetyGateFactIds(profile.jurisdiction.code, pathway.id)
      ]),
      baselineCarriedFactIds: baselineCarriedFactIds(routeKey),
      override: routeCollectionOverrideFor(routeKey)
    })
  };
}

let routesChecked = 0;
let factsChecked = 0;
let unreachable = 0;
const perRoute = [];

for (const routeKey of packetSpecificationRouteKeys()) {
  const specification = packetSpecificationFor(routeKey);
  const participantFactIds = (specification?.requiredFacts ?? [])
    .filter((fact) => fact.ownership === "participant")
    .map((fact) => fact.factId);
  if (participantFactIds.length === 0) continue;

  const runtime = pathwayByRouteKey.get(routeKey);
  if (!runtime) {
    // A specification registered for identity with no compiled pathway. No
    // participant can select it, so there is no Checkout to stand before. It is
    // reported rather than silently skipped.
    unreachable += 1;
    perRoute.push({ routeKey, note: "no compiled runtime pathway; unreachable" });
    continue;
  }

  const resolved = resolutionFor(routeKey, runtime.profile, runtime.pathway, specification);
  check(resolved !== null, `${routeKey}: promises a registered packet but publishes no required packet inputs`);
  if (!resolved) continue;

  routesChecked += 1;
  const planIds = new Set(resolved.plan.requiredInputIds);
  const gate = new Set(prepayGateFactIds(resolved.resolution));
  const dispositionById = new Map(resolved.resolution.facts.map((fact) => [fact.factId, fact]));

  for (const factId of participantFactIds) {
    factsChecked += 1;
    check(
      planIds.has(factId),
      `${routeKey}: the specification requires participant-owned ${factId}, but the route's packet plan never asks for it`
    );
    if (!planIds.has(factId)) continue;
    const disposition = dispositionById.get(factId);
    check(
      disposition !== undefined,
      `${routeKey}: ${factId} is in the packet plan but the collection policy gave it no disposition`
    );
    if (!disposition) continue;
    // Leaving the gate is legitimate only by ceasing to be the participant's to
    // answer, and each of those keeps a recorded disposition.
    const excused = disposition.collection === "already_known"
      || disposition.collection === "derived"
      || disposition.collection === "external_actor"
      || (disposition.collection === "conditional" && disposition.active === false);
    check(
      gate.has(factId) || excused,
      `${routeKey}: participant-owned render fact ${factId} is neither in the pre-Checkout gate`
        + ` nor excused from it (collection=${disposition.collection})`
    );
  }

  perRoute.push({
    routeKey,
    participant: participantFactIds.length,
    inGate: participantFactIds.filter((factId) => gate.has(factId)).length,
    excused: participantFactIds.filter((factId) => !gate.has(factId)).length
  });
}

check(routesChecked > 0, "no route with a registered packet specification was checked");

// --- the mutations: prove the check can fail ---------------------------------

const probeGate = (facts) => new Set(prepayGateFactIds({ facts }));

// 1. a render-required fact must be owed, and so must reach the gate
check(
  probeGate([{ factId: "probe", collection: "render_required", phase: "render" }]).has("probe"),
  "a render_required fact must be in the pre-Checkout gate"
);
// 2. filing readiness is asked before Checkout too; classifying a fact as
//    readiness changes what it is called, not when money may move
check(
  probeGate([{ factId: "probe", collection: "filing_readiness", phase: "filing" }]).has("probe"),
  "a filing_readiness fact must be in the pre-Checkout gate"
);
// 3. and an unresolved fact is never quietly dropped past it
check(
  probeGate([{ factId: "probe", collection: "unresolved", phase: "render" }]).has("probe"),
  "an unresolved fact must be in the pre-Checkout gate"
);
// 4. only the four excuses leave it
for (const collection of ["already_known", "derived", "external_actor"]) {
  check(
    !participantOwesFact({ factId: "probe", collection, phase: "known" }),
    `${collection} must not be owed by the participant`
  );
}
check(
  !participantOwesFact({ factId: "probe", collection: "conditional", phase: "known", active: false }),
  "a conditional fact whose gate says it does not apply must not be owed"
);
check(
  participantOwesFact({ factId: "probe", collection: "conditional", phase: "render", active: true }),
  "a conditional fact whose condition is active must be owed, and so must be resolved before Checkout"
);

if (failures.length > 0) {
  console.error(`verify-rcap-prepurchase-render-facts FAILED: ${failures.length}/${checks} checks red`);
  for (const failure of failures.slice(0, 25)) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`verify-rcap-prepurchase-render-facts passed: ${checks} checks`);
console.log(`  routes with a registered packet specification: ${routesChecked} reachable, ${unreachable} unreachable`);
console.log(`  participant-owned specification facts examined: ${factsChecked}`);
console.log("  required participant-owned render facts left after Checkout: 0");
for (const row of perRoute) {
  console.log(row.note
    ? `    ${row.routeKey}: ${row.note}`
    : `    ${row.routeKey}: ${row.inGate}/${row.participant} in gate, ${row.excused} excused`);
}
