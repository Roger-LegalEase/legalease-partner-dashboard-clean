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
  previous_agreement jsonb,
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

-- The existing safe agreement projection carries only the proof reference, never
-- internal audit notes. The receipt itself remains service-only.
alter table public.partner_onboarding_agreements add column signed_receipt_id uuid
  references public.rcap_signed_agreement_receipts(id);
alter table public.partner_onboarding_agreements add column signed_asset_sha256 text;
create or replace view public.partner_onboarding_agreements_safe
with (security_barrier = true, security_invoker = true) as
select a.id,a.workspace_id,a.agreement_type,a.status,a.is_required,
  a.partner_safe_detail,a.finalized_asset_id,a.effective_date,a.recorded_at,
  a.created_at,a.updated_at,a.signed_receipt_id,a.signed_asset_sha256
from public.partner_onboarding_agreements a;

-- Match the safe view's two new columns to the existing column-level,
-- tenant-RLS SELECT contract. Audit notes and private object paths stay withheld.
grant select (signed_receipt_id,signed_asset_sha256)
  on public.partner_onboarding_agreements to authenticated;

-- Editing ordinary agreement metadata cannot manufacture or retain a proof
-- when the executed document, type or date has changed.
create function public.rcap_validate_signed_agreement_reference()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.signed_receipt_id is not null and not exists (
    select 1 from public.rcap_signed_agreement_receipts r
    join public.partner_onboarding_assets d on d.id=r.asset_id
      and d.workspace_id=r.workspace_id and d.sha256_hex=r.asset_sha256
      and d.lifecycle_status='active' and d.review_status='approved' and d.deleted_at is null
    where r.id=new.signed_receipt_id and r.workspace_id=new.workspace_id
      and r.agreement_type=new.agreement_type and r.asset_id=new.finalized_asset_id
      and r.effective_date=new.effective_date and r.asset_sha256=new.signed_asset_sha256
      and new.status='executed'
  ) then new.signed_receipt_id:=null; new.signed_asset_sha256:=null; end if;
  return new;
end $$;
create trigger rcap_signed_reference_current before insert or update
 on public.partner_onboarding_agreements for each row
 execute function public.rcap_validate_signed_agreement_reference();
revoke all on function public.rcap_validate_signed_agreement_reference() from public,anon,authenticated;
grant execute on function public.rcap_validate_signed_agreement_reference() to service_role;

-- A changed executed agreement clears the legacy signed gate only for this
-- workspace. Unrelated agreement types and operational checks are preserved.
create function public.rcap_clear_withdrawn_signed_agreement()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='UPDATE' and old.signed_receipt_id is not null and new.signed_receipt_id is null then
    perform set_config('rcap.agreement_projection', 'withdraw:'||new.workspace_id::text,true);
    update public.partner_onboarding set agreement_status='sent'
      where id=new.workspace_id and agreement_status='signed'
      and not exists(select 1 from public.partner_onboarding_agreements a
        where a.workspace_id=new.workspace_id and a.signed_receipt_id is not null
          and a.status='executed');
    perform set_config('rcap.agreement_projection','',true);
  end if;
  if (tg_op='INSERT' and new.is_required) or (tg_op='UPDATE' and
    (old.status,old.finalized_asset_id,old.effective_date,old.is_required)
    is distinct from (new.status,new.finalized_asset_id,new.effective_date,new.is_required)
    and (old.is_required or new.is_required or old.signed_receipt_id is not null)) then
    update public.partner_onboarding_launch_checks set invalidated_at=now(),
      invalidated_reason='Executed agreement evidence withdrawn'
      where workspace_id=new.workspace_id and invalidated_at is null
        and check_key in ('legalease_final_review_complete','partner_launch_approval_received');
    update public.partner_onboarding_launch_approvals set invalidated_at=now()
      where workspace_id=new.workspace_id and invalidated_at is null;
  end if;
  return new;
end $$;
create trigger rcap_signed_reference_withdrawn after insert or update
 on public.partner_onboarding_agreements for each row
 execute function public.rcap_clear_withdrawn_signed_agreement();
revoke all on function public.rcap_clear_withdrawn_signed_agreement() from public,anon,authenticated;
grant execute on function public.rcap_clear_withdrawn_signed_agreement() to service_role;

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
  previous_agreement jsonb;
  contract_changed boolean;
begin
  perform public.rcap_service_assert_internal_actor(p_actor);
  if p_confirmed is distinct from true or p_new_asset is null
     or p_request is null or p_asset is null or p_agreement_type is null
     or p_sha256 is null or p_agreement_type not in ('order_form','master_services_agreement')
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
       or (not p_new_asset and prior.asset_id is distinct from p_asset)
       or prior.asset_sha256<>p_sha256
       or prior.effective_date<>p_effective_date
       or prior.reviewed_reason<>btrim(p_review_reason) then
       raise exception 'Executed agreement request was reused with different inputs' using errcode='23505';
    end if;
    return query select prior.workspace_version,prior.asset_id,true;
    return;
  end if;

  if w.aggregate_version is distinct from p_expected_version
     or w.status in ('live','paused','closed')
     or w.commercial_gate_status='blocked' then
    -- A stale user snapshot is not a retryable database serialization failure.
    raise exception 'Current unpublished agreement workspace required' using errcode='55000';
  end if;

  if p_new_asset then
    if not exists(select 1 from storage.objects o join storage.buckets b on b.id=o.bucket_id
      where o.bucket_id='rcap-partner-onboarding-private' and o.name=p_object_path and b.public=false) then
      raise exception 'Executed copy is absent from private storage' using errcode='55000';
    end if;
    if p_media_type is null or p_extension is null
       or p_object_path is null or p_filename is null or p_byte_size is null
       or p_media_type not in (
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
      -- Retain the original object and agreement evidence; only its current
      -- procurement slot is superseded by this executed copy.
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
  if doc.media_type not in ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document')
     or not exists(select 1 from storage.objects o join storage.buckets b on b.id=o.bucket_id
       where o.bucket_id=doc.bucket_id and o.name=doc.object_path
         and b.id='rcap-partner-onboarding-private' and b.public=false) then
    raise exception 'The executed document must exist in private storage' using errcode='55000';
  end if;

  select to_jsonb(a) into previous_agreement from public.partner_onboarding_agreements a
    where a.workspace_id=w.id and a.agreement_type=p_agreement_type;
  contract_changed := previous_agreement is null
    or previous_agreement->>'status' is distinct from 'executed'
    or previous_agreement->>'finalized_asset_id' is distinct from doc.id::text
    or previous_agreement->>'effective_date' is distinct from p_effective_date::text
    or previous_agreement->>'signed_asset_sha256' is distinct from p_sha256
    or previous_agreement->>'signed_receipt_id' is null;
  insert into public.rcap_signed_agreement_receipts(
    id,workspace_id,partner_slug,actor_auth_user_id,agreement_type,asset_id,
    asset_sha256,effective_date,reviewed_reason,workspace_version,previous_agreement
  ) values(p_request,w.id,p_slug,p_actor,p_agreement_type,doc.id,
    p_sha256,p_effective_date,btrim(p_review_reason),w.aggregate_version+1,previous_agreement);

  insert into public.partner_onboarding_agreements(
    workspace_id,agreement_type,status,is_required,partner_safe_detail,
    finalized_asset_id,effective_date,recorded_by,recorded_at,signed_receipt_id,signed_asset_sha256
  ) values(
    w.id,p_agreement_type,'executed',true,
    'Executed agreement verified by LegalEase',doc.id,
    p_effective_date,p_actor,now(),p_request,p_sha256
  ) on conflict(workspace_id,agreement_type) do update set
    status='executed',is_required=true,partner_safe_detail=excluded.partner_safe_detail,
    finalized_asset_id=excluded.finalized_asset_id,
    effective_date=excluded.effective_date,
    recorded_by=excluded.recorded_by,recorded_at=excluded.recorded_at,
    signed_receipt_id=excluded.signed_receipt_id,
    signed_asset_sha256=excluded.signed_asset_sha256;

  perform set_config('rcap.agreement_projection',p_request::text,true);
  update public.partner_onboarding set agreement_status='signed',
    agreement_date=p_effective_date,aggregate_version=aggregate_version+1,
    last_meaningful_activity_at=now()
    where id=w.id returning aggregate_version into workspace_version;
  perform set_config('rcap.agreement_projection','',true);



  -- Preserve unrelated staff-training and operational attestations. Only
  -- launch decisions tied to changed contractual authority are renewed.
  if contract_changed then
  update public.partner_onboarding_launch_checks set
    invalidated_at=now(),invalidated_reason='Executed agreement changed'
    where workspace_id=w.id
      and check_key in ('legalease_final_review_complete','partner_launch_approval_received')
      and invalidated_at is null;
  update public.partner_onboarding_launch_approvals set
    invalidated_at=now() where workspace_id=w.id and invalidated_at is null;
  end if;

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

-- One database clearance rule: contractual execution and other required
-- documents are checked independently of commercial/funding authorization.
create function public.rcap_agreement_clearance(p_workspace uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.partner_onboarding w where w.id=p_workspace and w.agreement_status='signed')
 and exists(select 1 from public.partner_onboarding_agreements a
   join public.rcap_signed_agreement_receipts r on r.id=a.signed_receipt_id
     and r.workspace_id=a.workspace_id and r.agreement_type=a.agreement_type
     and r.asset_id=a.finalized_asset_id and r.effective_date=a.effective_date
     and r.asset_sha256=a.signed_asset_sha256
   join public.partner_onboarding_assets d on d.id=r.asset_id and d.workspace_id=r.workspace_id
     and d.sha256_hex=r.asset_sha256 and d.category='procurement_document'
     and d.lifecycle_status='active' and d.review_status='approved' and d.deleted_at is null
     and d.media_type in ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document')
   join storage.objects o on o.bucket_id=d.bucket_id and o.name=d.object_path
   join storage.buckets b on b.id=o.bucket_id and b.id='rcap-partner-onboarding-private' and b.public=false
   where a.workspace_id=p_workspace and a.agreement_type in ('order_form','master_services_agreement')
     and a.status='executed' and a.effective_date<=current_date)
 and not exists(select 1 from public.partner_onboarding_agreements a
   left join public.partner_onboarding_assets d on d.id=a.finalized_asset_id and d.workspace_id=a.workspace_id
   left join public.rcap_signed_agreement_receipts r on r.id=a.signed_receipt_id
   left join storage.objects o on o.bucket_id=d.bucket_id and o.name=d.object_path
   left join storage.buckets b on b.id=o.bucket_id and b.id='rcap-partner-onboarding-private' and b.public=false
   where a.workspace_id=p_workspace and a.is_required and (
     d.id is null or o.id is null or b.id is null or d.lifecycle_status<>'active' or d.review_status<>'approved' or d.deleted_at is not null
     or d.media_type not in ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document')
     or a.status not in ('approved','finalized','executed') or a.effective_date>current_date
     or (a.agreement_type in ('order_form','master_services_agreement') and (
       a.status<>'executed' or a.effective_date is null or r.id is null
       or r.workspace_id is distinct from a.workspace_id or r.agreement_type is distinct from a.agreement_type
       or r.asset_id is distinct from d.id or r.asset_sha256 is distinct from d.sha256_hex
       or r.asset_sha256 is distinct from a.signed_asset_sha256
       or r.effective_date is distinct from a.effective_date))))
$$;
revoke all on function public.rcap_agreement_clearance(uuid) from public,anon,authenticated;
grant execute on function public.rcap_agreement_clearance(uuid) to service_role;

-- Legacy billing and generic metadata writes cannot establish signed or erase
-- verified contractual truth. Only the transactional verifier sets this marker.
create function public.rcap_guard_agreement_projection()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then
   if new.agreement_status='signed' then
     raise exception 'New workspaces cannot assert execution without verification' using errcode='42501';
   end if;
   return new;
 end if;
 if new.agreement_status is distinct from old.agreement_status then
   if new.agreement_status='signed' then
     if not exists(select 1 from public.rcap_signed_agreement_receipts r
       join public.partner_onboarding_agreements a on a.signed_receipt_id=r.id
       where r.id::text=current_setting('rcap.agreement_projection',true)
         and r.workspace_id=new.id and a.workspace_id=new.id and a.status='executed'
         and r.workspace_version=new.aggregate_version) then
       raise exception 'Only verified executed evidence may establish signed' using errcode='42501';
     end if;
   elsif old.agreement_status='signed' and current_setting('rcap.agreement_projection',true)
     is distinct from ('withdraw:'||new.id::text) then
     raise exception 'Legacy writes cannot overwrite verified agreement state' using errcode='42501';
   end if;
 end if;
 return new;
end $$;
create trigger rcap_guard_legacy_agreement before insert or update of agreement_status on public.partner_onboarding
 for each row execute function public.rcap_guard_agreement_projection();
revoke all on function public.rcap_guard_agreement_projection() from public,anon,authenticated;
grant execute on function public.rcap_guard_agreement_projection() to service_role;

create function public.rcap_require_documented_real_agreement()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.rcap_launch_operation_id is not null
      and new.status='live' and new.landing_page_ready
      and (old.status is distinct from 'live' or old.landing_page_ready is distinct from true
        or old.rcap_launch_operation_id is distinct from new.rcap_launch_operation_id)
      and not public.rcap_agreement_clearance(new.id) then
    raise exception 'Current executed agreement evidence and all required contract documents are required for real launch' using errcode='42501';
  end if;
  return new;
end $$;
create trigger rcap_require_signed_real_launch
  before update of status,landing_page_ready,rcap_launch_operation_id on public.partner_onboarding
  for each row execute function public.rcap_require_documented_real_agreement();
revoke all on function public.rcap_require_documented_real_agreement() from public,anon,authenticated;
grant execute on function public.rcap_require_documented_real_agreement() to service_role;

commit;
