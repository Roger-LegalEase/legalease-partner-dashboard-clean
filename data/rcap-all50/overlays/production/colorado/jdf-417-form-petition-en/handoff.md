# CO — JDF-417 — Petition to Seal Arrest Records - No Charges Filed

Family `jdf-417-form-petition-en` in `colorado`, built by lane D3A on factory `d0-remediated-v1`.

## Source identity

- Canonical path: `STATES/CO/02_PACKET_FORMS/CO__FORM__JDF-417__petition-to-seal-arrest-records-no-charges-filed__REV-2025-07-01__EN.pdf`
- Manifest sha256: `e0e1aefac85269087ca0f69252c501b14020a301d2cf6e5fbcc26aa5338f6dd4`
- Delivered sha256: `e0e1aefac85269087ca0f69252c501b14020a301d2cf6e5fbcc26aa5338f6dd4` — matches
- Revision: REV-2025-07-01; role PETITION; asset class packet_form
- Structural class: manifest declares `acroform_pdf`, the binary reads `acroform`
- Fields: manifest declares 70, first-hand census reads 62

## Ownership

Participant-completed filing: participant and deterministic fields may bind; every other class stays blank.

## Field classification

- election_control: 9
- manual: 45
- participant: 4
- signature: 3
- withheld_by_review: 1

## What was written

4 field(s) bound from the canonical fixture; 58 refused.

- `County` ← `matter.county`
- `Case Number` ← `matter.case_number`
- `∆ Street Address` ← `participant.street_address`
- `∆ City` ← `participant.city`

## Evidence

- Contact sheet: built from the finalized artifact; every expected value proven visible and the two panels proven different
- Deterministic: two renders of identical inputs produced identical bytes
- Source drift: a perturbed source binary was refused
- Mutations: 5/5 held
- Boundary fixture refused 1 value(s) below the 6pt readable floor rather than writing them illegibly

## Holds carried forward

- `d3a_lane_output_not_self_approved`
- `edition_1_runtime_disabled`
- `f_independent_visual_review_required`
- `state_legal_review_missing_from_supplied_corpus`
- `state_manifest_generation_allowed_no`
- `state_open_item_release_blocker`
- `track_level_import_mapping_required`

## Findings

- **fidelity** `manifest_field_count_differs_from_binary` — manifest declares 70, first-hand census of the hash-verified binary reads 62. The binary governs the census; the manifest governs identity.

## Review status

`implementation_complete_pending_independent_review`. This lane does not approve its own output: nothing here is technically approved, production ready, or live.

## Lane G-CO-BUILD — the binding specification (2026-08-29)

Everything above describes the D3A render of 2026-08-12 and is left as it
stands. This section describes what was added beside it, under
`specification/`.

- Specification: `specification/binding-specification.json`, version recorded in the file
- SHA-256: `f753ed8260d8f672cb5c15bdc2ff28bb773866545f120afa57db5e70f45fabf8`
- Fields: 62 censused, 59 specified writable, 3 protected
- Canonical fixture binds 36 of them; the rest are conditional branches the
  canonical facts leave closed, and each one names the condition it is waiting on
- Retained artifacts still carry the 4-field render, because the official
  binary this family is pinned to is not mounted in this environment

### Protected

The 3 protected fields are the execution block. This form carries no judge,
clerk, prosecutor-only or agency-only widget: its court-use region is printed
text with no field behind it. Protection is re-derived from each field's own
name and printed label and compared against the specification, so a
reclassification that made a protected field writable fails the build rather
than the review.

### What is not claimed

No PDF was rendered. The expanded binding is specified, bound against three
fact sets, mutation-tested and checked against the bytes that are here; it is
not on any artifact. The route stays closed: its filing set is incomplete and
no guidance packet is substituted for it.

### To check

```
node src/lib/rcap/state-packs/colorado/official-forms/run-verify.mjs
```
