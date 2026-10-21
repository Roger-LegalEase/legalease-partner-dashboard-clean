# A half-applied contract change turns court blanks into participant tasks

**Status:** open. The first item needs a decision between two defensible fixes; the
second is data destruction and needs no decision, only a lane.
**Found by:** FIX135, 2026-09-10, on `ne-setaside-custodial-set`. Confirmed at the line
by the Captain.
**Nothing has been changed.** Three lanes were mid-measurement when this was found, and
a shared module that moves under a lane makes its return unreconcilable with its own
method.

## 1. The regression

Commit `e258e47a0` (2026-09-09) changed `scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs`
so an unmeasurable text run's `x2` is `null` rather than `x + 0`. The change is right,
and its own comment says why:

> Coalescing a null width to zero collapses the run to a point, which reads as no
> overflow — the direction that hides a clipped filing under a green counter.

`captureWidgetContext` in that same file has two branches. The second, *printed
directly above in the same column*, **was updated** for the new contract:

```js
const measuredEnds = line.runs.map((r) => r.x2).filter((v) => typeof v === "number");
if (measuredEnds.length === 0) continue;
```

The first, *printed to the left in the same cell*, **was not** — and it runs first:

```js
if (run.x2 > rect.x + 1) continue;   // null > n is false: a null run is NOT skipped
const gap = rect.x - run.x2;         // rect.x - null is rect.x
```

An unmeasurable run is silently treated as ending at zero: the exact collapse-to-a-point
the comment twelve lines above warns against, in the branch that was missed.

## 2. What it costs, measured

FIX135 proved causation the only way that settles it: it rolled back **that one file**
to `e258e47a0^`, changed nothing else, and the unmodified Nebraska builder reproduced
both committed digests exactly. Then it restored the file.

On the current module, on `ne-setaside-custodial-set`:

- **26 of 102 mapped rows lose their printed label.**
- Because role classification derives from the label, **nine court- and service-owned
  blanks become participant tasks**. `requiredBeforeFiling` goes 21 → 30.
- `DC-1-15` `Text44`, whose printed label is
  `__________________________, Judge of the ___________________`, flips from
  *"court-owned … not the participant"* to *"must be supplied before filing"*.

The packet would tell a participant to complete the judge's signature line.

The lane was offered the shortcut — declare plain meanings for the four fields the
census no longer supports — and refused it, and refused equally to ship the flipped
classification in order to land an unrelated page-order fix. Both refusals were right.

## 3. The decision

Two fixes are defensible and they differ in what they lose:

1. **Skip an unmeasurable run in the left-of branch**, as the above-branch already does.
   Consistent with the contract and with the sibling branch. **It loses the caption**:
   Nebraska's four blanks still carry no plain meaning, and 26 rows still lose labels.
   The build still refuses — honestly, but it refuses.
2. **Fall back to the run's start as a lower bound**, and record that the basis is
   approximate. This restores the pre-`e258e47a0` behaviour for caption capture while
   making the approximation visible in the record. A caption is recovered from a run
   whose extent we do not know, which is right for a short run and overstates the gap
   for a long one.

The overflow concern the original comment raises is a **different consumer** of the
same field. Nothing prevents caption capture using a lower bound while overflow
detection continues to refuse a null — but that has to be a deliberate split, not an
accident.

**What is needed before choosing:** how many families' captured labels change under
each option. That is a measurement across delivered field maps, and it is the Captain's
to make once the lanes are back.

## 4. The second finding, which needs no decision

**Rebuilding any of four families on the Nebraska/West Virginia shared host deletes the
whole `binding` block from its `product-wiring.json` — including two live `RASTER_PASS`
receipts, runs `33791677725` and `33935771571`.**

FIX135 established this on a clean tree before any edit of its own: both West Virginia
families move all four fixtures and then throw 26 blocking findings each, and the
governance state goes with the rebuild. It reverted everything; the four directories
are at HEAD.

This is in a builder that `scripts/rcap-packet-completeness/governance-preservation.mjs`
**names in its own header as one of the four it was written to replace**. The module
exists, the wiring does not, and the standing rule is that a shared fix is not enforced
while affected callers remain unwired. Two live receipts are one rebuild away from
being deleted by a lane doing ordinary work.

It needs an owner and a wiring pass, not a decision.
