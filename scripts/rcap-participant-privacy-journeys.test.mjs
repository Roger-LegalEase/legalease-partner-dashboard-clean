import test from 'node:test';
import assert from 'node:assert/strict';
import { runPrivacyJourneys } from './rcap-participant-privacy-journeys.mjs';
import { REQUIRED_ACCOUNT_STEPS, accountCompletionSql } from './rcap-privacy-postconditions.mjs';

// These controls test the evidence driver's refusal behavior. Actual routes and
// SQL are exercised separately by verify-participant-data-rights --privacy-journeys.
function harness(mutate = () => {}) {
  const actors = ['owner', 'peer', 'foreign'].map((id, i) => ({ id, tenant: i === 2 ? 'b' : 'a', password: `secret-${id}` }));
  const fixture = { owner: actors[0], peer: actors[1], otherTenant: actors[2], matterId: 'm1', remainingMatterId: 'm2' };
  const state = { ownerMatters: ['m1', 'm2'], peerMatters: ['m3'], otherTenantMatters: ['m4'], authUserIds: actors.map(a => a.id).sort() };
  const proofs = new Map();
  let serial = 0;
  return {
    fixture,
    observeCompletion: async () => { const proof = { completed: true, receiptCode: 'synthetic-receipt', legalHoldChecked: true, restorationBarrier: true, sessionsRevoked: true, steps: REQUIRED_ACCOUNT_STEPS.map(key => ({ key, status: 'completed' })), processors: ['email_delivery', 'packet_render_worker', 'payment_processor', 'product_analytics'].map(key => ({ key, required: true, settled: true, status: 'acknowledged' })) }; mutate('completion', proof); return proof; },
    observe: async () => { const copy = structuredClone(state); mutate('observation', copy); return copy; },
    request: async (actor, endpoint, body, options) => {
      const response = (status, payload = {}) => {
        mutate(endpoint, payload, actor);
        return { status, body: payload, headers: new Headers({ 'cache-control': 'no-store', 'content-disposition': 'attachment' }) };
      };
      if (!actor || !state.authUserIds.includes(actor.id)) return response(401);
      if (options?.origin) return response(403);
      if (endpoint === 'reauth') {
        const proof = `proof-${++serial}`; proofs.set(proof, { actor: actor.id, purpose: body.purpose });
        return response(200, { proof });
      }
      if (endpoint === 'export') {
        const key = actor === actors[0] ? 'ownerMatters' : actor === actors[1] ? 'peerMatters' : 'otherTenantMatters';
        return response(200, { format: 'participant-data-export/v1', profile: { accountId: actor.id, matterCount: state[key].length }, matters: state[key].map(matterId => ({ matterId })), screenings: [], answers: [], verificationHistory: [], uploads: [], packets: [], sponsorshipAttribution: [], privacyRequests: [], retainedRecordExplanation: ['statutory retention'] });
      }
      if (endpoint === 'account' && body.confirmation !== 'DELETE MY ACCOUNT') return response(400);
      const p = proofs.get(body.proof);
      if (!p || p.actor !== actor.id || p.purpose !== `${endpoint}_deletion`) return response(401);
      proofs.delete(body.proof);
      if (endpoint === 'matter' && actor !== actors[0]) return response(500, { failedStep: 'verify_matter_ownership' });
      if (endpoint === 'matter') state.ownerMatters = state.ownerMatters.filter(id => id !== body.matterId);
      if (endpoint === 'account') { state.ownerMatters = []; state.authUserIds = state.authUserIds.filter(id => id !== actor.id); }
      return response(200, { status: 'completed', receiptCode: 'synthetic-receipt' });
    }
  };
}
test('driver completes only when transport and independent readbacks agree', async () => {
  const result = await runPrivacyJourneys(harness());
  assert.ok(result.cases.length > 30);
  assert.equal(result.runtimeAccepted, false);
});
for (const [name, mutate, expected] of [
  ['foreign export content', (endpoint, body) => { if (endpoint === 'export' && body.profile) body.answers.push({ accountId: 'foreign' }); }, /privacy_export_no_leak/],
  ['credential leak', (endpoint, body) => { if (endpoint === 'export' && body.profile) body.answers.push({ value: 'secret-owner' }); }, /privacy_export_no_leak/],
  ['missing export section', (endpoint, body) => { if (endpoint === 'export' && body.profile) delete body.retainedRecordExplanation; }, /privacy_export_content/],
  ['false Auth deletion', (endpoint, body) => { if (endpoint === 'observation' && body.ownerMatters.length === 0) body.authUserIds.push('owner'); }, /privacy_account_auth_erased/],
  ['false matter deletion', (endpoint, body) => { if (endpoint === 'observation' && body.ownerMatters.length === 1) body.ownerMatters.push('m1'); }, /privacy_matter_postcondition/],
  ['pending processor', (endpoint, body) => { if (endpoint === 'completion') body.processors[0].status = 'pending'; }, /privacy_account_completion_ledger/],
  ['missing processor', (endpoint, body) => { if (endpoint === 'completion') body.processors.pop(); }, /privacy_account_completion_ledger/],
  ['missing deletion step', (endpoint, body) => { if (endpoint === 'completion') body.steps.pop(); }, /privacy_account_completion_ledger/],
  ['missing restoration barrier', (endpoint, body) => { if (endpoint === 'completion') body.restorationBarrier = false; }, /privacy_account_completion_ledger/]
]) test(`driver refuses ${name}`, async () => {
  await assert.rejects(runPrivacyJourneys(harness(mutate)), expected);
});
test('completion query refuses unvalidated identifiers before SQL', () => {
  assert.throws(() => accountCompletionSql("'; drop table auth.users; --", 'invalid'));
});
