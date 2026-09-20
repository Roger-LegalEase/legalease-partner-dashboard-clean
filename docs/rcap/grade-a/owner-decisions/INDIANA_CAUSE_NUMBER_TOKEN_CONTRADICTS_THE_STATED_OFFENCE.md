# Indiana case-type tokens: the question is settled, and my framing of it was wrong

**Status: RESOLVED by owner-supplied source findings, 2026-09-10. Superseded framing
preserved below rather than deleted.**

## What the rules say

Roger located the publication two lanes searched for and could not find:

- **Admin. Rule 8(B)(3)** — `FB` identifies **Class B felony**; `FD` identifies
  **Class D felony**.
- **Admin. Rule 1(B)(4)(a)(iii)** — the case category is assigned by the **most
  serious charge**.
- **QCSR Instructions, August 2026, page 9** — the category **remains** after amended
  charges or a conviction of a lesser offence.

## The correction, stated plainly

**`FB` beside a final Class D conviction is not automatically contradictory.** A case
charged at Class B and resolved by a Class D conviction keeps its `FB` category, by rule.

I recorded the d6/felony pairing as a contradiction needing legal input. That framing was
wrong. What I had was a token and a final conviction class that differ — which the rules
say is an ordinary and expected outcome, not a defect. Two lanes correctly refused to
invent a convention; the failure was mine in reading the difference as a conflict.

**No production rule may equate a case-type token with the final conviction class.**
Nothing in this repository should reject or rewrite a real identifier merely because its
token differs from the conviction. Doing so would corrupt exactly the cases the rules
describe.

## What the synthetic d6 fixture should carry

The boundary fixture's metadata was checked before choosing, rather than assumed. It
records:

    matter.offense_level        "Class D felony under the pre-2014 sentencing scheme,
                                 treated as a Level 6 felony conviction"

and carries **no original-charge, amended-charge or most-serious-charge field**. So the
fixture does not model a higher original charge, and no history may be invented to give
it one.

The intended scenario is therefore the simple one, and it is now documented in terms:
**Class D was the most serious original charge and the conviction.** Under Rule 8(B)(3)
that case is `FD`. The repair is to the token alone — the Class D offence, the
I.C. 35-38-9-3 statutory route and the distinct serial all stay.

## What must not change

- **The intentionally long boundary input stays**, labelled as width-stress coverage. It
  is not to be silently shortened, and it is not to be presented as a realistic docket
  number. Any realistic synthetic specimen prepared for counsel must remain
  distinguishable from it.
- **Generated PDFs and approval records are not edited.** The fixture source and the
  stale explanatory comments are what change; outputs are rebuilt from them.
- The misd `CM` pairing stays unscored on the same reasoning.

## What is owed

Tests covering **both** scenarios — the simple Class-D-at-filing case, and a documented
higher-charge case ending in a lesser conviction, which is the case the rules exist to
describe and which nothing in the corpus currently exercises.

The official sources are to be retrieved through the established acquisition process
(HTTPS, an approved official government host, jurisdiction and form number or official
title on every entry) and the rule text confirmed against what is retrieved. **The rule
statements above are as supplied and have not yet been read against a retrieved
document**; that confirmation is part of the work, not a formality.

Affected outputs rebuilt, actual digests recorded, and the raster and independent-review
evidence obtained. **This research is not a packet approval and grants nothing.**

---

## Superseded: how I framed it before the source was located

Preserved because the reasoning was acted on, and because the record should show what
changed and why rather than only the corrected conclusion.

I recorded that two boundary fixtures bound one token to two offence classes —
`45C01-0812-FB-…654321` beside "Class D felony" in d6, and `45C01-0812-FB-…123456` beside
"Class B felony" in felony — and wrote that *"that the pair is inconsistent needs no legal
input; which of the two is wrong does."*

The first half was the error. The pairing is not inconsistent: under Rule 1(B)(4)(a)(iii)
and the QCSR Instructions, two cases can carry `FB` and end in different conviction
classes, and both are correctly recorded.

I offered four options and recommended obtaining the table with removal of the token as an
interim. **Removal would have been wrong** — it would have deleted correct information
from a specimen to satisfy a rule that does not exist.

What the lanes did remains right: FIX04 declined to move the token without a published
table and said so; VF36 withdrew its own earlier pass rather than let a discharged
collision read as a discharged finding. Neither invented a convention. The mechanism
worked; my reading of what it had produced did not.
