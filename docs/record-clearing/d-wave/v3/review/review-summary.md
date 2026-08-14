# D V3 final remediation — independent review, shard 0

Read-only review of the 20 families in `docs/record-clearing/d-wave/v3/review-scope.json`, plus the
manifest evidence across all seven v3 correction branches. Machine-readable findings are in
`review-findings.json`; this file is the argument behind them.

I reviewed no other family. The other 233 D-wave dispositions stand untouched. No implementation,
correction or evidence branch was modified, nothing was re-rendered, and no legal or source hold was
reopened. Nothing here approves any family for live use or marks any track terminal.

## Result

| Disposition | Families |
|---|---|
| `technical_approved` | 12 |
| `correction_required` | 8 |
| `held_on_source_or_design` | 0 |

11 findings on families (4 high, 7 medium), plus one low manifest observation and one medium
factory-level observation outside the 20 families' dispositions.

**Approved (12).** KY AOC-333, KY AOC-496.5, MO CR-300, NC AOC-CR-288, NH NHJB-2328, VA CC-1473,
NH NHJB-2317, NH NHJB-3056, NH NHJB-3124, VT 200-00132, VT 200-00132a, WI CR-267.

**Correction required (8).** NH NHJB-2956, VA CC-1203, VT 200-00631, MO CR-145, and the four
Washington families.

## What the two shared-factory fixes actually did

**The anchor decoder works.** This is the strongest result in the review. Where the pre-v3 decoder
read WA BLAKE-006's Identity-H text layer as 21,122 meaningless byte-wide glyphs, the fixed decoder
reads 10,503 — exactly the halving you expect once two-byte codes stop being read one byte at a
time — and the text it returns is the form's real text. I decoded the same binary with MuPDF, an
engine sharing no code with the factory, and it confirms all 172 lines on BLAKE-006 and all 183 on
BLAKE-008. Glyph positions agree with MuPDF to within **0.005pt across 17,914 characters**. Nothing
moved that should not have: on the two CRRLJ forms, every line whose text was already readable before
the fix kept its glyph positions to within 0.06pt.

The refusal behaviour is genuinely conservative where it runs. `partitionDecodableAnchors` refuses 2
lines on CRRLJ-09.0100 and 7 on CRRLJ-09.0870, and the refused lines are the right ones — a Wingdings
checkbox row, and body lines where a single apostrophe failed to decode (`Defendant<undecoded>s criminal
history`). A line is refused whole rather than half-read.

**Rich-text finalization works.** MO CR-145 now produces canonical, boundary and negative fixtures
and a contact sheet where it previously produced nothing at all. The sanitizer is thorough: the
source's 100 `/JS`, 100 `/JavaScript` and 52 `/AA` entries and all 96 widgets are gone; `/Annots` is
an empty array on both pages; no `/RV` packet appears in the raw bytes, in any decompressed stream, or
after re-saving with object streams off. No stale rich-text appearance was flattened in — the corpus
audit records both rich-text fields as carrying no `/RV` packet, and the values on the page are the
freshly written ones. The source binary is unmodified.

**All four reopened approvals are genuinely closed in the filed artifacts.** Every previously reported
control-caption run — KY AOC-333's `Print`/`Reset Form`, KY AOC-496.5's eight-run browser notice,
NH NHJB-2328's `Clear Form`/`Lock & Save Form`/`Top of Page`, NH NHJB-2956's
`Instructions`/`Clear Form`/`Top of Page` — is absent from every filed fixture.

Across all 20 families: source sha256 unchanged (20/20, all three source packs matched their expected
hashes), page count and order preserved (20/20), no residual AcroForm or widget in any filed artifact,
no active-content marker anywhere in the original bytes or after re-saving with object streams off,
and no protected-category field written.

## The four things that need correcting

### 1. MO CR-145 names the petitioner as an agency (high)

The petitioner's own name is written into the field whose printed label reads **"Other (include name
and address of agency):"**. The canonical fixture carries `Marion T. Ellsworth` there; the boundary
fixture carries the long boundary name. Its sibling agency fields — `County Sheriff's Dept`,
`Municipal Police Dept`, `Missouri Highway Patrol Troop` — are all correctly refused as
`protected_category`. This one slipped through because its field name says "Defendants" rather than
naming an agency.

This family had never produced an artifact before this cycle, so no reviewer had ever been in a
position to see it. Finding it is the direct payoff of the rich-text fix.

### 2. Two values are clipped onto filed pages, and no report says so (high)

**VA CC-1203, boundary fixture, page 3.** `User.AncillaryCaseNumber` should read
`0123-45-2026-CR-900123.00-AB-CDE/2201`. The page draws `5-2026-CR-900123.00-AB-CD` at 10pt, hard-cut
at both ends and extending 2.39pt past the left edge of its widget and 1.82pt past the right.
Rendering the region shows the leading and trailing glyphs sliced mid-character. The two sibling
fields carrying the identical value on pages 4 and 5 each render it complete at 6pt inside their
rectangles — so the shrink path works and simply was not applied here. A reader sees a case number
that is not the case number.

**VT 200-00631, boundary fixture, page 1.** The participant's name is drawn as
`Alexandrina-Katharine Montgomery-Vanden` — 39 of 70 characters, cut mid-word, with no continuation
line and 0.76pt past the widget's right edge. 70 characters at 8pt need roughly 280pt of width and the
widget is 156.3pt, so it could never have fitted at the size chosen. `populated-fields.json` records
this as `outcome: "shrunk"`. VT 200-00132 and 200-00132a render the same 70-character name complete at
9pt, which again shows the path can handle it.

In both cases the evidence is worse than the defect. CC-1203's `overflow-and-clipping.json` lists four
refusals and asserts "Nothing is written past a widget edge" — the one field written past a widget
edge is the one it does not mention. VT 200-00631's reports `unfittableBoundary: []` and `findings:
[]` under "Nothing is clipped and nothing is shrunk below legibility." The overflow reporter cannot
currently see a clip, which is why both passed.

VT 200-00631 is one of the seven families corrected after review had already inspected them. Its bytes
had never been independently seen. This is what that gap was for.

### 3. NH NHJB-2956's contact sheet still shows the defect that was fixed (high)

Its participant artifact was re-rendered (59,275 → 56,111 bytes) and is clean. The contact sheet was
not rebuilt: it is byte-identical to the approval-evidence branch. Its right-hand panel — which the
sheet's own caption labels *"blank (left) vs finalized fill (right)"* — still shows the superseded
artifact, `Clear Form`, `Top of Page` and `Instructions` included. Each appears only in that panel;
the left panel has no counterpart; the current fixture contains none of the three in its 77 text runs.

`contact-sheet-proof.json` agrees it is stale: it still records the pre-v3
`participantArtifactSha256` and still carries `filedArtifactChecksPassed: false` with those captions
listed as the failure. Repairing `rendered-artifacts.json` to the stale sheet's hash made the manifest
self-consistent while leaving the evidence contradicting the corrected artifact. This is the only one
of the thirteen re-rendered families whose contact sheet was not rebuilt — the other twelve all have
proofs naming their current bytes.

The filed artifact is fine. The artifact QA and counsel will actually look at is not.

### 4. Washington: the decoder is fixed, but the conclusion drawn from it is not supported (medium ×4)

All four report `overlay_no_participant_label_matched`. Nothing is misplaced, because nothing is
placed — no fixtures, no contact sheet, an empty artifacts map. But the disposition rests on evidence
that does not hold up in two ways.

**The renderer does not use the new refusal gate.** `d2a-regenerate.mjs` still filters readable lines
with `CID_ENCODED = /\u0000/`. The fixed decoder marks an undecoded code with U+FFFD, not NUL, so no
line can ever match. All four profiles therefore report `unreadableLines: 0` — true for the two BLAKE
forms, but false for CRRLJ-09.0100 and CRRLJ-09.0870, where the decoder's own gate refuses 2 and 7
lines. The guarantee that undecodable anchors are refused rather than guessed holds in the audit tool
and not in the renderer that produced these dispositions.

**On the BLAKE forms, zero candidate labels is forced by the matcher, not found in the form.** Every
one of BLAKE-006's 10,503 text runs is a single character (BLAKE-008: 10,975, likewise all length 1),
because the document draws one glyph per show operation. The run-level matcher skips any run shorter
than three characters, so it can never match anything here; the line-level matcher needs a whole line
to equal a label, and the caption draws `Defendant` and `DOB` on one shared baseline and `No.` on
another. I replayed the lane's own `OVERLAY_LABEL_BINDINGS`, `BLANK_BINDINGS` and `CAPTION_FACTS` over
the decoded text and reproduced 0 matches — so the profile is faithful to what the matcher did. But
`172 lines read, 0 unreadable, 0 candidate labels` reads as *"we read the form and it has no
participant label"*, and the decoded caption plainly contains labels in the lane's own caption
vocabulary. The count is a property of run granularity, and the profile does not say so.

Neither is a filed-page defect. Both are corrections to what the evidence asserts.

## Manifest evidence

`repair-rendered-artifact-manifests.mjs` lives on `claude/rcap-d-corrected-review-manifest` @ `eca9336`
and on none of the correction branches; I ran it in check mode against each branch's tree.

- **749 manifests across 7 branches, all clean.** Exit code 0 and `EVERY MANIFEST AGREES WITH ITS
  FILES` on every branch. No missing paths, no hash mismatches, nothing unreadable.
- **Check mode wrote nothing.** File list, sizes, mtimes and content hashes snapshotted before and
  after each run and compared; `git status` clean on all seven worktrees afterwards.
- **Independently re-audited.** My own audit, sharing no code with the checker, resolved and re-hashed
  every recorded path and additionally looked for PDFs *anywhere* under a family directory rather than
  only in `fixtures/` and `contact-sheet/`. It agrees on all 749.
- **No participant PDF changed merely to make a manifest current — verified for all 81
  manifest-repair-only families, not a sample.** Diffing each family directory between its
  approval-evidence branch and its v3 branch: every one changed exactly one file,
  `rendered-artifacts.json`. Zero PDFs changed.
- **The arithmetic reconciles.** 94 manifests changed across the seven branches = 81 repair-only + the
  13 families whose artifacts were re-rendered. D1B has no separate repair commit; its five updates
  are folded into the semantic-correction commit `e719d1d3`. The other six branches carry a commit
  touching `rendered-artifacts.json` files and nothing else.

One low observation: the checker only visits directories that already have a manifest, so a directory
with participant PDFs and no manifest is silently counted as no problem. One exists on all seven
branches — `vermont/200-00130-en`, a legacy directory from an earlier integration window (first added
in `f20971dd`), distinct from the D-wave family `vermont/200-00130-form-en`, which does have a manifest
and passes. It is byte-identical between the evidence and v3 branches; nothing in this cycle touched it.

## One factory-level observation outside these dispositions

On forms drawn with simple TrueType fonts, the anchor decoder's per-character advances disagree with
the widths the fonts declare, and the error accumulates. On CRRLJ-09.0870 page 2 I compared one
86-character line three ways: the font's own `/Widths` array gives `v` and `c` 500 units and `o` and
`n` 556; MuPDF's rendered glyph origins agree exactly; the decoder advances about 0.58pt further per
character for most glyphs. Both start at x=72.01 and the decoder's last glyph lands **37.36pt — about
half an inch — right** of where MuPDF puts it. CRRLJ-09.0100's worst line diverges by 24.46pt.

**This is not a regression.** Running the pre-D0-v3 decoder on the same line produces the identical
37.36pt divergence, so it predates the anchor-decoder fix. It does not affect these four families,
which derive no anchors. I raise it because the same decoder measures anchors for families that *do*
write values from a label's position, and an anchor measured from a simple-font label can sit a column
away from where it looks.

## Method, and what I did not verify

Verification used MuPDF 1.28.2 via PyMuPDF — an engine unrelated to the factory's pdf-lib path — plus
the factory's own `rcap-pdf-anchor-capture.mjs` and `d0-v3-corpus-decode-audit.mjs` run from a copy
outside every git worktree, the manifest checker in check mode, and raw byte scans of the original
files, of every FlateDecode stream decompressed, and of each file re-saved with object streams off.
All three source pack ZIPs matched their expected sha256; they were extracted outside every worktree
and neither they nor anything extracted from them is committed.

On control captions I applied the rule this cycle learned: a run inside a non-printing widget's
rectangle counts as a leak only if it also belongs to no overlapping printing widget *and* does not
appear in the untouched source's own page content at that position. That distinction did real work —
KY AOC-496.5 still has eight runs inside its non-printing `Notice` widget, and all eight
(`AOC-496.5`, `Doc. Code: NOX`, `Commonwealth of Kentucky`, `KRS 431.073` and the rest) are drawn by
the source itself at the same coordinates. They are the form's printed header under a helper box, not
a leak. Likewise most `print` tokens in these artifacts are the forms' own printed labels —
`Printed Name of Judge`, `Name (type or print)`, `PLEASE PRINT CLEARLY`.

**Determinism is verified as recorded-and-tied-to-the-bytes, not as independently reproduced.** For
each of the 16 families that produce artifacts, the recorded evidence names two renders with the same
sha256 and that sha256 is the hash of the canonical fixture actually on the branch; creation and
modification dates are pinned to `D:20260101000000Z` in every artifact I opened. I did not render
anything a second time — the assignment forbids re-rendering, and the lane scripts write into the
family directories they would have to run against. The four Washington families record
`rendered: false` because no artifact was produced, which matches their empty artifacts map.

Boundary fixtures carry deliberately long values that differ from the canonical ones, so a canonical
value absent from a boundary fixture is expected and was not treated as a defect.
