-- Isolated database engineering proof; all mutations roll back. Not browser acceptance.
begin;
set local role service_role;
do $test$
declare
 slug text := 'integrated-create-mv2rpos3';
 actor uuid := '5ddd55e0-634f-4a5e-ab98-c790d6bf1df8';
 before jsonb; saved jsonb; replay jsonb; request uuid := gen_random_uuid();
begin
 if current_database()<>'rcap' then raise exception 'Use the existing isolated RCAP database only';end if;
 before:=public.rcap_service_get_program_configuration(slug,actor);
 if before->>'status'<>'live' then raise exception 'The compatibility fixture must already be live';end if;
 saved:=public.rcap_service_save_program_configuration(slug,actor,(before->>'version')::bigint,
  jsonb_build_array(jsonb_build_object('section','organization_contacts','base',before#>'{data,organization_contacts}',
   'values',jsonb_build_object('website','https://rollback-compatible.example.test'))),request);
 if saved->>'status'<>'ready_to_launch' then raise exception 'Legacy Save must hold changed public materials';end if;
 if saved#>>'{data,organization_contacts,website}'<>'https://rollback-compatible.example.test' then raise exception 'Legacy Save was not persisted/read back';end if;
 if public.rcap_partner_activation_for_launch(slug) then raise exception 'Changed unreviewed source remained public';end if;
 replay:=public.rcap_service_save_program_configuration(slug,actor,(before->>'version')::bigint,
  jsonb_build_array(jsonb_build_object('section','organization_contacts','base',before#>'{data,organization_contacts}',
   'values',jsonb_build_object('website','https://rollback-compatible.example.test'))),request);
 if replay->>'version'<>saved->>'version' then raise exception 'Legacy retry wrote another version';end if;
 raise notice 'PASS: five-argument deployed Save persists and holds source atomically; retry preserves one revision; no publication is granted';
end $test$;
rollback;
begin;
set local role service_role;
do $test$
declare c jsonb;
begin
 c:=public.rcap_service_get_program_configuration('integrated-create-mv2rpos3','5ddd55e0-634f-4a5e-ab98-c790d6bf1df8');
 begin
  perform public.rcap_service_save_program_configuration('integrated-create-mv2rpos3','5ddd55e0-634f-4a5e-ab98-c790d6bf1df8',(c->>'version')::bigint,
    jsonb_build_array(jsonb_build_object('section','organization_contacts','base',c#>'{data,organization_contacts}','values',jsonb_build_object('website','https://unconfirmed.example.test'))),gen_random_uuid(),false);
  raise exception 'New caller bypassed its explicit live-edit acknowledgment';
 exception when sqlstate '55000' then
  if sqlerrm<>'rcap_publication_hold_confirmation' then raise;end if;
 end;
 if public.rcap_service_get_program_configuration('integrated-create-mv2rpos3','5ddd55e0-634f-4a5e-ab98-c790d6bf1df8')<>c then raise exception 'Denied edit mutated the workspace';end if;
 raise notice 'PASS: new caller still requires acknowledgment; denied save preserves the live workspace';
end $test$;
rollback;
