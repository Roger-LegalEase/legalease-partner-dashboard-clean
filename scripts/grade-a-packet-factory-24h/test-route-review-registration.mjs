import assert from 'node:assert/strict';
import fs from 'node:fs';
import { reviewedRouteRegistration, registeredRouteBindings } from './route-review-registration.mjs';

const reviewPath = 'data/rcap-grade-a/route-artifact-acceptance/independent-returns/rcap-hi-custom-pleading.json';
const review = JSON.parse(fs.readFileSync(reviewPath));
const proofPath = review.artifacts.originalEvidence;
const proof = JSON.parse(fs.readFileSync(proofPath));
const baseline = reviewedRouteRegistration(reviewPath);
assert.equal(baseline.bindings.length, 5);
assert.equal(baseline.bindings.flatMap(r => r.fixtures).length, 10);
assert.ok(baseline.bindings.every(r => !r.paymentEligible && !r.sponsorshipEligible && !r.runtimeInstalled));
assert.deepEqual(registeredRouteBindings('not-a-registered-family'), []);
const reject = (label, file, mutate) => {
  const changed = JSON.parse(fs.readFileSync(file));
  mutate(changed);
  assert.throws(() => reviewedRouteRegistration(reviewPath, {
    readBytes: p => p === file ? Buffer.from(JSON.stringify(changed)) : fs.readFileSync(p)
  }), undefined, label);
};
reject('builder cannot self-approve', reviewPath, r => r.verifier.builtOrAuthoredThisFamily = true);
reject('failed review cannot register', reviewPath, r => r.verdict = 'FAIL_REPAIR_REQUIRED');
reject('unmeasured obligation cannot register', reviewPath, r => r.results.SERVICE.result = 'UNMEASURED');
reject('review cannot omit a route', reviewPath, r => r.route.routeSlugs.pop());
reject('wrong route identity cannot register', reviewPath, r => r.route.routeKeys[0] = 'unreviewed-route');
reject('wrong packet pin cannot register', reviewPath, r => r.reviewedAtBase = '0'.repeat(40));
reject('failed central run cannot register', proofPath.replace('ORIGINAL_EVIDENCE_VERIFIED.json', 'run.json'), r => r.conclusion = 'failure');
reject('wrong central job cannot register', proofPath.replace('ORIGINAL_EVIDENCE_VERIFIED.json', 'jobs.json'), r => r.jobs = r.jobs.filter(j => j.id !== proof.families[0].jobId));
reject('incomplete raster cannot register', proof.families[0].verdictPath, r => r.measurements.pop());
reject('failed raster cannot register', proof.families[0].verdictPath, r => r.verdict = 'RASTER_FAIL');
reject('missing boundary fixture cannot register', 'data/rcap-all50/overlays/census-v1/hi/rcap-hi-custom-pleading--custom-pleading/reports/rendered-artifacts.json', r => r.routeArtifacts.pop());
const pdf = baseline.bindings[0].fixtures[0].file;
assert.throws(() => reviewedRouteRegistration(reviewPath, {
  readBytes: p => p === pdf ? Buffer.concat([fs.readFileSync(p), Buffer.from('changed')]) : fs.readFileSync(p)
}), /current PDF differs/);
assert.deepEqual(reviewedRouteRegistration(reviewPath), baseline, 'validation is deterministic and does not mutate evidence');
console.log('Route review registration: 5 positive routes; 12 corrupt/stale/foreign evidence controls refused; no files written.');
