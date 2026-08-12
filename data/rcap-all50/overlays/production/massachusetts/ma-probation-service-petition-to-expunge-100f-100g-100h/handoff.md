# Massachusetts — MA-PROBATION-SERVICE: Petition to Expunge Under G.L. c. 276, Sections 100F, 100G, or 100H

**Lane** D3B · **Factory** d0-remediated-v1 · **Revision** REV-2018-10-11 · **Edition** 1.0

Source `STATES/MA/05_SOURCE_GATED/MA__SOURCE-GATED__MA-PROBATION-SERVICE__petition-to-expunge-under-g-l-c-276-sections-100f-100g-or-100h__REV-2018-10-11__EN.pdf`
SHA-256 `5ccb13e55c07a520526cad72fe48b506f6a67c51a2c879817feb49829853b0b1` — matches the pack manifest.

## What this document is

A petitioner's own petition addressed to the Commissioner of Probation. It is participant-completed, but its face carries race, ethnicity, Social Security number, occupation, and parents' and spouse's names — five categories D0 protects by default — and its published revision is October 2018, which the Edition 1 manifest records as an open freshness gate.

Ownership: `participant_completed`. Render strategy: `flat_overlay`. Observed structure: flat, 2 page(s), 0 AcroForm field(s).

## Census and binding

- Census entries: **25**
- Bound by D0's binder: **0**
- Refused: **25** (document_does_not_accept_fill 25)
- Written: **0** — source-gated in Edition 1 with the currentness gate open: the manifest records the current published revision as a freshness gate, and Massachusetts expungement practice under c. 276 §§ 100F–100K has moved since this October 2018 sheet. A rendered sample of a possibly-superseded petition would invite exactly the inference this hold exists to prevent.

### Binding corrections

Each entry names the field's true fact. Because that fact differs from the one the field's own name resolves to, D0's binder refuses the field rather than writing an approximately-right value. A correction can only ever remove a binding.

- `p1.r503.9.x155.rule` → `participant.alias_or_former_name` — 'Alias/Maiden/Previous Name' resolves to participant.full_legal_name on the descriptor's bare \\bname\\b match. An alias is a different fact from a legal name, and stamping the legal name into an alias line misstates the record.
- `p1.r450.0.x95.rule` → `third_party.father_name` — 'Father's Name' resolves to participant.full_legal_name on the same bare name match. It names a third party, and the participant's own name is not it.
- `p1.r450.0.x321.rule` → `third_party.mother_maiden_name` — 'Mother's Maiden Name' resolves to participant.full_legal_name on the same bare name match, and is likewise a third party's fact.
- `p1.r450.0.x470.rule` → `third_party.spouse_name` — 'Spouse's Name' resolves to participant.full_legal_name on the same bare name match, and is likewise a third party's fact.
- `p1.r468.0.x436.rule` → `participant.phone_local_number` — the telephone rule sits beside a Social Security number rule in the same band; the lane declines the pair rather than risk the wrong one.

## Holds carried forward

- `state_manifest_generation_allowed_no`
- `edition_1_runtime_disabled`
- `source_or_currentness_gate_open`
- `source_gated_asset`
- `legal_review_mapping_requires_track_level_import_mapping`
- `not_participant_fillable_no_fixture_fill`
- `f_independent_visual_review_required`

## State-pack fidelity findings

- Binder finding, recorded whether or not this form is ever un-gated: run with the document-level hold open, D0's binder resolves 'Alias/Maiden/Previous Name', 'Father's Name', 'Mother's Maiden Name' and 'Spouse's Name' all to participant.full_legal_name, because the descriptor for that fact matches a bare \\bname\\b. A generic fill would have written the petitioner's own name into three third-party blanks and an alias line. The four fields are refused by explicit counter-mapping. This is a descriptor-list observation for D0, not a defect in this state's package.
- The compiled Massachusetts profile's legacy formInventory lists four PDFs — OCP004 (10-day opt-out notice package), fillable-jud-mps-Petition-to-Seal, jud-Petition-for-Expungement and jud-tc-Petition-to-Seal-for-Nolle-Prosequi-or-Dismissal. Not one of their sha256 values appears anywhere in Edition 1, and Edition 1 carries only two Massachusetts binaries. The pack manifest wins.
- OCP004 is not present in the Edition 1 pack in any form. Identity was resolved by sha256 against the pack manifest rather than by filename, so the URL-encoded legacy filename is not the reason it was not found — the binary is simply not in the edition. Nothing is bound to it, and no opinion is recorded here about whether it is participant-completed, because this lane never had the binary to inspect.

## Status

`implemented_pending_independent_review`. This lane does not approve its own output: visual review, counsel review and source-freshness review remain open, and every hold above is still in force.
