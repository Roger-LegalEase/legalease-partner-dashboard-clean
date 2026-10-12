import assert from 'node:assert/strict';
import { DE_CONVICTION_BASE } from './lib/de-conviction-fixture.mjs';
import fs from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const file = 'src/lib/rcap-engine/evaluator.ts';
const source = process.env.RCAP_DE_ANCHOR_BASELINE
  ? execFileSync('git', ['show', `${process.env.RCAP_DE_ANCHOR_BASELINE}:${file}`], { encoding: 'utf8' }) : fs.readFileSync(file, 'utf8');
const sources = { [pathToFileURL(`${process.cwd()}/${file}`).href]: ts.transpileModule(source + '\nexport { specialRouteTiming };',
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText };
register(`data:text/javascript,${encodeURIComponent('let sources; export function initialize(data) { sources=data; } export async function load(url,context,next) { return url in sources ? {format:"module",source:sources[url],shortCircuit:true} : next(url,context); }')}`, { data: sources });
process.env.RCAP_EVALUATOR_TODAY = '2026-10-12';
const { specialRouteTiming, evaluateScreening } = await import('../src/lib/rcap-engine/evaluator.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const p = getProfileByJurisdiction('DE');
const route = p.pathways.find(p => p.id === 'discretionary-court-expungement-under-11-del-c-4374');
const rule = { id: 'synthetic-anchor-isolation', sourceRef: '11-Del-C-4374(a)(1)-(4)', when: {}, then: {} };
let checked = 0;
// Preserve the original anchor assertions with explicit current qualifying
// facts. Exact tier/exclusion boundaries live in test-de-conviction-predicates.
for (const [case_outcome, offense_level] of process.argv.includes('--replay-only') ? [] : [['Misdemeanor conviction','Misdemeanor'],['Felony conviction','Felony']]) {
  for (const disposition_date of ['2026-10-11', '2000-01-01', 'I am not sure', undefined]) {
    const facts = { ...DE_CONVICTION_BASE, case_outcome, offense_level, de_case_scope: offense_level === 'Felony' ? 'one_felony' : 'one_misdemeanors', de_incarceration: 'released', conviction_date: '2001-01-01', release_date: '2002-02-02', disposition_date };
    assert.equal(specialRouteTiming(p, facts, rule, route).status, 'satisfied', 'A later unrelated disposition is not the statutory conviction/release anchor'); checked++;
    for (const latest of ['conviction_date','release_date']) {
      assert.equal(specialRouteTiming(p, { ...facts, [latest]: '2026-10-11' }, rule, route).status, 'not_yet'); checked++;
    }
  }
  // Generic disposition alone never establishes either statutory event.
  const genericOnly = specialRouteTiming(p, { ...DE_CONVICTION_BASE, case_outcome, offense_level, de_case_scope: offense_level === 'Felony' ? 'one_felony' : 'one_misdemeanors', conviction_date: undefined, disposition_date: '2000-01-01' }, rule, route);
  assert.notEqual(genericOnly.status, 'satisfied'); checked++;
}
const witnesses = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.filter(w => w.jurisdiction === 'DE');
const actual = witnesses.map(w => {
  const r=evaluateScreening({jurisdiction:'DE',profileVersion:p.profileVersion,matterId:'synthetic-de-anchor-preservation',answers:w.finalAnswers});
  return {pathwayId:r.pathwayId,resultCode:r.resultCode,paymentAllowed:r.paymentAllowed,reasons:r.reasons.map(r=>r.code)};
});
if (!process.argv.includes('--replay-only')) {
  const witness = witnesses.find(w => w.pathwayId === route.id);
  for (const case_outcome of ['Arrest or citation with no charge filed', 'Dismissed, no-billed, nolle prosequi, or not prosecuted', 'Acquitted or found not guilty',
    'Diversion, deferred disposition, supervision, or similar program', 'Other conviction or adjudication', 'Juvenile adjudication or offense committed as a minor', 'Pardoned conviction', 'I am not sure']) {
    for (const offense_level of ['Misdemeanor', 'Felony', 'I am not sure']) {
      const r = evaluateScreening({jurisdiction:'DE',profileVersion:p.profileVersion,matterId:'synthetic-de-record-scope',answers:{...witness.finalAnswers,case_outcome,offense_level}});
      assert.equal(r.resultCode,'needs_review'); assert.equal(r.paymentAllowed,false);
      assert.equal(r.reasons[0].code, case_outcome === 'I am not sure' || offense_level === 'I am not sure' ? 'de.source_fact_unknown' : 'de.de_4374_conviction_scope_unconfirmed'); checked+=3;
    }
  }
  // Known conviction results must survive this bounded scope/anchor change.
  for (const case_outcome of ['Misdemeanor conviction','Felony conviction']) {
    const r = evaluateScreening({jurisdiction:'DE',profileVersion:p.profileVersion,matterId:'synthetic-de-known-conviction',answers:{...witness.finalAnswers,case_outcome}});
    assert.ok(!r.reasons.some(r=>r.code==='de.de_4374_conviction_scope_unconfirmed')); checked++;
  }
}
console.log(JSON.stringify({status:process.argv.includes('--replay-only')?'REPLAY_ONLY':'PASS',checked,legacyActual:actual,scope:'Exact conviction/release date dependency and nonconviction-record guard. Historical broad witnesses are not positive legal acceptance. Exact conviction tiers and exceptions are tested separately with current source facts.'}));
