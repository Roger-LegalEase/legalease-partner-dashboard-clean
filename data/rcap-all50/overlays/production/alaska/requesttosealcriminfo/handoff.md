# AK RequestToSealCrimInfo.pdf — production readiness handoff (lane D1)

Component role: principal_petition_or_request. Renderer: flat overlay.
Source pinned: `LegalEase Alaska/RequestToSealCrimInfo.pdf` sha256 `1fb64733f46c397beb69d1da8d72a1f1462669f8dfb7611e86a833c45aa5c80a` (37708 bytes, 6 pages).

Status: IMPLEMENTED, pending independent visual review. The pinned binary was
materialized under `private/`, re-hashed after installation, and rendered.
Artifacts and their digests are in `reports/rendered-artifacts.json`.

## What the document is

Not a scan and not an instructions sheet. It is a born-digital text PDF — 13
font objects, one embedded font program, no image XObjects and no DCT, CCITT or
JBIG2 stream — with no AcroForm dictionary at all. PART II on page 3 is a ruled
table the applicant completes: the page prints "PART II: PERSON AND CASE
INFORMATION. Please fill out ALL items", and page 1 says "PART II requires you
to give information about yourself and the criminal charges/court case."

`source-record.json` still records `classification: "scanned_pdf"`; that is
wrong on the bytes and is corrected in `overlay-profile.json`, which records the
measured structure. The retired sibling package
`alaska/dps-seal-req-2-04-source-gated-en` carries the same digest and reads the
document as `instructional_no_participant_fill` with `documentRole: INSTRUCTIONS`
on a classification of zero entries. That reading is contradicted by the
document's own page 3 and is not carried here. That package is retired and was
not modified.

## How the write boxes were measured

Every box is a rule segment this form draws, read from the page content stream
by `scripts/rcap-official-forms/rcap-pdf-rule-lines.mjs`. PART II is a ruled
grid: each cell prints its caption along the top and is closed by its own rule
segment, so the segment beneath a caption is that cell's write line and its full
width. Each box is that segment inset 1.5pt from its start, with the baseline
2pt above the rule and the right edge at the segment's end, which is where the
form's own vertical divider stands. No coordinate here was estimated.

Five cells are written: FULL NAME, MAILING ADDRESS (street line), PHONE
NUMBER(S), DATE OF BIRTH, TRIAL COURT CASE #. A sixth anchor, SOCIAL SECURITY #,
is carried on purpose and must be refused on every run — by the protected rule
its box lands on, and independently by the binder's government_identifier rule.

Twelve rule segments the court and its agencies own are declared in
`protectedRules`, so a write box that grew wide enough to cross a divider would
be refused by geometry rather than by what it is called.

## Open for the reviewer

1. Visual review is not discharged. No raster of these artifacts has been read.
2. The MAILING ADDRESS cell draws only one rule, so only the street line has a
   measured baseline. The city, state and ZIP line is a required manual step, in
   `refusalFallbacks`. This request is answered by post.
3. Pages 5 and 6 are agency and Commissioner blocks and pages 1, 2 and 4 carry
   no ruled participant cell; the classification records why each is outside the
   denominator.

Populate policy: participant and deterministic facts only. Court, clerk,
prosecutor, agency, identifier, signature, notarization, service and disposition
cells are never populated. No co-branding on the official form; the artifacts
carry the State of Alaska's own document metadata unchanged.
