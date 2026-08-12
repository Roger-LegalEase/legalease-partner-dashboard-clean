# NM NM-4-222 — 4-222. Application for Free Process and Affidavit of Indigency.

**Lane** D2B · **Factory** d0-remediated-v1 · **Revision** REV-UNKNOWN · **Language** EN

**Source** `STATES/NM/04_SUPPORTING_PROCESS/NM__SUPPORT__NM-4-222__4-222-application-for-free-process-and-affidavit-of-indigency__REV-UNKNOWN__EN.pdf`
**sha256** `809c66a7b7b6d44740e0c91353dc549c041be6245470868a887297ea4d5f623a` — matches the Edition 1 manifest

## What this document is

Participant-completed filing. Participant and deterministic fields named by the lane's reviewed mapping table are bound; every other class is unwritable. Component role: `fee_waiver_application_support`.

## What was read

The binary carries an AcroForm with 158 fields. Every field's type, per-widget page and rectangle, declared maximum length and multiline flag was read from the binary rather than taken from the manifest.

## What is written

| target | fact |
| --- | --- |
| `COUNTY OF` | `matter.county` |
| `Petitioner` | `participant.full_legal_name` |
| `Print Name` | `participant.full_legal_name` |
| `Street Address` | `participant.street_address` |
| `City State Zip Code` | `participant.city_state_zip` |
| `Telephone` | `participant.phone` |

## What is deliberately left blank

D0's typed binder would have written these; the lane's reviewed mapping table refused them after reading the document:

- `County please` — D0 offered `matter.county`. unverified blank
- `My employers name address and phone number is 1` — D0 offered `participant.street_address`. employer is an outside party
- `My employers name address and phone number is 2` — D0 offered `participant.street_address`. employer is an outside party
- `My employers name address and phone number is 3` — D0 offered `participant.street_address`. employer is an outside party
- `My spouses employers name address and phone number is 1` — D0 offered `participant.street_address`. outside party
- `My spouses employers name address and phone number is 2` — D0 offered `participant.street_address`. outside party
- `My spouses employers name address and phone number is 3` — D0 offered `participant.street_address`. outside party
- `Name 1` — D0 offered `participant.full_legal_name`. financial-disclosure block of unverified meaning
- `Name 2` — D0 offered `participant.full_legal_name`. financial-disclosure block of unverified meaning
- `State of` — D0 offered `participant.state`. notary jurat block
- `County of` — D0 offered `matter.county`. notary jurat block
- `name of applicant` — D0 offered `participant.full_legal_name`. sits inside the notary jurat recital
- `Address` — D0 offered `participant.street_address`. page 5 block of unverified ownership
- `City State Zip Code_2` — D0 offered `participant.city_state_zip`. page 5 block of unverified ownership
- `TelephoneFax Number` — D0 offered `participant.phone`. composite telephone-and-fax blank
- `STATE OF NEW MEXICO` — D0 offered `participant.state`. pre-printed jurisdiction line, not a blank
- `SIXTH JUDICIAL DISTRICT COURT` — D0 offered `matter.court`. pre-printed court line, not a blank

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
- `freshness:revision_confirmation_required` (revision_confirmation_required) — STATE_MANIFEST.csv
- `source:acquired_2026-08-02` (acquired_2026-08-02) — STATE_MANIFEST.csv
- `legal_review_mapping:requires_track-level import mapping` (requires_track-level import mapping) — STATE_MANIFEST.csv
- `open_item:form-4-954-cannabis-automatic-expungement-petition-fallback` (withdrawn_no_current_form / nonblocking_research_note) — STATES/NM/STATE_README.md
- `state_runtime_disabled` (runtime_disabled) — STATES/NM/STATE_README.md
- `f_independent_visual_review_required` — lane D2B status rule

These are preserved, not cleared. A technically clean render does not make this form a sellable route.

## Findings for independent review

- `declared_field_count_disagrees_with_first_hand_census` — {"check":"declared_field_count_disagrees_with_first_hand_census","declared":161,"observed":158,"note":"The census is the binary's own field list. The manifest count is recorded but not relied on."}
