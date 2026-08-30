# ak-tf805-set — official_pdf_fill (ROUTE OBLIGATION CENSUS V1)

**Route:** `obligation:track-only:AK:ak-tf805` — Name-Only Removal From The Public
Index, Alaska Court System form TF-805 (5/25), Administrative Rule 40(b) or (c).

## Outcome: built, pending human review

All eight ordered steps are discharged. The family renders, and every assertion
below was read back out of the artifact bytes rather than taken from the render
report. Two things remain, and both are human: an independent visual review by
someone other than the agent that rendered the pages, and output-level legal
approval. This lane requests both and grants neither.

## What changed since this family stopped

The previous lane stopped at step 1 because the official binary was not on disk,
and that refusal was correct — an absent file is not an empty one. The corpus was
never missing; it was one command away. `scripts/rcap-corpus/bootstrap-private-corpus.sh`
recovered it in this container, verifying the archive SHA-256 and the corpus's own
governance checksums before extracting, and the source gate now reports:

    sha256     96306d64eda397e25094f92c3d67a642372b82cba12f97c6666e5500136e8f54
    byteLength 93899          verified: true          verdict: PROCEED

Nothing was acquired. Egress to court and agency hosts was neither attempted nor
needed, and no mirror, cache or aggregator was used.

## Measured, not inherited

The predecessor carried the production lane's coordinates forward marked
`inherited`, and was right to mark them that way. This lane measured the document
itself. `measurement-vs-inherited.json` compares the two in that direction —
inherited checked against measured, never the reverse — and reports **17 of 17
fields and all 18 widgets in agreement**, every rectangle rounding to the
inherited integer, every page and every type matching.

The agreement confirms the previous lane's custody chain. It does not make
inheriting sufficient, because measuring found five things inheriting could not:

- **The certificate of service is drawn inside a box**, measured at
  `x 56.40..553.65, y 501.62..604.22` on page 2. All eight page-2 widgets lie
  inside it. That gives this family a *geometric* service-block assertion instead
  of a name-based one.
- **The region channel is silent on this document.** TF-805 sets every line at
  11pt and prints "Certificate of Service" in mixed case, so `pageRegions`
  detects no heading there. No widget on either page is inside any region.
- **The ORDER block has no fillable field at all** — four stroked checkboxes and
  zero AcroForm widgets. The platform can write nothing into the court's order.
- **`tf` is TrueFiling**, which the truncated inherited label fragment could not
  show.
- **The five-year window attaches to Rule 40(c) only.** Rule 40(b)'s decretal
  paragraph carries no time limit.

## The refusals that were only luck, and are now decisions

Six of the eight certificate-of-service fields were refused by accident: four by
the checkbox type guard, two because no descriptor happens to match their names.
A refusal that depends on a form's typography or on a field's spelling is not a
refusal. This family refuses eight fields by **role** — `time2`, `needText1`,
`mail`, `hd`, `tf`, `emailCB`, `why` and `reason` — and proves the block empty by
measured geometry.

`certDate` and `signature0` are deliberately **not** in that list. They are caught
by the shared service_block and signature rules, and leaving them there keeps the
shared channel observable: if either rule ever stops working, this family's
verification fails instead of quietly covering for it.

The predecessor's carried-forward finding — that `reports/protected-fields.json`
in the production overlay omits `certDate` and `emailCB` — is confirmed against
the binary and both fields are blank in both fixtures. The production overlay was
still not modified; this lane does not own it.

## What renders

| Fixture | Written | Refused | Notes |
|---|---|---|---|
| canonical | 6 | 11 | name, address, email, dayPhone, caseNo, partyNames |
| boundary | 5 | 12 | the 88-character email refused as unfittable rather than clipped |

Page 2 is blank of participant ink in both. Every page of both fixtures was
rastered and looked at.

## Files

| File | What it is |
|---|---|
| `source-verification.json` | The step-1 gate verdict, written from bytes on disk. |
| `field-census.census-v1.json` | 17 fields with measured geometry, plus the stroked geometry and the measured certificate-of-service box. |
| `production-field-map.json` | Write boxes, role refusals and binder refusals. |
| `measurement-vs-inherited.json` | This lane's measurement compared against the inherited record, field by field. |
| `inherited-measurements.json` | The previous lane's record, retained as the cross-check it now is. |
| `local-variation.json` | Filing, fee, venue, verification and delivery — with what the document resolved and what is still open. |
| `product-wiring.json` | A specification, not an installation. Five install preconditions, three met. |
| `build-record.json` | All eight steps and all work types. |
| `build-findings.json` | Zero blocking findings; four observations. |
| `approval-request.json` | A request for output legal review. Not an approval. |
| `reports/` | The proofs, each read from the artifact bytes. |
| `fixtures/`, `raster/` | The rendered PDFs and every page as an image. |

## Findings carried to whoever owns the shared code

Three of the four observations in `build-findings.json` concern code outside this
family's owned path. They are reported, not edited.

1. **`pageRegions` detects no region on this document.** The heading heuristic
   needs a line set larger than body text or fully capitalised; TF-805 is
   uniformly 11pt. Changing the heuristic would move region detection for every
   family in the corpus, which is not this lane's call.
2. **The reference build reads page content undecoded.**
   `scripts/build-census-v1-ar-arrest-seal-set.mjs` calls
   `PDFRawStream.getContents()`, which returns Flate-compressed bytes. The
   detector then matches no operators and returns an empty array *without
   erroring*. All 66 fields in that family's census carry
   `measuredRuleUnderWriteBox: null` — empty, not absent. Confirmed by re-reading
   both its sources here with `decodePDFRawStream`: raw lengths 2–5 KB against
   decoded 6–18 KB, zero rectangles raw on every Arkansas page, and rectangles on
   several once decoded. Nothing that family wrote is wrong — its write boxes are
   widget rectangles and were never derived from stroked geometry — but a
   corroborating channel that silently did not run reads like a form that draws
   nothing. On TF-805 the difference is 0 rectangles against 11.
3. **`selectOnePerSlot` merges two distinct printed lines.** `caseName`
   (y 490.26..504.66) and `partyNames` (y 476.26..490.66) overlap by 0.40pt,
   because the widgets are 14.40pt tall on a 14.00pt line pitch. They are merged
   into one slot and `caseName` is refused as a duplicate. The outcome is the
   right one — Party Names is the blank this form exists to fill — but it was
   decided by which box is bigger. Had the areas fallen the other way, a request
   to remove a party's name from the public index would render with Party Names
   empty.

## What this grants

Nothing. No commercial route is opened, no fulfilment record exists, no packet is
marked proven, and the track is still absent from compiled runtime.
`generationAllowed` is false and `runtimeSelectable` is false. Output legal
approval is **requested, not granted**.

## Still outstanding

- A human independent visual review of the four rastered pages.
- Output-level legal approval.
- **The Alaska filing fee.** TF-805 prints nothing about a fee, and the form's
  silence is not evidence that none is due. This must not be presented to a
  participant as fee-free.

## Reproducing

```
bash scripts/rcap-corpus/bootstrap-private-corpus.sh
node scripts/verify-packet-build-environment.mjs --family ak-tf805-set --branch claude/census-v1-build-ak-tf805-set
node scripts/rcap-census-v1-ak-tf805-set-verify.mjs      # must print PROCEED
node scripts/build-census-v1-ak-tf805-set.mjs            # must print OK
```
