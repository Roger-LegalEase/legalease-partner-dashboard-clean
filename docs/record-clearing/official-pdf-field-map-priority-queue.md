# Official PDF Field-Map Priority Queue

Status date: 2026-06-15

This is a docs-only priority queue based on candidate extraction from the local official PDF archive. It uses the batch field-map accelerator outputs under `tmp/review/field-map-accelerator-batch/` as planning input only.

This document is not visual approval. It does not mark any PDF as `replacement_candidate` or `verified_replacement`. It does not weaken the requirement for human visual review, source freshness review, and counsel confirmation before any lifecycle promotion.

Nebraska CC 6:11 remains `visual_review_required`.

## Source Artifacts

- `tmp/review/field-map-accelerator-batch/field-map-accelerator-summary.json`
- `tmp/review/field-map-accelerator-batch/field-map-accelerator-summary.md`

The tmp artifacts are local review outputs and must remain ignored. Do not copy them into git.

## Batch Summary

| Metric | Count |
| --- | ---: |
| PDFs in inspection report | 235 |
| PDFs considered by accelerator | 111 |
| PDFs successfully inspected | 109 |
| PDFs with widgets | 104 |
| PDFs with no widgets | 5 |
| Unsuitable PDFs excluded from inspection | 121 |
| Batch extraction errors | 2 |
| Total fields found | 4,934 |
| Total widgets found | 5,286 |

Global confidence counts:

| Confidence | Count |
| --- | ---: |
| high | 228 |
| medium | 641 |
| low | 402 |
| unknown | 4,015 |

## What This Means

The batch results show that dirty and hybrid AcroForm PDFs can be accelerated for mapping triage. Most candidate PDFs exposed widgets through `pdf-lib`, including many forms previously classified as `acroform_dirty` with recommended `hybrid` mapping. This gives reviewers a faster first pass for field inventory, widget rectangles, and conservative canonical-key guesses.

The results do not prove that any field is correctly placed or legally complete. The unknown-confidence count is high, and dirty AcroForm metadata can contain generic names, misleading structure, duplicated widgets, incomplete coverage, XFA hazards, or fields that do not line up with the rendered official form. Every candidate still needs human visual review against the rendered official PDF before it can be used for final output.

Two Massachusetts PDFs were treated as unsuitable during batch extraction because `pdf-lib` detected XFA during form inspection. Those should stay out of automated mapping until source materials are refreshed or manually reviewed.

## Recommended Next 5 Mapping Targets

These are mapping targets, not lifecycle approvals. Each target remains subject to visual review, source freshness review, and counsel confirmation.

| Priority | Jurisdiction | PDF | Why next | Required gate |
| ---: | --- | --- | --- | --- |
| 1 | Texas | `LegalEase Texas/petition_charges_dismissed_or_quashed_revision_06112026.pdf` | Highest ease score; 250 fields and 251 widgets; 22 medium and 135 low-confidence matches give a large widget inventory to accelerate hybrid mapping. | Full rendered visual review; high unknown count must be resolved manually. |
| 2 | Indiana | `LegalEase Indiana/ConvictionPetitionOrder0320Fillable.pdf` | Strong second candidate; 126 fields and 196 widgets; 7 high and 41 medium-confidence matches. | Full rendered visual review; confirm all case, petitioner, offense, and signature fields. |
| 3 | North Dakota | `LegalEase North Dakota/3. Brief Prohibit Public Access AR41 5f1.pdf` | Clean AcroForm classification with 117 fields/widgets and a manageable single-form review surface. | Confirm AcroForm coverage visually before any field map is trusted. |
| 4 | Alabama | `LegalEase Alabama/cr-65-expunge-petition-10-2024.pdf` | 108 fields/widgets with 3 high and 19 medium-confidence matches; better semantic signal than several higher-widget dirty forms. | Full visual review; verify caption and criminal-history field placement carefully. |
| 5 | Maryland | `LegalEase Maryland/LegalEase Maryland forms /ccdccr072B.pdf` | 48 fields/widgets with 5 high and 17 medium-confidence matches and only 12 unknowns; likely easier to review than larger unknown-heavy PDFs. | Full visual review; compare against current official Maryland source materials. |

New Jersey's `10557_expunge_kit.pdf` ranks third by ease score because it exposes 269 widgets, but it has 264 unknown-confidence candidates. Treat it as a high-volume inventory opportunity after smaller, higher-signal targets are reviewed.

## Top 20 Easiest Candidate PDFs

| Rank | Jurisdiction | PDF | Classification / mode | Fields | Widgets | High | Medium | Low | Unknown | Ease score |
| ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | TX | `LegalEase Texas/petition_charges_dismissed_or_quashed_revision_06112026.pdf` | `acroform_dirty` / `hybrid` | 250 | 251 | 0 | 22 | 135 | 94 | 3,092 |
| 2 | IN | `LegalEase Indiana/ConvictionPetitionOrder0320Fillable.pdf` | `acroform_dirty` / `hybrid` | 126 | 196 | 7 | 41 | 22 | 126 | 2,036 |
| 3 | NJ | `LegalEase New Jersey/10557_expunge_kit.pdf` | `acroform_dirty` / `hybrid` | 179 | 269 | 0 | 5 | 0 | 264 | 1,429 |
| 4 | ND | `LegalEase North Dakota/3. Brief Prohibit Public Access AR41 5f1.pdf` | `acroform_clean` / `acroform` | 117 | 117 | 4 | 3 | 39 | 71 | 1,204 |
| 5 | AL | `LegalEase Alabama/cr-65-expunge-petition-10-2024.pdf` | `acroform_dirty` / `hybrid` | 108 | 108 | 3 | 19 | 11 | 75 | 1,145 |
| 6 | IL | `LegalEase Illinois/CXP Motion to Vacate and Expunge.pdf` | `acroform_dirty` / `hybrid` | 138 | 158 | 6 | 3 | 0 | 149 | 1,089 |
| 7 | MO | `LegalEase Missouri/Conf Case Filing Info Sheet(FI-05).pdf` | `acroform_dirty` / `hybrid` | 111 | 111 | 3 | 14 | 7 | 87 | 1,042 |
| 8 | NY | `LegalEase New York/CPL160.59SealingApplication.pdf` | `acroform_dirty` / `hybrid` | 54 | 76 | 11 | 18 | 0 | 47 | 971 |
| 9 | SC | `LegalEase South Carolina /SCCA223A1.pdf` | `acroform_dirty` / `hybrid` | 58 | 59 | 1 | 29 | 0 | 29 | 869 |
| 10 | IL | `LegalEase Illinois/CXP Additional Cannabis Convictions.pdf` | `acroform_dirty` / `hybrid` | 109 | 128 | 4 | 1 | 0 | 123 | 828 |
| 11 | MD | `LegalEase Maryland/LegalEase Maryland forms /ccdccr072B.pdf` | `acroform_dirty` / `hybrid` | 48 | 48 | 5 | 17 | 14 | 12 | 828 |
| 12 | RI | `LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Misdemeanor (2).pdf` | `acroform_dirty` / `hybrid` | 77 | 78 | 2 | 12 | 1 | 63 | 728 |
| 13 | RI | `LegalEase Rhode Island/Motion to Expunge or Seal and Affidavit.pdf` | `acroform_dirty` / `hybrid` | 77 | 78 | 2 | 12 | 1 | 63 | 728 |
| 14 | RI | `LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Felony.pdf` | `acroform_dirty` / `hybrid` | 74 | 75 | 2 | 13 | 1 | 59 | 727 |
| 15 | RI | `LegalEase Rhode Island/Motion and Affidavit to Expunge or Seal Record - Misdemeanor-superior.pdf` | `acroform_dirty` / `hybrid` | 78 | 78 | 2 | 12 | 0 | 64 | 722 |
| 16 | MO | `LegalEase Missouri/EXPUNGEMENT FORM.pdf` | `acroform_dirty` / `hybrid` | 50 | 50 | 4 | 17 | 2 | 27 | 707 |
| 17 | MD | `LegalEase Maryland/LegalEase Maryland forms /ccdccr072A.pdf` | `acroform_dirty` / `hybrid` | 47 | 47 | 1 | 23 | 0 | 23 | 698 |
| 18 | IL | `LegalEase Illinois/CXP Order Granting or Denying Motion.pdf` | `acroform_dirty` / `hybrid` | 82 | 85 | 7 | 1 | 0 | 77 | 693 |
| 19 | MD | `LegalEase Maryland/LegalEase Maryland forms /ccdccr072c.pdf` | `acroform_dirty` / `hybrid` | 52 | 52 | 3 | 17 | 0 | 32 | 676 |
| 20 | MI | `LegalEase Michigan/mc227.pdf` | `acroform_dirty` / `hybrid` | 106 | 108 | 1 | 0 | 0 | 107 | 667 |

## Per-Jurisdiction Opportunity Notes

These notes summarize mapping opportunity only. They do not approve any jurisdiction for live routing or lifecycle movement.

| Jurisdiction | PDFs considered | Inspected | With widgets | Fields | Widgets | High | Medium | Low | Unknown | Opportunity note |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| IL | 17 | 17 | 17 | 799 | 883 | 25 | 65 | 0 | 793 | Largest widget inventory; useful for batch triage but heavily unknown, so review in smaller form groups. |
| PA | 12 | 12 | 12 | 549 | 565 | 35 | 50 | 26 | 454 | Significant widget coverage; Pennsylvania renderer work is separately owned and should not be mixed into this queue without coordination. |
| ND | 8 | 8 | 8 | 324 | 328 | 31 | 23 | 89 | 185 | Strong clean/AcroForm opportunity; good candidate family for controlled review after the top single PDF. |
| RI | 4 | 4 | 4 | 306 | 309 | 8 | 49 | 3 | 249 | Four similar motion/affidavit forms can likely share mapping review patterns after one is visually reviewed. |
| NJ | 1 | 1 | 1 | 179 | 269 | 0 | 5 | 0 | 264 | High-volume widget inventory, but almost all unknown; defer until higher-signal targets are handled. |
| KY | 6 | 6 | 6 | 240 | 266 | 7 | 23 | 8 | 228 | Consistent widget presence; best handled as a state batch after target selection by form type. |
| MI | 4 | 4 | 4 | 246 | 251 | 7 | 1 | 5 | 238 | Good extraction volume but low semantic confidence; visual labeling work will dominate. |
| TX | 1 | 1 | 1 | 250 | 251 | 0 | 22 | 135 | 94 | Highest-ranked single target; likely accelerates hybrid mapping despite unknowns. |
| MO | 4 | 4 | 4 | 229 | 231 | 11 | 54 | 9 | 157 | Good semantic signal; `EXPUNGEMENT FORM.pdf` and filing sheet are practical follow-on candidates. |
| WV | 4 | 4 | 4 | 195 | 197 | 7 | 10 | 1 | 179 | Widget coverage exists, but unknown-heavy; keep behind source and visual review gates. |
| IN | 1 | 1 | 1 | 126 | 196 | 7 | 41 | 22 | 126 | Strong single-form target with good medium-confidence signal. |
| MD | 4 | 4 | 4 | 186 | 186 | 12 | 72 | 14 | 88 | Best semantic-confidence opportunity among multi-form sets; good next mapping queue after the first five. |
| NH | 6 | 6 | 5 | 163 | 176 | 18 | 24 | 5 | 129 | Five widget-bearing PDFs and one no-widget PDF; select targets individually. |
| KS | 5 | 5 | 5 | 172 | 175 | 12 | 40 | 11 | 112 | Solid medium-confidence pool; good after higher-priority single targets. |
| VT | 7 | 7 | 6 | 158 | 163 | 9 | 0 | 2 | 152 | Mostly unknown; use extraction as inventory, not as semantic map. |
| AR | 3 | 3 | 3 | 151 | 152 | 7 | 17 | 16 | 112 | Widget coverage exists; folder spelling anomaly from source inventory should be preserved until source cleanup. |
| AL | 2 | 2 | 2 | 133 | 133 | 4 | 19 | 11 | 99 | Good target due to one high-ranked petition and manageable review surface. |
| TN | 2 | 2 | 2 | 77 | 77 | 4 | 13 | 0 | 60 | Small enough for controlled review, but not ahead of stronger targets. |
| NY | 1 | 1 | 1 | 54 | 76 | 11 | 18 | 0 | 47 | High-confidence ratio makes it a good near-term candidate after the recommended five. |
| MA | 4 | 2 | 2 | 65 | 65 | 4 | 20 | 7 | 34 | Two PDFs produced XFA-unsuitable errors; do not batch-automate those without manual/source review. |

## Required Review Gates

Before any field map from this queue can be treated as usable for final output:

- Confirm the current official source PDF and access date.
- Record the exact blank PDF hash for the reviewed source.
- Compare every mapped field against the rendered official PDF.
- Review captions, party names, court names, case numbers, dates, checkboxes, signature blocks, and dense text regions at high zoom.
- Resolve every unknown or low-confidence candidate manually.
- Keep all draft mapping status at `visual_review_required` until visual review and later lifecycle review are complete.
- Do not use this queue to promote any form to `replacement_candidate` or `verified_replacement`.

