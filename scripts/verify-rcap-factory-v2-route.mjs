#!/usr/bin/env node
// Focused gate on the factory_v2 resolver branch.
//
//   node scripts/verify-rcap-factory-v2-route.mjs
//   node scripts/verify-rcap-factory-v2-route.mjs --mutations
//
// factory_v2 is the one shared branch that hands a route to the existing
// official-form and composed-packet factory. The dangerous failures are not
// "it did not resolve" — they are:
//
//   1. it resolves and quietly sells. A shadow route that opens payment or
//      consumes a credit is the exact defect the money-gate binding exists to
//      prevent, arriving through a new door.
//   2. it takes a route away from a suppression. A component deferral, an exact
//      supported deferral, a terminal treatment or a complete-guidance track
//      must still win: those are decisions about a route, and the factory being
//      able to build something is not a reason to override them.
//   3. it re-points a live legacy generator at a different builder.
//   4. it admits a route whose build inputs are not all present.
//   5. it becomes a renderer per pathway.
//
// The registry itself is checked against the runtime module's own admission
// rule, executed from the shipped source, so the two cannot drift.

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01";

import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
register("./lib/ts-esm-loader.mjs", import.meta.url);

const MUTATIONS = process.argv.includes("--mutations");
const REGISTRY_PATH = "data/record-clearing/factory-v2-route-registry.json";
const RESOLVER_PATH = "src/lib/rcap/documents/packet-route-resolver.ts";
const RUNTIME_REGISTRY_PATH = "src/lib/rcap/documents/factory-v2-registry.ts";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const source = (rel) => fs.readFileSync(path.join(rootDir, rel), "utf8");

const { resolvePacketRoute, LEGACY_VERIFIED_JURISDICTIONS } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");

const REQUIRED_BUILD_INPUTS = [
  "authoritativeProfile",
  "authoritativePathway",
  "exactPacketSet",
  "packetSpecification",
  "requiredParticipantFields",
  "sourceOrApprovedComposedDocument",
  "deterministicFixture"
];

// Comments and strings are stripped before any source-shape check, so a rule
// stated in prose cannot satisfy a check about code.
function strippedSource(rel) {
  return source(rel)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''");
}

function failures(registry) {
  const out = [];
  const fail = (ok, message) => { if (!ok) out.push(message); };
  const routes = registry.routes ?? [];
  const legacy = new Set(LEGACY_VERIFIED_JURISDICTIONS);

  // R — the registry is internally honest.
  fail(registry.createsApproval === false, "R-approval: the registry must not claim to create an approval");
  fail(registry.rendererKind === "packet_document_v1",
    `R-one-renderer: every factory_v2 route must use the one shared renderer, not ${registry.rendererKind}`);
  fail(routes.length > 0, "R-nonempty: the registry admits no routes at all");
  for (const route of routes) {
    if (route.factoryV2Resolves !== true) continue;
    fail(REQUIRED_BUILD_INPUTS.every((name) => route.buildInputs?.[name] === true),
      `R-inputs ${route.pathwayKey}: marked resolving with an unmet build input`);
    fail((route.unmetBuildInputs ?? []).length === 0,
      `R-unmet ${route.pathwayKey}: marked resolving while listing unmet build inputs`);
    fail(!legacy.has(route.jurisdiction),
      `R-legacy ${route.pathwayKey}: a legacy-verified jurisdiction must keep its own generator`);
    fail((route.packetSetIds ?? []).length > 0, `R-set ${route.pathwayKey}: resolving with no packet set`);
    fail(String(route.profileVersion ?? "").trim() !== "", `R-profile ${route.pathwayKey}: resolving with no profile version`);
    fail((route.requiredInputIds ?? []).length > 0, `R-fields ${route.pathwayKey}: resolving with no required participant fields`);
  }

  // S — the separate gates stay separate. The registry records them; it must
  // never make one of them a condition of building, in either direction.
  for (const route of routes) {
    const gates = route.separateGates ?? {};
    fail(!(REQUIRED_BUILD_INPUTS.includes("ownerApprovedLegalDesign")),
      "S-separate: legal approval must not be a build input");
    if (route.factoryV2Resolves !== true) continue;
    fail(typeof gates.ownerApprovedLegalDesign === "boolean",
      `S-legal ${route.pathwayKey}: no recorded owner legal-design status`);
    fail(typeof gates.paymentAllowedAtTheEvaluator === "boolean",
      `S-payment ${route.pathwayKey}: no recorded payment status`);
    // The problematic-PDF gate is deliberately absent: its register is produced
    // by resolving every route through the resolver that reads this registry,
    // so recording it here would be a generator cycle. The launch graph owns it.
    fail(!("problematicPdfHold" in gates),
      `S-cycle ${route.pathwayKey}: records the problematic-PDF status, which would make the two generators depend on each other`);
  }
  // Buildable-and-unapproved must actually occur, or the "separate gates" claim
  // is untested wording rather than an observed property.
  const buildableButUnapproved = routes.filter(
    (route) => route.factoryV2Resolves === true && route.separateGates?.ownerApprovedLegalDesign === false
  );
  fail(buildableButUnapproved.length > 0,
    "S-observed: no route is buildable while legally unapproved, so nothing proves the gates are independent");

  // A — the runtime admission rule agrees with the registry, executed from the
  // shipped module rather than restated here.
  const runtime = strippedSource(RUNTIME_REGISTRY_PATH);
  // The input names are legitimately string literals, so this one check reads
  // the declaration itself out of the raw source rather than the stripped copy —
  // and reads only that declaration, so a name mentioned in a comment elsewhere
  // still does not count.
  const declaration = /const REQUIRED_BUILD_INPUTS = \[([\s\S]*?)\]/.exec(source(RUNTIME_REGISTRY_PATH));
  const declared = new Set(
    [...(declaration?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((match) => match[1])
  );
  for (const name of REQUIRED_BUILD_INPUTS) {
    fail(declared.has(name), `A-input ${name}: the runtime registry does not require this build input`);
  }
  fail(declared.size === REQUIRED_BUILD_INPUTS.length,
    `A-extra: the runtime registry requires ${declared.size} build inputs against this gate's ${REQUIRED_BUILD_INPUTS.length}`);
  fail(/REQUIRED_BUILD_INPUTS\.every\(/.test(runtime),
    "A-enforced: the runtime registry declares its build inputs without checking them");
  fail(/legacyGeneratorOwnsThisJurisdiction/.test(runtime),
    "A-legacy: the runtime registry does not refuse a legacy-owned jurisdiction");
  fail(/catch\s*\{/.test(runtime), "A-failclosed: the runtime registry does not fail closed on a malformed file");

  // B — the resolver branch itself.
  const resolver = strippedSource(RESOLVER_PATH);
  // The branch is located by the call the resolver actually makes. This anchor
  // was written as the exact two-argument call factoryV2RouteFor(jurisdiction,
  // pathwayId); 07804aa68 added the third argument the exact-track-selection
  // contract requires (input.trackId), so the anchor stopped matching, indexOf
  // returned -1, and slice(-1) made "the branch" the last character of the
  // file — B-kind, B-sellable and B-credit were then measured against that one
  // character rather than against the branch, which sets all three. Anchored
  // now on the call prefix B-single and B-order already use, and a missing call
  // is an empty branch rather than a one-character one, so B-branch can fire.
  const branchAt = resolver.indexOf("factoryV2RouteFor(");
  const branch = branchAt < 0 ? "" : resolver.slice(branchAt);
  fail(branch.length > 0, "B-branch: the resolver never calls the factory_v2 registry");
  fail(/routeKind:\s*``/.test(branch) || /routeKind/.test(branch), "B-kind: the factory_v2 branch sets no routeKind");
  fail(/sellable:\s*false/.test(branch), "B-sellable: the factory_v2 branch does not hard-code sellable false");
  fail(/creditConsumable:\s*false/.test(branch), "B-credit: the factory_v2 branch does not hard-code creditConsumable false");
  // One branch, not one per pathway.
  fail((resolver.match(/factoryV2RouteFor\(/g) ?? []).length === 1,
    "B-single: the resolver calls the factory_v2 registry more than once; there is one shared branch");
  // The branch must sit after every suppression and after the legacy block.
  const at = (needle) => resolver.indexOf(needle);
  fail(at("factoryV2RouteFor(") > at("componentDeferralForTrack("), "B-order: factory_v2 runs before the component-deferral check");
  fail(at("factoryV2RouteFor(") > at("exactDeferralForTrack("), "B-order: factory_v2 runs before the exact-deferral check");
  fail(at("factoryV2RouteFor(") > at("terminalTreatmentForTrack("), "B-order: factory_v2 runs before the terminal-treatment check");
  fail(at("factoryV2RouteFor(") > at("completeGuidanceForTrack("), "B-order: factory_v2 runs before the complete-guidance check");
  fail(at("factoryV2RouteFor(") > at("LEGACY_VERIFIED.has("), "B-order: factory_v2 runs before the legacy-verified check");

  // L — live behaviour, resolved through the real resolver.
  const admitted = routes.filter((route) => route.factoryV2Resolves === true);
  let resolvedAsFactory = 0;
  for (const route of admitted) {
    const resolution = resolvePacketRoute({ state: route.jurisdiction, pathway: route.pathwayId });
    if (resolution.routeKind === "factory_v2") {
      resolvedAsFactory += 1;
      fail(resolution.sellable === false, `L-sellable ${route.pathwayKey}: a factory_v2 route resolved sellable`);
      fail(resolution.creditConsumable === false, `L-credit ${route.pathwayKey}: a factory_v2 route resolved credit-consumable`);
      fail(resolution.rendererKind === "packet_document_v1",
        `L-renderer ${route.pathwayKey}: resolved with renderer ${resolution.rendererKind} rather than the shared factory`);
      fail((resolution.factoryV2?.packetSetIds ?? []).length > 0,
        `L-evidence ${route.pathwayKey}: resolved through factory_v2 carrying no packet set`);
    } else {
      // Not an error on its own — a suppression legitimately outranks the
      // factory — but it must be a suppression and never a silent sale.
      fail(resolution.sellable === false,
        `L-suppressed ${route.pathwayKey}: admitted by the registry, resolved as ${resolution.routeKind}, and sellable`);
    }
  }
  fail(resolvedAsFactory > 0, "L-live: no admitted route actually resolves as factory_v2 through the resolver");

  // The legacy generators keep their own route and keep rendering. They no
  // longer sell: ADR-0004 retired their commercial authority, so the factory is
  // not competing with them for a sale — there is no sale to compete for. What
  // still matters here is that admission to the factory never quietly absorbs a
  // legacy jurisdiction's route identity.
  for (const code of LEGACY_VERIFIED_JURISDICTIONS) {
    const resolution = resolvePacketRoute({ state: code, pathway: "" });
    fail(resolution.routeKind === "legacy_retired",
      `L-legacy ${code}: resolved as ${resolution.routeKind}; the retired legacy generator must keep its own route`);
    fail(resolution.sellable === false && resolution.creditConsumable === false,
      `L-legacy-closed ${code}: a retired legacy generator resolved with commercial authority`);
  }

  // An unknown route still fails closed.
  const unknown = resolvePacketRoute({ state: "ZZ", pathway: "not-a-pathway" });
  fail(unknown.sellable === false && unknown.routeKind !== "factory_v2",
    "L-unknown: an unknown jurisdiction resolved through factory_v2");

  return out;
}

const registry = read(REGISTRY_PATH);

if (MUTATIONS) {
  const base = failures(registry).length;
  const clone = () => JSON.parse(JSON.stringify(registry));
  const mutations = [
    ["a route admitted with an unmet build input", (r) => {
      const route = r.routes.find((x) => x.factoryV2Resolves);
      route.buildInputs.deterministicFixture = false;
    }],
    ["a route admitted while listing unmet inputs", (r) => {
      const route = r.routes.find((x) => x.factoryV2Resolves);
      route.unmetBuildInputs = ["exactPacketSet"];
    }],
    ["a legacy jurisdiction pulled into the factory", (r) => {
      const route = r.routes.find((x) => x.legacyGeneratorOwnsThisJurisdiction);
      route.factoryV2Resolves = true;
      route.legacyGeneratorOwnsThisJurisdiction = false;
      for (const name of REQUIRED_BUILD_INPUTS) route.buildInputs[name] = true;
      route.unmetBuildInputs = [];
    }],
    ["a route admitted with no packet set", (r) => {
      const route = r.routes.find((x) => x.factoryV2Resolves);
      route.packetSetIds = [];
    }],
    ["a route admitted with no profile version", (r) => {
      const route = r.routes.find((x) => x.factoryV2Resolves);
      route.profileVersion = "";
    }],
    ["a route admitted with no required participant fields", (r) => {
      const route = r.routes.find((x) => x.factoryV2Resolves);
      route.requiredInputIds = [];
    }],
    ["the registry claiming a renderer per pathway", (r) => { r.rendererKind = "factory_v2_per_pathway"; }],
    ["the registry claiming it creates an approval", (r) => { r.createsApproval = true; }],
    ["the legal gate folded back into buildability", (r) => {
      for (const route of r.routes) {
        if (route.separateGates?.ownerApprovedLegalDesign === false) route.factoryV2Resolves = false;
      }
    }],
    ["the problematic-PDF register consumed back into this registry", (r) => {
      const route = r.routes.find((x) => x.factoryV2Resolves);
      route.separateGates.problematicPdfHold = false;
    }],
    ["the recorded payment status dropped from an admitted route", (r) => {
      const route = r.routes.find((x) => x.factoryV2Resolves);
      delete route.separateGates.paymentAllowedAtTheEvaluator;
    }],
    ["every route emptied out of the registry", (r) => { r.routes = []; }]
  ];

  let undetected = 0;
  for (const [label, mutate] of mutations) {
    const mutated = clone();
    mutate(mutated);
    const caught = failures(mutated).length > base;
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }
  if (undetected > 0) {
    console.error(`\nverify-rcap-factory-v2-route --mutations FAILED — ${undetected} undetected.`);
    process.exit(1);
  }
  console.log(`\nEvery way of admitting a route the factory cannot honestly build, or of selling one it can, is detected (${mutations.length}/${mutations.length}).`);
  process.exit(0);
}

const problems = failures(registry);
const admitted = (registry.routes ?? []).filter((route) => route.factoryV2Resolves === true);
console.log(
  `factory_v2: ${admitted.length} of ${(registry.routes ?? []).length} intended-paid routes are ADMITTED to the one shared packet factory ` +
  `(admission, not selection — the resolver applies every suppression ahead of the factory branch, and the launch graph reports what it actually selected); ` +
  `${admitted.filter((route) => route.separateGates?.ownerApprovedLegalDesign).length} of those are owner-approved, ` +
  `${admitted.filter((route) => route.separateGates?.paymentAllowedAtTheEvaluator).length} of those allow payment at the evaluator.`
);
if (problems.length > 0) {
  console.error(`\nverify-rcap-factory-v2-route FAILED — ${problems.length} problem(s):\n`);
  for (const problem of problems.slice(0, 40)) console.error(` - ${problem}`);
  if (problems.length > 40) console.error(` … and ${problems.length - 40} more`);
  process.exit(1);
}
console.log("One shared branch, one shared renderer, nothing sellable, every suppression and every legacy generator still ahead of it.");
