# E3 import plan — gated, not yet executed

Recorded so the sequence survives a context loss. **Nothing in this file has been
executed.** The work below starts only when final E3 returns.

## Status

| Input | State |
| --- | --- |
| Eight E2 evidence lanes | Landed on the captain line at `abbc48a1` (912 entries, 363 jobs) |
| Terminal C source-support audit | **Accepted input.** `claude/rcap-e2-source-support-audit` @ `ca16791b` |
| Final E3 | **Not returned.** `claude/rcap-e3-crosswalk-finalizer` @ `6e735902` adjudicates E2-C only, on a base predating the eight landed lanes |

The audit branch is **not merged wholesale**. It is an accepted input to Terminal
E, imported path-by-path under the sequence below.

## The gated sequence

Run in order, only after final E3 returns:

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

**Open decision for step 4, do not settle it silently.** The audit reports
**30.5% non-verbatim over 912**. Adding nine verbatim matches to the intake
verifier's current 609/903 would give ~32.2%, not 30.5% — the audit locates a
smallest supporting span and verifies citation cores, which is a more careful
classifier than the intake check's normalized-substring test. The two will not
agree merely by fixing the denominator. Preferred resolution: have the intake
verifier consume the audit artifact's classification when it is present rather
than run a second, weaker classifier alongside it. Decide at execution time; do
not hardcode 30.5%.

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
