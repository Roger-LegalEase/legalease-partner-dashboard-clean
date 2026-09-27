// B's SQL adapters against A's disposable Postgres fixture. No hosted requests.
// This exercises the adapter and simultaneous authority calls, not a replacement
// for A's retained COM-A/B/C source-specific product proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createFundingFixture} from './legal-aid/sponsor-funding-fixture.mjs';
import {snapshotQuery,capacityQuery} from './rcap-hosted-sponsor-cap.mjs';
import {assertOneRemainingSlot,assertContinuity,fundingOutcome,assertAccounting,assertSponsoredGenerated} from './rcap-sponsored-funding-contract.mjs';
test('read-only sponsor snapshot and one-slot readiness use real protected tables',async()=>{
 const f=createFundingFixture();try{
 const participants=[f.seedParticipant(),f.seedParticipant()];
 const q=v=>"'"+v+"'";
 const read=query=>{const rows=f.db.sql(query).split("\n").filter(l=>l.startsWith("{"));assert.equal(rows.length,1);return JSON.parse(rows[0]);};
 console.log(`disposable PostgreSQL: ${f.db.root}; port=${f.db.port}`);
 const before=participants.map(p=>read(snapshotQuery(p.itemId)));
 const capacity=participants.map(p=>read(capacityQuery(p.itemId)));
 assertOneRemainingSlot(capacity);assert.equal(f.db.scalar('select count(*) from clinic_packet_funding'),'0');
 const results=await Promise.all(participants.map(p=>f.db.sqlAsync(`select row_to_json(f) from allocate_clinic_packet_funding(${q(p.itemId)},${q(p.userId)},${q(p.verificationHash)}) f`)));
 assert(results.every(r=>r.ok),JSON.stringify(results));assert.deepEqual(results.map(r=>JSON.parse(r.out).funding_mode).sort(),['dtc','sponsored']);
 const after=participants.map(p=>read(snapshotQuery(p.itemId)));after.forEach((s,i)=>assertContinuity(before[i],s));
 after.forEach((state,i)=>{const choice=state.funding[0];const response=choice.funding_mode==='sponsored'?{status:200,json:{packetStatus:'generating'}}:{status:409,json:{outcome:'sponsor_capacity_exhausted',checkoutRequired:true}};assert.equal(fundingOutcome(response,before[i],state),choice.reason);});
 assert.equal(after.reduce((n,s)=>n+s.sponsoredEntitlements,0),1);assert.equal(after.reduce((n,s)=>n+s.sponsoredConsumed,0),0,'reservation is not generated/consumed');
 assert(after.every(s=>s.dtcEntitlements===0 && s.orphanJobs===0 && s.checkoutSessions===0));
 const winner=after.find(s=>s.funding[0].funding_mode==='sponsored');
 assertAccounting('slot_reserved',winner);assert.throws(()=>assertSponsoredGenerated(winner));
 const loser=after.find(s=>s.funding[0].funding_mode==='dtc');assert.equal(loser.sponsoredEntitlements,0);assert.equal(loser.sponsoredConsumed,0);
 }finally{f.db.stop();}
});
