import assert from 'node:assert/strict';

export const REQUIRED_ACCOUNT_STEPS = [
  'freeze_account', 'revoke_sessions', 'stop_email_reminders', 'revoke_partner_assistance',
  'remove_follow_up_queue_entries', 'cancel_unstarted_renders', 'invalidate_downloads',
  'delete_uploads', 'delete_generated_packets', 'delete_or_deidentify_matters',
  'pseudonymize_retained_records', 'propagate_to_processors', 'write_backup_tombstone',
  'delete_auth_user', 'issue_receipt'
];

// Only fixed SELECTs over validated synthetic identities. The receipt is read
// independently of the HTTP response and tied to the original owner's tombstone.
export function accountCompletionSql(ownerId, requestId) {
  for (const id of [ownerId, requestId]) assert.match(id ?? '', /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/);
  return `select json_build_object(
    'completed', r.status = 'completed' and r.completed_at is not null,
    'receiptCode', r.receipt_code,
    'legalHoldChecked', r.legal_hold_checked_at is not null and r.legal_hold_active = false,
    'restorationBarrier', t.restoration_barrier and t.deleted_at is not null and t.receipt_code = r.receipt_code,
    'sessionsRevoked', t.sessions_revoked_at is not null,
    'steps', (select coalesce(json_agg(json_build_object('key', s.step_key, 'status', s.status) order by s.step_order), '[]') from public.participant_privacy_request_steps s where s.request_id = r.id),
    'processors', (select coalesce(json_agg(json_build_object('key', p.processor_key, 'status', p.status, 'settled', p.detail->'settled', 'required', p.detail->'required') order by p.processor_key), '[]') from public.participant_processor_propagations p where p.request_id = r.id)
  ) as proof from public.participant_privacy_requests r
  join public.participant_account_tombstones t on t.request_id = r.id
  where r.id = '${requestId}' and t.user_id = '${ownerId}' and r.request_type = 'account_deletion'`;
}

export function completionProofPasses(proof, receiptCode) {
  const processorKeys = ['email_delivery', 'packet_render_worker', 'payment_processor', 'product_analytics'];
  return Boolean(proof?.completed && proof.legalHoldChecked && proof.restorationBarrier && proof.sessionsRevoked
    && proof.receiptCode === receiptCode && Array.isArray(proof.steps)
    && proof.steps.length === REQUIRED_ACCOUNT_STEPS.length
    && proof.steps.every((s, i) => s.key === REQUIRED_ACCOUNT_STEPS[i] && s.status === 'completed')
    && Array.isArray(proof.processors)
    && JSON.stringify(proof.processors.map(p => p.key).sort()) === JSON.stringify(processorKeys)
    && proof.processors.every(p => typeof p.required === 'boolean' && p.settled === true
      && (p.status === 'acknowledged' || (p.required === false && p.status === 'not_applicable'))));
}
