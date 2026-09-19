#!/usr/bin/env node
/**
 * Where the system holds two competing representations of a route's kind.
 *
 * `routeKind` is not a label. `payment-adapter.ts` throws
 * ConsumerPacketNotDeliverableError(route.routeKind) on the checkout path, so
 * the value route resolution returns decides whether a participant can be
 * sold a packet at all. That makes it authority, and authority is supposed to
 * come from an adjudication.
 *
 * The route-kind adjudication register exists to carry exactly that decision,
 * and for some routes it still says `status: pending, adjudicatedOn: null`
 * while resolution returns a kind and acts on it. That is two answers to one
 * question, and this inventory measures the disagreement rather than picking a
 * winner:
 *
 *   - "pending" does not prove the old kind was right.
 *   - Resolution returning a kind does not prove it was adjudicated.
 *   - Admission to the factory-v2 registry proves neither: that registry's own
 *     text says admission is not selection and "makes nothing sellable".
 *
 * The invariant this defends is narrow and important. `factory_v2` may
 * describe a technical rendering capability. It must not silently manufacture
 * legal approval, admission, sellability, payment eligibility or consumer
 * deliverability. So for every route in scope this records, side by side, what
 * each source says — and flags the routes where a kind is load-bearing and
 * unadjudicated.
 *
 * Scope is every route whose routeKind moved when the decision-sets report was
 * refreshed on 2026-09-19, which is where the disagreement surfaced, plus any
 * route the register records as pending whose resolved kind is factory_v2.
 *
 *   node scripts/generate-routekind-authority-consistency.mjs
 *   node scripts/generate-routekind-authority-consistency.mjs --check
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "data/rcap-ledger/routekind-authority-consistency.json";
const check = process.argv.includes("--check");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));

const closure = read("data/rcap-ledger/sellable-pathway-closure.json");
const adjudications = read("data/rcap-ledger/route-kind-adjudications.json");
const legalJoin = read("data/rcap-ledger/paid-pathway-legal-join.json");
const factoryRegistry = read("data/record-clearing/factory-v2-route-registry.json");

const byKey = new Map(closure.pathways.map((p) => [p.pathwayKey, p]));
const adjByKey = new Map((adjudications.rows ?? []).map((r) => [r.routeKey, r]));
const joinByKey = new Map((legalJoin.pathways ?? legalJoin.rows ?? []).map((r) => [r.pathwayKey, r]));
const admitted = new Set((factoryRegistry.routes ?? []).map((r) => r.pathwayKey));

/**
 * The thirteen routes whose reported kind moved on 2026-09-19. Listed
 * explicitly because that movement is what opened this investigation, and a
 * derived scope would silently shrink as the situation is resolved — losing
 * the record of which routes were ever in question.
 */
const MOVED_2026_09_19 = [
  ["CO:petition-based-conviction-sealing-jdf-612-24-72-706", "guidance_only", "factory_v2"],
  ["CT:absolute-pardon-resulting-in-erasure", "factory_v2", "guidance_only"],
  ["MA:marijuana-only-expungement", "factory_v2", "guidance_only"],
  ["MN:cannabis-automatic-or-board-reviewed-expungement-under-609a-055-06", "guidance_only", "handoff"],
  ["MS:additional-justice-court-misdemeanor-relief-9-11-15-3", "legacy_retired", "factory_v2"],
  ["MS:additional-municipal-court-misdemeanor-relief-21-23-7-6", "legacy_retired", "factory_v2"],
  ["MS:human-trafficking-survivor-expungement-97-3-54-6-6", "guidance_only", "handoff"],
  ["MS:human-trafficking-survivor-vacatur-97-3-54-6-5", "guidance_only", "handoff"],
  ["NE:law-enforcement-error-expungement", "factory_v2", "guidance_only"],
  ["NJ:clean-slate-petition-under-n-j-s-a-2c-52-5-3", "factory_v2", "guidance_only"],
  ["NV:trafficking-victim-vacatur-and-sealing-under-nrs-179-247", "guidance_only", "handoff"],
  ["OR:marijuana-specific-set-aside-redesignation", "factory_v2", "guidance_only"],
  ["SD:juvenile-trafficking-expungement", "guidance_only", "handoff"]
];

function describe(pathwayKey, previouslyReported, nowReported) {
  const row = byKey.get(pathwayKey) ?? null;
  const adj = adjByKey.get(pathwayKey) ?? null;
  const join = joinByKey.get(pathwayKey) ?? null;
  const resolved = row?.route?.routeKind ?? null;

  const adjudicated = Boolean(adj && adj.status && adj.status !== "pending" && adj.adjudicatedOn);
  // Load-bearing means the kind decides deliverability at checkout. Every kind
  // does, because payment-adapter refuses on whatever value it is handed; what
  // differs is whether the refusal or the permission is the consequence.
  const permitsDelivery = resolved === "factory_v2";

  return {
    pathwayKey,
    jurisdiction: pathwayKey.split(":")[0],
    reportedBefore: previouslyReported,
    reportedNow: nowReported,
    resolvedRouteKind: resolved,
    resolvedFrom: "data/rcap-ledger/sellable-pathway-closure.json :: pathways[].route.routeKind",
    rendererKind: row?.route?.rendererKind ?? null,
    routeSaysSellable: row?.route?.sellable ?? null,
    routeSaysCreditConsumable: row?.route?.creditConsumable ?? null,
    routeReason: row?.route?.reason ?? null,
    adjudication: adj
      ? {
        present: true,
        status: adj.status ?? null,
        adjudicatedOn: adj.adjudicatedOn ?? null,
        decisionId: adj.decisionId ?? null,
        contractSays: adj.contractSays ?? null
      }
      : { present: false, status: null, adjudicatedOn: null, decisionId: null, contractSays: null },
    explicitRouteKindAdjudicationExists: adjudicated,
    legalStatus: join?.legalStatus ?? null,
    legalStatement: join?.legalStatement ?? null,
    ownerApprovedFamilies: join?.ownerApprovedFamilies ?? null,
    packetFamilies: join?.packetFamilies ?? [],
    familyBridgePresent: join?.familyBridgePresent ?? null,
    admittedToFactoryV2Registry: admitted.has(pathwayKey),
    deliverabilityConsequence: permitsDelivery
      ? "resolution returns factory_v2, so the checkout path does not refuse this route on routeKind grounds"
      : `resolution returns ${JSON.stringify(resolved)}, so the checkout path refuses this route on routeKind grounds`,
    inconsistency:
      permitsDelivery && !adjudicated
        ? "LOAD_BEARING_AND_UNADJUDICATED"
        : !adjudicated
          ? "UNADJUDICATED_BUT_REFUSED"
          : "ADJUDICATED"
  };
}

const rows = MOVED_2026_09_19.map(([key, before, now]) => describe(key, before, now));

// Anything else the register calls pending while resolution permits delivery
// belongs here too: the thirteen are where this surfaced, not its boundary.
const alreadyListed = new Set(rows.map((r) => r.pathwayKey));
for (const [routeKey, adj] of adjByKey) {
  if (alreadyListed.has(routeKey)) continue;
  const row = byKey.get(routeKey);
  if (!row) continue;
  const adjudicated = Boolean(adj.status && adj.status !== "pending" && adj.adjudicatedOn);
  if (row.route?.routeKind === "factory_v2" && !adjudicated) {
    rows.push(describe(routeKey, null, null));
  }
}
rows.sort((a, b) => a.pathwayKey.localeCompare(b.pathwayKey));

const loadBearing = rows.filter((r) => r.inconsistency === "LOAD_BEARING_AND_UNADJUDICATED");

const next = {
  schemaVersion: "rcap-routekind-authority-consistency/v1",
  generatedBy: "scripts/generate-routekind-authority-consistency.mjs",
  purpose:
    "Every route where the system holds two representations of its routeKind: what route resolution returns and acts on, and what the route-kind adjudication register records. routeKind decides deliverability at checkout, so a kind that resolution asserts and no adjudication supports is authority nobody granted.",
  theInvariant:
    "factory_v2 may describe a technical rendering capability. It must not silently manufacture legal approval, admission, sellability, payment eligibility or consumer deliverability. Admission to the factory-v2 registry proves none of those either: that registry's own text says admission is not selection and makes nothing sellable.",
  howItMustNotBeResolved: [
    "Do not infer an adjudication from registry admission.",
    "Do not infer an adjudication from the fact that a report was regenerated.",
    "Do not infer an adjudication from existing runtime behaviour.",
    "Do not treat `pending` as proof that the previous kind was correct: it proves only that nobody has decided.",
    "No jurisdiction-specific exception, in either direction."
  ],
  whatTheAdjudicationRegisterIs: {
    path: "data/rcap-ledger/route-kind-adjudications.json",
    rows: adjudications.rows?.length ?? 0,
    statusCounts: (adjudications.rows ?? []).reduce((acc, r) => {
      acc[r.status ?? "(none)"] = (acc[r.status ?? "(none)"] ?? 0) + 1;
      return acc;
    }, {}),
    itsOwnDescription: adjudications.note ?? null,
    readItCarefully:
      "This register is a disagreement queue, not a complete adjudication of every route's kind. It lists routes where the controlling legal contract and the evaluator's pre-contract heuristics disagree. So `pending` here means that specific disagreement is undecided — it does not by itself mean a route's kind rests on nothing, and it does not mean the resolved kind is wrong. It does mean nobody has reconciled the two, which is exactly what makes a load-bearing kind worth checking."
  },
  whyItIsOpen:
    "Refreshing the legal-review decision sets on 2026-09-19 moved thirteen routeKinds to match the current closure. The refresh reported existing state and adjudicated nothing; it made visible that for some of these routes the register still says pending while resolution returns a kind and the checkout path acts on it.",
  scope:
    "The thirteen routes whose reported kind moved on 2026-09-19, plus every other route the register calls pending whose resolved kind is factory_v2.",
  totals: {
    routesExamined: rows.length,
    loadBearingAndUnadjudicated: loadBearing.length,
    unadjudicatedButRefused: rows.filter((r) => r.inconsistency === "UNADJUDICATED_BUT_REFUSED").length,
    adjudicated: rows.filter((r) => r.inconsistency === "ADJUDICATED").length,
    byJurisdiction: [...new Set(rows.map((r) => r.jurisdiction))].sort()
  },
  loadBearingAndUnadjudicated: loadBearing.map((r) => r.pathwayKey),
  owner: "legal and route-authority lane, with the owner deciding which representation is wrong",
  doNotResolveHere:
    "This is not repaired by editing a report, a registry or a resolver to agree with the other. The authoritative source decides, and until it does neither representation wins by inertia.",
  rows
};

const serialized = `${JSON.stringify(next, null, 2)}\n`;
const outPath = path.join(rootDir, OUT);

if (check) {
  if (!fs.existsSync(outPath) || fs.readFileSync(outPath, "utf8") !== serialized) {
    console.error("the routeKind authority consistency inventory is stale; re-run without --check");
    process.exit(1);
  }
  console.log(
    `routeKind authority consistency current. ${next.totals.routesExamined} route(s) examined, ${next.totals.loadBearingAndUnadjudicated} load-bearing and unadjudicated.`
  );
  process.exit(0);
}

fs.writeFileSync(outPath, serialized);
console.log(`wrote ${OUT}`);
console.log(`  ${next.totals.routesExamined} routes examined across ${next.totals.byJurisdiction.length} jurisdictions`);
console.log(`  ${next.totals.loadBearingAndUnadjudicated} LOAD_BEARING_AND_UNADJUDICATED (resolution permits delivery, nobody adjudicated the kind)`);
console.log(`  ${next.totals.unadjudicatedButRefused} unadjudicated but refused at checkout`);
console.log(`  ${next.totals.adjudicated} adjudicated`);
for (const key of next.loadBearingAndUnadjudicated) console.log(`     ${key}`);
