# Utah — 1000EX: Petition to Expunge Records with Certificate of Eligibility

**Lane** D3B · **Factory** d0-remediated-v1 · **Revision** REV-2022-04-11 · **Edition** 1.0

Source `STATES/UT/02_PACKET_FORMS/UT__FORM__1000EX__petition-to-expunge-records-with-certificate-of-eligibility__REV-2022-04-11__EN.pdf`
SHA-256 `401e0563ae4dddee7a447c4b3fa9d043477402188c98fd3b108087c84c986611` — matches the pack manifest.

## What this document is

A petitioner's own petition to a Utah district or justice court under Utah Code 77-40a-305(1)(a), signed under criminal penalty. The contact block, the caption and the printed name in the signature block are the participant's. The judge line, the bar-number line, the place of signing, the signature itself and the eligibility recitals are not.

Ownership: `participant_completed`. Render strategy: `flat_overlay`. Observed structure: flat, 2 page(s), 0 AcroForm field(s).

## Census and binding

- Census entries: **31**
- Bound by D0's binder: **9**
- Refused: **22** (attorney 1, no_allowlisted_fact_matches 18, mapping_conflict 1, court 1, signature 1)
- Written into the canonical artifact: **9**

### Binding corrections

Each entry names the field's true fact. Because that fact differs from the one the field's own name resolves to, D0's binder refuses the field rather than writing an approximately-right value. A correction can only ever remove a binding.

- `p1.r432.4.x166.rule` → `court.street_address` — 'Court Address' resolves to participant.street_address on the descriptor's bare \baddress\b match. It is the court's address, and D0 keeps court fields blank.

## Holds carried forward

- `state_manifest_generation_allowed_no`
- `edition_1_runtime_disabled`
- `legal_review_mapping_requires_track_level_import_mapping`
- `state_readme_open_items_present`
- `f_independent_visual_review_required`

## State-pack fidelity findings

- The county blank is named by the word printed after it, not before it. The line reads '__________ Judicial District ________________ County', so the text to this blank's left is 'Judicial District' — which resolves to matter.court — and the only word that names it is the 'County' that follows. The census records left, right and beneath labels for every blank, and this binding uses the right-hand one explicitly.
- Of the three Utah petitions, only 1000EX renders its court block cleanly enough to measure. See the 1002EX and 1003EX findings.
- The STATE_README records three Utah open items as `link_only_binary_missing` / `build_blocker`: 1001EX (special-certificate petition), 1021EX and 1023EX (the orders on the special-certificate and cannabis petitions). None is in Edition 1 and none is built. Note that the compiled Utah profile's legacy formInventory does carry a binary for 1023EX, at sha256 24868a504130... (110,830 bytes), which Edition 1 does not — so the build blocker is real for this edition even though an older corpus held the file.
- Eleven of the twelve PDFs in the compiled Utah profile's legacy formInventory match Edition 1 binaries exactly by sha256. Utah's coded state pack is the most faithful of this lane's four states; the single divergence is the 1023EX order described above.

## Status

`implemented_pending_independent_review`. This lane does not approve its own output: visual review, counsel review and source-freshness review remain open, and every hold above is still in force.
