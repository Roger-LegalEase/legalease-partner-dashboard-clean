# Clinic acceptance

Run `npm run clinic:acceptance` from the application checkout with the existing
approved isolated QA environment. `fixture.mjs` requires explicit synthetic-only
authorization, exact loopback application/Auth targets, the existing synthetic
program and database binding, and separate authorization for its temporary
simulated allocation. Use the established private environment loader; never put
credentials in command arguments or evidence. No invitation is sent.

The command provisions temporary actors, uses ordinary sign-in for all measured
browser/API/RLS operations, records EN/ES copy and authorization evidence, and
verifies exact public/Auth and private-object baseline restoration in `finally`.
It must have exclusive use of that isolated database until cleanup completes.
`CLINIC_QA_OUTPUT` identifies the existing private evidence directory. When an
isolated runner checkout exercises the already-running application in another
worktree, set `CLINIC_QA_APPLICATION_ROOT` to that application's actual checkout;
the runner refuses differing application source bytes and records both commits.

Artifact acceptance uses only a packet created by the real owner generation
path. It follows the actual owner status response and protected provenance:
sponsored Clinic packets use the authenticated RCAP job endpoint and exact
partner namespace; DTC packets use their existing consumer grant endpoint.
Consumer-only grant cases are NOT_APPLICABLE only after the sponsored binding
is proved, with exact contract references retained. Wrong-job, ownership,
consent, session and stale-verification cases remain required for Clinic. It compares the actual protected PDF with finalized job/provenance hashes
and length, binds the finalized job container digest and renderer to the route’s
accepted publication/image-acceptance receipt, and independently recomputes
canonical worker-input equivalence against the actual application checkout.
Receipt-only application commits may follow the published source; identical
worker inputs are required, including uncommitted/untracked input checks.
The database-recorded worker digest is corroborating job provenance, not by
itself independent proof of a running container; deployment/runtime identity
still requires the existing independent acceptance evidence.
It tests ownership and role denials, and tests grant and verification
invalidation. After shared-device reset, the owner signs in afresh and proves a current
artifact handle before that same handle is denied in the old signed-out context. Grant tokens and storage locations stay in memory. Privileged
operations only provision/condition run-created fixture state, corroborate
provenance read-only, or clean up; measured downloads always use ordinary user
sessions. Existing funding, publication, source and consent gates remain intact.

If generation cannot produce that genuine artifact, each of the 22 artifact
cases per locale is `NOT_RUN`. Existing unavailable-link denials do not satisfy
artifact-access acceptance. Exit 2 and `PARTIAL` mean required acceptance remains;
exit 1 means a check, execution or cleanup failed. Independent review and the
approved CI transport binding remain separately required, so this runner does
not close GA-22 automatically or represent a local run as CI evidence.

For harness-only checks, run:

```sh
node --test scripts/clinic-qa/artifact-journey.test.mjs scripts/clinic-qa/fixture.test.mjs scripts/clinic-qa/generation-refusal.test.mjs scripts/clinic-qa/sponsored-cleanup.test.mjs
```

Those predicate/refusal tests never establish real authenticated artifact
acceptance. A missing publication or CI transport authorization must be resolved
through the existing exact-candidate process; this runner neither publishes a
worker nor exposes the database or fabricates a successful render job.

Real sponsored finalization increments the existing synthetic program counter.
Cleanup compensates only an exact, bounded included-credit delta corroborated
by new run-owned finalized jobs, temporary-allocation credits, provenance,
analytics and finalization audit receipts. Other fields and overage must remain
unchanged. Restoration uses a whole-row compare-and-swap in the teardown
transaction; any unrelated or unaccounted change refuses restoration. Until a
real artifact is generated, this compensation path remains NOT_RUN.
