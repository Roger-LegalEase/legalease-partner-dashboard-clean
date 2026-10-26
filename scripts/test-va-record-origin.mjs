import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
import fixtures from './test-va-record-origin-fixtures.mjs';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const V=await import('../src/lib/rcap-engine/virginia-record-origin.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const {selectScreeningQuestionIds}=await import('../src/lib/rcap-engine/screening-question-selection.ts');
const {parseJurisdictionProfile}=await import('../src/lib/expungement-ai/frontend/schemas.ts');
const {sanitizeAnswersForQuestionIds,sanitizeResumedAnswersForQuestionIds}=await import('../src/components/expungement-ai/screening/screens.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const {packetFulfillmentAuthority}=await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
const {resolveRuntimeText}=await import('../src/lib/expungement-ai/localization.ts');
const checks=[],check=(name,fn)=>{try{fn();checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:e.message});}};
const profile=getProfileByJurisdiction('VA'),pub=projectPublicProfile(profile),parsed=parseJurisdictionProfile(pub),question=pub.questions.find(q=>q.id===V.VA_RECORD_ORIGIN_ID);
check('origin is a strict-schema bilingual question',()=>{assert(parsed.ok);assert.equal(question.type,'single_choice');assert.equal(question.required,false);assert.equal(question.contextOnly,false);assert.equal(question.doesNotSelectPathway,true);assert(question.translations.es.prompt);assert.equal(question.optionDisplay.virginia.translations.es.label,'Expediente estatal o local de Virginia');});
for(const value of [undefined,null,'State or local','Virginia','Richmond',{},true,['virginia'],{value:'virginia',unknown:false}])check('no inference from venue or malformed origin '+JSON.stringify(value),()=>{
 const answers={jurisdiction_scope:'State or local',court:'Virginia Circuit Court',county_or_filing_location:'Richmond',residency_or_location:'Virginia',va_record_origin:value},before=structuredClone(answers);assert.equal(V.virginiaRecordOrigin(answers),'unknown');assert.deepEqual(answers,before);
});
check('existing Federal answer reused and never overridden',()=>{for(const value of [undefined,'virginia','unknown'])assert.equal(V.virginiaRecordOrigin({jurisdiction_scope:'Federal',va_record_origin:value}),'federal');});
for(const state of ['AR','MD','GA','DC'])check('other jurisdiction unchanged '+state,()=>assert(!projectPublicProfile(getProfileByJurisdiction(state)).questions.some(q=>q.id===V.VA_RECORD_ORIGIN_ID)));
for(const row of fixtures.rows){
 const prefix=row.route,run=answers=>evaluate({jurisdiction:'VA',profileVersion:profile.profileVersion,matterId:'synthetic-va-origin',answers});
 const missing=run(row.answers),old=structuredClone(row.record),before=structuredClone(old);
 check(prefix+' absence tightens current result without losing existing reasons',()=>{assert.equal(missing.evaluation.resultCode,'needs_more_info');assert.equal(missing.evaluation.paymentAllowed,false);assert(missing.evaluation.missingQuestionIds.includes(V.VA_RECORD_ORIGIN_ID));for(const reason of row.evaluation.reasons)assert(missing.evaluation.reasons.some(r=>JSON.stringify(r)===JSON.stringify(reason)));});
 check(prefix+' screen offers exact origin',()=>assert(selectScreeningQuestionIds(profile,pub,row.answers).includes(V.VA_RECORD_ORIGIN_ID)));
 check(prefix+' old protected draft readable without raw writes',()=>{const model=P.protectedPacketInformationModelFor(old);assert(model);assert(model.builderQuestions.some(q=>q.id===V.VA_RECORD_ORIGIN_ID));assert(model.missingInputIds.includes(V.VA_RECORD_ORIGIN_ID));assert(!model.reviewSafety.safe);assert.deepEqual(old,before);});
 for(const origin of ['unknown','other_state','federal','virginia']){
  const answers={...row.answers,va_record_origin:origin},current=run(answers),expected=origin==='virginia'?row.evaluation.resultCode:origin==='unknown'?'needs_more_info':'likely_not_eligible';
  check(prefix+' current '+origin,()=>{assert.equal(current.evaluation.resultCode,expected);if(origin!=='virginia')assert.equal(current.evaluation.paymentAllowed,false);else assert.deepEqual(current.evaluation,row.evaluation);});
  for(const fn of [a=>sanitizeAnswersForQuestionIds(a,Object.keys(a),[],parsed.data),a=>sanitizeResumedAnswersForQuestionIds(parsed.data,a,[])])check(prefix+' inactive/resumed raw retention '+origin,()=>{const a={...answers,...old.draftSnapshot.packetAnswers},result=fn(a);for(const id of ['va_record_origin','court','county_or_filing_location','residency_or_location'])assert.deepEqual(result[id],a[id]);});
  for(const scope of ['Federal'])check(prefix+' prior Federal refusal '+origin,()=>{const r=run({...answers,jurisdiction_scope:scope}).evaluation;assert.equal(r.resultCode,'hard_stop');assert.equal(r.reasons[0].code,'va.federal_or_out_of_scope');assert.equal(r.paymentAllowed,false);});
  let patch;
  check(prefix+' actual protected save '+origin,()=>{patch=P.packetInformationPatch({existingItem:{id:'synthetic-va-origin',jurisdiction:'VA',artifactRefs:{}},protectedVerification:old,answers:{va_record_origin:origin}});assert(patch);assert.equal(patch.protectedTransition.expectedPriorRevision,old.revision);assert.equal(patch.protectedTransition.nextVerification.draftSnapshot.packetAnswers.va_record_origin,origin);assert.equal(patch.readyToGenerate,false);});
  if(patch){const next=patch.protectedTransition.nextVerification;check(prefix+' saved raw/history preservation '+origin,()=>{for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const[id,raw]of Object.entries(old.draftSnapshot[map]))assert.deepEqual(next.draftSnapshot[map][id],raw);for(const entry of old.draftSnapshot.dependencies.semanticAnswerHistory??[])assert(next.draftSnapshot.dependencies.semanticAnswerHistory.some(h=>JSON.stringify(h)===JSON.stringify(entry)));assert.notEqual(next.status,'verified');const model=P.protectedPacketInformationModelFor(next);assert(model);assert.equal(model.initialAnswers.va_record_origin,origin);assert(!model.reviewSafety.safe);});}
  for(const surface of ['checkout creation','sponsored entitlement','packet generation','participant delivery'])check(prefix+' NO_RECORD '+origin+' '+surface,()=>{const a=packetFulfillmentAuthority('VA',row.route,surface,{trackId:null});assert.equal(a.allowed,false);assert(a.reason.includes('NO_RECORD'));});
 }
 const excluded=run({...row.answers,state_exclusion_categories:['Sex offense or registration']}).evaluation;
 check(prefix+' original exclusion preserved',()=>{assert.equal(excluded.resultCode,'likely_not_eligible');assert(!excluded.reasons.some(r=>r.code==='va.record_origin_unknown'));assert.equal(excluded.paymentAllowed,false);});
 const presentation=await decorate({consumerAuthUserId:'synthetic-va-owner',item:{id:'synthetic-va-origin',jurisdiction:'VA',artifactRefs:{}}},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:old}),readTrustedPendingSource:async()=>({ok:false,reason:'no_source'}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
 check(prefix+' protected presenter explains origin hold',()=>{assert.equal(presentation.authorityStatus,'protected_draft');assert.equal(presentation.resultCode,'needs_more_info');assert.equal(presentation.summary,V.VA_RECORD_ORIGIN_COPY.unknown[0]);assert.equal(resolveRuntimeText('es',presentation.summary),V.VA_RECORD_ORIGIN_COPY.unknown[1]);assert.equal(presentation.commercialActions.generationAllowed,false);assert.deepEqual(old,before);});
 for(const[field,value]of Object.entries({profileVersion:'wrong',profileSourceFingerprint:'wrong',profileAuthorityFingerprint:'wrong',pathwayId:'wrong',packetType:'wrong',selectedTrackId:'wrong',serverFacts:{jurisdiction:'VA',pathway_id:'wrong'}}))check(prefix+' predecessor refuses changed '+field,()=>{const bad=structuredClone(old);bad.draftSnapshot[field]=value;bad.draftHash=P.protectedPacketDraftHash(bad.draftSnapshot);assert.equal(P.protectedPacketInformationModelFor(bad),null);});
 check(prefix+' verified draft never migrates',()=>assert.equal(P.virginiaRecordOriginHeldSuccessor(old.draftSnapshot,missing,'verified'),null));
}
const failed=checks.filter(c=>!c.pass),result={status:failed.length?'FAIL':'PASS',checks:checks.length,failed,details:checks,scope:'Owner item12(c), three compiled VA routes. Actual source/projection/selection/model/save/presenter, synthetic fixtures and read adapters; no live owner or output authority.'};
if(process.env.VA_ORIGIN_EVIDENCE)fs.writeFileSync(process.env.VA_ORIGIN_EVIDENCE,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:result.status,checks:checks.length,failed}));assert.equal(failed.length,0);
