# RCAP PDF inventory closure — status

Head: `a7c9f0aa0dc19bb569783691e0bc0e65c0b57605`

## The denominator

| | count |
| --- | ---: |
| original operational PDF assets | 128 |
| platform_ready | 1 |
| retired | 40 |
| retained_problematic | 87 |
| changed by this lane | 0 |

Every route to moving a row terminates at the same place: the source corpus is not mounted in this environment and outbound retrieval is refused, so no retirement can satisfy its seventh condition, no source can be accepted, and no family can be re-rendered.

## Workstream 1 — retirements

30 candidates. Six of the seven conditions reproduce for all of them; the seventh — that the regenerated manifest no longer names the asset — cannot be evaluated because the manifest is generated from a corpus this container does not hold. 1 refused: VA CC-1473, because the byte-pinned legal-design registry binds it to `va_exp_nonconviction`.

## Workstream 2 — missing binaries

| disposition | rows |
| --- | ---: |
| exact_form_and_revision_found | 10 |
| source_drift_requires_comparison | 6 |
| official_landing_page_requires_resolution | 11 |
| genuinely_no_official_source_identified | 12 |

No row is left at generic `missing_binary`. 10 rows have their identity proven against the committed corpus index; none is accepted, because accepting a source means hashing its bytes, and the bytes are not here.

## Workstream 3 — independent review

The 27 automated-green families were reviewed at this exact head by `claude/rcap-pdf-independent-review-batch-1`. This lane adopted that review rather than repeating it, and re-verified the freeze: 81 of 81 artifact hashes still match the bytes on disk, 0 drifted, 0 absent.

Verdicts: 0 approved, 26 correction_required, 1 source_identity_unresolved.

## Workstream 4 — correction packets

| root cause | kind | families |
| --- | --- | ---: |
| RC-C-GEOMETRY-NOT-AN-INPUT | incomplete_classification | 12 |
| RC-C-MANUAL-NOT-NEVER-WRITE | incomplete_classification | 4 |
| RC-M-NO-SSN-RULE | incorrect_participant_mapping | 3 |
| RC-M-NO-REFUSE-WHEN | incorrect_participant_mapping | 9 |
| RC-M-SERVICE-BLOCK-BY-NAME | incorrect_participant_mapping | 3 |
| RC-G-CAPTION-VARIANTS | geometry_or_caption_error | 5 |
| RC-V-VALUE-NOT-VISIBLE | expected_value_not_visible | 1 |
| RC-B-NO-APPROVAL-CHANNEL | wrong_packet_family_binding | 26 |
| RC-P-SIDECAR-NONCONFORMANT | substantive_source_or_design_hold | 27 |
| RC-S-REVISION-DRIFT | source_revision_drift | 1 |
| RC-S-IDENTITY-UNRESOLVED | substantive_source_or_design_hold | 1 |

Order of work:

1. RC-B-NO-APPROVAL-CHANNEL — until an AcroForm-fill family can record an approval, no amount of form-level correction can move the count.
1. RC-C-GEOMETRY-NOT-AN-INPUT — the one change that closes most of the 26 at once.
1. RC-C-MANUAL-NOT-NEVER-WRITE and RC-M-NO-SSN-RULE — two small edits, both in shared code, both with filed-document consequences.
1. RC-M-NO-REFUSE-WHEN and RC-M-SERVICE-BLOCK-BY-NAME — then re-derive the field maps and re-render.
1. RC-G-CAPTION-VARIANTS, RC-V-VALUE-NOT-VISIBLE, RC-S-REVISION-DRIFT — what is left after the shared fixes, worth reviewing individually.

## Blockers

### BLK-CORPUS-UNMOUNTED

private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1 is mounted and verifies to the byte. private/Nationwide Record Clearing is still absent, and it is a different tree.

- blocks workstream 1 — the seventh retirement condition, for all 30 candidates
- blocks workstream 2 — materialisation, which belongs to the implementation lane in any case

Cleared by: Deliver private/Nationwide Record Clearing — the 409-form LegalEase <State>/ tree the overlay factory reads. The Master Library does not substitute: none of the 30 candidates' files is in it. (owned by environment)

### BLK-EGRESS-REFUSED

Outbound HTTPS to court publisher hosts is refused by the agent proxy with 403 at CONNECT.

- blocks workstream 2 — the last step of the search order, official public source retrieval

Cleared by: An egress allowance for the recorded official publisher hosts. (owned by environment)

### BLK-NO-APPROVAL-CHANNEL

26 of the 27 reviewed families are AcroForm-fill and carry production-field-map.json, which the shared platform-ready gate did not read. They could not record an approval however clean their review.


Cleared by: undefined (owned by this lane, and done)

### BLK-NO-APPROVED-RECORD

Every canonical review record refuses at condition 1 — its verdict is not the canonical approved verdict. The gate has somewhere to read an approval from and there is no approval to read.

- blocks workstream 3 — every increment to platform_ready

Cleared by: The correction packets, worked through in their stated order, then a re-review that returns approved_platform_ready against the re-rendered bytes. (owned by claude/rcap-problematic-pdf-full-remediation, then the review lane)

## Completion gate

| | required | observed |
| --- | ---: | ---: |
| platform_ready + retired | 128 | 41 |
| retained_problematic | 0 | 87 |
| retained_missing | 0 | 39 |
| retained_source_unknown | 0 | 12 |
| retained_unreviewed | 0 | 60 |

Not met.
