import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import test from 'node:test';
import { installLocalPublicationFixture } from './consumer-payment-publication-fixture.mjs';

register('./lib/ts-esm-loader.mjs', import.meta.url);
const { resolveObservation, fulfillmentAuthorityFor } = await import('../src/lib/rcap/fulfillment/grade-a-admission.ts');

test('local publication fixture preserves missing route observations and disk evidence', async () => {
  const paths = ['data/rcap-grade-a/fulfillment-authority-registry.json',
    'data/rcap-grade-a/fulfillment-observation-snapshot.json',
    'data/rcap-render/worker-publication-evidence.json'];
  const before = paths.map(file => fs.readFileSync(file));
  const registry = JSON.parse(before[0]);
  const snapshot = JSON.parse(before[1]);
  const missing = registry.records.filter(record => !snapshot.routes[record.routeId]);
  assert.ok(missing.length > 0, 'counterexample requires an unobserved registry route');
  await installLocalPublicationFixture();
  for (const record of missing) {
    assert.equal(resolveObservation(record.routeId), null);
    assert.equal(fulfillmentAuthorityFor(record.routeId).authorized, false);
  }
  assert.equal(fulfillmentAuthorityFor('MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal').authorized, true);
  paths.forEach((file, index) => assert.deepEqual(fs.readFileSync(file), before[index], file));
});
