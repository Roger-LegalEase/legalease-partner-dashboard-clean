# Plain-Language and Bilingual Copy Audit

Generated: 2026-07-01T18:24:23.198Z

Branch: `unknown`  
Commit: `unknown`

## Summary

- Strings audited: 3090
- Missing Spanish strings found: 2823
- Legalese concerns: 132
- Misleading-promise concerns: 5
- Too-long concerns: 16
- High confusion risk strings: 5

| Surface | Strings | Missing Spanish | Legalese | Promise risk |
| --- | ---: | ---: | ---: | ---: |
| answer_choice | 1783 | 1783 | 103 | 0 |
| wilma_question | 1036 | 1036 | 25 | 0 |
| result_panel | 22 | 4 | 1 | 1 |
| briefcase | 5 | 0 | 0 | 0 |
| checkout | 1 | 0 | 0 | 0 |
| external_document_checklist | 4 | 0 | 0 | 0 |
| filing_readiness | 1 | 0 | 0 | 0 |
| landing | 236 | 0 | 3 | 4 |
| payment_gate | 2 | 0 | 0 | 0 |

## Translation Findings

- Landing page: uses embedded `data-i18n` / `data-i18n-html` Spanish dictionary and `localStorage.exp_lang`.
- Engine-generated copy: critical payment/result/route/external-document/filing-readiness/Briefcase labels now have stable English/Spanish catalog IDs.
- Profile question prompts/options: still mostly English-only in compiled public profiles; this is the largest remaining Spanish-toggle risk.
- Route metadata: state remedy labels are translated for required safety states; detailed metadata should move into the same catalog before exposing in Spanish mode.

## Low-Risk Fixes Applied

- Payment CTA now uses: "Generate my self-help packet - $50".
- Payment support copy separates Expungement.ai packet generation from court, agency, and background-report fees.
- Packet-ready result copy avoids "you qualify" language.
- Alaska, Nevada, Massachusetts, Pennsylvania, Hawaii, and Delaware remedy labels use state-specific terms.

## Legal-Review Copy Items

The JSON report includes the first 75 legalese/promise-risk items under `legalReviewItems`. Most are source/profile terms where the legal term may be needed but should be explained in helper text.

## Remaining Risk

Spanish toggle risk level: high

The existing landing toggle is solid for landing copy. The current profile-driven screening and Briefcase surfaces need a broader locale provider or profile translation pass before Spanish mode can be considered complete end-to-end.
