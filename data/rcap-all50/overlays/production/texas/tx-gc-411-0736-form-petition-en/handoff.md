# TX — TX-GC-411.0736 — Petition for Order of Nondisclosure under § 411.0736

Family `tx-gc-411-0736-form-petition-en` in `texas`, built by lane D3A on factory `d0-remediated-v1`.

## Source identity

- Canonical path: `STATES/TX/02_PACKET_FORMS/TX__FORM__TX-GC-411.0736__petition-for-order-of-nondisclosure-under-411-0736__REV-2022-02__EN.pdf`
- Manifest sha256: `e8e7dee3c0843a65921ace2545c79034841961d9a131ac31e3d8cf18fd6701db`
- Delivered sha256: `e8e7dee3c0843a65921ace2545c79034841961d9a131ac31e3d8cf18fd6701db` — matches
- Revision: REV-2022-02; role PETITION; asset class packet_form
- Structural class: manifest declares `acroform_pdf`, the binary reads `acroform`
- Fields: manifest declares 17, first-hand census reads 15

## Ownership

Participant-completed filing: participant and deterministic fields may bind; every other class stays blank.

## Field classification

- election_control: 2
- manual: 4
- participant: 8
- signature: 1

## What was written

8 field(s) bound from the canonical fixture; 7 refused.

- `Printed Name` ← `participant.full_legal_name`
- `Address` ← `participant.street_address`
- `City State Zip` ← `participant.city_state_zip`
- `Telephone Number` ← `participant.phone`
- `Name1` ← `participant.full_legal_name`
- `County` ← `matter.county`
- `Name2` ← `participant.full_legal_name`
- `Cause No` ← `matter.case_number`

## Evidence

- Contact sheet: built from the finalized artifact; every expected value proven visible and the two panels proven different
- Deterministic: two renders of identical inputs produced identical bytes
- Source drift: a perturbed source binary was refused
- Mutations: 4/4 held
- Boundary fixture refused 2 value(s) below the 6pt readable floor rather than writing them illegibly

## Holds carried forward

- `d3a_lane_output_not_self_approved`
- `edition_1_runtime_disabled`
- `f_independent_visual_review_required`
- `state_manifest_generation_allowed_no`
- `state_open_item_release_blocker`
- `track_level_import_mapping_required`

## Findings

- **fidelity** `manifest_field_count_differs_from_binary` — manifest declares 17, first-hand census of the hash-verified binary reads 15. The binary governs the census; the manifest governs identity.

## Review status

`implementation_complete_pending_independent_review`. This lane does not approve its own output: nothing here is technically approved, production ready, or live.
