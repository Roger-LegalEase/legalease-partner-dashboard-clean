import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),read=p=>JSON.parse(fs.readFileSync(root+'/'+p));
register(pathToFileURL(root+'/scripts/lib/ts-esm-loader.mjs'));
const H=await import('../src/lib/expungement-ai/oh-trafficking-court-context.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {packetSpecificationFor}=await import('../src/lib/rcap/grade-a/packet-specification.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const profile=getProfileByJurisdiction('OH');
const source={memo:read('data/record-clearing/legal-design-intake/OH.memo.json'),proof:read('data/record-clearing/production-factory/packet-proofs/rcap-oh-guidance-implementation.json'),family:read('data/rcap-ledger/completed-output-counsel-manifest.json').families.find(x=>x.familyId==='rcap-oh-guidance-implementation')};
const witnesses=read('data/rcap-ledger/public-witness-answer-sets.json').witnesses;
const question={id:'court',stage:'case_details',type:'text',required:true,contextOnly:false,prompt:'Which court or agency handled the case?',options:null,translations:{es:{prompt:'¿Qué tribunal o agencia manejó el caso?'}}};
let checks=0;const diagnostics=[];const check=(name,fn)=>{try{fn();checks++;}catch(e){e.message=name+': '+e.message;throw e;}};
for(const route of H.OH_TRAFFICKING_GUIDANCE_ROUTES){
 const spec=packetSpecificationFor('OH:'+route);
 check('exact route approved guidance source',()=>{assert.equal(spec,undefined);assert(H.ohTraffickingCourtIsContext(profile,route,spec,source));});
 for(const key of ['memo','proof','family'])for(const value of [null,{},[],{...source[key],unreviewedChange:true}])check('source drift '+key,()=>assert(!H.ohTraffickingCourtIsContext(profile,route,spec,{...source,[key]:value})));
 for(const mutate of [p=>p.jurisdiction.code='WY',p=>p.profileVersion='changed',p=>p.source.sourceCorpusSha256='changed',p=>p.pathways.find(x=>x.id===route).triggerFields.push('court')])check('profile drift',()=>{const p=structuredClone(profile);mutate(p);assert(!H.ohTraffickingCourtIsContext(p,route,spec));});
 check('new specification cannot inherit exception',()=>assert(!H.ohTraffickingCourtIsContext(profile,route,{routeKey:'OH:'+route})));
 check('localized descriptor is optional context with unchanged wire shape',()=>{const before=structuredClone(question),q=H.ohTraffickingCourtContextQuestion(question,profile,route,spec);assert.deepEqual(question,before);assert.equal(q.required,false);assert.equal(q.contextOnly,true);assert.equal(q.type,'text');assert.equal(q.options,null);assert.equal(q.prompt,question.prompt);assert.deepEqual(q.translations,question.translations);assert.equal(q.helperText,question.helperText);});
 for(const mutate of [q=>q.id='county',q=>q.stage='screening',q=>q.type='text_or_unknown',q=>q.prompt='Different court fact',q=>q.options=['Yes','No']])check('changed descriptor refuses',()=>{const q=structuredClone(question);mutate(q);assert.strictEqual(H.ohTraffickingCourtContextQuestion(q,profile,route,spec),q);});
 const track=source.memo.tracks.find(t=>t.trackId===(route.includes('non-conviction')?'oh_2953_521_trafficking_nonconviction':'oh_2953_36_trafficking'));
 check('source-owned guidance/ordinary comparison/referral preserved',()=>{assert.equal(track.outputStrategy,'process_guidance');assert(track.destination.detail.includes('prepares no application'));assert.equal(track.legalDesignDecision.status,'legal_design_approved_with_limitations');assert.deepEqual(track.participantInputs.map(x=>x.key),['2953_Disposition','2953_OrdinaryRoute','2953_WantsReferral']);assert(track.components.some(x=>x.role==='alternative_route_screen'));assert.equal(track.participantInputs[2].requirement,'conditional');});
 // Existing retained public inputs are synthetic dismissed/trafficking-No
 // witnesses. They establish consumer shape, never survivor qualification.
 const w=witnesses.find(w=>w.pathwayKey==='OH:'+route),answers=structuredClone(w.finalAnswers);
 const a=evaluate({jurisdiction:'OH',profileVersion:profile.profileVersion,matterId:'synthetic-oh-context',answers});
 for(const [label,value] of [['absent',undefined],['known','SYNTHETIC EARLIER COURT'],['unknown',{unknown:true,value:''}]]){
  const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:a,screeningAnswers:answers,packetAnswers:value===undefined?{}:{court:value},dependencies:{},capturedAt:'2026-10-15T00:00:00.000Z'});assert(seed);
  const record={status:'unverified',reason:'synthetic-retained-public-input-reproduction',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot},before=structuredClone(record),model=P.protectedPacketInformationModelFor(record);assert(model);
  check('actual model read preserves full record '+label,()=>{assert.deepEqual(record,before);assert.equal(a.evaluation.resultCode,'needs_review');assert.equal(a.evaluation.paymentAllowed,false);assert.equal(a.evaluation.selectedTrackId??null,null);assert.deepEqual([...P.heldPacketCorrectionInputIds(model,a.evaluation.resultCode)],[]);});
  check('actual no-op preserves plan and all original maps '+label,()=>{const update=P.packetInformationPatch({existingItem:{id:'synthetic-oh-context',artifactRefs:{}},protectedVerification:record,answers:{}});assert.deepEqual(update.protectedTransition.nextVerification,record);assert.equal(update.readyToGenerate,false);assert.deepEqual(record,before);});
  check('helper projection leaves raw record untouched '+label,()=>{const projected=H.ohTraffickingCourtContextQuestion(model.questions.find(q=>q.id==='court'),profile,route,spec);assert.equal(projected.required,false);assert.deepEqual(record,before);});
  diagnostics.push({route,label,required:model.questions.find(q=>q.id==='court')?.required,missing:model.missingInputIds.includes('court'),heldCorrectionIds:[...P.heldPacketCorrectionInputIds(model,a.evaluation.resultCode)]});
 }
}
for(const route of [null,'',...profile.pathways.map(p=>p.id).filter(id=>!H.OH_TRAFFICKING_GUIDANCE_ROUTES.includes(id))])check('unrelated route unchanged',()=>{assert(!H.ohTraffickingCourtIsContext(profile,route,undefined));assert.strictEqual(H.ohTraffickingCourtContextQuestion(question,profile,route,undefined),question);});
check('later named approval does not rewrite historical proof flags',()=>{assert.equal(source.family.legalApprovalResult,'approved_by_decision_owner');assert.equal(source.family.legalDecisionRecordId,'auth-2026-08-19-owner-legal-approval-completed-output');assert.equal(source.proof.runtimeStatus,'runtime_disabled');assert.equal(source.proof.productionEnabled,false);assert.equal(source.proof.completedOutputLegalReview,'pending');});
console.log(JSON.stringify({status:'PASS_STAGED_OH_SOURCE_CONTEXT_HELPER',checks,consumerAcceptance:'separate actual handler/page suite',diagnostics,noDatabase:true,noBrowser:true,noRender:true,noOwnerAcceptance:true,existingLocalizedPromptPreserved:true}));
