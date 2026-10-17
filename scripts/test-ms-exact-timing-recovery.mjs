import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
process.env.RCAP_EVALUATOR_TODAY='2026-10-13';
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const {selectScreeningQuestionIds}=await import('../src/lib/rcap-engine/screening-question-selection.ts');
const {parseJurisdictionProfile}=await import('../src/lib/expungement-ai/frontend/schemas.ts');
const {screensFromQuestionIds,sanitizeAnswersForQuestionIds,sanitizeResumedAnswersForQuestionIds}=await import('../src/components/expungement-ai/screening/screens.ts');
const {toScreeningAnswers}=await import('../src/components/expungement-ai/screening/answers.ts');
const {serializeScreeningAnswers,deserializeScreeningAnswers}=await import('../src/lib/expungement-ai/screening-session-persistence.ts');
const {POST}=await import('../src/app/api/expungement-ai/evaluate/route.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {resolveRuntimeText}=await import('../src/lib/expungement-ai/localization.ts');
const fixtures=JSON.parse(fs.readFileSync(new URL('./lib/ms-exact-timing-pre-calendar-fixtures.json',import.meta.url)));
const profile=getProfileByJurisdiction('MS'),pub=projectPublicProfile(profile),front=parseJurisdictionProfile(pub).data;
const checks=[];const check=(id,pass)=>checks.push({id,pass:!!pass});const same=(a,b)=>{try{assert.deepEqual(a,b);return true;}catch{return false;}};
const legacyMIP='ms_mip_dismissal_or_discharge_date',bothMIP='ms_mip_dismissal_and_discharge_date';
const factIds=['ms_last_conviction_date_any_court','ms_successful_sentence_completion_date',bothMIP,'ms_mip_fine_imposed','ms_mip_sentence_completion_date','ms_mip_fine_payment_date'];
const expected={lowercourt:[factIds[0]],dui:[factIds[1]],'mip-dismissal':[factIds[2]],'mip-sentence-no-fine':[factIds[3],factIds[4]],'mip-sentence-with-fine':[factIds[3],factIds[4],factIds[5]],'mip-payment':[factIds[3],factIds[4],factIds[5]]};
const clockFixtures=JSON.parse(fs.readFileSync(new URL('./lib/ms-exact-timing-pre-calendar-clock-fixtures.json',import.meta.url)));
// The old OR fixtures are immutable predecessors, never relabeled AND answers.
const mipPredecessors=JSON.parse(fs.readFileSync(new URL('./lib/ms-mip-or-meaning-predecessors.json',import.meta.url)));
const item={id:'synthetic-ms-both-events',jurisdiction:'MS',artifactRefs:{}};
const run=answers=>evaluate({jurisdiction:'MS',profileVersion:profile.profileVersion,matterId:item.id,answers:toScreeningAnswers(answers)});
function legacyMIPChecks(row){
 const prior=structuredClone(row.verification),before=structuredClone(prior),label='mip-meaning/'+row.id;
 const model=P.protectedPacketInformationModelFor(prior),actual=run(row.answers);
 check(label+'/old-only-unresolved',actual.evaluation.resultCode==='needs_more_info'&&!actual.evaluation.paymentAllowed&&actual.evaluation.missingQuestionIds.includes(bothMIP));
 check(label+'/correction-model',model&&model.questions.some(q=>q.id===bothMIP)&&P.heldPacketCorrectionInputIds(model,actual.evaluation.resultCode).has(bothMIP)&&model.missingInputIds.includes(bothMIP));
 check(label+'/no-automatic-alias',!Object.hasOwn(model?.initialAnswers??{},bothMIP));
 const ids=selectScreeningQuestionIds(profile,pub,row.answers);
 check(label+'/successor-only-selected',ids.includes(bothMIP)&&!ids.includes(legacyMIP));
 check(label+'/actual-frontend-successor',screensFromQuestionIds(front,ids).some(q=>q.id===bothMIP));
 const noop=P.packetInformationPatch({existingItem:item,protectedVerification:prior,answers:{}});
 check(label+'/noop-retains-exact-old-record',same(noop?.protectedTransition.nextVerification,prior)&&!noop?.readyToGenerate);
 check(label+'/old-final-verification-denied',!P.packetInformationPatch({existingItem:item,protectedVerification:prior,answers:{},verify:true})?.readyToGenerate);
 const editable=model?P.editablePacketInputIds(model,true):new Set();
 const unrelatedId=['county','court','first_name'].find(id=>editable.has(id)&&model.questions.some(q=>q.id===id&&['text','text_or_unknown'].includes(q.type)));
 check(label+'/unrelated-control-available',unrelatedId);
 const unrelated=unrelatedId&&P.packetInformationPatch({existingItem:item,protectedVerification:prior,answers:{[unrelatedId]:'Synthetic record detail'}});
 check(label+'/unrelated-save-stays-unconfirmed',unrelated&&!unrelated.readyToGenerate&&unrelated.missingInputIds.includes(bothMIP)&&!Object.hasOwn(unrelated.protectedTransition.nextVerification.draftSnapshot.packetAnswers,bothMIP));
 const old=prior.draftSnapshot;
 if(unrelated)for(const source of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const [id,value]of Object.entries(old[source]))if(id!==unrelatedId)check(label+'/unrelated-raw/'+source+'/'+id,same(unrelated.protectedTransition.nextVerification.draftSnapshot[source][id],value));
 check(label+'/unrelated-history-preserved',!unrelated||same(unrelated.protectedTransition.nextVerification.draftSnapshot.dependencies.semanticAnswerHistory,old.dependencies.semanticAnswerHistory));
 const update=P.packetInformationPatch({existingItem:item,protectedVerification:prior,answers:{[bothMIP]:{value:'2024-02-29',unknown:false}}}),next=update?.protectedTransition.nextVerification;
 check(label+'/explicit-current-attestation',next&&next.status!=='verified'&&!update.readyToGenerate&&P.protectedPacketInformationModelFor(next)&&!update.missingInputIds.includes(bothMIP));
 if(next){
  for(const source of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const [id,value]of Object.entries(old[source]))check(label+'/adoption-raw/'+source+'/'+id,same(next.draftSnapshot[source][id],value));
  for(const source of ['screeningAnswers','prefilledAnswers','packetAnswers'])if(Object.hasOwn(old[source],legacyMIP))check(label+'/old-OR-history/'+source,next.draftSnapshot.dependencies.semanticAnswerHistory?.some(e=>e.factId===legacyMIP&&e.source===source&&same(e.value,old[source][legacyMIP])));
  check(label+'/explicit-current-value',same(next.draftSnapshot.packetAnswers[bothMIP],{value:'2024-02-29',unknown:false}));
  const changed=P.packetInformationPatch({existingItem:item,protectedVerification:next,answers:{[bothMIP]:{value:'2026-10-12',unknown:false}}});
  check(label+'/changed-current-date-rechecked',changed&&!changed.readyToGenerate&&changed.protectedTransition.nextVerification.status!=='verified'&&changed.protectedTransition.nextVerification.draftSnapshot.resultCode==='not_yet');
 }
 for(const [key,value]of Object.entries({profileVersion:'wrong',profileSourceFingerprint:'wrong',profileAuthorityFingerprint:'wrong',pathwayId:'wrong',packetType:'wrong',selectedTrackId:'wrong',deferralComponentIds:['wrong'],serverFacts:{jurisdiction:'MS',pathway_id:'wrong'},packetFamilyIdentifiers:{mode:'wrong',sourceFormIds:[]}})){
  const mutant=structuredClone(prior);mutant.draftSnapshot[key]=value;mutant.draftHash=P.protectedPacketDraftHash(mutant.draftSnapshot);check(label+'/tamper-'+key,P.protectedPacketInformationModelFor(mutant)===null);
 }
 for(const value of ['2024-02-29',{value:'2024-02-29',unknown:false},{value:'2024-02-29',unknown:true}]){
  const raw={...row.answers,[legacyMIP]:value};
  check(label+'/serializer-old-raw',same(deserializeScreeningAnswers(serializeScreeningAnswers(raw))[legacyMIP],value));
  check(label+'/inactive-old-raw',same(sanitizeAnswersForQuestionIds(raw,[legacyMIP],[],front)[legacyMIP],value));
  const resumed=sanitizeResumedAnswersForQuestionIds(front,raw,[]);
  check(label+'/resume-old-raw',same(resumed[legacyMIP],value)&&!Object.hasOwn(resumed,bothMIP));
 }
 check(label+'/source-record-not-mutated',same(prior,before));
}
for(const row of mipPredecessors.rows)legacyMIPChecks(row);
for(const row of [...fixtures.rows,...clockFixtures.rows]){
 if(row.branch==='mip-dismissal'){
  legacyMIPChecks(row);
  // A fresh successor answer has its own factual meaning; never mutate the
  // immutable old OR fixture in order to manufacture its confirmation.
  const fresh={...row.answers,[bothMIP]:row.date};delete fresh[legacyMIP];
  const actual=run(fresh);
  check(row.id+'/fresh-AND-calendar',row.invalidCalendar?actual.evaluation.resultCode==='needs_more_info'&&!actual.evaluation.paymentAllowed&&actual.evaluation.missingQuestionIds.includes(bothMIP):actual.evaluation.resultCode===row.verification.draftSnapshot.resultCode);
  if(['needs_more_info','not_yet'].includes(actual.evaluation.resultCode))check(row.id+'/fresh-AND-Spanish',actual.evaluation.reasons.every(r=>resolveRuntimeText('es',r.text)!==r.text));
  continue;
 }

 const prior=structuredClone(row.verification),before=structuredClone(prior),item={id:'synthetic-ms-calendar',jurisdiction:'MS',artifactRefs:{}};
 const ids=selectScreeningQuestionIds(profile,pub,row.answers),model=P.protectedPacketInformationModelFor(prior);
 check(row.id+'/current-model',model);check(row.id+'/exact-branch-controls',same(ids.filter(id=>factIds.includes(id)).sort(),[...expected[row.branch]].sort()));
 check(row.id+'/actual-frontend-controls',expected[row.branch].every(id=>screensFromQuestionIds(front,ids).some(q=>q.id===id)));
 check(row.id+'/existing-Spanish',expected[row.branch].every(id=>pub.questions.find(q=>q.id===id)?.translations?.es?.prompt));
 const actual=evaluate({jurisdiction:'MS',profileVersion:profile.profileVersion,matterId:'synthetic-ms-calendar',answers:row.answers});
 const response=await POST(new Request('http://localhost/api/expungement-ai/evaluate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jurisdiction:'MS',profileVersion:profile.profileVersion,matterId:'synthetic-ms-calendar',answers:row.answers})}));const body=await response.json();check(row.id+'/actual-handler',response.status===200&&body.resultCode===actual.evaluation.resultCode);
 if(row.invalidCalendar){
  check(row.id+'/impossible-calendar-held',body.resultCode==='needs_more_info'&&!body.paymentAllowed&&body.missingQuestionIds.includes(row.dateFactId));
  check(row.id+'/held-reason-Spanish',body.reasons.every(r=>resolveRuntimeText('es',r.text)!==r.text));
  check(row.id+'/visible-correction',model?.questions.some(q=>q.id===row.dateFactId)&&P.heldPacketCorrectionInputIds(model,body.resultCode).has(row.dateFactId)&&model.missingInputIds.includes(row.dateFactId));
  check(row.id+'/no-verification',!model?.reviewSafety.safe&&!P.packetInformationPatch({existingItem:item,protectedVerification:prior,answers:{},verify:true})?.readyToGenerate);
  const noop=P.packetInformationPatch({existingItem:item,protectedVerification:prior,answers:{}});check(row.id+'/noop-retains-exact-old-record',same(noop?.protectedTransition.nextVerification,prior));
  const update=P.packetInformationPatch({existingItem:item,protectedVerification:prior,answers:{[row.dateFactId]:{value:'2024-02-29',unknown:false}}});const next=update?.protectedTransition.nextVerification;
  check(row.id+'/explicit-valid-correction',next&&next.status!=='verified'&&!update.readyToGenerate&&P.protectedPacketInformationModelFor(next));
  if(next){for(const source of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const [id,value]of Object.entries(prior.draftSnapshot[source]))if(id!==row.dateFactId)check(row.id+'/raw-retained/'+source+'/'+id,same(next.draftSnapshot[source][id],value));
   check(row.id+'/old-date-provenance',next.draftSnapshot.dependencies.semanticAnswerHistory?.some(e=>e.factId===row.dateFactId&&e.value===row.date));
  }
  for(const [key,value]of Object.entries({profileVersion:'wrong',profileSourceFingerprint:'wrong',profileAuthorityFingerprint:'wrong',pathwayId:'wrong',packetType:'wrong',selectedTrackId:'wrong',deferralComponentIds:['wrong'],serverFacts:{jurisdiction:'MS',pathway_id:'wrong'},packetFamilyIdentifiers:{mode:'wrong',sourceFormIds:[]}})){
   const mutant=structuredClone(prior);mutant.draftSnapshot[key]=value;mutant.draftHash=P.protectedPacketDraftHash(mutant.draftSnapshot);check(row.id+'/tamper-'+key,P.protectedPacketInformationModelFor(mutant)===null);
  }
 }else{
  const old=prior.draftSnapshot;check(row.id+'/valid-authority-preserved',actual.evaluation.resultCode===old.resultCode&&actual.evaluation.paymentAllowed===old.paymentAllowed&&same(actual.evaluation.packetPlan??null,old.packetPlan));
  if(body.resultCode==='not_yet')check(row.id+'/dated-reason-Spanish',body.reasons.every(r=>resolveRuntimeText('es',r.text)!==r.text));
 }
 for(const value of [row.date,{value:row.date,unknown:false},{value:row.date,unknown:true}]){
  const raw={...row.answers,[row.dateFactId]:value},stored=serializeScreeningAnswers(raw);check(row.id+'/serializer-raw',same(deserializeScreeningAnswers(stored)[row.dateFactId],value));
  check(row.id+'/inactive-raw-retained',same(sanitizeAnswersForQuestionIds(raw,[row.dateFactId],[],front)[row.dateFactId],value));
  check(row.id+'/resume-raw-retained',same(sanitizeResumedAnswersForQuestionIds(front,raw,[])[row.dateFactId],value));
 }
 check(row.id+'/source-record-not-mutated',same(prior,before));
}
// A correctly hashed synthetic final-verification envelope exercises the real
// protected authority reader. It is not evidence of historical final approval.
for(const row of mipPredecessors.rows){
 const verified=structuredClone(row.verification),final={...verified.draftSnapshot,schemaVersion:'expungement-ai/final-verification/v1',verifiedAt:'2026-10-13T00:00:00Z'};delete final.capturedAt;
 verified.status='verified';verified.snapshot=final;verified.hash=P.protectedPacketDraftHash(final);
 const before=structuredClone(verified),authority=run(row.answers);
 check('mip-verified/'+row.id+'/no-draft-successor-for-final',!P.msMipBothEventsHeldSuccessor(final,authority));
 let denied=false;try{P.requireCurrentPacketVerificationRecord(item,verified);}catch(error){denied=error instanceof P.CurrentPacketVerificationRequiredError;}
 check('mip-verified/'+row.id+'/protected-commerce-denied',denied);
 const noop=P.packetInformationPatch({existingItem:item,protectedVerification:verified,answers:{}}),verify=P.packetInformationPatch({existingItem:item,protectedVerification:verified,answers:{},verify:true});
 check('mip-verified/'+row.id+'/noop-no-valid-verification',!noop?.readyToGenerate&&!verify?.readyToGenerate);
 check('mip-verified/'+row.id+'/original-record-not-mutated',same(verified,before));
}
const mipAnswers=mipPredecessors.rows[0].answers;
const currentQuestion=pub.questions.find(q=>q.id===bothMIP);
check('mip-AND/adopted-copy',currentQuestion?.prompt.includes('both dismissal and discharge')&&currentQuestion.prompt.includes('under-21')&&currentQuestion.helperText.includes('different dates')&&currentQuestion.helperText.includes('order is unclear'));
check('mip-AND/Spanish-candidate-under21',currentQuestion?.translations?.es?.prompt.includes('menores de 21 años')&&!currentQuestion.translations.es.prompt.includes('menor de edad'));
for(const [label,value]of Object.entries({unknown:{unknown:true},'different-dates-or-unclear-order':{value:'2024-02-29',unknown:true}})){
 const actual=run({...mipAnswers,[bothMIP]:value});
 check('mip-AND/'+label+'-review',actual.evaluation.resultCode==='needs_review'&&!actual.evaluation.paymentAllowed&&actual.evaluation.reasons.some(r=>r.code==='ms.mip_dismissal_and_discharge_review'));
 check('mip-AND/'+label+'-Spanish',actual.evaluation.reasons.every(r=>resolveRuntimeText('es',r.text)!==r.text));
}
for(const [label,answers]of Object.entries({legacyOnly:mipAnswers,freshBoth:{...mipAnswers,[bothMIP]:'2024-02-29'},unknownBoth:{...mipAnswers,[bothMIP]:{unknown:true}},futureBoth:{...mipAnswers,[bothMIP]:'2027-01-01'}})){
 const normalized=toScreeningAnswers(answers),actual=run(answers);
 const response=await POST(new Request('http://localhost/api/expungement-ai/evaluate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jurisdiction:'MS',profileVersion:profile.profileVersion,matterId:item.id,answers:normalized})}));const body=await response.json();
 check('mip-AND/API-'+label,response.status===200&&body.resultCode===actual.evaluation.resultCode&&body.paymentAllowed===actual.evaluation.paymentAllowed);
 if(label==='futureBoth')check('mip-AND/future-completion-review',body.resultCode==='needs_review'&&!body.paymentAllowed);
}
const {MS_NONCONVICTION_SCREENING_ANSWERS}=await import('./lib/rcap-ms-nonconviction-fixture.mjs');
const adult=run(MS_NONCONVICTION_SCREENING_ANSWERS),adultWithMIP=run({...MS_NONCONVICTION_SCREENING_ANSWERS,[legacyMIP]:{value:'2024-02-29',unknown:true},[bothMIP]:{unknown:true}});
check('MS-adult-nonconviction/evaluation-unchanged-by-MIP-facts',same(adult.evaluation,adultWithMIP.evaluation)&&adult.evaluation.pathwayId==='non-conviction-expungement-for-dismissal-no-disposition-or-acquittal');
for(const id of factIds)check(id+'/unrelated-route-hidden' ,!selectScreeningQuestionIds(profile,pub,{possible_pathway_context:profile.pathways.find(p=>p.id==='non-conviction-expungement-for-dismissal-no-disposition-or-acquittal').label,case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted',ms_program_order:'no_program_order'}).includes(id));
const failed=checks.filter(c=>!c.pass),report={status:failed.length?'FAIL':'PASS',checks:checks.length,failed,details:checks,limits:['Finite existing MS timing controls and genuine synthetic historical snapshots; no court classification, participant eligibility, financial event, current-primary legal approval or hosted acceptance inferred.']};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,checks:checks.length,failed}));assert.equal(failed.length,0);
