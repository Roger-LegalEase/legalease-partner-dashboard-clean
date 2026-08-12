# FL FL-4TH-JUDICIAL-CIRCUIT-DUVAL-COUNTY — Fourth Judicial Circuit, Duval County Seal or Expunge Packet

**Lane** D2B · **Factory** d0-remediated-v1 · **Revision** SOURCE-2025 · **Language** EN

**Source** `STATES/FL/05_SOURCE_GATED/FL__SOURCE-GATED__FL-4TH-JUDICIAL-CIRCUIT-DUVAL-COUNTY__fourth-judicial-circuit-duval-county-seal-or-expunge-packet__SOURCE-2025__EN.pdf`
**sha256** `cb355c356581a3b4550775313d580226ccb5a70cf61eb75a861ae1ca9c310153` — matches the Edition 1 manifest

## What this document is

Participant-completed filing. Participant and deterministic fields named by the lane's reviewed mapping table are bound; every other class is unwritable. Component role: `local_circuit_packet_petition_affidavit_and_orders`.

## What was read

The binary carries an AcroForm with 75 fields. Every field's type, per-widget page and rectangle, declared maximum length and multiline flag was read from the binary rather than taken from the manifest.

## What is written

| target | fact |
| --- | --- |
| `Name` | `participant.full_legal_name` |
| `CASE NO` | `matter.case_number` |
| `The Petitioner Name` | `participant.full_legal_name` |
| `the petitioner Name` | `participant.full_legal_name` |
| `whose date of birth is` | `participant.date_of_birth` |
| `Name_2` | `participant.full_legal_name` |
| `Name_3` | `participant.full_legal_name` |
| `Name_4` | `participant.full_legal_name` |
| `The Petitioner Name_2` | `participant.full_legal_name` |
| `the petitioner Name_2` | `participant.full_legal_name` |
| `whose date of birth is_2` | `participant.date_of_birth` |
| `Name_5` | `participant.full_legal_name` |
| `Name_6` | `participant.full_legal_name` |

## What is deliberately left blank

D0's typed binder would have written these; the lane's reviewed mapping table refused them after reading the document:

- `of the court concerning the petitioners arrest on the` — D0 offered `participant.full_legal_name`. arrest date blank matched the full legal name descriptor
- `CASE NO_2` — D0 offered `matter.charges[1].case_number`. the trailing _2 reads as a charge row index, so the caption case number repeated on the affidavit would receive charge 2's number
- `CASE NO_3` — D0 offered `matter.charges[2].case_number`. trailing suffix misread as a charge row index
- `DONE AND ORDERED in Chambers at Jacksonville Duval County Florida this 1` — D0 offered `matter.county`. the judge's dating blank on the order
- `DONE AND ORDERED in Chambers at Jacksonville Duval County Florida this 2` — D0 offered `matter.county`. the judge's dating blank on the order
- `records of the court concerning the petitioners arrest on the` — D0 offered `participant.full_legal_name`. arrest date blank matched the full legal name descriptor
- `DONE AND ORDERED in Chambers at Jacksonville Duval County Florida this 1_2` — D0 offered `matter.county`. the judge's dating blank on the order
- `DONE AND ORDERED in Chambers at Jacksonville Duval County Florida this 2_2` — D0 offered `matter.county`. the judge's dating blank on the order

## Evidence

- Canonical, boundary and negative fixtures are finalized artifacts: values materialized into appearances, flattened, sanitized of active content, byte-reproducible.
- The negative fixture wrote 0 values.
- Rendering the canonical fixture twice produced identical bytes.
- 3 expected values, 0 missing from the finalized artifact when re-read from disk.
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
