#!/usr/bin/env node
// Guard for the #59 correction: a retired route is not a build target.
//
// Before this, the factory-v2 registry resolved the retired Oregon route TRUE
// with every build input met, because the generator only ever asked whether the
// packet-set manifest was well formed. The old set still is. So a route the
// decision owner retired on 2026-08-29 as legally overbroad went on being
// admitted to the shared factory, while a separate ledger described it as a
// packet specification that is merely incomplete. Two contradictory statements,
// both wrong, about a route whose treatment had already moved to three
// disposition-bound successors.
//
// The correction reuses what already existed: the legal-authority route record
// carries `retiredBy`, naming the decisions, the record, the successor
// specification and the replacement route keys. The generator now reads it as
// one more build input. Nothing is decided here, no route is registered or
// deleted, and build inputs are never folded into the separate commercial
// gates -- so admitting less opens nothing and closes nothing that was selling.
//
// The checks are written to survive the rest of the work rather than freeze
// today's state. Check 5 is the one that matters most: it does not demand that
// the closure ledger be corrected, because that ledger carries commercial
// projections this lane does not own. It demands only that the retired key
// cannot be read as outstanding work on a current specification -- satisfied
// either by the blocker going away, or by the row carrying the retirement that
// contradicts it.

import { readFileSync } from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { factoryV2RouteFor } = await import('../src/lib/rcap/documents/factory-v2-registry.ts');

const REGISTRY = 'data/record-clearing/factory-v2-route-registry.json';
const GRAPH = 'data/rcap-ledger/paid-pathway-legal-join.json';
const LEGAL_ROUTES = 'src/lib/legal-authority/routes/single-routes.json';
const SUCCESSOR = 'data/record-clearing/packet-specifications/OR-disposition-configurations.v1.json';
const RETIRED_SPEC = 'data/record-clearing/packet-specifications/OR-set-aside-without-conviction.v1.json';
const OR_KEY = 'OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c';

const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
const listOf = (x) => x.routes ?? x.pathways ?? Object.values(x).find(Array.isArray) ?? [];
let checks = 0;
let failures = 0;
const ok = (label, condition, detail) => {
  checks += 1;
  if (condition) { console.log(`  ok        ${label}`); return; }
  failures += 1;
  console.log(`  FAILED    ${label}${detail === undefined ? '' : ` — observed ${JSON.stringify(detail)}`}`);
};

const registry = json(REGISTRY);
const rows = listOf(registry);
const byKey = Object.fromEntries(rows.map((r) => [r.pathwayKey, r]));
const graphRows = listOf(json(GRAPH));
const legal = listOf(json(LEGAL_ROUTES));
const successor = json(SUCCESSOR);
const retiredSpec = json(RETIRED_SPEC);
const retiredLegal = legal.filter((r) => r?.retiredBy);
const row = byKey[OR_KEY];

console.log('A retired route is not a build target\n');

// ---------------------------------------------------------------------------
console.log('1. the retired specification cannot be selected as the current packet specification');
ok('the retired route is still registered rather than deleted', Boolean(row));
ok('the registry no longer admits it', row?.factoryV2Resolves === false, row?.factoryV2Resolves);
ok('it says why: the route is retired', (row?.unmetBuildInputs ?? []).includes('routeNotRetired'),
  row?.unmetBuildInputs);
// The field the resolver reads, and only that field.
ok('the runtime registry returns no admitted route for it',
  factoryV2RouteFor('OR', 'set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c')
    ?.factoryV2Resolves !== true);
ok('the retired specification still declares itself historical_only',
  retiredSpec.supersededBy?.status === 'historical_only', retiredSpec.supersededBy?.status);
ok('and it still composes nothing', retiredSpec.legalSectionsBound === false);

// ---------------------------------------------------------------------------
console.log('\n2. the successor treatment is still the legal and content authority');
ok('the row names the current specification rather than the retired one',
  row?.retired?.currentSpecification === SUCCESSOR, row?.retired?.currentSpecification);
ok('it names the counsel decision record',
  /2026-08-29-lawrence-six-decisions\.json$/.test(row?.retired?.record ?? ''), row?.retired?.record);
ok('it names both retirement decisions',
  JSON.stringify(row?.retired?.decisions)
    === JSON.stringify(['LWD-2026-08-29-OR-SUBSECTION', 'LWD-2026-08-29-OR-PACKET-SCOPE']),
  row?.retired?.decisions);
const successorKeys = (successor.configurations ?? []).map((c) => c.routeKey).sort();
ok('it names all three replacement routes',
  JSON.stringify((row?.retired?.replacedBy ?? []).map((r) => r.routeKey).sort()) === JSON.stringify(successorKeys),
  row?.retired?.replacedBy);
ok('the successor still binds its own legal sections',
  (successor.configurations ?? []).every((c) => c.legalSectionsBound === true
    && (c.unboundLegalSections ?? []).length === 0));
ok('counsel\'s (1)(c)/(1)(d) objection rule is unchanged',
  (successor.configurations ?? []).every((c) =>
    /not applied as the ordinary rule for a motion under paragraph \(1\)\(c\) or \(1\)\(d\)/
      .test(c.legalSections?.hearingAndObjectionStops?.statement ?? '')));
ok('the retirement fact was read, not invented: it still lives on the legal-authority route',
  retiredLegal.some((r) => r.routeKey === OR_KEY && r.outcomeMode === 'unsupported'
    && r.packetFamily === null));

// ---------------------------------------------------------------------------
console.log('\n3. no Oregon successor became sellable');
ok('the successor opens nothing',
  successor.commerciallyEligible === 0 && successor.completePacketProven === 0,
  { commerciallyEligible: successor.commerciallyEligible, completePacketProven: successor.completePacketProven });
ok('every configuration is still commercially closed',
  (successor.configurations ?? []).every((c) => c.commercialStatus === 'closed'),
  (successor.configurations ?? []).map((c) => c.commercialStatus));
ok('no successor route key was registered by this correction',
  successorKeys.every((k) => !(k in byKey)), successorKeys.filter((k) => k in byKey));
ok('the retired route still allows no payment at the evaluator',
  row?.separateGates?.paymentAllowedAtTheEvaluator === false,
  row?.separateGates?.paymentAllowedAtTheEvaluator);

// ---------------------------------------------------------------------------
// Coverage. Stated as relationships that hold independently of this change, so
// they do not freeze a count that legitimate later work will move.
console.log('\n4. no route, payment or screening coverage was reduced or expanded');
ok('every intended paid pathway still has exactly one registry row',
  rows.length === graphRows.length
  && new Set(rows.map((r) => r.pathwayKey)).size === rows.length
  && graphRows.every((p) => p.pathwayKey in byKey),
  { registryRows: rows.length, graphRows: graphRows.length });
ok('the declared total still matches the rows present',
  registry.totals?.intendedPaidPathways === rows.length, registry.totals?.intendedPaidPathways);
ok('admitted plus not-admitted still accounts for every row',
  registry.totals?.factoryV2Admitted + registry.totals?.notAdmitted === rows.length, registry.totals);
ok('the admitted count equals the rows that actually resolve',
  registry.totals?.factoryV2Admitted === rows.filter((r) => r.factoryV2Resolves).length);
ok('no row is admitted while listing an unmet build input',
  rows.every((r) => !r.factoryV2Resolves || (r.unmetBuildInputs ?? []).length === 0));
ok('public screening still reaches every pathway',
  rows.every((r) => r.separateGates?.publicWitnessReachesThisPathway === true),
  rows.filter((r) => !r.separateGates?.publicWitnessReachesThisPathway).map((r) => r.pathwayKey).slice(0, 4));
ok('payment at the evaluator is allowed only where the route is not retired',
  rows.every((r) => !r.separateGates?.paymentAllowedAtTheEvaluator || !r.retired),
  rows.filter((r) => r.separateGates?.paymentAllowedAtTheEvaluator && r.retired).map((r) => r.pathwayKey));
ok('exactly the routes the legal-authority layer retires are marked retired here',
  JSON.stringify(rows.filter((r) => r.retired).map((r) => r.pathwayKey).sort())
    === JSON.stringify(retiredLegal.map((r) => r.routeKey).sort()),
  { registry: rows.filter((r) => r.retired).map((r) => r.pathwayKey), legal: retiredLegal.map((r) => r.routeKey) });
ok('every non-retired row declares the retirement input met, so the change is uniform',
  rows.every((r) => r.buildInputs?.routeNotRetired === (r.retired ? false : true)));
ok('the generator records the legal-authority routes among its pinned inputs',
  registry.inputs?.legalAuthorityRoutes?.path === LEGAL_ROUTES,
  registry.inputs?.legalAuthorityRoutes?.path);

// ---------------------------------------------------------------------------
// The live invariant. Not a demand that the closure ledger change.
console.log('\n5. the retired key can no longer be read as outstanding specification work');
const blockers = row?.separateGates?.openBlockerIds ?? [];
ok('the packet_spec_incomplete blocker is gone, or the row says the key is not a build target',
  !blockers.includes('packet_spec_incomplete') || row?.retired?.thisKeyIsNotABuildTarget === true,
  { blockers, thisKeyIsNotABuildTarget: row?.retired?.thisKeyIsNotABuildTarget });
console.log(blockers.includes('packet_spec_incomplete')
  ? '            (blocker still emitted by the closure ledger; the row now contradicts it in place)'
  : '            (blocker withdrawn upstream; nothing left to contradict)');
ok('the row points a reader at the successor rather than at the retired specification',
  (row?.retired?.replacedBy ?? []).length === 3 && Boolean(row?.retired?.currentSpecification));
ok('the retirement reason travels with the row',
  /found it legally overbroad/.test(row?.retired?.why ?? ''));

// ---------------------------------------------------------------------------
console.log('\n6. mutations — the old misleading state is caught');
const admitted = (r) => r.factoryV2Resolves === true;
const mutations = [
  ['the retired route re-admitted', (r) => { r.factoryV2Resolves = true; r.unmetBuildInputs = []; },
    (r) => !admitted(r)],
  ['the retirement input flipped back to met', (r) => { r.buildInputs.routeNotRetired = true; },
    (r) => r.buildInputs?.routeNotRetired === false],
  ['the retirement block stripped, leaving only packet_spec_incomplete', (r) => { delete r.retired; },
    (r) => !(r.separateGates?.openBlockerIds ?? []).includes('packet_spec_incomplete')
      || r.retired?.thisKeyIsNotABuildTarget === true],
  ['payment opened on the retired route', (r) => { r.separateGates.paymentAllowedAtTheEvaluator = true; },
    (r) => !(r.separateGates?.paymentAllowedAtTheEvaluator && r.retired)],
  ['the successors dropped from the row', (r) => { r.retired.replacedBy = []; },
    (r) => (r.retired?.replacedBy ?? []).length === 3],
  ['the row deleted outright, erasing the history', (r) => { r.pathwayKey = 'OR:something-else'; },
    (r) => r.pathwayKey === OR_KEY]
];
for (const [label, mutate, invariant] of mutations) {
  const copy = structuredClone(row);
  ok(`the corrected row satisfies "${label}"`, invariant(row) === true);
  mutate(copy);
  ok(`mutation caught: ${label}`, invariant(copy) !== true);
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) { console.error(`${failures} check(s) failed`); process.exit(1); }
