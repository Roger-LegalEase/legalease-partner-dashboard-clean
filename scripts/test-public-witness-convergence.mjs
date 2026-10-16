import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { register } from 'node:module';
import ts from 'typescript';
process.env.RCAP_EVALUATOR_TODAY = '2026-07-01';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const packet = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json'));
const orPredecessor = JSON.parse(fs.readFileSync('scripts/fixtures/or-disposition-witness-predecessor.json'));
const caTool1Predecessor = JSON.parse(fs.readFileSync('scripts/fixtures/ca-tool1-witness-predecessor.json'));
const txPredecessors = JSON.parse(fs.readFileSync('scripts/fixtures/tx-nondisclosure-witness-predecessors.json'));
const msMipPredecessor = JSON.parse(fs.readFileSync('scripts/fixtures/ms-mip-witness-predecessor.json'));
const changed = new Set([
  'AR:situation-a-non-convictions', 'AR:situation-b-misdemeanor-convictions', 'AR:situation-c-felony-convictions',
  'CA:prop-64-completed-sentence-application-11361-8', 'CA:prop-64-currently-serving-petition-11361-8',
  'DE:discretionary-court-expungement-under-11-del-c-4374', 'GA:restriction-and-sealing-of-a-pardoned-felony',
  'KS:municipal-arrest-record-expungement-under-12-4516a', 'MS:eligible-felony-conviction-expungement-99-19-71',
  'MS:first-offense-controlled-substance-conditional-discharge-relief', 'MS:nonadjudication-under-99-15-26',
  'MS:pretrial-intervention-or-diversion-expungement', 'NV:probation-or-specialty-court-dismissal-set-aside-sealing',
  'NY:discretionary-conviction-sealing-by-petition-under-cpl-160-59'
]);
// Outcomes are copied from the retained targeted requirement tests, not derived
// from observed generator output. The conditional-discharge test permits each
// held follow-on treatment; it does not authorize payment or a document.
const expectedSupplemental = {
  'CA:prop-64-completed-sentence-application-11361-8': ['packet_ready'],
  'CA:prop-64-currently-serving-petition-11361-8': ['packet_ready_with_caution'],
  'GA:restriction-and-sealing-of-a-pardoned-felony': ['needs_review'],
  'MS:first-offense-controlled-substance-conditional-discharge-relief': ['packet_ready','packet_ready_with_caution','needs_review'],
  'MS:nonadjudication-under-99-15-26': ['packet_ready_with_caution'],
  'MS:pretrial-intervention-or-diversion-expungement': ['packet_ready_with_caution']
};
let checks = 0;
function check(fn) { fn(); checks++; }
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const source = fs.readFileSync('scripts/generate-rcap-public-witness-answer-sets.mjs', 'utf8');
const ast = ts.createSourceFile('generator.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
function declaration(name) {
  const node = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.ok(node, name); return node.getText(ast);
}
function convergenceFactory(convergenceSource = declaration('converge')) {
  return new Function('evaluateAuthoritativeScreeningResult', 'CLEAR_RECORD', `${declaration('answerFor')}\n${convergenceSource}\nreturn converge;`)(evaluate, packet.determinism.clearRecord);
}
const converge = convergenceFactory();
function questions(profile) {
  const map = new Map();
  function visit(n) { if (!n || typeof n !== 'object') return; if (n.id && n.type && (n.prompt || n.label) && !map.has(n.id)) map.set(n.id,n); Object.values(n).forEach(visit); }
  visit(projectPublicProfile(profile)); return map;
}
const replay = (w, answers) => evaluate({jurisdiction:w.jurisdiction,profileVersion:w.profileVersion,matterId:'public-witness',answers}).evaluation;
const projection = e => ({resultCode:e.resultCode,pathwayId:e.pathwayId ?? null,pathwayLabel:e.pathwayLabel ?? null,paymentAllowed:e.paymentAllowed===true,treatmentClassification:e.treatmentClassification ?? null,selectedTrackId:e.selectedTrackId ?? null,reasonCodes:(e.reasons ?? []).map(r=>r.code).sort(),missingQuestionIds:[...(e.missingQuestionIds ?? [])].sort()});
function requireUnresolved(w) {
  assert.equal(w.terminalEvaluation,null,'unresolved witness must not claim a terminal result');
  assert.ok(w.convergenceStatus?.startsWith('unresolved_'),'unresolved status required');
  assert.ok(w.unresolvedEvaluation?.missingQuestionIds?.length,'actual unresolved evaluation required');
  assert.ok(w.error,'unresolved diagnostic required');
}
check(()=>assert.equal(packet.witnesses.length,267));
check(()=>assert.equal(new Set(packet.witnesses.map(w=>w.pathwayKey)).size,267));
check(()=>assert.equal(packet.witnesses.filter(w=>changed.has(w.pathwayKey)).length,14));
// Preserve the original 253-row digest. The later source-governed OR bridge
// changes exactly its retired-route witness; retain that exact historical row
// for this original comparison and independently check its current successor.
// The later Tool1 correction likewise retires a false no-charge positive. Keep
// that exact historical row only for the original digest, then assert the
// current refusal against the real evaluator. No replacement digest hides drift
// in any of the other 247 rows. The three exact historical TX rows below
// likewise preserve this original digest while their current source-clock
// consumers are asserted separately; the original14-row cohort stays fixed.
const orKey = 'OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c';
const caTool1Key = 'CA:tool-1-dismissal-set-aside';
const txKeys = ['TX:first-offense-dwi-nondisclosure','TX:petitioned-nondisclosure-after-completed-deferred-adjudication-411-0725','TX:petitioned-nondisclosure-for-an-eligible-conviction-411-0735'];
const txHistorical = new Map(txPredecessors.witnesses.map(w=>[w.pathwayKey,w]));
const msMipKey = 'MS:minor-in-possession-underage-alcohol-expungement';
check(()=>assert.equal(txPredecessors.sourceSha,'c1814855e59e4054b08aec97acf28a9acb78ecf1'));
check(()=>assert.equal(txPredecessors.sourcePath,'data/rcap-ledger/public-witness-answer-sets.json'));
check(()=>assert.equal(txPredecessors.sourceSha256,'087985053f3c81033a58ca453510d4db6ffc75187238449bcd99ef8ac592d608'));
check(()=>assert.deepEqual([...txHistorical.keys()],txKeys));
check(()=>assert.equal(txPredecessors.witnesses.length,3));
check(()=>assert.equal(orPredecessor.witness.pathwayKey,orKey));
check(()=>assert.equal(caTool1Predecessor.witness.pathwayKey,caTool1Key));
check(()=>assert.equal(caTool1Predecessor.sourceSha,'67556b6acf3cc6652f5f6ae10bfb0d0366cca63a'));
check(()=>assert.equal(caTool1Predecessor.sourceSha256,'3d90a8ffeb6c4c45da3f24a19cbffeceaf637647832f340aef1423a68c36e73b'));
// Preserve the original digest with the exact pre-correction synthetic MIP
// transcript. The current AND-date witness is checked separately below; an
// older OR-date answer never supplies the newly required meaning.
check(()=>assert.equal(msMipPredecessor.sourceSha,'933615db47bf54d147fdbe0b32417999849b4155'));
check(()=>assert.equal(msMipPredecessor.sourcePath,'data/rcap-ledger/public-witness-answer-sets.json'));
check(()=>assert.equal(msMipPredecessor.sourceSha256,'42ac6dfad098e928c136adb4cbe08106f6bcb6045e30aad8edd6fb0e39ad14ec'));
check(()=>assert.equal(msMipPredecessor.witness.pathwayKey,msMipKey));
check(()=>assert.equal(sha(JSON.stringify(packet.witnesses.filter(w=>!changed.has(w.pathwayKey)).map(w=>w.pathwayKey===orKey?orPredecessor.witness:w.pathwayKey===caTool1Key?caTool1Predecessor.witness:w.pathwayKey===msMipKey?msMipPredecessor.witness:txHistorical.get(w.pathwayKey)??w))),'dd48f2daa2b68b38926d3d619c91b92833db494fe5d63ae4f31218c1c5c2dba2'));
const msMipWitness = packet.witnesses.find(w=>w.pathwayKey===msMipKey);
check(()=>assert.ok(msMipWitness));
check(()=>assert.deepEqual(msMipWitness.seedAnswers,msMipPredecessor.witness.seedAnswers));
check(()=>assert.equal(msMipPredecessor.witness.finalAnswers.ms_mip_dismissal_or_discharge_date,'2012-06-01'));
check(()=>assert.equal(msMipPredecessor.witness.finalAnswers.ms_mip_dismissal_and_discharge_date,undefined));
check(()=>assert.equal(msMipWitness.finalAnswers.ms_mip_dismissal_and_discharge_date,'2012-06-01'));
check(()=>assert.equal(msMipWitness.finalAnswers.ms_mip_dismissal_or_discharge_date,undefined));
const expectedMsMipWitness=structuredClone(msMipPredecessor.witness);
expectedMsMipWitness.finalAnswers.ms_mip_dismissal_and_discharge_date=expectedMsMipWitness.finalAnswers.ms_mip_dismissal_or_discharge_date;
delete expectedMsMipWitness.finalAnswers.ms_mip_dismissal_or_discharge_date;
expectedMsMipWitness.rounds[2].requested=['ms_mip_dismissal_and_discharge_date'];
expectedMsMipWitness.rounds[2].supplied={ms_mip_dismissal_and_discharge_date:'2012-06-01'};
check(()=>assert.deepEqual(msMipWitness,expectedMsMipWitness));
check(()=>assert.deepEqual(msMipWitness.terminalEvaluation,msMipPredecessor.witness.terminalEvaluation));
check(()=>assert.deepEqual(projection(replay(msMipWitness,msMipWitness.finalAnswers)),msMipWitness.terminalEvaluation));
const msMipOldMeaning = replay(msMipWitness,msMipPredecessor.witness.finalAnswers);
check(()=>assert.ok(msMipOldMeaning.missingQuestionIds.includes('ms_mip_dismissal_and_discharge_date')));
check(()=>assert.equal(msMipOldMeaning.paymentAllowed,false));
const msMipProfile=getProfileByJurisdiction('MS');
const msMipRun=converge('MS',msMipProfile,questions(msMipProfile),msMipWitness.seedAnswers);
check(()=>assert.deepEqual(msMipRun.transcript,msMipWitness.rounds));
check(()=>assert.deepEqual(msMipRun.answers,msMipWitness.finalAnswers));
const orWitness = packet.witnesses.find(w=>w.pathwayKey===orKey);
check(()=>assert.ok(orWitness));
const orCurrent = replay(orWitness,orWitness.finalAnswers);
check(()=>assert.deepEqual(projection(orCurrent),orWitness.terminalEvaluation));
check(()=>assert.equal(orCurrent.pathwayId,'set-aside-of-a-citation-or-arrest-with-no-accusatory-instrument-under-ors-137-225-1-c'));
check(()=>assert.equal(orCurrent.selectedTrackId,'or_arrest_no_charges'));
check(()=>assert.equal(orCurrent.resultCode,'needs_review'));
check(()=>assert.equal(orCurrent.paymentAllowed,false));
check(()=>assert.equal(orCurrent.packetPlan,undefined));
check(()=>assert.equal(orWitness.landedOnThisPathway,false));
check(()=>assert.ok(!orCurrent.reasons.some(r=>r.code==='or.waiting_rule_not_executed')));
// Same original synthetic premises: an arrest with no charge cannot establish
// a conviction or a payable after-probation request. Do not invent new facts
// merely to make this witness settle on its intended route.
const caTool1Witness = packet.witnesses.find(w=>w.pathwayKey===caTool1Key);
check(()=>assert.ok(caTool1Witness));
check(()=>requireUnresolved(caTool1Witness));
check(()=>assert.deepEqual(caTool1Witness.seedAnswers,caTool1Predecessor.witness.seedAnswers));
check(()=>assert.equal(caTool1Witness.finalAnswers.case_outcome,'Arrest or citation with no charge filed'));
check(()=>assert.equal(caTool1Witness.finalAnswers.offense_level,undefined));
const caTool1Current = replay(caTool1Witness,caTool1Witness.finalAnswers);
check(()=>assert.deepEqual(caTool1Current,caTool1Witness.unresolvedEvaluation));
check(()=>assert.equal(caTool1Current.resultCode,'needs_review'));
check(()=>assert.deepEqual(caTool1Current.missingQuestionIds,['case_outcome']));
check(()=>assert.ok(caTool1Current.reasons.some(r=>r.code==='ca.probation_outcome')));
check(()=>assert.equal(caTool1Current.pathwayId,undefined));
check(()=>assert.equal(caTool1Current.selectedTrackId,undefined));
check(()=>assert.equal(caTool1Current.packetPlan,undefined));
check(()=>assert.equal(caTool1Current.paymentAllowed,false));
check(()=>assert.equal(caTool1Witness.landedOnThisPathway,false));
const caProfile=getProfileByJurisdiction('CA');
const caTool1Run=converge('CA',caProfile,questions(caProfile),caTool1Witness.seedAnswers);
check(()=>assert.equal(caTool1Run.convergenceStatus,'unresolved_unchanged_answers'));
check(()=>assert.deepEqual(caTool1Run.transcript,caTool1Witness.rounds));
check(()=>assert.deepEqual(caTool1Run.answers,caTool1Witness.finalAnswers));
check(()=>assert.deepEqual(caTool1Run.unresolvedEvaluation,caTool1Current));
check(()=>assert.ok(caTool1Run.transcript.length<8,'Tool1 no unchanged-answer churn'));
check(()=>assert.throws(()=>requireUnresolved({...caTool1Witness,terminalEvaluation:caTool1Predecessor.witness.terminalEvaluation}),/must not claim a terminal/));
// Accepted TX source contracts require these facts/holds. The synthetic first
// option remains deferred_adjudication, including its explicit 411.0735
// conflict; never replace it with a favorable conviction subtype to settle.
const txExpected = [
  { reason:'tx.nondisclosure_dwi_source_facts_review', answers:{tx_nd_supervision_type:'deferred_adjudication',tx_nd_discharge_dismissal_date:'2012-06-01'}, rounds:[
    {round:2,requested:['tx_nd_supervision_type'],supplied:{tx_nd_supervision_type:'deferred_adjudication'}},
    {round:3,requested:['tx_nd_discharge_dismissal_date'],supplied:{tx_nd_discharge_dismissal_date:'2012-06-01'}}] },
  { reason:'tx.route_gate_pending_lawrence_review', answers:{tx_nd_supervision_type:'deferred_adjudication',tx_nd_deferred_offense_class:'misdemeanor_other_chapter',tx_nd_discharge_dismissal_date:'2012-06-01'}, rounds:[
    {round:2,requested:['tx_nd_supervision_type'],supplied:{tx_nd_supervision_type:'deferred_adjudication'}},
    {round:3,requested:['tx_nd_deferred_offense_class','tx_nd_discharge_dismissal_date'],supplied:{tx_nd_deferred_offense_class:'misdemeanor_other_chapter',tx_nd_discharge_dismissal_date:'2012-06-01'}}] },
  { reason:'tx.nondisclosure_subtype_conflict', answers:{tx_nd_supervision_type:'deferred_adjudication'}, unresolved:true, rounds:[
    {round:2,requested:['tx_nd_supervision_type'],supplied:{tx_nd_supervision_type:'deferred_adjudication'}},
    {round:3,requested:['tx_nd_supervision_type'],supplied:{tx_nd_supervision_type:'deferred_adjudication'}}] }
];
function requireCurrentTx(w,prior,expected) {
  assert.equal(w.finalAnswers.tx_nd_supervision_type,'deferred_adjudication','TX current source subtype required');
  for(const key of ['pathwayKey','jurisdiction','pathwayId','pathwayLabel','profileVersion','publicRoute','evaluationEndpoint','seedAnswers','pathwayContextOffered'])assert.deepEqual(w[key],prior[key],'TX original identity/premise preserved: '+key);
  assert.deepEqual(w.finalAnswers,{...prior.finalAnswers,...expected.answers},'TX only exact new source facts added');
  assert.deepEqual(w.rounds,[...prior.rounds,...expected.rounds],'TX exact original transcript plus source questions');
  assert.equal(w.finalAnswers.case_outcome,'Arrest or citation with no charge filed','TX generic counterexample is not replaced with favorable facts');
  const observed=w.terminalEvaluation??w.unresolvedEvaluation;
  assert.equal(observed?.resultCode,'needs_review','TX current source hold remains');
  assert.equal(observed?.paymentAllowed,false,'TX current successor cannot allow payment');
  assert.equal(observed?.selectedTrackId??null,null,'TX source clock grants no selected track');
  assert.equal(w.sourceBoundSyntheticWitness,undefined,'No new favorable supplemental witness');
  if(expected.unresolved){
    requireUnresolved(w);assert.equal(w.convergenceStatus,'unresolved_unchanged_answers');
    assert.deepEqual(observed.missingQuestionIds,['tx_nd_supervision_type']);
    assert.deepEqual(observed.reasons.map(r=>r.code),[expected.reason]);
    assert.equal(w.error,'Required facts remain unresolved under these exact synthetic premises.');
    assert.equal(w.landedOnThisPathway,false);
  }else{
    assert.equal(w.convergenceStatus,undefined);assert.equal(w.error,null);
    assert.deepEqual(observed.reasonCodes,[expected.reason]);assert.deepEqual(observed.missingQuestionIds,[]);
    assert.equal(w.landedOnThisPathway,true);
  }
}
for(const [index,key]of txKeys.entries()){
  const w=packet.witnesses.find(w=>w.pathwayKey===key),prior=txHistorical.get(key),expected=txExpected[index];
  check(()=>assert.ok(w));check(()=>requireCurrentTx(w,prior,expected));
  const actual=replay(w,w.finalAnswers),run=converge('TX',getProfileByJurisdiction('TX'),questions(getProfileByJurisdiction('TX')),w.seedAnswers);
  check(()=>assert.equal(actual.resultCode,'needs_review'));check(()=>assert.equal(actual.paymentAllowed,false));
  check(()=>assert.equal(actual.selectedTrackId,undefined));check(()=>assert.equal(actual.pathwayId,w.pathwayId));
  check(()=>assert.deepEqual(actual.reasons.map(r=>r.code),[expected.reason]));
  check(()=>assert.deepEqual(run.transcript,w.rounds));check(()=>assert.deepEqual(run.answers,w.finalAnswers));
  check(()=>assert.equal(run.transcript.length,4,'TX no unchanged-answer churn'));
  if(expected.unresolved){
    check(()=>assert.deepEqual(actual,w.unresolvedEvaluation));check(()=>assert.equal(run.evaluation,null));
    check(()=>assert.deepEqual(run.unresolvedEvaluation,actual));check(()=>assert.equal(run.convergenceStatus,'unresolved_unchanged_answers'));
    check(()=>assert.throws(()=>requireUnresolved({...w,terminalEvaluation:prior.terminalEvaluation}),/must not claim a terminal/));
  }else{check(()=>assert.deepEqual(projection(actual),w.terminalEvaluation));check(()=>assert.deepEqual(run.evaluation,actual));}
  check(()=>assert.throws(()=>requireCurrentTx(prior,prior,expected),/TX current source subtype required/));
  const uplift=structuredClone(w);(uplift.terminalEvaluation??uplift.unresolvedEvaluation).paymentAllowed=true;
  check(()=>assert.throws(()=>requireCurrentTx(uplift,prior,expected),/TX current successor cannot allow payment/));
}
const unresolved = packet.witnesses.filter(w=>w.convergenceStatus);
check(()=>assert.equal(unresolved.length,8));
check(()=>assert.equal(packet.totals.unresolvedPathways,8));
check(()=>assert.equal(packet.totals.settledOnATerminalEvaluation,259));
check(()=>assert.equal(packet.totals.landedOnTheirOwnPathway,258));
check(()=>assert.equal(packet.totals.terminalResultCodes.guidance_only,89));
check(()=>assert.equal(packet.totals.paymentAllowedAtTheEvaluator,25));
for(const w of packet.witnesses.filter(w=>changed.has(w.pathwayKey))) {
  const actual=replay(w,w.finalAnswers);
  if(w.terminalEvaluation) check(()=>assert.deepEqual(projection(actual),w.terminalEvaluation));
  else {
    check(()=>requireUnresolved(w));
    check(()=>assert.deepEqual(actual,w.unresolvedEvaluation));
    const run=converge(w.jurisdiction,getProfileByJurisdiction(w.jurisdiction),questions(getProfileByJurisdiction(w.jurisdiction)),w.seedAnswers);
    check(()=>assert.ok(run.transcript.length<8,'no unchanged-answer churn'));
    check(()=>assert.deepEqual(run.unresolvedEvaluation,actual));
    check(()=>assert.deepEqual(run.answers,w.finalAnswers));
    check(()=>assert.throws(()=>requireUnresolved({...w,unresolvedEvaluation:null}),/actual unresolved evaluation required/));
    check(()=>assert.throws(()=>requireUnresolved({...w,terminalEvaluation:{resultCode:'packet_ready'}}),/must not claim a terminal/));
  }
  if(w.jurisdiction==='AR') {
    const legacy={...w.finalAnswers}; delete legacy.ar_record_origin;
    const old=replay(w,legacy);
    check(()=>assert.ok(old.missingQuestionIds.includes('ar_record_origin')));
    check(()=>assert.equal(old.paymentAllowed,false));
    check(()=>assert.equal(w.syntheticOriginPremise.value,'arkansas'));
    check(()=>assert.equal(w.seedAnswers.ar_record_origin,undefined));
  }
  const s=w.sourceBoundSyntheticWitness;
  if(!s)continue;
  check(()=>assert.equal(s.kind,'new_synthetic_factual_example_not_historical_or_participant_evidence'));
  for(const ref of s.references)check(()=>assert.equal(sha(fs.readFileSync(ref.file)),ref.sha256));
  const e=replay(w,s.finalAnswers);
  check(()=>assert.deepEqual(e,s.actualEvaluation));
  check(()=>assert.equal(e.pathwayId,s.expectedTreatment.pathwayId));
  check(()=>assert.deepEqual(s.expectedTreatment.resultCodes,expectedSupplemental[w.pathwayKey]));
  check(()=>assert.ok(expectedSupplemental[w.pathwayKey].includes(e.resultCode),'existing source-bound expected result'));
  check(()=>assert.equal(s.error,null));
  check(()=>assert.equal(s.convergenceStatus,'settled_observation'));
  const absent={...s.finalAnswers};
  const key=w.jurisdiction==='CA'?'ca_prop64_offense_date':w.jurisdiction==='GA'?'ga_board_pardon':'ms_program_record_status';
  absent[key]='unknown';
  const held=replay(w,absent);
  check(()=>assert.ok(held.missingQuestionIds.includes(key),`unknown ${key} stays unresolved`));
  check(()=>assert.equal(held.paymentAllowed,false));
}
// Real evaluator mutation control: former unchanged-answer loop must fail the
// no-churn regression for the expected reason, not because of a runtime crash.
const churnSource=declaration('converge').replace('if (seenAnswers.has(answerState))','if (false && seenAnswers.has(answerState))').replace('if (!changed) return','if (false && !changed) return');
assert.notEqual(churnSource,declaration('converge'));
const oldConverge=convergenceFactory(churnSource), example=unresolved[0], profile=getProfileByJurisdiction(example.jurisdiction);
const old=oldConverge(example.jurisdiction,profile,questions(profile),example.seedAnswers);
check(()=>assert.equal(old.transcript.length,24));
check(()=>assert.throws(()=>assert.ok(old.transcript.length<8,'no unchanged-answer churn'),/no unchanged-answer churn/));
check(()=>assert.equal(old.evaluation,null));
check(()=>assert.equal(packet.totals.additionalSourceBoundSyntheticWitnesses,6));
console.log(JSON.stringify({status:'PASS',checks,changedRoutes:20,originalChangedRouteCohort:14,currentOrSuccessors:1,currentCaTool1Successors:1,currentTxSuccessors:3,currentMsMipSuccessors:1,unchangedHistoricalRoutes:247,originalHistoricalDigestRows:253,unresolvedGenericWitnesses:8,sourceBoundSyntheticWitnesses:6,limits:'Local actual evaluator replay and mutation controls; not hosted, authenticated, document or offered-scope acceptance. Original253-row digest retains exact historical OR, Tool1, three TX and MS MIP rows; their current successors are separately checked without changing generic premises. Historical Tool1 positive is a preserved failure, not current authority.'},null,2));
