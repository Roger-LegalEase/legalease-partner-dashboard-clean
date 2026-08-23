# What was actually built

Tested against `dd93579871962260b12918e54c44cf9bf1e81529`. Overall verdict: **CLINIC_MODE_UNSAFE**.

There is no dedicated Clinic Mode. What exists is a collection of adjacent general-partner capabilities:

- Partner onboarding can label a program **Clinic** or **Event**, collect program-level dates/geography/access/support plans, and generate approval artifacts. It is behind `RCAP_PARTNER_ONBOARDING_ENABLED` and `RCAP_ONBOARDING_LAUNCH_PREP_ENABLED`.
- The general launch kit can generate a QR to `/p/[partnerSlug]`; code marks the destination unpublished and the QR has no event identity or event code.
- Partner admins have a generic **Access codes** page at `/partner/access-codes`. Codes can be shared, limited-use, single-use, disabled, expired or exhausted and may carry a free-text campaign name.
- The ordinary participant path is `/p/[partnerSlug]` → **Start your record-clearing screening** → create account/sign in → `/intake/[partnerSlug]` → Wilma screening → Briefcase.
- Generic partner screening attribution stores partner slug, access-code ID, campaign name and source; it does not store a clinic event.
- Generic save/resume, participant-owned Briefcase, sponsored packet bypass, partner-wide packet accounting and aggregate dashboard metrics exist.
- Only permanent roles `partner_admin`, `partner_staff`, and `internal_admin` exist. There is no uncontrolled permanent clinic role.

The dedicated event model, event staff, assistance consent, temporary staff access, device reset, participant follow-up queue, clinic reporting, incident flow, event capacity, and end-of-day workflow are absent. See [implementation inventory](../../data/rcap-clinic-mode-audit/implementation-inventory.json) and [gap register](./gap-register.md).

The generic surfaces are not safe substitutes. A caller-supplied screening UUID is not participant-bound; the report API has a tenant-authorization defect; and packet generation can finish before an accounting failure is evaluated.
