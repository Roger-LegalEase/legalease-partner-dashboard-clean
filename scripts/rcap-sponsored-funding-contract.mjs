import assert from 'node:assert/strict';
import { RESUME } from './rcap-clinic-resume-contract.mjs';
export const CAP_REASONS = Object.freeze(['event_cap_exhausted', 'partner_cap_exhausted']);
export function assertSynthetic(snapshot) {
  assert.notEqual(snapshot.item?.user_id, RESUME.owner, 'historical Applicant A cannot be a cap fixture');
  assert.notEqual(snapshot.item?.id, RESUME.item, 'historical Applicant A is funding-read-only');
  assert.notEqual(snapshot.verification?.matter_id, RESUME.matter);
  assert.equal(snapshot.item?.user_id, snapshot.verification?.consumer_auth_user_id);
  assert.equal(snapshot.item?.id, snapshot.verification?.briefcase_item_id);
  assert.equal(snapshot.verification?.status, 'verified');
  assert.equal(snapshot.source?.claimed_user_id,snapshot.item.user_id);
  assert.equal(snapshot.source?.claimed_matter_id,snapshot.item.id);
  assert.equal(snapshot.source?.pending_id,snapshot.item.source_pending_result_id);
  assert.equal(snapshot.source?.product,'rcap_partner');
  assert.equal(snapshot.source?.status,'CLAIMED');
  assert.match(snapshot.verification?.verification_hash ?? '', /^[a-f0-9]{64}$/);
}
export function assertContinuity(before, after) {
  assertSynthetic(before); assertSynthetic(after);
  for (const key of ['id','user_id','source_session_id','source_pending_result_id','jurisdiction','pathway_label']) {
    assert.equal(after.item[key], before.item[key], `matter/source identity changed: ${key}`);
  }
  for (const key of ['matter_id','verification_hash','consumer_auth_user_id','briefcase_item_id']) {
    assert.equal(after.verification[key], before.verification[key], `verification changed: ${key}`);
  }
  assert.deepEqual(after.source,before.source,'protected source/acquisition changed');
  assert.deepEqual(after.verification.snapshot, before.verification.snapshot, 'route/verified facts changed');
  assert.deepEqual(after.item.artifact_refs_json?.attribution, before.item.artifact_refs_json?.attribution, 'acquisition attribution changed');
  if (before.funding.length) assert.deepEqual(after.funding, before.funding, 'immutable funding choice changed');
}
export function fundingOutcome(response, before, after) {
  assertContinuity(before, after);
  const f = after.funding;
  // A generic 409, pausedAtCap, or provenance hint grants nothing. The exact
  // native response AND the persisted protected choice must agree.
  assert.equal(f.length, 1, 'one protected funding choice required');
  const choice = f[0];
  assert.equal(choice.briefcase_item_id, before.item.id);
  assert.equal(choice.consumer_auth_user_id, before.item.user_id);
  assert.equal(choice.source_session_id, before.source.anonymous_session_id);
  assert.equal(choice.event_id,before.source.event_id);
  assert.equal(choice.partner_slug,before.source.partner_slug);
  assert.equal(choice.initial_verification_hash, before.verification.verification_hash);
  assert.equal(choice.route_key, `${before.verification.snapshot.jurisdiction}:${before.verification.snapshot.pathwayId}`);
  if (response.status === 409 && response.json?.outcome === 'sponsor_capacity_exhausted'
      && response.json.checkoutRequired === true && !response.json.resultCode
      && choice.funding_mode === 'dtc' && CAP_REASONS.includes(choice.reason)) {
    assert.equal(after.sponsoredConsumed, 0);
    assert.equal(after.sponsoredEntitlements, 0);
    return choice.reason;
  }
  if (response.status === 200 && !response.json?.checkoutRequired && !response.json?.resultCode
      && choice.funding_mode === 'sponsored' && choice.reason === 'slot_reserved'
      && ['ready','generating'].includes(response.json?.packetStatus)) return 'slot_reserved';
  throw new Error(`REFUSE: no authoritative channel outcome (HTTP ${response.status}, code=${response.json?.resultCode ?? 'none'})`);
}
export function stripeScheduled(outcome) {
  assert.ok(['slot_reserved', ...CAP_REASONS].includes(outcome), 'refusal is not exhaustion');
  return CAP_REASONS.includes(outcome);
}
export function assertAccounting(outcome, snapshot, { paid = false } = {}) {
  assertSynthetic(snapshot);
  assert.equal(snapshot.matterCount, 1);
  assert.equal(snapshot.orphanJobs, 0);
  assert.equal(snapshot.overageConsumed, 0);
  assert.equal(snapshot.funding.length, 1);
  if (outcome === 'slot_reserved') {
    assert.equal(snapshot.funding[0].funding_mode, 'sponsored');
    assert.equal(snapshot.sponsoredEntitlements, 1);
    assert.equal(snapshot.sponsoredConsumed, 1);
    assert.equal(snapshot.dtcEntitlements, 0);
    assert.equal(snapshot.checkoutSessions, 0);
    assert.equal(snapshot.paymentCount, 0);
  } else {
    assert.ok(CAP_REASONS.includes(outcome));
    assert.equal(snapshot.funding[0].funding_mode, 'dtc');
    assert.equal(snapshot.sponsoredEntitlements, 0);
    assert.equal(snapshot.sponsoredConsumed, 0);
    assert.equal(snapshot.dtcEntitlements, paid ? 1 : 0);
    assert.equal(snapshot.paymentCount, paid ? 1 : 0);
  }
}
export function assertFinalSlot(observations) {
  assert.equal(observations.length, 2);
  assert.notEqual(observations[0].before.item.id, observations[1].before.item.id);
  assert.equal(observations.filter(o => o.outcome === 'slot_reserved').length, 1);
  assert.equal(observations.filter(o => CAP_REASONS.includes(o.outcome)).length, 1);
  for (const o of observations) {
    assert.equal(fundingOutcome(o.response, o.before, o.after), o.outcome);
    assert.equal(o.after.orphanJobs, 0);
    assert.equal(o.after.overageConsumed, 0);
    assert.equal(o.after.matterCount, 1);
    assert.equal(o.after.dtcEntitlements, 0, 'race does not grant a paid entitlement');
  }
}
export async function observeFunding({ itemIds, read, generate, persist = () => {} }) {
  assert.ok([1,2].includes(itemIds.length));
  assert.equal(new Set(itemIds).size, itemIds.length);
  // Pre-read both before starting either request. allSettled preserves the
  // winner's native response if the loser fails. No automatic request retry.
  const before = await Promise.all(itemIds.map(read));
  before.forEach(s => { assertSynthetic(s); assert.equal(s.funding.length, 0, "fresh authorized synthetic matter required"); for(const k of ["sponsoredConsumed","dtcEntitlements","paymentCount","checkoutSessions"]) assert.equal(s[k],0,`not a fresh funding case: ${k}`); });
  const results = await Promise.allSettled(itemIds.map(generate));
  const after = await Promise.allSettled(itemIds.map(read));
  const observations = results.map((r,i) => ({ before: before[i], after: after[i].status === "fulfilled" ? after[i].value : null,
    response: r.status === 'fulfilled' ? r.value : { status: 'transport-failure', json: {} } }));
  // Save native response/post-state before classifying; a refusal is evidence, not a reason to replay.
  await persist(observations);
  return observations.map(o => ({ ...o, outcome: fundingOutcome(o.response,o.before,o.after) }));
}

export function assertOneRemainingSlot(capacity) {
  assert.equal(capacity.length, 2);
  for (const c of capacity) {
    assert.ok(c.event && c.partner && c.packetEntitlement);
    for (const k of ['eventRemaining','partnerRemaining','packetRemaining']) assert.ok(Number.isInteger(c[k]) && c[k] >= 1, k);
  }
  const [a,b]=capacity;
  assert.ok((a.event===b.event && a.eventRemaining===1 && b.eventRemaining===1)
    || (a.partner===b.partner && a.partnerRemaining===1 && b.partnerRemaining===1)
    || (a.packetEntitlement===b.packetEntitlement && a.packetRemaining===1 && b.packetRemaining===1),
    'two eligible matters must share exactly one remaining authoritative slot');
}
