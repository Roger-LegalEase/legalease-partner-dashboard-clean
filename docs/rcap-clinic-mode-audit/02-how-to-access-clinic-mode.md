# How to access Clinic Mode

## Clinic Mode URLs

| User | URL | Current result |
| --- | --- | --- |
| LegalEase operator setup | `NO CURRENT ROUTE` | **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-001](./gap-register.md#clinic-p1-001) |
| Partner administrator | `NO CURRENT ROUTE` | **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-001](./gap-register.md#clinic-p1-001) |
| Clinic staff | `NO CURRENT ROUTE` | **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-003](./gap-register.md#clinic-p1-003) |
| Participant clinic entry | `NO CURRENT ROUTE` | **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-001](./gap-register.md#clinic-p1-001) |
| Follow-up queue | `NO CURRENT ROUTE` | **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-004](./gap-register.md#clinic-p1-004) |
| Event reporting | `NO CURRENT ROUTE` | **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-005](./gap-register.md#clinic-p1-005) |
| Shared-device reset | `NO CURRENT ROUTE` | **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P0-001](./gap-register.md#clinic-p0-001) |

## Adjacent general-partner URLs

These are not Clinic Mode:

- LegalEase partner record: `/internal/partners/admin/[partnerSlug]` (`internal_admin`).
- LegalEase general onboarding: `/internal/partners/onboarding/[partnerSlug]` (`internal_admin`, onboarding flag).
- Partner dashboard: `/partner/dashboard` (active `partner_admin` or `partner_staff`).
- Generic access codes: `/partner/access-codes` (UI requires `partner_admin`).
- Team accounts: `/partner/team` (`partner_admin`).
- Approved resources: `/partner/onboarding/resources` (`partner_admin`, onboarding/launch-prep flags).
- Public partner page: `/p/[partnerSlug]`.
- Ordinary partner intake: `/intake/[partnerSlug]` after participant account creation/sign-in.
- Participant Briefcase: `/briefcase`.

Do not try to reveal Clinic Mode by toggling a hidden flag: no Clinic Mode flag or route exists. Exact route evidence is in [access-map.json](../../data/rcap-clinic-mode-audit/access-map.json).
