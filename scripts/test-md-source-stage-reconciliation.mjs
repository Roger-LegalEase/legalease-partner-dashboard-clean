import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { register } from 'node:module';

// Owner Item 11: distinguish the adopted source-stage change from historical MD parity.
// Historical modules run on current dependencies; this is not a replay of the historical environment.
const reference = 'c63e420199b6bf953b5d53c114869997631d3807';
const pins = {
  'src/lib/rcap-engine/evaluator.ts': '7e0a2ff3fb9dc580e81ebc31dbf96c5c8a255da301f106423620087ddacc9a95',
  'src/lib/rcap-engine/public-profile-projection.ts': '50b74b22af960407689291f5fc1c283b11e77224568454fc0a1ecdba3a1fe0d3'
};
const hash = value => createHash('sha256').update(value).digest('hex');
const root = process.cwd(), mode = process.argv.find(arg => arg.startsWith('--snapshot='))?.slice(11);
const pardon = 'pardoned-conviction-expungement-under-crim-proc-10-105-a-8';
const police = 'police-record-expungement-when-no-charge-was-filed-under-10-103';
if (mode) {
  assert(['approved', 'current'].includes(mode));
  process.env.RCAP_EVALUATOR_TODAY = '2026-08-25';
  register(pathToFileURL(path.join(root, 'scripts/lib/ts-esm-loader.mjs')));
  const sources = {}, sourceHashes = {};
  for (const [file, expected] of Object.entries(pins)) {
    const old = execFileSync('git', ['show', `${reference}:${file}`], { cwd: root, maxBuffer: 8e6 });
    assert.equal(hash(old), expected, file + ': reference must be the actual approved bytes');
    const bytes = mode === 'approved' ? old : fs.readFileSync(path.join(root, file));
    sourceHashes[file] = hash(bytes);
    sources[pathToFileURL(path.join(root, file)).href] = bytes.toString();
  }
  register('data:text/javascript,' + encodeURIComponent(`
import { createRequire } from 'node:module';let d,ts;
export function initialize(x){d=x;ts=createRequire(d.root+'/package.json')('typescript')}
export async function load(u,c,n){if(!(u in d.sources))return n(u,c);let source=d.sources[u];
if(u.endsWith('/evaluator.ts')){for(const name of ['mdPardonDeadlineSafetyGate','mdPoliceRecordDeadlineSafetyGate'])if(!source.includes('function '+name+'('))throw Error('Actual gate absent: '+name);source+='\\nexport {mdPardonDeadlineSafetyGate,mdPoliceRecordDeadlineSafetyGate};';}
return {format:'module',shortCircuit:true,source:ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText};}`), { data: { root, sources } });
  const { getProfileByJurisdiction } = await import(pathToFileURL(path.join(root, 'src/lib/rcap-engine/profile-registry.ts')));
  const { projectPublicProfile } = await import(pathToFileURL(path.join(root, 'src/lib/rcap-engine/public-profile-projection.ts')));
  const { evaluateScreening, mdPardonDeadlineSafetyGate, mdPoliceRecordDeadlineSafetyGate } = await import(pathToFileURL(path.join(root, 'src/lib/rcap-engine/evaluator.ts')));
  const { selectScreeningQuestionIds } = await import(pathToFileURL(path.join(root, 'src/lib/rcap-engine/screening-question-selection.ts')));
  const profile = getProfileByJurisdiction('MD'), projection = projectPublicProfile(profile);
  const fixtures = JSON.parse(fs.readFileSync('data/expungement-ai/fixtures/maryland-pardon-evaluation-fixtures.json'));
  const cases = fixtures.cases.map(row => ({ name: 'original-wire:' + row.id, answers: row.answers }));
  const source = { ownership_scope: 'Yes', jurisdiction_scope: 'State or local', case_outcome: 'Pardoned conviction',
    possible_pathway_context: profile.pathways.find(p => p.id === pardon).label, offense_level: 'Misdemeanor',
    pardon_status: 'Yes', pending_cases: 'No', state_exclusion_categories: ['None of these'],
    age_at_offense:'30', prior_relief:'No', sentence_completion_date:'Yes', financial_obligations:'Yes' };
  for (const [name, date] of [['missing', undefined], ['unknown', {unknown:true}], ['within', '2020-08-25'], ['boundary', '2016-08-25'], ['expired', '2016-08-24']]) {
    cases.push({ name: 'synthetic-pardon:' + name, answers: {...source, ...(date === undefined ? {} : {pardon_signed_date:date})} });
  }
  cases.push({name:'synthetic-pardon:unrelated-unknown',answers:{...source,pardon_signed_date:'2020-08-25',arrest_date:{unknown:true}}},
    {name:'synthetic-pardon:reported-pardon-unknown',answers:{...source,pardon_signed_date:'2020-08-25',pardon_status:{unknown:true}}},
    {name:'synthetic-non-pardon-control',answers:{...source,case_outcome:'Misdemeanor conviction',pardon_status:'No',possible_pathway_context:profile.pathways.find(p=>p.id==='eligible-conviction-expungement-under-crim-proc-10-110').label}});
  const policeSource = {...source, case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted', pardon_status:'No', possible_pathway_context:profile.pathways.find(p=>p.id===police).label};
  for (const [name,date] of [['missing',undefined],['unknown',{unknown:true}],['within','2020-08-25'],['boundary','2018-08-25'],['expired','2018-08-24']]) {
    cases.push({name:'synthetic-police:'+name,answers:{...policeSource,...(date===undefined?{}:{arrest_date:date})}});
  }
  const evaluate = answers => { try { return {evaluation:evaluateScreening({jurisdiction:'MD',profileVersion:profile.profileVersion,matterId:'synthetic-md-parity',answers})}; }
    catch(error){if(!['InvalidAnswerError','UnknownQuestionError'].includes(error.name))throw error;return {error:{name:error.name,message:error.message,invalidQuestionIds:error.invalidQuestionIds}};} };
  const gates=[];
  for(const [route,field,fn,dates]of [[pardon,'pardon_signed_date',mdPardonDeadlineSafetyGate,[undefined,'2020-08-25','2016-08-25','2016-08-24']],[police,'arrest_date',mdPoliceRecordDeadlineSafetyGate,[undefined,'2020-08-25','2018-08-25','2018-08-24']]]){
    for(const date of dates)gates.push({route,date:date??null,result:fn(profile,date===undefined?{}:{[field]:date},profile.pathways.find(p=>p.id===route))??null});
  }
  console.log(JSON.stringify({mode,sourceHashes,profileHash:hash(JSON.stringify(profile)),projection,
    freeQuestionIds:Object.fromEntries(profile.pathways.map(p=>[p.id,selectScreeningQuestionIds(profile,projection,{possible_pathway_context:p.label})])),
    cases:cases.map(c=>({...c,...evaluate(c.answers)})),historicalArithmeticOnly:gates}));
} else {
  const run = mode => {
    const child=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'--snapshot='+mode],{cwd:root,encoding:'utf8',maxBuffer:16e6});
    assert.equal(child.status,0,mode+': '+child.stderr);return JSON.parse(child.stdout);
  };
  const approved = run('approved'), current = run('current');
  assert.equal(approved.profileHash, current.profileHash);
  const changedPardon = [];
  const beforeCopy = [
    'Your packet has been started. A few details may still be needed before it is ready to file.',
    'Review the cautions and complete packet fields in Briefcase after payment.',
    'Do not file until external documents, fees, fingerprints, and instructions are complete.'
  ];
  const afterCopy = [beforeCopy[0],
    'Review the cautions and complete the required packet facts in Briefcase before verification or payment.',
    'Before filing, follow the filing instructions and complete any required documents, fees or fingerprint steps.'
  ];
  const missingBefore = [
    'We need the case date, dismissal date, disposition date, or completion date used to check the waiting period.',
    'Save your progress and update your answers when you have that detail.'
  ];
  const missingAfter = [
    'Review your saved answer about court-ordered financial obligations. Keep an unsure answer if you do not know, and update it when you have the information.',
    'Also review any other questions marked as needing more information.'
  ];
  for (const row of current.cases) {
    const old = approved.cases.find(c => c.name === row.name);
    assert.deepEqual(row.answers, old.answers, row.name + ': identical input facts');
    if (row.name.startsWith('synthetic-police:')) continue;
    if (JSON.stringify(row) === JSON.stringify(old)) continue;
    assert(row.evaluation && old.evaluation, row.name + ': refusal behavior must not change');
    const {nextSteps: before, ...oldOutcome} = old.evaluation;
    const {nextSteps: after, ...newOutcome} = row.evaluation;
    assert.deepEqual(newOutcome, oldOutcome, row.name + ': entire result except next-step copy unchanged');
    const missing = row.name === 'original-wire:pardoned-conviction-with-missing-facts-asks-for-facts';
    assert.deepEqual(before, missing ? missingBefore : beforeCopy);
    assert.deepEqual(after, missing ? missingAfter : afterCopy);
    changedPardon.push(row.name);
  }
  assert.deepEqual(changedPardon, [
    'original-wire:pardoned-conviction-with-missing-facts-asks-for-facts',
    'synthetic-pardon:within', 'synthetic-pardon:boundary',
    'synthetic-pardon:unrelated-unknown', 'synthetic-pardon:reported-pardon-unknown'
  ]);
  const old2018 = approved.cases.find(c => c.name === 'synthetic-police:boundary');
  const new2018 = current.cases.find(c => c.name === old2018.name);
  assert.equal(old2018.answers.arrest_date, '2018-08-25');
  assert.equal(old2018.evaluation.resultCode, 'packet_ready_with_caution');
  assert(old2018.evaluation.packetPlan);
  assert.equal(new2018.evaluation.resultCode, 'needs_more_info');
  assert.deepEqual(new2018.evaluation.missingQuestionIds, ['md_10103_released_without_charge']);
  assert.equal(new2018.evaluation.paymentAllowed, false); assert(!new2018.evaluation.packetPlan);
  assert(new2018.evaluation.reasons.some(r => r.code === 'md.police_source_missing'));
  for (const name of ['missing', 'unknown', 'within', 'boundary', 'expired']) {
    const row = current.cases.find(c => c.name === 'synthetic-police:' + name);
    assert.equal(row.evaluation.resultCode, 'needs_more_info');
    assert.equal(row.evaluation.paymentAllowed, false); assert(!row.evaluation.packetPlan);
  }
  const ids = current.projection.questions.map(q => q.id);
  for (const id of ['md_10103_released_without_charge','md_10103_records_still_appear','md_10103_prior_written_request']) assert(ids.includes(id));
  assert.deepEqual(current.historicalArithmeticOnly, approved.historicalArithmeticOnly);
  const generated = spawnSync(process.execPath, ['scripts/apply-legal-authority-to-profiles.mjs','--check'], {cwd:root,encoding:'utf8'});
  assert.equal(generated.status, 0, generated.stderr);
  const report = {status:'ADOPTED_SOURCE_STAGE_NOT_HISTORICAL_EQUIVALENCE', reference,
    changedPardon, beforeCopy, afterCopy, missingBefore, missingAfter, approved, current,
    copySourceCommits:['89f4beee22be07d1e2a58629a78908c97023086a','46116aa19a'],
    limits:['Exact historical evaluator/projection modules run on current dependencies.',
      'Pardon result equivalence excludes the two explicitly compared next-step sentences.',
      'MD source-stage and saved-draft acceptance also require test-md-10103-source-stage.mjs; this comparison alone is insufficient.',
      'No approval of unrelated jurisdictions, deployment, payment or delivery is inferred.']};
  const output = process.argv.find(arg => arg.startsWith('--output='))?.slice(9);
  if (output) fs.writeFileSync(output, JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,cases:current.cases.length,changedPardon,example:'2018-08-25'}));
}
