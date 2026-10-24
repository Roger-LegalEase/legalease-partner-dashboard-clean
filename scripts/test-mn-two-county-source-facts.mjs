import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const root=process.cwd(),load=p=>import(pathToFileURL(path.join(root,p)).href);
const baseline=process.argv.includes('--baseline'),out=process.env.RCAP_MN_TWO_RECEIPT;
if(out)assert(!fs.existsSync(out),'Receipt must be fresh');
if(baseline){
  assert(process.env.RCAP_MN_TWO_PREIMAGES);
  for(const relative of ['src/lib/rcap-engine/packet-planner.ts','src/lib/expungement-ai/packet-collection.ts','src/lib/expungement-ai/packet-information.ts']){
    const url=pathToFileURL(path.join(root,relative)).href;
    const source=ts.transpileModule(fs.readFileSync(path.join(process.env.RCAP_MN_TWO_PREIMAGES,relative),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
    register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}')+'#'+Buffer.from(relative).toString('hex'),{data:{url,source}});
  }
}
const H=await load('src/lib/expungement-ai/mn-two-county-source-facts.ts');
const {getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts');
const {packetPlanForPathway}=await load('src/lib/rcap-engine/packet-planner.ts');
const {resolvePacketCollection}=await load('src/lib/expungement-ai/packet-collection.ts');
const {packetSpecificationFor}=await load('src/lib/rcap/grade-a/packet-specification.ts');
const {selectComposedRoute}=await load('src/lib/rcap-engine/composed-route-selector.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const P=await load('src/lib/expungement-ai/packet-information.ts');
const C=await load('src/lib/expungement-ai/record-fact-clarification.ts');
const profile=getProfileByJurisdiction('MN'),routes=[H.MN_PETITION_ROUTE,H.MN_PROSECUTOR_ROUTE];
const fixtures=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures;
const rows=[],observations=[],transportObservations=[],ssrEvidence=[],originEditableEvidence=[];const test=(name,fn)=>{try{fn();rows.push({name,pass:true});}catch(e){rows.push({name,pass:false,error:e.message,stack:e.stack});}};
const clone=x=>structuredClone(x);
const collect=(route,screeningAnswers={},savedAnswers={},extra={})=>resolvePacketCollection({jurisdiction:'MN',pathwayId:route,
 requiredInputIds:packetPlanForPathway(profile,route).requiredInputIds,serverFacts:{},screeningAnswers,savedAnswers,
 questionById:new Map(H.mnTwoCountyQuestions(route).map(q=>[q.id,q])),specification:packetSpecificationFor('MN:'+route),...extra});
const fixtureFor=route=>fixtures.find(f=>f.pathwayKey==='MN:'+route);
for(const route of routes){
 const plan=packetPlanForPathway(profile,route),ids=H.mnTwoCountyFactIds(route);
 test(route+' exact adopted tuple',()=>assert(H.mnTwoCountySourceContract(profile,route,null)));
 test(route+' distinct required plan inputs',()=>{for(const id of ids)assert(plan.requiredInputIds.includes(id),id);});
 const collection=collect(route,{residency_or_location:'Minnesota residence, not case county',county:'Ramsey',city:'Saint Paul'});
 observations.push({route,plan,collection});
 test(route+' generic answer never fills new facts',()=>{for(const id of ids)assert.equal(collection.knownFacts[id],undefined);});
 test(route+' source required facts replace legacy purpose',()=>{assert.equal(collection.facts.find(f=>f.factId==='residency_or_location').source,'mn_two_county_legacy_context');for(const id of ids)assert.equal(collection.facts.find(f=>f.factId===id).source,'mn_two_county_source_fact');});
 test(route+' explicit required source facts are actually grouped',()=>{for(const id of ids.filter(id=>id!==H.MN_PROSECUTING_CITY))assert(collection.groupedParticipantSections.some(s=>s.factIds.includes(id)));});
 test(route+' wrong source/memo/map/wiring/spec/route refuse',()=>{
  for(const patch of [{memo:{}},{map:{}},{wiring:{}}])assert.equal(H.mnTwoCountySourceContract(profile,route,null,patch),false);
  for(const patch of [p=>p.profileVersion+='x',p=>p.source.sourceCorpusSha256+='x',p=>p.pathways.find(x=>x.id===route).legalAuthority.ruleId+='x']){const changed=clone(profile);patch(changed);assert.equal(H.mnTwoCountySourceContract(changed,route,null),false);}
  assert.equal(H.mnTwoCountySourceContract(profile,route,{}),false);assert.equal(H.mnTwoCountySourceContract(profile,'other',null),false);
 });
 test(route+' explicit route/human/override responsibility is not waived',()=>{
  for(const extra of [{routeDecidingFactIds:new Set(['residency_or_location'])},{unresolvedRouteFactIds:new Set(['residency_or_location'])},{override:{needsHumanClassification:['residency_or_location']}},{override:{classes:{residency_or_location:'render_required'},note:'Exact explicit consumer'}}]){
   const c=collect(route,{}, {},extra);assert.notEqual(c.facts.find(f=>f.factId==='residency_or_location').source,'mn_two_county_legacy_context');
  }
 });
 test(route+' caller-unresolved source inputs retain original scope guard',()=>{
  for(const id of ids){const c=collect(route,{}, {},{unresolvedRouteFactIds:new Set([id])});const f=c.facts.find(f=>f.factId===id);assert.equal(f.collection,'unresolved');assert.equal(f.source,'unresolved_route_rule_scope');assert(c.unresolvedRequiredFacts.includes(id));}
 });
 test(route+' no composed route/authority inference',()=>assert.deepEqual(selectComposedRoute({jurisdiction:'MN',pathwayId:route}),{status:'no_composed_route',trackId:null}));
 test(route+' ENES exact source meanings available',()=>{for(const q of H.mnTwoCountyQuestions(route)){assert(q.required);assert(q.translations.es.prompt);assert(q.translations.es.helperText);}});
 for(const value of [undefined,{unknown:true},'',{value:'',unknown:false}])test(route+' unknown/cleared fresh county never falls back '+JSON.stringify(value),()=>{
  const id=ids[0],saved=value===undefined?{}:{[id]:value};const c=collect(route,{residency_or_location:'Hennepin',county:'Ramsey'},saved);assert.equal(c.knownFacts[id],undefined);assert(c.renderQuestions.includes(id));
 });
 test(route+' fresh fact is same-ID only; saved remains editable',()=>{const id=ids[0],c=collect(route,{[id]:'Ramsey'});assert.equal(c.knownFacts[id],'Ramsey');assert.equal(c.derivedFacts[id],undefined);const saved=collect(route,{}, {[id]:'Ramsey'});assert(saved.renderQuestions.includes(id));});

 const originQuestion=H.mnTargetOriginQuestion(profile,route,packetSpecificationFor('MN:'+route));
 const originAnswers={jurisdiction_scope:'State or local',court:'Hennepin District Court',charge:'Retained target charge'};
 const originMarker=C.recordFactConfirmationFor('MN:'+route,H.MN_TARGET_ORIGIN_ID,originAnswers,originQuestion);
 const clarification=(answers,marker=originMarker,question=originQuestion)=>C.unresolvedRecordFactConfirmations('MN:'+route,answers,new Map([[H.MN_TARGET_ORIGIN_ID,question]]),marker?{[H.MN_TARGET_ORIGIN_ID]:marker}:{});
 test(route+' exact origin descriptor fails closed on actual non-null spec',()=>{assert(originQuestion);assert.equal(H.mnTargetOriginQuestion(profile,route,{}),null);assert.equal(H.mnTargetOriginQuestion(profile,'other',null),null);const drift=clone(profile);drift.profileVersion+='changed';assert.equal(H.mnTargetOriginQuestion(drift,route,null),null);});
 test(route+' original historical State/local is not current target confirmation',()=>{assert(clarification(originAnswers,null).includes(H.MN_TARGET_ORIGIN_ID));assert(originMarker);assert.deepEqual(clarification(originAnswers),[]);});
 test(route+' target identity excludes possession/residence/destination',()=>{
  assert.deepEqual(H.MN_TARGET_ORIGIN_IDENTITY_INPUTS,['court','charge','source_question_04_4-what-were-the-charges-and-statute-numb']);
  for(const id of H.MN_TARGET_ORIGIN_IDENTITY_INPUTS){const changed={...originAnswers,[id]:'A different target value'};assert.notDeepEqual(changed,originAnswers);assert(clarification(changed).includes(H.MN_TARGET_ORIGIN_ID));}
  for(const id of ['source_question_03_3-do-you-have-a-court-file-number','residency_or_location','county','contact_information',H.MN_CASE_COUNTY,H.MN_PROSECUTED_COUNTY])assert.deepEqual(clarification({...originAnswers,[id]:'Unrelated changed context'}),[]);
 });
 test(route+' unknown Federal absent malformed and wrong-route markers retain clarification',()=>{
  for(const value of [undefined,'Federal','I am not sure',{unknown:true},{value:'',unknown:false},{value:['State or local'],unknown:false}])assert(clarification({...originAnswers,jurisdiction_scope:value}).includes(H.MN_TARGET_ORIGIN_ID));
  for(const marker of [{}, {...originMarker,routeKey:'MN:other'},{...originMarker,contractSha256:'wrong'},{...originMarker,status:'unconfirmed'},{...originMarker,inputSha256:'wrong'}])assert(clarification(originAnswers,marker).includes(H.MN_TARGET_ORIGIN_ID));
  for(const change of [q=>q.prompt+='changed',q=>q.translations.es.prompt+='changed',q=>q.options=['State or local','Federal']]){const q=clone(originQuestion);change(q);assert.equal(C.recordFactConfirmationFor('MN:'+route,H.MN_TARGET_ORIGIN_ID,originAnswers,q),null);}
 });

 test(route+' semantic origin/identity changes invalidate retained MN marker monotonically',()=>{
  const recorded={jurisdiction_scope:{...originMarker,legacyValues:[{source:'screeningAnswers',value:'State or local',meaning:'unconfirmed_record_fact',profileVersion:profile.profileVersion,routeKey:'MN:'+route}]},other_fact:{version:1,status:'confirmed',routeKey:'unrelated'}};
  for(const [id,value] of [['jurisdiction_scope','I am not sure'],['jurisdiction_scope',''],...H.MN_TARGET_ORIGIN_IDENTITY_INPUTS.map(id=>[id,'Different target'])]){
   const changed={...originAnswers,[id]:value},invalid=C.mnTargetOriginConfirmationsAfterChange('MN:'+route,originAnswers,changed,recorded);
   assert.equal(invalid.jurisdiction_scope.status,'unconfirmed');assert.deepEqual({...invalid.jurisdiction_scope,status:'confirmed'},recorded.jurisdiction_scope);assert.deepEqual(invalid.other_fact,recorded.other_fact);
   const restored=C.mnTargetOriginConfirmationsAfterChange('MN:'+route,changed,originAnswers,invalid);assert.equal(restored.jurisdiction_scope.status,'unconfirmed');assert(clarification(originAnswers,restored.jurisdiction_scope).includes(H.MN_TARGET_ORIGIN_ID));
  }
  for(const changed of [{...originAnswers,jurisdiction_scope:{value:' State or local ',unknown:false}},{...originAnswers,court:{value:' Hennepin District Court ',unknown:false}},{...originAnswers,contact_information:'Different unrelated contact'},clone(originAnswers)])assert.strictEqual(C.mnTargetOriginConfirmationsAfterChange('MN:'+route,originAnswers,changed,recorded),recorded);
  assert.strictEqual(C.mnTargetOriginConfirmationsAfterChange('MS:unrelated',originAnswers,{...originAnswers,charge:'Changed'},recorded),recorded);
  assert.strictEqual(C.mnTargetOriginConfirmationsAfterChange('NY:unrelated',originAnswers,{...originAnswers,charge:'Changed'},recorded),recorded);
  assert.strictEqual(C.mnTargetOriginConfirmationsAfterChange('GA:unrelated',originAnswers,{...originAnswers,charge:'Changed'},recorded),recorded);
 });
 test(route+' exact rule18 entry removal preserves other unresolved rules sharing same fact',()=>{
  const exact={section:'orderedDecisionRules',ruleId:'rule-18-federal-or-out-of-state-conviction',factIds:['residency_or_location']};
  const others=[{...exact,ruleId:'another-rule'},{...exact,section:'another-section'},{...exact,factIds:['residency_or_location','charge']}];
  assert(H.mnTargetOriginRule18Entry(exact));for(const entry of others)assert.equal(H.mnTargetOriginRule18Entry(entry),false);
  const remaining=[exact,...others].filter(entry=>!H.mnTargetOriginRule18Entry(entry));assert.deepEqual(remaining,others);assert(new Set(remaining.flatMap(entry=>entry.factIds)).has('residency_or_location'));
 });
 test(route+' actual packet caller uses saved precedence and explicit confirmation only',()=>{
  const input={jurisdiction:'MN',pathwayId:route,requiredInputIds:plan.requiredInputIds,serverFacts:{},screeningAnswers:originAnswers,prefilledAnswers:{},savedAnswers:{},recordFactConfirmations:{jurisdiction_scope:originMarker}};
  const unconfirmed=P.packetCollectionFor({...input,recordFactConfirmations:{}});assert.equal(unconfirmed.facts.find(f=>f.factId==='residency_or_location').source,'unresolved_route_rule_scope');
  const confirmed=P.packetCollectionFor(input);assert.notEqual(confirmed.facts.find(f=>f.factId==='residency_or_location').source,'unresolved_route_rule_scope');
  for(const value of ['Federal','I am not sure',{unknown:true},'',{value:'',unknown:false}]){const held=P.packetCollectionFor({...input,savedAnswers:{jurisdiction_scope:value}});assert.equal(held.facts.find(f=>f.factId==='residency_or_location').source,'unresolved_route_rule_scope');}
  const explicitlyUnresolved=P.packetCollectionFor({...input,unresolvedSavedFactIds:['jurisdiction_scope']});assert.equal(explicitlyUnresolved.facts.find(f=>f.factId==='residency_or_location').source,'unresolved_route_rule_scope');
 });
 const fixture=fixtureFor(route);assert(fixture,route);const answers=clone(fixture.answers);
 test(route+' original B counterexample preserves observed source outcome, not entitlement',()=>{
  const answers={ownership_scope:'Yes',jurisdiction_scope:'State or local',case_outcome:'Arrest or citation with no charge filed',offense_level:'Misdemeanor',possible_pathway_context:profile.pathways.find(p=>p.id===route).label,identity_error:'Yes',pending_cases:'No',resolved_timing_bucket:'gt_10_years',court_requirements_completed:'yes'};
  const observed=evaluate({jurisdiction:'MN',profileVersion:profile.profileVersion,matterId:'mn-source-test',answers});
  if(route===H.MN_PETITION_ROUTE)assert(observed.evaluation.reasons.some(r=>r.code==='mn.compiled_rule_match.route-petition-based-expungement-under-609a-02-03'),'Bind the adopted arrest/no-charge compiled held rule.');
  assert.equal(observed.evaluation.pathwayId,route);assert.equal(observed.evaluation.resultCode,route===H.MN_PETITION_ROUTE?'packet_ready_with_caution':'guidance_only');assert.equal(observed.evaluation.paymentAllowed,false,'The adopted arrest/no-charge petition rule remains held; collection grants no payment.');assert.equal(observed.selectedTrackId,null);
 });
 test(route+' retained diagnostic is not entitled by collection',()=>{
  const before=evaluate({jurisdiction:'MN',profileVersion:profile.profileVersion,matterId:'mn-source-test',answers});
  assert.throws(()=>evaluate({jurisdiction:'MN',profileVersion:profile.profileVersion,matterId:'mn-source-test',answers:{...answers,[ids[0]]:'Ramsey'}}),/Unknown question ids/);
  assert.equal(before.evaluation.pathwayId,route);
 });
 const authoritative=evaluate({jurisdiction:'MN',profileVersion:profile.profileVersion,matterId:'mn-source-test',answers});
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,dependencies:{commercialFlowVersion:1},capturedAt:'2026-10-16T00:00:00Z'});assert(seed);
 seed.snapshot.packetAnswers.residency_or_location={value:'Original raw location',unknown:false};
 seed.snapshot.dependencies.semanticAnswerHistory=[{factId:'residency_or_location',value:'Older original location',source:'packetAnswers',meaning:'prior_answer_for_shape_clarification',routeKey:'MN:'+route,profileVersion:profile.profileVersion,profileSourceFingerprint:seed.snapshot.profileSourceFingerprint,profileAuthorityFingerprint:seed.snapshot.profileAuthorityFingerprint}];
 let record={status:'unverified',reason:'synthetic-source-test',revision:3,draftHash:P.protectedPacketDraftHash(seed.snapshot),draftSnapshot:seed.snapshot};
 const original=clone(record),model=P.protectedPacketInformationModelFor(record);
 test(route+' held model and builder offer exact existing origin ENES confirmation',()=>{
  assert(model.recordClarificationIds.includes(H.MN_TARGET_ORIGIN_ID));assert(P.editablePacketInputIds(model,true).has(H.MN_TARGET_ORIGIN_ID));
  assert.deepEqual(model.questions.find(q=>q.id===H.MN_TARGET_ORIGIN_ID),originQuestion);assert(model.builderQuestions.some(q=>q.id===H.MN_TARGET_ORIGIN_ID));assert(originQuestion.translations.es.prompt);
 });
 test(route+' protected same-value confirmation is material and preserves raw/history/noop',()=>{
  const before=clone(original),patch=P.packetInformationPatch({existingItem:{id:'mn-source-test',state:'MN',artifactRefs:{}},answers:{},confirmRecordFacts:[H.MN_TARGET_ORIGIN_ID],protectedVerification:before});assert(patch);
  const next=patch.protectedTransition.nextVerification;assert.equal(patch.protectedTransition.expectedPriorRevision,before.revision);assert.equal(next.revision,before.revision+1);assert.notEqual(next.status,'verified');
  assert.deepEqual(next.draftSnapshot.screeningAnswers,before.draftSnapshot.screeningAnswers);assert.deepEqual(next.draftSnapshot.packetAnswers,before.draftSnapshot.packetAnswers);assert.deepEqual(next.draftSnapshot.dependencies.semanticAnswerHistory,before.draftSnapshot.dependencies.semanticAnswerHistory);
  assert.equal(next.draftSnapshot.dependencies.recordFactConfirmations.jurisdiction_scope.status,'confirmed');assert.equal(next.draftSnapshot.paymentAllowed,before.draftSnapshot.paymentAllowed);assert.equal(next.draftSnapshot.selectedTrackId,before.draftSnapshot.selectedTrackId);
  const m=P.protectedPacketInformationModelFor(next);assert(!m.recordClarificationIds.includes(H.MN_TARGET_ORIGIN_ID));assert.equal(m.reviewSafety.safe,false,'Independent charge/route hold remains');
  const noop=P.packetInformationPatch({existingItem:{id:'mn-source-test',state:'MN',artifactRefs:{}},answers:{},protectedVerification:next});assert(noop);assert.deepEqual(noop.protectedTransition.nextVerification,next);
  for(const id of ['court','charge']){const altered=clone(next);altered.draftSnapshot.packetAnswers[id]='Changed target '+id;altered.draftHash=P.protectedPacketDraftHash(altered.draftSnapshot);const m=P.protectedPacketInformationModelFor(altered);assert(m.recordClarificationIds.includes(H.MN_TARGET_ORIGIN_ID));}
 });

 test(route+' plain model offers the same exact source descriptors',()=>{
  const m=P.packetInformationModelFor({id:'mn-source-test',state:'MN',resultCode:'packet_ready_with_caution',pathwayLabel:profile.pathways.find(p=>p.id===route).label,artifactRefs:{}});
  assert(m);for(const id of ids){assert(m.requiredInputIds.includes(id));assert.deepEqual(m.questions.find(q=>q.id===id),model.questions.find(q=>q.id===id));}
 });
 test(route+' old exact plan is recoverable without raw read mutation',()=>{
  if(!record.draftSnapshot.packetPlan)return;
  const old=clone(record);old.draftSnapshot.packetPlan.requiredInputIds=old.draftSnapshot.packetPlan.requiredInputIds.filter(id=>!ids.includes(id));
  old.draftSnapshot.requiredInputIds=old.draftSnapshot.packetPlan.requiredInputIds;
  old.draftHash=P.protectedPacketDraftHash(old.draftSnapshot);const before=clone(old);
  const recovered=P.protectedPacketInformationModelFor(old);assert(recovered);for(const id of ids)assert(recovered.requiredInputIds.includes(id));assert.deepEqual(old,before);
  assert(P.mnTwoCountyDraftSuccessor(old.draftSnapshot,authoritative,'unverified'));
  assert(P.mnTwoCountyDraftSuccessor(old.draftSnapshot,authoritative,'invalidated'));
  assert.equal(P.mnTwoCountyDraftSuccessor(old.draftSnapshot,authoritative,'verified'),null);
  assert.equal(P.mnTwoCountyDraftSuccessor({...old.draftSnapshot,packetPlan:null,requiredInputIds:[],packetFamilyIdentifiers:{mode:null,sourceFormIds:[]}},authoritative,'unverified'),null,'A genuinely absent plan is never manufactured');
  assert.equal(P.mnTwoCountyDraftSuccessor({...old.draftSnapshot,schemaVersion:'expungement-ai/final-verification/v1'},authoritative,'unverified'),null);
  for(const change of [x=>x.serverFacts.injected='x',x=>x.profileSourceFingerprint+='x',x=>x.profileAuthorityFingerprint+='x',x=>x.profileVersion+='x',x=>x.paymentAllowed=!x.paymentAllowed,x=>x.resultCode='likely_not_eligible',x=>x.selectedTrackId='invented',x=>x.packetFamilyIdentifiers.mode='invented',x=>x.packetPlan.formMappingStatus='invented',x=>x.requiredInputIds.push('invented')]){
    const altered=clone(old.draftSnapshot);change(altered);assert.notDeepEqual(altered,old.draftSnapshot,'Every negative control must actually mutate the preimage');assert.equal(P.mnTwoCountyDraftSuccessor(altered,authoritative,'unverified'),null);
  }

 });
 test(route+' protected source questions and legacy view',()=>{assert(model);for(const id of ids){assert(model.requiredInputIds.includes(id));assert(model.questions.some(q=>q.id===id));assert(P.editablePacketInputIds(model,true).has(id));}assert.equal(model.questions.find(q=>q.id==='residency_or_location').required,true,'Actual unresolved record-origin rule is not waived by a new county fact');const c=P.packetCollectionFor({jurisdiction:'MN',pathwayId:route,requiredInputIds:model.requiredInputIds,serverFacts:model.serverFacts,screeningAnswers:model.screeningAnswers,prefilledAnswers:model.prefilledAnswers,savedAnswers:model.packetAnswers});assert.equal(c.facts.find(f=>f.factId==='residency_or_location').source,'unresolved_route_rule_scope');assert.deepEqual(record,original);});
 const item={id:'mn-source-test',state:'MN',jurisdiction:'MN',artifactRefs:{},resultCode:authoritative.evaluation.resultCode,pathwayLabel:authoritative.evaluation.pathwayLabel};
 test(route+' ordinary read/noop retains exact maps/history',()=>{const patch=P.packetInformationPatch({existingItem:item,answers:{},protectedVerification:record});assert(patch);assert.deepEqual(patch.protectedTransition.nextVerification,record);assert.equal(patch.protectedTransition.expectedPriorRevision,3);});
 test(route+' exact fresh fact can be saved without commerce/legacy loss',()=>{const patch=P.packetInformationPatch({existingItem:item,answers:{[ids[0]]:'Ramsey'},protectedVerification:record});assert(patch);record=patch.protectedTransition.nextVerification;assert.notEqual(record.status,'verified');assert.deepEqual(record.draftSnapshot.packetAnswers.residency_or_location,original.draftSnapshot.packetAnswers.residency_or_location);assert.deepEqual(record.draftSnapshot.dependencies.semanticAnswerHistory,original.draftSnapshot.dependencies.semanticAnswerHistory);assert.equal(record.draftSnapshot.packetAnswers[ids[0]],'Ramsey');assert.equal(record.draftSnapshot.paymentAllowed,original.draftSnapshot.paymentAllowed);assert.equal(record.draftSnapshot.resultCode,original.draftSnapshot.resultCode);assert.equal(record.draftSnapshot.selectedTrackId,original.draftSnapshot.selectedTrackId);assert.equal(P.protectedPacketInformationModelFor(record).reviewSafety.safe,false);});
 test(route+' unknown explicit save retains literal and cannot refill',()=>{const patch=P.packetInformationPatch({existingItem:item,answers:{[ids[0]]:{unknown:true}},protectedVerification:record});assert(patch);const next=patch.protectedTransition.nextVerification;assert.deepEqual(next.draftSnapshot.packetAnswers[ids[0]],{unknown:true});const m=P.protectedPacketInformationModelFor(next);const c=P.packetCollectionFor({jurisdiction:'MN',pathwayId:route,requiredInputIds:m.requiredInputIds,serverFacts:m.serverFacts,screeningAnswers:m.screeningAnswers,prefilledAnswers:m.prefilledAnswers,savedAnswers:m.packetAnswers});assert(c.renderQuestions.includes(ids[0]));assert.equal(c.knownFacts[ids[0]],undefined);});
 test(route+' unknown county cannot produce verified acceptance',()=>{
  const unknown=P.packetInformationPatch({existingItem:item,answers:{[ids[0]]:{unknown:true}},protectedVerification:record});assert(unknown);
  const attempted=P.packetInformationPatch({existingItem:item,answers:{},verify:true,protectedVerification:unknown.protectedTransition.nextVerification});
  assert(!attempted||attempted.protectedTransition.nextVerification.status!=='verified');
 });
 test(route+' source tamper does not grant correction entry',()=>{const altered=clone(record);altered.draftSnapshot.profileSourceFingerprint+='x';altered.draftHash=P.protectedPacketDraftHash(altered.draftSnapshot);const m=P.protectedPacketInformationModelFor(altered);assert.equal(m,null);assert.equal(H.mnTwoCountySourceContract({...profile,profileVersion:'wrong'},route,null),false);assert.equal(P.factualPathwayCorrectionIds('OH',route,{}).some(id=>ids.includes(id)),false);});
}
for(const kind of ['county_attorney','city_attorney','unknown','',undefined])test('prosecuting city depends only on explicit kind '+kind,()=>{const c=collect(H.MN_PROSECUTOR_ROUTE,{[H.MN_PROSECUTOR_KIND]:'city_attorney',[H.MN_PROSECUTING_CITY]:'Saint Paul'},{[H.MN_PROSECUTOR_KIND]:kind});const f=c.facts.find(f=>f.factId===H.MN_PROSECUTING_CITY);assert.equal(f.active,kind==='city_attorney');});
// Exact four accepted MN sibling collections/plans are compared to the
// preserved preimage execution, not re-approved or run as four owner suites.
const siblings=profile.pathways.filter(p=>!routes.includes(p.id)).map(p=>({route:p.id,
  plan:packetPlanForPathway(profile,p.id),collection:collect(p.id,{residency_or_location:'Original retained location'})}));
if(!baseline&&process.env.RCAP_MN_TWO_BASELINE){
 const predecessor=JSON.parse(fs.readFileSync(process.env.RCAP_MN_TWO_BASELINE));
 test('all four accepted MN siblings remain exact',()=>assert.deepEqual(siblings,predecessor.siblings));
}

if(!baseline){
 const compile=(relative,source)=>register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}')+'#'+Buffer.from(relative).toString('hex'),{data:{url:pathToFileURL(path.join(root,relative)).href,source:ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}});
 const localization='src/components/expungement-ai/LocalizationProvider.tsx';compile(localization,fs.readFileSync(localization,'utf8')+'\nexport {LocalizationContext};');
 const {LocalizationContext}=await load(localization),React=await import('react'),{renderToStaticMarkup}=await import('react-dom/server');
 const {t,resolveRuntimeText}=await load('src/lib/expungement-ai/localization.ts');
 const {AppRouterContext}=await import(pathToFileURL(fs.realpathSync('node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js')).href);
 const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await load('src/lib/expungement-ai/briefcase-presentation-authority.ts');
 let stored,sourceAnswers,owner='synthetic-mn-owner';const item={id:'synthetic-mn-source-bridge',state:'MN',jurisdiction:'MN',artifactRefs:{}};
 const presentation=()=>decorate({consumerAuthUserId:owner,item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:'MN',profileVersion:profile.profileVersion,matterId:item.id,answers:sourceAnswers,product:'expungement_ai_dtc',sourceSessionId:'synthetic-only',claimedAt:'2026-10-16T00:00:00Z',partnerBenefitActive:false,partnerSlug:null}}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
 globalThis.__mnTwoTransport={requireConsumerBriefcaseSession:async()=>({userId:owner,userEmail:'synthetic@example.invalid'}),getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:owner}),getBriefcaseItem:async(user,id)=>user==='synthetic-mn-owner'&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:presentation,persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);stored=clone(transition.nextVerification);return{ok:true,value:stored}},protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no substitute seed')},readTrustedBriefcasePresentationSource:()=>{throw Error('no substitute source')}};
 const substitute=(source,bindings,module)=>{const regex=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(regex.test(source),module);return source.replace(regex,bindings.map(b=>'const '+b+'=(...args:unknown[])=>(globalThis as any).__mnTwoTransport.'+b+'(...args);').join('\n'));};
 for(const relative of ['src/app/briefcase/[packetId]/page.tsx','src/app/briefcase/[packetId]/packet-information/page.tsx']){
  let source=fs.readFileSync(relative,'utf8');source=source.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/,'import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";');
  source=source.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');
  for(const[b,m]of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority'],['readProtectedPacketVerification','verification-cas']])source=substitute(source,[b],'@/lib/expungement-ai/'+m);
  compile(relative,source);
 }
 const Matter=(await load('src/app/briefcase/[packetId]/page.tsx')).default,Editor=(await load('src/app/briefcase/[packetId]/packet-information/page.tsx')).default;
 const apiRelative='src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts';let apiSource=fs.readFileSync(apiRelative,'utf8');for(const[b,m]of [[['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],[['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],[['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']])apiSource=substitute(apiSource,b,m);compile(apiRelative,apiSource);const API=await load(apiRelative);
 const html=(tree,locale)=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){},replace(){},refresh(){}}},React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,opts)=>resolveRuntimeText(locale,text,opts)}},tree)));
 const url='http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information',context={params:Promise.resolve({itemId:item.id})};
 const post=async(answers,extra={})=>{const before=clone(stored),body={expectedRevision:stored.revision,answers,...extra};const response=await API.POST(new Request(url,{method:'POST',body:JSON.stringify(body)}),context);transportObservations.push({route:before.draftSnapshot.pathwayId,request:body,status:response.status,body:await response.clone().json(),before,after:clone(stored)});return response;};
 const asyncTest=async(name,fn)=>{try{await fn();rows.push({name,pass:true});}catch(e){rows.push({name,pass:false,error:e.message,stack:e.stack});}};
 for(const route of routes){
  const originQuestion=H.mnTargetOriginQuestion(profile,route,packetSpecificationFor('MN:'+route));
  sourceAnswers=clone(fixtureFor(route).answers);const authoritative=evaluate({jurisdiction:'MN',profileVersion:profile.profileVersion,matterId:item.id,answers:sourceAnswers});
  const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:sourceAnswers,dependencies:{commercialFlowVersion:1},capturedAt:'2026-10-16T00:00:00Z'});assert(seed);
  if(seed.snapshot.packetPlan){seed.snapshot.packetPlan.requiredInputIds=seed.snapshot.packetPlan.requiredInputIds.filter(id=>!H.mnTwoCountyFactIds(route).includes(id));seed.snapshot.requiredInputIds=seed.snapshot.packetPlan.requiredInputIds;}
  seed.snapshot.packetAnswers.residency_or_location={value:'Exact old raw location',unknown:false};
  stored={status:'unverified',reason:'old-synthetic-draft',revision:7,draftHash:P.protectedPacketDraftHash(seed.snapshot),draftSnapshot:seed.snapshot};const old=clone(stored);
  for(const locale of ['en','es'])await asyncTest(route+' actual old matter/editor entry '+locale,async()=>{
   const matter=html(await Matter({params:Promise.resolve({packetId:item.id})}),locale);assert(matter.includes('/briefcase/'+item.id+'/packet-information'));assert(!matter.includes('Details unavailable'));assert(!matter.includes('Detalles no disponibles'));
   const page=html(await Editor({params:Promise.resolve({packetId:item.id}),searchParams:Promise.resolve({edit:H.mnTwoCountyFactIds(route)[0]})}),locale);const prompt=H.mnTwoCountyQuestions(route)[0].translations?.[locale]?.prompt??H.mnTwoCountyQuestions(route)[0].prompt;assert(page.includes(renderToStaticMarkup(React.createElement('span',null,prompt)).slice(6,-7)));assert.deepEqual(stored,old);if(out){for(const [kind,markup]of [['matter',matter],['editor',page]]){const file=out.replace(/\.json$/,'.'+(route===H.MN_PETITION_ROUTE?'petition':'prosecutor')+'.'+kind+'.'+locale+'.html');fs.writeFileSync(file,markup,{flag:'wx'});ssrEvidence.push({route,kind,locale,file,bytes:Buffer.byteLength(markup)});}}
  });
  await asyncTest(route+' protected actual GET exposes required source IDs/commercial flags',async()=>{const response=await API.GET(new Request(url),context);assert.equal(response.status,200);const body=await response.json();for(const id of H.mnTwoCountyFactIds(route))assert(JSON.stringify(body).includes(id));const present=await presentation();assert.equal(present.commercialActions.fulfillmentAvailable,false);assert.equal(present.commercialActions.checkoutAllowed,false);assert.equal(present.commercialActions.generationAllowed,false);assert.deepEqual(stored,old);});
  await asyncTest(route+' protected actual noop preserves exact old record',async()=>{const response=await post({});assert.equal(response.status,200);assert.deepEqual(stored,old);});
  await asyncTest(route+' protected actual source-fact material save preserves raw',async()=>{const response=await post({[H.mnTwoCountyFactIds(route)[0]]:'Ramsey'});assert.equal(response.status,200);assert.deepEqual(stored.draftSnapshot.packetAnswers.residency_or_location,old.draftSnapshot.packetAnswers.residency_or_location);assert.equal(stored.draftSnapshot.packetAnswers[H.mnTwoCountyFactIds(route)[0]],'Ramsey');assert.notEqual(stored.status,'verified');if(!old.draftSnapshot.packetPlan)assert.equal(stored.draftSnapshot.packetPlan,null);});
  await asyncTest(route+' posted-field owner/CAS/verify controls remain',async()=>{const revision=stored.revision;assert.equal((await post({unowned_fact:'x'})).status,422);assert.equal((await post({},{expectedRevision:revision-1})).status,409);owner='wrong-owner';assert.equal((await post({})).status,404);owner='synthetic-mn-owner';const verify=await post({},{verify:true});assert.equal(verify.status,200,'The existing API saves a truthful unverified draft; HTTP200 is not verification');const verifiedBody=await verify.json();assert.equal(verifiedBody.ok,true);assert.equal(verifiedBody.readyToGenerate,false);assert.equal(verifiedBody.reviewReason,'packet_information_incomplete');assert.equal(stored.status,'invalidated');assert.equal(stored.reason,'packet_information_incomplete');assert.equal(stored.snapshot,undefined);assert.equal(stored.hash,undefined);assert.equal(stored.revision,revision+1);const present=await presentation();assert.equal(present.commercialActions.checkoutAllowed,false);assert.equal(present.commercialActions.generationAllowed,false);});
  await asyncTest(route+' actual protected API explicit same-value origin confirmation/CAS/noop',async()=>{
   const before=clone(stored);const response=await post({},{confirmRecordFacts:[H.MN_TARGET_ORIGIN_ID]});assert.equal(response.status,200);
   assert.equal(stored.revision,before.revision+1);assert.equal(stored.draftSnapshot.dependencies.recordFactConfirmations.jurisdiction_scope.status,'confirmed');assert.notEqual(stored.status,'verified');
   assert.deepEqual(stored.draftSnapshot.screeningAnswers,before.draftSnapshot.screeningAnswers);assert.deepEqual(stored.draftSnapshot.packetAnswers,before.draftSnapshot.packetAnswers);assert.deepEqual(stored.draftSnapshot.dependencies.semanticAnswerHistory,before.draftSnapshot.dependencies.semanticAnswerHistory);
   const confirmed=clone(stored);assert.equal((await post({})).status,200);assert.deepEqual(stored,confirmed);
   assert.equal((await post({},{expectedRevision:before.revision})).status,409);assert.deepEqual(stored,confirmed);
   const model=P.protectedPacketInformationModelFor(stored);assert(!model.recordClarificationIds.includes(H.MN_TARGET_ORIGIN_ID));assert.equal(model.reviewSafety.safe,false);
   for(const locale of ['en','es']){const page=html(await Editor({params:Promise.resolve({packetId:item.id}),searchParams:Promise.resolve({edit:H.MN_TARGET_ORIGIN_ID})}),locale);const prompt=originQuestion.translations?.[locale]?.prompt??originQuestion.prompt;assert(page.includes(renderToStaticMarkup(React.createElement('span',null,prompt)).slice(6,-7)));}
   assert.equal((await post({jurisdiction_scope:{unknown:true}})).status,422,'Unsupported wrapper is rejected atomically');assert.deepEqual(stored,confirmed);
   const unknown=await post({jurisdiction_scope:'I am not sure'});assert.equal(unknown.status,200);assert(P.protectedPacketInformationModelFor(stored).recordClarificationIds.includes(H.MN_TARGET_ORIGIN_ID));const uncertain=clone(stored);assert.equal((await post({},{confirmRecordFacts:[H.MN_TARGET_ORIGIN_ID]})).status,422);assert.deepEqual(stored,uncertain);
   assert.equal((await post({jurisdiction_scope:'State or local'})).status,200);assert(P.protectedPacketInformationModelFor(stored).recordClarificationIds.includes(H.MN_TARGET_ORIGIN_ID),'Saving scalar does not silently reconfirm');
   assert.equal((await post({},{confirmRecordFacts:[H.MN_TARGET_ORIGIN_ID]})).status,200);

   const beforeIdentityModel=P.protectedPacketInformationModelFor(stored);const editableBeforeIdentity=[...P.editablePacketInputIds(beforeIdentityModel,true)];originEditableEvidence.push({route,revision:stored.revision,pathwayId:stored.draftSnapshot.pathwayId,editableIds:editableBeforeIdentity,courtQuestion:beforeIdentityModel.questions.find(q=>q.id==='court'),recordClarificationIds:beforeIdentityModel.recordClarificationIds});assert(editableBeforeIdentity.includes('court'),'Existing collection must actually own court before any identity POST');
   for(const [id,value] of [['court','Different target court']]){
    const beforeChange=clone(stored),originalValue={...stored.draftSnapshot.screeningAnswers,...stored.draftSnapshot.prefilledAnswers,...stored.draftSnapshot.packetAnswers}[id]??'';
    assert.equal((await post({[id]:value})).status,200);assert.equal(stored.draftSnapshot.dependencies.recordFactConfirmations.jurisdiction_scope.status,'unconfirmed');
    const invalidated=clone(stored.draftSnapshot.dependencies.recordFactConfirmations.jurisdiction_scope);assert.deepEqual(invalidated.legacyValues,beforeChange.draftSnapshot.dependencies.recordFactConfirmations.jurisdiction_scope.legacyValues);
    assert.equal((await post({[id]:originalValue})).status,200);assert.equal(stored.draftSnapshot.dependencies.recordFactConfirmations.jurisdiction_scope.status,'unconfirmed');assert(P.protectedPacketInformationModelFor(stored).recordClarificationIds.includes(H.MN_TARGET_ORIGIN_ID));
    assert.equal((await post({},{confirmRecordFacts:[H.MN_TARGET_ORIGIN_ID]})).status,200);assert.equal(stored.draftSnapshot.dependencies.recordFactConfirmations.jurisdiction_scope.status,'confirmed');
   }
   assert.equal((await post({court:'Intermediate target requiring reconfirmation'})).status,200);assert(P.protectedPacketInformationModelFor(stored).recordClarificationIds.includes(H.MN_TARGET_ORIGIN_ID));
   const sameTransaction=await post({court:'Explicit new target court'},{confirmRecordFacts:[H.MN_TARGET_ORIGIN_ID]});assert.equal(sameTransaction.status,200);assert.equal(stored.draftSnapshot.dependencies.recordFactConfirmations.jurisdiction_scope.status,'confirmed');assert(!P.protectedPacketInformationModelFor(stored).recordClarificationIds.includes(H.MN_TARGET_ORIGIN_ID));
   const normalizedPrior=clone(stored.draftSnapshot.dependencies.recordFactConfirmations.jurisdiction_scope);assert.equal((await post({court:{value:' Explicit new target court ',unknown:false}})).status,200);assert.deepEqual(stored.draftSnapshot.dependencies.recordFactConfirmations.jurisdiction_scope,normalizedPrior,'Meaning-equivalent wrapper/whitespace does not invalidate');
   const final=clone(stored);const otherId='another-matter';const foreignContext={params:Promise.resolve({itemId:otherId})};assert.equal((await API.POST(new Request(url.replace(item.id,otherId),{method:'POST',body:JSON.stringify({expectedRevision:stored.revision,answers:{},confirmRecordFacts:[H.MN_TARGET_ORIGIN_ID],recordFactConfirmations:stored.draftSnapshot.dependencies.recordFactConfirmations})}),foreignContext)).status,404);assert.deepEqual(stored,final);
   const present=await presentation();for(const key of ['checkoutAllowed','generationAllowed','fulfillmentAvailable'])assert.equal(present.commercialActions[key],false);
   // Original no-charge case stays unchanged. Its inactive prosecutor
   // response cannot be used to manufacture a source-compatible population.
   if (route === H.MN_PROSECUTOR_ROUTE) {
    const beforeStage = clone(stored),stageModel=P.protectedPacketInformationModelFor(stored);
    assert.equal(stageModel.mnSourceStageCandidate.status,'held');
    assert.equal(stageModel.mnSourceStageCandidate.candidate,null);
    assert(!stageModel.questions.some(q=>q.id==='mn_prosecutor_sealing_response'));
    assert(!stageModel.mnSourceStageCandidate.missingFactIds.includes('case_outcome'));
    for(const response of ['not_requested','awaiting_response','agreed','declined','negotiation','unknown']) {
     assert.equal((await post({mn_prosecutor_sealing_response:response})).status,422);
     assert.deepEqual(stored,beforeStage,'Inactive response refusal preserves complete original record/history');
    }
    assert.equal((await post({})).status,200);assert.deepEqual(stored,beforeStage);
   }
   const beforeClear=clone(stored);assert.equal((await post({jurisdiction_scope:''})).status,200);assert.equal(stored.draftSnapshot.pathwayId,null);assert.equal(stored.draftSnapshot.dependencies.recordFactConfirmations.jurisdiction_scope.status,'unconfirmed');assert.deepEqual(stored.draftSnapshot.dependencies.recordFactConfirmations.jurisdiction_scope.legacyValues,beforeClear.draftSnapshot.dependencies.recordFactConfirmations.jurisdiction_scope.legacyValues);
   const cleared=clone(stored),restore=await post({jurisdiction_scope:'State or local'});assert.equal(restore.status,403);assert.deepEqual(await restore.json(),{ok:false,error:'packet_information_unavailable'});assert.deepEqual(stored,cleared,'No route means no protected correction entry; refused restoration is atomic');

  });

 }
 // Separate synthetic conviction premise, never a conversion of original
 // no-charge evidence. Existing offered answers only; no statutory qualification
 // or institutional programme/agreement is inferred from these handler checks.
 for(const route of routes)await asyncTest(route+' synthetic current protected source stage GET POST resume ENES',async()=>{
  sourceAnswers={...clone(fixtureFor(route).answers),case_outcome:'Misdemeanor conviction',sentence_completion_date:'No'};
  const beforeSource=clone(sourceAnswers);
  const authoritative=evaluate({jurisdiction:'MN',profileVersion:profile.profileVersion,matterId:item.id,answers:sourceAnswers});
  const seeded=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:sourceAnswers,dependencies:{commercialFlowVersion:1},capturedAt:'2026-10-16T00:00:00Z'});assert(seeded);
  assert.equal(seeded.snapshot.pathwayId,route,'Require natural route; never override a selector result');
  stored={status:'unverified',reason:'synthetic-current-source-stage',revision:0,draftHash:P.protectedPacketDraftHash(seeded.snapshot),draftSnapshot:seeded.snapshot};
  const mapNames=['screeningAnswers','prefilledAnswers','packetAnswers','serverFacts'];
  const seededMaps=Object.fromEntries(mapNames.map(name=>[name,clone(seeded.snapshot[name])]));
  const seededUnion={...seededMaps.screeningAnswers,...seededMaps.prefilledAnswers,...seededMaps.packetAnswers,...seededMaps.serverFacts};
  for(const [id,value] of Object.entries(beforeSource)){assert(Object.hasOwn(seededUnion,id),'Every supplied key retained in actual seeded disjoint union: '+id);assert.deepEqual(seededUnion[id],value);}
  const seededHistory=clone(seeded.snapshot.dependencies.semanticAnswerHistory??[]);
  const editedStageIds=new Set(['sentence_completion_date','mn_sentence_discharge_date','mn_new_conviction_since_discharge','mn_prosecutor_sealing_response']);
  const unedited=map=>Object.fromEntries(Object.entries(map).filter(([id])=>!editedStageIds.has(id)));
  const assertSeededNoneditedMaps=()=>{
   for(const name of mapNames)assert.deepEqual(unedited(stored.draftSnapshot[name]),unedited(seededMaps[name]),'All nonedited seeded '+name+' entries stay exact');
   assert.deepEqual((stored.draftSnapshot.dependencies.semanticAnswerHistory??[]).slice(0,seededHistory.length),seededHistory);
  };
  const get=await API.GET(new Request(url),context);assert.equal(get.status,200);const initialBody=await get.json();assert(JSON.stringify(initialBody).includes('sentence_completion_date'));
  let m=P.protectedPacketInformationModelFor(stored);assert(m.questions.some(q=>q.id==='sentence_completion_date'&&q.type==='yes_no_unsure'));
  assert(!m.questions.some(q=>q.id==='mn_sentence_discharge_date'));assert(!m.questions.some(q=>q.id==='mn_new_conviction_since_discharge'));
  for(const locale of ['en','es']){
   const q=m.questions.find(q=>q.id==='sentence_completion_date');const prompt=q.translations?.[locale]?.prompt??q.prompt;
   const page=html(await Editor({params:Promise.resolve({packetId:item.id}),searchParams:Promise.resolve({edit:'sentence_completion_date'})}),locale);
   assert(page.includes(renderToStaticMarkup(React.createElement('span',null,prompt)).slice(6,-7)),'Existing completion control offered in actual '+locale+' held editor');
  }
  assert.equal((await post({sentence_completion_date:'Yes'})).status,200);
  assert.equal(stored.draftSnapshot.packetAnswers.sentence_completion_date,'Yes');
  for(const name of ['screeningAnswers','prefilledAnswers','packetAnswers'])if(Object.hasOwn(seededMaps[name],'sentence_completion_date')){
   assert((stored.draftSnapshot.dependencies.semanticAnswerHistory??[]).some(entry=>entry.factId==='sentence_completion_date'
    && entry.source===name && entry.value===seededMaps[name].sentence_completion_date
    && entry.meaning==='prior_factual_pathway_answer' && entry.routeKey==='MN:'+route
    && entry.profileVersion===seeded.snapshot.profileVersion
    && entry.profileSourceFingerprint===seeded.snapshot.profileSourceFingerprint
    && entry.profileAuthorityFingerprint===seeded.snapshot.profileAuthorityFingerprint),'Exact prior completionNo retained with actual source provenance');
  }
  assertSeededNoneditedMaps();
  const dateGet=await API.GET(new Request(url),context);assert.equal(dateGet.status,200);assert(JSON.stringify(await dateGet.json()).includes('mn_sentence_discharge_date'));
  m=P.protectedPacketInformationModelFor(stored);assert(m.questions.some(q=>q.id==='mn_sentence_discharge_date'));assert(!m.questions.some(q=>q.id==='mn_new_conviction_since_discharge'));
  assert.equal((await post({mn_sentence_discharge_date:{value:'2020-01-01',unknown:false}})).status,200);
  const sinceGet=await API.GET(new Request(url),context);assert.equal(sinceGet.status,200);assert(JSON.stringify(await sinceGet.json()).includes('mn_new_conviction_since_discharge'));
  m=P.protectedPacketInformationModelFor(stored);assert(m.questions.some(q=>q.id==='mn_new_conviction_since_discharge'));
  assert.equal((await post({mn_new_conviction_since_discharge:'no'})).status,200);
  if(route===H.MN_PROSECUTOR_ROUTE){
   assert.equal((await post({mn_prosecutor_sealing_response:'not_requested'})).status,200);
   m=P.protectedPacketInformationModelFor(stored);assert.equal(m.mnSourceStageCandidate.candidate.unitId,'mn_prosecutor_agreed-request-stage');
   assert.equal(m.mnSourceStageCandidate.candidate.output,'request_guidance');
  }
  const saved=clone(stored);assert.equal((await post({})).status,200);assert.deepEqual(stored,saved,'Resume/noop preserves full synthetic record');
  for(const locale of ['en','es']){
   const page=html(await Editor({params:Promise.resolve({packetId:item.id}),searchParams:Promise.resolve({edit:'mn_sentence_discharge_date'})}),locale);
   for(const id of ['mn_sentence_discharge_date',...(route===H.MN_PROSECUTOR_ROUTE?['mn_prosecutor_sealing_response']:[])]){
    const q=H.mnProtectedStageQuestions(profile,route,{...stored.draftSnapshot.screeningAnswers,...stored.draftSnapshot.prefilledAnswers,...stored.draftSnapshot.packetAnswers}).find(q=>q.id===id);assert(q);
    const prompt=q.translations?.[locale]?.prompt??q.prompt;assert(page.includes(renderToStaticMarkup(React.createElement('span',null,prompt)).slice(6,-7)),'Actual '+locale+' source-stage editor prompt '+id);
   }
   assert(!page.includes('mn_prosecutor_programme'));assert(!page.includes('mn_prosecutor_accepts_written_request'));
   if(out){const file=out.replace(/\.json$/,'.synthetic-stage.'+(route===H.MN_PETITION_ROUTE?'petition':'prosecutor')+'.'+locale+'.html');fs.writeFileSync(file,page,{flag:'wx'});ssrEvidence.push({route,kind:'synthetic-source-stage-editor',locale,file,bytes:Buffer.byteLength(page)});}
  }
  for(const value of [{unknown:true},'']){
   assert.equal((await post({mn_sentence_discharge_date:value})).status,200);
   m=P.protectedPacketInformationModelFor(stored);assert(!m.questions.some(q=>q.id==='mn_new_conviction_since_discharge'));
   assert.equal(stored.draftSnapshot.packetAnswers.mn_new_conviction_since_discharge,'no','Inactive dependent rawanswer retained, never reinterpreted');
   assert.deepEqual(stored.draftSnapshot.packetAnswers.mn_sentence_discharge_date,value);
   const nochange=clone(stored);assert.equal((await post({})).status,200);assert.deepEqual(stored,nochange);
  }
  assertSeededNoneditedMaps();assert.deepEqual(sourceAnswers,beforeSource,'Trusted input object is never rewritten by protected edits');
  assert.equal(stored.draftSnapshot.packetAnswers.sentence_completion_date,'Yes');
  m=P.protectedPacketInformationModelFor(stored);assert.equal(m.mnSourceStageCandidate.authority,false);assert.equal(m.mnSourceStageCandidate.qualificationCheckboxExportAllowed,false);assert.equal(m.reviewSafety.safe,false);
  const presented=await presentation();for(const key of ['checkoutAllowed','generationAllowed','fulfillmentAvailable'])assert.equal(presented.commercialActions[key],false);
 });

}
// Distinct synthetic source-compatible premises, not mutations of retained nine/five/original B evidence.
for (const route of routes) {
 const stage = answers => H.mnProtectedStageCandidate(profile,route,null,answers);
 test(route+' invocation-local reuse retains public guards and fresh answer applicability',()=>{
  const inputs=[{}, {case_outcome:'Arrest or citation with no charge filed'},
   {case_outcome:'Misdemeanor conviction',sentence_completion_date:'No'},
   {case_outcome:'Misdemeanor conviction',sentence_completion_date:'Yes',mn_sentence_discharge_date:'2020-01-01'},
   {case_outcome:'Diversion, deferred disposition, supervision, or similar program',mn_diversion_completion:'completed'},
   {case_outcome:'Misdemeanor conviction',mn_prosecutor_sealing_response:'not_requested'}];
  for(const answers of inputs)for(const unresolved of [[],['sentence_completion_date','mn_diversion_completion']]){
   const before=structuredClone(answers);const context=H.mnProtectedStageContext(profile,route,null,answers,unresolved);
   assert(context);assert.deepEqual(context.questions,H.mnProtectedStageQuestions(profile,route,answers,false,unresolved));
   assert.deepEqual(context.candidate,H.mnProtectedStageCandidate(profile,route,null,answers,unresolved));
   assert.deepEqual(context.questions.map(q=>q.id),H.mnProtectedStageFactIds(profile,route,answers,false,unresolved));
   assert.deepEqual(answers,before);assert.equal(context.candidate.authority,false);
  }
  const same=structuredClone(profile);const answers=inputs[3];
  assert(H.mnProtectedStageContext(same,route,null,answers));
  for(const key of ['profileVersion','pathways','legalAuthority']){
   const present=Object.hasOwn(same,key),before=same[key];same[key]=key==='profileVersion'?'drift':null;
   assert.equal(H.mnProtectedStageContext(same,route,null,answers),null);
   assert.equal(H.mnProtectedStageCandidate(same,route,null,answers),null);
   assert.deepEqual(H.mnProtectedStageQuestions(same,route,answers),[]);
   assert.deepEqual(H.mnProtectedStageFactIds(same,route,answers),[]);
   if(present)same[key]=before;else delete same[key];
   assert(H.mnProtectedStageContext(same,route,null,answers));
  }
  assert.equal(H.mnProtectedStageContext(profile,route,{},answers),null);
  assert.equal(H.mnProtectedStageContext(profile,'other-route',null,answers),null);
  const changed={...answers,sentence_completion_date:'No'};
  assert(!H.mnProtectedStageContext(profile,route,null,changed).questions.some(q=>q.id==='mn_sentence_discharge_date'));
 });
 // MN_BOOLEAN_COMPLETION_REGRESSION_BEGIN
 test(route+' supported primitive completion stays known without broadening saved shapes',()=>{
  const cases=[
   [true,true,true], [false,true,false], ['Yes',true,true], ['No',true,false],
   [{value:'Yes',unknown:false},true,true], [{value:'No',unknown:false},true,false],
   ['',false,false], ['I am not sure',false,false], [{unknown:true},false,false],
   [{value:'Yes',unknown:true},false,false], [{value:true,unknown:false},false,false],
   [{value:false,unknown:false},false,false], [[],false,false]
  ];
  for(const [value,known,discharge]of cases){
   const answers={case_outcome:'Misdemeanor conviction',sentence_completion_date:value};const before=clone(answers);
   const context=H.mnProtectedStageContext(profile,route,null,answers);assert(context);
   assert.equal(context.candidate.missingFactIds.includes('sentence_completion_date'),!known,'Known completion state must not be newly missing: '+JSON.stringify(value));
   assert.equal(context.questions.some(q=>q.id==='mn_sentence_discharge_date'),discharge);
   assert.equal(context.candidate.authority,false);assert.equal(context.candidate.qualificationCheckboxExportAllowed,false);
   assert.deepEqual(answers,before);
   const unresolved=H.mnProtectedStageContext(profile,route,null,answers,['sentence_completion_date']);assert(unresolved);
   assert(unresolved.candidate.missingFactIds.includes('sentence_completion_date'));
   assert(!unresolved.questions.some(q=>q.id==='mn_sentence_discharge_date'));
  }
  const drift=clone(profile);drift.profileVersion+='-drift';
  assert.equal(H.mnProtectedStageContext(drift,route,null,{case_outcome:'Misdemeanor conviction',sentence_completion_date:true}),null);
  assert.equal(H.mnProtectedStageCandidate(profile,route,{}, {case_outcome:'Misdemeanor conviction',sentence_completion_date:true}),null);
 });
 // MN_BOOLEAN_COMPLETION_REGRESSION_END
 test(route+' exact source stage refusal/wrappers/unknown/nocharge',()=>{
  assert.equal(H.mnProtectedStageCandidate(profile,route,{},{}),null);
  assert.equal(H.mnProtectedStageCandidate({...profile,profileVersion:'wrong'},route,null,{}),null);
  for(const case_outcome of [undefined,'Arrest or citation with no charge filed','I am not sure',{unknown:true}, {value:'Misdemeanor conviction',unknown:true}]) {
   assert.equal(stage({case_outcome}).candidate,null);
  }
  const wrapped=stage({case_outcome:{value:'Misdemeanor conviction',unknown:false}});
  if(route===H.MN_PETITION_ROUTE)assert.equal(wrapped.candidate.clause,'qualification_petty_or_misdemeanor');
  else assert.equal(wrapped.candidate,null,'Prosecutor response absent is not an agreed/request source stage');
  assert(!stage({case_outcome:'Arrest or citation with no charge filed'}).missingFactIds.includes('case_outcome'));
  assert(stage({}).missingFactIds.includes('case_outcome'));
  assert.equal(wrapped.qualificationCheckboxExportAllowed,false);assert.equal(wrapped.statutoryDeterminationEstablished,false);
 });
 test(route+' synthetic ordinary conviction identifies only a held candidate',()=>{
  const s=stage({case_outcome:'Misdemeanor conviction',sentence_completion_date:'Yes',pending_cases:'No',mn_sentence_discharge_date:'2020-01-01',mn_new_conviction_since_discharge:'no',
    mn_prosecutor_sealing_response:'not_requested'});
  assert.equal(s.status,'held');assert.equal(s.authority,false);assert(s.holds.includes('candidate_clause_does_not_compute_wait_or_certify_qualification'));
  assert(!Object.hasOwn(s,'selectedTrackId'));assert(!Object.hasOwn(s,'paymentAllowed'));
  if(route===H.MN_PROSECUTOR_ROUTE)assert.equal(s.candidate.unitId,'mn_prosecutor_agreed-request-stage');
 });
 test(route+' saved-first applicability preserves clear unknown unresolved and institutional-source boundary',()=>{
  const outcome='Other conviction or adjudication';
  const ids=(saved,extra={})=>collect(route,{case_outcome:outcome,mn_record_conviction_class:'felony'},saved,extra).facts.map(f=>f.factId);
  assert(ids({mn_record_conviction_class:'gross_misdemeanor'}).includes('mn_record_reduction_reference'));
  for(const value of ['', 'unknown', {value:'felony',unknown:true}])assert(!ids({mn_record_conviction_class:value}).includes('mn_record_felony_section'));
  assert(!ids({}, {unresolvedSavedFactIds:new Set(['mn_record_conviction_class'])}).includes('mn_record_felony_section'));
  assert(!H.mnProtectedStageFactIds(profile,route,{case_outcome:outcome,mn_record_conviction_class:{value:'felony',unknown:true}}).includes('mn_record_felony_section'));
  const all=H.mnProtectedStageFactIds(profile,route,{},true);
  assert(!all.includes('mn_prosecutor_programme'));assert(!all.includes('mn_prosecutor_accepts_written_request'));
  for(const response of ['not_requested','awaiting_response','agreed']) {
   const candidate=stage({case_outcome:'Misdemeanor conviction',mn_prosecutor_sealing_response:response});
   assert.equal(candidate.qualificationCheckboxExportAllowed,false);assert.equal(candidate.statutoryDeterminationEstablished,false);
   assert.equal(packetSpecificationFor('MN:'+route),undefined);
   if(route===H.MN_PROSECUTOR_ROUTE){assert.equal(candidate.candidate.unitId,'mn_prosecutor_agreed-request-stage');assert.equal(candidate.candidate.output,'request_guidance');}
  }
 });

 test(route+' diversion completion children require validated completed status and saved-first transitions',()=>{
  const outcome='Diversion, deferred disposition, supervision, or similar program';
  const children=['mn_diversion_completion_date','mn_new_charge_since_diversion_completion'];
  for(const value of ['active','revoked_or_failed','unknown','',undefined,{value:'completed',unknown:true}]) {
   const ids=H.mnProtectedStageFactIds(profile,route,{case_outcome:outcome,mn_diversion_completion:value});
   for(const id of children)assert(!ids.includes(id),'Incomplete or uncertain status cannot activate '+id);
  }
  for(const value of ['completed',{value:'completed',unknown:false}]) {
   const ids=H.mnProtectedStageFactIds(profile,route,{case_outcome:outcome,mn_diversion_completion:value});
   for(const id of children)assert(ids.includes(id),'Validated completion activates '+id);
  }
  const screening={case_outcome:outcome,mn_diversion_completion:'completed',mn_diversion_completion_date:'2020-01-01',mn_new_charge_since_diversion_completion:'no'};
  const original=clone(screening);
  for(const value of ['active','revoked_or_failed','unknown','',{value:'completed',unknown:true}]) {
   const saved={mn_diversion_completion:value},raw=clone(saved);
   const ids=collect(route,screening,saved).facts.map(f=>f.factId);
   for(const id of children)assert(!ids.includes(id),'Saved changed status cannot fall back to older completion');
   assert.deepEqual(saved,raw);assert.deepEqual(screening,original,'Inactive children retain raw historic answers');
  }
  const unresolved=collect(route,screening,{}, {unresolvedSavedFactIds:new Set(['mn_diversion_completion'])}).facts.map(f=>f.factId);
  for(const id of children)assert(!unresolved.includes(id));
  const completed=collect(route,{case_outcome:outcome,mn_diversion_completion:'active'},{mn_diversion_completion:'completed'}).facts.map(f=>f.factId);
  for(const id of children)assert(completed.includes(id),'Explicit saved completion, never old fallback, enables child');
 });

 test(route+' existing completion control and current discharge jointly gate since-discharge child',()=>{
  const outcome='Misdemeanor conviction',date='2020-01-01',since='mn_new_conviction_since_discharge',discharge='mn_sentence_discharge_date';
  for(const completed of ['No','I am not sure','',undefined,{value:'Yes',unknown:true}]) {
   const raw={case_outcome:outcome,sentence_completion_date:completed,[discharge]:date},before=clone(raw);
   const ids=H.mnProtectedStageFactIds(profile,route,raw);
   assert(ids.includes('sentence_completion_date'),'Existing prerequisite is reachable before date');
   assert(!ids.includes(discharge));assert(!ids.includes(since));assert.deepEqual(raw,before);
   const s=stage(raw);assert.equal(s.authority,false);assert.equal(s.qualificationCheckboxExportAllowed,false);
   if(completed==='No')assert(s.holds.includes('current_incomplete_status_conflicts_with_retained_discharge_date_no_completion_inference'));
  }
  for(const value of [undefined,'','unknown',{value:date,unknown:true},'not-a-date']) {
   const ids=H.mnProtectedStageFactIds(profile,route,{case_outcome:outcome,sentence_completion_date:'Yes',[discharge]:value});
   assert(ids.includes(discharge));assert(!ids.includes(since));
  }
  for(const value of [date,{value:date,unknown:false}])assert(H.mnProtectedStageFactIds(profile,route,{case_outcome:outcome,sentence_completion_date:'Yes',[discharge]:value}).includes(since));
  const screening={case_outcome:outcome,sentence_completion_date:'Yes',[discharge]:date,[since]:'no'},before=clone(screening);
  for(const saved of [{sentence_completion_date:'No'},{sentence_completion_date:''},{sentence_completion_date:'I am not sure'},{[discharge]:''},{[discharge]:{value:date,unknown:true}}]) {
   const ids=collect(route,screening,saved).facts.map(f=>f.factId);assert(!ids.includes(since));assert.deepEqual(screening,before);
  }
  const masked=collect(route,screening,{}, {unresolvedSavedFactIds:new Set([discharge])}).facts.map(f=>f.factId);assert(!masked.includes(since));
  const packet=P.packetCollectionFor({jurisdiction:'MN',pathwayId:route,requiredInputIds:packetPlanForPathway(profile,route).requiredInputIds,serverFacts:{},screeningAnswers:screening,savedAnswers:{sentence_completion_date:'No'}});
  assert(!packet.facts.some(f=>f.factId===since));assert(!packet.facts.some(f=>f.factId===discharge));
 });
 test(route+' separately labeled synthetic conviction has natural held model conditional controls only',()=>{
  const source={...clone(fixtureFor(route).answers),case_outcome:'Misdemeanor conviction',sentence_completion_date:'No'};
  const authoritative=evaluate({jurisdiction:'MN',profileVersion:profile.profileVersion,matterId:'mn-stage-synthetic',answers:source});
  const seeded=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:source,dependencies:{commercialFlowVersion:1},capturedAt:'2026-10-16T00:00:00Z'});assert(seeded);
  assert.equal(seeded.snapshot.pathwayId,route,'Natural requested topic remains necessary; never force a route for this control');
  const current={status:'unverified',reason:'separately-declared-synthetic-stage',revision:0,draftHash:P.protectedPacketDraftHash(seeded.snapshot),draftSnapshot:seeded.snapshot};
  const m=P.protectedPacketInformationModelFor(current);assert(m);
  assert(m.questions.some(q=>q.id==='sentence_completion_date'&&q.type==='yes_no_unsure'));
  assert(!m.questions.some(q=>['mn_sentence_discharge_date','mn_new_conviction_since_discharge'].includes(q.id)));
  assert.equal(m.mnSourceStageCandidate.authority,false);assert.equal(m.mnSourceStageCandidate.qualificationCheckboxExportAllowed,false);assert.equal(m.reviewSafety.safe,false);
 });

}
// GA-14-M01039 / M01040: pinned MN petition and prosecutor-agreed routes keep the v4
// target-court outcomes, only their pinned family references them, and no instrument or
// render authority exists (the caption adapter is blocked on geometry, sources and design).
if(!baseline){
const root=process.cwd();
const loadModule=p=>import(pathToFileURL(root+'/'+p).href),read=p=>JSON.parse(fs.readFileSync(root+'/'+p,'utf8'));
const H=await loadModule('src/lib/expungement-ai/mn-two-county-source-facts.ts'),{getProfileByJurisdiction}=await loadModule('src/lib/rcap-engine/profile-registry.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await loadModule('src/lib/expungement-ai/authoritative-screening-result.ts');
const {packetFulfillmentAuthority}=await loadModule('src/lib/expungement-ai/packet-fulfillment-authority.ts'),{renderPreflight}=await loadModule('src/lib/expungement-ai/render-preflight.ts');
const profile=getProfileByJurisdiction('MN'),reg=read('data/record-clearing/factory-v2-route-registry.json').routes,W=read('data/rcap-ledger/public-witness-answer-sets.json').witnesses;
const MN='data/rcap-all50/overlays/census-v1/mn/';
const members={'GA-14-M01039':{route:'petition-based-expungement-under-609a-02-03',track:'mn_petition_609a02_subd3',family:'mn-petition-609a02-subd3-set--custom-pleading',state:'packet_ready_with_caution'},
 'GA-14-M01040':{route:'prosecutor-agreed-sealing-without-a-full-petition-under-609a-025',track:'mn_prosecutor_agreed',family:'mn-prosecutor-agreed-set--custom-pleading',state:'guidance_only'}};
test('route-constants-pinned',()=>{assert.equal(H.MN_PETITION_ROUTE,members['GA-14-M01039'].route);assert.equal(H.MN_PROSECUTOR_ROUTE,members['GA-14-M01040'].route);assert.deepEqual(H.mnTwoCountyFactIds(members['GA-14-M01039'].route),['mn_deciding_case_county']);assert.deepEqual(H.mnTwoCountyFactIds(members['GA-14-M01040'].route),['mn_prosecuted_case_county','mn_prosecuted_by','mn_prosecuting_city']);});
for(const [m,{route,track,family,state}] of Object.entries(members)){
 test(m+'/registry-identity',()=>{const r=reg.find(x=>x.pathwayKey==='MN:'+route);assert.deepEqual(r.registryTrackIds,[track]);assert.deepEqual(r.packetSetIds,[track+'-set']);});
 // Every MN family, case-insensitive: only the pinned family references this route or track.
 for(const d of fs.readdirSync(root+'/'+MN))test(m+'/family-scope/'+d,()=>{let blob='';for(const f of fs.readdirSync(root+'/'+MN+d))if(f.endsWith('.json'))blob+=fs.readFileSync(root+'/'+MN+d+'/'+f,'utf8');const refs=new RegExp(route+'|"obligation:[^"]*:'+track+'[:"]','i').test(blob);assert.equal(refs,d===family);});
 // v4: target-court origin; residence is not origin; unknown stays unknown; no checkout for an outside target.
 const w=W.find(x=>x.pathwayKey==='MN:'+route);assert(w);
 for(const [scope,code,result] of [['Federal','mn.federal_or_out_of_scope','hard_stop'],['I am not sure','mn.source_fact_unknown','needs_review']])test(m+'/v4-target/'+scope,()=>{const e=evaluate({jurisdiction:'MN',profileVersion:profile.profileVersion,matterId:'m',answers:{...w.finalAnswers,jurisdiction_scope:scope}}).evaluation;assert.equal(e.resultCode,result);assert.equal(e.reasons[0].code,code);assert.equal(e.paymentAllowed,false);});
 test(m+'/v4-in-state-natural',()=>{const e=evaluate({jurisdiction:'MN',profileVersion:profile.profileVersion,matterId:'m',answers:{...w.finalAnswers,jurisdiction_scope:'State or local'}}).evaluation;assert.equal(e.resultCode,state);assert.equal(e.pathwayId,route);});
 for(const s of ['checkout creation','packet generation'])test(m+'/no-instrument/'+s,()=>{const a=packetFulfillmentAuthority('MN',route,s,{trackId:track});assert.equal(a.allowed,false);assert(a.reason.startsWith('MN:'+route+': NO_RECORD.'),a.reason);});
 test(m+'/no-render-authority',()=>assert.deepEqual(renderPreflight({snapshot:{jurisdiction:'MN',pathwayId:route,selectedTrackId:track},verificationHash:'x',facts:{residency_or_location:'Hennepin residence'}}),{ready:false,reason:'no_composable_specification_for_route',missingFactIds:[]}));
}
}
const result={status:rows.some(x=>!x.pass)?'FAIL':'PASS',baseline,passed:rows.filter(x=>x.pass).length,failed:rows.filter(x=>!x.pass),observations,siblings,transportObservations,ssrEvidence,originEditableEvidence,limits:'Pure local source/collector/model/transition checks only; no DB/browser/owner/document mapping/eligibility or commercial authority.'};
if(out)fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,baseline,passed:result.passed,failed:result.failed},null,2));if(result.status==='FAIL')process.exitCode=1;
