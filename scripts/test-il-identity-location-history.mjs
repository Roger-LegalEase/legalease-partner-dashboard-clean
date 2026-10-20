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
// GA-16-M01461 / Q-39a50c13c26e2446fc45: separate literal history from the arrest circuit.
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const profile=getProfileByJurisdiction('IL'),key='IL:criminal-identity-theft-mistaken-identity-relief';
const fixture = { sourceEstablishedAnswers: {
  ownership_scope: 'Yes', jurisdiction_scope: 'State or local', case_outcome: 'Other conviction or adjudication',
  offense_level: 'Misdemeanor', possible_pathway_context: 'Criminal identity-theft / mistaken-identity relief',
  age_at_offense: '25', sentence_completion_date: '2018-01-01', disposition_date: '2018-01-01',
  charge: 'Synthetic disputed record charge', court: 'Synthetic arrest circuit court',
  state_exclusion_categories: ['None of these'], trafficking_status: 'No', pardon_status: 'No',
  resolved_timing_bucket: 'At least 5 years ago'
} };
const answers=structuredClone(fixture.sourceEstablishedAnswers);
const authoritative=evaluate({jurisdiction:'IL',profileVersion:profile.profileVersion,matterId:'synthetic-ga16-il-location',answers});
assert.equal(authoritative.evaluation.pathwayId,'criminal-identity-theft-mistaken-identity-relief');
assert.equal(authoritative.evaluation.resultCode,'needs_review');
assert.equal(authoritative.evaluation.paymentAllowed,false);
const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,packetAnswers:{},dependencies:{},capturedAt:'2026-10-20T19:20:00Z'});assert(seed);
const base={seed:{status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot},question:{id:'residency_or_location',stage:'packet_information',prompt:'What city or location belongs with this matter?',type:'text_or_unknown',required:true,contextOnly:false,lifecyclePhase:'postpay_packet_field',options:null,translations:{es:{prompt:'¿Qué ciudad o lugar corresponde a este asunto?',helperText:''}}}};
let checks=0;const renders=[],check=(name,fn)=>{try{fn();checks++;}catch(e){console.error(name);throw e;}};
const original=base.seed,fact='residency_or_location',maps=['screeningAnswers','prefilledAnswers','packetAnswers'];
check('absent unsupported location no longer blocks or asks',()=>{const m=P.protectedPacketInformationModelFor(original);assert(m);assert(!m.missingInputIds.includes(fact));assert(!m.builderQuestions.some(q=>q.id===fact));assert(!P.heldPacketCorrectionInputIds(m,m.resultCode).has(fact));});
const distinct={mailing_address:'200 Synthetic Mailing Way, Springfield IL',court:'Synthetic District Court',county:'Synthetic Court County'};
const safe=s=>({plan:s.packetPlan,result:s.resultCode,payment:s.paymentAllowed,route:s.pathwayId,track:s.selectedTrackId,required:s.requiredInputIds});
for(const map of maps)for(const raw of ['Synthetic arrest city','Synthetic residence city',{value:'Unconfirmed city',unknown:true},{unknown:true},null,['Earlier incompatible place']]){
 const record=structuredClone(original);Object.assign(record.draftSnapshot.packetAnswers,distinct);record.draftSnapshot[map][fact]=structuredClone(raw);record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);const before=structuredClone(record);const m=P.protectedPacketInformationModelFor(record);
 check(`${map}/${JSON.stringify(raw)} optional history model`,()=>{assert(m);assert(!m.missingInputIds.includes(fact));assert.equal(m.builderQuestions.find(q=>q.id===fact)?.required,false);assert(P.heldPacketCorrectionInputIds(m,m.resultCode).has(fact));assert.deepEqual(record,before);assert.deepEqual(safe(record.draftSnapshot),safe(original.draftSnapshot));});
 check(`${map}/${JSON.stringify(raw)} no-op preserves raw maps`,()=>{const patch=P.packetInformationPatch({existingItem:{id:'synthetic-il-location',jurisdiction:'IL',artifactRefs:{}},answers:{},protectedVerification:record});assert(patch);assert.deepEqual(patch.protectedTransition.nextVerification,before);});
 for(const locale of ['en','es']){const q=m.builderQuestions.find(q=>q.id===fact),ctx={locale,setLocale(){},t:(k,f,v)=>t(locale,k,f,v),text:(s,o)=>resolveRuntimeText(locale,s,o)};const html=renderToStaticMarkup(React.createElement(LocalizationContext.Provider,{value:ctx},React.createElement(QuestionField,{question:q,stateCode:'IL',value:m.initialAnswers[fact],onChange(){assert.fail('render edited');}})));check(`${map}/${JSON.stringify(raw)} optional render ${locale}`,()=>{assert(html.includes(locale==='en'?'Optional saved context':'Contexto guardado opcional'));assert(html.includes(locale==='en'?'not printed':'no se imprime'));assert(!html.includes(' required=""'));});renders.push({map,raw,locale,html});}
}
const record=structuredClone(original);Object.assign(record.draftSnapshot.packetAnswers,distinct);for(const[map,raw]of [['screeningAnswers','Earlier arrest city'],['prefilledAnswers',{value:'Earlier residence city',unknown:true}],['packetAnswers','Earlier mailing city']])record.draftSnapshot[map][fact]=raw;record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);
for(const value of ['',{unknown:true},{value:'Corrected literal place',unknown:false}])check('explicit location amendment preserves independent history '+JSON.stringify(value),()=>{const before=structuredClone(record);const patch=P.packetInformationPatch({existingItem:{id:'synthetic-il-location',jurisdiction:'IL',artifactRefs:{}},answers:{[fact]:value},protectedVerification:record});assert(patch);const next=patch.protectedTransition.nextVerification;assert.deepEqual(next.draftSnapshot.packetAnswers[fact],value);for(const map of maps){const history=next.draftSnapshot.dependencies.semanticAnswerHistory?.find(h=>h.factId===fact&&h.source===map);assert(history,map+' missing history');assert.deepEqual(history.value,before.draftSnapshot[map][fact]);}for(const[k,v]of Object.entries(distinct))assert.deepEqual(next.draftSnapshot.packetAnswers[k],v);assert.deepEqual(safe(next.draftSnapshot),safe(record.draftSnapshot));assert.deepEqual(record,before);assert.equal(patch.readyToGenerate,false);});
const {ilIdentityLocationQuestion}=await load('src/lib/expungement-ai/il-identity-location-context.ts'),route=original.draftSnapshot.pathwayId,spec=packetSpecificationFor('IL:'+route);
check('guarded wording matches only exact retained descriptor and source',()=>{
 const q=base.question;assert.notDeepEqual(ilIdentityLocationQuestion(q,profile,route,spec),q);
 for(const [p,r,sp]of [[undefined,route,spec],[profile,'different',spec],[profile,route,null],[{...profile,profileVersion:'changed'},route,spec],[profile,route,{...spec,specificationSha256:'changed'}]])assert.deepEqual(ilIdentityLocationQuestion(q,p,r,sp),q);
 for(const edit of [{prompt:'Different meaning'},{helperText:'Different source'},{required:false},{type:'text'},{options:[]}]){const changed={...q,...edit};assert.deepEqual(ilIdentityLocationQuestion(changed,profile,route,spec),changed);}
});
const collectionInput={jurisdiction:'IL',pathwayId:route,requiredInputIds:original.draftSnapshot.requiredInputIds,serverFacts:original.draftSnapshot.serverFacts,screeningAnswers:original.draftSnapshot.screeningAnswers,savedAnswers:{},specification:spec,questionById:new Map()};
for(const extra of [{recordOwnQuestionIds:new Set([fact])},{routeDecidingFactIds:new Set([fact])},{unresolvedRouteFactIds:new Set([fact])},{override:{routeKey:'IL:'+route,classes:{[fact]:'render_required'}}},{override:{routeKey:'IL:'+route,needsHumanClassification:[fact]}}])check('explicit collection authority overrides history '+Object.keys(extra)[0],()=>assert.notEqual(resolvePacketCollection({...collectionInput,...extra}).facts.find(f=>f.factId===fact).source,'il_identity_location_history'));
for(const sp of [null,{...spec,specificationSha256:'changed'},{...spec,requiredFacts:[...spec.requiredFacts,{factId:fact}]}])check('changed/missing packet source refuses location exception',()=>assert.notEqual(resolvePacketCollection({...collectionInput,specification:sp}).facts.find(f=>f.factId===fact).source,'il_identity_location_history'));
for(const patch of [{},{ownership_scope:'No'},{ownership_scope:'I am not sure'}])check('literal locations preserve the full guidance/refusal/uncertain decision/'+JSON.stringify(patch),()=>{
 const answersForCase={...answers,...patch},expected=evaluate({jurisdiction:'IL',profileVersion:profile.profileVersion,matterId:'synthetic-location-boundary',answers:answersForCase}).evaluation;
 const source=evaluate({jurisdiction:'IL',profileVersion:profile.profileVersion,matterId:'synthetic-location-boundary',answers:answersForCase});
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:source,screeningAnswers:answersForCase,dependencies:{},capturedAt:'2026-10-20T19:20:00Z'});assert(seed);
 for(const raw of ['Synthetic residence city','Synthetic arrest city',{unknown:true}]){const snapshot=structuredClone(seed.snapshot);snapshot.packetAnswers[fact]=raw;assert.deepEqual(P.evaluateProtectedPacketFacts(snapshot,undefined,'synthetic-location-boundary').evaluation,expected);}
});
const {composeGradeAPacket}=await load('src/lib/rcap/grade-a/composer.ts');
const petitionFacts={case_outcome:answers.case_outcome,contact_information:'Jordan Alvarez; 200 Synthetic Mailing Way, Springfield IL; 217-555-0148; jordan@example.com',participant_full_legal_name:'Jordan Alvarez',date_of_birth:'1988-04-02',mailing_address:distinct.mailing_address,phone_number:'217-555-0148',email_address:'jordan@example.com',arrest_circuit_court:'Synthetic Arrest Circuit Court',arrest_circuit:'Synthetic Arrest Circuit'};
const matter={routeKey:key,jurisdiction:'IL',pathwayId:route,facts:petitionFacts,verificationHash:'synthetic-ga16-no-approval',verifiedAt:'2026-10-20T00:00:00Z',generationPurpose:'internal_review'};
const composed=composeGradeAPacket(spec,matter);
for(const place of ['Synthetic residence city','Synthetic arrest city','Synthetic mailing city','Synthetic court county'])check('literal location never fills a document destination/'+place,()=>assert.deepEqual(composeGradeAPacket(spec,{...matter,facts:{...matter.facts,[fact]:place}}),composed));
check('source handbacks and independent mailing address',()=>{for(const id of ['arrest_circuit_court','arrest_circuit'])assert(spec.fieldOwnership.participantCompletesBeforeFilingFields.includes(id));assert(!JSON.stringify(composed.documents).includes('Synthetic Arrest Circuit'));assert(JSON.stringify(composed.documents).includes(petitionFacts.mailing_address));});
const records=new Map(),httpIds=['synthetic-first','synthetic-second'];let httpCases=0;
for(const id of httpIds){const stored=structuredClone(record);records.set(id,stored);}
let authenticated = true, verified = true, owner = 'synthetic-il-owner';
let saves = 0;
const itemFor = id => ({ id, jurisdiction: 'IL', artifactRefs: {} });
globalThis.__ilLocationTransport = {
  getRcapBriefcaseAuthState: async () => ({ isAuthenticated: authenticated, isVerified: verified, userId: owner }),
  getBriefcaseItem: async (user, id) => user === 'synthetic-il-owner' && records.has(id) ? itemFor(id) : null,
  readProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId }) => {
    assert.equal(consumerAuthUserId, 'synthetic-il-owner');
    return { ok: true, value: structuredClone(records.get(briefcaseItemId)) };
  },
  persistProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId, transition }) => {
    assert.equal(consumerAuthUserId, 'synthetic-il-owner');
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
  apiSource = apiSource.replace(pattern, bindings.map(name => `const ${name}=(...args:unknown[])=>(globalThis as any).__ilLocationTransport.${name}(...args);`).join('\n'));
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
  authenticated=kind!=='anonymous';verified=kind!=='unverified';owner=kind==='other-owner'?'another-owner':'synthetic-il-owner';response=await post(id,{[fact]:'Denied change'},kind==='stale'?{expectedRevision:0}:{});httpCases++;const body=await response.json();
  check(id+' '+kind,()=>{assert.equal(response.status,status);assert.equal(body.error,error);assert.deepEqual(records.get(id),stable);assert.equal(saves,savesBefore);});
 }
 authenticated=true;verified=true;owner='synthetic-il-owner';
}
delete globalThis.__ilLocationTransport;
console.log(JSON.stringify({status:'PASS',checks,renders:renders.length,httpCases}));
