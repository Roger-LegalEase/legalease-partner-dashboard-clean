# screenings_allowed Correction: Audit Design and Backfill Plan

The defect: `configurePacketCap` (introduced in `aad3b3e5`, phase 42, merged to
main 2026-07-09) upserted the **packet cap** into
`partner_entitlement.screenings_allowed`, silently overwriting the partner's
screening capacity with a packet number. Fixed on the unification branch: the
writer and readers now use `partner_packet_entitlement`.

## Did the defective code execute against a persistent environment?

Code-history and deployment evidence, assessed now (schema-level analysis only;
no production row was read):

1. The defect is in main since **2026-07-09** (`aad3b3e5`).
2. The last recorded production deploy is **July 18** (manual CLI push, per the
   production audit), which is after the merge — so the defective writer was
   plausibly deployed.
3. The defective upsert names `overage_enabled`, `overage_packet_price_cents`
   and `pause_at_cap`. Per the production evidence of record, those columns do
   **not** exist in production `partner_entitlement` (phase 41 is a file-only
   migration). PostgREST rejects an upsert naming a nonexistent column, the
   code throws `write_failed`, and **no row is written**.
4. Conclusion: the probability that an overwrite persisted in production is
   low — the missing phase-41 columns acted as an accidental guard — but this
   is an inference from schema absence, not proof. The We Must Vote row's
   `screenings_allowed = 1200` more plausibly came from the internal allowance
   admin path (`rcap-entitlement-admin`). Row-level confirmation is queued, not
   assumed.

## Machine-readable audit (design)

`scripts/rcap-audit-screenings-allowed.sql` emits one JSON row per partner:

| Field | Source |
|---|---|
| `partner_record` | `partner_records.id` + slug (slug for display only) |
| `entitlement_scope` | `'screenings'` (the audited table) |
| `current_screenings_allowed`, `current_screenings_used` | `partner_entitlement` |
| `authoritative_screening_allocation` | the partner's contract of record (Roger/Faith supply; for We Must Vote the resolved ruling records the screenings figure as **wrong at 1200** and corrected by the accounting migration) |
| `authoritative_packet_allocation` | signed contract (We Must Vote: **100** + 10 reserve) |
| `phase41_columns_present` | information_schema check — decides whether the defective writer could ever have committed |
| `packet_cap_write_possible` | true only if phase-41 columns exist AND `partner_onboarding_audit` shows a `partner_packet_cap_configured` event after July 18 |
| `overwrite_occurred` | `packet_cap_write_possible AND current_screenings_allowed = audited packet_cap value` |
| `proposed_correction` | restore authoritative screening allocation; packet capacity moves to `partner_packet_entitlement` |
| `unresolved_ambiguity` | set when no authoritative value exists or signals conflict |

**Never inferred:** packet capacity from `screenings_allowed` alone. A row
without an authoritative source lands in the exception report, untouched.

## Deterministic backfill (design, execution queued)

```sql
-- scripts/rcap-backfill-screenings-allowed.sql (template; values supplied per
-- audited row from the authoritative-source column, never computed in place)
begin;
  update public.partner_entitlement
  set screenings_allowed = :authoritative_screening_allocation
  where partner_slug = :partner_slug
    and screenings_allowed = :audited_wrong_value;  -- CAS: refuses drifted rows
  -- rollback capture:
  -- insert into rcap_audit_rollback select * from partner_entitlement where partner_slug = :partner_slug;
commit;
```

- **Exception report:** any row where the CAS predicate fails, or
  `unresolved_ambiguity` is set, is skipped and listed. No ambiguous row is
  ever changed automatically.
- **Rollback:** the pre-image of every touched row is captured to a rollback
  table before the update; rollback SQL is the inverse update from that
  capture.
- **Deployment order:** (1) apply phases 49+50 to the environment; (2) run the
  audit read; (3) Roger reviews the JSON; (4) run the backfill for unambiguous
  rows only; (5) re-run the audit to confirm zero remaining mismatches.
- **Version compatibility:** old code reading `partner_entitlement` sees only
  corrected screening numbers (its own domain); new code reads packet capacity
  from `partner_packet_entitlement`, which the backfill seeds from the contract
  values, so both versions are correct throughout the rollout.

## Row-level evidence record (Session C)

The queued audit read had a defect that would have failed it at execution time:
it read from `partner_onboarding_audit`, a table that exists in no migration.
The corrected read sources cap-configure events from `rcap_record_events` as
the onboarding writer actually records them, adds an event-sink availability
probe to the ambiguity rule, and emits each row's CAS operand. The concrete
backfill and rollback scripts now exist
(`scripts/rcap-backfill-screenings-allowed.sql`,
`scripts/rcap-rollback-screenings-allowed.sql`), with the ambiguity exclusion
made structural rather than procedural. All of it is fixture-proven on three
schema variants by `scripts/verify-rcap-screenings-allowed-audit.mjs`; the
evidence, counts and remaining queued steps are in
`docs/RCAP_SCREENINGS_ALLOWED_ROW_EVIDENCE.md`.

## Execution boundary

Schema-level and code-history analysis: **done above**. Row-level reads against
production or staging execute only as a queued authorized read in Roger's
window, or against an export he supplies. Queued as audit item A2-audit in
`data/rcap-authorization-queue.json`'s narrative companion.

## The exact read-only production command (prepared, not executed)

`scripts/rcap-audit-screenings-allowed.sql` **cannot** run read-only against
production. It left-joins `public.rcap_audit_authority`, the contract-of-record
table an operator loads before a correction run; that table does not exist in
production, and a read-only session cannot create it — PostgreSQL refuses
`CREATE TABLE` in a read-only transaction, including for `TEMP` tables. That was
verified on a real cluster rather than assumed.

So the production observation runs from a separate file,
`scripts/rcap-audit-screenings-allowed-readonly.sql`: a single `SELECT` that
needs no authority table and writes nothing.

```sh
# Roger's window. RCAP_AUDIT_READONLY_URL must point at a role with SELECT and
# nothing else. No credential for it exists in any agent workspace.
psql "$RCAP_AUDIT_READONLY_URL" -X --no-psqlrc -v ON_ERROR_STOP=1 -A -t \
  -c 'select to_regclass('"'"'public.rcap_record_events'"'"')  as record_events_present,
             to_regclass('"'"'public.partner_entitlement'"'"') as partner_entitlement_present'

# If either preflight value is null, stop and record why. Otherwise:
psql "$RCAP_AUDIT_READONLY_URL" -X --no-psqlrc -v ON_ERROR_STOP=1 -A -t \
  --single-transaction \
  -c 'set transaction read only' \
  -f scripts/rcap-audit-screenings-allowed-readonly.sql \
  -o artifacts/screenings-allowed-production-audit.json
```

The read-only file deliberately proposes **no corrections**. A correction
proposal needs the authoritative value, and this file has no access to one; the
comparison against the contract of record happens offline, against the JSON it
emits. What it does establish per partner is the current value, the `cas_operand`
a later backfill must compare-and-swap against, whether the phase-41 columns
exist, whether the event sink could record a cap-configure event at all, and an
`evidence_quality` verdict carrying the corrected evidence rule: where the sink
was unavailable, the absence of an event proves nothing and the row reads
`sink_unavailable_absence_proves_nothing`.

That the file runs to completion inside `set transaction read only` with no
authority table present, and creates nothing, is asserted in
`scripts/verify-rcap-screenings-allowed-audit.mjs` (V2-ro) rather than claimed
here.

**Not executed.** No production credential exists in this environment by design,
and the environment has not been confirmed. The command above is prepared for
Roger's window and waits there.

### Fixture counts are not production counts

Every number in `docs/RCAP_SCREENINGS_ALLOWED_ROW_EVIDENCE.md` comes from
sanitized fixtures on throwaway clusters. They prove the mechanics — detection,
CAS, structural ambiguity exclusion, rollback — and they say nothing about how
many production partners are affected. That number is unknown until the read
above runs, and the persistent-environment audit stays queued until it does.
