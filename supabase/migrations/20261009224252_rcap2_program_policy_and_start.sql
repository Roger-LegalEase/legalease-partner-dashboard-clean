-- RCAP 2.0 v2.2. Existing application behavior is retained for legacy policy.
-- No participant, money, authentication, membership or packet-ledger grants change.
begin;
alter table public.partner_onboarding add column rcap_policy_version text not null default 'legacy';
alter table public.partner_onboarding_launch_approvals add column policy_details jsonb not null default '{}'::jsonb;
alter table public.partner_onboarding_launch_approvals drop constraint partner_onboarding_launch_approvals_type_check;
alter table public.partner_onboarding_launch_approvals add constraint partner_onboarding_launch_approvals_type_check check(approval_type in ('partner_launch_approval','legalease_final_review','standing_launch_authorization','commercial_revocation'));
alter table public.partner_onboarding_launch_approvals drop constraint partner_onboarding_launch_approvals_owner_match_check;
alter table public.partner_onboarding_launch_approvals add constraint partner_onboarding_launch_approvals_owner_match_check check((approval_type='partner_launch_approval' and reviewer_type='partner') or (approval_type in ('legalease_final_review','standing_launch_authorization','commercial_revocation') and reviewer_type='legalease'));
alter table public.rcap_commercial_authorizations drop constraint rcap_commercial_authorizations_kind_check;
alter table public.rcap_commercial_authorizations add constraint rcap_commercial_authorizations_kind_check check(kind in ('verified_paid','sponsored','purchase_order','screening_only'));
alter table public.rcap_commercial_authorizations alter column packet_entitlement_id drop not null;
alter table public.rcap_commercial_authorizations add column legal_basis jsonb not null default '{}'::jsonb;
alter table public.rcap_commercial_authorizations add constraint rcap_commercial_packet_scope check((kind='screening_only' and packet_entitlement_id is null) or (kind<>'screening_only' and packet_entitlement_id is not null));
alter table public.rcap_launch_exception_events drop constraint rcap_launch_exception_events_check_key_check;
alter table public.rcap_launch_exception_events add column policy_version text not null default 'legacy';
alter table public.rcap_launch_exception_events add column requirement_keys text[] not null default '{}';
alter table public.rcap_launch_exception_events add column requested_action text;
alter table public.rcap_launch_exception_events add column resolution text;
alter table public.rcap_launch_exception_events add column dependency_hashes jsonb not null default '{}'::jsonb;
alter table public.rcap_launch_exception_events add column event_id uuid;

create function public.rcap_program_requirement_registry() returns jsonb language sql immutable security invoker set search_path='' as $registry$
 select '[{"key":"organization_facts","label":"Complete your organization information","owner_domain":"legal","classification":"NON_OVERRIDABLE","actions":["complete_setup","publish_partner_page","accept_screenings","publish_clinic"],"required_evidence":"Complete your organization information","permitted_default":null,"permitted_alternative":null,"exception_effects":[],"dependencies":["organization_contacts.legal_organization_name","organization_contacts.public_organization_name","organization_contacts.public_program_name"],"invalidation_triggers":["organization_contacts.legal_organization_name","organization_contacts.public_organization_name","organization_contacts.public_program_name"],"next_action":"Complete your organization information"},{"key":"program_scope","label":"Choose the service area and participation settings","owner_domain":"legal","classification":"NON_OVERRIDABLE","actions":["complete_setup","publish_partner_page","accept_screenings","publish_clinic"],"required_evidence":"Choose the service area and participation settings","permitted_default":null,"permitted_alternative":null,"exception_effects":[],"dependencies":["geography_audience_language_accessibility","access_sponsorship_capacity.participant_access_model","program_goals.participation_mode"],"invalidation_triggers":["geography_audience_language_accessibility","access_sponsorship_capacity.participant_access_model","program_goals.participation_mode"],"next_action":"Choose the service area and participation settings"},{"key":"support_and_referral_contacts_configured","label":"Confirm the support and escalation route","owner_domain":"legal","classification":"NON_OVERRIDABLE","actions":["complete_setup","publish_partner_page","accept_screenings","publish_clinic"],"required_evidence":"Confirm the support and escalation route","permitted_default":null,"permitted_alternative":null,"exception_effects":[],"dependencies":["support_referrals_reporting.referral_arrangement","support_referrals_reporting.participant_support_email","support_referrals_reporting.contested_matter_procedure"],"invalidation_triggers":["support_referrals_reporting.referral_arrangement","support_referrals_reporting.participant_support_email","support_referrals_reporting.contested_matter_procedure"],"next_action":"Confirm the support and escalation route"},{"key":"commercial_gate_cleared","label":"LegalEase is finalizing your program terms","owner_domain":"finance_truth","classification":"REQUIRES_ACTUAL_AUTHORITY","actions":["publish_partner_page","accept_screenings","publish_clinic","issue_sponsored_packet"],"required_evidence":"LegalEase is finalizing your program terms","permitted_default":null,"permitted_alternative":null,"exception_effects":[],"dependencies":["commercial"],"invalidation_triggers":["commercial"],"next_action":"LegalEase is finalizing your program terms"},{"key":"agreements_and_procurement_recorded","label":"Record the actual agreement or authorized limited-service basis","owner_domain":"third_party_contract","classification":"REQUIRES_ACTUAL_AUTHORITY","actions":["publish_partner_page","accept_screenings","publish_clinic","issue_sponsored_packet"],"required_evidence":"Record the actual agreement or authorized limited-service basis","permitted_default":null,"permitted_alternative":null,"exception_effects":[],"dependencies":["commercial","agreements"],"invalidation_triggers":["commercial","agreements"],"next_action":"Record the actual agreement or authorized limited-service basis"},{"key":"access_model_and_capacity_present","label":"Reconcile the authorized access and screening allowance","owner_domain":"finance_truth","classification":"REQUIRES_ACTUAL_AUTHORITY","actions":["publish_partner_page","accept_screenings","publish_clinic"],"required_evidence":"Reconcile the authorized access and screening allowance","permitted_default":null,"permitted_alternative":null,"exception_effects":[],"dependencies":["commercial","access_sponsorship_capacity.participant_access_model","screening_capacity"],"invalidation_triggers":["commercial","access_sponsorship_capacity.participant_access_model","screening_capacity"],"next_action":"Reconcile the authorized access and screening allowance"},{"key":"packet_entitlement","label":"Sponsored packets are unavailable","owner_domain":"finance_truth","classification":"REQUIRES_ACTUAL_AUTHORITY","actions":["issue_sponsored_packet"],"required_evidence":"Sponsored packets are unavailable","permitted_default":null,"permitted_alternative":null,"exception_effects":[],"dependencies":["commercial","packet_capacity"],"invalidation_triggers":["commercial","packet_capacity"],"next_action":"Sponsored packets are unavailable"},{"key":"artifact_versions_current","label":"Review the updated program materials","owner_domain":"legal","classification":"NON_OVERRIDABLE","actions":["publish_partner_page","accept_screenings","publish_clinic"],"required_evidence":"Review the updated program materials","permitted_default":null,"permitted_alternative":null,"exception_effects":[],"dependencies":["materials"],"invalidation_triggers":["materials"],"next_action":"Review the updated program materials"},{"key":"partner_launch_approval_received","label":"Review your program","owner_domain":"participant_consent","classification":"NON_OVERRIDABLE","actions":["publish_partner_page","accept_screenings","publish_clinic"],"required_evidence":"Review your program","permitted_default":null,"permitted_alternative":null,"exception_effects":[],"dependencies":["materials","partner_confirmation"],"invalidation_triggers":["materials","partner_confirmation"],"next_action":"Review your program"},{"key":"legalease_final_review_complete","label":"LegalEase must authorize program start","owner_domain":"third_party_contract","classification":"REQUIRES_ACTUAL_AUTHORITY","actions":["publish_partner_page"],"required_evidence":"LegalEase must authorize program start","permitted_default":null,"permitted_alternative":null,"exception_effects":[],"dependencies":["launch_scope"],"invalidation_triggers":["launch_scope"],"next_action":"LegalEase must authorize program start"},{"key":"required_logo_present","label":"Use an approved logo or the RCAP text identity","owner_domain":"legalease_business","classification":"EXCEPTION_ELIGIBLE","actions":["publish_partner_page","accept_screenings","publish_clinic"],"required_evidence":"Use an approved logo or the RCAP text identity","permitted_default":"RCAP text identity","permitted_alternative":"Recorded scoped Platform Admin business decision","exception_effects":["publish_partner_page","accept_screenings","publish_clinic"],"dependencies":["brand_public_page"],"invalidation_triggers":["brand_public_page"],"next_action":"Use an approved logo or the RCAP text identity"},{"key":"report_recipients_configured","label":"Reporting delivery preferences","owner_domain":"legalease_business","classification":"EXCEPTION_ELIGIBLE","actions":["view_reporting"],"required_evidence":"Reporting delivery preferences","permitted_default":"Reports available to authorized administrators","permitted_alternative":"Recorded scoped Platform Admin business decision","exception_effects":["view_reporting"],"dependencies":["support_referrals_reporting.reporting_cadence"],"invalidation_triggers":["support_referrals_reporting.reporting_cadence"],"next_action":"Reporting delivery preferences"},{"key":"communications_approved","label":"Outreach scheduling","owner_domain":"legalease_business","classification":"EXCEPTION_ELIGIBLE","actions":["publish_partner_page","accept_screenings","publish_clinic"],"required_evidence":"Outreach scheduling","permitted_default":"No separate campaign approval","permitted_alternative":"Recorded scoped Platform Admin business decision","exception_effects":["publish_partner_page","accept_screenings","publish_clinic"],"dependencies":["program_goals.outreach_channels"],"invalidation_triggers":["program_goals.outreach_channels"],"next_action":"Outreach scheduling"},{"key":"staff_training_completed","label":"Clinic operating preparation","owner_domain":"legalease_business","classification":"EXCEPTION_ELIGIBLE","actions":["publish_clinic"],"required_evidence":"Clinic operating preparation","permitted_default":"Use the embedded Clinic staff guide","permitted_alternative":"Recorded scoped Platform Admin business decision","exception_effects":["publish_clinic"],"dependencies":["program_goals.participation_mode"],"invalidation_triggers":["program_goals.participation_mode"],"next_action":"Clinic operating preparation"},{"key":"participant_access","label":"Participant consent and event staff authorization are required","owner_domain":"participant_consent","classification":"NON_OVERRIDABLE","actions":["assist_participant"],"required_evidence":"Participant consent and event staff authorization are required","permitted_default":null,"permitted_alternative":null,"exception_effects":[],"dependencies":["event","consent"],"invalidation_triggers":["event","consent"],"next_action":"Participant consent and event staff authorization are required"},{"key":"paid_packet_verification","label":"Packet purchase is available only for a verified participant matter","owner_domain":"legal_fulfillment","classification":"NON_OVERRIDABLE","actions":["offer_paid_packet"],"required_evidence":"Packet purchase is available only for a verified participant matter","permitted_default":null,"permitted_alternative":null,"exception_effects":[],"dependencies":["matter","verification"],"invalidation_triggers":["matter","verification"],"next_action":"Packet purchase is available only for a verified participant matter"}]'::jsonb
$registry$;

-- Every caller reads these canonical sources. Dependency hashes deliberately
-- exclude unrelated contacts and cosmetic fields from commercial delegation.
create function public.rcap_program_policy_source(p_workspace uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select coalesce((select jsonb_object_agg(section_key,response_data) from public.partner_onboarding_sections where workspace_id=p_workspace),'{}'::jsonb)
 || jsonb_build_object(
 'commercial',(select to_jsonb(a)-array['request_id','created_at'] from public.rcap_commercial_authorizations a where workspace_id=p_workspace order by created_at desc,id desc limit 1),
 'agreements',(select coalesce(jsonb_agg(jsonb_build_object('type',agreement_type,'status',status,'receipt',signed_receipt_id,'asset',finalized_asset_id) order by agreement_type),'[]') from public.partner_onboarding_agreements where workspace_id=p_workspace),
 'packet_capacity',(select jsonb_build_object('id',e.id,'cap',e.packet_cap,'effective_at',e.effective_at,'expires_at',e.expires_at) from public.partner_packet_entitlement e join public.rcap_commercial_authorizations a on a.packet_entitlement_id=e.id where a.workspace_id=p_workspace order by a.created_at desc,a.id desc limit 1),
 'screening_capacity',(select jsonb_build_object('allowed',e.screenings_allowed) from public.partner_entitlement e join public.partner_onboarding w on w.partner_slug=e.partner_slug where w.id=p_workspace),
 'materials',(select coalesce(jsonb_agg(jsonb_build_object('type',a.artifact_type,'id',v.id,'hash',v.snapshot_hash) order by a.artifact_type),'[]') from public.partner_onboarding_artifacts a join public.partner_onboarding_artifact_versions v on v.id=a.current_version_id where a.workspace_id=p_workspace and a.artifact_type in ('implementation_brief','co_branded_page_configuration')))
$$;
create function public.rcap_program_dependency_hash(p_workspace uuid,p_dependencies text[]) returns text
language sql stable security invoker set search_path='' as $$
 select encode(sha256(convert_to(coalesce(jsonb_object_agg(k,public.rcap_program_policy_source(p_workspace)#>string_to_array(k,'.')),'{}')::text,'UTF8')),'hex') from unnest(p_dependencies) k
$$;
create function public.rcap_program_launch_scope(p_workspace uuid) returns text
language sql stable security invoker set search_path='' as $$
 select public.rcap_program_dependency_hash(p_workspace,array['organization_contacts.legal_organization_name','geography_audience_language_accessibility','program_goals.participation_mode','access_sponsorship_capacity.participant_access_model','support_referrals_reporting.referral_arrangement','support_referrals_reporting.contested_matter_procedure','brand_public_page.program_headline','brand_public_page.program_subheadline','brand_public_page.approved_organization_description','commercial','agreements','screening_capacity','packet_capacity'])
$$;

create function public.rcap_program_material_scope(p_workspace uuid,p_type text) returns text
language sql stable security invoker set search_path='' as $$
 select public.rcap_program_dependency_hash(p_workspace,array['organization_contacts.legal_organization_name','organization_contacts.public_organization_name','organization_contacts.public_program_name','geography_audience_language_accessibility','program_goals.participation_mode','program_goals.target_population','access_sponsorship_capacity.participant_access_model','support_referrals_reporting.participant_support_email','support_referrals_reporting.contested_matter_procedure','brand_public_page'] || case when p_type='implementation_brief' then array['commercial','screening_capacity','packet_capacity'] else '{}'::text[] end)
$$;

create function public.rcap_program_commercial_valid(p_workspace uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.partner_onboarding w join public.partner_records r on r.id=w.partner_record_id
 join lateral(select * from public.rcap_commercial_authorizations where workspace_id=w.id order by created_at desc,id desc limit 1) a on true
 join public.partner_onboarding_assets d on d.id=a.document_id and d.workspace_id=w.id
 where w.id=p_workspace and a.expires_at>now()
 and (w.rcap_policy_version<>'rcap2.2' or w.status<>'live' or exists(select 1 from public.rcap_launch_operation_events staged where staged.operation_id=w.rcap_launch_operation_id and staged.workspace_id=w.id and staged.step='prepared' and staged.evidence->'snapshot'->>'scopeHash'=public.rcap_program_launch_scope(w.id))) and r.qualification_status='qualified' and r.payment_status is distinct from 'demo_paid'
 and r.provisioning_status in ('active','provisioned') and r.access_mode=a.access_mode
 and d.category='procurement_document' and d.sha256_hex=a.document_hash and d.lifecycle_status='active' and d.review_status='approved' and d.deleted_at is null
 and exists(select 1 from public.partner_users where auth_user_id=a.actor_auth_user_id and partner_slug is null and role='internal_admin' and status='active')
 and not exists(select 1 from public.partner_onboarding_launch_approvals rv where rv.workspace_id=w.id and rv.approval_type='commercial_revocation' and rv.policy_details->>'authority_id'=a.id::text and rv.decision='withdraw')
 and not exists(select 1 from public.rcap_launch_capacity_events ce where ce.workspace_id=w.id and ce.created_at>a.created_at)
 and (a.kind<>'verified_paid' or (r.payment_status='paid' and r.stripe_payment_intent_id ~ '^pi_[A-Za-z0-9]+$' and r.paid_at<=now() and r.payment_amount>0))
 and (public.rcap_agreement_clearance(w.id) or (w.rcap_policy_version='rcap2.2' and a.kind='screening_only' and a.packet_entitlement_id is null
 and a.legal_basis->>'agreement_requirement'='not_required' and length(btrim(a.legal_basis->>'policy_reference'))>=10
 and length(btrim(a.legal_basis->>'effective_conditions'))>=10 and length(btrim(a.legal_basis->>'termination_rule'))>=10
 and a.legal_basis->>'funding_obligation'='none'
 and not exists(select 1 from public.partner_onboarding_agreements g where g.workspace_id=w.id and g.is_required and g.status not in ('not_required','waived')))))
$$;

-- The decision is per capability, and the DB, service and UI consume this one
-- evaluator. No client-supplied allowed flag is ever accepted.
create function public.rcap_service_evaluate_program(p_slug text,p_actor uuid,p_action text) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; r public.partner_records%rowtype; a public.rcap_commercial_authorizations%rowtype;
 s jsonb; role_name text; facts jsonb; item jsonb; check_ok boolean; exceptions jsonb:='[]'; blockers jsonb:='[]'; requirements jsonb:='[]'; dep text; ev uuid;
 materials_ok boolean; confirmation_ok boolean; internal_ok boolean; scope_hash text; setup_ok boolean; public_ok boolean; business_default boolean;
begin
 if p_action is null or p_action not in ('complete_setup','publish_partner_page','accept_screenings','issue_sponsored_packet','offer_paid_packet','create_clinic','publish_clinic','assist_participant','manage_team','view_reporting') then raise exception 'unknown action' using errcode='22023'; end if;
 select * into strict w from public.partner_onboarding where partner_slug=p_slug;
 select * into strict r from public.partner_records where id=w.partner_record_id;
 select role into role_name from public.partner_users where auth_user_id=p_actor and status='active' and ((partner_slug=p_slug and role in ('partner_admin','partner_staff')) or (partner_slug is null and role='internal_admin')) order by case when role='internal_admin' then 0 else 1 end limit 1;
 if role_name is null then raise exception 'actor or tenant denied' using errcode='42501'; end if;
 if role_name='partner_staff' and p_action not in ('view_reporting','assist_participant','offer_paid_packet') then raise exception 'administrator required' using errcode='42501'; end if;
 s:=public.rcap_program_policy_source(w.id); scope_hash:=public.rcap_program_launch_scope(w.id);
 select * into a from public.rcap_commercial_authorizations where workspace_id=w.id order by created_at desc,id desc limit 1;
 materials_ok:=(select count(*)=2 from public.partner_onboarding_artifacts ar join public.partner_onboarding_artifact_versions v on v.id=ar.current_version_id
 where ar.workspace_id=w.id and ar.artifact_type in ('implementation_brief','co_branded_page_configuration') and v.generation_status='succeeded' and v.superseded_at is null and v.source_drift_invalidated_at is null and v.normalized_snapshot->>'rcap_dependency_hash'=public.rcap_program_material_scope(w.id,ar.artifact_type) and (ar.artifact_type<>'co_branded_page_configuration' or v.rendered_content#>'{pagePreview,missing}'='[]'::jsonb)
 and (v.approval_status='approved' or (v.normalized_snapshot->>'rcap_standard_policy'='rcap2.2' and v.generator_version like '%_rcap2')));
 confirmation_ok:=materials_ok and exists(select 1 from public.partner_onboarding_launch_approvals c join public.partner_users u on u.auth_user_id=c.reviewer_user_id and u.partner_slug=p_slug and u.role='partner_admin' and u.status='active'
 where c.workspace_id=w.id and c.approval_type='partner_launch_approval' and c.decision='approve' and c.invalidated_at is null and c.policy_details->>'policy_version'='rcap2.2'
 and c.policy_details->>'materials_hash'=public.rcap_program_dependency_hash(w.id,array['materials'])
 and not exists(select 1 from public.partner_onboarding_launch_approvals newer where newer.workspace_id=w.id and newer.approval_type='partner_launch_approval' and (newer.recorded_at,newer.id)>(c.recorded_at,c.id)));
 internal_ok:=exists(select 1 from public.partner_onboarding_launch_approvals f join public.partner_users u on u.auth_user_id=f.reviewer_user_id and u.role='internal_admin' and u.partner_slug is null and u.status='active'
 where f.workspace_id=w.id and f.approval_type in ('legalease_final_review','standing_launch_authorization') and f.decision='approve' and f.invalidated_at is null
 and f.policy_details->>'policy_version'='rcap2.2' and f.policy_details->>'scope_hash'=scope_hash
 and f.policy_details->'capabilities' ? 'publish_partner_page' and (f.policy_details->>'expires_at')::timestamptz>now()
 and not exists(select 1 from public.partner_onboarding_launch_approvals newer where newer.workspace_id=w.id and newer.approval_type=f.approval_type and (newer.recorded_at,newer.id)>(f.recorded_at,f.id)));
 facts:=jsonb_build_object(
 'organization_facts',coalesce(length(btrim(s#>>'{organization_contacts,legal_organization_name}'))>0 and length(btrim(s#>>'{organization_contacts,public_organization_name}'))>0 and length(btrim(s#>>'{organization_contacts,public_program_name}'))>0,false),
 'program_scope',coalesce(jsonb_array_length(s#>'{geography_audience_language_accessibility,jurisdictions}')=1 and (s#>>'{geography_audience_language_accessibility,jurisdictions,0}')=any(array['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'])
 and length(btrim(s#>>'{geography_audience_language_accessibility,service_area_description}'))>0 and s#>>'{program_goals,participation_mode}' in ('online','clinics','both') and s#>>'{access_sponsorship_capacity,participant_access_model}' in ('open','optional_code','required_code','invite_only'),false),
 'support_and_referral_contacts_configured',coalesce(s#>>'{support_referrals_reporting,participant_support_email}' ~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' and length(s#>>'{support_referrals_reporting,contested_matter_procedure}')>=20,false),
 'commercial_gate_cleared',public.rcap_program_commercial_valid(w.id),
 'agreements_and_procurement_recorded',public.rcap_agreement_clearance(w.id) or (a.kind='screening_only' and public.rcap_program_commercial_valid(w.id)),
 'access_model_and_capacity_present',coalesce(a.access_mode=s#>>'{access_sponsorship_capacity,participant_access_model}' and exists(select 1 from public.partner_entitlement where partner_slug=p_slug and screenings_allowed>screenings_used),false),
 'packet_entitlement',coalesce(a.kind<>'screening_only' and exists(select 1 from public.partner_packet_entitlement e where e.id=a.packet_entitlement_id and e.partner_id=r.id and e.entitlement_scope='sponsored_packets' and e.effective_at<=now() and (e.expires_at is null or e.expires_at>now()) and e.packet_cap>(select count(*) from public.packet_credit_ledger l where l.entitlement_id=e.id and l.event_type in ('reserved','consumed'))),false),
 'artifact_versions_current',materials_ok,'partner_launch_approval_received',confirmation_ok,'legalease_final_review_complete',internal_ok,
 'participant_access',false,'paid_packet_verification',false);
 setup_ok:=coalesce((facts->>'organization_facts')::boolean and (facts->>'program_scope')::boolean and (facts->>'support_and_referral_contacts_configured')::boolean,false);
 public_ok:=w.status='live' and w.landing_page_ready and materials_ok and confirmation_ok and public.rcap_program_commercial_valid(w.id) and exists(select 1 from public.rcap_launch_operation_events e where e.workspace_id=w.id and e.operation_id=w.rcap_launch_operation_id and e.step='complete');
 for item in select value from jsonb_array_elements(public.rcap_program_requirement_registry()) loop
  if not item->'actions' ? p_action then continue; end if;
  dep:=public.rcap_program_dependency_hash(w.id,array(select jsonb_array_elements_text(item->'dependencies')));
  check_ok:=coalesce((facts->>(item->>'key'))::boolean,false);
  business_default:=item->>'owner_domain'='legalease_business' and item->>'permitted_default' is not null;
  ev:=null;
  if not check_ok and item->>'owner_domain'='legalease_business' then
   select e.id into ev from public.rcap_launch_exception_events e where e.workspace_id=w.id and e.partner_slug=p_slug and e.policy_version='rcap2.2'
    and e.kind='grant' and e.requirement_keys @> array[item->>'key'] and e.requested_action=p_action and e.event_id is null
    and e.dependency_hashes->>(item->>'key')=dep and (e.expires_at is null or e.expires_at>now())
    and exists(select 1 from public.partner_users where auth_user_id=e.actor_auth_user_id and partner_slug is null and role='internal_admin' and status='active')
    and not exists(select 1 from public.rcap_launch_exception_events x where x.grant_id=e.id and x.kind='revoke') order by e.created_at desc limit 1;
  end if;
  if ev is not null then exceptions:=exceptions||jsonb_build_array(ev); end if;
  requirements:=requirements||jsonb_build_array(item||jsonb_build_object('passing',check_ok,'effective',check_ok or ev is not null or business_default,'dependency_hash',dep,'exception_id',ev,'default_applied',not check_ok and ev is null and business_default));
  if not check_ok and ev is null and not business_default then blockers:=blockers||jsonb_build_array(item||jsonb_build_object('dependency_hash',dep)); end if;
 end loop;
 if w.status in ('paused','closed') and p_action not in ('view_reporting','manage_team') then blockers:=blockers||jsonb_build_array(jsonb_build_object('key','program_status','label','This program is paused or closed.','owner_domain','security')); end if;
 if p_action in ('accept_screenings','publish_clinic','issue_sponsored_packet') and not public_ok then blockers:=blockers||jsonb_build_array(jsonb_build_object('key','publication','label','Start the parent program first.','owner_domain','security')); end if;
 if p_action='create_clinic' and not setup_ok then blockers:=blockers||jsonb_build_array(jsonb_build_object('key','setup','label','Save the program service area before creating a clinic.','owner_domain','legal')); end if;
 return jsonb_build_object('policyVersion',w.rcap_policy_version,'workspaceId',w.id,'partnerSlug',p_slug,'actor',p_actor,'role',role_name,'action',p_action,'allowed',jsonb_array_length(blockers)=0,'requirements',requirements,'blockers',blockers,'activeExceptions',exceptions,'sourceVersion',w.aggregate_version,'scopeHash',scope_hash,'materialsHash',public.rcap_program_dependency_hash(w.id,array['materials']),'authorityId',a.id,'setupComplete',confirmation_ok or (w.rcap_policy_version='legacy' and w.status='live'),'configurationComplete',setup_ok,'live',public_ok,'delegated',exists(select 1 from public.partner_onboarding_launch_approvals z where z.workspace_id=w.id and z.approval_type='standing_launch_authorization' and z.decision='approve' and z.invalidated_at is null and z.policy_details->>'scope_hash'=scope_hash and (z.policy_details->>'expires_at')::timestamptz>now() and not exists(select 1 from public.partner_onboarding_launch_approvals n where n.workspace_id=w.id and n.approval_type=z.approval_type and (n.recorded_at,n.id)>(z.recorded_at,z.id))),'status',w.status,'primaryNextAction',coalesce(blockers->0->>'label',case when p_action='complete_setup' then 'Review your program' else 'Continue' end));
end $$;

create function public.rcap_service_enable_program_policy(p_slug text,p_actor uuid) returns bigint
language plpgsql security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype;
begin
 select * into strict w from public.partner_onboarding where partner_slug=p_slug for update;
 if exists(select 1 from public.partner_users where auth_user_id=p_actor and partner_slug is null and role='internal_admin' and status='active') then perform public.rcap_service_assert_internal_actor(p_actor);
 else perform public.rcap_service_assert_partner_actor(p_slug,p_actor,w.id); end if;
 if w.rcap_policy_version='rcap2.2' then return w.aggregate_version; end if;
 if w.status in ('live','paused','closed') then raise exception 'existing program retains its policy'; end if;
 update public.partner_onboarding set rcap_policy_version='rcap2.2',aggregate_version=aggregate_version+1 where id=w.id returning aggregate_version into w.aggregate_version;
 return w.aggregate_version;
end $$;

create function public.rcap_service_record_program_decision(p_slug text,p_actor uuid,p_type text,p_decision text,p_version bigint,p_details jsonb,p_request uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; old public.partner_onboarding_launch_approvals%rowtype; d jsonb; ident uuid; rt text;
begin
 select * into strict w from public.partner_onboarding where partner_slug=p_slug for update;
 if p_type='partner_launch_approval' then perform public.rcap_service_assert_partner_actor(p_slug,p_actor,w.id);rt:='partner';
 else perform public.rcap_service_assert_internal_actor(p_actor);rt:='legalease';end if;
 if p_type not in ('partner_launch_approval','legalease_final_review','standing_launch_authorization','commercial_revocation') or p_decision not in ('approve','withdraw') or p_details is null then raise exception 'invalid decision';end if;
 select * into old from public.partner_onboarding_launch_approvals where workspace_id=w.id and request_id=p_request;
 if found then
  if old.reviewer_user_id is distinct from p_actor or old.approval_type is distinct from p_type or old.decision is distinct from p_decision or old.policy_details is distinct from p_details then raise exception 'request identity conflict' using errcode='23505'; end if;
  return old.id;
 end if;
 if w.rcap_policy_version<>'rcap2.2' or p_version is null or w.aggregate_version<>p_version or p_details->>'policy_version' is distinct from 'rcap2.2' then raise exception 'source changed' using errcode='40001';end if;
 if p_decision='approve' then
  if p_type='partner_launch_approval' then
   d:=public.rcap_service_evaluate_program(p_slug,p_actor,'complete_setup');
   if not (d->>'allowed')::boolean or p_details->>'materials_hash' is distinct from d->>'materialsHash' or p_details->>'statement_version' is distinct from 'rcap2-final-review-v1' then raise exception 'current substantive partner review required';end if;
   if (select count(*) from public.partner_onboarding_artifacts ar join public.partner_onboarding_artifact_versions v on v.id=ar.current_version_id where ar.workspace_id=w.id and ar.artifact_type in ('implementation_brief','co_branded_page_configuration') and v.generation_status='succeeded' and v.source_drift_invalidated_at is null and v.superseded_at is null and v.normalized_snapshot->>'rcap_dependency_hash'=public.rcap_program_material_scope(w.id,ar.artifact_type) and (ar.artifact_type<>'co_branded_page_configuration' or v.rendered_content#>'{pagePreview,missing}'='[]'::jsonb))<>2 then raise exception 'two current materials required';end if;
   -- These are real partner reviews of the two exact versions shown, not internal approvals.
   for ident in select current_version_id from public.partner_onboarding_artifacts where workspace_id=w.id and artifact_type in ('implementation_brief','co_branded_page_configuration') loop
    perform public.rcap_service_review_onboarding_artifact(p_slug,p_actor,'partner',ident,'approve','RCAP final factual and brand review',null,p_request);
   end loop;
  else
   if p_details->>'scope_hash' is distinct from public.rcap_program_launch_scope(w.id) or (p_details->>'expires_at')::timestamptz is null or (p_details->>'expires_at')::timestamptz<=now()
    or coalesce(length(btrim(p_details->>'authority_basis')),0)<10 or p_details->'capabilities' is null or not (p_details->'capabilities' ? 'publish_partner_page')
    or not public.rcap_program_commercial_valid(w.id) then raise exception 'current scoped business authorization required';end if;
   if exists(select 1 from jsonb_array_elements_text(p_details->'capabilities') c where c not in ('publish_partner_page','accept_screenings','create_clinic','publish_clinic')) then raise exception 'delegation cannot grant participant or financial authority';end if;
  end if;
 end if;
 insert into public.partner_onboarding_launch_approvals(workspace_id,approval_type,reviewer_type,reviewer_user_id,decision,comments,request_id,policy_details)
 values(w.id,p_type,rt,p_actor,p_decision,'RCAP 2.0 scoped program decision',p_request,p_details) returning id into ident;
 return ident;
end $$;

create function public.rcap_service_record_program_exception(p_slug text,p_actor uuid,p_action text,p_keys text[],p_resolution text,p_reason text,p_version bigint,p_hashes jsonb,p_request uuid,p_expires timestamptz default null,p_grant uuid default null) returns uuid
language plpgsql security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; key text; item jsonb; ident uuid; old public.rcap_launch_exception_events%rowtype;
begin
 perform public.rcap_service_assert_internal_actor(p_actor);
 select * into strict w from public.partner_onboarding where partner_slug=p_slug for update;
 if p_keys is null or cardinality(p_keys)=0 or cardinality(p_keys)>32 or coalesce(length(btrim(p_reason)),0)<10 or p_resolution not in ('not_applicable','alternative_authorized','exception_granted') then raise exception 'specific business decision required';end if;
 select * into old from public.rcap_launch_exception_events where workspace_id=w.id and request_id=p_request;
 if found then
 if old.actor_auth_user_id is distinct from p_actor or old.requirement_keys is distinct from p_keys or old.requested_action is distinct from p_action or old.resolution is distinct from p_resolution or old.reason is distinct from p_reason or old.dependency_hashes is distinct from p_hashes or old.grant_id is distinct from p_grant or old.expires_at is distinct from p_expires then raise exception 'request identity conflict';end if;return old.id;end if;
 if w.rcap_policy_version<>'rcap2.2' or p_version is null or w.aggregate_version<>p_version then raise exception 'source changed' using errcode='40001';end if;
 foreach key in array p_keys loop
  select value into item from jsonb_array_elements(public.rcap_program_requirement_registry()) where value->>'key'=key;
  if item is null or item->>'owner_domain'<>'legalease_business' or item->>'classification'<>'EXCEPTION_ELIGIBLE' or not item->'exception_effects' ? p_action or item->>'permitted_alternative' is null then raise exception 'protected or unknown requirement' using errcode='42501';end if;
  if p_hashes->>key is distinct from public.rcap_program_dependency_hash(w.id,array(select jsonb_array_elements_text(item->'dependencies'))) then raise exception 'requirement source changed' using errcode='40001';end if;
 end loop;
 insert into public.rcap_launch_exception_events(kind,grant_id,workspace_id,partner_slug,check_key,actor_auth_user_id,actor_role,request_id,reason,authority_reference,snapshot_hash,expires_at,policy_version,requirement_keys,requested_action,resolution,dependency_hashes)
 values(case when p_grant is null then 'grant' else 'revoke' end,p_grant,w.id,p_slug,p_keys[1],p_actor,'internal_admin',p_request,p_reason,'Owner-authorized RCAP 2.2 business policy',public.rcap_program_launch_scope(w.id),p_expires,'rcap2.2',p_keys,p_action,p_resolution,p_hashes) returning id into ident;
 return ident;
end $$;

-- Screening-only authority is an actual documented limited-service arrangement.
-- It never writes agreement execution, payment, packet entitlements or ledger rows.
create function public.rcap_service_record_limited_program_authority(p_slug text,p_actor uuid,p_document uuid,p_reference text,p_basis jsonb,p_expires timestamptz,p_screenings integer,p_version bigint,p_request uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; old public.rcap_commercial_authorizations%rowtype; d public.partner_onboarding_assets%rowtype; ident uuid; mode text;
begin
 perform public.rcap_service_assert_internal_actor(p_actor);
 select * into strict w from public.partner_onboarding where partner_slug=p_slug for update;
 select * into old from public.rcap_commercial_authorizations where workspace_id=w.id and request_id=p_request;
 if found then
 if old.actor_auth_user_id is distinct from p_actor or old.document_id is distinct from p_document or old.legal_basis is distinct from (p_basis||jsonb_build_object('screenings_allowed',p_screenings)) or old.authority_reference is distinct from p_reference or old.expires_at is distinct from p_expires then raise exception 'request identity conflict';end if;return old.id;end if;
 if w.rcap_policy_version<>'rcap2.2' or w.status in ('live','closed') or w.landing_page_ready or p_version is null or w.aggregate_version<>p_version then raise exception 'source changed' using errcode='40001';end if;
 if p_screenings is null or p_screenings<1 or p_screenings>1000000 or p_expires is null or p_expires<=now() or p_basis is null or p_basis->>'funding_obligation' is distinct from 'none' or coalesce(length(btrim(p_basis->>'policy_reference')),0)<10 or coalesce(length(btrim(p_basis->>'effective_conditions')),0)<10 or coalesce(length(btrim(p_basis->>'termination_rule')),0)<10 or coalesce(p_basis->>'agreement_requirement','') not in ('not_required','executed') then raise exception 'documented limited service basis required';end if;
 if p_basis->>'agreement_requirement'='executed' and not public.rcap_agreement_clearance(w.id) then raise exception 'executed agreement required';end if;
 if p_basis->>'agreement_requirement'='not_required' and exists(select 1 from public.partner_onboarding_agreements where workspace_id=w.id and is_required and status not in ('not_required','waived')) then raise exception 'required contractual evidence cannot be waived';end if;
 select * into strict d from public.partner_onboarding_assets where id=p_document and workspace_id=w.id and category='procurement_document' and review_status='approved' and lifecycle_status='active' and deleted_at is null;
 select response_data->>'participant_access_model' into mode from public.partner_onboarding_sections where workspace_id=w.id and section_key='access_sponsorship_capacity';
 perform 1 from public.partner_entitlement where partner_slug=p_slug for update;
 if exists(select 1 from public.partner_entitlement where partner_slug=p_slug and screenings_used>p_screenings) then raise exception 'allowance below actual use';end if;
 insert into public.rcap_commercial_authorizations(workspace_id,kind,document_id,document_hash,authority_reference,access_mode,packet_entitlement_id,actor_auth_user_id,expires_at,request_id,legal_basis)
 values(w.id,'screening_only',d.id,d.sha256_hex,p_reference,mode,null,p_actor,p_expires,p_request,p_basis||jsonb_build_object('screenings_allowed',p_screenings)) returning id into ident;
 insert into public.partner_entitlement(partner_slug,screenings_allowed,screenings_used) values(p_slug,p_screenings,0)
 on conflict(partner_slug) do update set screenings_allowed=excluded.screenings_allowed;
 update public.partner_records set access_mode=mode,provisioning_status='provisioned' where id=w.partner_record_id;
 update public.partner_onboarding set aggregate_version=aggregate_version+1 where id=w.id;
 return ident;
end $$;

-- Invoked only through the existing real-launch RPC and its immutable journal.
create function public.rcap_service_stage_program_launch(p_slug text,p_actor uuid,p_operation uuid,p_version bigint,p_hash text,p_versions jsonb,p_authority uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; d jsonb; prepared public.rcap_launch_operation_events%rowtype; delegated public.partner_onboarding_launch_approvals%rowtype;
begin
 perform public.rcap_service_assert_internal_actor(p_actor);
 select * into strict w from public.partner_onboarding where partner_slug=p_slug for update;
 perform 1 from public.partner_records where id=w.partner_record_id for update;
 perform 1 from public.partner_onboarding_sections where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_artifacts where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_artifact_versions where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_launch_approvals where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_assets where workspace_id=w.id for update;
 perform 1 from public.partner_entitlement where partner_slug=p_slug for update;
 if w.rcap_policy_version<>'rcap2.2' or w.status in ('live','paused','closed') or w.landing_page_ready or p_version is null or w.aggregate_version<>p_version then raise exception 'source changed' using errcode='40001';end if;
 select * into strict prepared from public.rcap_launch_operation_events where workspace_id=w.id and operation_id=p_operation and actor_auth_user_id=p_actor and snapshot_hash=p_hash and step='prepared' and evidence->>'mode'='real';
 if prepared.evidence->>'commercialAuthorityId' is distinct from p_authority::text or coalesce(prepared.evidence->>'releaseAuthorization','') !~ '^release:[a-f0-9]{40}$' then raise exception 'exact release and authority binding required';end if;
 if exists(select 1 from public.partner_records r join public.rcap_launch_operation_events e on e.workspace_id=w.id and e.operation_id=p_operation and e.step='prepared' where r.id=w.partner_record_id and ((e.evidence->'snapshot'->'activationRecord'->>'payment_status') is distinct from r.payment_status or (e.evidence->'snapshot'->'activationRecord'->>'stripe_payment_intent_id') is distinct from r.stripe_payment_intent_id or (e.evidence->'snapshot'->'activationRecord'->>'paid_at')::timestamptz is distinct from r.paid_at or (e.evidence->'snapshot'->'activationRecord'->>'payment_amount')::numeric is distinct from r.payment_amount or (e.evidence->'snapshot'->'activationRecord'->>'qualification_status') is distinct from r.qualification_status)) then raise exception 'financial or activation source changed after snapshot';end if;
 if prepared.evidence->>'intakeJurisdiction' is distinct from (public.rcap_program_policy_source(w.id)#>>'{geography_audience_language_accessibility,jurisdictions,0}') then raise exception 'current screening jurisdiction required';end if;
 d:=public.rcap_service_evaluate_program(p_slug,p_actor,'publish_partner_page');
 if not coalesce((d->>'allowed')::boolean,false) or d->>'authorityId' is distinct from p_authority::text or prepared.evidence->'snapshot'->>'scopeHash' is distinct from d->>'scopeHash' then raise exception 'program capability held' using errcode='42501';end if;
 if prepared.evidence->'snapshot'->>'delegationId' is not null then
 select * into delegated from public.partner_onboarding_launch_approvals where id=(prepared.evidence->'snapshot'->>'delegationId')::uuid and workspace_id=w.id and reviewer_user_id=p_actor and approval_type='standing_launch_authorization' and decision='approve' and invalidated_at is null;
 if delegated.id is null or delegated.policy_details->>'scope_hash' is distinct from d->>'scopeHash' or not delegated.policy_details->'capabilities' ? 'publish_partner_page' or coalesce((delegated.policy_details->>'expires_at')::timestamptz,now())<=now() or exists(select 1 from public.partner_onboarding_launch_approvals n where n.workspace_id=w.id and n.approval_type=delegated.approval_type and (n.recorded_at,n.id)>(delegated.recorded_at,delegated.id)) then raise exception 'standing delegation stale or revoked' using errcode='42501';end if;
 end if;
 if jsonb_typeof(p_versions) is distinct from 'array' or jsonb_array_length(p_versions)<>2 or (select count(distinct item->>'type') from jsonb_array_elements(p_versions) item)<>2 then raise exception 'two exact substantive materials required';end if;
 if exists(select 1 from jsonb_array_elements(p_versions) item where not exists(select 1 from public.partner_onboarding_artifacts ar join public.partner_onboarding_artifact_versions v on v.id=ar.current_version_id where ar.workspace_id=w.id and ar.artifact_type=item->>'type' and ar.artifact_type in ('implementation_brief','co_branded_page_configuration') and v.id::text=item->>'id' and v.snapshot_hash=item->>'hash' and v.normalized_snapshot->>'rcap_dependency_hash'=public.rcap_program_material_scope(w.id,ar.artifact_type) and (ar.artifact_type<>'co_branded_page_configuration' or v.rendered_content#>'{pagePreview,missing}'='[]'::jsonb) and v.partner_review_status='approved' and v.generation_status='succeeded' and v.superseded_at is null and v.source_drift_invalidated_at is null and (v.approval_status='approved' or (v.normalized_snapshot->>'rcap_standard_policy'='rcap2.2' and v.generator_version like '%_rcap2')))) then raise exception 'reviewed materials changed' using errcode='40001';end if;
 if prepared.evidence->'snapshot'->>'materialsHash' is distinct from d->>'materialsHash' then raise exception 'material snapshot changed';end if;
 update public.partner_records set onboarding_status='approved',onboarding_completed_at=coalesce(onboarding_completed_at,now()) where id=w.partner_record_id;
 update public.partner_onboarding set status='live',landing_page_ready=true,internal_approved_at=now(),launched_at=now(),rcap_launch_operation_id=p_operation where id=w.id;
 insert into public.rcap_launch_operation_events(workspace_id,partner_slug,operation_id,request_id,step,actor_auth_user_id,snapshot_hash,authority_reference,evidence)
 values(w.id,p_slug,p_operation,prepared.request_id,'publication_staged',p_actor,p_hash,prepared.authority_reference,jsonb_build_object('mode','real','commercialAuthorityId',p_authority,'workspaceVersion',p_version,'policyVersion','rcap2.2'));
 return true;
end $$;

CREATE OR REPLACE FUNCTION public.rcap_service_stage_real_launch(p_slug text, p_actor uuid, p_operation uuid, p_version bigint, p_hash text, p_versions jsonb, p_authority uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare w public.partner_onboarding%rowtype; a public.rcap_commercial_authorizations%rowtype; consent public.partner_onboarding_launch_approvals%rowtype; final_review public.partner_onboarding_launch_approvals%rowtype; begin
 if exists(select 1 from public.partner_onboarding where partner_slug=p_slug and rcap_policy_version='rcap2.2') then return public.rcap_service_stage_program_launch(p_slug,p_actor,p_operation,p_version,p_hash,p_versions,p_authority);end if;
 perform public.rcap_service_assert_internal_actor(p_actor);
 select * into strict w from public.partner_onboarding where partner_slug=p_slug for update;
 perform 1 from public.partner_records where id=w.partner_record_id for update;
 perform 1 from public.partner_onboarding_sections where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_assets where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_artifacts where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_artifact_versions where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_launch_checks where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_launch_approvals where workspace_id=w.id for update;
 select * into strict a from public.rcap_commercial_authorizations where id=p_authority and workspace_id=w.id;
 if w.status='live' or w.landing_page_ready or w.aggregate_version<>p_version or w.agreement_status<>'signed' or w.commercial_gate_status='blocked' then raise exception 'stale or unapproved publication source' using errcode='40001'; end if;
 if not exists(select 1 from public.rcap_launch_operation_events where workspace_id=w.id and operation_id=p_operation and actor_auth_user_id=p_actor and snapshot_hash=p_hash and step='prepared' and evidence->>'mode'='real' and evidence->>'commercialAuthorityId'=a.id::text) then raise exception 'matching real launch authorization required'; end if;
 if exists(select 1 from public.rcap_launch_capacity_events ce where ce.workspace_id=w.id and ce.created_at>a.created_at) then raise exception 'renew commercial authorization after capacity changes';end if;
 if a.expires_at<=now() or not exists(select 1 from public.partner_onboarding_assets where id=a.document_id and workspace_id=w.id and sha256_hex=a.document_hash and lifecycle_status='active' and review_status='approved') then raise exception 'commercial authority expired or withdrawn'; end if;
 if exists(select 1 from public.partner_records r join public.rcap_launch_operation_events e on e.workspace_id=w.id and e.operation_id=p_operation and e.step='prepared' where r.id=w.partner_record_id and ((e.evidence->'snapshot'->'activationRecord'->>'payment_status') is distinct from r.payment_status or (e.evidence->'snapshot'->'activationRecord'->>'stripe_payment_intent_id') is distinct from r.stripe_payment_intent_id or (e.evidence->'snapshot'->'activationRecord'->>'paid_at')::timestamptz is distinct from r.paid_at or (e.evidence->'snapshot'->'activationRecord'->>'payment_amount')::numeric is distinct from r.payment_amount or (e.evidence->'snapshot'->'activationRecord'->>'qualification_status') is distinct from r.qualification_status)) then raise exception 'financial or activation source changed after snapshot';end if;
 if not exists(select 1 from public.partner_records r where r.id=w.partner_record_id and r.qualification_status='qualified' and r.payment_status is distinct from 'demo_paid' and r.provisioning_status in ('active','provisioned') and r.access_mode=a.access_mode and (a.kind<>'verified_paid' or (r.payment_status='paid' and r.stripe_payment_intent_id ~ '^pi_[A-Za-z0-9]+$' and r.paid_at<=now() and r.payment_amount>0))) then raise exception 'activation or payment authority changed'; end if;
 if (select count(*) from public.partner_onboarding_sections where workspace_id=w.id and status='approved')<>8 or not exists(select 1 from public.partner_onboarding_sections where workspace_id=w.id and section_key='access_sponsorship_capacity' and response_data->>'participant_access_model'=a.access_mode) then raise exception 'canonical configuration unapproved or conflicting'; end if;
 if not exists(select 1 from public.partner_onboarding_sections geo join public.partner_records r on r.id=w.partner_record_id join public.rcap_launch_operation_events e on e.operation_id=p_operation and e.step='prepared' where geo.workspace_id=w.id and geo.section_key='geography_audience_language_accessibility' and geo.status='approved' and case when jsonb_array_length(geo.response_data->'jurisdictions')=1 then geo.response_data->'jurisdictions'->>0 else case when geo.response_data->'jurisdictions' ? coalesce(r.target_state,r.state) then coalesce(r.target_state,r.state) end end=e.evidence->>'intakeJurisdiction') then raise exception 'approved primary screening jurisdiction changed or absent';end if;
 perform 1 from public.partner_entitlement where partner_slug=p_slug for update;
 if not exists(select 1 from public.partner_entitlement where partner_slug=p_slug and screenings_allowed>screenings_used) then raise exception 'screening allocation exhausted or absent'; end if;
 perform 1 from public.partner_packet_entitlement where id=a.packet_entitlement_id for update;
 if not exists(select 1 from public.partner_packet_entitlement e where e.id=a.packet_entitlement_id and e.partner_id=w.partner_record_id and e.effective_at<=now() and (e.expires_at is null or e.expires_at>now()) and e.packet_cap>(select count(*) from public.packet_credit_ledger l where l.entitlement_id=e.id and l.event_type='consumed')) then raise exception 'packet allocation exhausted or absent'; end if;
 select * into consent from public.partner_onboarding_launch_approvals where workspace_id=w.id and approval_type='partner_launch_approval' order by recorded_at desc,id desc limit 1;
 select * into final_review from public.partner_onboarding_launch_approvals where workspace_id=w.id and approval_type='legalease_final_review' order by recorded_at desc,id desc limit 1;
 if consent.id is null or consent.decision<>'approve' or consent.invalidated_at is not null or not exists(select 1 from public.partner_users where auth_user_id=consent.reviewer_user_id and partner_slug=p_slug and role='partner_admin' and status='active') or final_review.id is null or final_review.decision<>'approve' or final_review.invalidated_at is not null then raise exception 'current partner consent and final review required'; end if;
 perform public.rcap_service_assert_internal_actor(final_review.reviewer_user_id);
 if not exists(select 1 from public.partner_onboarding_launch_checks where workspace_id=w.id and check_key='staff_training_completed' and status='passing' and invalidated_at is null) then raise exception 'current training review required'; end if;
 if jsonb_typeof(p_versions)<>'array' or jsonb_array_length(p_versions)<>5 or (select count(distinct item->>'type') from jsonb_array_elements(p_versions) item)<>5 then raise exception 'exact five-material package required'; end if;
 if exists(select 1 from jsonb_array_elements(p_versions) item where not exists(select 1 from public.partner_onboarding_artifact_versions v join public.partner_onboarding_artifacts ar on ar.id=v.artifact_id where v.workspace_id=w.id and v.id=(item->>'id')::uuid and ar.current_version_id=v.id and ar.artifact_type=item->>'type' and ar.artifact_type in ('implementation_brief','operations_escalation_plan','dashboard_user_reporting_matrix','staff_quick_start_guide','co_branded_page_configuration') and v.snapshot_hash=item->>'hash' and item->>'freshness'='current' and v.approval_status='approved' and v.generation_status='succeeded' and v.superseded_at is null and v.source_drift_invalidated_at is null and (ar.artifact_type not in ('implementation_brief','co_branded_page_configuration') or v.partner_review_status='approved'))) then raise exception 'approved package changed' using errcode='40001'; end if;
 if exists(select 1 from public.rcap_launch_operation_events e cross join lateral jsonb_array_elements(e.evidence->'checks') c where e.operation_id=p_operation and e.step='prepared' and exists(select 1 from public.partner_onboarding_launch_checks lc where lc.workspace_id=w.id and lc.check_key=c->>'key' and (lc.status<>c->>'status' or lc.invalidated_at is not null or lc.checked_at is distinct from (c->>'checkedAt')::timestamptz))) then raise exception 'recorded checks changed after snapshot'; end if;
 update public.partner_records set onboarding_status='approved',onboarding_completed_at=coalesce(onboarding_completed_at,now()) where id=w.partner_record_id;
 update public.partner_onboarding set status='live' ,landing_page_ready=true,internal_approved_at=now(),launched_at=now(),rcap_launch_operation_id=p_operation where id=w.id;
 insert into public.rcap_launch_operation_events(workspace_id,partner_slug,operation_id,request_id,step,actor_auth_user_id,snapshot_hash,authority_reference,evidence)
 select workspace_id,partner_slug,operation_id,request_id,'publication_staged',actor_auth_user_id,snapshot_hash,authority_reference,jsonb_build_object('mode','real','commercialAuthorityId',a.id,'workspaceVersion',p_version) from public.rcap_launch_operation_events where workspace_id=w.id and operation_id=p_operation and step='prepared';
 return true;
end $function$
;

CREATE OR REPLACE FUNCTION public.rcap_service_save_onboarding_section(p_partner_slug text, p_actor_user_id uuid, p_workspace_id uuid, p_section_key text, p_expected_revision bigint, p_expected_workspace_version bigint, p_response_data jsonb, p_collections jsonb, p_mode text, p_section_completion integer, p_missing_required_keys text[], p_workspace_completion integer, p_blocker_code text, p_next_action_code text, p_next_action_owner text, p_request_id uuid, p_payload_hash text)
 RETURNS TABLE(section_revision bigint, workspace_aggregate_version bigint, section_status text, duplicate boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_workspace public.partner_onboarding%rowtype;
  v_section public.partner_onboarding_sections%rowtype;
  v_existing public.partner_onboarding_idempotency%rowtype;
  v_next_status text;
  v_next_revision bigint;
  v_first_started boolean := false;
  v_completed boolean := false;
  v_resubmitted boolean := false;
  v_partner_review_pending boolean := false;
  v_event_type text;
  v_event_summary text;
  v_partner_record_id uuid;
begin
  perform public.rcap_service_assert_partner_actor(
    p_partner_slug, p_actor_user_id, p_workspace_id
  );

  if p_section_key not in (
    'organization_contacts',
    'program_goals',
    'geography_audience_language_accessibility',
    'access_sponsorship_capacity',
    'brand_public_page',
    'staff_dashboard_plan',
    'support_referrals_reporting',
    'review_authorization'
  )
     or p_mode not in ('draft_save', 'section_complete')
     or p_expected_revision < 0
     or p_expected_workspace_version < 1
     or p_response_data is null
     or jsonb_typeof(p_response_data) <> 'object'
     or p_collections is null
     or jsonb_typeof(p_collections) <> 'object'
     or octet_length(p_response_data::text) > 65536
     or p_section_completion not between 0 and 100
     or p_workspace_completion not between 0 and 100
     or p_next_action_owner not in ('partner', 'legalease', 'none')
     or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'Invalid onboarding section mutation';
  end if;

  select *
    into v_existing
  from public.partner_onboarding_idempotency i
  where i.request_id = p_request_id
  for update;

  if found then
    if v_existing.workspace_id <> p_workspace_id
       or v_existing.operation_key <> 'section:' || p_section_key
       or v_existing.actor_user_id <> p_actor_user_id
       or v_existing.payload_hash <> p_payload_hash then
      raise exception using
        errcode = '23505',
        message = 'Idempotency request does not match original mutation';
    end if;
    if v_existing.result_status = 'succeeded' then
      return query
      select
        v_existing.result_section_revision,
        v_existing.result_workspace_version,
        coalesce((
          select s.status
          from public.partner_onboarding_sections s
          where s.workspace_id = p_workspace_id
            and s.section_key = p_section_key
        ), 'in_progress'),
        true;
      return;
    end if;
    raise exception using
      errcode = '55000',
      message = 'Idempotent request is still in progress';
  end if;

  select po.*
    into v_workspace
  from public.partner_onboarding po
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug
  for update of po;

  if not found then
    raise exception using errcode = 'P0002', message = 'Onboarding workspace not found';
  end if;
  if v_workspace.aggregate_version <> p_expected_workspace_version then
    raise exception using
      errcode = '40001',
      message = 'Onboarding workspace revision conflict';
  end if;
  select coalesce(v_workspace.partner_record_id, pr.id)
    into v_partner_record_id
  from public.partner_records pr
  where pr.partner_slug = p_partner_slug;
  if v_workspace.rcap_policy_version <> 'rcap2.2' and v_workspace.commercial_gate_status = 'blocked' then
    raise exception using errcode = '55000', message = 'Commercial gate is blocked';
  end if;
  if (v_workspace.rcap_policy_version <> 'rcap2.2' and v_workspace.status not in ('setup_in_progress', 'waiting_on_partner')) or v_workspace.status in ('paused','closed') then
    raise exception using errcode = '55000', message = 'Onboarding workspace is not editable';
  end if;

  insert into public.partner_onboarding_idempotency (
    workspace_id,
    operation_key,
    request_id,
    actor_user_id,
    payload_hash,
    expires_at
  ) values (
    p_workspace_id,
    'section:' || p_section_key,
    p_request_id,
    p_actor_user_id,
    p_payload_hash,
    now() + interval '24 hours'
  );

  select *
    into v_section
  from public.partner_onboarding_sections s
  where s.workspace_id = p_workspace_id
    and s.section_key = p_section_key
  for update;

  if found then
    if v_workspace.rcap_policy_version='rcap2.2' and p_section_key='organization_contacts' and (v_workspace.agreement_status='signed' or exists(select 1 from public.rcap_commercial_authorizations where workspace_id=v_workspace.id)) and nullif(v_section.response_data->>'legal_organization_name','') is not null and p_response_data->>'legal_organization_name' is distinct from v_section.response_data->>'legal_organization_name' then raise exception 'legal identity requires documented internal correction' using errcode='42501';end if;
    if v_workspace.rcap_policy_version <> 'rcap2.2' and v_section.status in ('approved', 'waived', 'not_applicable') then
      raise exception using
        errcode = '42501',
        message = 'Reviewed onboarding section is not partner-editable';
    end if;
    if v_section.revision <> p_expected_revision then
      raise exception using
        errcode = '40001',
        message = 'Onboarding section revision conflict';
    end if;
    v_next_revision := v_section.revision + 1;
    v_first_started := v_section.status = 'not_started';
    v_resubmitted :=
      p_mode = 'section_complete'
      and (
        v_section.status = 'needs_changes'
        or exists (
          select 1
          from public.partner_onboarding_change_requests cr
          where cr.section_id = v_section.id
            and cr.status = 'open'
        )
      );
    v_completed :=
      p_mode = 'section_complete'
      and v_section.status not in ('submitted', 'approved', 'waived', 'not_applicable');
    v_next_status := case
      when p_mode = 'section_complete' then 'submitted'
      when v_workspace.rcap_policy_version='rcap2.2' then 'in_progress'
      when v_section.status = 'needs_changes' then 'in_progress'
      when v_section.status in ('approved', 'waived', 'not_applicable') then v_section.status
      else 'in_progress'
    end;

    update public.partner_onboarding_sections
    set
      response_data = p_response_data,
      revision = v_next_revision,
      status = v_next_status,
      completion_percentage = p_section_completion,
      missing_required_keys = coalesce(p_missing_required_keys, '{}'::text[]),
      first_started_at = coalesce(first_started_at, now()),
      completed_at = case
        when p_mode = 'section_complete' then now()
        else completed_at
      end,
      submitted_at = case
        when p_mode = 'section_complete' then now()
        else submitted_at
      end,
      approved_at = case when v_next_status = 'submitted' or v_workspace.rcap_policy_version='rcap2.2' then null else approved_at end,
      approved_by = case when v_next_status = 'submitted' or v_workspace.rcap_policy_version='rcap2.2' then null else approved_by end,
      reviewed_at = case when v_next_status = 'submitted' or v_workspace.rcap_policy_version='rcap2.2' then null else reviewed_at end,
      reviewed_by = case when v_next_status = 'submitted' or v_workspace.rcap_policy_version='rcap2.2' then null else reviewed_by end,
      review_reason = case when v_next_status = 'submitted' or v_workspace.rcap_policy_version='rcap2.2' then null else review_reason end
    where id = v_section.id;
  else
    if p_expected_revision <> 0 then
      raise exception using
        errcode = '40001',
        message = 'Onboarding section revision conflict';
    end if;
    v_next_revision := 1;
    v_first_started := true;
    v_completed := p_mode = 'section_complete';
    v_next_status := case
      when p_mode = 'section_complete' then 'submitted'
      else 'in_progress'
    end;

    insert into public.partner_onboarding_sections (
      workspace_id,
      section_key,
      response_data,
      revision,
      status,
      completion_percentage,
      missing_required_keys,
      first_started_at,
      completed_at,
      submitted_at
    ) values (
      p_workspace_id,
      p_section_key,
      p_response_data,
      v_next_revision,
      v_next_status,
      p_section_completion,
      coalesce(p_missing_required_keys, '{}'::text[]),
      now(),
      case when p_mode = 'section_complete' then now() end,
      case when p_mode = 'section_complete' then now() end
    )
    returning * into v_section;
  end if;

  if p_section_key = 'organization_contacts' then
    if jsonb_typeof(coalesce(p_collections->'contacts', '[]'::jsonb)) <> 'array' then
      raise exception using errcode = '22023', message = 'Contacts must be an array';
    end if;
    if exists (
      select 1
      from jsonb_array_elements(coalesce(p_collections->'contacts', '[]'::jsonb)) item
      join public.partner_onboarding_contacts existing
        on existing.id = (item->>'stable_row_id')::uuid
      where existing.workspace_id <> p_workspace_id
    ) then
      raise exception using errcode = '42501', message = 'Contact identity belongs to another workspace';
    end if;

    update public.partner_onboarding_contacts c
    set deleted_at = now(), revision = c.revision + 1
    where c.workspace_id = p_workspace_id
      and c.deleted_at is null
      and not exists (
        select 1
        from jsonb_array_elements(coalesce(p_collections->'contacts', '[]'::jsonb)) item
        where item->>'stable_row_id' = c.id::text
      );

    insert into public.partner_onboarding_contacts (
      id, workspace_id, role, name, title, organization, work_email, phone
    )
    select
      (item->>'stable_row_id')::uuid,
      p_workspace_id,
      item->>'role',
      item->>'name',
      item->>'title',
      nullif(item->>'organization', ''),
      lower(item->>'work_email'),
      nullif(item->>'phone', '')
    from jsonb_array_elements(coalesce(p_collections->'contacts', '[]'::jsonb)) item
    on conflict (id) do update
    set
      role = excluded.role,
      name = excluded.name,
      title = excluded.title,
      organization = excluded.organization,
      work_email = excluded.work_email,
      phone = excluded.phone,
      revision = public.partner_onboarding_contacts.revision + 1,
      deleted_at = null
    where public.partner_onboarding_contacts.workspace_id = p_workspace_id;
  elsif p_section_key = 'staff_dashboard_plan' then
    if jsonb_typeof(coalesce(p_collections->'planned_users', '[]'::jsonb)) <> 'array' then
      raise exception using errcode = '22023', message = 'Planned users must be an array';
    end if;
    if exists (
      select 1
      from jsonb_array_elements(coalesce(p_collections->'planned_users', '[]'::jsonb)) item
      join public.partner_onboarding_planned_users existing
        on existing.id = (item->>'stable_row_id')::uuid
      where existing.workspace_id <> p_workspace_id
    ) then
      raise exception using errcode = '42501', message = 'Planned user identity belongs to another workspace';
    end if;

    update public.partner_onboarding_planned_users u
    set deleted_at = now(), revision = u.revision + 1
    where u.workspace_id = p_workspace_id
      and u.deleted_at is null
      and not exists (
        select 1
        from jsonb_array_elements(coalesce(p_collections->'planned_users', '[]'::jsonb)) item
        where item->>'stable_row_id' = u.id::text
      );

    insert into public.partner_onboarding_planned_users (
      id,
      workspace_id,
      name,
      work_email,
      requested_role,
      special_permissions,
      training_attendee
    )
    select
      (item->>'stable_row_id')::uuid,
      p_workspace_id,
      item->>'name',
      lower(item->>'work_email'),
      item->>'requested_role',
      coalesce(
        array(
          select jsonb_array_elements_text(
            coalesce(item->'special_permissions', '[]'::jsonb)
          )
        ),
        '{}'::text[]
      ),
      coalesce((item->>'training_attendee')::boolean, false)
    from jsonb_array_elements(coalesce(p_collections->'planned_users', '[]'::jsonb)) item
    on conflict (id) do update
    set
      name = excluded.name,
      work_email = excluded.work_email,
      requested_role = excluded.requested_role,
      special_permissions = excluded.special_permissions,
      training_attendee = excluded.training_attendee,
      revision = public.partner_onboarding_planned_users.revision + 1,
      deleted_at = null
    where public.partner_onboarding_planned_users.workspace_id = p_workspace_id;
  elsif p_section_key = 'support_referrals_reporting' then
    if jsonb_typeof(coalesce(p_collections->'report_recipients', '[]'::jsonb)) <> 'array' then
      raise exception using errcode = '22023', message = 'Report recipients must be an array';
    end if;
    if exists (
      select 1
      from jsonb_array_elements(coalesce(p_collections->'report_recipients', '[]'::jsonb)) item
      join public.partner_onboarding_report_recipients existing
        on existing.id = (item->>'stable_row_id')::uuid
      where existing.workspace_id <> p_workspace_id
    ) then
      raise exception using errcode = '42501', message = 'Report recipient identity belongs to another workspace';
    end if;

    update public.partner_onboarding_report_recipients r
    set deleted_at = now(), revision = r.revision + 1
    where r.workspace_id = p_workspace_id
      and r.deleted_at is null
      and not exists (
        select 1
        from jsonb_array_elements(coalesce(p_collections->'report_recipients', '[]'::jsonb)) item
        where item->>'stable_row_id' = r.id::text
      );

    insert into public.partner_onboarding_report_recipients (
      id, workspace_id, name, work_email
    )
    select
      (item->>'stable_row_id')::uuid,
      p_workspace_id,
      nullif(item->>'name', ''),
      lower(item->>'work_email')
    from jsonb_array_elements(coalesce(p_collections->'report_recipients', '[]'::jsonb)) item
    on conflict (id) do update
    set
      name = excluded.name,
      work_email = excluded.work_email,
      revision = public.partner_onboarding_report_recipients.revision + 1,
      deleted_at = null
    where public.partner_onboarding_report_recipients.workspace_id = p_workspace_id;
  end if;

  if p_mode = 'section_complete' then
    update public.partner_onboarding_change_requests
    set
      status = 'partner_responded',
      partner_response = 'Updated section submitted for review.',
      responded_by = p_actor_user_id,
      responded_at = now(),
      updated_at = now()
    where workspace_id = p_workspace_id
      and section_id = v_section.id
      and status = 'open';

    v_partner_review_pending :=
      v_resubmitted
      and not exists (
        select 1
        from public.partner_onboarding_change_requests cr
        where cr.workspace_id = p_workspace_id
          and cr.status = 'open'
      );
  end if;

  update public.partner_onboarding
  set
    status = case
      when v_workspace.rcap_policy_version='rcap2.2' then status
      when v_partner_review_pending then 'ready_for_review'
      when exists (
        select 1
        from public.partner_onboarding_change_requests cr
        where cr.workspace_id = p_workspace_id
          and cr.status = 'open'
      ) then 'waiting_on_partner'
      when status = 'waiting_on_partner' then 'setup_in_progress'
      else status
    end,
    aggregate_version = aggregate_version + 1,
    completion_percentage = p_workspace_completion,
    blocker_code = case
      when v_partner_review_pending then null
      else p_blocker_code
    end,
    next_action_code = case
      when v_partner_review_pending then 'await_legalease_review'
      else p_next_action_code
    end,
    next_action_owner = case
      when v_partner_review_pending then 'legalease'
      else p_next_action_owner
    end,
    last_meaningful_activity_at = case
      when v_first_started or v_completed or v_resubmitted then now()
      else last_meaningful_activity_at
    end
  where id = p_workspace_id
  returning aggregate_version into workspace_aggregate_version;

  if v_resubmitted then
    v_event_type := 'section_resubmitted';
    v_event_summary := 'section_resubmitted';
  elsif v_completed then
    v_event_type := 'section_completed';
    v_event_summary := 'section_completed';
  elsif v_first_started then
    v_event_type := 'section_started';
    v_event_summary := 'section_started';
  end if;

  if v_event_type is not null then
    insert into public.partner_onboarding_activity (
      workspace_id,
      event_type,
      section_key,
      status_code,
      summary_code,
      owner_type,
      actor_user_id,
      request_id,
      dedupe_key
    ) values (
      p_workspace_id,
      v_event_type,
      p_section_key,
      v_next_status,
      v_event_summary,
      'partner',
      p_actor_user_id,
      p_request_id,
      p_request_id::text || ':' || v_event_type
    )
    on conflict do nothing;

    insert into public.partner_onboarding_integration_events (
      workspace_id,
      partner_record_id,
      event_type,
      workspace_aggregate_version,
      workspace_status,
      completion_percentage,
      blocker_code,
      next_action_code,
      next_action_owner,
      target_launch_date,
      section_key,
      section_status,
      idempotency_key
    )
    select
      po.id,
      v_partner_record_id,
      case
        when p_section_key = 'brand_public_page' then 'rcap_brand_configuration_changed'
        when p_section_key = 'staff_dashboard_plan' then 'rcap_team_configuration_changed'
        when p_blocker_code is not null then 'rcap_onboarding_blocked'
        else 'rcap_onboarding_progressed'
      end,
      po.aggregate_version,
      po.status,
      po.completion_percentage,
      po.blocker_code,
      po.next_action_code,
      po.next_action_owner,
      po.target_launch_date,
      p_section_key,
      v_next_status,
      p_request_id::text || ':progress'
    from public.partner_onboarding po
    where po.id = p_workspace_id
    on conflict do nothing;
  end if;

  update public.partner_onboarding_idempotency
  set
    result_status = 'succeeded',
    result_workspace_version = workspace_aggregate_version,
    result_section_revision = v_next_revision,
    completed_at = now()
  where request_id = p_request_id;

  section_revision := v_next_revision;
  section_status := v_next_status;
  duplicate := false;
  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rcap_guard_commercial_authorization()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare w public.partner_onboarding%rowtype; r public.partner_records%rowtype; begin
 perform public.rcap_service_assert_internal_actor(new.actor_auth_user_id);
 select * into strict w from public.partner_onboarding where id=new.workspace_id for update;
 select * into strict r from public.partner_records where id=w.partner_record_id for update;
 if w.status='live' or (new.kind<>'screening_only' and w.agreement_status<>'signed') or new.expires_at<=now() then raise exception 'current signed agreement and unpublished program required'; end if;
 if not exists(select 1 from public.partner_onboarding_assets a where a.id=new.document_id and a.workspace_id=w.id and a.category='procurement_document' and a.sha256_hex=new.document_hash and a.lifecycle_status='active' and a.review_status='approved') then raise exception 'approved partner procurement evidence required'; end if;
 if not exists(select 1 from public.partner_onboarding_sections s where s.workspace_id=w.id and s.section_key='access_sponsorship_capacity' and (s.status='approved' or w.rcap_policy_version='rcap2.2') and s.response_data->>'participant_access_model'=new.access_mode) then raise exception 'canonical access scope required'; end if;
 if new.kind='verified_paid' and not coalesce((r.payment_status='paid' and r.stripe_payment_intent_id ~ '^pi_[A-Za-z0-9]+$' and r.paid_at<=now() and r.payment_amount>0),false) then raise exception 'verified payment required'; end if;
 if r.payment_status='demo_paid' then raise exception 'demo payment cannot authorize a real program';end if;
 if r.qualification_status is distinct from 'qualified' then raise exception 'qualification required'; end if;
 if new.kind<>'screening_only' and not exists(select 1 from public.partner_packet_entitlement e where e.id=new.packet_entitlement_id and e.partner_id=r.id and e.entitlement_scope='sponsored_packets' and e.packet_cap>0 and e.effective_at<=now() and (e.expires_at is null or e.expires_at>=new.expires_at)) then raise exception 'current scoped packet allocation required'; end if;
 if new.kind='screening_only' and (w.rcap_policy_version<>'rcap2.2' or new.packet_entitlement_id is not null or new.legal_basis->>'funding_obligation' is distinct from 'none' or coalesce(new.legal_basis->>'agreement_requirement','') not in ('executed','not_required') or coalesce(length(btrim(new.legal_basis->>'policy_reference')),0)<10 or coalesce(length(btrim(new.legal_basis->>'effective_conditions')),0)<10 or coalesce(length(btrim(new.legal_basis->>'termination_rule')),0)<10 or (new.legal_basis->>'agreement_requirement'='executed' and not public.rcap_agreement_clearance(w.id)) or (new.legal_basis->>'agreement_requirement'='not_required' and exists(select 1 from public.partner_onboarding_agreements where workspace_id=w.id and is_required and status not in ('not_required','waived')))) then raise exception 'documented limited service authority required';end if;
 return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.rcap_require_documented_real_agreement()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.rcap_launch_operation_id is not null
      and new.status='live' and new.landing_page_ready
      and (old.status is distinct from 'live' or old.landing_page_ready is distinct from true
        or old.rcap_launch_operation_id is distinct from new.rcap_launch_operation_id)
      and not public.rcap_agreement_clearance(new.id) and not (new.rcap_policy_version='rcap2.2' and public.rcap_program_commercial_valid(new.id)) then
    raise exception 'Current executed agreement evidence and all required contract documents are required for real launch' using errcode='42501';
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.rcap_partner_activation_for_launch(p_slug text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.partner_records r left join public.partner_onboarding w on w.partner_slug=r.partner_slug
 where r.partner_slug=p_slug and r.qualification_status='qualified' and r.provisioning_status in ('active','provisioned') and
 case when w.rcap_launch_operation_id is null then r.payment_status in ('paid','demo_paid') and not exists(select 1 from public.rcap_commercial_authorizations pending where pending.workspace_id=w.id) else
 r.payment_status is distinct from 'demo_paid' and w.status='live' and w.landing_page_ready and w.internal_approved_at is not null and w.launched_at is not null and (case when w.rcap_policy_version='rcap2.2' then public.rcap_program_commercial_valid(w.id) else w.agreement_status='signed' end) and exists(
 select 1 from public.rcap_launch_operation_events e join public.rcap_commercial_authorizations a on a.id=(e.evidence->>'commercialAuthorityId')::uuid
 join public.partner_onboarding_assets d on d.id=a.document_id and d.workspace_id=w.id and d.sha256_hex=a.document_hash
 where e.workspace_id=w.id and e.operation_id=w.rcap_launch_operation_id and e.step in ('public_verified','complete') and (e.step='complete' or e.created_at>now()-interval '15 minutes') and a.workspace_id=w.id and a.expires_at>now() and a.access_mode=r.access_mode
 and d.lifecycle_status='active' and d.review_status='approved' and (a.kind<>'verified_paid' or (r.payment_status='paid' and r.stripe_payment_intent_id ~ '^pi_[A-Za-z0-9]+$' and r.paid_at<=now() and r.payment_amount>0))
 and not exists(select 1 from public.rcap_launch_operation_events failed where failed.operation_id=e.operation_id and failed.step in ('held','failed')))
 end)
$function$
;

CREATE OR REPLACE FUNCTION public.rcap_guard_launch_authority_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_actor uuid;
  v_grant public.rcap_launch_exception_events%rowtype;
  v_prior public.rcap_launch_operation_events%rowtype;
begin
  if tg_table_name='rcap_partner_operator_assignments' then v_actor := new.granted_by;
  else v_actor := new.actor_auth_user_id; end if;
  if not exists(select 1 from public.partner_users where auth_user_id=v_actor and role='internal_admin' and partner_slug is null and status='active') then
    raise exception 'verified internal authority required' using errcode='42501';
  end if;
  if tg_table_name='rcap_partner_operator_assignments' then
    if tg_op='UPDATE' then
      if (to_jsonb(new)-array['revoked_at','revoked_by','revocation_reason']) is distinct from (to_jsonb(old)-array['revoked_at','revoked_by','revocation_reason']) or old.revoked_at is not null or new.revoked_at is null then
        raise exception 'assignment grant is immutable; revocation only' using errcode='42501';
      end if;
      if not exists(select 1 from public.partner_users where auth_user_id=new.revoked_by and role='internal_admin' and partner_slug is null and status='active') then
        raise exception 'verified revocation authority required' using errcode='42501';
      end if;
    end if;
    return new;
  end if;
  if not exists(select 1 from public.partner_onboarding where id=new.workspace_id and partner_slug=new.partner_slug) then
    raise exception 'workspace and partner mismatch' using errcode='42501';
  end if;
  if tg_table_name='rcap_launch_exception_events' then
    if new.policy_version='rcap2.2' then
      if cardinality(new.requirement_keys)=0 or exists(select 1 from unnest(new.requirement_keys) k where not exists(select 1 from jsonb_array_elements(public.rcap_program_requirement_registry()) r where r->>'key'=k and r->>'owner_domain'='legalease_business' and r->>'classification'='EXCEPTION_ELIGIBLE' and r->'exception_effects' ? new.requested_action and new.dependency_hashes->>k=public.rcap_program_dependency_hash(new.workspace_id,array(select jsonb_array_elements_text(r->'dependencies'))))) then raise exception 'protected or stale requirement scope' using errcode='42501';end if;
    elsif new.kind='grant' and new.check_key<>'communications_approved' then raise exception 'separate conditional policy authority required' using errcode='42501'; end if;
    if new.kind='revoke' then
    select * into v_grant from public.rcap_launch_exception_events where id=new.grant_id;
    if not found or v_grant.kind<>'grant' or v_grant.workspace_id<>new.workspace_id or v_grant.partner_slug<>new.partner_slug or v_grant.check_key<>new.check_key then
      raise exception 'revocation scope mismatch' using errcode='42501';
    end if;
    end if;
  elsif tg_table_name='rcap_launch_operation_events' then
    -- Serialize transitions of the same workspace; receipt insertion is atomic.
    perform 1 from public.partner_onboarding where id=new.workspace_id for update;
    if new.step='prepared' and exists(select 1 from public.rcap_launch_operation_events active where active.workspace_id=new.workspace_id and active.step='prepared' and active.operation_id<>new.operation_id and not exists(select 1 from public.rcap_launch_operation_events terminal where terminal.operation_id=active.operation_id and terminal.step in ('complete','held','failed'))) then
      raise exception 'another launch operation is active' using errcode='40001';
    end if;
    select * into v_prior from public.rcap_launch_operation_events where workspace_id=new.workspace_id and operation_id=new.operation_id order by created_at desc limit 1;
    if found and (v_prior.snapshot_hash<>new.snapshot_hash or v_prior.request_id<>new.request_id or v_prior.actor_auth_user_id<>new.actor_auth_user_id or v_prior.authority_reference<>new.authority_reference) then
      raise exception 'operation inputs are immutable' using errcode='40001';
    end if;
    if exists(select 1 from public.rcap_launch_operation_events where workspace_id=new.workspace_id and operation_id=new.operation_id and step in ('complete','held','failed')) then
      raise exception 'terminal operation cannot advance' using errcode='23514';
    end if;
    if new.step='publication_staged' and not exists(select 1 from public.rcap_launch_operation_events where workspace_id=new.workspace_id and operation_id=new.operation_id and step='prepared') then
      raise exception 'preparation receipt required' using errcode='23514';
    elsif new.step='public_verified' and not exists(select 1 from public.rcap_launch_operation_events where workspace_id=new.workspace_id and operation_id=new.operation_id and step='publication_staged') then
      raise exception 'staged publication receipt required' using errcode='23514';
    elsif new.step='complete' and not exists(select 1 from public.rcap_launch_operation_events where workspace_id=new.workspace_id and operation_id=new.operation_id and step='public_verified') then
      raise exception 'independent public verification receipt required' using errcode='23514';
    end if;
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.rcap_service_generate_onboarding_artifact_version(p_partner_slug text, p_actor_user_id uuid, p_workspace_id uuid, p_artifact_type text, p_request_id uuid, p_source_workspace_version bigint, p_source_section_revisions jsonb, p_source_asset_versions jsonb, p_normalized_snapshot jsonb, p_snapshot_hash text, p_generator_version text, p_rendered_content jsonb, p_generation_status text, p_generation_error_code text)
 RETURNS TABLE(version_id uuid, version_number integer, duplicate boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_artifact public.partner_onboarding_artifacts%rowtype;
  v_existing public.partner_onboarding_artifact_versions%rowtype;
  v_next integer;
  v_new public.partner_onboarding_artifact_versions%rowtype;
begin
  if exists(select 1 from public.partner_onboarding where id=p_workspace_id and partner_slug=p_partner_slug and rcap_policy_version='rcap2.2') then
    if not exists(select 1 from public.partner_users where auth_user_id=p_actor_user_id and status='active' and ((partner_slug=p_partner_slug and role='partner_admin') or (partner_slug is null and role='internal_admin'))) then raise exception 'material actor denied' using errcode='42501';end if;
    perform 1 from public.partner_onboarding where id=p_workspace_id and aggregate_version=p_source_workspace_version for update;
    if not found or p_normalized_snapshot->>'rcap_dependency_hash' is distinct from public.rcap_program_material_scope(p_workspace_id,p_artifact_type) then raise exception 'material source changed' using errcode='40001';end if;
  end if;
  if p_generation_status not in ('succeeded', 'failed') then
    raise exception 'invalid_generation_status' using errcode = '22023';
  end if;

  select a.* into v_artifact
  from public.partner_onboarding_artifacts a
  join public.partner_onboarding po on po.id = a.workspace_id
  where a.workspace_id = p_workspace_id
    and a.artifact_type = p_artifact_type
    and po.partner_slug = p_partner_slug
  for update of a;

  if v_artifact.id is null then
    raise exception 'artifact_not_found' using errcode = 'P0002';
  end if;

  if v_artifact.lifecycle_status = 'unavailable_in_release' then
    raise exception 'artifact_generator_unavailable' using errcode = '0A000';
  end if;

  -- Idempotency: the same request id returns the version it already created.
  select v.* into v_existing
  from public.partner_onboarding_artifact_versions v
  where v.artifact_id = v_artifact.id
    and v.request_id = p_request_id;

  if v_existing.id is not null then
    version_id := v_existing.id;
    version_number := v_existing.version_number;
    duplicate := true;
    return next;
    return;
  end if;

  select coalesce(max(v.version_number), 0) + 1 into v_next
  from public.partner_onboarding_artifact_versions v
  where v.artifact_id = v_artifact.id;

  insert into public.partner_onboarding_artifact_versions (
    artifact_id, workspace_id, version_number,
    source_workspace_version, source_section_revisions, source_asset_versions,
    normalized_snapshot, snapshot_hash, generator_version, rendered_content,
    generation_status, generation_error_code,
    approval_status, generated_by, request_id
  )
  values (
    v_artifact.id, p_workspace_id, v_next,
    p_source_workspace_version, p_source_section_revisions, p_source_asset_versions,
    p_normalized_snapshot, p_snapshot_hash, p_generator_version, p_rendered_content,
    p_generation_status, p_generation_error_code,
    case when p_generation_status = 'failed' then 'generation_failed' else 'draft' end,
    p_actor_user_id, p_request_id
  )
  returning * into v_new;

  -- A superseded prior version stays readable in history; it is never rewritten.
  update public.partner_onboarding_artifact_versions
  set approval_status = 'superseded',
      superseded_at = now()
  where artifact_id = v_artifact.id
    and id <> v_new.id
    and approval_status <> 'generation_failed'
    and superseded_at is null;

  update public.partner_onboarding_artifacts
  set current_version_id = v_new.id,
      lifecycle_status = case
        when p_generation_status = 'failed' then 'generation_failed'
        else 'draft'
      end
  where id = v_artifact.id;

  insert into public.partner_onboarding_activity (
    workspace_id, event_type, owner_type, summary_code, status_code,
    artifact_version_id
  )
  values (
    p_workspace_id,
    case when p_generation_status = 'failed'
      then 'artifact_generation_failed'
      else 'artifact_generated'
    end,
    'legalease',
    p_artifact_type,
    p_generation_status,
    v_new.id
  );

  version_id := v_new.id;
  version_number := v_new.version_number;
  duplicate := false;
  return next;
end;
$function$
;

do $privileges$ declare fn regprocedure;begin
 for fn in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any(array['rcap_program_material_scope','rcap_program_requirement_registry','rcap_program_policy_source','rcap_program_dependency_hash','rcap_program_launch_scope','rcap_program_commercial_valid','rcap_service_evaluate_program','rcap_service_enable_program_policy','rcap_service_record_program_decision','rcap_service_record_program_exception','rcap_service_record_limited_program_authority','rcap_service_stage_program_launch']) loop
 execute format('revoke all on function %s from public,anon,authenticated',fn);
 execute format('grant execute on function %s to service_role',fn);
 end loop;end $privileges$;
-- Clinic drafts inherit canonical parent scope; publishing uses the same policy.
-- This helper grants no event membership or participant-data access.
create function public.rcap_program_clinic_scope(p_slug text,p_actor uuid,p_action text,p_jurisdiction text,p_sponsorship integer) returns text
language plpgsql security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; d jsonb; s jsonb; jurisdiction text; available integer;
begin
 select * into strict w from public.partner_onboarding where partner_slug=p_slug for update;
 d:=public.rcap_service_evaluate_program(p_slug,p_actor,p_action);
 if not coalesce((d->>'allowed')::boolean,false) then raise exception 'clinic_parent_program_not_authorized' using errcode='42501';end if;
 s:=public.rcap_program_policy_source(w.id);
 if coalesce(s#>>'{program_goals,participation_mode}','') not in ('clinics','both') then raise exception 'clinic_participation_not_configured';end if;
 jurisdiction:=s#>>'{geography_audience_language_accessibility,jurisdictions,0}';
 if jurisdiction is null or (p_jurisdiction is not null and p_jurisdiction<>jurisdiction) then raise exception 'clinic_parent_jurisdiction_required';end if;
 if p_sponsorship is not null and p_sponsorship>0 then
  perform 1 from public.partner_packet_entitlement where partner_id=w.partner_record_id for update;
  select greatest(0,e.packet_cap-(select count(*) from public.packet_credit_ledger l where l.entitlement_id=e.id and l.event_type in ('reserved','consumed'))) into available
  from public.rcap_commercial_authorizations a join public.partner_packet_entitlement e on e.id=a.packet_entitlement_id where a.workspace_id=w.id and a.kind<>'screening_only' and e.effective_at<=now() and (e.expires_at is null or e.expires_at>now()) order by a.created_at desc,a.id desc limit 1;
  if not public.rcap_program_commercial_valid(w.id) or p_sponsorship>coalesce(available,0) then raise exception 'clinic_cannot_add_sponsorship';end if;
 end if;
 return jurisdiction;
end $$;
revoke all on function public.rcap_program_clinic_scope(text,uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.rcap_program_clinic_scope(text,uuid,text,text,integer) to service_role;

CREATE OR REPLACE FUNCTION public.clinic_create_event(p_actor_user_id uuid, p_partner_slug text, p_public_slug text, p_name text, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_timezone text, p_location_name text, p_geography text, p_capacity integer, p_sponsorship_allocation integer DEFAULT NULL::integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
  if exists(select 1 from public.partner_onboarding where partner_slug=p_partner_slug and rcap_policy_version='rcap2.2') then
    return public.clinic_create_event(p_actor_user_id,p_partner_slug,p_public_slug,p_name,p_starts_at,p_ends_at,p_timezone,p_location_name,p_geography,p_capacity,p_sponsorship_allocation,public.rcap_program_clinic_scope(p_partner_slug,p_actor_user_id,'create_clinic',null,p_sponsorship_allocation));
  end if;
  if not exists (
    select 1 from public.partner_users pu where pu.auth_user_id = p_actor_user_id
      and pu.status = 'active'
      and ((pu.role = 'internal_admin' and pu.partner_slug is null)
        or (pu.role = 'partner_admin' and pu.partner_slug = p_partner_slug))
  ) then raise exception 'clinic_event_forbidden'; end if;
  insert into public.clinic_events(
    partner_slug, public_slug, name, starts_at, ends_at, timezone,
    location_name, geography, capacity, sponsorship_allocation, created_by
  ) values (
    p_partner_slug, lower(trim(p_public_slug)), trim(p_name), p_starts_at, p_ends_at,
    trim(p_timezone), trim(p_location_name), trim(p_geography), p_capacity,
    p_sponsorship_allocation, p_actor_user_id
  ) returning id into v_id;
  insert into public.clinic_event_audit(event_id, actor_user_id, action, target_type, target_id)
  values (v_id, p_actor_user_id, 'event_created', 'event', v_id);
  return v_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.clinic_create_event(p_actor_user_id uuid, p_partner_slug text, p_public_slug text, p_name text, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_timezone text, p_location_name text, p_geography text, p_capacity integer, p_sponsorship_allocation integer, p_jurisdiction text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
  if exists(select 1 from public.partner_onboarding where partner_slug=p_partner_slug and rcap_policy_version='rcap2.2') then
    p_jurisdiction:=public.rcap_program_clinic_scope(p_partner_slug,p_actor_user_id,'create_clinic',p_jurisdiction,p_sponsorship_allocation);
    select response_data->>'service_area_description' into p_geography from public.partner_onboarding_sections s join public.partner_onboarding w on w.id=s.workspace_id where w.partner_slug=p_partner_slug and s.section_key='geography_audience_language_accessibility';
  end if;
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
end $function$
;

CREATE OR REPLACE FUNCTION public.clinic_set_event_status(p_event_id uuid, p_actor_user_id uuid, p_status text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_event public.clinic_events%rowtype;
begin
  select * into v_event from public.clinic_events where id = p_event_id for update;
  if not found then return 'not_found'; end if;
  if not exists (
    select 1 from public.partner_users pu where pu.auth_user_id = p_actor_user_id
      and pu.status = 'active' and ((pu.role = 'internal_admin' and pu.partner_slug is null)
        or (pu.role = 'partner_admin' and pu.partner_slug = v_event.partner_slug))
  ) then return 'forbidden'; end if;
  if p_status='published' and exists(select 1 from public.partner_onboarding where partner_slug=v_event.partner_slug and rcap_policy_version='rcap2.2') then
    perform public.rcap_program_clinic_scope(v_event.partner_slug,p_actor_user_id,'publish_clinic',v_event.jurisdiction,v_event.sponsorship_allocation);
  end if;
  if p_status = v_event.status then return 'unchanged'; end if;
  if not ((v_event.status = 'draft' and p_status = 'published')
    or (v_event.status = 'published' and p_status in ('paused','closed'))
    or (v_event.status = 'paused' and p_status in ('published','closed'))
    or (v_event.status = 'closed' and p_status = 'archived')) then return 'invalid_transition'; end if;
  update public.clinic_events set status = p_status where id = p_event_id;
  if p_status in ('closed','archived') then
    update public.clinic_assisted_sessions set status = 'ended', ended_at = now(), ended_reason = 'event_closed'
    where event_id = p_event_id and status in ('active','handed_off');
  end if;
  insert into public.clinic_event_audit(event_id, actor_user_id, action, target_type, target_id, metadata)
  values (p_event_id, p_actor_user_id, 'event_status_changed', 'event', p_event_id,
    jsonb_build_object('from', v_event.status, 'to', p_status));
  return 'updated';
end $function$
;

commit;
