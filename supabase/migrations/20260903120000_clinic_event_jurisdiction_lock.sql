-- Optional event-level jurisdiction lock for bounded Clinic Mode events.
-- Existing nationwide events remain nullable and unchanged. The participant
-- assistance endpoint treats a populated value as server-owned authority.

begin;

alter table public.clinic_events
  add column if not exists jurisdiction text
  check (jurisdiction is null or (jurisdiction = upper(jurisdiction) and length(jurisdiction) between 2 and 3));

comment on column public.clinic_events.jurisdiction is
  'Optional server-enforced jurisdiction for a bounded clinic event; null keeps nationwide selection.';

-- Keep the existing event-creation authority boundary and add one optional,
-- server-owned jurisdiction argument. The old signature remains available for
-- deployments whose callers have not adopted the lock yet.
create or replace function public.clinic_create_event(
  p_actor_user_id uuid, p_partner_slug text, p_public_slug text, p_name text,
  p_starts_at timestamptz, p_ends_at timestamptz, p_timezone text,
  p_location_name text, p_geography text, p_capacity integer,
  p_sponsorship_allocation integer, p_jurisdiction text
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if p_jurisdiction is not null and (p_jurisdiction <> upper(p_jurisdiction) or length(p_jurisdiction) not between 2 and 3) then
    raise exception 'clinic_event_jurisdiction_invalid';
  end if;
  if not exists (
    select 1 from public.partner_users pu where pu.auth_user_id = p_actor_user_id
      and pu.status = 'active'
      and ((pu.role = 'internal_admin' and pu.partner_slug is null)
        or (pu.role = 'partner_admin' and pu.partner_slug = p_partner_slug))
  ) then raise exception 'clinic_event_forbidden'; end if;
  insert into public.clinic_events(
    partner_slug, public_slug, name, starts_at, ends_at, timezone,
    location_name, geography, jurisdiction, capacity, sponsorship_allocation, created_by
  ) values (
    p_partner_slug, lower(trim(p_public_slug)), trim(p_name), p_starts_at, p_ends_at,
    trim(p_timezone), trim(p_location_name), trim(p_geography), p_jurisdiction,
    p_capacity, p_sponsorship_allocation, p_actor_user_id
  ) returning id into v_id;
  insert into public.clinic_event_audit(event_id, actor_user_id, action, target_type, target_id)
  values (v_id, p_actor_user_id, 'event_created', 'event', v_id);
  return v_id;
end $$;

revoke all on function public.clinic_create_event(uuid,text,text,text,timestamptz,timestamptz,text,text,text,integer,integer,text) from public, anon, authenticated;
grant execute on function public.clinic_create_event(uuid,text,text,text,timestamptz,timestamptz,text,text,text,integer,integer,text) to service_role;

commit;
