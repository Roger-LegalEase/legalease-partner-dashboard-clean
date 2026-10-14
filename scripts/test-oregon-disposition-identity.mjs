import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {register} from 'node:module';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs',import.meta.url);
register('data:text/javascript,' + encodeURIComponent(`export async function load(url,context,next){const r=await next(url,context);return url.endsWith('/src/components/expungement-ai/LocalizationProvider.tsx')?{...r,source:r.source+'\\nexport { LocalizationContext };'}:r;}`), import.meta.url);
const H=await import('../src/lib/rcap-engine/oregon-disposition-identity.ts');
const S=await import('../src/lib/rcap-engine/composed-route-selector.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const {selectScreeningQuestionIds}=await import('../src/lib/rcap-engine/screening-question-selection.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {resolveRuntimeText}=await import('../src/lib/expungement-ai/localization.ts');
const {POST}=await import('../src/app/api/expungement-ai/evaluate/route.ts');
const config=JSON.parse(fs.readFileSync('data/record-clearing/packet-specifications/OR-disposition-configurations.v1.json','utf8'));
const profile=getProfileByJurisdiction('OR'),pub=projectPublicProfile(profile),id=H.OR_DISPOSITION_ID;
const noCharge='Arrest or citation with no charge filed',acq='Acquitted or found not guilty',group='Dismissed, no-billed, nolle prosequi, or not prosecuted';
const base={ownership_scope:'Yes',jurisdiction_scope:'State or local',case_outcome:acq,offense_level:'Misdemeanor',pending_cases:'No',court_requirements_completed:'Yes',financial_obligations:'Yes',resolved_timing_bucket:'At least 5 years ago',disposition_date:'2018-01-01',sentence_completion_date:'2018-01-01',state_exclusion_categories:['None of these']};
const input=answers=>({jurisdiction:'OR',profileVersion:profile.profileVersion,matterId:'synthetic-or-disposition-identity',answers});
const selected=answers=>S.selectComposedRoute({jurisdiction:'OR',pathwayId:H.OR_RETIRED_NONCONVICTION_PATH,oregonDispositionSource:{profileVersion:profile.profileVersion,sourceFingerprint:profile.source.sourceCorpusSha256,answers}});
const checkNames=[];function check(name,fn){fn();checkNames.push(name);}
async function checkAsync(name,fn){await fn();checkNames.push(name);}
function held(r){assert.equal(r.paymentAllowed,false);assert.equal(r.packetPlan,undefined);assert(!['packet_ready','packet_ready_with_caution'].includes(r.resultCode));}
async function post(answers,patch={}){const response=await POST(new Request('http://localhost/api/expungement-ai/evaluate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...input(answers),...patch})}));return{status:response.status,body:await response.json()};}
check('exact adopted configuration source and distinct identities',()=>{
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex'),H.OR_DISPOSITION_SOURCE.configurationSha256);
 assert.equal(config.configurations.length,3);
 for(const c of Object.values(H.OR_DISPOSITION_CONFIGURATIONS)){
  const row=config.configurations.find(r=>r.packetConfigurationId===c.configurationId);
  assert(row);assert.equal(row.routeKey,`OR:${c.pathwayId}`);assert.equal(row.trackId,c.trackId);assert.equal(row.specificationSha256,c.specificationSha256);assert.equal(row.formOption,c.formOption);assert.equal(row.packetFamily,c.packetFamily);assert.equal(row.packetSetId,c.packetSetId);assert.equal(row.commercialStatus,'closed');
 }
 assert.equal(new Set(Object.values(H.OR_DISPOSITION_CONFIGURATIONS).map(c=>c.configurationId)).size,3);
});
for(const [outcome,explicit,key]of[[noCharge,undefined,'never_charged'],[acq,undefined,'acquittal'],[group,'never_charged','never_charged'],[group,'ordinary_dismissal','ordinary_dismissal']]){
 const answers={...base,case_outcome:outcome,...(explicit?{[id]:explicit}:{})};
 check('actual selector/caller exact '+key+'/'+outcome,()=>{const before=JSON.stringify(answers),s=selected(answers),r=evaluate(input(answers));assert.equal(s.status,'held_configuration');assert.deepEqual(s.configuration,H.OR_DISPOSITION_CONFIGURATIONS[key]);assert.equal(r.selectedTrackId,s.trackId);assert.equal(r.evaluation.pathwayId,s.configuration.pathwayId);assert.notEqual(r.evaluation.pathwayId,H.OR_RETIRED_NONCONVICTION_PATH);held(r.evaluation);assert.equal(JSON.stringify(answers),before);});
 await checkAsync('actual HTTP retains all authority holds '+key+'/'+outcome,async()=>{const r=await post(answers);assert.equal(r.status,200);held(r.body);assert.equal(r.body.consumerPacketAvailable,false);assert.equal(r.body.sponsoredPacketAvailable,false);});
}
for(const value of [undefined,'unknown','other','acquittal','garbage',[],['ordinary_dismissal'],true,{}, {value:'ordinary_dismissal',unknown:true},{value:'ordinary_dismissal',unknown:false,extra:true},{value:'ordinary_dismissal',unknown:false}])check('grouped uncertain/conflicting shape '+JSON.stringify(value),()=>{
 const answers={...base,case_outcome:group,...(value!==undefined?{[id]:value}:{})};const before=JSON.stringify(answers),s=selected(answers);assert.equal(s.status,'configuration_clarification');const r=evaluate(input(answers));assert.equal(r.selectedTrackId,null);assert.equal(r.evaluation.pathwayId,undefined);assert(r.evaluation.missingQuestionIds.includes(id));held(r.evaluation);assert.equal(JSON.stringify(answers),before);
});
for(const outcome of [noCharge,acq])for(const explicit of ['ordinary_dismissal','unknown',null,{unknown:true,value:'acquittal'}])check('existing explicit clarification never silently discarded '+outcome+JSON.stringify(explicit),()=>assert.equal(selected({...base,case_outcome:outcome,[id]:explicit}).status,'configuration_clarification'));
for(const outcome of ['Felony conviction','Misdemeanor conviction','I am not sure','Diversion, deferred disposition, supervision, or similar program',[],{unknown:true,value:acq}])check('no current identity from incompatible outcome '+JSON.stringify(outcome),()=>assert.notEqual(selected({...base,case_outcome:outcome}).status,'held_configuration'));
for(const patch of [{profileVersion:'changed'},{sourceFingerprint:'0'.repeat(64)}])check('source identity refusal '+JSON.stringify(patch),()=>assert.equal(S.selectComposedRoute({jurisdiction:'OR',pathwayId:H.OR_RETIRED_NONCONVICTION_PATH,oregonDispositionSource:{profileVersion:profile.profileVersion,sourceFingerprint:profile.source.sourceCorpusSha256,answers:base,...patch}}).status,'no_composed_route'));
for(const patch of [{ownership_scope:'No'},{ownership_scope:['Yes']},{jurisdiction_scope:'Federal'},{jurisdiction_scope:'I am not sure'}])check('scope not inferred '+JSON.stringify(patch),()=>assert.notEqual(selected({...base,...patch}).status,'held_configuration'));
check('assisted participant scope remains available',()=>assert.equal(selected({...base,ownership_scope:'I am helping someone complete their own check'}).status,'held_configuration'));
check('ordinary collection is conditional, one clarification rather than repeated known facts',()=>{
 assert(selectScreeningQuestionIds(profile,pub,{...base,case_outcome:group}).includes(id));
 for(const case_outcome of [noCharge,acq])assert(!selectScreeningQuestionIds(profile,pub,{...base,case_outcome}).includes(id));
 assert(selectScreeningQuestionIds(profile,pub,{...base,[id]:'ordinary_dismissal'}).includes(id));
 assert.equal(pub.questions.filter(q=>q.id===id).length,1);
 const q=pub.questions.find(q=>q.id===id);assert.equal(q.lifecyclePhase,'prepay_route_splitter');assert(q.translations.es.prompt);for(const option of q.options)assert(q.optionDisplay[option].translations.es.label);
});
check('exact original seven exclusion choices restored to ordinary collector',()=>{const q=pub.questions.find(q=>q.id==='state_exclusion_categories'),original=profile.questions.find(q=>q.id==='state_exclusion_categories');assert.deepEqual(q.options,original.options);assert.equal(q.required,true);assert(selectScreeningQuestionIds(profile,pub,base).includes(q.id));assert(q.translations.es.prompt);for(const value of q.options)assert(q.optionDisplay[value].translations.es.label);});
for(const values of [undefined,[],['None of these'],['Violent offense'],['I am not sure']])await checkAsync('actual exclusion shape and held result '+JSON.stringify(values),async()=>{
 const answers={...base};if(values===undefined)delete answers.state_exclusion_categories;else answers.state_exclusion_categories=values;
 const r=await post(answers);assert.equal(r.status,200);held(r.body);
 if(!values?.length)assert(r.body.missingQuestionIds.includes('state_exclusion_categories'));
 if(values?.[0]==='Violent offense')assert(r.body.reasons.some(r=>r.code==='or.state_exclusion_selected'));
 if(values?.[0]==='I am not sure')assert(r.body.reasons.some(r=>r.code==='or.state_exclusion_unknown'));
});
for(const values of [['None of these','Violent offense'],['None of these','I am not sure'],['unrecognized'],{unknown:true},'None of these'])await checkAsync('contradictory/malformed exclusions refused '+JSON.stringify(values),async()=>{assert.equal((await post({...base,state_exclusion_categories:values})).status,400);});
check('source raw history retained across conditional return',()=>{const answers={...base,case_outcome:group,[id]:'ordinary_dismissal',state_exclusion_categories:['I am not sure']};const saved=structuredClone(answers);evaluate(input(answers));answers.case_outcome=acq;assert.equal(evaluate(input(answers)).selectedTrackId,null);answers.case_outcome=group;assert.equal(evaluate(input(answers)).selectedTrackId,'or_dismissed_charge');assert.deepEqual(answers,saved);});
for(const [en,es]of Object.values(H.OR_DISPOSITION_COPY))check('paired runtime copy '+en,()=>{assert.equal(resolveRuntimeText('en',en),en);assert.equal(resolveRuntimeText('es',en),es);});
await checkAsync('arbitrary IDs and requested identities still rejected',async()=>{assert.equal((await post({...base,invented_fact:'yes'})).status,400);assert.equal((await post(base,{selectedTrackId:'or_acquittal'})).status,400);assert.equal((await post({...base,[id]:'ordinary_dismissal'},{jurisdiction:'GA'})).status,400);});
const {createElement}=await import('react');
const {renderToStaticMarkup}=await import('react-dom/server');
const {QuestionField}=await import('../src/components/expungement-ai/screening/QuestionField.tsx');
const {LocalizationContext}=await import('../src/components/expungement-ai/LocalizationProvider.tsx');
const {t}=await import('../src/lib/expungement-ai/localization.ts');
for(const locale of ['en','es'])for(const questionId of [id,'state_exclusion_categories'])check('actual ordinary question SSR '+locale+'/'+questionId,()=>{
 const question=pub.questions.find(q=>q.id===questionId),value={locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,options)=>resolveRuntimeText(locale,text,options)};
 const html=renderToStaticMarkup(createElement(LocalizationContext.Provider,{value},createElement(QuestionField,{question,stateCode:'OR',value:questionId===id?'ordinary_dismissal':['I am not sure'],onChange(){assert.fail('SSR must not edit');}})));
 const prompt=locale==='es'?question.translations.es.prompt:question.prompt;assert(html.includes(prompt));assert(html.includes('aria-labelledby='));assert(html.includes('checked=""'));for(const option of question.options){const label=locale==='es'?question.optionDisplay[option].translations.es.label:question.optionDisplay[option].label;assert(html.includes(label));}
});
check('different current pathway cannot select another configuration',()=>{const s=S.selectComposedRoute({jurisdiction:'OR',pathwayId:H.OR_DISPOSITION_CONFIGURATIONS.never_charged.pathwayId,oregonDispositionSource:{profileVersion:profile.profileVersion,sourceFingerprint:profile.source.sourceCorpusSha256,answers:base}});assert.equal(s.status,'configuration_clarification');});
const loadedConfig=(await import('../data/record-clearing/packet-specifications/OR-disposition-configurations.v1.json')).default;
for(const mutate of [c=>{c.configurations.push(structuredClone(c.configurations[0]));},c=>{c.configurations[0].sourceIdentities[0].sha256='0'.repeat(64);},c=>{c.configurations[1].dispositionPredicate.requires=[];},c=>{c.configurations[2].trackId='or_acquittal';}])check('source/configuration drift refuses current join',()=>{const backup=structuredClone(loadedConfig);try{mutate(loadedConfig);assert.equal(selected(base).status,'no_composed_route');}finally{for(const key of Object.keys(loadedConfig))delete loadedConfig[key];Object.assign(loadedConfig,backup);}});
// Execute the previously published caller itself, with unchanged non-OR
// dependencies. This is a bounded caller regression, not a nationwide audit.
const oldSource=execFileSync('git',['show','0983b7fc34d8fa9299b71d4d8775634d0e4007c2:src/lib/expungement-ai/authoritative-screening-result.ts'],{encoding:'utf8'});
const oldCompiled=ts.transpileModule(oldSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const old=(await import('data:text/javascript;base64,'+Buffer.from(oldCompiled).toString('base64'))).evaluateAuthoritativeScreeningResult;
for(const jurisdiction of ['GA','MS','IL','KS','NY','DC','MT'])check('non-OR actual caller unchanged '+jurisdiction,()=>{const p=getProfileByJurisdiction(jurisdiction);const i={jurisdiction,profileVersion:p.profileVersion,matterId:'synthetic-non-or-default',answers:{ownership_scope:'Yes',jurisdiction_scope:'State or local',case_outcome:acq}};assert.deepEqual(evaluate(i),old(i));});
const existingRows=JSON.parse(fs.readFileSync('scripts/fixtures/conviction-fallback-predecessors.json','utf8')).rows;
function capture(fn){try{return {result:fn()};}catch(error){return {error:error.name,invalidQuestionIds:error.invalidQuestionIds,message:error.message};}}
for(const row of existingRows)check('existing accepted caller fixture unchanged '+row.id,()=>{const jurisdiction=row.id.slice(0,2),p=getProfileByJurisdiction(jurisdiction);const i={jurisdiction,profileVersion:p.profileVersion,matterId:'existing-fixture-regression',answers:row.answers};assert.deepEqual(capture(()=>evaluate(i)),capture(()=>old(i)));});
console.log(JSON.stringify({status:'PASS',checks:checkNames.length,scope:'OR source-selected configuration, actual public evaluator and conditional collection only; no protected owner, filing eligibility, packet generation or delivery',checksPassed:checkNames},null,2));
