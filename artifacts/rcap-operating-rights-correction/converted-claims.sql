\set ON_ERROR_STOP on
begin;
do $$ declare w public.partner_onboarding%rowtype; row record; j text; n int; begin
assert current_database()='rcap';
select * into strict w from partner_onboarding where partner_slug='operating-rights-mv23t67r';
assert w.status='live' and w.operating_model='legalease_managed';
select count(*) into n from screening_sessions where partner_slug=w.partner_slug;
select * into row from claim_rcap_screening_session(w.partner_slug,'NY'); assert not row.ok and row.reason='jurisdiction_not_authorized';
assert (select count(*)=n from screening_sessions where partner_slug=w.partner_slug);
foreach j in array array['DC','MD','VA'] loop
select * into row from claim_rcap_screening_session(w.partner_slug,j);assert row.ok;
assert (select jurisdiction=j from screening_sessions where session_id=row.session_id);
select * into row from record_partner_packet_generation(row.session_id,now());assert not row.recorded and row.reason='packet_authority_required';
end loop;
raise notice 'PASS converted program DC/MD/VA screening claims, NY refusal before insertion, and unfunded packet denial';
end $$;
rollback;
