-- Behavioural tests for phase-49-rcap-packet-render-jobs.sql.
--
-- Run against an ephemeral local PostgreSQL only. Never against a remote or
-- production database. scripts/verify-rcap-packet-render-jobs.mjs provisions a
-- throwaway cluster, applies the migration and runs this file.
--
-- Every assertion raises on failure, so a passing run means each invariant was
-- exercised rather than assumed. The invariant that matters most is the last
-- group: a sponsored credit cannot move without validated, stored bytes.

\set ON_ERROR_STOP on

begin;

create temporary table t_ids (packet_id uuid, job_id uuid);

insert into public.partner_records(partner_slug) values ('we-must-vote') on conflict do nothing;
insert into public.rcap_partner_packet_allocation(partner_slug, packets_allowed)
values ('we-must-vote', 2)
on conflict (partner_slug) do update set packets_allowed = 2;

insert into public.rcap_document_packets default values;
insert into t_ids(packet_id) select id from public.rcap_document_packets limit 1;

-------------------------------------------------------------------------------
-- 1. A job is born queued.
-------------------------------------------------------------------------------
do $$
declare v_packet uuid; v_status text;
begin
  select packet_id into v_packet from t_ids;
  insert into public.packet_render_jobs
    (packet_id, route_id, renderer_kind, source_sha256, profile_id, profile_version, input_hash)
  values
    (v_packet, 'ms-expungement', 'pdf_lib',
     repeat('a', 64), 'ms-petition', '1.0.0', repeat('b', 64));

  select status into v_status from public.packet_render_jobs where packet_id = v_packet;
  if v_status <> 'queued' then
    raise exception 'expected queued, got %', v_status;
  end if;
  update t_ids set job_id = (select id from public.packet_render_jobs where packet_id = v_packet);
end $$;

-------------------------------------------------------------------------------
-- 2. Idempotency: a duplicate live job for the same inputs is refused.
-------------------------------------------------------------------------------
do $$
declare v_packet uuid; v_failed boolean := false;
begin
  select packet_id into v_packet from t_ids;
  begin
    insert into public.packet_render_jobs
      (packet_id, route_id, renderer_kind, source_sha256, profile_id, profile_version, input_hash)
    values
      (v_packet, 'ms-expungement', 'pdf_lib',
       repeat('a', 64), 'ms-petition', '1.0.0', repeat('b', 64));
  exception when unique_violation then
    v_failed := true;
  end;
  if not v_failed then
    raise exception 'duplicate live job for identical inputs was accepted';
  end if;
end $$;

-------------------------------------------------------------------------------
-- 3. The status machine refuses a jump straight to a creditable state.
-------------------------------------------------------------------------------
do $$
declare v_job uuid; v_failed boolean := false;
begin
  select job_id into v_job from t_ids;
  begin
    update public.packet_render_jobs set status = 'artifact_validated' where id = v_job;
  exception when others then
    v_failed := true;
  end;
  if not v_failed then
    raise exception 'illegal transition queued -> artifact_validated was permitted';
  end if;
end $$;

-------------------------------------------------------------------------------
-- 4. Validated status is unreachable without stored output, even in sequence.
-------------------------------------------------------------------------------
do $$
declare v_job uuid; v_failed boolean := false;
begin
  select job_id into v_job from t_ids;
  update public.packet_render_jobs set status = 'claimed', claimed_by = 'w1' where id = v_job;
  update public.packet_render_jobs set status = 'rendering' where id = v_job;
  update public.packet_render_jobs set status = 'validating' where id = v_job;
  begin
    -- No output_storage_path / output_sha256 set.
    update public.packet_render_jobs set status = 'artifact_validated' where id = v_job;
  exception when check_violation then
    v_failed := true;
  end;
  if not v_failed then
    raise exception 'artifact_validated reached with no stored output';
  end if;
end $$;

-------------------------------------------------------------------------------
-- 5. Credit is refused while the job is not validated.
-------------------------------------------------------------------------------
do $$
declare v_job uuid; r record;
begin
  select job_id into v_job from t_ids;
  select * into r from public.consume_rcap_packet_credit('we-must-vote', 'matter-1', v_job);
  if r.ok then
    raise exception 'credit moved for a job that is not validated';
  end if;
  if r.reason <> 'artifact_not_validated' then
    raise exception 'expected artifact_not_validated, got %', r.reason;
  end if;
end $$;

-------------------------------------------------------------------------------
-- 6. With stored bytes, the job validates and credit moves exactly once.
-------------------------------------------------------------------------------
do $$
declare v_job uuid; r record; v_used integer;
begin
  select job_id into v_job from t_ids;
  update public.packet_render_jobs
  set status = 'artifact_validated',
      output_storage_path = 'rcap-document-packets-private/ms/packet.pdf',
      output_sha256 = repeat('c', 64),
      normalized_output_sha256 = repeat('d', 64),
      page_count = 4
  where id = v_job;

  select * into r from public.consume_rcap_packet_credit('we-must-vote', 'matter-1', v_job);
  if not r.ok or r.reason <> 'consumed' then
    raise exception 'first consumption failed: ok=% reason=%', r.ok, r.reason;
  end if;
  if r.consumption_class <> 'included' then
    raise exception 'expected included, got %', r.consumption_class;
  end if;

  -- Retry the same matter: must not spend a second unit.
  select * into r from public.consume_rcap_packet_credit('we-must-vote', 'matter-1', v_job);
  if not r.ok or r.reason <> 'already_consumed' then
    raise exception 'retry did not report already_consumed: %', r.reason;
  end if;

  select count(*) into v_used from public.rcap_packet_credit_consumptions
  where partner_slug = 'we-must-vote';
  if v_used <> 1 then
    raise exception 'retry double-counted: % units', v_used;
  end if;
end $$;

-------------------------------------------------------------------------------
-- 7. A distinct matter consumes its own unit; the reserve then engages.
-------------------------------------------------------------------------------
do $$
declare v_job uuid; r record;
begin
  select job_id into v_job from t_ids;

  select * into r from public.consume_rcap_packet_credit('we-must-vote', 'matter-2', v_job);
  if r.consumption_class <> 'included' then
    raise exception 'matter-2 expected included, got %', r.consumption_class;
  end if;

  -- Allocation is 2, so the third distinct matter falls into the continuity
  -- reserve: delivered, non-billable, never shown to the partner as capacity.
  select * into r from public.consume_rcap_packet_credit('we-must-vote', 'matter-3', v_job);
  if not r.ok or r.consumption_class <> 'overage' then
    raise exception 'matter-3 expected overage, got ok=% class=%', r.ok, r.consumption_class;
  end if;
end $$;

-------------------------------------------------------------------------------
-- 8. The reserve is finite: nothing past allocation + 10 is consumable.
-------------------------------------------------------------------------------
do $$
declare v_job uuid; r record; i integer;
begin
  select job_id into v_job from t_ids;
  -- Fill to allocation(2) + reserve(10) = 12 total consumptions.
  for i in 4..12 loop
    select * into r from public.consume_rcap_packet_credit(
      'we-must-vote', 'matter-' || i::text, v_job);
    if not r.ok then
      raise exception 'matter-% unexpectedly refused: %', i, r.reason;
    end if;
  end loop;

  select * into r from public.consume_rcap_packet_credit('we-must-vote', 'matter-13', v_job);
  if r.ok then
    raise exception 'consumption past the reserve ceiling was permitted';
  end if;
  if r.reason <> 'reserve_exhausted' then
    raise exception 'expected reserve_exhausted, got %', r.reason;
  end if;
end $$;

-------------------------------------------------------------------------------
-- 9. A partner with no allocation row fails closed.
-------------------------------------------------------------------------------
do $$
declare v_job uuid; r record;
begin
  select job_id into v_job from t_ids;
  insert into public.partner_records(partner_slug) values ('no-contract') on conflict do nothing;
  select * into r from public.consume_rcap_packet_credit('no-contract', 'matter-x', v_job);
  if r.ok then
    raise exception 'a partner with no allocation consumed credit';
  end if;
  if r.reason <> 'no_allocation' then
    raise exception 'expected no_allocation, got %', r.reason;
  end if;
end $$;

-------------------------------------------------------------------------------
-- 10. Atomic claim hands one job to one worker.
-------------------------------------------------------------------------------
do $$
declare v_packet uuid; v_claimed integer; v_second integer;
begin
  select packet_id into v_packet from t_ids;
  insert into public.packet_render_jobs
    (packet_id, route_id, renderer_kind, source_sha256, profile_id, profile_version, input_hash)
  values
    (v_packet, 'ms-expungement', 'pdf_lib',
     repeat('a', 64), 'ms-petition', '1.0.0', repeat('e', 64));

  select count(*) into v_claimed
  from public.claim_packet_render_job('worker-1', array['pdf_lib']);
  if v_claimed <> 1 then
    raise exception 'expected to claim exactly 1 job, claimed %', v_claimed;
  end if;

  -- Queue is now empty for that kind: a second worker gets nothing.
  select count(*) into v_second
  from public.claim_packet_render_job('worker-2', array['pdf_lib']);
  if v_second <> 0 then
    raise exception 'a second worker claimed an already-claimed job';
  end if;

  -- A worker that does not support the kind is never handed the work.
  select count(*) into v_second
  from public.claim_packet_render_job('worker-3', array['xfa_isolated']);
  if v_second <> 0 then
    raise exception 'a job was dispatched to a worker of the wrong renderer kind';
  end if;
end $$;

rollback;
