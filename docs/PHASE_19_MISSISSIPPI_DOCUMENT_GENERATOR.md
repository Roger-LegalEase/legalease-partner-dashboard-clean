# Phase 19: Mississippi RCAP Document Generator

## What This Adds

Phase 19 adds a Mississippi-only RCAP document-preparation foundation for LegalEasePartner.com. It maps completed Wilma intake sessions to a petition information form, save-and-resume inputs, draft Mississippi petition packet preview, User Briefcase foundation, filing notes, county/court instructions, and safety disclaimer.

## Why Mississippi Only

The product direction for Phase 19 is Mississippi-only. This avoids creating a generic national document generator before Mississippi pathways, templates, safety language, and local-procedure warnings are complete.

## Source Materials

Reference files should live at:

- `docs/reference/mississippi/Mississippi-Expungement-Agent-Reference.pdf`
- `docs/reference/mississippi/ms-expungement-petitions.html`

If the PDF or original HTML is unavailable in the working tree, use `docs/reference/mississippi/README.md` as the placement instruction.

## Core User Flow

Wilma chat -> possible pathway -> petition information form -> save progress -> generate draft packet -> saved to your Briefcase -> filing instructions.

## Pathway Mapping

- Dismissed / Non-Conviction: Petition for Dismissal and Expungement of Criminal Record.
- Misdemeanor Conviction: Petition for Expungement of Criminal Record.
- Felony Conviction: Petition for Expungement of Criminal Record of Criminal Conviction.

If answers are unclear, the generator returns "More information needed" and recommends record review.

## Required and Missing Fields

All drafts need petitioner name, court county, court type, cause number, charge, case outcome/pathway, and known case dates or agency details where available. Conviction paths also need conviction date, sentence completion, balance/payment information, and pathway-specific screening.

Missing fields are shown plainly and are not faked.

## Save And Resume

The petition information form saves progress through `rcap_document_packet_inputs`. Generated packets can be associated with `rcap_briefcase_items` so the user can return later from their Briefcase.

## Briefcase

Briefcase is the user-facing individual workspace name. It is separate from Partner Dashboard. Phase 19 adds `/briefcase`, `/briefcase/[packetId]`, `/sign-in`, and `/sign-out` placeholders. Production auth must be connected before private Briefcase items are displayed.

## Sign-In And Security Foundation

This phase does not add OAuth or a paid auth provider. It adds auth-ready route structure, user-scoped packet fields, server-side validation, timestamped packet/Briefcase tables, and no SSN/DOB collection.

## CAPTCHA Readiness

CAPTCHA is Cloudflare Turnstile-ready and disabled by default for local/dev.

Optional environment variables:

- `ENABLE_RCAP_CAPTCHA=false`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY=`
- `TURNSTILE_SECRET_KEY=`

When `ENABLE_RCAP_CAPTCHA=true`, intake start and document creation routes require verification. CAPTCHA secrets are server-only and must not be printed.

## SSN

SSN is not collected in Phase 19. If a template requires SSN later, the preview renders `[SSN TO BE ADDED BY PETITIONER IF REQUIRED]`.

DOB is not required in Phase 19. If a template needs DOB later, the preview renders `[DOB TO BE ADDED BY PETITIONER IF REQUIRED]`.

## Draft Only

Document output is a draft/preparation aid. It does not provide legal advice, does not guarantee eligibility or outcomes, and does not say the petition is ready to file without review.

## Filing Notes

The preview tells users to file in the court of origin, confirm court and county, attach records when available, expect a generally predictable $150 statutory filing fee per petition, and check for variable clerk/copy/retrieval costs. Felony conviction petitions include district attorney notice language.

County/court instruction output supports general statewide guidance plus court type reminders for Circuit Court, County Court, Justice Court, and Municipal Court. It does not invent clerk addresses or county-specific fees.

## Local Variation

Local court practice can vary. Current law and local procedure should be verified before filing.

## Commands

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run partners:verify-mississippi-document-generator`

If `supabase/phase-19-mississippi-document-generator.sql` has not been applied, apply it in Supabase SQL Editor before final live packet verification.

## Not Yet Built

- Other states
- Production user auth provider
- Real CAPTCHA enforcement in production
- Final PDF generation library
- Document upload
- E-signature
- Attorney/legal review workflow
- Command Center integration
- Full RLS policies
- Production auth hardening
- CRM integration
- Analytics/monitoring
