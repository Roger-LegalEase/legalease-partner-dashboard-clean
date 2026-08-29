# Lane E — Nationwide Clinic Mode

> **Historical — a previous sprint.** This file records the `sprint/20260825-*` wave from base `07675789`. It is not a status of the current national Grade-A sprint, whose lanes are B through J on `claude/legalease-sprint-captain-utucnw` and are all integrated. Its lane letters are not this sprint's lane letters. Kept as written; nothing here is a live instruction.

- Branch: `sprint/20260825-clinic`
- Base: `07675789a80e732d2b835c1e8ba2092b39201b79`
- Status: Nationwide Clinic Mode complete; Batch 4 verified and pushed
- Scope: Dedicated Clinic Mode namespace only; no shared-file, DTC, live route, production, or migration-ledger changes.

## Checkpoints

- [x] Batch 1 — schema/RLS
- [x] Batch 2 — event/staff/admin routes
- [x] Batch 3 — assisted participant/reset/queue
- [x] Batch 4 — accounting/reporting/tests

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
- Batch 4 migration: `20260825122000_clinic_mode_accounting_reporting.sql`.
- Batch 4 routes: `/partner/clinic/[eventId]/follow-up`, `/partner/clinic/[eventId]/reporting`, `/internal/clinic/[eventId]/follow-up`, `/internal/clinic/[eventId]/reporting`, `/api/clinic/events/[eventId]/follow-ups`, `/api/clinic/events/[eventId]/reporting`, and `/api/clinic/packet-accounting`.
- Packet accounting derives the Clinic case from the authenticated participant plus the authoritative render-job partner and matter. Caller-supplied case, matter, event, tenant, payment, and entitlement identifiers are not accepted as accounting authority.
- Exactly-once evidence: reservation replay converges; the render-job lifecycle trigger automatically finalizes validated/accounted artifacts once; finalization replay returns `already_consumed`; event allocation exhaustion fails closed; released failed jobs can retry only with a new authoritative render job.
- Failed-generation evidence: in-flight and retryable failures retain their reservation; the render-job lifecycle trigger automatically releases only a database-verified terminal failure; replay is idempotent; finalization returns `reservation_released`; no ledger binding is created.
- No-credit evidence: Colorado automatic, Mississippi no-filing, and Wisconsin referral synthetic routes all return `no_credit_route` through the same Clinic accounting function.
- Authorization evidence: cross-user participant reservation, cross-matter render binding, cross-tenant render binding, tenant-B follow-up/reporting access, matter rebinding, direct staff accounting writes, and verified court-identity forgery are denied.
- Reporting evidence: aggregate-only database RPC omits participant and matter identities and enforces tenant/event `reporting` permission; follow-up reads and writes enforce event `follow_up` permission and event-owned staff assignment.
- Active-session evidence: staff and participant assisted-session access disappears after the session ends; staff queue RPC returns no ended-session case and refuses its transition, while tenant administrators retain event follow-up oversight; paused events cannot start new assisted sessions.
- Three-state checkpoint: CO, MS, and WI full profiles pass through the shared nationwide `ScreeningFlow`; no checkpoint-state branch exists in Clinic Mode.
- Browser evidence: focused headless Chrome checks passed on 1440×900 desktop and 390×844 mobile entry routes with no horizontal overflow; assistance failed closed to participant sign-in, and unauthenticated queue/follow-up/reporting/accounting routes were denied. The real reset endpoint expired every HttpOnly Clinic and Supabase auth cookie and emitted no-store/Clear-Site-Data, then production reset code cleared localStorage, sessionStorage, IndexedDB, Cache Storage, service-worker registrations, and sensitive history state; browser Back did not restore the prior participant route.
- Batch 4 verifier: `node scripts/clinic-mode/verify-accounting-reporting.mjs` — PASS.
- Browser verifier: `node scripts/clinic-mode/verify-browser.mjs` — PASS using synthetic loopback-only fixtures; no external database or Production system used.
- Final focused compile: `tsc -p tsconfig.clinic-mode.json --noEmit` — PASS.
- Remaining blockers: none in lane E.
