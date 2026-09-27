import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {fixture} from './clinic-reset-route-fixture.mjs';
function expire(f, {closed=false, unusable=false}={}) {
 const [p]=f.jar.get('clinic_reset_recovery').split('.'); const proof=JSON.parse(Buffer.from(p,'base64url'));
 proof.expires=Date.now()-1;
 const payload=Buffer.from(JSON.stringify(proof)).toString('base64url');
 f.jar.set('clinic_reset_recovery',payload+'.'+createHmac('sha256','disposable-reset-signing-key').update('clinic-reset-v1:'+payload).digest('base64url'));
 if(unusable)f.state.signingKey='replacement-test-key';
 if(closed){f.state.session.status='reset';f.state.audits=1;}
 for(const key of ['sb-test','clinic_session','clinic_device'])f.jar.delete(key);
}
for(const fault of ['authError','lookupError','signingKey'])test('prepare failure preserves auth and exact handoff, then completes: '+fault,async()=>{
 const f=fixture(),original=f.state[fault];f.state[fault]=fault==='signingKey'?'':true;
 assert.equal((await f.call('prepare')).prepared,false);assert.equal(f.jar.get('sb-test'),'auth-a');assert.equal(f.jar.get('clinic_session'),'handoff-a');assert.equal(f.state.signouts,0);assert.equal(f.state.audits,0);
 f.state[fault]=original;assert.equal((await f.call('prepare')).prepared,true);assert.equal((await f.call('close')).success,true);assert.equal((await f.call('complete')).success,true);assert.equal(f.state.audits,1);
});
test('lost preparation response preserves browser auth for an authorized retry',async()=>{
 const f=fixture();await f.call('prepare',{deliver:false});assert.equal(f.jar.has('clinic_reset_recovery'),false);assert.equal(f.state.signouts,0);
 assert.equal((await f.call('prepare')).prepared,true);assert.equal((await f.call('close')).success,true);assert.equal(f.state.audits,1);
});
test('expired Clinic cookies with participant auth use exact durable handoff, never a user-wide search',async()=>{
 const f=fixture();await f.call('prepare');f.jar.delete('clinic_session');f.jar.delete('clinic_device');
 assert.equal((await f.call('prepare')).prepared,true);assert.equal((await f.call('close')).success,true);assert.equal(f.state.audits,1);
});
test('expired close authority has bounded terminal-only reconciliation, no new close or renewed proof',async()=>{
 const f=fixture();await f.call('prepare');expire(f,{closed:true});const receipt=f.jar.get('clinic_reset_recovery');
 assert.equal((await f.call('prepare')).prepared,true);assert.equal((await f.call('close')).success,true);assert.equal((await f.call('complete')).success,true);assert.equal(f.state.calls,0);assert.equal(f.state.audits,1);assert.equal(f.jar.has('clinic_reset_recovery'),false);assert.ok(f.jar.has('clinic_reset_completed'));
});
for(const unusable of [false,true])test('expired/unusable proof needs fresh exact-owner auth to complete: '+unusable,async()=>{
 const f=fixture();await f.call('prepare');expire(f,{unusable});const receipt=f.jar.get('clinic_reset_recovery');
 for(let i=0;i<3;i++){const r=await f.call('prepare');assert.equal(r.prepared,false);assert.equal(r.state,'authentication_required');assert.equal(f.jar.get('clinic_reset_recovery'),receipt);}
 assert.equal(f.state.audits,0);f.jar.set('sb-test','fresh-owner-auth');assert.equal((await f.call('prepare')).prepared,true);assert.equal((await f.call('close')).success,true);assert.equal((await f.call('complete')).success,true);assert.equal(f.state.audits,1);
});
test('fresh wrong participant cannot use expired or key-invalid locator',async()=>{
 const f=fixture();await f.call('prepare');expire(f,{unusable:true});f.state.owner='participant-b';f.jar.set('sb-test','auth-b');
 assert.equal((await f.call('prepare')).prepared,false);assert.equal(f.jar.get('sb-test'),'auth-b');assert.equal(f.state.signouts,0);assert.equal(f.state.audits,0);
});
test('genuinely clean device obtains explicit no-session receipt; unknown pending reset never does',async()=>{
 const f=fixture();f.jar.clear();f.state.session=null;
 const r=await f.call('prepare');assert.equal(r.state,'no_session');assert.equal(r.prepared,true);assert.equal((await f.call('close')).success,true);assert.equal((await f.call('complete')).success,true);
 const unknown=fixture();unknown.jar.clear();unknown.jar.set('clinic_reset_pending','1');assert.equal((await unknown.call('prepare')).prepared,false);assert.equal((await unknown.call('close')).success,false);assert.equal(unknown.state.audits,0);
 const auth=fixture();auth.jar.delete('clinic_session');auth.jar.delete('clinic_device');assert.equal((await auth.call('prepare')).state,'handoff_identity_required');assert.equal(auth.jar.has('sb-test'),true);
});
test('completion keeps original canonical event association and refuses client redirects',async()=>{
 const f=fixture();await f.call('prepare');await f.call('close');assert.equal(f.jar.has('clinic_event'),false);
 const r=await f.call('complete',{extra:{next:'https://evil.invalid',eventSlug:'other-event'}});assert.equal(r.success,true);assert.equal(r.cleanEntryPath,'/clinic/test-clinic');
});
for(const event of [null,{public_slug:'//evil.invalid',status:'published'},{public_slug:'closed-event',status:'closed'}])test('missing/invalid/closed event leads only to genuine safe Clinic index: '+JSON.stringify(event),async()=>{
 const f=fixture();await f.call('prepare');await f.call('close');f.state.event=event;const r=await f.call('complete');assert.equal(r.success,true);assert.equal(r.cleanEntryPath,'/clinic');
});
test('event lookup outage retains lock and completes at original event once the fault clears',async()=>{
 const f=fixture();await f.call('prepare');await f.call('close');f.state.eventError=true;assert.equal((await f.call('complete')).success,false);assert.equal(f.jar.get('clinic_reset_pending'),'1');f.state.eventError=false;assert.equal((await f.call('complete')).cleanEntryPath,'/clinic/test-clinic');assert.equal(f.state.audits,1);
});
