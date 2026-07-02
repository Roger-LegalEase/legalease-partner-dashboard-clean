# Product Flow Source of Truth

These docs are the source of truth for the Expungement.ai direct-to-consumer flow and the RCAP partner portal flow:

- [Expungement.ai DTC User Flow](./expungement-ai-dtc-user-flow.md)
- [RCAP Partner Portal User Flow](./rcap-partner-portal-user-flow.md)
- Source PDFs live in [`source-pdfs/`](./source-pdfs/)

Any change to screening, account creation, auth callback, payment, Briefcase, packet builder, partner bypass, or packet generation must preserve these flows or update these docs and verifiers in the same PR.

## Durable Rules

- DTC and partner use the same underlying RCAP / Expungement.ai engine but differ in payment and account handoff.
- DTC requires Stripe before packet generation.
- partner-covered users bypass Stripe.
- no account wall before the free check.
- no duplicate screening after signup.
- Screening answers must carry into the created account or session.
- No blocking packet generation only because outside paperwork is still needed.
- Outside documents, official forms, court records, certificates, or filing fees belong in next-step guidance unless they are truly required internal packet fields.
