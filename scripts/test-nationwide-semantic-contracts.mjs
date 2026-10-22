import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const packet=await import('../src/lib/expungement-ai/packet-information.ts');
const {reviewedPacketContractSuccessor,MS_CHARGED_CONDUCT_FACT:id}=await import('../src/lib/expungement-ai/packet-contract-successors.ts');
const {packetPlanForPathway}=await import('../src/lib/rcap-engine/packet-planner.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {routeSafetyGateFactIds}=await import('../src/lib/expungement-ai/packet-route-safety.ts');
const old=JSON.parse(fs.readFileSync(new URL('./lib/rcap-ms-legacy-contract-fixture.json',import.meta.url))).snapshot;
const registry=JSON.parse(fs.readFileSync(new URL('../src/lib/expungement-ai/reviewed-packet-contract-successors.json',import.meta.url)));
const historicalPlans=JSON.parse(fs.readFileSync(new URL('./fixtures/packet-contract-historical-plans.json',import.meta.url))).rows;
const ilNativeRows=JSON.parse(fs.readFileSync(new URL('./fixtures/il2-plan-predecessors.json',import.meta.url))).rows;
const {contactRepresentationHash:hash}=await import('../src/lib/expungement-ai/contact-representation.ts');
const make=(snapshot=old)=>({status:'unverified',reason:'synthetic-partial-legacy',revision:3,draftSnapshot:structuredClone(snapshot),draftHash:packet.protectedPacketDraftHash(snapshot)});
const patch=(record,answers)=>packet.packetInformationPatch({existingItem:{id:'synthetic-legacy',jurisdiction:'MS',artifactRefs:{}},answers,protectedVerification:record});
let checks=0;const check=(name,fn)=>{try{fn();checks++;}catch(e){e.message=name+': '+e.message;throw e;}};
for(const value of ['No','Yes','Unsure','Prefer not to say',{value:'Yes',unknown:true},null])for(const source of ['screeningAnswers','prefilledAnswers','packetAnswers']){
 const s=structuredClone(old);for(const m of ['screeningAnswers','prefilledAnswers','packetAnswers'])delete s[m].trafficking_status;s[source].trafficking_status=value;
 const r=make(s),before=JSON.stringify(r),m=packet.protectedPacketInformationModelFor(r);
 check(`legacy ${source}/${JSON.stringify(value)} never answers new fact`,()=>{assert.ok(m);assert.ok(m.missingInputIds.includes(id));assert.equal(m.initialAnswers[id],undefined);assert.equal(m.initialAnswers.trafficking_status,undefined);assert.ok(m.builderQuestions.some(q=>q.id===id));assert.equal(m.reviewSafety.reason,'packet_contract_clarification_required');assert.equal(JSON.stringify(r),before);});
 check('legacy no-op preserves raw authority',()=>{const p=patch(r,{});assert.ok(p);assert.deepEqual(p.protectedTransition.nextVerification,r);assert.equal(p.readyToGenerate,false);});
 const p=patch(r,{[id]:'No'});
 check('explicit scoped clarification advances once, retains exact raw history',()=>{assert.ok(p);const n=p.protectedTransition.nextVerification;assert.equal(n.revision,4);assert.equal(n.draftSnapshot.packetAnswers[id],'No');assert.equal(n.draftSnapshot.packetAnswers.trafficking_status,undefined);assert.deepEqual(n.draftSnapshot.dependencies.semanticAnswerHistory.find(e=>e.source===source).value,value);const next=packet.protectedPacketInformationModelFor(n);assert.ok(next);assert.ok(!next.missingInputIds.includes(id));assert.ok(!next.questions.find(q=>q.id===id).helperText.includes('earlier question'));assert.deepEqual(patch(n,{}).protectedTransition.nextVerification,n);});
}
const r=make(),m=packet.protectedPacketInformationModelFor(r),q=m.questions.find(q=>q.id===id);
check('exact scoped ENES question does not borrow victimhood translation',()=>{assert.equal(q.prompt,'Did any charge involve trafficking, distribution, delivery, or manufacture?');assert.equal(q.translations.es.prompt,'¿Alguno de los cargos involucró tráfico, distribución, entrega o fabricación?');assert.ok(q.translations.es.helperText.includes('cargos en su contra'));assert.deepEqual(q.options,['No','Yes','Unsure']);assert.equal(q.optionDisplay.Yes.translations.es.label,'Sí');});
check('explicit current uncertainty does not repeat the legacy-meaning clarification',()=>{const p=patch(r,{[id]:'Unsure'});assert.ok(p);const next=packet.protectedPacketInformationModelFor(p.protectedTransition.nextVerification);assert.ok(next.missingInputIds.includes(id));assert.ok(!next.questions.find(q=>q.id===id).helperText.includes('earlier question'));});
check('old ID cannot be submitted as charged No',()=>{const p=patch(r,{trafficking_status:'No'});assert.deepEqual(p.protectedTransition.nextVerification,r);assert.ok(packet.protectedPacketInformationModelFor(r).missingInputIds.includes(id));});
check('route safety owns new scoped ID only',()=>{const ids=routeSafetyGateFactIds('MS',old.pathwayId);assert.ok(ids.includes(id));assert.ok(!ids.includes('trafficking_status'));});
const {evaluateAuthoritativeScreeningResult}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
check('new seed archives overlapping ambiguous raw maps before precedence',()=>{
 const screening={...old.screeningAnswers,...old.prefilledAnswers};delete screening.charge_classification;delete screening.offense_category;delete screening.sentence_completion_date;
 const authoritative=evaluateAuthoritativeScreeningResult({jurisdiction:'MS',profileVersion:old.profileVersion,matterId:'synthetic-legacy-seed',answers:screening});
 const seeded=packet.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:{...screening,trafficking_status:'Yes'},prefilledAnswers:{trafficking_status:'No'},packetAnswers:{trafficking_status:{value:'Yes',unknown:true}},dependencies:old.dependencies,capturedAt:old.capturedAt});
 assert.ok(seeded);assert.equal(seeded.snapshot.dependencies.semanticAnswerHistory.length,3);assert.deepEqual(seeded.snapshot.dependencies.semanticAnswerHistory.map(e=>e.value),['Yes','No',{value:'Yes',unknown:true}]);assert.equal(seeded.snapshot.packetAnswers[id],undefined);
});
const currentPlan=packetPlanForPathway(getProfileByJurisdiction('MS'),old.pathwayId);
for(const mutate of [s=>s.profileVersion+='-changed',s=>s.profileSourceFingerprint='0'.repeat(64),s=>s.profileAuthorityFingerprint='0'.repeat(64),s=>s.pathwayId+='-changed',s=>s.requiredInputIds.reverse(),s=>s.packetPlan.requiredInputIds.reverse(),s=>s.packetPlan.mode='unreviewed'])check('unrecognized identity cannot use adapter',()=>{const s=structuredClone(old);mutate(s);assert.equal(reviewedPacketContractSuccessor(s,currentPlan),null);assert.equal(packet.protectedPacketInformationModelFor(make(s)),null);});
check('hash mismatch refused',()=>{const bad=make();bad.draftSnapshot.packetAnswers.trafficking_status='changed';assert.equal(packet.protectedPacketInformationModelFor(bad),null);});
for(const [key,contract] of Object.entries(registry.routes)){
 const [state,pathway]=key.split(':'),plan=packetPlanForPathway(getProfileByJurisdiction(state),pathway);
 const priorPlan=(()=>{
 const priorPlan=structuredClone(plan);priorPlan.requiredInputIds=state==='MS'&&pathway===old.pathwayId?priorPlan.requiredInputIds.map(x=>x===id?'trafficking_status':x):priorPlan.requiredInputIds.filter(x=>!contract.addedFactIds.includes(x));
 const historical=historicalPlans[key];
 if(!historical)return priorPlan;
 check(`${key} recorded historical plan identity`,()=>{
  assert.equal(hash(historical.plan),historical.previousPlanSha256,'recorded native predecessor bytes changed');
  assert.equal(historical.previousPlanSha256,contract.previousPlanSha256,'recorded native predecessor hash differs from the reviewed contract');
  assert.equal(hash(historical.plan.requiredInputIds),contract.previousRequiredIdsSha256,'recorded native input order changed');
 });
 if(historical.reconstruction==='fact_only'){
  check(`${key} fact-only reconstruction unchanged`,()=>assert.deepEqual(priorPlan,historical.plan));
  return priorPlan;
 }
 check(`${key} historical exception required`,()=>{
  assert.equal(historical.reconstruction,'historical_plan');
  assert.notEqual(hash(priorPlan),contract.previousPlanSha256,'fact-only successor must retain the original reconstruction');
 });
 return structuredClone(historical.plan);
 })();
 // CA caption/contact successors validate the complete native envelope, including its jurisdiction and family.
 const caEnvelope=state==='CA'?JSON.parse(fs.readFileSync(new URL('../'+historicalPlans[key].source.path,import.meta.url))).record.draftSnapshot:null;
 if(caEnvelope)check(`${key} genuine CA predecessor envelope`,()=>{
  assert.deepEqual([caEnvelope.jurisdiction,caEnvelope.pathwayId,caEnvelope.profileVersion,caEnvelope.profileSourceFingerprint,caEnvelope.profileAuthorityFingerprint],[state,pathway,contract.profileVersion,contract.profileSourceFingerprint,contract.profileAuthorityFingerprint]);
  assert.deepEqual(caEnvelope.packetPlan,priorPlan);assert.deepEqual(caEnvelope.requiredInputIds,priorPlan.requiredInputIds);
 });
 // The five added IL classes use their retained native envelope; the original nine records stay unchanged.
 const ilRecord=state==='IL'&&historicalPlans[key]?.source.path==='scripts/fixtures/il2-plan-predecessors.json'
  ?ilNativeRows.find(row=>row.route===pathway)?.verification:null;
 if(state==='IL'&&historicalPlans[key]?.source.path==='scripts/fixtures/il2-plan-predecessors.json')check(`${key} genuine IL predecessor envelope`,()=>{
  assert.ok(ilRecord);const native=ilRecord.draftSnapshot;
  assert.equal(packet.protectedPacketDraftHash(native),ilRecord.draftHash);
  assert.deepEqual([native.jurisdiction,native.pathwayId,native.profileVersion,native.profileSourceFingerprint,native.profileAuthorityFingerprint],[state,pathway,contract.profileVersion,contract.profileSourceFingerprint,contract.profileAuthorityFingerprint]);
  assert.deepEqual(native.packetPlan,priorPlan);assert.deepEqual(native.requiredInputIds,priorPlan.requiredInputIds);
 });
 const s={...structuredClone(ilRecord?.draftSnapshot??caEnvelope??old),jurisdiction:state,pathwayId:pathway,profileVersion:contract.profileVersion,profileSourceFingerprint:contract.profileSourceFingerprint,profileAuthorityFingerprint:contract.profileAuthorityFingerprint,packetPlan:priorPlan,requiredInputIds:[...priorPlan.requiredInputIds]};
 if(caEnvelope)check(`${key} borrowed MS envelope refused`,()=>assert.equal(reviewedPacketContractSuccessor({...s,serverFacts:old.serverFacts,packetFamilyIdentifiers:old.packetFamilyIdentifiers},plan),null));
 check(`${key} exact registry projects only current contract`,()=>{const projected=reviewedPacketContractSuccessor(s,plan);assert.ok(projected);assert.deepEqual(projected.packetPlan,plan);assert.deepEqual(projected.requiredInputIds,plan.requiredInputIds);assert.deepEqual(s.packetPlan,priorPlan);});
 check(`${key} new unreviewed plan field refused`,()=>assert.equal(reviewedPacketContractSuccessor(s,{...plan,mode:'unreviewed'}),null));
}
console.log(`PASS: ${checks} exact legacy contract, raw preservation, no-op, identity and ENES semantic-separation checks. Synthetic partial records; legal/document/protected HTTP acceptance separate.`);
