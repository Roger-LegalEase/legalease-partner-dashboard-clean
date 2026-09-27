import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTsWithMocks} from '../test-expungement-checkout-guards.mjs';
const adapter=loadTsWithMocks('src/lib/expungement-ai/briefcase-presentation-authority.ts',{
 '@/lib/expungement-ai/packet-information':{
  protectedPacketDraftSeedFromAuthoritative:()=>({hash:'a'.repeat(64),snapshot:{}}),
  protectedPacketInformationModelFor:()=>null
 }
});
const source={jurisdiction:'IL',profileVersion:'1',matterId:'same-matter',answers:{known:'preserved'},product:'rcap_partner',sourceSessionId:'same-session',claimedAt:'2026-09-27T00:00:00Z',partnerBenefitActive:true,partnerSlug:'same-sponsor'};
const evaluation={pathwayLabel:'Same verified route',packetType:'custom_pleading',selectedTrackId:'il-prostitution-j-vacate',evaluation:{jurisdiction:'IL',resultCode:'packet_ready',pathwayId:'felony-prostitution-relief',nextSteps:[],userLabel:'Saved result'}};
for(const mode of ['sponsored','dtc_unpaid','dtc_paid','outage'])test(`protected financial presentation: ${mode}`,async()=>{
 let paymentReads=0;
 const item=await adapter.decorateBriefcaseItemForPresentationWithDependencies({consumerAuthUserId:'owner',item:{id:'same-matter',createdAt:'2026-09-27'}},{
  readProtectedArtifact:async()=>({ok:true,value:null}),
  readProtectedVerification:async()=>({ok:false,reason:'protected_verification_authority_missing'}),
  readTrustedPendingSource:async()=>({ok:true,value:source}),
  evaluateAuthoritative:()=>evaluation,
  readClinicDtcAuthorization:async()=>{if(mode==='outage')throw Error('read failed');return mode.startsWith('dtc');},
  readPaymentAuthority:async()=>{paymentReads++;return mode==='dtc_paid'?{valid:true,reason:'paid'}:{valid:false,reason:'unpaid'};}
 });
 assert.equal(item.id,'same-matter');assert.equal(item.pathwayId,'felony-prostitution-relief');
 assert.equal(item.paymentState,{sponsored:'sponsored',dtc_unpaid:'unpaid',dtc_paid:'paid',outage:'unavailable'}[mode]);
 assert.equal(item.sponsorCapacityExhausted,mode.startsWith('dtc'));
 assert.equal(paymentReads,mode.startsWith('dtc')?1:0,'sponsored and unreadable funding never probe payment state');
});
