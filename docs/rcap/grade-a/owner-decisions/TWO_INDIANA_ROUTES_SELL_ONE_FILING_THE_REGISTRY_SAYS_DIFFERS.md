# Two Indiana routes sell one filing, and the registry says they differ

**Status:** open, for Roger. Neither family is promoted while it stands.
**Families:** `in_arrest_no_charges-set`, `in_section1_petition-set`.
**Established at:** commit `d3946abfcfe611fda430491917088d09367c3bb0`, by VF42,
reading FIX140's evidence.

## What is measured, not argued

- One boundary file, digest `0e39d7c6`, **is the same file for both families**.
- One insert file, digest `f06f7dbb`, **is the same file across all four insert
  fixtures**.
- The two canonicals differ, and the difference is not a legal mark: diffed
  with pikepdf, **all 15 page content streams are byte-identical**, and the
  whole difference is 9 flattened XObjects carrying the *same decoded strings*
  at different auto-fit sizes (`/Helvetica 10.51` vs `11`, `9.94` vs `11`,
  `11` vs `12`).

## Why FIX140 thought this was benign, and why that is refuted

FIX140 argued that nothing route-constant could separate the two tracks: the
only marks that could are the insert form's disposition elections, and the
track registry makes `disposition` a required *participant* fact while
Check Box17/18 asserts an act of the prosecuting attorney — so a builder may
tick neither. The second half of that is right and VF42 confirms it.

The first half is wrong. The registry does carry route constants that differ:

| | `in_arrest_no_charges` | `in_section1_petition` |
|---|---|---|
| `dispositions` | `["arrested_no_charges_filed"]` | five values |
| `waitingPeriods` | one entry, no early-filing term | two, including "Written agreement of the prosecuting attorney" |
| required fact | — | `prosecutorWrittenAgreementEarlyFiling` |

The insert's §5 elapsed-time election is keyed to exactly that difference.

**The packets match because the insert takes zero writes from either route**,
so neither track's constants reach paper. In VF42's words: that makes the
clone worse, not benign.

## The question

Two routes are offered, the registry distinguishes them, and one document is
delivered for both. Either:

1. the two routes genuinely deliver the same filing, and the difference the
   registry records is not a difference the court sees — in which case the
   routes should say so, and one of them should probably not be sold
   separately; or
2. the filing must carry the distinction — the §5 elapsed-time election, and
   for `in_section1_petition` the prosecutor's written agreement — in which
   case the packet is currently incomplete for at least one route, and the
   facts it needs are collected by nothing.

This is not a build decision and no lane may take it. A lane that ticked one
of those boxes to make the fixtures differ would be swearing to a fact the
platform does not hold.

## What is already known about option 2's cost

The facts needed for the `in_section1_petition` branch — the prosecutor's
written agreement and the date it was given — are **acts of a third party**.
The packet may never assert them; at most it can carry a labelled blank and
tell the participant what must be attached. That is a packet change, not a
legal one, and it is available as soon as the route question is settled.

## What this does not decide

Nothing here says either packet is defective on its face. Both are built from
the same published Indiana bundle at the same digest, and both correctly
refuse to assert a prosecutor's act. Both also owe a fresh central raster for
an unrelated reason: four stale bindings in the raster queue.
