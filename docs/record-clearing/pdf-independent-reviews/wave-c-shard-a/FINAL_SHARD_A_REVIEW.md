# Final Independent Review — Shard A

**Base reviewed:** `e94fb456` — *fix(rcap-pdf): ask the evidence a geometric question, and make the renderer obey the map*
**Result:** two approved, two require correction. Mixed results are pushed together; neither rejection holds an approval.

| Family | Verdict | Historical objections closed on these bytes |
|---|---|---|
| `AK:tf-800-form-en` | **approved_platform_ready** | 4 of 4 |
| `AK:tf-805-form-en` | **approved_platform_ready** | 4 of 4 |
| `KY:aoc-334-form-en` | **correction_required** | 4 of 5 — SSN objection closed, a new one opened |
| `KY:aoc-496-3-form-en` | **correction_required** | 2 of 3 — the county objection was never re-rendered |

Authoritative record: `data/rcap-all50/pdf-independent-reviews/wave-c-shard-a/final-verdicts.json`.
Verifier: `verify-wave-c-shard-a.mjs` — 169 checks against `e94fb456`, passing.
Nothing was repaired; no implementation path and no other lane's verdict was touched.

## Correction of course, stated plainly

Two earlier passes in this session reported that `e94fb456` did not exist. It does. This
clone had only `origin/main` and the reviewer branch until the remotes were fetched, and the
`ef957a9` lineage it defaulted to carries the **pre-correction frozen artifacts**. Those
verdicts described the wrong bytes and are retained at `verdicts.json` marked
`authoritative: false`. Everything below was redone from scratch against `e94fb456`.

That detour is itself a finding: reviewing the frozen lineage reproduced the *original*
SSN objection almost exactly, which is what a stale base looks like from the inside.

## What was verified, per family

Source bytes first: all four SHA-256 recomputed from the shard pack match both the pack
manifest and each sidecar's pinned `sourceSha256`. Visible identity was read off the page —
`TF-800 (5/25)`, `TF-805 (5/25)`, `AOC-334 Rev. 1-22`, `AOC-496.3 Rev. 6-23` — and the AK
revisions agree with the pinned `REV-2025-05`.

At this base the sidecars are conformant: `officialFormNumber`, `officialTitle`,
`classificationSha256`, `packetSpecSha256` and the result blocks are all populated, and both
`fieldMapSha256` and `classificationSha256` hash the **file bytes** directly. (On the older
lineage `fieldMapSha256` covered only the derived bindings array — a trap that reads as a
stale-sidecar defect. It does not apply here.)

All nine relevant pages were rendered from blank source and finalized artifact and read by
eye, with generated content isolated by differencing the two so that source-inherent marks —
rule lines, flattened `Print Form` / `Reset Form` button captions — are not mistaken for
generated text. All eight artifacts are flattened, zero annotations surviving, with no
`/XFA`, `/JS`, `/AA` or `/OpenAction` anywhere in the object graph.

## The two approvals

`AK:tf-800-form-en` and `AK:tf-805-form-en` draw every participant value inside the widget
rect of the field it is bound to, fully contained, legible — zero placement issues across
all five pages.

Their historical objection was `RC-M-SERVICE-BLOCK-BY-NAME`: the filing date written into
the Certificate of Service blank, fired from the field name rather than the printed heading.
On these bytes the `certDate` binding is gone, TF-800 page 2 adds only the case number,
TF-805 page 2 adds nothing at all, and the Certificate of Service renders blank. Verified by
eye on the current artifact rather than taken from the prior flag. `RC-P-SIDECAR-NONCONFORMANT`,
`RC-C-GEOMETRY-NOT-AN-INPUT` and `RC-B-NO-APPROVAL-CHANNEL` are likewise closed. The ORDER
regions, judicial-officer and clerk blocks, notarization and commission-expiry lines are blank
on every page. Both were re-rendered by the correction wave — their canonical hashes differ
from the frozen ones.

## Correction 1 — `KY:aoc-334-form-en`: the name moved from the SSN box into the court's order

The historical `RC-M-NO-SSN-RULE` objection **is closed**: the `Defendants ssn` binding is
gone and that slot renders blank.

A different defect now stands in its place. Page 1 reads:

> The **Kentucky State Police and other following agencies listed below are hereby ordered to
> seal** any records in their custody regarding the above-named Defendant and above-listed
> charge(s):
> **Jordan Avery Reyes**

The participant's name is printed into the agency list *inside the court's order* — the space
naming the agencies commanded to seal. The map's own entry shows how:

```json
{"field":"listed charges","class":"participant","factId":"participant.full_legal_name",
 "factBasis":"printed_label","effectiveLabel":"their custody regarding the above-named Defendant and above-"}
```

The label matched against is the court's own order sentence. So `RC-C-GEOMETRY-NOT-AN-INPUT`
is addressed in form — geometry and captions are inputs now — and reopened in effect: the
printed-label path it enabled is what puts participant data in court space.

- **Required:** the agency list inside the order is court and agency space and must be blank
  of participant-derived content.
- **Smallest correction:** drop the `listed charges` binding, or exclude `printed_label`
  matches whose `effectiveLabel` falls inside a court-owned decision or agency paragraph;
  then re-render and refresh the sidecar. `Case No`, `Defendant` and `Defendants Birthdate`
  are correct and unaffected.

## Correction 2 — `KY:aoc-496-3-form-en`: the family the correction wave never re-rendered

This is the load-bearing fact: the canonical artifact at `e94fb456` is **byte-identical** to
the hash frozen in `correction-queue.json` — `850a0936…`. The sidecar was refreshed; the
artifact was not. `RC-C-GEOMETRY-NOT-AN-INPUT` therefore remains open against the exact
current bytes, and it reproduces on sight.

Page 1, `3 County Dropdown` (`/Ch`, 121 options, rect `[452.0, 692.8, 576.0, 706.2]`): a
single **791-glyph** run is drawn at `y1 = 692.2`, spanning `x = [452.0 .. 507.6]` — starting
at the rect's left edge but *below* its lower bound, so the County rule line clips it to an
illegible smear. The run is the field's whole `/Opt` list, every Kentucky county concatenated:
121 options totalling **792 characters** against **791 glyphs** drawn. The field's value `/V`
is `" "` — nothing is selected. Extraction returns `AAABBBBBBBBBBBBBCCCCCCCCCCCCCDEEEF…`
because the subset font has no usable ToUnicode, which is precisely why this needed eyes and
geometry rather than extracted text.

- **Required:** a `/Ch` field must flatten to its selected value only, drawn once, legibly,
  inside the widget rect. With `/V = " "` the County region must render blank.
- **Smallest correction:** draw `/V` rather than the `/Opt` list and skip the draw when `/V`
  is empty or whitespace — then **re-render this family**, the one in this shard the wave
  missed. `1 Case Number` is correct and unaffected.

## Captain handoff

Two families are ready to promote now. Two are held, for one shared cause and one specific one:

1. **Re-render `KY:aoc-496-3-form-en`.** It was skipped by the correction wave, so no amount
   of downstream evidence refresh will close its objection. Fix the `/Ch` flatten path first,
   or the re-render reproduces the smear.
2. **Constrain the `printed_label` binding path** before it is trusted elsewhere. On AOC-334
   it matched the court's order sentence and put the participant's name in agency space. Any
   family whose bindings carry `factBasis: "printed_label"` deserves the same page-level look
   this shard gave AOC-334 — the failure is invisible to field-name review and to the
   classification, because the classification never disagreed.

Both AK approvals depend on the `certDate` removal holding; if the service-block rule is
revisited, they need re-review.

## Observations short of correction

- Both KY sidecars pin `sourceRevision: REV-UNKNOWN` while the documents print `Rev. 1-22`
  and `Rev. 6-23`. Cheap provenance gap, unchanged from the prior wave.
- `KY:aoc-496-3`'s applicant NAME / ADDRESS / PHONE lines are refused (bare ordinal field
  names match no allowlisted fact) and render blank — fail-closed and safe, but the
  application artifact is not participant-complete.
- Flattened `Print Form` / `Reset Form` captions survive as inert graphics on both KY
  families. Source-inherent, cosmetic.
