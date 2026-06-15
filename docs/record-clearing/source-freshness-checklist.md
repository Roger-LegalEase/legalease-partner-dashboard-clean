# Source Freshness Checklist

Status date: 2026-06-15

Use this checklist before any official form moves beyond local inspection. The local inspection data supplies file paths, classifications, mapping modes, and blank PDF hashes. It does not supply official source URLs, access dates, authority levels, reviewer names, visual review completion, counsel approval, or launch lifecycle approval.

Do not invent official URLs or revision dates. If a source URL is not known from local data, write `TBD - official source required`.

No row in this checklist marks a form as replacement-ready or verified.

## Required Fields

| Field | Required value |
| --- | --- |
| Source URL | Official issuing-authority URL, or `TBD - official source required` if unknown. |
| Access date | Date the official source was accessed. |
| Revision date | Revision date printed on the form or official page, if available; otherwise `TBD - official source required`. |
| Blank PDF hash | SHA-256 of the exact blank PDF being reviewed. |
| Authority level | Example categories: statewide court form, agency form, county/local form, legal-aid reference, unknown. |
| Reviewer | Person who performed source and visual review. |
| Visual review status | Not started, visual_review_required, in review, passed, failed, or blocked. |
| Counsel approval status | Not requested, requested, approved, rejected, or blocked. |
| Lifecycle status | Current non-live lifecycle state. Do not set live replacement status from this document. |
| Notes | Source caveats, inspection warnings, track limitations, or follow-up needs. |

## Blank Checklist Template

Copy this table once per form or track.

| Field | Value |
| --- | --- |
| Jurisdiction |  |
| Form/track name |  |
| Local source path |  |
| Source URL | TBD - official source required |
| Access date |  |
| Revision date | TBD - official source required |
| Blank PDF hash |  |
| Authority level |  |
| Reviewer |  |
| Visual review status | visual_review_required |
| Counsel approval status | not_requested |
| Lifecycle status | docs_inventory_only |
| Notes |  |

## Nebraska Working Checklist

These rows are seeded only from local inspection output. Source URL, access date, revision date, authority level, reviewer, visual review completion, counsel approval, and lifecycle approval remain open.

| Jurisdiction | Form/track | Local source path | Source URL | Access date | Revision date | Blank PDF hash | Authority level | Reviewer | Visual review status | Counsel approval status | Lifecycle status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Nebraska | CC 6:11 | `LegalEase Nebraska/CC-6-11.pdf` | TBD - official source required |  | TBD - official source required | `c0dcc5c093790f0a54199ab6769876d1c124485cea5de08fb8fc783e9f6a5492` |  |  | visual_review_required | not_requested | docs_inventory_only | Local inspection: acroform_dirty, hybrid. Warnings: AcroForm dictionary detected with no raw field names; no page objects detected. Not live; not verified_replacement. |
| Nebraska | CC 6:11 alternate local copy | `LegalEase Nebraska/CC-6-11-2.pdf` | TBD - official source required |  | TBD - official source required | `8bfa884d66c2d485fc28acfae865075bdb02ae7d6b7a3de839c0248464e767b6` |  |  | visual_review_required | not_requested | docs_inventory_only | Local inspection: acroform_dirty, hybrid. Warnings: AcroForm dictionary detected with no raw field names; no page objects detected. Not live; not verified_replacement. |
| Nebraska | CC 6:12 | `LegalEase Nebraska/CC-6-12.pdf` | TBD - official source required |  | TBD - official source required | `68478452073cdb89dac20843e3d7f5df2ad31b41608ab04deafe940bd6401d28` |  |  | visual_review_required | not_requested | docs_inventory_only | Local inspection: acroform_dirty, hybrid. Warnings: AcroForm dictionary detected with no raw field names; no page objects detected. Not live; not verified_replacement. |

## Per-Track Review Steps

Use these checks for each form or form track:

- Confirm official source URL from the issuing authority.
- Record access date and revision date if the source provides one.
- Download or identify the exact blank PDF and record its SHA-256.
- Confirm the source authority level.
- Compare field mapping or overlay output against the blank PDF.
- Complete visual review with reviewer name and date in notes.
- Obtain counsel approval before any lifecycle change.
- Keep lifecycle status non-live until the separate rollout process approves it.

## Open Source Freshness Items

| Item | Status |
| --- | --- |
| Official URLs from local inspection data | Not present in local inspection output. Use `TBD - official source required` until confirmed. |
| Revision dates from local inspection data | Not present in local inspection output. Use `TBD - official source required` until confirmed. |
| Access dates from local inspection data | Not present in local inspection output. Must be recorded during source refresh. |
| Counsel approvals | Not present in local inspection output. Must be tracked separately. |
| Verified lifecycle approvals | None recorded here. |
