# E3 import plan — EXECUTED

Final E3 returned at `c85d0c38` and this sequence has been carried out. Kept as
the record of what was imported, what was refused, and the decisions taken along
the way. The open question flagged below was resolved; how, is recorded.

## Status

| Input | State |
| --- | --- |
| Eight E2 evidence lanes | Landed on the captain line at `abbc48a1` (912 entries, 363 jobs) |
| Terminal C source-support audit | **Accepted input.** `claude/rcap-e2-source-support-audit` @ `ca16791b` |
| Final E3 | **Returned and imported.** `claude/rcap-e3-final` @ `c85d0c38`, parent `934410ba`, base `abbc48a1` — linear, verified against the remote tip |

The audit branch is **not merged wholesale**. It is an accepted input to Terminal
E, imported path-by-path under the sequence below.

## The sequence, as executed

1. Import accepted crosswalk-owned and evidence-audit paths.
2. Recreate the `package.json` wiring by hand.
3. Recreate the disposition-register entry by hand.
4. Correct the shared E2 intake verifier to cover all **912** citations.
5. Ensure the nine `path@commit` citations are resolved, counted, and
   mutation-tested.
6. Regenerate shared artifacts once.
7. Run the full chain.

Steps 2, 3 and 6 are hand-recreated rather than merged because they are shared
writers; taking them wholesale is how two lanes silently overwrite each other.

## Why 903 was incomplete

Measured against the landed corpus: **912 evidence entries, and all 912 carry a
quote.** Nine of them pin their source as `path@<commit>` — the stronger form,
naming the bytes actually read.

`scripts/verify-rcap-e2-evidence-intake.mjs` resolves those nine at the ref and
counts them, but then `continue`s past the quote-fidelity block, because the
pinned blob is not the working-tree file. That drops exactly nine from the
denominator: 912 − 9 = **903**. The fix for step 4 is to measure the pinned nine
against the blob at their ref (`git show <ref>:<path>`) instead of skipping them,
so the denominator is the whole corpus.

**Open decision — RESOLVED.** The concern was that fixing the denominator alone
would not reconcile the two numbers: the audit reported 30.5% non-verbatim over
912, while adding nine verbatim matches to intake's 609/903 gives ~32.2%. The
audit locates a smallest supporting span and verifies citation cores; intake ran
a normalized-substring test. Two classifiers, one corpus, two rates.

Resolved by not letting the weaker number circulate. Intake measures the full
corpus, cross-checks its denominator against the audit and fails hard on
disagreement, then prints the audit's rate as authoritative and labels its own
count a coarse cross-check. Nothing was hardcoded; both figures are recomputed
from committed bytes on every run.

## What the rate means

**30.5% non-verbatim is a reread-priority measure, not a mapping-failure rate.**
A quote classified non-verbatim is a paraphrase or a conclusion standing where
source text should be. The finding may be perfectly correct. What it cannot do is
carry its own proof, so the cited source has to be reread before the row is
adjudicated. Reporting it as a failure rate would both overstate the damage and
push lanes toward padding quotes instead of reading sources.

## Two high-severity rows, independently confirmed

Both verified against the tree directly, not taken on the audit's word. Both sit
in lane E2-A2.

**`E2-A-NH-nh_conviction_streamlined` — false absence.** The lane grepped
case-sensitively for `NHJB-3057`, got zero hits, and concluded the streamlined
route and its forms are absent from the NH compiled profile. `nhjb-3057-dse`
appears **six times** in lowercase. The route half of the claim survives —
`streamlined` is genuinely absent even case-insensitively — but the forms half is
falsified. Treat the absence claim as withdrawn pending readjudication.

**`E2-A-MI-mi_setaside_application` — pointer cites the wrong file.**
`mi_setaside_trafficking` is absent from the cited MI compiled profile, but it
does exist in `data/rcap-ledger/track-pathway-crosswalk.json`,
`authority-ledger.json` and `registry-crosswalk-projection.json`. The track is
real; the citation points at a file that does not carry it. E3 should re-point
this citation, **not** drop the track.

The general lesson for the intake check: it verifies that a source *resolves*,
which is a weaker claim than that it *supports*. An `absence_proof` in particular
has no quote to match and so passes intake unexamined — exactly the shape of the
NH defect. Closing that gap belongs with step 4.


## How it was resolved

**Corpus.** E-SPECIAL turned out to be a ninth evidence package, 23 citations
across six subjects, absent from the 912-row audit (which covered exactly the
eight lanes: 156+114+97+153+157+162+59+14). The corrected corpus is **935**.
Both the audit and the intake check now enumerate lanes plus E-SPECIAL from one
shared helper, and a silently omitted package is a mutation-tested failure.

**Two classifiers, one number.** Rather than let the intake check publish a
second, weaker rate beside the audit's, intake now cross-checks its denominator
against the audit and *fails* on disagreement, then prints the audit's rate as
the authoritative one and labels its own substring count as a coarse
cross-check. A disagreement can no longer hide; nor can two numbers circulate
for the same thing.

**Reproducibility.** The audit as imported passed only at `ca16791b` and failed
at the integration tip — the thing the instruction forbade. Taken by
regeneration against the final integrated tree, not by pinning. It and all eight
of its mutations now pass from the integration tip.

**Hashes.** `contentHash` covers the crosswalk object alone and is a *semantic
relationship hash* — the generator reads no evidence file at all. A separate
`evidenceHash` now pins the eleven evidence files (nine packages, the
adjudication input, the audit). `contentHash` is unchanged at `964a9ac4…`
because `evidenceHash` is excluded from its preimage.

**Queue.** The 363-job queue is superseded and kept, not regenerated:
nine evidence packages are keyed to its jobIds, and regenerating would
re-partition them and break intake coverage for finished work. Its check now
proves integrity rather than currency. The dispatch assignment's pin was moved
from whole-file bytes to the job set, so queue metadata cannot invalidate a
partition the landed evidence depends on — the partition was proven identical
before and after.
