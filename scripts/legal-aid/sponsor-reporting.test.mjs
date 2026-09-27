import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTsWithMocks} from '../test-expungement-checkout-guards.mjs';
function fixture({denied=false,failed=false,many=false}={}){
 const reads=[];
 const rows={clinic_packet_funding:[{briefcase_item_id:'reserved',funding_mode:'sponsored'},{briefcase_item_id:'generated',funding_mode:'sponsored'},{briefcase_item_id:'paid',funding_mode:'dtc'}],clinic_cases:[{id:'c1',matter_id:'generated'},{id:'c2',matter_id:'legacy'}],clinic_packet_reservations:[{clinic_case_id:'c1',status:'consumed'},{clinic_case_id:'c2',status:'consumed'}],consumer_packet_artifact_provenance:[{briefcase_item_id:'generated'}]};
 if(many){rows.clinic_packet_funding=Array.from({length:501},(_,i)=>({briefcase_item_id:`reserved-${String(i).padStart(4,'0')}`,funding_mode:'sponsored'}));rows.clinic_cases=[];rows.clinic_packet_reservations=[];rows.consumer_packet_artifact_provenance=[];}
 const db={rpc:async()=>denied?{error:{message:'forbidden'}}:{data:{eventId:'event',sponsorship:{allocation:5,reserved:0,consumed:2,released:0}}},from:table=>{reads.push(table);let start=0,end=499;const q={select:()=>q,order:()=>q,range:(a,b)=>{start=a;end=b;return q;},eq:(key,value)=>{if(key==='event_id')assert.equal(value,'event');else{assert.equal(key,'entitlement_source');assert.equal(value,'partner_sponsorship');}return q;},in:()=>q,then:resolve=>resolve(failed?{error:{message:'unavailable'}}:{data:rows[table].slice(start,end+1)})};return q;}};
 const mod=loadTsWithMocks('src/lib/clinic-mode/reporting-service.ts',{'@/lib/supabase/auth-server':{getServerAuthState:async()=>({isAuthenticated:true,userId:'staff'})},'@/lib/supabase/server':{getSupabaseAdminClient:()=>db},'next/headers':{cookies:async()=>({})}});
 return {mod,reads};
}
test('event-authorized report distinguishes committed slots, generated packets, legacy deduplication and DTC exclusion',async()=>{const f=fixture();const r=await f.mod.getClinicEventReport('event');assert.deepEqual(r.sponsorship,{allocation:5,reserved:1,consumed:2,released:0});assert.equal(JSON.stringify(r).includes('briefcase_item_id'),false);});
test('wrong event/staff cannot read service-role funding or participant provenance',async()=>{const f=fixture({denied:true});await assert.rejects(f.mod.getClinicEventReport('event'),/Event-scoped/);assert.deepEqual(f.reads,[]);});
test('unavailable funding data is not reported as zero use',async()=>{const f=fixture({failed:true});await assert.rejects(f.mod.getClinicEventReport('event'),/reporting is unavailable/);});
test('stable sponsored choice survives a legacy release, DTC never counts as sponsored',()=>{const {mod}=fixture();assert.deepEqual(mod.sponsoredReportCounts([{briefcase_item_id:'s',funding_mode:'sponsored'},{briefcase_item_id:'d',funding_mode:'dtc'}],[{id:'c',matter_id:'s'}],[{clinic_case_id:'c',status:'released'}],[{briefcase_item_id:'d'}]),{reserved:1,consumed:0,released:0});});

test('aggregation includes every reserved slot across response pages',async()=>{const f=fixture({many:true});assert.deepEqual((await f.mod.getClinicEventReport('event')).sponsorship,{allocation:5,reserved:501,consumed:0,released:0});});
