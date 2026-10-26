# GA-43 rehearsal — binding the candidate worker digest after Roger's P1 dispatch

Status: PREPARED, NOT RUN. No step below has been executed; no digest, run id or receipt in this
file is real. `$PUBLICATION_RUN_ID`, `$ACCEPTANCE_RUN_ID` and `$WORKER_DIGEST` are placeholders that
only a real GitHub Actions run can fill. The importer refuses placeholders and derives every value
from the run itself.

## What is bound, by whom
| step | actor | what changes | authority |
|---|---|---|---|
| P1 dispatch | Roger | `publish-rcap-render-worker.yml` with `integration_sha=<exact PR #268 head>` and `candidate_pull_request=pull/268` (branch acceptance/p1-candidate-gate, 9058ec38e) | Roger's decision |
| A import publication | Acceptance | `data/rcap-render/worker-publication-evidence.json` + `hosted-acceptance-evidence/worker/publication-$PUBLICATION_RUN_ID/*`, marked `rehearsalOnly: true` | released by the lead after P1 |
| B image acceptance | Roger/lead dispatch; Acceptance imports | `rcap-worker-image-acceptance.yml` on the branch carrying step A (it reads the committed evidence); then `imageAcceptance`, `runtimeAccepted: true` | P2 |
| C registry | Acceptance (generator) | `fulfillment-authority-registry.json`, `fulfillment-observation-snapshot.json`, `fulfillment-authority-projection.json`: MS non-conviction `provider.imageDigest` ← `$WORKER_DIGEST` | P3, lead's pin chain |
| D checks, E tests | Acceptance | nothing | — |

## Why the MS record's provider.imageDigest is empty today
`generate-rcap-grade-a-fulfillment-authority.mjs` sets `provider.imageDigest` only when
`worker.workflowConclusion === "success" && !publicationPlan.rebuildRequired`. The accepted
publication is b0b721470 (digest a32bbe9a…); the current source differs on canonical worker inputs, so
`rebuildRequired` is true and the MS non-conviction record (`grade-a-ms-nonconv-paid-consumer-successor-20260920`)
carries `""`. `governPacketDownloadAdmission` then refuses the owner's download with
`commercial_admission_denied`. That is the DB-contract owner-200 failure. A publication whose
`sourceSha` equals the checkout's canonical inputs makes `rebuildRequired` false and fills the digest.

## Sequence (run from a checkout at the exact SHA that was published; values come from the run)
```sh
set -euo pipefail
test "$(git rev-parse HEAD)" = "$INTEGRATION_SHA"            # the SHA Roger dispatched; abort otherwise

# A. import the real publication; refuses without a numeric run id, refuses a candidate without --rehearsal-only
node scripts/acceptance/import-candidate-publication.mjs --run-id "$PUBLICATION_RUN_ID" --rehearsal-only
WORKER_DIGEST="$(node -p "require('./data/rcap-render/worker-publication-evidence.json').immutableRegistryDigest")"
node scripts/verify-rcap-worker-input-equivalence.mjs --base "$(node -p "require('./data/rcap-render/worker-publication-evidence.json').sourceSha")" --head "$(git rev-parse HEAD)" --label "candidate publication -> application"
git add data/rcap-render/worker-publication-evidence.json "hosted-acceptance-evidence/worker/publication-$PUBLICATION_RUN_ID"
git commit -m "Import rehearsal-only candidate publication $PUBLICATION_RUN_ID"   # lead pushes the acceptance branch

# B. after the read-only image acceptance run on that branch
node scripts/acceptance/import-candidate-publication.mjs --acceptance-run-id "$ACCEPTANCE_RUN_ID"
git add data/rcap-render/worker-publication-evidence.json "hosted-acceptance-evidence/worker/acceptance-$ACCEPTANCE_RUN_ID"
git commit -m "Import read-only image acceptance $ACCEPTANCE_RUN_ID"

# C. the responsible generator binds the digest; nothing is typed
node scripts/generate-rcap-grade-a-fulfillment-authority.mjs
node scripts/generate-rcap-grade-a-fulfillment-authority.mjs --check
node -e 'const r=require("./data/rcap-grade-a/fulfillment-authority-registry.json");const rows=Object.values(r).find(Array.isArray);const ms=rows.find(x=>x.recordId==="grade-a-ms-nonconv-paid-consumer-successor-20260920");if(ms.provider.imageDigest!==process.env.WORKER_DIGEST)throw new Error("MS non-conviction digest not bound: "+JSON.stringify(ms.provider.imageDigest))'
git add data/rcap-grade-a/fulfillment-authority-registry.json data/rcap-grade-a/fulfillment-observation-snapshot.json data/rcap-grade-a/fulfillment-authority-projection.json
git commit -m "Regenerate fulfillment authority against the rehearsal-only publication"

# D. checks that must pass before the rehearsal
node scripts/verify-rcap-grade-a-fulfillment-authority.mjs
node scripts/verify-rcap-grade-a-fulfillment-authority.mjs --mutations
node scripts/test-rcap-worker-digest-binding-mutations.mjs
node --test scripts/grade-a-launch-control/verify-pinned-worker-successor.test.mjs
```

## What the release verifiers say on this tree, and why that is correct
The pending record at the current head is `applicationSource: pinned-source-forward`
(FORWARD_BOUND_HOSTED_PENDING on b0b721470 / a32bbe9a…). That lifecycle pins the accepted evidence
file byte for byte (`verifyPinnedForwardBinding`: "accepted worker evidence remains immutable"), so
after step A `verifyPinnedPublication(root).current` is **false** with that reason and
`requireCurrentReleaseCandidate` throws. F1, hosted and production gates therefore refuse the
rehearsal tree, which is the intent. The `rehearsalOnly` rule (f9b6512b1) governs the
pinned-source shape; on the forward-bound shape the byte pin refuses first. Consequence: the
rehearsal branch is never merged into captain-release and never becomes the release candidate; the
rehearsal consumers (the generator in step C and the clinic-qa harness) read the evidence file
directly and do not consult the release verifiers.

## Tests that flip, and what each must report
| test | before binding | after binding |
|---|---|---|
| `scripts/rcap-packet-database-contract.test.mjs` → "actual owner handler returns 200 and precisely the finalized PDF bytes and hash" | 403 `commercial_admission_denied` (as at 3cf47c612, 2d6576395, 8de3f6dca) | 200, body bytes equal the finalized PDF, hash equal, one `transmission_completed` event |
| same test → "actual consumer grant handler binds the same Next lifetime and persists its completion receipt" | 404 (grant refused 403 upstream) | 200 with the completion receipt persisted |
| same test → stranger 404 / unverified owner 403 / anonymous 401 | pass | unchanged |
| `npm run clinic:acceptance` owner positive control (GA-43 generation + download) | NOT_RUN (no publication bound) | PASS in the isolated stack; receipt `artifactWorkerBinding` = {sourceSha, container digest `$WORKER_DIGEST`, renderer, input fingerprint, acceptance run id}; `job.container_digest` equals the digest |
| same harness: staff-owner-artifact-denied, wrong-participant-denied, wrong-program-denied, revoked-consent-staff-denied | NOT_RUN | FAIL-closed denials as specified; none become a download |
| `verifyPinnedPublication` / `requireCurrentReleaseCandidate` | current (forward-bound) | **not current** ("accepted worker evidence remains immutable"); the rehearsal never becomes the release candidate |

Isolated PASS is not Production PASS. The rehearsal runs only against the loopback stack of
GA43-ISOLATED-REHEARSAL.md; the worker is pulled by `@$WORKER_DIGEST`, never by tag.

## Importer proof (no fabricated run)
`import-candidate-publication.mjs --self-test-publication 37628990382` rebuilds the committed
publication from the live run and compares every run-derived field with the committed evidence;
`--self-test-acceptance 37630815977` does the same for the acceptance object. Both write only to a
temp directory. Results are in the acceptance evidence folder (digest-binding/self-test-*.log).

## Never
No typed digest, run id or receipt. No `latest` tag, no pull by tag. No merge of the rehearsal
evidence into captain-release or main. No Production or hosted Supabase. No edit to the generator or
the verifiers to obtain a pass.
