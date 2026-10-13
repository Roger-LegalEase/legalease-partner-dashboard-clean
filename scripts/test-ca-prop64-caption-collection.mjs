import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
process.env.RCAP_EVALUATOR_TODAY = '2026-10-12';
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const C = await import('../src/lib/expungement-ai/ca-prop64-caption-facts.ts');
const { caProp64ProtectedDocumentPreparation: prepare } = await import('../src/lib/expungement-ai/ca-prop64-document-preparation.ts');
const { questionAnswerState } = await import('../src/lib/expungement-ai/question-answer-state.ts');
const { profileQuestionSchema } = await import('../src/lib/expungement-ai/frontend/schemas.ts');
const { caProp64CaptionBindings: bind } = await import('./lib/ca-prop64-caption-bindings.mjs');
const fixtures = JSON.parse(fs.readFileSync('scripts/fixtures/ca-prop64-caption-predecessors.json'));
const checks=[];const check=(name, actual, expected)=>{ checks.push({name,pass:JSON.stringify(actual)===JSON.stringify(expected),actual,expected}); };
const answers={participant_full_legal_name:'Jordan Avery Reyes',ca_prop64_court_case_number:'0012-CR-0099',ca_prop64_filing_court_county:'Yolo',ca_prop64_filer_representation:'self_represented'};
const current=[];
for(const {variant,verification:original} of fixtures.rows){
 const before=JSON.stringify(original),model=P.protectedPacketInformationModelFor(original);
 check(variant+' old verified retained',original.status,'verified');check(variant+' current model available',Boolean(model),true);
 if(!model) continue;
 check(variant+' old readiness not inherited',model.stage==='ready_to_generate',false);
 for(const id of C.CA_PROP64_CAPTION_FACT_IDS){check(variant+' missing '+id,model.missingInputIds.includes(id),true);check(variant+' actual builder '+id,model.builderQuestions.some(q=>q.id===id),true);check(variant+' editable '+id,P.editablePacketInputIds(model).has(id),true);}
 check(variant+' old ambiguous values retained',model.initialAnswers.case_identifier,original.snapshot.packetAnswers.case_identifier??original.snapshot.prefilledAnswers.case_identifier??original.snapshot.screeningAnswers.case_identifier);
 check(variant+' no broad alias',prepare(original).facts,{});
 const attempt=P.packetInformationPatch({protectedVerification:original,answers:{},verify:true});
 check(variant+' missing facts cannot verify',attempt?.protectedTransition.nextVerification.status==='verified',false);
 const patch=P.packetInformationPatch({protectedVerification:original,answers});
 check(variant+' explicit protected save',Boolean(patch),true);if(!patch)continue;
 const saved=patch.protectedTransition.nextVerification,m=P.protectedPacketInformationModelFor(saved),input=prepare(saved);
 check(variant+' explicit save invalidates prior verification',saved.status,'invalidated');
 check(variant+' save alone not ready',m.stage==='ready_to_generate',false);
 check(variant+' exact projection',input.facts,{'participant.full_legal_name':'Jordan Avery Reyes','matter.case_number':'0012-CR-0099','matter.county':'Yolo','filer.representation':'self_represented'});
 check(variant+' actual section resolver',input.recordSection,'11357');check(variant+' no commercial authority',input.generationAllowed,false);
 check(variant+' raw original unchanged',JSON.stringify(original),before);
 for(const source of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const [id,value]of Object.entries(original.draftSnapshot[source]))if(!C.CA_PROP64_CAPTION_FACT_IDS.includes(id))check(variant+' raw retained '+source+'/'+id,saved.draftSnapshot[source][id],value);
 const unknown={...answers,ca_prop64_filer_representation:'unknown'};const unknownSave=P.packetInformationPatch({protectedVerification:saved,answers:unknown});const neutral=prepare(unknownSave.protectedTransition.nextVerification);
 check(variant+' unknown actor preserves neutral',Object.keys(neutral.facts).length,3);
 const bindings=bind({familyId:'ca-prop64-set',facts:neutral.facts});
 check(variant+' eleven real neutral destinations',Object.values(bindings.mappings).flatMap(Object.keys).length,11);
 check(variant+' no attorney guess',Object.values(bindings.mappings).flatMap(Object.keys).some(n=>n.includes('AttyPartyInfo')),false);
 for(const id of C.CA_PROP64_CAPTION_FACT_IDS){const question=m.questions.find(q=>q.id===id);check(variant+' strict schema '+id,profileQuestionSchema.safeParse(question).success,true);check(variant+' Spanish '+id,Boolean(question.translations?.es?.prompt),true);}
 current.push({variant,record:saved,preparation:input});
 for(const base of [original,saved])for(const [label,change]of [
  ['extra server fact',draft=>{draft.serverFacts.invented='Yes';}],
  ['server-owned name',draft=>{draft.serverFacts.participant_full_legal_name='Forged Server Name';}],
  ['wrong family',draft=>{draft.packetFamilyIdentifiers.mode='wrong';}],
  ['missing plan requirement',draft=>{draft.requiredInputIds.pop();}],
 ]){const bad=structuredClone(base);bad.status='unverified';bad.snapshot=null;bad.hash=null;change(bad.draftSnapshot);bad.draftHash=P.protectedPacketDraftHash(bad.draftSnapshot);
  check(variant+' valid-hash refusal '+(base===original?'prior':'current')+'/'+label,P.protectedPacketInformationModelFor(bad),null);
  check(variant+' preparation refusal '+(base===original?'prior':'current')+'/'+label,prepare(bad),null);
 }
 for(const [name,mutate] of [['draft hash',r=>r.draftHash='0'.repeat(64)],['final hash',r=>r.hash='0'.repeat(64)],['snapshot owner context',r=>r.snapshot.jurisdiction='NY']]){const bad=structuredClone(original);mutate(bad);check(variant+' refused '+name,prepare(bad),null);}
}
for(const question of C.CA_PROP64_CAPTION_QUESTIONS.filter(q=>q.type==='text_or_unknown')){
 for(const value of [42,true,[],{},['value'],{value:'Known',extra:true},'A\nB',{value:42,unknown:false}])check(question.id+' invalid '+JSON.stringify(value),questionAnswerState(question,value),'invalid');
 for(const value of ['unknown','I am not sure','no sé',{value:'Old text',unknown:true}])check(question.id+' uncertain '+JSON.stringify(value),questionAnswerState(question,value),'uncertain');
 for(const value of ['0012-CR-0099','María O’Neil',{value:'Yolo',unknown:false}])check(question.id+' valid '+JSON.stringify(value),questionAnswerState(question,value),'known_valid');
 check(question.id+' wrong scope schema',profileQuestionSchema.safeParse({...question,id:'foreign_fact'}).success,false);
}
check('unrelated numeric text behavior retained',questionAnswerState({id:'unrelated',type:'text'},123),'known_valid');
check('other route untouched',C.caProp64CaptionFacts('NY','cpl16059',answers),null);
const failed=checks.filter(x=>!x.pass);const report={status:failed.length?'FAIL':'PASS',checks:checks.length,failed,details:checks,current,limits:['Pure protected transitions and actual model/adapter; owner browser/database and source PDF rendering separately required.','No source/contact/legal/language or commercial acceptance.']};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,checks:checks.length,failed:failed.map(row=>row.name)}));assert.equal(failed.length,0);
