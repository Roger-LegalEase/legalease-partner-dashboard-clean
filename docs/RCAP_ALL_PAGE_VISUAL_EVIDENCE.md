# RCAP All-Page Visual Evidence

Lane owner: visual evidence only — page rasters, visual-evidence manifests,
placement audits, protected-region proofs and their controls. This lane reads
artifacts, maps, classifications and sidecars. It does not write them.

Generator: `scripts/generate-rcap-all-page-visual-evidence.mjs`
Output: `data/rcap-all50/visual-evidence/`
Rendered proof images: `docs/record-clearing/pdf-visual-evidence/all-page/`

## What this replaces

The visual evidence in the repository before this lane was page 1 of a
blank-versus-filled contact sheet for nine of sixty-three families. A one-page
sample of a four-page petition is not visual review of that petition: the
signature block, the certificate of service and the proposed order are on the
pages nobody had looked at. Sixty-two of the sixty-three families had no
rendered page at all.

Every family here is rendered on every page. The manifest records
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
  layer. Must be zero, or the split is missing something.
- `sourceTextPreservation.sourceInkPixelsBlankedToPaper` — official ink the
  fill destroyed. Must be zero. The companion number,
  `sourceInkPixelsNoLongerReadingAsInk`, is also reported and is normally
  non-zero: a composed page antialiases a glyph edge slightly differently from
  the same glyph rendered alone, so edge pixels drift across the ink
  threshold. Only ink the finalized page renders as bare paper — what an
  opaque fill over printed text produces — drives the verdict.

### The control

`WI:cr-266-form-en` is the one family whose pinned source binary is in this
clone. Its official layer, isolated out of the finalized artifact, is rendered
beside the independently acquired binary and compared pixel for pixel:

```
pinnedSourceInkPixels   39515
isolatedLayerInkPixels  39515
differingPixels             0
```

Zero. The isolated layer renders exactly as the acquired form does. That is the
evidence the structural claim rests on, and it is why the other 62 families'
attribution is trustworthy without their binaries. Any family whose binary
later lands in a clone is measured against it automatically.

## What each verdict means

| Verdict | Measured by |
| --- | --- |
| `placement` | Generated-layer ink is clustered, converted to page points, and required to sit inside a rectangle the family's own map declares writable, within 4pt. |
| `protectedRegions` | No **generated** ink may touch a signature, clerk, court, attorney or agency rectangle. Official text printed inside those blocks is in the source layer and is never counted as a leak. |
| `sourcePreservation` | Official ink the finalized render leaves as bare paper, in pixels. Zero required. Edge pixels that merely lightened are counted separately and do not raise a finding. |
| `defaultAppearances` | The artifact must be flat. A surviving widget draws its own chooser prompt, comb or highlight — a mark on a court filing that no field map describes. |
| `pinnedSourceControl` | Above. Available only where the binary is in the clone. |

Boundary crossing is reported when a value reaches into a rectangle other than
its own, or runs past the right edge of its own rule by more than 1.5pt — not
when a descender drops below its baseline box, which is typography rather than
misplacement.

The written values are read back out of our own overlay stream with their
coordinates (`rcap-written-text.mjs`), independently of the pixels. Ink in the
right box says a mark landed there; the text side says *which* value it was.
A family clears only when both agree.

## Stated limits

- Masks are inset 1.5pt from the paper's edge to exclude the renderer's own
  page border. Nothing within 1.5pt of the edge is measured — well inside any
  court's margin requirement.
- Rendering is deterministic for a given file on a given renderer build, so a
  raster's SHA-256 is a stable identifier and `--check` compares exactly. A
  different Chromium shifts antialiasing; a `--check` failure on a different
  browser build means re-run, not that a verdict moved. The verdicts themselves
  are integer pixel counts against thresholds far from their boundaries.
- Source **contamination** — whether the official layer matches the current
  official edition of the form — is not established here for any family whose
  binary is absent. The manifest says so per family rather than implying
  coverage it does not have.
- Nothing here is a legal judgement that a value is correct for a participant.

## Running it

```bash
node scripts/generate-rcap-all-page-visual-evidence.mjs --batch=4      # next four uncovered families
node scripts/generate-rcap-all-page-visual-evidence.mjs --families=WI:cr-266-form-en
node scripts/generate-rcap-all-page-visual-evidence.mjs --check        # artifacts current?
```

Rasters are written to `tmp/rcap-visual-evidence/` and are not committed: the
full set is ~510 page renders. Every one of them is bound into the manifest by
SHA-256, and the whole page set of a family is bound into a single
`visualEvidenceHash`, so a package cannot be quoted a page at a time and a
re-render is detectable without the images being in the tree. The annotated
pages that *are* committed are the control families and every page carrying a
finding.
