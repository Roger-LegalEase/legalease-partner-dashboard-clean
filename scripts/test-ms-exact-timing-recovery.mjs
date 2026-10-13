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
const factIds=['ms_last_conviction_date_any_court','ms_successful_sentence_completion_date','ms_mip_dismissal_or_discharge_date','ms_mip_fine_imposed','ms_mip_sentence_completion_date','ms_mip_fine_payment_date'];
const expected={lowercourt:[factIds[0]],dui:[factIds[1]],'mip-dismissal':[factIds[2]],'mip-sentence-no-fine':[factIds[3],factIds[4]],'mip-sentence-with-fine':[factIds[3],factIds[4],factIds[5]],'mip-payment':[factIds[3],factIds[4],factIds[5]]};
const clockFixtures=JSON.parse(fs.readFileSync(new URL('./lib/ms-exact-timing-pre-calendar-clock-fixtures.json',import.meta.url)));
for(const row of [...fixtures.rows,...clockFixtures.rows]){
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
for(const id of factIds)check(id+'/unrelated-route-hidden',!selectScreeningQuestionIds(profile,pub,{possible_pathway_context:profile.pathways.find(p=>p.id==='non-conviction-expungement-for-dismissal-no-disposition-or-acquittal').label,case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted',ms_program_order:'no_program_order'}).includes(id));
const failed=checks.filter(c=>!c.pass),report={status:failed.length?'FAIL':'PASS',checks:checks.length,failed,details:checks,limits:['Finite existing MS timing controls and genuine synthetic historical snapshots; no court classification, participant eligibility, financial event, current-primary legal approval or hosted acceptance inferred.']};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,checks:checks.length,failed}));assert.equal(failed.length,0);
