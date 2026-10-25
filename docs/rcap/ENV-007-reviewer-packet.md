# ENV-007 — reviewer packet

> **SUPERSEDED IN PART.** An independent review of `a22066423096882f1f202990519f1dcb0d96afca`
> returned `CORRECTION_REQUIRED` (findings C1–C7). This packet still describes the Stripe privilege
> boundary, the environment identity sentinels and the migration manifest correctly, but its account
> of the control plane, the payment probe, the non-payment matrix, the dispatch routing and the
> read-only artifacts is superseded by
> **[`ENV-007-control-plane-authority-correction.md`](./ENV-007-control-plane-authority-correction.md)**,
> which also records the GitHub workflow-validation error this candidate carried and the parser
> evidence that the correction resolves it. Read that document first.

Read-only. Nothing in this branch was executed: no hosted workflow run, no migration applied, no deployment, no worker image built, no seeding, no payment.

| | |
|---|---|
| Base SHA (`origin/main`) | `dd93579871962260b12918e54c44cf9bf1e81529` |
| Prior hardening SHA | `360d341e8b9ad9e7266e855252d0c6b774890415` |
| Prior head (Stripe boundary) | `b1412a0260ee73bc8034fe944b35faa99fc21dbc` |
| Correction commit | `fe250b9862022349abe6a378ac957bda53cce9b1` |
| New head SHA | this packet's own commit, the immediate child of the correction commit — `git log --oneline -2` on the branch shows both |
| Branch | `claude/rcap-acceptance-workflow-hardening` |
| Frozen audit packet commit | `00212d529e82a2a2a90b172b29268922feecfcbd` (branch not written) |

## Files changed

### This patch (prior head → correction commit)

| | |
|---|---|
| `M` | `.github/workflows/rcap-f1-ephemeral-staging.yml` |
| `M` | `.github/workflows/rcap-github-hosted-acceptance.yml` |
| `M` | `.github/workflows/rcap-hosted-acceptance-staging.yml` |
| `M` | `data/rcap-render/phase-boundary-matrices.json` |
| `M` | `data/rcap-render/workflow-hardening-verification.json` |
| `M` | `docs/rcap/ENV-007-workflow-hardening-report.md` |
| `M` | `scripts/build-env007-reviewer-packet.mjs` |
| `M` | `scripts/rcap-phase-boundary-matrix.mjs` |
| `A` | `scripts/rcap-stamp-payment-exercised.mjs` |
| `M` | `scripts/verify-rcap-acceptance-workflow-hardening.mjs` |

### Whole branch (base → head)

| | |
|---|---|
| `M` | `.github/workflows/rcap-f1-ephemeral-staging.yml` |
| `M` | `.github/workflows/rcap-github-hosted-acceptance.yml` |
| `M` | `.github/workflows/rcap-hosted-acceptance-staging.yml` |
| `A` | `data/rcap-acceptance-migration-manifest.json` |
| `A` | `data/rcap-render/audit-surface-equivalence.json` |
| `A` | `data/rcap-render/phase-boundary-matrices.json` |
| `A` | `data/rcap-render/worker-authority-reconciliation.json` |
| `A` | `data/rcap-render/workflow-hardening-verification.json` |
| `A` | `docs/rcap/ENV-007-reviewer-packet.md` |
| `A` | `docs/rcap/ENV-007-workflow-hardening-report.md` |
| `A` | `scripts/build-env007-reviewer-packet.mjs` |
| `A` | `scripts/lib/rcap-acceptance-schema-snapshot.mjs` |
| `A` | `scripts/lib/rcap-migration-manifest.mjs` |
| `A` | `scripts/rcap-audit-surface-equivalence.mjs` |
| `M` | `scripts/rcap-hosted-acceptance-deploy.mjs` |
| `M` | `scripts/rcap-hosted-acceptance-migrate.mjs` |
| `A` | `scripts/rcap-phase-boundary-matrix.mjs` |
| `A` | `scripts/rcap-stamp-payment-exercised.mjs` |
| `A` | `scripts/rcap-worker-authority-reconcile.mjs` |
| `A` | `scripts/verify-rcap-acceptance-workflow-hardening.mjs` |

## Workflow phase → environment

| Phase | Job(s) | Environment(s) |
|---|---|---|
| `hosted_preflight` | `readonly_probe` | `(none — read-only)` |
| `hosted_vercel_audit` | `readonly_probe` | `(none — read-only)` |
| `hosted_environment_probe` | `hosted_write` | `rcap-acceptance` |
| `hosted_migrate` | `hosted_write` | `rcap-acceptance` |
| `hosted_deploy` | `hosted_write` | `rcap-acceptance` |
| `hosted_accept` | `hosted_write` | `rcap-acceptance` |
| `hosted_full_nonpayment` | `hosted_write` | `rcap-acceptance` |
| `hosted_checkout_pinning` | `hosted_write` | `rcap-acceptance` |
| `hosted_worker_contract` | `hosted_write` | `rcap-acceptance` |
| `hosted_payment_environment_probe` | `hosted_write` → `hosted_payment` | `rcap-acceptance` + `rcap-acceptance-payment` |
| `hosted_payment` | `hosted_write` → `hosted_payment` | `rcap-acceptance` + `rcap-acceptance-payment` |

## Environment-variable sentinel matrix

Environment-scoped variables, not secrets. A GitHub Environment created implicitly by a workflow naming one that does not exist carries neither, so an empty value is the signal.

| Job | Environment | `RCAP_ENVIRONMENT_ID` | `RCAP_ENVIRONMENT_CLASS` | Failure code |
|---|---|---|---|---|
| `readonly_probe` | none | — | — | *(no sentinel; read-only job)* |
| `hosted_write` | `rcap-acceptance` | `rcap-acceptance-v1` | `nonproduction-acceptance` | `ACCEPTANCE_ENVIRONMENT_IDENTITY_INVALID` |
| `hosted_payment` | `rcap-acceptance-payment` | `rcap-acceptance-payment-v1` | `nonproduction-acceptance-payment` | `PAYMENT_ENVIRONMENT_IDENTITY_INVALID` |

| Phase | Sentinels asserted |
|---|---|
| `hosted_preflight` | none (read-only job) |
| `hosted_vercel_audit` | none (read-only job) |
| `hosted_environment_probe` | `hosted_write` → `rcap-acceptance-v1` |
| `hosted_migrate` | `hosted_write` → `rcap-acceptance-v1` |
| `hosted_deploy` | `hosted_write` → `rcap-acceptance-v1` |
| `hosted_accept` | `hosted_write` → `rcap-acceptance-v1` |
| `hosted_full_nonpayment` | `hosted_write` → `rcap-acceptance-v1` |
| `hosted_checkout_pinning` | `hosted_write` → `rcap-acceptance-v1` |
| `hosted_worker_contract` | `hosted_write` → `rcap-acceptance-v1` |
| `hosted_payment_environment_probe` | `hosted_write` → `rcap-acceptance-v1`, `hosted_payment` → `rcap-acceptance-payment-v1` |
| `hosted_payment` | `hosted_write` → `rcap-acceptance-v1`, `hosted_payment` → `rcap-acceptance-payment-v1` |

## Secret-access matrix

Secrets the job serving that phase can even *reference*. A phase cannot use a secret whose expression does not exist in its job.

| Phase | Referencable secrets | `STRIPE_SECRET_ACCESS` | `STRIPE_TRANSACTION` |
|---|---|---|---|
| `hosted_preflight` | `SUPABASE_ACCESS_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN` | false | false |
| `hosted_vercel_audit` | `SUPABASE_ACCESS_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN` | false | false |
| `hosted_environment_probe` | `GITHUB_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN` | false | false |
| `hosted_migrate` | `GITHUB_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN` | false | false |
| `hosted_deploy` | `GITHUB_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN` | false | false |
| `hosted_accept` | `GITHUB_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN` | false | false |
| `hosted_full_nonpayment` | `GITHUB_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN` | false | false |
| `hosted_checkout_pinning` | `GITHUB_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN` | false | false |
| `hosted_worker_contract` | `GITHUB_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN` | false | false |
| `hosted_payment_environment_probe` | `GITHUB_TOKEN`, `HOSTED_STRIPE_TEST_SECRET`, `HOSTED_STRIPE_TEST_WEBHOOK_SECRET`, `SUPABASE_ACCESS_TOKEN`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN` | **true** | false |
| `hosted_payment` | `GITHUB_TOKEN`, `HOSTED_STRIPE_TEST_SECRET`, `HOSTED_STRIPE_TEST_WEBHOOK_SECRET`, `SUPABASE_ACCESS_TOKEN`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN` | **true** | **true** |

Secret access and transaction authority are separate columns: `payment_environment_probe` holds the key and cannot spend it. Every transacting step in the payment job is gated on `stripe_transaction`, not on membership of the job.

## External-transaction matrix

| Phase | Any external request | Supabase schema | Supabase Auth | Vercel Preview | Vercel **Production** | Registry pull | Stripe API | Checkout Session | Payment webhook | `PAYMENT_EXERCISED` |
|---|---|---|---|---|---|---|---|---|---|---|
| `hosted_preflight` | no | no | no | no | **no** | no | no | no | no | false |
| `hosted_vercel_audit` | no | no | no | no | **no** | no | no | no | no | false |
| `hosted_environment_probe` | no | no | no | no | **no** | no | no | no | no | false |
| `hosted_migrate` | yes | yes | no | no | **no** | no | no | no | no | false |
| `hosted_deploy` | yes | no | no | yes | **no** | no | no | no | no | false |
| `hosted_accept` | yes | no | yes | no | **no** | yes | no | no | no | false |
| `hosted_full_nonpayment` | yes | yes | yes | yes | **no** | yes | no | no | no | false |
| `hosted_checkout_pinning` | yes | no | no | no | **no** | no | no | no | no | false |
| `hosted_worker_contract` | yes | no | no | no | **no** | yes | no | no | no | false |
| `hosted_payment_environment_probe` | no | no | no | no | **no** | no | no | no | no | false |
| `hosted_payment` | yes | yes | yes | yes | **no** | yes | **YES** | **YES** | **YES** | **true** |

Invariants, derived and asserted:

- `onlyPaymentJobHoldsStripeSecretExpressions` — **true**
- `stripeSecretAccessIsExactlyPaymentAndItsProbe` — **true**
- `onlyPaymentPhaseTransacts` — **true**
- `transactionImpliesSecretAccess` — **true**
- `onlyPaymentPhaseCallsStripe` — **true**
- `onlyPaymentPhaseCreatesACheckoutSession` — **true**
- `onlyPaymentPhaseExercisesPayment` — **true**
- `probePhasesMakeNoExternalRequest` — **true**
- `everyProtectedJobAssertsItsSentinel` — **true**
- `noPhaseWritesVercelProduction` — **true**

## Retired and renamed paths

| Value | Status | Refused where | Replacement |
|---|---|---|---|
| `github_acceptance` | **retired** | F1 `retired_path_refusal` job; `legacy_refusal` step 2 of both protected jobs; the retired workflow's own first step | `hosted_payment` |
| `hosted_full` / phase `full` | **renamed, refused alias** | F1 `retired_path_refusal`; `legacy_refusal` in `hosted_write` | `hosted_full_nonpayment` |
| `hosted_checkout_gate` / phase `checkout_gate` | **renamed, refused alias** | F1 `retired_path_refusal`; `legacy_refusal` in `hosted_write` | `hosted_checkout_pinning` (static) or `hosted_payment` (real Session) |

Every refusal happens before any secret is read. `github_acceptance` prints `GITHUB_ACCEPTANCE_RETIRED` and `Use hosted_payment for payment-producing acceptance.` No workflow references `rcap-github-hosted-acceptance.yml` in a `uses:`, so it has no caller.

Its unique case — a real, human-completed Sandbox payment against a live tunnel host — is **not** relocated. Route it through `hosted_payment`, whose reuse-only Checkout step prepares one real unpaid Session on a stable Vercel Preview host that a person can pay.

## Immutable-tag execution recommendation

Restrict both environments' deployment rules to an **immutable tag** cut at the reviewed commit rather than to a branch. A branch moves; a tag pinned in the environment rule does not, so "approved for this environment" and "the bytes that were reviewed" stay the same thing. The workflow already pins `application_sha`, `worker_source_sha`, `worker_digest` and `tools_sha` — but those pins live *in the workflow file*, and restricting the environment to a tag is what stops a different workflow file from reaching the same secrets.

## Tests and results

`node scripts/verify-rcap-acceptance-workflow-hardening.mjs` — **82/82 passing**, 0 failing. Static and dry-run only: no network, no database, no registry, no deployment.

| Check | Result |
|---|---|
| `legacy_regex_selection_reproduces_the_phase55_double_application` | pass |
| `phase_55_is_selected_exactly_once` | pass |
| `every_migration_is_selected_exactly_once` | pass |
| `ordered_selection_has_length_seven` | pass |
| `baseline_and_authorized_sequence_are_disjoint` | pass |
| `a_second_completed_run_selects_zero_migrations` | pass |
| `a_completed_environment_is_verify_only` | pass |
| `a_partial_sequence_resumes_from_the_first_unapplied_exact_hash` | pass |
| `a_gapped_sequence_blocks_with_an_exact_disposable_project_recovery_instruction` | pass |
| `phase_50_is_never_blindly_rerun_after_its_ledger_entry_exists` | pass |
| `phase_55_cannot_be_recorded_twice` | pass |
| `the_ledger_sequence_is_exactly_49_to_55_once_each` | pass |
| `explicit_migration_manifest_is_authoritative` | pass |
| `no_regex_decides_which_migrations_execute` | pass |
| `manifest_hash_describes_its_own_contents` | pass |
| `migration_hash_mismatch_stops_before_write` | pass |
| `unknown_migration_stops_before_write` | pass |
| `missing_migration_stops_before_write` | pass |
| `the_manifest_gate_precedes_every_write_in_the_runner` | pass |
| `acceptance_authorization_is_recorded_per_phase` | pass |
| `phase_49_and_phase_55_authorization_is_read_not_assumed` | pass |
| `a_withheld_acceptance_authorization_stops_before_write` | pass |
| `the_manifest_does_not_itself_authorize_anything` | pass |
| `environment_declared_on_every_write_capable_job` | pass |
| `hosted_payment_uses_the_separate_payment_environment` | pass |
| `read_only_phases_declare_no_write_environment` | pass |
| `the_environment_name_is_never_empty_for_a_write_capable_run` | pass |
| `pinned_value_refusal_survives_the_environment_change` | pass |
| `only_the_payment_authorized_job_receives_stripe_secret_expressions` | pass |
| `only_the_payment_phase_may_invoke_a_stripe_transacting_script` | pass |
| `the_payment_job_is_bound_to_the_payment_phase_and_the_payment_environment` | pass |
| `hosted_accept_contains_no_payment_matrix` | pass |
| `hosted_full_nonpayment_cannot_transact` | pass |
| `hosted_checkout_pinning_is_non_transacting` | pass |
| `hosted_worker_contract_contains_no_stripe_secret` | pass |
| `no_non_payment_phase_can_create_a_checkout_session` | pass |
| `the_stripe_secrets_cannot_be_supplied_from_outside_the_payment_environment` | pass |
| `the_github_acceptance_fallback_can_no_longer_transact` | pass |
| `an_empty_stripe_secret_never_reads_as_a_completed_acceptance` | pass |
| `non_payment_acceptance_states_what_it_did_not_do` | pass |
| `payment_refuses_a_non_sk_test_key` | pass |
| `payment_refuses_an_invalid_webhook_secret` | pass |
| `the_two_environments_stay_separate_with_no_shared_stripe_secret` | pass |
| `the_derived_phase_boundary_matrices_hold_every_invariant` | pass |
| `a_missing_acceptance_marker_refuses_before_checkout_or_external_execution` | pass |
| `a_wrong_acceptance_marker_refuses` | pass |
| `a_missing_payment_marker_refuses_before_checkout_or_external_execution` | pass |
| `a_wrong_payment_marker_refuses` | pass |
| `an_automatically_created_empty_environment_cannot_reach_a_write` | pass |
| `hosted_environment_probe_makes_no_external_request` | pass |
| `the_probe_phases_reach_no_network_step_in_hosted_write` | pass |
| `hosted_payment_environment_probe_makes_no_external_request` | pass |
| `the_payment_probe_creates_no_checkout_session` | pass |
| `secret_access_and_transaction_authority_are_distinct` | pass |
| `only_hosted_payment_can_access_stripe_secrets` | pass |
| `only_phase_payment_can_transact` | pass |
| `github_acceptance_is_absent_from_dispatch_choices_and_callers` | pass |
| `direct_legacy_github_acceptance_invocation_returns_GITHUB_ACCEPTANCE_RETIRED` | pass |
| `the_retired_payment_behaviour_was_not_moved_elsewhere` | pass |
| `misleading_phase_names_are_retired_as_refused_aliases` | pass |
| `the_static_checkout_verification_cannot_be_mistaken_for_a_session_test` | pass |
| `every_non_payment_artifact_asserts_PAYMENT_EXERCISED_false` | pass |
| `the_payment_job_stamps_the_capability_decision_not_a_literal` | pass |
| `worker_mismatch_blocks_deploy` | pass |
| `the_worker_authority_is_currently_blocked_and_no_pin_was_changed` | pass |
| `audit_source_equivalence_failure_blocks_deploy` | pass |
| `the_audited_surface_is_computed_not_asserted` | pass |
| `no_unexplained_participant_facing_difference_blocks_deployment` | pass |
| `vercel_production_target_blocks_deploy` | pass |
| `stripe_live_key_blocks_payment` | pass |
| `pre_and_post_write_snapshots_capture_the_required_shape` | pass |
| `the_snapshot_records_no_secret_and_no_production_identifier` | pass |
| `the_pre_write_snapshot_precedes_the_first_schema_write` | pass |
| `the_recovery_model_is_stated_explicitly` | pass |
| `product_behavior_files_unchanged` | pass |
| `migration_sql_files_unchanged` | pass |
| `audit_manifests_unchanged_on_this_branch` | pass |
| `git_diff_check_is_clean` | pass |
| `migration_manifest_hash_is_exactly_the_authorized_value` | pass |
| `all_seven_migration_sql_files_are_byte_identical_to_the_base` | pass |
| `the_audit_branch_has_not_moved` | pass |
| `every_manifest_hash_still_recomputes_from_disk` | pass |

Supporting scripts:

- `scripts/rcap-phase-boundary-matrix.mjs` — exit 0, all 10 invariants hold
- `scripts/rcap-audit-surface-equivalence.mjs` — exit 0, 190/190 audited-surface files identical, 0 differing inside
- `scripts/rcap-worker-authority-reconcile.mjs` — exit 1, `WORKER_AUTHORITY_BLOCKED` (intended: it is a gate)

## Product diff

**Empty.** No file under `src/` or `public/`, and neither package manifest nor `next.config.ts`, differs from the base commit.

## Migration SQL diff

**Empty.** All 7 authorized migration files are byte-identical to the base commit.

| Phase | Path | Blob at base | Blob at correction | Identical |
|---|---|---|---|---|
| 49 | `supabase/phase-49-rcap-packet-render-jobs.sql` | `4a23b3df3a4b` | `4a23b3df3a4b` | yes |
| 50 | `supabase/phase-50-rcap-packet-delivery-hardening.sql` | `047864ef7993` | `047864ef7993` | yes |
| 51 | `supabase/phase-51-rcap-consumer-payment-gate.sql` | `544c39ee48e2` | `544c39ee48e2` | yes |
| 52 | `supabase/phase-52-rcap-consumer-payment-authority.sql` | `30265d311167` | `30265d311167` | yes |
| 53 | `supabase/phase-53-rcap-consumer-job-binding.sql` | `6bd0cf331f1b` | `6bd0cf331f1b` | yes |
| 54 | `supabase/phase-54-rcap-person-namespace-hardening.sql` | `7aff681cc4ab` | `7aff681cc4ab` | yes |
| 55 | `supabase/phase-55-expungement-matter-payment-binding.sql` | `49eb1ef02dd5` | `49eb1ef02dd5` | yes |

Migration manifest hash: `01a7e8488df436b9366b381f0ba3cb12cdb17c93725603c044b9a8194fb9b4e4`

## Audit artifact diff

**Empty.** No Phase 1 / Phase 1B / ENV-007 audit artifact was touched by this branch, and `origin/claude/expai-flow-audit-p1` is still at `00212d529e82a2a2a90b172b29268922feecfcbd`.

## Exact remaining blockers

1. **`ACCEPTANCE_AUTHORIZATION_WITHHELD` — phases 50, 51, 52, 53, 54.** Recorded `queued` for staging in `data/rcap-staging-action.json`; phase 54's is "explicitly withheld by the authorizing instruction". `hosted_migrate` refuses before any write. Roger must record an acceptance authorization for each withheld phase, and the manifest must be regenerated from it.
2. **`WORKER_AUTHORITY_BLOCKED`.** neither candidate meets every requirement; no pin is changed. No pin was changed. Gates `hosted_deploy`, `hosted_accept`, `hosted_full`, `hosted_checkout_gate`, `hosted_worker_contract` and `hosted_payment`.
3. **Neither GitHub Environment exists yet, and neither carries its identity variables.** `rcap-acceptance` and `rcap-acceptance-payment` are declared in the workflow but not created in GitHub Settings, and no secret has been moved. Until they exist, any write-capable phase fails to resolve its environment. The setup checklist is section 4 of `docs/rcap/ENV-007-workflow-hardening-report.md`.
4. **One assumption the first `hosted_payment` run must confirm.** The Stripe secrets are read from the `rcap-acceptance-payment` environment and are no longer declared as `workflow_call` secrets. Environment secrets are expected to resolve inside a called workflow's job that declares that environment; proving it requires running a hosted workflow, which is out of scope. The `stripe_present` step makes a wrong assumption an explicit refusal naming the environment, never a silent skip.
5. **The `github_acceptance` fallback now fails closed.** It still references the Stripe secrets, receives none, and exits 1 at its first step. That is the intended consequence of the owner decision, not a regression to fix here — but it means that fallback mode is unavailable until it is either retired or moved behind the payment environment.

