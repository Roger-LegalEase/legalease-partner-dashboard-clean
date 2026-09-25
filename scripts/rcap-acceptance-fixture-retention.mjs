import assert from 'node:assert/strict';

export const ACCEPTANCE_PROJECT = 'hyflxnlhpmiqxvvcoiia';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function requireAcceptance(project) {
  assert.equal(project, ACCEPTANCE_PROJECT, 'Acceptance project only; Production is forbidden');
}
export function uuid(value) {
  assert.match(value ?? '', UUID, 'exact UUID required');
  return `'${value}'`;
}

/** Retention is deliberate: jobs cannot be deleted, provenance cascades with
 * the owner, and payment consumption is financial evidence. There is no safe
 * inverse of payment/delivery. Never turn a successful fixture into an orphan.
 * Even exceptions/early exits retain the owner: no teardown delete exists.
 * The two shared auth accounts are NOT ephemeral run-owned users.
 */
export async function retainPaymentFixture({ project, namespace, sql }) {
  requireAcceptance(project);
  const item = uuid(namespace.briefcaseItemId), user = uuid(namespace.authUserId);
  const target = namespace.renderJobId === null ? null : uuid(namespace.renderJobId);
  const result = await sql(`select jsonb_build_object(
    'ownerMatches', exists(select 1 from public.consumer_briefcase_items where id=${item} and user_id=${user}),
    'jobs', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'status',status,
      'owner',consumer_auth_user_id,'item',consumer_briefcase_item_id,
      'partner',partner_id,'sponsored',sponsored_route_key,
      'sponsoredItem',sponsored_consumer_briefcase_item_id) order by id),'[]'::jsonb)
      from public.packet_render_jobs where briefcase_item_id=${item} or consumer_briefcase_item_id=${item}
        or sponsored_consumer_briefcase_item_id=${item}${target ? ` or id=${target}` : ''}),
    'consumptions', (select coalesce(jsonb_agg(jsonb_build_object('id',id,
      'owner',consumer_auth_user_id,'item',consumer_briefcase_item_id,
      'job',first_render_job_id) order by id),'[]'::jsonb)
      from public.consumer_packet_payment_consumption where consumer_briefcase_item_id=${item})
  ) as fixture`);
  assert.equal(result.ok, true, 'fixture retention readback must succeed');
  assert.equal(result.json?.length, 1);
  const fixture = result.json[0].fixture;
  assert.equal(fixture.ownerMatches, true, 'retain and report: exact owner must exist');
  for (const job of fixture.jobs) {
    assert.equal(job.owner, namespace.authUserId);
    assert.equal(job.item, namespace.briefcaseItemId);
    assert.equal(job.partner, null, 'payment retention cannot handle sponsored jobs');
    assert.equal(job.sponsored, null);
    assert.equal(job.sponsoredItem, null);
  }
  if (target) assert.ok(fixture.jobs.some(j => j.id === namespace.renderJobId), 'target must belong to exact fixture');
  for (const row of fixture.consumptions) {
    assert.equal(row.owner, namespace.authUserId);
    assert.equal(row.item, namespace.briefcaseItemId);
    assert.ok(fixture.jobs.some(j => j.id === row.job), 'consumption must reference run-owned job');
  }
  return { policy: 'retain_owner_jobs_payment_and_delivery_evidence', mutationCount: 0,
    namespace: { briefcaseItemId: namespace.briefcaseItemId, authUserId: namespace.authUserId,
      renderJobIds: fixture.jobs.map(j => j.id), paymentConsumptionIds: fixture.consumptions.map(c => c.id) },
    unfinishedJobs: fixture.jobs.filter(j => !['delivered','artifact_validated'].includes(j.status)).map(j => j.id),
    fixture };
}
