# Migration patch proposal — Grade-A fulfillment authority

`grade-a-fulfillment-authority.sql` in this directory is **a proposal, not a
migration**. It is unnumbered and lives outside `supabase/migrations/` because
shared migration ordering is captain-owned and Lane B does not write into the
apply order.

## To adopt it

1. Assign it a slot in the apply order (`docs/RCAP_MIGRATION_APPLY_ORDER_SECURITY.md`).
2. Move it to `supabase/migrations/<timestamp>_rcap_grade_a_fulfillment_authority.sql`.
3. Apply to staging first. It creates two tables and two functions and touches
   nothing that already exists — no existing RLS policy, grant, column or
   function is altered — so a staging apply that breaks anything is a signal to
   stop, not to adjust.

## What it changes about behaviour, before anything calls it

Nothing. Every existing admission point stays exactly as permissive as it is
today. `rcap_grade_a_admits()` only starts denying when a route is wired to call
it, which is the separate, explicitly authorized change described in
`../GRADE_A_FULFILLMENT_INTEGRATION_NOTE.md`.

## Why a database side exists at all

The application module in `src/lib/rcap/fulfillment/` is the authority the
product reads, and it is correct today. These objects exist for the reason phase
52's payment RPC exists: the check that actually defends the money is the one
that holds even when the application is wrong. An admission point that forgets to
call `admitCommercial()` should still be unable to record a commercial
consumption against an unproven route.

The two are duplicated on purpose. Neither is a substitute for the other.

---

# Captain review of migration ordering

Reviewed at integration onto controlling base
`0cad61625a74665db23ac64988c301e48909cf81`. The proposal stays unnumbered and
outside `supabase/migrations/`. It is **not** installed by this integration.

## Current ordering

The last applied migration on the controlling base is
`20260828100000_shared_pending_result_and_atomic_claim.sql`. A number for this
proposal would therefore sort after it, and nothing in the proposal depends on
an object introduced by a later migration, so no reordering of existing files
would be required when it is eventually numbered.

## Why it is still not numbered

Numbering is the cheap half. Installing it means running a live Supabase
migration, and that is outside this sprint's authorization: no Production
deployment, migration, or environment change is authorized here. Numbering a
file that cannot be applied would put the repository's migration history and the
database's actual state out of step, which is the specific failure the numbering
discipline exists to prevent. It stays a proposal until someone with that
authority runs it.

## Blast radius, verified rather than accepted

The lane's claim that the proposal alters no existing policy, grant, column or
function was checked statement by statement rather than taken on faith. Every
`drop`, `alter` and `revoke` in the file targets an object the same file creates:

- `drop trigger if exists` twice, both on `rcap_grade_a_fulfillment_history`
- `revoke all` twice, on `rcap_grade_a_fulfillment_records` and
  `rcap_grade_a_fulfillment_history`, from `anon` and `authenticated`
- `alter table ... enable row level security` twice, on the same two new tables

No pre-existing object is touched, so adopting it changes no behaviour until a
route calls `rcap_grade_a_admits()`.

One correction to the lane's own description: the proposal adds two tables and
**three** functions, not two — `rcap_grade_a_history_is_append_only`,
`rcap_grade_a_authority_state` and `rcap_grade_a_admits`. The first backs the
append-only trigger on the history table.

Row-level security is enabled on both new tables and all access is revoked from
`anon` and `authenticated`, so the tables are unreachable from a client session
even if the proposal were applied ahead of any route consuming it.
