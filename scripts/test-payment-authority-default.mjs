#!/usr/bin/env node
// OD-BR-1: reuse the fixed D1 witnesses; authority mutations stay in memory.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

process.env.RCAP_EVALUATOR_TODAY = '2026-07-01';
globalThis.fetch = () => { throw Error('NETWORK_FORBIDDEN'); };
const url = path => pathToFileURL(`${process.cwd()}/${path}`).href;
register(url('scripts/lib/ts-esm-loader.mjs'));
const mode = process.argv[2] ?? 'candidate', unratified = process.argv.includes('--unratified');
const key = 'AK:confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40';
const mutations = {
  'unknown-permits': ['pathway.legalAuthority?.paymentAuthority === "packet_checkout"', 'pathway.legalAuthority?.paymentAuthority !== "closed" && pathway.legalAuthority?.paymentAuthority !== "attorney_review_required"'],
  'ignore-explicit-denial': ['pathway.legalAuthority?.paymentAuthority === "packet_checkout"', 'true'],
  'deny-ratified-absence': ['? routeIsRatifiedDeployable(profile, pathway)', '? false'],
  'bypass-ratification': ['return RATIFIED_DEPLOYABLE_ROUTES.has(routeKey(profile, pathway));', 'return true;']
};
assert(mode === 'candidate' || Object.hasOwn(mutations, mode));
register('data:text/javascript,' + encodeURIComponent(`export async function load(u,c,next){const r=await next(u,c);
  if(${unratified}&&u.endsWith('/route-ratification-registry.json')){const d=JSON.parse(String(r.source).slice('export default '.length,-1));d.routes=d.routes.filter(row=>row.routeKey!==${JSON.stringify(key)});return {...r,source:'export default '+JSON.stringify(d)+';'};}
  if(!u.endsWith('/src/lib/rcap-engine/evaluator.ts')||${JSON.stringify(mode)}==='candidate')return r;
  const [a,b]=${JSON.stringify(mutations[mode] ?? [])},s=String(r.source);if(s.split(a).length!==2)throw Error('nonunique mutant anchor');return {...r,source:s.replace(a,b)};}`));
const { getProfileByJurisdiction } = await import(url('src/lib/rcap-engine/profile-registry.ts'));
const { evaluateScreening } = await import(url('src/lib/rcap-engine/evaluator.ts'));
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/od-br-1-payment-ownership.json', import.meta.url)));
const row = fixture.cases.find(row => row.jurisdiction === 'AK' && row.expected.paymentAllowed);
assert(row);
const profile = getProfileByJurisdiction(row.jurisdiction);
const pathway = profile.pathways.find(path => path.id === row.expected.pathwayId);
assert.equal(pathway.legalAuthority, undefined);
const cases = [
  ['absent', undefined, !unratified],
  ['explicit-checkout', { paymentAuthority: 'packet_checkout' }, !unratified],
  ...['closed', 'attorney_review_required', 'unrecognized', undefined].map(value =>
    [`explicit-${String(value)}`, { paymentAuthority: value }, false]),
  ...[true, 1, {}, ['packet_checkout']].map((value, index) =>
    [`explicit-wrong-type-${index}`, { paymentAuthority: value }, false]),
  ['invalid-null-authority', null, false]
];
const failures = [], results = [];
let checks = 0;
function check(name, fn) { checks++; try { fn(); } catch (error) { failures.push({ name, error: error.message }); } }
try {
  for (const [name, authority, allowed] of cases) {
    if (authority === undefined) delete pathway.legalAuthority; else pathway.legalAuthority = authority;
    const answers = structuredClone(row.answers), before = JSON.stringify(answers);
    const actual = evaluateScreening({ jurisdiction: row.jurisdiction, profileVersion: profile.profileVersion, matterId: row.expected.matterId, answers });
    check(`${name}:payment`, () => assert.equal(actual.paymentAllowed, allowed));
    check(`${name}:same-route`, () => assert.equal(actual.pathwayId, row.expected.pathwayId));
    check(`${name}:raw-preserved`, () => assert.equal(JSON.stringify(answers), before));
    if (authority === undefined) check(`${name}:payment-only`, () => assert.deepEqual(actual, { ...row.expected, paymentAllowed: allowed }));
    results.push({ name, resultCode: actual.resultCode, pathwayId: actual.pathwayId, paymentAllowed: actual.paymentAllowed });
  }
} finally { delete pathway.legalAuthority; }
if (!unratified) {
  check('restored-existing-result', () => assert.deepEqual(evaluateScreening({ jurisdiction: row.jurisdiction, profileVersion: profile.profileVersion, matterId: row.expected.matterId, answers: structuredClone(row.answers) }), row.expected));
  const child = spawnSync(process.execPath, [process.argv[1], mode, '--unratified'], { encoding: 'utf8' });
  check('unratified-selected-route-denied', () => assert.equal(child.status, 0, child.stdout + child.stderr));
  results.push({ unratifiedChild: child.status, output: child.stdout, error: child.stderr });
}
console.log(JSON.stringify({ mode, unratified, checks, passed: checks - failures.length, failures, results }, null, 2));
process.exitCode = failures.length ? 1 : 0;
