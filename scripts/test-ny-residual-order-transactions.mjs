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
// Both clocks are independent arithmetic expectations, not evaluator-derived fixtures.
const timing={...base,sentencing_date:'2016-01-01',ny_16059_earliest_conviction_date:'2014-01-01',ny_16059_incarceration_history:'released'};
const clockCases=[
 ['zero', {...base,sentencing_date:'2016-01-01'},'2026-01-01','2026-01-01',0,0],
 ['pre-anchor',{...timing,ny_16059_incarceration_periods:'2015-01-01/2015-01-11'},'2026-01-01','2026-01-11',0,10],
 ['cross-anchor',{...timing,ny_16059_incarceration_periods:'2015-12-27/2016-01-06'},'2026-01-06','2026-01-11',5,10],
 ['overlap union',{...timing,ny_16059_incarceration_periods:'2015-12-27/2016-01-06;2016-01-01/2016-01-11;2015-12-27/2016-01-06'},'2026-01-11','2026-01-16',10,15],
 ['leap day',{...base,sentencing_date:'2016-02-29'},'2026-03-01','2026-03-01',0,0]
];
for(const [name,a,early,late,anchoredDays,allDays] of clockCases){const d=ny16059Clock(a,'2026-10-12');check(name+' anchored',d.eligibleOn,early);check(name+' literal',d.latestPossibleOn,late);check(name+' anchored days',d.excludedDays,anchoredDays);check(name+' literal days',d.allPostConvictionDays,allDays);for(const delta of [-1,0,1]){const today=new Date(Date.parse(early+'T00:00:00Z')+delta*86400000).toISOString().slice(0,10);const r=ny16059Clock(a,today);check(name+' threshold '+delta,r.status,today<early?'not_yet':today<late?'review':'satisfied');}check(name+' literal threshold',ny16059Clock(a,late).status,'satisfied');}
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
const custodyAnswers={...base,ny_16059_sentence_incarceration:'Yes',release_date:'2011-01-01',ny_16059_incarceration_history:'released',ny_16059_incarceration_periods:'2010-01-01/2011-01-01'};
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
 for(const id of ['release_date','ny_16059_incarceration_periods']){
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
const failed=rows.filter(r=>!r.pass);if(process.env.RCAP_NY_RESIDUAL_RECEIPT)fs.writeFileSync(process.env.RCAP_NY_RESIDUAL_RECEIPT,JSON.stringify({rows,failed,layer:'local evaluator/selection/serialization only; not authenticated DB or legal approval'},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({checks:rows.length,failed}));assert.equal(failed.length,0);
