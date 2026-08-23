# Partner administrator guide

There is no partner Clinic Mode surface.

What an active `partner_admin` can use today:

1. Sign in and open `/partner/dashboard`.
2. Use **Manage codes** to open `/partner/access-codes`. These are generic sponsorship/campaign codes, not event records. Fields are access code, campaign, type, maximum uses, expiry and description.
3. Use **Manage team** to open `/partner/team` and invite personal `partner_admin` or `partner_staff` accounts. Never use shared staff credentials.
4. If onboarding flags and approved artifacts exist, open `/partner/onboarding/resources` to download general program materials.
5. View only general aggregate dashboard counts. There is no participant-level clinic queue.

Unavailable operations:

- Create/edit/publish/pause/close a clinic event: **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-001](./gap-register.md#clinic-p1-001).
- Download an event-specific QR/code asset: **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-007](./gap-register.md#clinic-p1-007).
- Assign event-only staff or follow-up owner: **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-003](./gap-register.md#clinic-p1-003).
- View event capacity, follow-up queue, event report or export: **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-004](./gap-register.md#clinic-p1-004) and **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-005](./gap-register.md#clinic-p1-005).

Server-side guardrail defect: a `partner_staff` account can currently call code/access-mode mutation APIs even though the page says admin-only. See [CLINIC-P1-006](./gap-register.md#clinic-p1-006). The system correctly blocks a normal partner account from naming another partner slug in the general scope helper, but unauthenticated final-report access breaks the reporting boundary; see [CLINIC-P0-003](./gap-register.md#clinic-p0-003).
