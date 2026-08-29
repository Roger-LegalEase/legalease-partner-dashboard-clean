# Oregon — OR-OJD-ADULT-SET-ASIDE-PACKET: OJD Criminal Set-Aside Adult Packet

**Lane** D3B · **Factory** d0-remediated-v1 · **Revision** REV-2026-01 · **Edition** 1.0

Source `STATES/OR/02_PACKET_FORMS/OR__FORM__OR-OJD-ADULT-SET-ASIDE-PACKET__ojd-criminal-set-aside-adult-packet__REV-2026-01__EN.pdf`
SHA-256 `b22cc346caf6c38730e9992d74016e948180d92b379b6592ab333b06ac880071` — matches the pack manifest.

## What this document is

A five-page OJD packet. Pages 1 to 3 are participant instructions and eligibility tables and carry no blanks a participant fills; pages 4 and 5 are the motion and declaration the participant signs and files. The caption, the defendant's identity block and the declaration's own contact block belong to the participant. The charge and offence tables, the citing agency, the arrest date, the fingerprint and SID numbers, both signature lines and the certificate of mailing do not.

Ownership: `participant_completed`. Render strategy: `flat_overlay`. Observed structure: flat, 5 page(s), 0 AcroForm field(s).

## Census and binding

- Census entries: **76**
- Bound by D0's binder: **7**
- Refused: **69** (no_allowlisted_fact_matches 59, mapping_conflict 5, agency 1, sensitive_fact 1, signature 2, prosecutor 1)
- Written into the canonical artifact: **8**

### Binding corrections

Each entry names the field's true fact. Because that fact differs from the one the field's own name resolves to, D0's binder refuses the field rather than writing an approximately-right value. A correction can only ever remove a binding.

- `p4.r295.2.x144.rule` → `matter.charges[n].charge` — 'Name of Charges' is the header of a seven-row charge table, and the descriptor list resolves it to participant.full_legal_name on a bare name match. A charge row may only be written from an indexed participant fact this lane does not supply, so every row stays blank.
- `p4.r282.1.x477.rule` → `matter.charges[n].count_number` — second column of the same charge table ('Count #'), resolved to participant.full_legal_name by the header above it for the same reason.
- `p4.r128.4.x126.rule` → `matter.charges[n].citation_or_arrest_offense` — 'Name of Citation/Arrest Offenses' heads a second five-row table and resolves the same way. Offence rows are charge-row facts.
- `p5.r115.6.x288.rule` → `service_recipient.certifying_defendant_name` — 'Defendant Name' inside the certificate of mailing. The block records service on the prosecuting attorney, and D0 keeps service blocks blank.
- `p3.r256.2.x341.rule` → `not_a_participant_blank.underline_inside_instruction_text` — an underline drawn inside a sentence on the instruction pages, not a blank. It follows '...contact the Oregon State Bar Lawyer Referral Service' and so resolves to participant.state. Recorded rather than dropped: the census reports every rule the document draws, and this one is not a field.

## Holds carried forward

- `state_manifest_generation_allowed_no`
- `edition_1_runtime_disabled`
- `legal_review_mapping_requires_track_level_import_mapping`
- `state_readme_open_items_present`
- `f_independent_visual_review_required`

## State-pack fidelity findings

- The compiled Oregon profile's legacy formInventory carries `CriminalSetAside_AdultCases2.pdf` at sha256 6d1f70c6079d56dc49fff49ac356d53e1b3c3749515f1c5029d3e39e1899b69a (253,599 bytes). Edition 1's packet is b22cc346caf6c38730e9992d74016e948180d92b379b6592ab333b06ac880071 at 256,978 bytes, revision January 2026. Different binaries; the pack manifest wins and the profile is not edited.
- Correction to an earlier reading in this lane: the address sub-regions were first built with an explicit fact mapping, on the belief that the commas in the caption 'City, State, ZIP' defeat the city_state_zip descriptor's /city\s*state\s*zip/. They do not. D0's haystack carries a fully squashed copy of every name alongside the separator-normalised one, and 'citystatezip' matches directly. The override was unnecessary, and it and its machinery are gone; the caption binds on the binder's own terms.
- Sub-region evidence: the address rule on page 5 spans x 72 to 540 and carries three captions beneath it — 'Address' at x 72, 'City, State, ZIP' at x 252 and 'Phone' at x 504. Each sub-region runs from its own caption's left edge to the next caption's left edge. The phone span is only 34 points wide, which is the form's geometry rather than this lane's choice; whether a telephone number fits it at or above the six-point readable floor is left to D0's fitter and recorded in the overflow report.
- Date presentation, recorded for D0 rather than for Oregon: this form captions its date-of-birth blank MM/DD/YYYY, and the factory writes 1991-04-17. D0's type check requires date facts in ISO 8601 form and there is no presentation layer between the fact and the page, so every date this factory writes is ISO. The value is correct and unambiguous, but it does not follow the caption. A per-form date format belongs in the shared factory, not in a lane.
- The STATE_README records one open item for Oregon — OJD or county set-aside packets for supported counties plus OSP fingerprint materials, classed `local_jurisdiction_required` / `jurisdiction_input_required`. It is carried forward as a hold, not cleared.

## Status

`implemented_pending_independent_review`. This lane does not approve its own output: visual review, counsel review and source-freshness review remain open, and every hold above is still in force.
