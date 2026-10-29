import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {questionAnswerState}=await import('../src/lib/expungement-ai/question-answer-state.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const I=await import('../src/lib/expungement-ai/research115-intake.ts');
const {resolveRuntimeText}=await import('../src/lib/expungement-ai/localization.ts');
const {northDakotaNonconvictionDocumentFromSnapshot:map,NorthDakotaNonconvictionFactsError:FactError}=await import('../src/lib/rcap/documents/north-dakota-nonconviction-document-facts.ts');
const {getCurrentFulfillmentRecord}=await import('../src/lib/rcap/fulfillment/grade-a-registry.ts');
const {COMMERCIAL_ADMISSION_POINTS,admitCommercialAction}=await import('../src/lib/rcap/fulfillment/grade-a-authority.ts');
const frozen=JSON.parse(fs.readFileSync(new URL('./fixtures/north-dakota-nonconviction-official-frozen-input.json',import.meta.url)));
const route='ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05',pathway=route.slice(3),asOf='2026-10-29',profile=getProfileByJurisdiction('ND');
const publicProfile=projectPublicProfile(profile),publicQuestions=new Map(publicProfile.questions.map(q=>[q.id,q]));
// Transparent new synthetic public witness: exact R053 is absent from both old witness files.
// All keys/options are checked against the real public surface. There is no private route/track input.
// 2018-09-10 to 2026-10-29 is eight years, so the retained public bucket is years_7_to_10.
const publicAnswers={ownership_scope:'Yes',jurisdiction_scope:'State or local',case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted',offense_level:'Misdemeanor',possible_pathway_context:'Non-conviction court-record closing under N.D.C.C. § 12-60.1-05',disposition_date:'2018-09-10',resolved_timing_bucket:'years_7_to_10',sentence_completion_date:'Yes',financial_obligations:'Yes',pending_cases:'No',new_convictions_during_waiting_period:'No',special_preconditions_confirmed:'Yes'};
const caseIds=['nd_all_charges_nonconviction','nd_qualifying_disposition_date','nd_dismissal_part_of_plea_agreement','nd_not_fit_to_proceed','nd_lack_of_criminal_responsibility','nd_case_appealed'];
const caseFacts=Object.fromEntries(caseIds.map(id=>[id,frozen.snapshot.packetAnswers[id]])),courtFacts={nd_nonconviction_court_type:'district'};
const docIds=['nd_nonconviction_county','case_identifier','nd_nonconviction_street_address','nd_nonconviction_city_state_zip','nd_nonconviction_phone','nd_nonconviction_email','nd_nonconviction_judicial_district'];
const docFacts=Object.fromEntries(['participant_full_legal_name',...docIds].map(id=>[id,frozen.snapshot.packetAnswers[id]]));
let checks=0;
function check(label,fn){fn();checks++;console.log('PASS '+label);}
function boundary(name,detail,condition){if(!condition){console.error('FIRST_BOUNDARY '+JSON.stringify({name,...detail}));throw new Error(name);}}
const snap=v=>v.draftSnapshot??v.snapshot;
const model=v=>P.protectedPacketInformationModelFor(v);
const facts=m=>({...m.screeningAnswers,...m.prefilledAnswers,...m.packetAnswers});
function seed(answers=publicAnswers,state='ND'){
 const p=getProfileByJurisdiction(state),pub=new Set(projectPublicProfile(p).questions.map(q=>q.id));
 for(const id of Object.keys(answers))assert(pub.has(id),'Only actual public IDs allowed: '+id);
 const a=evaluate({jurisdiction:state,profileVersion:p.profileVersion,matterId:'SYNTHETIC-'+state+'-PROTECTED',answers});
 if(state==='ND')boundary('public_route_selection',{actual:a.evaluation.pathwayId,result:a.evaluation.resultCode,missing:a.evaluation.missingQuestionIds},a.evaluation.pathwayId===pathway);
 const s=P.protectedPacketDraftSeedFromAuthoritative({authoritative:a,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-29T12:00:00Z'});
 boundary('protected_seed',{state,result:a.evaluation.resultCode},!!s);
 const v={status:'unverified',reason:'synthetic_public_witness',revision:0,draftHash:s.hash,draftSnapshot:s.snapshot};
 boundary('initial_editor',{state,result:a.evaluation.resultCode,plan:s.snapshot.packetPlan?.mode},!!model(v));
 return{v,a};
}
function save(previous,answers){
 const before=JSON.stringify(previous),patch=P.packetInformationPatch({protectedVerification:previous,answers});
 boundary('actual_protected_save',{result:snap(previous).resultCode,keys:Object.keys(answers),patchKeys:patch&&Object.keys(patch)},!!patch?.protectedTransition);
 assert.equal(JSON.stringify(previous),before,'Save reducer must not mutate its original protected record');
 const next=patch.protectedTransition.nextVerification,m=model(next);
 boundary('editor_after_save',{result:snap(next).resultCode,plan:snap(next).packetPlan?.mode,keys:Object.keys(answers)},!!m);
 assert.equal(snap(next).paymentAllowed,false);assert.notEqual(next.status,'verified');
 return next;
}
function full(answers=publicAnswers){let v=seed(answers).v;v=save(v,caseFacts);v=save(v,courtFacts);return save(v,docFacts);}
// This is only a deterministic DTO clock. It creates no final verification or record provenance.
function mapped(v){return map({...snap(v),verifiedAt:frozen.snapshot.verifiedAt},frozen.matterId);}
for(const[id,value]of Object.entries(publicAnswers))check('actual public control contract '+id,()=>assert.equal(questionAnswerState(publicQuestions.get(id),value,asOf),'known_valid'));
const start=seed();
check('public witness selects exact R053 and exposes six actual protected controls',()=>{assert.equal(start.a.evaluation.pathwayId,pathway);const m=model(start.v);for(const id of caseIds)assert(m.questions.some(q=>q.id===id));assert(!m.questions.some(q=>q.id==='nd_nonconviction_court_type'));for(const id of docIds.filter(id=>id.startsWith('nd_')))assert(!m.questions.some(q=>q.id===id));});
const six=save(start.v,caseFacts),sixModel=model(six);
check('six saved facts expose court discriminator without inventing district',()=>{assert(sixModel.questions.some(q=>q.id==='nd_nonconviction_court_type'));const gate=I.research115Eligibility(route,facts(sixModel),asOf);assert.equal(gate.status,'unknown');assert(gate.missingFactIds.includes('nd_nonconviction_court_type'));assert(!Object.hasOwn(snap(six).packetAnswers,'nd_nonconviction_court_type'));});
const district=save(six,courtFacts),districtModel=model(district);
check('district selection exposes exact official document controls and closed14-ID history',()=>{assert.equal(I.research115PacketFactIds(route,facts(districtModel),true).length,14);for(const id of docIds)assert(districtModel.questions.some(q=>q.id===id));assert.equal(districtModel.questions.find(q=>q.id==='nd_nonconviction_judicial_district').required,false);});
const complete=save(district,docFacts),completeModel=model(complete);
check('actual saved owner facts map exactly to independent official frozen expectations',()=>{assert.deepEqual(mapped(complete).facts,frozen.expected.facts);assert.equal(I.research115Eligibility(route,facts(completeModel),asOf).status,'qualifying');assert.equal(snap(complete).paymentAllowed,false);assert.notEqual(complete.status,'verified');});
const generic=['age_at_offense','charge','contact_information','court','criminal_history','financial_obligations','offense_category','pardon_status','prior_relief','record_type','residency_or_location','sentence_completion_date','trafficking_status'];
const financialObservations=[];
for(const[label,value]of[['No','No'],['unknown','I am not sure'],['absent',undefined]]){
 const answers={...publicAnswers};if(value===undefined)delete answers.financial_obligations;else answers.financial_obligations=value;
 const v=full(answers),m=model(v),a=P.evaluateProtectedPacketFacts(snap(v));financialObservations.push({label,result:snap(v).resultCode,plan:snap(v).packetPlan?.mode,missing:m.missingInputIds,financialRequired:m.questions.find(q=>q.id==='financial_obligations')?.required,gate:I.research115Eligibility(route,facts(m),asOf).status,reasons:a?.evaluation?.reasons?.map(r=>r.code)});
}
console.log('ACTUAL_PRE_BRANCH '+JSON.stringify({result:snap(complete).resultCode,plan:snap(complete).packetPlan?.mode,required:snap(complete).requiredInputIds,missing:completeModel.missingInputIds,expectedComponents:completeModel.expectedComponents,financial:financialObservations}));
check('adopted pre2025 petition is an official draft rather than automatic guidance',()=>{boundary('pre2025_application_classification',{result:snap(complete).resultCode,plan:snap(complete).packetPlan?.mode,missing:completeModel.missingInputIds},snap(complete).resultCode!=='guidance_only'&&snap(complete).packetPlan?.mode==='official_form_overlay_or_source_form_set');});
check('unrelated generic metadata does not block completed official participant facts',()=>{assert.deepEqual(completeModel.missingInputIds.filter(id=>generic.includes(id)),[]);assert.equal(completeModel.expectedComponents.length,3);assert(!completeModel.expectedComponents.some(s=>/custom|composed|service certificate/i.test(s)));});
for(const obs of financialObservations)check('no statutory debt barrier for '+obs.label,()=>{assert.equal(obs.gate,'qualifying');assert.notEqual(obs.result,'not_yet');assert(!obs.missing.includes('financial_obligations'));assert.notEqual(obs.financialRequired,true);});
for(const[id,value,status]of[
 ['nd_dismissal_part_of_plea_agreement','Yes','excluded'],['nd_not_fit_to_proceed','Yes','excluded'],['nd_lack_of_criminal_responsibility','Yes','excluded'],['nd_case_appealed','Yes','excluded'],['nd_all_charges_nonconviction','No','excluded'],['nd_nonconviction_court_type','municipal','attorney_review'],['nd_nonconviction_court_type',{unknown:true,value:'district'},'unknown'],['nd_qualifying_disposition_date','2025-02-30','unknown'],['nd_qualifying_disposition_date','2030-01-01','unknown'],['nd_qualifying_disposition_date',{unknown:true,value:'2018-09-10'},'unknown'],['nd_qualifying_disposition_date','2025-08-01','guidance']
]){
 const v=save(complete,{[id]:value}),m=model(v),gate=I.research115Eligibility(route,facts(m),asOf);
 check('actual saved branch and excluded/unknown separation '+id+JSON.stringify(value),()=>{assert.equal(gate.status,status);assert.equal(snap(v).paymentAllowed,false);assert.deepEqual(m.expectedComponents,[]);if(status==='guidance')assert.equal(snap(v).resultCode,'guidance_only');if(status==='excluded')assert.equal(snap(v).resultCode,'likely_not_eligible');assert(!m.questions.some(q=>q.id==='nd_nonconviction_phone'));assert(I.research115PacketFactIds(route,facts(m),true).includes('nd_nonconviction_phone'));});
 check('actual bilingual outcome '+id+JSON.stringify(value),()=>assert.equal(resolveRuntimeText('es',gate.reason),gate.reasonEs));
}
const combined=save(complete,{nd_case_appealed:'Yes',nd_not_fit_to_proceed:'Yes'});
check('combined-exclusion Spanish retains both source meanings',()=>{const gate=I.research115Eligibility(route,facts(model(combined)),asOf);assert.equal(resolveRuntimeText('es',gate.reason),gate.reasonEs);});
for(const id of['participant_full_legal_name','nd_nonconviction_county','case_identifier']){
 const raw={unknown:true,value:docFacts[id]},v=save(complete,{[id]:raw}),m=model(v);
 check('actual unknown document fact remains unknown and blocks completion '+id,()=>{assert.deepEqual(snap(v).packetAnswers[id],raw);assert(m.missingInputIds.includes(id));assert.notEqual(m.stage,'ready_to_generate');assert.throws(()=>mapped(v),e=>e instanceof FactError&&e.code==='unknown_document_fact'&&e.factIds.includes(id));});
}
let missingDate=seed().v;missingDate=save(missingDate,Object.fromEntries(Object.entries(caseFacts).filter(([id])=>id!=='nd_qualifying_disposition_date')));
check('public timing date is not silently reused as verified protected order date',()=>{const m=model(missingDate),gate=I.research115Eligibility(route,facts(m),asOf);assert.equal(gate.status,'unknown');assert(gate.missingFactIds.includes('nd_qualifying_disposition_date'));assert(!Object.hasOwn(snap(missingDate).packetAnswers,'nd_qualifying_disposition_date'));});
let optional=complete;
for(const id of['nd_nonconviction_street_address','nd_nonconviction_city_state_zip','nd_nonconviction_phone','nd_nonconviction_email','nd_nonconviction_judicial_district'])optional=save(optional,{[id]:{unknown:true,value:docFacts[id]}});
check('optional contacts and district do not become universal prepay requirements',()=>{const m=model(optional);for(const id of['nd_nonconviction_street_address','nd_nonconviction_city_state_zip','nd_nonconviction_phone','nd_nonconviction_email','nd_nonconviction_judicial_district']){assert.equal(m.questions.find(q=>q.id===id).required,false);assert(!m.missingInputIds.includes(id));}assert.deepEqual(Object.keys(mapped(optional).facts).sort(),['matter.case_number','matter.county','participant.full_legal_name']);});
const poisoned=structuredClone(complete);snap(poisoned).prefilledAnswers.nd_nonconviction_county='Burleigh';poisoned.draftHash=P.protectedPacketDraftHash(snap(poisoned));
check('conflicting raw document sources cannot pass strict native mapper',()=>assert.throws(()=>mapped(poisoned),e=>e instanceof FactError&&e.code==='conflicting_fact'));
const forged=structuredClone(complete);snap(forged).profileSourceFingerprint='forged';forged.draftHash=P.protectedPacketDraftHash(snap(forged));
check('foreign source provenance cannot reopen protected editor',()=>assert.equal(model(forged),null));
const authorityAttempt=save(complete,{jurisdiction:'AK',pathway_id:'executive-pardon-backstop',profileSourceFingerprint:'forged',paymentAllowed:true,legalSignoffStatus:'signed_off',verified_record:true,status:'verified',consumer_auth_user_id:'another-user',storage_path:'private/foreign.pdf'});
check('actual save drops approval/provenance/crossroute/private keys',()=>{assert.equal(snap(authorityAttempt).jurisdiction,'ND');assert.equal(snap(authorityAttempt).pathwayId,pathway);for(const id of['paymentAllowed','legalSignoffStatus','verified_record','status','consumer_auth_user_id','storage_path','profileSourceFingerprint'])assert(!Object.hasOwn(snap(authorityAttempt).packetAnswers,id));assert.notEqual(authorityAttempt.status,'verified');assert.equal(snap(authorityAttempt).paymentAllowed,false);});
const ownerStop=evaluate({jurisdiction:'ND',profileVersion:profile.profileVersion,matterId:'SYNTHETIC-ND-OWNER-STOP',answers:{...publicAnswers,ownership_scope:'No'}});
check('existing ownership hardstop cannot be relaxed by qualifying native facts',()=>{assert.equal(ownerStop.evaluation.resultCode,'hard_stop');assert.equal(ownerStop.evaluation.paymentAllowed,false);assert.equal(I.constrainResearch115Evaluation(ownerStop,route,{...caseFacts,...courtFacts,...docFacts},asOf),ownerStop);});
const repeat=save(complete,{...caseFacts,...courtFacts,...docFacts});
check('repeated identical save consumes no authority and preserves frozen native facts',()=>{assert.deepEqual(mapped(repeat).facts,frozen.expected.facts);assert.equal(snap(repeat).paymentAllowed,false);assert.notEqual(repeat.status,'verified');});
check('all actual commercial admission points remain denied',()=>{const record=getCurrentFulfillmentRecord(route);for(const admissionPoint of COMMERCIAL_ADMISSION_POINTS){const d=admitCommercialAction({admissionPoint,request:{routeId:route,jurisdiction:'ND',packetFamilyId:null},record,observation:null});assert.equal(d.admitted,false,admissionPoint);assert.equal(d.authority.authorized,false,admissionPoint);}});

// These are observed old public-flow drafts, frozen before the branch correction.
// They are local fictional records, never customer/DB records or payment authority.
const predecessors=JSON.parse(fs.readFileSync(new URL('./fixtures/north-dakota-nonconviction-pre-correction-drafts.json',import.meta.url)));
assert.equal(predecessors.sourceCommit,'8eec4a9eb');
assert.equal(predecessors.classification,'LOCAL_FICTIONAL_PRE_CORRECTION_DRAFTS_NOT_AUTHORIZED_CUSTOMER_RECORDS');
assert.equal(predecessors.predecessorRecords.length,4);
for(const entry of predecessors.predecessorRecords){
 const old=entry.verification,before=JSON.stringify(old),m=model(old);
 check('actual old '+entry.label+' draft reads as exact held official successor without mutation',()=>{
  assert(m);assert.equal(m.resultCode,'needs_review');assert.equal(m.packetPlan.mode,'official_form_overlay_or_source_form_set');
  assert.equal(m.requiredInputIds.length,10);assert.deepEqual(m.missingInputIds,[]);assert.equal(m.stage,'facts_complete');
  for(const key of['screeningAnswers','prefilledAnswers','packetAnswers','serverFacts'])assert.deepEqual(m[key],snap(old)[key]);
  assert.equal(JSON.stringify(old),before);assert.equal(snap(old).resultCode,'guidance_only');
  assert.equal(old.status,'unverified');assert.equal(snap(old).packetPlan.requiredInputIds.length,19);
 });
 const noop=save(old,{nd_nonconviction_county:frozen.snapshot.packetAnswers.nd_nonconviction_county});
 check('actual old '+entry.label+' semantic no-op preserves the original record bytes',()=>assert.deepEqual(noop,old));
 const correctedPhone='701-555-0199',next=save(old,{nd_nonconviction_phone:correctedPhone});
 check('actual old '+entry.label+' explicit correction persists held official successor and preserves other raw facts',()=>{
  assert.equal(snap(next).resultCode,'needs_review');assert.equal(snap(next).packetType,'official_pdf_overlay');
  assert.equal(snap(next).packetPlan.mode,'official_form_overlay_or_source_form_set');assert.equal(snap(next).requiredInputIds.length,10);
  assert.deepEqual(snap(next).packetFamilyIdentifiers,{mode:snap(next).packetPlan.mode,sourceFormIds:snap(next).packetPlan.sourceFormIds});
  for(const key of['screeningAnswers','prefilledAnswers','serverFacts'])assert.deepEqual(snap(next)[key],snap(old)[key]);
  assert.deepEqual(snap(next).packetAnswers,{...snap(old).packetAnswers,nd_nonconviction_phone:correctedPhone});
  for(const key of['profileVersion','profileSourceFingerprint','profileAuthorityFingerprint','selectedTrackId','treatmentClassification','deferralComponentIds'])assert.deepEqual(snap(next)[key],snap(old)[key]);
  assert.deepEqual(mapped(next).facts,{...frozen.expected.facts,'participant.phone':correctedPhone});assert.deepEqual(model(next).missingInputIds,[]);
  assert.equal(JSON.stringify(old),before);assert.equal(next.status,'unverified');assert.equal(snap(next).paymentAllowed,false);
 });
}
const oldBase=predecessors.predecessorRecords[0].verification;
for(const[label,mutate]of[
 ['source fingerprint',v=>{snap(v).profileSourceFingerprint='foreign-source';}],
 ['owner authority fingerprint',v=>{snap(v).profileAuthorityFingerprint='foreign-owner-decision';}],
 ['verified record',v=>{v.status='verified';}],
 ['invalidated record',v=>{v.status='invalidated';}],
 ['payment authority',v=>{snap(v).paymentAllowed=true;}],
 ['arbitrary old plan mode',v=>{snap(v).packetPlan.mode='court_filing_packet';snap(v).packetFamilyIdentifiers.mode='court_filing_packet';}],
 ['coordinated extra required ID',v=>{snap(v).requiredInputIds.push('invented_fact');snap(v).packetPlan.requiredInputIds.push('invented_fact');}],
 ['changed official source pin',v=>{snap(v).packetPlan.sourceFormIds=['ND:foreign-form:invalid'];snap(v).packetFamilyIdentifiers.sourceFormIds=['ND:foreign-form:invalid'];}],
 ['family-plan mismatch',v=>{snap(v).packetFamilyIdentifiers.mode='court_filing_packet';}],
 ['old packet type mismatch',v=>{snap(v).packetType='official_pdf_overlay';}],
 ['new selected legal track',v=>{snap(v).selectedTrackId='invented-approved-track';}],
 ['cross-route reassignment',v=>{snap(v).pathwayId='first-offense-eligible-offense-sealing';snap(v).packetPlan.pathwayId=snap(v).pathwayId;}],
 ['missing material disposition date',v=>{delete snap(v).packetAnswers.nd_qualifying_disposition_date;}],
 ['explicit unknown material fact with stale qualifying value',v=>{snap(v).packetAnswers.nd_all_charges_nonconviction={unknown:true,value:'Yes'};}],
 ['ownership hard stop',v=>{snap(v).screeningAnswers.ownership_scope='No';}]
]){
 const v=structuredClone(oldBase);mutate(v);v.draftHash=P.protectedPacketDraftHash(snap(v));
 check('legacy successor rejects '+label,()=>assert.equal(model(v),null));
}
const hashTamper=structuredClone(oldBase);snap(hashTamper).packetAnswers.nd_nonconviction_county='Burleigh';
check('legacy successor rejects raw mutation with unchanged draft hash',()=>assert.equal(model(hashTamper),null));

console.log(checks+'/'+checks+' actual R053 protected intake controls passed; pure in-process model/save tests only, no authentication/download/transaction or production proof.');
