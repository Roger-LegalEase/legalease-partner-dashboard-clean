-- Focused native test. Load the existing real-launch baseline into a fresh local database first.
-- No acceptance/Production database or pre-existing fixture may be used.
do $$begin
 if current_database() not like 'b_managed_capacity_%' then raise exception 'Fresh isolated managed-capacity test database required';end if;
end $$;
begin;
insert into auth.users(id,email) values
 ('361d0746-6e49-430c-9ac2-afa39ea5bdff','native-admin@local.test'),
 ('81000000-0000-4000-8000-000000000099','native-partner@local.test');
insert into public.partner_records(id,partner_id,partner_slug,partner_name,program_tier,payment_status) values
 ('81000000-0000-4000-8000-000000000001','native-managed','native-managed','Local managed allocation fixture','pilot','unpaid'),
 ('81000000-0000-4000-8000-000000000002','native-partner','native-partner','Local partner allocation fixture','pilot','unpaid'),
 ('81000000-0000-4000-8000-000000000003','native-clinic','native-clinic','Local unrelated allocation fixture','pilot','unpaid');
insert into public.partner_users(auth_user_id,partner_slug,role,status) values
 ('361d0746-6e49-430c-9ac2-afa39ea5bdff',null,'internal_admin','active'),
 ('81000000-0000-4000-8000-000000000099','native-partner','partner_admin','active');
insert into public.partner_onboarding(id,partner_slug,partner_record_id,status,operating_model,rcap_policy_version,commercial_gate_status,commercial_gate_override_reason) values
 ('82000000-0000-4000-8000-000000000001','native-managed','81000000-0000-4000-8000-000000000001','setup_in_progress','legalease_managed','rcap2.2','cleared_by_authorized_internal_override','Local test setup only; no real payment.'),
 ('82000000-0000-4000-8000-000000000002','native-partner','81000000-0000-4000-8000-000000000002','setup_in_progress','partner_managed','rcap2.2','cleared_by_authorized_internal_override','Local test setup only; no real payment.');
insert into public.partner_onboarding_sections(workspace_id,section_key,response_data) values
 ('82000000-0000-4000-8000-000000000001','program_goals','{"service_mode":"sponsored_packets","operator_authority_reference":"Authorized local internal test allocation"}');
insert into public.partner_entitlement(partner_slug,screenings_allowed,screenings_used,contract_note) values('native-clinic',2,1,'Unrelated Clinic allocation retained');
insert into public.partner_packet_entitlement(id,partner_id,entitlement_scope,packet_cap,contract_note) values
 ('83000000-0000-4000-8000-000000000003','81000000-0000-4000-8000-000000000003','sponsored_packets',2,'Unrelated Clinic packet unit retained');
commit;
-- END FIXTURE PRELUDE

create temp table managed_capacity_proof_cache(key text primary key,value jsonb);
insert into managed_capacity_proof_cache values('unrelated',(select jsonb_build_object(
 'screening',(select to_jsonb(e) from public.partner_entitlement e where partner_slug='native-clinic'),
 'packet',(select to_jsonb(e) from public.partner_packet_entitlement e where id='83000000-0000-4000-8000-000000000003'))));
-- Every DO is its own transaction, like each real RPC request.
do $$declare failed boolean:=false;begin
 begin perform public.rcap_service_configure_launch_capacity('native-managed','81000000-0000-4000-8000-000000000099',null,null,1,1,'Unauthorized local request','84000000-0000-4000-8000-000000000099',1);
 exception when insufficient_privilege then failed:=true;end;
 if not failed then raise exception 'Unauthorized actor accepted';end if;
 raise notice 'PASS actual internal actor revalidation refuses partner actor';
end $$;
do $$begin
 perform public.rcap_service_configure_launch_capacity('native-managed','361d0746-6e49-430c-9ac2-afa39ea5bdff',null,null,1,1,'Authorized local internal test allocation','84000000-0000-4000-8000-000000000001',1);
 if (select count(*) from public.rcap_launch_capacity_events where workspace_id='82000000-0000-4000-8000-000000000001' and actor_auth_user_id='361d0746-6e49-430c-9ac2-afa39ea5bdff' and document_id is null and document_hash is null)<>1 then raise exception 'Actual internal event missing';end if;
 if (select packet_cap from public.partner_packet_entitlement where partner_id='81000000-0000-4000-8000-000000000001')<>1 then raise exception 'One packet allocation missing';end if;
 if not public.rcap_program_funding_valid('82000000-0000-4000-8000-000000000001') then raise exception 'Internal managed allocation is not recognized';end if;
 if (select aggregate_version from public.partner_onboarding where id='82000000-0000-4000-8000-000000000001')<>2 then raise exception 'Normal version did not advance once';end if;
 raise notice 'PASS managed one-unit allocation writes real internal event and funding validator accepts it without external agreement';
end $$;
do $$begin
 perform public.rcap_service_configure_launch_capacity('native-managed','361d0746-6e49-430c-9ac2-afa39ea5bdff',null,null,1,1,'Authorized local internal test allocation','84000000-0000-4000-8000-000000000001',1);
 if (select count(*) from public.rcap_launch_capacity_events where workspace_id='82000000-0000-4000-8000-000000000001')<>1 or (select aggregate_version from public.partner_onboarding where id='82000000-0000-4000-8000-000000000001')<>2 then raise exception 'Exact replay created another allocation';end if;
 raise notice 'PASS lost-response exact request replay survives advanced current version without another write';
end $$;
do $$declare failed boolean:=false;begin
 begin perform public.rcap_service_configure_launch_capacity('native-managed','361d0746-6e49-430c-9ac2-afa39ea5bdff',null,null,1,2,'Authorized local internal test allocation','84000000-0000-4000-8000-000000000001',1);
 exception when others then if sqlerrm<>'capacity request binding conflict' then raise;end if;failed:=true;end;
 if not failed then raise exception 'Changed request binding accepted';end if;
 failed:=false;
 begin perform public.rcap_service_configure_launch_capacity('native-managed','361d0746-6e49-430c-9ac2-afa39ea5bdff',null,null,1,1,'Authorized local internal test allocation','84000000-0000-4000-8000-000000000002',1);
 exception when others then if sqlerrm<>'publication or source changed' then raise;end if;failed:=true;end;
 if not failed then raise exception 'Stale new request accepted';end if;
 raise notice 'PASS changed replay binding and stale new request refused by actual SQL';
end $$;
do $$declare failed boolean:=false;begin
 begin perform public.rcap_service_configure_launch_capacity('native-partner','361d0746-6e49-430c-9ac2-afa39ea5bdff',null,null,1,1,'Partner cannot use managed document bypass','84000000-0000-4000-8000-000000000003',1);
 exception when others then if sqlerrm<>'current signed procurement authority required' then raise;end if;failed:=true;end;
 if not failed or exists(select 1 from public.rcap_launch_capacity_events where workspace_id='82000000-0000-4000-8000-000000000002') or exists(select 1 from public.partner_packet_entitlement where partner_id='81000000-0000-4000-8000-000000000002') then raise exception 'Partner procurement refusal not atomic';end if;
 raise notice 'PASS partner-managed missing documents refused with no allocation or audit leak';
end $$;
-- Existing usage is separate from capacity and must survive a subsequent authorized change.
update public.partner_entitlement set screenings_used=1 where partner_slug='native-managed';
insert into public.rcap_persons(id,partner_slug,match_key) values('85000000-0000-4000-8000-000000000001','native-managed','local-fixture-only');
insert into public.rcap_document_packets(id,partner_slug,pathway,safety_disclaimer) values('86000000-0000-4000-8000-000000000001','native-managed','non_conviction','Local fixture, not a legal output.');
insert into public.packet_render_jobs(id,packet_id,route_id,renderer_kind,source_sha256,profile_id,profile_version,input_hash) values
 ('87000000-0000-4000-8000-000000000001','86000000-0000-4000-8000-000000000001','MS:fixture','fixture',repeat('a',64),'fixture','fixture',repeat('b',64));
insert into public.packet_credit_ledger(entitlement_id,partner_id,person_id,matter_id,render_job_id,event_type,consumption_unit_hash)
 select id,partner_id,'85000000-0000-4000-8000-000000000001','88000000-0000-4000-8000-000000000001','87000000-0000-4000-8000-000000000001','consumed',repeat('c',64)
 from public.partner_packet_entitlement where partner_id='81000000-0000-4000-8000-000000000001';
insert into managed_capacity_proof_cache values('ledger',(select jsonb_agg(to_jsonb(l) order by id) from public.packet_credit_ledger l));
do $$begin
 perform public.rcap_service_configure_launch_capacity('native-managed','361d0746-6e49-430c-9ac2-afa39ea5bdff',null,null,2,2,'Authorized local capacity increase retaining used unit','84000000-0000-4000-8000-000000000004',2);
 if (select screenings_used from public.partner_entitlement where partner_slug='native-managed')<>1 then raise exception 'Screening usage overwritten';end if;
 if (select jsonb_agg(to_jsonb(l) order by id) from public.packet_credit_ledger l) is distinct from (select value from managed_capacity_proof_cache where key='ledger') then raise exception 'Consumed ledger history changed';end if;
 if (select jsonb_build_object('screening',(select to_jsonb(e) from public.partner_entitlement e where partner_slug='native-clinic'),'packet',(select to_jsonb(e) from public.partner_packet_entitlement e where id='83000000-0000-4000-8000-000000000003'))) is distinct from (select value from managed_capacity_proof_cache where key='unrelated') then raise exception 'Unrelated Clinic allocation changed';end if;
 if not public.rcap_program_funding_valid('82000000-0000-4000-8000-000000000001') then raise exception 'Latest internal capacity event not recognized';end if;
 raise notice 'PASS normal usage/consumed ledger and unrelated Clinic allocation preserved';
end $$;
do $$declare failed boolean:=false;begin
 update public.partner_users set status='disabled' where auth_user_id='361d0746-6e49-430c-9ac2-afa39ea5bdff';
 if public.rcap_program_funding_valid('82000000-0000-4000-8000-000000000001') then raise exception 'Revoked internal actor still grants funding';end if;
 begin perform public.rcap_service_configure_launch_capacity('native-managed','361d0746-6e49-430c-9ac2-afa39ea5bdff',null,null,3,3,'Inactive actor must be refused','84000000-0000-4000-8000-000000000005',3);
 exception when insufficient_privilege then failed:=true;end;
 if not failed then raise exception 'Inactive actor allocated access';end if;
 raise notice 'PASS funding and mutation revalidate actual active internal operator';
end $$;
