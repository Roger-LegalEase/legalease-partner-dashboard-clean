# Nationwide Clinic Mode Implementation Plan

> Scope authority: `../legalease-sprint-control/AUTHORITY/05_CODEX_E_NATIONWIDE_CLINIC_MODE.md`

## Goal

Ship a dedicated, tenant-authorized Clinic Mode that binds event access, participant-owned matters, temporary staff assistance, shared-device reset, packet accounting, follow-up, incidents, and aggregate reporting to the existing nationwide RCAP engine.

## Architecture

Clinic Mode is an additive namespace. PostgreSQL remains the authority for event lifecycle, event staff, consent, participant ownership, attribution, queue state, follow-up, audit history, and exactly-once packet reservations. Next.js server services derive partner and participant identity from authenticated sessions and call narrow RPCs; client components never receive service-role credentials or payment mutation authority. Dedicated `/internal/clinic`, `/partner/clinic`, `/clinic`, and `/api/clinic` routes reuse the existing partner, Briefcase, screening, and packet foundations without changing ordinary DTC routes.

## Delivery batches

### Batch 1 — Schema and RLS

- Add `scripts/clinic-mode/verify-schema-rls.mjs` first and confirm it fails against the absent migration contract.
- Add additive migrations for canonical events, staff, event codes, assisted sessions and consent, participant-owned cases, follow-up, incidents, immutable audit history, event packet reservations, RLS, grants, and security-definer RPCs.
- Verify every table has RLS, browser roles cannot mutate accounting, cross-tenant predicates derive identity from `auth.uid()`, and every function has an explicit search path and restricted grants.
- Update `STATUS_E.md`, commit only batch files, and push.

### Batch 2 — Event, staff, and administration

- Add `scripts/clinic-mode/verify-admin-routes.mjs` first and confirm the dedicated route/service contract is absent.
- Create Clinic domain types, validation, repository/service boundaries, and authorization errors under `src/lib/clinic-mode/`.
- Add internal and partner event administration routes, event detail, event staff, access-code/QR material, lifecycle controls, and incident history.
- Add focused API and static route verifiers, update status, commit, and push.

### Batch 3 — Assisted participant, reset, and queue

- Add `scripts/clinic-mode/verify-assisted-session.mjs` first and confirm the reset/ownership contract is absent.
- Add event entry, code redemption, explicit assistance consent, participant-owned handoff, staff queue, and participant follow-up routes.
- Add an atomic reset endpoint and client control that revokes assistance, signs out, clears Clinic cookies plus Web Storage/IndexedDB/Cache Storage, replaces history, and installs no-store/bfcache protections.
- Run the ten-participant same-profile verifier, update status, commit, and push.

### Batch 4 — Accounting, reporting, nationwide checkpoints, and browser evidence

- Add `scripts/clinic-mode/verify-accounting-reporting.mjs` first and confirm exactly-once/event-reporting assertions fail.
- Wire Clinic cases to existing render jobs through immutable matter/session/event identity and reserve/finalize/release packet credit only at validated artifact finalization. Automatic, no-filing, referral, and failed-generation routes remain zero-credit.
- Add tenant-authorized aggregate reporting and participant-safe communication state.
- Exercise Colorado, Mississippi, and Wisconsin through the same state-agnostic handoff; verify desktop/mobile route contracts, authorization denials, and all focused Clinic scripts.
- Update status, commit, push, and report branch/head/migrations/routes/results/blockers.

## Non-goals and safety boundaries

- No package or lockfile, workflow, migration ledger, shared resolver, production environment, live Supabase, DTC behavior, or legacy-generator changes.
- No fake fixtures, hardcoded state outcomes, client-authored sponsorship, payment, entitlement, county, or court authority.
- No participant detail in event reporting aggregates.
