# Gate B — source resolution, drift, and archive reconciliation

Generator: `scripts/generate-rcap-gate-b-source-resolution.mjs`
Artifact: `data/rcap-all50/gate-b-source-resolution.json`

The generator reconciles all 146 production overlay families against the two
committed records of what this repository holds — the archive index
(`local-source-corpus-index.json`) and the currentness register
(`problematic-pdf-register.json`). It is deterministic: no clock, no network,
no readdir-order dependence. Two consecutive runs produce byte-identical output.

## What is blocked, and why nothing was promoted on it

Two classifications in the Gate B vocabulary — `exact_current_source` and
`current_replacement_requires_rerender` — assert a relationship to the bytes an
issuing body serves *today*. Both blockers below prevent establishing that, so
**this artifact never emits either one**. No asset was promoted on an unproven
currentness claim, and no source requirement was weakened to create movement.

1. **Official hosts are refused from this session.** The egress gateway answered
   `403` to `CONNECT` for `www.nccourts.gov`, `public.courts.alaska.gov` and
   `www.kycourts.gov`. No landing page could be inspected, no form re-acquired,
   and no current-bytes drift comparison performed.
2. **Pinned binaries are absent from this clone.** The corpus root
   `private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1` is
   git-ignored. Archive reconciliation here compares pinned metadata against the
   committed index; it is not a re-hash of the bytes and is not claimed as one.

## Archive reconciliation

| Result | Families |
| --- | ---: |
| `reconciled_against_archive_index` | 107 |
| `pinned_hash_absent_from_canonical_library` | 39 |

For all 107 reconciled families the pinned sha256, archive path and byte length
agree with the index, and every receipt that exists agrees with its record —
**zero path mismatches, zero byte mismatches, zero receipt disagreements**.

The 39 others are `rcap-official-form-source-record/v1` records pinned into
`private/Nationwide Record Clearing/`, whose hashes appear in no Edition 1 asset.
All 39 already carry an exact operator acquisition action.

## Duplicate-URL table

17 URLs are claimed by more than one asset. A shared URL is not by itself drift,
so the table separates the kinds by their own evidence:

| Kind | Groups | Drift? |
| --- | ---: | --- |
| `alias_pair_same_binary` | 10 | no — one binary, one document, two family ids |
| `one_document_all_variants_on_its_landing_page` | 1 | no — but each variant still needs its own PDF |
| `unrelated_document_pinned_to_another_documents_landing_page` | 4 | intruders only |
| `distinct_documents_share_one_direct_pdf_url` | 2 | yes — one PDF cannot be several documents |

Document identity is compared on the **exact** id. Collapsing `CC-1201-A` into
`CC-1201` would hide the thing the table exists to surface.

## Findings

- **NC AOC-CR-297 and AOC-CR-298 are pinned to each other's offense class.**
  `AOC-CR-297` is the nonviolent **felony** petition and `AOC-CR-298` the
  nonviolent **misdemeanor** petition — established by the publishers' own page
  titles, by `src/lib/rcap-engine/compiled/profiles/NC-north-carolina.json`, and
  by the master list's track bindings (`nc_145_5_felony`,
  `nc_145_5_misdemeanor`). Both **form** records pin the other class's page. The
  two **instructions** records are pinned correctly. A petitioner served from
  these pins would receive the form for the wrong offense class.

  > **Correction.** An earlier revision of this document reported the 298 form
  > as "pinned to a felony *instructions* resource", inferred from the word
  > `instructions` in the slug. That inference was wrong: each NC landing page
  > carries the petition **and** its instructions, so the slug proves nothing
  > about the resource type. The defect is the offense-class swap, and it is the
  > **form** records that are swapped, not the instructions records. The
  > generator's heuristic has been replaced with an offense-class comparison,
  > which also cleared four false positives on the 287/288 Spanish and
  > Vietnamese forms.

  The reported flattened records-officer name on the 298 bytes remains
  **unverified** — the binary is absent and the family's committed field census
  records no such field. It must be resolved by acquiring a clean official
  source, never by editing the official form. The pristine source is resolved to
  `assets/documents/forms/cr298_1.pdf` behind the **misdemeanor** landing page;
  see `data/rcap-all50/pdf-source-handoffs/source-resolution/`.
- **`NC:nc-sbi-right-to-review-support-en`** is pinned to the AOC-CR-287
  expunction landing page — an unrelated document's source.
- **VT 600-00228** (2 families) pins three URLs concatenated into one string
  separated by pipes and spaces. Structurally unusable as a URL.
- **12 families pin an HTML document** as the source for a PDF overlay family;
  8 of those filenames are plainly issuing-body index pages (`forms.html`,
  `criminal-forms.html`, `expungements.html`, `Kentucky-Expungement-Forms.html`).
- **VA CC-1201/CC-1201-A** and **VA CC-1203/-A/-B** each pin several distinct
  documents to a single direct PDF URL.

## Classification totals

| Classification | Families |
| --- | ---: |
| `archive_reconciled_currentness_unproven` | 58 |
| `genuinely_no_official_source_identified` | 27 |
| `wrong_identity_offered` | 17 |
| `source_drift_requires_adjudication` | 16 |
| `official_landing_page_resolved` | 18 |
| `direct_url_asset_owned_by_session_11` | 10 |

The last row is not this session's work; it is marked so the two lanes do not
both claim the same assets.
