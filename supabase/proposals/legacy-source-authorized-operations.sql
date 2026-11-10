-- REVIEWABLE ONLY. Target: wwtwtsmywnckfkdaqqeg/public; Root/V1 must bind the actual connection outside SQL.
-- Extracts the two canonical Q1 ALTERs only; it does not install an erasure processor or certify deletion.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
select pg_advisory_xact_lock(hashtextextended('legalease:q1:source-column-prerequisite',0));
do $preflight$
begin
 if not exists(select 1 from pg_proc where oid=to_regprocedure('public.participant_account_is_blocked(uuid)') and md5(prosrc)='c692f8609240879c9d99afb375f427ad' and prosecdef and pg_get_userbyid(proowner)='postgres') then raise exception 'actual tombstone predicate changed'; end if;
 if (select jsonb_agg(jsonb_build_object('column',attname,'type',format_type(atttypid,atttypmod),'nullable',not attnotnull) order by attname) from pg_attribute where attrelid='public.rcap_document_packets'::regclass and attnum>0 and not attisdropped) is distinct from $old$[{"column":"agency_case_number","type":"text","nullable":true},{"column":"arrest_date","type":"text","nullable":true},{"column":"arrest_or_case_numbers","type":"text","nullable":true},{"column":"arresting_agency","type":"text","nullable":true},{"column":"briefcase_id","type":"uuid","nullable":true},{"column":"cannabis_signal","type":"boolean","nullable":true},{"column":"cause_number","type":"text","nullable":true},{"column":"charge","type":"text","nullable":true},{"column":"completed_at","type":"timestamp with time zone","nullable":true},{"column":"conviction_date","type":"text","nullable":true},{"column":"cook_county_district","type":"text","nullable":true},{"column":"county","type":"text","nullable":true},{"column":"county_court_instructions","type":"text[]","nullable":false},{"column":"court_county","type":"text","nullable":true},{"column":"court_name","type":"text","nullable":true},{"column":"court_type","type":"text","nullable":true},{"column":"created_at","type":"timestamp with time zone","nullable":false},{"column":"date_of_birth_private_placeholder","type":"text","nullable":true},{"column":"disposition","type":"text","nullable":true},{"column":"disposition_date","type":"text","nullable":true},{"column":"document_type","type":"text","nullable":true},{"column":"education_waiver_signal","type":"boolean","nullable":true},{"column":"excluded_offense_screening","type":"boolean","nullable":true},{"column":"excluded_offense_signal","type":"boolean","nullable":true},{"column":"filing_instructions","type":"text[]","nullable":false},{"column":"first_offender_signal","type":"boolean","nullable":true},{"column":"gender_private_placeholder","type":"text","nullable":true},{"column":"generated_html","type":"text","nullable":true},{"column":"generated_plain_text","type":"text","nullable":true},{"column":"has_court_documents","type":"boolean","nullable":true},{"column":"has_rap_sheet","type":"boolean","nullable":true},{"column":"has_zero_balance","type":"boolean","nullable":true},{"column":"id","type":"uuid","nullable":false},{"column":"intake_session_id","type":"uuid","nullable":true},{"column":"jurisdiction","type":"text","nullable":true},{"column":"missing_fields","type":"text[]","nullable":false},{"column":"needs_rap_sheet","type":"boolean","nullable":true},{"column":"needs_record_review","type":"boolean","nullable":false},{"column":"non_traffic_signal","type":"boolean","nullable":true},{"column":"offense_date","type":"text","nullable":true},{"column":"one_felony_expungement_signal","type":"boolean","nullable":true},{"column":"other_names_used","type":"text","nullable":true},{"column":"partner_slug","type":"text","nullable":false},{"column":"pathway","type":"text","nullable":false},{"column":"person_id","type":"uuid","nullable":true},{"column":"petitioner_city","type":"text","nullable":true},{"column":"petitioner_county","type":"text","nullable":true},{"column":"petitioner_first_name","type":"text","nullable":true},{"column":"petitioner_last_name","type":"text","nullable":true},{"column":"qualified_probation_completed_date","type":"text","nullable":true},{"column":"race_private_placeholder","type":"text","nullable":true},{"column":"relief_outcome","type":"text","nullable":false},{"column":"remedy_type","type":"text","nullable":true},{"column":"safety_disclaimer","type":"text","nullable":false},{"column":"sentence_completion_date","type":"text","nullable":true},{"column":"sentence_termination_date","type":"text","nullable":true},{"column":"state","type":"text","nullable":false},{"column":"status","type":"text","nullable":false},{"column":"supervision_completed_date","type":"text","nullable":true},{"column":"updated_at","type":"timestamp with time zone","nullable":false},{"column":"user_id","type":"uuid","nullable":true}]$old$::jsonb then raise exception 'exact source packet preimage differs; no unknown-column adoption'; end if;
 if not exists(select 1 from pg_proc where oid=to_regprocedure('public.freeze_participant_account(uuid,text,uuid)') and md5(prosrc)='1dbe4acc0f0a5425ad5e6d8722729f13' and prosecdef and pg_get_userbyid(proowner)='postgres') then raise exception 'installed freeze predecessor changed';end if;
 if to_regprocedure('public.persist_source_document_packet(jsonb,text,jsonb,jsonb,jsonb)') is not null then raise exception 'canonical writer already exists; qualify exact body, no overwrite';end if;
 if to_regclass('public.participant_legal_holds') is null or to_regclass('public.participant_privacy_requests') is null or to_regclass('public.rcap_persons') is null or to_regclass('public.rcap_briefcase_items') is null then raise exception 'canonical writer prerequisites absent; no empty-hold or owner default';end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='rcap_document_packets' and policyname='rcap_document_packets_select_own_partner' and cmd='SELECT' and qual='false' and roles=array['authenticated']::name[]) then raise exception 'current PhaseA held policy preimage missing; no reopening';end if;
 if (select jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'type',data_type,'udt',udt_name,'nullable',is_nullable,'default',column_default) order by table_name,column_name) from information_schema.columns where table_schema='public' and table_name in ('participant_legal_holds','participant_privacy_requests','rcap_persons','rcap_briefcase_items','rcap_record_events','rcap_document_packet_inputs')) is distinct from $six$[{"udt":"uuid","type":"uuid","table":"participant_legal_holds","column":"id","default":"gen_random_uuid()","nullable":"NO"},{"udt":"uuid","type":"uuid","table":"participant_legal_holds","column":"matter_scope_item_id","default":null,"nullable":"YES"},{"udt":"timestamptz","type":"timestamp with time zone","table":"participant_legal_holds","column":"placed_at","default":"now()","nullable":"NO"},{"udt":"text","type":"text","table":"participant_legal_holds","column":"placed_by","default":null,"nullable":"NO"},{"udt":"text","type":"text","table":"participant_legal_holds","column":"reason","default":null,"nullable":"NO"},{"udt":"timestamptz","type":"timestamp with time zone","table":"participant_legal_holds","column":"released_at","default":null,"nullable":"YES"},{"udt":"text","type":"text","table":"participant_legal_holds","column":"released_by","default":null,"nullable":"YES"},{"udt":"uuid","type":"uuid","table":"participant_legal_holds","column":"user_id","default":null,"nullable":"NO"},{"udt":"int4","type":"integer","table":"participant_privacy_requests","column":"attempt_count","default":"0","nullable":"NO"},{"udt":"timestamptz","type":"timestamp with time zone","table":"participant_privacy_requests","column":"completed_at","default":null,"nullable":"YES"},{"udt":"jsonb","type":"jsonb","table":"participant_privacy_requests","column":"completion_receipt","default":null,"nullable":"YES"},{"udt":"timestamptz","type":"timestamp with time zone","table":"participant_privacy_requests","column":"created_at","default":"now()","nullable":"NO"},{"udt":"text","type":"text","table":"participant_privacy_requests","column":"failure_code","default":null,"nullable":"YES"},{"udt":"uuid","type":"uuid","table":"participant_privacy_requests","column":"id","default":"gen_random_uuid()","nullable":"NO"},{"udt":"text","type":"text","table":"participant_privacy_requests","column":"idempotency_key","default":null,"nullable":"NO"},{"udt":"text","type":"text","table":"participant_privacy_requests","column":"last_error","default":null,"nullable":"YES"},{"udt":"bool","type":"boolean","table":"participant_privacy_requests","column":"legal_hold_active","default":null,"nullable":"YES"},{"udt":"timestamptz","type":"timestamp with time zone","table":"participant_privacy_requests","column":"legal_hold_checked_at","default":null,"nullable":"YES"},{"udt":"text","type":"text","table":"participant_privacy_requests","column":"legal_hold_reason","default":null,"nullable":"YES"},{"udt":"text","type":"text","table":"participant_privacy_requests","column":"receipt_code","default":null,"nullable":"YES"},{"udt":"text","type":"text","table":"participant_privacy_requests","column":"recent_auth_method","default":null,"nullable":"YES"},{"udt":"text","type":"text","table":"participant_privacy_requests","column":"recent_auth_proof_hash","default":null,"nullable":"YES"},{"udt":"timestamptz","type":"timestamp with time zone","table":"participant_privacy_requests","column":"recent_auth_verified_at","default":null,"nullable":"YES"},{"udt":"text","type":"text","table":"participant_privacy_requests","column":"request_type","default":null,"nullable":"NO"},{"udt":"timestamptz","type":"timestamp with time zone","table":"participant_privacy_requests","column":"requested_at","default":"now()","nullable":"NO"},{"udt":"jsonb","type":"jsonb","table":"participant_privacy_requests","column":"retention_treatment","default":"'{}'::jsonb","nullable":"NO"},{"udt":"text","type":"text","table":"participant_privacy_requests","column":"status","default":"'pending'::text","nullable":"NO"},{"udt":"text","type":"text","table":"participant_privacy_requests","column":"subject_pseudonym","default":null,"nullable":"YES"},{"udt":"uuid","type":"uuid","table":"participant_privacy_requests","column":"target_matter_item_id","default":null,"nullable":"YES"},{"udt":"timestamptz","type":"timestamp with time zone","table":"participant_privacy_requests","column":"updated_at","default":"now()","nullable":"NO"},{"udt":"uuid","type":"uuid","table":"participant_privacy_requests","column":"user_id","default":null,"nullable":"NO"},{"udt":"text","type":"text","table":"rcap_briefcase_items","column":"county","default":null,"nullable":"YES"},{"udt":"timestamptz","type":"timestamp with time zone","table":"rcap_briefcase_items","column":"created_at","default":"now()","nullable":"NO"},{"udt":"uuid","type":"uuid","table":"rcap_briefcase_items","column":"document_packet_id","default":null,"nullable":"YES"},{"udt":"text","type":"text","table":"rcap_briefcase_items","column":"document_type","default":null,"nullable":"YES"},{"udt":"uuid","type":"uuid","table":"rcap_briefcase_items","column":"id","default":"gen_random_uuid()","nullable":"NO"},{"udt":"uuid","type":"uuid","table":"rcap_briefcase_items","column":"intake_session_id","default":null,"nullable":"YES"},{"udt":"text","type":"text","table":"rcap_briefcase_items","column":"item_type","default":null,"nullable":"NO"},{"udt":"timestamptz","type":"timestamp with time zone","table":"rcap_briefcase_items","column":"last_opened_at","default":null,"nullable":"YES"},{"udt":"text","type":"text","table":"rcap_briefcase_items","column":"partner_slug","default":null,"nullable":"NO"},{"udt":"text","type":"text","table":"rcap_briefcase_items","column":"state","default":null,"nullable":"YES"},{"udt":"text","type":"text","table":"rcap_briefcase_items","column":"status","default":null,"nullable":"NO"},{"udt":"text","type":"text","table":"rcap_briefcase_items","column":"title","default":null,"nullable":"NO"},{"udt":"timestamptz","type":"timestamp with time zone","table":"rcap_briefcase_items","column":"updated_at","default":"now()","nullable":"NO"},{"udt":"uuid","type":"uuid","table":"rcap_briefcase_items","column":"user_id","default":null,"nullable":"YES"},{"udt":"timestamptz","type":"timestamp with time zone","table":"rcap_document_packet_inputs","column":"created_at","default":"now()","nullable":"NO"},{"udt":"uuid","type":"uuid","table":"rcap_document_packet_inputs","column":"document_packet_id","default":null,"nullable":"NO"},{"udt":"uuid","type":"uuid","table":"rcap_document_packet_inputs","column":"id","default":"gen_random_uuid()","nullable":"NO"},{"udt":"jsonb","type":"jsonb","table":"rcap_document_packet_inputs","column":"input_payload","default":"'{}'::jsonb","nullable":"NO"},{"udt":"uuid","type":"uuid","table":"rcap_document_packet_inputs","column":"intake_session_id","default":null,"nullable":"YES"},{"udt":"text","type":"text","table":"rcap_document_packet_inputs","column":"partner_slug","default":null,"nullable":"NO"},{"udt":"timestamptz","type":"timestamp with time zone","table":"rcap_document_packet_inputs","column":"updated_at","default":"now()","nullable":"NO"},{"udt":"timestamptz","type":"timestamp with time zone","table":"rcap_persons","column":"created_at","default":"now()","nullable":"NO"},{"udt":"uuid","type":"uuid","table":"rcap_persons","column":"id","default":"gen_random_uuid()","nullable":"NO"},{"udt":"text","type":"text","table":"rcap_persons","column":"match_key","default":null,"nullable":"NO"},{"udt":"text","type":"text","table":"rcap_persons","column":"partner_slug","default":null,"nullable":"NO"},{"udt":"text","type":"text","table":"rcap_record_events","column":"actor","default":"'system'::text","nullable":"NO"},{"udt":"text","type":"text","table":"rcap_record_events","column":"event_type","default":null,"nullable":"NO"},{"udt":"text","type":"text","table":"rcap_record_events","column":"from_status","default":null,"nullable":"YES"},{"udt":"uuid","type":"uuid","table":"rcap_record_events","column":"id","default":"gen_random_uuid()","nullable":"NO"},{"udt":"jsonb","type":"jsonb","table":"rcap_record_events","column":"metadata","default":null,"nullable":"YES"},{"udt":"timestamptz","type":"timestamp with time zone","table":"rcap_record_events","column":"occurred_at","default":"now()","nullable":"NO"},{"udt":"text","type":"text","table":"rcap_record_events","column":"partner_id","default":null,"nullable":"YES"},{"udt":"text","type":"text","table":"rcap_record_events","column":"partner_slug","default":null,"nullable":"NO"},{"udt":"text","type":"text","table":"rcap_record_events","column":"record_id","default":null,"nullable":"NO"},{"udt":"text","type":"text","table":"rcap_record_events","column":"record_type","default":null,"nullable":"NO"},{"udt":"text","type":"text","table":"rcap_record_events","column":"to_status","default":null,"nullable":"YES"}]$six$::jsonb then raise exception 'actual canonical writer table columns drifted';end if;
 if to_regprocedure('public.legacy_source_lock_accounts(uuid,uuid)') is not null or to_regprocedure('public.legacy_source_scope_current(uuid,uuid,text,uuid,uuid)') is not null or to_regprocedure('public.read_authorized_source_document_packet(uuid,uuid,uuid,jsonb)') is not null or to_regprocedure('public.persist_authorized_source_document_packet(uuid,uuid,jsonb,text,jsonb,jsonb,jsonb)') is not null then raise exception 'authorized source routines already exist; no replacement';end if;
end $preflight$;
alter table public.rcap_document_packets add column participant_erased_at timestamptz;
alter table public.rcap_document_packets add column participant_access_ended_at timestamptz;
comment on column public.rcap_document_packets.participant_erased_at is 'LegalEase: Q1 source-document erasure columns prerequisite 20261110; no erasure performed';
comment on column public.rcap_document_packets.participant_access_ended_at is 'LegalEase: Q1 source-document erasure columns prerequisite 20261110; no erasure performed';

CREATE OR REPLACE FUNCTION public.freeze_participant_account(p_user_id uuid, p_subject_pseudonym text, p_request_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
  insert into public.participant_account_tombstones (user_id, subject_pseudonym, request_id)
  values (p_user_id, p_subject_pseudonym, p_request_id)
  on conflict (user_id) do update
    set request_id = coalesce(public.participant_account_tombstones.request_id, excluded.request_id),
        restoration_barrier = true,
        updated_at = now();
end;
$function$;

create or replace function public.persist_source_document_packet(
 p_packet jsonb,p_person_match_key text,p_input jsonb,p_event jsonb,p_briefcase jsonb)
returns boolean language plpgsql security definer set search_path='' as $q1$
declare
 v_packet public.rcap_document_packets%rowtype;
 v_input public.rcap_document_packet_inputs%rowtype;
 v_briefcase public.rcap_briefcase_items%rowtype;
 old_row public.rcap_document_packets%rowtype;
 created public.rcap_record_events%rowtype;
 n_created integer; subject uuid; item uuid; resolved_person uuid; previous_authority text; is_new boolean;
begin
 if p_packet is null or jsonb_typeof(p_packet)<>'object' or p_packet->>'id' is null
   or p_packet->>'partner_slug' is null or p_packet->>'partner_slug'='expungement-ai-consumer'
   or p_packet->>'state' not in ('MS','IL','DC','PA','TX') then
   raise exception 'Q1: invalid source packet';
 end if;
 select * into old_row from public.rcap_document_packets where id=(p_packet->>'id')::uuid;
 is_new:=not found;
 if not is_new and (old_row.participant_erased_at is not null or old_row.participant_access_ended_at is not null) then raise exception 'Q1: erased source cannot be restored';end if;
 select count(*) into n_created from public.rcap_record_events
   where record_type='document_packet' and record_id=((p_packet->>'id')::uuid)::text and event_type='created';
 if n_created>1 then raise exception 'Q1: duplicate source binding'; end if;
 if n_created=1 then
  select * into strict created from public.rcap_record_events where record_type='document_packet'
    and record_id=((p_packet->>'id')::uuid)::text and event_type='created';
  if p_event->>'event_type'='created' then raise exception 'Q1: created binding cannot be replaced'; end if;
 elsif p_event->>'event_type'='created' then
  created:=jsonb_populate_record(null::public.rcap_record_events,p_event);
 elsif is_new or old_row.created_at>='2026-11-04T04:40:14Z'::timestamptz then
  raise exception 'Q1: new source packet is missing its created binding';
 end if;
 if p_event is not null and (p_event->>'record_type' is distinct from 'document_packet'
    or p_event->>'record_id' is distinct from p_packet->>'id'
    or p_event->>'partner_slug' is distinct from p_packet->>'partner_slug'
    or p_event->'metadata'->>'source' is distinct from 'rcap_document_packet_repository'
    or p_event->>'actor' is distinct from 'system'
    or p_event->>'event_type' not in ('created','status_changed')) then
  raise exception 'Q1: source event disagrees with packet';
 end if;
 if created.metadata ? 'consumer_auth_user_id' or created.metadata ? 'consumer_briefcase_item_id' then
  if created.metadata->>'source' is distinct from 'rcap_document_packet_repository'
    or created.partner_slug is distinct from p_packet->>'partner_slug'
    or nullif(created.metadata->>'consumer_auth_user_id','') is null
    or nullif(created.metadata->>'consumer_briefcase_item_id','') is null then
   raise exception 'Q1: partial or foreign consumer source binding';
  end if;
  subject:=(created.metadata->>'consumer_auth_user_id')::uuid;
  item:=(created.metadata->>'consumer_briefcase_item_id')::uuid;
  perform pg_advisory_xact_lock(hashtextextended(subject::text,0));
  if not exists (select 1 from public.consumer_briefcase_items b
     join public.screening_sessions s on s.session_id::text=b.source_session_id
     where b.id=item and b.user_id=subject and s.partner_slug=p_packet->>'partner_slug')
    or public.participant_account_is_blocked(subject)
    or exists(select 1 from public.participant_legal_holds h where h.user_id=subject and h.released_at is null
       and (h.matter_scope_item_id is null or h.matter_scope_item_id=item))
    or exists (select 1 from public.participant_privacy_requests r where r.user_id=subject
      and r.status in ('pending','in_progress','failed','completed','blocked_legal_hold')
      and (r.request_type='account_deletion'
        or (r.request_type='matter_deletion' and r.target_matter_item_id=item))) then
   raise exception 'Q1: consumer source writer is fenced or ownership ended';
  end if;
 end if;
 if p_input is not null and (p_input->>'document_packet_id' is distinct from p_packet->>'id'
   or p_input->>'partner_slug' is distinct from p_packet->>'partner_slug'
   or p_input->>'intake_session_id' is distinct from p_packet->>'intake_session_id'
   or jsonb_typeof(p_input->'input_payload') is distinct from 'object') then
  raise exception 'Q1: source input binding disagrees';
 end if;
 if p_briefcase is not null and (p_briefcase->>'document_packet_id' is distinct from p_packet->>'id'
   or p_briefcase->>'partner_slug' is distinct from p_packet->>'partner_slug') then
  raise exception 'Q1: source briefcase binding disagrees';
 end if;
 -- Match-key creation happens only after the consumer/request fence, in this transaction.
 if nullif(p_packet->>'person_id','') is null and p_person_match_key is not null then
  if p_person_match_key not like 'email:%' and p_person_match_key not like 'name:%' then
   raise exception 'Q1: unsupported person match-key format';
  end if;
  insert into public.rcap_persons(partner_slug,match_key)
    values(p_packet->>'partner_slug',p_person_match_key)
    on conflict(partner_slug,match_key) do update set match_key=excluded.match_key
    returning id into resolved_person;
  p_packet:=jsonb_set(p_packet,'{person_id}',to_jsonb(resolved_person));
 elsif nullif(p_packet->>'person_id','') is not null and not exists (
  select 1 from public.rcap_persons where id=(p_packet->>'person_id')::uuid
    and partner_slug=p_packet->>'partner_slug'
 ) then raise exception 'Q1: person binding belongs to another source owner'; end if;
 select * into old_row from public.rcap_document_packets where id=(p_packet->>'id')::uuid for update;
 if found and (old_row.participant_erased_at is not null or old_row.participant_access_ended_at is not null) then
   raise exception 'Q1: source access ended while acquiring its write fence';end if;
 previous_authority:=current_setting('rcap.source_packet_mutation_authority',true);
 perform set_config('rcap.source_packet_mutation_authority','persist_source_packet',true);
  v_packet:=jsonb_populate_record(null::public.rcap_document_packets,p_packet);
  insert into public.rcap_document_packets (id,partner_slug,intake_session_id,user_id,briefcase_id,person_id,state,county,court_type,court_county,court_name,jurisdiction,document_type,pathway,status,relief_outcome,petitioner_first_name,petitioner_last_name,petitioner_city,petitioner_county,cause_number,charge,offense_date,arrest_date,arresting_agency,agency_case_number,disposition_date,conviction_date,sentence_completion_date,has_zero_balance,has_court_documents,first_offender_signal,non_traffic_signal,excluded_offense_screening,one_felony_expungement_signal,needs_record_review,generated_html,generated_plain_text,filing_instructions,county_court_instructions,missing_fields,safety_disclaimer,created_at,updated_at,completed_at) values (v_packet.id,v_packet.partner_slug,v_packet.intake_session_id,v_packet.user_id,v_packet.briefcase_id,v_packet.person_id,v_packet.state,v_packet.county,v_packet.court_type,v_packet.court_county,v_packet.court_name,v_packet.jurisdiction,v_packet.document_type,v_packet.pathway,v_packet.status,v_packet.relief_outcome,v_packet.petitioner_first_name,v_packet.petitioner_last_name,v_packet.petitioner_city,v_packet.petitioner_county,v_packet.cause_number,v_packet.charge,v_packet.offense_date,v_packet.arrest_date,v_packet.arresting_agency,v_packet.agency_case_number,v_packet.disposition_date,v_packet.conviction_date,v_packet.sentence_completion_date,v_packet.has_zero_balance,v_packet.has_court_documents,v_packet.first_offender_signal,v_packet.non_traffic_signal,v_packet.excluded_offense_screening,v_packet.one_felony_expungement_signal,v_packet.needs_record_review,v_packet.generated_html,v_packet.generated_plain_text,v_packet.filing_instructions,v_packet.county_court_instructions,v_packet.missing_fields,v_packet.safety_disclaimer,v_packet.created_at,v_packet.updated_at,v_packet.completed_at) on conflict (id) do update set partner_slug=excluded.partner_slug,intake_session_id=excluded.intake_session_id,user_id=excluded.user_id,briefcase_id=excluded.briefcase_id,person_id=excluded.person_id,state=excluded.state,county=excluded.county,court_type=excluded.court_type,court_county=excluded.court_county,court_name=excluded.court_name,jurisdiction=excluded.jurisdiction,document_type=excluded.document_type,pathway=excluded.pathway,status=excluded.status,relief_outcome=excluded.relief_outcome,petitioner_first_name=excluded.petitioner_first_name,petitioner_last_name=excluded.petitioner_last_name,petitioner_city=excluded.petitioner_city,petitioner_county=excluded.petitioner_county,cause_number=excluded.cause_number,charge=excluded.charge,offense_date=excluded.offense_date,arrest_date=excluded.arrest_date,arresting_agency=excluded.arresting_agency,agency_case_number=excluded.agency_case_number,disposition_date=excluded.disposition_date,conviction_date=excluded.conviction_date,sentence_completion_date=excluded.sentence_completion_date,has_zero_balance=excluded.has_zero_balance,has_court_documents=excluded.has_court_documents,first_offender_signal=excluded.first_offender_signal,non_traffic_signal=excluded.non_traffic_signal,excluded_offense_screening=excluded.excluded_offense_screening,one_felony_expungement_signal=excluded.one_felony_expungement_signal,needs_record_review=excluded.needs_record_review,generated_html=excluded.generated_html,generated_plain_text=excluded.generated_plain_text,filing_instructions=excluded.filing_instructions,county_court_instructions=excluded.county_court_instructions,missing_fields=excluded.missing_fields,safety_disclaimer=excluded.safety_disclaimer,updated_at=excluded.updated_at,completed_at=excluded.completed_at;
 if p_event is not null then
  insert into public.rcap_record_events
   (record_type,record_id,partner_slug,partner_id,event_type,from_status,to_status,actor,metadata)
  values (p_event->>'record_type',((p_event->>'record_id')::uuid)::text,p_event->>'partner_slug',
   p_event->>'partner_id',p_event->>'event_type',p_event->>'from_status',
   p_event->>'to_status',p_event->>'actor',p_event->'metadata');
 end if;
 if p_input is not null then
  v_input:=jsonb_populate_record(null::public.rcap_document_packet_inputs,p_input);
  insert into public.rcap_document_packet_inputs (document_packet_id,partner_slug,intake_session_id,input_payload) values (v_input.document_packet_id,v_input.partner_slug,v_input.intake_session_id,v_input.input_payload) on conflict (document_packet_id) do update set partner_slug=excluded.partner_slug,intake_session_id=excluded.intake_session_id,input_payload=excluded.input_payload;
 end if;
 if p_briefcase is not null then
  v_briefcase:=jsonb_populate_record(null::public.rcap_briefcase_items,p_briefcase);
  insert into public.rcap_briefcase_items (id,user_id,partner_slug,intake_session_id,document_packet_id,item_type,title,status,state,county,document_type,last_opened_at,updated_at) values (v_briefcase.id,v_briefcase.user_id,v_briefcase.partner_slug,v_briefcase.intake_session_id,v_briefcase.document_packet_id,v_briefcase.item_type,v_briefcase.title,v_briefcase.status,v_briefcase.state,v_briefcase.county,v_briefcase.document_type,v_briefcase.last_opened_at,v_briefcase.updated_at) on conflict (id) do update set user_id=excluded.user_id,partner_slug=excluded.partner_slug,intake_session_id=excluded.intake_session_id,document_packet_id=excluded.document_packet_id,item_type=excluded.item_type,title=excluded.title,status=excluded.status,state=excluded.state,county=excluded.county,document_type=excluded.document_type,last_opened_at=excluded.last_opened_at,updated_at=excluded.updated_at;
 end if;
 perform set_config('rcap.source_packet_mutation_authority',coalesce(previous_authority,''),true);
 return true;
end;
$q1$;

-- Scope is server-derived. Only the wrappers are granted to service_role, never anon/authenticated.
create function public.legacy_source_lock_accounts(p_owner uuid,p_actor uuid)
returns void language plpgsql security definer set search_path='' as $scope$
declare subject uuid;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'legacy scope requires a fresh read-committed snapshot';end if;
 for subject in select distinct v from unnest(array[p_owner,p_actor]) v where v is not null order by v loop
  perform pg_advisory_xact_lock(hashtextextended(subject::text,0));
 end loop;
end $scope$;

create function public.legacy_source_scope_current(p_owner uuid,p_actor uuid,p_partner text,p_matter uuid,p_case uuid)
returns boolean language plpgsql security definer set search_path='' as $scope$
declare c public.clinic_cases%rowtype;s public.clinic_assisted_sessions%rowtype;
 staff public.clinic_event_staff%rowtype;member public.partner_users%rowtype;e public.clinic_events%rowtype;
begin
 if p_owner is null or p_actor is null or public.participant_account_is_blocked(p_owner) or public.participant_account_is_blocked(p_actor) then return false;end if;
 if p_matter is not null then
  perform 1 from public.consumer_briefcase_items b join public.screening_sessions screen on screen.session_id::text=b.source_session_id
   where b.id=p_matter and b.user_id=p_owner and screen.partner_slug=p_partner for share of b,screen;
  if not found then return false;end if;
 end if;
 if p_actor=p_owner then return true;end if;
 if p_case is null or p_matter is null then return false;end if;
 -- Match the installed withdrawal's session-first row lock, after the canonical account barrier.
 select * into c from public.clinic_cases where id=p_case;
 if not found or c.assisted_session_id is null then return false;end if;
 select * into s from public.clinic_assisted_sessions where id=c.assisted_session_id for share;
 if not found then return false;end if;
 select * into c from public.clinic_cases where id=p_case for share;
 if not found or c.assisted_session_id<>s.id or c.participant_user_id<>p_owner or c.matter_id is distinct from p_matter
  or c.screening_session_id is distinct from s.screening_session_id or c.event_id<>s.event_id
  or s.participant_user_id<>p_owner or s.status not in ('active','handed_off') or s.ended_at is not null
  or s.expires_at<=clock_timestamp() or s.consented_at is null or s.consented_at>clock_timestamp()
  or s.consent_version<>'clinic-assistance-documents-v2' then return false;end if;
 select * into staff from public.clinic_event_staff where id=s.event_staff_id for share;
 if not found or staff.event_id<>c.event_id or staff.status<>'approved' or staff.revoked_at is not null or not('assist'=any(staff.permissions)) then return false;end if;
 select * into member from public.partner_users where id=staff.partner_user_id for share;
 if not found or member.auth_user_id<>p_actor or member.status<>'active' or member.role not in ('partner_staff','partner_admin') or member.partner_slug is distinct from p_partner then return false;end if;
 select * into e from public.clinic_events where id=c.event_id for share;
 if not found or e.partner_slug is distinct from p_partner or e.status not in ('published','paused') then return false;end if;
 perform 1 from public.consumer_briefcase_items b where b.id=p_matter and b.user_id=p_owner and b.source_session_id=s.screening_session_id::text for share;
 return found;
end $scope$;

create function public.read_authorized_source_document_packet(p_packet_id uuid,p_actor_user_id uuid,p_clinic_case_id uuid default null,p_job_claim jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $scope$
declare identity_row record;packet public.rcap_document_packets%rowtype;created public.rcap_record_events%rowtype;
 job public.packet_render_jobs%rowtype;subject uuid;actor uuid;matter uuid;n int;
begin
 -- Minimum stored identity is not returned. No packet body is loaded until the database scope passes.
 select user_id,partner_slug,created_at into identity_row from public.rcap_document_packets where id=p_packet_id and partner_slug<>'expungement-ai-consumer' and state in ('MS','IL','DC','PA','TX');
 if not found or identity_row.user_id is null then return null;end if;
 subject:=identity_row.user_id;actor:=p_actor_user_id;
 if p_job_claim is not null then
  if p_actor_user_id is not null or p_clinic_case_id is not null then return null;end if;
  actor:=subject;
 end if;
 if actor is null then return null;end if;
 perform public.legacy_source_lock_accounts(subject,actor);
 if p_job_claim is not null then
  select * into job from public.packet_render_jobs where id=(p_job_claim->>'id')::uuid
   and packet_id=p_packet_id and route_id=p_job_claim->>'routeId' and input_hash=p_job_claim->>'inputHash'
   and fencing_token=(p_job_claim->>'fencingToken')::uuid and status='rendering' and claim_expires_at>clock_timestamp() for share;
  if not found or coalesce(job.consumer_auth_user_id,job.sponsored_consumer_auth_user_id) is distinct from subject
   or (job.consumer_auth_user_id is not null and job.sponsored_consumer_auth_user_id is not null and job.consumer_auth_user_id<>job.sponsored_consumer_auth_user_id)
   or (job.consumer_briefcase_item_id is not null and job.sponsored_consumer_briefcase_item_id is not null and job.consumer_briefcase_item_id<>job.sponsored_consumer_briefcase_item_id) then return null;end if;
  matter:=coalesce(job.consumer_briefcase_item_id,job.sponsored_consumer_briefcase_item_id);
 end if;
 select count(*) into n from public.rcap_record_events where record_type='document_packet' and record_id=p_packet_id::text and event_type='created';
 if n>1 or (n=0 and identity_row.created_at>='2026-11-04T04:40:14Z'::timestamptz) then return null;end if;
 if n=1 then
  select * into created from public.rcap_record_events where record_type='document_packet' and record_id=p_packet_id::text and event_type='created' for share;
  if created.metadata ? 'consumer_auth_user_id' or created.metadata ? 'consumer_briefcase_item_id' then
   if created.metadata->>'source' is distinct from 'rcap_document_packet_repository' or created.partner_slug is distinct from identity_row.partner_slug
    or created.metadata->>'consumer_auth_user_id' is distinct from subject::text or nullif(created.metadata->>'consumer_briefcase_item_id','') is null then return null;end if;
   if p_job_claim is not null and matter is distinct from (created.metadata->>'consumer_briefcase_item_id')::uuid then return null;end if;
   matter:=(created.metadata->>'consumer_briefcase_item_id')::uuid;
  elsif p_actor_user_id is distinct from subject or matter is not null then return null;end if;
 elsif p_actor_user_id is distinct from subject or matter is not null then return null;end if;
 if not public.legacy_source_scope_current(subject,actor,identity_row.partner_slug,matter,p_clinic_case_id) then return null;end if;
 select * into packet from public.rcap_document_packets where id=p_packet_id and user_id=subject
  and partner_slug=identity_row.partner_slug and participant_erased_at is null and participant_access_ended_at is null for share;
 if not found then return null;end if;
 return to_jsonb(packet);
end $scope$;

create function public.persist_authorized_source_document_packet(
 p_actor_user_id uuid,p_clinic_case_id uuid,p_packet jsonb,p_person_match_key text,p_input jsonb,p_event jsonb,p_briefcase jsonb)
returns boolean language plpgsql security definer set search_path='' as $scope$
declare subject uuid;old_identity record;created public.rcap_record_events%rowtype;matter uuid;n int;is_new boolean;
begin
 subject:=nullif(p_packet->>'user_id','')::uuid;
 if subject is null or p_actor_user_id is null then raise exception 'legacy document scope refused' using errcode='42501';end if;
 perform public.legacy_source_lock_accounts(subject,p_actor_user_id);
 select user_id,partner_slug,state,intake_session_id,briefcase_id,person_id,participant_erased_at,participant_access_ended_at into old_identity
  from public.rcap_document_packets where id=(p_packet->>'id')::uuid;
 is_new:=not found;
 if not is_new and (old_identity.user_id is distinct from subject or old_identity.partner_slug is distinct from p_packet->>'partner_slug'
  or old_identity.state is distinct from p_packet->>'state' or old_identity.intake_session_id::text is distinct from p_packet->>'intake_session_id'
  or old_identity.briefcase_id::text is distinct from p_packet->>'briefcase_id' or old_identity.person_id::text is distinct from p_packet->>'person_id'
  or old_identity.participant_erased_at is not null or old_identity.participant_access_ended_at is not null) then
  raise exception 'legacy document scope refused' using errcode='42501';end if;
 select count(*) into n from public.rcap_record_events where record_type='document_packet' and record_id=p_packet->>'id' and event_type='created';
 if n>1 then raise exception 'legacy document scope refused' using errcode='42501';end if;
 if is_new then
  if p_event->>'event_type' is distinct from 'created' then raise exception 'legacy created binding required';end if;
  created:=jsonb_populate_record(null::public.rcap_record_events,p_event);
 elsif n=1 then
  select * into created from public.rcap_record_events where record_type='document_packet' and record_id=p_packet->>'id' and event_type='created' for share;
 end if;
 if created.metadata ? 'consumer_auth_user_id' or created.metadata ? 'consumer_briefcase_item_id' then
  if created.metadata->>'consumer_auth_user_id' is distinct from subject::text or created.partner_slug is distinct from p_packet->>'partner_slug'
   or created.metadata->>'source' is distinct from 'rcap_document_packet_repository' then raise exception 'legacy document scope refused' using errcode='42501';end if;
  matter:=nullif(created.metadata->>'consumer_briefcase_item_id','')::uuid;
  if matter is null then raise exception 'legacy document scope refused' using errcode='42501';end if;
 end if;
 if not public.legacy_source_scope_current(subject,p_actor_user_id,p_packet->>'partner_slug',matter,p_clinic_case_id) then raise exception 'legacy document scope refused' using errcode='42501';end if;
 if exists(select 1 from public.participant_legal_holds h where h.user_id=subject and h.released_at is null
   and (matter is null or h.matter_scope_item_id is null or h.matter_scope_item_id=matter))
  or exists(select 1 from public.participant_privacy_requests request where request.user_id=subject
   and request.status in ('pending','in_progress','failed','completed','blocked_legal_hold')
   and (request.request_type='account_deletion' or (request.request_type='matter_deletion' and (matter is null or request.target_matter_item_id=matter)))) then
  raise exception 'legacy source is privacy-fenced' using errcode='42501';end if;
 -- Existing canonical writer owns packet/event/input/person/Briefcase atomicity and Q1 holds.
 return public.persist_source_document_packet(p_packet,p_person_match_key,p_input,p_event,p_briefcase);
end $scope$;

revoke all on function public.persist_source_document_packet(jsonb,text,jsonb,jsonb,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.legacy_source_lock_accounts(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.legacy_source_scope_current(uuid,uuid,text,uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.read_authorized_source_document_packet(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.persist_authorized_source_document_packet(uuid,uuid,jsonb,text,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.read_authorized_source_document_packet(uuid,uuid,uuid,jsonb),public.persist_authorized_source_document_packet(uuid,uuid,jsonb,text,jsonb,jsonb,jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
