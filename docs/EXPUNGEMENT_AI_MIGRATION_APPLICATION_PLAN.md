# Expungement.ai Migration Application Plan

Do not apply these migrations from this branch. Apply only through the reviewed production database process after approval.

## Order

1. `supabase/phase-26-consumer-briefcase-items.sql`
2. `supabase/phase-27-consumer-checkout-metadata.sql`
3. `supabase/phase-28-consumer-packet-generation-status.sql`
4. `supabase/phase-29-consumer-wilma-telemetry.sql`

## Phase 26: Consumer Briefcase Items

File: `supabase/phase-26-consumer-briefcase-items.sql`

Purpose: create consumer-owned Briefcase persistence for Expungement.ai checks, results, packets, and Wilma conversation records.

Creates or changes:

- Creates `public.consumer_briefcase_items`.
- Adds columns for `user_id`, `item_type`, `jurisdiction`, `pathway_label`, `result_code`, `packet_type`, `payment_allowed`, `status`, JSON summaries, artifacts, payment status, packet status, reminder date, source session ID, and timestamps.
- Creates indexes on `(user_id, created_at desc)`, `(user_id, status)`, and `(user_id, result_code)`.
- Enables RLS.
- Creates owner-scoped select, insert, update, and delete policies requiring `auth.uid() = user_id`.

Partner data: does not touch partner data.

Existing RCAP legacy tables: does not touch existing RCAP legacy tables.

Verification query:

```sql
select
  relrowsecurity as rls_enabled
from pg_class
where oid = 'public.consumer_briefcase_items'::regclass;

select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'consumer_briefcase_items'
order by policyname;
```

Rollback note: prefer disabling launch routes over dropping the table. If rollback requires schema removal, export consumer records first, then drop policies, indexes, and `public.consumer_briefcase_items` through an approved rollback migration.

Smoke test after applying: sign in as a consumer, save an eligibility check, save a result, verify the row owner is the authenticated user, and verify a second consumer cannot read the row.

## Phase 27: Consumer Checkout Metadata

File: `supabase/phase-27-consumer-checkout-metadata.sql`

Purpose: extend consumer Briefcase rows with payment metadata for Expungement.ai packet checkout.

Creates or changes:

- Adds `payment_provider`.
- Adds `checkout_session_id`.
- Adds `payment_intent_id`.
- Adds `amount_cents` constrained to 5000 when present.
- Adds `receipt_url`.
- Creates an index on `checkout_session_id` where present.

Partner data: does not touch partner data or partner billing.

Existing RCAP legacy tables: does not touch existing RCAP legacy tables.

Verification query:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'consumer_briefcase_items'
  and column_name in (
    'payment_provider',
    'checkout_session_id',
    'payment_intent_id',
    'amount_cents',
    'receipt_url'
  )
order by column_name;

select indexname
from pg_indexes
where schemaname = 'public'
  and tablename = 'consumer_briefcase_items'
  and indexname = 'consumer_briefcase_items_checkout_session_id_idx';
```

Rollback note: prefer leaving nullable metadata columns in place if production rows exist. If removal is required, export payment reconciliation data first and remove columns through an approved rollback migration.

Smoke test after applying: create a packet-ready result, start checkout, verify `payment_provider`, `checkout_session_id`, and `amount_cents = 5000` are recorded on the owned Briefcase row.

## Phase 28: Consumer Packet Generation Status

File: `supabase/phase-28-consumer-packet-generation-status.sql`

Purpose: extend packet lifecycle status values for post-payment generation.

Creates or changes:

- Replaces the `consumer_briefcase_items_packet_status_check` constraint.
- Allows `not_started`, `pending`, `generating`, `ready`, `failed`, and `downloaded`.

Partner data: does not touch partner data or partner billing.

Existing RCAP legacy tables: does not touch existing RCAP legacy tables or legacy generators.

Verification query:

```sql
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.consumer_briefcase_items'::regclass
  and conname = 'consumer_briefcase_items_packet_status_check';
```

Rollback note: rollback is safe only after confirming no rows use `pending`, `generating`, or `failed`. Otherwise preserve the expanded constraint and roll back application behavior first.

Smoke test after applying: confirm a paid or dry-run packet-ready item transitions through `pending` and `generating` to `ready`, and confirm failed generation can record `failed`.

## Phase 29: Consumer Wilma Telemetry

File: `supabase/phase-29-consumer-wilma-telemetry.sql`

Purpose: create redacted Wilma safety telemetry for internal safety review.

Creates or changes:

- Creates `public.consumer_wilma_telemetry`.
- Stores redacted user message, redacted Wilma response, injected state content IDs, case context presence, disposition type, guard flags, redirect data, model version, system prompt version, and timestamps.
- Enables RLS.
- Creates an internal safety select policy for `internal_admin` and `safety_reviewer` partner user roles.

Partner data: reads `public.partner_users` only in the internal safety policy; does not alter partner data, partner billing, partner RLS, or partner telemetry access.

Existing RCAP legacy tables: does not touch existing RCAP legacy tables.

Verification query:

```sql
select
  relrowsecurity as rls_enabled
from pg_class
where oid = 'public.consumer_wilma_telemetry'::regclass;

select policyname, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename = 'consumer_wilma_telemetry'
order by policyname;
```

Rollback note: prefer keeping redacted telemetry for audit continuity. If rollback requires removal, export safety telemetry first, then drop policy and table through an approved rollback migration.

Smoke test after applying: send a Wilma message containing SSN, DOB, email, phone, address, and a likely name; verify telemetry stores redaction tokens and no raw PII.
