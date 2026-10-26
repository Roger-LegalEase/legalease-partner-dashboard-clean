import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
process.env.RCAP_EVALUATOR_TODAY = '2026-10-13';
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const { parseJurisdictionProfile } = await import('../src/lib/expungement-ai/frontend/schemas.ts');
const { screensFromQuestionIds, deriveScreens, sanitizeAnswersForQuestionIds, sanitizeResumedAnswersForQuestionIds } = await import('../src/components/expungement-ai/screening/screens.ts');
const { resolveRuntimeText } = await import('../src/lib/expungement-ai/localization.ts');
const { MS_NONCONVICTION_SCREENING_ANSWERS: ms } = await import('./lib/rcap-ms-nonconviction-fixture.mjs');
// Exact13 independently observed positive witnesses; no new route inventory.
const routes = [
  "LA:felony-article-893-e-set-aside-followed-by-expungement",
  "LA:misdemeanor-article-894-b-set-aside-followed-by-expungement",
  "LA:non-conviction-arrest-expungement",
  "MO:general-arrest-charge-plea-trial-or-conviction-expungement-under-rsmo-610-140",
  "MO:stolen-or-mistaken-identity-expungement-under-610-145",
  "NC:dismissal-and-not-guilty-expunction-under-g-s-15a-146",
  "NE:set-aside-incarceration-one-year-or-less",
  "NE:set-aside-probation-fine-community-service",
  "VT:juvenile-sealing",
  "VT:offense-before-age-25-sealing-under-33-v-s-a-5119-g",
  "VT:young-adult-sealing-for-offenses-committed-at-ages-18-21",
  "WV:accelerated-treatment-recovery-job-readiness-expungement-under-61-11-26a",
  "WV:first-offense-drug-possession-conditional-discharge-relief"
];
const witnesses = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses;
const checks = [], rows = [];
const eq = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const check = (id, pass) => checks.push({id, pass: !!pass});
const maps = ['screeningAnswers','prefilledAnswers','packetAnswers'];
for (const route of routes) {
  const state = route.slice(0,2), profile = getProfileByJurisdiction(state), witness = witnesses.find(w=>w.pathwayKey===route);
  const a = evaluate({jurisdiction:state,profileVersion:profile.profileVersion,matterId:'synthetic-financial-nonplan',answers:witness.finalAnswers});
  check(route+'/positive-control', ['packet_ready','packet_ready_with_caution'].includes(a.evaluation.resultCode));
  const seed = P.protectedPacketDraftSeedFromAuthoritative({authoritative:a,screeningAnswers:witness.finalAnswers,dependencies:{commercialFlowVersion:1},capturedAt:'2026-10-13T01:00:00Z'});
  seed.snapshot.packetAnswers.legacy_unrecognized = { private: { unchanged: true } };
  seed.snapshot.packetAnswers.case_number = 'SYNTHETIC-NONPLAN';
  seed.hash = P.protectedPacketDraftHash(seed.snapshot);
  const prior = {status:'unverified',reason:'synthetic',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};
  const item = {id:'synthetic-financial-nonplan',jurisdiction:state,artifactRefs:{}};
  for (const value of ['I am not sure',{unknown:true}]) {
    const before = JSON.stringify(prior);
    const patch = P.packetInformationPatch({existingItem:item,protectedVerification:prior,answers:{financial_obligations:value}});
    const next = patch?.protectedTransition.nextVerification, model = next && P.protectedPacketInformationModelFor(next);
    check(route+'/held-model/'+JSON.stringify(value), Boolean(model));
    if (!model) continue;
    check(route+'/raw-preserved', eq(next.draftSnapshot.packetAnswers.financial_obligations,value));
    check(route+'/read-no-mutation',JSON.stringify(prior)===before);
    check(route+'/same-identity',next.draftSnapshot.pathwayId===prior.draftSnapshot.pathwayId);
    check(route+'/no-plan-invented',!next.draftSnapshot.packetPlan&&!model.packetPlan&&!next.draftSnapshot.paymentAllowed);
    check(route+'/no-document-required-facts-invented',eq(model.requiredInputIds,[]));
    check(route+'/existing-question',model.questions.some(q=>q.id==='financial_obligations'));
    check(route+'/actual-builder-question',model.builderQuestions.some(q=>q.id==='financial_obligations'));
    for(const source of maps) for(const [id,raw] of Object.entries(prior.draftSnapshot[source])) if(id!=='financial_obligations') check(route+'/original-to-held-raw/'+source+'/'+id,eq(next.draftSnapshot[source][id],raw));
    check(route+'/actual-edit-ownership',P.editablePacketInputIds(model).has('financial_obligations'));
    check(route+'/held-link',P.heldPacketCorrectionInputIds(model,next.draftSnapshot.resultCode).has('financial_obligations'));
    check(route+'/specific-missing-fact',model.missingInputIds.includes('financial_obligations'));
    check(route+'/not-server-owned',!P.editablePacketInputIds({...model,serverFacts:{...model.serverFacts,financial_obligations:'Yes'}}).has('financial_obligations'));
    check(route+'/needs-real-question',!P.editablePacketInputIds({...model,questions:model.questions.filter(q=>q.id!=='financial_obligations')}).has('financial_obligations'));
    check(route+'/unknown-no-verification',P.packetInformationPatch({existingItem:item,protectedVerification:next,answers:{},verify:true})?.readyToGenerate===false);
    const repaired = P.packetInformationPatch({existingItem:item,protectedVerification:next,answers:{financial_obligations:'Yes'}});
    const fixed = repaired?.protectedTransition.nextVerification;
    check(route+'/explicit-delta',repaired?.protectedTransition.answerDelta.financial_obligations==='Yes');
    check(route+'/positive-reevaluation',fixed?.draftSnapshot.resultCode===prior.draftSnapshot.resultCode);
    check(route+'/never-silently-verify',fixed?.status!=='verified'&&repaired?.readyToGenerate===false);
    if(fixed) for(const source of maps) for(const [id,raw] of Object.entries(next.draftSnapshot[source])) if(id!=='financial_obligations') check(route+'/unrelated-raw/'+source+'/'+id,eq(fixed.draftSnapshot[source][id],raw));
    rows.push({route,value,heldResult:next.draftSnapshot.resultCode,heldPlan:!!next.draftSnapshot.packetPlan,heldQuestionIds:model.questions.map(q=>q.id),restored:fixed?.draftSnapshot.resultCode});
  }
}
for (const [name,patch,ids] of [
  ['financial',{financial_obligations:'I am not sure'},['financial_obligations']],
  ['court',{court_requirements_completed:'not_sure'},['court_requirements_completed']],
  ['both',{financial_obligations:'I am not sure',court_requirements_completed:'not_sure'},['court_requirements_completed','financial_obligations']],
  ['sentence',{sentence_completion_date:'I am not sure'},['sentence_completion_date']]
]) {
  const result=evaluate({jurisdiction:'MS',profileVersion:getProfileByJurisdiction('MS').profileVersion,matterId:'synthetic-financial-guidance',answers:{...ms,...patch}}).evaluation;
  check(name+'/specific-unresolved-questions',eq(result.missingQuestionIds,ids));
  const p=getProfileByJurisdiction('MS'), visible=selectScreeningQuestionIds(p,projectPublicProfile(p),{...ms,...patch});
  for(const id of ids) check(name+'/actual-screening-reachability/'+id,visible.includes(id));
  const frontend=parseJurisdictionProfile(projectPublicProfile(p)).data;
  for(const id of ids) check(name+'/actual-screen-builder/'+id,screensFromQuestionIds(frontend,visible).some(q=>q.id===id));
  const resumed=sanitizeResumedAnswersForQuestionIds(frontend,{...ms,...patch},visible);
  for(const [id,value] of Object.entries(patch)) check(name+'/resume-raw/'+id,eq(resumed[id],value));
  if(ids.includes('financial_obligations')) {
    check(name+'/no-date-instruction',!result.nextSteps.some(s=>s.includes('waiting period')));
    check(name+'/financial-guidance',result.nextSteps[0].includes('financial obligations'));
    check(name+'/Spanish-guidance',result.nextSteps.every(s=>resolveRuntimeText('es',s)!==s));
  }
}
for(const [name,value,visible] of [['absent',undefined,false],['known','Yes',false],['negative','No',true],['boolean-negative',false,true],['uncertain','I am not sure',true]]) {
  const p=getProfileByJurisdiction('MS'), answers={...ms,financial_obligations:value};
  check('alias-reuse/'+name,selectScreeningQuestionIds(p,projectPublicProfile(p),answers).includes('financial_obligations')===visible);
  const frontend=parseJurisdictionProfile(projectPublicProfile(p)).data;
  check('alias-initial-screen/'+name,!deriveScreens(frontend).some(q=>q.id==='financial_obligations'));
  check('alias-correction-retained/'+name,eq(sanitizeAnswersForQuestionIds(answers,['financial_obligations'],[],frontend).financial_obligations,value));
}
const failed=checks.filter(c=>!c.pass),report={status:failed.length?'FAIL':'PASS',checks:checks.length,failed,rows,details:checks,limits:['Pure protected transitions and exact finite witness scope. Separate real owner API/browser/DB acceptance required. Historical null-path rows not inferred or repaired here.']};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,checks:checks.length,failed},null,2));assert.equal(failed.length,0);
