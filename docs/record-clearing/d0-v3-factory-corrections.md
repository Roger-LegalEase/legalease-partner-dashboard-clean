# D0-v3 — the two defects D0-v2 left behind

Independent review of the D correction cycle found two more defects in the
shared factory, both outside the three D0-v2 was authorized to fix. They held
five families: four Washington forms dispositioned as having no extractable
text layer, and Missouri CR-145, which produced no artifact of any kind.

Both are fixed here. All 149 D0 and D0-v2 checks stay green.

## Defect D — a text layer read as bytes rather than characters

A content stream carries character *codes*. Reading those bytes as if they were
already text is correct only for a font encoded that way, and wrong for every
subset font in this corpus. Washington's BLAKE-006 draws its entire text layer
with Type0/Identity-H fonts whose codes are two bytes wide and bear no relation
to Unicode, so a byte-wise read returned nothing legible and the family was
recorded as having no text to anchor against. It has 199 lines.

`loadFonts` now reads what the document says about its own encoding: the
`/ToUnicode` CMap (both `bfchar` and `bfrange` forms), `/Encoding /Differences`
against the standard glyph list, the `Identity-H` two-byte code space, and a
CIDFont's `/W` and `/DW` per-CID widths.

**Codes and characters are kept apart throughout.** Widths are indexed by code,
because that is what the font's own metrics are indexed by; only the text handed
back to a caller is decoded. Advancing by the decoded character would look up
the wrong width and walk every following glyph off its true position — which is
exactly how a value ends up in the next column. The canary checks the start x
and the inter-glyph advance for this reason, not only the text.

### Failing closed, at the right granularity

An anchor placed against a label nobody could read is a guess about where a
participant's data belongs on a court filing. But the unit that matters is the
anchor, not the document: two Washington forms draw checkbox glyphs from a
symbol font with no `/ToUnicode` entry, in about 1% of their runs. Rejecting the
whole layer would discard 190 perfectly readable labels; rejecting nothing would
let a value be placed against an unreadable one.

`partitionDecodableAnchors` judges each line on its own — a line with any
undecoded code, or resting on estimated metrics, is refused with a typed reason
and never offered as an anchor. `assertAnchorsDecodable` remains for callers
that need the whole layer, raising `UndecodableTextLayerError`.

### Against the real binaries

| form | before | after |
| --- | --- | --- |
| BLAKE-006 | 199 lines, **0** readable | 172 lines, **164** readable, 172 usable anchors |
| BLAKE-008 | 222 lines, **0** readable | 183 lines, **174** readable, 183 usable anchors |
| CRRLJ-09.0100 | 191 readable | 189 readable, 195 usable, 2 refused |
| CRRLJ-09.0870 | 62 readable | 61 readable, 57 usable, 7 refused |

The refusals are the symbol-font glyphs. They are withheld, not guessed.

## Defect E — one rich-text field aborted an entire family

pdf-lib raises `RichTextFieldReadError` when a field's `/V` is empty and `/RV`
is present. Missouri CR-145 declares two such fields, so the render died before
a page was written and the family produced nothing at all.

`neutralizeRichTextFields` converts them to ordinary text fields before any
appearance is generated: it drops the `/RV` packet, clears `/Ff` bit 26, and
removes the stale appearance that was generated from the rich value so
flattening cannot draw what the field used to look like.

**The value is not collateral damage.** `/V` already holds the plain text that
`/RV` formats, so a field carrying both comes through unchanged; where `/V` is
empty the text is recovered from the packet rather than lost. What goes is
styling, which is not part of what a court form records. Dropping `/RV` is also
a sanitation gain in its own right — it is an embedded XHTML document riding
inside a filed artifact for no filing purpose.

CR-145 now finalizes to 2 pages, inspectable and clean, with its participant
value visible and no `/RV` in the bytes.

## Canaries

`node scripts/rcap-official-forms/d0-v3-canary-verify.mjs` — **43 checks across
2 canaries and 5 mutations.**

`subset-font` is hand-assembled, because pdf-lib cannot author a Type0 font:
object bodies emitted in order, offsets recorded, xref written from them. It
carries four cases in one file — a `bfchar`-mapped label, a `bfrange`-mapped
run, a `/Differences`-mapped simple-font run, and one code the CMap does not
cover. The `bfrange` case needed its own text: a range assigns *consecutive*
codepoints, so it is only valid for text that is itself consecutive, and the
first draft of this canary was wrong for exactly that reason.

`rich-text` carries two rich fields, not one. pdf-lib throws only when `/V` is
empty, so a field with both reads fine and would reproduce nothing; the canary
needs the packet-only shape to fail and the both-shape to prove the value
survives. Its widgets have no `/AP`, matching a form as an issuing authority
ships it — with pdf-lib's own appearance left in place the field looks current
and the defect never fires.

Each fix was confirmed by removing it and watching the suite go red:

| mutation | result |
| --- | --- |
| rich-text conversion removed | finalization aborts on the packet-only field |
| `/ToUnicode` parsing removed | 6 checks red, including both geometry checks |
| two-byte code space ignored | the run yields twice as many codes as characters |

`node scripts/rcap-official-forms/d0-v3-corpus-decode-audit.mjs` — **26 checks
across the 5 real forms** that failed the wave. Needs the private packs and
skips cleanly without them.

## Scope

Changed: `rcap-pdf-anchor-capture.mjs`, `rcap-active-content.mjs`, the canary
forms module, and the canary evidence directory. Two new verifiers.

No state package directory changed. No image-input path changed, so the frozen
worker fingerprint holds.
