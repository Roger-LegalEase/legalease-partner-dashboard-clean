import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {NextRequest} from 'next/server.js';
import {loadTsWithMocks,eligibleItem} from '../test-expungement-checkout-guards.mjs';
const base='dcfe793d4';
const source=p=>execFileSync('git',['show',`${base}:${p}`],{encoding:'utf8'});
const commercial=loadTsWithMocks('src/lib/rcap/render/commercial-admission.ts',{});
let denial='fulfillment_stale';
const refusal=point=>new commercial.CommercialAdmissionDeniedError({admissionPoint:point,denialCode:denial,reason:'publication is stale',contextDenials:[]});
const identity={routeId:'IL:synthetic',packetFamilyId:'synthetic'};
const verification={hash:'a'.repeat(64),snapshot:{jurisdiction:'IL',pathwayId:'synthetic',resultCode:'packet_ready',paymentAllowed:true}};
function admission(failAt) {return {...commercial,commercialRouteIdentity:()=>identity,fulfillmentRequestContext:x=>x,finalVerificationSnapshotFrom:x=>x,entitlementContext:x=>x,artifactStorageContext:x=>x,governSponsoredEntitlement:()=>{if(failAt==='sponsored_entitlement')throw refusal(failAt);},governPacketCreditAdmission:()=>{if(failAt==='packet_credit_admission')throw refusal(failAt);},governGenerationAdmission:()=>{},governProviderDispatch:()=>{if(failAt==='provider_dispatch')throw refusal(failAt);},governCommercialAdmission:point=>{if(point===failAt)throw refusal(point);}};}
for(const code of ['fulfillment_stale','fulfillment_no_record'])for(const before of [true,false])test(`COM-02 ${code} ${before?'before':'after'}: actual lifecycle and generate route preserve semantic refusal`,async()=>{
 denial=code;const gate=admission('sponsored_entitlement');let reads=0,finalizations=0;
 const lifecycle=loadTsWithMocks('src/lib/expungement-ai/rcap-slot-lifecycle.ts',{'@/lib/rcap/render/commercial-admission':gate,'@/lib/supabase/server':{getSupabaseAdminClient:()=>{reads++;throw Error('must not read capacity on refusal');}}},before?source('src/lib/expungement-ai/rcap-slot-lifecycle.ts'):undefined);
 const generation={generatePaidConsumerPacket:async()=>({packetStatus:'generating',artifactRefs:{fileName:'synthetic.pdf',generatedAt:'now',source:'test'},protectedSponsorship:{sourceSessionId:'session',expectedVerificationHash:verification.hash,entitlement:{kind:'sponsored_credit'}}})};
 for(const name of ['ConsumerPacketGenerationError','ConsumerPacketNotAllowedError','ConsumerPacketNotFoundError','ConsumerPacketPaymentRequiredError','ConsumerPacketSponsorshipAuthorityUnavailableError'])generation[name]=class extends Error{};
 const route=loadTsWithMocks('src/app/api/expungement-ai/packet/generate/route.ts',{'@/lib/rcap/render/commercial-admission':gate,'@/lib/expungement-ai/rcap-slot-lifecycle':{...lifecycle,finalizeSponsoredPacketGeneration:()=>{finalizations++;}},'@/lib/expungement-ai/packet-generation':generation,'@/lib/expungement-ai/auth':{requireConsumerBriefcaseSession:async()=>({userId:'owner'})},'@/lib/expungement-ai/briefcase':{getBriefcaseItem:async()=>({id:'item'})},'@/lib/expungement-ai/packet-information':{requireCurrentPacketVerification:async()=>verification,CurrentPacketVerificationRequiredError:class extends Error{}},'@/lib/expungement-ai/consumer-identity':{consumerMatterIdForItem:()=> 'matter'}},before?source('src/app/api/expungement-ai/packet/generate/route.ts'):undefined);
 const r=await route.POST(new NextRequest('http://localhost/api/expungement-ai/packet/generate',{method:'POST',body:JSON.stringify({briefcaseItemId:'item'})}));const body=await r.json();
 console.log({before,body});assert.equal(r.status,before||code==='fulfillment_stale'?409:403);
 if(before){assert.equal(body.sponsoredPaused,true);assert.match(body.error,/Sponsor capacity is exhausted/);}else{assert.equal(body.resultCode,code);assert.equal(body.outcome,undefined);assert.equal(body.checkoutRequired,undefined);assert.doesNotMatch(JSON.stringify(body),/sponsor|coverage|payment/i);}
 assert.equal(reads,0);assert.equal(finalizations,0);denial='fulfillment_stale';
});
for(const failAt of ['sponsored_entitlement','packet_credit_admission','provider_dispatch'])test(`new funding: ${failAt} refusal precedes reservation and render`,async()=>{
 let reserved=0,jobs=0;
 const item=eligibleItem({id:'item',packetStatus:'not_started',artifactRefs:{}});
 const unused=Object.fromEntries([...fs.readFileSync('src/lib/expungement-ai/packet-generation.ts','utf8').matchAll(/from "(@\/[^"]+)"/g)].map(m=>[m[1],{}]));
 const generation=loadTsWithMocks('src/lib/expungement-ai/packet-generation.ts',{...unused,
  '@/lib/rcap/render/commercial-admission':admission(failAt),
  '@/lib/expungement-ai/briefcase':{getBriefcaseItem:async()=>item},
  '@/lib/expungement-ai/verification-cas':{readProtectedPacketArtifact:async()=>({ok:true,value:null})},
  '@/lib/expungement-ai/packet-information':{requireCurrentPacketVerification:async()=>verification},
  '@/lib/expungement-ai/briefcase-presentation-authority':{readTrustedBriefcasePresentationSource:async()=>({ok:true,value:{product:'rcap_partner',partnerBenefitActive:true,partnerSlug:'sponsor',sourceSessionId:'session',matterId:'matter'}})},
  '@/lib/expungement-ai/consumer-identity':{consumerMatterIdForItem:()=> 'matter'},
  '@/lib/expungement-ai/clinic-packet-funding':{clinicPacketDtcAuthorized:async()=>false,reserveClinicPacketFunding:async()=>{reserved++;}},
  '@/lib/expungement-ai/packet-fulfillment-authority':{assertPacketFulfillmentProven:()=>{}},
  '@/lib/rcap/render/personalized-packet':{isPersonalizedDeliveryRoute:()=>true},
  '@/lib/rcap/render/job-queue':{hasFinalizedPersonalizedRender:async()=>false,enqueueVerifiedSponsoredRender:async()=>{jobs++;}}
 });
 await assert.rejects(generation.generatePaidConsumerPacket({userId:'owner',briefcaseItemId:'item'}),e=>e.denialCode==='fulfillment_stale'&&e.admissionPoint===failAt);
 assert.equal(reserved,0);assert.equal(jobs,0);
});
test('later packet-credit admission refusal propagates actual typed reason before finalization writes',async()=>{
 let writes=0;const lifecycle=loadTsWithMocks('src/lib/expungement-ai/rcap-slot-lifecycle.ts',{'@/lib/rcap/render/commercial-admission':admission('packet_credit_admission'),'@/lib/supabase/server':{getSupabaseAdminClient:()=>{writes++;}}});
 await assert.rejects(lifecycle.finalizeSponsoredPacketGeneration({admission:{identity,context:{}},sessionId:'s',briefcaseItemId:'i'}),e=>e.denialCode==='fulfillment_stale');assert.equal(writes,0);
});
