import test from 'node:test';
import assert from 'node:assert/strict';
import {readNormalClinicSurfaces,assertNormalClinicSurfaces} from './rcap-clinic-normal-readiness.mjs';
import {CLINIC_SETUP} from './rcap-clinic-setup-only-boundary.mjs';
test('actual readonly surface probe aggregates index, queue, follow-up and reporting without serializing private payloads',async()=>{
 const priorFetch=globalThis.fetch,priorParser=globalThis.DOMParser;const calls=[];
 try {
  globalThis.DOMParser=class{parseFromString(){return {querySelectorAll:tag=>[{textContent:tag==='h2'?'Follow-up queue':'Clinic Mode administration'}]};}};
  globalThis.fetch=async pathname=>{calls.push(pathname);return new Response(JSON.stringify(pathname.endsWith('/queue')?{success:true,cases:[{private:'not-recorded'}]}
   :pathname.endsWith('/follow-ups')?{success:true,followUps:[]}:pathname.endsWith('/reporting')?{success:true,report:{eventId:CLINIC_SETUP.event,private:'not-recorded'}}:{}),{status:pathname.endsWith('/follow-ups')?403:200});};
  const rows=await readNormalClinicSurfaces({evaluate:(fn,arg)=>fn(arg)});
  assert.equal(calls.length,5);assert.equal(rows.length,5);assert.equal(rows.find(r=>r.id==='clinic_follow_up').reason,'current_actor_access_denied');
  assert.throws(()=>assertNormalClinicSurfaces(rows));assert.ok(!JSON.stringify(rows).includes('not-recorded'));
 } finally {globalThis.fetch=priorFetch;globalThis.DOMParser=priorParser;}
});
