-- Non-authoritative RCAP acquisition attribution.
--
-- Partner/program/event/code/Clinic sponsorship remains server-owned in its
-- existing columns. County, UTM, source and referral labels are isolated in a
-- JSON object that grants no entitlement, tenant access, payment posture or
-- packet authority. The pending-result -> matter copy is enforced inside the
-- same transaction as the matter insert.

begin;

create or replace function public.rcap_analytics_attribution_is_valid(value jsonb)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select jsonb_typeof(value) = 'object'
    and not exists (
      select 1
      from jsonb_each(value) entry
      where entry.key <> all (array[
        'county', 'utm_source', 'utm_medium', 'utm_campaign',
        'utm_term', 'utm_content', 'source', 'ref'
      ])
        or jsonb_typeof(entry.value) <> 'string'
        or length(entry.value #>> '{}') = 0
        or length(entry.value #>> '{}') > case when entry.key = 'county' then 80 else 120 end
        or (entry.value #>> '{}') ~ '[[:cntrl:]]'
        or (
          entry.key in ('source', 'ref')
          and (entry.value #>> '{}') ~* '^(?:[a-z][a-z0-9+.-]*:|//)'
        )
    )
$$;

alter table public.screening_sessions
  add column if not exists analytics_attribution jsonb not null default '{}'::jsonb;

alter table public.consumer_pending_screening_results
  add column if not exists analytics_attribution jsonb not null default '{}'::jsonb;

alter table public.screening_sessions
  drop constraint if exists screening_sessions_analytics_attribution_check;
alter table public.screening_sessions
  add constraint screening_sessions_analytics_attribution_check
  check (public.rcap_analytics_attribution_is_valid(analytics_attribution));

alter table public.consumer_pending_screening_results
  drop constraint if exists consumer_pending_screening_results_analytics_attribution_check;
alter table public.consumer_pending_screening_results
  add constraint consumer_pending_screening_results_analytics_attribution_check
  check (public.rcap_analytics_attribution_is_valid(analytics_attribution));

comment on column public.screening_sessions.analytics_attribution is
  'Normalized county/UTM/source/ref acquisition labels. Analytics only: never sponsorship, tenant, Clinic, payment, credit, cap or packet authority.';
comment on column public.consumer_pending_screening_results.analytics_attribution is
  'Server-copied acquisition labels from the exact anonymous screening session. Non-authoritative and claim-bound.';

-- Backward-compatible RPC overload: the existing two-argument function remains
-- available to non-attributed internal callers. This three-argument entrypoint
-- stores analytics in the same transaction that creates the session.
create or replace function public.claim_rcap_screening_session(
  p_partner_slug text,
  p_jurisdiction text,
  p_analytics_attribution jsonb
)
returns table(ok boolean, session_id uuid, reason text, screenings_used integer, screenings_allowed integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result record;
  v_analytics jsonb := coalesce(p_analytics_attribution, '{}'::jsonb);
begin
  if not public.rcap_analytics_attribution_is_valid(v_analytics) then
    v_analytics := '{}'::jsonb;
  end if;

  select result.* into v_result
  from public.claim_rcap_screening_session(p_partner_slug, p_jurisdiction) result;

  if v_result.ok and v_result.session_id is not null then
    update public.screening_sessions
    set analytics_attribution = v_analytics
    where screening_sessions.session_id = v_result.session_id;
  end if;

  return query select
    v_result.ok::boolean,
    v_result.session_id::uuid,
    v_result.reason::text,
    v_result.screenings_used::integer,
    v_result.screenings_allowed::integer;
end
$$;

-- Code-aware overload. Server-owned code validation and redemption remain in
-- the existing function; this wrapper can only attach non-authoritative data to
-- the session that function actually authorized.
create or replace function public.claim_partner_screening_session(
  p_partner_slug text,
  p_jurisdiction text,
  p_code_hash text,
  p_analytics_attribution jsonb,
  p_now timestamptz default now()
)
returns table(
  ok boolean,
  session_id uuid,
  reason text,
  benefit_active boolean,
  attribution_source text,
  campaign_name text,
  access_mode text,
  code_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result record;
  v_analytics jsonb := coalesce(p_analytics_attribution, '{}'::jsonb);
begin
  if not public.rcap_analytics_attribution_is_valid(v_analytics) then
    v_analytics := '{}'::jsonb;
  end if;

  select result.* into v_result
  from public.claim_partner_screening_session(
    p_partner_slug,
    p_jurisdiction,
    p_code_hash,
    p_now
  ) result;

  if v_result.ok and v_result.session_id is not null then
    update public.screening_sessions
    set analytics_attribution = v_analytics
    where screening_sessions.session_id = v_result.session_id;
  end if;

  return query select
    v_result.ok::boolean,
    v_result.session_id::uuid,
    v_result.reason::text,
    v_result.benefit_active::boolean,
    v_result.attribution_source::text,
    v_result.campaign_name::text,
    v_result.access_mode::text,
    v_result.code_id::uuid;
end
$$;

-- The claim RPC inserts the matter and marks its pending result claimed in one
-- transaction. This trigger derives both authority and analytics from the
-- locked pending row at insert time, so removing the application-level copy
-- cannot misbind a different user or matter.
create or replace function public.bind_pending_attribution_to_claimed_matter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pending public.consumer_pending_screening_results%rowtype;
  v_existing_attribution jsonb;
  v_authority jsonb;
begin
  if new.source_pending_result_id is null then
    return new;
  end if;

  select * into v_pending
  from public.consumer_pending_screening_results pending
  where pending.pending_id = new.source_pending_result_id;

  if not found then
    return new;
  end if;

  v_existing_attribution := coalesce(new.artifact_refs_json -> 'attribution', '{}'::jsonb);
  v_authority := jsonb_build_object(
    'partnerSlug', v_pending.partner_slug,
    'programId', v_pending.program_id,
    'eventId', v_pending.event_id,
    'campaignName', v_pending.campaign_name,
    'accessCodeId', v_pending.access_code_id,
    'consentGrantId', v_pending.consent_grant_id
  );

  new.artifact_refs_json := coalesce(new.artifact_refs_json, '{}'::jsonb)
    || jsonb_build_object(
      'attribution',
      v_existing_attribution
        || jsonb_build_object(
          'product', v_pending.product,
          'partnerSlug', v_pending.partner_slug,
          'programId', v_pending.program_id,
          'eventId', v_pending.event_id,
          'campaignName', v_pending.campaign_name,
          'accessCodeId', v_pending.access_code_id,
          'consentGrantId', v_pending.consent_grant_id,
          'locale', v_pending.locale,
          'sponsorshipAuthority', v_authority,
          'analyticsAttribution', v_pending.analytics_attribution
        )
    );

  return new;
end
$$;

drop trigger if exists bind_pending_attribution_to_claimed_matter
  on public.consumer_briefcase_items;
create trigger bind_pending_attribution_to_claimed_matter
before insert or update of source_pending_result_id, artifact_refs_json
on public.consumer_briefcase_items
for each row execute function public.bind_pending_attribution_to_claimed_matter();

revoke all on function public.rcap_analytics_attribution_is_valid(jsonb) from public, anon, authenticated;
grant execute on function public.rcap_analytics_attribution_is_valid(jsonb) to service_role;

revoke all on function public.claim_rcap_screening_session(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.claim_rcap_screening_session(text, text, jsonb) to service_role;

revoke all on function public.claim_partner_screening_session(text, text, text, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_partner_screening_session(text, text, text, jsonb, timestamptz) to service_role;

revoke all on function public.bind_pending_attribution_to_claimed_matter() from public, anon, authenticated;

commit;
