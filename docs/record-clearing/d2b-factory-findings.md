# D2B — findings for the D0 factory owner

Five findings from building New Jersey, Florida, Louisiana and New Mexico on the
remediated factory. None of them was worked around in lane D2B: no shared module
was modified and no default protection was weakened. Each was handled by
narrowing — a lane-level reviewed mapping table that can only subtract writes —
and is reported here because the narrowing belongs in the factory rather than in
seven separate lanes.

## 1. `participant.full_legal_name` shadows more specific descriptors

`FACT_DESCRIPTORS` is matched most-specific-first by authoring order, and the
list is authored, so a tie is a defect in the list. But
`participant.full_legal_name` matches on `\bname\b`, `\bdef\b`, `petitioner`,
`applicant` and `defendant`, and it sits at index 15 — after `city`, `state`,
`zip` and `street_address`, but its alternatives are broad enough to win against
descriptors that are genuinely more specific for the field in hand.

Observed on NJ CN-10557:

| field | means | binds |
| --- | --- | --- |
| `DefAddrSt` | the participant's state | `participant.full_legal_name` |
| `DefAddrStr` | the participant's street | `participant.full_legal_name` |
| `DefBirthDt` | the participant's date of birth | `participant.full_legal_name` |
| `ExpungeCntyName` | the county of filing (a dropdown of NJ counties) | `participant.full_legal_name` |
| `ProsCntyName` | the prosecutor's county | `participant.full_legal_name` |
| `FamDivName` | the Family Division's county | `participant.full_legal_name` |

`haystack("DefAddrSt")` is `def addr st || defaddrst`, and `\bdef\b` fires
before `\bstate\b` is ever reached.

**Why it could not be fixed in-lane.** `explicitMappings` refuses when the named
fact differs from the descriptor D0 already chose:

```js
if (explicit && explicit !== descriptor.factId)
  return { writable: false, reason: "explicit_mapping_conflicts_with_field_name", ... };
```

That refusal is correct — an escape hatch that could redirect a descriptor would
be a way around the protect rules. But it means a field D0 mis-binds cannot be
bound correctly by any sanctioned route, only left blank. Six genuinely safe
participant fields on NJ's statewide kit are blank for this reason.

Worth considering: scoring descriptors by match specificity rather than list
order, or splitting `full_legal_name`'s broad party-role alternatives
(`petitioner`, `applicant`, `defendant`, `\bdef\b`) from its narrow name
alternatives so a field naming both a party role and a more specific attribute
resolves to the attribute.

## 2. A widget's disambiguating suffix is read as a charge row index

`rowIndexOf` treats trailing digits as a charge row. Acrobat's own duplicate
naming produces exactly that shape for fields that are not a table at all.

FL Duval repeats one caption case number across six sub-forms — a petition to
expunge, an affidavit, an order to expunge, a petition to seal, an affidavit and
an order to seal — as `CASE NO`, `CASE NO_2` … `CASE NO_6`. With three charges
supplied, the affidavit's caption receives charge 2's case number and the order's
receives charge 3's. With one charge supplied they are refused as
`repeating_row_without_indexed_fact`, which is the safe outcome but for the
wrong reason: they are not rows.

The same shape appears on FL St. Johns (`CASE NO_2`, `CASE NO_3`) and on NJ
(`DefAddrStr2`, `FamDivAddr2`). Conversely NJ's real charge table is named
`arrest1CaseNum` … `arrest5CaseNum`, where the index is *infixed*, so
`rowIndexOf` returns null and all five rows would receive the same matter-level
case number.

So the current heuristic misfires in both directions on this corpus: it indexes
things that are not rows, and fails to index things that are. A row is probably
better identified from the map than from the field name.

## 3. Service recipients are not identifiable by name

The `agency`, `prosecutor` and `clerk` protect rules match words —
`prosecut`, `district attorney`, `sheriff`, `police`, `probation`. NJ CN-10557
abbreviates all of them: `ProsAddr2`, `ProbAddr2`, `SccAddr2`, `WardenAddr2`,
`SuperintendentAddr2`, `MuniCrtsAddr2`, `Prob2CntyName`, `IdbCnty`. `Pros` does
not match `prosecut`; `Prob` does not match `probation`.

These are the blocks that tell the court who was served. The generic binder
offered to write the participant's own street address into six of them.

Adding abbreviations to the deny list would help this form and not the next one.
The more durable observation is that a service block is a *layout* fact — a
repeated address-shaped group of fields, several to a page, on a page whose text
says "certificate of service" — and might be better detected structurally than
lexically.

## 4. A notary jurat's county blank looks exactly like a caption's

The `notarization` rule matches `notar`, `jurat`, `sworn to before`,
`my commission expires`. The New Mexico DPS Authorization for Release of
Information prints its jurat as:

```
SIGNED AND SWORN TO BEFORE ME ON THIS _____ DAY OF __________ 20____.
STATE OF __________________ COUNTY OF ___________________________.
```

The blank that must stay blank is labelled `COUNTY OF` — character for
character what a caption's county blank is labelled. The jurat language is on
the line above, and on this particular binary the font's encoding transposes
characters (`SIGNED AN SDWORN T BOEFORE ME`), so even a whole-line scan for
`sworn` does not catch it.

What does separate them, on every form in this lane, is position: a caption
prints `COUNTY OF ____` as the only blank on its line, and a jurat prints
`STATE OF ____ COUNTY OF ____`. The lane's county rule now requires the blank to
be the first on its line. That is a positional signal a text-only binder has no
way to use, which may be the general point: for flat forms, the protect decision
wants the geometry as well as the string.

## 5. Two encoding defects that make source text untrustworthy

Both are in browser-print or scanned sources, both are recorded per family, and
neither affects written values — the factory draws in its own embedded
Helvetica — but both defeat any check that reads the source's own text.

- **Louisiana's CCRP articles** map `N` to an exclamation mark in their bold
  font: the source draws `MOTIO! FOR EXPU!GEME!T FOR MISDEMEA!OR CO!VICTIO!`.
- **NM 4-222 and the NM DPS release** transpose characters within runs:
  `DEAPRTMENT OF PULIB CSAFETY`, `$SSOLFDWLRQ` for `Application`.

A non-filing notice, a "for court use only" legend or a jurat in one of these
fonts would not be found by any pattern. `scanBytesForActiveContent` is
unaffected because it judges object structure, but every text-derived guarantee
in the factory — the non-filing hold, the anchor labels, the contact sheet's
visibility proof for *pre-existing* text — is weaker on these binaries than the
factory's own reporting suggests.

`missingExpectedValues` is unaffected for written values and was verified
explicitly on NM 4-222: all six values are visible in the finalized artifact.

## What lane D2B did instead

A reviewed mapping table gating every write behind D0's own decision. D0 decides
first and is never bypassed; a field or anchor is then written only if the lane's
table names the exact fact it carries. 80 writes survived both gates across 31
families; each of the 1,979 refusals carries its reason.

The table can only subtract, so it cannot become a way around D0 — which is why
it was a safe thing for a state lane to add, and why it is not a substitute for
fixing the four binder findings above in the shared factory.
