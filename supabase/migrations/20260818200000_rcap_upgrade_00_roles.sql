-- Forward-only step 0 of 8 in the Production schema upgrade.
--
-- Start: supabase/migrations/20260728213131_remote_schema.sql, the recovered and
--        validated Production baseline.
-- End:   the accepted repository schema.
--
-- Creates the two non-login roles the packet render and delivery boundary grants
-- EXECUTE to, using the same guarded block
-- supabase/phase-50-rcap-packet-delivery-hardening.sql uses. Roles are cluster
-- objects, so a schema diff does not see them; without this step the EXECUTE grants
-- in step 07 would fail on a database where they do not already exist.
--
-- Neither role can log in and neither is granted anything here.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'rcap_render_worker') then
    create role rcap_render_worker nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'rcap_packet_delivery') then
    create role rcap_packet_delivery nologin;
  end if;
end;
$$;
