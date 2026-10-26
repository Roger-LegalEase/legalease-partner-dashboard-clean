-- GA-22: event assignment alone is not participant consent. Keep participant
-- ownership and existing administrator authority; restrict assisted access to
-- the selected active staff identity and the exact, unexpired consent session.
begin;

create or replace function public.clinic_staff_session_access(
  p_session uuid, p_actor uuid, p_permission text
) returns boolean language sql stable security definer set search_path = ''
as $$
  select (p_actor = auth.uid() or auth.role() = 'service_role') and exists (
    select 1 from public.clinic_assisted_sessions s
    join public.clinic_event_staff es on es.id=s.event_staff_id and es.event_id=s.event_id
    join public.clinic_events e on e.id=s.event_id
    join public.partner_users u on u.id=es.partner_user_id and u.partner_slug=e.partner_slug
    where s.id=p_session and s.status in ('active','handed_off') and s.expires_at>now()
      and s.consented_at is not null and s.consent_version is not null
      and es.status='approved' and 'assist'=any(es.permissions) and p_permission=any(es.permissions)
      and u.auth_user_id=p_actor and u.status='active' and u.role in ('partner_staff','partner_admin')
  )
$$;
revoke all on function public.clinic_staff_session_access(uuid,uuid,text) from public,anon;
grant execute on function public.clinic_staff_session_access(uuid,uuid,text) to authenticated,service_role;

drop policy clinic_assisted_sessions_scoped_read on public.clinic_assisted_sessions;
create policy clinic_assisted_sessions_scoped_read on public.clinic_assisted_sessions for select to authenticated
using (public.clinic_is_internal_admin() or
  (status in ('active','handed_off') and expires_at>now() and
    (participant_user_id=auth.uid() or public.clinic_staff_session_access(id,auth.uid(),'assist'))));

drop policy clinic_cases_scoped_read on public.clinic_cases;
create policy clinic_cases_scoped_read on public.clinic_cases for select to authenticated
using (participant_user_id=auth.uid() or public.clinic_is_internal_admin()
  or (public.clinic_current_role()='partner_admin' and public.clinic_can_read_event(event_id))
  or public.clinic_staff_session_access(assisted_session_id,auth.uid(),'queue'));

-- Preserve the current queue material/verification guards and historical
-- function bodies. Refuse an unexpected predecessor instead of replacing it.
do $migration$
declare definition text; anchor text;
begin
  definition:=pg_get_functiondef('public.clinic_get_event_queue(uuid,uuid)'::regprocedure);
  if position('clinic_staff_session_access' in definition)=0 then
    anchor:='and s.status in (''active'',''handed_off'') and s.expires_at>now()';
    if position(anchor in definition)=0 then raise exception 'clinic queue consent predecessor changed'; end if;
    execute replace(definition,anchor,anchor||' and public.clinic_staff_session_access(s.id,p_actor_user_id,''queue'')');
  end if;
  definition:=pg_get_functiondef('public.clinic_transition_case(uuid,uuid,text,uuid,timestamptz)'::regprocedure);
  if position('clinic_staff_session_access' in definition)=0 then
    anchor:='  if p_follow_up_owner_staff_id is not null';
    if position(anchor in definition)=0 then raise exception 'clinic transition consent predecessor changed'; end if;
    execute replace(definition,anchor,$guard$  if not exists (
      select 1 from public.clinic_events e join public.partner_users u on u.auth_user_id=p_actor_user_id and u.status='active'
      where e.id=v_case.event_id and ((u.role='internal_admin' and u.partner_slug is null)
        or (u.role='partner_admin' and u.partner_slug=e.partner_slug))
    ) and not public.clinic_staff_session_access(v_case.assisted_session_id,p_actor_user_id,'queue') then return 'forbidden'; end if;
$guard$||anchor);
  end if;
end $migration$;
notify pgrst, 'reload schema';
commit;
