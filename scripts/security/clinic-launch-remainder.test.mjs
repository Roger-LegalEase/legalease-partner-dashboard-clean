import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './clinic-reset-route-fixture.mjs';
const DAY=86400000;
function staff(f) {
 f.state.owner='staff-a'; f.state.actor='staff-a'; f.jar.set('sb-test','staff-auth');
 f.state.partner={id:'partner-user-a',auth_user_id:'staff-a',partner_slug:'tenant-a',status:'active'};
 f.state.staff={id:'membership-a',event_id:'event-a',partner_user_id:'partner-user-a',status:'approved',permissions:['assist']};
}
function expired(f) {
 f.issueAtStart();const p=f.recovery.parseRecovery(f.jar.get('clinic_reset_recovery'));
 p.expires=Date.now()-1;f.jar.set('clinic_reset_recovery',f.recovery.encodeRecovery(p));
 f.jar.delete('clinic_session'); f.jar.delete('clinic_device');
}
for(const locator of ['missing','expired'])test('M1 approved event staff closes only exact '+locator+'-locator handoff as staff; one audit, cleanup separate',async()=>{
 const f=fixture();if(locator==='expired')expired(f);staff(f);
 assert.equal((await f.call('prepare')).prepared,true);assert.equal(f.state.signouts,0);
 assert.equal((await f.call('close')).success,true);assert.equal(f.state.audits,1);
 assert.ok(f.jar.has('clinic_reset_recovery'));assert.equal(f.jar.get('clinic_reset_pending'),'1');
 assert.equal((await f.call('close')).success,true);assert.equal(f.state.audits,1);
 assert.equal((await f.call('complete')).success,true);assert.equal(f.jar.has('clinic_reset_recovery'),false);
 assert.equal(f.state.session.participant_user_id,'participant-a');
 assert.ok(f.state.queries.every(q=>['clinic_assisted_sessions','clinic_events','partner_users','clinic_event_staff'].includes(q.table)));
});
for(const deny of ['wrong-tenant','wrong-event','inactive-partner','revoked-staff','queue-only','no-membership','forged-locator','wrong-device','missing-all','missing-device'])test('M1 refuses '+deny+' without closure, signout or private access',async()=>{
 const f=fixture();expired(f);staff(f);
 if(deny==='wrong-tenant')f.state.partner.partner_slug='tenant-b';
 if(deny==='wrong-event')f.state.staff.event_id='event-b';
 if(deny==='inactive-partner')f.state.partner.status='disabled';
 if(deny==='revoked-staff')f.state.staff.status='revoked';
 if(deny==='queue-only')f.state.staff.permissions=['queue'];
 if(deny==='no-membership')f.state.staff=null;
 if(deny==='forged-locator')f.jar.set('clinic_reset_recovery',f.jar.get('clinic_reset_recovery')+'tamper');
 if(deny==='wrong-device')f.jar.set('clinic_device','different-device');
 if(deny==='missing-all')f.jar.delete('clinic_reset_recovery');
 if(deny==='missing-device'){f.jar.delete('clinic_reset_recovery');f.jar.set('clinic_session','handoff-a');}
 assert.equal((await f.call('prepare',{extra:{sessionId:'session-a',actorUserId:'participant-a',participantUserId:'participant-a',eventId:'event-a'}})).prepared,false);
 assert.equal(f.state.audits,0);assert.equal(f.state.signouts,0);assert.equal(f.jar.get('sb-test'),'staff-auth');
});
test('M1 staff authority is rechecked after prepare; signed staff proof cannot impersonate participant after auth loss',async()=>{
 const f=fixture();expired(f);staff(f);assert.equal((await f.call('prepare')).prepared,true);
 f.state.staff.status='revoked';assert.equal((await f.call('close')).success,false);assert.equal(f.state.signouts,0);
 f.jar.delete('sb-test');assert.equal((await f.call('close')).success,false);assert.equal(f.state.audits,0);
 f.state.staff.status='approved';f.jar.set('sb-test','staff-auth');assert.equal((await f.call('close')).success,true);assert.equal(f.state.audits,1);
});
test('M1 staff closure lost response retains exact recovery and reconciles once',async()=>{
 const f=fixture();expired(f);staff(f);await f.call('prepare');f.state.lostCommit=true;
 assert.equal((await f.call('close')).success,false);assert.equal(f.state.audits,1);assert.ok(f.jar.has('sb-test'));
 f.state.lostCommit=false;assert.equal((await f.call('close')).success,true);assert.equal((await f.call('complete')).success,true);assert.equal(f.state.audits,1);
});
test('M4 locator maximum is 30 days and authenticated renewal does not move original deadline',async()=>{
 const f=fixture();const t=Date.now();f.issueAtStart();let p=f.recovery.parseRecovery(f.jar.get('clinic_reset_recovery'));
 assert.ok(p.retainUntil<=t+30*DAY+20);const deadline=Math.min(p.retainUntil,Date.parse(f.state.session.created_at)+30*DAY);
 p.expires=Date.now()-1;f.jar.set('clinic_reset_recovery',f.recovery.encodeRecovery(p));
 for(let n=0;n<3;n++){assert.equal((await f.call('prepare')).prepared,true);p=f.recovery.parseRecovery(f.jar.get('clinic_reset_recovery'));assert.equal(p.retainUntil,deadline);}
});
test('M4 retention expiry removes locator but NEVER closes or unlocks; unknown device stays refused',async()=>{
 const f=fixture();f.issueAtStart();const p=f.recovery.parseRecovery(f.jar.get('clinic_reset_recovery'));
 p.issuedAt=Date.now()-31*DAY;p.retainUntil=Date.now()-DAY;f.jar.set('clinic_reset_recovery',f.recovery.encodeRecovery(p));
 f.jar.delete('clinic_session');f.jar.delete('clinic_device');f.jar.set('clinic_reset_pending','1');
 assert.equal((await f.call('prepare')).prepared,false);assert.equal(f.jar.has('clinic_reset_recovery'),false);assert.equal(f.jar.get('clinic_reset_pending'),'1');assert.equal(f.state.audits,0);
 assert.equal((await f.call('close')).success,false);assert.equal(f.state.session.status,'active');
});
test('M4 legacy 400-day receipt clamps to original 30-day deadline',async()=>{
 const f=fixture();const issued=Date.now()-DAY;const p=f.recovery.mintRecovery('participant-a','a'.repeat(64),'b'.repeat(64));
 delete p.issuedAt;p.expires=issued+8*3600000;p.retainUntil=issued+400*DAY;
 assert.equal(f.recovery.recoveryOptions(p).expires.getTime(),issued+30*DAY);
});
for(const lost of [true,false])test('M4 completion '+(lost?'lost response':'interrupted final cleanup')+' recovers without duplicate closure; participant locator removed only after completion',async()=>{
 const f=fixture();await f.call('prepare');const locator=f.jar.get('clinic_reset_recovery');await f.call('close');
 assert.equal(f.jar.get('clinic_reset_recovery'),locator);assert.equal(f.jar.get('clinic_reset_pending'),'1');
 assert.equal((await f.call('complete',{deliver:!lost})).success,true);
 if(lost)assert.equal(f.jar.get('clinic_reset_recovery'),locator);
 else {
  assert.equal(f.jar.has('clinic_reset_recovery'),false);const receipt=JSON.parse(Buffer.from(f.jar.get('clinic_reset_completed').split('.')[0],'base64url'));
  assert.deepEqual(Object.keys(receipt).sort(),['cleanEntryPath','purpose','until']);f.jar.set('clinic_reset_pending','1');
 }
 assert.equal((await f.call('prepare')).prepared,true);assert.equal((await f.call('close')).success,true);assert.equal((await f.call('complete')).cleanEntryPath,'/clinic/test-clinic');
 assert.equal(f.jar.has('clinic_reset_recovery'),false);assert.equal(f.jar.has('clinic_reset_pending'),false);assert.equal(f.state.audits,1);
});

test('M4 surviving raw handoff cookies cannot restart retention after canonical thirty-day deadline',async()=>{
 const f=fixture();f.state.session.created_at=new Date(Date.now()-31*DAY).toISOString();staff(f);
 for(let n=0;n<3;n++){assert.equal((await f.call('prepare')).prepared,false);assert.equal(f.jar.has('clinic_reset_recovery'),false);}
 assert.equal(f.state.audits,0);assert.equal(f.state.signouts,0);assert.equal(f.jar.get('clinic_reset_pending'),'1');
});

test('M1 failed exact lookup cannot clear a different authenticated account using a participant proof',async()=>{
 const f=fixture();f.issueAtStart();f.state.owner='different-account';f.state.lookupError=true;
 assert.equal((await f.call('close')).success,false);assert.equal(f.state.signouts,0);assert.equal(f.jar.get('sb-test'),'auth-a');assert.equal(f.state.audits,0);
});
