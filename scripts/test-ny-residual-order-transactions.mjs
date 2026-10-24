import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { NY_HISTORY_CLOCK_BASE } from './lib/ny-history-clock-fixture.mjs';
register('./lib/ts-esm-loader.mjs',import.meta.url);
if(process.env.RCAP_NY_BASELINE_LOADER)register(process.env.RCAP_NY_BASELINE_LOADER,import.meta.url);
const { ny16059History, ny16059Clock } = await import('../src/lib/rcap-engine/new-york-16059-facts.ts');
const { evaluateAuthoritativeScreeningResult } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const { sanitizeResumedAnswersForQuestionIds } = await import('../src/components/expungement-ai/screening/screens.ts');
const profile=getProfileByJurisdiction('NY'),pub=projectPublicProfile(profile), rows=[];
function check(name,actual,expected){rows.push({name,actual,expected,pass:JSON.stringify(actual)===JSON.stringify(expected)});}
const base={...NY_HISTORY_CLOCK_BASE};
function history(name,patch,status,code){const a={...base,...patch},before=JSON.stringify(a),r=ny16059History(a);check(name,r.status,status);if(code)check(name+' reason',r.code,code);check(name+' raw',JSON.stringify(a),before);return a;}
// Source-derived expectations: an application is not an entered order (§160.58(2));
// order components are separate; the unresolved §160.59(3)(b) maximum remains review.
for(const state of ['none','denied','pending'])history('no entered order '+state,{ny_16059_16058_grants:state},'satisfied');
history('unknown order',{ny_16059_16058_grants:'unknown'},'missing','history_missing');
history('legacy grant without components',{ny_16059_16058_grants:'granted'},'missing','16058_components_missing');
const order={ny_16059_16058_grants:'granted',ny_16059_16058_treatment_count:1,ny_16059_16058_additional_count:0};
for(const additional of [0,1,2,3])history('entered order additional '+additional,{...order,ny_16059_16058_additional_count:additional},'review','16058_order_review');
for(const value of [-1,0.5,'unknown',undefined])history('invalid additional '+value,{...order,ny_16059_16058_additional_count:value},'missing','16058_components_missing');
for(const patch of [{ny_16059_16058_treatment_count:0},{ny_16059_16058_additional_count:4}])history('impossible order '+JSON.stringify(patch),{...order,...patch},'review','16058_components_conflict');
history('unapproved maximum assertion never grants or denies',{...order,ny_16059_16058_maximum_confirmed:'Yes'},'review','16058_order_review');
// §40.10(2) requires incident or integral venture facts, not merely a docket/date.
const connected={ny_16059_grouping:'connected',ny_16059_transaction_time_circumstance:'Yes',ny_16059_transaction_integral_purpose:'No',ny_16059_transaction_shared_docket_only:'No',ny_16059_transaction_multiple_victims:'No'};
history('missing connected facts',{ny_16059_grouping:'connected'},'missing','grouping_facts_missing');
for(const patch of [{},{ny_16059_transaction_time_circumstance:'No',ny_16059_transaction_integral_purpose:'Yes'},{ny_16059_transaction_multiple_victims:'Yes'}])history('connected candidate '+JSON.stringify(patch),{...connected,...patch},'review','grouping_review');
history('mere docket',{...connected,ny_16059_transaction_time_circumstance:'No',ny_16059_transaction_shared_docket_only:'Yes'},'review','grouping_review');
history('docket conflicts with incident',{...connected,ny_16059_transaction_shared_docket_only:'Yes'},'review','grouping_facts_conflict');
history('same act preserved',{ny_16059_history_total:3,ny_16059_requested_total:3,ny_16059_grouping:'single_act'},'satisfied');
history('same act ineligible not collapsed',{ny_16059_history_total:3,ny_16059_requested_total:3,ny_16059_grouping:'single_act',ny_16059_requested_excluded:'Yes'},'review','grouping_review');
history('independent offenses counted',{ny_16059_history_total:3,ny_16059_grouping:'separate'},'excluded','history_limit');
const select=a=>selectScreeningQuestionIds(profile,pub,a);
const orderIds=['ny_16059_16058_treatment_count','ny_16059_16058_additional_count'];
const groupIds=Object.keys(connected).filter(id=>id.includes('transaction_'));
for(const [a,ids] of [[{...base,...order},orderIds],[{...base,...connected},groupIds]])for(const id of ids){check(id+' reachable',select(a).includes(id),true);check(id+' hidden when irrelevant',select(base).includes(id),false);const q=pub.questions.find(q=>q.id===id);check(id+' EN/ES',Boolean(q?.prompt&&q?.translations?.es?.prompt),true);}
const saved={...base,...order,...connected,ny_16059_prior_sealing:'legacy raw',unrecognized_historical_answer:'retain'};
const resumed=sanitizeResumedAnswersForQuestionIds(pub,saved,select(base));
for(const id of [...orderIds,...groupIds,'ny_16059_prior_sealing'])check(id+' resumed raw',resumed[id],saved[id]);
// Adopted section3 replaces the old competing calculations with one physical-
// custody convention and a separately labeled recommended next day. Historical
// preimages/receipts are preserved; examples still assume explicit known facts.
const timing={...base,sentencing_date:'2016-01-01',ny_16059_earliest_conviction_date:'2014-01-01',ny_16059_incarceration_history:'released',ny_16059_physical_custody_days_confirmed:'Yes'};
const clockCases=[
 ['zero', {...base,sentencing_date:'2016-01-01'},'2026-01-01','2026-01-02',0],
 ['pre-anchor',{...timing,ny_16059_incarceration_periods:'2015-01-01/2015-01-11'},'2026-01-12','2026-01-13',11],
 ['cross-anchor',{...timing,ny_16059_incarceration_periods:'2015-12-27/2016-01-06'},'2026-01-12','2026-01-13',11],
 ['overlap union',{...timing,ny_16059_incarceration_periods:'2015-12-27/2016-01-06;2016-01-01/2016-01-11;2015-12-27/2016-01-06'},'2026-01-17','2026-01-18',16],
 ['leap day',{...base,sentencing_date:'2016-02-29'},'2026-02-28','2026-03-01',0]
];
for(const [name,a,end,recommended,days] of clockCases){const d=ny16059Clock(a,'2026-10-12');check(name+' computed period end',d.computedPeriodEndDate,end);check(name+' recommended policy date',d.recommendedFilingDate,recommended);check(name+' inclusive physical days',d.qualifyingCustodyDays,days);for(const delta of [-1,0,1]){const today=new Date(Date.parse(end+'T00:00:00Z')+delta*86400000).toISOString().slice(0,10);const r=ny16059Clock(a,today);check(name+' threshold '+delta,r.status,today<end?'not_yet':'satisfied');}check(name+' recommended day not an eligibility gate',ny16059Clock(a,end).status,'satisfied');}
for(const invalid of ['2016-02-30/2016-03-02','2016-01-11/2016-01-01','unknown','2030-01-01/2030-01-02'])check('invalid '+invalid,ny16059Clock({...timing,ny_16059_incarceration_periods:invalid},'2026-10-12').status,'missing');
process.env.RCAP_EVALUATOR_TODAY='2026-10-12';
for(const a of [{...base,...order},{...base,...connected},base]){let canonical;for(const menu of [undefined,'Skip',...profile.pathways.map(p=>p.label)]){const answers={...a,possible_pathway_context:menu}; let r;try{r=evaluateAuthoritativeScreeningResult({jurisdiction:'NY',profileVersion:profile.profileVersion,matterId:'synthetic-ny-residual',answers}).evaluation;}catch(e){check('public evaluator accepts facts '+String(menu),e.name,'no error');continue;}const shape={code:r.resultCode,pathway:r.pathwayId,payment:r.paymentAllowed};canonical??=shape;check('menu independent '+String(menu),shape,canonical);}}
// Exercise the actual protected transition functions. This is deliberately
// separate from the browser/database acceptance receipt, not an RLS claim.
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const authoritative=evaluateAuthoritativeScreeningResult({jurisdiction:'NY',profileVersion:profile.profileVersion,matterId:'synthetic-ny-protected',answers:base});
const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:base,dependencies:{commercialFlowVersion:1},capturedAt:'2026-10-12T00:00:00Z'});
let protectedRecord={status:'unverified',reason:'synthetic-only',revision:0,draftSnapshot:seed.snapshot,draftHash:seed.hash};
protectedRecord.draftSnapshot.packetAnswers.unknown_retained_fact={legacy:'Synthetic unchanged'};
protectedRecord.draftHash=P.protectedPacketDraftHash(protectedRecord.draftSnapshot);
const existingItem={id:'synthetic-ny-protected',jurisdiction:'NY',artifactRefs:{}};
for(const [name,patch,expected] of [['history-edit',{ny_16059_history_total:2},'packet_ready_with_caution'],['history-hold',{ny_16059_history_total:3},'likely_not_eligible'],['history-recovery',{ny_16059_history_total:1},'packet_ready_with_caution'],['prior-order-hold',order,'needs_review'],['no-entered-order',{ny_16059_16058_grants:'none'},'packet_ready_with_caution'],['future-anchor',{sentencing_date:'2030-01-01'},'needs_more_info'],['anchor-recovery',{sentencing_date:'2010-01-01'},'packet_ready_with_caution']]){
 const m=P.protectedPacketInformationModelFor(protectedRecord);
 check(name+' model available',Boolean(m),true);
 if(!m)continue;
 for(const id of Object.keys(patch))check(name+' allows explicit '+id,P.editablePacketInputIds(m,true).has(id),true);
 const next=P.packetInformationPatch({existingItem,protectedVerification:protectedRecord,answers:patch});
 check(name+' material transition',Boolean(next),true);if(!next)continue;
 const n=next.protectedTransition.nextVerification;check(name+' revision advances',n.revision,protectedRecord.revision+1);check(name+' remains unverified',n.status,'unverified');check(name+' no verification hash',Boolean(n.hash),false);
 check(name+' re-evaluated',n.draftSnapshot.resultCode,expected);
 check(name+' unknown field preserved',n.draftSnapshot.packetAnswers.unknown_retained_fact,{legacy:'Synthetic unchanged'});
 check(name+' legacy raw preserved',n.draftSnapshot.screeningAnswers.ny_16059_prior_sealing,base.ny_16059_prior_sealing);
 protectedRecord=n;
}
const recovered=P.protectedPacketInformationModelFor(protectedRecord);
check('inactive order count retained',recovered?.initialAnswers.ny_16059_16058_treatment_count,1);
check('inactive order count hidden in review',P.reviewEditablePacketInputIds(recovered).has('ny_16059_16058_treatment_count'),false);
check('known history has visible correction',P.reviewEditablePacketInputIds(recovered).has('ny_16059_history_total'),true);
// An explicit factual correction can retire mistaken custody details from the
// calculation only after saved No/none answers, retaining every original map.
const custodyAnswers={...base,ny_16059_sentence_incarceration:'Yes',release_date:'2011-01-01',ny_16059_incarceration_history:'released',ny_16059_incarceration_periods:'2010-01-01/2011-01-01',ny_16059_physical_custody_days_confirmed:'Yes',ny_16059_release_sentence_relationship_confirmed:'Yes'};
const custodyAuthority=evaluateAuthoritativeScreeningResult({jurisdiction:'NY',profileVersion:profile.profileVersion,matterId:'synthetic-custody',answers:custodyAnswers});
const custodySeed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:custodyAuthority,screeningAnswers:custodyAnswers,dependencies:{commercialFlowVersion:1},capturedAt:'2026-10-12T00:00:00Z'});
const custodyRecord={status:'unverified',revision:0,draftSnapshot:custodySeed.snapshot,draftHash:custodySeed.hash};
check('cannot remove active custody',P.packetInformationPatch({existingItem,protectedVerification:custodyRecord,answers:{},clearInactiveCustodyFacts:true}),null);
const noCustody=P.packetInformationPatch({existingItem,protectedVerification:custodyRecord,answers:{ny_16059_sentence_incarceration:'No',ny_16059_incarceration_history:'none'}})?.protectedTransition.nextVerification;
check('parent correction remains held',noCustody?.draftSnapshot.resultCode,'needs_review');
check('parent correction retains raw date',noCustody?.draftSnapshot.screeningAnswers.release_date,'2011-01-01');
if(noCustody){
 check('cannot combine removal and verification',P.packetInformationPatch({existingItem,protectedVerification:noCustody,answers:{},clearInactiveCustodyFacts:true,verify:true}),null);
 check('cannot combine removal and other edit',P.packetInformationPatch({existingItem,protectedVerification:noCustody,answers:{ny_16059_history_total:2},clearInactiveCustodyFacts:true}),null);
 const retired=P.packetInformationPatch({existingItem,protectedVerification:noCustody,answers:{},clearInactiveCustodyFacts:true})?.protectedTransition.nextVerification;
 check('explicit removal recovers calculation',retired?.draftSnapshot.resultCode,'packet_ready_with_caution');
 check('explicit removal increments revision',retired?.revision,noCustody.revision+1);
 check('explicit removal does not verify',retired?.status,'unverified');
 for(const id of ['release_date','ny_16059_incarceration_periods','ny_16059_physical_custody_days_confirmed','ny_16059_release_sentence_relationship_confirmed']){
  for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])check('removed from active '+map+' '+id,Object.hasOwn(retired?.draftSnapshot[map]??{},id),false);
  const entry=retired?.draftSnapshot.dependencies.semanticAnswerHistory.find(e=>e.factId===id&&e.source==='screeningAnswers');
  check('archived original '+id,entry?.value,custodyAnswers[id]);
  check('archived explicit meaning '+id,entry?.meaning,'ny_16059_custody_entered_in_error');
 }
}
// Genuine snapshots emitted by preserved pre-candidate modules, independently
// captured with their module hashes; no reseeding from current evaluator.
for(const name of ['entered-order','connected-transaction']){
 const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/ny-protected-baseline/'+name+'.json',import.meta.url)));
 const old=fixture.record, before=JSON.stringify(old), model=P.protectedPacketInformationModelFor(old);
 check(name+' baseline was held',old.draftSnapshot.resultCode,'needs_review');
 check(name+' baseline hash intact',P.protectedPacketDraftHash(old.draftSnapshot),old.draftHash);
 check(name+' old protected model recoverable',Boolean(model),true);
 const patch=name==='entered-order'?{ny_16059_16058_treatment_count:1,ny_16059_16058_additional_count:0}:connected;
 const updated=P.packetInformationPatch({existingItem,protectedVerification:old,answers:patch});
 check(name+' owner can supply missing facts',Boolean(updated),true);
 check(name+' clarification remains held',updated?.protectedTransition.nextVerification.draftSnapshot.resultCode,'needs_review');
 check(name+' original snapshot immutable',JSON.stringify(old),before);
 const tampered=structuredClone(old);tampered.draftSnapshot.screeningAnswers.ny_16059_history_total=9;
 check(name+' tampered hash rejected',P.protectedPacketInformationModelFor(tampered),null);
 const drift=structuredClone(old);drift.draftSnapshot.resultCode='packet_ready';drift.draftHash=P.protectedPacketDraftHash(drift.draftSnapshot);
 check(name+' unrelated result drift rejected',P.protectedPacketInformationModelFor(drift),null);
}
// The existing protected confirmation mechanism binds these new facts to the
// actual inputs and complete route source/meaning contract, preserving no-ops.
const C=await import('../src/lib/expungement-ai/record-fact-clarification.ts');
const routeKey='NY:'+custodyAuthority.evaluation.pathwayId;
const custodyModel=P.protectedPacketInformationModelFor(custodyRecord);
const confIds=['ny_16059_physical_custody_days_confirmed','ny_16059_release_sentence_relationship_confirmed'];
check('both new confirmations are explicitly unresolved',custodyModel.recordClarificationIds,confIds);
const confirmed=P.packetInformationPatch({existingItem,protectedVerification:custodyRecord,answers:{},confirmRecordFacts:confIds})?.protectedTransition.nextVerification;
check('explicit confirmation transition exists',Boolean(confirmed),true);
if(confirmed){
 const model=P.protectedPacketInformationModelFor(confirmed);
 check('current explicit confirmations resolve',model.recordClarificationIds,[]);
 const noOp=P.packetInformationPatch({existingItem,protectedVerification:confirmed,answers:{}})?.protectedTransition.nextVerification;
 check('unchanged no-op keeps protected draft hash',noOp?.draftHash,confirmed.draftHash);
 check('unchanged no-op keeps protected revision',noOp?.revision,confirmed.revision);
 const qs=new Map(model.questions.map(q=>[q.id,q]));
 for(const [id,value]of [['sentencing_date','2010-01-02'],['release_date','2011-01-02'],['ny_16059_earliest_conviction_date','2001-01-01'],['ny_16059_incarceration_periods','2010-01-02/2011-01-01'],['ny_16059_history_total',2],['ny_16059_later_conviction_entered','Yes'],['sentence_completion_date','No']]){
  const changed={...model.initialAnswers,[id]:value};
  check('input change invalidates both protected confirmations '+id,C.unresolvedRecordFactConfirmations(routeKey,changed,qs,confirmed.draftSnapshot.dependencies.recordFactConfirmations),confIds);
 }
 const changed=P.packetInformationPatch({existingItem,protectedVerification:confirmed,answers:{ny_16059_history_total:2}})?.protectedTransition.nextVerification;
 check('real protected material save invalidates confirmations',P.protectedPacketInformationModelFor(changed)?.recordClarificationIds,confIds);
 check('material save preserves raw old Yes',changed?.draftSnapshot.screeningAnswers[confIds[0]],'Yes');
 const drift=structuredClone(confirmed);drift.draftSnapshot.profileSourceFingerprint='0'.repeat(64);drift.draftHash=P.protectedPacketDraftHash(drift.draftSnapshot);
 check('source drift rejects protected consumer',P.protectedPacketInformationModelFor(drift),null);
 const contractDrift=new Map(qs);contractDrift.set(confIds[0],{...qs.get(confIds[0]),prompt:'Different physical meaning'});
 check('confirmation question meaning drift rejected',C.recordFactConfirmationFor(routeKey,confIds[0],model.initialAnswers,contractDrift.get(confIds[0])),null);
 for(const id of confIds)check('explicit confirmation archives original raw '+id,confirmed.draftSnapshot.dependencies.recordFactConfirmations[id].legacyValues.find(e=>e.source==='screeningAnswers').value,'Yes');
}
const oldClockFixture=JSON.parse(fs.readFileSync(new URL('./fixtures/ny-protected-baseline/adopted-clock-predecessor.json',import.meta.url)));
const oldClock=oldClockFixture.record, oldClockRaw=JSON.stringify(oldClock);
check('pre-policy custody predecessor hash intact',P.protectedPacketDraftHash(oldClock.draftSnapshot),oldClock.draftHash);
check('pre-policy custody opens as held current-meaning editor',Boolean(P.protectedPacketInformationModelFor(oldClock)),true);
check('pre-policy custody original bytes immutable',JSON.stringify(oldClock),oldClockRaw);
const oldHeldModel=P.protectedPacketInformationModelFor(oldClock);
check('pre-policy custody successor is nonpayable missing-meaning hold',oldHeldModel?.resultCode,'needs_more_info');
const oldNoOp=P.packetInformationPatch({existingItem,protectedVerification:oldClock,answers:{}})?.protectedTransition.nextVerification;
check('pre-policy unchanged no-op preserves exact predecessor',oldNoOp,oldClock);
const oldExplicit=P.packetInformationPatch({existingItem,protectedVerification:oldClock,answers:Object.fromEntries(confIds.map(id=>[id,'Yes'])),confirmRecordFacts:confIds})?.protectedTransition.nextVerification;
check('pre-policy fresh owner entry creates current draft',Boolean(oldExplicit),true);
check('pre-policy fresh entry retains every original screening value',oldExplicit?.draftSnapshot.screeningAnswers,oldClock.draftSnapshot.screeningAnswers);
check('pre-policy fresh entry keeps confirmation exclusively explicit',oldExplicit?.draftSnapshot.packetAnswers[confIds[0]],'Yes');
check('pre-policy fresh entry remains unverified',oldExplicit?.status,'unverified');
for(const [key,value]of [['resultCode','not_yet'],['resultCode','packet_ready'],['profileSourceFingerprint','0'.repeat(64)],['profileAuthorityFingerprint','0'.repeat(64)]]){
 const bad=structuredClone(oldClock);bad.draftSnapshot[key]=value;bad.draftHash=P.protectedPacketDraftHash(bad.draftSnapshot);
 check('pre-policy unrelated tuple/source drift refused '+key,P.protectedPacketInformationModelFor(bad),null);
}

// A correctly hashed synthetic OLD final envelope exercises the actual final
// authority consumer. This is not a claim of historical final verification.
const oldFinalRecord=structuredClone(oldClock),oldFinal={...oldFinalRecord.draftSnapshot,schemaVersion:'expungement-ai/final-verification/v1',verifiedAt:'2026-10-16T00:00:00Z'};
delete oldFinal.capturedAt;
oldFinalRecord.status='verified';oldFinalRecord.snapshot=oldFinal;oldFinalRecord.hash=P.protectedPacketDraftHash(oldFinal);
const oldFinalBefore=structuredClone(oldFinalRecord),oldFinalModel=P.protectedPacketInformationModelFor(oldFinalRecord);
check('old final envelope is correctly hashed',P.protectedPacketDraftHash(oldFinalRecord.snapshot),oldFinalRecord.hash);
check('old final envelope can open correction view',Boolean(oldFinalModel),true);
check('old final correction view is held for new meaning',oldFinalModel?.resultCode,'needs_more_info');
check('old final correction view cannot retain verification safety',oldFinalModel?.reviewSafety.safe,false);
let oldFinalDenied=false;
try{P.requireCurrentPacketVerificationRecord(existingItem,oldFinalRecord);}catch(error){oldFinalDenied=error instanceof P.CurrentPacketVerificationRequiredError;}
check('actual current final verification reader denies old payment/generation authority',oldFinalDenied,true);
for(const verify of [false,true]){
 const result=P.packetInformationPatch({existingItem,protectedVerification:oldFinalRecord,answers:{},...(verify?{verify:true}:{})});
 check('old final '+(verify?'verify':'noop')+' does not grant readiness',Boolean(result?.readyToGenerate),false);
 let denied=false;try{P.requireCurrentPacketVerificationRecord(existingItem,result?.protectedTransition.nextVerification??null);}catch(error){denied=error instanceof P.CurrentPacketVerificationRequiredError;}
 check('old final '+(verify?'verify':'noop')+' current consumer refuses authority',denied,true);
}
check('old final source/draft/raw record immutable',oldFinalRecord,oldFinalBefore);
const failed=rows.filter(r=>!r.pass);if(process.env.RCAP_NY_RESIDUAL_RECEIPT)fs.writeFileSync(process.env.RCAP_NY_RESIDUAL_RECEIPT,JSON.stringify({rows,failed,layer:'local evaluator/selection/serialization only; not authenticated DB or legal approval'},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({checks:rows.length,failed}));assert.equal(failed.length,0);
