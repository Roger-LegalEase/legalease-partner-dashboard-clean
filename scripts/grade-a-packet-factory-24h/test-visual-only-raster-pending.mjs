import assert from 'node:assert/strict';
import { visualOnlyRasterPending } from './visual-only-raster-pending.mjs';
const counters = { knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0,
  unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0,
  requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0, visualDefects: null };
const ready = { counters, completedBuild: true, sourceReady: true, legalBlocked: false,
  routeMappingOpen: false, artifactPresent: true, independentVerdict: 'PASS',
  failedObligations: [], unmeasuredObligations: ['CLIPPING_AND_OVERLAP'],
  isIndependentVerification: true, rasterPassed: false };
assert.equal(visualOnlyRasterPending(ready), true);
let refused = 0;
for (const name of Object.keys(counters).filter(n => n !== 'visualDefects')) {
  for (const value of [null, undefined, 1, '0', false]) {
    assert.equal(visualOnlyRasterPending({ ...ready, counters: { ...counters, [name]: value } }), false);
    refused++;
  }
}
for (const patch of [{ completedBuild: false }, { sourceReady: false }, { legalBlocked: true },
  { routeMappingOpen: true }, { artifactPresent: false }, { independentVerdict: 'FAIL_REPAIR_REQUIRED' },
  { failedObligations: ['SERVICE'] }, { failedObligations: undefined }, { rasterPassed: true },
  { unmeasuredObligations: ['SERVICE'] }, { unmeasuredObligations: ['CLIPPING_AND_OVERLAP', 'SERVICE'] },
  { unmeasuredObligations: undefined }, { isIndependentVerification: false },
  { counters: { ...counters, visualDefects: 1 } }, { counters: { ...counters, visualDefects: 0 } },
  { counters: { ...counters, extra: 0 } }, { counters: null }]) {
  assert.equal(visualOnlyRasterPending({ ...ready, ...patch }), false);
  refused++;
}
assert.equal(counters.visualDefects, null, 'Eligibility must not turn an unmeasured visual counter into zero');
console.log(`Visual-only pending accepts measurement request; ${refused} unsafe or inapplicable cases refused.`);
