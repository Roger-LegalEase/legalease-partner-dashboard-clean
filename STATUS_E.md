# Lane E — Nationwide Clinic Mode

- Branch: `sprint/20260825-clinic`
- Base: `07675789a80e732d2b835c1e8ba2092b39201b79`
- Status: Batch 1 complete; Batch 2 pending
- Scope: Dedicated Clinic Mode namespace only; no shared-file, DTC, live route, production, or migration-ledger changes.

## Checkpoints

- [x] Batch 1 — schema/RLS
- [ ] Batch 2 — event/staff/admin routes
- [ ] Batch 3 — assisted participant/reset/queue
- [ ] Batch 4 — accounting/reporting/tests

## Current evidence

- Existing audit `7595810aee0041830a49642558bc57919d89caaf` reviewed.
- Audit baseline: `CLINIC_MODE_UNSAFE`; no dedicated Clinic Mode existed at sprint base.
- Batch 1 migrations: `20260825120000_clinic_mode_core.sql`, `20260825121000_clinic_mode_security.sql`.
- Batch 1 verifier: `node scripts/clinic-mode/verify-schema-rls.mjs` — PASS in isolated PGlite; no external database used.
- Security evidence: 10/10 Clinic tables have RLS; authenticated roles have no direct INSERT/UPDATE/DELETE; partner A/B, participant A/B, and internal-admin isolation matrix passed.
- Accounting evidence: first reservation `reserved`, replay `already_reserved`, premature finalize `artifact_not_validated`, validated finalize `consumed`, replay `already_consumed`, referral route `no_credit_route`.
