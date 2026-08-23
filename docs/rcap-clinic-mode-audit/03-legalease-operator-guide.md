# LegalEase operator guide

Clinic event operation is not available today.

1. Sign in as an active `internal_admin`. This general identity is implemented.
2. Open `/internal/partners/admin`, choose a partner, and review generic commercial/provisioning status.
3. Open `/internal/partners/onboarding/[partnerSlug]` only if `RCAP_PARTNER_ONBOARDING_ENABLED=true` and the required onboarding migrations are applied.
4. General onboarding can record **Program model = Clinic**, program dates, geography, out-of-area policy, planned access/capacity, planned users, support/referral contacts, reporting recipients and pause procedures. This does not create a clinic event.
5. If launch prep is enabled, generate/approve the general Partner Launch Kit. Its QR points to `/p/[partnerSlug]`, is marked unpublished by the builder, and does not carry event attribution.

The required operator steps below are unavailable:

- Create/open event; event name/date/time/timezone/location: **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-001](./gap-register.md#clinic-p1-001).
- Set event geography/out-of-area enforcement: **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-001](./gap-register.md#clinic-p1-001).
- Configure an event code and final event QR: **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-007](./gap-register.md#clinic-p1-007).
- Set event capacity/sponsorship pool: **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-008](./gap-register.md#clinic-p1-008).
- Assign approved event staff, referral contact and follow-up owner: **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-003](./gap-register.md#clinic-p1-003) and **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-004](./gap-register.md#clinic-p1-004).
- Preview a participant clinic page and run a synthetic clinic participant: **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-001](./gap-register.md#clinic-p1-001).
- View event reporting: **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-005](./gap-register.md#clinic-p1-005).
- Pause, close or archive an event: **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-010](./gap-register.md#clinic-p1-010).

Do not activate the ordinary partner page or codes as a clinic workaround. Do not use real participants. Do not invoke the report APIs until [CLINIC-P0-003](./gap-register.md#clinic-p0-003) is fixed.
