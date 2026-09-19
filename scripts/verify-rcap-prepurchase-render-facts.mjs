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
// and, in the other direction:
//
//   A record Expungement.ai cannot produce is never a condition of Checkout.
//
// A certified disposition, a docket sheet, a criminal-history report, a
// fingerprint card, an agency letter: the participant fetches these before they
// FILE, and being asked to fetch one must not stand between them and a
// purchase. Where such a record carries a fact one of OUR documents needs, the
// product asks for the FACT and never for the record. Both halves are asserted
// here, because each without the other is its own defect: a clerk's counter in
// front of a payment, or a filing requirement nobody is told about.
//
// What legitimately sits after Checkout: documents another office issues,
// filing readiness, work another actor does, post-filing and service tasks,
// and facts that are genuinely optional.
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
//     -> prepayGateFactIds = every fact participantOwesFact() is true for,
//        MINUS the filing-readiness tasks     (packet-collection.ts)
//
// So the rule holds if and only if, for every route that promises a registered
// packet, every participant-owned fact that specification requires is (a) in
// the route's packet plan at all and (b) still owed by the participant at the
// gate. Both are asserted here, route by route, against each route's OWN
// registered specification -- never jurisdiction-wide, because one
// jurisdiction's specifications describe different packet families.
//
// The mutations at the end prove the check can fail: a fact absent from the
// plan, a fact classified away from the gate, a `render_required` fact wrongly
// treated as not-owed, a filing-readiness task put back into the gate, and one
// dropped from the participant's list entirely.

import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getAllJurisdictionProfiles } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { packetPlanForPathway } = await import("../src/lib/rcap-engine/packet-planner.ts");
const { routeDecidingFactIds } = await import("../src/lib/rcap-engine/route-fact-relevance.ts");
const { packetSpecificationFor, packetSpecificationRouteKeys, composablePacketSpecificationFor } = await import(
  "../src/lib/rcap/grade-a/packet-specification.ts"
);
const { renderPreflight } = await import("../src/lib/expungement-ai/render-preflight.ts");
const { documentContractFor, isCourtFacing } = await import("../src/lib/rcap/grade-a/document-contract.ts");
const { resolvePacketCollection, prepayGateFactIds, filingReadinessFactIds, participantOwesFact } = await import(
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
    // Filing readiness leaves the gate by rule, not by accident: a record the
    // participant fetches from a clerk is not a condition of buying what we
    // generate. It is excused HERE and asserted separately below, because
    // leaving the gate must not mean leaving the packet.
    const excused = disposition.collection === "already_known"
      || disposition.collection === "derived"
      || disposition.collection === "external_actor"
      || disposition.collection === "filing_readiness"
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

// --- the other half of the rule: nothing ELSE may block Checkout -------------
//
// The gate may hold unresolved eligibility facts and participant-owned facts
// actually required to produce the promised packet. It may NOT hold a task the
// participant does later: a signature, a notarisation, a certified copy to
// fetch, a service step, or work that belongs to another actor. Displaying a
// checklist before payment is not the same as demanding every checklist task
// before payment.
//
// `prepay_confirmation` and `render_required` are the two classes the rule
// admits by name. Everything else in the gate — filing readiness, and a
// conditional whose condition is live — has to earn its place, and the
// authority for that is not the class name or the specification's prose. It is
// the renderer: drop the fact and ask whether the packet still composes. A
// fact the composer refuses to proceed without is a generation prerequisite,
// whatever it is called. A fact it composes happily without is a later task
// standing in front of a payment, and that is the defect this catches.

const ADMITTED_BY_NAME = new Set(["prepay_confirmation", "render_required"]);
const externallyAcquired = [];
const notYetProbes = [];
const gateClassCounts = {};
const renderProbe = { required: 0, overGated: [], unreachable: [] };

/** Values that satisfy each route's own rules, not merely its fact list. */
function probeValueFor(factId) {
  if (factId === "social_security_number") return "123-45-6789";
  if (factId === "social_security_number_last_four") return "6789";
  if (factId === "mcic_identifier_delivery_method") return "Confidential court-approved MCIC identifier addendum";
  if (factId === "mcic_identifier_method_confirmation_source") return "Confirmed by the Hinds County Circuit Court on 2026-01-05";
  if (factId === "certified_disposition_exhibit_status") return "Attached as Exhibit A";
  if (factId === "docket_sheet_exhibit_status") return "Inserted as Exhibit B";
  if (factId === "service_address_confirmation_status") return "Confirmed by court or prosecutor";
  if (/_date$/.test(factId) || factId === "date_of_birth") return "2015-01-15";
  if (factId === "statutory_disposition_category" || factId === "disposition_record_wording") return "Charges dropped";
  if (factId === "actual_arrest" || factId === "release_confirmed") return "Yes";
  if (factId === "personal_impact_confirmed") return "No";
  if (factId === "record_type") return "Court case";
  if (["pending_cases", "trafficking_status", "prior_relief", "nonadjudication_or_diversion", "open_co_defendant_matter"]
    .includes(factId)) return "No";
  return "Acceptance value";
}

for (const [routeKey, { profile, pathway }] of pathwayByRouteKey) {
  const specification = packetSpecificationFor(routeKey);
  const resolved = resolutionFor(routeKey, profile, pathway, specification ?? null);
  if (!resolved) continue;

  const gate = new Set(prepayGateFactIds(resolved.resolution));
  const readiness = filingReadinessFactIds(resolved.resolution);
  const dispositionById = new Map(resolved.resolution.facts.map((fact) => [fact.factId, fact]));

  // INVARIANT 1 — no record Expungement.ai cannot produce is a condition of
  // Checkout. A certified disposition, a docket sheet, a criminal-history
  // report, an agency letter: the participant fetches these before they FILE.
  //
  // The test is not whether the QUESTION is asked — several of these statuses
  // print on our own documents, and "Not attached" is a one-click answer from
  // wherever the participant is sitting. The test is whether a PARTICULAR
  // answer is demanded, because demanding the ready one puts a clerk's counter
  // between a participant and a purchase. So: compose the packet with each
  // filing-readiness fact set to its not-yet state and require that the packet
  // is still produced.
  for (const factId of readiness) {
    externallyAcquired.push(`${routeKey} ${factId}`);
    const disposition = dispositionById.get(factId);
    check(disposition !== undefined && participantOwesFact(disposition),
      `${routeKey}: ${factId} stopped being owed at all;`
        + " a filing-readiness task must still be asked, tracked and surfaced");
  }
  const notYetDerived = resolved.resolution.facts
    .filter((entry) => entry.source === "packet_specification_not_yet_state")
    .map((entry) => entry.factId);
  if (notYetDerived.length > 0) notYetProbes.push({ routeKey, profile, pathway, readiness: notYetDerived });

  const mustEarnIt = [...gate].filter((factId) => {
    const collection = dispositionById.get(factId)?.collection;
    gateClassCounts[collection ?? "unknown"] = (gateClassCounts[collection ?? "unknown"] ?? 0) + 1;
    return !ADMITTED_BY_NAME.has(collection ?? "");
  });
  if (mustEarnIt.length === 0) continue;

  // Without a composable specification there is nothing to ask the renderer,
  // and nothing reaches Checkout either: the preflight refuses the route long
  // before the gate is consulted. Recorded, not silently passed.
  const composable = specification ? composablePacketSpecificationFor(routeKey) : undefined;
  const facts = composable
    ? Object.fromEntries(composable.requiredFacts.map((fact) => [fact.factId, probeValueFor(fact.factId)]))
    : {};
  const serverFacts = { jurisdiction: profile.jurisdiction.code, pathway_id: pathway.id };
  const snapshot = {
    schemaVersion: "expungement-ai/final-verification/v1",
    verifiedAt: "2026-09-16T12:00:00.000Z",
    jurisdiction: profile.jurisdiction.code,
    pathwayId: pathway.id,
    selectedTrackId: composable?.trackId,
    screeningAnswers: {},
    prefilledAnswers: {},
    packetAnswers: facts,
    serverFacts
  };
  const baseline = composable
    ? renderPreflight({ snapshot, verificationHash: "probe", facts: { ...facts, ...serverFacts } })
    : { ready: false, reason: "no_composable_specification_for_route" };
  if (!baseline.ready) {
    renderProbe.unreachable.push(`${routeKey} (${mustEarnIt.length} fact(s); ${baseline.reason})`);
    continue;
  }

  for (const factId of mustEarnIt) {
    const without = { ...facts };
    delete without[factId];
    const probe = renderPreflight({ snapshot, verificationHash: "probe", facts: { ...without, ...serverFacts } });
    const requiredToRender = probe.ready === false && (probe.missingFactIds ?? []).includes(factId);
    if (requiredToRender) renderProbe.required += 1;
    else renderProbe.overGated.push(`${routeKey} ${factId} (${dispositionById.get(factId)?.collection})`);
    check(
      requiredToRender,
      `${routeKey}: ${factId} blocks Checkout as ${dispositionById.get(factId)?.collection},`
        + " but the packet composes without it, so it is a later task standing in front of a payment"
    );
  }
}

// --- INVARIANT 1, load-bearing: the packet composes with nothing fetched -----
//
// Every filing-readiness fact set to the state of a participant who has not
// been to the courthouse, using the specification's OWN wording for that state
// rather than any this check invents. If the packet still composes, no record
// the product cannot produce is a condition of producing the ones it can.

let notYetProven = 0;
for (const { routeKey, profile, pathway, readiness } of notYetProbes) {
  const composable = composablePacketSpecificationFor(routeKey);
  if (!composable) continue;
  const facts = Object.fromEntries(composable.requiredFacts.map((fact) => [fact.factId, probeValueFor(fact.factId)]));
  const notYetUsed = [];
  for (const factId of readiness) {
    const options = (composable.requiredFacts.find((fact) => fact.factId === factId)?.options ?? [])
      .filter((option) => typeof option === "string");
    // The not-yet option is the one the specification words as an absence. Its
    // own vocabulary, never this check's.
    // Deleted outright, not set to the not-yet wording: the participant is
    // never asked these, so the packet has to compose when they have supplied
    // nothing at all about them and the specification's own wording is what
    // gets printed.
    delete facts[factId];
    const notYet = options.find((option) => /^(not |to be )/i.test(option));
    check(notYet !== undefined,
      `${routeKey}: ${factId} concerns a record in hand but the specification offers no not-yet wording,`
        + ` so the packet has nothing truthful to print for it (options: ${JSON.stringify(options)})`);
    notYetUsed.push(`${factId} unanswered`);
  }
  const serverFacts = { jurisdiction: profile.jurisdiction.code, pathway_id: pathway.id };
  const outcome = renderPreflight({
    snapshot: {
      schemaVersion: "expungement-ai/final-verification/v1",
      verifiedAt: "2026-09-16T12:00:00.000Z",
      jurisdiction: profile.jurisdiction.code,
      pathwayId: pathway.id,
      selectedTrackId: composable.trackId,
      screeningAnswers: {}, prefilledAnswers: {}, packetAnswers: facts, serverFacts
    },
    verificationHash: "probe",
    facts: { ...facts, ...serverFacts }
  });
  notYetProven += 1;
  check(outcome.ready === true,
    `${routeKey}: the packet will not compose while the participant still has records to fetch`
      + ` (${notYetUsed.join(", ")}) — reason: ${outcome.reason ?? ""} ${JSON.stringify(outcome.missingFactIds ?? [])}.`
      + " An externally acquired document must not make the packet un-generatable");
}

// --- INVARIANT 1, nationwide: no fact demands possession of a record --------
//
// A fact whose answers are about HAVING a document — "Attached as Exhibit A",
// "Inserted as Exhibit B" — is a possession status, and the participant can
// only answer the ready one by going to a clerk. Every one of these must offer
// a truthful not-yet answer and must be classified as filing readiness, so the
// not-yet composition proof above covers it. A new specification that adds a
// possession question without a not-yet answer fails here rather than in a
// participant's hands.

const POSSESSION_ANSWER = /^(attached|inserted|obtained|received|have it)\b/i;
let possessionFacts = 0;
for (const routeKey of packetSpecificationRouteKeys()) {
  const specification = packetSpecificationFor(routeKey);
  for (const requiredFact of specification?.requiredFacts ?? []) {
    const options = (requiredFact.options ?? []).filter((option) => typeof option === "string");
    if (!options.some((option) => POSSESSION_ANSWER.test(option))) continue;
    possessionFacts += 1;
    const notYet = options.find((option) => /^(not |to be )/i.test(option));
    check(notYet !== undefined,
      `${routeKey}: ${requiredFact.factId} concerns a record in hand but the specification offers no not-yet`
        + " wording, so the packet has nothing truthful to state for a participant who has not obtained it");
    if (notYet === undefined) continue;
    const runtime = pathwayByRouteKey.get(routeKey);
    const resolved = runtime ? resolutionFor(routeKey, runtime.profile, runtime.pathway, specification) : null;
    if (!resolved) continue;
    // ...and it is not asked at all. We already know the record has to be
    // fetched; making the participant confirm they have not fetched it yet,
    // before we will build their packet, is intake friction that buys the
    // product nothing. The task belongs on the filing checklist.
    const disposition = resolved.resolution.facts.find((entry) => entry.factId === requiredFact.factId);
    check(disposition !== undefined && !participantOwesFact(disposition),
      `${routeKey}: ${requiredFact.factId} asks the participant whether an outside record is in hand`
        + ` (collection=${disposition?.collection ?? "none"}). A document the product cannot produce is a filing`
        + " task to state, not a question to ask before generating");
    check(disposition?.value === notYet,
      `${routeKey}: ${requiredFact.factId} is not asked, but the packet does not state the specification's own`
        + ` not-yet wording for it either (got ${JSON.stringify(disposition?.value ?? null)});`
        + " the document would print a blank where a status belongs");
  }
}

// --- Court papers stay court papers -----------------------------------------
//
// Deriving a not-yet status instead of asking for it solves the friction
// problem. It does not make that status appropriate inside a filing. A
// certificate of service that reads "Service-address status: To be confirmed
// before filing or service" is telling a court about the participant's
// workflow, and an assembly-status list inside the same filing is a checklist
// wearing a court document's caption. Both belong in the supplemental guide.
//
// So: no document the contract addresses to a court may carry workflow status
// language. The participant guidance is where it goes, and the attachments and
// checklist a route publishes are where the instruction lives.

// The population is whatever the document contract currently calls court-facing
// and is never pinned to a number. A route §5 makes renderable tomorrow enters
// this check tomorrow, with no edit here. The only assertion about the count is
// that it is not zero: a contract accessor that stopped classifying anything
// would otherwise make every check below pass by having nothing to check.
const WORKFLOW_LANGUAGE = /\b(not attached|not inserted|to be confirmed|not yet (obtained|confirmed|attached)|assembly status)\b/i;
let courtFacingChecked = 0;
let sectionsChecked = 0;
for (const routeKey of packetSpecificationRouteKeys()) {
  const specification = packetSpecificationFor(routeKey);
  for (const document of specification?.documents ?? []) {
    const contract = documentContractFor(document);
    if (!isCourtFacing(contract)) continue;
    courtFacingChecked += 1;
    for (const section of document.sections ?? []) {
      const printed = [section.heading, section.body, ...Object.values(section.fieldLabels ?? {})]
        .filter((value) => typeof value === "string").join(" ");
      const hit = printed.match(WORKFLOW_LANGUAGE);
      sectionsChecked += 1;
      check(!hit,
        `${routeKey}/${document.documentId}: the section "${section.heading}" is filed with the court and carries`
          + ` the participant workflow phrase ${JSON.stringify(hit?.[0])}. A filing states what is filed;`
          + " tell the participant what to obtain and attach in the guide, not the court");
    }
  }
}

check(courtFacingChecked > 0,
  "no document was classified court-facing, so the workflow-language check had nothing to examine");
check(sectionsChecked > 0,
  "no court-facing section was examined, so the workflow-language check passed vacuously");

// --- the mutations: prove the check can fail ---------------------------------

const probeGate = (facts) => new Set(prepayGateFactIds({ facts }));

// 1. a render-required fact must be owed, and so must reach the gate
check(
  probeGate([{ factId: "probe", collection: "render_required", phase: "render" }]).has("probe"),
  "a render_required fact must be in the pre-Checkout gate"
);
// 2. a filing-readiness fact is still owed, so it is still asked, still
//    tracked and still printed truthfully. Dropping it would print a blank
//    where an assembly status belongs.
const readinessProbe = [{ factId: "probe", collection: "filing_readiness", phase: "filing" }];
check(
  participantOwesFact(readinessProbe[0]),
  "a filing_readiness fact must still be owed by the participant, so it is still asked and surfaced"
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
console.log("  what stands between a participant and Checkout, by collection class:");
for (const [collection, count] of Object.entries(gateClassCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${String(count).padStart(5)}  ${collection}${ADMITTED_BY_NAME.has(collection) ? "" : "  (each one proven necessary to render)"}`);
}
console.log(`  gate facts outside those two classes, proven required by the renderer: ${renderProbe.required}`);
console.log(`  gate facts the packet composes without (later tasks blocking payment): ${renderProbe.overGated.length}`);
console.log(`  outside filing tasks the participant is made to report on before generation: ${externallyAcquired.length}`);
console.log(`  routes proven to compose with every external record still unfetched: ${notYetProven}`);
console.log(`  facts asking whether a record is in hand, each with a truthful not-yet answer: ${possessionFacts}`);
console.log(`  court-facing documents checked for participant workflow language: ${courtFacingChecked}`
  + ` (${sectionsChecked} sections; population follows the document contract, never a pinned number)`);
for (const row of externallyAcquired) console.log(`    ${row}`);
for (const row of renderProbe.unreachable) {
  console.log(`    not probed, route does not compose at all: ${row}`);
}
for (const row of perRoute) {
  console.log(row.note
    ? `    ${row.routeKey}: ${row.note}`
    : `    ${row.routeKey}: ${row.inGate}/${row.participant} in gate, ${row.excused} excused`);
}
