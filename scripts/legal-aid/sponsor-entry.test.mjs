import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {NextRequest} from 'next/server.js';
import {loadTsWithMocks} from '../test-expungement-checkout-guards.mjs';
process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-acquisition-test-key';
const acquisition=loadTsWithMocks('src/lib/expungement-ai/claim/clinic-acquisition.ts',{});
const STAFF='10000000-0000-4000-8000-000000000001';
function fixture({before=false,capacity=false,claimFull=false,wrongStaff=false,wrongEvent=false,pending=false}={}) {
 const calls=[];
 const route=loadTsWithMocks('src/app/api/clinic/assistance/start/route.ts',{
  '@/lib/clinic-mode/participant-service':{getClinicEntryContext:async()=>{if(wrongEvent)throw Error('wrong event');return {eventId:'event-a',partnerSlug:'partner-a',eventSlug:'mvlp-event',jurisdiction:'MS'};},listApprovedClinicStaff:async()=>wrongStaff?[]:[{id:STAFF}]},
  '@/lib/expungement-ai/rcap-partner-intake':{claimRcapPartnerScreeningSession:async()=>{calls.push('claim');return before||claimFull?{ok:false,reason:'capacity_full'}:{ok:true,sessionId:'screening-a'};}},
  '@/lib/supabase/auth-server':{getServerAuthState:async()=>({isAuthenticated:true,userId:'participant-a'})},
  '@/lib/supabase/server':{getSupabaseAdminClient:()=>({rpc:async(name,args)=>{calls.push({name,args});return name==='clinic_entry_sponsor_capacity'?{data:capacity}:name==='clinic_start_assisted_session'?{data:'session-a'}:{data:null};}})},
  '@/lib/clinic-mode/reset-recovery':{RECOVERY_COOKIE:'clinic_reset_recovery',COMPLETED_COOKIE:'clinic_reset_completed',hash:x=>x,mintRecovery:()=>({}),encodeRecovery:()=> 'synthetic',recoveryOptions:()=>({httpOnly:true,path:'/'})}
 },before?execFileSync('git',['show','8213e41149:src/app/api/clinic/assistance/start/route.ts'],{encoding:'utf8'}):undefined);
 return {calls,call:()=>route.POST(new NextRequest('http://localhost/api/clinic/assistance/start',{method:'POST',headers:{'content-type':'application/json',...(pending?{cookie:'clinic_reset_pending=1'}:{})},body:JSON.stringify({eventSlug:'mvlp-event',eventStaffId:STAFF,jurisdiction:'MS',consent:true})}))};
}
test('COM-01 before: reviewed source returns 409 capacity-full with no consumer continuation',async()=>{const f=fixture({before:true}),r=await f.call(),b=await r.json();assert.equal(r.status,409);assert.match(b.error,/capacity is full/);assert.equal(b.consumerUrl,undefined);});
test('COM-01 after: exhausted before matter offers same-state DTC, no screening/session/matter allocation or Stripe',async()=>{const f=fixture(),r=await f.call(),b=await r.json();assert.equal(r.status,200);assert.equal(b.outcome,'sponsor_capacity_exhausted');assert.equal(new URL(b.consumerUrl,'http://localhost').pathname,'/expungement-ai/screening/ms');assert.equal(acquisition.readClinicAcquisition(new URL(b.consumerUrl,'http://localhost').searchParams.get('acquisition'),'participant-a'),'clinic:mvlp-event');assert.equal(r.cookies.getAll().length,0);assert.deepEqual(f.calls,[{name:'clinic_entry_sponsor_capacity',args:{p_event:'event-a',p_partner:'partner-a'}}]);});
test('available entry still creates canonical assistance and recovery, no checkout',async()=>{const f=fixture({capacity:true}),r=await f.call(),b=await r.json();assert.equal(b.screeningUrl,'/clinic/mvlp-event/screening/ms');assert.ok(r.cookies.get('clinic_reset_recovery'));assert.ok(f.calls.some(c=>c.name==='clinic_start_assisted_session'));assert.equal(b.consumerUrl,undefined);});
test('claim losing capacity race returns DTC without starting assistance',async()=>{const f=fixture({capacity:true,claimFull:true}),b=await(await f.call()).json();assert.equal(b.outcome,'sponsor_capacity_exhausted');assert.equal(f.calls.some(c=>c.name==='clinic_start_assisted_session'),false);});
for(const option of ['wrongStaff','wrongEvent','pending'])test(`${option} cannot manipulate fallback or bypass reset`,async()=>{const f=fixture({[option]:true}),r=await f.call();assert.ok(r.status>=400);assert.deepEqual(f.calls,[]);});
