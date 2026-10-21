#!/usr/bin/env node
/**
 * The two Kansas municipal routes, and only those two.
 *
 *   node scripts/verify-rcap-kansas-municipal-runtime-routes.mjs
 *
 * Kansas carried two approved legal-design tracks with no compiled runtime
 * representation at all: K.S.A. 12-4516, the municipal conviction-or-diversion
 * mechanism, and K.S.A. 12-4516a, the municipal arrest-record mechanism. The
 * census recorded both as `missing_from_compiled_runtime` with a null pathway
 * and a null contract, so the resolver — which forms a route id as
 * `${jurisdiction}:${pathwayId}` — had no id to be handed.
 *
 * This proves exactly the seven things that change, and nothing else. It is
 * deliberately not a runtime test framework and it re-runs no other state's
 * pathway acceptance: it reads the committed artifacts and the live modules for
 * two route ids.
 *
 * The seven:
 *   1. the 12-4516 municipal route resolves to its own municipal pathway;
 *   2. the 12-4516a municipal-arrest route resolves to its own municipal pathway;
 *   3. neither maps to a K.S.A. 21-6614 district-court route;
 *   4. each resolves to the rcap-ks-custom-pleading packet family;
 *   5. screening and Briefcase preserve the same canonical route identity;
 *   6. payment and sponsorship remain denied until a current v2 record exists;
 *   7. an unknown or incomplete Kansas route still fails closed.
 */
process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01";

import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { resolvePacketRoute } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");
const { resolvePacketFamilyId, commercialRouteIdentity } = await import("../src/lib/rcap/render/commercial-admission.ts");
const { admitCommercial, fulfillmentAuthorityFor } = await import("../src/lib/rcap/fulfillment/grade-a-admission.ts");
const { getCurrentFulfillmentRecord } = await import("../src/lib/rcap/fulfillment/grade-a-registry.ts");
const { COMPLETE_PACKET_PROVEN, GRADE_A_ADMISSION_SCHEMA_VERSION } = await import("../src/lib/rcap/fulfillment/grade-a-authority.ts");
const { legalRouteContract, routeDeliveryAuthority } = await import("../src/lib/legal-authority/index.ts");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");

const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));

const CENSUS = read("data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json");
const CROSSWALK = read("data/rcap-ledger/track-pathway-crosswalk.json");
const WITNESSES = read("data/rcap-ledger/public-witness-answer-sets.json");
const PROFILE = read("src/lib/rcap-engine/compiled/profiles/KS-kansas.json");

/** The two routes under test, named by the mechanism rather than by a slug. */
const ROUTES = [
  {
    check: "12-4516",
    trackId: "ks-12-4516-municipal",
    pathwayId: "municipal-conviction-or-diversion-expungement-under-12-4516",
    statute: "Kan. Stat. Ann. § 12-4516",
    priorObligationKey: "obligation:track-only:KS:ks-12-4516-municipal"
  },
  {
    check: "12-4516a",
    trackId: "ks-12-4516a-municipal-arrest",
    pathwayId: "municipal-arrest-record-expungement-under-12-4516a",
    statute: "Kan. Stat. Ann. § 12-4516a",
    priorObligationKey: "obligation:track-only:KS:ks-12-4516a-municipal-arrest"
  }
];

/**
 * The four compiled Kansas pathways that existed before these two. Every one is
 * a district-court route under K.S.A. 21-6614 or its neighbours; mapping a
 * municipal route onto any of them would be a false identity rather than a
 * translation, so check 3 asserts the separation in both directions.
 */
const DISTRICT_COURT_PATHWAYS = [
  "conviction-or-diversion-216614",
  "specialty-court-accelerated",
  "prostitution-coercion",
  "drug-registration-relief-coordination"
];

const failures = [];
const checks = [];
const ok = (label) => checks.push(label);
const assert = (condition, label, detail) => {
  if (condition) ok(label);
  else failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
};

const routeIdOf = (route) => `KS:${route.pathwayId}`;
const censusRowFor = (route) => CENSUS.routes.find(
  (row) => row.jurisdiction === "KS" && row.trackId === route.trackId && row.runtimePathwayId === route.pathwayId
);

// ── 1 and 2. Each route resolves to its own municipal pathway ───────────────
for (const route of ROUTES) {
  const label = `${route.check}: resolves to its own municipal pathway`;
  const routeId = routeIdOf(route);

  const compiled = (PROFILE.pathways ?? []).find((pathway) => pathway.id === route.pathwayId);
  assert(Boolean(compiled), `${label} — the compiled Kansas profile carries the pathway`);
  assert(
    compiled?.legalAuthority?.statute === route.statute,
    `${label} — the compiled pathway names ${route.statute}`,
    `found ${compiled?.legalAuthority?.statute ?? "no statute"}`
  );

  const contract = legalRouteContract("KS", route.pathwayId);
  assert(Boolean(contract), `${label} — an approved route contract exists for ${routeId}`);
  assert(contract?.statute === route.statute, `${label} — the contract names ${route.statute}`, `found ${contract?.statute ?? "none"}`);

  const resolution = resolvePacketRoute({ state: "KS", pathway: route.pathwayId, trackId: route.trackId });
  assert(
    `${resolution.jurisdiction}:${resolution.pathwayId}` === routeId,
    `${label} — the resolver returns ${routeId}`,
    `returned ${resolution.jurisdiction}:${resolution.pathwayId}`
  );
  assert(
    resolution.routeKind !== "disabled" && resolution.rendererKind === "packet_document_v1",
    `${label} — the route is represented rather than unresolvable`,
    `routeKind ${resolution.routeKind}, rendererKind ${resolution.rendererKind}`
  );

  const crosswalkTrack = (CROSSWALK.registryTracks ?? []).find(
    (row) => row.jurisdiction === "KS" && row.registryTrackId === route.trackId
  );
  assert(
    (crosswalkTrack?.mappedCompiledPathwayIds ?? []).join(",") === route.pathwayId,
    `${label} — the crosswalk maps ${route.trackId} to exactly this pathway`,
    `mapped ${(crosswalkTrack?.mappedCompiledPathwayIds ?? []).join(",") || "nothing"}`
  );

  const censusRow = censusRowFor(route);
  assert(Boolean(censusRow), `${label} — the census carries a row for this track and pathway`);
  assert(
    censusRow?.runtimePathwayId === route.pathwayId
      && censusRow?.routeContractId === routeId
      && Boolean(censusRow?.currentServiceDisposition)
      && censusRow?.currentServiceDisposition !== "missing_from_compiled_runtime",
    `${label} — the census reports a non-null pathway, contract and service disposition`,
    `pathway ${censusRow?.runtimePathwayId ?? "null"}, contract ${censusRow?.routeContractId ?? "null"}, disposition ${censusRow?.currentServiceDisposition ?? "null"}`
  );
  assert(
    !CENSUS.routes.some((row) => row.routeKey === route.priorObligationKey),
    `${label} — the internal obligation key ${route.priorObligationKey} is no longer a standing unmapped row`
  );
}

// ── 3. Neither maps to a K.S.A. 21-6614 district-court route ────────────────
for (const route of ROUTES) {
  const label = `${route.check}: never maps to a district-court 21-6614 route`;
  const contract = legalRouteContract("KS", route.pathwayId);

  assert(
    !DISTRICT_COURT_PATHWAYS.includes(route.pathwayId),
    `${label} — the pathway id is not one of the four district-court pathways`
  );
  assert(
    !/21-6614/.test(String(contract?.statute ?? "")),
    `${label} — the contract statute is not 21-6614`,
    contract?.statute
  );

  const crosswalkTrack = (CROSSWALK.registryTracks ?? []).find(
    (row) => row.jurisdiction === "KS" && row.registryTrackId === route.trackId
  );
  assert(
    !(crosswalkTrack?.mappedCompiledPathwayIds ?? []).some((id) => DISTRICT_COURT_PATHWAYS.includes(id)),
    `${label} — the crosswalk maps the track to no district-court pathway`,
    (crosswalkTrack?.mappedCompiledPathwayIds ?? []).join(",")
  );

  const censusRow = censusRowFor(route);
  assert(
    !DISTRICT_COURT_PATHWAYS.includes(String(censusRow?.runtimePathwayId ?? "")),
    `${label} — the census route identity is not a district-court pathway`,
    String(censusRow?.runtimePathwayId)
  );
}

// The separation holds in the other direction too: the district-court pathways
// keep the tracks they had, and none of them acquired a municipal track.
for (const pathwayId of DISTRICT_COURT_PATHWAYS) {
  const row = (CROSSWALK.compiledPathways ?? []).find(
    (candidate) => candidate.jurisdiction === "KS" && candidate.compiledPathwayId === pathwayId
  );
  assert(
    !(row?.mappedRegistryTrackIds ?? []).some((trackId) => ROUTES.some((route) => route.trackId === trackId)),
    `district-court pathway ${pathwayId} serves no municipal track`,
    (row?.mappedRegistryTrackIds ?? []).join(",")
  );
}

// ── 4. Each resolves to rcap-ks-custom-pleading ─────────────────────────────
for (const route of ROUTES) {
  const routeId = routeIdOf(route);
  const label = `${route.check}: binds the rcap-ks-custom-pleading family`;

  assert(
    resolvePacketFamilyId(routeId) === "rcap-ks-custom-pleading",
    `${label} — resolvePacketFamilyId(${routeId})`,
    String(resolvePacketFamilyId(routeId))
  );
  assert(
    commercialRouteIdentity({ jurisdiction: "KS", pathwayId: route.pathwayId }).packetFamilyId === "rcap-ks-custom-pleading",
    `${label} — the commercial route identity carries the family`
  );
  assert(
    censusRowFor(route)?.packetFamilyId === "rcap-ks-custom-pleading",
    `${label} — the census row carries the family`,
    String(censusRowFor(route)?.packetFamilyId)
  );
}

// ── 5. Screening and Briefcase preserve the same canonical route identity ───
//
// The witness answer sets are the committed deterministic fixtures. Screening
// is run for real against the compiled profile, and the pathway it returns is
// handed to `commercialRouteIdentity`, which is the single helper every
// Briefcase, payment, generation and download admission point calls.
for (const route of ROUTES) {
  const routeId = routeIdOf(route);
  const label = `${route.check}: screening and Briefcase agree on ${routeId}`;
  const witness = (WITNESSES.witnesses ?? []).find((row) => row.pathwayKey === routeId);
  assert(Boolean(witness), `${label} — a public witness answer set exists`);
  if (!witness) continue;

  const evaluation = evaluateScreening({
    jurisdiction: "KS",
    profileVersion: witness.profileVersion,
    matterId: `ks-municipal-acceptance-${route.check}`,
    answers: witness.finalAnswers
  });

  assert(
    evaluation.pathwayId === route.pathwayId,
    `${label} — screening lands on the municipal pathway`,
    `landed on ${evaluation.pathwayId ?? "no pathway"}`
  );

  const screeningIdentity = commercialRouteIdentity({ jurisdiction: evaluation.jurisdiction, pathwayId: evaluation.pathwayId });
  // What a Briefcase carries is the server-owned jurisdiction and pathway; the
  // identity is rebuilt from those rather than stored, which is the fact under
  // test — a stored id could drift from the one screening produced.
  const briefcaseIdentity = commercialRouteIdentity({ jurisdiction: "KS", pathwayId: witness.terminalEvaluation.pathwayId });

  assert(screeningIdentity.routeId === routeId, `${label} — the screening identity is ${routeId}`, screeningIdentity.routeId);
  assert(briefcaseIdentity.routeId === routeId, `${label} — the Briefcase identity is ${routeId}`, briefcaseIdentity.routeId);
  assert(
    screeningIdentity.routeId === briefcaseIdentity.routeId
      && screeningIdentity.jurisdiction === briefcaseIdentity.jurisdiction
      && screeningIdentity.packetFamilyId === briefcaseIdentity.packetFamilyId,
    `${label} — the two identities are the same in all three fields`
  );
  assert(
    resolvePacketRoute({ state: "KS", pathway: evaluation.pathwayId }).pathwayId === witness.terminalEvaluation.pathwayId,
    `${label} — the resolver agrees with both`
  );
}

// ── 6. Payment and sponsorship remain denied until a current v2 record exists
const PAYMENT_POINTS = ["consumer_checkout", "sponsored_entitlement", "packet_credit_admission"];
for (const route of ROUTES) {
  const routeId = routeIdOf(route);
  const label = `${route.check}: money stays closed`;

  const record = getCurrentFulfillmentRecord(routeId);
  assert(record === null, `${label} — no current Grade-A fulfillment record exists for ${routeId}`, record ? record.recordId : "");
  const authority = fulfillmentAuthorityFor(routeId);
  assert(
    !(authority.state === COMPLETE_PACKET_PROVEN && record?.schemaVersion === GRADE_A_ADMISSION_SCHEMA_VERSION),
    `${label} — the route is not COMPLETE_PACKET_PROVEN at the v2 admission schema`,
    `state ${authority.state}`
  );

  const resolution = resolvePacketRoute({ state: "KS", pathway: route.pathwayId, trackId: route.trackId });
  assert(resolution.sellable === false, `${label} — the resolver reports sellable false`);
  assert(resolution.creditConsumable === false, `${label} — the resolver reports creditConsumable false`);
  assert(
    resolution.availability !== "PACKET_READY" && resolution.availability !== "CUSTOM_PLEADING_READY",
    `${label} — availability is not a ready state`,
    resolution.availability
  );

  const contract = legalRouteContract("KS", route.pathwayId);
  if (!contract) {
    // A route with no contract is a failure to report, not a crash to debug.
    failures.push(`${label} — no approved route contract exists for ${routeId}, so its delivery authority cannot be read`);
    continue;
  }
  const delivery = routeDeliveryAuthority(contract, new Date("2026-09-02T00:00:00.000Z"));
  assert(delivery.paymentAllowed === false, `${label} — the contract's delivery authority refuses payment`, delivery.holdReason ?? "");
  assert(delivery.sponsoredGenerationAllowed === false, `${label} — the contract's delivery authority refuses sponsored generation`, delivery.holdReason ?? "");
  assert(delivery.commerciallyDeliverable === false, `${label} — the contract is not commercially deliverable`);

  for (const admissionPoint of PAYMENT_POINTS) {
    const decision = admitCommercial(admissionPoint, commercialRouteIdentity({ jurisdiction: "KS", pathwayId: route.pathwayId }), null);
    assert(decision.admitted === false, `${label} — ${admissionPoint} is refused`, decision.denialCode ?? "");
  }
}

// ── 7. An unknown or incomplete Kansas route still fails closed ─────────────
const FAIL_CLOSED_INPUTS = [
  { label: "an unknown Kansas pathway", input: { state: "KS", pathway: "municipal-conviction-or-diversion-expungement-under-12-9999" } },
  { label: "a truncated municipal pathway id", input: { state: "KS", pathway: "municipal-conviction-or-diversion" } },
  { label: "a Kansas route with no pathway at all", input: { state: "KS", pathway: "" } },
  { label: "a Kansas route with a null pathway", input: { state: "KS", pathway: null } }
];
for (const { label, input } of FAIL_CLOSED_INPUTS) {
  const resolution = resolvePacketRoute(input);
  assert(resolution.sellable === false, `fails closed: ${label} is not sellable`);
  assert(resolution.creditConsumable === false, `fails closed: ${label} consumes no credit`);
  assert(resolution.availability === "UNFINISHED", `fails closed: ${label} is UNFINISHED`, resolution.availability);
  assert(
    resolvePacketFamilyId(`KS:${String(input.pathway ?? "")}`) === null,
    `fails closed: ${label} binds no packet family`
  );
  const decision = admitCommercial(
    "consumer_checkout",
    commercialRouteIdentity({ jurisdiction: "KS", pathwayId: input.pathway ?? "" }),
    null
  );
  assert(decision.admitted === false, `fails closed: ${label} is refused at consumer_checkout`);
}

// An incomplete answer set on a real municipal route must not produce a route
// the product would sell either: the evaluator answers, and the money stays shut.
{
  const witness = (WITNESSES.witnesses ?? []).find(
    (row) => row.pathwayKey === "KS:municipal-arrest-record-expungement-under-12-4516a"
  );
  const partial = { ...witness.finalAnswers };
  delete partial.case_outcome;
  const evaluation = evaluateScreening({
    jurisdiction: "KS",
    profileVersion: witness.profileVersion,
    matterId: "ks-municipal-acceptance-incomplete",
    answers: partial
  });
  assert(
    evaluation.resultCode !== "packet_ready",
    "fails closed: an incomplete Kansas answer set does not reach packet_ready",
    evaluation.resultCode
  );
  assert(
    evaluation.paymentAllowed !== true,
    "fails closed: an incomplete Kansas answer set does not allow payment",
    String(evaluation.paymentAllowed)
  );
}

if (failures.length > 0) {
  console.error(`Kansas municipal runtime routes: ${failures.length} failure(s) of ${checks.length + failures.length} check(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`Kansas municipal runtime routes: ${checks.length} checks passed.`);
console.log("  KS:municipal-conviction-or-diversion-expungement-under-12-4516 and KS:municipal-arrest-record-expungement-under-12-4516a");
console.log("  each resolve to their own municipal pathway and the rcap-ks-custom-pleading family, neither touches a 21-6614");
console.log("  district-court route, screening and Briefcase agree on one canonical route id, and payment, sponsorship and");
console.log("  packet credit stay refused on both — as they do for an unknown or incomplete Kansas route.");
