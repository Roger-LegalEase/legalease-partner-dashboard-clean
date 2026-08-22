# AR Felony-Petition-Form-f.pdf — production readiness handoff (lane D1)

Component role: principal_petition_or_request. Renderer: AcroForm fill.
Source pinned: sha256 `6065fe0248e9022c866ac2506c02df35b533439f6d15fc40843b709eea375d9b` (178947 bytes, 4 pages, 53 AcroForm fields).

Status: IMPLEMENTED, pending independent visual review. Artifacts and their
digests are in `reports/rendered-artifacts.json`.

## Census

Reconciled field by field against the pinned official binary: 53 of 53 field
names identical, 53 of 53 widget rectangles identical. One type differs by name
only — `Defendants Signature` reads `other` in the committed census and
`unknown` from the official binary; it is a signature control either way,
classified `signature`, never written.

## The field names on this binary do not everywhere describe their boxes

This is the material finding. Measured from the page content stream, page 2's
address block is named one row off:

| field name | the blank its widget actually sits on |
| --- | --- |
| `State` (x=110.76..282.24 y=123.48) | the printed **City:** blank, which ends at x=106.7 |
| `Defendants Address` (x=119.40..158.40, 39.00pt) | the printed **State:** blank — exactly the five-underscore run |
| `Zip code` (x=219.84..282.12) | the printed **Zip code:** blank, which is correct |

The same shift appears elsewhere: `1 The Defendant was arrested on the` is the
arrest-DATE blank in item 1, and `Defendant` (p2 x=136.0..521.5 y=342.8) is the
charge-status continuation blank for item 9, between the printed "the status of
that/those charges is/are as follows:" at y=378.5 and item 10 at y=320.2.

The shared binder decides from the field name, so left alone it writes a
two-letter state code onto the city line, a full legal name where the date of
arrest belongs, and a full legal name in answer to "the status of those charges
is". All three are refused here by role, in the family classification, with the
measured basis recorded against each entry.

`Petitioner` (p3 y=557.3) is the blank directly above the printed word
"Petitioner" in a jurat opening "Comes the Petitioner, ____, under oath". That
line is signed, not typed, and is classified `signature`.

`First Middle and Last name` is refused for the same reason as on the companion
nolle prosequi petition: the shared binder resolves it to
`participant.last_name`.

Five bindings survive and are written — `Case No`, `Zip code`, `COUNTY OF`,
`DOB`, `Comes the Petitioner`. Map and artifact agree exactly: 5 declared,
5 written, nothing written that is not declared. Every refusal has a participant
fallback in `refusalFallbacks`.

## Open for the reviewer

1. Visual review is not discharged. No raster of these artifacts has been read.
2. As on the companion petition, the caption carries no petitioner name and the
   address block is entirely manual. Both are recorded as required manual steps.
3. `scripts/verify-rcap-official-forms-d1.mjs` reports three placeholder-scan
   failures against this family's three artifacts. The scan reads every file in
   a family directory as UTF-8, including PDFs, and matches its repeated-x placeholder pattern against
   three bytes at offset 107456 of the Arkansas court's own compressed stream,
   carried into each artifact at offset 118345. It is the court's binary, not
   text this factory wrote. The companion nolle prosequi petition and the Alaska
   family contain no such byte sequence and are unaffected. Not corrected here:
   the scan is shared verifier code this pass does not modify.

Populate policy: participant and deterministic facts only. No co-branding; the
artifacts carry the issuing body's own document metadata unchanged.
