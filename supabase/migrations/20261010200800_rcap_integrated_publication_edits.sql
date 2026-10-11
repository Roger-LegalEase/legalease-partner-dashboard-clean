begin;

-- The contact collection alias must not shadow the surrounding PL/pgSQL
-- patch variable. Keep stable IDs, tenant checks and soft deletion intact.
do $migration$
declare definition text;
 old_value text := $old$jsonb_array_elements(proposed->'contacts') item where item->>'stable_row_id'=c.id::text$old$;
 new_value text := $new$jsonb_array_elements(proposed->'contacts') as contact_entry(value) where contact_entry.value->>'stable_row_id'=c.id::text$new$;
begin
 definition:=pg_get_functiondef('public.rcap_service_save_program_configuration(text,uuid,bigint,jsonb,uuid)'::regprocedure);
 if (length(definition)-length(replace(definition,old_value,'')))/length(old_value)<>1 then raise exception 'Contact collection alias anchor changed';end if;
 execute replace(definition,old_value,new_value);
end $migration$;

-- Reuse the existing configuration transaction and protected launch. Editing a
-- published scope requires explicit acknowledgment that new entry is held.
-- Participant records, historical publication receipts, and approvals remain.
create function public.rcap_service_save_program_configuration(
 p_slug text,p_actor uuid,p_version bigint,p_changes jsonb,p_request uuid,p_confirm_publication_hold boolean
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; before_scope text; before_summary text; before_page text; saved jsonb;
begin
 select * into strict w from public.partner_onboarding where partner_slug=p_slug for update;
 -- This read checks the actual actor and workspace before any temporary state.
 perform public.rcap_service_get_program_configuration(p_slug,p_actor);
 if w.rcap_policy_version<>'rcap2.2' or w.status<>'live' or jsonb_array_length(p_changes)=0 then
  return public.rcap_service_save_program_configuration(p_slug,p_actor,p_version,p_changes,p_request);
 end if;
 if not coalesce(p_confirm_publication_hold,false) then raise exception 'rcap_publication_hold_confirmation' using errcode='55000';end if;
 if w.aggregate_version<>p_version then raise exception 'configuration revision conflict' using errcode='PT409';end if;
 before_scope:=public.rcap_program_launch_scope(w.id);
 before_summary:=public.rcap_program_material_scope(w.id,'implementation_brief');
 before_page:=public.rcap_program_material_scope(w.id,'co_branded_page_configuration');
 -- Uncommitted status is visible only inside this transaction. Existing field,
 -- financial, identity, tenant and external-rights checks still run below.
 update public.partner_onboarding set status='ready_to_launch',landing_page_ready=false where id=w.id;
 saved:=public.rcap_service_save_program_configuration(p_slug,p_actor,p_version,p_changes,p_request);
 if before_scope=public.rcap_program_launch_scope(w.id)
   and before_summary=public.rcap_program_material_scope(w.id,'implementation_brief')
   and before_page=public.rcap_program_material_scope(w.id,'co_branded_page_configuration') then
  update public.partner_onboarding set status=w.status,landing_page_ready=w.landing_page_ready where id=w.id;
 else
  insert into public.partner_events(partner_slug,event_type,event_label,event_payload)
   values(p_slug,'rcap_program_publication_held_for_configuration','Public entry held for reviewed program changes',
    jsonb_build_object('workspaceId',w.id,'actor',p_actor,'requestId',p_request,'previousLaunchOperation',w.rcap_launch_operation_id,
     'previousScopeHash',before_scope,'currentScopeHash',public.rcap_program_launch_scope(w.id),'sourceVersion',saved->'version'));
 end if;
 return public.rcap_service_get_program_configuration(p_slug,p_actor);
end $$;
revoke all on function public.rcap_service_save_program_configuration(text,uuid,bigint,jsonb,uuid,boolean) from public,anon,authenticated;
grant execute on function public.rcap_service_save_program_configuration(text,uuid,bigint,jsonb,uuid,boolean) to service_role;

-- A retained section endpoint cannot bypass the explicit publication hold.
do $migration$
declare definition text; anchor text:='  select coalesce(v_workspace.partner_record_id, pr.id)';
begin
 definition:=pg_get_functiondef('public.rcap_service_save_onboarding_section(text,uuid,uuid,text,bigint,bigint,jsonb,jsonb,text,integer,text[],integer,text,text,text,uuid,text)'::regprocedure);
 if (length(definition)-length(replace(definition,anchor,'')))/length(anchor)<>1 then raise exception 'Section publication guard anchor changed';end if;
 execute replace(definition,anchor,$guard$
  if v_workspace.rcap_policy_version='rcap2.2' and v_workspace.status='live' then
   raise exception 'Use canonical Program configuration to review changes to a live program' using errcode='55000';
  end if;
$guard$||anchor);
end $migration$;

do $migration$
declare definition text; anchor text:=' if w.status in (''paused'',''closed'') then';
begin
 definition:=pg_get_functiondef('public.rcap_service_save_program_configuration(text,uuid,bigint,jsonb,uuid)'::regprocedure);
 if (length(definition)-length(replace(definition,anchor,'')))/length(anchor)<>1 then raise exception 'Configuration publication guard anchor changed';end if;
 execute replace(definition,anchor,$guard$
 if w.rcap_policy_version='rcap2.2' and w.status='live' and jsonb_array_length(p_changes)>0 then
  -- The deployed five-argument Save remains a valid mutation during rollback.
  -- Route it through the same atomic hold; this grants no publication approval.
  -- The six-argument caller still requires its explicit UI acknowledgment.
  return public.rcap_service_save_program_configuration(p_slug,p_actor,p_version,p_changes,p_request,true);
 end if;
$guard$||anchor);
end $migration$;

-- A prior confirmation does not make a missing/stale artifact current. Preserve
-- its audit and source identity, but require the two usable materials for setup.
do $migration$
declare definition text; old_value text := $old$'setupComplete',(confirmation_ok and (not managed or internal_ok))$old$;
begin
 definition:=pg_get_functiondef('public.rcap_service_evaluate_program(text,uuid,text)'::regprocedure);
 if position(old_value in definition)>0 then
  execute replace(definition,old_value,$new$'setupComplete',(materials_ok and confirmation_ok and (not managed or internal_ok))$new$);
 elsif position($new$'setupComplete',(materials_ok and confirmation_ok and (not managed or internal_ok))$new$ in definition)=0 then
  raise exception 'program readiness anchor changed';
 end if;
end $migration$;
commit;
