// GA-12 Q-51b8ea53b02426f2f685 / QD-bd6b15fff22cbe1501cb.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
process.env.RCAP_EVALUATOR_TODAY='2026-10-18';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const mutation=process.argv.find(a=>a.startsWith('--mutation='))?.slice(11);
// Resume preservation is still asserted; the old screening-arm mutant is equivalent after the protected-field move.
const mutations={
 card_successor:['briefcase-presentation-authority.ts','wyoming1502HeldDraftSuccessor(snapshot, authoritative, verification.status) ?? ',''],
 trafficking_predecessor:['packet-information.ts','"wy.felony1502_trafficking"','"test_removed_trafficking_allowance"'],
 missing:['evaluator.ts','...facts.ids.filter(id => {','...[].filter(id => {'],
 disposition:['wyoming-1502-facts.ts','a.case_outcome !== "Felony conviction"','false'],
 next_step:['evaluator.ts','nextSteps: [WY_1502_COPY[facts.code][0]]','nextSteps: evaluated.nextSteps'],
 consumer:['evaluator.ts','if (wy1502Context(profile, pathway.id)) {','if (false) {'],
 deferral:['wyoming-1502-facts.ts','a.wy1502_completed_deferral === "Yes"','false'],
 completion:['wyoming-1502-facts.ts','a.wy1502_program_complete !== "Yes" || a.wy1502_restitution_paid !== "Yes"','false'],
 firearm:['wyoming-1502-facts.ts','a.wy1502_firearm === "Yes"','false'],
 history:['packet-collection.ts','const wy1502CategoryHistory = wy1502CategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);','const wy1502CategoryHistory = false;'],
 retained_editor:['packet-information.ts','wy1502CategoryIsHistory(profile, pathwayId, packetSpecificationFor(`${profile.jurisdiction.code}:${pathwayId}`))','false'],
 predecessor:['packet-information.ts','const factualSuccessor = wyoming1502HeldDraftSuccessor(snapshot, authoritative, verification.status) ?? illinoisProstitutionHeldDraftSuccessor','const factualSuccessor = illinoisProstitutionHeldDraftSuccessor']
};
if(mutation){assert(mutations[mutation]);register('data:text/javascript,'+encodeURIComponent(`let m;export function initialize(x){m=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith('/'+m[0])){if(!r.source.includes(m[1]))throw Error('mutation target absent');return {...r,source:r.source.replace(m[1],m[2])}}return r}`),{data:mutations[mutation]});}
const G=await import('../src/lib/rcap-engine/wyoming-1502-facts.ts');
const {WY_1401_NEW_IDS}=await import('../src/lib/rcap-engine/wyoming-1401-facts.ts');
const {WY_1501_FACT_IDS}=await import('../src/lib/rcap-engine/wyoming-1501-facts.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const {selectScreeningQuestionIds}=await import('../src/lib/rcap-engine/screening-question-selection.ts');
const {sanitizeResumedAnswersForQuestionIds}=await import('../src/components/expungement-ai/screening/screens.ts');
const {parseJurisdictionProfile}=await import('../src/lib/expungement-ai/frontend/schemas.ts');
const {wy1502CategoryIsHistory:history,resolvePacketCollection}=await import('../src/lib/expungement-ai/packet-collection.ts');
const {packetSpecificationFor}=await import('../src/lib/rcap/grade-a/packet-specification.ts');
const F=await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const route='felony-conviction-expungement-w-s-7-13-1502',key='WY:'+route,profile=getProfileByJurisdiction('WY'),pub=projectPublicProfile(profile),spec=packetSpecificationFor(key);
assert.equal(G.WY_1502_ROUTE,route);const parsed=parseJurisdictionProfile(pub);assert(parsed.ok);
const witness=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures.find(f=>f.pathwayKey===key);
const base={...witness.answers,case_outcome:'Felony conviction',offense_level:'Felony',wy1502_citations:{value:'6-3-402',unknown:false},wy1502_completed_deferral:'No',wy1502_multiple:'No',wy1502_terms_ended:{value:'2010-10-18',unknown:false},wy1502_program_complete:'Yes',wy1502_restitution_paid:'Yes',wy1502_other_felony:'No',wy1502_firearm:'No',wy1502_prior_relief:'No',wy1502_victim:'Yes',wy1502_registration:'No'};
let checks=0,httpCases=0;const records=new Map(),maps=['screeningAnswers','prefilledAnswers','packetAnswers'];
const check=(name,fn)=>{try{fn();checks++;}catch(e){console.error(JSON.stringify({failedCheck:name,checks}));throw e;}};
const evalFor=answers=>evaluate({jurisdiction:'WY',profileVersion:profile.profileVersion,matterId:'TEST-wy1502',answers});
const modelFor=answers=>{const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:evalFor(answers),screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);return{status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};};
const decision=(patch,code)=>{const a={...base,...patch},before=structuredClone(a);assert.equal(G.wy1502Facts(a,process.env.RCAP_EVALUATOR_TODAY).code,code);const r=evalFor(a).evaluation;assert.equal(r.pathwayId,route);assert.equal(r.paymentAllowed,false);assert(!r.resultCode.startsWith('packet_ready'));if(r.reasons.some(r=>r.code.startsWith('wy.felony1502_')))assert(r.reasons.some(r=>r.code==='wy.felony1502_'+code));assert.deepEqual(a,before);return r;};
for(const id of G.WY_1502_FACT_IDS.filter(id=>id!=='wy1502_related'))check('blank required source predicate requested/'+id,()=>{
 const answers={...base,[id]:undefined};const r=evalFor(answers).evaluation;
 assert(r.missingQuestionIds.includes(id));assert(!selectScreeningQuestionIds(profile,pub,answers).includes(id));
 assert(P.protectedPacketInformationModelFor(modelFor(answers)).questions.some(q=>q.id===id));assert.equal(r.paymentAllowed,false);
});
check('disposition precedes missing felony facts',()=>{
 const r=evalFor({...base,case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted',wy1502_citations:undefined}).evaluation;
 assert.equal(r.reasons[0].code,'wy.felony1502_disposition');assert.deepEqual(r.missingQuestionIds,[]);
});
check('supported petition remains subject to mandatory review before offer',()=>{
 const r=evalFor(base).evaluation;assert.equal(r.reasons[0].code,'wy.felony1502_record_review');assert.match(r.nextSteps.join(' '),/petition to the convicting court/);assert.match(r.nextSteps.join(' '),/Mandatory attorney review/);assert.equal(r.paymentAllowed,false);
});
check('coherent conviction held for exact source facts and review',()=>{const r=decision({},'record_review');assert.equal(r.resultCode,'needs_review');assert.equal(r.reasons[0].code,'wy.felony1502_record_review');assert(!r.packetPlan);});
for(const [patch,code]of [[{wy1502_completed_deferral:'Yes'},'deferral'],[{case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted'},'disposition'],[{wy1502_multiple:'Yes',wy1502_related:'No'},'grouping'],[{wy1502_program_complete:'No'},'completion'],[{wy1502_restitution_paid:'No'},'completion'],[{wy1502_other_felony:'Yes'},'history'],[{wy1502_prior_relief:'Yes'},'history'],[{wy1502_registration:'Yes'},'history'],[{wy1502_firearm:'Yes'},'firearm'],[{wy1502_terms_ended:{value:'2010-02-30',unknown:false}},'date']])check(code+'/'+JSON.stringify(patch),()=>decision(patch,code));
for(const id of G.WY_1502_FACT_IDS)for(const value of [undefined,'I am not sure',true,['Yes'],{value:'Yes',unknown:true}])check('no inferred fact/'+id+'/'+JSON.stringify(value),()=>{const a={...base,wy1502_multiple:'Yes',wy1502_related:'Yes',[id]:value};const d=G.wy1502Facts(a,process.env.RCAP_EVALUATOR_TODAY);assert.equal(d.code,'missing');assert(d.ids.includes(id));});
check('completed deferral remains an explicit stop even without other facts',()=>{assert.equal(G.wy1502Facts({wy1502_completed_deferral:'Yes'},process.env.RCAP_EVALUATOR_TODAY).code,'deferral');const r=decision({wy1502_completed_deferral:'Yes'},'deferral');assert.equal(r.reasons[0].code,'wy.felony1502_deferral');assert(r.reasons[0].text.includes('not an expungement packet'));});
check('multi-felony relationship conditional; hidden raw answer survives resume',()=>{
 assert(!selectScreeningQuestionIds(profile,pub,base).includes('wy1502_related'));assert(!selectScreeningQuestionIds(profile,pub,{...base,wy1502_multiple:'Yes'}).includes('wy1502_related'));
 assert(!P.factualPathwayCorrectionIds('WY',route,base).includes('wy1502_related'));assert(P.factualPathwayCorrectionIds('WY',route,{...base,wy1502_multiple:'Yes'}).includes('wy1502_related'));
 const a={...base,wy1502_related:'No'};assert.equal(sanitizeResumedAnswersForQuestionIds(parsed.data,a,['ownership_scope']).wy1502_related,'No');assert.equal(G.wy1502Facts(a,process.env.RCAP_EVALUATOR_TODAY).code,'record_review');
});
for(const q of G.WY_1502_QUESTIONS)check('protected record fact/'+q.id,()=>{
 const a={...base,wy1502_multiple:'Yes'};assert(!selectScreeningQuestionIds(profile,pub,a).includes(q.id));assert.equal(q.stage,'packet_information');assert.equal(q.lifecyclePhase,'postpay_packet_field');assert(P.factualPathwayCorrectionIds('WY',route,a).includes(q.id));
 const m=P.protectedPacketInformationModelFor(modelFor(a));assert(m.questions.some(x=>x.id===q.id));assert(q.translations.es.prompt);
 const value=q.type==='single_choice'?'No':{value:'verbatim raw',unknown:false};assert.deepEqual(sanitizeResumedAnswersForQuestionIds(parsed.data,{...a,[q.id]:value},['ownership_scope'])[q.id],value);
 if(q.id==='wy1502_citations')assert(m.questions.find(x=>x.id===q.id).multiline);
 for(const sibling of profile.pathways.filter(p=>p.id!==route))assert(!G.wy1502QuestionApplies(profile,sibling.id,a,q.id));
});
check('guard refuses changed source/spec/own-category',()=>{
 assert(history(profile,route,spec));assert(!history(profile,route,null));const p=structuredClone(profile);p.source.sourceCorpusSha256='changed';assert(!history(p,route,spec));assert(!G.wy1502Context(p,route));const s=structuredClone(spec);s.requiredFacts.push({factId:'offense_category'});assert(!history(profile,route,s));
 const input={jurisdiction:'WY',pathwayId:route,requiredInputIds:['offense_category'],serverFacts:{},screeningAnswers:base,savedAnswers:{},specification:spec,questionById:new Map()};const f=resolvePacketCollection(input).facts[0];assert.equal(f.source,'wy1502_category_history');assert.equal(f.active,false);assert.equal(f.optional,true);assert.notEqual(resolvePacketCollection({...input,recordOwnQuestionIds:new Set(['offense_category'])}).facts[0].source,f.source);
});
// GA-12-M01009 / Q-51b8ea53b02426f2f685: saved labels cannot replace the actual conditional facts.
for(const facts of [{},{wy1502_firearm:'Yes'},{wy1502_firearm:'I am not sure'},{wy1502_multiple:'Yes',wy1502_related:'No'}])check('category values preserve the full factual decision/'+JSON.stringify(facts),()=>{
 const answers={...base,...facts},expected=evalFor(answers).evaluation;
 for(const raw of ['Misdemeanor','Felony','Sex offense','Count 1 theft; count 2 amended',{unknown:true},{value:'Original charge',unknown:false}]){
  const record=modelFor(answers);record.draftSnapshot.packetAnswers.offense_category=structuredClone(raw);
  record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);const before=structuredClone(record);
  assert.deepEqual(P.evaluateProtectedPacketFacts(record.draftSnapshot,undefined,expected.matterId).evaluation,expected);
  assert.deepEqual(record,before);
 }
});
for(const map of maps)for(const raw of ['Weapons offense','W.S. 6-8-101',{unknown:true,value:'Completed deferral'},null,['Old shape']])check('category is literal history/'+map+'/'+JSON.stringify(raw),()=>{
 const record=modelFor(base);record.draftSnapshot[map].offense_category=raw;record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);const before=structuredClone(record),m=P.protectedPacketInformationModelFor(record);assert(m);assert(!m.missingInputIds.includes('offense_category'));const r=P.evaluateProtectedPacketFacts(record.draftSnapshot).evaluation;assert.equal(r.reasons[0].code,'wy.felony1502_record_review');assert.equal(r.paymentAllowed,false);assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,before);
 assert.deepEqual(P.evaluateProtectedPacketFacts(record.draftSnapshot,undefined,'TEST-wy1502').evaluation,evalFor(base).evaluation);
});
check('citation text never classifies an exclusion or grants readiness',()=>{
 for(const citation of ['6-8-101','6-8-102','6-2-301','Title 23 firearm exception','6-3-402\n6-3-402','Amended final judgment under review']){
  const a={...base,wy1502_citations:{value:citation,unknown:false}};const before=structuredClone(a);assert.equal(evalFor(a).evaluation.paymentAllowed,false);assert.equal(G.wy1502Facts(a,process.env.RCAP_EVALUATOR_TODAY).code,'record_review');assert.deepEqual(a,before);
 }
});
check('one ten-year rule is held, no neighboring clock or generic alias',()=>{
 for(const [date,code] of [['2010-10-18','record_review'],['2020-10-18','timing'],['2030-10-18','timing']])decision({wy1502_terms_ended:{value:date,unknown:false}},code);
 decision({sentence_completion_date:'Yes',prior_relief:'Yes',financial_obligations:'Yes',wy1502_terms_ended:undefined},'missing');
 assert(G.WY_1502_COPY.record_review[0].includes('ten-year'));assert(!G.WY_1502_COPY.record_review[0].includes('one-year'));
});
check('actual fulfillment remains STALE without a new record or authority',()=>{const a=F.packetFulfillmentAuthority('WY',route,'checkout creation');assert.equal(a.allowed,false);assert.equal(a.reason,`${key}: STALE. ${key} holds every proof, but the server could not observe the current world to confirm they still hold.`);});
check('existing WY1401/1501 public controls remain registered',()=>{for(const id of [...WY_1401_NEW_IDS,...WY_1501_FACT_IDS])assert(pub.questions.some(q=>q.id===id),id);});
check('new facts do not select or change sibling WY routes',()=>{
 const witnesses=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures.filter(w=>w.jurisdiction==='WY'&&w.pathwayKey!==key);
 for(const w of witnesses){const before=evalFor(w.answers).evaluation;const a={...w.answers,...Object.fromEntries(G.WY_1502_FACT_IDS.map(id=>[id,base[id]]))};assert.deepEqual(evalFor(a).evaluation,before,w.pathwayKey);assert(!selectScreeningQuestionIds(profile,pub,a).some(id=>G.WY_1502_FACT_IDS.includes(id)),w.pathwayKey);}
});
for(const id of ['first','second'])records.set('synthetic-'+id,modelFor(base));
// Exact synthetic unverified draft executed at 9af670541; original bytes are preserved on read/no-op.
const priorDraft={"status":"unverified","revision":0,"draftHash":"7edec7e4e44e9d15c11fbf253c568998f6ecdc95eb6c04a7b5a2993c8c1e780f","draftSnapshot":{"capturedAt":"2026-10-18T00:00:00Z","deferralComponentIds":[],"dependencies":{},"jurisdiction":"WY","packetAnswers":{},"packetFamilyIdentifiers":{"mode":"state_specific_custom_packet_from_source_rules","sourceFormIds":[]},"packetPlan":{"formMappingStatus":"custom_or_manual_mapping_required","mode":"state_specific_custom_packet_from_source_rules","packetReadyWhen":["backend result is packet_ready or packet_ready_with_caution","every source-defined pathway fact is answered","all waiting and completion conditions are satisfied","no exclusion, ambiguity, or required-review flag remains","the selected form revision and filing location pass source-freshness checks"],"pathwayId":"felony-conviction-expungement-w-s-7-13-1502","requiredInputIds":["age_at_offense","case_outcome","charge","contact_information","court","disposition_date","financial_obligations","jurisdiction","offense_category","offense_level","pardon_status","participant_full_legal_name","pathway_id","pending_cases","prior_relief","sentence_completion_date","trafficking_status","mailing_address","phone_number","email_address","date_of_birth","other_felony_history","statutory_exclusion_review","service_details"],"sourceFormIds":[],"sourceRuleRefs":["section:83-119"]},"packetType":"custom_pleading","pathwayId":"felony-conviction-expungement-w-s-7-13-1502","paymentAllowed":true,"prefilledAnswers":{"age_at_offense":"30","case_outcome":"Felony conviction","financial_obligations":"Yes","offense_level":"Felony","pardon_status":"No","pending_cases":"No","prior_relief":"Yes","sentence_completion_date":"Yes","trafficking_status":"No"},"profileAuthorityFingerprint":"7e725ca292d4e7d9b8d076a740abfe5462a4d678ba0b8cb849f45d7faf69dc0e","profileSourceFingerprint":"8be51e84e828de3bece45e51b68744cc68ba6662c7db7991bba8d70a565e00aa","profileVersion":"2026-06-19-source-conversion-1","requiredInputIds":["age_at_offense","case_outcome","charge","contact_information","court","disposition_date","financial_obligations","jurisdiction","offense_category","offense_level","pardon_status","participant_full_legal_name","pathway_id","pending_cases","prior_relief","sentence_completion_date","trafficking_status","mailing_address","phone_number","email_address","date_of_birth","other_felony_history","statutory_exclusion_review","service_details"],"resultCode":"packet_ready_with_caution","schemaVersion":"expungement-ai/protected-packet-draft/v1","screeningAnswers":{"court_requirements_completed":"yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","ownership_scope":"Yes","possible_pathway_context":"Felony conviction expungement - W.S. 7-13-1502","record_documents":"Yes","resolved_timing_bucket":"gt_10_years","special_preconditions_confirmed":"Yes"},"selectedTrackId":null,"serverFacts":{"jurisdiction":"WY","pathway_id":"felony-conviction-expungement-w-s-7-13-1502"},"treatmentClassification":null}};
// GA-12 review N2: retain the exact historical draft while presenting its current hold.
const {decorateBriefcaseItemForPresentationWithDependencies:decorateLegacy}=await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
const presentLegacy=record=>decorateLegacy({consumerAuthUserId:'synthetic-owner',item:{id:'synthetic-legacy-card',jurisdiction:'WY',artifactRefs:{}}},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:record}),readTrustedPendingSource:async()=>({ok:false,reason:'synthetic_absent'}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:request=>evaluate(request),readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
for(const value of ['No','Yes',true,' Yes',{value:'Yes'},{value:'Yes',unknown:false}]){
 const record=structuredClone(priorDraft);record.draftSnapshot.prefilledAnswers.trafficking_status=value;record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);const before=structuredClone(record);
 const view=await presentLegacy(record);
 check('legacy card opens held without changing saved answers/'+JSON.stringify(value),()=>{
  assert.equal(view.authorityStatus,'protected_draft');assert.equal(view.resultCode,'needs_review');assert.notEqual(view.verificationStatus,'verified');assert.equal(Object.values(view.commercialActions).some(Boolean),false);
  assert.deepEqual(record,before);assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,before);
 });
}
for(const variant of ['wrong-hash','wrong-profile','verified']){
 const record=structuredClone(priorDraft);
 if(variant==='wrong-hash')record.draftHash='changed';
 if(variant==='wrong-profile'){record.draftSnapshot.profileAuthorityFingerprint='changed';record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);}
 if(variant==='verified')record.status='verified';
 const view=await presentLegacy(record);check('card successor refuses '+variant,()=>assert.equal(view.authorityStatus,'unavailable'));
}

check('legacy paid-ready trafficking draft opens held and no-op preserves exact history',()=>{
 for(const value of ['Yes',true,' Yes']){
  const record=structuredClone(priorDraft);record.draftSnapshot.prefilledAnswers.trafficking_status=value;
  record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);const before=structuredClone(record);
  const model=P.protectedPacketInformationModelFor(record);assert(model);assert(!model.packetPlan);
  const current=P.evaluateProtectedPacketFacts(record.draftSnapshot).evaluation;
  assert.equal(current.resultCode,'needs_review');assert.equal(current.paymentAllowed,false);assert.equal(current.reasons[0].code,'wy.felony1502_trafficking');
  assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,before);assert.deepEqual(record,before);
 }
});

check('old ready predecessor readable; no-op preserves every byte',()=>{assert.equal(P.protectedPacketDraftHash(priorDraft.draftSnapshot),priorDraft.draftHash);assert(P.protectedPacketInformationModelFor(priorDraft));assert.deepEqual(P.packetInformationPatch({protectedVerification:priorDraft,answers:{}}).protectedTransition.nextVerification,priorDraft);});
check('old ready recovery refuses tampering and verified status',()=>{const s=priorDraft.draftSnapshot,a=P.evaluateProtectedPacketFacts(s);assert(P.wyoming1502HeldDraftSuccessor(s,a,'unverified'));assert.equal(P.wyoming1502HeldDraftSuccessor(s,a,'verified'),null);for(const[k,v]of Object.entries({profileAuthorityFingerprint:'changed',profileSourceFingerprint:'changed',requiredInputIds:[],packetPlan:null,selectedTrackId:'invented',serverFacts:{jurisdiction:'WY'}})){const bad=structuredClone(s);bad[k]=v;assert.equal(P.wyoming1502HeldDraftSuccessor(bad,a,'unverified'),null,k);}const bad=structuredClone(s);bad.packetAnswers.wy1502_firearm='No';assert.equal(P.wyoming1502HeldDraftSuccessor(bad,a,'unverified'),null);});
const priorWitness={"status":"unverified","revision":0,"draftHash":"c564451c5ed4da70de3ea8df59b0cd7fcaed43b4e31ccbf0355f103f7f312a5a","draftSnapshot":{"capturedAt":"2026-10-18T00:00:00Z","deferralComponentIds":[],"dependencies":{},"jurisdiction":"WY","packetAnswers":{},"packetFamilyIdentifiers":{"mode":"state_specific_custom_packet_from_source_rules","sourceFormIds":[]},"packetPlan":{"formMappingStatus":"custom_or_manual_mapping_required","mode":"state_specific_custom_packet_from_source_rules","packetReadyWhen":["backend result is packet_ready or packet_ready_with_caution","every source-defined pathway fact is answered","all waiting and completion conditions are satisfied","no exclusion, ambiguity, or required-review flag remains","the selected form revision and filing location pass source-freshness checks"],"pathwayId":"felony-conviction-expungement-w-s-7-13-1502","requiredInputIds":["age_at_offense","case_outcome","charge","contact_information","court","disposition_date","financial_obligations","jurisdiction","offense_category","offense_level","pardon_status","participant_full_legal_name","pathway_id","pending_cases","prior_relief","sentence_completion_date","trafficking_status","mailing_address","phone_number","email_address","date_of_birth","other_felony_history","statutory_exclusion_review","service_details"],"sourceFormIds":[],"sourceRuleRefs":["section:83-119"]},"packetType":"custom_pleading","pathwayId":"felony-conviction-expungement-w-s-7-13-1502","paymentAllowed":false,"prefilledAnswers":{"age_at_offense":"30","case_outcome":"Arrest or citation with no charge filed","financial_obligations":"Yes","offense_level":"Misdemeanor","pardon_status":"No","pending_cases":"No","prior_relief":"Yes","sentence_completion_date":"Yes","trafficking_status":"No"},"profileAuthorityFingerprint":"7e725ca292d4e7d9b8d076a740abfe5462a4d678ba0b8cb849f45d7faf69dc0e","profileSourceFingerprint":"8be51e84e828de3bece45e51b68744cc68ba6662c7db7991bba8d70a565e00aa","profileVersion":"2026-06-19-source-conversion-1","requiredInputIds":["age_at_offense","case_outcome","charge","contact_information","court","disposition_date","financial_obligations","jurisdiction","offense_category","offense_level","pardon_status","participant_full_legal_name","pathway_id","pending_cases","prior_relief","sentence_completion_date","trafficking_status","mailing_address","phone_number","email_address","date_of_birth","other_felony_history","statutory_exclusion_review","service_details"],"resultCode":"needs_review","schemaVersion":"expungement-ai/protected-packet-draft/v1","screeningAnswers":{"court_requirements_completed":"yes","jurisdiction_scope":"State or local","new_convictions_during_waiting_period":"No","ownership_scope":"Yes","possible_pathway_context":"Felony conviction expungement - W.S. 7-13-1502","record_documents":"Yes","resolved_timing_bucket":"gt_10_years","special_preconditions_confirmed":"Yes"},"selectedTrackId":null,"serverFacts":{"jurisdiction":"WY","pathway_id":"felony-conviction-expungement-w-s-7-13-1502"},"treatmentClassification":null}};
check('original held witness remains readable without rewriting its history',()=>{
 assert.equal(P.protectedPacketDraftHash(priorWitness.draftSnapshot),priorWitness.draftHash);const before=structuredClone(priorWitness);assert(P.protectedPacketInformationModelFor(priorWitness));assert.deepEqual(P.packetInformationPatch({protectedVerification:priorWitness,answers:{}}).protectedTransition.nextVerification,before);
 const patch=P.packetInformationPatch({protectedVerification:priorWitness,answers:{wy1502_completed_deferral:'Yes'}});assert(patch);const next=patch.protectedTransition.nextVerification;assert.equal(next.draftSnapshot.paymentAllowed,false);for(const map of maps)for(const[k,v]of Object.entries(before.draftSnapshot[map]))assert.deepEqual(next.draftSnapshot[map][k],v);assert.deepEqual(priorWitness,before);
});
// Run the real HTTP handler with isolated in-memory auth/store boundaries.
// No session, consent, entitlement, network or database fixture is created.
let authenticated = true, verified = true, owner = 'synthetic-wy-owner';
let saves = 0;
const itemFor = id => ({ id, jurisdiction: 'WY', artifactRefs: {} });
globalThis.__wy1502Transport = {
  getRcapBriefcaseAuthState: async () => ({ isAuthenticated: authenticated, isVerified: verified, userId: owner }),
  getBriefcaseItem: async (user, id) => user === 'synthetic-wy-owner' && records.has(id) ? itemFor(id) : null,
  readProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId }) => {
    assert.equal(consumerAuthUserId, 'synthetic-wy-owner');
    return { ok: true, value: structuredClone(records.get(briefcaseItemId)) };
  },
  persistProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId, transition }) => {
    assert.equal(consumerAuthUserId, 'synthetic-wy-owner');
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
  source = source.replace(pattern, bindings.map(name => `const ${name}=(...args:unknown[])=>(globalThis as any).__wy1502Transport.${name}(...args);`).join('\n'));
}
register('data:text/javascript,' + encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),
  { data: { url: apiUrl, source: ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText } });
const API = await import(apiUrl);
const post = (id, answers, extra = {}) => API.POST(new Request(`http://isolated.invalid/api/expungement-ai/briefcase/${id}/packet-information`,
  { method: 'POST', body: JSON.stringify({ expectedRevision: records.get(id).revision, answers, ...extra }) }),
{ params: Promise.resolve({ itemId: id }) });
for(const [id,original]of [...records]){
 const stored=structuredClone(original);stored.draftSnapshot.prefilledAnswers.offense_category={value:'Old weapons category',unknown:true};stored.draftSnapshot.packetAnswers.offense_category='Old final category';stored.draftHash=P.protectedPacketDraftHash(stored.draftSnapshot);records.set(id,stored);
 const others=[...records].filter(([k])=>k!==id).map(([k,v])=>[k,structuredClone(v)]);
 let response=await post(id,{});httpCases++;check(id+' HTTP no-op',()=>{assert.equal(response.status,200);assert.deepEqual(records.get(id),stored);});
 response=await post(id,{wy1502_related:'Yes'});httpCases++;const denied=await response.json();check(id+' premature conditional fact refused',()=>{assert.equal(response.status,422);assert.equal(denied.error,'invalid_packet_answers');assert.deepEqual(records.get(id),stored);});
 for(const[answers,expected]of [[{wy1502_firearm:'Yes'},'firearm'],[{wy1502_firearm:'No'},'record_review'],[{wy1502_multiple:'Yes'},'missing'],[{wy1502_related:'No'},'grouping'],[{wy1502_multiple:'No'},'record_review'],[{wy1502_completed_deferral:'Yes'},'deferral'],[{wy1502_completed_deferral:'No'},'record_review'],[{wy1502_citations:{value:'6-8-101\n6-3-402 (amended)',unknown:false}},'record_review']]){
  const before=structuredClone(records.get(id));response=await post(id,answers);httpCases++;const body=await response.json();check(id+' amendment '+JSON.stringify(answers),()=>{assert.equal(response.status,200);const s=records.get(id).draftSnapshot;for(const[k,v]of Object.entries(answers))assert.deepEqual(s.packetAnswers[k],v);const r=P.evaluateProtectedPacketFacts(s).evaluation;assert.equal(r.reasons[0].code,'wy.felony1502_'+expected);assert.equal(r.paymentAllowed,false);assert.equal(body.readyToGenerate,false);for(const map of maps)for(const[k,v]of Object.entries(before.draftSnapshot[map]))if(!Object.hasOwn(answers,k))assert.deepEqual(s[map][k],v,map+'/'+k);for(const[k,v]of others)assert.deepEqual(records.get(k),v);});
 }
 response=await post(id,{wy1502_firearm:'I am not sure'});httpCases++;check(id+' unknown held',()=>{assert.equal(response.status,200);assert.equal(records.get(id).draftSnapshot.packetAnswers.wy1502_firearm,'I am not sure');assert.equal(P.evaluateProtectedPacketFacts(records.get(id).draftSnapshot).evaluation.paymentAllowed,false);});
 response=await post(id,{wy1502_firearm:'No',offense_category:{value:'Amended literal history',unknown:false}});httpCases++;check(id+' category amendment archives raw copies',()=>{assert.equal(response.status,200);const s=records.get(id).draftSnapshot;for(const map of ['prefilledAnswers','packetAnswers']){const h=s.dependencies.semanticAnswerHistory.find(h=>h.factId==='offense_category'&&h.source===map);assert(h);assert.deepEqual(h.value,stored.draftSnapshot[map].offense_category);}});
 const stable=structuredClone(records.get(id)),savesBefore=saves;
 for(const[kind,status,error]of [['stale',409,'revision_conflict'],['anonymous',401,'auth_required'],['unverified',403,'verified_account_required'],['other-owner',404,'matter_not_found']]){authenticated=kind!=='anonymous';verified=kind!=='unverified';owner=kind==='other-owner'?'another-owner':'synthetic-wy-owner';response=await post(id,{wy1502_firearm:'Yes'},kind==='stale'?{expectedRevision:0}:{});httpCases++;const body=await response.json();check(id+' '+kind,()=>{assert.equal(response.status,status);assert.equal(body.error,error);assert.deepEqual(records.get(id),stable);assert.equal(saves,savesBefore);});}
 authenticated=true;verified=true;owner='synthetic-wy-owner';
}
records.set('synthetic-prior',structuredClone(priorDraft));
let response=await post('synthetic-prior',{});httpCases++;check('old ready HTTP no-op',()=>{assert.equal(response.status,200);assert.deepEqual(records.get('synthetic-prior'),priorDraft);});
response=await post('synthetic-prior',{wy1502_completed_deferral:'Yes'});httpCases++;check('old ready saved correction withdraws readiness, retaining original maps',()=>{assert.equal(response.status,200);const next=records.get('synthetic-prior').draftSnapshot;assert.equal(next.resultCode,'needs_review');assert.equal(next.paymentAllowed,false);assert.equal(next.packetAnswers.wy1502_completed_deferral,'Yes');assert.equal(P.evaluateProtectedPacketFacts(next).evaluation.reasons[0].code,'wy.felony1502_deferral');for(const map of maps)for(const[k,v]of Object.entries(priorDraft.draftSnapshot[map]))assert.deepEqual(next[map][k],v);});
delete globalThis.__wy1502Transport;
console.log(JSON.stringify({status:'PASS',checks,httpCases,originalIds:['Q-51b8ea53b02426f2f685','QD-bd6b15fff22cbe1501cb'],route:key,limits:['Every case remains held for exact exclusion/timing/court review; STALE authority unchanged.','No WY1401/1501 meaning transfer, document regeneration, service or hosted call.','Draft EN/ES needs qualified review.']}));
