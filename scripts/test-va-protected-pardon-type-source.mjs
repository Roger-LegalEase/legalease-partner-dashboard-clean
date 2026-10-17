// Prepared, unexecuted focused protected-model/save test. No actual owner or output authority claim.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
process.env.RCAP_EVALUATOR_TODAY='2026-10-16';
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {packetSpecificationFor,composablePacketSpecificationFor}=await import('../src/lib/rcap/grade-a/packet-specification.ts');
const H=await import('../src/lib/expungement-ai/va-pardon-type-source.ts');
const C=await import('../src/lib/expungement-ai/record-fact-clarification.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const profile=getProfileByJurisdiction('VA'),route=H.VA_PARDON_ROUTE.slice(3),id=H.VA_PARDON_TYPE_ID,spec=packetSpecificationFor(H.VA_PARDON_ROUTE);
const retained=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.find(w=>w.jurisdiction==='VA'&&w.pathwayId===route);
assert.ok(retained);assert.equal(retained.finalAnswers.pardon_status,'No');
const original=structuredClone(retained.finalAnswers),answers={...structuredClone(original),case_outcome:'Pardoned conviction',pardon_status:'Yes'};
const checks=[];
const check=(name,fn)=>{try{fn();checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:e.message});}};
const seedRecord=(a,packetAnswers={},prefilledAnswers={})=>{const authoritative=evaluate({jurisdiction:'VA',profileVersion:profile.profileVersion,matterId:'synthetic-va-pardon-type-save-only',answers:a});const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:a,packetAnswers,prefilledAnswers,dependencies:{},capturedAt:'2026-10-16T00:00:00Z'});assert.ok(seed);return {status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};};
const model=r=>P.protectedPacketInformationModelFor(r);
const save=(record,delta={},confirm=[])=>{const before=structuredClone(record),patch=P.packetInformationPatch({existingItem:{id:'synthetic-va-pardon-type-save-only',jurisdiction:'VA',artifactRefs:{}},protectedVerification:record,answers:delta,confirmRecordFacts:confirm});assert.deepEqual(record,before);assert.ok(patch);assert.equal(patch.readyToGenerate,false);return patch.protectedTransition.nextVerification;};
const question=H.vaPardonTypeQuestion(profile,route,spec,answers);
const initialRequired=seedRecord(answers).draftSnapshot.requiredInputIds;
check('exact retained English question/canonical memo id',()=>{assert.ok(question);assert.equal(id,'pardonType');assert.equal(question.prompt,'Does the pardon document say it is an absolute pardon, and does it say it is for a crime you did not commit?');});
for(const [label,p,s,a] of [
 ['wrong-state',{...profile,jurisdiction:{...profile.jurisdiction,code:'MD'}},spec,answers],
 ['changed-profile',{...profile,profileVersion:'changed'},spec,answers],
 ['changed-spec',profile,{...spec,specificationVersion:'changed'},answers],
 ['composable-spec',profile,{...spec,legalSectionsBound:true},answers],
 ['unknown-outcome',profile,spec,{...answers,case_outcome:'I am not sure'}],
 ['generic-no-pardon',profile,spec,{...answers,pardon_status:'No'}],
 ['malformed-pardon',profile,spec,{...answers,pardon_status:{value:'Yes',unknown:'false'}}],
 ['unknown-wrapper',profile,spec,{...answers,pardon_status:{value:'Yes',unknown:true}}]
])check('question refused '+label,()=>assert.equal(H.vaPardonTypeQuestion(p,route,s,a),null));
check('changed retained source refused',()=>assert.equal(H.vaPardonTypeContract(profile,route,spec,{}),false));
for(const [label,a]of [['dismissed',original],['acquitted',{...answers,case_outcome:'Acquitted or found not guilty'}],['pardon-absent',{...answers,pardon_status:undefined}]])check('other branch unchanged '+label,()=>{const r=seedRecord(a),m=model(r);assert.ok(m);assert.ok(!m.questions.some(q=>q.id===id));assert.ok(!m.requiredInputIds.includes(id));const union={...m.screeningAnswers,...m.prefilledAnswers,...m.packetAnswers};for(const [key,value]of Object.entries(a))assert.deepEqual(union[key],value);});
// The effective saved map wins, including clearing/unknown; no fallback to a known lower map.
for(const [label,prefilled,saved,active]of [
 ['screening-known',{}, {},true],
 ['prefilled-no',{pardon_status:'No'}, {},false],
 ['saved-known-wins',{pardon_status:'No'},{pardon_status:'Yes'},true],
 ['saved-no-wins',{pardon_status:'Yes'},{pardon_status:'No'},false],
 ['saved-unknown-wins',{pardon_status:'Yes'},{pardon_status:'I am not sure'},false],
 ['saved-cleared-wins',{pardon_status:'Yes'},{pardon_status:''},false],
 ['saved-null-wins',{pardon_status:'Yes'},{pardon_status:null},false],
 ['saved-malformed-wins',{pardon_status:'Yes'},{pardon_status:{value:'Yes',extra:true}},false],
 ['saved-outcome-cleared',{}, {case_outcome:''},false],
 ['saved-outcome-unknown',{}, {case_outcome:'I am not sure'},false],
 ['saved-wrapper-known',{}, {pardon_status:{value:'Yes',unknown:false}},true]
])check('actual protected precedence '+label,()=>{const r=seedRecord(answers,saved,prefilled),before=structuredClone(r),m=model(r);if(['saved-unknown-wins','saved-cleared-wins','saved-null-wins','saved-malformed-wins','saved-outcome-cleared','saved-outcome-unknown'].includes(label)){assert.equal(m,null,'same source-authority refusal established against exact a9e4 preimage');}else{assert.ok(m);assert.equal(m.questions.some(q=>q.id===id),active);}assert.deepEqual(r,before);for(const [key,value]of Object.entries(saved))assert.deepEqual(r.draftSnapshot.packetAnswers[key],value);});
for(const blocked of [['case_outcome'],['pardon_status'],['case_outcome','pardon_status']])check('actual collector masks unresolved activation '+blocked.join('/'),()=>{
 assert.equal(H.vaPardonTypeQuestion(profile,route,spec,answers,blocked),null);
 const result=P.packetCollectionFor({jurisdiction:'VA',pathwayId:route,requiredInputIds:initialRequired,serverFacts:{},screeningAnswers:answers,prefilledAnswers:{},savedAnswers:{},unresolvedSavedFactIds:blocked});
 assert.ok(result);assert.ok(!result.facts.some(f=>f.factId===id));
 assert.ok(!C.recordFactOwnQuestionIds(H.VA_PARDON_ROUTE,answers,undefined,blocked).has(id));
 assert.equal(C.recordFactConfirmationFor(H.VA_PARDON_ROUTE,id,{...answers,[id]:'Yes'},question,blocked),null);
});
const initial=seedRecord(answers),initialBefore=structuredClone(initial),initialModel=model(initial);
check('actual protected model exposes one question without answering it',()=>{assert.ok(initialModel.questions.some(q=>q.id===id));assert.ok(initialModel.builderQuestions.some(q=>q.id===id));assert.ok(initialModel.missingInputIds.includes(id));assert.ok(P.editablePacketInputIds(initialModel).has(id));assert.ok(!Object.hasOwn(initialModel.initialAnswers,id));assert.equal(initialModel.initialAnswers.pardon_status,'Yes');assert.equal(initialModel.reviewSafety.safe,false);});
check('model read preserves raw record',()=>assert.deepEqual(initial,initialBefore));
check('no-op exact',()=>assert.deepEqual(save(initial),initial));
for(const [label,raw,state]of [['yes','Yes','known_both'],['no','No','known_not_both'],['primitive-true',true,'known_both'],['primitive-false',false,'known_not_both'],['wrapped-true',{value:true,unknown:false},'unknown'],['wrapped-false',{value:false,unknown:false},'unknown'],['unknown','I am not sure','unknown'],['declined','Prefer not to say','unknown'],['wrapper',{value:'Yes',unknown:false},'known_both'],['unknown-wrapper',{value:'Yes',unknown:true},'unknown'],['malformed',{value:'Yes',extra:true},'unknown'],['absent',undefined,'unknown']])check('reported meaning '+label,()=>assert.equal(H.vaPardonTypeReportedState(question,raw),state));
const bare=save(initial,{[id]:'Yes'});
check('bare scalar cannot become attestation',()=>{assert.ok(model(bare).recordClarificationIds.includes(id));assert.equal(bare.draftSnapshot.packetAnswers[id],'Yes');});
const confirmed=save(bare,{},[id]);
check('explicit same-value confirmation binds current source/target',()=>{assert.equal(confirmed.draftSnapshot.dependencies.recordFactConfirmations[id].status,'confirmed');assert.ok(!model(confirmed).recordClarificationIds.includes(id));assert.equal(model(confirmed).reviewSafety.safe,false);assert.equal(composablePacketSpecificationFor(H.VA_PARDON_ROUTE),undefined);assert.equal(confirmed.status,'unverified');});
for(const value of ['No','I am not sure',''])check('value change cannot revive previous marker '+JSON.stringify(value),()=>{const changed=save(confirmed,{[id]:value}),returned=save(changed,{[id]:'Yes'});assert.ok(model(returned).recordClarificationIds.includes(id));assert.equal(returned.draftSnapshot.dependencies.recordFactConfirmations[id].status,'unconfirmed');assert.ok(returned.draftSnapshot.dependencies.recordFactConfirmations[id].legacyValues.length>0);});
check('known-not-both is a reported fact, no source qualification/authority',()=>{const no=save(save(confirmed,{[id]:'No'}),{},[id]);assert.equal(H.vaPardonTypeReportedState(question,no.draftSnapshot.packetAnswers[id]),'known_not_both');assert.equal(model(no).reviewSafety.safe,false);assert.equal(no.status,'unverified');assert.equal(composablePacketSpecificationFor(H.VA_PARDON_ROUTE),undefined);});
check('old marker contract drift cannot confirm',()=>{const stale=structuredClone(confirmed);stale.draftSnapshot.dependencies.recordFactConfirmations[id].contractSha256='0'.repeat(64);stale.draftHash=P.protectedPacketDraftHash(stale.draftSnapshot);assert.ok(model(stale).recordClarificationIds.includes(id));});
// Separate labelled synthetic identity premise, not a qualifying pardon/owner fixture.
const syntheticIdentity={charge:'Synthetic case charge A',court:'Synthetic case court A',disposition_date:'2020-01-01',[id]:'Yes'};
for(const [dep,value]of [['charge','Synthetic case charge B'],['court','Synthetic case court B'],['disposition_date','2021-01-01'],['case_outcome','Acquitted or found not guilty'],['pardon_status','No']])check('actual protected save dependency away/back '+dep,()=>{
 const start=save(seedRecord(answers,syntheticIdentity),{},[id]),old=structuredClone(start),oldValue={...answers,...syntheticIdentity}[dep];
 const away=save(start,{[dep]:value});assert.equal(away.draftSnapshot.dependencies.recordFactConfirmations[id].status,'unconfirmed');
 const back=save(away,{[dep]:oldValue});assert.equal(back.draftSnapshot.dependencies.recordFactConfirmations[id].status,'unconfirmed');
 assert.ok(model(back).recordClarificationIds.includes(id));assert.equal(back.draftSnapshot.packetAnswers[id],'Yes');
 assert.deepEqual(start,old);assert.deepEqual(back.draftSnapshot.dependencies.recordFactConfirmations[id].legacyValues,old.draftSnapshot.dependencies.recordFactConfirmations[id].legacyValues);
 const fresh=save(back,{},[id]);assert.equal(fresh.draftSnapshot.dependencies.recordFactConfirmations[id].status,'confirmed');assert.equal(fresh.status,'unverified');
});
check('meaning-equivalent actual saved wrapper does not invalidate confirmation',()=>{
 const wrapped=save(confirmed,{[id]:{value:'Yes',unknown:false}});assert.equal(wrapped.draftSnapshot.dependencies.recordFactConfirmations[id].status,'confirmed');assert.deepEqual(wrapped,confirmed);
});
check('non-VA confirmations unchanged',()=>{const markers={unrelated:{status:'confirmed'}};assert.equal(C.vaPardonTypeConfirmationsAfterChange('MD:juvenile-expungement',{}, {pardonType:'No'},markers),markers);});
for(const raw of [true,false,{value:true,unknown:false},{value:false,unknown:false}])check('actual protected save still filters unsupported boolean shape '+JSON.stringify(raw),()=>{
 const before=structuredClone(initial),after=save(initial,{[id]:raw});assert.deepEqual(after,before);assert.ok(!Object.hasOwn(after.draftSnapshot.packetAnswers,id));
});
check('original witness unchanged',()=>assert.deepEqual(retained.finalAnswers,original));
const failed=checks.filter(c=>!c.pass);console.log(JSON.stringify({qualification:'Synthetic protected model/save only; no owner/API/qualification/output/commerce acceptance',checks,passed:checks.length-failed.length,failed},null,2));process.exitCode=failed.length?1:0;
