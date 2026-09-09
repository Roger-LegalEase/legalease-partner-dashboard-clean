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

## The route-election counter can only see six families (2026-09-09, measured)

VF13 returned `FAIL_REPAIR_REQUIRED` on all five Illinois families with
`requiredOptionsMissing = 1` on three of them. The shared gate,
`scripts/rcap-packet-completeness/verify-packet-completeness.mjs`, returns
`PASS_COMPLETE` on every one of the five with all nine counters at zero. Both ran
in this container, against the same bytes, at the same commit. Measured:

| Question | Answer |
|---|---|
| Fields anywhere in the corpus declaring `decision: measured_route_selection` | **6** |
| Families containing one | **6** — five New Jersey, one Rhode Island |
| Fields carrying the refusal class `participant_sworn_narrative_or_legal_election` | **9,341** |
| Of those the route-election check examines | **0** |

`requiredOptionsMissing` is raised from exactly two places. One needs a blank the
blank classifier reaches; the other iterates `declaredElections`, built by
matching `String(f.decision).toLowerCase() === "measured_route_selection"`
(`verify-packet-completeness.mjs:490`). A field map that describes its legal
election any other way is not in that set, so no packet it produces can raise the
counter.

**The gate's coverage is set by the artifact it audits.** The comment above that
loop already records one round of this — a decision that was "not literally
refuse" counted as an election made, and the counter read zero on all six
families that declare one while three New Jersey families were failed by hand.
The fix named the one string that then existed. It did not make the check
independent of what the map chooses to call the field, so the same shape returned
one declaration further out.

Illinois is the instance. `12 - Seal Records` is declared
`participant_sworn_narrative_or_legal_election` with `routeDetermined: false`,
and the route registry gives `il-exp-nonconv` and `il-exp-qualprob` no sealing
authority at all — the answer is fixed by the route, not chosen by the
participant. So `routeDetermined: false` is itself the defect, and it is the
field the counter would have had to read to catch it.

### What this does and does not establish

It establishes that `requiredOptionsMissing = 0` is not evidence that a family's
route election is made — for 340 of 346 families the counter cannot fire at all.
Any admission resting on that counter alone rests on less than it appears to.

It does **not** establish that those families are wrong. Most of the 9,341
refused elections are genuinely the participant's to make, and a packet that
leaves them blank and says so is behaving correctly. Which refusals are
route-determined is a route-identity judgement per family; the map is exactly
the artifact under suspicion, so it cannot be the thing that answers.

### What must not be done about it

Not a sweeping tightening applied by the same hand that found it. Making the
check read every election refusal would newly fail families now recorded
`COMPLETE_PACKET_PROVEN`, and whether each is a real failure is the per-family
judgement above. It needs measuring against the route registry family by family,
and an independent reader — not the Captain's own edit at the end of a shift.

Recorded, unconsumed, owned by nobody yet.

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
