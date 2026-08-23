# ENV-007 — acceptance workflow hardening

Infrastructure correction for the authorization defects the ENV-007 owner packet
raised. No migration was executed, no deployment was made, no environment was
created or altered, nothing was seeded, and no product file was changed.

| | |
|---|---|
| Infrastructure base | `dd93579871962260b12918e54c44cf9bf1e81529` (`origin/main`) |
| Branch | `claude/rcap-acceptance-workflow-hardening` |
| Safety branch | `safety/rcap-acceptance-workflow-hardening-dd935798-20260823T000000Z` at the same SHA |
| Frozen audit authority | branch `claude/expai-flow-audit-p1`, audited head `d32267b8135ee18d33fdf6d4178ea87127138efe`, packet commit `00212d529e82a2a2a90b172b29268922feecfcbd` — read only, never written by this branch |

---

## 1. The exact migration authority

The runner executes **seven** files. The ENV-007 packet documented phases 50–54;
this section completes the record for 49 and 55 at the same depth — and then
answers the question the packet could not: whether each is actually authorized to
run against a hosted acceptance project.

### Phase 49 — `supabase/phase-49-rcap-packet-render-jobs.sql`

| Field | Value |
|---|---|
| Git blob SHA | `4a23b3df3a4b953ade5732a4af3e29ef64445483` |
| SHA-256 | `2ad3726d8c2c02058a0545b940d84865b30de95b8a367a081a08cf709a7bc2d6` |
| Size | 19,813 bytes / 499 lines |

**Purpose.** Durable packet render jobs and artifact-gated credit movement.
Before it, a sponsored packet credit was consumed with no validated artifact in
existence: `src/app/api/expungement-ai/packet/generate/route.ts` recorded a
credit once `packetStatus` reached `ready`, and `ready` was reached by
`buildConsumerPacketArtifact()`, which returns an in-memory string with
contentType `text/plain`. No PDF was produced, nothing was written to storage,
nothing was parsed back, and a partner's finite allocation was spent on it.

- **Tables:** creates `public.packet_render_jobs`, `public.rcap_partner_packet_allocation`, `public.rcap_packet_credit_consumptions`.
- **Columns:** the base job column set — the status machine, `renderer_kind`, `source_sha256` (NOT NULL here; phase 50 relaxes it), `output_sha256`, `normalized_output_sha256`, `output_storage_path`.
- **Functions and triggers:** `packet_render_jobs_guard_transition()` with its trigger; `claim_packet_render_job(text, text[])`; `consume_rcap_packet_credit(text, text, uuid)` — which refuses unless the named job is `artifact_validated` or `delivered` and carries a real output checksum. All three are superseded in phases 50–53.
- **RLS and grants:** RLS enabled on all three tables; three `service_role FOR ALL` policies, each preceded by `drop policy if exists`. **No `GRANT` or `REVOKE` statement anywhere in the file** — the tables inherit whatever the project's default privileges hand `anon` and `authenticated`. Phase 50 is what withdraws them.
- **Storage / auth effects:** none. The file deliberately takes no foreign key on `rcap_document_artifacts` so it can be applied independently of phase 48.
- **Destructive:** no. It creates and never drops.
- **Idempotent:** yes. `create table if not exists`, `create index if not exists`, `create or replace function`, and drop-then-create for the one trigger and all three policies. The whole file is one `begin; … commit;`.
- **Prerequisites:** the pre-49 baseline (`partner_records`, `rcap_persons`, `rcap_document_packets`, `consumer_briefcase_items`, `screening_sessions`, `partner_entitlement`). The header names phase 48 "where that migration is present" — there is no `phase-48-*.sql` in this repository, and the file is written to apply without it.
- **Rollback:** the only migration in the sequence that ships one. Lines 490–499 carry an explicit six-step reversal, and the file states it is reversible without data loss to pre-existing tables.
- **Why hosted acceptance requires it:** it is the base table every later phase alters. Without `packet_render_jobs` there is no durable unit of work, so no paid or sponsored terminal in the flow manifest can be exercised end to end.

### Phase 55 — `supabase/phase-55-expungement-matter-payment-binding.sql`

| Field | Value |
|---|---|
| Git blob SHA | `49eb1ef02dd5daab744f443e7b6254a2502451e2` |
| SHA-256 | `ed16e56e17882b79a494fe60779101031bfb706211930ac49b9cdc7059bc17a3` |
| Size | 28,578 bytes / 688 lines |

**Purpose.** Extends the phase-52/53 consumer payment authority so the paid
Briefcase item is bound to a canonical product, person and matter. It creates no
second entitlement system: the paid `consumer_briefcase_items` row remains the
payment authority and `consumer_packet_payment_consumption` remains the immutable
post-validation record.

- **Tables:** `public.consumer_briefcase_items` (altered), `public.consumer_packet_payment_consumption` (altered), `public.packet_render_jobs` (triggers only), `public.rcap_persons` (**rows inserted**).
- **Columns:** `consumer_briefcase_items` `+payment_product_id`, `+payment_person_id`, `+payment_matter_id`. `consumer_packet_payment_consumption` `+product_id`, `+checkout_session_id`, `+amount_cents`, `+currency`, then all four `SET NOT NULL`. Constraints: `consumer_briefcase_items_payment_product_check`; a rewritten `consumer_briefcase_items_paid_requires_server_evidence` that now also demands `currency = 'usd'`, a non-empty `checkout_session_id`, `payment_product_id = 'expungement_packet'`, a non-null `payment_person_id` and `payment_matter_id = consumer_matter_id_for_briefcase_item(id)`; plus product/amount/currency checks on the consumption table. Unique indexes `consumer_briefcase_items_checkout_session_uk` and `consumer_briefcase_items_user_source_session_uk`.
- **Functions and triggers:** functions `expungement_packet_product_id()`, `consumer_matter_id_for_briefcase_item(uuid)`, `record_consumer_packet_payment` (old signature dropped, new one created), `consumer_packet_payment_authority` (new five-argument overload alongside the two-argument form), `packet_render_jobs_paid_matter_guard()`, `consumer_payment_consumption_binding_guard()`. Triggers `packet_render_jobs_paid_matter_insert_trg`, `packet_render_jobs_paid_matter_finalize_trg`, `consumer_payment_consumption_binding_trg` — all drop-then-create.
- **RLS and grants:** no policy is created, altered or dropped. It **revokes column-level `INSERT` and `UPDATE` on ten columns** (`payment_product_id`, `payment_person_id`, `payment_matter_id`, `payment_allowed`, `item_type`, `jurisdiction`, `pathway_label`, `result_code`, `packet_type`, `source_session_id`) from `anon` and `authenticated`, and revokes `EXECUTE` on both RPCs from `public`, granting them to `service_role`.
- **Storage / auth effects:** no storage object, no Supabase Auth setting, no JWT claim, no session rule. It reads `consumer_briefcase_items`, which carries a foreign key to `auth.users`.
- **Destructive:** **this is the only migration in the sequence that rewrites rows.** It `INSERT`s into `rcap_persons` (`on conflict do nothing`), `UPDATE`s `consumer_briefcase_items` to backfill the three payment columns, and `UPDATE`s `consumer_packet_payment_consumption` to copy the binding across. It also drops the previous `record_consumer_packet_payment` signature, and it `raise exception`s outright if an existing consumption row disagrees with the canonical paid-matter binding. No table, column or policy is dropped.
- **Idempotent:** yes in effect — every block is `to_regclass`-guarded, the backfills use `coalesce` and `on conflict do nothing`, and every trigger and constraint is drop-then-create. One caveat: `alter column … set not null` on the four consumption columns fails if any row still holds a null, so a re-run after a partially populated state is not guaranteed to converge.
- **Prerequisites:** 26, 27, 28, 49, 50, 51, 52, 53, 54 — the file says so in its header.
- **Rollback:** none scripted. The backfilled `rcap_persons` rows and the four `SET NOT NULL` columns have no reversal in the repository. On the acceptance project the compensating action is delete-and-recreate.
- **Why hosted acceptance requires it:** the payment authority the hosted payment journey exercises is the matter-bound one. Without phase 55 the consumption row carries no product, session, amount or currency, and the paid-requires-server-evidence constraint does not bind the matter.

### The authorization answer

> *Do not assume phase 49 or phase 55 is authorized merely because the current
> runner includes it.*

Read from `data/rcap-staging-action.json`, not inferred from the runner:

| Phase | `authorizationScope` | Acceptance / staging authorization | May run on the acceptance project |
|---|---|---|---|
| 49 | `repository_integration_and_conditional_production_application` | `authorized` | **yes** |
| 50 | `repository_integration_only` | `queued — requires Roger to name both migration files and the staging environment` | **no** |
| 51 | `repository_integration_only` | `queued — requires Roger to name all three migration files and the staging environment` | **no** |
| 52 | `repository_integration_only` | `queued — requires Roger to name all four migration files and the staging environment` | **no** |
| 53 | `repository_integration_only` | `queued — requires Roger to name all five migration files and the staging environment` | **no** |
| 54 | `repository_integration_and_ephemeral_local_testing_only` | `queued — explicitly withheld by the authorizing instruction` | **no** |
| 55 | `repository_integration_and_nonproduction_acceptance_only` | `authorized — missing migrations may be applied only to the verified nonproduction acceptance project` | **yes** |

**Phases 49 and 55 are authorized. Phases 50–54 are not.** Five of the seven
files the runner was about to apply to a hosted acceptance project are recorded
`queued` for staging, and phase 54's is "explicitly withheld by the authorizing
instruction". The containing record's own `status` is
`prepared_queued_not_authorized` and its `authorizes` list is empty.

This is now enforced rather than documented: `verifyAcceptanceAuthorization()`
refuses the run before the ledger table is created, before the environment
marker is stamped and before any snapshot is taken. See **Exact blockers**.

---

## 2. The explicit migration manifest

`data/rcap-acceptance-migration-manifest.json` is the single authority for which
migrations execute, in what order, at what bytes.

- Manifest hash `01a7e8488df436b9366b381f0ba3cb12cdb17c93725603c044b9a8194fb9b4e4` — SHA-256 over the newline-joined `phase:path:sha256` triples in order.
- Seven members, phases 49–55, contiguous and ascending, each carrying its SHA-256, byte and line count, authorization id, authorization scope and acceptance-authorization record.
- Baseline exclusions are declared by exact path: `supabase/partner-seed-demo.sql` and `supabase/phase-56-public-view-and-default-privilege-hardening.sql`, plus every manifest member.

Selection logic moved out of the runner into `scripts/lib/rcap-migration-manifest.mjs`
as pure functions, so a test can exercise it without a database. The runner
enforces, in order, before its first write:

1. `verifyManifest` — the manifest's own hash recomputes; the order is ascending and contiguous within the declared range 49–55; every member exists on disk at its manifest hash; every member agrees with **both** `data/rcap-staging-action.json` and `data/rcap-staging-authorization-readiness.json`; **no unknown migration exists inside the authorized range**; no member sits outside it.
2. `verifyAcceptanceAuthorization` — every member carries an acceptance authorization beginning with the word "authorized".
3. `planSequence` against the ledger — `apply` (resume at the first unapplied member), `noop` (all seven exact hashes recorded), or `blocked` with an exact recovery instruction. There is no fourth outcome.
4. `assertLedgerSequence` after applying — the ledger is exactly `49,50,51,52,53,54,55`, one entry per migration, none extra and none missing.

Regex-based baseline inclusion and exclusion is gone. A duplicate-object error
is no longer recorded as "adopted": under the manifest, objects existing while
their ledger row is absent means something applied them outside this authority,
which is precisely the state that must not be waved through.

No migration SQL was changed. All seven SHA-256 values still recompute from disk.

---

## 3. The phase-55 double-application defect

**Reproduced.** The pre-fix baseline filter was
`/^phase-(49|50|51|52|53|54)-/`, which does not match `phase-55-`. Phase 55 was
therefore selected by the baseline sweep *and* again as the seventh entry of the
authorized sequence — two applications, one ledger row, and nothing in the
evidence saying so. The test
`legacy_regex_selection_reproduces_the_phase55_double_application` transcribes
that filter and asserts it yields **2** selections.

Worse than a wasted apply: in the baseline pass phase 55 runs *before* phases
49–54, so `packet_render_jobs` and `consumer_packet_payment_consumption` do not
exist and its guarded blocks return early, while its rewrite of
`consumer_briefcase_items_paid_requires_server_evidence` references
`payment_authority`, `provider_event_id` and `currency` — columns phase 52
introduces. The statement fails, the file's own transaction rolls back, and the
failure is recorded as a **non-blocking** baseline error that is easy to miss.

**Corrected**, and proven by these cases:

| Case | Result |
|---|---|
| `phase_55_is_selected_exactly_once` | 1 selection across baseline and sequence |
| `every_migration_is_selected_exactly_once` | 49–55 each selected exactly once |
| `ordered_selection_has_length_seven` | `[49, 50, 51, 52, 53, 54, 55]` |
| `baseline_and_authorized_sequence_are_disjoint` | no shared path |
| `a_second_completed_run_selects_zero_migrations` | plan mode `noop` |
| `a_partial_sequence_resumes_from_the_first_unapplied_exact_hash` | ledger `[49,50,51]` → resume at 52, applying 4 |
| `a_gapped_sequence_blocks_with_an_exact_disposable_project_recovery_instruction` | ledger `[49,50,52]` → `blocked` (`ledger_sequence_has_a_gap`) with the delete-and-recreate text |
| `phase_50_is_never_blindly_rerun_after_its_ledger_entry_exists` | not re-selected; the "adopted" path is gone |
| `phase_55_cannot_be_recorded_twice` | a duplicated ledger row fails `assertLedgerSequence` |

Phase 50 matters here specifically: its
`create trigger guard_packet_render_job_transition` at line 418 has **no**
matching `drop trigger if exists`. A blind re-run raises a duplicate-object
error rather than converging, which is why re-selection must be decided by the
ledger and not by catching an error code.

---

## 4. GitHub Environment protection

The hosted workflow was one job serving every phase, so it could not declare an
environment for the write-capable phases without also imposing one on the
read-only ones. It is now two jobs:

| Job | Runs for | Environment |
|---|---|---|
| `readonly_probe` | `preflight`, `vercel_audit` | **none** — neither writes anything |
| `hosted_write` | every other phase | `${{ inputs.phase == 'payment' && 'rcap-acceptance-payment' \|\| 'rcap-acceptance' }}` |

The environment name is decided from `inputs.phase` alone, before any step runs,
so it never depends on a value produced inside the job, and it is never empty —
the job's own `if:` has already excluded the read-only phases. Every pinned-value
refusal check is preserved on both jobs; the environment **supplements** them.

### Human setup checklist — GitHub Settings → Environments

Nothing below was created or altered by this task.

**Environment `rcap-acceptance`** — covers `hosted_migrate`, `hosted_deploy`, `hosted_accept`, and also `hosted_full`, `hosted_checkout_gate`, `hosted_worker_contract`.

- Required reviewers: **recommended — at least one, Roger.** These phases write to the acceptance Supabase project and create Vercel Preview deployments. A required reviewer is the only control in this design that a repository write cannot bypass.
- Wait timer: not required.
- Deployment branch and tag restriction: **set to "Selected branches and tags" and allow only `main`.** The reusable workflow is reached through `rcap-f1-ephemeral-staging.yml`, which GitHub lists for dispatch only on the default branch; restricting the environment to `main` closes the gap where a branch push could otherwise carry a different workflow body to the same secrets.
- Secrets to **move** from repository scope into this environment: `SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_AUTOMATION_BYPASS_SECRET`.

**Environment `rcap-acceptance-payment`** — covers `hosted_payment` only.

- Required reviewers: **recommended — at least one, Roger.** This phase transacts a real Stripe Sandbox Checkout.
- Deployment branch and tag restriction: same, `main` only.
- Secrets that belong **only** here: `HOSTED_STRIPE_TEST_SECRET`, `HOSTED_STRIPE_TEST_WEBHOOK_SECRET`.
- This environment also needs its own copies of `SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_AUTOMATION_BYPASS_SECRET`: a job sees the secrets of *its* environment, and `hosted_payment` deploys and runs the matrix as well as paying.

**No Production secret is copied into either environment.** Neither environment
receives a production Supabase key, a production database URL, a live Stripe key
or a production deployment token. The acceptance Supabase project ref
(`hyflxnlhpmiqxvvcoiia`) is pinned in the workflow file and is re-proved
non-production per run by the preflight.

**One conflict you must decide before this mapping is applied.** The requested
split puts the Stripe test secrets only in `rcap-acceptance-payment`. Three other
phases consume them: `hosted_checkout_gate` reads `HOSTED_STRIPE_TEST_SECRET`,
and `hosted_accept` and `hosted_full` run the payment-journey step because that
step is gated on `matrix == 'true'`. Under the mapping as specified those three
phases will run with no Stripe configuration and will report that plainly rather
than transacting. Either add the two secrets to `rcap-acceptance` as well, or
restrict Stripe-transacting work to `hosted_payment`. This task implemented the
mapping exactly as specified and did not silently widen it.

---

## 5. The worker-image authority split

`scripts/rcap-worker-authority-reconcile.mjs` assesses both pairs against nine
facts and selects a canonical pair only if exactly one meets every requirement.
It selected neither.

| Fact | A — `5ac0d8d6…` / `sha256:4e5b58e4…` | B — `57318c20…` / `sha256:2656abeb…` |
|---|---|---|
| Registry reference | `ghcr.io/roger-legalease/rcap-render-worker:5ac0d8d6…` | `…:57318c20…` |
| Immutable digest | `sha256:4e5b58e4…` | `sha256:2656abeb…` |
| Source commit | resolves; in `main` ancestry | resolves; in `main` ancestry |
| Worker image-input hash | `12b070a4dbcb46a32864d67e222e928e07d82c9a30da5e1a557c1ae61c89e7e2` | `0dca106f1382f55b4f7023f712f1b335d1213f6ffb7b2174232b1cf8c2aff3b7` |
| Build workflow / run | `publish-rcap-render-worker.yml`, run `32307070302` | same workflow, run `32599252817`, conclusion success |
| Health / readiness | **not proven** — no acceptance status recorded for this digest | **not proven** — `publication_recorded_image_acceptance_pending` |
| Source binding | OCI revision **absent**; the covering exception is `retired_not_in_force` | image states its own revision |
| Compatible with pinned application source `f7ed0ad3…` | **yes** — image inputs identical | **no** — 33 `src` paths differ |
| Can process the packet schema after 49–55 | **not proven** — no committed record | **not proven** — no committed record |
| Superseded by the publication record | **yes** — `superseded_by_source_drift` | no |

**`WORKER_AUTHORITY_BLOCKED`.** A is compatible with the pinned application
source but is recorded superseded and has no in-force source binding. B is the
current publication but is not image-input-equivalent to the pinned application
source, so it would fail the workflow's own equivalence gate. Neither has a
health/readiness acceptance result, and neither has any record of processing the
packet schema the manifest sequence produces. Selecting by date or by the higher
commit number would pick B and break the equivalence gate; selecting A would
deploy an image the publication record calls superseded.

**No pin was changed.** `AUTHORIZED_WORKER_SOURCE_SHA` and
`AUTHORIZED_WORKER_DIGEST` are byte-identical to `INFRA_BASE_SHA` in both
workflow files, and `data/rcap-staging-action.json` is untouched. The
reconciler runs as a workflow gate ahead of the first write for every phase that
pulls the image or deploys bytes, and exits non-zero, so `hosted_deploy` cannot
proceed while the split stands.

To resolve it, exactly one of:

1. Publish a worker image from a source commit that is image-input-equivalent to `f7ed0ad3…`, run `rcap-worker-image-acceptance.yml` against that digest, and update all four authorities together; or
2. Re-pin `AUTHORIZED_APPLICATION_SHA` to `57318c20…`, re-run the Phase 1 flow audit against those bytes, and run image acceptance for `sha256:2656abeb…`.

Option 2 invalidates the audit-to-source equivalence proof in section 6 until
the audit is re-run, so option 1 is the shorter path.

---

## 6. Audit-to-deployment byte equivalence

`scripts/rcap-audit-surface-equivalence.mjs` computes the audited surface rather
than asserting it. Roots: the 62 `src` paths the Phase 1 flow manifest names,
resolved against the real tree, plus 57 declared roots covering state selection
and screening, the screening/evaluation/profile APIs, consumer Briefcase
next-action routing, packet information and packet APIs, evaluation and
waiting-rule resolution, packet readiness and checkout routing, and the payment
and sponsorship guards. From those 112 roots it walks every relative and `@/`
import — static, re-export and dynamic — to a fixed point.

**Result: 190 files in the audited surface, all 190 byte-identical between
`d32267b8…` and `f7ed0ad3…`. Zero differ inside the surface. PASS.**

33 `src` files differ between the two commits. Every one is outside the closure,
and the reason recorded for each is derived — "not reachable from any audited
root by the transitive import closure computed above" — not a claim about which
directory it sits in. They are the partner-onboarding and partner-dashboard
paths PR #127 changed. SHA-256 for both sides of every path, inside and outside,
is in `data/rcap-render/audit-surface-equivalence.json`.

`tools_sha` `6d9e8792…` carries the same application bytes as `f7ed0ad3…`,
re-proven here so the report stands alone.

Any unexplained participant-facing difference would exit the script non-zero,
and the workflow runs it before deploying with the anti-skip gate requiring its
outcome.

---

## 7. Snapshot and recovery evidence

`scripts/lib/rcap-acceptance-schema-snapshot.mjs` captures 15 catalog sources —
schemas, extensions, tables, columns, constraints, indexes, functions, triggers,
table grants, routine grants, RLS policies, default privileges, storage buckets,
the migration ledger and the environment marker — plus the project reference,
source SHA, tools SHA and migration-manifest hash.

It is captured **before the first write of the run** (ahead of the ledger table,
the environment marker and the baseline loop) and again after the last, with a
structural diff of both counts and added/removed tables, functions, triggers and
policies. It records structure only: no row of participant data, no key, no
token, no password, and no production identifier — the only project reference it
holds is the pinned acceptance ref.

### Recovery model

- **Resume-safe** when the ledger is an exact prefix of the manifest with matching hashes. The run resumes at the first unapplied member. A ledger carrying all seven exact hashes is `noop` — verification only, nothing applied.
- **Delete and recreate required** when the ledger has a gap, records a phase the manifest does not authorize, records a phase at bytes the manifest does not authorize, or the sequence failed mid-apply. The instruction is explicit: delete the Supabase project, create a new one, re-run `hosted_preflight` (which re-proves the new project carries no production data), then `hosted_migrate`.
- **Partial states that force recreation:** phase 50 recorded with incomplete objects — it drops the phase-49 accounting tables, so the pre-drop state cannot be re-derived, and its `create trigger guard_packet_render_job_transition` has no matching drop, so a re-run collides. Phase 53 recorded with the wrong enqueue signature — it drops the 13-argument enqueue, and a half-state can create a consumer job with no consumer binding, which finalization then correctly refuses forever.
- **No production project is ever eligible** for delete-and-recreate. The recovery text says so in the string the runner prints.

---

## 8. Vercel Preview safeguards

The same Vercel project serves Production and Preview, so isolation is by
deployment target plus assertion. Required cases in
`scripts/rcap-hosted-acceptance-deploy.mjs`, all six of which must pass:

| Requirement | Case |
|---|---|
| Target is Preview, never Production | `deployed_to_preview_not_production` — asserts `target !== "production"` both when selecting a reuse candidate and after deploying |
| Deployment source SHA is exact | `deployment_carries_the_final_application_sha` |
| No production alias assigned or modified | `production_aliases_unchanged` — production aliases captured before and after |
| No production domain assigned or modified | `production_domains_unchanged` — **added by this task**; `/v9/projects/{id}/domains` compared before and after by name, verification state, branch binding and redirect. A Vercel alias and a Vercel domain are different objects on different endpoints, and comparing aliases alone left "a production domain was attached, verified or repointed" unobserved |
| No Production environment variable created, updated or deleted | `production_environment_variables_unchanged` — key, target and `updatedAt` compared; no value is read |
| Production deployment count and aliases unchanged after the run | `production_deployment_count_unchanged` — **added by this task**; production-target deployments counted before and after, which catches a promotion, a rollback and a redeploy without reading any value |

No `--prod` reaches the CLI argument vector and no alias command is issued.
Nothing was deployed by this task.

---

## 9. Tests

`node scripts/verify-rcap-acceptance-workflow-hardening.mjs` — **44/44 passing**,
static and dry-run only, no network, no database, no registry, no deployment.
Results are written to `data/rcap-render/workflow-hardening-verification.json`.

Coverage: the legacy double-selection reproduction; manifest authority and the
absence of regex selection; sequence 49–55 once each; phase 55 cannot run or be
recorded twice; hash mismatch, unknown migration and missing migration each stop
before write; the gate precedes every write in the runner; per-phase acceptance
authorization is recorded, read rather than assumed for 49 and 55, and a withheld
authorization stops before write; environment declared on the write-capable job
and absent from the read-only one; `hosted_payment` uses the separate payment
environment; the environment name is never empty; pinned-value refusal survives;
worker mismatch blocks deploy and no pin changed; equivalence failure blocks
deploy and the surface is computed not asserted; Vercel production target blocks
deploy across all six cases; Stripe live key blocks payment; snapshots capture
the required shape, carry no secret and precede the first write; the recovery
model is stated; product behaviour files unchanged; migration SQL unchanged;
audit artifacts unchanged; `git diff --check` clean; every manifest hash still
recomputes.

---

## Exact blockers

1. **`ACCEPTANCE_AUTHORIZATION_WITHHELD` — phases 50, 51, 52, 53, 54.** Recorded `queued` for staging in `data/rcap-staging-action.json`; phase 54's is "explicitly withheld by the authorizing instruction". The containing record's `status` is `prepared_queued_not_authorized` and its `authorizes` list is empty. `hosted_migrate` now refuses before any write. **Remedy:** Roger records an acceptance authorization for each withheld phase under `migrationsInApplyOrder[].scopedAuthorization.staging` (or `.acceptance`), naming the migration files and the acceptance environment, and the manifest is regenerated from it.
2. **`WORKER_AUTHORITY_BLOCKED`.** Neither candidate pair meets every requirement; no pin was changed. `hosted_deploy`, `hosted_accept`, `hosted_full`, `hosted_checkout_gate` and `hosted_worker_contract` are gated. **Remedy:** section 5, option 1 or 2.
3. **No GitHub Environment exists yet.** `rcap-acceptance` and `rcap-acceptance-payment` are declared in the workflow but not created in GitHub Settings, and secrets have not been moved. Until they exist, a run of a write-capable phase will fail to resolve its environment. **Remedy:** the checklist in section 4.
4. **The Stripe-secret placement conflict** in section 4 is a decision, not a defect: as specified, `hosted_accept`, `hosted_full` and `hosted_checkout_gate` lose Stripe configuration.

## Safe next action

Create the two GitHub Environments and move the secrets per section 4, then run
`hosted_preflight` — the only phase that is fully unblocked, writes nothing, and
now runs in the read-only job with no write-environment secrets. Everything
downstream of it waits on blockers 1 and 2.
