import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {selectComposedRoute,forbiddenRouteIdentityFields,dispositionFromAnswers}=await import('../src/lib/rcap-engine/composed-route-selector.ts');
const pathwayId='non-conviction-expungement-for-dismissal-no-disposition-or-acquittal';
assert.deepEqual(selectComposedRoute({jurisdiction:'MS',pathwayId}),{status:'selected',trackId:'ms-nonconv'});
for(const input of [{jurisdiction:'MS',pathwayId:'unknown'},{jurisdiction:'IL',pathwayId},{jurisdiction:'MS',pathwayId:'*'}]) assert.deepEqual(selectComposedRoute(input),{status:'no_composed_route',trackId:null});
assert.deepEqual(forbiddenRouteIdentityFields({selectedTrackId:'ms-nonconv'}),['selectedTrackId']);
assert.deepEqual(selectComposedRoute({jurisdiction:'MS',pathwayId:'unknown',selectedTrackId:'ms-nonconv'}),{status:'no_composed_route',trackId:null});

// Illinois 5.2(j): the adopted track covers a Class 4 felony prostitution
// conviction and nothing else, so the mapped row is conditional. A record class
// it does not cover is refused outright rather than falling through to some
// other track, and a client still cannot supply the disposition that would open
// it -- the server derives that from the answers it already evaluated.
const ilPathway='felony-prostitution-relief';
assert.deepEqual(selectComposedRoute({jurisdiction:'IL',pathwayId:ilPathway,disposition:'felony_conviction'}),{status:'selected',trackId:'il-prostitution-j-vacate'});
for(const disposition of ['non_conviction','other_conviction','unknown',undefined]){
  const outcome=selectComposedRoute({jurisdiction:'IL',pathwayId:ilPathway,disposition});
  assert.equal(outcome.status,'route_conditions_unmet',`IL must refuse disposition ${String(disposition)}`);
  assert.equal(outcome.trackId,null);
  assert.match(outcome.reason,/Class 4 felony prostitution conviction/);
}
// The record class comes from the evaluated answers, never from a track name.
assert.equal(dispositionFromAnswers({case_outcome:'Felony conviction',offense_level:'Felony'}),'felony_conviction');
assert.equal(dispositionFromAnswers({case_outcome:'Misdemeanor conviction',offense_level:'Misdemeanor'}),'other_conviction');
assert.equal(dispositionFromAnswers({case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted',offense_level:'Felony'}),'non_conviction');
assert.equal(dispositionFromAnswers({case_outcome:'Arrest or citation with no charge filed',offense_level:'Felony'}),'non_conviction');
assert.equal(dispositionFromAnswers(undefined),'unknown');
// A client naming the track, or the disposition, still gets nothing.
assert.deepEqual(forbiddenRouteIdentityFields({selectedTrackId:'il-prostitution-j-vacate'}),['selectedTrackId']);
console.log('Exact MS+IL selector: 17/17 PASS; the Illinois row opens only on a felony conviction, client track remains forbidden. Protected persistence and job creation are exercised by the payment HTTP verifier.');
