import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './clinic-reset-route-fixture.mjs';
function entryFixture(){const f=fixture();f.jar.delete('clinic_session');f.jar.delete('clinic_device');f.jar.set('clinic_entry','entry-a');f.jar.set('clinic_reset_pending','1');return f;}
test('declined assistance exits authenticated entry without manufacturing or closing an assisted session',async()=>{
 const f=entryFixture();assert.equal((await f.call('prepare')).prepared,true);assert.equal(f.state.entryClosures,1);assert.equal(f.state.calls,0);assert.equal(f.jar.get('sb-test'),'auth-a');
 const proof=f.recovery.parseRecovery(f.jar.get('clinic_reset_recovery'));assert.equal(proof.entryOnly,true);assert.equal(proof.owner,'participant-a');
 assert.equal((await f.call('close')).success,true);assert.equal(f.jar.has('sb-test'),false);assert.equal(f.jar.has('clinic_entry'),false);
 const complete=await f.call('complete');assert.equal(complete.success,true);assert.equal(complete.cleanEntryPath,'/clinic/test-clinic');assert.equal(f.jar.has('clinic_reset_pending'),false);assert.equal(f.state.calls,0);assert.equal(f.state.session.status,'active','Unrelated handoff is never selected or closed');
 assert.equal((await f.call('complete')).success,true);assert.equal(f.state.entryClosures,1);
});
test('lost entry-close preparation response retries once and preserves authenticating account',async()=>{
 const f=entryFixture();assert.equal((await f.call('prepare',{deliver:false})).prepared,true);assert.equal(f.jar.has('clinic_reset_recovery'),false);assert.ok(f.jar.has('sb-test'));
 assert.equal((await f.call('prepare')).prepared,true);assert.equal(f.state.entryClosures,1);assert.equal((await f.call('close')).success,true);assert.equal((await f.call('complete')).success,true);
});
test('a previous anonymous completion receipt cannot suppress the new entry recovery proof',async()=>{
 const f=entryFixture();f.jar.set('clinic_reset_completed',f.recovery.encodeCompletion('/clinic',Date.now()+60000));assert.equal((await f.call('prepare')).prepared,true);assert.ok(f.jar.has('clinic_reset_recovery'));assert.equal((await f.call('close')).success,true);assert.equal((await f.call('complete')).cleanEntryPath,'/clinic/test-clinic');
});
for(const condition of ['historical','already-assisted','device-marker','partial-handoff','database-failure','missing-entry'])test(condition+' never bypasses exact assisted recovery',async()=>{
 const f=entryFixture();if(condition==='historical')f.state.entry.reset_binding_supported=false;if(condition==='already-assisted')f.state.entry.assisted_session_id='real-handoff';if(condition==='device-marker')f.jar.set('clinic_shared_device','1');if(condition==='partial-handoff')f.jar.set('clinic_session','handoff-a');if(condition==='database-failure')f.state.rpcError=true;if(condition==='missing-entry')f.jar.delete('clinic_entry');
 assert.equal((await f.call('prepare')).prepared,false);assert.equal(f.state.calls,0);assert.equal(f.state.entryClosures,0);assert.equal(f.state.signouts,0);assert.equal(f.jar.get('clinic_reset_pending'),'1');assert.ok(f.jar.has('sb-test'));
});
for(const condition of ['different-account','different-entry','forged-proof','new-handoff'])test(condition+' cannot reuse closed-entry proof',async()=>{
 const f=entryFixture();await f.call('prepare');if(condition==='different-account')f.state.owner='participant-b';if(condition==='different-entry')f.jar.set('clinic_entry','entry-b');if(condition==='forged-proof')f.jar.set('clinic_reset_recovery',f.jar.get('clinic_reset_recovery')+'bad');if(condition==='new-handoff'){f.jar.set('clinic_session','handoff-a');f.jar.set('clinic_device','device-a');}
 assert.equal((await f.call('close')).success,false);assert.equal(f.state.calls,0);assert.equal(f.state.signouts,0);assert.ok(f.jar.has('sb-test'));
});
test('entry readback failure does not claim completed reset; exact signed proof supports recovery',async()=>{
 const f=entryFixture();await f.call('prepare');f.state.lookupError=true;assert.equal((await f.call('close')).success,false);assert.equal(f.jar.get('clinic_reset_pending'),'1');f.state.lookupError=false;assert.equal((await f.call('close')).success,true);assert.equal((await f.call('complete')).success,true);assert.equal(f.state.entryClosures,1);
});
