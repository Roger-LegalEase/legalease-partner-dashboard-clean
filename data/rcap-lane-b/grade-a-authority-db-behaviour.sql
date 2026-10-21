-- Behaviour assertions for the Lane B Grade-A authority migration proposal.
--
-- Run against a scratch database that has already had
-- docs/rcap/grade-a/migration-proposals/lane-b/grade-a-fulfillment-authority.sql
-- applied. Every assertion raises on failure, so the script either completes
-- silently or names the rule that broke.
--
-- These are the rules that must hold in the database even when the application
-- is wrong, which is the only reason the database side exists.

\set ON_ERROR_STOP on

create or replace function pg_temp.assert(p_condition boolean, p_label text)
returns void language plpgsql as $$
begin
  if p_condition is not true then
    raise exception 'FAILED: %', p_label;
  end if;
end;
$$;

-- A complete v2 completeness document, used as the baseline every case departs from.
create or replace function pg_temp.complete_completeness()
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'specificationId', 'zz-spec',
    'specificationVersion', '1.0.0',
    'specificationSha256', repeat('a', 64),
    'filingApplication', jsonb_build_object('state', 'covered', 'basis', 'documents[0]'),
    'proposedOrder', jsonb_build_object('state', 'covered', 'basis', 'documents[1]'),
    'attachmentsAndSchedules', jsonb_build_object('state', 'covered', 'basis', 'attachments'),
    'serviceAndNotice', jsonb_build_object('state', 'covered', 'basis', 'serviceAndNotice'),
    'filingDestination', jsonb_build_object('state', 'covered', 'basis', 'filingDestination'),
    'feeAndWaiverInstructions', jsonb_build_object('state', 'covered', 'basis', 'feeAndWaiver'),
    'copyRequirements', jsonb_build_object('state', 'covered', 'basis', 'copyRequirements'),
    'postFilingSteps', jsonb_build_object('state', 'covered', 'basis', 'postFilingTimeline'),
    'hearingAndObjectionStopConditions', jsonb_build_object('state', 'covered', 'basis', 'hearingStops'),
    'customPleadingAuthority', jsonb_build_object('required', true, 'approved', true, 'authorityId', 'zz-auth'),
    'filingFormatArtifact', jsonb_build_object('format', 'pdf', 'sha256', repeat('b', 64), 'pageCount', 4)
  );
$$;

create or replace function pg_temp.insert_record(
  p_route text, p_schema text, p_completeness jsonb, p_version integer default 1
) returns void language sql as $$
  insert into public.rcap_grade_a_fulfillment_records (
    schema_version, record_id, route_id, jurisdiction, pathway_id, packet_family_id,
    service_disposition, version, effective_from,
    legal_authority_record_id, legal_authority_version, legal_authority_status,
    legal_authority_effective_date, legal_authority_scope_sha256,
    packet_specification_id, packet_specification_sha256, packet_specification_complete,
    official_sources, provider_id, renderer_kind, renderer_version, provider_image_digest,
    fixture_id, fixture_sha256, fixture_deterministic,
    artifact_validation_state, artifact_sha256, artifact_validated_at,
    packet_completeness,
    visual_review_state, visual_pages_reviewed, visual_page_count, visual_evidence_sha256,
    visual_reviewed_by, visual_reviewed_at,
    output_legal_review_state, output_legal_reviewer_id, output_legal_decided_at, output_legal_scope_sha256,
    final_verification_state, final_verification_verifier_id, final_verification_inputs_sha256, final_verification_at,
    record_sha256
  ) values (
    p_schema, p_route || '#v' || p_version, p_route, split_part(p_route, ':', 1), split_part(p_route, ':', 2), 'zz-family',
    'paid_packet_intended', p_version, date '2026-08-29',
    'auth-zz', 'auth-zz', 'approved_by_decision_owner', date '2026-08-29', repeat('c', 64),
    'zz-set', repeat('d', 64), true,
    jsonb_build_array(jsonb_build_object('sourceId', 'ZZ-1', 'sha256', repeat('e', 64), 'heldInRepository', true)),
    'ghcr.io/example/worker', 'packet_document_v1', '1.0.0', 'sha256:' || repeat('f', 64),
    'zz-fixture', repeat('1', 64), true,
    'validated', repeat('2', 64), now(),
    p_completeness,
    'passed', 4, 4, repeat('3', 64), 'reviewer', now(),
    'passed', 'counsel', now(), repeat('4', 64),
    'bound', 'verifier', repeat('5', 64), now(),
    repeat('6', 64)
  );
$$;

-- 1. A route with no record fails closed.
select pg_temp.assert(public.rcap_grade_a_authority_state('ZZ:absent') = 'NO_RECORD', 'a missing record is NO_RECORD');
select pg_temp.assert(public.rcap_grade_a_admits('ZZ:absent') is false, 'a missing record admits nothing');

-- 2. A fully proven v2 record admits.
select pg_temp.insert_record('ZZ:proven', 'rcap-grade-a-fulfillment-authority/v2', pg_temp.complete_completeness());
select pg_temp.assert(public.rcap_grade_a_authority_state('ZZ:proven') = 'COMPLETE_PACKET_PROVEN', 'a complete v2 record proves');
select pg_temp.assert(public.rcap_grade_a_admits('ZZ:proven') is true, 'a complete v2 record admits');

-- 3. THE dangerous case: a v1 record carrying every v1 proof. It evaluates as
--    proven and must still admit nothing.
select pg_temp.insert_record('ZZ:legacy', 'rcap-grade-a-fulfillment-authority/v1', null);
select pg_temp.assert(public.rcap_grade_a_authority_state('ZZ:legacy') = 'COMPLETE_PACKET_PROVEN', 'a complete v1 record still evaluates as proven');
select pg_temp.assert(public.rcap_grade_a_admits('ZZ:legacy') is false, 'a v1 record admits nothing however proven');

-- 4. A v2 record must carry a completeness document at all.
do $$
begin
  begin
    perform pg_temp.insert_record('ZZ:v2-no-completeness', 'rcap-grade-a-fulfillment-authority/v2', null);
    raise exception 'FAILED: a v2 record without a completeness document was accepted';
  exception when check_violation then null;
  end;
end $$;

-- 5. Every completeness dimension is load-bearing, one at a time.
do $$
declare
  dimension text;
  route text;
begin
  foreach dimension in array array[
    'filingApplication', 'proposedOrder', 'attachmentsAndSchedules', 'serviceAndNotice',
    'filingDestination', 'feeAndWaiverInstructions', 'copyRequirements', 'postFilingSteps',
    'hearingAndObjectionStopConditions'
  ] loop
    route := 'ZZ:missing-' || dimension;
    perform pg_temp.insert_record(route, 'rcap-grade-a-fulfillment-authority/v2',
      pg_temp.complete_completeness() || jsonb_build_object(dimension, jsonb_build_object('state', 'missing', 'basis', null)));
    if public.rcap_grade_a_admits(route) then
      raise exception 'FAILED: % could be missing and the route still admitted', dimension;
    end if;

    route := 'ZZ:unbased-' || dimension;
    perform pg_temp.insert_record(route, 'rcap-grade-a-fulfillment-authority/v2',
      pg_temp.complete_completeness() || jsonb_build_object(dimension, jsonb_build_object('state', 'covered', 'basis', '')));
    if public.rcap_grade_a_admits(route) then
      raise exception 'FAILED: % asserted with no basis still admitted', dimension;
    end if;
  end loop;
end $$;

-- 6. A filing may never be waived; other dimensions may be, with a basis.
select pg_temp.insert_record('ZZ:no-filing', 'rcap-grade-a-fulfillment-authority/v2',
  pg_temp.complete_completeness() || jsonb_build_object('filingApplication', jsonb_build_object('state', 'not_required', 'basis', 'someone decided')));
select pg_temp.assert(public.rcap_grade_a_admits('ZZ:no-filing') is false, 'a waived filing is refused');

select pg_temp.insert_record('ZZ:no-order', 'rcap-grade-a-fulfillment-authority/v2',
  pg_temp.complete_completeness() || jsonb_build_object('proposedOrder', jsonb_build_object('state', 'not_required', 'basis', 'ND does not require one')));
select pg_temp.assert(public.rcap_grade_a_admits('ZZ:no-order') is true, 'a justified waiver of a waivable dimension is accepted');

-- 7. The filing-format artifact must be a filing.
select pg_temp.insert_record('ZZ:text-artifact', 'rcap-grade-a-fulfillment-authority/v2',
  pg_temp.complete_completeness() || jsonb_build_object('filingFormatArtifact', jsonb_build_object('format', 'txt', 'sha256', repeat('b', 64), 'pageCount', 4)));
select pg_temp.assert(public.rcap_grade_a_admits('ZZ:text-artifact') is false, 'a text composition is not a filing');

select pg_temp.insert_record('ZZ:unhashed-artifact', 'rcap-grade-a-fulfillment-authority/v2',
  pg_temp.complete_completeness() || jsonb_build_object('filingFormatArtifact', jsonb_build_object('format', 'pdf', 'sha256', '', 'pageCount', 4)));
select pg_temp.assert(public.rcap_grade_a_admits('ZZ:unhashed-artifact') is false, 'an unhashed filing artifact is refused');

-- 8. A drafted custom pleading needs an approved drafting authority.
select pg_temp.insert_record('ZZ:unapproved-pleading', 'rcap-grade-a-fulfillment-authority/v2',
  pg_temp.complete_completeness() || jsonb_build_object('customPleadingAuthority', jsonb_build_object('required', true, 'approved', false, 'authorityId', null)));
select pg_temp.assert(public.rcap_grade_a_admits('ZZ:unapproved-pleading') is false, 'an unapproved custom pleading is refused');

-- 9. Revocation and supersession.
update public.rcap_grade_a_fulfillment_records
   set revoked = true, revocation_reason = 'source withdrawn', revoked_at = now(), revoked_by = 'Roger Roman'
 where route_id = 'ZZ:proven';
select pg_temp.assert(public.rcap_grade_a_authority_state('ZZ:proven') = 'REVOKED', 'a revoked record is REVOKED');
select pg_temp.assert(public.rcap_grade_a_admits('ZZ:proven') is false, 'a revoked record admits nothing');

do $$
begin
  begin
    update public.rcap_grade_a_fulfillment_records set revoked = true, revocation_reason = null, revoked_by = null
     where route_id = 'ZZ:no-order';
    raise exception 'FAILED: an unattributed revocation was accepted';
  exception when check_violation then null;
  end;
end $$;

-- 10. Exactly one live version per route.
do $$
begin
  begin
    perform pg_temp.insert_record('ZZ:no-order', 'rcap-grade-a-fulfillment-authority/v2', pg_temp.complete_completeness(), 2);
    raise exception 'FAILED: a second live version of one route was accepted';
  exception when unique_violation then null;
  end;
end $$;

-- 11. History is append-only.
insert into public.rcap_grade_a_fulfillment_history (record_id, route_id, version, change_kind, changed_by, reason, record_sha256)
values ('ZZ:proven#v1', 'ZZ:proven', 1, 'created', 'lane-b', 'behaviour test', repeat('7', 64));

do $$
begin
  begin
    update public.rcap_grade_a_fulfillment_history set reason = 'rewritten' where route_id = 'ZZ:proven';
    raise exception 'FAILED: history was updated';
  exception when raise_exception then
    if position('append-only' in sqlerrm) = 0 then raise; end if;
  end;
  begin
    delete from public.rcap_grade_a_fulfillment_history where route_id = 'ZZ:proven';
    raise exception 'FAILED: history was deleted';
  exception when raise_exception then
    if position('append-only' in sqlerrm) = 0 then raise; end if;
  end;
end $$;

do $$
begin
  begin
    insert into public.rcap_grade_a_fulfillment_history (record_id, route_id, version, change_kind, changed_by, reason, record_sha256)
    values ('ZZ:proven#v2', 'ZZ:proven', 2, 'proof_added', '', '', repeat('8', 64));
    raise exception 'FAILED: an unattributed history entry was accepted';
  exception when check_violation then null;
  end;
end $$;

-- 12. A route id that contradicts its own jurisdiction is refused.
do $$
begin
  begin
    insert into public.rcap_grade_a_fulfillment_records (
      schema_version, record_id, route_id, jurisdiction, pathway_id, service_disposition, version,
      effective_from, legal_authority_record_id, legal_authority_version, legal_authority_status,
      legal_authority_effective_date, legal_authority_scope_sha256, packet_specification_id,
      packet_specification_sha256, packet_specification_complete, provider_id, renderer_kind,
      renderer_version, provider_image_digest, fixture_id, fixture_sha256, fixture_deterministic,
      artifact_validation_state, visual_review_state, output_legal_review_state,
      final_verification_state, record_sha256
    ) values (
      'rcap-grade-a-fulfillment-authority/v1', 'mismatch', 'ZZ:route', 'YY', 'route', 'paid_packet_intended', 1,
      date '2026-08-29', 'a', 'a', 'pending', date '2026-08-29', 'h', 's', 'h', true, 'p', 'k', '1', 'd',
      'f', 'h', true, 'not_run', 'pending', 'pending', 'unbound', 'h'
    );
    raise exception 'FAILED: a routeId contradicting its jurisdiction was accepted';
  exception when check_violation then null;
  end;
end $$;

-- 13. A non-paid disposition can never be proven, however complete.
select pg_temp.insert_record('ZZ:guidance', 'rcap-grade-a-fulfillment-authority/v2', pg_temp.complete_completeness());
update public.rcap_grade_a_fulfillment_records set service_disposition = 'non_filing_guidance' where route_id = 'ZZ:guidance';
select pg_temp.assert(public.rcap_grade_a_admits('ZZ:guidance') is false, 'a guidance route cannot be proven');

select 'ALL DATABASE BEHAVIOUR ASSERTIONS PASSED' as result;
