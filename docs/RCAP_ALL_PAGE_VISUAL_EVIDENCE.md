# RCAP All-Page Visual Evidence

Lane owner: visual evidence only — page rasters, visual-evidence manifests,
placement audits, protected-region proofs and their controls. This lane reads
artifacts, maps, classifications and sidecars. It does not write them.

Generator: `scripts/generate-rcap-all-page-visual-evidence.mjs`
Output: `data/rcap-all50/visual-evidence/`
Rendered proof images: `docs/record-clearing/pdf-visual-evidence/all-page/`

**Coverage: 63 of 63 families, 170 of 170 pages, 511 rasters.**

## What this replaces

The visual evidence in the repository before this lane was page 1 of a
blank-versus-filled contact sheet for nine of sixty-three families. A one-page
sample of a four-page petition is not visual review of that petition: the
signature block, the certificate of service and the proposed order are on the
pages nobody had looked at. Fifty-four families had no rendered page at all.

Every family is now rendered on every page. The manifest records
`pagesExpected` and `pagesRasterized` separately and carries
`everyPageCovered`, so a package that covers page 1 of a multi-page form is
visible as one, not quotable as coverage.

## How the official layer is told from ours

The obvious method — difference the filled page against the blank form — needs
the blank. The verified source binaries live under `private/` and are not in
this clone: **62 of 63 families cannot be differenced that way here.** That
would have capped this lane at one family.

They do not need to be differenced. Every artifact this factory emits carries
its page content as a four-element array:

```
[ q , official source stream , Q , appended stream holding everything we wrote ]
```

The official layer is not reconstructed from a pixel difference. It is the same
stream object the source shipped. So each page is rendered three times — the
finalized artifact, the official layer alone, the generated layer alone — and
every mark is attributed by structure rather than by inference. A page not in
that shape is reported as unsplittable and measured for nothing.

Two measurements police the split on every page, so it cannot quietly be wrong:

- `inkAccountedToALayer.inkInNeitherLayer` — finalized ink belonging to neither
  layer. Zero on every page of every family.
- `sourceTextPreservation.printedInkCoveredOutsideEveryDeclaredRectangle` —
  printed ink our layer covers where no rectangle was declared writable.

Both are floored in absolute pixels as well as by fraction. On a sparse page,
forty-four pixels of antialiasing crosses a tenth of a percent while remaining
a fraction of one glyph; a split that had genuinely missed something would miss
it by whole marks.

### The control

`WI:cr-266-form-en` is the one family whose pinned source binary is in this
clone. Its official layer, isolated out of the finalized artifact, is rendered
beside the independently acquired binary and compared pixel for pixel:

```
pinnedSourceInkPixels   39515
isolatedLayerInkPixels  39515
differingPixels             0
```

Zero. That is the evidence the structural claim rests on, and it is why the
other 62 families' attribution is trustworthy without their binaries. Any
family whose binary later lands in a clone is measured against it automatically.

## What each verdict means

| Verdict | Measured by |
| --- | --- |
| `placement` | Generated-layer ink, clustered and converted to page points, must sit inside a rectangle the family's own map declares writable, within 4pt. Measured in pixels, not bounding boxes — a box hides ink that escapes it and fails a value that legitimately spans two stacked rectangles. |
| `protectedRegions` | A value the artifact places in a declared rectangle **elsewhere** turning up inside a signature, clerk, court, attorney or agency rectangle. Official text printed in those blocks lives in the source layer and is never counted. |
| `sourcePreservation` | Printed ink the finalized render leaves as bare paper, outside any declared rectangle. Writing a value onto a rule blanks that rule — that is the fill doing its job, and is counted separately. |
| `defaultAppearances` | The artifact must be flat. All 63 are — but see below: flat is not the same as clean. |
| `duplicateValues` | The same value written to more than one rectangle, or twice into one. |
| `pinnedSourceControl` | Above. Available only where the binary is in the clone. |

Boundary crossing is reported when a value reaches into a rectangle other than
its own, or runs past the right edge of its own rule by more than 1.5pt — not
when a descender drops below its baseline box, which is typography rather than
misplacement.

Written values are read back out of our own overlay stream with their
coordinates (`rcap-written-text.mjs`), independently of the pixels. Ink in the
right box says a mark landed there; the text side says *which* value it was. A
family clears only when both agree.

### Telling a participant's data from the form's own furniture

Flattening bakes a widget's own label into the page, and those labels land
inside declared rectangles just as values do. Treating any text in a protected
region as a leak produced four false leaks on the Kentucky forms and thirteen
on one Nebraska form, burying the single real one. Two rules separate them:

1. A leak must match a value the artifact places in a declared rectangle
   somewhere, on a shared word of four characters or more. Exact matching is
   too brittle — `AR:ar-acic-order-of-probation` places `Reyes` in its name
   rectangle on page 1 and writes `Jordan Avery Reyes` into the judge's block
   on page 2.
2. Words the **official layer prints** are struck out of the participant set
   first. The form's own vocabulary cannot be the participant's data.

Where the official layer prints fewer than forty distinct words, rule 2 has
nothing to subtract and the manifest says so: `participantSeparation.reliable`
is false, the verdict reads "text that **may** be participant-derived", and
every row names the text and the word it matched on so a reader can judge.
Two families carry that mark.

## What the corpus found

| | |
| --- | --- |
| Participant value leaked into another actor's region | **1** — the petitioner's name in `Judges Printed Name` on `AR:ar-acic-order-of-probation-under-act-346` p2 |
| Families where that separation cannot be made | 2 |
| Families whose fill covers printed ink outside any declared rectangle | 23 |
| Families carrying text no declared rectangle asked for | 28 |
| Families carrying ink on a page whose map declares no rectangle at all | 14 |
| Families left un-flat | 0 |
| Pages carrying ink belonging to neither layer | 0 |

Four of those classes share one cause — the flattener:

- It bakes in widget **labels**: a `Reset Form` button, a `Print Form` button,
  and on two Kentucky forms a notice explaining that not all browsers handle
  fillable PDFs the same way, printed on a document meant to be filed with a
  court.
- It bakes in **every alternative at once**: `NE:dc-1-15` draws more of our ink
  than the official form prints, and its filing simultaneously declares itself
  an adoption, an emancipation, a name change, a probate and a divorce, because
  those captions are widgets rather than printed text.
- Its **opaque backgrounds erase printed rules**: `KY:aoc-333` loses 5.8% of
  what the court prints on that page — three long rules inside the unbound
  widgets `following agencies` and `Company`, which we wrote nothing to.
- Its **re-drawn checkbox squares cover printed characters**: the Arkansas
  orders print `[_]`, and the solid square painted over it covers the
  underscore.

That is one factory fix, not sixty map fixes.

## Stated limits

- Masks are inset 1.5pt from the paper's edge to exclude the renderer's own
  page border. Nothing within 1.5pt of the edge is measured — well inside any
  court's margin requirement.
- Rendering is deterministic for a given file on a given renderer build, so a
  raster's SHA-256 is a stable identifier and `--check` compares exactly. A
  different Chromium shifts antialiasing; a `--check` failure on a different
  browser build means re-run, not that a verdict moved.
- Source **contamination** — whether the official layer matches the current
  official edition of the form — is not established for any family whose binary
  is absent, which is 62 of 63. The manifest says so per family rather than
  implying coverage it does not have.
- Nothing here is a legal judgement that a value is correct for a participant.

## Running it

```bash
node scripts/generate-rcap-all-page-visual-evidence.mjs --batch=8      # next eight uncovered families
node scripts/generate-rcap-all-page-visual-evidence.mjs --families=WI:cr-266-form-en
node scripts/generate-rcap-all-page-visual-evidence.mjs --check        # artifacts current?
```

Rasters are written to `tmp/rcap-visual-evidence/` and are not committed: the
full set is 511 page renders. Every one is bound into the manifest by SHA-256,
and each family's whole page set into a single `visualEvidenceHash`, so a
package cannot be quoted a page at a time and a re-render is detectable without
the images being in the tree. The annotated pages that *are* committed are the
control family and every page carrying a finding.

Rendering is a pure function of a one-page document's bytes at a given scale,
so each raster is cached on that key. Correcting how a measurement is
*classified* therefore costs no Chromium renders at all: the last whole-corpus
re-derivation served 511 of 511 rasters from disk and reproduced every evidence
hash. Deleting `tmp/rcap-visual-evidence/` changes nothing except how long the
next run takes.
