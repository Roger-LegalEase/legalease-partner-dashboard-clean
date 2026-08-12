# MO — CR300 — Petition for Correction of Arrest/Court Records - Identity Theft

Family `cr300-source-gated-petition-en` in `missouri`, built by lane D3A on factory `d0-remediated-v1`.

## Source identity

- Canonical path: `STATES/MO/05_SOURCE_GATED/MO__SOURCE-GATED__CR300__petition-for-correction-of-arrest-court-records-identity-theft__REV-2010-04__EN.pdf`
- Manifest sha256: `0bdda44514ec4505d736c1648502bc768d48fab5cfc63d51635e57f9380aaf44`
- Delivered sha256: `0bdda44514ec4505d736c1648502bc768d48fab5cfc63d51635e57f9380aaf44` — matches
- Revision: REV-2010-04; role PETITION; asset class source_gated
- Structural class: manifest declares `acroform_pdf`, the binary reads `acroform`
- Fields: manifest declares 54, first-hand census reads 54

## Ownership

Participant-completed filing: participant and deterministic fields may bind; every other class stays blank.

## Field classification

- election_control: 14
- manual: 8
- participant: 8
- protected: 16
- withheld_by_review: 8

## What was written

7 field(s) bound from the canonical fixture; 47 refused.

- `Petitioner` ← `participant.full_legal_name`
- `Petitioner Full Name` ← `participant.full_legal_name`
- `Date of Birth Petitioner` ← `participant.date_of_birth`
- `Arrest Citation Number` ← `matter.citation_number`
- `Case Number` ← `matter.case_number`
- `Petitioner Address` ← `participant.street_address`
- `Case number` ← `matter.case_number`

## Evidence

- Contact sheet: built from the finalized artifact; every expected value proven visible and the two panels proven different
- Deterministic: two renders of identical inputs produced identical bytes
- Source drift: a perturbed source binary was refused
- Mutations: 5/5 held
- Boundary fixture refused 2 value(s) below the 6pt readable floor rather than writing them illegibly

## Holds carried forward

- `d3a_lane_output_not_self_approved`
- `edition_1_runtime_disabled`
- `f_independent_visual_review_required`
- `manifest_not_a_packet_candidate`
- `source_gated_never_runtime_selectable`
- `source_or_currentness_gate_open`
- `state_manifest_generation_allowed_no`
- `state_open_item_build_blocker`
- `track_level_import_mapping_required`

## Review status

`implementation_complete_pending_independent_review`. This lane does not approve its own output: nothing here is technically approved, production ready, or live.
