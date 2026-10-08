-- RCAP: a launch agreement is signed only after an internal administrator
-- reviews an executed partner agreement and its actual private document.
-- New additive migration; never backfill legacy "approved" as "signed".
begin;

create table public.rcap_signed_agreement_receipts (
  id uuid primary key,
  workspace_id uuid not null references public.partner_onboarding(id),
  partner_slug text not null,
  actor_auth_user_id uuid not null references auth.users(id),
  agreement_type text not null check (agreement_type in ('order_form','master_services_agreement')),
  asset_id uuid not null references public.partner_onboarding_assets(id),
  asset_sha256 text not null check(asset_sha256 ~ '^[a-f0-9]{64}$'),
  effective_date date not null,
  reviewed_reason text not null check(length(btrim(reviewed_reason)) between 10 and 5000),
  workspace_version bigint not null,
  created_at timestamptz not null default now()
);
create index rcap_signed_agreement_workspace_latest
  on public.rcap_signed_agreement_receipts(workspace_id,created_at desc);
alter table public.rcap_signed_agreement_receipts enable row level security;
revoke all on public.rcap_signed_agreement_receipts from public,anon,authenticated,service_role;
grant select,insert on public.rcap_signed_agreement_receipts to service_role;
create trigger rcap_signed_agreement_immutable before update or delete
  on public.rcap_signed_agreement_receipts for each row
  execute function public.rcap_refuse_audit_rewrite();

-- This operation records a reviewed fact, never creates partner consent or
-- payment authority. Asset metadata, normalized agreement and the legacy
-- launch gate change in the same database transaction.
create function public.rcap_service_record_signed_agreement(
  p_slug text, p_actor uuid, p_expected_version bigint, p_request uuid,
  p_agreement_type text, p_asset uuid, p_new_asset boolean,
  p_object_path text, p_filename text, p_media_type text,
  p_extension text, p_byte_size bigint, p_sha256 text,
  p_effective_date date, p_review_reason text, p_confirmed boolean
) returns table(workspace_version bigint, document_id uuid, duplicate boolean)
language plpgsql security invoker set search_path='' as $$
declare
  w public.partner_onboarding%rowtype;
  prior public.rcap_signed_agreement_receipts%rowtype;
  doc public.partner_onboarding_assets%rowtype;
  previous_doc public.partner_onboarding_assets%rowtype;
begin
  perform public.rcap_service_assert_internal_actor(p_actor);
  if not p_confirmed or p_agreement_type not in ('order_form','master_services_agreement')
     or p_effective_date is null or p_effective_date>current_date
     or length(btrim(coalesce(p_review_reason,''))) not between 10 and 5000
     or p_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'A reviewed, executed agreement and signed document are required' using errcode='22023';
  end if;

  select * into strict w from public.partner_onboarding
    where partner_slug=p_slug for update;
  select * into prior from public.rcap_signed_agreement_receipts where id=p_request;
  if found then
    if prior.workspace_id<>w.id or prior.partner_slug<>p_slug
       or prior.actor_auth_user_id<>p_actor or prior.agreement_type<>p_agreement_type
       or prior.asset_id<>p_asset or prior.asset_sha256<>p_sha256
       or prior.effective_date<>p_effective_date
       or prior.reviewed_reason<>btrim(p_review_reason) then
       raise exception 'Executed agreement request was reused with different inputs' using errcode='23505';
    end if;
    return query select prior.workspace_version,prior.asset_id,true;
    return;
  end if;

  if w.aggregate_version<>p_expected_version
     or w.status in ('live','paused','closed')
     or w.commercial_gate_status='blocked' then
    raise exception 'Current unpublished agreement workspace required' using errcode='40001';
  end if;

  if p_new_asset then
    if p_asset<>p_request or p_media_type not in (
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) or (p_media_type='application/pdf' and p_extension<>'pdf')
       or (p_media_type<>'application/pdf' and p_extension<>'docx')
       or p_byte_size<1 or p_byte_size>20971520
       or length(p_filename) not between 1 and 240
       or p_object_path<>('partners/'||w.partner_record_id::text||
       '/onboarding/'||w.id::text||'/procurement_document/'||p_asset::text||'.'||p_extension)
    then raise exception 'Signed file identity or document type is invalid' using errcode='22023';
    end if;
    select * into previous_doc from public.partner_onboarding_assets
      where workspace_id=w.id and category='procurement_document'
        and lifecycle_status in ('active','pending_review') and deleted_at is null for update;
    if found then
      if exists (select 1 from public.partner_onboarding_agreements a
        where a.finalized_asset_id=previous_doc.id) then
        raise exception 'Existing finalized procurement document must be reviewed before replacement' using errcode='55000';
      end if;
      update public.partner_onboarding_assets set lifecycle_status='superseded',
        updated_at=now() where id=previous_doc.id;
    end if;
    insert into public.partner_onboarding_assets(
      id,workspace_id,partner_record_id,category,object_path,original_filename,
      safe_filename,media_type,file_extension,byte_size,sha256_hex,
      lifecycle_status,review_status,review_reason,uploaded_by
    ) values(
      p_asset,w.id,w.partner_record_id,'procurement_document',p_object_path,
      p_filename,'signed-agreement.'||p_extension,p_media_type,p_extension,
      p_byte_size,p_sha256,'active','approved',
      'Executed signed agreement inspected and certified by Platform Admin',p_actor
    );
  end if;

  select * into doc from public.partner_onboarding_assets
    where id=p_asset and workspace_id=w.id
      and category='procurement_document' and deleted_at is null
      and lifecycle_status='active' and review_status='approved'
      and sha256_hex=p_sha256 for update;
  if not found then
    raise exception 'An active, approved, matching signed agreement document is required' using errcode='55000';
  end if;

  insert into public.partner_onboarding_agreements(
    workspace_id,agreement_type,status,is_required,partner_safe_detail,
    finalized_asset_id,effective_date,recorded_by,recorded_at
  ) values(
    w.id,p_agreement_type,'executed',true,
    'Executed agreement verified by LegalEase',doc.id,
    p_effective_date,p_actor,now()
  ) on conflict(workspace_id,agreement_type) do update set
    status='executed',is_required=true,
    finalized_asset_id=excluded.finalized_asset_id,
    effective_date=excluded.effective_date,
    recorded_by=excluded.recorded_by,recorded_at=excluded.recorded_at;

  update public.partner_onboarding set agreement_status='signed',
    agreement_date=p_effective_date,aggregate_version=aggregate_version+1,
    last_meaningful_activity_at=now()
    where id=w.id returning aggregate_version into workspace_version;

  insert into public.rcap_signed_agreement_receipts(
    id,workspace_id,partner_slug,actor_auth_user_id,agreement_type,asset_id,
    asset_sha256,effective_date,reviewed_reason,workspace_version
  ) values(p_request,w.id,p_slug,p_actor,p_agreement_type,doc.id,
    p_sha256,p_effective_date,btrim(p_review_reason),workspace_version);

  update public.partner_onboarding_launch_checks set
    invalidated_at=now(),invalidated_reason='Executed agreement changed'
    where workspace_id=w.id and invalidated_at is null;
  update public.partner_onboarding_launch_approvals set
    invalidated_at=now() where workspace_id=w.id and invalidated_at is null;

  document_id:=doc.id;
  duplicate:=false;
  return next;
end $$;
revoke all on function public.rcap_service_record_signed_agreement(
 text,uuid,bigint,uuid,text,uuid,boolean,text,text,text,text,bigint,text,date,text,boolean
) from public,anon,authenticated;
grant execute on function public.rcap_service_record_signed_agreement(
 text,uuid,bigint,uuid,text,uuid,boolean,text,text,text,text,bigint,text,date,text,boolean
) to service_role;

-- Existing publication still has to meet the old signed gate and every
-- commercial/consent condition. New real launches additionally require the
-- corresponding immutable reviewed-file receipt, not just a legacy checkbox.
create function public.rcap_require_documented_real_agreement()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.rcap_launch_operation_id is not null
      and new.status='live' and new.landing_page_ready then
    if not exists(
      select 1 from public.rcap_signed_agreement_receipts proof
      join public.partner_onboarding_agreements a
        on a.workspace_id=proof.workspace_id and a.agreement_type=proof.agreement_type
       and a.status='executed' and a.finalized_asset_id=proof.asset_id
       and a.effective_date=proof.effective_date
      join public.partner_onboarding_assets d on d.id=proof.asset_id
       and d.workspace_id=proof.workspace_id and d.category='procurement_document'
       and d.review_status='approved' and d.lifecycle_status='active'
       and d.deleted_at is null and d.sha256_hex=proof.asset_sha256
      where proof.workspace_id=new.id and proof.partner_slug=new.partner_slug
        and proof.effective_date<=current_date and new.agreement_status='signed'
    ) then
       raise exception 'An audited executed agreement and signed document are required for real launch' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
create trigger rcap_require_signed_real_launch
  before update of status,landing_page_ready,rcap_launch_operation_id on public.partner_onboarding
  for each row execute function public.rcap_require_documented_real_agreement();
revoke all on function public.rcap_require_documented_real_agreement() from public,anon,authenticated;
grant execute on function public.rcap_require_documented_real_agreement() to service_role;

commit;
