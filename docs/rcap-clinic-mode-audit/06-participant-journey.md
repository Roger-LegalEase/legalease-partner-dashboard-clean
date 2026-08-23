# Participant journey

There is no participant Clinic Mode URL or preregistration journey.

The adjacent ordinary partner path is:

1. Open a published `/p/[partnerSlug]` page.
2. Click **Start your record-clearing screening**.
3. Create an account or sign in. The participant owns this account.
4. Continue to `/intake/[partnerSlug]`.
5. If the partner access mode requires a code, enter it and click **Continue**.
6. Complete the Wilma screening.
7. Use **Save progress** to request an emailed resume link, or save the result to the participant-owned Briefcase.
8. Open `/briefcase` to continue packet information, generate/download a supported packet, or view guidance.

This path does not establish a clinic event, staff assistance, event consent, event follow-up or shared-device reset. Save/resume is not safe as a Clinic Mode control because the session UUID is not participant-bound and the resume handoff temporarily stores answers in `sessionStorage`; see [CLINIC-P0-002](./gap-register.md#clinic-p0-002).

QR clinic entry, event code, clinic attribution, explicit assistance consent, staff session end, clinic follow-up and event reporting: **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-001](./gap-register.md#clinic-p1-001).
