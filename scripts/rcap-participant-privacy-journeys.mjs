import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';

// Shared executable cases: transports must execute the real privacy routes.
// Observations contain hashes/statuses, never cookies, passwords or export contents.
// This is original execution evidence, not an independently reviewed acceptance receipt.
export async function runPrivacyJourneys({ request, observe, fixture, record = () => {} }) {
  const { owner, peer, otherTenant, matterId, remainingMatterId } = fixture;
  assert.equal(new Set([owner.id, peer.id, otherTenant.id]).size, 3, 'three distinct synthetic participants');
  assert.notEqual(owner.tenant, otherTenant.tenant, 'distinct tenant required');
  assert.equal(owner.tenant, peer.tenant, 'same-tenant peer required to isolate cross-user denial');
  assert.notEqual(matterId, remainingMatterId);
  const cases = [];
  function check(id, passed, observation) {
    const row = { id, passed: passed === true, measured: true, observation };
    cases.push(row); record(row); assert.equal(row.passed, true, id);
  }
  const call = (actor, endpoint, body, options) => request(actor, endpoint, { idempotencyKey: randomUUID(), ...body }, options);
  async function proof(actor, purpose) {
    const r = await call(actor, 'reauth', { password: actor.password, purpose });
    assert.equal(r.status, 200, 'real reauthentication must succeed');
    assert.equal(typeof r.body.proof, 'string'); return r.body.proof;
  }
  const before = await observe();
  check('privacy_baseline_present', before.ownerMatters.includes(matterId) && before.ownerMatters.includes(remainingMatterId) && before.peerMatters.length > 0 && before.otherTenantMatters.length > 0, 'owned and neighbouring fixture matters exist before mutation');
  check('privacy_auth_baseline_present', [owner, peer, otherTenant].every(a => before.authUserIds.includes(a.id)), 'all three synthetic Auth accounts independently observed');
  for (const endpoint of ['export', 'matter', 'account']) {
    const r = await call(null, endpoint, { matterId, confirmation: 'DELETE MY ACCOUNT' });
    check(`privacy_${endpoint}_anonymous_denied`, r.status === 401, `HTTP ${r.status}`);
    const crossOrigin = await call(owner, endpoint, { matterId, confirmation: 'DELETE MY ACCOUNT' }, { origin: 'https://untrusted.invalid' });
    check(`privacy_${endpoint}_cross_origin_denied`, crossOrigin.status === 403, `HTTP ${crossOrigin.status}`);
  }
  for (const actor of [peer, otherTenant]) {
    const p = await proof(actor, 'matter_deletion');
    const denied = await call(actor, 'matter', { matterId, proof: p });
    check(`privacy_matter_${actor === peer ? 'cross_user' : 'cross_tenant'}_denied`, denied.status === 500 && denied.body.failedStep === 'verify_matter_ownership', `HTTP ${denied.status}`);
  }
  const noProof = await call(owner, 'matter', { matterId });
  check('privacy_matter_recent_auth_required', noProof.status === 401, `HTTP ${noProof.status}`);
  const wrongPurpose = await proof(owner, 'account_deletion');
  const wrong = await call(owner, 'matter', { matterId, proof: wrongPurpose });
  check('privacy_proof_purpose_bound', wrong.status === 401, `HTTP ${wrong.status}`);
  const foreignProof = await proof(peer, 'account_deletion');
  const accountDenied = await call(owner, 'account', { proof: foreignProof, confirmation: 'DELETE MY ACCOUNT' });
  check('privacy_account_cross_user_proof_denied', accountDenied.status === 401, `HTTP ${accountDenied.status}`);
  const noConfirmation = await call(owner, 'account', { proof: wrongPurpose, confirmation: 'DELETE' });
  check('privacy_account_confirmation_required', noConfirmation.status === 400, `HTTP ${noConfirmation.status}`);
  const afterDenials = await observe();
  check('privacy_denials_preserve_matters', JSON.stringify(afterDenials) === JSON.stringify(before), 'all fixture matter ownership rows unchanged after negative cases');
  for (const actor of [owner, peer, otherTenant]) {
    const r = await call(actor, 'export', { userId: owner.id });
    check(`privacy_export_${actor.id}`, r.status === 200 && r.body.format === 'participant-data-export/v1' && /no-store/.test(r.headers.get('cache-control') ?? '') && /attachment/.test(r.headers.get('content-disposition') ?? ''), `HTTP ${r.status}; attachment and no-store required`);
    const expected = actor === owner ? before.ownerMatters : actor === peer ? before.peerMatters : before.otherTenantMatters;
    const actual = r.body.matters.map(m => m.matterId).sort();
    check(`privacy_export_owner_scope_${actor.id}`, JSON.stringify(actual) === JSON.stringify([...expected].sort()), 'export contains exactly the independently observed owned matter IDs despite supplied foreign userId');
    const sections = ['profile', 'screenings', 'matters', 'answers', 'verificationHistory', 'uploads', 'packets', 'sponsorshipAttribution', 'privacyRequests', 'retainedRecordExplanation'];
    check(`privacy_export_content_${actor.id}`, sections.every(k => k in r.body) && r.body.profile.accountId === actor.id && r.body.profile.matterCount === expected.length && r.body.retainedRecordExplanation.length > 0, 'all ten export sections, authenticated profile and retention explanation present');
    // A participant owns their failed-request history, including the target ID
    // they supplied. Permit only that exact known-input echo; foreign matter
    // records and every other foreign reference remain forbidden.
    const scopedContent = structuredClone(r.body);
    for (const entry of scopedContent.privacyRequests) {
      if (actor !== owner && entry.type === 'matter_deletion' && entry.status === 'failed' && entry.matterId === matterId) entry.matterId = '[known denied target]';
    }
    const serialized = JSON.stringify(scopedContent);
    const foreign = [owner, peer, otherTenant].filter(a => a !== actor);
    const forbidden = [...foreign.map(a => a.id), ...[owner, peer, otherTenant].flatMap(a => [a.cookie, a.password]).filter(Boolean)];
    const foreignMatters = foreign.flatMap(a => a === owner ? before.ownerMatters : a === peer ? before.peerMatters : before.otherTenantMatters);
    check(`privacy_export_no_leak_${actor.id}`, [...forbidden, ...foreignMatters].every(s => !serialized.includes(s)) && !/"(?:access_token|refresh_token|proof_hash|resume_token_hash|storage_path)"\s*:/.test(serialized), 'no foreign identities, foreign matters, fixture credentials or internal security fields');
    record({ id: `export_bytes_${actor.id}`, sha256: createHash('sha256').update(JSON.stringify(r.body)).digest('hex') });
  }
  const p = await proof(owner, 'matter_deletion');
  const deleted = await call(owner, 'matter', { matterId, proof: p });
  check('privacy_matter_completed', deleted.status === 200 && deleted.body.status === 'completed' && Boolean(deleted.body.receiptCode), `HTTP ${deleted.status}; completion receipt required`);
  const afterMatter = await observe();
  check('privacy_matter_postcondition', !afterMatter.ownerMatters.includes(matterId) && afterMatter.ownerMatters.includes(remainingMatterId) && JSON.stringify(afterMatter.peerMatters) === JSON.stringify(before.peerMatters) && JSON.stringify(afterMatter.otherTenantMatters) === JSON.stringify(before.otherTenantMatters), 'target absent; adjacent owned and foreign matters preserved');
  const remainingExport = await call(owner, 'export', {});
  check('privacy_deleted_matter_absent_from_export', remainingExport.status === 200 && JSON.stringify(remainingExport.body.matters.map(m => m.matterId).sort()) === JSON.stringify(afterMatter.ownerMatters), 'fresh owner export agrees with independent database deletion readback');
  const replay = await call(owner, 'matter', { matterId: remainingMatterId, proof: p });
  check('privacy_proof_replay_denied', replay.status === 401, `HTTP ${replay.status}`);
  const ap = await proof(owner, 'account_deletion');
  const account = await call(owner, 'account', { proof: ap, confirmation: 'DELETE MY ACCOUNT' });
  check('privacy_account_completed', account.status === 200 && account.body.status === 'completed' && Boolean(account.body.receiptCode), `HTTP ${account.status}; completion receipt required`);
  const afterAccount = await observe();
  check('privacy_account_postcondition', afterAccount.ownerMatters.length === 0 && JSON.stringify(afterAccount.peerMatters) === JSON.stringify(before.peerMatters) && JSON.stringify(afterAccount.otherTenantMatters) === JSON.stringify(before.otherTenantMatters), 'owner matters erased; cross-user and tenant matters preserved');
  check('privacy_account_auth_erased', !afterAccount.authUserIds.includes(owner.id) && [peer, otherTenant].every(a => afterAccount.authUserIds.includes(a.id)), 'Auth account erased; adjacent accounts preserved');
  const durable = await observe();
  check('privacy_deletion_durable_readback', JSON.stringify(durable) === JSON.stringify(afterAccount), 'separate database request confirms deletion persists');
  const blocked = await call(owner, 'export', {});
  check('privacy_deleted_account_session_refused', [401, 403].includes(blocked.status), `HTTP ${blocked.status}`);
  return { schemaVersion: 'rcap-participant-privacy-journeys/v1', cases, independentReview: null, runtimeAccepted: false };
}
