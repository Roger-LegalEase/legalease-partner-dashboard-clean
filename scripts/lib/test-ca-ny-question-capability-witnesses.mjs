import assert from 'node:assert/strict';
import { register, createRequire } from 'node:module';
register('./question-capability-loader.mjs', import.meta.url);
const { caNyQuestionCapabilityScenarios: scenarios, caNyQuestionCapabilityWitness: witness, caNyQuestionPrerequisiteWitness: dependency } = await import('./ca-ny-question-capability-witnesses.mjs');
const { questionAnswerState, normalizeQuestionChoices } = await import('../../src/lib/expungement-ai/question-answer-state.ts');
const { getProfileByJurisdiction } = await import('../../src/lib/rcap-engine/profile-registry.ts');
const { packetPlanForPathway } = await import('../../src/lib/rcap-engine/packet-planner.ts');
const { protectedPacketQuestionSurface, missingRequiredInputs } = await import('../../src/lib/expungement-ai/packet-information.ts');
const { blocksContinue } = await import('../../src/components/expungement-ai/screening/answers.ts');
const { QuestionField } = await import('../../src/components/expungement-ai/screening/QuestionField.tsx');
const require = createRequire(import.meta.url), { createElement } = require('react'), { renderToStaticMarkup } = require('react-dom/server');
let count=0; const rows=[], check=(name,run)=>{run();count++;};
const render=(state,question,value)=>renderToStaticMarkup(createElement(QuestionField,{stateCode:state,question,value,onChange(){},sensitiveInputAllowed:true}));
const surface=(state,route,facts)=>{const p=getProfileByJurisdiction(state), plan=packetPlanForPathway(p,route);assert.ok(plan);return protectedPacketQuestionSurface(p,route,{ownership_scope:'yes'},plan.requiredInputIds,{jurisdiction:state,pathway_id:route},{},facts);};
const cases=scenarios();assert.equal(cases.length,8);
for(const row of cases){
 const {state,routeId,id,valid,uncertain}=row, full=surface(state,routeId,row.facts), q=full.questions.find(q=>q.id===id);assert.ok(q,id+' actual protected question');
 check(id+' actual contract matches authored constructor',()=>{for(const key of ['type','answerContract','options','contactContext','prior16058ApplicationKnown','futureApplicationReferences'])assert.deepEqual(q[key],row.question[key]);});
 check(id+' valid strict encoded witness',()=>{assert.equal(questionAnswerState(q,valid,'2026-10-29'),'known_valid');assert.deepEqual(witness(state,q),valid);assert.equal(blocksContinue(q,valid),false);});
 const html=render(state,q,valid);check(id+' actual UI input control',()=>assert.match(html,/<(?:input|textarea|select)\b/));
 for(const value of [undefined,null,'',[]])check(id+' empty answer '+JSON.stringify(value),()=>{assert.notEqual(questionAnswerState(q,value,'2026-10-29'),'known_valid');assert.equal(blocksContinue(q,value),true);assert.ok(missingRequiredInputs([id],{}, {},new Map([[id,q]])).includes(id));});
 if(uncertain!==null)check(id+' unknown remains unresolved',()=>{assert.equal(questionAnswerState(q,uncertain,'2026-10-29'),'uncertain');assert.ok(missingRequiredInputs([id],{}, {[id]:uncertain},new Map([[id,q]])).includes(id));});
 for(const [index,value]of row.malformed.entries())check(id+' malformed/duplicate '+index,()=>{assert.equal(questionAnswerState(q,value,'2026-10-29'),'invalid');assert.equal(blocksContinue(q,value),true);assert.ok(missingRequiredInputs([id],{}, {[id]:value},new Map([[id,q]])).includes(id));});
 check(id+' retained unknown wrapper never qualifies',()=>assert.notEqual(questionAnswerState(q,{unknown:true,value:valid},'2026-10-29'),'known_valid'));
 check(id+' exact id and jurisdiction scope',()=>{assert.equal(witness(state,{...q,id:q.id+'-suffix'}),null);assert.equal(dependency(state,{...q,id:q.id+'-suffix'}),null);assert.equal(witness('ZZ',q),null);assert.equal(dependency('ZZ',q),null);});
 check(id+' unsupported type never given witness',()=>{const bad={...q,type:'unsupported'};assert.equal(witness(state,bad),null);assert.equal(questionAnswerState(bad,valid,'2026-10-29'),'invalid');});
 const blank=surface(state,routeId,{}), emptyQ=blank.questions.find(q=>q.id===id);assert.ok(emptyQ);
 const dep=dependency(state,emptyQ);
 const empty={state,id,dependencyWitness:Boolean(dep),prerequisites:row.prerequisiteIds,blankOptions:emptyQ.options,blankContext:emptyQ.contactContext,blankBuilderVisible:blank.builderQuestions.some(q=>q.id===id),blankWitnessState:questionAnswerState(emptyQ,valid,'2026-10-29'),missingPrerequisitesVisible:row.prerequisiteIds.filter(id=>blank.builderQuestions.some(q=>q.id===id)),activeBuilderVisible:full.builderQuestions.some(q=>q.id===id),renderedControlCount:(html.match(/<(?:input|textarea|select)\b/g)||[]).length};rows.push(empty);
 if(state==='CA'||['ny_16059_additional_case_reconciliation','ny_16059_court_direction_cases','ny_16059_court_direction_confirmation'].includes(id))check(id+' no synthetic replacement of empty descriptor',()=>{assert.equal(witness(state,emptyQ),null);assert.notEqual(questionAnswerState(emptyQ,valid,'2026-10-29'),'known_valid');assert.ok(dep);assert.deepEqual(dep.prerequisiteIds,row.prerequisiteIds);assert.ok(row.prerequisiteIds.every(id=>blank.builderQuestions.some(q=>q.id===id)));assert.equal(questionAnswerState(dep.activatedQuestion,dep.activatedValue,'2026-10-29'),'known_valid');});
 if(['single_choice','multi_select'].includes(q.type))for(const options of [[],null,[q.options[0],{}],[q.options[0],q.options[0]]])check(id+' invalid options remain unsupported '+JSON.stringify(options),()=>{const bad={...q,options};assert.equal(normalizeQuestionChoices(options).options,null);assert.equal(witness(state,bad),null);assert.equal(dependency(state,bad),null);});
}
for(const row of cases.filter(r=>r.state==='NY')){
 const disabled={...row.facts,ny_16059_additional_cases:'No',ny_16059_future_application:'No',ny_16059_filing_case_id:'case:first'}, s=surface('NY',row.routeId,disabled);
 if(['ny_16059_future_sealing_records','ny_16059_additional_case_reconciliation','ny_16059_court_direction_cases','ny_16059_court_direction_confirmation'].includes(row.id))check(row.id+' actual inactive condition removes builder obligation',()=>{assert.ok(!s.builderQuestions.some(q=>q.id===row.id));const f=s.collection.facts.find(f=>f.factId===row.id);assert.equal(f.active,false);});
}
console.log(JSON.stringify({status:'PASS',checks:count,rows,scope:'Synthetic definition/UI-control evidence only. Empty-context questions remain unresolved until their actual prerequisites; no eligible applicant, source approval, matter, payment or release is created.'},null,2));
