# C1 engineering handoff — 2026-09-20

## Starting state

- Initial local branch: `main`; initial HEAD: `a3d4587b0fbbbfa887c78372afbfdb8824906333`.
- Fetched `origin/captain-release` and created `codex/mission-lock-engineering` at `b7f5158abb9d1d7c2fcd740b9bd56d094dfdad07`.
- Tracked files were clean. The owner-supplied `EXPUNGEMENT_AI_GRADE_A_MISSION_LOCK_BUILD_PLAN.md` was untracked and remains untouched.
- Current application acceptance candidate: `884ad51d0ad50c520ec0ba2834eac03194ce88ac`. This is the run input and REST transport pin, not a claim that hosted acceptance passed.
- Accepted publication source: `117b469c453a403fbd217f1c441a08c7c68f6b3a`.
- Accepted immutable worker digest: `sha256:9faa24e8c6919c5801d5c38fd40d9476c4e54188fc7ab0087ba9eb711371b34f`.
- Current `hosted_full` run: [35542197750](https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/actions/runs/35542197750), tools SHA `b7f5158abb9d1d7c2fcd740b9bd56d094dfdad07`. Observed in progress at session start; completed **failure**.
- The superseded release-binding tuple is already recorded in Captain register Item 11C and was not used as current authority.

## PLAN ITEM

C1: finish active hosted acceptance using the published worker, without duplicate dispatch or publication.

## DEFECT

The hosted run stopped at step 39, **Prepare one real Pennsylvania Sandbox Checkout and stop unpaid**, with outcome `stripe_webhook_url_update_required`.

The existing endpoint `we_1U4AKGRWROAHlAKyNFChAnWr` targets `legalease-rcap-62425c837b5e-roger947s-projects.vercel.app`; the current Preview is `legalease-rcap-884ad51d0ad5-roger947s-projects.vercel.app`, deployment `dpl_7fS5R3jKGRYeCCyuvafkoMfrkgpe`. This is a candidate/environment mismatch: the existing destination differs from the newly deployed candidate. The refusal is correct; no check should be relaxed.

Separately, the exact downstream payment-harness verifier invoked by this workflow fails locally with:

```text
the preflight is not in REQUIRED_CASES, so a run that never reached it would still be able to pass
```

The hosted run did not reach this verifier because the webhook gate stopped first.

## ROOT CAUSE

`verify-rcap-immutable-image-preflight.mjs` searched from the beginning of the harness to its first `];`. Commit `3dfba20d0169084c94d252e83dfb35e1463f0a37` introduced `const postPaymentCopy = [];` before `REQUIRED_CASES`, so the verifier searched the wrong region. The required image-admission case still exists in the actual required-case array.

Isolated reproduction used the exact verifier and harness files extracted with `git show`, without executing the payment harness or accessing services:

| Baseline | Original verifier result |
|---|---|
| `4e16d6d8ebe991a8a3f529637b0d3a38c3149cbb` | PASS |
| `117b469c453a403fbd217f1c441a08c7c68f6b3a` | FAIL, exact message above |
| `b7f5158abb9d1d7c2fcd740b9bd56d094dfdad07` | FAIL, exact message above |

Thus this defect is present in the current candidate, predates this engineering batch, and was absent at the older accepted application.

## FILES CHANGED

- `scripts/verify-rcap-immutable-image-preflight.mjs`: locate the named `REQUIRED_CASES` declaration and add three negative mutations.
- This bounded handoff.

No application, worker, route, legal, commercial, shared-schema, or acceptance-pin changes.

## PROOF

Local:

- Repaired immutable-image preflight verifier PASS; mutations 6/6 caught.
- Current Checkout gate verifier 95/95 PASS.
- Hosted full matrix contract PASS: skipped, cancelled, failed, or absent required steps cannot pass.
- Existing target-worker (16 mutations), replay-scope (3), job-column (7), and packet-contract (18) checks PASS.
- Existing sandbox webhook retarget tests 7/7 PASS, including refusal of live mode, endpoint substitution, disabled endpoint, changed event set, and noncanonical path.
- Canonical worker-input planner at starting SHA: `decision=reuse-accepted-digest`, `changedPaths=[]`, `missingCanonicalInputs=[]`. The repaired verifier is outside canonical worker inputs.

Hosted evidence: [artifact 10615117725](https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/actions/runs/35542197750/artifacts/10615117725), `rcap-hosted-full-35542197750`; uploaded archive SHA-256 `2b6038a653cbdd901f7edb232cee59e4a9e4e8bea5e13c14ebb1e681b91f0898` (reported by Actions).

- `deploy.json`: exact application candidate, READY Preview, `passed=true`.
- `checkout-gate.json`: exact worker repo digest pulled successfully, worker not started; `webhookDestination.exact=false`, `outcome=stripe_webhook_url_update_required`, `passed=false`.
- Step 44 correctly failed because required matrix steps did not run. No hosted payment or golden-matrix acceptance is claimed.

## REGRESSION CONTROL

New mutations refuse: removing image admission from `REQUIRED_CASES`; placing its name in an unrelated array while omitting it from the required array; and removing the named required-case declaration. Existing mutations still refuse an empty probe verdict accepted as admission, continuing after failed preflight, and mounting host source over shipped image bytes.

## COMMIT / PUSH STATUS

The implementation and this handoff are in the engineering commit containing this file. The final batch report supplies its exact SHA and push result; this document does not claim Captain integration or hosted acceptance.

## CAPTAIN HANDOFFS

No substantive/legal issue was established. Captain review and integration of the verifier repair is needed before the hosted workflow can execute it: the workflow intentionally requires `tools_sha` to belong to canonical integration history. That control was preserved.

## BLOCKER

An attempt to dispatch the existing `hosted_stripe_retarget` phase on the unchanged Captain branch was rejected:

```text
HTTP 403: Resource not accessible by integration
POST /repos/Roger-LegalEase/legalease-partner-dashboard-clean/actions/workflows/332448793/dispatches
```

No run was created by this attempt and no sandbox webhook was changed. This is an explicit Actions credential/access blocker, not a production approval request.

## NEXT

Using a credential with Actions dispatch access, run the existing `hosted_stripe_retarget` phase with:

```text
ref: claude/legalease-sprint-captain-utucnw
application_sha: 884ad51d0ad50c520ec0ba2834eac03194ce88ac
worker_source_sha: 117b469c453a403fbd217f1c441a08c7c68f6b3a
worker_digest: sha256:9faa24e8c6919c5801d5c38fd40d9476c4e54188fc7ab0087ba9eb711371b34f
tools_sha: b7f5158abb9d1d7c2fcd740b9bd56d094dfdad07
supabase_project_ref: hyflxnlhpmiqxvvcoiia
preview_deployment_id: dpl_7fS5R3jKGRYeCCyuvafkoMfrkgpe
preview_hostname: legalease-rcap-884ad51d0ad5-roger947s-projects.vercel.app
```

Refresh the branch/tools SHA together if Captain integration has advanced; preserve application/worker pins unless measured inputs require a new candidate. After successful endpoint readback and Captain integration of the verifier repair, rerun `hosted_full` with this exact existing Preview identity to reuse it. No worker rebuild or publication is needed for this repair. Production remains unauthorized.
