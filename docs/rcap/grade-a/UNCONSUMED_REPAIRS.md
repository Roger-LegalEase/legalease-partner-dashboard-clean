# Twenty-two of the thirty-six failing families carry a repair nobody has read

**Measured 2026-09-09** at `d4984cbc5`, by asking git a narrow question for each
`FAIL_REPAIR_REQUIRED` family: did its **fixtures** or its **build script**
change between the commit its selected independent verdict names as
`verifiedAtBase` and HEAD?

The first cut of this measurement asked whether anything under the family's
directory had changed and answered "all 36", which is useless: the generator
rewrites `product-wiring.json` inside every family directory on every run, and a
regenerated derived record is not a repair. Narrowing to the two things a reader
would actually be reading is what makes the answer mean something.

## The split

**Fourteen** families are unchanged since the verdict that failed them. Their
failure stands and a repair is genuinely owed:

> al-felony-dwop-set · al-felony-nonconviction-90-set · fl-early-juvenile-set ·
> il-cannabis-vacate-set · il-exp-nonconv-set · il-seal-edu-set · and the eight
> the sweep lists alongside them

**Six** have had their delivered bytes repaired since the verdict. These owe an
independent re-read and nothing else — no build, no source acquisition, no legal
input:

| family | verdict base | what moved |
|---|---|---|
| ar-drug-court-set | 5de917b35 | 1 fixture commit, 2 script |
| ca-17b-reduction-set | 46360ba12 | 1 fixture commit, 1 script |
| co_petition_seal_arrest-set | 553966eaa | 1 fixture commit, 1 script |
| composed-treatment:…:WV:sex-trafficking-victim-vacatur-and-expungement | 03ff12bf9 | 1 fixture commit, 2 script |
| il-seal-2yr-set | fbd22ae2c | 1 fixture commit, 1 script |
| il-seal-3yr-set | fbd22ae2c | 1 fixture commit, 1 script |

**Sixteen** have a repaired build script and **unmoved fixtures**. That is a
different thing and it must not be confused with the six: the repair exists in
code and not in the delivered bytes, so a reader sent at them would read exactly
what already failed and fail it again. They owe a rebuild first, then a read:

> al-diversion-set · al-misd-conviction-set · al-misd-dwop-set ·
> al-pardoned-felony-set · ar-felony-seal-set · ar-pardon-seal-set ·
> az_marijuana_expungement_arrest_no_charges-set · co_motion_seal_conviction-set ·
> co_motion_seal_nonconviction-set · fl-10yr-bridge-set · il-exp-pardon-set ·
> il-exp-precompletion-set · il-exp-qualprob-set · il-seal-nonconv-set ·
> in_infraction_nondisclosure-set · nj_disorderly_persons-set

A caution on that sixteen: "the script moved" is not "the output would move".
Some of those commits are fleet-wide — `64f2dbb8e` re-hashed bytes before
calling them proven across many builders — and would change no output at all.
The decisive test is a rebuild compared against the committed bytes, which is
what `scripts/grade-a-packet-factory-24h/measure-build-reproducibility.mjs`
does. Its committed record
(`data/rcap-grade-a/fable-packet-factory/BUILD_REPRODUCIBILITY.json`) already
answers it for three of the twenty-two and for nobody else: that sweep ran on
2026-09-02, is marked `complete: false`, and deliberately swept only the 87
PROVEN families, so it excludes almost every family here by construction.

**Do not run that tool per family to fill the gap.** It writes its record on
every invocation, so a loop of twenty-two single-family runs replaces an 87-row
measurement with a 1-row one. That happened here and was restored from HEAD
before anything was committed. Run it once over the set, or run it in a
throwaway worktree.

## Why this is the cheapest queue left

The 73 `SOURCE_READY` families need sources, builds, rasters, reads and
acceptance, and only 25 can be built in this container at all. These six need a
reader. The sixteen need a rebuild and a reader. Nothing in either group is
waiting on Roger, on counsel, or on bytes nobody holds.
