# ak-courtview-set — census-v1 build status

**Outcome: BLOCKED AT STEP 1. No packet artifact was produced, and none should be reported.**

| | |
|---|---|
| Family | `ak-courtview-set` |
| Wave | `census-v1-wave-AK-01` |
| Jurisdiction | AK |
| Strategy | `official_pdf_fill` |
| Form | TF-810 — Request to Exclude Case from Online Public Index (CourtView) under Admin. R. 40(a) / AS 22.35.030 |
| Pinned SHA-256 | `c5e55ce0c0bb2a008ad9cde5e62c4900f413c8fb64a913e94c81554c64b69582` |
| Pinned length | 85,386 bytes (1 page, 23 AcroForm fields) |

## Why the build stopped

Step 1 requires locating the official source bytes and verifying their SHA-256
against `data/rcap-all50/local-source-corpus-index.json`. **The bytes are not in
this container.**

The corpus index resolves TF-810 to
`private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/AK/02_PACKET_FORMS/…`.
`private/` is git-ignored (`.gitignore:53`), so a fresh clone never carries it.
Confirmed: the corpus root does not exist, `OFFICIAL_FORMS_SOURCE_DIR` is unset,
no file of 85,386 bytes exists anywhere on the filesystem, and **none** of the
329 indexed corpus binaries are present. The repo's own
`operational-corpus-precondition` returns `evaluable: false` /
`operational_corpus_absent`.

The instruction is that unverified bytes are not to be built on. Absent bytes are
a stronger stop than mismatched ones, so the build stopped rather than
substituting something.

**`SOURCE_ALREADY_HELD` is not contradicted by this.** The custody
classification is a statement about the verified private corpus — which is real,
and was hash-verified 499/499 at import. It is a statement about custody, not
about reachability from this container. Held is not the same as mounted.

Nothing was acquired. Egress to court hosts is refused by policy and the
instruction forbids acquisition; `public.courts.alaska.gov` was never contacted.

## What was deliberately not done

- **No field map.** A `field-census.json` and `production-field-map.json` for
  this same form already exist under
  `data/rcap-all50/overlays/production/alaska/tf-810-form-en/`, measured in an
  earlier session against this same pinned hash. Copying them forward was
  rejected: step 3 requires boxes **measured off the document**, and inherited
  numbers report a measurement this lane did not take. That overlay is also not
  a verified base — it still carries `f_independent_visual_review_required` and
  `implemented_pending_independent_review`.
- **No fixtures, no artifact hashes.** The factory fills the source binary. With
  no binary there is no artifact, and an artifact hash reported without one would
  be fabricated.
- **No raster, no visual review.** Reviewing a document that was never produced
  is not a review.
- **No verifier weakened, skipped, or quarantined** to make this lane green.
- **No second factory written.** The existing one under
  `scripts/rcap-official-forms/` remains the only one.

This is the failure mode named in `scripts/measure-rcap-oregon-option-geometry.mjs`
— a lane reporting a geometric conclusion it had not actually measured — caught one
step earlier, at the source rather than at the detector.

## What was completed

**`LOCAL_VARIATION_REQUIRED` → `local-variation-record.json`.** Local filing,
fee, venue and delivery variation is a question about route procedure, not about
the geometry of the form's blanks, so it was answerable from committed authority
present in this clone and was finished rather than left undone. 19 items
recorded, each tagged by evidence tier and cited to a specific node in
`src/lib/rcap-engine/compiled/profiles/AK-alaska.json` (read-only) or the frozen
census. Ten are settled from committed authority; seven are marked
`requires_source_bytes` and were **not guessed**; the rest are referred to
counsel.

Headline findings: per-case venue (the trial court and judicial district of the
underlying case); an administrative request, expressly not an adversarial
petition; typically $0; **no participant-side service on any party**; no filing
deadline — the 60-day period is an eligibility precondition, not a deadline; and
relief that is automatic at 60 days, with TF-810 only a backstop to be filed if
the case is still showing.

## Blanks left for the participant, and why

The source gate closed before any field could be written, so **every** blank on
TF-810 is unwritten. These are the ones that must stay unwritten even after it
reopens:

| Blank | Why it stays blank |
|---|---|
| Requestor signature | Participant signature. The requestor signs their own request; the census records signature and date as later-completion fields. |
| Signature date | A signature date attests when a person actually signed. |
| Court response block — "Case removed" / "Case not removed" | Court-only. The clerk completes it and dates it to the requestor. |
| Date sent to requestor | Court-only. |
| Any certificate of mailing, if the form carries one | Must not be prefilled before actual mailing. Not yet known whether such a block exists — that needs the bytes. |

## Discrepancy referred upward, not fixed here

The frozen census records this route's participant attachment as *"proof of the
SIS and any set-aside order"*. An SIS and its set-aside belong to the
AS 12.55.085(e) mechanism — a motion in the underlying criminal case — not to
this AS 22.35.030 / Admin. R. 40 CourtView exclusion. The compiled profile names
the attachment for **this** route as proof of the acquittal or dismissal plus
proof that 60 days have elapsed. The frozen census must not be modified by this
lane, so it is recorded in `local-variation-record.json` for whoever holds it.

## Reopening the gate

1. Mount the corpus at
   `private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1`, or set
   `OFFICIAL_FORMS_SOURCE_DIR`.
2. Run `node scripts/census-v1-ak-courtview-set-source-gate.mjs` — exit 0 only
   when the bytes at the pinned path hash to the pinned SHA-256 at 85,386 bytes.
3. Install dependencies. `node_modules` is absent here;
   `scripts/rcap-all50-overlay-factory-lib.mjs` cannot import `pdf-lib`.
4. Measure with `scripts/lib/pdf-stroked-boxes.mjs` — the corrected detector. The
   older `re`-operator scan tracked no CTM and derived a mark into the margin.

## Approval posture

Output-level legal approval is **REQUESTED, NOT GRANTED**. No commercial route
was opened, no fulfillment record created, and no packet marked proven or
approved.
