# Phase 19I: Illinois RCAP Document Generator

## What This Adds

Phase 19I adds an Illinois-only RCAP document-preparation foundation for LegalEasePartner.com. It adds an Illinois state knowledge pack, Illinois Wilma branch, RAP sheet readiness step, expungement/sealing mapper, Illinois form information flow, save-and-resume packet support, Illinois draft packet preview, Briefcase integration, county/circuit court filing notes, and CAPTCHA/security compatibility.

## Why Illinois Only

Illinois has a different decision tree than Mississippi. Illinois focuses on expungement vs. sealing, supervision or qualified probation, sealing exclusions, RAP sheet readiness, and circuit court filing instructions.

## Source Materials

Reference files should live at:

- `docs/reference/illinois/Illinois-Expungement-Sealing-Agent-Reference.pdf`
- `docs/reference/illinois/il-expungement-companion-forms.html`

If the PDF or original HTML is unavailable in the working tree, use `docs/reference/illinois/README.md` as the placement instruction.

## Core User Flow

Wilma chat -> possible pathway -> Illinois form -> save progress -> generate draft packet -> saved to your Briefcase -> county/circuit court filing instructions.

## Illinois Pathway Mapping

- Expungement non-conviction: no charges, dismissed, nolle prosequi, stricken with leave, not guilty, reversed/vacated, factual innocence.
- Expungement supervision or qualified probation: court supervision, 410/710/1410/TASC/Second Chance style completion.
- Sealing conviction: eligible misdemeanor or felony conviction review.
- Excluded or needs review: DUI, domestic battery, order of protection violation, sex offense/registration issue, violent offense, animal cruelty category, or unclear charge mapping.

## RAP Sheet Readiness

Illinois form flow asks whether the user has their Illinois criminal history report, sometimes called a RAP sheet. If not, the packet may be marked as needing more information.

## Document Types

- `illinois_request_to_expungeseal_packet`
- `illinois_case_list`
- `illinois_additional_arrests_expungement`
- `illinois_additional_arrests_sealing`
- `illinois_order_granting_placeholder`
- `illinois_order_denying_reference`
- `illinois_notice_of_filing_placeholder`
- `illinois_fee_waiver_instructions`

## Safety

Output is a draft/preparation aid. It does not provide legal advice, does not guarantee eligibility, expungement, sealing, court acceptance, or outcomes, and does not say the packet is ready to file without review.

## Sensitive Fields

SSN is not collected. If a sensitive identifier is needed later, the draft renders `[SENSITIVE IDENTIFIER TO BE ADDED BY PETITIONER IF REQUIRED]`.

DOB is not required. If an Illinois standardized form needs DOB later, the draft renders `[DOB TO BE ADDED BY PETITIONER IF REQUIRED]`.

## Filing Notes

File in the Illinois Circuit Court county where the arrest or charge occurred. Notice commonly goes to the State's Attorney, arresting agency, chief legal officer of the arresting unit of local government, and Illinois State Police. Agencies generally have 60 days to object, and order processing may take up to 60 days after entry. Fees vary by county, and fee waiver options should be checked with the clerk.

## Clean Slate Warning

Clean Slate automatic sealing does not begin until 2029 and phases in through 2034. The app must not tell users that a record will be automatically sealed before the law is active for their record.

## Commands

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run partners:verify-illinois-document-generator`

Apply `supabase/phase-19i-illinois-document-generator.sql` in Supabase SQL Editor before final live Illinois packet verification.

## Not Yet Built

- Other states
- Final PDF generation library
- Document upload
- E-signature
- Attorney/legal review workflow
- Command Center integration
- RLS policies
- Production auth hardening
- CRM integration
- Analytics/monitoring
