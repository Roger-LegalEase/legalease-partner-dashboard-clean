## Summary

- Adds the Expungement.ai drop-point service-recovery nudge layer using the existing saved screening session, resume token, consent/contact, and Resend email patterns.
- Adds discreet touch-1 field-specific copy, touch-2 pressure-relief copy, one-click nudge opt-out, two-touch idempotency state, and aggregate-only RecordShield demand metrics.
- Adds a migration file for nudge timestamps/claim/opt-out state only; it was not run against live DB.

## Guardrails

- Send eligibility is rechecked atomically at claim time against status, consent/contact, opt-out, cadence, and sent-state before email delivery.
- Sessions that resumed or completed before claim do not send; overnight skips release any claim so the daytime window does not permanently suppress a valid future send.
- No evaluator, payment, result, packet, Stripe, profile JSON, Wilma, auth/session, global shell, or screening question content changes.
- No scheduler or cron was added; the service entry point is ready to be invoked by approved scheduled infrastructure later.

## LegalEase OS Event

- Emits one aggregate-only `screening_nudge_window` product event at the tail of a nudge run, after sends complete.
- The event contains only window-level metrics: dark sessions, touch sends, return rates, and record-readiness dark-driver rate. It includes no PII, no contact, no answers, no eligibility result, and no payment or packet content.
- Event emission fails safe: disabled/misconfigured/HTTP failure paths do not block or retry nudge sends.
- This uses the same `LEGALEASE_OS_EVENTS_*` endpoint/secret/enabled deploy env and HMAC signing contract as existing Expungement.ai product events.
- Prerequisite: the LegalEase OS Command Center/product-event receiver must accept `screening_nudge_window`; that OS-side event-type change is separate and required before the event will be accepted.

## Validation

- `git status --short`
- `npm run typecheck`
- `npm run lint` (passes with existing warnings in `scripts/verify-expungement-track1-dedup-questions.mjs`)
- `npm test`
- `node scripts/verify-expungement-drop-point-nudges.mjs`
- `node scripts/verify-nudge-os-event-emit.mjs`
- `node scripts/verify-all50-internal-preview.mjs`
- `node scripts/verify-all50-handoff.mjs`
- `node scripts/verify-encrypted-pdf-rescue.mjs`
- `npm run expungement:audit-all51-rule-grounded-friction -- --check county_or_filing_location,case_identifier`
- `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=local-anon-placeholder npm run build` (passes; existing `metadataBase` warning only)
