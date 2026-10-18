// GA-12 Q-3ab8bb479903ec6dc680 / QD-bd6b15fff22cbe1501cb.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const mutation=process.argv.find(a=>a.startsWith('--mutation='))?.slice(11);
const mutations={
 trafficking_predecessor:['packet-information.ts','"il.prostitution_trafficking"','"test_removed_trafficking_allowance"'],
 predecessor:['packet-information.ts','illinoisProstitutionHeldDraftSuccessor(snapshot, authoritative, verification.status) ?? ',' '],
 consumer:['evaluator.ts','illinoisProstitutionFacts(answers) : "source_review"','"record_review" : "source_review"'],
 final:['illinois-prostitution-facts.ts','answers.case_outcome !== "Felony conviction"','false'],
 missing:['evaluator.ts','code === "missing" ? [IL_PROSTITUTION_FACT_ID, "court_requirements_completed"].filter','false ? [IL_PROSTITUTION_FACT_ID, "court_requirements_completed"].filter'],
 completion:['illinois-prostitution-facts.ts','return completion === "yes" ? "record_review" : "completion";','return "record_review";'],
 next_step:['evaluator.ts','nextSteps: [IL_PROSTITUTION_COPY[code][0]]','nextSteps: evaluated.nextSteps'],
 history:['packet-collection.ts','const ilProstitutionCategoryHistory = ilProstitutionCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);','const ilProstitutionCategoryHistory = false;'],
 retained_editor:['packet-information.ts','ilProstitutionCategoryIsHistory(profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`))','false'],
 resume:['screens.ts','profile?.jurisdiction.code === "IL" && questionId === IL_PROSTITUTION_FACT_ID','false && questionId === IL_PROSTITUTION_FACT_ID']
};
if(mutation){assert(mutations[mutation]);register('data:text/javascript,'+encodeURIComponent(`let m;export function initialize(x){m=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith('/'+m[0])){if(!r.source.includes(m[1]))throw Error('mutation target absent');return {...r,source:r.source.replace(m[1],m[2])}}return r}`),{data:mutations[mutation]});}
const {createElement}=await import('react');
const {renderToStaticMarkup}=await import('react-dom/server');
const {QuestionField}=await import('../src/components/expungement-ai/screening/QuestionField.tsx');
const {LocalizationProvider}=await import('../src/components/expungement-ai/LocalizationProvider.tsx');
const G=await import('../src/lib/rcap-engine/illinois-prostitution-facts.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const {selectScreeningQuestionIds}=await import('../src/lib/rcap-engine/screening-question-selection.ts');
const {sanitizeResumedAnswersForQuestionIds}=await import('../src/components/expungement-ai/screening/screens.ts');
const {parseJurisdictionProfile}=await import('../src/lib/expungement-ai/frontend/schemas.ts');
const {ilProstitutionCategoryIsHistory:history,resolvePacketCollection}=await import('../src/lib/expungement-ai/packet-collection.ts');
const {packetSpecificationFor}=await import('../src/lib/rcap/grade-a/packet-specification.ts');
const F=await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const {createConsumerPaymentPlaceholder}=await import('../src/lib/expungement-ai/payment-adapter.ts');
const route='felony-prostitution-relief',key='IL:'+route,idFact='il_prostitution_final_record';
assert.equal(G.IL_PROSTITUTION_ROUTE,route);assert.equal(G.IL_PROSTITUTION_FACT_ID,idFact);
const profile=getProfileByJurisdiction('IL'),pub=projectPublicProfile(profile),spec=packetSpecificationFor(key);
const parsed=parseJurisdictionProfile(pub);assert(parsed.ok);
const witness=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures.find(f=>f.pathwayKey===key);
const base={...witness.answers,case_outcome:'Felony conviction',offense_level:'Felony',[idFact]:'Yes'};
let checks=0,httpCases=0;const records=new Map(),maps=['screeningAnswers','prefilledAnswers','packetAnswers'];
const check=(name,fn)=>{try{fn();checks++;}catch(e){console.error(JSON.stringify({failedCheck:name,checks}));throw e;}};
const evalFor=answers=>evaluate({jurisdiction:'IL',profileVersion:profile.profileVersion,matterId:'TEST-il-prostitution',answers});
const modelFor=answers=>{const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:evalFor(answers),screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);return{status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};};
const decision=(patch,code)=>{const answers={...base,...patch},before=structuredClone(answers);assert.equal(G.illinoisProstitutionFacts(answers),code);const r=evalFor(answers).evaluation;assert.equal(r.pathwayId,route);assert.equal(r.resultCode,'needs_review');assert.equal(r.reasons[0].code,answers[idFact]==='I am not sure'?'il.source_fact_unknown':'il.prostitution_'+code);assert.equal(r.paymentAllowed,false);assert.deepEqual(answers,before);};
for(const id of [idFact,'court_requirements_completed'])check('blank required source predicate requested/'+id,()=>{
 const answers={...base,[id]:undefined};const r=evalFor(answers).evaluation;
 assert(r.missingQuestionIds.includes(id));assert(selectScreeningQuestionIds(profile,pub,answers).includes(id));
 assert(P.protectedPacketInformationModelFor(modelFor(answers)).questions.some(q=>q.id===id));assert.equal(r.paymentAllowed,false);
});
check('disposition precedes missing conviction record',()=>{
 const r=evalFor({...base,case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted',[idFact]:undefined}).evaluation;
 assert.equal(r.reasons[0].code,'il.prostitution_record_conflict');assert.deepEqual(r.missingQuestionIds,[]);
});
check('all sentence conditions must be complete',()=>decision({court_requirements_completed:'no'},'completion'));
for(const raw of ['not_sure','not_applicable'])check('answered completion uncertainty settles/'+raw,()=>{
 const r=evalFor({...base,court_requirements_completed:raw}).evaluation;assert.equal(r.paymentAllowed,false);assert.equal(r.reasons[0].code,'il.prostitution_completion');assert.deepEqual(r.missingQuestionIds,[]);assert(!r.resultCode.startsWith('packet_ready'));
});
check('supported motion preparation retains individualized attorney review',()=>{
 const r=evalFor(base).evaluation;assert.equal(r.reasons[0].code,'il.prostitution_record_review');assert.match(r.nextSteps.join(' '),/motion to vacate and expunge/);assert.match(r.nextSteps.join(' '),/Attorney review is required by default/);assert.equal(r.paymentAllowed,false);
});
check('confirmed final record remains review only',()=>decision({},'record_review'));
check('negative final record is consumed',()=>decision({[idFact]:'No'},'record_conflict'));
for(const value of [undefined,'I am not sure'])check('unknown is not supplied by generic felony/'+value,()=>decision({[idFact]:value},'missing'));
for(const value of [true,['Yes'],{value:'Yes',unknown:true},{value:'Yes',unknown:false},'Class 4 felony prostitution'])check('pure helper refuses noncanonical choice/'+JSON.stringify(value),()=>assert.equal(G.illinoisProstitutionFacts({...base,[idFact]:value}),'missing'));
check('final conviction, not charge level',()=>{
 assert.equal(G.illinoisProstitutionFacts({...base,case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted'}),'record_conflict');
 assert.equal(G.illinoisProstitutionFacts({...base,case_outcome:'Misdemeanor conviction'}),'record_conflict');
});
check('public control and exact route applicability',()=>{
 const q=pub.questions.find(q=>q.id===idFact);assert(q);assert.deepEqual(q.options,['Yes','No','I am not sure']);assert(q.prompt.includes('final conviction record'));assert(q.translations.es.prompt.includes('condena final'));
 assert(selectScreeningQuestionIds(profile,pub,{...base,[idFact]:undefined}).includes(idFact));
 for(const path of profile.pathways)assert.equal(G.illinoisProstitutionQuestionApplies(profile,path.id,idFact),path.id===route);
 assert.deepEqual(sanitizeResumedAnswersForQuestionIds(parsed.data,base,['ownership_scope'])[idFact],'Yes');
});
check('exact history binding refuses drift',()=>{
 assert(history(profile,route,spec));assert(!history(profile,route,null));
 for(const mutate of [p=>p.profileVersion='changed',p=>p.source.sourceCorpusSha256='changed',p=>p.questions.push({id:'offense_category'})]){const p=structuredClone(profile);mutate(p);assert(!history(p,route,spec));}
 for(const mutate of [s=>s.specificationSha256='changed',s=>s.requiredFacts.push({factId:'offense_category'}),s=>s.routeKey='IL:other']){const s=structuredClone(spec);mutate(s);assert(!history(profile,route,s));}
 for(const sibling of profile.pathways.filter(p=>p.id!==route))assert(!history(profile,sibling.id,spec));
});
check('collection category history preserves explicit ownership',()=>{
 const input={jurisdiction:'IL',pathwayId:route,requiredInputIds:['offense_category'],serverFacts:{},screeningAnswers:base,savedAnswers:{},specification:spec,questionById:new Map()};
 const f=resolvePacketCollection(input).facts[0];assert.equal(f.source,'il_prostitution_category_history');assert.equal(f.active,false);assert.equal(f.optional,true);
 assert.notEqual(resolvePacketCollection({...input,recordOwnQuestionIds:new Set(['offense_category'])}).facts[0].source,f.source);
});
for(const map of maps)for(const raw of ['Class 4 felony prostitution','Amended to Class 2 theft',{value:'Class 4 prostitution',unknown:true},null,['Old category']])check('raw category cannot classify/'+map+'/'+JSON.stringify(raw),()=>{
 const record=modelFor(base);record.draftSnapshot[map].offense_category=raw;record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);const before=structuredClone(record);
 const m=P.protectedPacketInformationModelFor(record);assert(m);assert(!m.missingInputIds.includes('offense_category'));
 assert.equal(P.evaluateProtectedPacketFacts(record.draftSnapshot).evaluation.reasons[0].code,'il.prostitution_record_review');
 assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,before);
});
check('actual authority and price remain closed',()=>{
 const s=modelFor(base).draftSnapshot,f=F.packetFulfillmentAuthority('IL',route,'checkout creation',{trackId:s.selectedTrackId});assert.equal(f.allowed,false);assert.equal(f.reason,`${key}: STALE. ${key} holds every proof, but the server could not observe the current world to confirm they still hold.`);
 const price=createConsumerPaymentPlaceholder({...s,state:'IL'},route);assert.equal(price.enabled,false);assert.equal(price.amountCents,undefined);
});
check('saved fact cannot select a sibling request or cannabis remedy',()=>{
 const witnesses=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures.filter(w=>w.jurisdiction==='IL'&&w.pathwayKey!==key);
 assert(witnesses.length>3);
 for(const w of witnesses){const before=evalFor(w.answers).evaluation;
  for(const value of ['Yes','No','I am not sure']){
   const answers={...w.answers,[idFact]:value};assert.deepEqual(evalFor(answers).evaluation,before,w.pathwayKey);
   assert(!selectScreeningQuestionIds(profile,pub,answers).includes(idFact),w.pathwayKey);
  }
 }
});
check('record answer does not infer trafficking or override explicit other request',()=>{
 for(const choice of ['other_help','mixed_charges','later_order']){
  const answers={...base,il_record_help:choice};
  const r=evalFor(answers).evaluation;assert.equal(r.paymentAllowed,false);assert(!r.reasons.some(r=>r.code.startsWith('il.prostitution_')));
 }
 for(const trafficking_status of ['Yes','No','I am not sure']){
  const answers={...base,trafficking_status};const before=structuredClone(answers),r=evalFor(answers).evaluation;
  assert.equal(r.paymentAllowed,false);assert(!r.resultCode.startsWith('packet_ready'));assert.deepEqual(answers,before);
 }
});
check('source context cannot survive a changed profile source',()=>{
 for(const patch of [p=>p.profileVersion='changed',p=>p.source.sourceCorpusSha256='changed',p=>p.jurisdiction.code='GA']){const p=structuredClone(profile);patch(p);assert(!G.illinoisProstitutionContext(p,route));}
});
check('public and protected record controls render the same choices',()=>{
 const protectedQuestion=P.protectedPacketInformationModelFor(modelFor({...base,[idFact]:undefined})).builderQuestions.find(q=>q.id===idFact);assert(protectedQuestion);
 for(const question of [pub.questions.find(q=>q.id===idFact),protectedQuestion]){
  assert.equal(question.prompt,G.IL_PROSTITUTION_QUESTION.prompt);assert.deepEqual(question.options,['Yes','No','I am not sure']);
  const html=renderToStaticMarkup(createElement(LocalizationProvider,null,createElement(QuestionField,{question,stateCode:'IL',value:'No',onChange:()=>{}})));
  assert(html.includes('final conviction record'));assert(html.includes('I am not sure'));assert(/<input[^>]*checked=""[^>]*value="No"|<input[^>]*value="No"[^>]*checked=""/.test(html));
 }
});
for(const id of ['first','second'])records.set('synthetic-'+id,modelFor(base));
// Exact synthetic draft captured by executing base6398d7fe0; no verified authority is carried forward.
const priorDraft = {"status":"unverified","revision":0,"draftHash":"b2a4bfaaea79c709f1dbe9593d7065d763e414bbbc695cabf229b9420f72aedc","draftSnapshot":{"capturedAt":"2026-10-18T00:00:00Z","deferralComponentIds":[],"dependencies":{},"jurisdiction":"IL","packetAnswers":{},"packetFamilyIdentifiers":{"mode":"official_form_overlay_or_source_form_set","sourceFormIds":["IL:LegalEase Illinois/CXP Additional Cannabis Convictions.pdf:32b1ef344909ff9a38b816f0235f261678c57abaebe9858aec12b70094e55969"]},"packetPlan":{"formMappingStatus":"source_candidate_identified","mode":"official_form_overlay_or_source_form_set","packetReadyWhen":["backend result is packet_ready or packet_ready_with_caution","every source-defined pathway fact is answered","all waiting and completion conditions are satisfied","no exclusion, ambiguity, or required-review flag remains","the selected form revision and filing location pass source-freshness checks"],"pathwayId":"felony-prostitution-relief","requiredInputIds":["age_at_offense","case_outcome","charge","contact_information","court","disposition_date","jurisdiction","offense_category","offense_level","pardon_status","participant_full_legal_name","pathway_id","record_type","residency_or_location","sentence_completion_date","trafficking_status","mailing_address","phone_number","email_address","conviction_county","case_number","conviction_date","conviction_as_worded","adverse_consequences"],"sourceFormIds":["IL:LegalEase Illinois/CXP Additional Cannabis Convictions.pdf:32b1ef344909ff9a38b816f0235f261678c57abaebe9858aec12b70094e55969"],"sourceRuleRefs":["overview:7-28","section:7-28","section:224-270","section:271-325","section:326-364","waiting_periods:271-325","corpus-unit:3","corpus-unit:7","corpus-unit:52","corpus-unit:53","corpus-unit:54","corpus-unit:91","corpus-unit:95","corpus-unit:100","corpus-unit:102","corpus-unit:55"]},"packetType":"official_pdf_overlay","pathwayId":"felony-prostitution-relief","paymentAllowed":true,"prefilledAnswers":{"age_at_offense":"30","case_outcome":"Felony conviction","offense_level":"Felony","pardon_status":"No","sentence_completion_date":"Yes","trafficking_status":"No"},"profileAuthorityFingerprint":"92d1161fb1d9c6234123ea4c222494855e3bd0cb7000c8b4ff76fcf7ee65793e","profileSourceFingerprint":"aa34523e3b643b32124db5d83973622f37082f2d112b3e32ef55912258a7e630","profileVersion":"2026-06-19-source-conversion-1","requiredInputIds":["age_at_offense","case_outcome","charge","contact_information","court","disposition_date","jurisdiction","offense_category","offense_level","pardon_status","participant_full_legal_name","pathway_id","record_type","residency_or_location","sentence_completion_date","trafficking_status","mailing_address","phone_number","email_address","conviction_county","case_number","conviction_date","conviction_as_worded","adverse_consequences"],"resultCode":"packet_ready_with_caution","schemaVersion":"expungement-ai/protected-packet-draft/v1","screeningAnswers":{"court_requirements_completed":"yes","financial_obligations":"Yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","ownership_scope":"Yes","pending_cases":"No","possible_pathway_context":"Felony-prostitution relief","record_documents":"Yes","resolved_timing_bucket":"gt_10_years","special_preconditions_confirmed":"Yes","state_exclusion_categories":["None of these"]},"selectedTrackId":"il-prostitution-j-vacate","serverFacts":{"jurisdiction":"IL","pathway_id":"felony-prostitution-relief"},"treatmentClassification":null}};
check('legacy paid-ready trafficking draft opens held and no-op preserves exact history',()=>{
 for(const value of ['Yes',true,' Yes']){
  const record=structuredClone(priorDraft);record.draftSnapshot.prefilledAnswers.trafficking_status=value;
  record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);const before=structuredClone(record);
  const model=P.protectedPacketInformationModelFor(record);assert(model);assert(!model.packetPlan);
  const current=P.evaluateProtectedPacketFacts(record.draftSnapshot).evaluation;
  assert.equal(current.resultCode,'needs_review');assert.equal(current.paymentAllowed,false);assert.equal(current.reasons[0].code,'il.prostitution_trafficking');
  assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,before);assert.deepEqual(record,before);
 }
});

check('source-reproduced prior draft remains readable and immutable on no-op',()=>{
 assert.equal(P.protectedPacketDraftHash(priorDraft.draftSnapshot),priorDraft.draftHash);
 const before=structuredClone(priorDraft),m=P.protectedPacketInformationModelFor(priorDraft);assert(m);assert(!m.packetPlan);assert(m.builderQuestions.some(q=>q.id===idFact));
 assert.deepEqual(P.packetInformationPatch({protectedVerification:priorDraft,answers:{}}).protectedTransition.nextVerification,before);assert.deepEqual(priorDraft,before);
});
check('predecessor recovery refuses authority and tuple drift',()=>{
 const snapshot=priorDraft.draftSnapshot,a=P.evaluateProtectedPacketFacts(snapshot);
 assert(P.illinoisProstitutionHeldDraftSuccessor(snapshot,a,'unverified'));
 assert.equal(P.illinoisProstitutionHeldDraftSuccessor(snapshot,a,'verified'),null);
 for(const [key,value]of Object.entries({schemaVersion:'other',jurisdiction:'GA',profileVersion:'wrong',profileSourceFingerprint:'wrong',profileAuthorityFingerprint:'wrong',pathwayId:'wrong',resultCode:'packet_ready',paymentAllowed:false,packetType:'wrong',selectedTrackId:'wrong',treatmentClassification:'wrong',deferralComponentIds:['wrong'],requiredInputIds:[],packetPlan:null,packetFamilyIdentifiers:{mode:null,sourceFormIds:[]},serverFacts:{jurisdiction:'IL'}})){
  const bad=structuredClone(snapshot);bad[key]=value;assert.equal(P.illinoisProstitutionHeldDraftSuccessor(bad,a,'unverified'),null,key);
 }
 const forged=structuredClone(snapshot);forged.packetAnswers[idFact]='Yes';assert.equal(P.illinoisProstitutionHeldDraftSuccessor(forged,a,'unverified'),null);
});
records.set('synthetic-prior-draft',structuredClone(priorDraft));
const priorWitness = {"status":"unverified","revision":0,"draftHash":"912250df0c8fa2847bf39087fbe053b43de3c7f0f9227b35a69d6596766a5f77","draftSnapshot":{"capturedAt":"2026-10-18T00:00:00Z","deferralComponentIds":[],"dependencies":{},"jurisdiction":"IL","packetAnswers":{},"packetFamilyIdentifiers":{"mode":null,"sourceFormIds":[]},"packetPlan":null,"packetType":"guidance_packet","pathwayId":"felony-prostitution-relief","paymentAllowed":false,"prefilledAnswers":{"age_at_offense":"30","case_outcome":"Arrest or citation with no charge filed","offense_level":"Misdemeanor","pardon_status":"No","sentence_completion_date":"Yes","trafficking_status":"No"},"profileAuthorityFingerprint":"92d1161fb1d9c6234123ea4c222494855e3bd0cb7000c8b4ff76fcf7ee65793e","profileSourceFingerprint":"aa34523e3b643b32124db5d83973622f37082f2d112b3e32ef55912258a7e630","profileVersion":"2026-06-19-source-conversion-1","requiredInputIds":[],"resultCode":"guidance_only","schemaVersion":"expungement-ai/protected-packet-draft/v1","screeningAnswers":{"court_requirements_completed":"yes","financial_obligations":"Yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","ownership_scope":"Yes","pending_cases":"No","possible_pathway_context":"Felony-prostitution relief","record_documents":"Yes","resolved_timing_bucket":"gt_10_years","special_preconditions_confirmed":"Yes","state_exclusion_categories":["None of these"]},"selectedTrackId":null,"serverFacts":{"jurisdiction":"IL","pathway_id":"felony-prostitution-relief"},"treatmentClassification":null}};
check('original witness held draft keeps exact raw history and offers the new fact',()=>{
 assert.equal(P.protectedPacketDraftHash(priorWitness.draftSnapshot),priorWitness.draftHash);
 const before=structuredClone(priorWitness),m=P.protectedPacketInformationModelFor(priorWitness);assert(m);assert(m.builderQuestions.some(q=>q.id===idFact));
 assert.deepEqual(P.packetInformationPatch({protectedVerification:priorWitness,answers:{}}).protectedTransition.nextVerification,before);
 const patch=P.packetInformationPatch({protectedVerification:priorWitness,answers:{[idFact]:'No'}});assert(patch);const next=patch.protectedTransition.nextVerification;
 assert.equal(next.draftSnapshot.packetAnswers[idFact],'No');assert.equal(next.draftSnapshot.paymentAllowed,false);assert.equal(next.draftSnapshot.resultCode,'guidance_only');assert(P.protectedPacketInformationModelFor(next));assert.equal(P.evaluateProtectedPacketFacts(next.draftSnapshot).evaluation.reasons[0].code,'il.prostitution_record_conflict');
 for(const map of maps)for(const [key,value]of Object.entries(priorWitness.draftSnapshot[map]))assert.deepEqual(next.draftSnapshot[map][key],value);
 assert.deepEqual(priorWitness,before);
});


// Run the real HTTP handler with isolated in-memory auth/store boundaries.
// No session, consent, entitlement, network or database fixture is created.
let authenticated = true, verified = true, owner = 'synthetic-il-owner';
let saves = 0;
const itemFor = id => ({ id, jurisdiction: 'IL', artifactRefs: {} });
globalThis.__ilProstitutionTransport = {
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
  source = source.replace(pattern, bindings.map(name => `const ${name}=(...args:unknown[])=>(globalThis as any).__ilProstitutionTransport.${name}(...args);`).join('\n'));
}
register('data:text/javascript,' + encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),
  { data: { url: apiUrl, source: ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText } });
const API = await import(apiUrl);
const post = (id, answers, extra = {}) => API.POST(new Request(`http://isolated.invalid/api/expungement-ai/briefcase/${id}/packet-information`,
  { method: 'POST', body: JSON.stringify({ expectedRevision: records.get(id).revision, answers, ...extra }) }),
{ params: Promise.resolve({ itemId: id }) });
for(const [id,original]of [...records]){
 const stored=structuredClone(original);
 stored.draftSnapshot.prefilledAnswers.offense_category={value:'Original Class 2 theft category',unknown:true};
 stored.draftSnapshot.packetAnswers.offense_category='Separate saved category';
 stored.draftHash=P.protectedPacketDraftHash(stored.draftSnapshot);records.set(id,stored);
 const others=[...records].filter(([k])=>k!==id).map(([k,v])=>[k,structuredClone(v)]);
 let response=await post(id,{});httpCases++;check(id+' actual no-op',()=>{assert.equal(response.status,200);assert.deepEqual(records.get(id),stored);});
 for(const [answer,code]of [['No','record_conflict'],['I am not sure','missing'],['Yes','record_review']]){
  const priorAnswers=structuredClone(records.get(id).draftSnapshot);
  response=await post(id,{[idFact]:answer});httpCases++;const body=await response.json();
  check(id+' actual final-record amendment '+answer,()=>{
   assert.equal(response.status,200);const next=records.get(id);assert.equal(next.draftSnapshot.packetAnswers[idFact],answer);
   assert.equal(P.evaluateProtectedPacketFacts(next.draftSnapshot).evaluation.reasons[0].code,answer==='I am not sure'?'il.source_fact_unknown':'il.prostitution_'+code);
   for(const map of maps){assert.deepEqual(next.draftSnapshot[map].offense_category,stored.draftSnapshot[map].offense_category);for(const [fact,value]of Object.entries(stored.draftSnapshot[map]))if(fact!==idFact&&fact!=='offense_category')assert.deepEqual(next.draftSnapshot[map][fact],value,map+'/'+fact);}
   assert.equal(next.status,'unverified');assert.equal(next.draftSnapshot.paymentAllowed,false);assert.equal(body.readyToGenerate,false);
   for(const map of maps)if(Object.hasOwn(priorAnswers[map],idFact)){const h=next.draftSnapshot.dependencies.semanticAnswerHistory.find(h=>h.factId===idFact&&h.source===map&&h.value===priorAnswers[map][idFact]);assert(h,map+' prior choice');}
   for(const[k,v]of others)assert.deepEqual(records.get(k),v);
  });
 }
 response=await post(id,{offense_category:{value:'Participant amended literal category',unknown:false}});httpCases++;
 const categoryResponse=await response.json();
 check(id+' category amendment archives every earlier raw copy',()=>{
  assert.equal(response.status,200,JSON.stringify({categoryResponse,questions:P.protectedPacketInformationModelFor(records.get(id)).questions.map(q=>[q.id,q.type]),builder:P.protectedPacketInformationModelFor(records.get(id)).builderQuestions.map(q=>q.id)}));const s=records.get(id).draftSnapshot;
  for(const map of ['prefilledAnswers','packetAnswers']){const h=s.dependencies.semanticAnswerHistory.find(h=>h.factId==='offense_category'&&h.source===map);assert(h,map);assert.deepEqual(h.value,stored.draftSnapshot[map].offense_category);}
  assert.equal(P.evaluateProtectedPacketFacts(s).evaluation.reasons[0].code,'il.prostitution_record_review');
 });
 const stable=structuredClone(records.get(id)),savesBefore=saves;
 for(const [kind,status,error]of [['stale',409,'revision_conflict'],['anonymous',401,'auth_required'],['unverified',403,'verified_account_required'],['other-owner',404,'matter_not_found']]){
  authenticated=kind!=='anonymous';verified=kind!=='unverified';owner=kind==='other-owner'?'another-owner':'synthetic-il-owner';response=await post(id,{[idFact]:'No'},kind==='stale'?{expectedRevision:0}:{});httpCases++;const body=await response.json();
  check(id+' '+kind,()=>{assert.equal(response.status,status);assert.equal(body.error,error);assert.deepEqual(records.get(id),stable);assert.equal(saves,savesBefore);});
 }
 authenticated=true;verified=true;owner='synthetic-il-owner';
}
delete globalThis.__ilProstitutionTransport;
console.log(JSON.stringify({status:'PASS',checks,httpCases,originalIds:['Q-3ab8bb479903ec6dc680','QD-bd6b15fff22cbe1501cb'],route:key,limits:['No eligibility or commercial authority; no output regeneration.','Draft EN/ES needs qualified review.']}));
