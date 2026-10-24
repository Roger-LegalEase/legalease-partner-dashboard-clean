// GA14-OH-JUVENILE_SOURCE_SCOPE_AND_CURRENT_BINDING_OPEN / M01059 / Q-da1aeae32132608fb1f4.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash}from'node:crypto';import {register}from'node:module';
process.env.RCAP_EVALUATOR_TODAY='2026-10-18';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
const {OH_JUVENILE_ROUTE,OH_JUVENILE_RESULT_COPY}=await import('../src/lib/expungement-ai/oh-juvenile-stage-questions.ts');
const {reviewedResultText}=await import('../src/lib/expungement-ai/reviewed-result-copy.ts');
const {resolveRuntimeText}=await import('../src/lib/expungement-ai/localization.ts');
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const expected={"OH:adult-conviction-sealing-or-expungement-under-ohio-rev-code-2953-32":{"evaluation":"61cd72a5ee2d70299ca0f8dde94605093d9d560701610cb9c85ea4d6e95e8e56","draftHash":"b741b3c1d7de91b36465b7b4e921f4bc1aabce1548a703ba98a4125380688d4b"},"OH:adult-non-conviction-sealing-or-expungement-under-2953-33":{"evaluation":"0ba1e505434689f1b2f0b68fa123b30ac94c69ac8f9860d239c71255e005ad89","draftHash":"ca3008c3eac9e0d7c633cad7dec05de77799478bc07a7d4c19f0407e619ba753"},"OH:certain-firearm-carry-conviction-expungement-under-2953-35":{"evaluation":"1750fa1d4896a0731e3d8275af39f91fb80950f4f9fe7c40c50e8b0bdcb95f63","draftHash":"ef7cf165e2b5760ac0e08738e5eb3030b17f0ac749cdb950d077232f6edd603c"},"OH:human-trafficking-survivor-conviction-expungement-under-2953-36":{"evaluation":"0ffc4317493e229f55bc5f03990d650c6792fa97163fc83d567a267db4a871cc","draftHash":"a33261ea1973d130f0437c67a1e09215e17ab6f01440a30307ea393057ffb03f"},"OH:human-trafficking-survivor-non-conviction-expungement-under-2953-521":{"evaluation":"76dd63d9c424ec5edca70b3ec4f475c5f7987dbbf4b6748afba429598935efdb","draftHash":"4c10995adcf58dc1c5c1e6f6d5d889bf74ff341d2f3f6776f4c7e56f75108737"},"OH:juvenile-sealing-and-expungement":{"evaluation":"b69f9270dad6135c80e80acdaa6c95d02370fb59ccbce5b5ed59f12e51ce42f4","draftHash":"17e4eb81d2c2ea03b0994d1fdaa70ba8c8697d477f24605c1020e8a9a2502413"},"OH:marijuana-hashish-possession-expungement-under-2953-321":{"evaluation":"c173b20699465071b89eb878be8811635aa1908670ca453553bfe85a0c4044d4","draftHash":"8dec3b45d00d7475eb78a0329ccc35403ad2408d5ff341803398d1579febf7ee"}};
const pair=["Ohio law allows the juvenile court to seal records on its own motion or on the person's application when the statutory requirements are met (R.C. 2151.356). This service currently provides guidance but does not prepare that application. The court, not you, is responsible for notifying the prosecutor. There is no court filing fee for this application. Expungement under R.C. 2151.358 is a separate process with its own timing.", "La ley de Ohio permite que el tribunal de menores ordene el sellado de los expedientes por iniciativa propia o a solicitud de la persona, cuando se cumplan los requisitos legales (R.C. 2151.356). Actualmente, este servicio ofrece orientación, pero no prepara esa solicitud. El tribunal, no usted, se encarga de notificar al fiscal. No se cobra una tasa judicial por presentar esta solicitud. La eliminación de los expedientes («expungement») conforme a R.C. 2151.358 es un trámite distinto, sujeto a sus propios plazos."];
assert.deepEqual(OH_JUVENILE_RESULT_COPY,pair,'verbatim owner-adopted English/Spanish');
assert.deepEqual(reviewedResultText(pair[0]),{en:pair[0],es:pair[1]});assert.equal(resolveRuntimeText('es',pair[0]),pair[1]);assert.equal(resolveRuntimeText('en',pair[0]),pair[0]);
const profile=getProfileByJurisdiction('OH');const fixtures=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures.filter(f=>f.jurisdiction==='OH');
assert.deepEqual(fixtures.map(f=>f.pathwayKey).sort(),profile.pathways.map(p=>'OH:'+p.id).sort(),'every Ohio pathway covered');
for(const f of fixtures){
 const before=structuredClone(f.answers);const authoritative=evaluate({jurisdiction:'OH',profileVersion:profile.profileVersion,matterId:'TEST-oh-adopted-copy',answers:f.answers});const result=authoritative.evaluation;
 const stable=structuredClone(result);
 if(f.pathwayKey==='OH:'+OH_JUVENILE_ROUTE){assert.equal(result.reasons[0].text,pair[0]);stable.reasons[0].text='COPY_ONLY';}
 assert.equal(digest(stable),expected[f.pathwayKey].evaluation,'outcome, payment, reason identity and every other fact disposition unchanged: '+f.pathwayKey);
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:f.answers,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);assert.equal(seed.hash,expected[f.pathwayKey].draftHash);
 const record={status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};assert(P.protectedPacketInformationModelFor(record));assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,record);assert.deepEqual(f.answers,before);
}
// GA14: diversion alone must not establish a juvenile record.
const adultFixture=fixtures.find(f=>f.pathwayKey==='OH:adult-conviction-sealing-or-expungement-under-ohio-rev-code-2953-32');
assert(adultFixture);
const adultBefore=structuredClone(adultFixture.answers);
const answers={...structuredClone(adultFixture.answers),age_at_offense:'16',case_outcome:'Diversion, deferred disposition, supervision, or similar program'};
delete answers.possible_pathway_context;
const before=structuredClone(answers);
const compiled=evaluate({jurisdiction:'OH',profileVersion:profile.profileVersion,matterId:'TEST-oh-compiled-copy',answers});
assert.equal(compiled.evaluation.resultCode,'guidance_only','no-context Diversion stays guidance-only');
assert.equal(compiled.evaluation.paymentAllowed,false,'no-context Diversion cannot authorize payment');
assert.equal(compiled.evaluation.reasons[0].text,pair[0],'compiled fallback uses the adopted juvenile copy');
assert.deepEqual(answers,before,'compiled evaluation preserves raw answers');
assert.deepEqual(adultFixture.answers,adultBefore,'compiled case leaves the shared witness unchanged');
let diversionCases=0;
for(const age of ['17','18','30',16,30,{value:'16',unknown:false},{value:'30',unknown:false},undefined,'I am not sure',{value:'16',unknown:true},'17-19',[],true]){
 const input={...answers,age_at_offense:age};if(age===undefined)delete input.age_at_offense;
 const original=structuredClone(input);
 const evaluated=evaluate({jurisdiction:'OH',profileVersion:profile.profileVersion,matterId:'TEST-oh-diversion-boundary',answers:input}).evaluation;
 const juvenile=age==='17'||age===16||age?.value==='16'&&age.unknown===false;
 const adult=age==='18'||age==='30'||age===30||age?.value==='30'&&age.unknown===false;
 assert.equal(evaluated.paymentAllowed,false,'diversion never authorizes payment: '+JSON.stringify(age));
 if(juvenile){
  assert.equal(evaluated.pathwayId,OH_JUVENILE_ROUTE,'known minor selects juvenile guidance');
  assert.equal(evaluated.resultCode,'guidance_only');assert.equal(evaluated.reasons[0].text,pair[0]);
 }else{
  assert.equal(evaluated.pathwayId,undefined,'diversion alone cannot establish a statutory route: '+JSON.stringify(age));
  assert(!evaluated.reasons.some(r=>r.text===pair[0]),'adult/unknown diversion gets no juvenile copy');
  assert.equal(evaluated.resultCode,adult?'guidance_only':'needs_more_info','adult guidance or existing age clarification');
  if(!adult)assert(evaluated.missingQuestionIds.includes('age_at_offense'),'unknown age asks the existing question');
 }
 assert.deepEqual(input,original,'diversion routing preserves raw saved answers');diversionCases++;
}
const adultAnswers={...answers,age_at_offense:'30'};
for(const [patch,code] of [[{ownership_scope:'No'},'hard_stop'],[{jurisdiction_scope:'Federal'},'hard_stop']]){
 const evaluated=evaluate({jurisdiction:'OH',profileVersion:profile.profileVersion,matterId:'TEST-oh-refusal',answers:{...adultAnswers,...patch}}).evaluation;
 assert.equal(evaluated.resultCode,code,'existing refusal/uncertainty remains in force');assert.equal(evaluated.paymentAllowed,false);
}
const court=evaluate({jurisdiction:'OH',profileVersion:profile.profileVersion,matterId:'TEST-oh-later-court',answers:{...adultAnswers,court:'Juvenile Court'}}).evaluation;
assert.equal(court.pathwayId,undefined,'later court text cannot establish a screening juvenile fact');assert.equal(court.paymentAllowed,false);
const explicitJuvenile=evaluate({jurisdiction:'OH',profileVersion:profile.profileVersion,matterId:'TEST-oh-explicit-juvenile',answers:{...adultAnswers,case_outcome:'Juvenile adjudication or offense committed as a minor'}}).evaluation;
assert.equal(explicitJuvenile.pathwayId,OH_JUVENILE_ROUTE,'explicit juvenile outcome remains supported');assert.equal(explicitJuvenile.paymentAllowed,false);
// Preserve exact former juvenile selections without carrying their plan into current authority.
const present=record=>decorate({consumerAuthUserId:'TEST-owner',item:{id:'TEST-oh-legacy',jurisdiction:'OH',artifactRefs:{}}},{
 readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:record}),
 readTrustedPendingSource:async()=>({ok:false,reason:'TEST-absent'}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),
 evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
for(const outcome of [adultAnswers.case_outcome,'Deferred'])for(const age of ['30','17-19']){
 const legacySeed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:compiled,screeningAnswers:{...adultAnswers,case_outcome:outcome,age_at_offense:age},dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(legacySeed);
 const legacy={status:'unverified',revision:0,draftHash:legacySeed.hash,draftSnapshot:legacySeed.snapshot};
 const original=structuredClone(legacy),authoritative=P.evaluateProtectedPacketFacts(legacy.draftSnapshot);
 const successor=P.ohioDiversionDraftSuccessor(legacy.draftSnapshot,authoritative);assert(successor,'exact former juvenile draft has a held successor');
 for(const key of ['screeningAnswers','prefilledAnswers','packetAnswers','dependencies'])assert.deepEqual(successor[key],original.draftSnapshot[key],'successor preserves '+key);
 assert.equal(successor.pathwayId,null);assert.equal(successor.packetPlan,null);assert.equal(successor.paymentAllowed,false);
 const model=P.protectedPacketInformationModelFor(legacy);assert(model,'former adult-diversion draft opens held');assert.equal(model.packetPlan,null);
 if(age==='17-19'){
  assert(model.missingInputIds.includes('age_at_offense'),'held uncertainty asks the existing age question');
  assert(model.builderQuestions.some(q=>q.id==='age_at_offense'),'age correction is reachable');
  assert(P.editablePacketInputIds(model).has('age_at_offense'));
  const changed=P.packetInformationPatch({protectedVerification:legacy,answers:{age_at_offense:'30'}});assert(changed,'owner can correct the existing age answer');
  const next=changed.protectedTransition.nextVerification;
  assert.equal(next.status,'unverified');assert.equal(next.draftSnapshot.pathwayId,null);assert.equal(next.draftSnapshot.paymentAllowed,false);
  assert(next.draftSnapshot.dependencies.semanticAnswerHistory.some(h=>h.factId==='age_at_offense'&&h.value==='17-19'),'age correction retains the earlier raw answer');
 }
 assert.deepEqual(P.packetInformationPatch({protectedVerification:legacy,answers:{}}).protectedTransition.nextVerification,original,'saved answers and earlier draft survive a no-op');
 const card=await present(legacy);assert.equal(card.authorityStatus,'protected_draft','Briefcase applies the same successor');
 assert.equal(card.resultCode,age==='30'?'guidance_only':'needs_more_info');assert.equal(card.pathwayId,null);
 assert.notEqual(card.verificationStatus,'verified');assert.equal(Object.values(card.commercialActions).some(Boolean),false);
 assert.deepEqual(legacy,original,'read/model/card/no-op never rewrite stored history');
 for(const [key,value] of Object.entries({profileSourceFingerprint:'tampered',profileAuthorityFingerprint:'tampered',packetPlan:null,requiredInputIds:[],serverFacts:{jurisdiction:'OH'},packetFamilyIdentifiers:{mode:null,sourceFormIds:[]},selectedTrackId:'invented',paymentAllowed:true})){
  const bad=structuredClone(legacy);bad.draftSnapshot[key]=value;bad.draftHash=P.protectedPacketDraftHash(bad.draftSnapshot);
  assert.equal(P.ohioDiversionDraftSuccessor(bad.draftSnapshot,authoritative),null,'successor refuses '+key);
  assert.equal(P.protectedPacketInformationModelFor(bad),null,'protected model refuses '+key);
 }
 for(const variant of ['hash','verified']){
  const bad=structuredClone(legacy);if(variant==='hash')bad.draftHash='tampered';else bad.status='verified';
  assert.equal((await present(bad)).authorityStatus,'unavailable','card refuses '+variant);
 }
}
// F1: exact historical no-route needs_review tuples, pinned to genuine base80/4a390 draft hashes.
const heldHashes=[
 ['f5fa4e4d0eb58e9c13247fd57b36ffd32d90cfa9c7bc5250178fcd3e8767ce3b','c0f30853d7f51fcfda83ff0ceef7446f0338df7823925aca24ee026349884065','1dd6286f25959ac54f4b76e161d9c108cce98e1380339c8b5ced16f9efe889a9'],
 ['8943cbb75c64bdeb89fa4e135e614105526d79296609ad0da37807a4d1717aff','7a670c49eadab81470c5858ef047fbcf04c5f162387bb84e6033378d81e5fb25','06a65f8ba264ff3131eab0ad9f17457c69e2e1c5851692fcc3aed89ccad456c9']
];
let heldCases=0,heldTamperCases=0;
for(const [o,outcome]of [adultAnswers.case_outcome,'Deferred'].entries())for(const [i,age]of ['I am not sure','Prefer not to say','30'].entries()){
 const raw={...adultAnswers,case_outcome:outcome,age_at_offense:age};if(i===2)raw.possible_pathway_context='None of these / I am not sure';
 const authoritative=evaluate({jurisdiction:'OH',profileVersion:profile.profileVersion,matterId:'TEST-oh-held',answers:raw});
 const oldAuthority={...authoritative,packetType:null,evaluation:{...authoritative.evaluation,resultCode:'needs_review',pathwayId:undefined,packetPlan:undefined}};
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:oldAuthority,screeningAnswers:raw,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);
 assert.equal(seed.hash,heldHashes[o][i],'exact historical held draft, including code-derived null-route fingerprint');
 for(const withMaps of [false,true]){
  const legacy={status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:structuredClone(seed.snapshot)};
  if(withMaps){legacy.draftSnapshot.prefilledAnswers={participant_full_legal_name:'TEST Person'};legacy.draftSnapshot.packetAnswers={court:'Juvenile Court',charge:'TEST charge'};legacy.draftSnapshot.dependencies={testDependency:{value:'TEST'}};legacy.draftHash=P.protectedPacketDraftHash(legacy.draftSnapshot);}
  const original=structuredClone(legacy),current=P.evaluateProtectedPacketFacts(legacy.draftSnapshot);
  const successor=P.ohioDiversionDraftSuccessor(legacy.draftSnapshot,current);assert(successor,'former no-route held diversion remains accessible');
  for(const key of ['screeningAnswers','prefilledAnswers','packetAnswers','dependencies'])assert.deepEqual(successor[key],original.draftSnapshot[key],'held successor preserves '+key);
  assert.equal(successor.pathwayId,null);assert.equal(successor.packetPlan,null);assert.equal(successor.paymentAllowed,false);
  const model=P.protectedPacketInformationModelFor(legacy);assert(model);assert.equal(model.packetPlan,null);
  assert(P.editablePacketInputIds(model).has('age_at_offense'),'canonical and alias outcomes expose the existing age correction');
  const card=await present(legacy);assert.equal(card.authorityStatus,'protected_draft');assert.equal(card.resultCode,i===2?'guidance_only':'needs_more_info');assert.equal(Object.values(card.commercialActions).some(Boolean),false);
  assert.deepEqual(P.packetInformationPatch({protectedVerification:legacy,answers:{}}).protectedTransition.nextVerification,original,'held no-op preserves exact record');
  const changed=P.packetInformationPatch({protectedVerification:legacy,answers:{age_at_offense:'45'}});assert(changed);
  const next=changed.protectedTransition.nextVerification;assert.equal(next.status,'unverified');assert.equal(next.draftSnapshot.pathwayId,null);assert.equal(next.draftSnapshot.paymentAllowed,false);
  assert(next.draftSnapshot.dependencies.semanticAnswerHistory.some(h=>h.factId==='age_at_offense'&&h.value===age),'amendment archives the literal former age');
  assert.deepEqual(legacy,original,'reading and correcting do not mutate the stored draft');heldCases++;
 }
 const legacy={status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};
 for(const [key,value]of Object.entries({profileSourceFingerprint:'tampered',profileAuthorityFingerprint:'tampered',profileVersion:'tampered',packetPlan:compiled.evaluation.packetPlan,packetType:'guidance_packet',requiredInputIds:['invented'],serverFacts:{jurisdiction:'OH',pathwayId:OH_JUVENILE_ROUTE},packetFamilyIdentifiers:{mode:'guidance_only',sourceFormIds:[]},resultCode:'guidance_only',selectedTrackId:'invented',treatmentClassification:'invented',deferralComponentIds:['invented'],paymentAllowed:true})){
  const bad=structuredClone(legacy);bad.draftSnapshot[key]=value;bad.draftHash=P.protectedPacketDraftHash(bad.draftSnapshot);
  assert.equal(P.ohioDiversionDraftSuccessor(bad.draftSnapshot,authoritative),null,'held successor refuses '+key);assert.equal(P.protectedPacketInformationModelFor(bad),null,'held model refuses '+key);heldTamperCases++;
 }
 for(const patch of [{case_outcome:'Misdemeanor conviction'},{case_outcome:'Dismissed after program'},{case_outcome:'I am not sure'},{ownership_scope:'No'},{jurisdiction_scope:'Federal'},{age_at_offense:'16'},{possible_pathway_context:'Juvenile sealing and expungement'}]){
  const bad=structuredClone(legacy);Object.assign(bad.draftSnapshot.screeningAnswers,patch);bad.draftHash=P.protectedPacketDraftHash(bad.draftSnapshot);
  assert.equal(P.ohioDiversionDraftSuccessor(bad.draftSnapshot,P.evaluateProtectedPacketFacts(bad.draftSnapshot)),null,'unrelated, excluded, minor or selected context is not a held diversion successor');heldTamperCases++;
 }
 for(const variant of ['hash','verified']){const bad=structuredClone(legacy);if(variant==='hash')bad.draftHash='tampered';else bad.status='verified';assert.equal((await present(bad)).authorityStatus,'unavailable');heldTamperCases++;}
}
// F2: a self-consistent other-route tuple cannot gain the diversion successor.
let otherRouteRefusals=0;
for(const f of fixtures.filter(f=>f.pathwayKey!=='OH:'+OH_JUVENILE_ROUTE)){
 const authoritative=evaluate({jurisdiction:'OH',profileVersion:profile.profileVersion,matterId:'TEST-oh-other-route',answers:f.answers});
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:adultAnswers,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);
 assert.equal(P.ohioDiversionDraftSuccessor(seed.snapshot,P.evaluateProtectedPacketFacts(seed.snapshot)),null,'other-route draft refused: '+f.pathwayKey);otherRouteRefusals++;
}
// F3: an explicit optional juvenile context preserves the exact released-base evaluation.
const selected=evaluate({jurisdiction:'OH',profileVersion:profile.profileVersion,matterId:'TEST-oh-compiled-copy',answers:{...adultAnswers,possible_pathway_context:'Juvenile sealing and expungement'}}).evaluation;
assert.equal(selected.pathwayId,OH_JUVENILE_ROUTE);assert.equal(selected.paymentAllowed,false);
assert.equal(digest(selected),'243a291e2312a164fd2bc4fa7ef68fd0c46c648a1afdbf8ee0d140a89afd46ff','selected-context baseline digest unchanged');
console.log(JSON.stringify({status:'PASS',pathways:fixtures.length,compiledFallbackCases:1,diversionCases,refusalCases:2,translatedPairs:1,preservedDrafts:fixtures.length+4+heldCases,tamperedDraftCases:40+heldTamperCases,heldCases,otherRouteRefusals,selectedContextCases:1}));
