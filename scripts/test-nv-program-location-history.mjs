import assert from 'node:assert/strict';
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
// GA-16-M01571 / Q-3243544293c0222d2708: preserve literal location history.
const NV=await load('src/lib/rcap-engine/nevada-176a-branch.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const profile=getProfileByJurisdiction('NV');
const answers={ownership_scope:'Yes',jurisdiction_scope:'State or local',case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted',offense_level:'Misdemeanor',possible_pathway_context:'Probation or specialty-court dismissal / set-aside sealing',disposition_date:'2015-01-05',resolved_timing_bucket:'gt_10_years',pending_cases:'No',pardon_status:'No',[NV.NEVADA_176A_EXCLUDED_CHARGE_FACT_ID]:NV.NEVADA_176A_EXCLUDED_CHARGE_NO,[NV.NEVADA_176A_CHARGE_FACT_ID]:NV.NEVADA_176A_CHARGE_NAMED,[NV.NEVADA_176A_DISPOSITION_FACT_ID]:NV.NEVADA_176A_DISPOSITION_CONDITIONAL_DISMISSAL};
const authoritative=evaluate({jurisdiction:'NV',profileVersion:profile.profileVersion,matterId:'synthetic-ga16-nv-location',answers});
assert.equal(authoritative.evaluation.pathwayId,'probation-or-specialty-court-dismissal-set-aside-sealing');
assert.equal(authoritative.evaluation.resultCode,'packet_ready_with_caution');
assert.equal(authoritative.evaluation.paymentAllowed,false);
const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,packetAnswers:{},dependencies:{},capturedAt:'2026-10-20T06:00:00Z'});assert(seed);
const base={seed:{status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot},question:{id:'residency_or_location',stage:'packet_information',prompt:'What city or location belongs with this matter?',type:'text_or_unknown',required:true,contextOnly:false,lifecyclePhase:'postpay_packet_field',options:null,translations:{es:{prompt:'¿Qué ciudad o lugar corresponde a este asunto?',helperText:''}}}};
let checks=0;const renders=[],check=(name,fn)=>{try{fn();checks++;}catch(e){console.error(name);throw e;}};
const original=base.seed,fact='residency_or_location',maps=['screeningAnswers','prefilledAnswers','packetAnswers'];
check('absent unsupported location no longer blocks or asks',()=>{const m=P.protectedPacketInformationModelFor(original);assert(m);assert(!m.missingInputIds.includes(fact));assert(!m.builderQuestions.some(q=>q.id===fact));});
const distinct={mailing_address:'200 Synthetic Mailing Way, Sparks NV',court:'Synthetic District Court',county:'Synthetic Court County'};
const safe=s=>({plan:s.packetPlan,result:s.resultCode,payment:s.paymentAllowed,route:s.pathwayId,track:s.selectedTrackId,required:s.requiredInputIds});
for(const map of maps)for(const raw of ['Synthetic arrest city','Synthetic residence city',{value:'Unconfirmed city',unknown:true},{unknown:true},null,['Earlier incompatible place']]){
 const record=structuredClone(original);Object.assign(record.draftSnapshot.packetAnswers,distinct);record.draftSnapshot[map][fact]=structuredClone(raw);record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);const before=structuredClone(record);const m=P.protectedPacketInformationModelFor(record);
 check(`${map}/${JSON.stringify(raw)} optional history model`,()=>{assert(m);assert(!m.missingInputIds.includes(fact));assert.equal(m.builderQuestions.find(q=>q.id===fact)?.required,false);assert.deepEqual(record,before);assert.deepEqual(safe(record.draftSnapshot),safe(original.draftSnapshot));});
 check(`${map}/${JSON.stringify(raw)} no-op preserves raw maps`,()=>{const patch=P.packetInformationPatch({existingItem:{id:'synthetic-nv-location',jurisdiction:'NV',artifactRefs:{}},answers:{},protectedVerification:record});assert(patch);assert.deepEqual(patch.protectedTransition.nextVerification,before);});
 for(const locale of ['en','es']){const q=m.builderQuestions.find(q=>q.id===fact),ctx={locale,setLocale(){},t:(k,f,v)=>t(locale,k,f,v),text:(s,o)=>resolveRuntimeText(locale,s,o)};const html=renderToStaticMarkup(React.createElement(LocalizationContext.Provider,{value:ctx},React.createElement(QuestionField,{question:q,stateCode:'NV',value:m.initialAnswers[fact],onChange(){assert.fail('render edited');}})));check(`${map}/${JSON.stringify(raw)} optional render ${locale}`,()=>{assert(html.includes(locale==='en'?'Optional saved context':'Contexto guardado opcional'));assert(html.includes(locale==='en'?'not printed':'no se imprime'));assert(!html.includes(' required=""'));});renders.push({map,raw,locale,html});}
}
const record=structuredClone(original);Object.assign(record.draftSnapshot.packetAnswers,distinct);for(const[map,raw]of [['screeningAnswers','Earlier arrest city'],['prefilledAnswers',{value:'Earlier residence city',unknown:true}],['packetAnswers','Earlier mailing city']])record.draftSnapshot[map][fact]=raw;record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);
for(const value of ['',{unknown:true},{value:'Corrected literal place',unknown:false}])check('explicit location amendment preserves independent history '+JSON.stringify(value),()=>{const before=structuredClone(record);const patch=P.packetInformationPatch({existingItem:{id:'synthetic-nv-location',jurisdiction:'NV',artifactRefs:{}},answers:{[fact]:value},protectedVerification:record});assert(patch);const next=patch.protectedTransition.nextVerification;assert.deepEqual(next.draftSnapshot.packetAnswers[fact],value);for(const map of maps){const history=next.draftSnapshot.dependencies.semanticAnswerHistory?.find(h=>h.factId===fact&&h.source===map);assert(history,map+' missing history');assert.deepEqual(history.value,before.draftSnapshot[map][fact]);}for(const[k,v]of Object.entries(distinct))assert.deepEqual(next.draftSnapshot.packetAnswers[k],v);assert.deepEqual(safe(next.draftSnapshot),safe(record.draftSnapshot));assert.deepEqual(record,before);assert.equal(patch.readyToGenerate,false);});
const {nvProgramLocationQuestion}=await load('src/lib/expungement-ai/nv-program-location-context.ts'),route=original.draftSnapshot.pathwayId,spec=packetSpecificationFor('NV:'+route);
check('guarded wording matches only exact retained descriptor and source',()=>{
 const q=base.question;assert.notDeepEqual(nvProgramLocationQuestion(q,profile,route,spec),q);
 for(const [p,r,sp]of [[undefined,route,spec],[profile,'different',spec],[profile,route,null],[{...profile,profileVersion:'changed'},route,spec],[profile,route,{...spec,specificationSha256:'changed'}]])assert.deepEqual(nvProgramLocationQuestion(q,p,r,sp),q);
 for(const edit of [{prompt:'Different meaning'},{helperText:'Different source'},{required:false},{type:'text'},{options:[]}]){const changed={...q,...edit};assert.deepEqual(nvProgramLocationQuestion(changed,profile,route,spec),changed);}
});
const collectionInput={jurisdiction:'NV',pathwayId:route,requiredInputIds:original.draftSnapshot.requiredInputIds,serverFacts:original.draftSnapshot.serverFacts,screeningAnswers:original.draftSnapshot.screeningAnswers,savedAnswers:{},specification:spec,questionById:new Map()};
for(const extra of [{recordOwnQuestionIds:new Set([fact])},{routeDecidingFactIds:new Set([fact])},{unresolvedRouteFactIds:new Set([fact])},{override:{routeKey:'NV:'+route,classes:{[fact]:'render_required'}}},{override:{routeKey:'NV:'+route,needsHumanClassification:[fact]}}])check('explicit collection authority overrides history '+Object.keys(extra)[0],()=>assert.notEqual(resolvePacketCollection({...collectionInput,...extra}).facts.find(f=>f.factId===fact).source,'nv_program_location_history'));
for(const sp of [null,{...spec,specificationSha256:'changed'},{...spec,requiredFacts:[...spec.requiredFacts,{factId:fact}]}])check('changed/missing packet source refuses location exception',()=>assert.notEqual(resolvePacketCollection({...collectionInput,specification:sp}).facts.find(f=>f.factId===fact).source,'nv_program_location_history'));
const {composeGradeAPacket}=await load('src/lib/rcap/grade-a/composer.ts');
const petitionFacts = {
  [NV.NEVADA_176A_EXCLUDED_CHARGE_FACT_ID]: NV.NEVADA_176A_EXCLUDED_CHARGE_NO,
  participant_full_legal_name: "Jordan Alvarez",
  date_of_birth: "1988-04-02",
  mailing_address: "410 Fremont Street, Las Vegas, NV 89101",
  phone_number: "702-555-0148",
  email_address: "jordan@example.com",
  charge_wording: "Battery constituting domestic violence",
  court_identity: "Las Vegas Justice Court, Clark County",
  order_court_identity: "Las Vegas Justice Court, Clark County",
  declared_programme: "NRS 176A.240 substance-use treatment programme",
  programme_section: "NRS 176A.240",
  declared_resolution: "Charges conditionally dismissed",
  resolution_kind: "Conditional dismissal",
  resolution_date: "2015-01-05",
  disposition_date: "2015-01-05",
  case_number: "15C-000123",
  order_case_number: "15C-000123",
  underlying_case_number: "15C-000123",
  county_name: "Clark",
  agencies_and_officers: "Las Vegas Metropolitan Police Department; Clark County District Attorney",
  named_agencies_and_officers: "Las Vegas Metropolitan Police Department; Clark County District Attorney",
  terms_and_conditions_fulfilled: "Yes",
  discharge_type: "Honourable"
};
const matter={routeKey:'NV:'+route,jurisdiction:'NV',pathwayId:route,facts:{...petitionFacts,[NV.NEVADA_176A_CHARGE_FACT_ID]:NV.NEVADA_176A_CHARGE_NAMED,[NV.NEVADA_176A_DISPOSITION_FACT_ID]:NV.NEVADA_176A_DISPOSITION_CONDITIONAL_DISMISSAL},verificationHash:'synthetic-ga16-no-approval',verifiedAt:'2026-10-20T00:00:00Z',generationPurpose:'internal_review'};
const composed=composeGradeAPacket(spec,matter);
for(const place of ['Synthetic residence city','Synthetic arrest city','Synthetic mailing city','Synthetic court county'])check('literal location never fills a document destination '+place,()=>assert.deepEqual(composeGradeAPacket(spec,{...matter,facts:{...matter.facts,[fact]:place}}),composed));
check('source handbacks remain declared later-actor blanks',()=>{assert(spec.fieldOwnership.participantCompletesBeforeFilingFields.includes('court_identity'));assert(spec.fieldOwnership.participantCompletesBeforeFilingFields.includes('named_agencies_and_officers'));assert(!JSON.stringify(composed.documents).includes('Las Vegas Justice Court, Clark County'));assert(!JSON.stringify(composed.documents).includes('Las Vegas Metropolitan Police Department; Clark County District Attorney'));assert(JSON.stringify(composed.documents).includes(petitionFacts.mailing_address));});
// Reuse current supported, excluded, uncertain, automatic, history and isolated HTTP controls.
await load('scripts/test-ga12-nv-program-category-history.mjs');
console.log(JSON.stringify({status:'PASS',checks,renders:renders.length}));
