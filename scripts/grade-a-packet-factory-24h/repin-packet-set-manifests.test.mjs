#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { ADAPTERS, Refusal, compareAnchors, planReceipt, composeRefreshedReceipt, readsAsUnmoved, sha256 } from './repin-lapsed-source-identities.mjs';

const manifestPath = 'data/record-clearing/legal-design-packet-set-manifests.json';
const adapter = ADAPTERS.get(manifestPath);
const clone = (x) => structuredClone(x);
const entry = (id) => ({ packetSetId: id, trackId: `${id}-track`, jurisdiction: 'ZZ', version: '1', components: [{ componentId: `${id}-form`, requirement: 'required' }] });
const fixture = () => ({ schemaVersion: 1, defaults: { filing: 'required' }, packetSets: [entry('a'), entry('b'), entry('c')] });
const receipt = { familyId: 'a', routeKeys: ['obligation:track-only:ZZ:a-track'] };
const pin = { recordId: 'packet-set-manifest:a' };
const compare = (oldDoc, currentDoc, r = receipt, p = pin) => compareAnchors({ adapter, oldDoc, currentDoc, scope: adapter.scopeFrom({ receipt: r, pin: p, currentDoc }) });

test('unrelated packet edit compares only unchanged family dependencies and shared/default data', () => {
  const old = fixture(), current = clone(old); current.packetSets[1].components[0].requirement = 'conditional';
  const result = compare(old, current); assert.deepEqual(result.differing, []); assert.equal(result.anchorsCompared, 2);
});
test('own component/condition change invalidates the comparison', () => {
  const old = fixture(), current = clone(old); current.packetSets[0].components[0].conditionDescription = 'only after a request';
  assert.deepEqual(compare(old, current).differing, ['packetSet:a']);
});
test('shared defaults and newly introduced shared fields are mandatory anchors', () => {
  for (const change of [(d) => { d.defaults.filing = 'optional'; }, (d) => { d.sharedAuthority = 'new'; }]) {
    const old = fixture(), current = clone(old); change(current);
    assert.ok(compare(old, current).differing.includes('packetManifestSharedMetadata'));
  }
});
test('a shared default referencing another set includes that set transitively', () => {
  const old = fixture(); old.defaults.defaultPacketSetId = 'b'; old.packetSets[1].components[0].dependsOn = 'c-form';
  const current = clone(old); current.packetSets[2].components[0].requirement = 'optional';
  assert.ok(compare(old, current).differing.includes('packetSet:c'));
});
test('a family component referencing another set includes its dependencies', () => {
  const old = fixture(); old.packetSets[0].components[0].dependsOn = 'b';
  const current = clone(old); current.packetSets[1].version = '2';
  assert.ok(compare(old, current).differing.includes('packetSet:b'));
});
test('cycles terminate and retain every referenced anchor', () => {
  const old = fixture(); old.packetSets[0].components[0].dependsOn = 'b'; old.packetSets[1].components[0].dependsOn = 'a';
  assert.equal(compare(old, clone(old)).anchorsCompared, 3);
});
test('unresolved references and unsupported dependency shapes refuse', () => {
  for (const change of [(d) => { d.defaults.defaultPacketSetId = 'missing'; }, (d) => { d.packetSets[0].extends = 'b'; }, (d) => { d.packetSets[0].components[0].dependsOn = 'missing'; }, (d) => { d.defaults.defaultPacketSetId = 7; }, (d) => { d.defaults.reference = { unknownSelector: 'b' }; }]) {
    const old = fixture(); change(old); assert.throws(() => compare(old, clone(old)), Refusal);
  }
});
test('duplicate ids, absent old entries, and unsupported schemas refuse', () => {
  const duplicate = fixture(); duplicate.packetSets.push(entry('a')); assert.throws(() => compare(duplicate, clone(duplicate)), Refusal);
  const old = fixture(); old.packetSets.shift(); assert.throws(() => compare(old, fixture()), Refusal);
  const unsupported = fixture(); unsupported.schemaVersion = 2; assert.throws(() => compare(unsupported, clone(unsupported)), Refusal);
});
test('ambiguous route and record-id scopes refuse', () => {
  assert.throws(() => compare(fixture(), fixture(), { familyId: 'unknown' }, {}), Refusal);
  assert.throws(() => compare(fixture(), fixture(), receipt, { recordId: 'guess:a' }), Refusal);
  assert.throws(() => compare(fixture(), fixture(), { ...receipt, routeKeys: ['runtime:unknown'] }), Refusal);
});
test('nonunique track or component dependency refuses instead of guessing', () => {
  const duplicateTrack = fixture(); duplicateTrack.packetSets[1].trackId = 'a-track';
  assert.throws(() => compare(duplicateTrack, clone(duplicateTrack)), Refusal);
  const duplicateComponent = fixture(); duplicateComponent.packetSets[1].components[0].componentId = 'a-form';
  assert.throws(() => compare(duplicateComponent, clone(duplicateComponent)), Refusal);
});
test('multi-track family binds each explicitly declared route and both supported pin prefixes', () => {
  const r = { routeKeys: ['obligation:track-only:ZZ:a-track', 'obligation:track-pathway:ZZ:b-track:pathway'] };
  const scope = adapter.scopeFrom({ receipt: r, pin: { recordId: 'legal-design-packet-set-manifests:a+b' }, currentDoc: fixture() });
  assert.deepEqual(scope.anchorIds, ['a', 'b']);
});

// Actual committed IL six-component correction. The prior bytes and WV receipt
// are read from git; no test writes a receipt or manufactures a comparison PASS.
const correction = 'fded60e657631cdee0c146396e446482f4d66384';
const fromGit = (p) => execFileSync('git', ['show', `${correction}^:${p}`], { maxBuffer: 1 << 27 });
const oldManifest = fromGit(manifestPath);
const queue = JSON.parse(fs.readFileSync('data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json', 'utf8'));
const wv = queue.families.find((f) => f.familyId === 'wv_conv_nonviolent_felony-set');
const receiptPath = `${wv.directory}/source-receipt.json`;
const beforeText = fromGit(receiptPath).toString('utf8');
const measuredPlan = () => planReceipt({ familyId: wv.familyId, directory: wv.directory, receiptPath, beforeText });

test('native planner recovers real prior manifest and safely refreshes unchanged WV dependencies', () => {
  const plan = measuredPlan(); assert.equal(plan.outcome, 'REFRESHABLE', JSON.stringify(plan));
  const { text } = composeRefreshedReceipt(plan);
  assert.ok(readsAsUnmoved(beforeText, text));
  const before = JSON.parse(beforeText), after = JSON.parse(text);
  const strip = (x) => {
    if (Array.isArray(x)) return x.map(strip);
    if (!x || typeof x !== 'object') return x;
    const out = Object.fromEntries(Object.entries(x).map(([k, v]) => [k, strip(v)]));
    if (out.pathInRepository === manifestPath) { delete out.sha256; delete out.byteLength; delete out.identityRefresh; }
    return out;
  };
  assert.deepEqual(strip(after), strip(before), 'packet/source pins, verdicts and raster references must remain unchanged');
});
test('native planner refuses the actual relevant IL component-set change', () => {
  const before = { familyId: 'il-seal-edu-set', committedRecords: [{ pathInRepository: manifestPath, recordId: 'packet-set-manifest:il-seal-edu-set', sha256: sha256(oldManifest), byteLength: oldManifest.length }] };
  const plan = planReceipt({ familyId: before.familyId, directory: '/tmp/unused', receiptPath: '/tmp/unused/source-receipt.json', beforeText: JSON.stringify(before, null, 2) + '\n' });
  assert.equal(plan.outcome, 'REFUSED'); assert.ok(plan.records.some((r) => r.differences?.some((d) => d.anchor === 'packetSet:il-seal-edu-set')));
  assert.throws(() => composeRefreshedReceipt(plan));
});
test('unavailable prior manifest refuses without composing any refresh', () => {
  const before = { familyId: 'il-seal-edu-set', committedRecords: [{ pathInRepository: manifestPath, recordId: 'packet-set-manifest:il-seal-edu-set', sha256: '0'.repeat(64) }] };
  const plan = planReceipt({ familyId: before.familyId, directory: '/tmp/unused', receiptPath: '/tmp/unused/source-receipt.json', beforeText: JSON.stringify(before, null, 2) + '\n' });
  assert.equal(plan.outcome, 'REFUSED'); assert.ok(plan.records.some((r) => /could not be recovered/.test(r.why))); assert.throws(() => composeRefreshedReceipt(plan));
});
