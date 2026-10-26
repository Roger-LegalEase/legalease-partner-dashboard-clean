import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const B = await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const fixtures = JSON.parse(fs.readFileSync(new URL('./lib/il-ga-protected-pre-exclusion-fixtures.json',import.meta.url)));
const checks=[]; const check=(id,pass)=>checks.push({id,pass:!!pass});
const equal=(a,b)=>{try{assert.deepEqual(a,b);return true;}catch{return false;}};
const maps=['screeningAnswers','prefilledAnswers','packetAnswers'];
for(const row of fixtures.rows){
 const original=structuredClone(row.verification),state=original.draftSnapshot.jurisdiction,item={id:'synthetic-protected-exclusion',jurisdiction:state,artifactRefs:{}};
 // Fixture enrichment tests raw preservation; the unchanged historical tuple is still pinned above.
 original.draftSnapshot.packetAnswers.legacy_unrecognized={private:{retained:true}};
 original.draftSnapshot.prefilledAnswers.unrecognized_shadow={nested:['raw',7]};
 original.draftHash=P.protectedPacketDraftHash(original.draftSnapshot);
 const before=structuredClone(original),model=P.protectedPacketInformationModelFor(original);
 check(state+'/genuine-old-row-readable',model); if(!model)continue;
 if(state==='IL'){
  for(const status of ['verified','invalidated'])check(state+'/old-plan-'+status+'-refused',P.protectedPacketInformationModelFor({...original,status})===null);
  const bad=structuredClone(original);bad.draftSnapshot.packetPlan.sourceFormIds=['unreviewed-form'];
  bad.draftSnapshot.packetFamilyIdentifiers.sourceFormIds=['unreviewed-form'];bad.draftHash=P.protectedPacketDraftHash(bad.draftSnapshot);
  check(state+'/unreviewed-plan-refused',P.protectedPacketInformationModelFor(bad)===null);
 }
 const presentation=await B.decorateBriefcaseItemForPresentationWithDependencies({consumerAuthUserId:'synthetic-owner',item},{
  readProtectedVerification:async()=>({ok:true,value:original}),readProtectedArtifact:async()=>({ok:true,value:null}),
  readPaymentAuthority:async()=>({valid:false,reason:'no_authority_row'}),readTrustedPendingSource:async()=>({ok:false,reason:'not_needed'}),
  evaluateAuthoritative:evaluate
 });
 check(state+'/briefcase-held-readable',presentation.authorityStatus==='protected_draft'&&presentation.resultCode==='needs_review'&&presentation.pathwayId===null&&presentation.packetDraft.status==='available'&&presentation.packetDraft.packetPlan===null&&presentation.packetProgress==='in_progress');
 check(state+'/briefcase-no-checkout-or-download',!presentation.commercialActions.checkoutAllowed&&!presentation.commercialActions.generationAllowed&&!presentation.artifact.canDownload&&presentation.paymentState==='unavailable');
 check(state+'/briefcase-correction-control',presentation.packetDraft.builderQuestions?.some(q=>q.id===(state==='IL'?'il_cannabis_next_step':'ga_original_first_offender')));
 check(state+'/briefcase-raw-preserved',maps.every(map=>equal(presentation.packetDraft[map],original.draftSnapshot[map]))&&equal(original,before));
 check(state+'/current-held',model.pathwayId===null&&!model.packetPlan&&!model.reviewSafety.safe&&model.stage==='in_progress');
 check(state+'/no-invented-document-obligation',equal(model.requiredInputIds,[]));
 const fact=state==='IL'?'il_cannabis_next_step':'ga_original_first_offender';
 check(state+'/correction-control',model.builderQuestions.some(q=>q.id===fact)&&P.heldPacketCorrectionInputIds(model,'needs_review').has(fact));
 const noop=P.packetInformationPatch({existingItem:item,protectedVerification:original,answers:{}});
 check(state+'/read-and-noop-immutable',equal(original,before)&&equal(noop?.protectedTransition.nextVerification,original));
 check(state+'/no-auto-verify',!P.packetInformationPatch({existingItem:item,protectedVerification:original,answers:{},verify:true})?.readyToGenerate);
 for(const [field,value]of Object.entries({profileVersion:'wrong',profileSourceFingerprint:'wrong',profileAuthorityFingerprint:'wrong',pathwayId:'wrong',resultCode:'packet_ready',paymentAllowed:true,packetType:'wrong',selectedTrackId:'wrong',treatmentClassification:'wrong',deferralComponentIds:['wrong'],requiredInputIds:[],packetPlan:null,packetFamilyIdentifiers:{mode:null,sourceFormIds:[]},serverFacts:{jurisdiction:state}})){
  const bad=structuredClone(original);bad.draftSnapshot[field]=value;bad.draftHash=P.protectedPacketDraftHash(bad.draftSnapshot);check(state+'/tampered-'+field,P.protectedPacketInformationModelFor(bad)===null);
 }
 const bad=structuredClone(original);bad.draftHash='wrong';check(state+'/hash-denied',P.protectedPacketInformationModelFor(bad)===null);
 let current=original; const edits=state==='GA'?[{ga_original_first_offender:'yes'},{ga_first_offender_status:'active'},{case_outcome:'Diversion, deferred disposition, supervision, or similar program'},{ga_first_offender_sentence_date:'2025-01-01'}]:[{il_cannabis_next_step:'vacate_conviction'}];
 for(const [index,answers]of edits.entries()){
  const prior=current, m=P.protectedPacketInformationModelFor(prior);
  check(state+'/'+index+'/real-controls',Object.keys(answers).every(id=>m.questions.some(q=>q.id===id)&&P.editablePacketInputIds(m).has(id)));
  const update=P.packetInformationPatch({existingItem:item,protectedVerification:prior,answers});current=update?.protectedTransition.nextVerification;
  check(state+'/'+index+'/saved',current);if(!current)break;
  check(state+'/'+index+'/cas-and-no-verification',update.protectedTransition.expectedPriorRevision===prior.revision&&!update.readyToGenerate&&current.status!=='verified');
  for(const source of maps)for(const [id,value]of Object.entries(prior.draftSnapshot[source]))if(!(id in answers))check(state+'/'+index+'/retained/'+source+'/'+id,equal(current.draftSnapshot[source][id],value));
  for(const id of Object.keys(answers))for(const source of maps)if(Object.hasOwn(prior.draftSnapshot[source],id))check(state+'/'+index+'/history/'+source+'/'+id,current.draftSnapshot.dependencies.semanticAnswerHistory?.some(e=>e.factId===id&&e.source===source&&equal(e.value,prior.draftSnapshot[source][id])));
  check(state+'/'+index+'/current-model',P.protectedPacketInformationModelFor(current));
 }
 check(state+'/explicit-facts-resolve-original-procedure',current?.draftSnapshot.pathwayId===original.draftSnapshot.pathwayId);
 if(current){const update=P.packetInformationPatch({existingItem:item,protectedVerification:current,answers:{[fact]:state==='GA'?'no':'other_relief'}});check(state+'/explicit-negative-holds-again',update?.protectedTransition.nextVerification.draftSnapshot.pathwayId===null&&!update.readyToGenerate);}
}
const failed=checks.filter(c=>!c.pass),report={status:failed.length?'FAIL':'PASS',checks:checks.length,failed,details:checks,scope:'Two genuine historical held authority tuples plus explicit conditional recovery; no legal, language, offer or financial-event acceptance.'};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,checks:checks.length,failed}));assert.equal(failed.length,0);
