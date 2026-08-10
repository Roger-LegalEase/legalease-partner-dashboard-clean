# E2 Source-Support Audit (intake aid for final E3)

One row per evidence citation submitted by the eight E2 lanes, answering one question per row: do the cited bytes actually support the claim attached to them? The audit adjudicates nothing — E3 owns every acceptance decision. Machine-readable rows: `data/rcap-crosswalk-enrichment/e2-source-support-audit.json`. Every classification is deterministic over committed bytes; `node scripts/verify-rcap-e2-source-support-audit.mjs` recomputes the whole artifact and fails on any drift.

## Method

- Sources resolve from the working tree, or from the pinned commit for `path@commit` citations (read with `git show`, unlike the intake check, which skips fidelity on pins).
- Pointer checks: a jurisdiction-scoped source must belong to the job's jurisdiction; kebab/snake identifiers named in `value` must exist in the cited bytes (absence proofs exempt — absence is their point).
- `exact_verbatim` means the whole normalized `quote` is present in the cited bytes (case, whitespace and punctuation insensitive — the same normalization family as the intake check).
- A quote whose inner 'quoted cores' all verify but whose wrapper is the lane's own prose is `faithful_paraphrase`, or `interpretive_conclusion` when the wrapper draws an inference (marker vocabulary in the script).
- Unquoted text is scored by salient-anchor support: statute citation spines (leading zeros dropped, so `12.55.085` matches `12-55-85`) plus distinctive tokens. High support without inference markers → `faithful_paraphrase`; inference markers → `interpretive_conclusion`; low support → `unsupported_by_cited_source`.
- Support verdicts: `textual` (the bytes state it), `derivable` (verified fragments or anchors carry it), `requires_reread` (a conclusion E3 must re-derive), `no`.
- Severity: high = source_missing / pointer_invalid / unsupported; medium = conclusions and anything requiring a re-read; low = verbatim and supported paraphrase.

## Totals

- Evidence entries audited: **912**
- Non-verbatim rate (recomputed, denominator = all 912 entries incl. pinned): **30.5%** (prior provisional figure: 32.6% over 903 unpinned quotes)

| Classification | Count |
|---|---|
| exact_verbatim | 634 |
| faithful_paraphrase | 215 |
| interpretive_conclusion | 61 |
| pointer_invalid | 1 |
| unsupported_by_cited_source | 1 |

| Support verdict | Count |
|---|---|
| derivable | 244 |
| no | 2 |
| requires_reread | 32 |
| textual | 634 |

| Severity | Count |
|---|---|
| high | 2 |
| low | 843 |
| medium | 67 |

| Flag | Count |
|---|---|
| false_absence | 1 |
| mapping_without_subsection_granularity | 314 |
| official_claim_no_official_source_in_repo | 67 |
| pointer_ids_absent | 1 |
| quoted_core_not_in_source | 11 |
| secondary_authority_for_operative_claim | 640 |

## Per lane

| Lane | Entries | exact_verbatim | faithful_paraphrase | interpretive_conclusion | unsupported | source_missing | pointer_invalid | high sev | flagged |
|---|---|---|---|---|---|---|---|---|---|
| E2-A1 | 156 | 134 | 4 | 18 | 0 | 0 | 0 | 0 | 128 |
| E2-A2 | 114 | 65 | 34 | 13 | 1 | 0 | 1 | 2 | 88 |
| E2-A3 | 97 | 97 | 0 | 0 | 0 | 0 | 0 | 0 | 84 |
| E2-B1 | 153 | 68 | 72 | 13 | 0 | 0 | 0 | 0 | 137 |
| E2-B2 | 157 | 53 | 91 | 13 | 0 | 0 | 0 | 0 | 134 |
| E2-B3 | 162 | 155 | 7 | 0 | 0 | 0 | 0 | 0 | 150 |
| E2-C | 59 | 59 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| E2-D | 14 | 3 | 7 | 4 | 0 | 0 | 0 | 0 | 6 |

## Systemic observations (facts, not adjudications)

- **No official source store exists at this base.** `private/Nationwide Record Clearing/` and `data/record-clearing/` are absent from the tree; the nine pinned `data/record-clearing/...@3b6f4c10` citations resolve only through git history. Every `official_form` citation cites a compiled profile or ledger artifact — the `official_claim_no_official_source_in_repo` flag is therefore systemic, not a lane defect: no E2 lane *could* cite an official artifact from this tree, and lanes that tried the web recorded EGRESS_BLOCKED (e.g. E2-D's webAccessNote).
- **Statutory support is secondary throughout.** Statutory citations resolve to compiled profiles and crosswalk artifacts (repository-derived descriptions of statutes), never to statute text. `secondary_authority_for_operative_claim` marks the subset where a finding proposes an operative outcome with no official source anywhere in its evidence set.
- **Absence proofs are scans, not quotes.** They are classified `interpretive_conclusion` by construction and their support verdict reflects whether the positive anchors they enumerate really are in the cited bytes.
- E2-C carries its evidence under `surplusPathways`, per its surplus-reconciliation contract; its rows carry the `pathwayId` column and its delta-context rows are flagged `quantity_reconciliation_context` so E3 sees which citations exist to reconcile counts rather than to establish authority.

## What this audit does not do

It does not decide whether any proposed mapping, disposition or relationship is correct, does not re-litigate the frozen assignment or denominators, and does not modify any lane's evidence. A `requires_reread` or `high` row is a reading instruction for E3, not a verdict against the finding.

