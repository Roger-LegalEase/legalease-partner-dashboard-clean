# Wave C — technical corrections, handed to final review

This is the corrections lane's handoff. It approves nothing and promotes
nothing. Every family named here keeps its `correction_required` record until
an independent reviewer replaces it.

- Consumed read-only: shard b `7f38c017`, shard c `f3251dbd`, shard d `8b3da39f`
- Base: `e94fb456`, the commit all three shards reviewed
- Machine-readable: [`wave-c-corrections.json`](../../../data/rcap-all50/pdf-independent-reviews/wave-c-corrections/wave-c-corrections.json)
  and [`wave-c-corrections.md`](./wave-c-corrections.md)

## The one thing this lane could not do

**No family was rendered again.** The render driver resolves each family's
bytes under `RCAP_BUNDLE_EXTRACT`, the Master Library extract is not in this
clone, and an exhaustive search of the filesystem finds no copy of it. Outbound
HTTPS to court publishers is refused by this environment's egress policy, so
the official bytes cannot be fetched either — the same wall all three reviewers
hit.

So every correction below is proved at the module level, against bytes this
repository builds or already carries, and re-measured against each family's own
committed blank. **None is proved against a regenerated family artifact.** The
chooser prompts are still on five filed Nebraska pages, and the caption channels
recorded in the committed classifications are still glyph ids, because those are
properties of artifacts nobody could render again here.

What closes it: mount the extract, set `RCAP_BUNDLE_EXTRACT`, run
`node scripts/implement-rcap-official-forms-d1.mjs`, then re-run every generator
listed in `scripts/verify-rcap-evidence-determinism.mjs` and hand the new bytes
to an independent reviewer.

## What changed, and what proves it

| Finding | Shard | Correction | Proof |
| --- | --- | --- | --- |
| Captions and region headings captured as Identity-H glyph ids | c, d | The document's own `/ToUnicode` CMap is parsed and applied; Type0 widths come from the descendant font's `/W`. An undecodable caption is dropped rather than matched — it can neither protect a field nor bind one. | `verify-rcap-field-semantics-canaries.mjs` (`UNDECODABLE-CAPTION-DECIDES-NOTHING`); 273 fields across 15 families decode when re-measured |
| A heading in the adjacent column refusing a box it does not overlap | b | A heading is a printed CELL with its own x-range and governs only what it overlaps, or the whole page when it spans the printed width or starts at the left margin. The document's whole title block is marked, not just its first line. | `wave-c-corrections.json` → `remeasuredChannels`; `verify-rcap-widget-geometry-canaries.mjs` |
| A whole caption row read as one widget's label | b | Captions are cells, resolved against the side of a box this form actually captions from, measured off the page. | `COURT-VS-COUNTY-VA-1201`, `COUNTY-TRAILING-NC-CV226` |
| `Choose the court` / `Choose the county` surviving the flatten | c, d | Every unwritten widget is dispositioned: cleared when it holds a value or draws its own prompt, preserved when it holds nothing and draws words. | `verify-rcap-widget-appearance-canaries.mjs`, on flattened bytes, in both shapes of the defect |
| `IN THE` and `COURT OF` erased off the filed caption band | d | A field the form PRINTS through is refused rather than written into, in the map and in the renderer alike. | `PRINTED-CAPTION-SURVIVES`, `PRINTED-TEXT-FIELD-REFUSED` |
| NC AOC-CV-226: no street address, city/state/ZIP printed twice | c | `street_address` recognises a street written out; a continuation line does not repeat its block's first line; a second address block binds only when the fact set states one that differs. | `STREET-NC-CV226`, `STREET-LINE-2-NC-CV226`, `ALT-MAILING-*` |
| NC AOC-CR-296 produced as a participant filing | b | Ownership is read from the form's own words before its filename. Prosecutor-owned: `participantCompleted` false, `participantFillable` false, no bindings, participant fixtures withdrawn, guidance kept. | `verify-rcap-official-forms-d1.mjs` withdrawal clauses |
| NC AOC-CR-298's `sourceUrl` describes AOC-CR-297 | b | Withdrawn with the reason and what would close it; no replacement could be verified from here. | `source-record.json` → `sourceUrlWithdrawn` |
| `Courtney Bailey` on a filed page and invisible to every check | b | Each visible line is attributed to the blank or to this platform. Source-inherent text is recorded, never stripped and never overwritten. | `reports/page-text-attribution.json` per family |
| VA CC-1201: the court's name in the slot for its locality | d | The field name and the printed caption disagree about what the box takes, so neither wins and the box is left alone. | `COURT-VS-COUNTY-VA-1201` |
| VA CC-1201: a case number as the count of attached addendums | d | `1201` is a form number, not charge row one; and the words after the blank say what it counts. | `FORM-NUMBER-NOT-A-ROW-VA-1201`, `ADDENDUM-COUNT-VA-1201` |
| VT 600-00228: an application stating nothing about the applicant | d | The classifier reads the printed caption where the field name is contentless. | `wave-c-corrections.json` → VT binds five participant facts |
| VA CC-1473 | d | Unchanged. Its address slot keeps binding because an election caption offers the participant as one of its options; its signature block stays blank. | `ELECTION-CAPTION-*`, `SIGNATURE-BLOCK-*` |

## What a rerender will change

`wave-c-corrections.json` → `families[].bindingChanges` is the list, per family,
of what the corrected binder decides against what each map records. It is the
reviewable part of this lane: 35 bindings move across 12 families, every one of
them with the reason attached.

Two families are deliberately unchanged: NC AOC-CR-296, which is withdrawn, and
VA CC-1473, which shard d found geometrically clean.

## Evidence integrity

- `gate-b-family-rerender-evidence.json` no longer carries a second copy of any
  artifact digest under a "new" name. The pair agreed when written and stopped
  agreeing the moment anything rendered.
- Its rerender narrative is replaced by measured preconditions, and its
  verifier list is run rather than remembered.
- `gate-b-evidence-completion.json` validates the committed sidecar rather than
  a substitute it built in memory, records `sourceHashesRecomputed: 0`, and
  reads `readyForIndependentReview: 0` — the source axis is untested here, which
  is the conclusion all three reviewers reached.
- `verify-rcap-evidence-determinism.mjs` runs all nine generators twice and
  requires the digest of every tracked and new file to be identical afterwards,
  runs every check mode against the committed bytes, and recomputes all 119
  `current*` digests from the files they name.

## Still open

1. **The rerender.** Blocked on the Master Library extract. Nothing below the
   module level is proved against family bytes until it runs.
2. **The source axis.** No official source digest was recomputed here, so no
   family is eligible for `approved_platform_ready` on that axis — independently
   of anything in this lane.
3. **NC AOC-CR-298's publisher URL.** Withdrawn, not replaced. Needs an
   environment with egress to a court publisher.
4. **NE DC-1-15** stays held back. It is in this lane for the decoder and the
   appearance clearing only; its certificate-of-service binding is not closed.
5. **NC AOC-CR-296's artifacts.** The two participant fixtures are withdrawn and
   the next render of that family produces nothing to replace them with, which
   is the intended end state.
