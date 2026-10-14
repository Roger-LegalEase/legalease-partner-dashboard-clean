import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const C=await import('../src/lib/expungement-ai/ga-pardon-caption.ts');
const R=await import('../src/lib/expungement-ai/record-fact-clarification.ts');
const {reviewedPacketQuestion}=await import('../src/lib/expungement-ai/reviewed-question-copy.ts');
// Expose the real pure question builder only in this process. No successful
// authorization response, verification tuple or database function is mocked.
const surfaceFile=path.resolve('src/lib/expungement-ai/packet-information.ts');
const surfaceSource=fs.readFileSync(surfaceFile,'utf8');assert.ok(surfaceSource.includes('function protectedPacketQuestionSurface('));
const surfaceModule=ts.transpileModule(surfaceSource+'\nexport { protectedPacketQuestionSurface as questionSurfaceForTest };',{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
register(`data:text/javascript,${encodeURIComponent('let d;export function initialize(data){d=data}export async function load(url,ctx,next){return url===d.url?{format:"module",source:d.source,shortCircuit:true}:next(url,ctx)}')}`,{data:{url:pathToFileURL(surfaceFile).href,source:surfaceModule}});
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
check('document facts do not expand court confirmation inputs',()=>assert.deepEqual(Object.keys(C.GA_PARDON_CAPTION_INPUTS),['court','county']));
for(const expected of C.GA_PARDON_DOCUMENT_QUESTIONS){
 const id=expected.id;
 const fallback={id,stage:'packet_information',type:'text_or_unknown',required:true,contextOnly:false,lifecyclePhase:'postpay_packet_field',options:null,prompt:P.answerLabel(id),helperText:'Enter the wording from your court or agency record when possible.'};
 const original=structuredClone(fallback);
 check(id+' actual fallback descriptor receives paired document wording',()=>assert.deepEqual(C.gaPardonCaptionQuestion(fallback,route),{...fallback,...expected}));
 check(id+' original fallback object preserved',()=>assert.deepEqual(fallback,original));
 check(id+' unrelated route retains original fallback object',()=>assert.equal(C.gaPardonCaptionQuestion(fallback,'GA:other'),fallback));
 for(const patch of [{type:'text'},{prompt:'Different future meaning'},{helperText:'Different source instruction'},{stage:'screening'},{required:false},{contextOnly:true},{options:['New choice']},{lifecyclePhase:'prepay_route_splitter'},{translations:{es:{prompt:'Existing independent source wording'}}}]){
  const changed={...fallback,...patch};
  check(id+' changed source descriptor is not overwritten '+JSON.stringify(patch),()=>assert.equal(C.gaPardonCaptionQuestion(changed,route),changed));
 }
 check(id+' replacement remains stable on repeated presentation',()=>assert.deepEqual(reviewedPacketQuestion(expected,{state:'GA',pathwayId:pathway,participantOwnsRecord:true}),expected));
 check(id+' creates no record confirmation marker',()=>assert.equal(R.recordFactConfirmationFor(route,id,{[id]:'Own factual response'},expected),null));
 for(const ownership of ['Yes','I am helping someone complete their own check','I am not sure']){
  const sourceAnswers={ownership_scope:ownership},copy=structuredClone(sourceAnswers);
  const surface=P.questionSurfaceForTest(getProfileByJurisdiction('GA'),pathway,sourceAnswers,['case_number','participant_narrative'],{jurisdiction:'GA',pathway_id:pathway});
  const q=surface.builderQuestions.find(q=>q.id===id);
  check(id+' actual protected builder includes question for '+ownership,()=>assert.ok(q));
  check(id+' actual protected builder EN+ES for '+ownership,()=>{assert.equal(q.prompt,expected.prompt);assert.deepEqual(q.translations,expected.translations);});
  check(id+' actual protected builder preserves own-account multiline for '+ownership,()=>assert.equal(q.multiline,expected.multiline));
  check(id+' ownership inputs never changed '+ownership,()=>assert.deepEqual(sourceAnswers,copy));
 }
}
const report={status:'PASS',checks:checks.length,details:checks,scope:'Source-defined caption meaning, exact confirmation invalidation, EN/ES packet controls and preserved actual historical held authority. No authenticated caption save or protected generation claimed.'};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,checks:report.checks}));
