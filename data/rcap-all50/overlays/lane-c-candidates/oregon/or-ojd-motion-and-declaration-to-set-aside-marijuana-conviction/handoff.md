# Oregon — OR-OJD-MJ-PCR: Motion and Declaration to Modify or Set Aside Marijuana Conviction

**Lane** D3B · **Factory** d0-remediated-v1 · **Revision** REV-2023-07 · **Edition** 1.0

Source `STATES/OR/02_PACKET_FORMS/OR__FORM__OR-OJD-MJ-PCR__motion-and-declaration-to-modify-or-set-aside-marijuana-conviction__REV-2023-07__EN.pdf`
SHA-256 `6e7a2cde0c963159ad3b467a85985d8034f33f8bfa44d380bbaab774c55bcbd6` — matches the pack manifest.

## What this document is

A defendant's own motion and declaration under ORS 475C.397 and ORS 137.222. The caption, the identity block and the declaration's contact block are the participant's. The crime description, the SID and fingerprint numbers, both signature lines and the certificate of mailing are not.

Ownership: `participant_completed`. Render strategy: `flat_overlay`. Observed structure: flat, 2 page(s), 0 AcroForm field(s).

## Census and binding

- Census entries: **21**
- Bound by D0's binder: **7**
- Refused: **14** (no_allowlisted_fact_matches 9, signature 2, mapping_conflict 2, prosecutor 1)
- Written into the canonical artifact: **8**

### Binding corrections

Each entry names the field's true fact. Because that fact differs from the one the field's own name resolves to, D0's binder refuses the field rather than writing an approximately-right value. A correction can only ever remove a binding.

- `p2.r371.6.x288.rule` → `service_recipient.certifying_party_name` — 'Name (typed or printed)' inside the certificate of mailing rather than the declaration. The identical caption appears in both blocks; only the declaration's copy is written.
- `p2.r577.7.x432.rule` → `participant.phone_second_rule_segment` — the telephone blank is drawn as two rule segments under one 'Phone Number' caption, and both resolve to participant.phone. The number is written once, into the segment the caption sits over; writing it into both would duplicate it on the page.

## Holds carried forward

- `state_manifest_generation_allowed_no`
- `edition_1_runtime_disabled`
- `legal_review_mapping_requires_track_level_import_mapping`
- `state_readme_open_items_present`
- `f_independent_visual_review_required`

## State-pack fidelity findings

- The compiled Oregon profile's legacy formInventory holds no binary for this motion at all — its only Oregon PDF is the adult set-aside packet, at a hash Edition 1 does not carry. Oregon's coded state pack is behind Edition 1 on both packet forms.
- Date presentation, recorded for D0 rather than for Oregon: this form captions its date-of-birth blank MM/DD/YYYY, and the factory writes 1991-04-17. D0's type check requires date facts in ISO 8601 form and there is no presentation layer between the fact and the page, so every date this factory writes is ISO. The value is correct and unambiguous, but it does not follow the caption. A per-form date format belongs in the shared factory, not in a lane.
- This form's captions use slashes rather than commas ('City/State/Zip'), which the city_state_zip descriptor matches directly. No explicit fact mapping is needed here, unlike the adult packet's comma-separated caption for the same field.

## Status

`implemented_pending_independent_review`. This lane does not approve its own output: visual review, counsel review and source-freshness review remain open, and every hold above is still in force.
