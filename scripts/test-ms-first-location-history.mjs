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
// GA-16-M01514 / Q-7aaf83fbc78f127f31d1: separate literal history, case jurisdiction and convicting-court captions.
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const profile=getProfileByJurisdiction('MS'),key='MS:first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1';
const witness=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.find(f=>f.pathwayKey===key);assert(witness);
const answers={...witness.finalAnswers,case_outcome:'Misdemeanor conviction',offense_level:'Misdemeanor'};delete answers.residency_or_location;
const authoritative=evaluate({jurisdiction:'MS',profileVersion:profile.profileVersion,matterId:'synthetic-ga16-ms-first-location',answers});
assert.equal(authoritative.evaluation.pathwayId,'first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1');
assert.equal(authoritative.evaluation.resultCode,'needs_review');
assert.equal(authoritative.evaluation.paymentAllowed,false);
const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,packetAnswers:{},dependencies:{},capturedAt:'2026-10-20T19:20:00Z'});assert(seed);
const base={seed:{status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot},question:{id:'residency_or_location',stage:'packet_information',prompt:'What city or location belongs with this matter?',type:'text_or_unknown',required:true,contextOnly:false,lifecyclePhase:'postpay_packet_field',options:null,translations:{es:{prompt:'¿Qué ciudad o lugar corresponde a este asunto?',helperText:''}}}};
let checks=0;const renders=[],check=(name,fn)=>{try{fn();checks++;}catch(e){console.error(name);throw e;}};
const original=base.seed,fact='residency_or_location',maps=['screeningAnswers','prefilledAnswers','packetAnswers'];
check('absent unsupported location no longer blocks or asks',()=>{const m=P.protectedPacketInformationModelFor(original);assert(m);assert(!m.missingInputIds.includes(fact));assert(!m.builderQuestions.some(q=>q.id===fact));assert(!P.heldPacketCorrectionInputIds(m,m.resultCode).has(fact));});
const distinct={mailing_address:'200 Synthetic Mailing Way, Jackson MS',court:'Synthetic District Court',county:'Synthetic Court County'};
const safe=s=>({plan:s.packetPlan,result:s.resultCode,payment:s.paymentAllowed,route:s.pathwayId,track:s.selectedTrackId,required:s.requiredInputIds});
for(const map of maps)for(const raw of ['Synthetic arrest city','Synthetic residence city',{value:'Unconfirmed city',unknown:true},{unknown:true},null,['Earlier incompatible place']]){
 const record=structuredClone(original);Object.assign(record.draftSnapshot.packetAnswers,distinct);record.draftSnapshot[map][fact]=structuredClone(raw);record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);const before=structuredClone(record);const m=P.protectedPacketInformationModelFor(record);
 check(`${map}/${JSON.stringify(raw)} optional history model`,()=>{assert(m);assert(!m.missingInputIds.includes(fact));assert.equal(m.builderQuestions.find(q=>q.id===fact)?.required,false);assert(P.heldPacketCorrectionInputIds(m,m.resultCode).has(fact));assert.deepEqual(record,before);assert.deepEqual(safe(record.draftSnapshot),safe(original.draftSnapshot));});
 check(`${map}/${JSON.stringify(raw)} no-op preserves raw maps`,()=>{const patch=P.packetInformationPatch({existingItem:{id:'synthetic-ms-first-location',jurisdiction:'MS',artifactRefs:{}},answers:{},protectedVerification:record});assert(patch);assert.deepEqual(patch.protectedTransition.nextVerification,before);});
 for(const locale of ['en','es']){const q=m.builderQuestions.find(q=>q.id===fact),ctx={locale,setLocale(){},t:(k,f,v)=>t(locale,k,f,v),text:(s,o)=>resolveRuntimeText(locale,s,o)};const html=renderToStaticMarkup(React.createElement(LocalizationContext.Provider,{value:ctx},React.createElement(QuestionField,{question:q,stateCode:'MS',value:m.initialAnswers[fact],onChange(){assert.fail('render edited');}})));check(`${map}/${JSON.stringify(raw)} optional render ${locale}`,()=>{assert(html.includes(locale==='en'?'Optional saved context':'Contexto guardado opcional'));assert(html.includes(locale==='en'?'not printed':'no se imprime'));assert(!html.includes(' required=""'));});renders.push({map,raw,locale,html});}
}
const record=structuredClone(original);Object.assign(record.draftSnapshot.packetAnswers,distinct);for(const[map,raw]of [['screeningAnswers','Earlier arrest city'],['prefilledAnswers',{value:'Earlier residence city',unknown:true}],['packetAnswers','Earlier mailing city']])record.draftSnapshot[map][fact]=raw;record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);
for(const value of ['',{unknown:true},{value:'Corrected literal place',unknown:false}])check('explicit location amendment preserves independent history '+JSON.stringify(value),()=>{const before=structuredClone(record);const patch=P.packetInformationPatch({existingItem:{id:'synthetic-ms-first-location',jurisdiction:'MS',artifactRefs:{}},answers:{[fact]:value},protectedVerification:record});assert(patch);const next=patch.protectedTransition.nextVerification;assert.deepEqual(next.draftSnapshot.packetAnswers[fact],value);for(const map of maps){const history=next.draftSnapshot.dependencies.semanticAnswerHistory?.find(h=>h.factId===fact&&h.source===map);assert(history,map+' missing history');assert.deepEqual(history.value,before.draftSnapshot[map][fact]);}for(const[k,v]of Object.entries(distinct))assert.deepEqual(next.draftSnapshot.packetAnswers[k],v);assert.deepEqual(safe(next.draftSnapshot),safe(record.draftSnapshot));assert.deepEqual(record,before);assert.equal(patch.readyToGenerate,false);});
const {msFirstLocationQuestion}=await load('src/lib/expungement-ai/ms-first-location-context.ts'),route=original.draftSnapshot.pathwayId,spec=packetSpecificationFor('MS:'+route);
check('guarded wording matches only exact retained descriptor and source',()=>{
 const q=base.question;assert.notDeepEqual(msFirstLocationQuestion(q,profile,route,spec),q);
 for(const [p,r,sp]of [[undefined,route,spec],[profile,'different',spec],[profile,route,null],[{...profile,profileVersion:'changed'},route,spec],[profile,route,{...spec,specificationSha256:'changed'}]])assert.deepEqual(msFirstLocationQuestion(q,p,r,sp),q);
 for(const edit of [{prompt:'Different meaning'},{helperText:'Different source'},{required:false},{type:'text'},{options:[]}]){const changed={...q,...edit};assert.deepEqual(msFirstLocationQuestion(changed,profile,route,spec),changed);}
});
const collectionInput={jurisdiction:'MS',pathwayId:route,requiredInputIds:original.draftSnapshot.requiredInputIds,serverFacts:original.draftSnapshot.serverFacts,screeningAnswers:original.draftSnapshot.screeningAnswers,savedAnswers:{},specification:spec,questionById:new Map()};
for(const extra of [{recordOwnQuestionIds:new Set([fact])},{routeDecidingFactIds:new Set([fact])},{unresolvedRouteFactIds:new Set([fact])},{override:{routeKey:'MS:'+route,classes:{[fact]:'render_required'}}},{override:{routeKey:'MS:'+route,needsHumanClassification:[fact]}}])check('explicit collection authority overrides history '+Object.keys(extra)[0],()=>assert.notEqual(resolvePacketCollection({...collectionInput,...extra}).facts.find(f=>f.factId===fact).source,'ms_first_location_history'));
for(const sp of [null,{...spec,specificationSha256:'changed'},{...spec,requiredFacts:[...spec.requiredFacts,{factId:fact}]}])check('changed/missing packet source refuses location exception',()=>assert.notEqual(resolvePacketCollection({...collectionInput,specification:sp}).facts.find(f=>f.factId===fact).source,'ms_first_location_history'));
for(const patch of [{},{ownership_scope:'No'},{ownership_scope:'I am not sure'},{jurisdiction_scope:'Federal'},{jurisdiction_scope:'I am not sure'}])check('literal locations preserve the full guidance/refusal/uncertain decision/'+JSON.stringify(patch),()=>{
 const answersForCase={...answers,...patch};
 const source=evaluate({jurisdiction:'MS',profileVersion:profile.profileVersion,matterId:'synthetic-location-boundary',answers:answersForCase});
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:source,screeningAnswers:answersForCase,dependencies:{},capturedAt:'2026-10-20T19:20:00Z'});assert(seed);
 // The protected MS consumer reads separate source facts even when public screening has only its older hold.
 const expected=P.evaluateProtectedPacketFacts(seed.snapshot,undefined,'synthetic-location-boundary').evaluation;
 assert.equal(expected.paymentAllowed,false);
 for(const raw of ['Synthetic residence city','Synthetic arrest city',{unknown:true}]){const snapshot=structuredClone(seed.snapshot);snapshot.packetAnswers[fact]=raw;assert.deepEqual(P.evaluateProtectedPacketFacts(snapshot,undefined,'synthetic-location-boundary').evaluation,expected);}
});
// Existing typed source facts can satisfy the event; literal location never supplies or contradicts them.
const H=await load('src/lib/rcap-engine/mississippi-first-offender-source-facts.ts');
const Q=await load('src/lib/expungement-ai/ms-first-offender-source-questions.ts');
const {recordFactConfirmationFor}=await load('src/lib/expungement-ai/record-fact-clarification.ts');
const sourceFacts={charge:'Synthetic exact recorded misdemeanor offense and citation',ms_misd1_conviction_finality:'final_conviction_record_confirmed',ms_misd1_complete_conviction_history:'checked_own_history_no_other_convictions',ms_misd1_traffic_record_classification:'nontraffic_nondui_record_confirmed',ms_misd1_official_duty_nexus:'not_a_public_official',ms_conviction_court:'county',ms_prior_conviction_expungement:'no'};
for(const change of [{},{ms_misd1_complete_conviction_history:'checked_own_history_other_conviction'},{ms_misd1_traffic_record_classification:'unknown'}])check('location never changes separate typed source decision/'+JSON.stringify(change),()=>{
 const raw={...sourceFacts,...change},request={jurisdiction:'MS',profileVersion:profile.profileVersion,matterId:'synthetic-ms-source-location',answers};
 const context=H.projectMsFirstOffenderSourceFacts(profile,route,raw),source=evaluate(request,context);
 assert.equal(H.msFirstOffenderSourceDecision(profile,route,answers,context).status,Object.keys(change).length===0?'satisfied':change.ms_misd1_complete_conviction_history?'review':'missing');
 const confirmations=Object.fromEntries(H.MS_FIRST_OFFENDER_IDS.map(id=>[id,recordFactConfirmationFor(key,id,{...answers,...raw},Q.msFirstOffenderSourceQuestions().find(q=>q.id===id))]));
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:source,screeningAnswers:answers,packetAnswers:raw,dependencies:{recordFactConfirmations:confirmations},capturedAt:'2026-10-20T00:00:00Z'});assert(seed);
 const expected=P.evaluateProtectedPacketFacts(seed.snapshot,undefined,request.matterId).evaluation;
 for(const rawLocation of ['Synthetic conviction city','Synthetic out-of-state home',{unknown:true}]){const snapshot=structuredClone(seed.snapshot);snapshot.packetAnswers[fact]=rawLocation;assert.deepEqual(P.evaluateProtectedPacketFacts(snapshot,undefined,request.matterId).evaluation,expected);assert.deepEqual(snapshot.packetAnswers.ms_conviction_court,'county');}
});
const {composeGradeAPacket}=await load('src/lib/rcap/grade-a/composer.ts');
const petitionFacts={...answers,participant_full_legal_name:'Jordan Alvarez',date_of_birth:'1988-04-02',mailing_address:distinct.mailing_address,phone_number:'601-555-0148',email_address:'jordan@example.com',contact_information:'Jordan Alvarez; 200 Synthetic Mailing Way, Jackson MS; 601-555-0148; jordan@example.com',court:'Synthetic Conviction Court',county:'Synthetic Conviction County or Municipality',prosecuting_authority_address:'Synthetic separate prosecutor service address',financial_obligations:'Synthetic satisfied obligations',prior_relief:'Synthetic no prior relief'};
const matter={routeKey:key,jurisdiction:'MS',pathwayId:route,facts:petitionFacts,verificationHash:'synthetic-ga16-no-approval',verifiedAt:'2026-10-20T00:00:00Z',generationPurpose:'internal_review'};
const composed=composeGradeAPacket(spec,matter);
for(const place of ['Synthetic residence city','Synthetic arrest city','Synthetic mailing city','Synthetic court county'])check('literal location never fills a document destination/'+place,()=>assert.deepEqual(composeGradeAPacket(spec,{...matter,facts:{...matter.facts,[fact]:place}}),composed));
check('source handbacks and independent mailing address',()=>{for(const id of ['court','county','prosecuting_authority_address'])assert(spec.fieldOwnership.participantCompletesBeforeFilingFields.includes(id));assert(!JSON.stringify(composed.documents).includes('Synthetic Conviction Court'));assert(!JSON.stringify(composed.documents).includes('Synthetic separate prosecutor service address'));assert(JSON.stringify(composed.documents).includes(petitionFacts.mailing_address));});
const records=new Map(),httpIds=['synthetic-first','synthetic-second'];let httpCases=0;
for(const id of httpIds){const stored=structuredClone(record);records.set(id,stored);}
let authenticated = true, verified = true, owner = 'synthetic-ms-first-owner';
let saves = 0;
const itemFor = id => ({ id, jurisdiction: 'MS', artifactRefs: {} });
globalThis.__msFirstLocationTransport = {
  getRcapBriefcaseAuthState: async () => ({ isAuthenticated: authenticated, isVerified: verified, userId: owner }),
  getBriefcaseItem: async (user, id) => user === 'synthetic-ms-first-owner' && records.has(id) ? itemFor(id) : null,
  readProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId }) => {
    assert.equal(consumerAuthUserId, 'synthetic-ms-first-owner');
    return { ok: true, value: structuredClone(records.get(briefcaseItemId)) };
  },
  persistProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId, transition }) => {
    assert.equal(consumerAuthUserId, 'synthetic-ms-first-owner');
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
  apiSource = apiSource.replace(pattern, bindings.map(name => `const ${name}=(...args:unknown[])=>(globalThis as any).__msFirstLocationTransport.${name}(...args);`).join('\n'));
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
  check(id+' HTTP amendment/'+JSON.stringify(value),()=>{assert.equal(response.status,200);const next=records.get(id);assert.deepEqual(next.draftSnapshot.packetAnswers[fact],value);for(const map of maps)if(Object.hasOwn(prior.draftSnapshot[map],fact)){assert(next.draftSnapshot.dependencies.semanticAnswerHistory.some(h=>h.factId===fact&&h.source===map&&isDeepStrictEqual(h.value,prior.draftSnapshot[map][fact])));}assert.deepEqual(records.get(otherId),other);assert.equal(P.evaluateProtectedPacketFacts(next.draftSnapshot).evaluation.paymentAllowed,false);assert.equal(P.protectedPacketInformationModelFor(next).builderQuestions.find(q=>q.id===fact)?.required,false);});
  const stable=structuredClone(records.get(id));response=await post(id,{[fact]:value});httpCases++;check(id+' identical resubmit is exact no-op',()=>{assert.equal(response.status,200);assert.deepEqual(records.get(id),stable);});
 }
 const stable=structuredClone(records.get(id)),savesBefore=saves;
 for(const[kind,status,error]of [['stale',409,'revision_conflict'],['anonymous',401,'auth_required'],['unverified',403,'verified_account_required'],['other-owner',404,'matter_not_found']]){
  authenticated=kind!=='anonymous';verified=kind!=='unverified';owner=kind==='other-owner'?'another-owner':'synthetic-ms-first-owner';response=await post(id,{[fact]:'Denied change'},kind==='stale'?{expectedRevision:0}:{});httpCases++;const body=await response.json();
  check(id+' '+kind,()=>{assert.equal(response.status,status);assert.equal(body.error,error);assert.deepEqual(records.get(id),stable);assert.equal(saves,savesBefore);});
 }
 authenticated=true;verified=true;owner='synthetic-ms-first-owner';
}
delete globalThis.__msFirstLocationTransport;
console.log(JSON.stringify({status:'PASS',checks,renders:renders.length,httpCases}));
