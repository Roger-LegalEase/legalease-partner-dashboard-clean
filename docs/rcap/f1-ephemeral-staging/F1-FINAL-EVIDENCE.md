# F1 ephemeral staging — final evidence

- Confirmatory run: **31593385551** (`rcap-f1-ephemeral-staging`, manual dispatch, ubuntu-latest)
- Started 2026-08-12T11:46:51Z, completed 2026-08-12T11:53:25Z (UTC)
- Application SHA: `df3d8607e8a0c723e23c346f1cd725c17a2c22b0`
- Worker source SHA: `5987870ca0d70ea4437d0711c430b9eda299a0ef`
- Immutable worker digest: `sha256:337083a25988b10a677813c3c8034461bfe18ffe1d2dd6a942a4d97235c3b64d`
- Evidence artifact: `rcap-f1-evidence-31593385551`, id 9140202905, 19 files, 10,510 bytes
- Environment: `rcap-ci-staging` — disposable, runner-local, destroyed by step 13. No hosted
  project, no persistent environment, no production surface.

## Job outcome, verified against the GitHub API in this session

All **13 steps success**, with no skips:

| # | Step | Result |
|---|---|---|
| 2 | Refuse any unauthorized pinned input | success |
| 4 | Ancestry + image-input equivalence of every pinned SHA | success |
| 5 | GHCR authenticate and pull worker **by immutable digest** | success |
| 8 | Start disposable Supabase stack (Postgres, Auth, PostgREST, Storage, Kong, Mailpit) | success |
| 9 | Six-migration sequence + stack-integration matrix | success |
| 10 | Deep behavioural matrix (repository battery) | success |
| 12 | Upload evidence bundle | success |
| 13 | Destroy disposable stack | success |

Step 10 is the phase-52 authority, phase-53 binding, phase-51 security, consumer-payment HTTP,
person-namespace, delivery-db, worker-delivery and mobile e2e battery. In runs 1-4 it never
executed; here it ran green.

## How the evidence contract was enforced

`finish()` writes the sanitized summary to the artifact and prints the identical object between
`F1_EVIDENCE_JSON_BEGIN` / `F1_EVIDENCE_JSON_END`, then spawns
`scripts/verify-f1-evidence-markers.mjs` against both and **exits non-zero if it fails**. The job
exited zero, so that verifier passed in-process on this run's own output, proving:

- the marked block parses as JSON;
- all 16 mandatory case ids are present, each with a pass/fail result;
- `baseline_schema_complete` = pass and asserted it ran before phase 49;
- totals **re-derived** from per-case results match the printed totals (a fabricated count fails);
- `skipped` = 0 and no case failed;
- all six migration hashes recomputed and equal to the recorded values;
- no JWT, Stripe secret, webhook secret, GitHub token or password-bearing connection string
  appears in the marked block.

Its self-test covers 12 negative cases: missing BEGIN marker, missing END marker, malformed JSON,
missing baseline case, failing baseline case, fabricated pass count, nonzero skipped, hash drift,
artifact/log disagreement, leaked service-role JWT, leaked connection string.

## baseline_schema_complete

Runs before phase 49; a red result stops the run before the first migration; it cannot skip.
Asserts `partner_records`, `rcap_persons`, `rcap_document_packets`, `consumer_briefcase_items`,
`partner_entitlement`; the eleven consumer ownership/payment columns the sequence reads; the
`partner_slug` unique boundary; the `auth.users` foreign key; `auth.uid()`; `pgcrypto`; and that
`packet_render_jobs` is absent — which is what makes "before phase 49" a fact rather than a claim.

Two corrections derived from the SQL rather than assumed:

- `currency`, `provider_event_id`, `payment_authority`, `payment_recorded_at` and
  `payment_recorded_by` are created **by phase 52**, and `consumer_briefcase_item_id` /
  `consumer_auth_user_id` **by phase 53**. Requiring them pre-49 would assert an object before its
  migration and could never pass, so the case does not.
- `partner_entitlement` is referenced **zero times** by all six migrations (it is phase-35). The
  disposable baseline carries it because real pre-49 staging does, not because 49-54 need it.

Mutation-proved on an ephemeral PostgreSQL 16 cluster: removing `consumer_briefcase_items`,
`rcap_document_packets`, `amount_cents` or `user_id` each turns the census red; all four restored
clean. Verified in the script's exact ordering, and on top of that ordering all six migrations
apply, the phase-52 `paid_requires_server_evidence` constraint is installed, and exactly one
`enqueue_packet_render_job` signature remains.

## Repair history, stated plainly

| Run | Result | First causal failure |
|---|---|---|
| 31590973261 | red | prerequisite loop ran before the base tables; phase-35's foreign key on `partner_records(partner_slug)` aborted, and the harness threw before recording a case (81s, 609-byte bundle) |
| 31592551645 | red | 16/16 cases green, then a TDZ crash in the epilogue: `finish()` was called above the `const` scrubber declarations |
| 31593385551 | **green** | — |

Both were harness defects. No product code, migration, package manifest, application SHA or worker
digest was changed to reach green.

## Scope of this lane's attestation

Verified directly in this session: the run id, all 13 step conclusions, the artifact identity and
size, and the pinned SHAs and digest echoed by the job. The artifact/log substance comparison and
the secret scan were executed **by the in-run verifier**, whose failure would have taken the job
red; this lane did not additionally page the raw marked JSON out of the log, because retrieving
that depth of log exceeded its retrieval budget. Anyone wanting the block itself can read
`f1-evidence-marked.log` in artifact 9140202905 or grep the step-9 log between the markers.
