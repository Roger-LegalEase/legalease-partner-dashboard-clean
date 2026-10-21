process.env.RCAP_EVALUATOR_TODAY='2026-10-16';
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import fs from 'node:fs';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const root=process.cwd();
register('./lib/ts-esm-loader.mjs',import.meta.url);
const loc=root+'/src/components/expungement-ai/LocalizationProvider.tsx';
const source=ts.transpileModule(fs.readFileSync(loc,'utf8')+'\nexport {LocalizationContext};',{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url:pathToFileURL(loc).href,source}});
const load=p=>import(pathToFileURL(root+'/'+p));const P=await load('src/lib/expungement-ai/packet-information.ts');const {getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts');const{packetSpecificationFor}=await load('src/lib/rcap/grade-a/packet-specification.ts');const{resolvePacketCollection}=await load('src/lib/expungement-ai/packet-collection.ts');const{QuestionField}=await load('src/components/expungement-ai/screening/QuestionField.tsx');const{LocalizationContext}=await import(pathToFileURL(loc));const{t,resolveRuntimeText}=await load('src/lib/expungement-ai/localization.ts');
// GA-16-M01643 / Q-aae46f53eb742ee526b6: separate literal history, case jurisdiction and convicting-court captions.
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const profile=getProfileByJurisdiction('VA'),key='VA:regime-1-expungement-available-now';
const witness=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.find(f=>f.pathwayKey===key);assert(witness);
const answers={...witness.finalAnswers,case_outcome:'Pardoned conviction',pardon_status:'Yes'};delete answers.residency_or_location;
const authoritative=evaluate({jurisdiction:'VA',profileVersion:profile.profileVersion,matterId:'synthetic-ga16-va-location',answers});
assert.equal(authoritative.evaluation.pathwayId,'regime-1-expungement-available-now');
assert.equal(authoritative.evaluation.resultCode,'packet_ready_with_caution');
assert.equal(authoritative.evaluation.paymentAllowed,true);
const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,packetAnswers:{},dependencies:{},capturedAt:'2026-10-20T19:20:00Z'});assert(seed);
const base={seed:{status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot},question:{id:'residency_or_location',stage:'packet_information',prompt:'What city or location belongs with this matter?',type:'text_or_unknown',required:true,contextOnly:false,lifecyclePhase:'postpay_packet_field',options:null,translations:{es:{prompt:'¿Qué ciudad o lugar corresponde a este asunto?',helperText:''}}}};
let checks=0;const renders=[],check=(name,fn)=>{try{fn();checks++;}catch(e){console.error(name);throw e;}};
const original=base.seed,fact='residency_or_location',maps=['screeningAnswers','prefilledAnswers','packetAnswers'];
check('absent unsupported location no longer blocks or asks',()=>{const m=P.protectedPacketInformationModelFor(original);assert(m);assert(!m.missingInputIds.includes(fact));assert(!m.builderQuestions.some(q=>q.id===fact));assert(!P.heldPacketCorrectionInputIds(m,m.resultCode).has(fact));});
const distinct={mailing_address:'200 Synthetic Mailing Way, Richmond VA',court:'Synthetic District Court',county:'Synthetic Court County'};
const safe=s=>({plan:s.packetPlan,result:s.resultCode,payment:s.paymentAllowed,route:s.pathwayId,track:s.selectedTrackId,required:s.requiredInputIds});
for(const map of maps)for(const raw of ['Synthetic arrest city','Synthetic residence city',{value:'Unconfirmed city',unknown:true},{unknown:true},null,['Earlier incompatible place']]){
 const record=structuredClone(original);Object.assign(record.draftSnapshot.packetAnswers,distinct);record.draftSnapshot[map][fact]=structuredClone(raw);record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);const before=structuredClone(record);const m=P.protectedPacketInformationModelFor(record);
 check(`${map}/${JSON.stringify(raw)} optional history model`,()=>{assert(m);assert(!m.missingInputIds.includes(fact));assert.equal(m.builderQuestions.find(q=>q.id===fact)?.required,false);assert(P.editablePacketInputIds(m).has(fact));assert.equal(m.reviewSafety.safe,false);assert.deepEqual(record,before);assert.deepEqual(safe(record.draftSnapshot),safe(original.draftSnapshot));});
 check(`${map}/${JSON.stringify(raw)} no-op preserves raw maps`,()=>{const patch=P.packetInformationPatch({existingItem:{id:'synthetic-va-location',jurisdiction:'VA',artifactRefs:{}},answers:{},protectedVerification:record});assert(patch);assert.deepEqual(patch.protectedTransition.nextVerification,before);});
 for(const locale of ['en','es']){const q=m.builderQuestions.find(q=>q.id===fact),ctx={locale,setLocale(){},t:(k,f,v)=>t(locale,k,f,v),text:(s,o)=>resolveRuntimeText(locale,s,o)};const html=renderToStaticMarkup(React.createElement(LocalizationContext.Provider,{value:ctx},React.createElement(QuestionField,{question:q,stateCode:'VA',value:m.initialAnswers[fact],onChange(){assert.fail('render edited');}})));check(`${map}/${JSON.stringify(raw)} optional render ${locale}`,()=>{assert(html.includes(locale==='en'?'Optional saved context':'Contexto guardado opcional'));assert(html.includes(locale==='en'?'does not identify the receiving court':'No identifica el tribunal receptor'));assert(!html.includes(' required=""'));});renders.push({map,raw,locale,html});}
}
const record=structuredClone(original);Object.assign(record.draftSnapshot.packetAnswers,distinct);for(const[map,raw]of [['screeningAnswers','Earlier arrest city'],['prefilledAnswers',{value:'Earlier residence city',unknown:true}],['packetAnswers','Earlier mailing city']])record.draftSnapshot[map][fact]=raw;record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);
for(const value of ['',{unknown:true},{value:'Corrected literal place',unknown:false}])check('explicit location amendment preserves independent history '+JSON.stringify(value),()=>{const before=structuredClone(record);const patch=P.packetInformationPatch({existingItem:{id:'synthetic-va-location',jurisdiction:'VA',artifactRefs:{}},answers:{[fact]:value},protectedVerification:record});assert(patch);const next=patch.protectedTransition.nextVerification;assert.deepEqual(next.draftSnapshot.packetAnswers[fact],value);for(const map of maps){const history=next.draftSnapshot.dependencies.semanticAnswerHistory?.find(h=>h.factId===fact&&h.source===map);assert(history,map+' missing history');assert.deepEqual(history.value,before.draftSnapshot[map][fact]);}for(const[k,v]of Object.entries(distinct))assert.deepEqual(next.draftSnapshot.packetAnswers[k],v);assert.deepEqual(safe(next.draftSnapshot),safe(record.draftSnapshot));assert.deepEqual(record,before);assert.equal(patch.readyToGenerate,false);});
const {vaPardonLocationQuestion,vaPardonLocationApplies,vaPardonLocationScopeEntry}=await load('src/lib/expungement-ai/va-pardon-location-context.ts'),route=original.draftSnapshot.pathwayId,spec=packetSpecificationFor('VA:'+route);
check('guarded wording matches only exact retained descriptor and source',()=>{
 const q=base.question;assert.notDeepEqual(vaPardonLocationQuestion(q,profile,route,spec,answers),q);
 for(const [p,r,sp]of [[undefined,route,spec],[profile,'different',spec],[profile,route,null],[{...profile,profileVersion:'changed'},route,spec],[profile,route,{...spec,specificationSha256:'changed'}]])assert.deepEqual(vaPardonLocationQuestion(q,p,r,sp,answers),q);
 for(const edit of [{prompt:'Different meaning'},{helperText:'Different source'},{required:false},{type:'text'},{options:[]}]){const changed={...q,...edit};assert.deepEqual(vaPardonLocationQuestion(changed,profile,route,spec,answers),changed);}
});
check('only the adopted known-Virginia pardon context resolves these three inventory entries',()=>{
 assert(vaPardonLocationApplies(profile,route,spec,answers));
 for(const patch of [{pardon_status:'No'},{pardon_status:{unknown:true}},{case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted'},{va_record_origin:'unknown'},{va_record_origin:'other_state'},{va_record_origin:'federal'},{va_record_origin:{value:'virginia',unknown:true}}])assert.equal(vaPardonLocationApplies(profile,route,spec,{...answers,...patch}),false);
 for(const id of ['pardon_status','case_outcome','va_record_origin'])assert.equal(vaPardonLocationApplies(profile,route,spec,answers,[id]),false);
 for(const [section,ruleId] of [['orderedDecisionRules','rule-70-out-of-state-federal-records-are-not-reachable-by-virgi'],['exclusionRules','exclusion-18'],['exclusionRules','exclusion-30']]){
  const entry={section,ruleId,factIds:[fact]};assert(vaPardonLocationScopeEntry(entry));
  for(const change of [{section:'different'},{ruleId:'different'},{factIds:[fact,'charge']},{factIds:['charge']}])assert.equal(vaPardonLocationScopeEntry({...entry,...change}),false);
 }
});
const collectionInput={jurisdiction:'VA',pathwayId:route,requiredInputIds:original.draftSnapshot.requiredInputIds,serverFacts:original.draftSnapshot.serverFacts,screeningAnswers:original.draftSnapshot.screeningAnswers,prefilledAnswers:original.draftSnapshot.prefilledAnswers,savedAnswers:original.draftSnapshot.packetAnswers,specification:spec,questionById:new Map()};
for(const extra of [{unresolvedSavedFactIds:new Set(['pardon_status'])},{unresolvedSavedFactIds:new Set(['case_outcome'])},{savedAnswers:{pardon_status:'No'}},{savedAnswers:{pardon_status:{unknown:true}}},{recordOwnQuestionIds:new Set([fact])},{routeDecidingFactIds:new Set([fact])},{unresolvedRouteFactIds:new Set([fact])},{override:{routeKey:'VA:'+route,classes:{[fact]:'render_required'}}},{override:{routeKey:'VA:'+route,needsHumanClassification:[fact]}}])check('explicit collection authority overrides history '+Object.keys(extra)[0],()=>assert.notEqual(resolvePacketCollection({...collectionInput,...extra}).facts.find(f=>f.factId===fact).source,'va_pardon_location_history'));
for(const sp of [null,{...spec,specificationSha256:'changed'},{...spec,requiredFacts:[...(spec.requiredFacts??[]),{factId:fact}]}])check('changed/missing packet source refuses location exception',()=>assert.notEqual(resolvePacketCollection({...collectionInput,specification:sp}).facts.find(f=>f.factId===fact).source,'va_pardon_location_history'));
for(const patch of [{},{ownership_scope:'No'},{ownership_scope:'I am not sure'},{jurisdiction_scope:'Federal'},{jurisdiction_scope:'I am not sure'},{va_record_origin:'other_state'},{va_record_origin:'federal'},{va_record_origin:'unknown'}])check('literal locations preserve the full guidance/refusal/uncertain decision/'+JSON.stringify(patch),()=>{
 const answersForCase={...answers,...patch},expected=evaluate({jurisdiction:'VA',profileVersion:profile.profileVersion,matterId:'synthetic-location-boundary',answers:answersForCase}).evaluation;
 const source=evaluate({jurisdiction:'VA',profileVersion:profile.profileVersion,matterId:'synthetic-location-boundary',answers:answersForCase});
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:source,screeningAnswers:answersForCase,dependencies:{},capturedAt:'2026-10-20T19:20:00Z'});assert(seed);
 for(const raw of ['Synthetic residence city','Synthetic arrest city',{unknown:true}]){const snapshot=structuredClone(seed.snapshot);snapshot.packetAnswers[fact]=raw;assert.deepEqual(P.evaluateProtectedPacketFacts(snapshot,undefined,'synthetic-location-boundary').evaluation,expected);}
});
for(const patch of [{pardon_status:'No'},{case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted',pardon_status:'No'}])check('non-pardon collection keeps its existing location behavior/'+JSON.stringify(patch),()=>{
 const input={...answers,...patch},source=evaluate({jurisdiction:'VA',profileVersion:profile.profileVersion,matterId:'synthetic-va-other-branch',answers:input});
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:source,screeningAnswers:input,dependencies:{},capturedAt:'2026-10-20T19:20:00Z'});assert(seed);
 for(const saved of [undefined,{unknown:true}]){const snapshot=structuredClone(seed.snapshot);if(saved!==undefined)snapshot.packetAnswers[fact]=saved;const held={status:'unverified',revision:0,draftHash:P.protectedPacketDraftHash(snapshot),draftSnapshot:snapshot};const model=P.protectedPacketInformationModelFor(held);assert(model);assert(model.missingInputIds.includes(fact));const question=model.builderQuestions.find(q=>q.id===fact);assert.equal(question?.required,true);assert.equal(question.prompt,base.question.prompt);assert.equal(model.reviewSafety.safe,false);}
});
const {composablePacketSpecificationFor}=await load('src/lib/rcap/grade-a/packet-specification.ts');
check('adopted 1.1 remains held without court-output authority',()=>{assert.equal(spec.legalSectionsBound,false);assert.equal(composablePacketSpecificationFor(key),undefined);assert.equal(P.protectedPacketInformationModelFor(original).reviewSafety.safe,false);});
for(const pardonType of ['Yes','No','I am not sure'])check('literal location never supplies pardon qualification/'+pardonType,()=>{
 const before=structuredClone(original);before.draftSnapshot.packetAnswers.pardonType=pardonType;before.draftHash=P.protectedPacketDraftHash(before.draftSnapshot);const expected=P.protectedPacketInformationModelFor(before);assert(expected);
 for(const place of ['Synthetic home county','Synthetic case city',{unknown:true}]){const changed=structuredClone(before);changed.draftSnapshot.packetAnswers[fact]=place;changed.draftHash=P.protectedPacketDraftHash(changed.draftSnapshot);const actual=P.protectedPacketInformationModelFor(changed);assert(actual);assert.deepEqual(actual.vaPardonTypeHeldContext,expected.vaPardonTypeHeldContext);assert.equal(actual.reviewSafety.safe,false);assert.equal(composablePacketSpecificationFor(key),undefined);}
});
const records=new Map(),httpIds=['synthetic-first','synthetic-second'];let httpCases=0;
for(const id of httpIds){const stored=structuredClone(record);records.set(id,stored);}
let authenticated = true, verified = true, owner = 'synthetic-va-owner';
let saves = 0;
const itemFor = id => ({ id, jurisdiction: 'VA', artifactRefs: {} });
globalThis.__vaLocationTransport = {
  getRcapBriefcaseAuthState: async () => ({ isAuthenticated: authenticated, isVerified: verified, userId: owner }),
  getBriefcaseItem: async (user, id) => user === 'synthetic-va-owner' && records.has(id) ? itemFor(id) : null,
  readProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId }) => {
    assert.equal(consumerAuthUserId, 'synthetic-va-owner');
    return { ok: true, value: structuredClone(records.get(briefcaseItemId)) };
  },
  persistProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId, transition }) => {
    assert.equal(consumerAuthUserId, 'synthetic-va-owner');
    assert.equal(transition.expectedPriorRevision, records.get(briefcaseItemId).revision);
    records.set(briefcaseItemId, structuredClone(transition.nextVerification)); saves++;
    return { ok: true, value: structuredClone(records.get(briefcaseItemId)) };
  },
  decorateBriefcaseItemForPresentation: async () => ({ commercialActions: {} }),
  protectedPacketVerificationSeedFromTrustedSource: () => { throw Error('No substitute source'); },
  readTrustedBriefcasePresentationSource: () => { throw Error('No substitute source'); }
};
const apiFile = pathToFileURL(`${process.cwd()}/src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts`).href;
const apiUrl = apiFile + '?ga16-location';
let apiSource = fs.readFileSync(new URL(apiFile), 'utf8');
for (const [bindings, module] of [
  [['getRcapBriefcaseAuthState'], '@/lib/rcap/briefcase/auth'],
  [['getBriefcaseItem'], '@/lib/expungement-ai/briefcase'],
  [['decorateBriefcaseItemForPresentation', 'protectedPacketVerificationSeedFromTrustedSource', 'readTrustedBriefcasePresentationSource'], '@/lib/expungement-ai/briefcase-presentation-authority'],
  [['persistProtectedPacketVerification', 'readProtectedPacketVerification'], '@/lib/expungement-ai/verification-cas']
]) {
  const pattern = new RegExp('import \\{\\s*' + bindings.join(',\\s*') + '\\s*\\} from "' + module + '";');
  assert(pattern.test(apiSource));
  apiSource = apiSource.replace(pattern, bindings.map(name => `const ${name}=(...args:unknown[])=>(globalThis as any).__vaLocationTransport.${name}(...args);`).join('\n'));
}
register('data:text/javascript,' + encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),
  { data: { url: apiUrl, source: ts.transpileModule(apiSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText } });
const API = await import(apiUrl);
const post = (id, answers, extra = {}) => API.POST(new Request(`http://isolated.invalid/api/expungement-ai/briefcase/${id}/packet-information`,
  { method: 'POST', body: JSON.stringify({ expectedRevision: records.get(id).revision, answers, ...extra }) }),
{ params: Promise.resolve({ itemId: id }) });

for(const id of httpIds){
 const before=structuredClone(records.get(id)),otherId=httpIds.find(x=>x!==id),other=structuredClone(records.get(otherId));
 let response=await post(id,{});httpCases++;check(id+' HTTP no-op retains raw maps',()=>{assert.equal(response.status,200);assert.deepEqual(records.get(id),before);});
 for(const value of [{value:'Corrected literal place',unknown:false},{unknown:true},'']){
  const prior=structuredClone(records.get(id));response=await post(id,{[fact]:value});httpCases++;
  check(id+' HTTP amendment/'+JSON.stringify(value),()=>{assert.equal(response.status,200);const next=records.get(id);assert.deepEqual(next.draftSnapshot.packetAnswers[fact],value);for(const map of maps)if(Object.hasOwn(prior.draftSnapshot[map],fact)){assert(next.draftSnapshot.dependencies.semanticAnswerHistory.some(h=>h.factId===fact&&h.source===map&&isDeepStrictEqual(h.value,prior.draftSnapshot[map][fact])));}assert.deepEqual(records.get(otherId),other);assert.deepEqual(P.evaluateProtectedPacketFacts(next.draftSnapshot).evaluation,P.evaluateProtectedPacketFacts(prior.draftSnapshot).evaluation);assert.equal(P.protectedPacketInformationModelFor(next).reviewSafety.safe,false);assert.equal(P.protectedPacketInformationModelFor(next).builderQuestions.find(q=>q.id===fact)?.required,false);});
  const stable=structuredClone(records.get(id));response=await post(id,{[fact]:value});httpCases++;check(id+' identical resubmit is exact no-op',()=>{assert.equal(response.status,200);assert.deepEqual(records.get(id),stable);});
 }
 const stable=structuredClone(records.get(id)),savesBefore=saves;
 for(const[kind,status,error]of [['stale',409,'revision_conflict'],['anonymous',401,'auth_required'],['unverified',403,'verified_account_required'],['other-owner',404,'matter_not_found']]){
  authenticated=kind!=='anonymous';verified=kind!=='unverified';owner=kind==='other-owner'?'another-owner':'synthetic-va-owner';response=await post(id,{[fact]:'Denied change'},kind==='stale'?{expectedRevision:0}:{});httpCases++;const body=await response.json();
  check(id+' '+kind,()=>{assert.equal(response.status,status);assert.equal(body.error,error);assert.deepEqual(records.get(id),stable);assert.equal(saves,savesBefore);});
 }
 authenticated=true;verified=true;owner='synthetic-va-owner';
}
delete globalThis.__vaLocationTransport;
console.log(JSON.stringify({status:'PASS',checks,renders:renders.length,httpCases}));
