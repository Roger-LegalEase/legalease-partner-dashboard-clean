// Local route/transport fixture: real deployed handlers, explicit Auth/storage/evaluator doubles, no provider calls.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {NextRequest,NextResponse} from 'next/server.js';
import {CLINIC_SETUP} from './rcap-clinic-setup-only-boundary.mjs';
const require=createRequire(import.meta.url);
const id='11111111-1111-4111-8111-111111111111';
const hash=value=>createHash('sha256').update(value).digest('hex');
export const routeFixtureId=id;
export function clinicJourneyFixture() {
 const state={signedIn:true,verified:true,entry:0,screenings:0,assistance:0,cases:0,pending:[],claims:0,owner:null,entryHash:null,request:null,denyStaff:false,denyStorage:false,followUpFailed:false};
 const pinned={"src/app/api/clinic/entry/route.ts": "ce9d00f328770b96e68bb9386b69de3da52f918b30dfa65b15bdd11ca7f97090", "src/app/api/clinic/assistance/start/route.ts": "3d8eb50b630498e3d9e1b7cef43e9113ff0f97a69f9272f3455cdcac2cfd1f57", "src/app/api/expungement-ai/screening/pending/route.ts": "faaf21bca55a2c42f6bc5b33cd5cab6ec33e09f2948dd6eadbffbb476cf91d70", "src/app/api/expungement-ai/screening/pending/claim/route.ts": "875974b3a25e1aaef30a65faf0bcd3a4da15f88b8efc2a5bd30a6e5687ec11f3", "src/lib/partners/onboarding/request-security.ts": "31f29f5a8d0c732e054a8ae49d081d94a47428c90639d75b3f2458b4f60b8d20", "src/lib/clinic-mode/reset-recovery.ts": "c88aa10cd65a073029070f6c8355a7c822c803b0fd98fb9f0b6076c9382b71a6", "src/lib/expungement-ai/claim/claim-token.ts": "4a02ab57f66163683cc7b67662c2c28de0c1681e57e1f3da99fc3d021ca3f4a0"};
 const processFixture={env:{NODE_ENV:'test',SUPABASE_SERVICE_ROLE_KEY:'local-fixture-signing-key'}};
 const common={};
 const load=filename=>{
  const module={exports:{}};
  const source=fs.readFileSync(filename,'utf8');
  assert.equal(hash(source),pinned[filename],'Fixture must execute the accepted deployed handler bytes');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','module','exports','process',compiled)(name=>{
   if(name==='next/server')return {NextRequest,NextResponse};
   if(name in common)return common[name];
   assert.ok(name.startsWith('node:'),'Unspecified fixture dependency: '+name);return require(name);
  },module,module.exports,processFixture);
  return module.exports;
 };
 const evaluation={jurisdiction:'MS',profileVersion:'fixture',matterId:id,resultCode:'packet_ready',paymentAllowed:false,userLabel:'Fixture result',nextSteps:[],missingQuestionIds:[],consumerPacketAvailable:false,sponsoredPacketAvailable:true};
 const auth=()=>({isAuthenticated:state.signedIn,userId:CLINIC_SETUP.owner,isVerified:state.verified});
 const db={
  async rpc(name,args){
   if(name==='clinic_redeem_event_code_with_reset') {if(state.entry)return {data:{outcome:'code_exhausted'},error:null};state.entry++;state.entryHash=args.p_redemption_nonce_hash;return {data:{outcome:'redeemed',event_id:CLINIC_SETUP.event},error:null};}
   if(name==='clinic_entry_sponsor_capacity')return {data:true,error:null};
   if(name==='clinic_start_assisted_session_for_entry'){assert.equal(args.p_participant_user_id,CLINIC_SETUP.owner);assert.equal(args.p_entry_hash,state.entryHash);assert.equal(args.p_consent_version,'clinic-assistance-v1');state.assistance++;return {data:id,error:null};}
   if(name==='clinic_upsert_case'){state.cases++;return {error:null};}
   throw Error('Unspecified fixture RPC');
  },
  from(table){
   if(table==='clinic_event_access_redemptions'){const query={select:()=>query,eq:(key,value)=>{assert.equal(key,'redemption_nonce_hash');assert.equal(value,state.entryHash);return query;},maybeSingle:async()=>({data:{closed_at:null},error:null})};return query;}
   if(table==='clinic_cases'){const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:state.cases?{id}:null,error:null})};return query;}
   assert.equal(table,'consumer_pending_screening_results');return {insert:async row=>{state.pending.push(row);return {error:null};}};
  }
 };
 common['@/lib/partners/onboarding/request-security']=load('src/lib/partners/onboarding/request-security.ts');
 common['@/app/api/clinic/error-response']={clinicErrorResponse:error=>NextResponse.json({success:false},{status:error.status??403})};
 common['@/lib/supabase/server']={getSupabaseAdminClient:()=>state.denyStorage?null:db};
 common['@/lib/supabase/auth-server']={getServerAuthState:async()=>auth()};
 common['@/lib/rcap/briefcase/auth']={getRcapBriefcaseAuthState:async()=>auth()};
 common['@/lib/clinic-mode/participant-service']={getClinicEntryContext:async slug=>{
  assert.equal(slug,CLINIC_SETUP.slug);assert.equal(hash(state.request.cookies.get('clinic_entry')?.value??''),state.entryHash);
  return {eventId:CLINIC_SETUP.event,eventSlug:slug,partnerSlug:'mvl-demo',jurisdiction:'MS',entryRedemptionHash:state.entryHash};
 },listApprovedClinicStaff:async()=>state.denyStaff?[]:[{id:CLINIC_SETUP.staff}]};
 common['@/lib/partners/onboarding/program-packet-funding']={getProgramPacketFunding:async()=> 'sponsored'};
 common['@/lib/partners/onboarding/practice-receipt']={canUseClinicPractice:async()=>false};
 common['@/lib/expungement-ai/screening-session-persistence']={saveScreeningSession:()=>{throw Error('Practice forbidden');}};
 common['@/lib/expungement-ai/screening-resume-service']={SupabaseScreeningResumeStorage:class{}};
 common['@/lib/expungement-ai/rcap-partner-intake']={claimRcapPartnerScreeningSession:async args=>{assert.equal(args.participantUserId,CLINIC_SETUP.owner);assert.equal(args.clinicRedemptionHash,state.entryHash);state.screenings++;return {ok:true,sessionId:id};}};
 common['@/lib/expungement-ai/claim/clinic-acquisition']={clinicConsumerContinuation:()=>{throw Error('Consumer fallback forbidden');},readClinicAcquisition:()=>null};
 common['@/lib/clinic-mode/reset-recovery']=load('src/lib/clinic-mode/reset-recovery.ts');
 common['@/lib/expungement-ai/authoritative-screening-result']={evaluateAuthoritativeScreeningResult:()=>({evaluation,pathwayLabel:'Fixture',packetType:null})};
 common['@/lib/expungement-ai/claim/claim-token']=load('src/lib/expungement-ai/claim/claim-token.ts');
 common['@/lib/expungement-ai/claim/screening-attribution']={resolveScreeningAttribution:async session=>{assert.equal(session,id);assert.equal(state.assistance,1);return {isPartnerSession:true,partnerSlug:'mvl-demo',eventId:CLINIC_SETUP.event};}};
 common['@/lib/rcap-engine/evaluator']={InvalidAnswerError:class extends Error{},ProfileVersionMismatchError:class extends Error{},UnsupportedJurisdictionError:class extends Error{}};
 common['@/lib/expungement-ai/claim/claim-service']={claimPendingScreeningResult:async args=>{
  if(!args.accountVerified)return {ok:false,reason:'unverified_account'};
  const pending=state.pending.find(row=>row.claim_token_hash===hash(args.claimToken));if(!pending||state.owner&&state.owner!==args.authenticatedUserId)return {ok:false,reason:'rejected'};
  const replay=Boolean(state.owner);if(!replay){state.claims++;state.owner=args.authenticatedUserId;pending.status='CLAIMED';}
  return {ok:true,outcome:replay?'idempotent_replay':'claimed',matterId:id,redirectTo:'/briefcase/matters/'+id,pending:{...pending,pending_id:id},evaluation};
 }};
 common['@/lib/expungement-ai/rcap-screening-analytics']={recordScreeningEligibilityResult:async()=>({ok:true})};
 common['@/lib/clinic-mode/result-follow-up']={createClinicReviewFollowUpForSavedMatter:async()=>{if(state.followUpFailed)throw Error('fixture follow-up unavailable');}};
 common['@/lib/observability/logger']={getSafeRequestId:()=>id,logSecurityError:()=>{}};
 common['@/lib/expungement-ai/claim/claim-obligations']={recordOutstandingClinicFollowUp:async()=>{}};
 const routes={
  entry:load('src/app/api/clinic/entry/route.ts'),assistance:load('src/app/api/clinic/assistance/start/route.ts'),
  pending:load('src/app/api/expungement-ai/screening/pending/route.ts'),claim:load('src/app/api/expungement-ai/screening/pending/claim/route.ts')
 };
 return {state,evaluation,async handle(operation,url,body,cookie=''){
  const request=new NextRequest(url,{method:'POST',headers:{origin:new URL(url).origin,host:new URL(url).host,'content-type':'application/json',cookie},body:JSON.stringify(body)});
  state.request=request;return routes[operation].POST(request);
 }};
}
