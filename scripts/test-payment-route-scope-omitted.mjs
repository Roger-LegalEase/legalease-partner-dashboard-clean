// F-NE-2 m154: native PRE invariance/refusal, never a payment-only widening.
import assert from 'node:assert/strict';import fs from 'node:fs';import {register} from 'node:module';import {pathToFileURL} from 'node:url';
process.env.RCAP_EVALUATOR_TODAY='2026-10-18';globalThis.fetch=()=>{throw Error('NETWORK_FORBIDDEN');};const url=p=>pathToFileURL(process.cwd()+'/'+p).href;register(url('scripts/lib/ts-esm-loader.mjs'));
const phase=process.argv[2]??'post',fixture=new URL('./fixtures/payment-route-scope-omitted.json',import.meta.url);assert(['pre','post','add_ms'].includes(phase));
if(phase==='add_ms')register('data:text/javascript,'+encodeURIComponent(`export async function load(u,c,next){const r=await next(u,c);if(!u.endsWith('/packet-information.ts'))return r;const s=String(r.source),a='const PAYMENT_ONLY_DRAFT_ROUTES = new Set([';if(s.split(a).length!==2)throw Error('anchor');return {...r,source:s.replace(a,a+'"MS:first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1",')};}`));
const P=await import(url('src/lib/expungement-ai/packet-information.ts'));const B=await import(url('src/lib/expungement-ai/briefcase-presentation-authority.ts'));const {evaluateAuthoritativeScreeningResult:evaluate}=await import(url('src/lib/expungement-ai/authoritative-screening-result.ts'));
const rows=JSON.parse(fs.readFileSync(fixture)).rows;let checks=0;const failures=[];const check=(name,fn)=>{checks++;try{fn();}catch(e){failures.push({name,error:e.message});}};
for(const row of rows){const record=structuredClone(row.record),before=structuredClone(record),s=record.draftSnapshot,a=P.evaluateProtectedPacketFacts(s),answers=P.protectedPacketScreeningAnswers(s);const publicResult=evaluate({jurisdiction:s.jurisdiction,profileVersion:s.profileVersion,matterId:'f-ne-2-synthetic',answers}).evaluation;
 check(row.key+':hash',()=>assert.equal(P.protectedPacketDraftHash(s),record.draftHash));
 check(row.key+':public-payment',()=>assert.equal(publicResult.paymentAllowed,phase==='pre'&&row.expected==='refused'));
 check(row.key+':protected-unpaid',()=>assert.equal(a.evaluation.paymentAllowed,false));
 const model=P.protectedPacketInformationModelFor(record),patch=P.packetInformationPatch({protectedVerification:record,answers:{}});
 const item={id:'00000000-0000-4000-8000-000000000037',jurisdiction:s.jurisdiction,createdAt:s.capturedAt,artifactRefs:{}};
 const presented=await B.decorateBriefcaseItemForPresentationWithDependencies({consumerAuthUserId:item.id,item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:record}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:s.jurisdiction,profileVersion:s.profileVersion,matterId:item.id,answers,product:'expungement_ai_dtc',sourceSessionId:'synthetic-only',claimedAt:s.capturedAt,partnerBenefitActive:false,partnerSlug:null}}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
 if(row.expected==='held'){
  check(row.key+':result-invariant',()=>{assert.equal(publicResult.resultCode,s.resultCode);assert.equal(a.evaluation.resultCode,s.resultCode);});
  check(row.key+':model-held',()=>{assert(model);assert.equal(model.reviewSafety.safe,false);});
  check(row.key+':noop',()=>{assert(patch);assert.deepEqual(patch.protectedTransition.nextVerification,record);assert.equal(patch.readyToGenerate,false);});
  check(row.key+':briefcase-held',()=>{assert.equal(presented.authorityStatus,'protected_draft');assert.equal(presented.resultCode,s.resultCode);});
 }else{
  check(row.key+':nonpayment-conflict',()=>{assert.equal(a.evaluation.resultCode,'needs_review');assert.equal(a.evaluation.reasons[0].code,'ms.first_offender_conviction_record_conflict');});
  check(row.key+':model-refused',()=>{assert.equal(model,null);assert.equal(patch,null);});
  check(row.key+':successor-refused',()=>assert.equal(P.paymentOnlyDraftSuccessor(s,a,'unverified'),null));
  check(row.key+':briefcase-refused',()=>assert.equal(presented.authorityStatus,'unavailable'));
 }
 check(row.key+':actions-disabled',()=>assert(Object.values(presented.commercialActions).every(v=>v===false)));
 check(row.key+':stored-record-preserved',()=>assert.deepEqual(record,before));
}
console.log(JSON.stringify({phase,checks,passed:checks-failures.length,failures},null,2));process.exitCode=failures.length?1:0;
