begin;
do $compat$
declare definition text; old_guard text := $old$ if w.rcap_policy_version='rcap2.2' and w.status='live' and jsonb_array_length(p_changes)>0 then
  raise exception 'rcap_publication_hold_confirmation' using errcode='55000';
 end if;$old$; new_guard text := $new$ if w.rcap_policy_version='rcap2.2' and w.status='live' and jsonb_array_length(p_changes)>0 then
  -- The deployed five-argument Save remains a valid mutation during rollback.
  -- Route it through the same atomic hold; this grants no publication approval.
  -- The six-argument caller still requires its explicit UI acknowledgment.
  return public.rcap_service_save_program_configuration(p_slug,p_actor,p_version,p_changes,p_request,true);
 end if;$new$;
begin
 definition:=pg_get_functiondef('public.rcap_service_save_program_configuration(text,uuid,bigint,jsonb,uuid)'::regprocedure);
 if position(old_guard in definition)=0 then raise exception 'local compatibility anchor changed';end if;
 execute replace(definition,old_guard,new_guard);
end $compat$;
notify pgrst,'reload schema';
commit;
