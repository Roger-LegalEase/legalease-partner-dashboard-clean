import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, baseline } from './clinic-reset-route-fixture.mjs';
import { createHash } from 'node:crypto';
const sha = value => createHash('sha256').update(value).digest('hex');

if (baseline) {
  test('BEFORE: two apparent successes leave canonical session active with zero closure audits', async () => {
    const f = fixture(); f.state.rpcError = true;
    const first = await f.call(); const second = await f.call();
    assert.equal(first.success, true); assert.equal(second.success, true); assert.equal(second.signOutConfirmed, true);
    assert.equal(f.state.session.status, 'active'); assert.equal(f.state.audits, 0); assert.equal(f.state.calls, 1);
  });
} else {
  test('clean reset, repeated closure, completion and idempotent receipt', async () => {
    const f = fixture(); assert.equal((await f.call('prepare')).prepared, true); assert.equal(f.state.calls, 0);
    assert.equal((await f.call('close')).success, true); assert.equal(f.jar.has('sb-test'), false);
    assert.equal((await f.call('close')).revocationConfirmed, true); assert.equal((await f.call('complete')).success, true);
    assert.equal(f.jar.has('clinic_reset_pending'), false); assert.equal(f.state.calls, 1); assert.equal(f.state.audits, 1);
  });
  for (const failure of ['rpcError', 'lookupError']) test(`${failure}: auth disappears, retry never falsely certifies; recovery closes exact session`, async () => {
    const f = fixture(); await f.call('prepare'); f.state[failure] = true;
    for (let i = 0; i < 2; i++) { const result = await f.call('close'); assert.equal(result.success, false); assert.equal(result.revocationConfirmed, false); assert.equal(result.status, 409); }
    assert.equal(f.jar.has('sb-test'), false); assert.equal(f.jar.has('clinic_session'), false); assert.equal(f.state.session.status, 'active'); assert.equal(f.state.audits, 0);
    f.state[failure] = false; assert.equal((await f.call('close')).success, true); assert.equal(f.state.audits, 1);
  });
  test('missing identity cannot turn unknown closure into success', async () => {
    const f = fixture(); f.jar.clear(); assert.equal((await f.call('close', { extra: { sessionId: 'session-a' } })).success, false); assert.equal(f.state.calls, 0);
  });
  test('lost response after committed closure reconciles with one audit', async () => {
    const f = fixture(); await f.call('prepare'); f.state.lostCommit = true;
    await f.call('close', { deliver: false }); f.jar.delete('sb-test'); f.jar.delete('clinic_session'); f.jar.delete('clinic_device');
    f.state.lostCommit = false; assert.equal((await f.call('close')).success, true); assert.equal(f.state.calls, 1); assert.equal(f.state.audits, 1);
  });
  test('tab close/reload between closure and cleanup retains durable recovery', async () => {
    const f = fixture(); await f.call('prepare'); await f.call('close');
    assert.equal(f.jar.get('clinic_reset_pending'), '1'); assert.ok(f.jar.get('clinic_reset_recovery'));
    assert.equal((await f.call('prepare')).prepared, true); assert.equal((await f.call('close')).success, true); assert.equal(f.state.audits, 1);
  });
  test('completion before canonical closure is refused', async () => {
    const f = fixture(); await f.call('prepare'); assert.equal((await f.call('complete')).success, false); assert.equal(f.jar.get('clinic_reset_pending'), '1'); assert.equal(f.state.calls, 0);
  });
  test('unknown RPC outcome and signout failure remain failures', async () => {
    const f = fixture(); await f.call('prepare'); f.state.result = 'forbidden'; assert.equal((await f.call('close')).success, false);
    f.state.result = 'ended'; f.state.signoutError = true; const result = await f.call('close'); assert.equal(result.revocationConfirmed, true); assert.equal(result.success, false);
  });
  test('captured old-session proof cannot close or certify next participant', async () => {
    const f = fixture(); await f.call('prepare'); const captured = f.jar.get('clinic_reset_recovery'); await f.call('close'); await f.call('complete');
    f.state.owner = 'participant-b'; f.state.session = { id: 'session-b', participant_user_id: 'participant-b', status: 'active', handoff_token_hash: sha('handoff-b'), device_nonce_hash: sha('device-b') };
    f.jar.set('clinic_session', 'handoff-b'); f.jar.set('clinic_device', 'device-b'); f.jar.set('sb-test', 'auth-b'); f.jar.set('clinic_reset_recovery', captured);
    assert.equal((await f.call('close')).success, false); assert.equal(f.state.session.status, 'active'); assert.equal(f.state.calls, 1);
  });
  test('forged recovery and cross-origin requests refuse', async () => {
    const f = fixture(); f.jar.set('clinic_reset_recovery', 'forged.proof'); assert.equal((await f.call('close')).success, false);
    assert.equal((await f.call('close', { origin: 'https://attacker.invalid' })).status, 403); assert.equal(f.state.calls, 0);
  });
}
