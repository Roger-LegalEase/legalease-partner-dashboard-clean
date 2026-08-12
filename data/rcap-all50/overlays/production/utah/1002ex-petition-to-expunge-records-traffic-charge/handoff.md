# Utah — 1002EX: Petition to Expunge Records Traffic Charge

**Lane** D3B · **Factory** d0-remediated-v1 · **Revision** REV-2022-04-11 · **Edition** 1.0

Source `STATES/UT/02_PACKET_FORMS/UT__FORM__1002EX__petition-to-expunge-records-traffic-charge__REV-2022-04-11__EN.pdf`
SHA-256 `fab0ba66e2ef50acf0e30ae781e8e38202da0cf39c788a0b1652c99fc6b0b0cd` — matches the pack manifest.

## What this document is

A petitioner's own petition to a Utah district or justice court under Utah Code 77-40a-305(3), signed under criminal penalty. The contact block, the caption and the printed name in the signature block are the participant's. The judge line, the bar-number line, the place of signing, the signature itself and the eligibility recitals are not.

Ownership: `participant_completed`. Render strategy: `flat_overlay`. Observed structure: flat, 2 page(s), 0 AcroForm field(s).

## Census and binding

- Census entries: **27**
- Bound by D0's binder: **7**
- Refused: **20** (no_allowlisted_fact_matches 16, court 1, sensitive_fact 2, signature 1)
- Written into the canonical artifact: **6**

## Holds carried forward

- `state_manifest_generation_allowed_no`
- `edition_1_runtime_disabled`
- `legal_review_mapping_requires_track_level_import_mapping`
- `state_readme_open_items_present`
- `f_independent_visual_review_required`

## State-pack fidelity findings

- This form's court block and petitioner caption exist on the page but are not written. Its text layer interleaves glyphs — the county line reads back as 'C_________ounty', and elsewhere 'oYu', 'usJtice' and 'arB #' — so the underscore runs on those lines cannot be bounded reliably. The blanks stay in the census as unlabelled rules and are left to the participant. Placing an overlay on geometry this lane cannot trust would be worse than leaving the line blank.
- 1000EX carries the same court block and does render it cleanly, so the difference is this binary's text encoding rather than the form's design.

## Status

`implemented_pending_independent_review`. This lane does not approve its own output: visual review, counsel review and source-freshness review remain open, and every hold above is still in force.
