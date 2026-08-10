# Phase 51 consumer payment gate — independent adversarial audit

Lane: consumer-payment-gate adversarial audit (audit-owned; owns no gate code)
Base: `origin/claude/rcap-final-sprint-integration` @ `abbc48a`
Fixture: `scripts/verify-rcap-phase51-consumer-payment-security.mjs`
Result data: `data/rcap-render/phase51-consumer-payment-security.json`

Verdict: **the gate is bypassable.** Phase 51 correctly refuses an unpaid job,
and its three mutations prove it carries real weight. But the fact it gates on —
`consumer_briefcase_items.payment_status = 'paid'` at `amount_cents = 5000` — is
writable by the participant the gate exists to charge. 13 of 17 gate cases pass;
the 4 failures are below.

Everything here was executed against an ephemeral PostgreSQL 16 cluster running
the real sequence 26 → 27 → 28 → 49 → 50 → 51, with `anon`, `authenticated` and
`service_role` created *before* the migrations and Supabase's default privileges
(`grant all on tables`) in force, so the migrations' own grants had to beat them.

## What Phase 51 gets right

| Case | Proven |
|---|---|
| G2–G5 | `unpaid`, `refunded`, `not_applicable`, and `paid` with a null amount all yield `consumer_payment_required` / `accounting_blocked` |
| G6 | an amount below $50 cannot be stored at all — the phase-27 CHECK rejects it |
| G7 | a job with no briefcase item fails closed |
| G16 | a schema with no `consumer_briefcase_items` fails closed rather than crashing or passing |
| G8/G9 | a genuinely paid item yields `zero_charge` / `eligible` with a ledger row carrying null entitlement and null partner — no partner credit moves |
| G10 | repeated delivery events add no ledger row and demand no second payment |
| G13 | a payment-blocked job cannot record any delivery event: `record_packet_delivery_event` raises `job is not delivery-eligible` |
| G14/G15 | a sponsored packet is untouched by the consumer gate and consumes partner credit normally |
| M1 | with only 49+50 applied, an unpaid consumer packet becomes `zero_charge` / `eligible` — the regression Phase 51 was written to close is real |
| M2 | dropping the amount comparison from the probe opens a `paid` row carrying no amount |
| M3 | forcing the probe to `true` makes an unpaid packet deliverable |

The design is also right to resolve `consumer_briefcase_items` dynamically: a
missing table answers "cannot prove payment" instead of raising.

## DEFECT 1 — critical — the participant writes their own payment evidence

`packet_render_jobs.accounting_result = zero_charge`, `delivery_eligibility = eligible`,
with no payment ever taken.

Phase 26 enables RLS on `consumer_briefcase_items` with policies that scope rows
by owner but restrict no column:

```
insert own items   cmd=INSERT  check=(auth.uid() = user_id)
update own items   cmd=UPDATE  qual=(auth.uid() = user_id)  check=(auth.uid() = user_id)
```

`payment_status` and `amount_cents` are ordinary columns. Measured on the audit
cluster: `has_table_privilege('authenticated', …, 'UPDATE')` = **t**,
`has_table_privilege('authenticated', …, 'INSERT')` = **t**, and
`has_column_privilege('authenticated', …, 'payment_status', 'UPDATE')` = **t**.
No trigger, no column grant and no `REVOKE` anywhere in `supabase/` constrains
them — grep over every migration touching the table returns only `comment on`.

Two independent paths, both proven:

- **G1 — update.** As `authenticated` with their own `sub`:
  `update consumer_briefcase_items set payment_status='paid', amount_cents=5000 where id=<own row>` succeeded; the row read back `paid/5000`.
- **Insert.** Stronger and needing no prior row: an `authenticated` participant
  inserted a brand-new item already carrying `payment_status='paid'`,
  `amount_cents=5000`. There is no checkout in this path at all.

**G1b**: finalizing a job bound to that self-declared item returned
`accounting_result=zero_charge`, `delivery_eligibility=eligible`.

The delivery route is no help here. `packet-delivery.ts:70` requires
`userOwnsBriefcaseItem(input.userId, job.briefcaseItemId)` — and the forger owns
the item. The ownership check is satisfied by construction.

Both roles reach this over PostgREST with the publishable key
(`NEXT_PUBLIC_SUPABASE_ANON_KEY`), so the exploit is a single authenticated
`POST /rest/v1/consumer_briefcase_items` followed by the ordinary packet flow.

### Exact patch — new captain-owned migration (do not edit phase 51)

Payment columns must not be participant-writable. The webhook path already
writes them through the service-role client, so the capability is not needed.

```sql
-- phase-52: payment evidence is server-written only.
revoke insert, update on public.consumer_briefcase_items from anon, authenticated;

grant insert (user_id, item_type, jurisdiction, pathway_label, result_code,
              packet_type, payment_allowed, status, summary_json,
              next_steps_json, artifact_refs_json, reminder_at,
              source_session_id)
  on public.consumer_briefcase_items to authenticated;

grant update (item_type, jurisdiction, pathway_label, result_code, packet_type,
              payment_allowed, status, summary_json, next_steps_json,
              artifact_refs_json, reminder_at, source_session_id, updated_at)
  on public.consumer_briefcase_items to authenticated;
```

`payment_status` is `not null default 'not_applicable'`, so omitting it from the
INSERT grant is safe: the default applies and the participant cannot name it.
`payment_provider`, `checkout_session_id`, `payment_intent_id`, `amount_cents`,
`receipt_url` and `packet_status` are likewise withheld.

Validated on the audit cluster after applying the block above: the forged paid
INSERT and the forged paid UPDATE both fail with `permission denied for table
consumer_briefcase_items`; an ordinary participant INSERT that names no payment
column still succeeds; and `service_role` still writes `payment_status='paid'`.

**Required companion runtime change** (shared path, not this lane's to edit):
`src/lib/expungement-ai/briefcase.ts::updateBriefcasePaymentMetadata` writes the
payment columns through `getConsumerBriefcaseClient()` — the *user's* auth client
— and is called from `payment-adapter.ts:109`, `:131` and `:212`. Under the patch
above those writes begin failing. Point those three call sites at
`updateBriefcasePaymentMetadataForWebhook`, which already uses
`getSupabaseAdminClient()`, or switch `updateBriefcasePaymentMetadata` to the
admin client. Land the migration and this change together.

## DEFECT 2 — high — one payment authorizes unlimited packets

**G11**: the same paid briefcase item was used to finalize a second job for a
different `matter_id`. Result: `zero_charge` / `eligible` again. No limit exists.

The cause is the consumer consumption unit. Phase 51 keys it on the job:

```sql
v_unit_hash := encode(extensions.digest(convert_to('zero_charge:' || v_job.id::text, …
```

Every job has a distinct id, so every unit hash is distinct and nothing collides.
The ledger's uniqueness index does not cover this either — it is partial on
`event_type in ('consumed','overage_consumed')` and excludes `zero_charge`.

There is no compensating control: the participant owns the item, so the delivery
route admits every packet they generate from that one $50 purchase.

### Exact patch

Key the consumer unit on the thing that was paid for, and let the ledger enforce
it:

```sql
-- in the consumer branch of finalize_packet_render_job
v_unit_hash := encode(extensions.digest(
  convert_to('zero_charge:' || v_job.briefcase_item_id::text, 'utf8'), 'sha256'), 'hex');

-- and widen the uniqueness boundary to cover it
drop index if exists packet_credit_ledger_consumption_unit_idx;
create unique index packet_credit_ledger_consumption_unit_idx
  on public.packet_credit_ledger(consumption_unit_hash)
  where event_type in ('consumed', 'overage_consumed', 'zero_charge');
```

Note the interaction with the existing idempotent-convergence branch: a retry of
the *same* job returns the recorded outcome before reaching this code, so
legitimate retries and repeat downloads are unaffected — G10 covers that and
must stay green after the patch.

**Implementation caveat, and it matters.** Applied exactly as written above, the
second redemption fails with a raw `duplicate key value violates unique
constraint "packet_credit_ledger_consumption_unit_idx"` raised from inside
`finalize_packet_render_job`. Because finalization is one transaction, that
exception rolls back the artifact-evidence update too, leaving the job in
`validating` with its fencing token intact — so the worker retries and hits the
same wall, and the job never reaches a visible terminal state. The insert must
therefore be guarded and converted into a typed result rather than allowed to
raise, in the same shape the cap-race already uses:

```sql
begin
  insert into public.packet_credit_ledger (…) values (…) returning id into v_ledger_id;
  v_result := 'zero_charge';
  v_eligibility := 'eligible';
exception when unique_violation then
  -- this payment already bought a packet set
  v_result := 'consumer_payment_required';
  v_eligibility := 'accounting_blocked';
end;
```

That keeps the artifact evidence recorded, blocks delivery, and leaves the job
visibly accounting-blocked instead of stuck.

## DEFECT 3 — medium, defense in depth — the gate does not bind the payer

**G12**: a job whose `person_id` is participant A's, bound to participant B's
paid briefcase item, finalized to `zero_charge` / `eligible`. The probe checks
only that *some* row with that id is paid; it never compares the item's
`user_id` to the job's participant.

Impact is bounded, and I want to be exact about why rather than overstate it.
`enqueue_packet_render_job` is executable only by `service_role`, so misbinding
needs a server-side bug rather than a client request; and the delivery route
still requires the downloader to own the item, so a misbound job is deliverable
only to B, its real payer. This is a missing invariant, not an open theft path.

A complete fix is not expressible in today's schema: `packet_render_jobs` carries
`person_id` into `rcap_persons`, which has no `auth.users` linkage
(`phase-30-rcap-person-identity.sql:6-11`). Closing it properly needs a consumer
identity column on the job — e.g. `consumer_user_id uuid references auth.users(id)`
— set at enqueue and compared against `consumer_briefcase_items.user_id` in the
probe. Patch 2 partially mitigates by making each paid item redeemable once.

## Answers to the assignment's numbered questions

1. **No.** A participant inserts or updates their own row to `paid`/5000 (G1).
2. **No.** Payment is bound to the briefcase item id only — not to participant, matter, or job (G11, G12).
3. **No.** One paid item authorized two distinct matters (G11).
4. **Not at the gate.** B's payment authorized a job for A (G12); the delivery route still restricts the download to B.
5. **Yes.** Missing storage fails closed (G16).
6. **Yes.** A null briefcase item fails closed (G7).
7. **Yes, for the statuses that exist.** `unpaid`, `refunded`, `not_applicable` all fail closed (G2–G4). `pending`, `failed`, `canceled` and `disputed` are not in the phase-26 CHECK and cannot be stored, so they are structurally unreachable rather than gated.
8. **Amount yes, currency not represented.** The probe requires exactly 5000 and the column CHECK permits only 5000 or null. `consumer_briefcase_items` has no currency column, so there is nothing to compare.
9. **Yes.** A lower amount cannot be persisted (G6) and would fail the probe regardless.
10. **Yes.** Sponsored jobs take the entitlement branch untouched (G14, G15).
11. **Yes.** A paid consumer packet writes a `zero_charge` row with null entitlement and null partner (G9).
12. **Yes.** Repeat delivery adds no ledger row and demands no second payment (G10).
13. **Yes.** M3 (probe forced true) and M2 (amount check removed) both flip the outcome.
14. **Yes.** M1 reproduces the unpaid-consumer regression on 49+50 alone.
15. **Yes.** `record_packet_delivery_event` refuses a non-eligible job (G13), and `isDeliverable` requires `delivery_eligibility === "eligible"`.

## Product-policy question, not invented behaviour

Phase 51 evaluates payment once, at finalization. A refund issued *after* a job
reaches `eligible` does not revoke eligibility, and no revocation path exists.
Whether post-delivery refund should revoke access is a product decision for
Roger, and this audit deliberately does not assert either way. The pre-delivery
refunded case is tested and passes (G3).
