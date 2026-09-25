-- Forward correction: screening correlation is not canonical consumer matter identity.
-- Preserve claim/owner predicates, digest contracts, signature and existing grants.
-- No participant rows, pending results or verification receipts are rewritten.
begin;

create or replace function public.get_consumer_briefcase_presentation_source(
  p_consumer_auth_user_id uuid,
  p_briefcase_item_id uuid
)
returns table (
  consumer_auth_user_id uuid,
  briefcase_item_id uuid,
  claimed_user_id uuid,
  claimed_at text,
  source_identity text,
  product text,
  partner_benefit_active boolean,
  partner_slug text,
  jurisdiction text,
  profile_version text,
  matter_id text,
  screening_answers jsonb,
  screening_answers_sha256 text,
  source_linkage_sha256 text
)
language sql
stable
security definer
set search_path = ''
as $source$
  with trusted as (
    select
      i.user_id as consumer_auth_user_id,
      i.id as briefcase_item_id,
      p.claimed_user_id,
      p.claimed_at,
      coalesce(p.anonymous_session_id::text, p.pending_id::text) as source_identity,
      p.product,
      (p.product = 'rcap_partner' and p.partner_slug is not null) as partner_benefit_active,
      p.partner_slug,
      p.jurisdiction,
      p.profile_version,
      public.consumer_matter_id_for_briefcase_item(i.id)::text as matter_id,
      p.screening_answers,
      encode(extensions.digest(convert_to(public.consumer_canonical_json(p.screening_answers), 'utf8'), 'sha256'), 'hex') as answers_hash
    from public.consumer_briefcase_items i
    join public.consumer_pending_screening_results p
      on p.pending_id = i.source_pending_result_id
    where i.id = p_briefcase_item_id
      and i.user_id = p_consumer_auth_user_id
      and p.status = 'CLAIMED'
      and p.claimed_user_id = p_consumer_auth_user_id
      and p.claimed_matter_id = i.id
  )
  select t.consumer_auth_user_id, t.briefcase_item_id, t.claimed_user_id,
    t.claimed_at::text, t.source_identity, t.product, t.partner_benefit_active,
    t.partner_slug, t.jurisdiction, t.profile_version, t.matter_id,
    t.screening_answers, t.answers_hash,
    encode(extensions.digest(convert_to(public.consumer_canonical_json(jsonb_build_object(
      'consumerAuthUserId', t.consumer_auth_user_id::text,
      'briefcaseItemId', t.briefcase_item_id::text,
      'matterId', t.matter_id,
      'sourceIdentity', t.source_identity,
      'claimedAt', t.claimed_at::text,
      'screeningAnswersSha256', t.answers_hash,
      'product', t.product,
      'partnerBenefitActive', t.partner_benefit_active,
      'partnerSlug', t.partner_slug
    )), 'utf8'), 'sha256'), 'hex')
  from trusted t;
$source$;

commit;
