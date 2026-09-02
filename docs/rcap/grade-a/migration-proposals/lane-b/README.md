# Migration proposal — Grade-A fulfillment authority (Lane B)

`grade-a-fulfillment-authority.sql` here is **a proposal, not a migration**. It is
unnumbered and outside `supabase/migrations/` because migration numbering and
apply order are captain-owned.

## Status

Reviewed and corrected in wave 2 against the hardened application contract. It
has **never been applied anywhere**, including staging. It is unvalidated SQL.

## Corrections made in this wave

1. **Schema v1/v2 split.** `schema_version` is constrained to the two the
   application evaluates, and `rcap_grade_a_admits()` refuses every v1 row
   outright — matching the application's admission floor, where being evaluable
   is not being sellable.
2. **Fileability.** `packet_completeness` and
   `rcap_grade_a_completeness_gap_count()` mirror the nine specification
   dimensions plus custom-pleading authority and the filing-format artifact.
   A v2 row without a completeness document is refused by a table constraint at
   write time rather than evaluated and puzzled over.
3. **`NO_RECORD`.** A route with no row returns `NO_RECORD`, not
   `UNSUPPORTED_ROUTE`. Both fail closed; they send an operator to different
   places.
4. **Scope stated explicitly.** The function answers only the ROUTE half. Matter
   ownership, the stage-8 verification snapshot, entitlement idempotency and
   private storage are facts about a matter and already live in
   `consumer_briefcase_items`, the render-job tables, and the phase-52/53/55
   bindings. Duplicating them here would create a second answer to a question
   those tables already answer correctly.

## To adopt

1. Assign a slot in the apply order (`docs/RCAP_MIGRATION_APPLY_ORDER_SECURITY.md`).
2. Move to `supabase/migrations/<timestamp>_rcap_grade_a_fulfillment_authority.sql`.
3. Apply to staging first. It creates two tables and three functions and alters
   nothing that already exists — no existing RLS policy, grant, column or
   function — so a staging apply that breaks something is a signal to stop, not
   to adjust.

## Behaviour before anything calls it

None changes. Every existing admission point stays exactly as permissive as it is
today. `rcap_grade_a_admits()` only begins denying when a route is wired to call
it, which is the separate change described in
`../../lane-b/LANE_F_CALL_SITE_CONTRACT.md`.
