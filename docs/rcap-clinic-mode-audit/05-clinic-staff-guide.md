# Clinic staff guide

Clinic staff must not operate the current product on a shared device with real participants.

There is no clinic dashboard, event identity check, staff assignment, assisted-intake consent, temporary assistance grant, incomplete-participant list, follow-up action, legal escalation action, packet confirmation, **End clinic session**, or **Reset device** control. **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P0-001](./gap-register.md#clinic-p0-001)

The only staff identity available is a personal, permanent partner account (normally `partner_staff`) invited through `/partner/team`. Do not share credentials. A staff member may view general aggregate partner dashboard counts at `/partner/dashboard`, but there is no approved participant-level clinic access.

Do not:

- sign a participant into a browser that will be handed directly to the next participant;
- use the staff account as the participant account;
- save participant answers under a staff email;
- copy a screening `session` UUID between accounts;
- treat a campaign code or ordinary partner QR as Clinic Mode;
- promise that a packet was sponsored or counted until the P0 accounting defects are fixed.

Day-of workflow: **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-010](./gap-register.md#clinic-p1-010).
