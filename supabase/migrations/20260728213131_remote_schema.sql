SET statement_timeout = 0;

SET lock_timeout = 0;

SET idle_in_transaction_session_timeout = 0;

SET client_encoding = 'UTF8';

SET standard_conforming_strings = on;

SELECT pg_catalog.set_config('search_path', '', false);

SET check_function_bodies = false;

SET xmloption = content;

SET client_min_messages = warning;

SET row_security = off;

COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE OR REPLACE FUNCTION "public"."claim_rcap_screening_session"("p_partner_slug" "text", "p_jurisdiction" "text") RETURNS TABLE("ok" boolean, "session_id" "uuid", "reason" "text", "screenings_used" integer, "screenings_allowed" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
  declare
    v_partner_slug text;
    v_jurisdiction text;
    v_session_id uuid;
    v_screenings_used integer;
    v_screenings_allowed integer;
  begin
    v_partner_slug := nullif(trim(p_partner_slug), '');
    v_jurisdiction := upper(nullif(trim(p_jurisdiction), ''));

    if v_partner_slug is null then
      return query select false, null::uuid, 'partner_inactive'::text,
      null::integer, null::integer;
      return;
    end if;

    if v_jurisdiction is null or v_jurisdiction !~ '^[A-Z]{2,3}$' then
      raise exception 'jurisdiction must be a 2-3 letter uppercase code';
    end if;

    if not exists (
      select 1
      from public.partner_records pr
      where pr.partner_slug = v_partner_slug
        and pr.payment_status in ('paid', 'demo_paid')
        and pr.qualification_status = 'qualified'
        and pr.provisioning_status in ('provisioned', 'active')
    ) then
      return query select false, null::uuid, 'partner_inactive'::text,
      null::integer, null::integer;
      return;
    end if;

    select pe.screenings_used, pe.screenings_allowed
    into v_screenings_used, v_screenings_allowed
    from public.partner_entitlement pe
    where pe.partner_slug = v_partner_slug;

    if v_screenings_allowed is null then
      return query select false, null::uuid, 'partner_inactive'::text,
      null::integer, null::integer;
      return;
    end if;

    v_session_id := gen_random_uuid();

    insert into public.screening_sessions (
      session_id,
      jurisdiction,
      answers,
      current_question_id,
      furthest_stage,
      status,
      last_drop_question,
      partner_slug,
      flow_mode,
      claimed_slot_state
    )
    values (
      v_session_id,
      v_jurisdiction,
      '{}'::jsonb,
      null,
      null,
      'in_progress',
      null,
      v_partner_slug,
      'rcap',
      'claimed'
    );

    return query
    select true, v_session_id, null::text, v_screenings_used, v_screenings_allowed;
  end;
  $_$;

ALTER FUNCTION "public"."claim_rcap_screening_session"("p_partner_slug" "text", "p_jurisdiction" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."claim_rcap_screening_session"("p_partner_slug" "text", "p_jurisdiction" "text") IS 'Validates an active RCAP partner and creates an attributed screening session
    without consuming partner packet capacity.';

CREATE OR REPLACE FUNCTION "public"."consume_rcap_screening_session"("p_session_id" "uuid") RETURNS TABLE("consumed" boolean, "partner_slug" "text", "claimed_slot_state" "text", "status" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    with consumed_session as (
      update public.screening_sessions ss
      set status = 'completed',
          updated_at = now()
      where ss.session_id = p_session_id
        and ss.flow_mode = 'rcap'
        and ss.partner_slug is not null
        and ss.status <> 'completed'
      returning ss.partner_slug, ss.claimed_slot_state, ss.status
    )
    select true, cs.partner_slug, cs.claimed_slot_state, cs.status
    from consumed_session cs
    union all
    select false, ss.partner_slug, ss.claimed_slot_state, ss.status
    from public.screening_sessions ss
    where ss.session_id = p_session_id
      and ss.flow_mode = 'rcap'
      and not exists (select 1 from consumed_session)
    limit 1;
  $$;

ALTER FUNCTION "public"."consume_rcap_screening_session"("p_session_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."consume_rcap_screening_session"("p_session_id" "uuid") IS 'Marks an attributed RCAP screening session completed without consuming partner
    packet capacity.';

CREATE OR REPLACE FUNCTION "public"."content_apply_legal_review"("p_post_id" "uuid", "p_decision" "text", "p_notes" "text" DEFAULT NULL::"text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
  v_role text := public.content_current_role();
  v_status text;
  v_next_status text;
begin
  if v_actor is null then
    raise exception 'content_apply_legal_review: authentication required';
  end if;

  if v_role is null or v_role not in ('primary_admin', 'legal_reviewer') then
    raise exception 'content_apply_legal_review: a legal reviewer or primary admin is required (current content role: %)',
      coalesce(v_role, 'none');
  end if;

  if p_decision not in ('approved', 'changes_requested') then
    raise exception 'content_apply_legal_review: decision must be approved or changes_requested, got %', p_decision;
  end if;

  select status into v_status from public.content_posts where post_id = p_post_id;

  if v_status is null then
    raise exception 'content_apply_legal_review: post % does not exist', p_post_id;
  end if;

  -- Fail closed on an ineligible workflow state: a legal reviewer cannot "approve" a draft into
  -- existence, and cannot re-approve something already live.
  if v_status <> 'in_legal_review' then
    raise exception 'content_apply_legal_review: post % is in status %, but legal review can only act on in_legal_review',
      p_post_id, v_status;
  end if;

  v_next_status := case when p_decision = 'approved' then 'approved' else 'changes_requested' end;

  -- Column-scoped by construction. Note published_at/scheduled_for/status-to-published are absent.
  update public.content_posts
  set status = v_next_status,
      legal_approved_at = case when p_decision = 'approved' then now() else null end,
      legal_approved_by = case when p_decision = 'approved' then v_actor else null end
  where post_id = p_post_id;

  insert into public.content_reviews (post_id, review_kind, decision, notes, reviewer_id)
  values (p_post_id, 'legal', p_decision, p_notes, v_actor);

  insert into public.content_audit_events (actor_id, actor_role, action, entity_type, entity_id, detail)
  values (
    v_actor,
    v_role,
    case when p_decision = 'approved' then 'legal_approved' else 'changes_requested' end,
    'content_post',
    p_post_id::text,
    jsonb_build_object('decision', p_decision, 'from_status', v_status, 'to_status', v_next_status)
  );

  return v_next_status;
end;
$$;

ALTER FUNCTION "public"."content_apply_legal_review"("p_post_id" "uuid", "p_decision" "text", "p_notes" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."content_apply_legal_review"("p_post_id" "uuid", "p_decision" "text", "p_notes" "text") IS 'The only path that may write content_posts.legal_approved_*. Column-scoped: cannot publish, schedule, archive, or rewrite a post.';

CREATE OR REPLACE FUNCTION "public"."content_can_edit_any"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select public.content_current_role() in ('primary_admin', 'editor')
$$;

ALTER FUNCTION "public"."content_can_edit_any"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."content_can_legal_approve"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select public.content_current_role() in ('primary_admin', 'legal_reviewer')
$$;

ALTER FUNCTION "public"."content_can_legal_approve"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."content_can_publish"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select public.content_current_role() in ('primary_admin', 'editor')
$$;

ALTER FUNCTION "public"."content_can_publish"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."content_current_partner_slug"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select cau.partner_slug
  from public.content_admin_users cau
  where cau.auth_user_id = auth.uid()
    and cau.status = 'active'
    and cau.content_role = 'partner_contributor'
  limit 1
$$;

ALTER FUNCTION "public"."content_current_partner_slug"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."content_current_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select case
    when public.is_internal_admin() then 'primary_admin'
    else (
      select cau.content_role
      from public.content_admin_users cau
      where cau.auth_user_id = auth.uid()
        and cau.status = 'active'
      limit 1
    )
  end
$$;

ALTER FUNCTION "public"."content_current_role"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."content_current_role"() IS 'Effective content role for the current caller. Internal admins resolve to primary_admin.';

CREATE OR REPLACE FUNCTION "public"."content_enforce_publish_authority"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  publishing_states constant text[] := array['published', 'updated', 'scheduled'];
  touches_publication boolean;
  enters_public_state boolean;
  requires_legal_review boolean;
begin
  if auth.role() not in ('authenticated', 'service_role') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status = any (publishing_states) or new.published_at is not null then
      if auth.role() = 'authenticated' and not public.content_can_publish() then
        raise exception 'content_posts: creating a post in a published/scheduled state requires a publishing role (current content role: %)',
          coalesce(public.content_current_role(), 'none');
      end if;

      -- Browser inserts are also constrained by RLS to draft/review states. A service worker must
      -- never synthesize a live row and thereby skip the review-state history.
      if new.status in ('published', 'updated', 'scheduled') then
        raise exception 'content_posts: a post must enter publication through an eligible existing workflow state';
      end if;
    end if;
    return new;
  end if;

  touches_publication :=
    (new.status = any (publishing_states)) is distinct from (old.status = any (publishing_states))
    or (old.status = any (publishing_states) and new.status is distinct from old.status)
    or new.published_at is distinct from old.published_at
    or new.scheduled_for is distinct from old.scheduled_for
    or (new.status = 'archived' and old.status is distinct from 'archived');

  if touches_publication and auth.role() = 'authenticated' and not public.content_can_publish() then
    raise exception 'content_posts: publishing, scheduling, unpublishing, and archiving require a publishing role (current content role: %)',
      coalesce(public.content_current_role(), 'none');
  end if;

  enters_public_state := new.status in ('published', 'updated') and new.status is distinct from old.status;

  -- Publication is a separate operation after approval. This blocks draft -> published,
  -- in_legal_review -> published, and approved -> updated even for a publishing role or a
  -- service-role application path.
  if enters_public_state then
    if new.status = 'published' and old.status not in ('approved', 'scheduled', 'updated') then
      raise exception 'content_posts: published may be entered only from approved, scheduled, or updated (current status: %)', old.status;
    end if;

    if new.status = 'updated' and old.status <> 'published' then
      raise exception 'content_posts: updated may be entered only from published (current status: %)', old.status;
    end if;
  end if;

  requires_legal_review :=
    new.content_type in ('state_resource', 'resource_guide') or new.legal_sensitive;

  -- The approval must PRE-DATE the publishing statement and must be backed by the immutable
  -- decision record emitted by content_apply_legal_review(). Merely supplying plausible UUID and
  -- timestamp values in the publication UPDATE is never sufficient.
  if requires_legal_review and new.status in ('published', 'updated', 'scheduled') then
    if old.legal_approved_at is null
      or old.legal_approved_by is null
      or new.legal_approved_at is distinct from old.legal_approved_at
      or new.legal_approved_by is distinct from old.legal_approved_by
    then
      raise exception 'content_posts: legal approval must already exist and remain unchanged before publication or scheduling';
    end if;

    if not exists (
      select 1
      from public.content_reviews r
      where r.post_id = old.post_id
        and r.review_kind = 'legal'
        and r.decision = 'approved'
        and r.reviewer_id = old.legal_approved_by
        and r.created_at <= now()
    ) then
      raise exception 'content_posts: publication requires a matching approved legal-review record';
    end if;
  end if;

  return new;
end;
$$;

ALTER FUNCTION "public"."content_enforce_publish_authority"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."content_enforce_publish_authority"() IS 'Backstop for publication authority and approval provenance. Browser publication requires content_can_publish(); legal publication also requires unchanged prior approval fields plus a matching approved legal-review record.';

CREATE OR REPLACE FUNCTION "public"."content_has_any_role"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select public.content_current_role() is not null
$$;

ALTER FUNCTION "public"."content_has_any_role"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."content_media_is_public"("p_media_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (select 1 from public.content_public_media where media_id = p_media_id)
$$;

ALTER FUNCTION "public"."content_media_is_public"("p_media_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."content_media_is_public"("p_media_id" "uuid") IS 'True when the asset is referenced by published content. The media route requires this before minting a signed URL.';

CREATE OR REPLACE FUNCTION "public"."current_partner_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    select pu.role
    from public.partner_users pu
    where pu.auth_user_id = auth.uid()
      and pu.status = 'active'
  $$;

ALTER FUNCTION "public"."current_partner_role"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."current_partner_role"() IS 'Returns the active partner_users role for auth.uid(), if one exists.';

CREATE OR REPLACE FUNCTION "public"."current_partner_slug"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    select pu.partner_slug
    from public.partner_users pu
    where pu.auth_user_id = auth.uid()
      and pu.status = 'active'
      and pu.role in ('partner_admin', 'partner_staff')
  $$;

ALTER FUNCTION "public"."current_partner_slug"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."current_partner_slug"() IS 'Returns the active partner slug for the authenticated partner user. NULL intentionally grants no
    partner-scoped rows.';

CREATE OR REPLACE FUNCTION "public"."increment_request_rate_limit_bucket"("p_scope" "text", "p_bucket_key" "text", "p_window_start" timestamp with time zone, "p_window_seconds" integer, "p_limit" integer) RETURNS TABLE("allowed" boolean, "count" integer, "remaining" integer, "reset_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
declare
  v_count integer;
  v_reset_at timestamptz;
begin
  if p_scope is null or length(trim(p_scope)) = 0 then
    raise exception 'rate limit scope is required';
  end if;

  if p_bucket_key is null or length(trim(p_bucket_key)) = 0 then
    raise exception 'rate limit bucket key is required';
  end if;

  if p_window_seconds is null or p_window_seconds <= 0 then
    raise exception 'rate limit window must be positive';
  end if;

  if p_limit is null or p_limit <= 0 then
    raise exception 'rate limit must be positive';
  end if;

  v_reset_at := p_window_start + make_interval(secs => p_window_seconds);

  delete from public.request_rate_limit_buckets
  where expires_at < now();

  insert into public.request_rate_limit_buckets (
    scope,
    bucket_key,
    window_start,
    window_seconds,
    count,
    expires_at
  )
  values (
    p_scope,
    p_bucket_key,
    p_window_start,
    p_window_seconds,
    1,
    v_reset_at
  )
  on conflict (scope, bucket_key, window_start)
  do update set
    count = public.request_rate_limit_buckets.count + 1,
    window_seconds = excluded.window_seconds,
    expires_at = excluded.expires_at,
    updated_at = now()
  returning public.request_rate_limit_buckets.count into v_count;

  return query
  select
    v_count <= p_limit,
    v_count,
    greatest(p_limit - v_count, 0),
    v_reset_at;
end;
$$;

ALTER FUNCTION "public"."increment_request_rate_limit_bucket"("p_scope" "text", "p_bucket_key" "text", "p_window_start" timestamp with time zone, "p_window_seconds" integer, "p_limit" integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."is_internal_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    select exists (
      select 1
      from public.partner_users pu
      where pu.auth_user_id = auth.uid()
        and pu.status = 'active'
        and pu.role = 'internal_admin'
        and pu.partner_slug is null
    )
  $$;

ALTER FUNCTION "public"."is_internal_admin"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."is_internal_admin"() IS 'Returns true only for an active internal_admin partner_users row with NULL partner_slug.';

CREATE OR REPLACE FUNCTION "public"."prevent_rcap_record_events_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  raise exception 'rcap_record_events is append-only';
end;
$$;

ALTER FUNCTION "public"."prevent_rcap_record_events_mutation"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."rcap_partner_person_outcome_counts"("input_partner_slug" "text") RETURNS TABLE("relief_outcome" "text", "distinct_people" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select
    p.relief_outcome,
    count(distinct p.person_id)::bigint as distinct_people
  from rcap_document_packets p
  where p.partner_slug = input_partner_slug
    and p.person_id is not null
  group by p.relief_outcome
  order by p.relief_outcome;
$$;

ALTER FUNCTION "public"."rcap_partner_person_outcome_counts"("input_partner_slug" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."rcap_screening_session_is_release_expired"("p_status" "text", "p_created_at" timestamp with time zone, "p_resume_token_expires_at" timestamp with time zone, "p_now" timestamp with time zone DEFAULT "now"()) RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select
    p_status in ('in_progress', 'resumed')
    and coalesce(p_resume_token_expires_at, p_created_at + interval '7 days') <= p_now;
$$;

ALTER FUNCTION "public"."rcap_screening_session_is_release_expired"("p_status" "text", "p_created_at" timestamp with time zone, "p_resume_token_expires_at" timestamp with time zone, "p_now" timestamp with time zone) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."rcap_screening_session_is_release_expired"("p_status" "text", "p_created_at" timestamp with time zone, "p_resume_token_expires_at" timestamp with time zone, "p_now" timestamp with time zone) IS 'Shared RCAP slot expiry predicate. Mirrors the 7-day resume-token window, falling back to created_at for sessions with no resume token.';

CREATE OR REPLACE FUNCTION "public"."recompute_rcap_partner_entitlements"("p_partner_slug" "text" DEFAULT NULL::"text", "p_now" timestamp with time zone DEFAULT "now"()) RETURNS TABLE("partner_slug" "text", "screenings_used" integer, "screenings_allowed" integer, "ledger_count" integer, "period_label" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    with ledger as (
      select
        pe.partner_slug,
        count(ss.session_id)::integer as ledger_count
      from public.partner_entitlement pe
      left join public.screening_sessions ss
        on ss.partner_slug = pe.partner_slug
       and ss.flow_mode = 'rcap'
       and ss.claimed_slot_state = 'consumed'
      where p_partner_slug is null
         or pe.partner_slug = p_partner_slug
      group by pe.partner_slug
    ),
    updated_entitlements as (
      update public.partner_entitlement pe
      set screenings_used = l.ledger_count,
          updated_at = now()
      from ledger l
      where pe.partner_slug = l.partner_slug
      returning pe.partner_slug, pe.screenings_used, pe.screenings_allowed,
      l.ledger_count, pe.period_label
    )
    select ue.partner_slug, ue.screenings_used, ue.screenings_allowed,
    ue.ledger_count, ue.period_label
    from updated_entitlements ue
    order by ue.partner_slug;
  $$;

ALTER FUNCTION "public"."recompute_rcap_partner_entitlements"("p_partner_slug" "text", "p_now" timestamp with time zone) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."recompute_rcap_partner_entitlements"("p_partner_slug" "text", "p_now" timestamp with time zone) IS 'Rebuilds partner_entitlement.screenings_used from consumed partner packet-
    generation sessions only.';

CREATE OR REPLACE FUNCTION "public"."record_rcap_partner_packet_generation"("p_session_id" "uuid") RETURNS TABLE("recorded" boolean, "partner_slug" "text", "claimed_slot_state" "text", "status" "text", "screenings_used" integer, "screenings_allowed" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    with counted_session as (
      update public.screening_sessions ss
      set claimed_slot_state = 'consumed',
          status = 'completed',
          updated_at = now()
      where ss.session_id = p_session_id
        and ss.flow_mode = 'rcap'
        and ss.partner_slug is not null
        and ss.claimed_slot_state = 'claimed'
        and exists (
          select 1
          from public.partner_entitlement pe
          where pe.partner_slug = ss.partner_slug
            and pe.screenings_used < pe.screenings_allowed
        )
      returning ss.partner_slug, ss.claimed_slot_state, ss.status
    ),
    incremented_entitlement as (
      update public.partner_entitlement pe
      set screenings_used = pe.screenings_used + 1,
          updated_at = now()
      from counted_session cs
      where pe.partner_slug = cs.partner_slug
        and pe.screenings_used < pe.screenings_allowed
      returning pe.partner_slug, pe.screenings_used, pe.screenings_allowed
    )
    select
      true,
      cs.partner_slug,
      cs.claimed_slot_state,
      cs.status,
      ie.screenings_used,
      ie.screenings_allowed
    from counted_session cs
    join incremented_entitlement ie on ie.partner_slug = cs.partner_slug
    union all
    select
      false,
      ss.partner_slug,
      ss.claimed_slot_state,
      ss.status,
      pe.screenings_used,
      pe.screenings_allowed
    from public.screening_sessions ss
    left join public.partner_entitlement pe on pe.partner_slug = ss.partner_slug
    where ss.session_id = p_session_id
      and ss.flow_mode = 'rcap'
      and not exists (select 1 from counted_session)
    limit 1;
  $$;

ALTER FUNCTION "public"."record_rcap_partner_packet_generation"("p_session_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."record_rcap_partner_packet_generation"("p_session_id" "uuid") IS 'Consumes one partner packet-cap unit exactly once when a partner-covered
    packet is generated.';

CREATE OR REPLACE FUNCTION "public"."reject_content_audit_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  raise exception 'content_audit_events is append-only';
end;
$$;

ALTER FUNCTION "public"."reject_content_audit_mutation"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."release_expired_rcap_screening_slots"("p_now" timestamp with time zone DEFAULT "now"()) RETURNS TABLE("partner_slug" "text", "released_count" integer, "screenings_used" integer, "screenings_allowed" integer, "period_label" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    with released_sessions as (
      update public.screening_sessions ss
      set claimed_slot_state = 'released',
          updated_at = now()
      where ss.flow_mode = 'rcap'
        and ss.partner_slug is not null
        and ss.claimed_slot_state = 'claimed'
        and public.rcap_screening_session_is_release_expired(
          ss.status,
          ss.created_at,
          ss.resume_token_expires_at,
          p_now
        )
      returning ss.partner_slug
    ),
    release_counts as (
      select rs.partner_slug, count(*)::integer as released_count
      from released_sessions rs
      group by rs.partner_slug
    )
    select pe.partner_slug, rc.released_count, pe.screenings_used,
    pe.screenings_allowed, pe.period_label
    from release_counts rc
    join public.partner_entitlement pe on pe.partner_slug = rc.partner_slug
    order by pe.partner_slug;
  $$;

ALTER FUNCTION "public"."release_expired_rcap_screening_slots"("p_now" timestamp with time zone) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."release_expired_rcap_screening_slots"("p_now" timestamp with time zone) IS 'Marks expired unfinished RCAP screening sessions released without decrementing
    packet-cap usage.';

CREATE OR REPLACE FUNCTION "public"."set_content_admin_users_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

ALTER FUNCTION "public"."set_content_admin_users_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."set_content_authors_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

ALTER FUNCTION "public"."set_content_authors_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."set_content_campaigns_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

ALTER FUNCTION "public"."set_content_campaigns_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."set_content_media_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

ALTER FUNCTION "public"."set_content_media_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."set_content_posts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

ALTER FUNCTION "public"."set_content_posts_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."set_content_promotion_outbox_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

ALTER FUNCTION "public"."set_content_promotion_outbox_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."set_content_social_drafts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

ALTER FUNCTION "public"."set_content_social_drafts_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."set_content_state_editorial_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

ALTER FUNCTION "public"."set_content_state_editorial_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."set_content_testimonials_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

ALTER FUNCTION "public"."set_content_testimonials_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."set_partner_entitlement_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

ALTER FUNCTION "public"."set_partner_entitlement_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."set_partner_users_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
  begin
    new.updated_at = now();
    return new;
  end;
  $$;

ALTER FUNCTION "public"."set_partner_users_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."set_rcap_document_packets_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  begin
    new.updated_at = now();
    return new;
  end;
  $$;

ALTER FUNCTION "public"."set_rcap_document_packets_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."write_rcap_document_packet_relief_outcome_event"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if old.relief_outcome is distinct from new.relief_outcome then
    insert into rcap_record_events (
      record_type,
      record_id,
      partner_slug,
      partner_id,
      event_type,
      from_status,
      to_status,
      actor,
      metadata
    )
    values (
      'document_packet',
      new.id::text,
      new.partner_slug,
      null,
      'relief_outcome_changed',
      old.relief_outcome,
      new.relief_outcome,
      coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), 'system'),
      jsonb_build_object(
        'state', new.state,
        'county', new.county,
        'document_type', new.document_type,
        'pathway', new.pathway,
        'status', new.status,
        'has_briefcase_item', new.briefcase_id is not null,
        'source', 'rcap_document_packets_relief_outcome_trigger'
      )
    );
  end if;

  return new;
end;
$$;

ALTER FUNCTION "public"."write_rcap_document_packet_relief_outcome_event"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."consumer_briefcase_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "item_type" "text" NOT NULL,
    "jurisdiction" "text" NOT NULL,
    "pathway_label" "text",
    "result_code" "text",
    "packet_type" "text",
    "payment_allowed" boolean DEFAULT false NOT NULL,
    "status" "text" NOT NULL,
    "summary_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "next_steps_json" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "artifact_refs_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "payment_status" "text" DEFAULT 'not_applicable'::"text" NOT NULL,
    "packet_status" "text" DEFAULT 'not_started'::"text" NOT NULL,
    "reminder_at" timestamp with time zone,
    "source_session_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_provider" "text",
    "checkout_session_id" "text",
    "payment_intent_id" "text",
    "amount_cents" integer,
    "receipt_url" "text",
    CONSTRAINT "consumer_briefcase_items_amount_cents_check" CHECK ((("amount_cents" IS NULL) OR ("amount_cents" = 5000))),
    CONSTRAINT "consumer_briefcase_items_item_type_check" CHECK (("item_type" = ANY (ARRAY['eligibility_check'::"text", 'result'::"text", 'packet'::"text", 'wilma_conversation'::"text"]))),
    CONSTRAINT "consumer_briefcase_items_packet_status_check" CHECK (("packet_status" = ANY (ARRAY['not_started'::"text", 'pending'::"text", 'generating'::"text", 'ready'::"text", 'failed'::"text", 'downloaded'::"text"]))),
    CONSTRAINT "consumer_briefcase_items_packet_type_check" CHECK ((("packet_type" IS NULL) OR ("packet_type" = ANY (ARRAY['official_pdf_overlay'::"text", 'custom_pleading'::"text", 'legacy_packet'::"text", 'guidance_packet'::"text"])))),
    CONSTRAINT "consumer_briefcase_items_payment_provider_check" CHECK ((("payment_provider" IS NULL) OR ("payment_provider" = ANY (ARRAY['stripe'::"text", 'dry_run'::"text"])))),
    CONSTRAINT "consumer_briefcase_items_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['not_applicable'::"text", 'unpaid'::"text", 'paid'::"text", 'refunded'::"text"]))),
    CONSTRAINT "consumer_briefcase_items_result_code_check" CHECK ((("result_code" IS NULL) OR ("result_code" = ANY (ARRAY['packet_ready'::"text", 'packet_ready_with_caution'::"text", 'needs_more_info'::"text", 'not_yet'::"text", 'guidance_only'::"text", 'not_covered_yet'::"text", 'likely_not_eligible'::"text", 'needs_review'::"text", 'hard_stop'::"text"])))),
    CONSTRAINT "consumer_briefcase_items_status_check" CHECK (("status" = ANY (ARRAY['check_saved'::"text", 'guidance_saved'::"text", 'packet_ready'::"text", 'needs_info'::"text", 'needs_review'::"text", 'waiting'::"text", 'not_eligible'::"text", 'hard_stop'::"text"])))
);

ALTER TABLE "public"."consumer_briefcase_items" OWNER TO "postgres";

COMMENT ON TABLE "public"."consumer_briefcase_items" IS 'Expungement.ai consumer-owned Briefcase items. Isolated from partner RCAP records.';

COMMENT ON COLUMN "public"."consumer_briefcase_items"."user_id" IS 'Auth user owner. RLS policies require auth.uid() to match this value for consumer access.';

COMMENT ON COLUMN "public"."consumer_briefcase_items"."packet_status" IS 'Consumer packet generation lifecycle for paid Expungement.ai packets: not_started, pending, generating, ready, failed, downloaded.';

COMMENT ON COLUMN "public"."consumer_briefcase_items"."payment_provider" IS 'Consumer checkout provider for Expungement.ai packet payments. Isolated from partner billing.';

COMMENT ON COLUMN "public"."consumer_briefcase_items"."checkout_session_id" IS 'Stripe Checkout session ID or dry-run session ID for consumer packet checkout.';

COMMENT ON COLUMN "public"."consumer_briefcase_items"."amount_cents" IS 'Consumer packet checkout amount. Current product price is fixed at 5000 cents.';

CREATE TABLE IF NOT EXISTS "public"."consumer_pending_screening_results" (
    "pending_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pending_token_hash" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '24:00:00'::interval) NOT NULL,
    "claimed_at" timestamp with time zone,
    "claimed_user_id" "uuid",
    "product" "text" DEFAULT 'expungement_ai_dtc'::"text" NOT NULL,
    "jurisdiction" "text" NOT NULL,
    "result_code" "text" NOT NULL,
    "pathway_label" "text",
    "packet_type" "text",
    "payment_allowed" boolean DEFAULT false NOT NULL,
    "summary" "text" NOT NULL,
    "next_steps" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "screening_answers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "result_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "profile_version" "text",
    "matter_id" "text",
    "packet_plan" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "source_session_id" "uuid",
    CONSTRAINT "consumer_pending_screening_results_next_steps_check" CHECK (("jsonb_typeof"("next_steps") = 'array'::"text")),
    CONSTRAINT "consumer_pending_screening_results_packet_plan_check" CHECK (("jsonb_typeof"("packet_plan") = 'object'::"text")),
    CONSTRAINT "consumer_pending_screening_results_product_check" CHECK (("product" = ANY (ARRAY['expungement_ai_dtc'::"text", 'rcap_partner'::"text"]))),
    CONSTRAINT "consumer_pending_screening_results_result_payload_check" CHECK (("jsonb_typeof"("result_payload") = 'object'::"text")),
    CONSTRAINT "consumer_pending_screening_results_screening_answers_check" CHECK (("jsonb_typeof"("screening_answers") = 'object'::"text"))
);

ALTER TABLE "public"."consumer_pending_screening_results" OWNER TO "postgres";

COMMENT ON TABLE "public"."consumer_pending_screening_results" IS 'Short-lived unauthenticated Expungement.ai DTC screening result handoff used to attach a completed possible-path result to a user after email verification.';

COMMENT ON COLUMN "public"."consumer_pending_screening_results"."pending_token_hash" IS 'Optional hash for a future opaque pending token. Direct client access is denied by RLS; server claims currently use pending_id only.';

COMMENT ON COLUMN "public"."consumer_pending_screening_results"."screening_answers" IS 'Raw answers needed to resume or audit the completed check. The URL carries only pending_id, never answers.';

CREATE TABLE IF NOT EXISTS "public"."consumer_wilma_telemetry" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "exchange_id" "text" NOT NULL,
    "session_id" "text" NOT NULL,
    "occurred_at" timestamp with time zone NOT NULL,
    "state" "text" NOT NULL,
    "user_message_redacted" "text" NOT NULL,
    "wilma_response_redacted" "text" NOT NULL,
    "injected_state_content_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "case_context_present" boolean DEFAULT false NOT NULL,
    "disposition_type" "text",
    "guard_flags" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "redirect_occurred" boolean DEFAULT false NOT NULL,
    "redirect_target" "text" DEFAULT 'none'::"text" NOT NULL,
    "model_version" "text" NOT NULL,
    "system_prompt_version" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "consumer_wilma_telemetry_redirect_target_check" CHECK (("redirect_target" = ANY (ARRAY['screening_tool'::"text", 'human_help'::"text", 'none'::"text"])))
);

ALTER TABLE "public"."consumer_wilma_telemetry" OWNER TO "postgres";

COMMENT ON TABLE "public"."consumer_wilma_telemetry" IS 'Redacted Expungement.ai Wilma safety telemetry. Consumer-only and internal safety scoped; RCAP partners must not access it.';

CREATE TABLE IF NOT EXISTS "public"."content_admin_users" (
    "auth_user_id" "uuid" NOT NULL,
    "content_role" "text" NOT NULL,
    "partner_slug" "text",
    "display_name" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_admin_users_partner_scope_check" CHECK (((("content_role" = 'partner_contributor'::"text") AND ("partner_slug" IS NOT NULL)) OR (("content_role" <> 'partner_contributor'::"text") AND ("partner_slug" IS NULL)))),
    CONSTRAINT "content_admin_users_role_check" CHECK (("content_role" = ANY (ARRAY['primary_admin'::"text", 'editor'::"text", 'legal_reviewer'::"text", 'social_manager'::"text", 'contributor'::"text", 'partner_contributor'::"text", 'viewer'::"text"]))),
    CONSTRAINT "content_admin_users_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'disabled'::"text"])))
);

ALTER TABLE "public"."content_admin_users" OWNER TO "postgres";

COMMENT ON TABLE "public"."content_admin_users" IS 'Content-platform role assignments. Internal admins (public.is_internal_admin()) get primary_admin implicitly and need no row here.';

COMMENT ON COLUMN "public"."content_admin_users"."partner_slug" IS 'Set only for partner_contributor. RLS scopes that role to rows carrying this slug.';

CREATE TABLE IF NOT EXISTS "public"."content_audit_events" (
    "audit_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid",
    "actor_role" "text",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text",
    "detail" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_audit_events_detail_object_check" CHECK (("jsonb_typeof"("detail") = 'object'::"text"))
);

ALTER TABLE "public"."content_audit_events" OWNER TO "postgres";

COMMENT ON TABLE "public"."content_audit_events" IS 'APPEND-ONLY. Every approval, rejection, override, publication, schedule, archive, restore, and promotion send. The reject_content_audit_mutation trigger blocks UPDATE and DELETE for every role including service_role.';

CREATE TABLE IF NOT EXISTS "public"."content_authors" (
    "author_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "title" "text",
    "organization" "text",
    "bio" "text",
    "avatar_media_id" "uuid",
    "auth_user_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."content_authors" OWNER TO "postgres";

COMMENT ON TABLE "public"."content_authors" IS 'Public bylines. An author need not be a Supabase user.';

CREATE TABLE IF NOT EXISTS "public"."content_campaign_channels" (
    "campaign_channel_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "channel" "text" NOT NULL,
    "social_draft_id" "uuid",
    "delivery_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "external_reference" "text",
    "status_updated_at" timestamp with time zone,
    CONSTRAINT "content_campaign_channels_channel_check" CHECK (("channel" = ANY (ARRAY['linkedin'::"text", 'x'::"text", 'facebook'::"text", 'instagram'::"text", 'threads'::"text", 'email'::"text", 'partner_kit'::"text"]))),
    CONSTRAINT "content_campaign_channels_status_check" CHECK (("delivery_status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'scheduled'::"text", 'published'::"text", 'failed'::"text", 'skipped'::"text"])))
);

ALTER TABLE "public"."content_campaign_channels" OWNER TO "postgres";

COMMENT ON COLUMN "public"."content_campaign_channels"."delivery_status" IS 'Set from Command Center status callbacks only. LegalEase does not publish externally.';

CREATE TABLE IF NOT EXISTS "public"."content_campaigns" (
    "campaign_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid",
    "name" "text" NOT NULL,
    "destination" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_campaigns_destination_check" CHECK (("destination" = ANY (ARRAY['expungement_ai'::"text", 'legalease_partner'::"text"]))),
    CONSTRAINT "content_campaigns_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'approved'::"text", 'sent'::"text", 'failed'::"text"])))
);

ALTER TABLE "public"."content_campaigns" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."content_categories" (
    "category_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "destination" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_categories_destination_check" CHECK ((("destination" IS NULL) OR ("destination" = ANY (ARRAY['expungement_ai'::"text", 'legalease_partner'::"text"]))))
);

ALTER TABLE "public"."content_categories" OWNER TO "postgres";

COMMENT ON TABLE "public"."content_categories" IS 'Editorial categories. A null destination means the category is shared by both sites.';

CREATE TABLE IF NOT EXISTS "public"."content_media" (
    "media_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "storage_path" "text" NOT NULL,
    "public_url" "text",
    "mime_type" "text" NOT NULL,
    "byte_size" bigint NOT NULL,
    "width" integer,
    "height" integer,
    "alt_text" "text",
    "caption" "text",
    "credit" "text",
    "source_info" "text",
    "permission_status" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "archived" boolean DEFAULT false NOT NULL,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_media_byte_size_check" CHECK ((("byte_size" > 0) AND ("byte_size" <= 12582912))),
    CONSTRAINT "content_media_mime_check" CHECK (("mime_type" = ANY (ARRAY['image/jpeg'::"text", 'image/png'::"text", 'image/webp'::"text", 'image/gif'::"text"]))),
    CONSTRAINT "content_media_permission_check" CHECK (("permission_status" = ANY (ARRAY['owned'::"text", 'licensed'::"text", 'partner_approved'::"text", 'user_consented'::"text", 'editorial_use'::"text", 'unknown'::"text"])))
);

ALTER TABLE "public"."content_media" OWNER TO "postgres";

COMMENT ON TABLE "public"."content_media" IS 'Reusable media library. permission_status drives publication warnings/blocks (see src/lib/content/media.ts).';

COMMENT ON COLUMN "public"."content_media"."permission_status" IS 'unknown blocks publication as a featured/social image; the CMS surfaces it as a hard error, not a warning.';

CREATE TABLE IF NOT EXISTS "public"."content_media_usages" (
    "usage_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "media_id" "uuid" NOT NULL,
    "post_id" "uuid" NOT NULL,
    "usage_kind" "text" DEFAULT 'body'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_media_usages_kind_check" CHECK (("usage_kind" = ANY (ARRAY['featured'::"text", 'body'::"text", 'og'::"text", 'social'::"text"])))
);

ALTER TABLE "public"."content_media_usages" OWNER TO "postgres";

COMMENT ON TABLE "public"."content_media_usages" IS 'Where each asset is used. Powers "in use by N articles" and safe archival.';

CREATE TABLE IF NOT EXISTS "public"."content_post_tags" (
    "post_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL
);

ALTER TABLE "public"."content_post_tags" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."content_post_versions" (
    "version_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "version" integer NOT NULL,
    "title" "text" NOT NULL,
    "subtitle" "text",
    "doc" "jsonb" NOT NULL,
    "rendered_html" "text",
    "status" "text" NOT NULL,
    "note" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_post_versions_doc_object_check" CHECK (("jsonb_typeof"("doc") = 'object'::"text"))
);

ALTER TABLE "public"."content_post_versions" OWNER TO "postgres";

COMMENT ON TABLE "public"."content_post_versions" IS 'Immutable snapshot per saved version. Restoring a version writes a NEW version rather than mutating history.';

CREATE TABLE IF NOT EXISTS "public"."content_posts" (
    "post_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "destination" "text" NOT NULL,
    "content_type" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "locale" "text" DEFAULT 'en'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "subtitle" "text",
    "excerpt" "text",
    "doc" "jsonb" DEFAULT '{"type": "doc", "content": []}'::"jsonb" NOT NULL,
    "rendered_html" "text",
    "search_text" "text",
    "reading_minutes" integer,
    "category_id" "uuid",
    "author_id" "uuid",
    "featured_media_id" "uuid",
    "partner_slug" "text",
    "jurisdiction_code" "text",
    "legal_sensitive" boolean DEFAULT false NOT NULL,
    "seo_title" "text",
    "seo_description" "text",
    "canonical_url" "text",
    "og_title" "text",
    "og_description" "text",
    "og_media_id" "uuid",
    "version" integer DEFAULT 1 NOT NULL,
    "published_at" timestamp with time zone,
    "scheduled_for" timestamp with time zone,
    "first_published_at" timestamp with time zone,
    "legal_approved_at" timestamp with time zone,
    "legal_approved_by" "uuid",
    "editorial_approved_at" timestamp with time zone,
    "editorial_approved_by" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_posts_destination_check" CHECK (("destination" = ANY (ARRAY['expungement_ai'::"text", 'legalease_partner'::"text"]))),
    CONSTRAINT "content_posts_doc_object_check" CHECK (("jsonb_typeof"("doc") = 'object'::"text")),
    CONSTRAINT "content_posts_legal_review_required_check" CHECK ((("status" <> ALL (ARRAY['published'::"text", 'updated'::"text", 'scheduled'::"text"])) OR (NOT (("content_type" = ANY (ARRAY['state_resource'::"text", 'resource_guide'::"text"])) OR "legal_sensitive")) OR ("legal_approved_at" IS NOT NULL))),
    CONSTRAINT "content_posts_published_requires_time_check" CHECK ((("status" <> ALL (ARRAY['published'::"text", 'updated'::"text"])) OR ("published_at" IS NOT NULL))),
    CONSTRAINT "content_posts_scheduled_requires_time_check" CHECK ((("status" <> 'scheduled'::"text") OR ("scheduled_for" IS NOT NULL))),
    CONSTRAINT "content_posts_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'in_editorial_review'::"text", 'changes_requested'::"text", 'in_legal_review'::"text", 'approved'::"text", 'scheduled'::"text", 'published'::"text", 'updated'::"text", 'archived'::"text"]))),
    CONSTRAINT "content_posts_type_check" CHECK (("content_type" = ANY (ARRAY['blog_article'::"text", 'product_announcement'::"text", 'founder_note'::"text", 'partner_insight'::"text", 'partner_story'::"text", 'testimonial_story'::"text", 'state_resource'::"text", 'downloadable_resource'::"text", 'resource_guide'::"text"])))
);

ALTER TABLE "public"."content_posts" OWNER TO "postgres";

COMMENT ON TABLE "public"."content_posts" IS 'Articles, partner stories, announcements, and state-resource editorial. doc is the source of truth; rendered_html is a server-rendered cache.';

COMMENT ON COLUMN "public"."content_posts"."doc" IS 'Structured block document (Tiptap/ProseMirror shape). Never trust editor HTML: rendered_html is produced by src/lib/content/renderer.ts.';

COMMENT ON COLUMN "public"."content_posts"."partner_slug" IS 'Owning partner organization, for partner stories and partner_contributor-authored drafts. RLS scopes partner_contributor to this column.';

COMMENT ON COLUMN "public"."content_posts"."legal_approved_at" IS 'Set only by a legal_reviewer/primary_admin. The content_posts_legal_review_required_check constraint blocks publication of legal content without it.';

CREATE TABLE IF NOT EXISTS "public"."content_promotion_outbox" (
    "event_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "idempotency_key" "text" NOT NULL,
    "post_id" "uuid",
    "campaign_id" "uuid",
    "payload" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "max_attempts" integer DEFAULT 8 NOT NULL,
    "last_error" "text",
    "next_attempt_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "delivered_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_promotion_outbox_attempts_check" CHECK (("attempts" >= 0)),
    CONSTRAINT "content_promotion_outbox_payload_object_check" CHECK (("jsonb_typeof"("payload") = 'object'::"text")),
    CONSTRAINT "content_promotion_outbox_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sending'::"text", 'sent'::"text", 'failed'::"text", 'dead'::"text"]))),
    CONSTRAINT "content_promotion_outbox_type_check" CHECK (("event_type" = ANY (ARRAY['content.promotion.requested'::"text", 'content.published'::"text", 'content.unpublished'::"text"])))
);

ALTER TABLE "public"."content_promotion_outbox" OWNER TO "postgres";

COMMENT ON TABLE "public"."content_promotion_outbox" IS 'Transactional outbox. A promotion send writes a row in the same transaction as the approval; a worker delivers it with HMAC signing and retries. Publishing a post and sending its promotion are separate actions.';

COMMENT ON COLUMN "public"."content_promotion_outbox"."idempotency_key" IS 'Stable retry-safe key. The Command Center must de-duplicate on it.';

CREATE OR REPLACE VIEW "public"."content_public_authors" AS
 SELECT "author_id",
    "slug",
    "name",
    "title",
    "organization",
    "bio",
    "avatar_media_id"
   FROM "public"."content_authors" "a"
  WHERE "is_active";

ALTER VIEW "public"."content_public_authors" OWNER TO "postgres";

COMMENT ON VIEW "public"."content_public_authors" IS 'Public bylines. Excludes auth_user_id (the link from a byline to a real Supabase account).';

CREATE TABLE IF NOT EXISTS "public"."content_state_editorial" (
    "jurisdiction_code" "text" NOT NULL,
    "intro" "text",
    "overview" "text",
    "featured_media_id" "uuid",
    "faqs" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "related_slugs" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "partner_quote" "text",
    "partner_slug" "text",
    "announcement" "text",
    "seo_title" "text",
    "seo_description" "text",
    "og_media_id" "uuid",
    "cta_label" "text",
    "cta_href" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "legal_approved_at" timestamp with time zone,
    "legal_approved_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_state_editorial_code_check" CHECK (("jurisdiction_code" ~ '^[A-Z]{2}$'::"text")),
    CONSTRAINT "content_state_editorial_faqs_array_check" CHECK (("jsonb_typeof"("faqs") = 'array'::"text")),
    CONSTRAINT "content_state_editorial_legal_required_check" CHECK ((("status" <> 'published'::"text") OR ("legal_approved_at" IS NOT NULL))),
    CONSTRAINT "content_state_editorial_related_array_check" CHECK (("jsonb_typeof"("related_slugs") = 'array'::"text")),
    CONSTRAINT "content_state_editorial_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'in_legal_review'::"text", 'approved'::"text", 'published'::"text", 'archived'::"text"])))
);

ALTER TABLE "public"."content_state_editorial" OWNER TO "postgres";

COMMENT ON TABLE "public"."content_state_editorial" IS 'EDITORIAL layer only for /resources/[jurisdiction]. The locked legal layer is derived from the state engine projection at render time and is never duplicated here.';

CREATE TABLE IF NOT EXISTS "public"."content_testimonials" (
    "testimonial_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote" "text" NOT NULL,
    "attribution" "text" NOT NULL,
    "role_title" "text",
    "partner_slug" "text",
    "consent_status" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "consent_reference" "text",
    "approved" boolean DEFAULT false NOT NULL,
    "media_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_testimonials_consent_check" CHECK (("consent_status" = ANY (ARRAY['written_consent'::"text", 'partner_approved'::"text", 'user_consented'::"text", 'unknown'::"text"]))),
    CONSTRAINT "content_testimonials_consent_required_check" CHECK (((NOT "approved") OR ("consent_status" <> 'unknown'::"text")))
);

ALTER TABLE "public"."content_testimonials" OWNER TO "postgres";

COMMENT ON TABLE "public"."content_testimonials" IS 'Real, consented testimonials only. approved=true requires a non-unknown consent_status (DB-enforced).';

CREATE OR REPLACE VIEW "public"."content_public_media" AS
 SELECT DISTINCT "media_id",
    "mime_type",
    "width",
    "height",
    "alt_text",
    "caption",
    "credit"
   FROM "public"."content_media" "m"
  WHERE ((NOT "archived") AND ((EXISTS ( SELECT 1
           FROM ("public"."content_media_usages" "u"
             JOIN "public"."content_posts" "p" ON (("p"."post_id" = "u"."post_id")))
          WHERE (("u"."media_id" = "m"."media_id") AND ("p"."status" = ANY (ARRAY['published'::"text", 'updated'::"text"])) AND ("p"."published_at" IS NOT NULL) AND ("p"."published_at" <= "now"())))) OR (EXISTS ( SELECT 1
           FROM "public"."content_posts" "p"
          WHERE ((("p"."featured_media_id" = "m"."media_id") OR ("p"."og_media_id" = "m"."media_id")) AND ("p"."status" = ANY (ARRAY['published'::"text", 'updated'::"text"])) AND ("p"."published_at" IS NOT NULL) AND ("p"."published_at" <= "now"())))) OR (EXISTS ( SELECT 1
           FROM "public"."content_state_editorial" "e"
          WHERE ((("e"."featured_media_id" = "m"."media_id") OR ("e"."og_media_id" = "m"."media_id")) AND ("e"."status" = 'published'::"text")))) OR (EXISTS ( SELECT 1
           FROM "public"."content_testimonials" "t"
          WHERE (("t"."media_id" = "m"."media_id") AND "t"."approved")))));

ALTER VIEW "public"."content_public_media" OWNER TO "postgres";

COMMENT ON VIEW "public"."content_public_media" IS 'An asset is public only once published content references it. Excludes storage_path, uploaded_by, source_info, permission_status. Bytes are served via /api/content/media/[mediaId], never a direct bucket URL.';

CREATE OR REPLACE VIEW "public"."content_public_posts" AS
 SELECT "post_id",
    "destination",
    "locale",
    "content_type",
    "slug",
    "title",
    "subtitle",
    "excerpt",
    "rendered_html",
    "reading_minutes",
    "author_id",
    "category_id",
    "featured_media_id",
    "og_media_id",
    "jurisdiction_code",
    "partner_slug",
    "seo_title",
    "seo_description",
    "canonical_url",
    "og_title",
    "og_description",
    "published_at",
        CASE
            WHEN ("status" = 'updated'::"text") THEN "updated_at"
            ELSE NULL::timestamp with time zone
        END AS "content_updated_at"
   FROM "public"."content_posts" "p"
  WHERE (("status" = ANY (ARRAY['published'::"text", 'updated'::"text"])) AND ("published_at" IS NOT NULL) AND ("published_at" <= "now"()));

ALTER VIEW "public"."content_public_posts" OWNER TO "postgres";

COMMENT ON VIEW "public"."content_public_posts" IS 'THE public post interface. Excludes doc, status, search_text, version, scheduled_for, first_published_at, legal_sensitive, created_by, created_at, and every *_approved_by/_at column.';

CREATE OR REPLACE VIEW "public"."content_public_state_editorial" AS
 SELECT "jurisdiction_code",
    "intro",
    "overview",
    "featured_media_id",
    "faqs",
    "related_slugs",
    "partner_quote",
    "partner_slug",
    "announcement",
    "seo_title",
    "seo_description",
    "og_media_id",
    "cta_label",
    "cta_href"
   FROM "public"."content_state_editorial" "e"
  WHERE ("status" = 'published'::"text");

ALTER VIEW "public"."content_public_state_editorial" OWNER TO "postgres";

COMMENT ON VIEW "public"."content_public_state_editorial" IS 'Published state-resource editorial layer. Excludes status, legal_approved_by/_at, updated_by.';

CREATE OR REPLACE VIEW "public"."content_public_testimonials" AS
 SELECT "testimonial_id",
    "quote",
    "attribution",
    "role_title",
    "partner_slug",
    "media_id"
   FROM "public"."content_testimonials" "t"
  WHERE "approved";

ALTER VIEW "public"."content_public_testimonials" OWNER TO "postgres";

COMMENT ON VIEW "public"."content_public_testimonials" IS 'Public testimonial display fields only. Excludes consent_status and consent_reference (contract ids / email addresses).';

CREATE TABLE IF NOT EXISTS "public"."content_publications" (
    "publication_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "version" integer,
    "actor_id" "uuid",
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_publications_action_check" CHECK (("action" = ANY (ARRAY['published'::"text", 'updated'::"text", 'scheduled'::"text", 'unpublished'::"text", 'archived'::"text", 'restored'::"text"])))
);

ALTER TABLE "public"."content_publications" OWNER TO "postgres";

COMMENT ON TABLE "public"."content_publications" IS 'Publication lifecycle history (published/scheduled/unpublished/archived/restored).';

CREATE TABLE IF NOT EXISTS "public"."content_reviews" (
    "review_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "review_kind" "text" NOT NULL,
    "decision" "text" NOT NULL,
    "notes" "text",
    "reviewer_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_reviews_decision_check" CHECK (("decision" = ANY (ARRAY['approved'::"text", 'changes_requested'::"text"]))),
    CONSTRAINT "content_reviews_kind_check" CHECK (("review_kind" = ANY (ARRAY['editorial'::"text", 'legal'::"text"])))
);

ALTER TABLE "public"."content_reviews" OWNER TO "postgres";

COMMENT ON TABLE "public"."content_reviews" IS 'Every editorial and legal review decision, with the reviewer identity.';

CREATE TABLE IF NOT EXISTS "public"."content_social_assets" (
    "social_asset_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "template" "text" NOT NULL,
    "size_key" "text" NOT NULL,
    "width" integer NOT NULL,
    "height" integer NOT NULL,
    "image_url" "text",
    "headline" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_social_assets_size_check" CHECK (("size_key" = ANY (ARRAY['og'::"text", 'square'::"text", 'portrait'::"text"]))),
    CONSTRAINT "content_social_assets_template_check" CHECK (("template" = ANY (ARRAY['editorial_cover'::"text", 'founder_note'::"text", 'partner_spotlight'::"text", 'quote_card'::"text", 'product_announcement'::"text", 'state_resource'::"text"])))
);

ALTER TABLE "public"."content_social_assets" OWNER TO "postgres";

COMMENT ON TABLE "public"."content_social_assets" IS 'Deterministic branded social graphics (1200x630, 1080x1080, 1080x1350). Rendered from repo brand assets — never AI-generated imagery.';

CREATE TABLE IF NOT EXISTS "public"."content_social_drafts" (
    "social_draft_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "channel" "text" NOT NULL,
    "primary_caption" "text",
    "alternate_caption" "text",
    "founder_voice_caption" "text",
    "partner_caption" "text",
    "hashtags" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "mention_tags" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "social_asset_id" "uuid",
    "approval_state" "text" DEFAULT 'draft'::"text" NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_social_drafts_channel_check" CHECK (("channel" = ANY (ARRAY['linkedin'::"text", 'x'::"text", 'facebook'::"text", 'instagram'::"text", 'threads'::"text", 'email'::"text", 'partner_kit'::"text"]))),
    CONSTRAINT "content_social_drafts_hashtags_array_check" CHECK (("jsonb_typeof"("hashtags") = 'array'::"text")),
    CONSTRAINT "content_social_drafts_state_check" CHECK (("approval_state" = ANY (ARRAY['draft'::"text", 'approved'::"text", 'sent'::"text", 'failed'::"text"]))),
    CONSTRAINT "content_social_drafts_tags_array_check" CHECK (("jsonb_typeof"("mention_tags") = 'array'::"text"))
);

ALTER TABLE "public"."content_social_drafts" OWNER TO "postgres";

COMMENT ON TABLE "public"."content_social_drafts" IS 'Per-channel promotion copy. LegalEase owns the draft and the approval; the Command Center owns connected accounts and external publishing.';

CREATE TABLE IF NOT EXISTS "public"."content_tags" (
    "tag_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."content_tags" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."legalease_os_support_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source" "text" DEFAULT 'expungement_ai'::"text" NOT NULL,
    "channel" "text" DEFAULT 'web_support_form'::"text" NOT NULL,
    "type" "text" DEFAULT 'support_request'::"text" NOT NULL,
    "category" "text" NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "briefcase_item_id" "uuid",
    "message_redacted" "text" NOT NULL,
    "original_message_redaction_applied" boolean DEFAULT false NOT NULL,
    "route_submitted_from" "text" NOT NULL,
    "user_agent" "text",
    "metadata_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "legalease_os_support_items_category_check" CHECK (("category" = ANY (ARRAY['account_login'::"text", 'payment_receipt'::"text", 'packet_download'::"text", 'briefcase'::"text", 'wilma'::"text", 'technical_issue'::"text", 'general_contact'::"text", 'other'::"text"]))),
    CONSTRAINT "legalease_os_support_items_channel_check" CHECK (("channel" = 'web_support_form'::"text")),
    CONSTRAINT "legalease_os_support_items_priority_check" CHECK (("priority" = ANY (ARRAY['normal'::"text", 'urgent'::"text"]))),
    CONSTRAINT "legalease_os_support_items_source_check" CHECK (("source" = ANY (ARRAY['expungement_ai'::"text", 'legalease_umbrella_site'::"text"]))),
    CONSTRAINT "legalease_os_support_items_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'in_review'::"text", 'waiting_on_customer'::"text", 'resolved'::"text", 'closed'::"text"]))),
    CONSTRAINT "legalease_os_support_items_type_check" CHECK (("type" = ANY (ARRAY['support_request'::"text", 'waitlist_request'::"text"])))
);

ALTER TABLE "public"."legalease_os_support_items" OWNER TO "postgres";

COMMENT ON TABLE "public"."legalease_os_support_items" IS 'LegalEase OS operational source of truth for support/contact/waitlist correspondence. Consumers create through server routes only. Partner users must not access consumer support items.';

CREATE TABLE IF NOT EXISTS "public"."partner_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_slug" "text" NOT NULL,
    "asset_key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'locked'::"text" NOT NULL,
    "route" "text",
    "owner" "text",
    "next_action" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."partner_assets" OWNER TO "postgres";

COMMENT ON TABLE "public"."partner_assets" IS 'Partner Journey OS activation assets for co-branded pages, onboarding, intake, dashboard, launch kit, email sequence, and reports.';

CREATE TABLE IF NOT EXISTS "public"."partner_billing_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_slug" "text",
    "partner_pilot_request_id" "uuid",
    "contact_email" "text" NOT NULL,
    "contact_name" "text",
    "amount_cents" integer NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text" NOT NULL,
    "description" "text" NOT NULL,
    "due_date" "date",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_invoice_id" "text",
    "stripe_invoice_url" "text",
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "paid_at" timestamp with time zone,
    CONSTRAINT "partner_billing_requests_amount_cents_check" CHECK ((("amount_cents" >= 100000) AND ("amount_cents" <= 25000000))),
    CONSTRAINT "partner_billing_requests_currency_check" CHECK (("currency" = 'usd'::"text")),
    CONSTRAINT "partner_billing_requests_description_check" CHECK ((("char_length"("description") >= 1) AND ("char_length"("description") <= 500))),
    CONSTRAINT "partner_billing_requests_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'invoice_created'::"text", 'invoice_sent'::"text", 'paid'::"text", 'payment_failed'::"text", 'voided'::"text", 'canceled'::"text"])))
);

ALTER TABLE "public"."partner_billing_requests" OWNER TO "postgres";

COMMENT ON TABLE "public"."partner_billing_requests" IS 'Internal-admin scoped Stripe invoice requests for custom LegalEase partner engagements.';

COMMENT ON COLUMN "public"."partner_billing_requests"."amount_cents" IS 'Custom-scoped invoice amount in USD cents, entered only by LegalEase internal_admin tooling.';

COMMENT ON COLUMN "public"."partner_billing_requests"."stripe_invoice_url" IS 'Stripe-hosted invoice URL returned by Stripe after invoice creation/finalization.';

CREATE TABLE IF NOT EXISTS "public"."partner_entitlement" (
    "partner_slug" "text" NOT NULL,
    "screenings_allowed" integer DEFAULT 0 NOT NULL,
    "screenings_used" integer DEFAULT 0 NOT NULL,
    "contract_note" "text",
    "period_label" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "partner_entitlement_screenings_allowed_nonnegative_check" CHECK (("screenings_allowed" >= 0)),
    CONSTRAINT "partner_entitlement_screenings_used_nonnegative_check" CHECK (("screenings_used" >= 0))
);

ALTER TABLE "public"."partner_entitlement" OWNER TO "postgres";

COMMENT ON TABLE "public"."partner_entitlement" IS 'RCAP partner-mode screening capacity ledger. screenings_used may exceed screenings_allowed after an ops allowance reduction; claims are gated by the RPC.';

COMMENT ON COLUMN "public"."partner_entitlement"."screenings_allowed" IS 'Current RCAP screening slot allowance for the entitlement period.';

COMMENT ON COLUMN "public"."partner_entitlement"."screenings_used" IS 'Claimed RCAP screening slots. Updated only by database primitives or controlled ops repair.';

CREATE TABLE IF NOT EXISTS "public"."partner_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_slug" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_label" "text" NOT NULL,
    "event_payload" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."partner_events" OWNER TO "postgres";

COMMENT ON TABLE "public"."partner_events" IS 'Partner Journey OS event log for provisioning, activation, admin actions, and notes.';

CREATE TABLE IF NOT EXISTS "public"."partner_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_slug" "text" NOT NULL,
    "referrals" integer DEFAULT 0,
    "screenings" integer DEFAULT 0,
    "likely_eligible" integer DEFAULT 0,
    "product_starts" integer DEFAULT 0,
    "packets_ready" integer DEFAULT 0,
    "filings" integer DEFAULT 0,
    "outcomes_available" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."partner_metrics" OWNER TO "postgres";

COMMENT ON TABLE "public"."partner_metrics" IS 'Partner Journey OS implementation metrics for partner dashboards and reporting.';

CREATE TABLE IF NOT EXISTS "public"."partner_pilot_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "contact_name" "text" NOT NULL,
    "organization_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "role_title" "text",
    "organization_type" "text" NOT NULL,
    "state_or_jurisdiction" "text" NOT NULL,
    "community_served" "text" NOT NULL,
    "estimated_people_served" "text",
    "interested_workflow" "text",
    "message" "text",
    "consent_to_contact" boolean DEFAULT false NOT NULL,
    "source" "text" DEFAULT 'legaleasepartner.com'::"text" NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "user_agent" "text",
    "referrer" "text"
);

ALTER TABLE "public"."partner_pilot_requests" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."partner_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_id" "text" NOT NULL,
    "partner_slug" "text" NOT NULL,
    "partner_name" "text" NOT NULL,
    "contact_name" "text",
    "contact_email" "text",
    "website" "text",
    "organization_type" "text",
    "region" "text",
    "state" "text",
    "estimated_users_90_days" integer,
    "record_clearing_needs" "text"[] DEFAULT '{}'::"text"[],
    "program_goal" "text",
    "program_tier" "text" NOT NULL,
    "payment_status" "text" DEFAULT 'not_started'::"text" NOT NULL,
    "qualification_status" "text" DEFAULT 'request_received'::"text" NOT NULL,
    "provisioning_status" "text" DEFAULT 'request_received'::"text" NOT NULL,
    "assigned_owner" "text",
    "launch_date_target" "date",
    "compliance_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_name" "text",
    "legal_name" "text",
    "primary_contact_name" "text",
    "primary_contact_title" "text",
    "primary_contact_email" "text",
    "primary_contact_phone" "text",
    "program_name" "text",
    "program_description" "text",
    "target_state" "text",
    "target_county" "text",
    "target_city" "text",
    "service_area" "text",
    "expected_monthly_participants" integer,
    "expected_launch_date" "date",
    "referral_sources" "text",
    "audience_description" "text",
    "branding_notes" "text",
    "logo_url" "text",
    "onboarding_status" "text" DEFAULT 'not_started'::"text" NOT NULL,
    "onboarding_started_at" timestamp with time zone,
    "onboarding_completed_at" timestamp with time zone
);

ALTER TABLE "public"."partner_records" OWNER TO "postgres";

COMMENT ON TABLE "public"."partner_records" IS 'Partner Journey OS partner records for LegalEase Record-Clearing Access Program.';

COMMENT ON COLUMN "public"."partner_records"."onboarding_status" IS 'Partner-submitted onboarding profile status: not_started, in_progress, submitted, needs_review, or
  approved.';

COMMENT ON COLUMN "public"."partner_records"."onboarding_started_at" IS 'First timestamp when a paid partner saved onboarding data.';

COMMENT ON COLUMN "public"."partner_records"."onboarding_completed_at" IS 'Timestamp when a paid partner submitted onboarding for LegalEase review.';

CREATE TABLE IF NOT EXISTS "public"."partner_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "partner_slug" "text",
    "role" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "invited_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "partner_users_role_check" CHECK (("role" = ANY (ARRAY['partner_admin'::"text", 'partner_staff'::"text", 'internal_admin'::"text"]))),
    CONSTRAINT "partner_users_role_partner_slug_check" CHECK (((("role" = ANY (ARRAY['partner_admin'::"text", 'partner_staff'::"text"])) AND ("partner_slug" IS NOT NULL)) OR (("role" = 'internal_admin'::"text") AND ("partner_slug" IS NULL)))),
    CONSTRAINT "partner_users_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'disabled'::"text"])))
);

ALTER TABLE "public"."partner_users" OWNER TO "postgres";

COMMENT ON TABLE "public"."partner_users" IS 'Maps one authenticated Supabase user to one LegalEase partner identity or internal admin role.';

CREATE TABLE IF NOT EXISTS "public"."processed_stripe_events" (
    "stripe_event_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "processed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "related_object_id" "text"
);

ALTER TABLE "public"."processed_stripe_events" OWNER TO "postgres";

COMMENT ON TABLE "public"."processed_stripe_events" IS 'Stripe webhook event IDs processed after signature verification for idempotent reconciliation.';

CREATE TABLE IF NOT EXISTS "public"."rcap_briefcase_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "partner_slug" "text" NOT NULL,
    "intake_session_id" "uuid",
    "document_packet_id" "uuid",
    "item_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "status" "text" NOT NULL,
    "state" "text",
    "county" "text",
    "document_type" "text",
    "last_opened_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rcap_briefcase_items_type_check" CHECK (("item_type" = ANY (ARRAY['intake_session'::"text", 'document_packet'::"text", 'filing_instruction_packet'::"text"])))
);

ALTER TABLE "public"."rcap_briefcase_items" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."rcap_document_packet_inputs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_packet_id" "uuid" NOT NULL,
    "partner_slug" "text" NOT NULL,
    "intake_session_id" "uuid",
    "input_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."rcap_document_packet_inputs" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."rcap_document_packets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_slug" "text" NOT NULL,
    "intake_session_id" "uuid",
    "user_id" "uuid",
    "briefcase_id" "uuid",
    "state" "text" DEFAULT 'MS'::"text" NOT NULL,
    "county" "text",
    "court_type" "text",
    "court_county" "text",
    "court_name" "text",
    "jurisdiction" "text",
    "document_type" "text",
    "pathway" "text" NOT NULL,
    "status" "text" DEFAULT 'draft_started'::"text" NOT NULL,
    "petitioner_first_name" "text",
    "petitioner_last_name" "text",
    "petitioner_city" "text",
    "petitioner_county" "text",
    "cause_number" "text",
    "charge" "text",
    "offense_date" "text",
    "arrest_date" "text",
    "arresting_agency" "text",
    "agency_case_number" "text",
    "disposition_date" "text",
    "conviction_date" "text",
    "sentence_completion_date" "text",
    "has_zero_balance" boolean,
    "has_court_documents" boolean,
    "first_offender_signal" boolean,
    "non_traffic_signal" boolean,
    "excluded_offense_screening" boolean,
    "one_felony_expungement_signal" boolean,
    "needs_record_review" boolean DEFAULT true NOT NULL,
    "generated_html" "text",
    "generated_plain_text" "text",
    "filing_instructions" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "county_court_instructions" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "missing_fields" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "safety_disclaimer" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "relief_outcome" "text" DEFAULT 'not_recorded'::"text" NOT NULL,
    "person_id" "uuid",
    CONSTRAINT "rcap_document_packets_document_type_check" CHECK ((("document_type" IS NULL) OR ("document_type" = ANY (ARRAY['source_driven_packet'::"text", 'mississippi_non_conviction_petition'::"text", 'mississippi_misdemeanor_conviction_petition'::"text", 'mississippi_felony_conviction_petition'::"text", 'mississippi_certificate_of_service'::"text", 'mississippi_proposed_order_placeholder'::"text", 'illinois_request_to_expungeseal_packet'::"text", 'illinois_case_list'::"text", 'illinois_additional_arrests_expungement'::"text", 'illinois_additional_arrests_sealing'::"text", 'illinois_order_granting_placeholder'::"text", 'illinois_order_denying_reference'::"text", 'illinois_notice_of_filing_placeholder'::"text", 'illinois_fee_waiver_instructions'::"text", 'dc_motion_to_seal'::"text", 'dc_motion_to_expunge'::"text", 'dc_statement_of_points_and_authorities'::"text", 'dc_proposed_order'::"text", 'dc_certificate_of_service'::"text", 'dc_filing_instructions'::"text"])))),
    CONSTRAINT "rcap_document_packets_pathway_check" CHECK (("pathway" = ANY (ARRAY['source_engine_packet_plan'::"text", 'non_conviction'::"text", 'misdemeanor_conviction'::"text", 'felony_conviction'::"text", 'more_information_needed'::"text", 'expungement_non_conviction'::"text", 'expungement_supervision_or_qualified_probation'::"text", 'sealing_conviction'::"text", 'excluded_or_needs_review'::"text", 'needs_rap_sheet'::"text", 'automatic_expungement'::"text", 'automatic_sealing'::"text", 'motion_actual_innocence_expungement'::"text", 'motion_interests_of_justice_sealing'::"text", 'needs_review'::"text", 'additional-justice-or-municipal-court-misdemeanor-relief'::"text", 'adult-conviction-expungement-narrow-statutory-route'::"text", 'adult-conviction-expungement-under-wis-stat-973-015'::"text", 'adult-conviction-sealing'::"text", 'adult-conviction-sealing-or-expungement-under-ohio-rev-code-2953-32'::"text", 'adult-felony-conviction-sealing'::"text", 'adult-felony-vacation-under-rcw-9-94a-640'::"text", 'adult-misdemeanor-conviction-sealing'::"text", 'adult-misdemeanor-gross-misdemeanor-vacation-under-rcw-9-96-060'::"text", 'adult-non-conviction-expungement'::"text", 'adult-non-conviction-expungement-under-crim-proc-10-105'::"text", 'adult-non-conviction-expungement-w-s-7-13-1401'::"text", 'arrest-dismissal-and-other-non-conviction-expungement-under-n-j-s-a-2c-52-6'::"text", 'cannabis-sentence-dismissal-incarcerated-person-pathway'::"text", 'cannabis-specific-automatic-or-petition-expungement'::"text", 'cannabis-specific-expungement'::"text", 'conditional-treatment-sealing-under-cpl-160-58'::"text", 'conviction-annulment-under-rsa-651-5'::"text", 'conviction-expungement-with-sealed-confidential-access'::"text", 'conviction-or-diversion-216614'::"text", 'court-ordered-sealing-943-059'::"text", 'criminal-identity-theft-mistaken-identity-relief'::"text", 'dc_actual_innocence_expungement_16_803'::"text", 'dc_motion_seal_felony_conviction_8yr_16_806'::"text", 'dc_motion_seal_misdemeanor_conviction_5yr_16_806'::"text", 'dc_motion_seal_nonconviction_16_806'::"text", 'deferred-imposition-dismissal-and-sealing'::"text", 'deferred-sentence-dismissal-or-confidentiality-route'::"text", 'discretionary-conviction-sealing-by-petition-under-cpl-160-59'::"text", 'dui-nonadjudication'::"text", 'dui-record-sealing-under-the-separate-dui-statute'::"text", 'eligible-conviction-expungement'::"text", 'eligible-conviction-expungement-under-crim-proc-10-110'::"text", 'eligible-conviction-expungement-under-w-va-code-61-11-26'::"text", 'eligible-felony-conviction-expungement-99-19-71'::"text", 'expungement-after-eligible-supervision-or-qualified-probation'::"text", 'felony-conviction-431073'::"text", 'first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1'::"text", 'first-offense-controlled-substance-conditional-discharge-relief'::"text", 'first-offense-dui-expungement'::"text", 'first-offense-possession-sealing'::"text", 'general-conviction-record-sealing-under-nrs-179-245'::"text", 'general-conviction-sealing-under-n-d-c-c-chapter-12-60-1'::"text", 'human-trafficking-survivor-vacatur-and-expungement'::"text", 'intervention-court-completion-expungement'::"text", 'juvenile-allegation-expungement'::"text", 'juvenile-automatic-or-petition-expungement'::"text", 'lawful-self-defense-expunction-943-0578'::"text", 'marijuana-hashish-expungement-under-n-j-s-a-2c-52-5-1-5-2-and-6-1'::"text", 'marijuana-related-redesignation-expungement-under-mmrta'::"text", 'marijuana-specific-summary-pardon-or-sealing-relief'::"text", 'minor-in-possession-underage-alcohol-expungement'::"text", 'minor-prostitution-7251'::"text", 'misdemeanor-901c3'::"text", 'misdemeanor-conviction-expungement-under-mont-code-46-18-1104'::"text", 'misdemeanor-violation-traffic-conviction'::"text", 'no-conviction-released-without-conviction'::"text", 'non-conviction-arrest-or-criminal-charge-expungement'::"text", 'non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05'::"text", 'non-conviction-expungement-for-dismissal-no-disposition-or-acquittal'::"text", 'nonadjudication-under-99-15-26'::"text", 'nonconviction-901c2'::"text", 'nonviolent-conviction-expunction-under-g-s-15a-145-5'::"text", 'not-more-than-two-eligible-felony-convictions-expungement'::"text", 'one-eligible-nonviolent-felony-conviction-expungement'::"text", 'other-eligible-misdemeanor-conviction-expungement'::"text", 'path-a-first-offender-conviction-expungement'::"text", 'path-b-multiple-misdemeanor-expungement'::"text", 'path-d-petition-based-expungement-with-a-bci-certificate-of-eligibility'::"text", 'path-e-petition-based-non-conviction-expungement'::"text", 'path-f-petition-based-conviction-expungement'::"text", 'pathway-1-free-non-conviction-expunction-under-tenn-code-40-32-101-a-40-32-106'::"text", 'pathway-3-eligible-conviction-expunction-under-40-32-101-g-40-32-107'::"text", 'pathway-4-two-offense-expunction-under-40-32-101-k'::"text", 'petition-based-conviction-sealing-jdf-612-24-72-706'::"text", 'petition-based-expungement-under-609a-02-03'::"text", 'petition-based-non-conviction-sealing-jdf-417-24-72-704'::"text", 'petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202'::"text", 'petitioned-nondisclosure-after-completed-deferred-adjudication-411-0725'::"text", 'petitioned-nondisclosure-for-an-eligible-conviction-411-0735'::"text", 'pretrial-intervention-or-diversion-expungement'::"text", 'prop-64-completed-sentence-application-11361-8'::"text", 'prop-64-currently-serving-petition-11361-8'::"text", 'public-intoxication-12346'::"text", 'regular-expungement-under-n-j-s-a-2c-52-2-2c-52-3'::"text", 'restriction-and-sealing-of-a-pardoned-felony'::"text", 'sb-288-misdemeanor-conviction-restriction-and-sealing'::"text", 'second-chance-act-shielding'::"text", 'set-aside-by-application-under-mcl-780-621'::"text", 'set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c'::"text", 'set-aside-of-eligible-convictions-under-ors-137-225-1-a'::"text", 'situation-a-non-convictions'::"text", 'situation-b-misdemeanor-convictions'::"text", 'situation-c-felony-convictions'::"text", 'specialty-court-accelerated'::"text", 'suspended-imposition-of-sentence-sealing'::"text", 'tool-1-dismissal-set-aside'::"text", 'tool-3-petition-based-felony-sealing'::"text", 'tool-4-arrest-record-sealing'::"text", 'uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59'::"text", 'underage-alcohol-12347'::"text"]))),
    CONSTRAINT "rcap_document_packets_relief_outcome_check" CHECK (("relief_outcome" = ANY (ARRAY['not_recorded'::"text", 'filed_pending'::"text", 'relief_granted'::"text", 'relief_partially_granted'::"text", 'relief_denied'::"text", 'relief_unavailable'::"text", 'withdrawn'::"text"]))),
    CONSTRAINT "rcap_document_packets_state_check" CHECK (("state" = ANY (ARRAY['AK'::"text", 'AL'::"text", 'AR'::"text", 'AZ'::"text", 'CA'::"text", 'CO'::"text", 'CT'::"text", 'DC'::"text", 'DE'::"text", 'FL'::"text", 'GA'::"text", 'HI'::"text", 'IA'::"text", 'ID'::"text", 'IL'::"text", 'IN'::"text", 'KS'::"text", 'KY'::"text", 'LA'::"text", 'MA'::"text", 'MD'::"text", 'ME'::"text", 'MI'::"text", 'MN'::"text", 'MO'::"text", 'MS'::"text", 'MT'::"text", 'NC'::"text", 'ND'::"text", 'NE'::"text", 'NH'::"text", 'NJ'::"text", 'NM'::"text", 'NV'::"text", 'NY'::"text", 'OH'::"text", 'OK'::"text", 'OR'::"text", 'PA'::"text", 'RI'::"text", 'SC'::"text", 'SD'::"text", 'TN'::"text", 'TX'::"text", 'UT'::"text", 'VA'::"text", 'VT'::"text", 'WA'::"text", 'WI'::"text", 'WV'::"text", 'WY'::"text"]))),
    CONSTRAINT "rcap_document_packets_status_check" CHECK (("status" = ANY (ARRAY['draft_started'::"text", 'form_in_progress'::"text", 'saved_for_later'::"text", 'missing_information'::"text", 'ready_for_review'::"text", 'preview_generated'::"text", 'exported'::"text", 'blocked_review_required'::"text"])))
);

ALTER TABLE "public"."rcap_document_packets" OWNER TO "postgres";

COMMENT ON COLUMN "public"."rcap_document_packets"."relief_outcome" IS 'Definitive outcome for impact reporting. Actual relief delivered is counted from relief_granted and relief_partially_granted values; changes are audited in rcap_record_events.';

COMMENT ON COLUMN "public"."rcap_document_packets"."person_id" IS 'Nullable derived-person link set on new packet writes when intake/profile/name fields produce a match key. No backfill required.';

CREATE TABLE IF NOT EXISTS "public"."rcap_intake_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "partner_slug" "text" NOT NULL,
    "question_key" "text" NOT NULL,
    "response_value" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."rcap_intake_responses" OWNER TO "postgres";

COMMENT ON TABLE "public"."rcap_intake_responses" IS 'Phase 18 RCAP Wilma structured question responses. Values are
  intentionally limited to basic screening and contact fields.';

CREATE TABLE IF NOT EXISTS "public"."rcap_intake_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_slug" "text" NOT NULL,
    "partner_id" "text",
    "status" "text" DEFAULT 'started'::"text" NOT NULL,
    "current_step" "text" DEFAULT 'understand_goal'::"text" NOT NULL,
    "user_first_name" "text",
    "user_last_name" "text",
    "user_email" "text",
    "user_phone" "text",
    "state" "text",
    "county" "text",
    "record_type" "text",
    "charge_or_case_type" "text",
    "case_outcome" "text",
    "approximate_case_year" "text",
    "has_documents" boolean,
    "needs_record_check" boolean,
    "pathway_summary" "text",
    "suggested_next_step" "text",
    "eligibility_signal" "text",
    "legal_disclaimer_accepted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "person_id" "uuid",
    CONSTRAINT "rcap_intake_sessions_eligibility_signal_check" CHECK ((("eligibility_signal" IS NULL) OR ("eligibility_signal" = ANY (ARRAY['possible_pathway'::"text", 'needs_more_information'::"text", 'likely_not_available'::"text", 'human_review_recommended'::"text", 'future_eligibility_update'::"text"])))),
    CONSTRAINT "rcap_intake_sessions_status_check" CHECK (("status" = ANY (ARRAY['started'::"text", 'in_progress'::"text", 'completed'::"text", 'abandoned'::"text", 'needs_review'::"text"])))
);

ALTER TABLE "public"."rcap_intake_sessions" OWNER TO "postgres";

COMMENT ON TABLE "public"."rcap_intake_sessions" IS 'Phase 18 RCAP Wilma guided eligibility intake sessions. No SSN,
  date of birth, uploads, or document generation fields are collected in this phase.';

COMMENT ON COLUMN "public"."rcap_intake_sessions"."pathway_summary" IS 'Deterministic non-legal-advice summary. Does
  not guarantee eligibility or outcomes.';

COMMENT ON COLUMN "public"."rcap_intake_sessions"."person_id" IS 'Nullable derived-person link set on new writes when existing email/name fields produce a match key. No backfill required.';

CREATE TABLE IF NOT EXISTS "public"."rcap_persons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_slug" "text" NOT NULL,
    "match_key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."rcap_persons" OWNER TO "postgres";

COMMENT ON TABLE "public"."rcap_persons" IS 'Partner-scoped derived identity keys for distinct RCAP people counts. match_key is lowercased email when available, else normalized existing name; no SSN, DOB, phone-derived key, or new raw PII is stored.';

CREATE TABLE IF NOT EXISTS "public"."rcap_record_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "record_type" "text" NOT NULL,
    "record_id" "text" NOT NULL,
    "partner_slug" "text" NOT NULL,
    "partner_id" "text",
    "event_type" "text" NOT NULL,
    "from_status" "text",
    "to_status" "text",
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actor" "text" DEFAULT 'system'::"text" NOT NULL,
    "metadata" "jsonb",
    CONSTRAINT "rcap_record_events_record_type_check" CHECK (("record_type" = ANY (ARRAY['intake_session'::"text", 'document_packet'::"text"])))
);

ALTER TABLE ONLY "public"."rcap_record_events" FORCE ROW LEVEL SECURITY;

ALTER TABLE "public"."rcap_record_events" OWNER TO "postgres";

COMMENT ON TABLE "public"."rcap_record_events" IS 'Append-only immutable RCAP audit log for intake/session and document packet status changes. Contains no SSN, DOB, or direct PII.';

CREATE TABLE IF NOT EXISTS "public"."rcap_user_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text",
    "display_name" "text",
    "auth_provider" "text",
    "auth_subject" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."rcap_user_profiles" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."request_rate_limit_buckets" (
    "scope" "text" NOT NULL,
    "bucket_key" "text" NOT NULL,
    "window_start" timestamp with time zone NOT NULL,
    "window_seconds" integer NOT NULL,
    "count" integer DEFAULT 0 NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."request_rate_limit_buckets" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."screening_sessions" (
    "session_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "jurisdiction" "text" NOT NULL,
    "answers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "current_question_id" "text",
    "furthest_stage" "text",
    "status" "text" DEFAULT 'in_progress'::"text" NOT NULL,
    "last_drop_question" "text",
    "resume_email" "text",
    "resume_email_normalized" "text",
    "resume_token_hash" "text",
    "resume_token_expires_at" timestamp with time zone,
    "resume_token_rotated_at" timestamp with time zone,
    "previous_resume_token_hash" "text",
    "previous_resume_token_grace_expires_at" timestamp with time zone,
    "resume_sent_at" timestamp with time zone,
    "resume_confirm_failed_attempts" integer DEFAULT 0 NOT NULL,
    "resume_confirm_locked_until" timestamp with time zone,
    "resume_last_failed_at" timestamp with time zone,
    "resume_consent_at" timestamp with time zone,
    "resume_consent_text_version" "text",
    "partner_slug" "text",
    "flow_mode" "text" DEFAULT 'dtc'::"text" NOT NULL,
    "claimed_slot_state" "text",
    CONSTRAINT "screening_sessions_answers_check" CHECK (("jsonb_typeof"("answers") = 'object'::"text")),
    CONSTRAINT "screening_sessions_claimed_slot_state_check" CHECK ((("claimed_slot_state" IS NULL) OR ("claimed_slot_state" = ANY (ARRAY['claimed'::"text", 'consumed'::"text", 'released'::"text"])))),
    CONSTRAINT "screening_sessions_flow_mode_check" CHECK (("flow_mode" = ANY (ARRAY['dtc'::"text", 'rcap'::"text"]))),
    CONSTRAINT "screening_sessions_jurisdiction_check" CHECK ((("jurisdiction" = "upper"("jurisdiction")) AND (("length"("jurisdiction") >= 2) AND ("length"("jurisdiction") <= 3)))),
    CONSTRAINT "screening_sessions_resume_failed_attempts_check" CHECK (("resume_confirm_failed_attempts" >= 0)),
    CONSTRAINT "screening_sessions_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'resumed'::"text", 'completed'::"text", 'abandoned'::"text"])))
);

ALTER TABLE "public"."screening_sessions" OWNER TO "postgres";

COMMENT ON TABLE "public"."screening_sessions" IS 'Expungement.ai save-and-resume input persistence. Stores raw screening answers and position only; no resultCode, paymentAllowed, packetPlan, contact, or resume token.';

COMMENT ON COLUMN "public"."screening_sessions"."answers" IS 'Raw screening answer map as jsonb. Evaluation outputs must never be stored here.';

COMMENT ON COLUMN "public"."screening_sessions"."resume_token_hash" IS 'SHA-256 hash of the active resume bearer token. Raw resume tokens must never be stored.';

COMMENT ON COLUMN "public"."screening_sessions"."previous_resume_token_hash" IS 'SHA-256 hash of the previous resume token during the short non-stranding grace window.';

COMMENT ON COLUMN "public"."screening_sessions"."partner_slug" IS 'RCAP partner slug for partner-mode screening sessions. NULL for DTC sessions.';

COMMENT ON COLUMN "public"."screening_sessions"."flow_mode" IS 'Screening acquisition mode: dtc for direct-to-consumer, rcap for partner-mode RCAP starts.';

COMMENT ON COLUMN "public"."screening_sessions"."claimed_slot_state" IS 'RCAP slot lifecycle marker. NULL for DTC sessions; partner claims start as claimed.';

CREATE TABLE IF NOT EXISTS "public"."web_analytics_daily_rollups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "day" "date" NOT NULL,
    "domain" "text" NOT NULL,
    "product_surface" "text",
    "event_name" "text" NOT NULL,
    "event_count" bigint DEFAULT 0 NOT NULL,
    "unique_visitors" bigint DEFAULT 0 NOT NULL,
    "sessions" bigint DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."web_analytics_daily_rollups" OWNER TO "postgres";

COMMENT ON TABLE "public"."web_analytics_daily_rollups" IS 'Pre-aggregated daily web analytics counts per domain/event for the Command Center. Populated by a scheduled rollup job; append/upsert on (day, domain, event_name).';

CREATE TABLE IF NOT EXISTS "public"."web_analytics_events" (
    "event_id" "uuid" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "domain" "text",
    "product_surface" "text",
    "event_name" "text" NOT NULL,
    "path" "text",
    "query" "text",
    "page_title" "text",
    "referrer_domain" "text",
    "referrer_url" "text",
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "utm_term" "text",
    "utm_content" "text",
    "visitor_id" "uuid",
    "session_id" "uuid",
    "user_id" "uuid",
    "partner_slug" "text",
    "jurisdiction" "text",
    "device_type" "text",
    "user_agent_family" "text",
    "ip_hash" "text",
    "country" "text",
    "region" "text",
    "event_meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "web_analytics_events_meta_is_object" CHECK (("jsonb_typeof"("event_meta") = 'object'::"text"))
);

ALTER TABLE "public"."web_analytics_events" OWNER TO "postgres";

COMMENT ON TABLE "public"."web_analytics_events" IS 'Append-only first-party web analytics events (pageviews + funnel). No raw IP or PII; anonymous visitor/session UUIDs and salted ip_hash only. Service-role access only.';

COMMENT ON COLUMN "public"."web_analytics_events"."event_id" IS 'Client-generated UUID used as an idempotency key; duplicate deliveries are ignored on insert.';

COMMENT ON COLUMN "public"."web_analytics_events"."product_surface" IS 'One of expungement_ai | legalease | legalease_partner, derived server-side from the request Host.';

COMMENT ON COLUMN "public"."web_analytics_events"."ip_hash" IS 'HMAC-SHA256 of the request IP using WEB_ANALYTICS_IP_SALT. Never the raw IP. Null when the salt is unset.';

COMMENT ON COLUMN "public"."web_analytics_events"."event_meta" IS 'Sanitized low-cardinality funnel metadata (state code, result_code, packet_allowed, partner_slug). Never screening answers or record details.';

ALTER TABLE ONLY "public"."consumer_briefcase_items"
    ADD CONSTRAINT "consumer_briefcase_items_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."consumer_pending_screening_results"
    ADD CONSTRAINT "consumer_pending_screening_results_pending_token_hash_key" UNIQUE ("pending_token_hash");

ALTER TABLE ONLY "public"."consumer_pending_screening_results"
    ADD CONSTRAINT "consumer_pending_screening_results_pkey" PRIMARY KEY ("pending_id");

ALTER TABLE ONLY "public"."consumer_wilma_telemetry"
    ADD CONSTRAINT "consumer_wilma_telemetry_exchange_id_key" UNIQUE ("exchange_id");

ALTER TABLE ONLY "public"."consumer_wilma_telemetry"
    ADD CONSTRAINT "consumer_wilma_telemetry_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."content_admin_users"
    ADD CONSTRAINT "content_admin_users_pkey" PRIMARY KEY ("auth_user_id");

ALTER TABLE ONLY "public"."content_audit_events"
    ADD CONSTRAINT "content_audit_events_pkey" PRIMARY KEY ("audit_id");

ALTER TABLE ONLY "public"."content_authors"
    ADD CONSTRAINT "content_authors_pkey" PRIMARY KEY ("author_id");

ALTER TABLE ONLY "public"."content_authors"
    ADD CONSTRAINT "content_authors_slug_key" UNIQUE ("slug");

ALTER TABLE ONLY "public"."content_campaign_channels"
    ADD CONSTRAINT "content_campaign_channels_campaign_channel_key" UNIQUE ("campaign_id", "channel");

ALTER TABLE ONLY "public"."content_campaign_channels"
    ADD CONSTRAINT "content_campaign_channels_pkey" PRIMARY KEY ("campaign_channel_id");

ALTER TABLE ONLY "public"."content_campaigns"
    ADD CONSTRAINT "content_campaigns_pkey" PRIMARY KEY ("campaign_id");

ALTER TABLE ONLY "public"."content_categories"
    ADD CONSTRAINT "content_categories_pkey" PRIMARY KEY ("category_id");

ALTER TABLE ONLY "public"."content_categories"
    ADD CONSTRAINT "content_categories_slug_key" UNIQUE ("slug");

ALTER TABLE ONLY "public"."content_media"
    ADD CONSTRAINT "content_media_pkey" PRIMARY KEY ("media_id");

ALTER TABLE ONLY "public"."content_media"
    ADD CONSTRAINT "content_media_storage_path_key" UNIQUE ("storage_path");

ALTER TABLE ONLY "public"."content_media_usages"
    ADD CONSTRAINT "content_media_usages_pkey" PRIMARY KEY ("usage_id");

ALTER TABLE ONLY "public"."content_media_usages"
    ADD CONSTRAINT "content_media_usages_unique_key" UNIQUE ("media_id", "post_id", "usage_kind");

ALTER TABLE ONLY "public"."content_post_tags"
    ADD CONSTRAINT "content_post_tags_pkey" PRIMARY KEY ("post_id", "tag_id");

ALTER TABLE ONLY "public"."content_post_versions"
    ADD CONSTRAINT "content_post_versions_pkey" PRIMARY KEY ("version_id");

ALTER TABLE ONLY "public"."content_post_versions"
    ADD CONSTRAINT "content_post_versions_post_version_key" UNIQUE ("post_id", "version");

ALTER TABLE ONLY "public"."content_posts"
    ADD CONSTRAINT "content_posts_pkey" PRIMARY KEY ("post_id");

ALTER TABLE ONLY "public"."content_posts"
    ADD CONSTRAINT "content_posts_slug_destination_locale_key" UNIQUE ("destination", "locale", "slug");

ALTER TABLE ONLY "public"."content_promotion_outbox"
    ADD CONSTRAINT "content_promotion_outbox_idempotency_key_key" UNIQUE ("idempotency_key");

ALTER TABLE ONLY "public"."content_promotion_outbox"
    ADD CONSTRAINT "content_promotion_outbox_pkey" PRIMARY KEY ("event_id");

ALTER TABLE ONLY "public"."content_publications"
    ADD CONSTRAINT "content_publications_pkey" PRIMARY KEY ("publication_id");

ALTER TABLE ONLY "public"."content_reviews"
    ADD CONSTRAINT "content_reviews_pkey" PRIMARY KEY ("review_id");

ALTER TABLE ONLY "public"."content_social_assets"
    ADD CONSTRAINT "content_social_assets_pkey" PRIMARY KEY ("social_asset_id");

ALTER TABLE ONLY "public"."content_social_assets"
    ADD CONSTRAINT "content_social_assets_post_template_size_key" UNIQUE ("post_id", "template", "size_key");

ALTER TABLE ONLY "public"."content_social_drafts"
    ADD CONSTRAINT "content_social_drafts_pkey" PRIMARY KEY ("social_draft_id");

ALTER TABLE ONLY "public"."content_social_drafts"
    ADD CONSTRAINT "content_social_drafts_post_channel_key" UNIQUE ("post_id", "channel");

ALTER TABLE ONLY "public"."content_state_editorial"
    ADD CONSTRAINT "content_state_editorial_pkey" PRIMARY KEY ("jurisdiction_code");

ALTER TABLE ONLY "public"."content_tags"
    ADD CONSTRAINT "content_tags_pkey" PRIMARY KEY ("tag_id");

ALTER TABLE ONLY "public"."content_tags"
    ADD CONSTRAINT "content_tags_slug_key" UNIQUE ("slug");

ALTER TABLE ONLY "public"."content_testimonials"
    ADD CONSTRAINT "content_testimonials_pkey" PRIMARY KEY ("testimonial_id");

ALTER TABLE ONLY "public"."legalease_os_support_items"
    ADD CONSTRAINT "legalease_os_support_items_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."partner_assets"
    ADD CONSTRAINT "partner_assets_partner_slug_asset_key_key" UNIQUE ("partner_slug", "asset_key");

ALTER TABLE ONLY "public"."partner_assets"
    ADD CONSTRAINT "partner_assets_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."partner_billing_requests"
    ADD CONSTRAINT "partner_billing_requests_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."partner_billing_requests"
    ADD CONSTRAINT "partner_billing_requests_stripe_invoice_id_key" UNIQUE ("stripe_invoice_id");

ALTER TABLE ONLY "public"."partner_entitlement"
    ADD CONSTRAINT "partner_entitlement_partner_slug_key" UNIQUE ("partner_slug");

ALTER TABLE ONLY "public"."partner_events"
    ADD CONSTRAINT "partner_events_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."partner_metrics"
    ADD CONSTRAINT "partner_metrics_partner_slug_key" UNIQUE ("partner_slug");

ALTER TABLE ONLY "public"."partner_metrics"
    ADD CONSTRAINT "partner_metrics_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."partner_pilot_requests"
    ADD CONSTRAINT "partner_pilot_requests_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."partner_records"
    ADD CONSTRAINT "partner_records_partner_id_key" UNIQUE ("partner_id");

ALTER TABLE ONLY "public"."partner_records"
    ADD CONSTRAINT "partner_records_partner_slug_key" UNIQUE ("partner_slug");

ALTER TABLE ONLY "public"."partner_records"
    ADD CONSTRAINT "partner_records_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."partner_users"
    ADD CONSTRAINT "partner_users_auth_user_id_unique" UNIQUE ("auth_user_id");

ALTER TABLE ONLY "public"."partner_users"
    ADD CONSTRAINT "partner_users_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."processed_stripe_events"
    ADD CONSTRAINT "processed_stripe_events_pkey" PRIMARY KEY ("stripe_event_id");

ALTER TABLE ONLY "public"."rcap_briefcase_items"
    ADD CONSTRAINT "rcap_briefcase_items_packet_unique" UNIQUE ("document_packet_id");

ALTER TABLE ONLY "public"."rcap_briefcase_items"
    ADD CONSTRAINT "rcap_briefcase_items_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."rcap_document_packet_inputs"
    ADD CONSTRAINT "rcap_document_packet_inputs_packet_unique" UNIQUE ("document_packet_id");

ALTER TABLE ONLY "public"."rcap_document_packet_inputs"
    ADD CONSTRAINT "rcap_document_packet_inputs_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."rcap_document_packets"
    ADD CONSTRAINT "rcap_document_packets_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."rcap_intake_responses"
    ADD CONSTRAINT "rcap_intake_responses_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."rcap_intake_responses"
    ADD CONSTRAINT "rcap_intake_responses_session_id_question_key_key" UNIQUE ("session_id", "question_key");

ALTER TABLE ONLY "public"."rcap_intake_sessions"
    ADD CONSTRAINT "rcap_intake_sessions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."rcap_persons"
    ADD CONSTRAINT "rcap_persons_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."rcap_record_events"
    ADD CONSTRAINT "rcap_record_events_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."rcap_user_profiles"
    ADD CONSTRAINT "rcap_user_profiles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."request_rate_limit_buckets"
    ADD CONSTRAINT "request_rate_limit_buckets_pkey" PRIMARY KEY ("scope", "bucket_key", "window_start");

ALTER TABLE ONLY "public"."screening_sessions"
    ADD CONSTRAINT "screening_sessions_pkey" PRIMARY KEY ("session_id");

ALTER TABLE ONLY "public"."web_analytics_daily_rollups"
    ADD CONSTRAINT "web_analytics_daily_rollups_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."web_analytics_daily_rollups"
    ADD CONSTRAINT "web_analytics_daily_rollups_unique" UNIQUE ("day", "domain", "event_name");

ALTER TABLE ONLY "public"."web_analytics_events"
    ADD CONSTRAINT "web_analytics_events_pkey" PRIMARY KEY ("event_id");

CREATE INDEX "consumer_briefcase_items_checkout_session_id_idx" ON "public"."consumer_briefcase_items" USING "btree" ("checkout_session_id") WHERE ("checkout_session_id" IS NOT NULL);

CREATE INDEX "consumer_briefcase_items_user_created_at_idx" ON "public"."consumer_briefcase_items" USING "btree" ("user_id", "created_at" DESC);

CREATE INDEX "consumer_briefcase_items_user_result_code_idx" ON "public"."consumer_briefcase_items" USING "btree" ("user_id", "result_code");

CREATE INDEX "consumer_briefcase_items_user_status_idx" ON "public"."consumer_briefcase_items" USING "btree" ("user_id", "status");

CREATE INDEX "consumer_pending_screening_results_claimed_user_idx" ON "public"."consumer_pending_screening_results" USING "btree" ("claimed_user_id") WHERE ("claimed_user_id" IS NOT NULL);

CREATE INDEX "consumer_pending_screening_results_expires_at_idx" ON "public"."consumer_pending_screening_results" USING "btree" ("expires_at");

CREATE INDEX "content_audit_events_created_at_idx" ON "public"."content_audit_events" USING "btree" ("created_at" DESC);

CREATE INDEX "content_audit_events_entity_idx" ON "public"."content_audit_events" USING "btree" ("entity_type", "entity_id");

CREATE INDEX "content_authors_slug_idx" ON "public"."content_authors" USING "btree" ("slug");

CREATE INDEX "content_media_created_at_idx" ON "public"."content_media" USING "btree" ("created_at" DESC);

CREATE INDEX "content_media_permission_idx" ON "public"."content_media" USING "btree" ("permission_status");

CREATE INDEX "content_post_tags_tag_id_idx" ON "public"."content_post_tags" USING "btree" ("tag_id");

CREATE INDEX "content_post_versions_post_id_idx" ON "public"."content_post_versions" USING "btree" ("post_id", "version" DESC);

CREATE INDEX "content_posts_author_id_idx" ON "public"."content_posts" USING "btree" ("author_id") WHERE ("author_id" IS NOT NULL);

CREATE INDEX "content_posts_category_id_idx" ON "public"."content_posts" USING "btree" ("category_id") WHERE ("category_id" IS NOT NULL);

CREATE INDEX "content_posts_destination_status_idx" ON "public"."content_posts" USING "btree" ("destination", "status");

CREATE INDEX "content_posts_jurisdiction_idx" ON "public"."content_posts" USING "btree" ("jurisdiction_code") WHERE ("jurisdiction_code" IS NOT NULL);

CREATE INDEX "content_posts_partner_slug_idx" ON "public"."content_posts" USING "btree" ("partner_slug") WHERE ("partner_slug" IS NOT NULL);

CREATE INDEX "content_posts_published_at_idx" ON "public"."content_posts" USING "btree" ("published_at" DESC) WHERE ("published_at" IS NOT NULL);

CREATE INDEX "content_posts_scheduled_for_idx" ON "public"."content_posts" USING "btree" ("scheduled_for") WHERE ("scheduled_for" IS NOT NULL);

CREATE INDEX "content_promotion_outbox_status_idx" ON "public"."content_promotion_outbox" USING "btree" ("status", "next_attempt_at");

CREATE INDEX "content_publications_post_id_idx" ON "public"."content_publications" USING "btree" ("post_id", "occurred_at" DESC);

CREATE INDEX "content_reviews_post_id_idx" ON "public"."content_reviews" USING "btree" ("post_id", "created_at" DESC);

CREATE INDEX "legalease_os_support_items_created_at_idx" ON "public"."legalease_os_support_items" USING "btree" ("created_at" DESC);

CREATE INDEX "legalease_os_support_items_status_idx" ON "public"."legalease_os_support_items" USING "btree" ("status");

CREATE INDEX "legalease_os_support_items_user_id_idx" ON "public"."legalease_os_support_items" USING "btree" ("user_id");

CREATE INDEX "partner_assets_partner_slug_idx" ON "public"."partner_assets" USING "btree" ("partner_slug");

CREATE INDEX "partner_billing_requests_created_at_idx" ON "public"."partner_billing_requests" USING "btree" ("created_at" DESC);

CREATE INDEX "partner_billing_requests_partner_pilot_request_id_idx" ON "public"."partner_billing_requests" USING "btree" ("partner_pilot_request_id");

CREATE INDEX "partner_billing_requests_partner_slug_idx" ON "public"."partner_billing_requests" USING "btree" ("partner_slug");

CREATE INDEX "partner_billing_requests_status_idx" ON "public"."partner_billing_requests" USING "btree" ("status");

CREATE INDEX "partner_entitlement_partner_slug_idx" ON "public"."partner_entitlement" USING "btree" ("partner_slug");

CREATE INDEX "partner_events_created_at_idx" ON "public"."partner_events" USING "btree" ("created_at");

CREATE INDEX "partner_events_partner_slug_idx" ON "public"."partner_events" USING "btree" ("partner_slug");

CREATE INDEX "partner_pilot_requests_created_at_idx" ON "public"."partner_pilot_requests" USING "btree" ("created_at" DESC);

CREATE INDEX "partner_pilot_requests_status_idx" ON "public"."partner_pilot_requests" USING "btree" ("status");

CREATE INDEX "partner_records_onboarding_status_idx" ON "public"."partner_records" USING "btree" ("onboarding_status");

CREATE INDEX "partner_records_partner_slug_idx" ON "public"."partner_records" USING "btree" ("partner_slug");

CREATE INDEX "partner_records_payment_status_idx" ON "public"."partner_records" USING "btree" ("payment_status");

CREATE INDEX "partner_records_provisioning_status_idx" ON "public"."partner_records" USING "btree" ("provisioning_status");

CREATE INDEX "partner_users_auth_status_role_idx" ON "public"."partner_users" USING "btree" ("auth_user_id", "status", "role");

CREATE INDEX "partner_users_auth_user_id_idx" ON "public"."partner_users" USING "btree" ("auth_user_id");

CREATE INDEX "partner_users_partner_slug_idx" ON "public"."partner_users" USING "btree" ("partner_slug");

CREATE INDEX "rcap_briefcase_items_intake_session_id_idx" ON "public"."rcap_briefcase_items" USING "btree" ("intake_session_id");

CREATE INDEX "rcap_briefcase_items_partner_slug_idx" ON "public"."rcap_briefcase_items" USING "btree" ("partner_slug");

CREATE INDEX "rcap_briefcase_items_user_id_idx" ON "public"."rcap_briefcase_items" USING "btree" ("user_id");

CREATE INDEX "rcap_document_packet_inputs_intake_session_id_idx" ON "public"."rcap_document_packet_inputs" USING "btree" ("intake_session_id");

CREATE INDEX "rcap_document_packet_inputs_partner_slug_idx" ON "public"."rcap_document_packet_inputs" USING "btree" ("partner_slug");

CREATE INDEX "rcap_document_packets_intake_session_id_idx" ON "public"."rcap_document_packets" USING "btree" ("intake_session_id");

CREATE INDEX "rcap_document_packets_partner_outcome_person_idx" ON "public"."rcap_document_packets" USING "btree" ("partner_slug", "relief_outcome", "person_id") WHERE ("person_id" IS NOT NULL);

CREATE INDEX "rcap_document_packets_partner_person_idx" ON "public"."rcap_document_packets" USING "btree" ("partner_slug", "person_id") WHERE ("person_id" IS NOT NULL);

CREATE INDEX "rcap_document_packets_partner_slug_idx" ON "public"."rcap_document_packets" USING "btree" ("partner_slug");

CREATE INDEX "rcap_document_packets_relief_outcome_idx" ON "public"."rcap_document_packets" USING "btree" ("partner_slug", "relief_outcome", "updated_at");

CREATE INDEX "rcap_document_packets_source_state_idx" ON "public"."rcap_document_packets" USING "btree" ("state", "created_at") WHERE ("document_type" = 'source_driven_packet'::"text");

CREATE INDEX "rcap_document_packets_state_status_idx" ON "public"."rcap_document_packets" USING "btree" ("state", "status");

CREATE INDEX "rcap_document_packets_user_id_idx" ON "public"."rcap_document_packets" USING "btree" ("user_id");

CREATE INDEX "rcap_intake_responses_partner_slug_idx" ON "public"."rcap_intake_responses" USING "btree" ("partner_slug");

CREATE INDEX "rcap_intake_responses_session_id_idx" ON "public"."rcap_intake_responses" USING "btree" ("session_id");

CREATE INDEX "rcap_intake_sessions_eligibility_signal_idx" ON "public"."rcap_intake_sessions" USING "btree" ("eligibility_signal");

CREATE INDEX "rcap_intake_sessions_partner_person_idx" ON "public"."rcap_intake_sessions" USING "btree" ("partner_slug", "person_id") WHERE ("person_id" IS NOT NULL);

CREATE INDEX "rcap_intake_sessions_partner_slug_idx" ON "public"."rcap_intake_sessions" USING "btree" ("partner_slug");

CREATE INDEX "rcap_intake_sessions_status_idx" ON "public"."rcap_intake_sessions" USING "btree" ("status");

CREATE UNIQUE INDEX "rcap_persons_partner_match_key_idx" ON "public"."rcap_persons" USING "btree" ("partner_slug", "match_key");

CREATE INDEX "rcap_record_events_partner_idx" ON "public"."rcap_record_events" USING "btree" ("partner_slug", "occurred_at");

CREATE INDEX "rcap_record_events_record_idx" ON "public"."rcap_record_events" USING "btree" ("record_type", "record_id", "occurred_at");

CREATE INDEX "request_rate_limit_buckets_expires_at_idx" ON "public"."request_rate_limit_buckets" USING "btree" ("expires_at");

CREATE INDEX "request_rate_limit_buckets_scope_bucket_window_idx" ON "public"."request_rate_limit_buckets" USING "btree" ("scope", "bucket_key", "window_start");

CREATE INDEX "screening_sessions_flow_mode_idx" ON "public"."screening_sessions" USING "btree" ("flow_mode");

CREATE INDEX "screening_sessions_partner_slug_idx" ON "public"."screening_sessions" USING "btree" ("partner_slug") WHERE ("partner_slug" IS NOT NULL);

CREATE INDEX "screening_sessions_previous_resume_token_hash_idx" ON "public"."screening_sessions" USING "btree" ("previous_resume_token_hash") WHERE ("previous_resume_token_hash" IS NOT NULL);

CREATE INDEX "screening_sessions_resume_email_normalized_idx" ON "public"."screening_sessions" USING "btree" ("resume_email_normalized") WHERE ("resume_email_normalized" IS NOT NULL);

CREATE INDEX "screening_sessions_resume_token_hash_idx" ON "public"."screening_sessions" USING "btree" ("resume_token_hash") WHERE ("resume_token_hash" IS NOT NULL);

CREATE INDEX "web_analytics_daily_rollups_day_idx" ON "public"."web_analytics_daily_rollups" USING "btree" ("day" DESC, "domain");

CREATE INDEX "web_analytics_events_domain_idx" ON "public"."web_analytics_events" USING "btree" ("domain", "occurred_at" DESC);

CREATE INDEX "web_analytics_events_event_name_idx" ON "public"."web_analytics_events" USING "btree" ("event_name", "occurred_at" DESC);

CREATE INDEX "web_analytics_events_occurred_at_idx" ON "public"."web_analytics_events" USING "btree" ("occurred_at" DESC);

CREATE INDEX "web_analytics_events_partner_idx" ON "public"."web_analytics_events" USING "btree" ("partner_slug", "occurred_at" DESC) WHERE ("partner_slug" IS NOT NULL);

CREATE INDEX "web_analytics_events_path_idx" ON "public"."web_analytics_events" USING "btree" ("path");

CREATE INDEX "web_analytics_events_session_idx" ON "public"."web_analytics_events" USING "btree" ("session_id");

CREATE INDEX "web_analytics_events_surface_idx" ON "public"."web_analytics_events" USING "btree" ("product_surface", "occurred_at" DESC);

CREATE INDEX "web_analytics_events_utm_campaign_idx" ON "public"."web_analytics_events" USING "btree" ("utm_campaign", "occurred_at" DESC) WHERE ("utm_campaign" IS NOT NULL);

CREATE INDEX "web_analytics_events_visitor_idx" ON "public"."web_analytics_events" USING "btree" ("visitor_id");

CREATE OR REPLACE TRIGGER "content_enforce_publish_authority" BEFORE INSERT OR UPDATE ON "public"."content_posts" FOR EACH ROW EXECUTE FUNCTION "public"."content_enforce_publish_authority"();

CREATE OR REPLACE TRIGGER "rcap_document_packets_relief_outcome_audit" AFTER UPDATE OF "relief_outcome" ON "public"."rcap_document_packets" FOR EACH ROW EXECUTE FUNCTION "public"."write_rcap_document_packet_relief_outcome_event"();

CREATE OR REPLACE TRIGGER "rcap_record_events_prevent_delete" BEFORE DELETE ON "public"."rcap_record_events" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_rcap_record_events_mutation"();

CREATE OR REPLACE TRIGGER "rcap_record_events_prevent_update" BEFORE UPDATE ON "public"."rcap_record_events" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_rcap_record_events_mutation"();

CREATE OR REPLACE TRIGGER "reject_content_audit_delete" BEFORE DELETE ON "public"."content_audit_events" FOR EACH ROW EXECUTE FUNCTION "public"."reject_content_audit_mutation"();

CREATE OR REPLACE TRIGGER "reject_content_audit_update" BEFORE UPDATE ON "public"."content_audit_events" FOR EACH ROW EXECUTE FUNCTION "public"."reject_content_audit_mutation"();

CREATE OR REPLACE TRIGGER "set_content_admin_users_updated_at" BEFORE UPDATE ON "public"."content_admin_users" FOR EACH ROW EXECUTE FUNCTION "public"."set_content_admin_users_updated_at"();

CREATE OR REPLACE TRIGGER "set_content_authors_updated_at" BEFORE UPDATE ON "public"."content_authors" FOR EACH ROW EXECUTE FUNCTION "public"."set_content_authors_updated_at"();

CREATE OR REPLACE TRIGGER "set_content_campaigns_updated_at" BEFORE UPDATE ON "public"."content_campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."set_content_campaigns_updated_at"();

CREATE OR REPLACE TRIGGER "set_content_media_updated_at" BEFORE UPDATE ON "public"."content_media" FOR EACH ROW EXECUTE FUNCTION "public"."set_content_media_updated_at"();

CREATE OR REPLACE TRIGGER "set_content_posts_updated_at" BEFORE UPDATE ON "public"."content_posts" FOR EACH ROW EXECUTE FUNCTION "public"."set_content_posts_updated_at"();

CREATE OR REPLACE TRIGGER "set_content_promotion_outbox_updated_at" BEFORE UPDATE ON "public"."content_promotion_outbox" FOR EACH ROW EXECUTE FUNCTION "public"."set_content_promotion_outbox_updated_at"();

CREATE OR REPLACE TRIGGER "set_content_social_drafts_updated_at" BEFORE UPDATE ON "public"."content_social_drafts" FOR EACH ROW EXECUTE FUNCTION "public"."set_content_social_drafts_updated_at"();

CREATE OR REPLACE TRIGGER "set_content_state_editorial_updated_at" BEFORE UPDATE ON "public"."content_state_editorial" FOR EACH ROW EXECUTE FUNCTION "public"."set_content_state_editorial_updated_at"();

CREATE OR REPLACE TRIGGER "set_content_testimonials_updated_at" BEFORE UPDATE ON "public"."content_testimonials" FOR EACH ROW EXECUTE FUNCTION "public"."set_content_testimonials_updated_at"();

CREATE OR REPLACE TRIGGER "set_partner_entitlement_updated_at" BEFORE UPDATE ON "public"."partner_entitlement" FOR EACH ROW EXECUTE FUNCTION "public"."set_partner_entitlement_updated_at"();

CREATE OR REPLACE TRIGGER "set_partner_users_updated_at" BEFORE UPDATE ON "public"."partner_users" FOR EACH ROW EXECUTE FUNCTION "public"."set_partner_users_updated_at"();

CREATE OR REPLACE TRIGGER "set_rcap_document_packets_updated_at" BEFORE UPDATE ON "public"."rcap_document_packets" FOR EACH ROW EXECUTE FUNCTION "public"."set_rcap_document_packets_updated_at"();

ALTER TABLE ONLY "public"."consumer_briefcase_items"
    ADD CONSTRAINT "consumer_briefcase_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."consumer_pending_screening_results"
    ADD CONSTRAINT "consumer_pending_screening_results_claimed_user_id_fkey" FOREIGN KEY ("claimed_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."content_admin_users"
    ADD CONSTRAINT "content_admin_users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."content_audit_events"
    ADD CONSTRAINT "content_audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."content_authors"
    ADD CONSTRAINT "content_authors_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."content_campaign_channels"
    ADD CONSTRAINT "content_campaign_channels_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."content_campaigns"("campaign_id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."content_campaign_channels"
    ADD CONSTRAINT "content_campaign_channels_social_draft_id_fkey" FOREIGN KEY ("social_draft_id") REFERENCES "public"."content_social_drafts"("social_draft_id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."content_campaigns"
    ADD CONSTRAINT "content_campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."content_campaigns"
    ADD CONSTRAINT "content_campaigns_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."content_posts"("post_id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."content_media"
    ADD CONSTRAINT "content_media_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."content_media_usages"
    ADD CONSTRAINT "content_media_usages_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."content_media"("media_id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."content_media_usages"
    ADD CONSTRAINT "content_media_usages_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."content_posts"("post_id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."content_post_tags"
    ADD CONSTRAINT "content_post_tags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."content_posts"("post_id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."content_post_tags"
    ADD CONSTRAINT "content_post_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."content_tags"("tag_id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."content_post_versions"
    ADD CONSTRAINT "content_post_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."content_post_versions"
    ADD CONSTRAINT "content_post_versions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."content_posts"("post_id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."content_posts"
    ADD CONSTRAINT "content_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."content_authors"("author_id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."content_posts"
    ADD CONSTRAINT "content_posts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."content_categories"("category_id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."content_posts"
    ADD CONSTRAINT "content_posts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."content_posts"
    ADD CONSTRAINT "content_posts_editorial_approved_by_fkey" FOREIGN KEY ("editorial_approved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."content_posts"
    ADD CONSTRAINT "content_posts_legal_approved_by_fkey" FOREIGN KEY ("legal_approved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."content_promotion_outbox"
    ADD CONSTRAINT "content_promotion_outbox_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."content_campaigns"("campaign_id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."content_promotion_outbox"
    ADD CONSTRAINT "content_promotion_outbox_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."content_posts"("post_id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."content_publications"
    ADD CONSTRAINT "content_publications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."content_publications"
    ADD CONSTRAINT "content_publications_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."content_posts"("post_id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."content_reviews"
    ADD CONSTRAINT "content_reviews_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."content_posts"("post_id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."content_reviews"
    ADD CONSTRAINT "content_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."content_social_assets"
    ADD CONSTRAINT "content_social_assets_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."content_posts"("post_id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."content_social_drafts"
    ADD CONSTRAINT "content_social_drafts_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."content_social_drafts"
    ADD CONSTRAINT "content_social_drafts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."content_posts"("post_id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."content_state_editorial"
    ADD CONSTRAINT "content_state_editorial_featured_media_id_fkey" FOREIGN KEY ("featured_media_id") REFERENCES "public"."content_media"("media_id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."content_state_editorial"
    ADD CONSTRAINT "content_state_editorial_legal_approved_by_fkey" FOREIGN KEY ("legal_approved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."content_state_editorial"
    ADD CONSTRAINT "content_state_editorial_og_media_id_fkey" FOREIGN KEY ("og_media_id") REFERENCES "public"."content_media"("media_id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."content_state_editorial"
    ADD CONSTRAINT "content_state_editorial_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."content_testimonials"
    ADD CONSTRAINT "content_testimonials_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."content_media"("media_id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."legalease_os_support_items"
    ADD CONSTRAINT "legalease_os_support_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."partner_assets"
    ADD CONSTRAINT "partner_assets_partner_slug_fkey" FOREIGN KEY ("partner_slug") REFERENCES "public"."partner_records"("partner_slug") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."partner_billing_requests"
    ADD CONSTRAINT "partner_billing_requests_partner_pilot_request_id_fkey" FOREIGN KEY ("partner_pilot_request_id") REFERENCES "public"."partner_pilot_requests"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."partner_entitlement"
    ADD CONSTRAINT "partner_entitlement_partner_slug_fkey" FOREIGN KEY ("partner_slug") REFERENCES "public"."partner_records"("partner_slug") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."partner_events"
    ADD CONSTRAINT "partner_events_partner_slug_fkey" FOREIGN KEY ("partner_slug") REFERENCES "public"."partner_records"("partner_slug") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."partner_metrics"
    ADD CONSTRAINT "partner_metrics_partner_slug_fkey" FOREIGN KEY ("partner_slug") REFERENCES "public"."partner_records"("partner_slug") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."partner_users"
    ADD CONSTRAINT "partner_users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."partner_users"
    ADD CONSTRAINT "partner_users_partner_slug_fkey" FOREIGN KEY ("partner_slug") REFERENCES "public"."partner_records"("partner_slug") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."rcap_briefcase_items"
    ADD CONSTRAINT "rcap_briefcase_items_document_packet_id_fkey" FOREIGN KEY ("document_packet_id") REFERENCES "public"."rcap_document_packets"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."rcap_briefcase_items"
    ADD CONSTRAINT "rcap_briefcase_items_intake_session_id_fkey" FOREIGN KEY ("intake_session_id") REFERENCES "public"."rcap_intake_sessions"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."rcap_document_packet_inputs"
    ADD CONSTRAINT "rcap_document_packet_inputs_document_packet_id_fkey" FOREIGN KEY ("document_packet_id") REFERENCES "public"."rcap_document_packets"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."rcap_document_packet_inputs"
    ADD CONSTRAINT "rcap_document_packet_inputs_intake_session_id_fkey" FOREIGN KEY ("intake_session_id") REFERENCES "public"."rcap_intake_sessions"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."rcap_document_packets"
    ADD CONSTRAINT "rcap_document_packets_intake_session_id_fkey" FOREIGN KEY ("intake_session_id") REFERENCES "public"."rcap_intake_sessions"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."rcap_document_packets"
    ADD CONSTRAINT "rcap_document_packets_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."rcap_persons"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."rcap_intake_responses"
    ADD CONSTRAINT "rcap_intake_responses_partner_slug_fkey" FOREIGN KEY ("partner_slug") REFERENCES "public"."partner_records"("partner_slug") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."rcap_intake_responses"
    ADD CONSTRAINT "rcap_intake_responses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."rcap_intake_sessions"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."rcap_intake_sessions"
    ADD CONSTRAINT "rcap_intake_sessions_partner_slug_fkey" FOREIGN KEY ("partner_slug") REFERENCES "public"."partner_records"("partner_slug") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."rcap_intake_sessions"
    ADD CONSTRAINT "rcap_intake_sessions_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."rcap_persons"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."screening_sessions"
    ADD CONSTRAINT "screening_sessions_partner_slug_fkey" FOREIGN KEY ("partner_slug") REFERENCES "public"."partner_records"("partner_slug") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."web_analytics_events"
    ADD CONSTRAINT "web_analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

CREATE POLICY "consumer briefcase delete own items" ON "public"."consumer_briefcase_items" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "consumer briefcase insert own items" ON "public"."consumer_briefcase_items" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "consumer briefcase select own items" ON "public"."consumer_briefcase_items" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "consumer briefcase update own items" ON "public"."consumer_briefcase_items" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "consumer wilma telemetry internal safety select" ON "public"."consumer_wilma_telemetry" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."partner_users" "pu"
  WHERE (("pu"."auth_user_id" = "auth"."uid"()) AND ("pu"."role" = ANY (ARRAY['internal_admin'::"text", 'safety_reviewer'::"text"]))))));

ALTER TABLE "public"."consumer_briefcase_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."consumer_pending_screening_results" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."consumer_wilma_telemetry" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."content_admin_users" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_admin_users_manage_primary_admin" ON "public"."content_admin_users" TO "authenticated" USING ((("public"."is_internal_admin"() AND ("auth_user_id" <> "auth"."uid"())) OR (("public"."content_current_role"() = 'primary_admin'::"text") AND ("auth_user_id" <> "auth"."uid"())))) WITH CHECK ((("public"."is_internal_admin"() AND ("auth_user_id" <> "auth"."uid"())) OR (("public"."content_current_role"() = 'primary_admin'::"text") AND ("auth_user_id" <> "auth"."uid"()))));

CREATE POLICY "content_admin_users_select_self" ON "public"."content_admin_users" FOR SELECT TO "authenticated" USING ((("auth_user_id" = "auth"."uid"()) OR "public"."is_internal_admin"()));

ALTER TABLE "public"."content_audit_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_audit_events_insert_service_role" ON "public"."content_audit_events" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));

CREATE POLICY "content_audit_events_select_service_role" ON "public"."content_audit_events" FOR SELECT USING (("auth"."role"() = 'service_role'::"text"));

CREATE POLICY "content_audit_events_select_team" ON "public"."content_audit_events" FOR SELECT TO "authenticated" USING ("public"."content_has_any_role"());

ALTER TABLE "public"."content_authors" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_authors_manage" ON "public"."content_authors" TO "authenticated" USING ("public"."content_can_edit_any"()) WITH CHECK ("public"."content_can_edit_any"());

CREATE POLICY "content_authors_service_role_all" ON "public"."content_authors" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));

ALTER TABLE "public"."content_campaign_channels" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_campaign_channels_service_role_all" ON "public"."content_campaign_channels" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));

CREATE POLICY "content_campaign_channels_team" ON "public"."content_campaign_channels" FOR SELECT TO "authenticated" USING ("public"."content_has_any_role"());

ALTER TABLE "public"."content_campaigns" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_campaigns_service_role_all" ON "public"."content_campaigns" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));

CREATE POLICY "content_campaigns_team" ON "public"."content_campaigns" TO "authenticated" USING (("public"."content_current_role"() = ANY (ARRAY['primary_admin'::"text", 'editor'::"text", 'social_manager'::"text"]))) WITH CHECK (("public"."content_current_role"() = ANY (ARRAY['primary_admin'::"text", 'editor'::"text", 'social_manager'::"text"])));

ALTER TABLE "public"."content_categories" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_categories_manage" ON "public"."content_categories" TO "authenticated" USING ("public"."content_can_edit_any"()) WITH CHECK ("public"."content_can_edit_any"());

CREATE POLICY "content_categories_select_public" ON "public"."content_categories" FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "content_categories_service_role_all" ON "public"."content_categories" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));

ALTER TABLE "public"."content_media" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_media_insert_team" ON "public"."content_media" FOR INSERT TO "authenticated" WITH CHECK (("public"."content_current_role"() = ANY (ARRAY['primary_admin'::"text", 'editor'::"text", 'social_manager'::"text", 'contributor'::"text"])));

CREATE POLICY "content_media_service_role_all" ON "public"."content_media" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));

CREATE POLICY "content_media_update_team" ON "public"."content_media" FOR UPDATE TO "authenticated" USING (("public"."content_current_role"() = ANY (ARRAY['primary_admin'::"text", 'editor'::"text", 'social_manager'::"text"]))) WITH CHECK (("public"."content_current_role"() = ANY (ARRAY['primary_admin'::"text", 'editor'::"text", 'social_manager'::"text"])));

ALTER TABLE "public"."content_media_usages" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_media_usages_select_team" ON "public"."content_media_usages" FOR SELECT TO "authenticated" USING ("public"."content_has_any_role"());

CREATE POLICY "content_media_usages_service_role_all" ON "public"."content_media_usages" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));

ALTER TABLE "public"."content_post_tags" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_post_tags_manage" ON "public"."content_post_tags" TO "authenticated" USING ("public"."content_can_edit_any"()) WITH CHECK ("public"."content_can_edit_any"());

CREATE POLICY "content_post_tags_service_role_all" ON "public"."content_post_tags" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));

ALTER TABLE "public"."content_post_versions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_post_versions_select_team" ON "public"."content_post_versions" FOR SELECT TO "authenticated" USING ("public"."content_has_any_role"());

CREATE POLICY "content_post_versions_service_role_all" ON "public"."content_post_versions" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));

ALTER TABLE "public"."content_posts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_posts_insert_authors" ON "public"."content_posts" FOR INSERT TO "authenticated" WITH CHECK (((("public"."content_current_role"() = ANY (ARRAY['primary_admin'::"text", 'editor'::"text", 'contributor'::"text"])) AND ("status" = ANY (ARRAY['draft'::"text", 'in_editorial_review'::"text"]))) OR (("public"."content_current_role"() = 'partner_contributor'::"text") AND ("status" = ANY (ARRAY['draft'::"text", 'in_editorial_review'::"text"])) AND ("partner_slug" IS NOT NULL) AND ("partner_slug" = "public"."content_current_partner_slug"()))));

CREATE POLICY "content_posts_select_content_team" ON "public"."content_posts" FOR SELECT TO "authenticated" USING ((("public"."content_current_role"() = ANY (ARRAY['primary_admin'::"text", 'editor'::"text", 'legal_reviewer'::"text", 'social_manager'::"text", 'contributor'::"text"])) OR (("public"."content_current_role"() = 'partner_contributor'::"text") AND ("partner_slug" IS NOT NULL) AND ("partner_slug" = "public"."content_current_partner_slug"())) OR (("public"."content_current_role"() = 'viewer'::"text") AND ("status" = ANY (ARRAY['published'::"text", 'updated'::"text"])) AND ("published_at" IS NOT NULL) AND ("published_at" <= "now"()))));

CREATE POLICY "content_posts_service_role_all" ON "public"."content_posts" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));

CREATE POLICY "content_posts_update_editors" ON "public"."content_posts" FOR UPDATE TO "authenticated" USING ("public"."content_can_edit_any"()) WITH CHECK ("public"."content_can_edit_any"());

CREATE POLICY "content_posts_update_own_draft" ON "public"."content_posts" FOR UPDATE TO "authenticated" USING (((("public"."content_current_role"() = 'contributor'::"text") AND ("created_by" = "auth"."uid"()) AND ("status" = ANY (ARRAY['draft'::"text", 'changes_requested'::"text"]))) OR (("public"."content_current_role"() = 'partner_contributor'::"text") AND ("partner_slug" IS NOT NULL) AND ("partner_slug" = "public"."content_current_partner_slug"()) AND ("status" = ANY (ARRAY['draft'::"text", 'changes_requested'::"text"]))))) WITH CHECK (((("public"."content_current_role"() = 'contributor'::"text") AND ("created_by" = "auth"."uid"()) AND ("status" = ANY (ARRAY['draft'::"text", 'in_editorial_review'::"text", 'changes_requested'::"text"]))) OR (("public"."content_current_role"() = 'partner_contributor'::"text") AND ("partner_slug" IS NOT NULL) AND ("partner_slug" = "public"."content_current_partner_slug"()) AND ("status" = ANY (ARRAY['draft'::"text", 'in_editorial_review'::"text", 'changes_requested'::"text"])))));

ALTER TABLE "public"."content_promotion_outbox" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_promotion_outbox_service_role_all" ON "public"."content_promotion_outbox" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));

ALTER TABLE "public"."content_publications" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_publications_select_team" ON "public"."content_publications" FOR SELECT TO "authenticated" USING ("public"."content_has_any_role"());

CREATE POLICY "content_publications_service_role_all" ON "public"."content_publications" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));

ALTER TABLE "public"."content_reviews" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_reviews_select_team" ON "public"."content_reviews" FOR SELECT TO "authenticated" USING ("public"."content_has_any_role"());

CREATE POLICY "content_reviews_service_role_all" ON "public"."content_reviews" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));

ALTER TABLE "public"."content_social_assets" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_social_assets_service_role_all" ON "public"."content_social_assets" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));

CREATE POLICY "content_social_assets_team" ON "public"."content_social_assets" TO "authenticated" USING (("public"."content_current_role"() = ANY (ARRAY['primary_admin'::"text", 'editor'::"text", 'social_manager'::"text"]))) WITH CHECK (("public"."content_current_role"() = ANY (ARRAY['primary_admin'::"text", 'editor'::"text", 'social_manager'::"text"])));

ALTER TABLE "public"."content_social_drafts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_social_drafts_service_role_all" ON "public"."content_social_drafts" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));

CREATE POLICY "content_social_drafts_team" ON "public"."content_social_drafts" TO "authenticated" USING (("public"."content_current_role"() = ANY (ARRAY['primary_admin'::"text", 'editor'::"text", 'social_manager'::"text"]))) WITH CHECK (("public"."content_current_role"() = ANY (ARRAY['primary_admin'::"text", 'editor'::"text", 'social_manager'::"text"])));

ALTER TABLE "public"."content_state_editorial" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_state_editorial_manage" ON "public"."content_state_editorial" TO "authenticated" USING ("public"."content_can_edit_any"()) WITH CHECK ("public"."content_can_edit_any"());

CREATE POLICY "content_state_editorial_select_team" ON "public"."content_state_editorial" FOR SELECT TO "authenticated" USING ("public"."content_has_any_role"());

CREATE POLICY "content_state_editorial_service_role_all" ON "public"."content_state_editorial" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));

ALTER TABLE "public"."content_tags" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_tags_manage" ON "public"."content_tags" TO "authenticated" USING ("public"."content_can_edit_any"()) WITH CHECK ("public"."content_can_edit_any"());

CREATE POLICY "content_tags_select_public" ON "public"."content_tags" FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "content_tags_service_role_all" ON "public"."content_tags" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));

ALTER TABLE "public"."content_testimonials" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_testimonials_manage" ON "public"."content_testimonials" TO "authenticated" USING ("public"."content_can_edit_any"()) WITH CHECK ("public"."content_can_edit_any"());

CREATE POLICY "content_testimonials_service_role_all" ON "public"."content_testimonials" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));

ALTER TABLE "public"."legalease_os_support_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legalease_os_support_items_internal_admin_all" ON "public"."legalease_os_support_items" USING ((EXISTS ( SELECT 1
   FROM "public"."partner_users" "pu"
  WHERE (("pu"."auth_user_id" = "auth"."uid"()) AND ("pu"."role" = ANY (ARRAY['internal_admin'::"text", 'support_reviewer'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."partner_users" "pu"
  WHERE (("pu"."auth_user_id" = "auth"."uid"()) AND ("pu"."role" = ANY (ARRAY['internal_admin'::"text", 'support_reviewer'::"text"]))))));

ALTER TABLE "public"."partner_assets" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_assets_select_internal_admin" ON "public"."partner_assets" FOR SELECT TO "authenticated" USING ("public"."is_internal_admin"());

CREATE POLICY "partner_assets_select_own_partner" ON "public"."partner_assets" FOR SELECT TO "authenticated" USING (("partner_slug" = "public"."current_partner_slug"()));

ALTER TABLE "public"."partner_billing_requests" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."partner_entitlement" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."partner_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_events_select_internal_admin" ON "public"."partner_events" FOR SELECT TO "authenticated" USING ("public"."is_internal_admin"());

CREATE POLICY "partner_events_select_own_partner" ON "public"."partner_events" FOR SELECT TO "authenticated" USING (("partner_slug" = "public"."current_partner_slug"()));

ALTER TABLE "public"."partner_metrics" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_metrics_select_internal_admin" ON "public"."partner_metrics" FOR SELECT TO "authenticated" USING ("public"."is_internal_admin"());

CREATE POLICY "partner_metrics_select_own_partner" ON "public"."partner_metrics" FOR SELECT TO "authenticated" USING (("partner_slug" = "public"."current_partner_slug"()));

ALTER TABLE "public"."partner_pilot_requests" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."partner_records" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_records_select_internal_admin" ON "public"."partner_records" FOR SELECT TO "authenticated" USING ("public"."is_internal_admin"());

CREATE POLICY "partner_records_select_own_partner" ON "public"."partner_records" FOR SELECT TO "authenticated" USING (("partner_slug" = "public"."current_partner_slug"()));

ALTER TABLE "public"."partner_users" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_users_select_own" ON "public"."partner_users" FOR SELECT TO "authenticated" USING (("auth_user_id" = "auth"."uid"()));

ALTER TABLE "public"."processed_stripe_events" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."rcap_briefcase_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rcap_briefcase_items_select_internal_admin" ON "public"."rcap_briefcase_items" FOR SELECT TO "authenticated" USING ("public"."is_internal_admin"());

CREATE POLICY "rcap_briefcase_items_select_own_partner" ON "public"."rcap_briefcase_items" FOR SELECT TO "authenticated" USING (("partner_slug" = "public"."current_partner_slug"()));

ALTER TABLE "public"."rcap_document_packet_inputs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rcap_document_packet_inputs_select_internal_admin" ON "public"."rcap_document_packet_inputs" FOR SELECT TO "authenticated" USING ("public"."is_internal_admin"());

CREATE POLICY "rcap_document_packet_inputs_select_own_partner" ON "public"."rcap_document_packet_inputs" FOR SELECT TO "authenticated" USING (("partner_slug" = "public"."current_partner_slug"()));

ALTER TABLE "public"."rcap_document_packets" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rcap_document_packets_select_internal_admin" ON "public"."rcap_document_packets" FOR SELECT TO "authenticated" USING ("public"."is_internal_admin"());

CREATE POLICY "rcap_document_packets_select_own_partner" ON "public"."rcap_document_packets" FOR SELECT TO "authenticated" USING (("partner_slug" = "public"."current_partner_slug"()));

ALTER TABLE "public"."rcap_intake_responses" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rcap_intake_responses_select_internal_admin" ON "public"."rcap_intake_responses" FOR SELECT TO "authenticated" USING ("public"."is_internal_admin"());

CREATE POLICY "rcap_intake_responses_select_own_partner" ON "public"."rcap_intake_responses" FOR SELECT TO "authenticated" USING (("partner_slug" = "public"."current_partner_slug"()));

ALTER TABLE "public"."rcap_intake_sessions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rcap_intake_sessions_select_internal_admin" ON "public"."rcap_intake_sessions" FOR SELECT TO "authenticated" USING ("public"."is_internal_admin"());

CREATE POLICY "rcap_intake_sessions_select_own_partner" ON "public"."rcap_intake_sessions" FOR SELECT TO "authenticated" USING (("partner_slug" = "public"."current_partner_slug"()));

ALTER TABLE "public"."rcap_persons" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."rcap_record_events" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."rcap_user_profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."request_rate_limit_buckets" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."screening_sessions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role can manage pending screening results" ON "public"."consumer_pending_screening_results" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));

CREATE POLICY "service role can manage web analytics events" ON "public"."web_analytics_events" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));

CREATE POLICY "service role can manage web analytics rollups" ON "public"."web_analytics_daily_rollups" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));

ALTER TABLE "public"."web_analytics_daily_rollups" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."web_analytics_events" ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

GRANT USAGE ON SCHEMA "public" TO "postgres";

GRANT USAGE ON SCHEMA "public" TO "anon";

GRANT USAGE ON SCHEMA "public" TO "authenticated";

GRANT USAGE ON SCHEMA "public" TO "service_role";

REVOKE ALL ON FUNCTION "public"."claim_rcap_screening_session"("p_partner_slug" "text", "p_jurisdiction" "text") FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."claim_rcap_screening_session"("p_partner_slug" "text", "p_jurisdiction" "text") TO "service_role";

REVOKE ALL ON FUNCTION "public"."consume_rcap_screening_session"("p_session_id" "uuid") FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."consume_rcap_screening_session"("p_session_id" "uuid") TO "service_role";

REVOKE ALL ON FUNCTION "public"."content_apply_legal_review"("p_post_id" "uuid", "p_decision" "text", "p_notes" "text") FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."content_apply_legal_review"("p_post_id" "uuid", "p_decision" "text", "p_notes" "text") TO "authenticated";

GRANT ALL ON FUNCTION "public"."content_apply_legal_review"("p_post_id" "uuid", "p_decision" "text", "p_notes" "text") TO "service_role";

REVOKE ALL ON FUNCTION "public"."content_can_edit_any"() FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."content_can_edit_any"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."content_can_edit_any"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."content_can_legal_approve"() FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."content_can_legal_approve"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."content_can_legal_approve"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."content_can_publish"() FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."content_can_publish"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."content_can_publish"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."content_current_partner_slug"() FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."content_current_partner_slug"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."content_current_partner_slug"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."content_current_role"() FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."content_current_role"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."content_current_role"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."content_enforce_publish_authority"() FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."content_enforce_publish_authority"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."content_has_any_role"() FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."content_has_any_role"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."content_has_any_role"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."content_media_is_public"("p_media_id" "uuid") FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."content_media_is_public"("p_media_id" "uuid") TO "anon";

GRANT ALL ON FUNCTION "public"."content_media_is_public"("p_media_id" "uuid") TO "authenticated";

GRANT ALL ON FUNCTION "public"."content_media_is_public"("p_media_id" "uuid") TO "service_role";

REVOKE ALL ON FUNCTION "public"."current_partner_role"() FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."current_partner_role"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."current_partner_role"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."current_partner_slug"() FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."current_partner_slug"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."current_partner_slug"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."increment_request_rate_limit_bucket"("p_scope" "text", "p_bucket_key" "text", "p_window_start" timestamp with time zone, "p_window_seconds" integer, "p_limit" integer) FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."increment_request_rate_limit_bucket"("p_scope" "text", "p_bucket_key" "text", "p_window_start" timestamp with time zone, "p_window_seconds" integer, "p_limit" integer) TO "service_role";

REVOKE ALL ON FUNCTION "public"."is_internal_admin"() FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."is_internal_admin"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."is_internal_admin"() TO "service_role";

GRANT ALL ON FUNCTION "public"."prevent_rcap_record_events_mutation"() TO "anon";

GRANT ALL ON FUNCTION "public"."prevent_rcap_record_events_mutation"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."prevent_rcap_record_events_mutation"() TO "service_role";

GRANT ALL ON FUNCTION "public"."rcap_partner_person_outcome_counts"("input_partner_slug" "text") TO "anon";

GRANT ALL ON FUNCTION "public"."rcap_partner_person_outcome_counts"("input_partner_slug" "text") TO "authenticated";

GRANT ALL ON FUNCTION "public"."rcap_partner_person_outcome_counts"("input_partner_slug" "text") TO "service_role";

REVOKE ALL ON FUNCTION "public"."rcap_screening_session_is_release_expired"("p_status" "text", "p_created_at" timestamp with time zone, "p_resume_token_expires_at" timestamp with time zone, "p_now" timestamp with time zone) FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."rcap_screening_session_is_release_expired"("p_status" "text", "p_created_at" timestamp with time zone, "p_resume_token_expires_at" timestamp with time zone, "p_now" timestamp with time zone) TO "service_role";

REVOKE ALL ON FUNCTION "public"."recompute_rcap_partner_entitlements"("p_partner_slug" "text", "p_now" timestamp with time zone) FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."recompute_rcap_partner_entitlements"("p_partner_slug" "text", "p_now" timestamp with time zone) TO "service_role";

REVOKE ALL ON FUNCTION "public"."record_rcap_partner_packet_generation"("p_session_id" "uuid") FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."record_rcap_partner_packet_generation"("p_session_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."reject_content_audit_mutation"() TO "anon";

GRANT ALL ON FUNCTION "public"."reject_content_audit_mutation"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."reject_content_audit_mutation"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."release_expired_rcap_screening_slots"("p_now" timestamp with time zone) FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."release_expired_rcap_screening_slots"("p_now" timestamp with time zone) TO "service_role";

GRANT ALL ON FUNCTION "public"."set_content_admin_users_updated_at"() TO "anon";

GRANT ALL ON FUNCTION "public"."set_content_admin_users_updated_at"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."set_content_admin_users_updated_at"() TO "service_role";

GRANT ALL ON FUNCTION "public"."set_content_authors_updated_at"() TO "anon";

GRANT ALL ON FUNCTION "public"."set_content_authors_updated_at"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."set_content_authors_updated_at"() TO "service_role";

GRANT ALL ON FUNCTION "public"."set_content_campaigns_updated_at"() TO "anon";

GRANT ALL ON FUNCTION "public"."set_content_campaigns_updated_at"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."set_content_campaigns_updated_at"() TO "service_role";

GRANT ALL ON FUNCTION "public"."set_content_media_updated_at"() TO "anon";

GRANT ALL ON FUNCTION "public"."set_content_media_updated_at"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."set_content_media_updated_at"() TO "service_role";

GRANT ALL ON FUNCTION "public"."set_content_posts_updated_at"() TO "anon";

GRANT ALL ON FUNCTION "public"."set_content_posts_updated_at"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."set_content_posts_updated_at"() TO "service_role";

GRANT ALL ON FUNCTION "public"."set_content_promotion_outbox_updated_at"() TO "anon";

GRANT ALL ON FUNCTION "public"."set_content_promotion_outbox_updated_at"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."set_content_promotion_outbox_updated_at"() TO "service_role";

GRANT ALL ON FUNCTION "public"."set_content_social_drafts_updated_at"() TO "anon";

GRANT ALL ON FUNCTION "public"."set_content_social_drafts_updated_at"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."set_content_social_drafts_updated_at"() TO "service_role";

GRANT ALL ON FUNCTION "public"."set_content_state_editorial_updated_at"() TO "anon";

GRANT ALL ON FUNCTION "public"."set_content_state_editorial_updated_at"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."set_content_state_editorial_updated_at"() TO "service_role";

GRANT ALL ON FUNCTION "public"."set_content_testimonials_updated_at"() TO "anon";

GRANT ALL ON FUNCTION "public"."set_content_testimonials_updated_at"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."set_content_testimonials_updated_at"() TO "service_role";

GRANT ALL ON FUNCTION "public"."set_partner_entitlement_updated_at"() TO "anon";

GRANT ALL ON FUNCTION "public"."set_partner_entitlement_updated_at"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."set_partner_entitlement_updated_at"() TO "service_role";

GRANT ALL ON FUNCTION "public"."set_partner_users_updated_at"() TO "anon";

GRANT ALL ON FUNCTION "public"."set_partner_users_updated_at"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."set_partner_users_updated_at"() TO "service_role";

GRANT ALL ON FUNCTION "public"."set_rcap_document_packets_updated_at"() TO "anon";

GRANT ALL ON FUNCTION "public"."set_rcap_document_packets_updated_at"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."set_rcap_document_packets_updated_at"() TO "service_role";

GRANT ALL ON FUNCTION "public"."write_rcap_document_packet_relief_outcome_event"() TO "anon";

GRANT ALL ON FUNCTION "public"."write_rcap_document_packet_relief_outcome_event"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."write_rcap_document_packet_relief_outcome_event"() TO "service_role";

GRANT ALL ON TABLE "public"."consumer_briefcase_items" TO "anon";

GRANT ALL ON TABLE "public"."consumer_briefcase_items" TO "authenticated";

GRANT ALL ON TABLE "public"."consumer_briefcase_items" TO "service_role";

GRANT ALL ON TABLE "public"."consumer_pending_screening_results" TO "anon";

GRANT ALL ON TABLE "public"."consumer_pending_screening_results" TO "authenticated";

GRANT ALL ON TABLE "public"."consumer_pending_screening_results" TO "service_role";

GRANT ALL ON TABLE "public"."consumer_wilma_telemetry" TO "anon";

GRANT ALL ON TABLE "public"."consumer_wilma_telemetry" TO "authenticated";

GRANT ALL ON TABLE "public"."consumer_wilma_telemetry" TO "service_role";

GRANT ALL ON TABLE "public"."content_admin_users" TO "authenticated";

GRANT ALL ON TABLE "public"."content_admin_users" TO "service_role";

GRANT ALL ON TABLE "public"."content_audit_events" TO "authenticated";

GRANT SELECT,INSERT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."content_audit_events" TO "service_role";

GRANT ALL ON TABLE "public"."content_authors" TO "authenticated";

GRANT ALL ON TABLE "public"."content_authors" TO "service_role";

GRANT ALL ON TABLE "public"."content_campaign_channels" TO "authenticated";

GRANT ALL ON TABLE "public"."content_campaign_channels" TO "service_role";

GRANT ALL ON TABLE "public"."content_campaigns" TO "authenticated";

GRANT ALL ON TABLE "public"."content_campaigns" TO "service_role";

GRANT ALL ON TABLE "public"."content_categories" TO "anon";

GRANT ALL ON TABLE "public"."content_categories" TO "authenticated";

GRANT ALL ON TABLE "public"."content_categories" TO "service_role";

GRANT ALL ON TABLE "public"."content_media" TO "authenticated";

GRANT ALL ON TABLE "public"."content_media" TO "service_role";

GRANT ALL ON TABLE "public"."content_media_usages" TO "authenticated";

GRANT ALL ON TABLE "public"."content_media_usages" TO "service_role";

GRANT ALL ON TABLE "public"."content_post_tags" TO "authenticated";

GRANT ALL ON TABLE "public"."content_post_tags" TO "service_role";

GRANT ALL ON TABLE "public"."content_post_versions" TO "authenticated";

GRANT ALL ON TABLE "public"."content_post_versions" TO "service_role";

GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."content_posts" TO "authenticated";

GRANT ALL ON TABLE "public"."content_posts" TO "service_role";

GRANT INSERT("slug"),UPDATE("slug") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("destination"),UPDATE("destination") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("content_type"),UPDATE("content_type") ON TABLE "public"."content_posts" TO "authenticated";

GRANT UPDATE("status") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("locale"),UPDATE("locale") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("title"),UPDATE("title") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("subtitle"),UPDATE("subtitle") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("excerpt"),UPDATE("excerpt") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("doc"),UPDATE("doc") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("rendered_html"),UPDATE("rendered_html") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("search_text"),UPDATE("search_text") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("reading_minutes"),UPDATE("reading_minutes") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("category_id"),UPDATE("category_id") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("author_id"),UPDATE("author_id") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("featured_media_id"),UPDATE("featured_media_id") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("partner_slug"),UPDATE("partner_slug") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("jurisdiction_code"),UPDATE("jurisdiction_code") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("legal_sensitive"),UPDATE("legal_sensitive") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("seo_title"),UPDATE("seo_title") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("seo_description"),UPDATE("seo_description") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("canonical_url"),UPDATE("canonical_url") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("og_title"),UPDATE("og_title") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("og_description"),UPDATE("og_description") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("og_media_id"),UPDATE("og_media_id") ON TABLE "public"."content_posts" TO "authenticated";

GRANT INSERT("version"),UPDATE("version") ON TABLE "public"."content_posts" TO "authenticated";

GRANT UPDATE("published_at") ON TABLE "public"."content_posts" TO "authenticated";

GRANT UPDATE("scheduled_for") ON TABLE "public"."content_posts" TO "authenticated";

GRANT UPDATE("first_published_at") ON TABLE "public"."content_posts" TO "authenticated";

GRANT ALL ON TABLE "public"."content_promotion_outbox" TO "authenticated";

GRANT ALL ON TABLE "public"."content_promotion_outbox" TO "service_role";

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."content_public_authors" TO "anon";

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."content_public_authors" TO "authenticated";

GRANT ALL ON TABLE "public"."content_public_authors" TO "service_role";

GRANT ALL ON TABLE "public"."content_state_editorial" TO "authenticated";

GRANT ALL ON TABLE "public"."content_state_editorial" TO "service_role";

GRANT ALL ON TABLE "public"."content_testimonials" TO "authenticated";

GRANT ALL ON TABLE "public"."content_testimonials" TO "service_role";

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."content_public_media" TO "anon";

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."content_public_media" TO "authenticated";

GRANT ALL ON TABLE "public"."content_public_media" TO "service_role";

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."content_public_posts" TO "anon";

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."content_public_posts" TO "authenticated";

GRANT ALL ON TABLE "public"."content_public_posts" TO "service_role";

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."content_public_state_editorial" TO "anon";

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."content_public_state_editorial" TO "authenticated";

GRANT ALL ON TABLE "public"."content_public_state_editorial" TO "service_role";

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."content_public_testimonials" TO "anon";

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."content_public_testimonials" TO "authenticated";

GRANT ALL ON TABLE "public"."content_public_testimonials" TO "service_role";

GRANT ALL ON TABLE "public"."content_publications" TO "authenticated";

GRANT ALL ON TABLE "public"."content_publications" TO "service_role";

GRANT ALL ON TABLE "public"."content_reviews" TO "service_role";

GRANT SELECT ON TABLE "public"."content_reviews" TO "authenticated";

GRANT ALL ON TABLE "public"."content_social_assets" TO "authenticated";

GRANT ALL ON TABLE "public"."content_social_assets" TO "service_role";

GRANT ALL ON TABLE "public"."content_social_drafts" TO "authenticated";

GRANT ALL ON TABLE "public"."content_social_drafts" TO "service_role";

GRANT ALL ON TABLE "public"."content_tags" TO "anon";

GRANT ALL ON TABLE "public"."content_tags" TO "authenticated";

GRANT ALL ON TABLE "public"."content_tags" TO "service_role";

GRANT ALL ON TABLE "public"."legalease_os_support_items" TO "anon";

GRANT ALL ON TABLE "public"."legalease_os_support_items" TO "authenticated";

GRANT ALL ON TABLE "public"."legalease_os_support_items" TO "service_role";

GRANT ALL ON TABLE "public"."partner_assets" TO "anon";

GRANT ALL ON TABLE "public"."partner_assets" TO "authenticated";

GRANT ALL ON TABLE "public"."partner_assets" TO "service_role";

GRANT ALL ON TABLE "public"."partner_billing_requests" TO "anon";

GRANT ALL ON TABLE "public"."partner_billing_requests" TO "authenticated";

GRANT ALL ON TABLE "public"."partner_billing_requests" TO "service_role";

GRANT ALL ON TABLE "public"."partner_entitlement" TO "anon";

GRANT ALL ON TABLE "public"."partner_entitlement" TO "authenticated";

GRANT ALL ON TABLE "public"."partner_entitlement" TO "service_role";

GRANT ALL ON TABLE "public"."partner_events" TO "anon";

GRANT ALL ON TABLE "public"."partner_events" TO "authenticated";

GRANT ALL ON TABLE "public"."partner_events" TO "service_role";

GRANT ALL ON TABLE "public"."partner_metrics" TO "anon";

GRANT ALL ON TABLE "public"."partner_metrics" TO "authenticated";

GRANT ALL ON TABLE "public"."partner_metrics" TO "service_role";

GRANT ALL ON TABLE "public"."partner_pilot_requests" TO "anon";

GRANT ALL ON TABLE "public"."partner_pilot_requests" TO "authenticated";

GRANT ALL ON TABLE "public"."partner_pilot_requests" TO "service_role";

GRANT ALL ON TABLE "public"."partner_records" TO "anon";

GRANT ALL ON TABLE "public"."partner_records" TO "authenticated";

GRANT ALL ON TABLE "public"."partner_records" TO "service_role";

GRANT ALL ON TABLE "public"."partner_users" TO "anon";

GRANT ALL ON TABLE "public"."partner_users" TO "authenticated";

GRANT ALL ON TABLE "public"."partner_users" TO "service_role";

GRANT ALL ON TABLE "public"."processed_stripe_events" TO "anon";

GRANT ALL ON TABLE "public"."processed_stripe_events" TO "authenticated";

GRANT ALL ON TABLE "public"."processed_stripe_events" TO "service_role";

GRANT ALL ON TABLE "public"."rcap_briefcase_items" TO "anon";

GRANT ALL ON TABLE "public"."rcap_briefcase_items" TO "authenticated";

GRANT ALL ON TABLE "public"."rcap_briefcase_items" TO "service_role";

GRANT ALL ON TABLE "public"."rcap_document_packet_inputs" TO "anon";

GRANT ALL ON TABLE "public"."rcap_document_packet_inputs" TO "authenticated";

GRANT ALL ON TABLE "public"."rcap_document_packet_inputs" TO "service_role";

GRANT ALL ON TABLE "public"."rcap_document_packets" TO "anon";

GRANT ALL ON TABLE "public"."rcap_document_packets" TO "authenticated";

GRANT ALL ON TABLE "public"."rcap_document_packets" TO "service_role";

GRANT ALL ON TABLE "public"."rcap_intake_responses" TO "anon";

GRANT ALL ON TABLE "public"."rcap_intake_responses" TO "authenticated";

GRANT ALL ON TABLE "public"."rcap_intake_responses" TO "service_role";

GRANT ALL ON TABLE "public"."rcap_intake_sessions" TO "anon";

GRANT ALL ON TABLE "public"."rcap_intake_sessions" TO "authenticated";

GRANT ALL ON TABLE "public"."rcap_intake_sessions" TO "service_role";

GRANT ALL ON TABLE "public"."rcap_persons" TO "anon";

GRANT ALL ON TABLE "public"."rcap_persons" TO "authenticated";

GRANT ALL ON TABLE "public"."rcap_persons" TO "service_role";

GRANT ALL ON TABLE "public"."rcap_record_events" TO "service_role";

GRANT ALL ON TABLE "public"."rcap_user_profiles" TO "anon";

GRANT ALL ON TABLE "public"."rcap_user_profiles" TO "authenticated";

GRANT ALL ON TABLE "public"."rcap_user_profiles" TO "service_role";

GRANT ALL ON TABLE "public"."request_rate_limit_buckets" TO "anon";

GRANT ALL ON TABLE "public"."request_rate_limit_buckets" TO "authenticated";

GRANT ALL ON TABLE "public"."request_rate_limit_buckets" TO "service_role";

GRANT ALL ON TABLE "public"."screening_sessions" TO "anon";

GRANT ALL ON TABLE "public"."screening_sessions" TO "authenticated";

GRANT ALL ON TABLE "public"."screening_sessions" TO "service_role";

GRANT ALL ON TABLE "public"."web_analytics_daily_rollups" TO "anon";

GRANT ALL ON TABLE "public"."web_analytics_daily_rollups" TO "authenticated";

GRANT ALL ON TABLE "public"."web_analytics_daily_rollups" TO "service_role";

GRANT ALL ON TABLE "public"."web_analytics_events" TO "anon";

GRANT ALL ON TABLE "public"."web_analytics_events" TO "authenticated";

GRANT ALL ON TABLE "public"."web_analytics_events" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
