import assert from 'node:assert/strict';
import { register } from 'node:module';

globalThis.fetch = () => { throw Error('NETWORK_FORBIDDEN'); };
register('./lib/ts-esm-loader.mjs', import.meta.url);
const mode = process.argv[2] ?? 'candidate';
assert(['candidate', 'without-fix', 'skip-summary'].includes(mode));
const current = 'const conviction = candidates.find((pathway) => /conviction|misdemeanor|felony/i.test(`${pathway.label} ${pathway.summary}`) && !/without conviction|non[- ]conviction|no conviction|dismiss|acquit|not charged/i.test(pathway.label));';
const original = 'const conviction = candidates.find((pathway) => /conviction|misdemeanor|felony/i.test(`${pathway.label} ${pathway.summary}`));';
const summarySkip = current.replace('.test(pathway.label)', '.test(`${pathway.label} ${pathway.summary}`)');
register('data:text/javascript,' + encodeURIComponent(`export async function load(u,c,next){const r=await next(u,c);if(!u.endsWith('/src/lib/rcap-engine/evaluator.ts'))return r;
  let s=String(r.source);const anchor=${JSON.stringify(current)};
  if(s.split(anchor).length!==2)throw Error('fallback control anchor absent or nonunique');
  if(${JSON.stringify(mode)}!=='candidate')s=s.replace(anchor,${JSON.stringify(mode === 'without-fix' ? original : summarySkip)});
  return {...r,source:s+${JSON.stringify('\nexport { selectPathway as selectPathwayForLabelControl };')}};}`));
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { selectPathwayForLabelControl: select } = await import('../src/lib/rcap-engine/evaluator.ts');
const native = getProfileByJurisdiction('NE'), unchanged = structuredClone(native);
const nonconviction = native.pathways.find(p => p.id === 'automatic-nonconviction-sealing');
const conviction = native.pathways.find(p => p.id === 'set-aside-probation-fine-community-service');
assert(nonconviction && conviction);
let checks = 0;
const equal = (actual, expected, name) => { assert.equal(actual, expected, name); checks++; };
// Isolate label classification using real pathway identities; all changes are local test copies.
for (const label of ['Non-conviction sealing', 'Non conviction sealing', 'NON-CONVICTION sealing',
  'Without conviction relief', 'No conviction relief', 'Dismissed misdemeanor records',
  'Acquitted felony records', 'Not charged felony records']) {
  const bad = { ...nonconviction, label, summary: 'Relief for conviction records.' };
  const good = { ...conviction, label: 'Misdemeanor conviction relief', summary: 'Includes review of non-conviction records.' };
  const profile = { ...native, pathways: [bad, good] };
  for (const outcome of ['Misdemeanor conviction', 'Felony conviction', 'Other conviction or adjudication']) {
    const answers = { case_outcome: outcome }, before = structuredClone(answers);
    equal(select(profile, answers)?.id, good.id, `${label}/${outcome}: skip nonconviction label only`);
    equal(select({ ...profile, pathways: [bad] }, answers), undefined, `${label}/${outcome}: no eligible fallback`);
    assert.deepEqual(answers, before);
  }
}
const profile = { ...native, pathways: [nonconviction, conviction] };
for (const outcome of ['Dismissed, no-billed, nolle prosequi, or not prosecuted', 'Arrest or citation with no charge filed']) {
  equal(select(profile, { case_outcome: outcome })?.id, nonconviction.id, `${outcome}: preserve nonconviction branch`);
}
for (const value of [undefined, 'I am not sure', { unknown: true }]) {
  equal(select(profile, { case_outcome: value }), undefined, 'missing or unknown outcome grants no route');
}
equal(select(profile, { case_outcome: 'Misdemeanor conviction', possible_pathway_context: nonconviction.label })?.id,
  nonconviction.id, 'explicit context remains governed by its existing branch');
const md = getProfileByJurisdiction('MD');
equal(select(md, { case_outcome: 'Pardoned conviction', pardon_status: 'Yes' })?.id,
  'pardoned-conviction-expungement-under-crim-proc-10-105-a-8', 'MD pardon branch precedes generic fallback');
assert.deepEqual(native, unchanged);
console.log(JSON.stringify({ status: 'PASS_CONVICTION_FALLBACK_LABELS', mode, checks, rawAnswersAndProfilesPreserved: true }));
