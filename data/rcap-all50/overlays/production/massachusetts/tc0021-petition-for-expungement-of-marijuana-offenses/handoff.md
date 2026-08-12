# Massachusetts — TC0021: Petition for Expungement of Marijuana Offenses, G.L. c. 276, Section 100K 1/4

**Lane** D3B · **Factory** d0-remediated-v1 · **Revision** REV-2022-11 · **Edition** 1.0

Source `STATES/MA/05_SOURCE_GATED/MA__SOURCE-GATED__TC0021__petition-for-expungement-of-marijuana-offenses-g-l-c-276-section-100k-1-4__REV-2022-11__EN.pdf`
SHA-256 `a9d80fab51668c59a15b559aa0f5021e8b4bf661fa83429ef22b31157cbf565c` — matches the pack manifest.

## What this document is

A petitioner's own Trial Court petition, sworn under the pains and penalties of perjury. Its 29 AcroForm fields are XFA-generated and carry no meaningful names — every one is form1[0].#subform[0].TextField1[n] or CheckBoxN[n] — so not one of them matches an allowlisted fact descriptor and D0's binder refuses the entire form on its own terms.

Ownership: `participant_completed`. Render strategy: `acroform_fill`. Observed structure: acroform, 2 page(s), 29 AcroForm field(s).

## Census and binding

- Census entries: **29**
- Bound by D0's binder: **0**
- Refused: **29** (document_does_not_accept_fill 29)
- Written: **0** — source-gated and XFA. The Edition 1 manifest states that the runtime renderer cannot fill XFA and that the form is to be preserved as source-gated until converted or handled by an approved strategy. Independently of that hold, all 29 field names are XFA-generated positional identifiers, so D0's fail-closed binder matches none of them to a fact descriptor.

## Holds carried forward

- `state_manifest_generation_allowed_no`
- `edition_1_runtime_disabled`
- `source_or_currentness_gate_open`
- `source_gated_asset`
- `legal_review_mapping_requires_track_level_import_mapping`
- `not_participant_fillable_no_fixture_fill`
- `xfa_source_runtime_renderer_cannot_fill`
- `f_independent_visual_review_required`

## State-pack fidelity findings

- The profile's legacy `jud-Petition-for-Expungement.pdf` (sha256 19842819786d812c82c0b310aed8a5065e516a95122a59e0662a7ca67159a5ce, 1,387,408 bytes) is not this binary. Edition 1's TC0021 is a9d80fab51668c59a15b559aa0f5021e8b4bf661fa83429ef22b31157cbf565c at 1,393,680 bytes, revision 11/22. The pack manifest wins; the profile is not edited.
- The manifest classes TC0021 as `acroform_pdf` with 29 fields, which the binary confirms, and separately notes that it is XFA. Both are true: an XFA form ships an AcroForm fallback layer. The fallback is what pdf-lib can see, and its field names carry no semantics.

## Status

`implemented_pending_independent_review`. This lane does not approve its own output: visual review, counsel review and source-freshness review remain open, and every hold above is still in force.
