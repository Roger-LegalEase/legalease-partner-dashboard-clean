import fs from 'node:fs';
import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const {evaluateAuthoritativeScreeningResult: evaluate} = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {getProfileByJurisdiction} = await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile} = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const {OR_RETIRED_NONCONVICTION_PATH: retired} = await import('../src/lib/rcap-engine/oregon-disposition-identity.ts');
// F-OR-RETIRED (lead m166 2026-10-21): the generic conviction fallback picked the retired ORS 137.225(1)(c) "without conviction"
// route for a conviction answer. Every public case_outcome x context option (and a skipped context) keeps its measured
// predecessor except the six declared movers below; nothing is paid, and the retired route is never a conviction's result.
const profile = getProfileByJurisdiction('OR'), questions = projectPublicProfile(profile).questions;
const options = id => questions.find(question => question.id === id).options;
const witness = JSON.parse(fs.readFileSync(new URL('../data/rcap-ledger/public-witness-fixtures.json', import.meta.url)))
  .fixtures.find(item => item.pathwayKey === 'OR:' + retired);
const baseline = JSON.parse(fs.readFileSync(new URL('./fixtures/or-retired-route-grid-predecessor.json', import.meta.url)));
const conviction = 'set-aside-of-eligible-convictions-under-ors-137-225-1-a';
const retiredLabel = profile.pathways.find(pathway => pathway.id === retired).label;
const convictions = ['Misdemeanor conviction', 'Felony conviction', 'Other conviction or adjudication'];
const movers = new Map(convictions.flatMap(outcome => [
  [outcome + '|(absent)', {resultCode: 'needs_review', pathwayId: conviction, reasons: ['or.waiting_rule_not_executed']}],
  [outcome + '|' + retiredLabel, {resultCode: 'needs_review', pathwayId: null, reasons: ['or.pathway_context_not_matched']}]]));
const rows = [];
for (const outcome of options('case_outcome')) for (const context of [...options('possible_pathway_context'), undefined]) {
  const answers = {...structuredClone(witness.answers), case_outcome: outcome};
  if (context === undefined) delete answers.possible_pathway_context; else answers.possible_pathway_context = context;
  const before = structuredClone(answers);
  const e = evaluate({jurisdiction: 'OR', profileVersion: witness.profileVersion, matterId: 'synthetic-or-retired-route-grid', answers}).evaluation;
  assert.deepEqual(answers, before, 'saved answers must remain exact');
  const key = outcome + '|' + (context ?? '(absent)');
  const actual = {resultCode: e.resultCode, pathwayId: e.pathwayId ?? null, reasons: e.reasons.map(reason => reason.code)};
  const old = baseline.rows.find(row => row.key === key);
  assert.ok(old, key + ': predecessor row missing');
  assert.equal(e.paymentAllowed, false, key);
  assert.deepEqual(actual, movers.get(key) ?? old.result, key);
  if (convictions.includes(outcome)) assert.notEqual(actual.pathwayId, retired, key + ': a conviction cannot land on the retired route');
  rows.push({key, ...actual, moved: movers.has(key)});
}
assert.equal(rows.length, baseline.rows.length);
assert.equal(rows.filter(row => row.moved).length, movers.size);
// "I am not sure" + the retired label stays as measured, unpaid source_fact_unknown (Roger, option (i), lead m194 2026-10-22).
assert.equal(rows.find(row => row.key === 'I am not sure|' + retiredLabel).pathwayId, retired);
for (const row of rows.filter(row => row.key.startsWith('I am not sure|'))) assert.deepEqual([row.resultCode, row.reasons], ['needs_review', ['or.source_fact_unknown']], row.key);
console.log(JSON.stringify({status: 'PASS', cases: rows.length, moved: movers.size, unchanged: rows.length - movers.size, paid: 0}));
