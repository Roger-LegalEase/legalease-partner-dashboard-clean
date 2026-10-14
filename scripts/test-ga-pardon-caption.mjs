import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const C=await import('../src/lib/expungement-ai/ga-pardon-caption.ts');
const R=await import('../src/lib/expungement-ai/record-fact-clarification.ts');
const {reviewedPacketQuestion}=await import('../src/lib/expungement-ai/reviewed-question-copy.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const route=C.GA_PARDON_CAPTION_ROUTE,pathway=route.slice(3),pub=projectPublicProfile(getProfileByJurisdiction('GA'));
const checks=[];function check(name,fn){fn();checks.push({name,pass:true});}
const questions=new Map(C.GA_PARDON_CAPTION_QUESTIONS.map(q=>[q.id,q]));
const answers={court:'Municipal Court of Athens-Clarke County',county:'Clarke'};
const before=structuredClone(answers);
check('legacy court-or-agency is not an established convicting-court caption',()=>assert.deepEqual([...R.recordFactOwnQuestionIds(route,answers)],['court','county']));
check('known legacy answers still require explicit meaning confirmation',()=>assert.deepEqual(R.unresolvedRecordFactConfirmations(route,answers,questions),['court','county']));
const confirmations=Object.fromEntries([...questions].map(([id,q])=>[id,R.recordFactConfirmationFor(route,id,answers,q)]));
for(const id of questions.keys())for(const patch of [{id:'participant_full_legal_name'},{type:'text'},{prompt:'Which court or agency handled the case?'},{helperText:'Other meaning'},{stage:'case_details'},{lifecyclePhase:'prepay_route_splitter'},{translations:{es:{prompt:'¿En qué condado vive actualmente?',helperText:'Ingrese su residencia actual.'}}},{required:false},{contextOnly:true},{options:['Different meaning']}]) {
 check(id+' unrelated question cannot attest caption meaning '+JSON.stringify(patch),()=>assert.equal(R.recordFactConfirmationFor(route,id,answers,{...questions.get(id),...patch}),null));
}
check('exact explicit caption confirmations resolve',()=>assert.deepEqual(R.unresolvedRecordFactConfirmations(route,answers,questions,confirmations),[]));
for(const patch of [{court:'Superior Court of Athens-Clarke County'},{county:'Fulton'}])check('changing associated caption invalidates both confirmations '+JSON.stringify(patch),()=>assert.deepEqual(R.unresolvedRecordFactConfirmations(route,{...answers,...patch},questions,confirmations),['court','county']));
for(const field of ['routeKey','contractSha256','inputSha256','valueSha256','version','status']){
 const bad=structuredClone(confirmations);bad.court[field]='wrong';
 check('stale or foreign confirmation '+field,()=>assert.ok(R.unresolvedRecordFactConfirmations(route,answers,questions,bad).includes('court')));
}
for(const id of questions.keys())for(const value of [undefined,null,'','   ',{value:answers[id],unknown:true},7,{},[]]){
 check(id+' cannot confirm an unknown/malformed answer '+JSON.stringify(value),()=>assert.equal(R.recordFactConfirmationFor(route,id,{...answers,[id]:value},questions.get(id)),null));
}
for(const id of questions.keys()){
 const original=pub.questions.find(q=>q.id===id);
 for(const participantOwnsRecord of [true,false]){
  const q=reviewedPacketQuestion(original,{state:'GA',pathwayId:pathway,participantOwnsRecord,participantHelpingRecord:!participantOwnsRecord});
  check(id+' actual packet copy names convicting court '+participantOwnsRecord,()=>assert.equal(q.prompt,questions.get(id).prompt));
  check(id+' actual Spanish packet copy '+participantOwnsRecord,()=>assert.equal(q.translations.es.prompt,questions.get(id).translations.es.prompt));
 }
 check(id+' public screening source remains intact',()=>assert.equal(pub.questions.find(q=>q.id===id),original));
 check(id+' different route untouched',()=>assert.equal(C.gaPardonCaptionQuestion(original,'GA:other'),original));
 check(id+' unknown future meaning not overwritten',()=>{const changed={...original,prompt:'Different future question'};assert.equal(C.gaPardonCaptionQuestion(changed,route),changed);});
}
check('ordinary known caption values preserved byte-for-byte',()=>assert.deepEqual(answers,before));
const collection=P.packetCollectionFor({jurisdiction:'GA',pathwayId:pathway,requiredInputIds:['court','county'],screeningAnswers:answers,prefilledAnswers:{},savedAnswers:{},serverFacts:{jurisdiction:'GA',pathway_id:pathway}});
for(const id of questions.keys())check(id+' collection asks existing fact explicitly instead of aliasing',()=>assert.equal(collection.facts.find(f=>f.factId===id).source,'distinct_record_question_contract'));
// Real historical protected authority fixture: no fabricated packet-ready tuple.
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/conviction-fallback-predecessors.json',import.meta.url)));
const historical=fixtures.rows.find(row=>row.id==='GA/Pardoned conviction/generic/omitted').verification;
const historicalBefore=structuredClone(historical),model=P.protectedPacketInformationModelFor(historical);
check('existing historical held matter remains readable',()=>assert.ok(model));
check('held matter has no document collection burden',()=>assert.ok(!model.recordClarificationIds.length&&!model.builderQuestions.some(q=>questions.has(q.id))));
check('held matter retains generation refusal',()=>assert.ok(!model.packetPlan&&!model.reviewSafety.safe));
check('protected historical maps unchanged',()=>assert.deepEqual(historical,historicalBefore));
const report={status:'PASS',checks:checks.length,details:checks,scope:'Source-defined caption meaning, exact confirmation invalidation, EN/ES packet controls and preserved actual historical held authority. No authenticated caption save or protected generation claimed.'};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,checks:report.checks}));
