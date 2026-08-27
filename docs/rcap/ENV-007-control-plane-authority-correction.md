# ENV-007 — control-plane authority correction (C1–C7)

Read-only. Nothing here was executed: no hosted workflow run, no `workflow_dispatch`, no migration
applied, no deployment, no worker image built or published, no seeding, no Stripe call, no GitHub
Environment created, no repository or environment variable created, no tag created.

| | |
|---|---|
| Independent review disposition | `CORRECTION_REQUIRED` |
| Rejected candidate | `a22066423096882f1f202990519f1dcb0d96afca` (PR #130, `claude/rcap-acceptance-workflow-hardening`) |
| `origin/main` at the stop | `dd93579871962260b12918e54c44cf9bf1e81529` |
| Frozen audit authority | `claude/expai-flow-audit-p1` @ `00212d529e82a2a2a90b172b29268922feecfcbd` — not written |
| Safety branch | `safety/rcap-acceptance-infra-independent-review-a2206642` @ the rejected candidate |
| Diagnostic branch (evidence) | `claude/rcap-workflow-parser-isolation-a2206642` |
| Correction branch | `claude/rcap-acceptance-infra-corrections-syj0fy` |
| First-review head (rejected) | `6f13650e675862192ea0acbca5365f20abc5f083` |
| **Final candidate head** | **this commit** — the F1–F5 correction; `git log --oneline -1` on the branch names it |
| Second-review disposition | `CORRECTION_REQUIRED` (F1–F5), corrected here |

---

## 1. C4 — the workflow-validation error

The GitHub UI annotation for run `32679318369` could not be retrieved: the run has zero jobs, its
check suite has zero check runs, GraphQL is not served for this session, and the HTML surface that
renders the banner is refused by the session's repository-scoped API policy. Every route tried is
listed in `data/rcap-render/env007-workflow-parser-evidence.json`.

The error was therefore **derived locally and confirmed against GitHub's own parser**.

**Validator.** actionlint `v1.7.7`, installed with `go install` into a temporary GOPATH *outside*
the repository. Module zip hash `h1:0KgkoNTrYY7vmOCs9BW2AHxLvvpoY9nEUzgBHiPUr0k=`, binary SHA-256
`b242a990881fe6697a9ff63819939e587d43c8169ead78294297eb1a0dc3ae4c`. **No package or repository
dependency was added.**

**The error.**

```
.github/workflows/rcap-f1-ephemeral-staging.yml:135:639: parser did not reach end of input
after parsing the expression. 1 remaining token(s) in the input: ")"  [expression]
```

The hosted `phase:` map was a chained `&&` / `||` expression carrying **nine opening and ten closing
parentheses**, ending `|| 'preflight'`.

**First invalid commit.** Bisected commit by commit across the five PR commits, comparing each
version of the workflow in a scratch tree:

| commit | `(` | `)` | locally valid |
|---|---|---|---|
| `dd935798` (base) | 7 | 7 | yes |
| `360d341e` | 7 | 7 | yes |
| `6355d1ae` | 7 | 7 | yes |
| `b1412a02` | 7 | 7 | yes |
| **`fe250b98`** | **9** | **10** | **no** |
| `a2206642` (head) | 9 | 10 | no |

`fe250b98` added `hosted_environment_probe` and `hosted_payment_environment_probe` to the chain,
taking the opening parentheses from seven to nine while leaving ten closing parentheses.

**GitHub parser confirmation.** `rcap-f1-ephemeral-staging.yml` declares `workflow_dispatch` only, so
a push cannot legitimately start it: an instantaneous zero-job push-event run naming the file is
GitHub reporting a validation failure, and its absence is GitHub accepting the file. Across the
workflow's entire 73-run history the *only* push-event runs are the two at the rejected candidate.

| | rejected candidate `a2206642` | diagnostic `5ca3aad3` |
|---|---|---|
| zero-job push-event runs for the file | **2** (`32679318369`, `32681783697`) | **0** |
| `github-actions` check suites | 5, two of them `conclusion=failure` with `latest_check_runs_count=0` | **0** |
| GitHub processed the push | yes | yes — `vercel` and `claude` app check suites created at the push timestamp |
| hosted or protected jobs dispatched | 0 | **0** |

Three diagnostic commits were pushed, each carrying workflow files only: `8869b3d6` (the
one-character minimum fix alone), `ca2c1c54` (the three corrected workflows), `5ca3aad3` (the exact
final bytes). All three: zero invalid-workflow runs.

**Minimum correction:** delete the one unmatched closing parenthesis. **Shipped correction:** the
chained expression was replaced outright by the C5 exact mode map, which has no default and
therefore no `|| 'preflight'` tail — but only *after* the minimum fix had been proved against
GitHub's parser on its own commit.

**Environment secrets inside a reusable workflow: unchanged and still supported.** The job-level
`environment:` in the called workflow is what supplies `HOSTED_STRIPE_TEST_SECRET` and
`HOSTED_STRIPE_TEST_WEBHOOK_SECRET`, which are declared in no `workflow_call.secrets` block and
forwarded by no caller. Nothing about that architecture was altered: the validation error was a
parenthesis, not a secrets model. actionlint flags those two expressions because it cannot model
environment secrets; GitHub's parser accepts them, as the runs above show.

### Diagnostic-push safety (proved before the first diagnostic commit)

`DIAGNOSTIC_PUSH_SAFE`. Every workflow under `.github/workflows` was read. `create`, `release`,
`pull_request_target`, `workflow_run`, `repository_dispatch`, `issue_comment` and `schedule` appear
nowhere. Every workflow that can migrate, deploy, seed, publish a worker, call Stripe or declare an
acceptance environment is `workflow_dispatch`- or `workflow_call`-only. The single push-triggered
workflow matching `claude/**` is `rcap-source-acquisition-branch.yml`, path-filtered to four files
none of which any diagnostic commit touched; it holds `permissions: contents: read`, references no
secret and declares no environment.

---

## 2. C1 — control, application and worker are three authorities

### What was wrong

Each job ran a single `actions/checkout` and then

```
git checkout --detach "${{ inputs.tools_sha }}"
```

which **replaced the whole working tree** with a caller-supplied commit. Every orchestration script
after that line — the migration runner, its manifest module, the schema snapshots, the equivalence
and boundary gates, the evidence generators — executed from `tools_sha`, not from the reviewed
control plane. A caller naming the superseded `6d9e8792` runner would have been obeyed.

### The corrected layout

```
   $GITHUB_WORKSPACE
   ├── control/       ref: github.sha              THE ONLY TREE THAT EXECUTES
   │                  migration authorization · migration manifest · schema
   │                  snapshots · migration runner · evidence · boundary
   │                  verification · acceptance orchestration
   ├── application/   ref: inputs.application_sha  BUILT AND DEPLOYED, NEVER EXECUTED
   │                  npm ci && npm run build; vercel deploy --archive=tgz
   └── worker/        ref: inputs.worker_source_sha  COMPARED, NEVER EXECUTED
                      worker image inputs and worker-contract inputs
```

No `git checkout`, `reset` or `switch` line exists anywhere in the hosted workflow any more — the
regression suite asserts zero such executable lines. The three trees are separate directories, so
neither the application nor the worker checkout can overwrite `control/`.

### Every executable script and the tree it comes from

| job | step | tree | what runs |
|---|---|---|---|
| all three | *(3 × checkout)* | — | `control/` @ `github.sha`, `application/` @ `application_sha`, `worker/` @ `worker_source_sha` |
| all three | ancestry | `control` | `node scripts/rcap-worker-image-input-manifest.mjs --check` |
| all three | `control_authority` | `control` | `node scripts/rcap-verify-control-plane.mjs` |
| `readonly_probe` | — | `control` | `verify-rcap-vercel-failure-audit.mjs`, `rcap-hosted-acceptance-preflight.mjs`, `rcap-vercel-failure-audit.mjs` |
| `readonly_probe` | `stamp_payment_exercised` | `control` | `rcap-stamp-payment-exercised.mjs` |
| `hosted_write` | `preflight` | `control` | `rcap-hosted-acceptance-preflight.mjs` |
| `hosted_write` | `worker_authority` | `control` | `rcap-worker-authority-reconcile.mjs` |
| `hosted_write` | `audit_equivalence` | `control` | `rcap-audit-surface-equivalence.mjs` |
| `hosted_write` | `migrate_readback` | `control` | `rcap-hosted-acceptance-migrate.mjs` |
| `hosted_write` | `verify_checkout_pinning` | `control` | `verify-rcap-hosted-checkout-gate.mjs` (static) |
| `hosted_write` | `resolve_preview` | `control` | `rcap-hosted-resolve-preview.mjs` |
| `hosted_write` | `deploy_preview` | `control` | `rcap-hosted-acceptance-deploy.mjs`, publishing `application/` via `RCAP_APPLICATION_TREE` |
| `hosted_write` | `auth_identities` | `control` | `rcap-hosted-acceptance-auth-config.mjs` |
| `hosted_write` | **`matrix_build`** | **`application`** | `npm ci && npm run build` |
| `hosted_write` | `gate_deps` | `control` | `npm ci` (so orchestration scripts resolve `typescript`) |
| `hosted_write` | `worker_contract` | `control` | `rcap-worker-contract-contradiction.mjs` |
| `hosted_write` | **`golden_journey`** | `control` | `rcap-hosted-acceptance-matrix.mjs` — **new, C3** |
| `hosted_write` | **`verify_harness`** | `control` | 10 harness verifiers — **new, C3** |
| `hosted_write` | `galleries` | `control` | `rcap-hosted-acceptance-gallery.mjs` |
| `hosted_write` | verdicts | `control` | `verify-rcap-hosted-acceptance-verdicts.mjs` |
| `hosted_write` | `stamp_payment_exercised` | `control` | `rcap-stamp-payment-exercised.mjs` |
| `payment_probe` | *(all steps)* | **no tree at all** | shell only — no checkout, no script, no action but the artifact upload |
| `hosted_payment` | as `hosted_write`, plus | `control` | `checkout_gate`, `payment_journey` (the only transacting scripts) |

`deploy_preview` is the one place the split is load-bearing: the script runs from `control/` and
writes its evidence there, while `vercel deploy --archive=tgz` is spawned with
`cwd: RCAP_APPLICATION_TREE`. One tree orchestrates; a different tree is published.

### `tools_sha`

Redefined from an executable authority to a **provenance label**. It is never a checkout ref in any
workflow. `evaluateToolsShaLabel` accepts it only when it equals the control commit and refuses
everything else, `6d9e8792…` included; the F1 ephemeral rehearsal asserts
`inputs.tools_sha == github.sha` in place of its old detach. The last remaining
`git checkout --detach "$REQUESTED_TOOLS_SHA"` lives in `rcap-github-hosted-acceptance.yml`, whose
**first step now exits 1 unconditionally** with `GITHUB_ACCEPTANCE_RETIRED`, so no later step is
reachable. That workflow had no caller before and has none now.

### The gate, before any database credential or network-capable write

`control/scripts/rcap-verify-control-plane.mjs` runs at step 9 of `hosted_write`, ahead of the
credential preflight (11) and the migration runner (14). It proves:

1. it is itself executing from the control tree (otherwise `CONTROL_PLANE_AUTHORITY_INVALID`);
2. the control commit equals `RCAP_AUTHORIZED_INFRASTRUCTURE_SHA`;
3. `control/` carries `scripts/lib/rcap-migration-manifest.mjs`,
   `scripts/lib/rcap-acceptance-schema-snapshot.mjs`, `scripts/rcap-hosted-acceptance-migrate.mjs`
   and `data/rcap-acceptance-migration-manifest.json`;
4. the manifest hash is exactly
   `01a7e8488df436b9366b381f0ba3cb12cdb17c93725603c044b9a8194fb9b4e4`;
5. all **seven** migration SHA-256 values recompute from the control tree's own SQL bytes;
6. the runner imports `./lib/rcap-migration-manifest.mjs` by relative path, so it cannot be handed a
   manifest from another tree;
7. `tools_sha` names the control plane and nothing else.

**No migration SQL was altered.** All seven blobs are byte-identical to `dd935798`.

---

## 3. Worker image-input manifest

Whole-directory equivalence is gone. `data/rcap-render/worker-image-input-manifest.json` is now the
authority: **1,155 files** at the pinned worker source, each with its exact repository-relative path,
its SHA-256, its byte length and the Dockerfile instruction that pulls it into the context, ordered
byte-wise on the path, aggregate `d623034888ffd9dcba6c966453e434a37e03748890877cf4d9b13a9db2edae55`.

The set is **derived from `deploy/rcap-render-worker/Dockerfile`**, not asserted: every COPY that
reads the context contributes its paths; `COPY --from=deps` does not, because `node_modules` is
produced inside the image from `package.json` + `package-lock.json`, both already inputs. The
inclusion proof runs both ways — every listed path is reachable from a COPY, and nothing a COPY
reaches is left unlisted.

**Recorded, not hidden.** Line 29 is `COPY scripts/lib/ scripts/lib/`, a whole-directory copy, so
`scripts/lib/rcap-migration-manifest.mjs` and `scripts/lib/rcap-acceptance-schema-snapshot.mjs` **do**
enter the image context even though the worker never imports them. They are listed because they are
inputs. New infrastructure-only modules were placed in **`scripts/control/`**, which no COPY reads,
so they are not image inputs. Narrowing that COPY would change the image and is out of scope while
`WORKER_AUTHORITY_BLOCKED` stands.

`WORKER_AUTHORITY_BLOCKED` is unchanged. `rcap-worker-authority-reconcile.mjs` still exits 1, still
changes no pin, and the manifest records `workerSelectedOrPublished: false`. **No worker was
selected or published.**

---

## 4. Phase / lane matrix

| phase | job | environment | Stripe secret access | Stripe transaction | matrix runs | checkout |
|---|---|---|---|---|---|---|
| `preflight` | `readonly_probe` | none | no | no | no | 3 trees |
| `vercel_audit` | `readonly_probe` | none | no | no | no | 3 trees |
| `environment_probe` | `hosted_write` | `rcap-acceptance` | no | no | no | **none** |
| `migrate` | `hosted_write` | `rcap-acceptance` | no | no | no | 3 trees |
| `deploy` | `hosted_write` | `rcap-acceptance` | no | no | no | 3 trees |
| `accept` | `hosted_write` | `rcap-acceptance` | no | no | **yes** | 3 trees |
| `full_nonpayment` | `hosted_write` | `rcap-acceptance` | no | no | **yes** | 3 trees |
| `checkout_pinning` | `hosted_write` | `rcap-acceptance` | no | no | no | 3 trees |
| `worker_contract` | `hosted_write` | `rcap-acceptance` | no | no | no | 3 trees |
| `payment_environment_probe` | **`payment_probe`** | `rcap-acceptance-payment` | **yes** | no | no | **none** |
| `payment` | `hosted_payment` | `rcap-acceptance-payment` | yes | **yes** | yes | 3 trees |

### C2 — the payment probe lane

`payment_environment_probe` used to traverse `hosted_write` and then `hosted_payment`, so a read-only
secret-presence check depended on a job that checks out three trees, sets up Node, and runs a
contract and an anti-skip gate. It now has its own job with **no `needs:`**.

Simulated with a real evaluator for the workflow's `if` expressions, `payment_environment_probe`
schedules `payment_probe` and runs exactly:

`execution_authority → env_identity → legacy_refusal → capability → payment_environment_probe → antiskip → upload`

and nothing else. Worker authority, audit equivalence, migration readback, deployment, matrix and
payment steps are not merely skipped — they are **absent from the lane**. `hosted_write` and
`hosted_payment` are both **not scheduled** for that phase. The only action in the job is
`actions/upload-artifact`. `PAYMENT_EXERCISED=false`.

### C3 — non-payment acceptance actually runs

`golden_journey` and `verify_harness` existed only in the payment job, yet `hosted_write`'s anti-skip
gate asserted `steps.golden_journey.outcome` and `steps.verify_harness.outcome` — ids that do not
exist, so those expressions resolved to the empty string. `accept` and `full_nonpayment` could never
pass, and more importantly never ran the matrix they are named for.

Both steps now exist in `hosted_write`, gated exactly on
`steps.contract.outputs.lane == 'nonpayment' && steps.contract.outputs.matrix == 'true'`. Simulated:
`accept` and `full_nonpayment` each run `golden_journey`, `verify_harness`, `auth_identities`,
`matrix_build`, `galleries` and `verify_checkout_pinning`; `migrate`, `deploy`, `checkout_pinning`,
`worker_contract` and `environment_probe` run neither. `MATRIX=true` in the contract now means the
matrix actually runs.

`readonly_probe` and `hosted_write` between them contain **zero** `secrets.HOSTED_STRIPE_TEST_*`
expressions, **zero** references to either transacting script and **zero** Stripe endpoints. The
boundary is the absence of the reference, not an empty value. Payment-specific acceptance remains
only in `hosted_payment`.

---

## 5. C5 — exact dispatch routing

`startsWith(inputs.mode, 'hosted_')` and the chained phase expression are gone. A `route` job holds
the single mapping authority and both `hosted` and `f1` `needs: route`, so a refusal there means no
`readonly_probe`, `hosted_write`, `payment_probe` or `hosted_payment` job is ever scheduled.

**Refused first, before the accepted map is consulted:**

| value | outcome |
|---|---|
| `github_acceptance` | `GITHUB_ACCEPTANCE_RETIRED`, exit 1 |
| `hosted_full`, `full` | `LEGACY_MODE_REFUSED`, exit 1 |
| `hosted_checkout_gate`, `checkout_gate` | `LEGACY_MODE_REFUSED`, exit 1 |
| anything unrecognised | `UNKNOWN_MODE_REFUSED`, exit 1 |

**The accepted set**, exact, with no prefix test and no fallthrough:

`ephemeral`/`""` → ephemeral; `hosted_preflight` → `preflight`; `hosted_vercel_audit` →
`vercel_audit`; `hosted_environment_probe` → `environment_probe`; `hosted_migrate` → `migrate`;
`hosted_deploy` → `deploy`; `hosted_accept` → `accept`; `hosted_full_nonpayment` →
`full_nonpayment`; `hosted_checkout_pinning` → `checkout_pinning`; `hosted_worker_contract` →
`worker_contract`; `hosted_payment_environment_probe` → `payment_environment_probe`;
`hosted_payment` → `payment`.

`PHASE=preflight` is assigned in exactly one place, by the literal mode `hosted_preflight`. The
`|| 'preflight'` tail exists nowhere in the file. The mapped phase is then re-checked against the
hosted workflow's own declared phase list, and the called workflow's contract step still fails closed
on an unrecognised phase — defence in depth.

---

## 6. C6 — read-only payment stamp

`preflight` and `vercel_audit` each reach a `stamp_payment_exercised` step (`if: always()`) that runs
`rcap-stamp-payment-exercised.mjs` from `control/` with `RCAP_PAYMENT_EXERCISED=false`, placed before
the artifact upload. The stamper opens no socket, so this adds no network activity beyond the upload
that already existed. Both probe artifacts carry `PAYMENT_EXERCISED` inline, because neither checks
out.

---

## 7. C7 — immutable execution authority

Step **0** of `readonly_probe`, `hosted_write`, `payment_probe`, `hosted_payment` and the caller's
`route` job — ahead of checkout, ahead of setup, ahead of every secret expression and every external
request. It reads two **non-secret** values and no secret:

- `RCAP_AUTHORIZED_INFRASTRUCTURE_SHA` — must equal `github.sha`
- `RCAP_AUTHORIZED_EXECUTION_REF` — must equal `github.ref`

**F1 correction.** The first version of this gate compared a workflow-SHA property on the `github`
context that GitHub does not define. It resolved to the empty string, the comparison was written to
skip on empty, and the gate therefore asserted nothing while printing that caller and callee agreed.
The documented contract replaces it. The **caller** gate compares `github.sha`, `github.workflow_sha`
and `github.ref`. Each of the four **called-workflow** jobs additionally compares `job.workflow_sha`,
`job.workflow_repository == github.repository`,
`job.workflow_file_path == .github/workflows/rcap-hosted-acceptance-staging.yml`, and requires
`job.workflow_ref` to name the repository and the workflow path and to end at the authorized
execution ref. Every comparison is unconditional: an empty observed value is a refusal, never a
skipped check, and the success line is printed only after all of them pass. No OIDC was introduced
and no `id-token: write` permission was added.

The control checkout is bound to the reusable workflow's own documented identity —
`repository: ${{ job.workflow_repository }}`, `ref: ${{ job.workflow_sha }}` — so `control/` is the
very bytes being executed, and `control_authority` still re-proves that commit against
`RCAP_AUTHORIZED_INFRASTRUCTURE_SHA` against the checked-out tree.

Any mismatch fails with **`INFRASTRUCTURE_EXECUTION_AUTHORITY_INVALID`**. So does an *unconfigured*
authority: the gate fails closed, not open. **Neither variable and no tag were created by this
change** — that is a configuration step, and until it is done every job refuses here. See blockers.

---

## 8. Shared-secret provenance — `PRESENCE_ONLY`

The five shared secret-presence checks **do not prove environment provenance**, and the artifacts now
say so themselves. Both probe bodies emit:

```json
"sharedSecretEvidenceClass": "PRESENCE_ONLY",
"environmentProvenance": "ENVIRONMENT_PROVENANCE_NOT_YET_PROVEN"
```

with a note naming the reason and the plan.

**Why option A (drop caller forwarding) is not available yet.** A job in a reusable workflow resolves
no repository-scope secret it was not passed. `readonly_probe` declares no environment and still needs
`SUPABASE_ACCESS_TOKEN` and the three `VERCEL_*` values for the credential preflight, so removing the
caller's forwarding would *disable the read-only preflight* rather than harden it — which section 14
forbids. `workflow_call.secrets` is workflow-level, not per-job, so the forwarding cannot be removed
for the protected jobs alone.

**Concrete pre-probe plan, to run before the first probe is treated as provenance:**

1. rename the environment-scoped copies inside `rcap-acceptance` / `rcap-acceptance-payment` (for
   example `RCAP_ACCEPTANCE_SUPABASE_ACCESS_TOKEN`);
2. point the protected jobs at the renamed names;
3. leave the caller forwarding in place for the old names, which only `readonly_probe` then uses;
4. re-run both probes — a present renamed value can then only have come from the environment;
5. remove or rotate the same-named repository- and organization-scope copies.

**The two Stripe secrets are already different**, and are labelled separately as
`"stripeSecretProvenance": "ENVIRONMENT_SCOPED"`: they are declared in no `workflow_call.secrets`
block and forwarded by no caller, so their presence in `payment_probe` or `hosted_payment` can only be
environment-scoped.

---

## 9. Tests

`node scripts/verify-rcap-acceptance-workflow-hardening.mjs` — **82/82**. Every pre-existing test was
retained; thirteen were updated to the corrected architecture (three environment-declaring jobs
instead of two, the C7 gate ahead of the sentinel, the probe in its own lane, the refusal in `route`,
the read-only stamp) rather than removed.

`node scripts/verify-rcap-control-plane-authority.mjs` — **34/34 new C1–C7 regression checks**, listed
by name in section 11 of the final response and recorded in
`data/rcap-render/control-plane-authority-verification.json`.

Nine of those checks are **simulations or executions**, not string matches: an evaluator for the
GitHub Actions expression subset runs each job's real `if` conditions per phase and reports which
steps execute, and both probe bodies are actually executed in a scratch directory and their emitted
JSON parsed. The evaluator reproduces GitHub's own error text for the C4 defect, which is how
`c4_every_workflow_expression_parses_to_the_end_of_its_input` covers all twelve workflow files.

The YAML the suite reads is parsed by `scripts/control/rcap-minimal-yaml.mjs`, written for this
correction because the repository has no YAML dependency and one must not be added. Its output is
**byte-for-byte identical to PyYAML's for all twelve workflow files**.

**F2.** `actionlint v1.7.12` (pinned; binary SHA-256
`0fa8437eef3b82afc1b3ea92fcee8623e4db1451c32fb514659f762b621ac2cf`, module zip
`h1:vQ4GeJN86C0QH+gTUQcs8McmK62OLT3kmakPMtEWYnY=`) over all twelve workflows: **exit 0**, with a
checked-in `.github/actionlint.yaml` rather than command-line flags. Every ignore is scoped to
`.github/workflows/rcap-hosted-acceptance-staging.yml` alone and names ONE property or secret:

| ignored | why |
|---|---|
| `job.workflow_sha`, `job.workflow_ref`, `job.workflow_repository`, `job.workflow_file_path` | the documented job-context workflow identity, which actionlint v1.7.12 does not yet model — its `job` type is `{check_run_id, container, services, status}`. Each pattern is anchored on that object type, so a *misspelled* job property is still reported. |
| `HOSTED_STRIPE_TEST_SECRET`, `HOSTED_STRIPE_TEST_WEBHOOK_SECRET` | supplied only by the job-level `rcap-acceptance-payment` GitHub Environment and deliberately absent from `on.workflow_call.secrets`; actionlint cannot model environment secrets. Named individually, so any other undefined secret still fails. |

Nothing else is suppressed: not whole rules, not syntax, workflow-call or `needs` errors, not
arbitrary undefined properties or secrets, and not any other workflow.

**Negative control.** `scripts/control/fixtures/actionlint-negative-control.yml` is a deliberately
invalid `workflow_call` workflow with a declared `secrets:` block, living *outside*
`.github/workflows` so GitHub never loads it and no path ignore covers it. The suite runs actionlint
against it and requires all six MUST-FAIL findings — a misspelled `github` property, a misspelled
`job` property, an unrelated undefined secret, and the four ignored names *at a path the config does
not cover* — while the one correctly declared secret produces no finding. That is the scoping proof.

---

## 9a. F1–F5, the second-review correction

| finding | correction |
|---|---|
| **F1** — the gate compared an undefined `github`-context workflow-SHA property, which resolved to empty and skipped | the documented contract: caller compares `github.sha`, `github.workflow_sha`, `github.ref`; each called-workflow job additionally compares `job.workflow_sha`, `job.workflow_repository == github.repository`, `job.workflow_file_path`, and requires `job.workflow_ref` to name the repository and path and end at the authorized ref. Every comparison unconditional; empty is a refusal; the success line is printed only after all pass. Control checkout bound to `job.workflow_repository` / `job.workflow_sha`. No OIDC, no `id-token: write`. |
| **F2** — actionlint was only green behind command-line `-ignore` flags | pinned **v1.7.12** and a checked-in `.github/actionlint.yaml` scoped to the hosted called workflow alone, six patterns each naming one property or secret, with a negative-control fixture proving the ignores do not widen. `actionlint -shellcheck= -pyflakes= .github/workflows/*.yml` exits **0** with no flags. |
| **F3** — `accept` has `DEPLOY=false` but the resolver returned `created_one_new_preview`, so the matrix ran against nothing and the anti-skip gate reported a misleading "deploy one new Preview" failure | a `require_exact_preview` contract column (true only for `accept`, and refused outright if a phase ever claims it together with deploy authority) and an early refusal step returning **`ACCEPTANCE_EXACT_PREVIEW_REQUIRED`** before npm ci, the build, Auth configuration or the matrix. The anti-skip gate now demands deploy success only when `RUNS_DEPLOY=true && O_REUSED!=true`. `full_nonpayment` still reuses when valid and otherwise deploys exactly one Preview. |
| **F4** — two `node` invocations preceded `actions/setup-node` | order is now execution authority (step 0, shell only) → control/application/worker checkout → `actions/setup-node` → worker image-input manifest → control-plane gate → the remaining Node scripts. The before-checkout authority gate is unmoved. |
| **F5** — the `tools_sha` description still read as an orchestration-source input | both the dispatch and `workflow_call` descriptions now state it is a provenance label only, must equal the reviewed control-plane SHA, is not a checkout ref, is not executable authority, and that the former `6d9e8792` value is no longer valid. No `tools_sha` checkout was restored. |

GitHub's parser accepted the F1–F5 workflow set on diagnostic commit
`42dbdc3b052afc5a3ebe94a64ccd796d80f83c72`: zero invalid-workflow runs and zero `github-actions`
check suites, with the `vercel` and `claude` app suites confirming the push was processed.

## 10. Exact remaining blockers

1. **`INFRASTRUCTURE_EXECUTION_AUTHORITY_INVALID` — new, and deliberately blocking.**
   `RCAP_AUTHORIZED_INFRASTRUCTURE_SHA` and `RCAP_AUTHORIZED_EXECUTION_REF` do not exist, and the
   immutable tag does not exist. Neither was created by this task. Until both are configured, every
   job refuses at step 0.
2. **`ACCEPTANCE_AUTHORIZATION_WITHHELD` — phases 50, 51, 52, 53, 54.** Unchanged. Roger must record
   an acceptance authorization for each; the manifest is then regenerated from it.
3. **`WORKER_AUTHORITY_BLOCKED`.** Unchanged. Publish a worker image from a source whose
   image-input manifest matches the pinned application source, and run image acceptance against that
   digest — or re-pin the application SHA and re-run the Phase 1 flow audit.
4. **Neither GitHub Environment exists**, and neither carries `RCAP_ENVIRONMENT_ID` /
   `RCAP_ENVIRONMENT_CLASS`.
5. **`ENVIRONMENT_PROVENANCE_NOT_YET_PROVEN`** for the five shared secrets. Plan in section 8.
6. **One assumption the first `hosted_payment` run must confirm** — that environment secrets resolve
   inside a called workflow's job declaring that environment. Unchanged, and unaffected by the C4
   correction: the validation error was a parenthesis, not a secrets model.
