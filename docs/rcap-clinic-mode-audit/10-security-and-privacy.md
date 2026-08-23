# Security and privacy assessment

Verdict: **UNSAFE for real participants and not ready for synthetic rehearsal as Clinic Mode**.

The dedicated shared-device session boundary and reset are **NOT CURRENTLY IMPLEMENTED** — see [CLINIC-P0-001](./gap-register.md#clinic-p0-001).

## P0 findings

1. No product reset/session boundary exists. Persistent auth, URL history, resume `sessionStorage`, autofill and Back/bfcache behavior are not cleared or tested. [CLINIC-P0-001](./gap-register.md#clinic-p0-001)
2. Screening UUIDs are not bound to participant ownership. Public service-role paths allow answer overwrite and sponsorship replay when a UUID is known. [CLINIC-P0-002](./gap-register.md#clinic-p0-002)
3. Final-report generation accepts arbitrary partner ID without authentication and reads through the service role. [CLINIC-P0-003](./gap-register.md#clinic-p0-003)
4. A sponsored packet may be released after the accounting RPC returns `recorded=false`; the route discards the result. [CLINIC-P0-004](./gap-register.md#clinic-p0-004)

## Storage and browser review

- Cookies: Supabase participant auth persists; no clinic reset exists.
- `localStorage`: locale and analytics identifiers found; no screening answers found there.
- `sessionStorage`: full resumed session including answers is written temporarily.
- IndexedDB: no application use found.
- Service worker: none found.
- Browser cache/bfcache: no clinic-specific no-store/pageshow purge; product reset absent.
- URL/history: screening uses `?session=<uuid>`.
- Autofill: sign-in email/password can persist according to browser settings; no clinic hardening.
- Upload/download history: no clinic cleanup; packet download remains in browser/OS history.

## Tenant isolation

General partner RLS and scope helpers are substantial and reject another tenant slug. They do not provide event scope. The report API bypass and the absence of participant/session ownership make the complete Clinic Mode boundary fail.

## Ten participants

The required test is recorded as `FAIL_CLOSED`: ten iterations are `NOT_RUN_NO_CLINIC_SESSION_BOUNDARY`, and zero leakage was not proven. An absent reset is itself an unsafe verdict under the audit contract.
