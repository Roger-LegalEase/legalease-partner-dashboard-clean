# D targeted correction and approval-evidence cycle — captain handoff

Additive. Nothing is merged into canonical integration, no canonical ledger is
regenerated, and no track is marked terminal. Every disposition below is read
out of an independent review branch; none is authored here.

Machine-readable: `captain-handoff.json` beside this file.

## What this cycle did

Independent review returned 61 of 253 families. 56 of the 114 findings behind
them traced to three defects in the shared factory, which were fixed once on
`claude/rcap-d0-form-factory-remediation-v2` @ `b412f543`:

- **A — print flags.** Nothing read an annotation's `/F`, so flattening turned
  every helper widget and control caption into ink on a court filing.
- **B — contact sheets.** The sheet embedded the unsanitized blank source,
  carrying its JavaScript, `/AA` and widget objects into the bytes.
- **C — fail-open inspection.** `inspectable: false` was read as clean, so an
  empty hit list on an unreadable file passed.

The rule for A was chosen from the corpus rather than the spec: across the 252
source PDFs, 99.4% of text widgets set Print and no document leaves all of them
unset, while only 6.3% of buttons do. Flattening both ways and diffing text
runs, 535 runs were removed across 36 forms, every one inside a widget the
source marks as not printing, none added.

## Gate 1 — the 61 prior corrections

| disposition | families |
| --- | --- |
| technical_approved | 45 |
| correction_required | 12 |
| held_on_source_or_design | 4 |
| **total** | **61** |

The interim summary reported 45 and 12. **The remaining four are the Washington
families**, moved to `held_on_source_or_design` by shard 0: `WA:blake-006-form-en`,
`WA:blake-008-form-en`, `WA:crrlj-09-0100-form-en`, `WA:crrlj-09-0870-form-en`.
They are blocked on `rcap-pdf-anchor-capture` consulting neither `/ToUnicode`
nor `/Encoding /Differences`, so their subset-font text layers decode to
nothing and their no-extractable-text dispositions rest on a false premise.
That defect is outside the three this cycle authorized.

Of the 12 still open, seven were corrected **after** independent review had
already inspected them — four contact sheets that were never rebuilt, and three
New Hampshire overflow ledgers. Their new bytes have not been independently
seen, so they are counted open rather than approved. The other five carry
unresolved family-specific defects: `MO:cr145` (rich-text finalize crash),
`MO:cr300` (arrest locality asserted), `NC:aoc-cr-288` (attorney block),
`VA:cc-1203` (court name), `VA:cc-1473` (party election).

## Gate 2 — the 104 prior approvals

Those approvals rested on sheets the pre-D0-v2 path built. The filed
participant PDFs were reviewed on their own bytes and were left untouched; only
the evidence was regenerated, from those unchanged artifacts.

| result | families |
| --- | --- |
| prior_technical_approval_reaffirmed | 100 |
| correction_required | 4 |

85 of the 104 have a filed artifact; **85/85 participant hashes are
byte-identical** to the artifact approved at the lane head, confirmed
independently. The other 19 are instructional documents, court orders with no
participant fill, or overlays pending a write box — no filing to depict.

**The four reopened, adjudicated on their own bytes and not on the fact that
those bytes did not change:**

| family | why the prior approval does not survive |
| --- | --- |
| `KY:aoc-333-source-gated-en` | filed artifact prints `Print`, `Reset Form` |
| `KY:aoc-496-5-form-en` | filed artifact prints 11 runs including `NOTICE: Not all bowsers handle fillable PDFs the same.` |
| `NH:nhjb-2328-support-affidavit-en` | filed artifact prints `Clear Form`, `Lock & Save Form` |
| `NH:nhjb-2956-support-record-request-en` | no contact sheet existed at the lane head, so the original approval rested on evidence that was never built |

Three families this session's own detector initially flagged were retractions
the reviewer **upheld**: `NM:nm-4-960-2-en`, `CO:jdf-477-form-motion-en`,
`CO:jdf-612-form-motion-en`. The detector had condemned any run inside a
non-printing widget's rectangle, and official forms print labels under their
controls — one Colorado motion prints "Courtroom:" in exactly such a rectangle.

## Gate 3 — the 88 prior holds

All 88 appear exactly once and all 88 are preserved. No hold was resolved and
none moved to correction_required. No review returned new source or
legal-design evidence, and no held family's bytes changed.

## Gate 4 — all 253

104 + 61 + 88 = 253. Every family appears exactly once in one final category;
no duplicate, no omission.

| final category | families |
| --- | --- |
| technical_approved | 145 |
| correction_required | 16 |
| held_on_source_or_design | 92 |

## Gate 5 — track-level effect

**55 tracks derived, not 67.** The derivation is the `tracks` array each lane
wrote into `jurisdiction-summary.json`, joined to families by official form
document id. Twelve cannot be derived from repository evidence:

- **Lane D2A writes no jurisdiction summary at all**, so Arizona, Illinois,
  Kansas, Minnesota and Washington declare no tracks anywhere in the repository.
- Florida, Louisiana, New Jersey, New Mexico, Iowa, Massachusetts, Oregon and
  Utah record an empty track array.

A track invented to reach an expected count would be worse than a missing one,
so the gap is reported rather than filled.

| track disposition | tracks |
| --- | --- |
| potentially_promotable | 0 |
| correction_required | 3 |
| held | 52 |

**No track is promotable.** Every one of the 55 carries at least one
outstanding non-technical gate — production holds, unrecorded legal-design
review, or non-terminal readiness — none of which is this cycle's to clear.
Technical review is a necessary condition, not a sufficient one.

The three correction_required tracks are blocked on a family, not a gate:
`va_exp_nonconviction` (VA:cc-1473), `vt_seal_pardon` (VT:200-00132),
`wi_exp_cr266` (WI:cr-267).

## Exact blockers

1. **Two unauthorized D0 defects.** The anchor decoder ignoring `/ToUnicode`
   (4 WA families held) and `sanitizeAndFlatten` throwing
   `RichTextFieldReadError` on rich-text fields (MO CR-145). Both need a scope
   decision before those five can clear.
2. **Four reopened approvals** need a print-flag re-render, which this cycle
   was directed not to perform on approved artifacts.
3. **Seven families corrected after review** need one more independent look at
   bytes nobody has yet inspected.
4. **Five unresolved family-specific semantic defects.**
5. **84 stale `rendered-artifacts.json` manifests.** The independent reviewer
   found that regenerating the approval-evidence sheets left those manifests
   recording the pre-regeneration sheet hash, so they no longer describe any
   file on the branch. The `canonical-filled.pdf` hash in each still matches the
   filed artifact. Not corrected here: this turn's scope was the handoff.
6. **Lane D2A records no track data**, so 12 of the 67 tracks cannot be
   reconciled.

## Safe for captain

Yes, as an additive import. Every branch is additive to a lane head that was
already reviewed, no canonical ledger was regenerated, no track is marked
terminal, and nothing is merged into canonical integration. The 104 filed
participant PDFs behind the prior approvals are byte-identical, independently
confirmed.

Not safe to promote anything: zero tracks are promotable, and 16 families are
open across the corpus.
