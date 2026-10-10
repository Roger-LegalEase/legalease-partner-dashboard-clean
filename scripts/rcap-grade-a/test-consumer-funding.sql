-- Existing isolated authenticated-browser fixture; changes roll back.
begin;
do $test$
declare
 item uuid:='4d1672bf-9d80-44b9-9700-019aa777d4e2'; owner_id uuid; workspace uuid; original_goals jsonb;
begin
 if current_database()<>'rcap' then raise exception 'Use the isolated RCAP database only'; end if;
 select i.user_id,w.id into strict owner_id,workspace from public.consumer_briefcase_items i
 join public.consumer_pending_screening_results s on s.pending_id=i.source_pending_result_id
 join public.partner_onboarding w on w.partner_slug=s.partner_slug where i.id=item;
 if not public.rcap_consumer_packet_authorized(item,owner_id) then raise exception 'Owned screening-only matter incorrectly treated as sponsored'; end if;
 if not public.clinic_packet_dtc_authorized(item,owner_id) then raise exception 'Old application compatibility check refused legitimate consumer channel'; end if;
 if public.clinic_packet_capacity_dtc_authorized(item,owner_id) then raise exception 'Screening-only matter falsely represented as exhausted Clinic sponsorship'; end if;
 if public.rcap_consumer_packet_authorized(item,gen_random_uuid()) then raise exception 'Other owner admitted'; end if;
 if public.rcap_consumer_packet_authorized(gen_random_uuid(),owner_id) then raise exception 'Unknown matter admitted'; end if;
 if has_function_privilege('anon','public.rcap_consumer_packet_authorized(uuid,uuid)','execute')
 or has_function_privilege('authenticated','public.rcap_consumer_packet_authorized(uuid,uuid)','execute')
 or has_function_privilege('anon','public.clinic_packet_capacity_dtc_authorized(uuid,uuid)','execute')
 or has_function_privilege('authenticated','public.clinic_packet_capacity_dtc_authorized(uuid,uuid)','execute') then raise exception 'Private funding authority exposed'; end if;
 select response_data into original_goals from public.partner_onboarding_sections where workspace_id=workspace and section_key='program_goals';
 update public.partner_onboarding_sections set revision=revision+1,response_data=jsonb_set(response_data,'{service_mode}','"sponsored_packets"') where workspace_id=workspace and section_key='program_goals';
 if public.rcap_consumer_packet_authorized(item,owner_id) then raise exception 'Sponsored scope silently made consumer-paid'; end if;
 update public.partner_onboarding_sections set revision=revision+1,response_data=jsonb_set(response_data,'{service_mode}','"participant_paid"') where workspace_id=workspace and section_key='program_goals';
 if public.rcap_consumer_packet_authorized(item,owner_id) then raise exception 'Unreviewed changed service scope admitted'; end if;
 update public.partner_onboarding_sections set revision=revision+1,response_data=original_goals where workspace_id=workspace and section_key='program_goals';
 update public.partner_onboarding set operating_model='partner_managed' where id=workspace;
 if public.rcap_consumer_packet_authorized(item,owner_id) then raise exception 'Independent partner rights bypassed'; end if;
 raise notice 'PASS: source/owner-bound consumer classification; sponsored and independent partner refusals; private RPCs; old-app compatibility; no false capacity claim';
end;
$test$;
rollback;
