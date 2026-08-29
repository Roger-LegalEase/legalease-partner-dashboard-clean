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
