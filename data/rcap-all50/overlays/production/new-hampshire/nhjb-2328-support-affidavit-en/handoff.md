# NH — NHJB-2328 — NHJB-2328 Statement of Assets and Liabilities - Individual

Family `nhjb-2328-support-affidavit-en` in `new-hampshire`, built by lane D3A on factory `d0-remediated-v1`.

## Source identity

- Canonical path: `STATES/NH/04_SUPPORTING_PROCESS/NH__SUPPORT__NHJB-2328__nhjb-2328-statement-of-assets-and-liabilities-individual__REV-UNKNOWN__EN.pdf`
- Manifest sha256: `b4384b41efb472951c28b1289e46b05dfcc9463147aa490597f541f5291ce919`
- Delivered sha256: `b4384b41efb472951c28b1289e46b05dfcc9463147aa490597f541f5291ce919` — matches
- Revision: REV-UNKNOWN; role AFFIDAVIT; asset class supporting_process
- Structural class: manifest declares `acroform_pdf`, the binary reads `acroform`
- Fields: manifest declares 99, first-hand census reads 90

## Ownership

Participant-completed filing: participant and deterministic fields may bind; every other class stays blank.

## Field classification

- election_control: 8
- manual: 68
- participant: 2
- protected: 1
- signature: 11

## What was written

2 field(s) bound from the canonical fixture; 88 refused.

- `case number` ← `matter.case_number`
- `case number1` ← `matter.charges[0].case_number`

## Evidence

- Contact sheet: built from the finalized artifact; every expected value proven visible and the two panels proven different
- Deterministic: two renders of identical inputs produced identical bytes
- Source drift: a perturbed source binary was refused
- Mutations: 4/4 held
- Boundary fixture refused 0 value(s) below the 6pt readable floor rather than writing them illegibly

## Holds carried forward

- `d3a_lane_output_not_self_approved`
- `edition_1_runtime_disabled`
- `f_independent_visual_review_required`
- `manifest_not_a_packet_candidate`
- `revision_confirmation_required`
- `state_manifest_generation_allowed_no`
- `state_open_item_release_blocker`
- `track_level_import_mapping_required`

## Findings

- **fidelity** `manifest_field_count_differs_from_binary` — manifest declares 99, first-hand census of the hash-verified binary reads 90. The binary governs the census; the manifest governs identity.

## Review status

`implementation_complete_pending_independent_review`. This lane does not approve its own output: nothing here is technically approved, production ready, or live.
