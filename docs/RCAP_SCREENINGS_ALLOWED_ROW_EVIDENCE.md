# screenings_allowed Correction: Row-Level Evidence Record (Session C)

Review base: `origin/claude/rcap-final-sprint-integration` at `e078a87f`
(checkpoint verified in ancestry; it is the clean remote tip). The captain's
static analysis and CAS backfill design in
`docs/RCAP_SCREENINGS_ALLOWED_AUDIT_PLAN.md` were taken as given and were NOT
repeated; one contradiction was found in an execution artifact and is recorded
below with its fix.

Assignment: close the row-level evidence blocker for the screenings_allowed
correction. Persistent data was not modified: this environment holds no
production or staging credentials (verified — no Supabase URL or key in the
environment or on disk), and every executable check ran on throwaway ephemeral
PostgreSQL 16 clusters on a private unix socket.

## Status by assignment item

| # | Item | Status |
|---|---|---|
| 1 | Read-only screenings_allowed audit against the authorized persistent environment | **Blocked on credentials, mechanically ready.** No credentials exist here by design (matches the captain's entry-gate record). The audit read is now proven executable end-to-end on fixtures — including a defect fix it needed (below) — and stays queued for Roger's window. |
| 2 | Affected-row and ambiguous-row counts | **Fixture counts produced** (table below). Production counts follow the authorized read; they cannot be produced from this environment. |
| 3 | Authoritative source for screening capacity and packet capacity | **Verified** (section below). |
| 4 | Prove no ambiguous row is automatically changed | **Proven, and strengthened from procedural to structural** (section below). |
| 5 | Validate backfill and rollback against sanitized fixtures | **Done** — `scripts/verify-rcap-screenings-allowed-audit.mjs`, all assertions green on three schema variants. |
| 6 | Packet accounting scoped by partner, entitlement/program, person, matter | **Verified behaviorally** on a real cluster (section below). |
| 7 | zero_charge cannot result from a missing entitlement | **Proven behaviorally** (section below). |

## Contradiction found (and the fix)

`scripts/rcap-audit-screenings-allowed.sql` (design artifact) read from
`public.partner_onboarding_audit` with columns `action`, `details`,
`created_at`. **No such table exists in any migration in the repository.** The
`partner_packet_cap_configured` events are written by the `audit()` helper in
`src/lib/partners/partner-onboarding.ts` to `public.rcap_record_events`
(`record_type = 'partner_onboarding'`, `event_type`, `metadata`,
`occurred_at`). As drafted, the queued authorized read would have failed at
execution time in Roger's window.

Corrections applied to the audit read (design shape, fields and the
never-infer rule unchanged):

1. Source the cap-configure events from `rcap_record_events` as actually
   written.
2. New probe `record_event_sink_admits_partner_onboarding`: before phase 42,
   the `record_type` check constraint did not admit `'partner_onboarding'`, and
   `audit()` swallows insert errors — so **zero events is not proof that no cap
   configure happened**. Where phase-41 columns exist but the sink could not
   record events, a mismatched row is now classified ambiguous instead of
   "non-defect drift".
3. The audit emits `cas_operand` (the current value at audit time) explicitly,
   which is what the operator copies into
   `rcap_audit_authority.audited_wrong_value` for rows Roger approves.

Fixture variant V3 (phase 41 applied, phase 42 not) proves both halves: the
`partner_onboarding` insert genuinely fails against that schema, and the audit
classifies the mismatched row ambiguous rather than proposing a correction.

## Item 3 — authoritative sources, verified on the review base

- **Screening capacity**: `partner_entitlement.screenings_allowed`, written by
  the internal allowance admin path
  (`src/lib/expungement-ai/rcap-entitlement-admin.ts`) and read by the claim
  RPCs. `configurePacketCap` in `src/lib/partners/partner-onboarding.ts`
  no longer touches it (the defect); the code comment at the write site records
  the rule.
- **Packet capacity**: `partner_packet_entitlement.packet_cap` (phase 50),
  keyed on immutable `partner_records.id`, written by `configurePacketCap` as
  one ACTIVE row per partner and program (partial unique index on
  `expires_at is null`), consumed by `finalize_packet_render_job`.
- The correction never moves a number between the two domains: screening
  values restore from the contract of record; packet values seed from the
  contract of record; nothing is inferred from `screenings_allowed`. The
  fixture harness asserts no seeded `packet_cap` ever equals any fixture
  screening value.

## Item 4 — no ambiguous row is automatically changed (now structural)

The plan's guarantee was procedural (ambiguous rows land in the exception
report because the operator does not load values for them). The backfill
(`scripts/rcap-backfill-screenings-allowed.sql`) now recomputes the audit's
`unresolved_ambiguity` clauses inside its candidate CTE, so an ambiguous row is
refused **even if an operator mistakenly loads an authoritative value and a CAS
operand for it**. Proven in fixture variant V1: `fixture-eventful-legacy`
(cap event present, phase-41 columns absent, value equals the audited cap) was
loaded with authority 500 and CAS operand 100 — and was still refused,
reported as `ambiguous_cap_event_without_phase41_columns_untouched`, with
nothing captured to the rollback table.

## Items 2 and 5 — fixture audit, backfill and rollback evidence

Harness: `scripts/verify-rcap-screenings-allowed-audit.mjs`
(npm alias `rcap:verify-screenings-allowed-audit`). All assertions green.

| Variant | Schema | Partners | Affected (unambiguous corrections) | Ambiguous (untouched) |
|---|---|---|---|---|
| V2 | phases 41+42 applied | 5 | 3 | 1 |
| V1 | production-like: 41 absent, 42 applied | 2 | 0 | 1 |
| V3 | 41 applied, 42 absent (sink blocked) | 1 | 0 | 1 |

V2 proved, in order: overwrite detection exactly where phase-41 columns, a cap
event and an equal value coincide; CAS operands emitted; the 1200-analog row
classified as unambiguous contract correction; post-audit drift (120 → 90)
CAS-refused and reported; pre-images (100, 1200) captured per batch;
corrections applied (100 → 500, 1200 → 800) with `screenings_used` untouched;
packet caps seeded only from contract values (100; and 100 + 10 reserve as
`overage_cap` with fail-closed `pause_at_cap`); no packet row without an
authoritative packet value; second backfill run a no-op; re-audit clean;
rollback restored exact pre-images, refused a post-backfill edit (999), and
refused to run at all without an explicit batch label.

## Items 6 and 7 — packet accounting scope and the zero_charge guard

Verified against a real cluster with phases 49+50 applied (Section B of the
harness), alongside the branch's own verifiers, all green on this base:
`verify-rcap-packet-delivery-db` (19 cases), `verify-rcap-mutation-authority`
(forgery battery), `verify-rcap-render-job-contract` (SQL/TS parity).

- **Scope**: the consumption unit is
  `sha256(partner_id : entitlement_id : person_id : matter_id)` — recomputed
  independently in the harness and matched against the ledger row
  (`unit_hash_parity: true`). The entitlement id carries program and period
  separation (one active row per partner and `entitlement_scope`; expired
  periods keep their history). Same person + same matter finalized twice:
  `already_consumed`, no second ledger row. New matter: new unit, `consumed`;
  `packet_entitlement_balance` counted exactly 2. A consuming ledger row
  without `matter_id` violates
  `packet_credit_ledger_consuming_identity_check` even with the mutation
  authority forged, and a sponsored job cannot be enqueued at all without
  person + matter (`packet_render_jobs_partner_identity_check`).
- **zero_charge**: reachable only when `partner_id is null` on the job
  (consumer-paid path), recorded with no partner and no entitlement attached.
  A partner-sponsored job whose entitlement lookup finds **no row** finalizes
  as `unauthorized` / `accounting_blocked` with **zero** ledger rows, and the
  delivery route's `record_packet_delivery_event` refuses the job
  (`not delivery-eligible`). An **expired-only** entitlement behaves
  identically. So a missing entitlement can never produce a free
  (`zero_charge`) delivery: it produces a visible block.

```json
{
  "missing_entitlement": "unauthorized",
  "expired_entitlement": "unauthorized",
  "consumer_job": "zero_charge",
  "unit_hash_parity": true,
  "same_matter_retry": "already_consumed",
  "new_matter": "consumed"
}
```

## What remains queued for Roger's window (unchanged from the plan)

1. Apply phases 49+50 (already `authorized` / `authorized_scoped` in
   `data/rcap-authorization-queue.json`; staging and production application
   still queued).
2. Load `rcap_audit_authority` from the contract of record, then run
   `scripts/rcap-audit-screenings-allowed.sql` read-only; record the JSON and
   the production affected/ambiguous counts.
3. Roger reviews; the operator copies each approved row's `cas_operand` into
   `audited_wrong_value`.
4. `set rcap.backfill_batch_label = '<window label>';` then run
   `scripts/rcap-backfill-screenings-allowed.sql`; keep the exception report.
5. Re-run the audit read to confirm zero remaining unambiguous mismatches.
6. Rollback, if ever needed:
   `set rcap.backfill_batch_label = '<window label>';` then
   `scripts/rcap-rollback-screenings-allowed.sql`.
