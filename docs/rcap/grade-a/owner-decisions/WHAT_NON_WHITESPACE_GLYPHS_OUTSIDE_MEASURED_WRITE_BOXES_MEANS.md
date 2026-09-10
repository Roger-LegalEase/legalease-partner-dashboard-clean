# A counter named "outside" is measuring "not identical", and it has been all along

**A Captain ruling on build discipline, recorded for Roger because its blast radius is
factory-wide. Nothing has been applied.**

## The disagreement, at both ends

`nonWhitespaceGlyphsOutsideMeasuredWriteBoxes` is written by one module and read by
another, and they mean different things by it.

**The consumer**, `verify-packet-completeness.mjs:464`, raises `visualDefects` with its
own stated reason:

> *"ink landed **outside every measured write box**, which is an overlap or a stray mark"*

That is containment. Ink inside a box is not outside it.

**The producer**, `rcap-output-glyph-reading.mjs:224-226`, runs one test:

```js
const at = sourceRects.some((r) => r.page === sourcePage
  && Math.abs(r.x0 - placed.x0) < 0.01 && Math.abs(r.y0 - placed.y0) < 0.01
  && Math.abs(r.x1 - placed.x1) < 0.01 && Math.abs(r.y1 - placed.y1) < 0.01);
```

That is rect **identity** to a hundredth of a point, and its result increments **two**
counters: `appearancesNotAtTheirOwnSourceWidget` and `outsideGlyphs`, the latter
published as `nonWhitespaceGlyphsOutsideMeasuredWriteBoxes`.

## The ruling, and why it is not a close call

**The containment reading is correct, and the producer is wrong for that key.**

Three things decide it, none of them a preference:

1. **The key's own name says outside.** Ink drawn strictly inside a measured write box is
   not outside it, in any reading of those words.
2. **The consumer states the defect it is looking for** — an overlap or a stray mark.
   Ink inside its own blank is neither.
3. **The module already publishes the identity test under a correct name of its own**,
   `appearancesNotPlacedAtTheirOwnSourceWidget`. It computes one quantity and sells it
   twice. That the right name already exists is the strongest evidence the two were
   meant to be different measurements.

This is the same defect class two other lanes found independently today: `addedGlyphs
ReadFromOutputBytes` carrying a borrowed definition, and
`nonWhitespaceGlyphsOutsideMeasuredWriteBoxes` on one family carrying an *appearance*
count under a glyph name. A counter whose name and behaviour disagree is a counter no
reader can use.

## What the wrong reading costs, measured on a real family

FIX07 measured all 43 delivered documents of the two Maryland families against their
pinned sources. Under identity, `md_10110_conviction-set` reads **27** — one widget on
page 1 drawing *"Westminster Police Department"*. Under containment it reads **0**.

The 27 is a false positive, and the build says so in its own report before anyone asked:

> *"The printed Date caption spans x274.56..289.77 and overlaps this source widget;
> preserve it and move only agency ink past x292."*

The source widget spans x157.56→571.8; the build writes at x292→571.8, strictly inside
it, to avoid printing over the court's own "Date" caption. Confirmed independently with
`pdftotext -bbox`, and per-pixel at 150 dpi grey<128: the left band gains **0** and the
right gains **1,023**, with added ink spanning PDF x293.28–416.16, wholly inside the
blank.

**So the strict test flags as a visual defect the adjustment that prevents the visual
defect.** The family's own author audit already uses containment with a 0.6pt pad and
agrees at 0.

## Why I am ruling but not applying

Eight builders import that module and **264 committed report files** already carry the
key. Changing the producer changes what every one of those numbers means, and several
were read by lanes that have since returned. That is not a change to make on the way
past, and not one to make while three lanes are running.

There is also a second, independent blocker that any executing lane hits first:
**the module cannot measure a multi-component packet at all.** It takes one `sourceBytes`
and one `pageOffset`, while 11 of 25 conviction documents and 6 of 18 cannabis documents
compose several sources. Called once per component on one such file it returns 633, 534
and 723 for the same document; the true per-component reading is 0. Per-page component
resolution is new capability in a shared module, not a minimal fix.

## What the executing lane must do, in order

1. Add per-page component resolution to `rcap-output-glyph-reading.mjs`.
2. Change the `outsideGlyphs` branch to containment, leaving
   `appearancesNotPlacedAtTheirOwnSourceWidget` on identity where it belongs.
3. Treat every one of the 264 committed reports as carrying the **old** definition until
   its family is rebuilt — the same rule already recorded for the flattened-widget fix:
   a shared fix is not enforced while its callers remain unwired.
4. Independent read of every family whose counter moves.

**The good news, and it is real:** FIX07 rebuilt both Maryland families into scratch and
reproduced all 43 PDFs *and* both `actual-writes.json` files byte-for-byte. These
builders are deterministic, so publishing the readings **costs no raster receipts** —
which removes the expensive part of the problem.

## Tell me if you disagree

If you would rather the counter kept the identity meaning and the *name* changed instead,
that is a coherent alternative and it inverts step 2. I ruled the way I did because the
consumer's stated defect and the key's own words both say containment, and because the
identity name already exists — but it is your factory, and the ruling is recorded here
precisely so it can be overruled rather than discovered.
