# ak-tf800-set — BLOCKED at step 1 (source verification)

**Family:** `ak-tf800-set` · **Strategy:** `official_pdf_fill` · **Jurisdiction:** AK
**Document:** TF-800, *Request to Make Case Records Confidential or Sealed Under Administrative Rule 37.6*
**Route:** `obligation:track-only:AK:ak-tf800`
**Date:** 2026-08-30 · **Verdict:** `SOURCE_BYTES_ABSENT` (gate exit 2)

## What happened

The build order for this family begins: *locate the official source bytes and verify the
SHA-256 against the corpus index; mismatch means stop and report, not build.*

The corpus index pins the digest. The bytes are not in this environment. I could not
verify, so I stopped and did not build.

## The pinned identity is consistent — that is not the problem

| Record | SHA-256 | Bytes |
|---|---|---|
| `local-source-corpus-index.json` | `94bab525…b898cbd` | 130602 |
| production `source-record.json` | `94bab525…b898cbd` | 130602 |
| production `source-receipt.json` | `94bab525…b898cbd` | 130602 |
| production `field-census.json` | `94bab525…b898cbd` | — |
| production `artifact-provenance.json` | `94bab525…b898cbd` | — |

Full digest: `94bab52533d74551f7a8ff8644a9671241b38075c7e05f10806d627dfb898cbd`

Five independent records agree. What is missing is the file itself, which is what a
digest has to be checked *against*.

## Why the bytes cannot be obtained here

Expected at:

```
private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/AK/
  02_PACKET_FORMS/AK__FORM__TF-800__request-to-make-case-records-confidential-
  or-sealed-under-administrative-rule-37-6__REV-2025-05__EN.pdf
```

- `private/` does not exist in this checkout.
- `private/` is git-ignored (`.gitignore:53`) and `git ls-files` tracks **0** paths beneath
  it — so no clone of this repository can ever carry these bytes.
- `private/Nationwide Record Clearing` is absent too; the repo's own
  `operational-corpus-precondition.mjs` reports `exists: false` for both trees.
- `rcap-all50-overlay-factory-lib.mjs:568` throws `Nationwide source directory not found`
  on this same absence.
- A filesystem-wide sweep found no file of length 130602 and no Master Library or
  Nationwide tree at any path.
- `OFFICIAL_FORMS_SOURCE_DIR` and `RCAP_MASTER_LIBRARY_DIR` are unset.
- Egress to court hosts is refused, and the build order forbids acquiring anything.

## The refusal discriminates

A gate that always says no proves nothing. Before recording this verdict I exercised all
four branches against synthetic roots:

| Branch | Condition | Exit |
|---|---|---|
| `VERIFIED` | mounted bytes hash to the pinned digest | 0 |
| `DIGEST_MISMATCH` | mounted bytes hash to anything else | 3 |
| `SOURCE_BYTES_ABSENT` | digest pinned, bytes not mounted | 2 |
| `INDEX_ENTRY_ABSENT` | index names no such entry | 4 |

All four behave correctly. `SOURCE_BYTES_ABSENT` here is a positive finding of absence.

## Why I did not build the rest on documentary grounds

Steps 2, 3, 6, 7 and 8 all consume the binary — geometry must be *measured* off the
document, fixtures rendered *from* it, and verification read back out of the resulting
artifact bytes. `OFFICIAL_FORM_MAP_REQUIRED` is not discharged by a map whose write boxes
were never measured, and `ARTIFACT_REVIEW_REQUIRED` is not discharged with no artifact.

Filing the remaining work types as complete on paperwork alone would reproduce precisely
the failure `operational-corpus-precondition.mjs` was written to stop — a missing
directory read as a passing condition:

> An absent tree is not an empty tree. An empty directory is not a proof that nothing
> references an asset.

## Created / not created

Created: this record, `source-verification.json`, `reports/inherited-evidence-findings.json`,
and `scripts/rcap-census-v1-ak-tf800-set-source-gate.mjs`.

**Not** created: field map, fixtures, artifacts, rasters, visual review, product wiring,
runtime authority, commercial authority, fulfillment record, output approval. Nothing is
marked proven or approved. No verifier was weakened, skipped or quarantined. The frozen
census, the stale-artifact block, the ledger, workflows, `package.json` and the production
overlay were read only and are unmodified.

## Blanks left for the participant

The build produced no fill, so every one of the 26 fields is blank. That is the absence of
a build, not a considered fill policy — but three are blanks that must **stay** blank on
resume, and the reasons are recorded now so they are not lost:

| Field | Page | Why it stays blank |
|---|---|---|
| `signature0` | 2 | Participant signature — never prefilled. |
| `certDate` | 2 | Certificate-of-mailing date. Prefilling asserts service occurred on a date the platform chose. Inherited class is `deterministic`; see finding **F2** — that does not carry over to this family. |
| `emailCB` | 2 | Delivery-method checkbox inside the same certificate block. Its three siblings (`mail`, `hd`, `tf`) are unwritable; this one is not, which reads as a slip. See **F2**. |

The inherited classification also holds 17 fields unwritable (16 `manual`, 1 `signature`)
out of 26 — 8 participant, 1 deterministic. Those counts are the production lane's and
must be re-derived first-hand for this family.

## Findings for whoever resumes

Three, in `reports/inherited-evidence-findings.json`:

- **F1 (high)** — Inherited `effectiveLabel` values are positional inferences and mis-bind.
  26 fields carry only 13 distinct labels; 19 share a label with another field; `address`,
  `name` and `email` all read "Address". Reuse the widget rects, which are structural
  geometry from the verified binary. Re-derive the labels.
- **F2 (high)** — `certDate` / `emailCB` in the certificate-of-mailing block, above.
- **F3 (medium)** — The 29-vs-26 count gap is a units mismatch (29 *widgets*, 26 *fields*),
  not a missing field. And `caseNo` carries three widgets, on pages 1, 2 **and 3** — it is
  the only field on page 3. So page 3 is legitimately written; a verifier demanding page 3
  stay untouched will either fire falsely or, if satisfied, mean the case number was left
  blank in that page's header. Byte verification must check all three coordinates.

## To resume

```sh
# 1. mount the Edition 1 Master Library, or:
export RCAP_MASTER_LIBRARY_DIR=/path/to/Expungement_AI_RCAP_Master_Library_Edition_1
# 2. pdf-lib is not installed in this container:
npm install
# 3. re-run the gate:
node scripts/rcap-census-v1-ak-tf800-set-source-gate.mjs
```

Resume only on `VERIFIED`. On `DIGEST_MISMATCH`, stop and report — bytes that are present
but not the pinned edition are a different form, not a usable one.
