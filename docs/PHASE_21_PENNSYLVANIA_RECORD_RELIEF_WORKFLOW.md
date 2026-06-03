# Phase 21: Pennsylvania Record Relief Workflow

Phase 21 adds Pennsylvania as a supported RCAP document jurisdiction without replacing Mississippi, Illinois, or DC.

User journey:

Partner page -> Wilma -> possible pathway -> Pennsylvania form -> save progress -> generate draft packet -> Briefcase -> filing instructions.

Implemented boundaries:

- RCAP remains independent of consumer-facing Expungement.ai.
- RCAP users remain under `/intake/[partnerSlug]`, `/documents/[partnerSlug]`, and Briefcase packet routes.
- Wilma uses safe language: may, possible pathway, based on what you shared, more information may be needed, and record review may help.
- Pennsylvania conviction relief is not labeled expungement when the generated pathway is limited access / sealing or Clean Slate verification.
- Automatic Clean Slate relief is described as something that may apply and should be verified with PATCH, not as completed relief.

Source materials:

- `reference/pennsylvania/Pennsylvania-Expungement-Sealing-Agent-Reference.pdf`
- `reference/pennsylvania/pa-petition-expungement-790.html`
- `reference/pennsylvania/222612-petitionforexpungement790030912-000077.pdf`

Verification:

- `npm run partners:verify-source-materials`
- `npm run partners:verify-pennsylvania-document-generator`
