# Plain-Language and Bilingual Copy Audit

Generated: 2026-07-01T18:34:33.014Z

Branch: `unknown`  
Commit: `unknown`

## Summary

- Strings audited: 3749
- Missing Spanish strings found: 0
- Legalese concerns: 136
- Misleading-promise concerns: 5
- Too-long concerns: 16
- High confusion risk strings: 5

| Surface | Strings | Missing Spanish | Legalese | Promise risk |
| --- | ---: | ---: | ---: | ---: |
| answer_choice | 1783 | 0 | 103 | 0 |
| briefcase | 5 | 0 | 0 | 0 |
| checkout | 1 | 0 | 0 | 0 |
| external_document_checklist | 13 | 0 | 2 | 0 |
| filing_readiness | 331 | 0 | 0 | 0 |
| landing | 236 | 0 | 3 | 4 |
| payment_gate | 2 | 0 | 0 | 0 |
| result_panel | 342 | 0 | 3 | 1 |
| wilma_question | 1036 | 0 | 25 | 0 |

## Translation Findings

- Landing page: uses embedded `data-i18n` / `data-i18n-html` Spanish dictionary and `localStorage.exp_lang`.
- Engine-generated copy: critical payment/result/route/external-document/filing-readiness/Briefcase labels have stable English/Spanish catalog IDs.
- Profile question prompts/options: compiled public profiles include Spanish prompt, helper, option, and option-helper translations.
- Route metadata: runtime-visible filing-readiness values and external-document checklist items resolve through the shared runtime catalog.

## Low-Risk Fixes Applied

- Payment CTA now uses: "Generate my self-help packet - $50".
- Payment support copy separates Expungement.ai packet generation from court, agency, and background-report fees.
- Packet-ready result copy avoids "you qualify" language.
- Alaska, Nevada, Massachusetts, Pennsylvania, Hawaii, and Delaware remedy labels use state-specific terms.

## Legal-Review Copy Items

The JSON report includes the first 75 legalese/promise-risk items under `legalReviewItems`. Most are source/profile terms where the legal term may be needed but should be explained in helper text.

## Remaining Risk

Spanish toggle risk level: low

The existing landing toggle is solid for landing copy. Runtime profile-driven screening, result, payment, Briefcase, Packet Ready, and Wilma surfaces now resolve through the localization layer with Spanish coverage for consumer-visible strings audited here.
