# North Dakota Chapter 12-60.1 conviction sealing — captain candidate evidence

Route: `ND:general-conviction-sealing-under-n-d-c-c-chapter-12-60-1`
Integrated from `claude/grade-a-68h-lane-d`. Lane build base `a25eec4c`.

| | |
|---|---|
| PACKET IMPLEMENTATION | COMPLETE |
| CANDIDATE EVIDENCE | INTEGRATED |
| COMMERCIAL STATUS | HOLD |
| `COMPLETE_PACKET_PROVEN` | NO |

Specification digest: `65c5443226a8f162096ede0278640562ee6f79982dd0cc584a3973863363010e`
Reviewed artifact digest: `913e34a6f714383878397371c8d536bc094afce3a6067cfeb4caefee04e2e270`

## Route selection

`ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05` is **not** the
commercial reference. Signed reclassification
`ND-2026-08-28-NO-PARTICIPANT-FILING` classifies it `non_filing_guidance`, and
its historical pre-effective branch is an official-form branch recorded as not
built. Its wave-1 composed packet is retained as regression coverage only, under
`scripts/verify-nd-nonconviction-product-path.mjs`, and is not a claim that the
route is sellable.

## Source reverification — one MATCH, one SOURCE_MISMATCH

Recomputed from the installed bytes of the mounted Master Library, not accepted
from the committed records.

| Source | Expected (Lane D) | Installed | Result |
|---|---|---|---|
| `ND__SUPPORT__SEALING-CRIMINAL-RECORDS-RESEARCH-GUIDE__…__REV-UNKNOWN__EN.pdf` | `b39a0c1532bff3381382544a3888478835edb2109af597a2468a34e2a5f19a3c` | same | **MATCH** |
| `ND__REFERENCE__WILMA__north-dakota-expungement-sealing-reference__REV-UNKNOWN__EN.rtf` | `68c9109532391768ba04b29801f6e7ed4dbee4e2905b9a79bb162b4cd7905a68` | not installed | **SOURCE_MISMATCH** |

The Wilma reference is absent from the verified corpus, absent from
`data/rcap-all50/local-source-corpus-index.json`, and no file anywhere in the
corpus hashes to that digest. The corpus contains no `.rtf` file at all — it is
329 PDFs plus Markdown and CSV.

The expected hash was **not** rewritten to make the check pass. The route stays
out of `COMPLETE_PACKET_PROVEN`, and the governed source registry reports the
route's launch-graph source id `SFN-61663` as `unaccounted`, so the authority
denies it on the source dimension by arithmetic rather than by this note.

Corpus release the verification was performed against:

| | |
|---|---|
| Release | `source-corpus-2026-08-28` |
| Repository | `Roger-LegalEase/legalease-source-artifacts` |
| Archive | `Expungement_AI_RCAP_Master_Library_Edition_1.zip` |
| Archive SHA-256 | `a26e3ca7d52db4460e53c2eddd893109037702f5c8035f2c698a7e16bad84e89` |
| Install root | `private/source-imports/…` (git-ignored) |

No source bytes are committed.

## Provider reconciliation — NOT RECONCILED

The reviewed artifact was **not** produced by the image the global registry
names, so it is not bound to it.

| | Global registry | Lane D's actual producer |
|---|---|---|
| providerId | `ghcr.io/roger-legalease/rcap-render-worker` | `legalease/nd-chapter-12-60-1-composer` |
| rendererKind | `packet_document_v1` | `composed_pleading_packet_v1` |
| rendererVersion | `1.0.0` | `1.0.0` |
| imageDigest | `sha256:67132df2…` | none — local composer, `pdf-lib@1.17.1` |

Lane D's artifact came from `scripts/lib/nd-grade-a-packet-pdf.mjs` driving
`src/lib/rcap/state-packs/north-dakota/grade-a/composer.ts` in this environment.
Binding it to the hosted worker digest would assert that image produced bytes it
never saw. The record therefore keeps the hosted provider identity and reports
`artifact_validation: not_run`, which is the honest state: no hosted render of
this candidate exists yet.

Closing this dimension requires the candidate to be rendered by the pinned
worker image and the resulting artifact digest bound — not a re-labelling of the
local artifact.

## Output approval — implementation-review evidence only

`docs/rcap/grade-a/north-dakota/OUTPUT_LEGAL_REVIEW.json` is treated as Lane D's
implementation-review evidence. It is **not** converted into independent
output-level legal approval. That conversion requires the approved decision owner
or an authorized reviewer to adopt it explicitly against the exact integrated
specification digest and artifact digest recorded above.

## Legal authority — open, narrowly scoped

No committed legal-authority route contract exists for Chapter 12-60.1
conviction sealing. The route reports `legal_authority: status is pending`. See
`ND_CHAPTER_12_60_1_DECISION_OWNER_REVIEW.md` for the focused review item. This
is an approval and contract task; it does not reopen North Dakota legal research.

## Remaining proofs, as the authority reports them

    artifact_validation: state is not_run with artifact hash absent
    final_verification: state is unbound
    fixture: a deterministic fixture and its hash are required
    legal_authority: status is pending, not approved_by_decision_owner
    official_sources: no official source is bound to this route
    output_legal_approval: state is pending
    packet_specification: a specification hash is required
    packet_specification: the specification is not complete
    visual_review: state is pending, and Grade A requires a page-by-page pass

A payment record, a rendered PDF, and a passing isolated product-path test do
not open commercial authority, and none of them has.
