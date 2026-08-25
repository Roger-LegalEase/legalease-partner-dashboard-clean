# Lane E — Nationwide Clinic Mode

- Branch: `sprint/20260825-clinic`
- Base: `07675789a80e732d2b835c1e8ba2092b39201b79`
- Status: Batch 3 complete; Batch 4 pending
- Scope: Dedicated Clinic Mode namespace only; no shared-file, DTC, live route, production, or migration-ledger changes.

## Checkpoints

- [x] Batch 1 — schema/RLS
- [x] Batch 2 — event/staff/admin routes
- [x] Batch 3 — assisted participant/reset/queue
- [ ] Batch 4 — accounting/reporting/tests

## Current evidence

- Existing audit `7595810aee0041830a49642558bc57919d89caaf` reviewed.
- Audit baseline: `CLINIC_MODE_UNSAFE`; no dedicated Clinic Mode existed at sprint base.
- Batch 1 migrations: `20260825120000_clinic_mode_core.sql`, `20260825121000_clinic_mode_security.sql`.
- Batch 1 verifier: `node scripts/clinic-mode/verify-schema-rls.mjs` — PASS in isolated PGlite; no external database used.
- Security evidence: 10/10 Clinic tables have RLS; authenticated roles have no direct INSERT/UPDATE/DELETE; partner A/B, participant A/B, and internal-admin isolation matrix passed.
- Accounting evidence: first reservation `reserved`, replay `already_reserved`, premature finalize `artifact_not_validated`, validated finalize `consumed`, replay `already_consumed`, referral route `no_credit_route`.
- Batch 2 routes: `/internal/clinic`, `/internal/clinic/[eventId]`, `/partner/clinic`, `/partner/clinic/[eventId]`, `/api/clinic/events`, `/api/clinic/events/[eventId]`, `/staff`, and `/access-codes`.
- Batch 2 verifier: `node scripts/clinic-mode/verify-admin-routes.mjs` — PASS.
- Batch 3 routes: `/clinic/[eventSlug]`, `/clinic/[eventSlug]/assist`, `/clinic/[eventSlug]/screening/[state]`, `/clinic/staff/[eventId]/queue`, `/api/clinic/entry`, `/api/clinic/assistance/start`, `/api/clinic/session/reset`, and `/api/clinic/events/[eventId]/queue`.
- Assisted intake is bound to the authenticated participant and an opaque HttpOnly event-entry cookie; no participant identity or authorization secret is accepted from local storage, session storage, or a route parameter.
- `End clinic session / Reset device` ends the server-side assisted session, signs out the participant, expires Clinic cookies, clears browser storage/caches/service workers, replaces history, and handles Back/forward cache restoration fail-closed.
- Batch 3 verifier: `node scripts/clinic-mode/verify-assisted-session.mjs` — PASS.
- Shared-device evidence: ten sequential synthetic participants in one simulated browser profile retained zero prior identity, matter, Briefcase, packet, upload-preview, or form-value state.
- Expanded RLS evidence: participant A can read only their active assisted session; participant B cannot; event-A staff cannot access event-B cases/sessions; partner tenant B cannot access tenant-A cases/sessions; direct participant matter rebinding and staff court-verification forgery are denied.
- Focused compile after Batch 3: `tsc -p tsconfig.clinic-mode.json --noEmit` — PASS.
- Repository-wide compile is not claimed: it stops in pre-existing content editor files because the available dependency tree lacks `@tiptap/*`; no Clinic Mode type errors were reported, and lane E did not modify package manifests.
