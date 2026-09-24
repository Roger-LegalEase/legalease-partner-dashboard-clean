-- Preserve existing durable attribution when publishing validated artifact metadata.
-- Forward-only successor to the September 24 delivery correction. No row backfill,
-- history rewrite, default locale, privilege change or authority-check change.
begin;

do $publisher_precondition$
declare
  v_source_md5 text;
begin
  select md5(p.prosrc) into v_source_md5
  from pg_catalog.pg_proc p
  where p.oid = pg_catalog.to_regprocedure('public.publish_validated_consumer_render_artifact()');
  if v_source_md5 is null or v_source_md5 not in (
    'ed59bd717ea5b193e3f791c9e94353e7', -- legitimate prior publisher
    'c0af97726dedbd21018ab10e307bca18'  -- this idempotent successor
  ) then
    raise exception 'unrecognized current authority: publish_validated_consumer_render_artifact';
  end if;
end;
$publisher_precondition$;

create or replace function public.publish_validated_consumer_render_artifact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $publish$
declare
  v_verification text;
  v_valid_payment boolean;
  v_artifact jsonb;
begin
  if new.partner_id is not null
     or new.consumer_auth_user_id is null
     or new.consumer_briefcase_item_id is null
     or new.matter_id is null
     or new.consumer_verification_hash is null
     or new.status not in ('artifact_validated', 'delivered')
     or new.delivery_eligibility <> 'eligible'
     or new.accounting_result not in ('zero_charge', 'consumed', 'already_consumed', 'overage_consumed')
     or new.output_storage_path is null
     or new.output_sha256 !~ '^[a-f0-9]{64}$' then
    return new;
  end if;

  select v.verification_hash into v_verification
  from public.consumer_packet_verifications v
  where v.briefcase_item_id = new.consumer_briefcase_item_id
    and v.consumer_auth_user_id = new.consumer_auth_user_id
    and v.status = 'verified'
  for update;
  if v_verification is null or v_verification is distinct from new.consumer_verification_hash then
    return new;
  end if;

  select a.valid into v_valid_payment
  from public.consumer_packet_payment_authority(
    new.consumer_briefcase_item_id,
    new.consumer_auth_user_id,
    public.expungement_packet_product_id(),
    new.person_id,
    new.matter_id
  ) a;
  if not coalesce(v_valid_payment, false) then return new; end if;

  if new.output_storage_path not like
       'packet-artifacts/consumer/' || new.matter_id::text || '/' || new.id::text || '/' || new.output_sha256 || '.pdf'
     or position('..' in new.output_storage_path) > 0 then
    return new;
  end if;

  v_artifact := jsonb_build_object(
    'provider', 'rcap_durable_render_v1',
    'source', 'verified_render_job',
    'packetId', new.packet_id,
    'renderJobId', new.id,
    'artifactSha256', new.output_sha256,
    'storagePath', new.output_storage_path,
    'fileName', 'record-clearing-packet.pdf',
    'contentType', 'application/pdf',
    'generatedAt', new.artifact_validated_at,
    'downloadPath', '/api/expungement-ai/packet/download-link?briefcaseItemId=' || new.consumer_briefcase_item_id::text,
    'pageCount', new.page_count
  );

  insert into public.consumer_packet_artifact_provenance(
    briefcase_item_id, consumer_auth_user_id, matter_id, render_job_id,
    verification_hash, entitlement_source, artifact
  ) values (
    new.consumer_briefcase_item_id, new.consumer_auth_user_id, new.matter_id,
    new.id, new.consumer_verification_hash, 'consumer_payment', v_artifact
    ) on conflict on constraint consumer_packet_artifact_provenance_pkey do update
    set render_job_id = excluded.render_job_id,
        verification_hash = excluded.verification_hash,
        artifact = excluded.artifact
    where consumer_packet_artifact_provenance.consumer_auth_user_id = excluded.consumer_auth_user_id
      and consumer_packet_artifact_provenance.matter_id = excluded.matter_id
      and consumer_packet_artifact_provenance.entitlement_source = excluded.entitlement_source
      and consumer_packet_artifact_provenance.verification_hash is distinct from excluded.verification_hash;

  if exists (
    select 1 from public.consumer_packet_artifact_provenance p
    where p.briefcase_item_id = new.consumer_briefcase_item_id
      and p.consumer_auth_user_id = new.consumer_auth_user_id
      and p.matter_id = new.matter_id
      and p.render_job_id = new.id
      and p.verification_hash = new.consumer_verification_hash
      and p.artifact = v_artifact
  ) then
    update public.consumer_briefcase_items i
    set artifact_refs_json = v_artifact || case
          when i.artifact_refs_json ? 'attribution'
            then jsonb_build_object('attribution', i.artifact_refs_json -> 'attribution')
          else '{}'::jsonb
        end,
        packet_status = 'ready', updated_at = now()
    where i.id = new.consumer_briefcase_item_id
      and i.user_id = new.consumer_auth_user_id;
  end if;
  return new;
end;
$publish$;

commit;
