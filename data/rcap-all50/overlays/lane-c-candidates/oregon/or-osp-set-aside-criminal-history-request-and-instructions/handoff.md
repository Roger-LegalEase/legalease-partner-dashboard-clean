# Oregon — OR-OSP-SET-ASIDE-CCH: Oregon State Police Set-Aside Criminal History Request and Instructions

**Lane** D3B · **Factory** d0-remediated-v1 · **Revision** REV-2022-01 · **Edition** 1.0

Source `STATES/OR/04_SUPPORTING_PROCESS/OR__SUPPORT__OR-OSP-SET-ASIDE-CCH__oregon-state-police-set-aside-criminal-history-request-and-instructions__REV-2022-01__EN.pdf`
SHA-256 `a523a9ffc3eb0cc35d89e1c81df8eafcd703cf1ffdb4237a0106b72e1e793ac6` — matches the pack manifest.

## What this document is

A participant's own request to the Oregon State Police for the criminal record check a set-aside requires. Identity, date of birth and telephone number are the participant's. The ten numbered case rows, the alias lines, the composite mailing line, the fee election and the fingerprint-card election are not written.

Ownership: `participant_completed`. Render strategy: `acroform_fill`. Observed structure: acroform, 2 page(s), 22 AcroForm field(s).

## Census and binding

- Census entries: **22**
- Bound by D0's binder: **3**
- Refused: **19** (no_allowlisted_fact_matches 11, mapping_conflict 4, type_guard 3, money 1)
- Written into the canonical artifact: **3**

### Binding corrections

Each entry names the field's true fact. Because that fact differs from the one the field's own name resolves to, D0's binder refuses the field rather than writing an approximately-right value. A correction can only ever remove a binding.

- `ALIAS NAME1` → `participant.alias_1` — the descriptor list resolves any field whose name contains a bare 'name' to participant.full_legal_name, so all three alias lines would receive the petitioner's legal name — three times, on a form whose whole purpose is to disclose names other than the legal one. An alias is a distinct fact this lane does not hold.
- `ALIAS NAME2` → `participant.alias_2` — second alias line, same resolution and same refusal.
- `ALIAS NAME3` → `participant.alias_3` — third alias line, same resolution and same refusal.
- `Street, City, State, Zip code` → `participant.mailing_address_single_line` — the field asks for the street, city, state and postal code on one line and the binder resolves it to participant.city_state_zip, which would return the record check to a city and postal code with no street. No single fact matches the field's full span, so it is refused rather than under-filled.

## Holds carried forward

- `state_manifest_generation_allowed_no`
- `edition_1_runtime_disabled`
- `legal_review_mapping_requires_track_level_import_mapping`
- `state_readme_open_items_present`
- `f_independent_visual_review_required`

## State-pack fidelity findings

- This binary and the other Oregon record-check request share all 22 field names and all 22 widget rectangles and differ by 23 bytes. Their sha256 values differ, the manifest assigns them different document ids and roles, and both are carried as separate families on that authority. A reviewer comparing the two packages should expect the field census to be identical.
- Date presentation, recorded for D0 rather than for Oregon: this form captions its DATE OF BIRTH field MM/DD/YYYY, and the factory writes 1991-04-17. D0's type check requires date facts in ISO 8601 form and there is no presentation layer between the fact and the page, so every date this factory writes is ISO. The value is correct and unambiguous, but it does not follow the caption. A per-form date format belongs in the shared factory, not in a lane.
- The 'AREA CODE' field is refused for want of an allowlisted fact: no descriptor describes an area code on its own. The complete telephone number is written into 'PHONE NUMBER', which is the field the form labels for it, and the area-code box is left to the participant.

## Status

`implemented_pending_independent_review`. This lane does not approve its own output: visual review, counsel review and source-freshness review remain open, and every hold above is still in force.
