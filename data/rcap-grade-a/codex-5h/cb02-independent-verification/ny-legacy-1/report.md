# CB02V-NY1 independent verification report

## Verdict

`CANDIDATE_BLOCKED_MISSING_EVIDENCE`

The checkout is at `e6fb360f41f621abcc904419e8f750afa404a84e` on the Codex Cloud local branch
`work`. The required minimum ancestor `34ca308af92db091f0e702aff43f7b69de47652a`
is not present in this shallow checkout, so ancestry cannot be established.

The wave record exists at
`data/rcap-grade-a/launch-control/next-waves/CB02_CANDIDATE_VERIFICATION_WAVE.json`,
but the evidence under test does not. Both of these required paths are absent:

- `data/rcap-grade-a/codex-5h/cb02-custom-pleadings/binary-artifact-manifest.json`
- `data/rcap-grade-a/codex-5h/cb02-custom-pleadings/cb02-ny-160-55-legacy-1/`

This agrees with the committed wave record's warning that the candidate bytes had
not been seen and must not be inferred or fabricated. The verifier therefore did
not invent a candidate specification, controlling-decision binding, generator
command, input, PDF, hash, page count, or legal conclusion.

## Obligation results

`commercialAuthority=false` is **PASS**: this report creates no Grade-A
fulfillment record and opens no commercial route. Every other assigned legal,
packet, protected-field, generator, deterministic-binary, manifest, and
nonvisual-counter obligation is **FAIL (missing evidence)**. The itemized scope,
repository citations, and smallest repair are recorded in `verification.json`.

In particular, no conclusion is possible concerning the pre-September 1, 1980
cohort, CPL § 160.55(3), the terminating court, district-attorney notice, or
separation from the September 1980 through October 1991 branch. Doing otherwise
would invent legal input prohibited by the assignment.

## Binary check

The required two clean-directory generator runs were not possible because the
committed generator, canonical and boundary inputs, and binary manifest are
absent. No PDFs were generated or committed.

## Smallest repair required

Publish or select a checkout containing required ancestor
`34ca308af92db091f0e702aff43f7b69de47652a` and the complete committed
`cb02-custom-pleadings` candidate tree, then rerun CB02V-NY1. The candidate must
not be edited merely to clear this evidence-availability block.
