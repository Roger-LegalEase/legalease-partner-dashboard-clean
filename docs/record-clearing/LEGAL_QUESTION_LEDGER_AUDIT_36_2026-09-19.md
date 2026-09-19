# 36 — two symptoms, one event, two records

`generate-all51-current-legal-questions --check` reported four problems: the
tuple arithmetic, Q-058's scope, and two staleness complaints. Split before
diagnosis, as they need not share a root.

They do share an event. They do **not** share a record.

## 36A — why the arithmetic differed

**`ACCOUNTING_OMISSION`. Resolved.**

`TUPLE_BASELINE` is hand-maintained: a literal `count: 53` published 2026-08-28,
plus named additions and departures. It predicted `53 + 2 − 14 = 41`; the
finalization emitted 42.

The 42nd tuple is **Q-058**, KY `ky_void_seal_marijuana_synthetic_salvia`. It is
not a duplicate, not superseded, not out of scope and not malformed. It appeared
because commit `c5c0f3d50` — regenerating the sellable-pathway closure after the
track-terminalization ledger was brought current — bound
`KY:void-and-seal-a-first-marijuana-synthetic-drug-or-salvia-possession-conviction-under-218a-276`
to that track. The track already carried the question; the binding is what let
the paid-pathway legal join reach it.

That is exactly the class of event `additions` exists to record. The Mississippi
entry beside it says the same thing in the same words: *"binding the routes is
what surfaced it."* The KY binding simply had no entry.

Recorded as a third addition, naming the commit that made the binding and the
evidence file. `53 + 3 − 14 = 42`, and the register regenerates current.
Set-differenced against the committed register: exactly one question added,
`Q-058`, none removed; `historicalLedgerTuples` 41→42,
`historicalDeferredUniqueQuestions` 37→38, `historicalUniqueQuestions` 43→44.

No legal status changed. This is bookkeeping catching up with a binding.

## 36B — Q-058's truthful scope and status

**In scope and unresolved as a legal question. Outside the 2026-08-28 national
report's scope as a matter of coverage. Still open.**

```
Q-058  KY  ky_void_seal_marijuana_synthetic_salvia
"The static legal propositions the generated motion asserts about the effect
 of voiding and sealing have not been ratified by counsel."

affectedElement   legal_effect_or_warning
classification    READY_FOR_LEGAL_DESIGN_RESEARCH
legalStatus       OPEN
owner             Lawrence Blackmon
authorities       KRS 218A.276(1),(8),(9),(10), KRS 27A.099, KRS 431.078(2)
reviewedAsOf      2026-08-06
```

It is not answered elsewhere, not superseded, and not source-acquisition work —
its own reason says it "needs neither a rendered packet nor a fresh source". It
is a counsel ratification question.

**The report cannot have answered it.** The check requires every `OPEN` question
to be recorded in `scope.registerQuestionsOutOfReportScope`. That is not a
formality: the overlay is a crosswalk of a dated report, and an open question the
report never carried has to be named as such or the register overstates the
report's coverage. Two questions are already recorded that way — Q-018 and Q-057
— both with the reason *"Entered the register after the national report's intake
was taken. Binding … surfaced …"*. Q-058 entered the register after the report's
intake for the identical reason, by the identical mechanism.

So the scope statement is true on the report's own contract, not merely
convenient. **That is not why it is left undone.**

## Why 36B is not a one-line addition

The mechanism cannot express it truthfully today.

`scripts/generate-national-legal-decision-overlay.mjs` builds the out-of-scope
list from `EXPECTED.outOfScopeQuestionIds` (hard-coded `["Q-018"]`) plus the
crosswalk's `outOfReportScope`, and then attaches the **same** reason and source
task to every entry:

```js
registerQuestionsOutOfReportScope: [...outOfScope].map((questionId) => ({
  questionId,
  reason: sourceTask?.outOfReportScopeReason ?? null,
  sourceTask: SOURCE_TASK
}))
```

`SOURCE_TASK` is a constant:
`data/record-clearing/legal-decisions/2026-08-28-ms-99-19-72-source-task.json`,
and its `outOfReportScopeReason` is Mississippi-specific — it names
§ 99-19-72, the two MS routes and the `ms-misd-addl` binding.

Adding Q-058 through this mechanism would publish, against a **Kentucky counsel
ratification question**, a reason stating that a **Mississippi filing-fee**
question was surfaced by binding two Mississippi routes, citing a Mississippi
source task. That is false on its face, and it would also be the second and third
questions to carry a reason that does not describe them — Q-018 already does.

The structural defect: the out-of-scope mechanism is single-source, so it can
hold one question's rationale and no more.

## Terminal remediation

1. Make `reason` and `sourceTask` per-question in the overlay generator, so each
   out-of-scope entry states why *that* question is outside the report.
2. Check Q-018 while doing it: it may already be carrying the Mississippi reason
   incorrectly.
3. Then record Q-058, with a KY-specific reason naming the closure regeneration
   that surfaced it.

Q-058 remains `OPEN` throughout. Being outside a dated report's scope says the
report did not answer it; it is not an answer.

## Noted in passing, not fixed

The register's generated `note` reads *"53 were in the first published queue and
−11 were added by bindings named in accountedAdditions"*. It computes
`tuples.length − count`, which ignores the 14 departures, so it prints a negative
number of additions. It was already wrong before this change (−12) and is wrong
by the same construction after it (−11). A sentence in a published report that
says a negative number of things were added is worth correcting, in the step that
owns that text.

## What must not be done

- Do not record Q-058 as out of report scope through the current mechanism. The
  statement would be true and its published reason would be false.
- Do not mark Q-058 resolved, or move it out of `OPEN`, to make the check pass.
  Nobody has ratified the propositions it names.
- Do not revert the KY binding. It is correct; the tuple is real.

## Gate

36A changes a generated ledger and the generator's accounting literal. Neither
is a worker-image input. `comparedInputs: 30`, `changedPaths: []`,
`rebuildRequired: false`.
