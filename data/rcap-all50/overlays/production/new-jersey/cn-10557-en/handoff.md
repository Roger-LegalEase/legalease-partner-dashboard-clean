# NJ CN-10557 — CN 10557 New Jersey Expungement Kit

**Lane** D2B · **Factory** d0-remediated-v1 · **Revision** REV-2020-06 · **Language** EN

**Source** `STATES/NJ/02_PACKET_FORMS/NJ__FORM__CN-10557__cn-10557-new-jersey-expungement-kit__REV-2020-06__EN.pdf`
**sha256** `c1dd37b5e27bd76ea2330b07f51847c420d359db8f10c0576682e6558d09c5f7` — matches the Edition 1 manifest

## What this document is

Participant-completed filing. Participant and deterministic fields named by the lane's reviewed mapping table are bound; every other class is unwritable. Component role: `statewide_expungement_kit_multi_component`.

## What was read

The binary carries an AcroForm with 179 fields. Every field's type, per-widget page and rectangle, declared maximum length and multiline flag was read from the binary rather than taken from the manifest.

## What is written

| target | fact |
| --- | --- |
| `DefPhone` | `participant.phone` |
| `DefName` | `participant.full_legal_name` |
| `DefAddrCity` | `participant.city` |
| `DefAddrZip` | `participant.zip` |
| `origCaseNums` | `matter.case_number` |

## What is deliberately left blank

D0's typed binder would have written these; the lane's reviewed mapping table refused them after reading the document:

- `DefAddrStr2` — D0 offered `participant.full_legal_name`. descriptor_collision: same as DefAddrStr
- `DefAddrSt` — D0 offered `participant.full_legal_name`. descriptor_collision: the state field binds participant.full_legal_name
- `oweDocket` — D0 offered `matter.case_number`. outstanding obligation docket, paired with a money field
- `DefAddrStr` — D0 offered `participant.full_legal_name`. descriptor_collision: the field name's 'Def' matches participant.full_legal_name ahead of participant.street_address, and an explicit mapping cannot redirect a descriptor D0 already chose
- `DefAddr2` — D0 offered `participant.street_address`. address continuation line of unverified meaning; binding the street fact here would duplicate line 1
- `DefAddr3` — D0 offered `participant.street_address`. address continuation line of unverified meaning
- `ExpungeCntyName` — D0 offered `participant.full_legal_name`. descriptor_collision: a county dropdown binding participant.full_legal_name
- `DefBirthDt` — D0 offered `participant.full_legal_name`. descriptor_collision: the date-of-birth field binds participant.full_legal_name
- `arrest1CaseNum` — D0 offered `matter.case_number`. charge table row not indexable from this field name, so every row would receive the same case number
- `arrest2CaseNum` — D0 offered `matter.case_number`. charge table row not indexable from this field name
- `arrest3CaseNum` — D0 offered `matter.case_number`. charge table row not indexable from this field name
- `arrest4CaseNum` — D0 offered `matter.case_number`. charge table row not indexable from this field name
- `arrest5CaseNum` — D0 offered `matter.case_number`. charge table row not indexable from this field name
- `fjDocketNums` — D0 offered `matter.case_number`. final judgment dockets, clerk assigned
- `jdgmntDocket1` — D0 offered `matter.charges[0].case_number`. money judgment docket, paired with jdgmntAmt1
- `jdgmntDocket2` — D0 offered `matter.charges[1].case_number`. money judgment docket
- `jdgmntDocket3` — D0 offered `matter.charges[2].case_number`. money judgment docket
- `SccCntyName` — D0 offered `participant.full_legal_name`. service recipient (Superior Court Criminal Case Management)
- `SccAddr2` — D0 offered `participant.street_address`. service recipient address
- `expungDocketNum` — D0 offered `matter.case_number`. expungement docket, clerk assigned
- `ProsCntyName` — D0 offered `participant.full_legal_name`. service recipient (prosecutor)
- `ProsAddr2` — D0 offered `participant.street_address`. service recipient address (prosecutor)
- `ProbCntyName` — D0 offered `participant.full_legal_name`. service recipient (probation)
- `ProbAddr2` — D0 offered `participant.street_address`. service recipient address (probation)
- `SuperintendentAddr2` — D0 offered `participant.street_address`. service recipient address (superintendent)
- `MuniCrtsAddr2` — D0 offered `participant.street_address`. service recipient address (municipal courts)
- `WardenAddr2` — D0 offered `participant.street_address`. service recipient address (warden)
- `Prob2CntyName` — D0 offered `participant.full_legal_name`. service recipient (probation)
- `Prob2Addr2` — D0 offered `participant.street_address`. service recipient address (probation)
- `FamDivName` — D0 offered `participant.full_legal_name`. service recipient (Family Division)
- `FamDivAddr2` — D0 offered `participant.street_address`. service recipient address (Family Division)
- `ExpungeDocketNum` — D0 offered `matter.case_number`. expungement docket, clerk assigned

## Evidence

- Canonical, boundary and negative fixtures are finalized artifacts: values materialized into appearances, flattened, sanitized of active content, byte-reproducible.
- The negative fixture wrote 0 values.
- Rendering the canonical fixture twice produced identical bytes.
- 5 expected values, 0 missing from the finalized artifact when re-read from disk.
- None of those values appears in the untouched source, so the blank and filled panels provably differ.
- Contact sheet built from the finalized artifact.
- Mutation suite: 6 mutations, 6 refused as expected.

## Holds carried forward

- `state_manifest_generation_allowed_no` (no) — STATE_MANIFEST.csv
- `edition_1_runtime_disabled` (runtime_disabled) — STATE_MANIFEST.csv
- `freshness:candidate_current_source` (candidate_current_source) — STATE_MANIFEST.csv
- `source:acquired_2026-08-02` (acquired_2026-08-02) — STATE_MANIFEST.csv
- `legal_review_mapping:requires_track-level import mapping` (requires_track-level import mapping) — STATE_MANIFEST.csv
- `state_runtime_disabled` (runtime_disabled) — STATES/NJ/STATE_README.md
- `f_independent_visual_review_required` — lane D2B status rule

These are preserved, not cleared. A technically clean render does not make this form a sellable route.

## Findings for independent review

- `declared_field_count_disagrees_with_first_hand_census` — {"check":"declared_field_count_disagrees_with_first_hand_census","declared":269,"observed":179,"note":"The census is the binary's own field list. The manifest count is recorded but not relied on."}
