# 33 — the three questions with no owner mapping

`generate-all51-legal-authority-finalization --check` fails on
`3 question(s) have a provenance with no owner mapping`.

## Classification

**`OWNER_DECISION_REQUIRED`** — for both bases, narrowly.

Not because the work is unclear. Each question states exactly what is needed,
and in all three it is source acquisition. But the owner is assigned **by
provenance class**, and nothing in this repository establishes an owner for
either class. Filling the table is a class-level statement nobody has made.

## The three

| Jurisdiction | Track | Basis |
|---|---|---|
| RI | `ri_first_offender_misdemeanor` | `independent_review_finding` |
| RI | `ri_multiple_misdemeanors` | `independent_review_finding` |
| WY | `wy_traffick_6_2_708` | `owner_relayed_research` |

**The two RI rows are one finding, not two.** Both carry `findingId: RI-B-07`,
the same question text and the same `exactRemainingQuestion`; the finding names
both families (`ri_first_offender_misdemeanor-set`,
`ri_multiple_misdemeanors-set`). So the decision covers **two distinct
questions**, carried on three track rows.

## What each represents

**RI-B-07** — `BOUNDED_FEE_SOURCE_LIMIT`, from
`data/rcap-grade-a/chat-parallel-2026-09-07/review/ri-independent-findings.json`.
The Superior Court FAQ says there is no expungement fee and has now been checked
directly rather than owner-relayed, but it *"is not, by itself, an independently
verified District Court filing-fee schedule."* Two attempts to read the full 2021
chapter-141 enactment timed out. The remaining work:

> "For these District Court filings, confirm the present filing charge, if any,
> from a District-specific official source or actual clerk response. Do not
> reintroduce the repealed $100 grant charge, apply civil fees, or ask counsel to
> find a nonexistent official proposed-order form."

**WY `wy_traffick_6_2_708`** — from
`docs/rcap/grade-a/research/2026-09-06-batch-03/Packet_Blocker_Batch_03_Handoff.md`.
*"the official Wyoming rules index was retrieved but the criminal-rules PDF
download failed in the research session; current Rule 47/49 service language was
not inspected."* The work: retrieve the rules and bind the court's current
service, scheduling and sensitive-evidence procedure before filing instructions
are released.

Both are **live**. Neither is superseded, aliased to another provenance, or
invalidly attached. Both describe fetching an official source that a previous
attempt failed to obtain.

## Why this is a decision and not a lookup

`QUESTION_OWNER` is keyed on `provenance.classificationBasis`:

```
counsel_confirmation_required -> counsel
explicit_state_addendum       -> source_acquisition
mechanical_translation        -> engineering
batch_decision_matrix         -> counsel
```

Across the whole memo corpus the bases divide 1 332 questions as 841 / 276 / 208
/ 1, plus `owner_relayed_research` 4 and `independent_review_finding` 2. The
schema carries a discriminator per basis and they line up exactly —
`normalizerInferred` 276, `counselQuestion` 208, `researchSha256Prefix` 3,
`findingId` 2 — but **no question anywhere carries an owner field**. The owner
comes from the basis and from nothing else.

And the two unmapped bases describe **where a question came from**, not what
kind of work answers it. An independent review can raise a counsel question;
owner-relayed research can surface a legal one. So writing
`independent_review_finding -> source_acquisition` would assign source
acquisition to every future independent-review question regardless of what it
asks. That is a claim about a class, and no decision record, registry or schema
field supports it.

The evidence available says only what these three ask for, and that is source
acquisition in all three.

## Nothing gates on it

`releaseQuestions.byOwner` and `unmappedProvenance` have no consumers. The three
downstream readers of the register take `deferredCounselQuestions`,
`legalResearchRequiredTracks` and `noTrackRows`. The check exists so the owner
breakdown is exhaustive — the same defect the file already records fixing once,
when a published breakdown omitted a category of size one.

So recording an owner would create no authority and open nothing. It would also
not be free: it is the first statement about who owns two classes of question.

## The narrow decision

> For a release-blocking question raised by an **independent review finding**, and
> for one raised by **owner-relayed research**, which lane owns resolving it?

For the three at hand the answer is evidently `source_acquisition` — each names
an official source that must be fetched, and RI-B-07 rules counsel out for the
form question in terms. Six questions carry these two bases corpus-wide, three
of them release blockers, so the class is small and the blast radius is known.

Three ways to take it, in descending preference:

1. **Decide the two class mappings.** Smallest change, matches the existing
   mechanism, and is a real decision that should be recorded as one.
2. **Move the owner onto the question.** Add an explicit owner field so a
   question from any source can state its own lane. Correct in the long run,
   larger, and it changes the memo schema.
3. **Leave it.** The register stays red and keeps naming three questions whose
   owner nobody has stated, which is at least truthful.

## What must not be done

- Do not add the two rows to `QUESTION_OWNER` as a mechanical fix. That is a
  class-level claim, and step 33 going green would hide that it was made.
- Do not retire either provenance. Both questions are open and neither source is
  superseded.
- Do not resolve the questions themselves to clear the step. RI-B-07 needs a
  District-specific source or a clerk response; WY needs the rules PDF that a
  research session failed to download. Neither is answerable from this
  repository.

## Gate

Diagnosis and recording only. `comparedInputs: 30`, `changedPaths: []`,
`rebuildRequired: false`.
