import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const H = await import('../src/lib/rcap-engine/mississippi-first-offender-source-facts.ts');
const {getProfileByJurisdiction} = await import('../src/lib/rcap-engine/profile-registry.ts');
const {evaluateScreening, evaluateMsFirstOffenderProtected, InvalidAnswerError} = await import('../src/lib/rcap-engine/evaluator.ts');
const {evaluateAuthoritativeScreeningResult: authoritative} = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const {recordFactConfirmationFor}=await import('../src/lib/expungement-ai/record-fact-clarification.ts');
const {packetMatterSummaryCopy}=await import('../src/lib/expungement-ai/packet-display-copy.ts');
const {resolveRuntimeText}=await import('../src/lib/expungement-ai/localization.ts');
const {questionAnswerState}=await import('../src/lib/expungement-ai/question-answer-state.ts');
const Q=await import('../src/lib/expungement-ai/ms-first-offender-source-questions.ts');
const {resolvePacketCollection}=await import('../src/lib/expungement-ai/packet-collection.ts');
const {packetSpecificationFor}=await import('../src/lib/rcap/grade-a/packet-specification.ts');
const {decorateBriefcaseItemForPresentationWithDependencies}=await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
const {packetFulfillmentAuthority} = await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const profile = getProfileByJurisdiction('MS'), route = H.MS_FIRST_OFFENDER_ROUTE;
const catalog = JSON.parse(fs.readFileSync(new URL('../data/rcap-ledger/public-witness-answer-sets.json', import.meta.url)));
const rows = Array.isArray(catalog) ? catalog : catalog.witnesses ?? catalog.rows ?? catalog.answerSets;
assert.ok(Array.isArray(rows), 'existing witness catalog shape');
const witness = rows.find(row => row.pathwayKey === `MS:${route}`);
assert.ok(witness, 'original retained witness exists');
const old = structuredClone(witness.finalAnswers);
// New synthetic conviction premise; original dismissed witness stays untouched.
const answers = {...old, case_outcome:'Misdemeanor conviction', offense_level:'Misdemeanor'};
const raw = {
 charge:"Synthetic exact recorded misdemeanor offense and citation",
 ms_misd1_conviction_finality:'final_conviction_record_confirmed',
 ms_misd1_complete_conviction_history:'checked_own_history_no_other_convictions',
 ms_misd1_traffic_record_classification:'nontraffic_nondui_record_confirmed',
 ms_misd1_official_duty_nexus:'not_a_public_official',
 ms_conviction_court:'county', ms_prior_conviction_expungement:'no'
};
const beforeRaw = structuredClone(raw), beforeOld = structuredClone(witness);
let checks=0;
function check(id, fn) { try { fn(); checks++; } catch(error) { console.error(`FAIL ${id}`); throw error; } }
const request = {jurisdiction:'MS', profileVersion:profile.profileVersion,matterId:'synthetic-ms-first-offender-source', answers};
const context = H.projectMsFirstOffenderSourceFacts(profile,route,raw);
check('exact source contract',()=>assert.equal(H.msFirstOffenderSourceContract(profile,route),true));
check('checked typed facts satisfy only source predicates',()=>assert.equal(H.msFirstOffenderSourceDecision(profile,route,answers,context).status,'satisfied'));
check('public baseline unchanged',()=>assert.ok(evaluateScreening(request).reasons.some(r=>r.code==='ms.waiting_rule_not_executed')));
const known = evaluateMsFirstOffenderProtected(request,context);
check('known exact event has no numeric waiting fallback',()=>assert.ok(!known.reasons.some(r=>r.code==='ms.waiting_rule_not_executed')));
console.log(JSON.stringify({baseline:{result:evaluateScreening(request).resultCode,reasons:evaluateScreening(request).reasons.map(r=>r.code)},known:{result:known.resultCode,paymentAllowed:known.paymentAllowed,selectedTrackId:known.selectedTrackId??null,reasons:known.reasons.map(r=>r.code)}}));
for(const id of H.MS_FIRST_OFFENDER_IDS) check(`public rejects ${id}`,()=>assert.throws(()=>evaluateScreening({...request,answers:{...answers,[id]:raw[id]}}),InvalidAnswerError));
check('public rejects unrelated unknown id',()=>assert.throws(()=>evaluateScreening({...request,answers:{...answers,unapproved_source_answer:'yes'}}),InvalidAnswerError));
check('internal public base still rejects typed injected ID',()=>assert.throws(()=>evaluateMsFirstOffenderProtected({...request,answers:{...answers,[H.MS_FIRST_OFFENDER_IDS[0]]:raw[H.MS_FIRST_OFFENDER_IDS[0]]}},context),InvalidAnswerError));
check('structural context forgery refused',()=>assert.throws(()=>evaluateMsFirstOffenderProtected(request,structuredClone(context)),/context refused/));
for (const [id,value] of [
 ['ms_misd1_conviction_finality','unknown_or_disputed'],
 ['ms_misd1_complete_conviction_history',{value:'incomplete_unknown_or_disputed',basis:'participant_checked_own_history'}],
 ['ms_misd1_complete_conviction_history','complete_history_no_other_convictions_reported'],
 ['ms_misd1_complete_conviction_history',{value:'complete_history_no_other_convictions_reported',basis:'self_report_only'}],
 ['ms_misd1_traffic_record_classification','unknown_or_disputed'],
 ['ms_misd1_official_duty_nexus','unknown_or_disputed'],['ms_conviction_court','unknown'],['ms_prior_conviction_expungement','unknown']]) {
 const c=H.projectMsFirstOffenderSourceFacts(profile,route,{...raw,[id]:value});
 const result=evaluateMsFirstOffenderProtected(request,c);
 check(`explicit unresolved ${id}/${JSON.stringify(value)}`,()=>{assert.equal(result.resultCode,'needs_review');assert.equal(result.paymentAllowed,false);assert.ok(result.missingQuestionIds.includes(id));assert.ok(result.reasons.some(r=>r.code==='ms.first_offender_source_facts_unresolved'));});
}
for(const [id,value,code] of [
 ['ms_misd1_conviction_finality','not_final_or_still_pending','conviction_not_final'],
 ['ms_misd1_complete_conviction_history','checked_own_history_other_conviction','first_offender_history_review'],
 ['ms_prior_conviction_expungement','yes','first_offender_history_review'],
 ['ms_misd1_traffic_record_classification','traffic_or_title63_record','traffic_record_review'],
 ['ms_misd1_traffic_record_classification','dui_record','traffic_record_review'],
 ['ms_misd1_official_duty_nexus','official_duty_related','official_duty_exclusion_review']]) {
 const c=H.projectMsFirstOffenderSourceFacts(profile,route,{...raw,[id]:value});
 check(`adverse ${code}/${id}`,()=>{const result=evaluateMsFirstOffenderProtected(request,c);assert.equal(result.resultCode,'needs_review');assert.equal(result.paymentAllowed,false);assert.ok(result.reasons.some(r=>r.code===`ms.first_offender_${code}`));});
}
for(const [key,value] of [['profileVersion','wrong'],['source',{...profile.source,sourceCorpusSha256:'wrong'}],['orderedDecisionRules',[]],['questions',[]],['pathways',[]]]) {
 check(`profile drift ${key}`,()=>assert.equal(H.projectMsFirstOffenderSourceFacts({...profile,[key]:value},route,raw),null));
}
check('other route refuses context admission',()=>assert.equal(H.projectMsFirstOffenderSourceFacts(profile,'adult-non-conviction-expungement',raw),null));
check('other jurisdiction refuses context',()=>assert.equal(H.projectMsFirstOffenderSourceFacts(getProfileByJurisdiction('TX'),route,raw),null));
for(const value of [true,'yes',{value:'final_conviction_record_confirmed',unknown:true},{value:'final_conviction_record_confirmed',unknown:'false'}])check('no boolean/narrative/wrapper inference '+JSON.stringify(value),()=>assert.equal(H.msFirstOffenderSourceDecision(profile,route,answers,H.projectMsFirstOffenderSourceFacts(profile,route,{...raw,ms_misd1_conviction_finality:value})).status,'missing'));
check('no old first-offender/category aliases',()=>assert.equal(H.msFirstOffenderSourceDecision(profile,route,answers,H.projectMsFirstOffenderSourceFacts(profile,route,{offense_category:'nontraffic',first_offender_status:'yes',nontraffic_classification:'yes',prior_relief:'No'})).status,'missing'));
for(const record of [{...answers,case_outcome:old.case_outcome},{...answers,offense_level:'Traffic or driving matter'}])check('contradictory record is held',()=>{const result=evaluateMsFirstOffenderProtected({...request,answers:record},context);assert.equal(result.paymentAllowed,false);assert.ok(!['packet_ready','packet_ready_with_caution'].includes(result.resultCode));});
for(const field of ['financial_obligations','court_requirements_completed','sentence_completion_date','pending_cases','new_convictions_during_waiting_period']) {
 const value=field==='court_requirements_completed'?'no':field==='pending_cases'||field==='new_convictions_during_waiting_period'?'Yes':'No';
 check(`no borrowed felony timing gate ${field}`,()=>{const result=evaluateMsFirstOffenderProtected({...request,answers:{...answers,[field]:value}},context);assert.equal(result.resultCode,known.resultCode);assert.equal(result.paymentAllowed,known.paymentAllowed);assert.equal(result.pathwayId,known.pathwayId);assert.deepEqual(result.reasons,known.reasons);assert.deepEqual(result.missingQuestionIds,known.missingQuestionIds);assert.deepEqual(result.packetPlan,known.packetPlan);});
}
const actual=authoritative(request,context);
check('authoritative pipeline preserves normal engine result',()=>{assert.equal(actual.evaluation.resultCode,known.resultCode);assert.equal(actual.evaluation.paymentAllowed,known.paymentAllowed);assert.equal(actual.evaluation.pathwayId,known.pathwayId);});
check('context and raw facts are unchanged',()=>{assert.deepEqual(raw,beforeRaw);assert.deepEqual(witness,beforeOld);assert.ok(Object.isFrozen(context)&&Object.isFrozen(context.facts));});
// Snapshot creation uses the current guarded server-owned seed mechanism. No
// fixture DB, persisted owner mutation or collected-field claim is made.
const baseline=authoritative(request);
const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:baseline,screeningAnswers:answers,prefilledAnswers:{},packetAnswers:{},dependencies:{},capturedAt:'2026-10-16T00:00:00.000Z'});
check('old source seed exists',()=>assert.ok(seed));
const oldVerification={status:'unverified',draftSnapshot:seed.snapshot,draftHash:seed.hash};
const oldBefore=structuredClone(oldVerification);
const noop=P.packetInformationPatch({existingItem:{id:request.matterId,jurisdiction:'MS',artifactRefs:{}},protectedVerification:oldVerification,answers:{}});
check('pure old raw noop is exact, no verification',()=>{assert.ok(noop);assert.deepEqual(noop.protectedTransition.nextVerification,oldVerification);assert.equal(noop.readyToGenerate,false);});
check('old source facts absent remain held',()=>{
 const model=P.protectedPacketInformationModelFor(oldVerification);
 assert.ok(model); assert.equal(model.reviewSafety.safe,false);
 assert.deepEqual(oldVerification,oldBefore);
});
const withFacts=structuredClone(oldVerification);
Object.assign(withFacts.draftSnapshot.packetAnswers,raw);
withFacts.draftHash=P.protectedPacketDraftHash(withFacts.draftSnapshot);
check('old held authority is not silently revived by unconfirmed facts',()=>{const m=P.protectedPacketInformationModelFor(withFacts);assert.ok(m);assert.equal(m.reviewSafety.safe,false);for(const id of H.MS_FIRST_OFFENDER_IDS)assert.ok(m.recordClarificationIds.includes(id));});
const confirmations=Object.fromEntries(H.MS_FIRST_OFFENDER_IDS.map(id=>[id,recordFactConfirmationFor(`MS:${route}`,id,{...answers,...raw},Q.msFirstOffenderSourceQuestions().find(q=>q.id===id))]));
const freshSeed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:actual,screeningAnswers:answers,packetAnswers:raw,dependencies:{recordFactConfirmations:confirmations},capturedAt:'2026-10-16T00:00:00.000Z'});
check('fresh explicit-context seed retains raw facts',()=>{assert.ok(freshSeed);for(const id of H.MS_FIRST_OFFENDER_IDS)assert.deepEqual(freshSeed.snapshot.packetAnswers[id],raw[id]);});
const verification={status:'unverified',draftSnapshot:freshSeed.snapshot,draftHash:freshSeed.hash};
const verificationBefore=structuredClone(verification);
check('central protected reevaluation consumes separate facts',()=>assert.ok(P.protectedPacketInformationModelFor(verification)));
check('read leaves raw/context provenance unchanged',()=>assert.deepEqual(verification,verificationBefore));
for(const [key,value]of Object.entries({profileVersion:'wrong',profileSourceFingerprint:'wrong',profileAuthorityFingerprint:'wrong',selectedTrackId:'wrong',requiredInputIds:[],serverFacts:{jurisdiction:'MS',pathway_id:'wrong'},packetFamilyIdentifiers:{mode:'wrong',sourceFormIds:[]}})) {
 const bad=structuredClone(verification);bad.draftSnapshot[key]=value;bad.draftHash=P.protectedPacketDraftHash(bad.draftSnapshot);
 check('protected tuple refusal '+key,()=>assert.equal(P.protectedPacketInformationModelFor(bad),null));
}
for(const entry of [{ownership_scope:'No'},{jurisdiction_scope:'Federal'}])check('independent context gate retained '+JSON.stringify(entry),()=>{
 const result=evaluateMsFirstOffenderProtected({...request,answers:{...answers,...entry}},context);
 assert.equal(result.paymentAllowed,false);assert.ok(!['packet_ready','packet_ready_with_caution'].includes(result.resultCode));
});
check('bare adverse scalar is unresolved, never favorable typed provenance',()=>{const d=H.msFirstOffenderSourceDecision(profile,route,answers,H.projectMsFirstOffenderSourceFacts(profile,route,{...raw,ms_misd1_complete_conviction_history:'other_conviction_reported'}));assert.equal(d.status,'missing');assert.ok(d.ids.includes('ms_misd1_complete_conviction_history'));});

const freshModel=P.protectedPacketInformationModelFor(verification);
check('fresh eligibility does not complete protected facts/safety',()=>{assert.ok(freshModel.missingInputIds.length>0);assert.equal(freshModel.reviewSafety.safe,false);});
const verify=P.packetInformationPatch({existingItem:{id:request.matterId,jurisdiction:'MS',artifactRefs:{}},protectedVerification:verification,answers:{},verify:true});
check('actual pure verification consumer refuses incomplete synthetic packet',()=>{assert.ok(verify);assert.equal(verify.readyToGenerate,false);assert.notEqual(verify.protectedTransition.nextVerification.status,'verified');});
const fulfillment={};
for(const surface of ['checkout creation','consumer payment authority','sponsored entitlement','packet generation','packet credit consumption','participant delivery']) {
 const binding={trackId:actual.selectedTrackId,packetFamilyId:actual.evaluation.packetPlan?.sourceFormIds?.[0]??null};
 fulfillment[surface]=packetFulfillmentAuthority('MS',route,surface,binding);
 check('existing fulfillment authority unchanged '+surface,()=>{assert.equal(fulfillment[surface].allowed,false);assert.deepEqual(fulfillment[surface].missing,['fulfillment record']);assert.deepEqual(fulfillment[surface],packetFulfillmentAuthority('MS',route,surface,{trackId:baseline.selectedTrackId,packetFamilyId:baseline.evaluation.packetPlan?.sourceFormIds?.[0]??null}));});
}
console.log(JSON.stringify({protectedSafety:freshModel.reviewSafety,missing:freshModel.missingInputIds,readyToGenerate:verify.readyToGenerate,verificationStatus:verify.protectedTransition.nextVerification.status,fulfillment:Object.fromEntries(Object.entries(fulfillment).map(([key,value])=>[key,{allowed:value.allowed,reason:value.reason,missing:value.missing}]))}));
check('missing exact charge/citation cannot establish complete source predicates',()=>{const d=H.msFirstOffenderSourceDecision(profile,route,answers,H.projectMsFirstOffenderSourceFacts(profile,route,{...raw,charge:{unknown:true,value:raw.charge}}));assert.equal(d.status,'missing');assert.ok(d.ids.includes('charge'));});
for(const [id,value] of [['ms_conviction_court','municipal'],['ms_prior_conviction_expungement','yes']])check('existing reused fact conflicts remain held '+id,()=>assert.equal(H.msFirstOffenderSourceDecision(profile,route,{...answers,[id]:value},context).code,'record_fact_conflict'));
const sibling=structuredClone(profile);sibling.pathways.find(path=>path.id!==route).label+=' unrelated sibling';
check('unrelated sibling label is not full-profile dependency',()=>assert.equal(H.msFirstOffenderSourceContract(sibling,route),true));
for(const [name,mutate]of [
 ['route body',p=>{p.pathways.find(path=>path.id===route).summary+=' drift';}],
 ['route rule',p=>{p.orderedDecisionRules.find(rule=>rule.candidatePathwayIds?.includes(route)).priority+=1;}],
 ['official-duty exclusion',p=>{p.exclusionRules.find(rule=>rule.id==='exclusion-05').ruleText+=' drift';}],
 ['relevant wait row',p=>{p.waitingPeriodRules.find(rule=>rule.id==='wait-17').ruleText+=' drift';}],
 ['relevant question',p=>{p.questions.find(question=>question.id==='case_outcome').prompt+=' drift';}]
]){const bad=structuredClone(profile);mutate(bad);check('narrow relevant source refuses '+name,()=>assert.equal(H.msFirstOffenderSourceContract(bad,route),false));}
for(const value of ['unsure','not sure',"I'm not sure",'I’m not sure','not_sure','Prefer not to say',{value:raw.charge},{value:raw.charge,unknown:true},{value:raw.charge,unknown:'false'}, {value:raw.charge,extra:true}])check('charge matches shared control '+JSON.stringify(value),()=>{
 const d=H.projectMsFirstOffenderSourceFacts(profile,route,{...raw,charge:value});assert.equal(d.facts.charge!==null,questionAnswerState({id:'charge',type:'text_or_unknown'},value)==='known_valid');
});
const emptyModel=P.protectedPacketInformationModelFor(oldVerification);
const actualCollection=P.packetCollectionFor({jurisdiction:'MS',pathwayId:route,requiredInputIds:emptyModel.requiredInputIds,serverFacts:emptyModel.serverFacts,screeningAnswers:emptyModel.screeningAnswers,prefilledAnswers:emptyModel.prefilledAnswers,savedAnswers:emptyModel.packetAnswers,recordOwnQuestionIds:emptyModel.recordOwnQuestionIds});
console.log('COLLECTION',JSON.stringify(actualCollection.facts.filter(f=>[...Q.MS_FIRST_OFFENDER_COLLECTION_IDS,'offense_category'].includes(f.factId))));
check('legacy category becomes optional context on actual collection',()=>{const f=actualCollection.facts.find(f=>f.factId==='offense_category');assert.equal(f.source,'ms_first_offender_legacy_category_context');assert.equal(f.collection,'conditional');assert.equal(f.optional,true);assert.ok(emptyModel.builderQuestions.some(q=>q.id==='offense_category'&&!q.required));});
check('actual protected collection controls installed',()=>{for(const id of Q.MS_FIRST_OFFENDER_COLLECTION_IDS){const q=emptyModel.questions.find(q=>q.id===id);assert.ok(q,id);assert.ok(q.translations?.es?.prompt,id);assert.ok(P.editablePacketInputIds(emptyModel,true).has(id),id);assert.ok(P.heldPacketCorrectionInputIds(emptyModel,'needs_review').has(id),id);}});
for(const q of Q.msFirstOffenderSourceQuestions())for(const option of q.options??[])check('supported EN/ES option '+q.id+'/'+option,()=>{assert.ok(q.optionDisplay[option].label);assert.ok(q.optionDisplay[option].translations.es.label);assert.equal(questionAnswerState(q,option),option==='unknown'?'uncertain':'known_valid');});

const material=P.packetInformationPatch({existingItem:{id:request.matterId,jurisdiction:'MS',artifactRefs:{}},protectedVerification:oldVerification,answers:raw});
check('actual protected source save supports scalar controls',()=>{assert.ok(material);assert.equal(material.readyToGenerate,false);for(const id of H.MS_FIRST_OFFENDER_IDS)assert.deepEqual(material.protectedTransition.nextVerification.draftSnapshot.packetAnswers[id],raw[id]);});
const savedRecord=material.protectedTransition.nextVerification;
const savedModel=P.protectedPacketInformationModelFor(savedRecord);
check('fresh typed source save obtains actual model',()=>assert.ok(savedModel));
const map=JSON.parse(fs.readFileSync(new URL('../data/rcap-all50/overlays/census-v1/ms/ms-misd-1st-set--custom-pleading/production-field-map.json',import.meta.url)));
check('retained output no category consumer',()=>{assert.ok(!JSON.stringify(packetSpecificationFor(`MS:${route}`).documents).includes('offense_category'));assert.ok(!JSON.stringify(map).includes('offense_category'));});
for(const value of ['Misdemeanor','Felony','Traffic','Nontraffic misdemeanor','Amended charge category',{value:'',unknown:true},'Different record detail']){
 const before=structuredClone(savedRecord);
 const update=P.packetInformationPatch({existingItem:{id:request.matterId,jurisdiction:'MS',artifactRefs:{}},protectedVerification:savedRecord,answers:{offense_category:value}});
 check('category independent actual save '+JSON.stringify(value),()=>{assert.ok(update);const next=update.protectedTransition.nextVerification;assert.deepEqual(next.draftSnapshot.packetAnswers.offense_category,value);assert.equal(next.draftSnapshot.resultCode,savedRecord.draftSnapshot.resultCode);assert.equal(next.draftSnapshot.paymentAllowed,savedRecord.draftSnapshot.paymentAllowed);assert.deepEqual(next.draftSnapshot.packetPlan,savedRecord.draftSnapshot.packetPlan);for(const id of H.MS_FIRST_OFFENDER_IDS)assert.deepEqual(next.draftSnapshot.packetAnswers[id],savedRecord.draftSnapshot.packetAnswers[id]);assert.deepEqual(savedRecord,before);assert.equal(update.readyToGenerate,false);});
}
const amended=P.packetInformationPatch({existingItem:{id:request.matterId,jurisdiction:'MS',artifactRefs:{}},protectedVerification:savedRecord,answers:{charge:'Synthetic amended conviction offense and citation'}});
check('material amended offense invalidates dependent facts without raw loss',()=>{assert.ok(amended);const next=amended.protectedTransition.nextVerification;assert.equal(next.draftSnapshot.resultCode,'needs_review');assert.equal(next.draftSnapshot.paymentAllowed,false);for(const id of H.MS_FIRST_OFFENDER_IDS)assert.deepEqual(next.draftSnapshot.packetAnswers[id],savedRecord.draftSnapshot.packetAnswers[id]);const m=P.protectedPacketInformationModelFor(next);assert.ok(m);for(const id of H.MS_FIRST_OFFENDER_IDS)assert.ok(m.recordClarificationIds.includes(id));assert.equal(amended.readyToGenerate,false);});
const reconfirm=P.packetInformationPatch({existingItem:{id:request.matterId,jurisdiction:'MS',artifactRefs:{}},protectedVerification:amended.protectedTransition.nextVerification,answers:{},confirmRecordFacts:[...H.MS_FIRST_OFFENDER_IDS]});
check('explicit same-value reconfirmation after amendment',()=>{assert.ok(reconfirm);assert.equal(reconfirm.protectedTransition.nextVerification.draftSnapshot.resultCode,known.resultCode);assert.equal(reconfirm.readyToGenerate,false);});
const second=structuredClone(savedRecord);second.draftSnapshot.packetAnswers.cause_number='Synthetic different second matter';second.draftHash=P.protectedPacketDraftHash(second.draftSnapshot);
check('copied confirmations do not qualify another matter',()=>{assert.equal(P.protectedPacketInformationModelFor(second),null);assert.deepEqual(savedRecord,material.protectedTransition.nextVerification);});
const item={id:request.matterId,createdAt:'2026-10-16T00:00:00.000Z'};
const presentation=await decorateBriefcaseItemForPresentationWithDependencies({consumerAuthUserId:'synthetic-owner',item},{
 readProtectedVerification:async()=>({ok:true,value:savedRecord}),readProtectedArtifact:async()=>({ok:true,value:null}),
 readPaymentAuthority:async()=>({valid:false,reason:'not_paid'}),readTrustedPendingSource:async()=>({ok:false,reason:'no_synthetic_pending_source'}),evaluateAuthoritative:authoritative
});
console.log('PRESENTATION',JSON.stringify({status:presentation.authorityStatus,summary:presentation.summary,nextSteps:presentation.nextSteps,commerce:presentation.commercialActions}));
check('actual protected presentation retains separate source context',()=>{assert.equal(presentation.pathwayId,route);assert.equal(presentation.resultCode,known.resultCode);assert.equal(presentation.commercialActions.checkoutAllowed,false);assert.equal(presentation.commercialActions.generationAllowed,false);});
check('actual current origin next step is before verification/payment',()=>{assert.ok(known.nextSteps.includes('Review the cautions and complete the required packet facts in Briefcase before verification or payment.'));assert.ok(!known.nextSteps.some(text=>text.includes('after payment')));assert.ok(known.nextSteps.includes('Before filing, follow the filing instructions and complete any required documents, fees or fingerprint steps.'));assert.ok(!known.nextSteps.includes('Do not file until external documents, fees, fingerprints, and instructions are complete.'));});
check('protected summary does not expose new engineering hold reason',()=>{assert.ok(!presentation.summary?.includes('complete checked history'));const copy=packetMatterSummaryCopy(presentation);assert.ok(copy.es);assert.notEqual(copy.es,copy.en);for(const text of presentation.nextSteps)assert.notEqual(resolveRuntimeText('es',text),text);});
const heldCopies=[];
for(const [label,record] of [['unknown',oldVerification],['adverse',P.packetInformationPatch({existingItem:{id:request.matterId,jurisdiction:'MS',artifactRefs:{}},protectedVerification:savedRecord,answers:{ms_misd1_official_duty_nexus:'official_duty_related'}}).protectedTransition.nextVerification]]) {
 const view=await decorateBriefcaseItemForPresentationWithDependencies({consumerAuthUserId:'synthetic-owner',item},{readProtectedVerification:async()=>({ok:true,value:record}),readProtectedArtifact:async()=>({ok:true,value:null}),readPaymentAuthority:async()=>({valid:false,reason:'not_paid'}),readTrustedPendingSource:async()=>({ok:false,reason:'no_synthetic_pending_source'}),evaluateAuthoritative:authoritative});
 check('actual held presentation '+label,()=>{assert.equal(view.resultCode,'needs_review');assert.notEqual(view.authorityStatus,'unavailable');assert.equal(view.commercialActions.checkoutAllowed,false);assert.equal(view.commercialActions.generationAllowed,false);const copy=packetMatterSummaryCopy(view);heldCopies.push({label,copy,nextSteps:view.nextSteps});assert.ok(!view.summary.includes('complete checked history'));});
 console.log('HELD-PRESENTATION',JSON.stringify({label,summary:packetMatterSummaryCopy(view),nextSteps:view.nextSteps}));
}
const legacy=structuredClone(oldVerification);Object.assign(legacy.draftSnapshot.packetAnswers,{offense_category:{value:'Original category text for an amended charge',unknown:true},first_offender_status:'Earlier first-offender narrative',nontraffic_classification:{value:'Earlier classification narrative',unknown:true},ms_misd1_complete_conviction_history:{value:'complete_history_no_other_convictions_reported',basis:'participant_checked_own_history'}});legacy.draftHash=P.protectedPacketDraftHash(legacy.draftSnapshot);
const legacyBefore=structuredClone(legacy),legacyModel=P.protectedPacketInformationModelFor(legacy);
check('old category/narratives/basis object never promote typed facts',()=>{assert.ok(legacyModel);assert.equal(legacyModel.reviewSafety.safe,false);assert.deepEqual(legacy,legacyBefore);});
const legacyNoop=P.packetInformationPatch({existingItem:{id:request.matterId,jurisdiction:'MS',artifactRefs:{}},protectedVerification:legacy,answers:{}});
check('legacy read/noop exact raw and history preservation',()=>{assert.ok(legacyNoop);assert.deepEqual(legacyNoop.protectedTransition.nextVerification,legacyBefore);});
const corrected=P.packetInformationPatch({existingItem:{id:request.matterId,jurisdiction:'MS',artifactRefs:{}},protectedVerification:legacy,answers:raw});
check('explicit supported replacement preserves other legacy context and archives old history shape',()=>{assert.ok(corrected);const next=corrected.protectedTransition.nextVerification.draftSnapshot;for(const id of ['offense_category','first_offender_status','nontraffic_classification'])assert.deepEqual(next.packetAnswers[id],legacy.draftSnapshot.packetAnswers[id]);assert.deepEqual(next.packetAnswers.ms_misd1_complete_conviction_history,raw.ms_misd1_complete_conviction_history);assert.ok(next.dependencies.semanticAnswerHistory?.some(entry=>entry.factId==='ms_misd1_complete_conviction_history'&&JSON.stringify(entry.value)===JSON.stringify(legacy.draftSnapshot.packetAnswers.ms_misd1_complete_conviction_history)));});
const sourceQuestions=new Map(Q.msFirstOffenderSourceQuestions().map(q=>[q.id,q]));
for(const [label,extra] of [['caller-unresolved',{unresolvedRouteFactIds:new Set(['offense_category',H.MS_FIRST_OFFENDER_IDS[0]])}],['human',{override:{needsHumanClassification:['offense_category',H.MS_FIRST_OFFENDER_IDS[0]]}}],['override',{override:{classes:{offense_category:'unresolved',[H.MS_FIRST_OFFENDER_IDS[0]]:'unresolved'}}}]]) {
 const c=resolvePacketCollection({jurisdiction:'MS',pathwayId:route,requiredInputIds:['offense_category',...Q.MS_FIRST_OFFENDER_COLLECTION_IDS],serverFacts:{jurisdiction:'MS',pathway_id:route},screeningAnswers:{...answers,...raw,offense_category:'Misdemeanor'},savedAnswers:{},specification:packetSpecificationFor(`MS:${route}`),questionById:sourceQuestions,...extra});
 check('caller disposition preserved '+label,()=>{for(const id of ['offense_category',H.MS_FIRST_OFFENDER_IDS[0]])assert.ok(!c.facts.find(f=>f.factId===id).source.startsWith('ms_first_offender_'));});
}
check('wrong registered spec cannot gain descriptors',()=>assert.equal(H.msFirstOffenderSourceContract(profile,route,{}),false));
check('unrelated route no MS correction entry',()=>assert.ok(!P.factualPathwayCorrectionIds('MS','non-conviction-expungement-for-dismissal-no-disposition-or-acquittal',answers,true).some(id=>H.MS_FIRST_OFFENDER_IDS.includes(id))));
check('actual held summary and step EN/ES pairs',()=>{for(const row of heldCopies){assert.ok(row.copy.es,JSON.stringify(row));for(const text of row.nextSteps)assert.notEqual(resolveRuntimeText('es',text),text);}});
console.log(`MS first-offender source facts: ${checks} checks PASS; pure source/collector/model/save/presentation checks only; no HTTP/store/browser/qualified-output acceptance.`);
