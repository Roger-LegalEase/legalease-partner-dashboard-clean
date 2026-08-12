# Utah — UT-BCI-ROA: BCI Application for Criminal History Record

**Lane** D3B · **Factory** d0-remediated-v1 · **Revision** REV-2025-01 · **Edition** 1.0

Source `STATES/UT/04_SUPPORTING_PROCESS/UT__SUPPORT__UT-BCI-ROA__bci-application-for-criminal-history-record__REV-2025-01__EN.pdf`
SHA-256 `9292fff0479733dd45fd45cef4dad66dbc6cb75b7ebd370a86b2449915cf4192` — matches the pack manifest.

## What this document is

An applicant's own request to the Utah Bureau of Criminal Identification for their criminal history record. Name and date of birth are the participant's and are written. The previously-used-name line, both address lines, both telephone lines, the driver licence line, the identification check and the payment block are not.

Ownership: `participant_completed`. Render strategy: `flat_overlay`. Observed structure: flat, 2 page(s), 0 AcroForm field(s).

## Census and binding

- Census entries: **39**
- Bound by D0's binder: **2**
- Refused: **37** (no_allowlisted_fact_matches 25, mapping_conflict 8, race 1, signature 2, agency 1)
- Written into the canonical artifact: **2**

### Binding corrections

Each entry names the field's true fact. Because that fact differs from the one the field's own name resolves to, D0's binder refuses the field rather than writing an approximately-right value. A correction can only ever remove a binding.

- `p2.r620.1.x238.rule` → `participant.previously_used_names` — 'PREVIOUSLY USED NAME(S) (Maiden, etc.)' resolves to participant.full_legal_name on a bare name match, which would answer the question with the very name it is asking the applicant to distinguish from.
- `p2.r597.1.x134.rule` → `participant.mailing_address_single_line` — the caption beneath reads '(Street/Box number) (Apt #) (City) (State) (Zip)' — one rule carrying the whole address. participant.street_address fills the first fifth of it and leaves the rest missing on a form whose purpose is to have a record mailed back.
- `p2.r576.5.x140.rule` → `participant.physical_address_single_line` — same composite caption on the physical-address line, same refusal.
- `p2.r555.7.x391.rule` → `participant.daytime_phone` — 'DAYTIME PHONE NUMBER' is a distinct fact from the single participant.phone this lane holds; so is the home number beside it. Writing one number into both would assert they are the same.
- `p2.r554.1.x155.rule` → `participant.home_phone` — 'HOME PHONE NUMBER', same reasoning.
- `p2.r532.8.x389.rule` → `participant.driver_licence_number_and_state` — 'DRIVER LICENSE # AND STATE' resolves to participant.state on a bare \bstate\b match, and would put a two-letter code on a line that wants a licence number and its issuing state.
- `p2.r318.6.x78.rule` → `agency.identification_checked_by` — 'Name on ID' sits in the identification-check block a BCI clerk completes when the applicant appears.
- `p2.r45.4.x430.rule` → `payment.name_on_credit_card` — 'Name on Credit Card' is part of the payment block.

## Holds carried forward

- `state_manifest_generation_allowed_no`
- `edition_1_runtime_disabled`
- `legal_review_mapping_requires_track_level_import_mapping`
- `state_readme_open_items_present`
- `f_independent_visual_review_required`

## State-pack fidelity findings

- This is the only one of the five BCI assets in Edition 1 with a confirmed revision (January 2025) and freshness_status candidate_current_source. The other four are REV-UNKNOWN and are not filled.
- Recorded for D0 rather than for Utah: several fields on this form ask for one composite value on one rule — a whole mailing address, a licence number with its issuing state. The descriptor list has no composite for either, so both are refused. A composite address descriptor would make forms of this shape fillable across the corpus.

## Status

`implemented_pending_independent_review`. This lane does not approve its own output: visual review, counsel review and source-freshness review remain open, and every hold above is still in force.
