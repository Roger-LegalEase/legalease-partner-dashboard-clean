# Gate B evidence completion

This issues no verdict and promotes nothing. Every family below still carries its correction_required record from batch-1, and only an independent reviewer can replace it.

NE DC-1-15 still binds `printedname` under a certificate-of-service heading and is due another artifact. A sidecar and a raster generated now would describe bytes about to be replaced, and stale evidence that reads as current is worse than none.

| family | sidecar | source SHA | pages carrying fields | pages rasterised | values inside their own box | protected geometry clean | open objections |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | --- |
| AK:tf-800-form-en | 24/24 | recomputed | 1, 2, 3 | 1, 2, 3 | yes | yes | ESC-GEOMETRY-NOT-AN-INPUT, ESC-SERVICE-BLOCK-BY-NAME, ESC-SIDECAR-NONCONFORMANT |
| AK:tf-805-form-en | 24/24 | recomputed | 1, 2 | 1, 2 | yes | yes | ESC-GEOMETRY-NOT-AN-INPUT, ESC-SERVICE-BLOCK-BY-NAME, ESC-SIDECAR-NONCONFORMANT |
| KY:aoc-334-form-en | 24/24 | recomputed | 1 | 1 | yes | yes | ESC-GEOMETRY-NOT-AN-INPUT, ESC-MANUAL-NOT-NEVER-WRITE, ESC-NO-SSN-RULE, ESC-SIDECAR-NONCONFORMANT |
| KY:aoc-496-3-form-en | 24/24 | recomputed | 1, 2, 3 | 1, 2, 3 | yes | yes | ESC-GEOMETRY-NOT-AN-INPUT, ESC-SIDECAR-NONCONFORMANT |
| NC:aoc-cr-287-form-en | 24/24 | recomputed | 1, 2 | 1, 2 | yes | yes | ESC-GEOMETRY-NOT-AN-INPUT, ESC-NO-REFUSE-WHEN, ESC-SIDECAR-NONCONFORMANT |
| NC:aoc-cr-288-form-en | 24/24 | recomputed | 1, 2 | 1, 2 | yes | yes | ESC-GEOMETRY-NOT-AN-INPUT, ESC-MANUAL-NOT-NEVER-WRITE, ESC-NO-REFUSE-WHEN, ESC-SIDECAR-NONCONFORMANT |
| NC:aoc-cr-298-form-en | 24/24 | recomputed | 1, 2 | 1, 2 | yes | yes | ESC-GEOMETRY-NOT-AN-INPUT, ESC-SERVICE-BLOCK-BY-NAME, ESC-SIDECAR-NONCONFORMANT |
| NC:aoc-cv-226-support-en | 24/24 | recomputed | 1, 2 | 1, 2 | yes | yes | ESC-GEOMETRY-NOT-AN-INPUT, ESC-NO-REFUSE-WHEN, ESC-SIDECAR-NONCONFORMANT |
| NE:cc-6-11-2-form-en | 24/24 | recomputed | 1 | 1 | yes | yes | ESC-CAPTION-VARIANTS, ESC-SIDECAR-NONCONFORMANT |
| NE:cc-6-11-form-en | 24/24 | recomputed | 1 | 1 | yes | yes | ESC-CAPTION-VARIANTS, ESC-SIDECAR-NONCONFORMANT |
| NE:cc-6-12-form-en | 24/24 | recomputed | 1, 2 | 1, 2 | yes | yes | ESC-CAPTION-VARIANTS, ESC-SIDECAR-NONCONFORMANT |
| NE:cc-6-15-1-form-en | 24/24 | recomputed | 1 | 1 | yes | yes | ESC-CAPTION-VARIANTS, ESC-SIDECAR-NONCONFORMANT |
| VA:cc-1201-form-en | 24/24 | recomputed | 1, 2, 3, 4 | 1, 2, 3, 4 | yes | yes | ESC-GEOMETRY-NOT-AN-INPUT, ESC-NO-REFUSE-WHEN, ESC-SIDECAR-NONCONFORMANT |
| VA:cc-1473-form-en | 24/24 | recomputed | 1, 2 | 1, 2 | yes | yes | ESC-GEOMETRY-NOT-AN-INPUT, ESC-NO-REFUSE-WHEN, ESC-SIDECAR-NONCONFORMANT |
| VT:600-00228-support-en | 24/24 | recomputed | 1, 2 | 1, 2 | yes | yes | ESC-VALUE-NOT-VISIBLE, ESC-SIDECAR-NONCONFORMANT |

## What a reviewer is being asked to check, and what changed

The previous package rendered page 1 and asked whether each expected value appeared somewhere in the document's text. Both independent reviewers returned defects that question cannot reach:

- **NC AOC-CR-288** carried the petitioner's name inside the judge's `FINDINGS OF FACT` block on page 2. The evidence rendered page 1.
- **KY AOC-334** drew the case number into the box captioned `Court` and the petitioner's name onto the rule captioned `Date`. Both were plainly visible and spelled exactly as expected, so a text check passed them.

So the package now shows every page that carries a field, and asks a geometric question instead of a textual one: is each value inside the rectangle its own map declared for it, and is any value inside a field or printed section the participant does not complete. `scripts/verify-rcap-evidence-contract-controls.mjs` reproduces all three defects from the artifact bytes committed at the reviewed commit and requires the contract to refuse each one.

Reviewers should note that the corpus was re-rendered against the corrected binder. Recompute each source SHA-256 from the official bytes before approving anything; the hashes below were recomputed here but that is this lane's claim, not the reviewer's finding.
