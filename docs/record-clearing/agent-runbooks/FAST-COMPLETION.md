# Fast Completion runbook

Stable rules for every RCAP factory session. A prompt should reference this
file and add only the baseline commit, the job IDs, the shard capacities, and
anything genuinely specific to the states in front of it.

## 1. Fetch before you conclude anything

A missing ref is not a missing branch. Nine assignments in one wave were
commissioned a second time because the integration checkout was a single-branch
clone: `git branch -r` listed no `rcap-factory/*` at all, and "no branch" was
indistinguishable from "no fetch".

Before any branch-existence test:

```
git fetch origin --prune \
  '+refs/heads/feat/record-clearing-production-integration:refs/remotes/origin/feat/record-clearing-production-integration' \
  '+refs/heads/rcap-factory/*:refs/remotes/origin/rcap-factory/*'
```

Never rely on a single-branch clone, its inherited refspec, `git branch -r`
before the wildcard fetch, or the production-integration ref alone.

## 2. Source environment

Three external inputs, none of them in the repository, none of them
reconstructable from it:

| Variable | What it points at |
| --- | --- |
| `RCAP_SOURCE_MATERIALIZATION_ROOT` | the sealed read-only materialization root whose `official-pdf/<JUR>/…` tree the receipts pin |
| `RCAP_AUTHORITY_ARCHIVE_PATH` | the adopted Master Library edition archive |
| `RCAP_MASTER_LIBRARY_PATH` | override when the edition is not at its recorded canonical path |

The repository's own source corpus is never a fallback for any of them. If an
archive is absent, say so and stop reading it; do not reconstruct it, and do
not describe a suite as green while it is missing.

## 3. Discover completions before commissioning work

```
npm run rcap:captain:discover-completions -- --json
npm run rcap:captain:plan-integrations
```

Discovery fetches the wildcard first, then verifies each candidate against the
assignment rather than against its name: pinned subject, exactly one parent
inside the integration branch's history, only owned paths, no binary, the
promised outputs present, and a branch key that matches a fingerprint the job
has actually held. It reports one of:

`integrated_completion`, `exact_completion`, `valid_pre_claim_branch`,
`valid_legacy_branch`, `partial_branch`, `incompatible_branch`, `no_branch`.

A completion under a legacy or pre-claim key is still a completion. Branches
are read, never renamed to look tidier.

## 4. Assignment validation

An assignment is what the job manifest says, not what a branch name suggests.
Before accepting a branch: confirm the remote branch and SHA, the frozen
semantic assignment, the pinned subject, the parent, that only owned paths
changed, and that the expected outputs exist. Run the current post-commit
worker verifier once. Do not re-run the worker's research and do not repeat
validation the signed completion record already covers.

## 5. Worker path ownership

A worker owns `ownedPaths` and nothing else. Shared generated registries,
manifests, queues, claims and proofs are integration-owned and are listed in
`forbiddenPaths`. Two jobs never own one path: a reissued assignment keeps the
same job id and the same module rather than spawning a second job for the same
files.

## 6. Runtime prohibitions

Nothing in a build pass may set `packet_ready`, enable a jurisdiction, move a
launch gate, record counsel adoption, enable production, promote, migrate or
deploy. Every pass ends with `packet_ready = 0`, `enabled jurisdictions = 0`,
launch gate red, unless a separate authorization says otherwise.

## 7. Integration

Carry the exact worker blob:

```
git checkout <workerCommit> -- <ownedPath>…
```

not a cherry-pick. The captain is moving a payload onto a branch whose other
files have moved on; what must survive intact is the blob. Then one atomic
captain commit naming the worker branch and worker commit.

Never rewrite, rebase, amend, rename, delete or force-push a worker branch.
Never `git add .`, `git add -A` or `git add --all`. Stage explicitly.

Where a patch is already integrated, verify it and record it as already
integrated. Where a branch is incompatible, hold that branch only and continue
the rest of the wave.

## 8. Proof ownership

Packet proofs, review manifests, official-PDF proofs and output-review jobs are
integration-owned and are generated from the committed regression verifier's
own output. A worker may not author them. Every proof states, explicitly:
technical evidence complete; formal visual review pending; completed-output
legal review pending; `counselAdopted` false; `packetReady` false;
`productionEnabled` false; runtime disabled.

## 9. Review ownership

Technical evidence is not review. Page-by-page visual review and
completed-output legal review are separate work with separate owners, and
counsel — not a session — is the adopter. A session may prepare a
counsel-ready recommendation (adopt, correct, hold). It may not mark a review
complete, record adoption, or mark a packet ready.

## 10. Validation policy

Do not run the full suite after every independent integration.

- **Per worker:** one worker-completion verification, one focused verifier
  after integration, one owned-path check.
- **Per shared factory change:** focused factory regressions and the applicable
  typecheck.
- **Final captain gate, once:** full factory suite, legal-design intake,
  capability registry, source materialization contract, source-contract
  reconciliation, official-PDF queue and projection, custom-pleading planning,
  guidance planning, packet-proof reconciliation, review-manifest
  reconciliation, output-review planning, claims and owned paths, integrated
  production plan, typecheck, applicable lint, `git diff --check`, private-path
  check, binary-diff check, and two complete deterministic generations that
  must be byte-identical.

Do not add "verify the verification" loops. Do not weaken a verifier: a pinned
count may be advanced with a comment saying what moved it, but an assertion may
not be deleted or narrowed to pass.

## 11. Final report format

Lead with the result. Report only: starting and ending SHA; branches integrated
or already integrated; implementation evidence; downstream consequences; new
automation; factory counts; frozen shards; remaining external blockers; runtime
invariants; git synchronization. Detailed fixture inventories belong in the
committed proofs and manifests, not in chat. Keep it short.
