-- Versioned approved defaults reuse the existing creation and configuration transactions.
begin;
create or replace function public.rcap_service_provision_partner(
  p_partner_slug text,
  p_organization_name text,
  p_legal_organization_name text,
  p_program_name text,
  p_program_purpose text,
  p_administrator_name text,
  p_administrator_email text,
  p_clearance_reason text,
  p_actor_user_id uuid,
  p_request_id uuid,
  p_schema_version text,
  p_payload_hash text
)
returns table(
  partner_record_id uuid,
  workspace_id uuid,
  workspace_status text,
  section_count integer,
  milestone_count integer,
  page_configuration_id uuid,
  created boolean
)
language plpgsql
set search_path to ''
as $function$
declare
  v_partner public.partner_records%rowtype;
  v_workspace public.partner_onboarding%rowtype;
  v_existing public.partner_onboarding_idempotency%rowtype;
  v_operation_key text;
  v_page_config_id uuid;
  v_email text;
  v_conflicts integer;
begin
  -- Only an active internal LegalEase administrator may provision. Partner
  -- administrators, partner staff, and any other tenant fail here with 42501,
  -- which the application renders as one generic denial.
  perform public.rcap_service_assert_internal_actor(p_actor_user_id);

  v_email := lower(btrim(coalesce(p_administrator_email, '')));

  if p_partner_slug !~ '^[a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?$'
     or nullif(btrim(coalesce(p_organization_name, '')), '') is null
     or nullif(btrim(coalesce(p_legal_organization_name, '')), '') is null
     or nullif(btrim(coalesce(p_program_name, '')), '') is null
     or nullif(btrim(coalesce(p_program_purpose, '')), '') is null
     or (not (p_schema_version='rcap-program-provisioning-v2' and btrim(coalesce(p_administrator_name,''))='' and v_email='')
         and (nullif(btrim(coalesce(p_administrator_name, '')), '') is null
              or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'))
     or nullif(btrim(coalesce(p_clearance_reason, '')), '') is null
     or nullif(btrim(coalesce(p_schema_version, '')), '') is null
     or p_request_id is null
     or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid partner provisioning request';
  end if;

  v_operation_key := 'partner:provision:' || p_partner_slug;

  -- Replay. The same idempotency key returns the original result and creates
  -- nothing. A key reused for a different operation, actor, or payload is a
  -- collision, not a replay, and fails closed.
  select *
    into v_existing
  from public.partner_onboarding_idempotency i
  where i.request_id = p_request_id
  for update;
  if found then
    if v_existing.operation_key <> v_operation_key
       or v_existing.actor_user_id <> p_actor_user_id
       or v_existing.payload_hash <> p_payload_hash then
      raise exception using errcode = '23505', message = 'Idempotency request mismatch';
    end if;
    return query
    select
      po.partner_record_id,
      po.id,
      po.status,
      (select count(*)::integer
         from public.partner_onboarding_sections s
        where s.workspace_id = po.id),
      (select count(*)::integer
         from public.partner_onboarding_tasks t
        where t.partner_slug = po.partner_slug),
      public.rcap_partner_page_configuration_id(po.partner_slug),
      false
    from public.partner_onboarding po
    where po.id = v_existing.workspace_id;
    return;
  end if;

  -- Exact slug uniqueness, and fail closed on anything ambiguous already
  -- carrying this slug. A pre-existing workspace, membership, or page
  -- configuration without a partner record is a broken half-state; provisioning
  -- over it would silently adopt records nobody reviewed.
  select count(*) into v_conflicts
  from public.partner_records pr
  where pr.partner_slug = p_partner_slug
     or pr.partner_id = p_partner_slug;
  if v_conflicts > 0 then
    raise exception using errcode = '23505', message = 'Partner slug already exists';
  end if;

  select
      (select count(*) from public.partner_onboarding po where po.partner_slug = p_partner_slug)
    + (select count(*) from public.partner_users pu where pu.partner_slug = p_partner_slug)
    + (select count(*) from public.partner_events pe
        where pe.partner_slug = p_partner_slug
          and pe.event_type in (
            'partner_page_configuration_record',
            'first_admin_invitation_record'
          ))
    into v_conflicts;
  if v_conflicts > 0 then
    raise exception using errcode = '23505', message = 'Ambiguous existing records for partner slug';
  end if;

  -- 1. The partner tenant. Every commercial and activation field is left in its
  -- pre-launch state on purpose: unpaid, unqualified, not provisioned. The
  -- participant activation contract in partner-public-eligibility.ts requires
  -- all three to be positive, so this record cannot activate benefits.
  -- access_mode 'invite_only' with no access code keeps participant intake off.
  insert into public.partner_records (
    partner_id,
    partner_slug,
    partner_name,
    organization_name,
    legal_name,
    program_name,
    program_description,
    primary_contact_name,
    primary_contact_email,
    contact_name,
    contact_email,
    organization_type,
    program_tier,
    access_mode,
    payment_status,
    qualification_status,
    provisioning_status,
    onboarding_status
  ) values (
    p_partner_slug,
    p_partner_slug,
    btrim(p_organization_name),
    btrim(p_organization_name),
    btrim(p_legal_organization_name),
    btrim(p_program_name),
    btrim(p_program_purpose),
    btrim(p_administrator_name),
    v_email,
    btrim(p_administrator_name),
    v_email,
    'other',
    'implementation',
    'invite_only',
    'unpaid',
    'request_received',
    'blocked_payment_required',
    'not_started'
  )
  returning * into v_partner;

  -- 2. The onboarding workspace, carrying the private participant-page
  -- configuration fields. landing_page_ready, internal_approved_at and
  -- launched_at stay false/null, which is what the publication contract reads,
  -- so the public route returns 404.
  insert into public.partner_onboarding (
    partner_slug,
    partner_record_id,
    status,
    agreement_status,
    schema_version,
    aggregate_version,
    completion_percentage,
    blocker_code,
    next_action_code,
    next_action_owner,
    launch_readiness_state,
    public_display_name,
    show_partner_logo,
    show_powered_by,
    landing_page_ready,
    internal_notes,
    commercial_gate_status,
    commercial_gate_changed_at,
    commercial_gate_changed_by,
    last_meaningful_activity_at
  ) values (
    p_partner_slug,
    v_partner.id,
    'commercially_blocked',
    'not_sent',
    p_schema_version,
    1,
    0,
    'commercial_gate_blocked',
    'complete_commercial_requirements',
    'partner',
    'not_ready',
    btrim(p_organization_name),
    true,
    true,
    false,
    'Provisioned under authorized internal clearance: ' || btrim(p_clearance_reason),
    'blocked',
    now(),
    p_actor_user_id,
    now()
  )
  returning * into v_workspace;

  -- 3. The canonical initial onboarding sections, all not started.
  insert into public.partner_onboarding_sections (
    workspace_id,
    section_key,
    response_data,
    revision,
    status,
    completion_percentage,
    missing_required_keys
  )
  select
    v_workspace.id,
    section_key,
    '{}'::jsonb,
    1,
    'not_started',
    0,
    '{}'::text[]
  from unnest(array[
    'organization_contacts',
    'program_goals',
    'geography_audience_language_accessibility',
    'access_sponsorship_capacity',
    'brand_public_page',
    'staff_dashboard_plan',
    'support_referrals_reporting',
    'review_authorization'
  ]::text[]) section_key;

  -- 4. Implementation milestone state. Every milestone starts not started; none
  -- is pre-completed, so the checklist cannot overstate readiness.
  insert into public.partner_onboarding_tasks (
    partner_slug,
    task_key,
    title,
    description,
    owner,
    required,
    status
  )
  select
    p_partner_slug,
    milestone.task_key,
    milestone.title,
    milestone.description,
    milestone.owner,
    milestone.required,
    'not_started'
  from (values
    ('profile_complete', 'Partner profile complete', 'Organization name, contact, and jurisdiction are set.', 'legalease', true),
    ('agreement_billing', 'Agreement and billing configured', 'Agreement status and billing contact are set.', 'legalease', true),
    ('packet_cap', 'Packet cap configured', 'The included packet allocation is set.', 'legalease', true),
    ('overage_pause', 'Overage and pause-at-cap preference configured', 'Decide whether to allow overages or pause at the cap.', 'legalease', true),
    ('access_mode', 'Access mode selected', 'Open link, optional code, required code, or invite only.', 'legalease', true),
    ('codes_created', 'Codes created if required', 'At least one active access code exists when codes are required.', 'legalease', true),
    ('landing_reviewed', 'Landing page preview reviewed', 'The co-branded landing page has been previewed and approved.', 'legalease', true),
    ('admin_invited', 'Partner admin invited', 'At least one partner admin has been invited.', 'legalease', true),
    ('launch_materials', 'Launch materials generated', 'The launch kit (link, QR code, copy) has been generated.', 'legalease', true),
    ('disclaimers_visible', 'Disclaimers visible', 'Not-legal-advice and no-guarantee disclaimers appear on the partner page.', 'legalease', true),
    ('internal_approval', 'Internal approval completed', 'LegalEase has reviewed and approved this partner for launch.', 'legalease', true),
    ('partner_upload_logo', 'Upload your logo', 'Add your organization''s logo for the co-branded page.', 'partner', false),
    ('partner_confirm_description', 'Confirm your public description', 'Review the short description shown to your community.', 'partner', false),
    ('partner_confirm_contact', 'Confirm your main contact', 'Verify the main contact for your program.', 'partner', false),
    ('partner_review_landing', 'Review your landing page', 'Preview how your co-branded page will look.', 'partner', false),
    ('partner_download_materials', 'Download launch materials', 'Grab your link, QR code, and suggested outreach copy.', 'partner', false)
  ) as milestone(task_key, title, description, owner, required);

  -- 5. The private participant-page configuration record. It is stored at a
  -- deterministic id derived from the slug, the same addressing the first-admin
  -- invitation record uses, so a replay can never create a second one.
  v_page_config_id := public.rcap_partner_page_configuration_id(p_partner_slug);
  insert into public.partner_events (id, partner_slug, event_type, event_label, event_payload)
  values (
    v_page_config_id,
    p_partner_slug,
    'partner_page_configuration_record',
    'Participant page configuration',
    jsonb_build_object(
      'schema_version', 1,
      'publication_state', 'private',
      'public_route_state', 'not_found',
      'participant_intake_state', 'inactive',
      'access_mode', 'invite_only',
      'access_code_state', 'absent',
      'sitemap_state', 'absent',
      'navigation_state', 'absent',
      'public_display_name', btrim(p_organization_name),
      'created_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  );

  -- 6. The audit event. It names what was created and, deliberately, what was
  -- not, so a later reader cannot mistake provisioning for launch.
  insert into public.partner_events (partner_slug, event_type, event_label, event_payload)
  values (
    p_partner_slug,
    'partner_tenant_provisioned',
    'Partner tenant provisioned',
    jsonb_build_object(
      'schema_version', 1,
      'request_id', p_request_id::text,
      'actor_user_id', p_actor_user_id::text,
      'clearance_reason', btrim(p_clearance_reason),
      'program_name', btrim(p_program_name),
      'administrator_email', v_email,
      'publication_state', 'private',
      'program_activation_state', 'inactive',
      'participant_intake_state', 'inactive',
      'access_code_state', 'absent',
      'allocation_state', 'absent',
      'billing_state', 'absent',
      'auth_user_created', false,
      'membership_created', false,
      'invitation_created', false,
      'occurred_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  );

  -- 7. The idempotency record, written last inside the same transaction, so it
  -- exists only if every record above committed.
  insert into public.partner_onboarding_idempotency (
    workspace_id,
    operation_key,
    request_id,
    actor_user_id,
    payload_hash,
    result_status,
    result_workspace_version,
    expires_at,
    completed_at
  ) values (
    v_workspace.id,
    v_operation_key,
    p_request_id,
    p_actor_user_id,
    p_payload_hash,
    'succeeded',
    v_workspace.aggregate_version,
    now() + interval '24 hours',
    now()
  );

  insert into public.partner_onboarding_activity (
    workspace_id,
    event_type,
    status_code,
    summary_code,
    owner_type,
    actor_user_id,
    request_id,
    dedupe_key
  ) values (
    v_workspace.id,
    'workspace_created',
    v_workspace.status,
    'workspace_created',
    'legalease',
    p_actor_user_id,
    p_request_id,
    'workspace-created'
  )
  on conflict do nothing;

  return query
  select
    v_partner.id,
    v_workspace.id,
    v_workspace.status,
    (select count(*)::integer
       from public.partner_onboarding_sections s
      where s.workspace_id = v_workspace.id),
    (select count(*)::integer
       from public.partner_onboarding_tasks t
      where t.partner_slug = p_partner_slug),
    v_page_config_id,
    true;
end;
$function$;

-- The extended signature composes the existing transaction and canonical save.
-- Old callers retain the original signature. No memberships, agreements or
-- commercial entitlements are copied or created by the approved template.
create or replace function public.rcap_service_provision_partner(
 p_partner_slug text,p_organization_name text,p_legal_organization_name text,
 p_program_name text,p_program_purpose text,p_administrator_name text,p_administrator_email text,
 p_clearance_reason text,p_actor_user_id uuid,p_request_id uuid,p_schema_version text,p_payload_hash text,
 p_configuration jsonb
) returns table(partner_record_id uuid,workspace_id uuid,workspace_status text,section_count integer,milestone_count integer,page_configuration_id uuid,created boolean)
language plpgsql security invoker set search_path='' as $$
declare result record; snapshot jsonb; changes jsonb; model text;
begin
 perform public.rcap_service_assert_internal_actor(p_actor_user_id);
 if p_configuration->>'template' is distinct from 'screening-standard-v1'
  or jsonb_typeof(p_configuration->'patches') is distinct from 'array'
  or p_schema_version is distinct from 'rcap-program-provisioning-v2' then
  raise exception 'invalid program template' using errcode='22023';
 end if;
 select v#>>'{values,operating_model}' into model from jsonb_array_elements(p_configuration->'patches') v where v->>'section'='program_goals';
 if model is null or model not in ('legalease_managed','partner_managed') then raise exception 'program operator required' using errcode='22023';end if;
 if model='partner_managed' and (length(btrim(coalesce(p_administrator_name,'')))<2 or coalesce(p_administrator_email,'') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
  raise exception 'partner administrator contact required' using errcode='22023';
 end if;
 select * into strict result from public.rcap_service_provision_partner(p_partner_slug,p_organization_name,p_legal_organization_name,p_program_name,p_program_purpose,p_administrator_name,p_administrator_email,p_clearance_reason,p_actor_user_id,p_request_id,p_schema_version,p_payload_hash);
 if result.created then
  perform public.rcap_service_enable_program_policy(p_partner_slug,p_actor_user_id);
  snapshot:=public.rcap_service_get_program_configuration(p_partner_slug,p_actor_user_id);
  select jsonb_agg(v||jsonb_build_object('base',coalesce(snapshot#>array['data',v->>'section'],'{}'::jsonb))) into changes from jsonb_array_elements(p_configuration->'patches') v;
  snapshot:=public.rcap_service_save_program_configuration(p_partner_slug,p_actor_user_id,(snapshot->>'version')::bigint,changes,gen_random_uuid());
  insert into public.partner_events(partner_slug,event_type,event_label,event_payload)
  values(p_partner_slug,'rcap_approved_template_applied','Approved program defaults applied',jsonb_build_object('workspaceId',result.workspace_id,'actor',p_actor_user_id,'template',p_configuration->>'template','requestId',p_request_id,'resultVersion',snapshot->'version'));
  result.workspace_status:=snapshot->>'status';
 end if;
 return query select result.partner_record_id,result.workspace_id,result.workspace_status,result.section_count,result.milestone_count,result.page_configuration_id,result.created;
end $$;
revoke all on function public.rcap_service_provision_partner(text,text,text,text,text,text,text,text,uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.rcap_service_provision_partner(text,text,text,text,text,text,text,text,uuid,uuid,text,text,jsonb) to service_role;

commit;
