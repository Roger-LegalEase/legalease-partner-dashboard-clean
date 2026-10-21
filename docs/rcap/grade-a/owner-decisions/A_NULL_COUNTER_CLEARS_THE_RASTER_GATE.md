# A counter nobody measured clears the raster gate

**Status:** open, for Roger. Nothing has been changed on the strength of this.
**Measured:** 2026-09-10, by the Captain, on the committed records.
**Grants nothing.** No family is promoted, demoted or re-rastered by this document.

## The rule this factory enforces everywhere else

Both standing lane briefs say it, and every lane is held to it:

> A counter you could not measure is `null`, never `0`.

It is the rule that stops a lane publishing a zero it did not earn. It has cost
lanes whole shifts and it is worth what it costs.

## The gate does the opposite

`scripts/grade-a-packet-factory-24h/generate-raster-queue.mjs` decides whether a
family may enter the visual gate. Among its preconditions:

```js
const nonVisual = comp
  ? Object.entries(comp).filter(([k, v]) => !/visual/i.test(k) && Number(v) > 0).map(([k]) => k)
  : null;
if (comp && nonVisual.length) eligibility.push(`nonvisual completeness counters not zero: ...`);
if (!comp) eligibility.push("no completeness audit");
```

`Number(null)` is `0`. So a counter the audit explicitly declined to measure passes
the "counters are zero" precondition, and the family is enrolled. The gate refuses a
family with **no** audit and admits one whose audit said *I could not measure this*.

Eighteen families currently in the raster queue carry `invisibleWrites: null` —
seven California, four Illinois, two New Jersey, two New York, three Pennsylvania —
and their completeness result is literally `NOT_MEASURABLE_HERE`. Fifteen of the
eighteen are `COMPLETE_PACKET_PROVEN`. `invisibleWrites` is the counter for text
written where nobody can see it.

## Why this is a latent hole and not fifteen bad families

I checked before proposing anything, and the alarm does not survive the check.

The terminal transition does not read the completeness matrix. It requires an
**independent reader's** `PASS_COMPLETE_INDEPENDENT`, and the extractor refuses that
verdict unless the reader measured all nine counters itself rather than copying the
builder's. So for these eighteen there are two separate measurements: the static
auditor could not measure `invisibleWrites`, and the reader could and did.

Nothing here impeaches those fifteen passes. What it shows is that the gate would
admit a family where **no** measurement existed, and raster admission is one of the
four conditions of the terminal transition. The hole is real; today nothing has
fallen through it.

## Why I did not simply fix it

The blunt fix — refuse eligibility when a non-visual counter is `null` — removes
eighteen families from the queue and, on the next derivation, would take fifteen
proven families out of `COMPLETE_PACKET_PROVEN` for a reason that is not true of
them. Their counters were measured; they were measured by the reader rather than by
the static auditor. Demoting them would be an inaccurate downward correction, and
the standing instruction accepts *accurately evidenced* ones.

The question is therefore a design decision and it is yours:

1. **The gate distinguishes the two measurements** — a `null` from the static
   auditor is acceptable where the family's current independent read measured that
   counter, and refuses otherwise. Correct, and it makes the gate depend on the
   verifier record it does not read today.
2. **The gate refuses on any `null`** and the eighteen are re-audited so the static
   auditor produces a number. Strictest, costs eighteen re-audits, and demotes
   fifteen families in the interim.
3. **The gate keeps admitting `null` and says so out loud**, recording per family
   which counters were unmeasured at admission so the receipt cannot be read as
   covering them. Cheapest, and leaves the hole open by choice rather than by
   accident.

I recommend (1). It closes the hole without asserting anything untrue about a
family, and the information it needs is already in `VERIFIER_RETURNS.json`.

## The same gate reads a sentinel as a count, in the other direction

`md_10110_conviction-set` and `md_cannabis_petition-set` are the only two families
in the whole queue at `BUILT_RASTER_PENDING`, and they are held out of the visual
gate by `requiredComponentsMissing: 1`.

That `1` is not a count of missing components. In
`scripts/rcap-packet-completeness/md-conditional-native-candidates.mjs` the whole
audit is wrapped in a `try`, and **any** throw returns
`result: FAIL_COMPONENT_SET` with every counter `null` except
`requiredComponentsMissing`, which is set to `1` as a fail-closed sentinel. The
error actually thrown on both families is:

    Unexpected static outcome: canonical
    + actual   'NOT_MEASURABLE_HERE'
    - expected 'PASS_COMPLETE'

which is about a source census, not about a component. Both families report
`auditable: false`, `rowsInspected: 0`, `terminalFields: 0` — the auditor inspected
nothing.

It inspected nothing for a reason that is not a defect. Both are
`DECLARED_NOT_INSTALLED` conditional-delivery families:
`generationAllowed: false`, `serviceDisposition: missing_from_compiled_runtime`,
`explicitSelectionRequired`, with their packet chosen at runtime from prepared
fixtures. There is no single static packet for a static auditor to audit.

Failing closed is right. Failing closed under a counter name that asserts a
specific untrue thing is not, and it is the same `null`-means-`0` confusion running
the other way: here an unmeasurable outcome is published as a number, where in the
gate a number that does not exist is read as zero.

Note that correcting the sentinel to `null` **on its own would promote both
families**, because of the gate defect above — `Number(null) > 0` is false. The two
must be decided together, which is why they are one document.

The underlying question is yours as well: **can a conditional-delivery family whose
packet is selected at runtime ever reach terminal through a static completeness
audit and a central raster?** If it cannot, saying so is better than leaving two
families parked behind a sentinel that reads as a missing component.
