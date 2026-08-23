# RCAP Clinic Mode Phase B correction prompt

Use Codex GPT-5.6 Sol with high reasoning effort.

## Exact branch and base

- Create branch: `codex/rcap-clinic-mode-phase-b`
- Create it from exact product base SHA: `dd93579871962260b12918e54c44cf9bf1e81529`
- Phase A evidence branch: `codex/rcap-clinic-mode-audit`
- Do not deploy, merge, change production data, run live migrations, change live secrets, or modify live legacy routes.

## Objective

Implement a safe, event-native Clinic Mode and close exactly these audited gaps: CLINIC-P0-001, CLINIC-P0-002, CLINIC-P0-003, CLINIC-P0-004, CLINIC-P1-001, CLINIC-P1-002, CLINIC-P1-003, CLINIC-P1-004, CLINIC-P1-005, CLINIC-P1-006, CLINIC-P1-007, CLINIC-P1-008, CLINIC-P1-009, CLINIC-P1-010, CLINIC-P1-011.

## Required correction order

1. Fix P0 report authorization immediately: require authenticated server-derived tenant scope for both report endpoints and prohibit live use of seed data.
2. Fix screening ownership: bind pre-auth session to one-time handoff and authenticated participant; reject UUID-only save, claim and sponsorship.
3. Fix packet accounting: reserve/authorize before generation and release the artifact only with one atomic included/overage ledger result; define and test no-overage/cap compensation.
4. Build canonical event model, tenant/event consistency constraints, lifecycle, approved event staff membership, incident/closeout, event allocation and attribution.
5. Build explicit assisted-intake consent and automatically expiring staff assistance without transferring participant account/matter ownership.
6. Build shared-device **End clinic session / Reset device** with server revocation, logout, storage/cache/history/bfcache/autofill-safe transition and audit event.
7. Build participant follow-up queue and truthful event reporting.
8. Generate event QR/code assets only for published events and rehearse all synthetic fixtures.

## Exact owned paths

- `supabase/phase-57-rcap-clinic-events.sql`
- `supabase/migrations/20260824010000_rcap_clinic_events.sql`
- `src/lib/rcap/clinic/**`
- `src/app/internal/partners/admin/[partnerSlug]/clinics/**`
- `src/app/api/internal/partners/[partnerSlug]/clinics/**`
- `src/app/partner/clinics/**`
- `src/app/api/partners/clinics/**`
- `src/app/clinic/[eventCode]/**`
- `src/app/api/clinic/**`
- `src/app/api/partner-reports/final/route.ts`
- `src/app/api/partner-reports/weekly/route.ts`
- `src/app/api/partners/access-codes/route.ts`
- `src/app/api/partners/access-codes/toggle/route.ts`
- `src/app/api/partners/access-mode/route.ts`
- `src/app/api/expungement-ai/screening/save-resume/route.ts`
- `src/app/api/expungement-ai/screening/pending/route.ts`
- `src/app/api/expungement-ai/screening/pending/claim/route.ts`
- `src/app/api/expungement-ai/packet/generate/route.ts`
- `src/lib/expungement-ai/screening-resume-service.ts`
- `src/lib/expungement-ai/briefcase.ts`
- `src/lib/expungement-ai/rcap-slot-lifecycle.ts`
- `tests/e2e/rcap-clinic-mode/**`
- `scripts/verify-rcap-clinic-mode-*.mjs`
- `docs/rcap-clinic-mode/**`

## Prohibited paths/actions

- Do not change the legacy Mississippi, Illinois, District of Columbia, Pennsylvania or Texas-Harris generator behavior/routes.
- Do not change Stripe live-mode behavior, Supabase RLS/auth/session logic in production, production environment variables/secrets or production records without Roger approval.
- Do not modify Expungement.ai visual redesign scope, all-50 forms/PDFs/state packs, or unrelated partner/onboarding flows.
- Do not apply migrations outside an isolated local database or the explicitly authorized synthetic staging project.
- Do not use shared staff credentials or invent an uncontrolled permanent clinic role.

## Exact migration decisions

Create canonical `rcap_clinic_events`, `rcap_clinic_event_staff`, `rcap_clinic_assistance_sessions`, `rcap_clinic_assistance_consents`, `rcap_clinic_follow_ups`, `rcap_clinic_incidents`, and an append-only `rcap_clinic_credit_ledger`. Add non-null/validated event attribution at the appropriate handoff to screening sessions, consumer matter/Briefcase items, packets, analytics and follow-up. Add participant owner or one-time pre-auth handoff binding to screening sessions. Add tenant/event consistency constraints, indexes, RLS and service-role-only mutation RPCs. Preserve current partner roles; event_staff must reference existing personal accounts and expire/revoke per event. No migration is optional for P0/P1 completion.

## Exact synthetic fixtures

- Partner slug: `clinic-audit-phase-b`
- Program name: `RCAP Clinic Audit Synthetic Program`
- Event name: `RCAP Clinic Audit 2026-09-15`
- Event code: `CLINIC-AUDIT-2026`
- Venue: `Synthetic Community Center, 100 Test Way`
- Timezone: `America/Chicago`
- Starts: `2026-09-15T09:00:00-05:00`
- Ends: `2026-09-15T17:00:00-05:00`
- Geography: Mississippi; Hinds County; out-of-area policy referral
- Partner admin: `clinic-admin@example.invalid`
- Staff: `clinic-staff-1@example.invalid`, `clinic-staff-2@example.invalid`
- Viewer-negative fixture: `clinic-viewer@example.invalid`
- Other tenant: `clinic-other-tenant@example.invalid`
- Participants: `clinic-audit-p01@example.invalid` through `clinic-audit-p10@example.invalid`
- Invalid-state fixtures: code `CLINIC-EXPIRED-2026`, `CLINIC-EXHAUSTED-2026`, `CLINIC-DISABLED-2026`
- Outcomes: sponsored supported packet, non-sponsored supported packet, incomplete follow-up, guidance-only, unsupported/referral
- Use packet dry-run worker and email capture; never create a real payment or send real email.

## Exact acceptance tests

- `tests/e2e/rcap-clinic-mode/internal-event-crud.spec.ts`: internal operator creates, previews, publishes, pauses, closes and archives exact fixture event.
- `tests/e2e/rcap-clinic-mode/partner-admin.spec.ts`: admin edits allowed fields/downloads QR/manages event staff; staff/viewer/other tenant denied server-side.
- `tests/e2e/rcap-clinic-mode/assisted-consent.spec.ts`: explicit accept/decline, timestamp, staff identity, participant ownership and post-session denial.
- `tests/e2e/rcap-clinic-mode/shared-device.spec.ts`: one persistent browser profile, participants p01-p10 sequentially; after every reset inspect cookies, localStorage, sessionStorage, IndexedDB, caches, service workers, autofill-visible fields, upload previews, URL/history and Back/Forward; participant N+1 sees no prior PII/answers/files/result/matter/Briefcase/packet/follow-up.
- `tests/e2e/rcap-clinic-mode/save-resume.spec.ts`: save on device A, resume on device B; wrong email/user, used handoff and other participant denied.
- `tests/e2e/rcap-clinic-mode/sponsorship-accounting.spec.ts`: valid/invalid/expired/exhausted/disabled; one successful sponsored packet exactly one ledger row; incomplete/guidance/failure/retry/re-download zero extra; cap/no-overage produces no artifact; source-session replay by another account denied.
- `tests/e2e/rcap-clinic-mode/follow-up-reporting.spec.ts`: statuses, assignment, due date, contact method, filters, history and aggregate distinctions; event/partner/other-tenant isolation.
- `tests/e2e/rcap-clinic-mode/report-api-auth.spec.ts`: anonymous, staff without export, revoked and other tenant denied; own admin/internal authorized; seed output impossible outside test/dev.
- `scripts/verify-rcap-clinic-mode-schema.mjs`: constraints, FKs, indexes, RLS, grants and audit immutability.
- `scripts/verify-rcap-clinic-mode-no-sensitive-storage.mjs`: fail on answer/file/result/PII Web Storage or reset omissions.
- `scripts/verify-rcap-clinic-mode-product-boundary.mjs`: prove no legacy generator/route behavior changed.

## Completion gate

All P0/P1 gaps must have passing static, database and browser evidence. The ten-participant test must pass 10/10 with zero leakage. Sponsorship must fail closed when event/session/user/credit bindings disagree. Reports must be tenant/event scoped and truthful. Update every Phase A guide with exact final routes/buttons. Stop at `READY_FOR_SYNTHETIC_REHEARSAL`; do not enable real participants, deploy, or apply production migrations.
