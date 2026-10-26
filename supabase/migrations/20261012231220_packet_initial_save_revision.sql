-- Consume the claim seed revision on every first persisted protected snapshot.
-- Existing RPC signature, owner checks, locks, privileges and projections are unchanged.
-- Isolated rehearsal only; Production requires exact-candidate authorization.
begin;

create or replace function public.persist_consumer_packet_verification(
  p_consumer_auth_user_id uuid,
  p_briefcase_item_id uuid,
  p_expected_prior_hash text,
  p_expected_prior_revision integer,
  p_answer_delta jsonb,
  p_packet_information_metadata jsonb,
  p_next_draft_hash text,
  p_next_draft_snapshot jsonb,
  p_next_verification_status text,
  p_next_verification_reason text,
  p_next_verification_hash text,
  p_next_verification_snapshot jsonb,
  p_next_verification_invalidated_at timestamptz
)
returns table (
  status text,
  reason text,
  hash text,
  snapshot jsonb,
  draft_hash text,
  draft_snapshot jsonb,
  revision integer,
  invalidated_at text
)
language plpgsql
security definer
set search_path = ''
as $persist$
declare
  v_item public.consumer_briefcase_items%rowtype;
  v_prior public.consumer_packet_verifications%rowtype;
  v_next_revision integer;
  v_verification_display jsonb;
  v_draft_display jsonb;
  v_snapshot_display jsonb;
  v_metadata_display jsonb;
  v_answer_map text;
begin
  if p_consumer_auth_user_id is null or p_briefcase_item_id is null
     or p_expected_prior_revision is null or p_expected_prior_revision < 0
     or p_next_draft_hash !~ '^[a-f0-9]{64}$'
     or p_next_draft_snapshot ->> 'schemaVersion' <> 'expungement-ai/protected-packet-draft/v1'
     or p_next_verification_status not in ('unverified', 'verified', 'invalidated')
     or nullif(trim(coalesce(p_next_verification_reason, '')), '') is null
     or coalesce(jsonb_typeof(p_answer_delta), '') <> 'object'
     or coalesce(jsonb_typeof(p_packet_information_metadata), '') <> 'object' then
    return;
  end if;
  if (p_next_verification_status = 'verified') is distinct from
     coalesce((p_next_verification_hash ~ '^[a-f0-9]{64}$'
      and p_next_verification_snapshot ->> 'schemaVersion' = 'expungement-ai/final-verification/v1'), false) then
    return;
  end if;
  if p_next_verification_status <> 'verified'
     and (p_next_verification_hash is not null or p_next_verification_snapshot is not null) then
    return;
  end if;

  select * into v_item from public.consumer_briefcase_items i
   where i.id = p_briefcase_item_id and i.user_id = p_consumer_auth_user_id for update;
  if not found then return; end if;

  select * into v_prior from public.consumer_packet_verifications v
   where v.briefcase_item_id = p_briefcase_item_id for update;

  if found then
    if v_prior.consumer_auth_user_id is distinct from p_consumer_auth_user_id
       or v_prior.revision is distinct from p_expected_prior_revision
       or (case when v_prior.status = 'verified' then v_prior.verification_hash else null end)
          is distinct from p_expected_prior_hash then
      return;
    end if;
    if p_next_draft_hash = v_prior.draft_hash
       and p_next_verification_status = v_prior.status
       and p_next_verification_hash is not distinct from v_prior.verification_hash
       and p_next_draft_snapshot = v_prior.draft_snapshot
       and p_next_verification_snapshot is not distinct from v_prior.verification_snapshot then
      v_next_revision := v_prior.revision;
    else
      v_next_revision := v_prior.revision + 1;
    end if;
    update public.consumer_packet_verifications v set
      status = p_next_verification_status,
      reason = p_next_verification_reason,
      verification_hash = p_next_verification_hash,
      verification_snapshot = p_next_verification_snapshot,
      draft_hash = p_next_draft_hash,
      draft_snapshot = p_next_draft_snapshot,
      revision = v_next_revision,
      invalidated_at = p_next_verification_invalidated_at,
      updated_at = now()
    where v.briefcase_item_id = p_briefcase_item_id;
  else
    if p_expected_prior_revision <> 0 or p_expected_prior_hash is not null then return; end if;
    -- Revision zero belongs only to the unsaved claim seed. Every first
    -- persisted snapshot consumes it, including empty-delta semantic changes.
    v_next_revision := 1;
    insert into public.consumer_packet_verifications (
      briefcase_item_id, consumer_auth_user_id, matter_id, status, reason,
      verification_hash, verification_snapshot, draft_hash, draft_snapshot,
      revision, invalidated_at
    ) values (
      p_briefcase_item_id, p_consumer_auth_user_id,
      public.consumer_matter_id_for_briefcase_item(p_briefcase_item_id),
      p_next_verification_status, p_next_verification_reason,
      p_next_verification_hash, p_next_verification_snapshot,
      p_next_draft_hash, p_next_draft_snapshot, v_next_revision,
      p_next_verification_invalidated_at
    );
  end if;

  -- Project only known object-shaped answer maps. A malformed/unknown legacy
  -- shape is preserved rather than traversed as an array or silently erased.
  v_draft_display := p_next_draft_snapshot;
  v_snapshot_display := p_next_verification_snapshot;
  v_metadata_display := p_packet_information_metadata;
  foreach v_answer_map in array array['screeningAnswers','prefilledAnswers','packetAnswers'] loop
    if jsonb_typeof(v_draft_display -> v_answer_map) = 'object' then
      v_draft_display := v_draft_display #- array[v_answer_map,'social_security_number'];
    end if;
    if jsonb_typeof(v_snapshot_display -> v_answer_map) = 'object' then
      v_snapshot_display := v_snapshot_display #- array[v_answer_map,'social_security_number'];
    end if;
  end loop;
  -- A superseded contact answer is retained only in protected authority. It
  -- is historical context, not another active answer or summary field.
  if jsonb_typeof(v_draft_display #> '{dependencies,contactRepresentation}') = 'object' then
    v_draft_display := v_draft_display #- '{dependencies,contactRepresentation,legacyAnswers}';
  end if;
  if jsonb_typeof(v_snapshot_display #> '{dependencies,contactRepresentation}') = 'object' then
    v_snapshot_display := v_snapshot_display #- '{dependencies,contactRepresentation,legacyAnswers}';
  end if;
  if jsonb_typeof(v_draft_display -> 'dependencies') = 'object' then
    v_draft_display := v_draft_display #- '{dependencies,packetDerivations}';
    v_draft_display := v_draft_display #- '{dependencies,semanticAnswerHistory}';
    v_draft_display := v_draft_display #- '{dependencies,recordFactConfirmations}';
    v_draft_display := v_draft_display #- '{dependencies,accountContactSources}';
    v_draft_display := v_draft_display #- '{dependencies,courtCompletionImplications}';
  end if;
  if jsonb_typeof(v_snapshot_display -> 'dependencies') = 'object' then
    v_snapshot_display := v_snapshot_display #- '{dependencies,packetDerivations}';
    v_snapshot_display := v_snapshot_display #- '{dependencies,semanticAnswerHistory}';
    v_snapshot_display := v_snapshot_display #- '{dependencies,recordFactConfirmations}';
    v_snapshot_display := v_snapshot_display #- '{dependencies,accountContactSources}';
    v_snapshot_display := v_snapshot_display #- '{dependencies,courtCompletionImplications}';
  end if;
  if jsonb_typeof(v_metadata_display -> 'prefilledAnswers') = 'object' then
    v_metadata_display := v_metadata_display #- '{prefilledAnswers,social_security_number}';
  end if;

  v_verification_display := jsonb_strip_nulls(jsonb_build_object(
    'status', p_next_verification_status,
    'reason', p_next_verification_reason,
    'hash', p_next_verification_hash,
    'snapshot', v_snapshot_display,
    'draftHash', p_next_draft_hash,
    'draftSnapshot', v_draft_display,
    'revision', v_next_revision,
    'invalidatedAt', p_next_verification_invalidated_at
  ));
  update public.consumer_briefcase_items i set
    summary_json = jsonb_set(
      coalesce(i.summary_json, '{}'::jsonb),
      '{commercialFlow}',
      coalesce(i.summary_json -> 'commercialFlow', '{}'::jsonb)
        || jsonb_build_object(
          'packetInformation', v_metadata_display,
          'verification', v_verification_display
        ),
      true
    ),
    packet_status = case
      when p_next_verification_status <> 'verified' and i.packet_status in ('ready', 'downloaded') then 'pending'
      else i.packet_status
    end,
    updated_at = now()
  where i.id = p_briefcase_item_id;

  return query select v.status, v.reason, v.verification_hash, v.verification_snapshot,
      v.draft_hash, v.draft_snapshot, v.revision,
      case when v.invalidated_at is null then null else v.invalidated_at::text end
    from public.consumer_packet_verifications v
    where v.briefcase_item_id = p_briefcase_item_id;
end;
$persist$;

commit;
