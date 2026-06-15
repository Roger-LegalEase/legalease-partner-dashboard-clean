# Official Form Rollout Inventory

Status date: 2026-06-15

This inventory is docs-only triage for official-form overlay planning. It is based on the local PDF inspection artifacts under `data/record-clearing/pdf-inspection/` and does not approve any state for live routing.

No state or form in this inventory is verified. Do not treat these counts as counsel approval, lifecycle approval, or production replacement approval.

## Source Artifacts

- `data/record-clearing/pdf-inspection/latest-report.json`
- `data/record-clearing/pdf-inspection/latest-report.md`
- `data/record-clearing/pdf-inspection/migration-triage.json`
- `data/record-clearing/pdf-inspection/migration-triage.md`

Inspection generated: `2026-06-15T01:23:12.188Z`

Source directory in report: `[external-local-source]`

## Inspection Counts

Total PDFs inspected: 235

| Classification | Count |
| --- | ---: |
| acroform_clean | 4 |
| acroform_dirty | 107 |
| xfa_pdf | 1 |
| flat_pdf | 3 |
| scanned_pdf | 114 |
| encrypted_or_locked | 6 |
| unreadable | 0 |
| unknown | 0 |
| manual_review | 0 |

## Mapping Mode Counts

| Recommended mapping mode | Count |
| --- | ---: |
| acroform | 4 |
| overlay | 3 |
| hybrid | 107 |
| manual_review | 121 |

## Nebraska Status

Nebraska is in visual review only.

| Form | Local path | Classification | Mapping mode | Blank PDF hash | Current status |
| --- | --- | --- | --- | --- | --- |
| CC 6:11 | `LegalEase Nebraska/CC-6-11.pdf` | acroform_dirty | hybrid | `c0dcc5c093790f0a54199ab6769876d1c124485cea5de08fb8fc783e9f6a5492` | visual_review_required; not live; not verified_replacement |
| CC 6:11 alternate local copy | `LegalEase Nebraska/CC-6-11-2.pdf` | acroform_dirty | hybrid | `8bfa884d66c2d485fc28acfae865075bdb02ae7d6b7a3de839c0248464e767b6` | visual_review_required; not live; not verified_replacement |
| CC 6:12 | `LegalEase Nebraska/CC-6-12.pdf` | acroform_dirty | hybrid | `68478452073cdb89dac20843e3d7f5df2ad31b41608ab04deafe940bd6401d28` | visual_review_required; not live; not verified_replacement |

Inspection warnings for the Nebraska PDFs:

- AcroForm dictionary detected, but no field names found by raw inspection.
- No page objects detected by raw inspection.

Nebraska set-aside work must not be described as expungement.

## Recommended Overlay Order By Ease

Use this order for planning only. Do not use it as a launch decision.

1. Clean AcroForm PDFs first.
   - Iowa: 1 clean AcroForm, 1 flat PDF, 4 scanned PDFs.
   - North Dakota: 2 clean AcroForms, 6 dirty AcroForms, 3 scanned PDFs.
   - Tennessee: 1 clean AcroForm, 1 dirty AcroForm, 1 scanned PDF.

2. Flat PDFs suitable for overlay after source freshness is confirmed.
   - Iowa: 1 flat PDF.
   - New Jersey: 1 flat PDF, with 1 dirty AcroForm and 1 scanned PDF also present.
   - Nevada: 1 flat PDF, but the state also has 4 scanned PDFs and 1 encrypted/locked PDF, so defer broader rollout until better sources are confirmed.

3. Dirty or hybrid AcroForm sets after field mapping and visual review.
   - Tennessee: score -2; 3 PDFs; 1 clean AcroForm, 1 dirty AcroForm, 1 scanned PDF.
   - New Jersey: score -5; 3 PDFs; 1 flat PDF, 1 dirty AcroForm, 1 scanned PDF.
   - Nebraska: score -6; 3 PDFs; 3 dirty AcroForms; visual review required.
   - Massachusetts: score -8; 4 PDFs; 4 dirty AcroForms.
   - Rhode Island: score -8; 4 PDFs; 4 dirty AcroForms.

4. Scanned PDFs last.
   - Scanned-heavy sets require official-source refresh, OCR/overlay feasibility review, and counsel-approved visual review before any lifecycle movement.

## States To Defer

Defer states with encrypted, XFA, or scanned-heavy source material until official source PDFs are refreshed and reviewed.

### Encrypted Or Locked

| State | PDFs | Encrypted/locked | Other notes |
| --- | ---: | ---: | --- |
| Maine | 3 | 2 | Also has 1 dirty AcroForm. |
| Delaware | 2 | 1 | Also has 1 scanned PDF. |
| Nevada | 6 | 1 | Also has 4 scanned PDFs and 1 flat PDF. |
| Pennsylvania | 14 | 1 | Also has 1 XFA PDF and 12 dirty AcroForms; Claude-owned Pennsylvania work is separate. |
| West Virginia | 5 | 1 | Also has 4 dirty AcroForms. |

### XFA

| State | PDFs | XFA | Notes |
| --- | ---: | ---: | --- |
| Pennsylvania | 14 | 1 | XFA requires manual review and should not be rolled into this parallel task. |

### Scanned-Heavy

| State | PDFs | Scanned PDFs | Notes |
| --- | ---: | ---: | --- |
| Utah | 12 | 12 | Defer until better source PDFs are found. |
| Washington | 10 | 10 | Defer until better source PDFs are found. |
| Minnesota | 9 | 8 | Defer until better source PDFs are found. |
| New Mexico | 8 | 8 | Defer until better source PDFs are found. |
| South Dakota | 7 | 6 | Defer until better source PDFs are found. |
| South Carolina | 6 | 5 | Defer until better source PDFs are found. |
| Arizona | 5 | 5 | Defer until better source PDFs are found. |
| Mississippi | 4 | 4 | Mississippi legacy stays live; do not alter live Mississippi routing from this work. |

## Rollout Gates

Every form track needs all of the following before any state can be considered for live replacement:

- Official source URL captured from the issuing authority.
- Access date recorded.
- Revision date recorded when the source provides one.
- Blank PDF hash recorded from the exact reviewed PDF.
- Authority level assigned.
- Visual review completed against the filled overlay.
- Counsel approval recorded.
- Lifecycle status reviewed outside this docs-only inventory.

Do not claim any state is verified from this inventory.
