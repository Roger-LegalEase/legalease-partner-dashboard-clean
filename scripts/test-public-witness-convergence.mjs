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
// in any of the other 251 rows.
const orKey = 'OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c';
const caTool1Key = 'CA:tool-1-dismissal-set-aside';
check(()=>assert.equal(orPredecessor.witness.pathwayKey,orKey));
check(()=>assert.equal(caTool1Predecessor.witness.pathwayKey,caTool1Key));
check(()=>assert.equal(caTool1Predecessor.sourceSha,'67556b6acf3cc6652f5f6ae10bfb0d0366cca63a'));
check(()=>assert.equal(caTool1Predecessor.sourceSha256,'3d90a8ffeb6c4c45da3f24a19cbffeceaf637647832f340aef1423a68c36e73b'));
check(()=>assert.equal(sha(JSON.stringify(packet.witnesses.filter(w=>!changed.has(w.pathwayKey)).map(w=>w.pathwayKey===orKey?orPredecessor.witness:w.pathwayKey===caTool1Key?caTool1Predecessor.witness:w))),'dd48f2daa2b68b38926d3d619c91b92833db494fe5d63ae4f31218c1c5c2dba2'));
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
const unresolved = packet.witnesses.filter(w=>w.convergenceStatus);
check(()=>assert.equal(unresolved.length,7));
check(()=>assert.equal(packet.totals.unresolvedPathways,7));
check(()=>assert.equal(packet.totals.settledOnATerminalEvaluation,260));
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
console.log(JSON.stringify({status:'PASS',checks,changedRoutes:16,originalChangedRouteCohort:14,currentOrSuccessors:1,currentCaTool1Successors:1,unchangedHistoricalRoutes:251,originalHistoricalDigestRows:253,unresolvedGenericWitnesses:7,sourceBoundSyntheticWitnesses:6,limits:'Local actual evaluator replay and mutation controls; not hosted, authenticated, document or offered-scope acceptance. Original253-row digest retains exact historical OR and Tool1 rows; their current successors are separately checked. Historical Tool1 positive is a preserved failure, not current authority.'},null,2));
