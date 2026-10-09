-- Proposed application operation; not applied to Production. Existing actor guards remain unchanged.
create or replace function public.rcap_service_invalidate_affected_launch_checks(
  p_partner_slug text,
  p_workspace_id uuid,
  p_check_keys text[],
  p_reason text
)
returns table (
  invalidated_count integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_reason is null or char_length(btrim(p_reason)) = 0 then
    raise exception 'invalidation_reason_required' using errcode = '22023';
  end if;

  with updated as (
    update public.partner_onboarding_launch_checks c
    set invalidated_at = now(),
        invalidated_reason = p_reason
    from public.partner_onboarding po
    where c.workspace_id = p_workspace_id
      and po.id = c.workspace_id
      and po.partner_slug = p_partner_slug
      and c.invalidated_at is null
      and c.status in ('passing', 'waived', 'not_applicable')
      and c.check_key = any(p_check_keys)
    returning c.id
  )
  select count(*)::integer into v_count from updated;

  if v_count > 0 then
    insert into public.partner_onboarding_activity (
      workspace_id, event_type, owner_type, summary_code, status_code
    )
    values (
      p_workspace_id, 'launch_check_invalidated', 'system',
      'affected_checks',
      'source_changed'
    );
  end if;

  invalidated_count := v_count;
  return next;
end;
$$;
revoke execute on function public.rcap_service_invalidate_affected_launch_checks(text,uuid,text[],text) from public,anon,authenticated;
grant execute on function public.rcap_service_invalidate_affected_launch_checks(text,uuid,text[],text) to service_role;
