import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const H = await import('../src/lib/rcap-engine/new-york-16059-facts.ts');
const D = await import('../src/lib/rcap-engine/new-york-16059-clock-display.ts');
const custody = H.NY_16059_CUSTODY_CONFIRMATION_ID;
const relationship = H.NY_16059_RELEASE_CONFIRMATION_ID;
const base = { sentencing_date: '2016-01-01', ny_16059_earliest_conviction_date: '2014-01-01',
  ny_16059_sentence_incarceration: 'No', ny_16059_incarceration_history: 'none' };
const physical = periods => ({ ...base, ny_16059_incarceration_history: 'released',
  ny_16059_incarceration_periods: periods, [custody]: 'Yes' });
const checks = [];
function check(name, actual, expected) { assert.deepEqual(actual, expected, name); checks.push(name); }
function clock(name, answers, today = '2026-10-16') {
  const before = structuredClone(answers), result = H.ny16059Clock(answers, today);
  check(name + ': raw answers immutable', answers, before);
  return result;
}
// Fixed arithmetic comes from adopted section 3, not the implementation helper.
// These are conditional synthetic records, not certified person-specific dates.
const examples = [
  ['no custody', base, '2026-01-01', '2026-01-02', 0],
  ['pre-anchor custody', physical('2015-01-01/2015-01-11'), '2026-01-12', '2026-01-13', 11],
  ['cross-anchor sentence example', physical('2015-12-27/2016-01-06'), '2026-01-12', '2026-01-13', 11],
  ['cross-anchor qualifying release example', { ...physical('2015-12-27/2016-01-06'), ny_16059_sentence_incarceration: 'Yes', release_date: '2016-01-06', [relationship]: 'Yes' }, '2026-01-17', '2026-01-18', 11],
  ['overlapping duplicate transfers', physical('2015-12-27/2016-01-06;2016-01-01/2016-01-11;2015-12-27/2016-01-06'), '2026-01-17', '2026-01-18', 16],
  ['shared transfer date once', physical('2015-01-01/2015-01-02;2015-01-02/2015-01-03'), '2026-01-04', '2026-01-05', 3],
  ['single physical day', physical('2015-01-01/2015-01-01'), '2026-01-02', '2026-01-03', 1],
  ['preconviction days excluded', { ...physical('2013-12-28/2014-01-02') }, '2026-01-03', '2026-01-04', 2],
  ['calendar months clamp leap date', { ...base, sentencing_date: '2016-02-29' }, '2026-02-28', '2026-03-01', 0]
];
for (const [name, answers, end, recommendation, days] of examples) {
  const result = clock(name, answers);
  check(name + ': period end', result.computedPeriodEndDate, end);
  check(name + ': next-day recommendation', result.recommendedFilingDate, recommendation);
  check(name + ': qualifying inclusive physical days', result.qualifyingCustodyDays, days);
  check(name + ': no earliest-legal label', Object.hasOwn(result, 'eligibleOn'), false);
  check(name + ': no superseded competing interpretation', Object.hasOwn(result, 'latestPossibleOn'), false);
  for (const [today, status] of [[new Date(Date.parse(end + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10), 'not_yet'], [end, 'satisfied'], [recommendation, 'satisfied']]) {
    check(name + ': timing at ' + today, clock(name, answers, today).status, status);
  }
}
const old = { ...physical('2015-12-27/2016-01-06') }; delete old[custody];
check('old saved intervals cannot attest physical endpoints', clock('old intervals', old).ids, [custody]);
for (const value of ['No', 'I am not sure', { value: 'Yes', unknown: true }]) {
  const result = clock('ambiguous physical/conviction-day meaning', { ...old, [custody]: value });
  check('narrow physical-day ambiguity review ' + JSON.stringify(value), result.code, 'clock_custody_confirmation');
  check('no computed date on ambiguous endpoints', result.computedPeriodEndDate, undefined);
}
const release = { ...physical('2015-12-27/2016-01-06'), ny_16059_sentence_incarceration: 'Yes', release_date: '2016-01-06' };
check('old bare release does not establish sentence relationship', clock('old release', release).ids, [relationship]);
for (const value of ['No', 'I am not sure']) check('unproved sentence/release relationship ' + value, clock('relationship', { ...release, [relationship]: value }).code, 'clock_release_relationship');
for (const periods of ['2015-01-03/2015-01-01', '2015-02-29/2015-03-01', '2015-01-01/unknown', '2030-01-01/2030-01-02']) check('invalid physical dates ' + periods, clock('invalid periods', physical(periods)).status, 'missing');
check('contradictory sentence/release record still held', clock('conflicting release', { ...release, release_date: '2015-01-01', [relationship]: 'Yes' }).code, 'clock_conflict');
check('current physical incarceration remains fact-based not-yet', clock('current custody', { ...base, ny_16059_incarceration_history: 'current' }).code, 'incarcerated');
check('known ordinary no-custody case requires no new confirmation', clock('no custody ordinary', base).status, 'satisfied');
for (const id of [custody, relationship]) {
  check('confirmation not asked without custody ' + id, H.ny16059QuestionApplies(base, id), false);
  check('confirmation asked when applicable ' + id, H.ny16059QuestionApplies(release, id), true);
  const q = H.NY_16059_QUESTIONS.find(q => q.id === id);
  check('new explicit meaning EN/ES question exists ' + id, Boolean(q?.prompt && q?.helperText && q?.translations?.es?.prompt && q?.translations?.es?.helperText), true);
}
check('release relationship not asked for noncustodial sentence', H.ny16059QuestionApplies(physical('2015-01-01/2015-01-02'), relationship), false);
const example = clock('display sentence anchor', physical('2015-12-27/2016-01-06'));
check('exact English separate ISO date labels', D.ny16059ClockDisplayLines(example).slice(0, 2), ['Computed period-end date: 2026-01-12.', 'LegalEase recommended filing date: 2026-01-13.']);
check('exact Spanish separate ISO date labels', D.ny16059ClockDisplayLines(example, 'es').slice(0, 2), ['Fecha calculada de finalización del plazo: 2026-01-12.', 'Fecha de presentación recomendada por LegalEase: 2026-01-13.']);
for (const [english, spanish] of D.ny16059ClockDisplayLines(example).map((text, index) => [text, D.ny16059ClockDisplayLines(example, 'es')[index]])) check('exact dynamic caution translation ' + english, D.ny16059ClockDisplayTranslation(english), spanish);
check('conservative policy/court availability/direction disclaimer', D.ny16059ClockDisplayLines(example)[2], D.NY_16059_CLOCK_POLICY_GUIDANCE[0]);
check('no dates invented for unconfirmed old custody', D.ny16059ClockDisplayLines(clock('unconfirmed display', old)), []);
check('malformed display date refused', D.ny16059ClockDisplayLines({ computedPeriodEndDate: '2026-02-30', recommendedFilingDate: '2026-03-03' }), []);
check('unrelated copy is not translated by NY policy', D.ny16059ClockDisplayTranslation('Earliest legally permitted date: 2026-01-13.'), undefined);
const C = await import('../src/lib/expungement-ai/ny-16059-clock-confirmation.ts');
const savedYes = { ...release, [custody]: 'Yes', [relationship]: { value: 'Yes', unknown: false } };
for (const [id, value] of [['sentencing_date', '2016-01-02'], ['release_date', '2016-01-07'], ['ny_16059_earliest_conviction_date', '2013-01-01'], ['ny_16059_incarceration_periods', '2015-12-28/2016-01-06'], ['ny_16059_history_total', 2], ['ny_16059_later_conviction_entered', 'Yes'], ['sentence_completion_date', 'No'], ['ny_16059_sentence_incarceration', 'No'], ['ny_16059_incarceration_history', 'none']]) {
  const original = structuredClone(savedYes), changed = C.invalidateNyClockConfirmations(savedYes, 'NY', id, value);
  check('actual dirty input marks prior physical answer unsure ' + id, changed[custody], { value: 'Yes', unknown: true });
  check('actual dirty input marks prior relationship unsure ' + id, changed[relationship], { value: 'Yes', unknown: true });
  check('dirty reset preserves original saved raw ' + id, savedYes, original);
}
check('unchanged input preserves current Yes exactly', C.invalidateNyClockConfirmations(savedYes, 'NY', 'release_date', savedYes.release_date), savedYes);
check('unrelated input preserves current Yes exactly', C.invalidateNyClockConfirmations(savedYes, 'NY', 'email_address', 'new@example.invalid'), savedYes);
check('other jurisdiction unaffected', C.invalidateNyClockConfirmations(savedYes, 'CA', 'release_date', '2016-01-07'), savedYes);
check('fresh explicit confirmation is not self-invalidated', C.invalidateNyClockConfirmations(savedYes, 'NY', custody, 'Yes'), savedYes);
// Follow emitted runtime imports, including re-exports, from actual browser
// entry points. Type-only edges disappear before this check, as in a client build.
const clientDependencyClosures=[];
for(const entry of ['src/components/expungement-ai/screening/ScreeningFlow.tsx','src/lib/expungement-ai/localization.ts']){
 const seen=new Set(),bad=[];
 function visit(file,chain=[]){
  if(seen.has(file))return;seen.add(file);
  const source=fs.readFileSync(file,'utf8'),emitted=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},fileName:file}).outputText;
  for(const {fileName:specifier}of ts.preProcessFile(emitted,true,true).importedFiles){
   if(specifier==='server-only'){bad.push([...chain,file,specifier]);continue;}
   const base=specifier.startsWith('@/')?path.resolve('src',specifier.slice(2)):specifier.startsWith('.')?path.resolve(path.dirname(file),specifier):null;
   if(!base)continue;
   const resolved=[base,base+'.ts',base+'.tsx',base+'.json',path.join(base,'index.ts'),path.join(base,'index.tsx')].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
   if(resolved&&/\.[cm]?[jt]sx?$/.test(resolved))visit(resolved,[...chain,file]);
  }
 }
 visit(path.resolve(entry));
 check('actual client runtime dependency closure excludes server-only '+entry,bad,[]);
 clientDependencyClosures.push({entry,files:[...seen].map(p=>path.relative(process.cwd(),p)),serverOnlyPaths:bad});
}
const receipt = { status: 'PASS_SCOPED_ADOPTED_NY02_PURE_CLOCK', checks: checks.length, cases: examples.length, clientDependencyClosures, assertions: checks,
  limits: ['Pure owned helper/display/questions and dirty-input reset checks; affected consumer integration is tested separately.', 'Synthetic conditional facts and draft EN/ES questions, not owner, legal case qualification, language or output acceptance.', 'Recommended next day is policy guidance and never an additional statutory timing refusal.'] };
if (process.env.RCAP_NY_ADOPTED_CLOCK_RECEIPT) fs.writeFileSync(process.env.RCAP_NY_ADOPTED_CLOCK_RECEIPT, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks, cases: receipt.cases }));
