import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTsWithMocks} from '../test-expungement-checkout-guards.mjs';
process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-local-acquisition-key';
const acquisition=loadTsWithMocks('src/lib/expungement-ai/claim/clinic-acquisition.ts',{});
const token=loadTsWithMocks('src/lib/expungement-ai/claim/claim-token.ts',{});
const empty={isPartnerSession:false,partnerSlug:null,programId:null,eventId:null,campaignName:null,accessCodeId:null,consentGrantId:null};
const authoritative={evaluation:{jurisdiction:'MS',profileVersion:'test',matterId:'correlation',resultCode:'packet_ready',paymentAllowed:true,userLabel:'Ready',nextSteps:[],pathwayId:'route'},pathwayLabel:'Route',packetType:'packet',selectedTrackId:'track'};
const receiptFor=source=>new URL(acquisition.clinicConsumerContinuation('owner','MS',source),'http://localhost').searchParams.get('acquisition');
for(const origin of ['clinic:mvlp-event','partner:mvlp'])test(`${origin}: exhausted entry receipt follows actual pending/claim service into DTC matter without financial authority`,async()=>{
 let pending,matter;
 const db={from:()=>({insert:async row=>{pending={...row,pending_id:'pending'};return {};},select:()=>({eq:()=>({maybeSingle:async()=>({data:pending})})})}),rpc:async(name,args)=>{assert.equal(name,'claim_pending_screening_result');assert.equal(args.p_user_id,'owner');matter=args.p_matter;return {data:{outcome:'claimed',matter_id:'matter'}};}};
 const deps={'@/lib/expungement-ai/claim/clinic-acquisition':acquisition,'@/lib/expungement-ai/claim/claim-token':token,'@/lib/supabase/auth-server':{getServerAuthState:async()=>({isAuthenticated:true,userId:'owner'})},'@/lib/supabase/server':{getSupabaseAdminClient:()=>db},'@/lib/expungement-ai/authoritative-screening-result':{evaluateAuthoritativeScreeningResult:()=>authoritative},'@/lib/expungement-ai/claim/screening-attribution':{resolveScreeningAttribution:async()=>empty}};
 const route=loadTsWithMocks('src/app/api/expungement-ai/screening/pending/route.ts',deps);
 const response=await route.POST(new Request('http://localhost/api/expungement-ai/screening/pending',{method:'POST',body:JSON.stringify({jurisdiction:'MS',profileVersion:'test',screeningCorrelationId:'correlation',answers:{known:'answer'},acquisitionReceipt:receiptFor(origin),partnerSlug:'forged',eventId:'forged',verified:true,funding_mode:'sponsored'})}));
 assert.equal(response.status,200);const body=await response.json();
 assert.equal(pending.campaign_name,origin);assert.equal(pending.product,'expungement_ai_dtc');
 for(const key of ['partner_slug','event_id','program_id','consent_grant_id','access_code_id'])assert.equal(pending[key],null);
 assert.equal(pending.verified,undefined);assert.equal(pending.funding_mode,undefined);
 const claim=loadTsWithMocks('src/lib/expungement-ai/claim/claim-service.ts',{...deps,'@/lib/expungement-ai/briefcase':{clampAuthoritativeMatterInput:x=>x}});
 const result=await claim.claimPendingScreeningResult({claimToken:body.claimToken,authenticatedUserId:'owner',accountVerified:true});assert.equal(result.ok,true);
 assert.equal(matter.artifact_refs_json.attribution.campaignName,origin);
 assert.equal(matter.product,'expungement_ai_dtc');assert.equal(matter.payment_status,'unpaid');assert.equal(matter.amount_cents,5000);assert.equal(matter.packet_status,'not_started');
 assert.equal(matter.artifact_refs_json.attribution.partnerSlug,null);assert.equal(matter.artifact_refs_json.attribution.eventId,null);
});
test('receipt refuses forged source, different participant, expired or unsigned origin',()=>{
 const r=receiptFor('clinic:mvlp-event');assert.equal(acquisition.readClinicAcquisition(r,'other'),null);assert.equal(acquisition.readClinicAcquisition('clinic:mvlp-event','owner'),null);
 const [payload,sig]=r.split('.'),value=JSON.parse(Buffer.from(payload,'base64url').toString());value.source='clinic:other';assert.equal(acquisition.readClinicAcquisition(Buffer.from(JSON.stringify(value)).toString('base64url')+'.'+sig,'owner'),null);
 const now=Date.now;try{Date.now=()=>now()+9*60*60*1000;assert.equal(acquisition.readClinicAcquisition(r,'owner'),null);}finally{Date.now=now;}
});
