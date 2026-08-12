# NM NM-4-953 — 4-953. Petition to expunge arrest records and public records; upon conviction.

**Lane** D2B · **Factory** d0-remediated-v1 · **Revision** REV-UNKNOWN · **Language** EN

**Source** `STATES/NM/02_PACKET_FORMS/NM__FORM__NM-4-953__4-953-petition-to-expunge-arrest-records-and-public-records-upon-conviction__REV-UNKNOWN__EN.pdf`
**sha256** `2ee3d41243e0a7e807ed52e77ac08fda9e0c55c7abdef3195a53de29a0f90c40` — matches the Edition 1 manifest

## What this document is

Participant-completed filing. Participant and deterministic fields named by the lane's reviewed mapping table are bound; every other class is unwritable. Component role: `principal_petition_or_request`.

## What was read

The binary is flat. 108 blanks were measured from the page content streams — printed underscore rules and drawn space runs — and each one's immediate labels were read either side of it.

## What is written

| target | fact |
| --- | --- |
| `COUNTY OF` | `matter.county` |
| `In re Petitioner` | `participant.full_legal_name` |
| `Date of Birth:` | `participant.date_of_birth` |
| `Current Mailing Address:` | `participant.street_address` |
| `City:` | `participant.city` |
| `State:` | `participant.state` |
| `Zip Code:` | `participant.zip` |
| `District Court case number(s):` | `matter.case_number` |

## What is deliberately left blank

Blanks measured on the page and refused, by reason:

- `not_on_the_reviewed_anchor_allowlist` — 68
- `protected_category` — 12
- `body_judicial_district_is_a_service_routing_election` — 9
- `which_phone_is_ambiguous_across_three_blanks` — 3
- `appellate_case_number_is_not_the_trial_case_number` — 2
- `no_fact_carries_the_judicial_district_ordinal` — 1
- `fact_already_anchored_on_this_page` — 1
- `section_heading_not_a_fill_blank` — 1
- `prior_expungement_docket_is_clerk_assigned_and_not_a_participant_fact` — 1
- `offense_name_matched_the_full_legal_name_descriptor` — 1
- `signature_block_column_caption_not_a_fill_blank` — 1

## Evidence

- Canonical, boundary and negative fixtures are finalized artifacts: values materialized into appearances, flattened, sanitized of active content, byte-reproducible.
- The negative fixture wrote 0 values.
- Rendering the canonical fixture twice produced identical bytes.
- 8 expected values, 0 missing from the finalized artifact when re-read from disk.
- None of those values appears in the untouched source, so the blank and filled panels provably differ.
- Contact sheet built from the finalized artifact.
- Mutation suite: 5 mutations, 5 refused as expected.

## Holds carried forward

- `state_manifest_generation_allowed_no` (no) — STATE_MANIFEST.csv
- `edition_1_runtime_disabled` (runtime_disabled) — STATE_MANIFEST.csv
- `freshness:revision_confirmation_required` (revision_confirmation_required) — STATE_MANIFEST.csv
- `source:acquired_2026-08-02` (acquired_2026-08-02) — STATE_MANIFEST.csv
- `legal_review_mapping:requires_track-level import mapping` (requires_track-level import mapping) — STATE_MANIFEST.csv
- `open_item:form-4-954-cannabis-automatic-expungement-petition-fallback` (withdrawn_no_current_form / nonblocking_research_note) — STATES/NM/STATE_README.md
- `state_runtime_disabled` (runtime_disabled) — STATES/NM/STATE_README.md
- `f_independent_visual_review_required` — lane D2B status rule

These are preserved, not cleared. A technically clean render does not make this form a sellable route.
