-- Supporting evidence must be uploadable while an unpublished RCAP 2 program
-- is waiting on that evidence. This grants no service, signature or funding.
begin;
do $migration$
declare
  signature regprocedure := 'public.rcap_service_record_onboarding_asset(text,uuid,uuid,uuid,bigint,text,text,text,text,text,text,bigint,integer,integer,text,text,integer,text,text,text,uuid)'::regprocedure;
  definition text;
  previous text := $old$if v_workspace.commercial_gate_status = 'blocked'
     or v_workspace.status not in ('setup_in_progress', 'waiting_on_partner') then$old$;
  replacement text := $new$if (v_workspace.commercial_gate_status = 'blocked'
     or v_workspace.status not in ('setup_in_progress', 'waiting_on_partner'))
     and not (v_workspace.rcap_policy_version is not distinct from 'rcap2.2'
       and p_category = 'procurement_document'
       and v_workspace.status not in ('live','paused','closed')
       and v_workspace.landing_page_ready is false) then$new$;
begin
  select pg_get_functiondef(signature) into definition;
  if (length(definition)-length(replace(definition,previous,'')))/length(previous) <> 1 then
    raise exception 'Supporting-document edit guard has changed; review required';
  end if;
  execute replace(definition,previous,replacement);
end;
$migration$;
commit;
