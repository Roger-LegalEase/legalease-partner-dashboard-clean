# CB02V-NY2 independent verification report

## Verdict

`CANDIDATE_BLOCKED_MISSING_EVIDENCE`

This is a completed blocked verification, not an acceptance. It makes the
candidate neither canonical nor commercial, records no raster pass or
independent Grade-A verification, and grants no `PASS_COMPLETE` status.

## Checkout finding

The checkout is local Codex Cloud branch `work` at
`e6fb360f41f621abcc904419e8f750afa404a84e`. That local branch name is normal
under the cloud execution contract, but the checkout does not contain object
`34ca308af92db091f0e702aff43f7b69de47652a`, the committed CB02 binary manifest,
or the candidate directory. The wave record itself warns that candidate bytes
had not been seen at its snapshot and says not to fabricate CB02 paths.

Missing mandatory evidence:

- `data/rcap-grade-a/codex-5h/cb02-custom-pleadings/binary-artifact-manifest.json`
- `data/rcap-grade-a/codex-5h/cb02-custom-pleadings/cb02-ny-160-55-legacy-2/`

Because `candidate-spec.json` is among the missing evidence, the exact
controlling decision and its cited route, branch, and product-contract records
cannot be identified. The verifier therefore did not substitute or infer legal
authority.

## Legal and packet review

The machine-readable obligation ledger in `verification.json` records one PASS:
`commercial-authority-false`. Every candidate-content, legal, field-safety,
packet-component, special-focus, and binary obligation is FAIL because the
evidence under test is absent. Each FAIL names the smallest repair: provide the
assigned committed branch content. No candidate repair is proposed or made.

This evidentiary failure prevents verification of the cohort, filing actor,
destination, trigger, deadline, notice, theory, allegations, attachments,
service, fees, components, self-help stops, protected fields, later-completed
fields, title, historical failure allegation, local confirmation stops, and
successor-court stops.

## Binary check

The required two clean-directory generator runs were not possible: the
generator, canonical input, boundary input, and binary manifest do not exist in
this checkout. Accordingly:

- two-run byte determinism: **FAIL**;
- intended paths: **FAIL**;
- SHA-256 values: **FAIL**;
- byte lengths: **FAIL**;
- page counts: **FAIL**;
- nonvisual nine-counter report: **FAIL**.

No generated PDF was written into Git.

## Required return

```text
ASSIGNMENT: CB02V-NY2
BASE SHA: e6fb360f41f621abcc904419e8f750afa404a84e
COMMIT: recorded by the enclosing Git commit
CANDIDATE: cb02-ny-160-55-legacy-2
VERDICT: CANDIDATE_BLOCKED_MISSING_EVIDENCE
LEGAL OBLIGATIONS PASS: 1
LEGAL OBLIGATIONS FAIL: 32
PACKET COMPONENTS PASS: 0
PROTECTED-FIELD CHECK: FAIL
TWO-RUN DETERMINISM: FAIL
EXPECTED HASHES MATCH: FAIL
NONVISUAL COUNTERS ZERO: FAIL
PDF FILES COMMITTED: 0
CANDIDATE FILES MODIFIED: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
DIFF LEFT FOR CODEX UI: YES
```
