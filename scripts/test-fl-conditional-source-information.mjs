// Original GA42 FL32/34/35/37: explicitly synthetic conditional-information
// contexts. None establishes qualifying disposition, diversion, certification,
// agency support, completed relief, an owner journey or application fulfillment.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
process.env.RCAP_EVALUATOR_TODAY='2026-10-11';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const localeFile=process.cwd()+'/src/components/expungement-ai/LocalizationProvider.tsx';
register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(data){d=data}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url:pathToFileURL(localeFile).href,source:ts.transpileModule(fs.readFileSync(localeFile,'utf8')+'\nexport {LocalizationContext};',{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}});
const beforeFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Network attempted by isolated FL conditional-information target')};
let checks=0,posts=0,ssr=0;
const check=(name,run)=>{run();checks++;};
try {
const {GET}=await import('../src/app/api/expungement-ai/profiles/[state]/route.ts');
const {POST}=await import('../src/app/api/expungement-ai/evaluate/route.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {FL_INFORMATION_ROUTES:routes,FL_INFORMATION_COPY:copy,FL_INFORMATION_LIMIT:limit,FL_INFORMATION_HELD_LABEL:heldLabel,flConditionalInformationSourceIsCurrent:current,flConditionalInformationContext:context,flConditionalInformationQuestionApplies:applies,withFlConditionalInformation:present}=await import('../src/lib/rcap-engine/florida-conditional-source-information.ts');
const {resolveRuntimeText,t}=await import('../src/lib/expungement-ai/localization.ts');
const {LocalizationContext}=await import('../src/components/expungement-ai/LocalizationProvider.tsx');
const {ScreeningResult}=await import('../src/components/expungement-ai/screening/ScreeningResult.tsx');
const profile=getProfileByJurisdiction('FL');
const response=await GET(new Request('http://isolated.invalid/api/expungement-ai/profiles/FL'),{params:Promise.resolve({state:'FL'})});
assert.equal(response.status,200);const publicProfile=await response.json();
const cases = [
  {
    "original196Index": 32,
    "originalQuestionId": "Q-02d5674f228e00fed329",
    "originalRoute": "FL:automatic-sealing-943-0595",
    "answers": {
      "ownership_scope": "Yes",
      "jurisdiction_scope": "State or local",
      "case_outcome": "Acquitted or found not guilty",
      "offense_level": "Misdemeanor",
      "age_at_offense": 30,
      "possible_pathway_context": "Automatic sealing - 943.0595"
    }
  },
  {
    "original196Index": 34,
    "originalQuestionId": "Q-f0a793669206806342a6",
    "originalRoute": "FL:lawful-self-defense-expunction-943-0578",
    "answers": {
      "ownership_scope": "Yes",
      "jurisdiction_scope": "State or local",
      "case_outcome": "Arrest or citation with no charge filed",
      "offense_level": "Misdemeanor",
      "age_at_offense": 30,
      "possible_pathway_context": "Lawful self-defense expunction - 943.0578"
    }
  },
  {
    "original196Index": 35,
    "originalQuestionId": "Q-a92329fa6d0a350c0792",
    "originalRoute": "FL:juvenile-diversion-expunction-943-0582",
    "answers": {
      "ownership_scope": "Yes",
      "jurisdiction_scope": "State or local",
      "case_outcome": "Juvenile adjudication or offense committed as a minor",
      "offense_level": "Misdemeanor",
      "age_at_offense": 17,
      "possible_pathway_context": "Juvenile diversion expunction - 943.0582"
    }
  },
  {
    "original196Index": 37,
    "originalQuestionId": "Q-e3f7a9ff0ce3af209a78",
    "originalRoute": "FL:administrative-expunction-mistaken-or-unlawful-arrest",
    "answers": {
      "ownership_scope": "Yes",
      "jurisdiction_scope": "State or local",
      "case_outcome": "Arrest or citation with no charge filed",
      "offense_level": "Misdemeanor",
      "age_at_offense": 30,
      "possible_pathway_context": "Administrative expunction - mistaken or unlawful arrest"
    }
  }
];
const remaining=['prior_relief','trafficking_status','identity_error','state_exclusion_categories'];
const oldMissing=['prior_relief','trafficking_status','identity_error','sentence_completion_date','resolved_timing_bucket','state_exclusion_categories'];
const genericIds=['sentence_completion_date','resolved_timing_bucket'];
const genericWait='We need the case date, dismissal date, disposition date, or completion date used to check the waiting period.';
const prompts=Object.fromEntries(publicProfile.questions.map(q=>[q.id,q.prompt]));
const post=async(answers,label)=>{const request={jurisdiction:'FL',profileVersion:profile.profileVersion,matterId:'synthetic-fl-information-'+label,answers:structuredClone(answers)},raw=structuredClone(request);posts++;const http=await POST(new Request('http://isolated.invalid/api/expungement-ai/evaluate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(request)}));const body=await http.json();assert.deepEqual(request,raw);return {status:http.status,body};};
const closed=body=>{assert.equal(body.paymentAllowed,false);assert.equal(body.consumerPacketAvailable,false);assert.equal(body.sponsoredPacketAvailable,false);};
for(const c of cases){
 const route=c.originalRoute.slice(3),kind=Object.keys(routes).find(key=>routes[key]===route),answers=structuredClone(c.answers);
 check('public basic schema '+kind,()=>{for(const[id,value]of Object.entries(answers)){const q=publicProfile.questions.find(q=>q.id===id);assert.ok(q);if(q.options)assert.ok(q.options.includes(value));}assert.equal(context(profile,route,answers),kind);assert.equal(current(profile,route),true);});
 const actual=await post(answers,kind);check('held original synthetic context '+kind,()=>{assert.equal(actual.status,200);assert.equal(actual.body.resultCode,'needs_more_info');assert.equal(actual.body.pathwayId,undefined);assert.equal(actual.body.packetPlan,undefined);assert.equal(actual.body.userLabel,heldLabel);assert.equal(actual.body.reasons[0].code,'fl.missing_required_facts');assert.deepEqual(actual.body.missingQuestionIds,remaining);assert.deepEqual(oldMissing.filter(id=>!genericIds.includes(id)),remaining);assert.ok(actual.body.reasons.some(r=>r.code===`fl.${kind}_conditional_information`&&r.text===copy[kind].general));assert.equal(actual.body.nextSteps.includes(genericWait),false);assert.ok(actual.body.nextSteps.includes(copy[kind].checks));assert.ok(actual.body.cautions.includes(limit));closed(actual.body);assert.deepEqual(answers,c.answers);});
 for(const id of genericIds)check('exact two informational-only IDs '+kind+id,()=>assert.equal(applies(profile,route,answers,id),false));
 for(const id of remaining)check('genuine missing fact retained '+kind+id,()=>assert.equal(applies(profile,route,answers,id),true));
 // Supplying an unknown generic timing answer does not mint a source fact.
 const uncertain=await post({...answers,sentence_completion_date:'I am not sure',resolved_timing_bucket:'not_sure'},kind+'-unknown-generic-time');
 check('raw generic uncertainty retained '+kind,()=>{assert.equal(uncertain.status,200);assert.equal(uncertain.body.resultCode,'needs_more_info');assert.deepEqual(uncertain.body.missingQuestionIds,remaining);closed(uncertain.body);});
 // Fully represented existing exclusion/ownership controls, distinct from the
 // foreign-ID schema refusal below. No source certification facts invented.
 const completed={...answers,prior_relief:'No',trafficking_status:'No',identity_error:'No',sentence_completion_date:'Yes',resolved_timing_bucket:'lt_1_year',state_exclusion_categories:['None of these']};
 for(const [label,delta,expected] of [['ownership',{ownership_scope:'No'},'hard_stop'],['federal',{jurisdiction_scope:'Federal'},'hard_stop'],['exclusion',{state_exclusion_categories:['Sex offense or registration']},'likely_not_eligible'],['uncertain-exclusion',{state_exclusion_categories:['I am not sure']},'needs_review']]){
  const stopped=await post({...completed,...delta},kind+'-'+label);check('existing genuine stop '+kind+label,()=>{assert.equal(stopped.status,200);assert.equal(stopped.body.resultCode,expected);closed(stopped.body);assert.equal(stopped.body.reasons.some(r=>r.code===`fl.${kind}_conditional_information`),false);});
 }
 for(const locale of ['en','es']){
  const value={locale,setLocale:()=>{},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,options)=>resolveRuntimeText(locale,text,options)};
  const html=renderToStaticMarkup(React.createElement(LocalizationContext.Provider,{value},React.createElement(ScreeningResult,{evaluation:actual.body,stateName:'Florida',questionPromptById:prompts,onEditAnswers:()=>{},onPacketAction:()=>{}})));ssr++;
  const plain=html.replace(/<[^>]*>/g,' ').replace(/&[^;]+;/g,' ');
  check('real held ENES source body '+kind+locale,()=>{assert.ok(plain.includes('FDLE'));assert.ok(html.includes(resolveRuntimeText(locale,copy[kind].general)));assert.ok(html.includes(resolveRuntimeText(locale,copy[kind].checks)));assert.ok(html.includes(resolveRuntimeText(locale,limit)));assert.equal(html.includes('$50'),false);assert.equal(html.includes(genericWait),false);assert.equal(html.includes('Do not pay for a filing packet for this route.'),false);for(const id of remaining){const q=publicProfile.questions.find(q=>q.id===id);if(locale==='es'){assert.equal(resolveRuntimeText('es',q.prompt),q.translations.es.prompt);assert.ok(html.includes(q.translations.es.prompt));assert.equal(html.includes(q.prompt),false);}else assert.ok(html.includes(q.prompt));}});
 }
 const ruleFor=p=>p.orderedDecisionRules.find(r=>r.when?.backendPathwayId===route);
 const mutations={state:p=>{p.jurisdiction.code='ZZ'},version:p=>{p.profileVersion+='-drift'},source:p=>{p.source.sourceCorpusSha256='0'.repeat(64)},path:p=>{p.pathways.find(r=>r.id===route).filingRequired=!p.pathways.find(r=>r.id===route).filingRequired},plan:p=>{p.packetGenerator.pathways.find(r=>r.pathwayId===route).mode='invented'},rule:p=>{ruleFor(p).when.sourceConditionText+=' drift'},ruleOrder:p=>{p.orderedDecisionRules.reverse()},question:p=>{p.questions.find(q=>q.id==='prior_relief').required=false},questionOptions:p=>{p.questions.find(q=>q.id==='case_outcome').options.push('invented')}};
 for(const[label,mutate]of Object.entries(mutations)){const changed=structuredClone(profile);mutate(changed);check('source drift refused '+kind+label,()=>{assert.equal(current(changed,route),false);assert.equal(context(changed,route,answers),null);assert.equal(applies(changed,route,answers,'sentence_completion_date'),true);});}
 for(const [name,override]of Object.entries({contract:{},memoTrack:{},crosswalk:{},specification:{id:'invented'}}))check('source dependency refused '+kind+name,()=>assert.equal(current(profile,route,{[name]:override}),false));
 const retained={...actual.body,cautions:['independent caution'],nextSteps:['independent next step',genericWait]};const decorated=present(retained,kind);check('unrelated cautions and consequences preserved '+kind,()=>{assert.equal(decorated.resultCode,retained.resultCode);assert.deepEqual(decorated.missingQuestionIds,retained.missingQuestionIds);assert.equal(decorated.cautions[0],'independent caution');assert.ok(decorated.nextSteps.includes('independent next step'));assert.equal(decorated.nextSteps.includes(genericWait),false);assert.equal(present(retained,null),retained);});
}
const juvenile=cases.find(c=>c.original196Index===35).answers;
for(const age of [undefined,null,'I am not sure',30,{value:17,unknown:true}])check('no age fallback/attestation',()=>assert.equal(context(profile,routes.juvenileDiversion,{...juvenile,age_at_offense:age}),null));
check('no age/outcome/hint qualification',()=>{assert.equal(context(profile,routes.juvenileDiversion,{...juvenile,case_outcome:'Other conviction or adjudication'}),null);assert.equal(context(profile,undefined,juvenile),null);assert.equal(context(profile,'court-ordered-expunction-943-0585',cases[0].answers),null);assert.equal(applies(profile,'court-ordered-expunction-943-0585',cases[0].answers,'sentence_completion_date'),true);});
const foreign=await post({...cases[0].answers,not_a_public_question:'Yes'},'foreign-schema');check('foreign ID is schema only',()=>{assert.equal(foreign.status,400);assert.ok(JSON.stringify(foreign.body).includes('not_a_public_question'));});
console.log(`PASS ${checks} focused FL source/held-information/raw/refusal controls; ${posts} actual POST and ${ssr} real ENES SSR. No personal qualification, owner, application/output or commercial acceptance.`);
}finally{globalThis.fetch=beforeFetch;}
