# FL FL-7TH-JUDICIAL-CIRCUIT-ST-JOHNS-COUNTY — St. Johns County Seal and/or Expunge Procedure, Guidelines, and Forms

**Lane** D2B · **Factory** d0-remediated-v1 · **Revision** SOURCE-2025-04 · **Language** EN

**Source** `STATES/FL/05_SOURCE_GATED/FL__SOURCE-GATED__FL-7TH-JUDICIAL-CIRCUIT-ST-JOHNS-COUNTY__st-johns-county-seal-and-or-expunge-procedure-guidelines-and-forms__SOURCE-2025-04__EN.pdf`
**sha256** `2d3c1eaacda769550e88e0327f40816805f13053798a284353ac90bba1e993a9` — matches the Edition 1 manifest

## What this document is

Participant-completed filing. Participant and deterministic fields named by the lane's reviewed mapping table are bound; every other class is unwritable. Component role: `local_circuit_packet_petition_affidavit_and_orders`.

## What was read

The binary carries an AcroForm with 80 fields. Every field's type, per-widget page and rectangle, declared maximum length and multiline flag was read from the binary rather than taken from the manifest.

## What is written

| target | fact |
| --- | --- |
| `CASE NO` | `matter.case_number` |
| `DefendantPetitioner` | `participant.full_legal_name` |
| `The petitioner` | `participant.full_legal_name` |
| `Name` | `participant.full_legal_name` |
| `Address` | `participant.street_address` |
| `Telephone No` | `participant.phone` |
| `DefendantPetitioner_2` | `participant.full_legal_name` |
| `DefendantPetitioner_3` | `participant.full_legal_name` |
| `DefendantPetitioner_4` | `participant.full_legal_name` |

## What is deliberately left blank

D0's typed binder would have written these; the lane's reviewed mapping table refused them after reading the document:

- `records of the court concerning the petitioners arrest on` — D0 offered `participant.full_legal_name`. arrest date blank
- `date the petitioner` — D0 offered `participant.full_legal_name`. arrest date blank
- `racesex whose date of birth is` — D0 offered `participant.date_of_birth`. composite blank carrying race and sex alongside the date of birth
- `CityState` — D0 offered `participant.city`. composite city-and-state blank; no single fact carries both
- `Email Address` — D0 offered `participant.street_address`. matched the street address descriptor
- `CASE NO_2` — D0 offered `matter.charges[1].case_number`. trailing suffix misread as a charge row index
- `Print type or stamp commissioned name of` — D0 offered `participant.full_legal_name`. notary name
- `CASE NO_3` — D0 offered `matter.charges[2].case_number`. trailing suffix misread as a charge row index
- `certain records of the petitioners arrest on 1` — D0 offered `participant.full_legal_name`. arrest date blank
- `certain records of the petitioners arrest on 2` — D0 offered `participant.full_legal_name`. arrest date blank
- `of St Johns County who will comply with the procedures set forth in section 9430585 Florida` — D0 offered `matter.county`. recites the county in the body of a certification, not a caption county

## Evidence

- Canonical, boundary and negative fixtures are finalized artifacts: values materialized into appearances, flattened, sanitized of active content, byte-reproducible.
- The negative fixture wrote 0 values.
- Rendering the canonical fixture twice produced identical bytes.
- 4 expected values, 0 missing from the finalized artifact when re-read from disk.
- None of those values appears in the untouched source, so the blank and filled panels provably differ.
- Contact sheet built from the finalized artifact.
- Mutation suite: 6 mutations, 6 refused as expected.

## Holds carried forward

- `state_manifest_generation_allowed_no` (no) — STATE_MANIFEST.csv
- `edition_1_runtime_disabled` (runtime_disabled) — STATE_MANIFEST.csv
- `freshness:source_or_currentness_gate_open` (source_or_currentness_gate_open) — STATE_MANIFEST.csv
- `source:repo_source_gated` (repo_source_gated) — STATE_MANIFEST.csv
- `legal_review_mapping:requires_track-level import mapping` (requires_track-level import mapping) — STATE_MANIFEST.csv
- `source_gated_never_runtime_selectable` (05_SOURCE_GATED) — Edition 1 folder placement
- `state_legal_review_missing_release_blocker` (release_blocker) — STATES/FL/STATE_README.md
- `open_item:florida-state-legal-design-review` (missing_from_supplied_corpus / release_blocker) — STATES/FL/STATE_README.md
- `state_runtime_disabled` (runtime_disabled) — STATES/FL/STATE_README.md
- `f_independent_visual_review_required` — lane D2B status rule

These are preserved, not cleared. A technically clean render does not make this form a sellable route.
