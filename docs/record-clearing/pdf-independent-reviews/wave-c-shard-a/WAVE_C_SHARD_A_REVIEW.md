# Gate B Independent Review — Wave C, Shard A

**Four families reviewed. Two approved, two require correction.**

| Family | Verdict |
|---|---|
| `AK:tf-800-form-en` | **approved_platform_ready** |
| `AK:tf-805-form-en` | **approved_platform_ready** |
| `KY:aoc-334-form-en` | **correction_required** |
| `KY:aoc-496-3-form-en` | **correction_required** |

Machine-readable record with every pinned hash: `data/rcap-all50/pdf-independent-reviews/wave-c-shard-a/verdicts.json`.
Focused verifier: `data/rcap-all50/pdf-independent-reviews/wave-c-shard-a/verify-wave-c-shard-a.mjs` — 111 checks, passing.

Nothing was repaired. No artifact, source binary, map, classification, sidecar, raster,
evidence generator, implementation path, register count or retirement record was modified.

## What was actually verified

Every source SHA-256 was recomputed from the official PDF bytes in the reviewer source
pack and matched both the pack manifest and the sidecar's pinned `sourceSha256` — **4 of 4
exact**. Visible form numbers were read off the page: `TF-800 (5/25)`, `TF-805 (5/25)`,
`AOC-334 Rev. 1-22`, `AOC-496.3 Rev. 6-23`.

All nine relevant pages (3 + 2 + 1 + 3) were rendered from both the blank source and the
finalized artifact and inspected visually, not read from JSON. Placement was additionally
proven geometrically: every text run added by finalization was matched against the writable
rectangles published by the blank source's own AcroForm, and checked for full containment.

All eight finalized artifacts are flattened — zero surviving AcroForm fields, zero widgets —
and an object-graph walk finds no `/XFA`, `/JS`, `/JavaScript`, `/AA` or `/OpenAction`. The
blank sources do carry the courts' own active content (AOC-334: `/AA`×4, `/JS`×2;
AOC-496.3: `/AA`×2, `/OpenAction`), and finalization strips all of it. A lone `/JS` byte pair
inside a compressed image stream in AOC-496.3 is not an action; it is a coincidence in binary
data and was ruled out by object-graph inspection rather than byte grep.

## The two approvals

`AK:tf-800-form-en` and `AK:tf-805-form-en` place every participant value inside the
rectangle of the field it is bound to, fully contained, legible, with no duplicate landing
in an unintended field. The repeated name across `name` / `caseName` / `partyNames` is three
distinct intended bindings, not a stray duplicate.

The pages the old page-1-only contract could not see are clean. On TF-800 page 2 the
Verification date and signature, the notarization block, `(SEAL)`, the commission-expiry
line, and the entire **ORDER** region — DENIED, GRANTED, confidential/sealed, and every
ruled findings line — are blank. Page 3's `Superior Court Master`, `Judicial Officer`,
`Type or Print Name`, clerk distribution certification and `JA/Clerk` are blank. TF-805
page 2 is the same picture: ORDER region, `Presiding Judge`, and clerk certification all
blank. Boundary fixtures were stress-checked too: under long values nothing overflows a
rectangle and nothing lands outside a bound field.

## Correction 1 — `KY:aoc-334-form-en`: a name printed in the SSN slot

`fixtures/canonical-filled.pdf`, page 1, AcroForm text field **`Defendants ssn`**.

The finalized page reads:

> Defendant's Birthdate: `1991-04-17`   Defendant's SSN: **`Jordan Avery Reyes`**

The participant's full legal name is printed where the form asks for the defendant's Social
Security Number, on a Kentucky **ORDER VOIDING CONVICTION AND SEALING RECORDS**.

This is also a protection failure, visible inside a single file. `production-field-map.json`
lists `Defendants ssn` in `manualFields` — the protected list, left for manual completion —
and *simultaneously* binds it in `bindings` to `participant.full_legal_name`.
`field-classification.json` independently classifies it `manual`. A field the map records as
protected was written, and written with a value of the wrong kind. It is the only such
contradiction across all four families.

- **Required result:** `Defendants ssn` is manual-class and must remain blank. It must never
  receive `participant.full_legal_name`.
- **Smallest correction:** drop the `{"field":"Defendants ssn","class":"manual","factId":"participant.full_legal_name"}`
  entry from `bindings` so the field falls through to the manual path; re-render fixtures and
  refresh the sidecar. No other binding on this family changes.

Everything else on this family is clean: the decision region, judge signature, certification
block, charges and Violation/Arrest Date are all blank.

## Correction 2 — `KY:aoc-496-3-form-en`: every Kentucky county drawn into the County line

`fixtures/canonical-filled.pdf`, page 1, AcroForm choice field **`3 County Dropdown`**
(`/Ch`, rect `[452.0, 692.8, 576.0, 706.2]`).

A single **791-glyph** text run is drawn at `y1 = 692.2`, spanning `x = [452.0 .. 507.6]`.
It starts exactly at the field's left edge but sits *below* the rectangle's lower bound, so
the County rule line clips it and only the tops of the glyphs survive. Visually it is an
illegible smear; the blank source has nothing there.

The run is the field's entire `/Opt` list — all 120 Kentucky county names plus the blank
option — concatenated. The arithmetic is unambiguous: 121 options total **792 characters**
against **791 glyphs** drawn. The field's actual value `/V` is `" "`; nothing is selected.
Text extraction returns `AAABBBBBBBBBBBBBCCCCCCCCCCCCCDEEEF…` only because the subset font
carries no usable ToUnicode — which is exactly why this had to be caught by eye and by
geometry rather than by reading extracted text.

- **Required result:** a `/Ch` field must flatten to its selected value only, drawn once,
  legibly, inside the widget rect. With `/V = " "` the County region must render blank, as
  the blank source does.
- **Smallest correction:** in the flat-render path for `/Ch` fields, draw `/V` rather than the
  `/Opt` list, and skip the draw entirely when `/V` is empty or whitespace. Re-render this
  family's fixtures and contact sheet and refresh the sidecar. The Case Number binding is
  correct and unaffected.

The same defect does **not** appear on `KY:aoc-334-form-en`, whose `County dropdown` (also
121 options) renders identically to the blank source.

## Scope caveats — what this review does not establish

These are recorded because they change what the verdicts mean. None was worked around.

1. **Base commit `e94fb456` does not exist in this repository.** It is not a valid git object
   and is absent from every ref. Review ran against the artifacts as committed at HEAD
   `ef957a9`. Every hash in `verdicts.json` was recomputed from the bytes actually on disk, so
   the verdicts describe the artifacts reviewed, whatever commit label they carry.
2. **The four families were named by the source pack, not derived from a 16-family
   denominator.** That derivation is still impossible here: no all-page evidence package,
   raster manifest, or source-backed rerender record exists at this HEAD, and the sidecar
   schema `rcap-artifact-provenance/v1` has no key able to express them. This review verifies
   four families on their own evidence; it does not establish that they are the correct slice.
3. **All-page raster evidence is reviewer-generated.** The repository holds 9 contact sheets,
   all page-01, for 63 families. Rasters were produced with pypdfium2 at `scale=2.0` and their
   SHA-256 values pinned per family so the inspection is reproducible.
4. **The corpus is a four-PDF review pack, not the 499-file / 329-PDF Master Library.** Every
   source byte these four families need is present and hash-verified; nothing beyond them is.
   It remains uncommitted under the gitignored `private/` tree.
5. **`classificationSha256` is `null` in all four sidecars** although `field-classification.json`
   exists on disk. The reviewer recomputed and pinned it independently. Ownership was never
   left ambiguous here — all four are AcroForm families with a full nine-class classification —
   so the relaxed flat-overlay allowance did not need to be relied on.

### One recomputation trap, for the next reviewer

`fieldMapSha256` in the sidecar does **not** hash `production-field-map.json`. It hashes
`JSON.stringify` of the derived `bindings` array alone
(`scripts/implement-rcap-official-forms-d1.mjs:644` → `rcap-artifact-provenance.mjs:120`).
Hashing the file bytes produces a mismatch on all four families and looks like a stale-sidecar
defect. Under the correct referent all four reproduce exactly. Not a defect — but the key name
invites a false finding, and it cost this review a detour worth documenting.

## Historical objections

None. No prior independent-review wave records, correction records, or
`provenAgainstThisFamilysBytes` flags exist at this HEAD for any of the four families. Step 6
had no input, and no historical verdict was edited because none exists.

## Provenance observations, short of correction

- Both KY sidecars pin `sourceRevision: REV-UNKNOWN` while the documents plainly print
  `Rev. 1-22` and `Rev. 6-23`. Provenance fidelity gap, cheap to close.
- `KY:aoc-334`'s `County dropdown` is bound to `matter.county` but nothing is written.
- `KY:aoc-496-3`'s applicant NAME / ADDRESS / PHONE lines are refused — those fields carry
  bare ordinal names (`4`, `5`, `6`) that match no allowlisted fact — so the application
  renders with an empty defendant name block. Fail-closed and safe, but not participant-complete.
- Both AK families pre-fill the Certificate of Service date `2026-08-12` while the signature
  line stays blank. Inside the participant-owned block, consistent with its `deterministic`
  binding class; noted, not faulted.
- Flattened `Print Form` / `Reset Form` button captions survive as inert graphics on both KY
  families. Cosmetic.
