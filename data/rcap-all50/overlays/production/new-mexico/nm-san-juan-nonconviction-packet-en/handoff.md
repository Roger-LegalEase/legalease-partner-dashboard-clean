# NM NM-SAN-JUAN-NONCONVICTION-PACKET — Petition to Expunge

**Lane** D2B · **Factory** d0-remediated-v1 · **Revision** REV-UNKNOWN · **Language** EN

**Source** `STATES/NM/05_SOURCE_GATED/NM__SOURCE-GATED__NM-SAN-JUAN-NONCONVICTION-PACKET__petition-to-expunge__REV-UNKNOWN__EN.pdf`
**sha256** `d804959b212e2a0df2e3aa51f17609ef237d583ff2cc189747e76b38c2520638` — matches the Edition 1 manifest

## What this document is

Participant-completed filing. Participant and deterministic fields named by the lane's reviewed mapping table are bound; every other class is unwritable. Component role: `local_district_packet_multi_component`.

## What was read

The binary is flat. 264 blanks were measured from the page content streams — printed underscore rules and drawn space runs — and each one's immediate labels were read either side of it.

## What is written

| target | fact |
| --- | --- |
| `Date of Birth:` | `participant.date_of_birth` |
| `Current Mailing Address:` | `participant.street_address` |
| `City:` | `participant.city` |
| `State:` | `participant.state` |
| `Zip Code:` | `participant.zip` |
| `District Court case number(s):` | `matter.case_number` |

## What is deliberately left blank

Blanks measured on the page and refused, by reason:

- `not_on_the_reviewed_anchor_allowlist` — 207
- `protected_category` — 30
- `offense_name_matched_the_full_legal_name_descriptor` — 13
- `which_phone_is_ambiguous_across_three_blanks` — 3
- `prior_expungement_docket_is_clerk_assigned_and_not_a_participant_fact` — 2
- `caption_style_field_not_verified_first_hand_for_this_family` — 2
- `agency_field` — 1

## Evidence

- Canonical, boundary and negative fixtures are finalized artifacts: values materialized into appearances, flattened, sanitized of active content, byte-reproducible.
- The negative fixture wrote 0 values.
- Rendering the canonical fixture twice produced identical bytes.
- 6 expected values, 0 missing from the finalized artifact when re-read from disk.
- None of those values appears in the untouched source, so the blank and filled panels provably differ.
- Contact sheet built from the finalized artifact.
- Mutation suite: 5 mutations, 5 refused as expected.

## Holds carried forward

- `state_manifest_generation_allowed_no` (no) — STATE_MANIFEST.csv
- `edition_1_runtime_disabled` (runtime_disabled) — STATE_MANIFEST.csv
- `freshness:source_or_currentness_gate_open` (source_or_currentness_gate_open) — STATE_MANIFEST.csv
- `source:source_gated` (source_gated) — STATE_MANIFEST.csv
- `legal_review_mapping:requires_track-level import mapping` (requires_track-level import mapping) — STATE_MANIFEST.csv
- `source_gated_never_runtime_selectable` (05_SOURCE_GATED) — Edition 1 folder placement
- `open_item:form-4-954-cannabis-automatic-expungement-petition-fallback` (withdrawn_no_current_form / nonblocking_research_note) — STATES/NM/STATE_README.md
- `state_runtime_disabled` (runtime_disabled) — STATES/NM/STATE_README.md
- `f_independent_visual_review_required` — lane D2B status rule

These are preserved, not cleared. A technically clean render does not make this form a sellable route.
