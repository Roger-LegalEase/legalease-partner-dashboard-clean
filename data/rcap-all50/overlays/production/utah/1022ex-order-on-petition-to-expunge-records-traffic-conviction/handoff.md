# Utah — 1022EX: Order on Petition to Expunge Records Traffic Conviction

**Lane** D3B · **Factory** d0-remediated-v1 · **Revision** REV-2022-04-11 · **Edition** 1.0

Source `STATES/UT/02_PACKET_FORMS/UT__FORM__1022EX__order-on-petition-to-expunge-records-traffic-conviction__REV-2022-04-11__EN.pdf`
SHA-256 `b0d9c6f1100c7d40e63c1261fa55cc868f91d2fe7cc8df05b6ba0036ff37f952` — matches the pack manifest.

## What this document is

A proposed order the petitioner submits and the court signs. Its decretal paragraphs, its findings and its signature line belong to the judge. D0's caption-only rule governs everything this lane may touch: only a caption fact can bind, so the petitioner's name and the case number are written and the contact block, the address, the telephone number and the email address are refused with the reason recorded.

Ownership: `court_issued`. Render strategy: `flat_overlay`. Observed structure: flat, 2 page(s), 0 AcroForm field(s).

## Census and binding

- Census entries: **26**
- Bound by D0's binder: **2**
- Refused: **24** (court 6, no_allowlisted_fact_matches 13, service_block 1, disposition_or_hearing 2, mapping_conflict 2)
- Written into the canonical artifact: **2**

### Binding corrections

Each entry names the field's true fact. Because that fact differs from the one the field's own name resolves to, D0's binder refuses the field rather than writing an approximately-right value. A correction can only ever remove a binding.

- `p2.r621.1.x187.rule` → `court.ordered_case_number` — The decretal 'case number:' blanks on the later pages sit inside bracketed elections about which records the court orders expunged. They are the court's findings, not the caption, and writing a case number beside an unchecked box would assert an election nobody made.
- `p2.r569.5.x187.rule` → `court.ordered_case_number` — The decretal 'case number:' blanks on the later pages sit inside bracketed elections about which records the court orders expunged. They are the court's findings, not the caption, and writing a case number beside an unchecked box would assert an election nobody made.

## Holds carried forward

- `state_manifest_generation_allowed_no`
- `edition_1_runtime_disabled`
- `legal_review_mapping_requires_track_level_import_mapping`
- `state_readme_open_items_present`
- `f_independent_visual_review_required`

## State-pack fidelity findings

- This order's top contact block is identical to the petitions' and would bind name, address, city/state/zip, telephone and email. Under D0's caption-only rule for a court-issued order, four of the five are refused with reason court_issued_order_accepts_caption_facts_only. That is the intended outcome for an order, and it is what the classification records.

## Status

`implemented_pending_independent_review`. This lane does not approve its own output: visual review, counsel review and source-freshness review remain open, and every hold above is still in force.
