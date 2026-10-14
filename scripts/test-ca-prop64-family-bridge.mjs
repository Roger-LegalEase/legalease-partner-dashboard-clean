#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { caProp64FamilyBridge, CA_PROP64_BRIDGE_INPUTS, CA_PROP64_ROUTES } from './lib/ca-prop64-family-bridge.mjs';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const inputs = Object.fromEntries(Object.entries(CA_PROP64_BRIDGE_INPUTS).map(([k, p]) => [k, read(p)]));
const route = { jurisdiction: 'CA', pathwayKey: CA_PROP64_ROUTES[0], registryTrackIds: ['ca-prop64'] };
let checks = 0;
const equal = (a, b) => { assert.deepEqual(a, b); checks++; };
for (const pathwayKey of CA_PROP64_ROUTES) equal(caProp64FamilyBridge({ ...route, pathwayKey }, inputs), 'ca-prop64-set');
for (const patch of [
  { jurisdiction: 'NY' }, { pathwayKey: 'CA:tool-5-proposition-64-marijuana-relief' },
  { pathwayKey: `${route.pathwayKey}-juvenile` }, { registryTrackIds: [] },
  { registryTrackIds: ['ca-prop64', 'ca-prop64'] }, { registryTrackIds: ['wrong'] }
]) equal(caProp64FamilyBridge({ ...route, ...patch }, inputs), null);
const family = d => d.queue.families.find(r => r.familyId === 'ca-prop64-set');
const set = d => d.manifests.packetSets.find(r => r.packetSetId === 'ca-prop64-set');
for (const mutate of [
  d => { d.queue.families = {}; }, d => { d.manifests.packetSets = {}; },
  d => d.queue.families.push(structuredClone(family(d))),
  d => d.manifests.packetSets.push(structuredClone(set(d))),
  d => { family(d).familyId = 'wrong'; }, d => { family(d).jurisdiction = 'NY'; },
  d => family(d).routeKeys.pop(), d => family(d).routeKeys.reverse(),
  d => { family(d).packetComponents[0] = 'component:JV-744'; },
  d => { family(d).sourceHashes[0].sha256 = '0'.repeat(64); },
  d => { family(d).forms[0] = 'JV-744'; },
  d => { set(d).trackId = 'wrong'; }, d => { set(d).version = '2.0.0'; },
  d => { set(d).components[0].officialFormId = 'JV-744'; },
  d => { set(d).components[0].role = 'court_order'; },
  d => { set(d).components[0].officialSourceUrl = 'https://invalid.example'; },
  d => { set(d).components[1].order = 1; },
  d => { set(d).components[0].requirement = 'optional'; },
  d => { d.wiring.binding.sourceVersion[2].sha256 = '0'.repeat(64); },
  d => { d.wiring.binding.packetComponents[2] = 'component:JV-746'; },
  d => { d.wiring.routeKeys.push('obligation:track-pathway:CA:ca-prop64:tool-5-proposition-64-marijuana-relief'); },
  d => { d.wiring.generationAllowed = true; }, d => { d.wiring.runtimeSelectable = true; },
  d => { d.wiring.createsFulfillmentRecord = true; }, d => { d.wiring.opensCommercialRoute = true; },
  d => { d.wiring.binding.paymentEligible = true; }, d => { d.wiring.binding.sponsorshipEligible = true; }
]) { const changed = structuredClone(inputs); mutate(changed); equal(caProp64FamilyBridge(route, changed), null); }
const labels = structuredClone(inputs);
family(labels).state = 'NOT_PROVEN'; family(labels).selectedIndependentVerdict = null;
equal(caProp64FamilyBridge(route, labels), 'ca-prop64-set'); // identity is not approval
const join = read('data/rcap-ledger/paid-pathway-legal-join.json');
for (const key of CA_PROP64_ROUTES) {
  const row = join.pathways.find(r => r.pathwayKey === key);
  equal(row.packetFamilies, ['ca-prop64-set']); equal(row.familyBridgePresent, true);
  equal(row.legalStatus, 'owner_approval_pending'); equal(row.ownerApprovedFamilies, []);
  equal(row.ownerLegalDecisionRecordId, null); equal(row.adoptionRecordId, null);
}
// Current runtime holds are independent of the evidence link. No fixture,
// source-bound registered specification or fulfillment authority is fabricated.
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { factoryV2RouteFor } = await import('../src/lib/rcap/documents/factory-v2-registry.ts');
const registry = read('data/record-clearing/factory-v2-route-registry.json');
for (const key of CA_PROP64_ROUTES) {
  const row = registry.routes.find(r => r.pathwayKey === key);
  equal(row.factoryV2Resolves, false); equal(row.buildInputs.deterministicFixture, false);
  equal(row.separateGates.ownerApprovedLegalDesign, false);
  equal(row.separateGates.paymentAllowedAtTheEvaluator, false);
  equal(factoryV2RouteFor('CA', key.slice(3), 'ca-prop64'), null);
}
console.log(`PASS ${checks} CA existing-family identity and noncommercial-boundary checks (AT-GA-49; shared GA-14/15/16 identity only).`);
