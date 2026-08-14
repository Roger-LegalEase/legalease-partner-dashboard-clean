# RCAP acceptance — freeze c5aa7512, worker sha256:905ed76e

Generated from the acceptance run itself. Nothing here is a plan; every line is
an observed result.

## Freeze

| | |
| --- | --- |
| Final application SHA | `c5aa751296d8de2ed70bbb87294e27c88efce714` |
| Required GitHub checks on that SHA | RCAP All50 Handoff Verification — success; Expungement.ai Consumer Adapter Verification — success |
| Worker image | `ghcr.io/roger-legalease/rcap-render-worker@sha256:905ed76e85f9ff44430b99cd638bed9f349df847a901de22dcbcca26d41990d8` |
| Worker tag | the full SHA only; `mutableLatestTagCreated: false` |
| Dockerfile sha256 | `6079456600e00d9929f9d899b6e5c1be6919bbe844e44f2aba456f5036b9daa7` |
| Lockfile sha256 | `fc0208973470f108d82dc3defa99647fe1ee01c43a7bea5302487368ae36aae7` |
| Publication run | 31709404015 |
| Package visibility | private |
| Supersedes | historical F1 digest `sha256:337083a2…`, built from different source inputs |

## RCAP-SEC-001

Closed. The finding described the deployable state as 49+50+51 and named a
fixture that exits non-zero. Neither is true of current bytes. All four gate
cases re-run against 49 → 50 → 51 → 52 on a real cluster and pass: G1
(self-declared payment), G1b (inserting an already-paid item), G11 (one paid item
authorizing a second matter) and G12 (spending another participant's payment,
enforced in the database). 132 database-backed checks across phases 51–54 and
32/32 mutations. The residual environmental concern is recorded as a deployment
precondition: no environment may serve a participant on 49+50+51 alone.

## Acceptance run 31710245816 — every step success

| Step | Result |
| --- | --- |
| Refuse any input that is not the authorized pinned value | success — the new freeze and digest are the authorized pins |
| Verify ancestry and image-input equivalence of every pinned SHA | success |
| Authenticate to GHCR and pull the worker by immutable digest | success — pulled by digest, never by tag |
| Start the disposable stack (Postgres, Auth, PostgREST, Storage, Kong, Mailpit) | success |
| Apply migrations 49, 50, 51, 52, 53, 54 and run the stack-integration matrix | success |
| Deep behavioural matrix | success |
| Collect sanitized evidence | success |
| Destroy the disposable stack | success |

The behavioural matrix run on the stack: phase-52 consumer payment authority,
phase-53 consumer job binding, phase-51 consumer payment security, the
consumer-payment HTTP journey, the consumer person namespace, packet delivery
DB, render-worker delivery, and packet delivery end to end.

Feature-flag sequence exercised in-run: disabled during deployment and
migrations, `staging_scoped` for the named synthetic scopes, disabled again for
the rollback proof, then `staging_scoped` for the final rerun.

## What this run is not

The stack is runner-local and destroyed at the end of the job. It served
`127.0.0.1`, so it produced no phone-reachable URL and no persistent
environment. Mobile acceptance and dark production deployment both need a hosted
target that outlives a job.

