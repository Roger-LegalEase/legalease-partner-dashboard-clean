# Consumer payment gate — independent adversarial audit

Lane: consumer-payment-gate adversarial audit (audit-owned; owns no gate code)
Audited commit: `13e356c49bd484e6f946ba604076718d904bca86` on
`origin/claude/rcap-final-sprint-integration`
Sequence: 26 → 27 → 28 → 49 → 50 → 51 → 52
Fixture: `scripts/verify-rcap-phase51-consumer-payment-security.mjs`
Result data: `data/rcap-render/phase51-consumer-payment-security.json`

Verdict: **Phase 52 closes every bypass this lane proved against Phase 51, and
introduces a fail-closed regression that makes the paid consumer path
undeliverable in production.** No new bypass. 19/19 gate cases pass, 3/3 of this
lane's mutations behave, and 0/3 reachability cases pass.

## Phase 51's four proven failures are closed

Verified against a real PostgreSQL 16 cluster carrying Supabase's default
privileges, so Phase 52's grants had to beat them:

| Old failure | Now |
|---|---|
| G1 — participant UPDATEs `payment_status='paid'` | `permission denied for table consumer_briefcase_items` (G1) |
| G1b — participant INSERTs a row already paid | `permission denied` (G2); and even as the table owner the `paid_requires_server_evidence` constraint refuses it (G5) |
| G11 — one paid item authorizes a second matter | `consumer_payment_matter_conflict` / `accounting_blocked` (G8) |
| G12 — B's payment authorizes A's job | `consumer_payment_owner_mismatch` / `accounting_blocked` (G6) |

The mechanism holds up under attack. Column-level privileges answer "which
fields" where RLS only answered "which rows"; `record_consumer_packet_payment`
is `SECURITY DEFINER`, denied to `authenticated` and granted only to
`service_role`, and stamps its own authority so a caller cannot assert
server-recorded status about itself; and the consumption unit is keyed on the
Briefcase item and provider receipt rather than the render job id, with both keys
unique.

## All 19 gate cases

Every one of the fifteen expected changes holds.

| Case | Result |
|---|---|
| G1 participant payment UPDATE | permission denied |
| G2 participant INSERT already paid | permission denied |
| G3 safe nonpayment INSERT and UPDATE | still work (`TX/waiting` written by the participant) |
| G4 payment recording | `authenticated` denied EXECUTE; `service_role` returns `recorded_paid` |
| G5 Phase-51-shaped row lacking Phase 52 fields | refused by `paid_requires_server_evidence` |
| G6 cross-user payment | `consumer_payment_owner_mismatch` / blocked |
| G7 first legitimate consumption | `zero_charge` / eligible |
| G8 same payment, another matter | `consumer_payment_matter_conflict` / blocked |
| G9 same item, person, matter | idempotently eligible, exactly one consumption row |
| G10 missing or wrong currency | `invalid_payment_evidence` for `eur` and for null; finalize blocked |
| G11 missing provider evidence | `invalid_payment_evidence` (no receipt), `invalid_authority` (self-asserted); finalize blocked |
| G12 pre-finalization refund | `consumer_payment_required` / blocked |
| G13 sponsored accounting | `consumed` / eligible against a real entitlement, unchanged |
| G14 paid consumer credit | one `zero_charge` row, null entitlement, null partner |
| G15 repeat download | ledger rows 1 → 1 across three delivery events |
| G16 uniqueness conflict | typed, job left `artifact_validated`, never stranded in `validating` |
| G17 blocked job delivery event | `job is not delivery-eligible` |
| G18 no briefcase item | fails closed |
| G19 no payment storage | fails closed |

This lane's three mutations still bite: removing phases 51/52 makes an unpaid
packet deliverable (M1), weakening the amount and currency clause opens an
underpaid row (M2), and forcing the probe true opens an unpaid one (M3).

The captain's own suite was run unmodified and is green: 32/32 verifier cases and
12/12 mutations red-then-restored.

## REGRESSION — the gate is unreachable for a legitimate payer

Phase 52's authority probe requires `consumer_auth_user_id` on the render job:

```sql
if p_consumer_auth_user_id is null then
  return query select false, 'no_consumer_binding'::text, null::text;
```

Nothing in any sanctioned path can populate it.

- **R1.** `enqueue_packet_render_job` — the only insert path, guarded by
  `guard_packet_render_job_insert` — was not extended. Its signature is still
  `(p_packet_id, p_route_id, p_renderer_kind, p_renderer_version, p_source_sha256,
  p_profile_id, p_profile_version, p_input_hash, p_briefcase_item_id, p_partner_id,
  p_person_id, p_matter_id, p_max_attempts)`. No consumer binding parameter exists.
- **R2.** It cannot be set afterwards either: `has_table_privilege('service_role',
  'public.packet_render_jobs', 'UPDATE')` is **false**. Phase 50 deliberately
  revoked direct DML from every runtime role, and Phase 52 grants none back. A
  direct `update … set consumer_auth_user_id = …` as `service_role` returns
  `permission denied for table packet_render_jobs`.
- **R3.** End to end through sanctioned paths only: a participant creates an item,
  `record_consumer_packet_payment` returns `recorded_paid`, the job is enqueued
  via `enqueue_packet_render_job`, and its `consumer_auth_user_id` reads `NULL`.
  Finalization returns **`consumer_payment_required` / `accounting_blocked`**.
  A customer who paid $50 cannot be served.

No runtime code references either column — `grep -rn "consumer_auth_user_id|consumer_briefcase_item_id" src/` returns nothing.

The captain's verifier does not catch this because it supplies the binding with a
direct `update packet_render_jobs set consumer_briefcase_item_id = …,
consumer_auth_user_id = …` (line 162), executed as the table owner. That is a
privilege no runtime role holds, so the verifier proves the gate's *logic* while
leaving its *reachability* untested. This audit's gate cases use the same
owner-write deliberately, which is why they all pass; the REACH section is what
separates the two questions.

This fails closed, so it is a functional regression rather than a security
bypass. It is nonetheless a hard blocker for the staging precondition: the paid
consumer product cannot deliver a packet.

### What the captain needs to decide

The fix belongs to the phase-52 owner and is not applied here. Two shapes exist,
and the choice is theirs:

1. Extend `enqueue_packet_render_job` with `p_consumer_briefcase_item_id` and
   `p_consumer_auth_user_id`, set them in the same insert, and pass them from
   `src/lib/rcap/render/job-queue.ts::enqueueRenderJob`. This keeps direct DML
   revoked and preserves the phase-50 boundary. It changes a function phase 50
   owns, so the grant list in section 8 of phase 50 must be re-applied for the
   new signature.
2. Add a `SECURITY DEFINER` binding RPC granted to `service_role` that sets the
   two columns once, exercised between enqueue and claim. This avoids touching
   the phase-50 signature but adds a second write path to a table phase 50
   deliberately closed.

Whichever is chosen, R1–R3 in this fixture become the acceptance test: they pass
only when a paid consumer reaches `zero_charge` / `eligible` with no owner-level
write anywhere in the path.

Note also that the immutability trigger added in phase 52 section 4 only guards
`consumer_briefcase_item_id` and `consumer_auth_user_id` when the OLD value is
non-null. Under option 2 a job would sit briefly with both null and be bindable
by anything holding the RPC; option 1 avoids that window entirely by setting them
in the insert.

## Product-policy question, unchanged

Phase 52 records a refund but deliberately preserves the consumption row, so an
artifact already delivered keeps working while the refunded payment authorizes
nothing new (the captain's R12 cases). Whether a post-delivery refund should
revoke access to an already-delivered packet remains Roger's decision, and this
audit does not assert either way. The pre-finalization refunded case is tested and
blocks correctly (G12).
