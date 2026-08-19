-- Forward-only. Adds the single transactional seam that provisions one new RCAP
-- partner tenant.
--
-- Why a database function and not application-level writes: provisioning has to
-- create a partner record, an onboarding workspace, its canonical sections, the
-- implementation milestone checklist, a private participant-page configuration,
-- an audit event, and an idempotency record as ONE logical transaction. A
-- sequence of PostgREST calls cannot roll back a partially created tenant, and a
-- half-provisioned partner is exactly the state that later reads as "this
-- partner exists" while its workspace or page configuration is missing.
--
-- The function creates nothing that is public, active, billed, or credentialed:
-- no Auth user, no membership, no invitation, no access code, no entitlement or
-- packet allocation, no invoice, no publication, no participant intake. Those
-- are separate, separately authorized decisions and stay that way.
--
-- No destructive operation. No table is dropped, no column is removed, no RLS
-- policy is relaxed. Execution is revoked from public, anon, and authenticated
-- and granted only to service_role, which is the server-side role the internal
-- provisioning route runs as.

-- Deterministic address for one partner's participant-page configuration
-- record. Derived from the slug so a replay resolves to the same row and a
-- second configuration for the same partner is impossible by construction. Same
-- addressing idea as firstAdminRecordId in src/lib/partners/first-admin-domain.ts.
create or replace function public.rcap_partner_page_configuration_id(p_partner_slug text)
returns uuid
language sql
immutable
set search_path to ''
as $function$
  select (
    substr(h, 1, 8) || '-' ||
    substr(h, 9, 4) || '-' ||
    '5' || substr(h, 14, 3) || '-' ||
    to_hex(((('x' || substr(h, 17, 2))::bit(8)::int) & 63) | 128) || substr(h, 19, 2) || '-' ||
    substr(h, 21, 12)
  )::uuid
  from (select md5('legalease:partner-page-configuration:' || p_partner_slug) as h) t;
$function$;

revoke all on function public.rcap_partner_page_configuration_id(text) from public;
revoke all on function public.rcap_partner_page_configuration_id(text) from "anon";
revoke all on function public.rcap_partner_page_configuration_id(text) from "authenticated";
revoke all on function public.rcap_partner_page_configuration_id(text) from "service_role";
grant execute on function public.rcap_partner_page_configuration_id(text) to "service_role";

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
     or nullif(btrim(coalesce(p_administrator_name, '')), '') is null
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
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

revoke all on function public.rcap_service_provision_partner(text, text, text, text, text, text, text, text, uuid, uuid, text, text) from public;
revoke all on function public.rcap_service_provision_partner(text, text, text, text, text, text, text, text, uuid, uuid, text, text) from "anon";
revoke all on function public.rcap_service_provision_partner(text, text, text, text, text, text, text, text, uuid, uuid, text, text) from "authenticated";
revoke all on function public.rcap_service_provision_partner(text, text, text, text, text, text, text, text, uuid, uuid, text, text) from "service_role";
grant execute on function public.rcap_service_provision_partner(text, text, text, text, text, text, text, text, uuid, uuid, text, text) to "service_role";
