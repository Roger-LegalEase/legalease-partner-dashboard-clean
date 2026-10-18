import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const mutation=process.argv.find(arg=>arg.startsWith('--mutation='))?.slice(11);
const mutations={
 unknown_marker:['dcFelonyRecordIsHistory(profile, snapshot.pathwayId, packetSpecificationFor(`${snapshot.jurisdiction}:${snapshot.pathwayId}`))','false'],
 context:['contactRepresentationHash(profile) === "bcc070d365fb97ad2cd7a5296ca4c8ba516dcf37708fb2b5c852c0d5d1566830"','true'],
 ownership:['dcFelonyRecordHistory && !overrideClass && !needsHuman.has(factId)','dcFelonyRecordHistory'],
 collection:['if (factId === "record_type" && dcFelonyRecordHistory','if (factId === "record_type" && false'],
 loss:['const shapesPreserved = preserveProtectedLegacyShapes(seeded, legacy.inspection, replacedLegacyIds);','const shapesPreserved = preserveProtectedLegacyShapes(seeded, legacy.inspection, replacedLegacyIds); delete shapesPreserved.packetAnswers.record_type;'],
 priority:['const shapesPreserved = preserveProtectedLegacyShapes(seeded, legacy.inspection, replacedLegacyIds);','const shapesPreserved = preserveProtectedLegacyShapes(seeded, legacy.inspection, replacedLegacyIds); if (Array.isArray(shapesPreserved.packetAnswers.record_type)) shapesPreserved.packetAnswers.record_type = "Conviction";'],
 question:['function dcFelonyRecordHistoryQuestion(question, history) {','function dcFelonyRecordHistoryQuestion(question, history) { return question;']
};
if(mutation){assert(mutations[mutation]);register('data:text/javascript,'+encodeURIComponent(`let d;export function initialize(x){d=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith(d[2])){if(!r.source.includes(d[0]))throw Error('mutation target absent');return {...r,source:r.source.replace(d[0],d[1])}}return r}`),{data:[...mutations[mutation],['collection','context','ownership'].includes(mutation)?'/packet-collection.ts':'/packet-information.ts']});}
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {createConsumerPaymentPlaceholder}=await import('../src/lib/expungement-ai/payment-adapter.ts');
const { packetFulfillmentAuthority } = await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {dcFelonyRecordIsHistory:history,resolvePacketCollection}=await import('../src/lib/expungement-ai/packet-collection.ts');
const { packetSpecificationFor } = await import('../src/lib/rcap/grade-a/packet-specification.ts');
// GA-17 Q-3c3fc0993c643dd02cf7 / QD-fb5a90b4c42ab7e486c1.
// Current held consumer proof; the historical blank builder is not re-certified.
const read=p=>JSON.parse(fs.readFileSync(p));
const cases=[{route:'dc_motion_seal_felony_conviction_8yr_16_806',result:'not_covered_yet',payment:false,reason:'dc.intentional_unsupported_route'}];
const witnesses=read('data/rcap-ledger/public-witness-fixtures.json').fixtures;
// Run this same behavioural assertion on the predecessor before implementing the correction.
if(process.argv.includes('--regression-only')){
 let failures=0;
 for(const {route}of cases){
  const witness=witnesses.find(f=>f.pathwayKey===`DC:${route}`);assert(witness);
  const authoritative=evaluate({jurisdiction:'DC',profileVersion:witness.profileVersion,matterId:'synthetic-red-'+route,answers:witness.answers});
  const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:witness.answers,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);
  const model=P.protectedPacketInformationModelFor({status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot});assert(model);
  try{assert(!model.missingInputIds.includes('record_type'));assert(!model.builderQuestions.some(q=>q.id==='record_type'));console.log(JSON.stringify({route,status:'PASS'}));}
  catch(error){failures++;console.error(JSON.stringify({route,failedCheck:'blank generic record labels must not be required',missing:model.missingInputIds.includes('record_type'),error:error.message}));}
 }
 process.exit(failures?1:0);
}
const maps=['screeningAnswers','prefilledAnswers','packetAnswers'];
const rawCases=['Arrest or charge','Court case','Conviction','Juvenile matter','I am not sure',
 ['Arrest or charge','Court case','Conviction'],['Juvenile matter','Conviction'],
 {unknown:true,value:'Court case'},null];
const records=new Map();let checks=0, httpCases=0;
const check=(name,fn)=>{try{fn();checks++;}catch(error){console.error(JSON.stringify({failedCheck:name,checks}));error.message=name+': '+error.message;throw error;}};
const safety=s=>Object.fromEntries(['pathwayId','resultCode','paymentAllowed','selectedTrackId','packetPlan','requiredInputIds'].map(k=>[k,s[k]]));
for(const context of cases){
const {route,result,payment,reason}=context,key=`DC:${route}`;
const witness=witnesses.find(f=>f.pathwayKey===key);assert(witness);
check(key+': exact source purpose and unchanged authority',()=>{
 assert.equal(packetSpecificationFor(key),undefined);
 const profile=getProfileByJurisdiction('DC');assert(history(profile,route,undefined));
 assert(!profile.questions.some(q=>q.id==='record_type'));
 for(const change of [p=>p.source.sourceCorpusSha256='wrong',p=>p.questions.push({id:'record_type'})]){const p=structuredClone(profile);change(p);assert(!history(p,route,undefined));}
 assert(!history(profile,'dc_auto_sealing_16_805',undefined));assert(!history(profile,'dc_juvenile_sealing_16_2335',undefined));assert(!history(profile,route,{routeKey:key}));
 const input={jurisdiction:'DC',pathwayId:route,requiredInputIds:['record_type'],serverFacts:{},screeningAnswers:{},savedAnswers:{},specification:null,questionById:new Map()};
 const fact=resolvePacketCollection(input).facts[0];assert.equal(fact.source,'dc_felony_record_type_history');assert.equal(fact.active,false);assert.equal(fact.optional,true);
 assert.notEqual(resolvePacketCollection({...input,recordOwnQuestionIds:new Set(['record_type'])}).facts[0].source,fact.source);
 for(const override of [{classes:{record_type:'unresolved'}},{needsHumanClassification:['record_type']}]){
  const protectedFact=resolvePacketCollection({...input,override:{routeKey:key,note:'synthetic explicit ownership',...override}}).facts[0];
  assert.notEqual(protectedFact.source,fact.source);assert.equal(protectedFact.collection,'unresolved');
 }
 for(const other of ['dc_auto_sealing_16_805','dc_juvenile_sealing_16_2335'])assert.notEqual(resolvePacketCollection({...input,pathwayId:other}).facts[0].source,fact.source);
 const authority=packetFulfillmentAuthority('DC',route,'checkout creation');
 assert.equal(authority.allowed,false);
 assert.equal(authority.reason,`${key}: NO_RECORD. No Grade-A fulfillment record binds ${key}; a route nobody has written a record for fails closed.`);
});
for(const [label,delta,expectedResult,expectedReason]of [
 ['excluded',{dc_offense_severity_group:'Offense Severity Group 1'},'needs_review','dc.felony_severity_group_not_cleared'],
 ['uncertain disposition',{case_outcome:'I am not sure'},'needs_review','dc.source_fact_unknown']
])check(key+': '+label+' keeps its actual predecessor outcome and raw history',()=>{
 const answers={...witness.answers,...delta};
 const a=evaluate({jurisdiction:'DC',profileVersion:witness.profileVersion,matterId:'synthetic-boundary-'+route,answers});
 assert.equal(a.evaluation.resultCode,expectedResult);assert.equal(a.evaluation.paymentAllowed,false);assert.equal(a.evaluation.reasons[0].code,expectedReason);
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:a,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);
 for(const raw of rawCases){
  const snapshot=structuredClone(seed.snapshot);snapshot.packetAnswers.record_type=structuredClone(raw);
  const r=P.evaluateProtectedPacketFacts(snapshot).evaluation;
  assert.equal(r.resultCode,expectedResult);assert.equal(r.paymentAllowed,false);assert.equal(r.reasons[0].code,expectedReason);
  const record={status:'unverified',revision:0,draftSnapshot:snapshot,draftHash:P.protectedPacketDraftHash(snapshot)};
  assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,record);
 }
});
for(const [label,outcome] of [['original-witness',witness.answers.case_outcome],['separate-matter-same-route',witness.answers.case_outcome]]){
 const answers={...witness.answers,case_outcome:outcome};
 const a=evaluate({jurisdiction:'DC',profileVersion:witness.profileVersion,matterId:'synthetic-'+route+'-'+label,answers});
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:a,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);
 const original={status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};
 records.set('synthetic-'+route+'-'+label,original);
 check(key+'/'+label+': public packet surface retains optional overlapping history',()=>{
  for(const raw of [undefined,['Arrest or charge','Court case','Conviction'],{unknown:true,value:'Court case'}]){
   const item={state:'DC',paymentAllowed:payment,resultCode:result,artifactRefs:{commercialFlow:{
    screening:{pathwayId:route,packetPlan:seed.snapshot.packetPlan,answers},
    packetInformation:{answers:raw===undefined?{}:{record_type:raw},prefilledAnswers:{}}
   }}};
   const before=structuredClone(item);const m=P.packetInformationModelFor(item);assert(m);
   assert(!m.missingInputIds.includes('record_type'));
   if(raw===undefined)assert(!m.builderQuestions.some(q=>q.id==='record_type'));
   else{const q=m.questions.find(q=>q.id==='record_type');assert(q);assert.equal(q.required,false);assert(q.helperText.includes('overlap'));}
   assert.deepEqual(item,before);
  }
 });
 check(label+': actual route state, fulfillment refusal and blank-history suppression',()=>{
  assert.equal(a.evaluation.pathwayId,route);assert.equal(a.evaluation.resultCode,result);assert.equal(a.evaluation.paymentAllowed,payment);const price=createConsumerPaymentPlaceholder({...seed.snapshot,state:'DC'},route);assert.equal(price.enabled,false);assert.equal(price.amountCents,undefined);
  assert.equal(a.evaluation.reasons[0].code,reason);
  const m=P.protectedPacketInformationModelFor(original);assert(m);
  assert(!m.builderQuestions.some(q=>q.id==='record_type'));assert(!m.missingInputIds.includes('record_type'));
  const q=m.questions.find(q=>q.id==='record_type');if(q){assert.equal(q.required,false);assert(q.helperText.includes('overlap'));}
 });
 for(const map of maps)for(const raw of rawCases){
  const record=structuredClone(original);record.draftSnapshot[map].record_type=structuredClone(raw);
  record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);const before=structuredClone(record);
  check(`${label}/${map}/${JSON.stringify(raw)}: no exclusive-value or juvenile inference`,()=>{
   const m=P.protectedPacketInformationModelFor(record);assert(m);const q=m.questions.find(q=>q.id==='record_type');assert(q);assert.equal(q.required,false);assert(q.helperText.includes('overlap'));assert(q.translations.es.helperText.includes('coincidir'));
   assert(!m.missingInputIds.includes('record_type'));
   if(JSON.stringify(raw)===JSON.stringify(['Juvenile matter','Conviction'])){const retained=m.builderQuestions.find(q=>q.id==='record_type');assert(retained);assert.equal(retained.required,false);}
   const r=P.evaluateProtectedPacketFacts(record.draftSnapshot).evaluation;
   assert.equal(r.pathwayId,route);assert.equal(r.resultCode,result);assert.equal(r.paymentAllowed,payment);const price=createConsumerPaymentPlaceholder({...record.draftSnapshot,state:'DC'},route);assert.equal(price.enabled,false);
   assert.equal(r.reasons[0].code,reason);
   assert.deepEqual(safety(record.draftSnapshot),safety(seed.snapshot));
   assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,before);
   assert.deepEqual(record,before);
  });
 }
}
}
// The actual fulfillment refusal applies independently of retained record-label history.
// Legal classification and route selection remain governed by their existing answers.
// Run the real HTTP handler with isolated in-memory auth/store boundaries.
// No session, consent, entitlement, network or database fixture is created.
let authenticated = true, verified = true, owner = 'synthetic-dc-owner';
let saves = 0;
const itemFor = id => ({ id, jurisdiction: 'DC', artifactRefs: {} });
globalThis.__dcFelonyHistoryTransport = {
  getRcapBriefcaseAuthState: async () => ({ isAuthenticated: authenticated, isVerified: verified, userId: owner }),
  getBriefcaseItem: async (user, id) => user === 'synthetic-dc-owner' && records.has(id) ? itemFor(id) : null,
  readProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId }) => {
    assert.equal(consumerAuthUserId, 'synthetic-dc-owner');
    return { ok: true, value: structuredClone(records.get(briefcaseItemId)) };
  },
  persistProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId, transition }) => {
    assert.equal(consumerAuthUserId, 'synthetic-dc-owner');
    assert.equal(transition.expectedPriorRevision, records.get(briefcaseItemId).revision);
    records.set(briefcaseItemId, structuredClone(transition.nextVerification)); saves++;
    return { ok: true, value: structuredClone(records.get(briefcaseItemId)) };
  },
  decorateBriefcaseItemForPresentation: async () => ({ commercialActions: {} }),
  protectedPacketVerificationSeedFromTrustedSource: () => { throw Error('No substitute source'); },
  readTrustedBriefcasePresentationSource: () => { throw Error('No substitute source'); }
};
const apiUrl = pathToFileURL(`${process.cwd()}/src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts`).href;
let source = fs.readFileSync(new URL(apiUrl), 'utf8');
for (const [bindings, module] of [
  [['getRcapBriefcaseAuthState'], '@/lib/rcap/briefcase/auth'],
  [['getBriefcaseItem'], '@/lib/expungement-ai/briefcase'],
  [['decorateBriefcaseItemForPresentation', 'protectedPacketVerificationSeedFromTrustedSource', 'readTrustedBriefcasePresentationSource'], '@/lib/expungement-ai/briefcase-presentation-authority'],
  [['persistProtectedPacketVerification', 'readProtectedPacketVerification'], '@/lib/expungement-ai/verification-cas']
]) {
  const pattern = new RegExp('import \\{\\s*' + bindings.join(',\\s*') + '\\s*\\} from "' + module + '";');
  assert(pattern.test(source));
  source = source.replace(pattern, bindings.map(name => `const ${name}=(...args:unknown[])=>(globalThis as any).__dcFelonyHistoryTransport.${name}(...args);`).join('\n'));
}
register('data:text/javascript,' + encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),
  { data: { url: apiUrl, source: ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText } });
const API = await import(apiUrl);
const post = (id, answers, extra = {}) => API.POST(new Request(`http://isolated.invalid/api/expungement-ai/briefcase/${id}/packet-information`,
  { method: 'POST', body: JSON.stringify({ expectedRevision: records.get(id).revision, answers, ...extra }) }),
{ params: Promise.resolve({ itemId: id }) });
for(const [id,original] of [...records]){
 const {payment,reason}=cases.find(c=>c.route===original.draftSnapshot.pathwayId);
 const stored=structuredClone(original);
 stored.draftSnapshot.screeningAnswers.record_type=['Arrest or charge','Court case','Conviction'];
 stored.draftSnapshot.prefilledAnswers.record_type={unknown:true,value:'Court case'};
 stored.draftSnapshot.packetAnswers.record_type=['Juvenile matter','Conviction'];
 stored.draftHash=P.protectedPacketDraftHash(stored.draftSnapshot);records.set(id,stored);
 const otherMatters=[...records].filter(([k])=>k!==id).map(([k,v])=>[k,structuredClone(v)]);
 let response=await post(id,{});httpCases++;
 check(id+': HTTP no-op keeps overlapping history',()=>{assert.equal(response.status,200);assert.deepEqual(records.get(id),stored);});
 response=await post(id,{participant_full_legal_name:'Synthetic '+id});httpCases++;
 check(id+': unrelated permitted save preserves all original raw record labels',()=>{assert.equal(response.status,200);const next=records.get(id);for(const map of maps)assert.deepEqual(next.draftSnapshot[map].record_type,stored.draftSnapshot[map].record_type);assert.equal(next.draftSnapshot.paymentAllowed,payment);});
 for(const value of ['Court case','I am not sure']){
  response=await post(id,{record_type:value});httpCases++;const body=await response.json();
  check(id+': explicit optional history amendment '+value+' archives every raw label',()=>{
   assert.equal(response.status,200);const next=records.get(id);assert.equal(next.draftSnapshot.packetAnswers.record_type,value);
   for(const map of maps){const entry=next.draftSnapshot.dependencies.semanticAnswerHistory.find(h=>h.factId==='record_type'&&h.source===map);assert(entry,map);assert.deepEqual(entry.value,stored.draftSnapshot[map].record_type);
    for(const fact of ['case_outcome','offense_level','age_at_offense','age','sentence_completion_date'])assert.deepEqual(next.draftSnapshot[map][fact],stored.draftSnapshot[map][fact]);}
   assert.equal(next.draftSnapshot.paymentAllowed,payment);assert.equal(next.status,'unverified');assert.equal(body.readyToGenerate,false);assert(!body.missingInputIds.includes('record_type'));
   assert.equal(P.evaluateProtectedPacketFacts(next.draftSnapshot).evaluation.reasons[0].code,reason);
   for(const[k,v]of otherMatters)assert.deepEqual(records.get(k),v);
  });
 }
 const stable=structuredClone(records.get(id));
 response=await post(id,{record_type:['Court case','Conviction']});httpCases++;const rejected=await response.json();
 check(id+': new unsupported multi-value rewrite refused without losing historical arrays',()=>{
  assert.equal(response.status,422);assert.equal(rejected.error,'invalid_packet_answers');assert.deepEqual(records.get(id),stable);
 });
 const savesBefore=saves;
 for(const [kind,status,error]of [['stale',409,'revision_conflict'],['anonymous',401,'auth_required'],['unverified',403,'verified_account_required'],['other-owner',404,'matter_not_found']]){
  authenticated=kind!=='anonymous';verified=kind!=='unverified';owner=kind==='other-owner'?'another-owner':'synthetic-dc-owner';
  response=await post(id,{record_type:'Court case'},kind==='stale'?{expectedRevision:0}:{});httpCases++;const body=await response.json();
  check(id+': '+kind,()=>{assert.equal(response.status,status);assert.equal(body.error,error);assert.deepEqual(records.get(id),stable);assert.equal(saves,savesBefore);});
 }
 authenticated=true;verified=true;owner='synthetic-dc-owner';
}
delete globalThis.__dcFelonyHistoryTransport;
console.log(JSON.stringify({status:'PASS_DC_FELONY_OPTIONAL_HISTORY',checks,httpCases,originalIds:['Q-3c3fc0993c643dd02cf7','QD-fb5a90b4c42ab7e486c1'],routes:cases.map(c=>'DC:'+c.route),limits:['Existing intentional unsupported route and severity/uncertainty holds retained; actual NO_RECORD/payment refusal unchanged; no whole GA17 closure.','No database, output rendering, source change, hosted authorization or commercial delivery; Spanish copy for lead review.']}));
