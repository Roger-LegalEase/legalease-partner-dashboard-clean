# Iowa — RULE-2.86-FORM-5: Rule 2.86 Form 5 - Application to Expunge Prostitution Court Records Under Iowa Code Section 725.1

**Lane** D3B · **Factory** d0-remediated-v1 · **Revision** REV-2024-08 · **Edition** 1.0

Source `STATES/IA/02_PACKET_FORMS/IA__FORM__RULE-2.86-FORM-5__rule-2-86-form-5-application-to-expunge-prostitution-court-records-under-iowa-code-section__REV-2024-08__EN.pdf`
SHA-256 `ed46614b0b182dca05020009f1add549e07ac7d0bbd7328bbd9cc7ae26934cef` — matches the pack manifest.

## What this document is

A defendant's own application to the Iowa District Court, signed under penalty of perjury. The caption, the self-represented signature block and that block's address are the participant's. The attorney block, the signature lines, the split telephone boxes, the conviction date and the certification of service are not, and none of them is written.

Ownership: `participant_completed`. Render strategy: `flat_overlay`. Observed structure: flat, 2 page(s), 0 AcroForm field(s).

## Census and binding

- Census entries: **45**
- Bound by D0's binder: **10**
- Refused: **35** (no_allowlisted_fact_matches 18, signature 2, mapping_conflict 14, attorney 1)
- Written into the canonical artifact: **8**

### Binding corrections

Each entry names the field's true fact. Because that fact differs from the one the field's own name resolves to, D0's binder refuses the field rather than writing an approximately-right value. A correction can only ever remove a binding.

- `p2.r499.4.x112` → `participant.phone_area_code` — the form splits the telephone number into a parenthesised area-code box and a separate number rule; there is one participant.phone fact and no exact mapping for either half, so both stay blank
- `p2.r499.4.x149` → `participant.phone_local_number` — second half of the same split telephone number: no fact describes the local portion on its own
- `p2.r499.4.x306` → `participant.email` — the allowlisted descriptor list resolves the caption 'Email address' to participant.street_address, because the street-address descriptor matches a bare 'address' and is ordered first; writing a street address into an email line is a defect, so the blank is refused
- `p2.r327.4.x108` → `attorney.street_address` — attorney block: the form fills this only when counsel files on the defendant's behalf, and no attorney fact is a participant fact
- `p2.r296.4.x108` → `attorney.city` — attorney block: the form fills this only when counsel files on the defendant's behalf, and no attorney fact is a participant fact
- `p2.r296.4.x306` → `attorney.state` — attorney block: the form fills this only when counsel files on the defendant's behalf, and no attorney fact is a participant fact
- `p2.r265.2.x112` → `attorney.phone_area_code` — attorney block: the form fills this only when counsel files on the defendant's behalf, and no attorney fact is a participant fact
- `p2.r265.2.x148` → `attorney.phone_local_number` — attorney block: the form fills this only when counsel files on the defendant's behalf, and no attorney fact is a participant fact
- `p2.r235.8.x108` → `attorney.email` — attorney block: the form fills this only when counsel files on the defendant's behalf, and no attorney fact is a participant fact
- `p2.r154.7.x86` → `service_recipient.certifying_party_name` — certification of service: this names the county attorney the copy went to, not the participant
- `p2.r115.3.x78` → `service_recipient.recipient_name` — certification of service: this names the county attorney the copy went to, not the participant
- `p2.r90.5.x78` → `service_recipient.street_address` — certification of service: this names the county attorney the copy went to, not the participant
- `p2.r90.5.x330` → `service_recipient.city` — certification of service: this names the county attorney the copy went to, not the participant
- `p2.r90.5.x429` → `service_recipient.state` — certification of service: this names the county attorney the copy went to, not the participant
- `p2.r90.5.x474` → `service_recipient.zip` — certification of service: this names the county attorney the copy went to, not the participant

## Holds carried forward

- `state_manifest_generation_allowed_no`
- `edition_1_runtime_disabled`
- `legal_review_mapping_requires_track_level_import_mapping`
- `f_independent_visual_review_required`

## State-pack fidelity findings

- The compiled Iowa profile's legacy formInventory carries `2_86_4_123_PAULA_Expungement_18A04436D4107.pdf` at sha256 8b2c33815548615733f01f964340fc39efcd8c252ad8c3ee50b97b0639753ffc (807,560 bytes). No Edition 1 binary has that hash. The pack manifest's Rule 2.86 Form 4 is a different revision entirely — 279eefe8c5f6b51ec73eb943c9a479757ff3d2c439177bfbf3044e7e71f66c45, 288,751 bytes, August 2024 — and the manifest records that it supersedes the January 2021 revision already in the historical corpus. The pack manifest wins; the profile is not edited.
- The profile's inventory holds no binary at all for Rule 2.86 Form 5, which Edition 1 does carry. Iowa's coded state pack is therefore behind Edition 1 on both packet forms.

## Status

`implemented_pending_independent_review`. This lane does not approve its own output: visual review, counsel review and source-freshness review remain open, and every hold above is still in force.
