-- Illinois sponsored route: the carried-forward packet specification digest.
--
-- 20260906120000 registered IL:felony-prostitution-relief for sponsored render
-- and recorded the packet specification content digest current at the time,
-- bc9050e096eeb99677edb9815eacae7c68d22914d8c08a785dfc375c68ed010f.
--
-- OWN-ARTIFACT-APPROVAL-IL-VACATUR-2026-09-19 then carried the owner-approved
-- FIX02 artifacts into that specification, executing the instruction in the
-- 2026-09-14 re-review. The specification moved by exactly five leaves -- the
-- two approved digests, their byte lengths, and the content digest containing
-- them -- so its content digest is now
-- 1f43f4eae0fc213863e5bca7567bb7314e4772d015a04be666b7b2edbfae3d9b.
--
-- enqueue_verified_sponsored_packet_render compares the render payload's
-- specificationSha256 against this row and refuses on any difference. It was
-- right to refuse: until this migration the database's registration named a
-- specification the application no longer has. Left unrepaired, every Illinois
-- sponsored render fails with 'sponsored render route binding mismatch'.
--
-- This changes a digest that already moved elsewhere. It grants nothing:
-- Illinois's sellable, checkout, sponsorship and credit-consumption states are
-- untouched, no other route is read or written, and the route's registration
-- otherwise stays exactly as 20260906120000 wrote it.
--
-- Applied after: 20260906120000.

begin;

do $illinois$
declare
  v_prior constant text := 'bc9050e096eeb99677edb9815eacae7c68d22914d8c08a785dfc375c68ed010f';
  v_current constant text := '1f43f4eae0fc213863e5bca7567bb7314e4772d015a04be666b7b2edbfae3d9b';
  v_route constant text := 'IL:felony-prostitution-relief';
  v_observed text;
  v_updated integer;
begin
  if to_regclass('public.sponsored_packet_render_routes') is null then
    -- A partner-only schema never registered sponsored routes. Nothing to
    -- carry forward, and inventing the table here would be a different change.
    return;
  end if;

  select packet_specification_sha256 into v_observed
  from public.sponsored_packet_render_routes
  where route_key = v_route;

  if v_observed is null then
    -- The route was never registered in this database. Registering it now
    -- would grant a sponsored route that 20260906120000 did not grant.
    return;
  end if;

  if v_observed = v_current then
    return; -- Already carried forward. Re-running this migration is a no-op.
  end if;

  if v_observed is distinct from v_prior then
    -- The row holds neither the digest this migration supersedes nor the one
    -- it installs. Something else moved it, and quietly overwriting that would
    -- be exactly the silent re-pin the owner decision exists to prevent.
    raise exception
      'sponsored route % holds specification digest %, which is neither the superseded % nor the carried-forward %; refusing to overwrite an unexplained value',
      v_route, v_observed, v_prior, v_current;
  end if;

  update public.sponsored_packet_render_routes
  set packet_specification_sha256 = v_current
  where route_key = v_route
    and packet_specification_sha256 = v_prior;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'expected to carry forward exactly one sponsored route, updated %', v_updated;
  end if;
end
$illinois$;

commit;
