# AR 7_Nolle_Prosequi_Dismissed_Acquittal_Petition_2020_F.pdf — production readiness handoff (lane D1)

Component role: principal_petition_or_request. Renderer: AcroForm fill.
Source pinned: sha256 `09f323174881934239734e3a418eb4fec0b4bd0f7e199e8698c3af95a659fa61` (529888 bytes, 4 pages, 45 AcroForm fields).

Status: IMPLEMENTED, pending independent visual review. Artifacts and their
digests are in `reports/rendered-artifacts.json`.

## Census

The committed census was extracted from a shadow sample. It was reconciled
field by field against the pinned official binary in this pass: 45 of 45 field
names identical, 45 of 45 widget rectangles identical. One field's type differs
by name only — `Defendants Signature` reads `other` in the committed census and
`unknown` from the official binary's dictionary. It is a signature control under
either name, is classified `signature`, and is never written. The census is
therefore faithful to the pinned bytes and was not rewritten.

## What changed in the map

The draft map declared 15 bindings in the compiled profile's question
vocabulary (`court`, `county`, `packet_intake:*`), which the finalizer does not
consume — it re-derives every binding from the census by field name. Each
declared binding was checked against the printed caption its widget actually
sits on, measured from the page content stream. Eight survive and are written;
seven are refused, five of them because the field's name does not describe the
box it draws in or the box is one the participant signs:

- `First Middle and Last name` — the box is captioned "(First, Middle and Last
  name)" but the shared binder resolves it to `participant.last_name`, which is
  ordered above `participant.full_legal_name`, so the caption would carry the
  surname alone.
- `COUNTY/CITY` — the venue blank in "IN THE ____ COURT OF ____, ARKANSAS". The
  binder resolves it to `participant.city`, ordered above `matter.county`, which
  would name the petitioner's home city as the court's venue.
- `ADDRESS 2` — resolves to the same `participant.street_address` as ADDRESS 1,
  so both lines would carry one street line twice.
- `Petitioner` — two widgets carry this name and one of them is the signature
  line (p3 x=325.1..540.5 y=527.4, directly above the printed word "Petitioner"
  in a jurat opening "Comes the Petitioner, ____, under oath"). A field value
  reaches every widget of its field, so the legitimate verification blank cannot
  be filled without typing a name onto the line the petitioner signs.
- `DEFENDANT` — the blank in "I, ____, do hereby certify that a true and correct
  copy of the foregoing Petition has been provided to..." under the printed
  heading "Certificate of Service" on p4.

`State` was written by the renderer but absent from the draft map. Its widget is
the 39pt blank after the printed "State:", which is correct, so it is declared
here rather than suppressed. Map and artifact now agree exactly: 8 declared,
8 written, nothing written that is not declared.

Every refusal has a participant fallback in `refusalFallbacks`.

## Open for the reviewer

1. Visual review is not discharged. No raster of these artifacts has been read.
2. The caption refusal is the significant one: the petition currently renders
   with no petitioner name in its caption and no venue. Both are recorded as
   required manual steps. Binding them correctly needs the shared binder to be
   able to prefer `participant.full_legal_name` for a box that names all three
   name parts, and `matter.county` for a venue blank — neither is family-local.

Populate policy: participant and deterministic facts only. No co-branding; the
artifacts carry the issuing body's own document metadata unchanged.
