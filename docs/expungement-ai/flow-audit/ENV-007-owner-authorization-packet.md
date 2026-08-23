# ENV-007 — Owner Authorization Packet

Read-only. Nothing in this packet was executed: no migration was applied, no workflow was dispatched, no Supabase project was created or altered, no Vercel deployment was made, no user or matter was seeded, and no product file was changed.

- Branch: `claude/expai-flow-audit-p1`
- Audit HEAD: `d32267b8135ee18d33fdf6d4178ea87127138efe`
- Required HEAD: `d32267b8135ee18d33fdf6d4178ea87127138efe` — **MATCH: YES**

---

## 1. Environment identity

| Field | Value | Source | Production? |
|---|---|---|---|
| `GITHUB_ENVIRONMENT_NAME` | `rcap-acceptance` | env.STAGING_ENVIRONMENT_NAME in .github/workflows/rcap-hosted-acceptance-staging.yml:103 and .github/workflows/rcap-f1-ephemeral-staging.yml:81 | **no** |
| `SUPABASE_PROJECT_REF` | `hyflxnlhpmiqxvvcoiia` | env.AUTHORIZED_ACCEPTANCE_PROJECT_REF in .github/workflows/rcap-hosted-acceptance-staging.yml:100; enforced by the step 'Refuse any input that is not the authorized pinned value' | **no** |
| `SUPABASE_PROJECT_HOST` | `hyflxnlhpmiqxvvcoiia.supabase.co` | derived by scripts/rcap-hosted-acceptance-preflight.mjs as https://<ref>.supabase.co; the Management API is addressed as https://api.supabase.com/v1/projects/<ref>/… | **no** |
| `SUPABASE_ENVIRONMENT_CLASS` | `acceptance / non-production` | proven per run by the preflight cases acceptance_project_carries_no_production_data, acceptance_ref_disjoint_from_vercel_production and acceptance_ref_absent_from_every_production_value | **no** |
| `VERCEL_ORG_ID_OR_SLUG` | *(secret — not printed)* | GitHub Actions secret VERCEL_ORG_ID, forwarded by .github/workflows/rcap-f1-ephemeral-staging.yml to the reusable workflow's `secrets:` block | **no** |
| `VERCEL_PROJECT_ID_OR_SLUG` | *(secret — not printed)* | GitHub Actions secret VERCEL_PROJECT_ID, forwarded the same way | **no** |
| `VERCEL_ENVIRONMENT_CLASS` | `Preview` | scripts/rcap-hosted-acceptance-deploy.mjs asserts d.target !== 'production' and requires the cases deployed_to_preview_not_production, production_aliases_unchanged and production_environment_variables_unchanged; no --prod flag and no alias command appears anywhere in the workflow | **no** |

- **GITHUB_ENVIRONMENT_NAME** — This is a plain workflow environment variable. NO job in either workflow declares a GitHub `environment:` key, so there is no GitHub Environment carrying protection rules, required reviewers or environment secrets. An authorization cannot be bound to it; it is a label in evidence, not a gate.
- **SUPABASE_ENVIRONMENT_CLASS proof** — identity via the Supabase Management API; emptiness via participant-witness table row counts where any nonzero count is fatal; disjointness by hash comparison against the production Supabase URL plus an exhaustive absence sweep of the acceptance ref across every production-target value. The production URL is hashed, never printed.
- **VERCEL_ORG_ID_OR_SLUG** — SECRET — the value is not printed here. Only its source field is named, as instructed.
- **VERCEL_PROJECT_ID_OR_SLUG** — SECRET — the value is not printed here. Only its source field is named, as instructed.
- **VERCEL_ENVIRONMENT_CLASS** — The Vercel PROJECT is the same project that serves production; the TARGET is Preview. Isolation is by deployment target and by the three assertions above, not by a separate Vercel project.

**None of the seven is a production identity.** The Supabase side is a separate project ref proven non-production per run; the Vercel side is the production project addressed at the Preview target, isolated by three deploy-time assertions rather than by a second project.

---

## 2. Workflow inputs for `hosted_migrate` and `hosted_full`

Dispatch entry point: .github/workflows/rcap-f1-ephemeral-staging.yml (workflow_dispatch), which calls .github/workflows/rcap-hosted-acceptance-staging.yml (workflow_call only)

The reusable workflow resolves from the ref the dispatch runs on, so the AUTHORIZED_* constants that gate the run come from the workflow file on that ref, while the scripts and migrations come from the tools_sha checkout. Both workflow files are byte-identical between tools_sha and origin/main, so dispatching on main applies exactly the pins recorded here.

Workflow files byte-identical between `tools_sha` and `origin/main`: **yes**.

| Input | Exact value | Provenance | Pinned | Validation performed |
|---|---|---|---|---|
| `mode` | `hosted_migrate or hosted_full` | workflow_dispatch choice on .github/workflows/rcap-f1-ephemeral-staging.yml (the dispatch entry point, because GitHub lists workflow_dispatch only for default-branch files) | no | restricted to the declared `options:` list; mapped to the reusable workflow's `phase` input by a nested conditional |
| `phase` | `migrate or full` | derived by the F1 caller from `mode`; not typed by a human | no | the step 'Normalize the execution contract for this phase' fails closed on any unrecognised phase |
| `application_sha` | `f7ed0ad3a8f37a0c1446b62760b1a36fb163c926` | env.AUTHORIZED_APPLICATION_SHA in both workflow files | **yes** | string equality against AUTHORIZED_APPLICATION_SHA; must resolve; must be an ancestor of origin/main |
| `worker_source_sha` | `5ac0d8d6910aec3dc6259b2d4da6931abc5af7e8` | env.AUTHORIZED_WORKER_SOURCE_SHA in both workflow files | **yes** | string equality against AUTHORIZED_WORKER_SOURCE_SHA; must resolve; must be an ancestor of origin/main |
| `worker_digest` | `sha256:4e5b58e4492289446bcbdd100bb39dcd13dd4512916679fa2a252e4532ab9530` | env.AUTHORIZED_WORKER_DIGEST in both workflow files | **yes** | string equality against AUTHORIZED_WORKER_DIGEST. The image itself is NOT pulled for the migrate phase, which performs no deploy, no matrix and no gate. |
| `tools_sha` | `6d9e8792b8c68671220cac5f294562e3b3ba1b25` | derived once, below, and stated as a fixed 40-character SHA — never as a branch name | **yes** | ^[0-9a-f]{40}$; resolves; ancestor of origin/main; byte-identical to application_sha across the application byte paths and to worker_source_sha across the worker image-input paths; then `git checkout --detach` |
| `supabase_project_ref` | `hyflxnlhpmiqxvvcoiia` | env.AUTHORIZED_ACCEPTANCE_PROJECT_REF in the hosted workflow | **yes** | string equality against AUTHORIZED_ACCEPTANCE_PROJECT_REF, then ^[a-z]{20}$ in the preflight and migrate scripts |
| `preview_hostname` | `(empty)` | operator-supplied; leave empty for hosted_migrate | no | when non-empty must match ^[A-Za-z0-9.-]+\.vercel\.app$ |
| `preview_deployment_id` | `(empty)` | operator-supplied; leave empty for hosted_migrate | no | when non-empty must match ^dpl_[A-Za-z0-9]+$; required only for checkout_gate |
| `contradiction_job_id` | `(empty)` | operator-supplied; hosted_worker_contract only | no | not validated for other phases |

### The four additional pinned inputs

Beyond `application_sha`, the workflow refuses any run whose `worker_source_sha`, `worker_digest`, `tools_sha`, `supabase_project_ref` is not the authorized value.

```
SOURCE_SHA                     = f7ed0ad3a8f37a0c1446b62760b1a36fb163c926
TOOLS_SHA                      = 6d9e8792b8c68671220cac5f294562e3b3ba1b25
OTHER_PINNED_INPUTS            = worker_source_sha, worker_digest, tools_sha, supabase_project_ref
```

### `TOOLS_SHA_DERIVATION`

Fixed, not derived from a moving branch at execution time. 6d9e8792b8c68671220cac5f294562e3b3ba1b25 is the commit 'Let the worker see the packet the application already wrote (#126)', dated 2026-08-20. It is the newest commit reachable from origin/main that satisfies all four gates the workflow applies, and it is stated here as a literal 40-character SHA so the run cannot drift with main.

| Gate the workflow applies | Result |
|---|---|
| `^[0-9a-f]{40}$` | yes |
| resolves to a commit | yes |
| ancestor of `origin/main` | yes |
| byte-identical to `application_sha` on the application byte paths | yes |
| byte-identical to `worker_source_sha` on the worker image-input paths | yes |

`origin/main` head when this packet was built: `dd93579871962260b12918e54c44cf9bf1e81529`. `TOOLS_SHA` is stated as a literal 40-character SHA precisely so the run does not follow that head.

### `TOOLS_SHA_CONTAINS_REQUIRED_SCRIPTS` = **yes**

| Path | Blob SHA at `tools_sha` |
|---|---|
| `scripts/verify-rcap-vercel-failure-audit.mjs` | `865418df38ea35528c39079b8f4f515af4c07f43` |
| `scripts/rcap-hosted-acceptance-preflight.mjs` | `7feb3fc627a059a7654fc2b538df9664b051fb5e` |
| `scripts/rcap-vercel-failure-audit.mjs` | `e576e806f9a69bacbdac1fac5ed52d388137ba8e` |
| `scripts/rcap-hosted-acceptance-migrate.mjs` | `15e48082cea1fd66a48968f646a8470b156021c8` |
| `scripts/verify-rcap-hosted-checkout-gate.mjs` | `b910c130f02688da52264b0b655a0932071047eb` |
| `scripts/rcap-hosted-resolve-preview.mjs` | `49040d5c8d37fb07fc8d65427eaad0cbf38328a9` |
| `scripts/rcap-hosted-acceptance-deploy.mjs` | `58f0c0105e9ab986973aff66305e602386498441` |
| `scripts/rcap-hosted-acceptance-auth-config.mjs` | `66d059b1032b7a49b90cb88cc09080eeba142c9c` |
| `scripts/rcap-worker-contract-contradiction.mjs` | `cb5d370ce4942997d9667b571bcd778d4c98a52a` |
| `scripts/rcap-hosted-checkout-gate.mjs` | `403e5d3e0e18d3a8be3bb39d0b80201bdb0b063f` |
| `scripts/rcap-hosted-acceptance-matrix.mjs` | `0d9fd80bf418326cf0e7d6099d755c67c8fbd1cc` |
| `scripts/verify-rcap-target-worker-journey.mjs` | `907ad2c57c934353d3371b782b00d31a6cc4f000` |
| `scripts/verify-rcap-target-replay-scope.mjs` | `d96247ed5dfa252da002c7ef6ad22f8c40c3f67f` |
| `scripts/verify-rcap-immutable-image-preflight.mjs` | `0cfaaf42177241fa041028beb6ce789e8ee2b4a7` |
| `scripts/verify-rcap-hosted-job-read-columns.mjs` | `a5a549c739dab941f12db3f9f5a2baf65098e662` |
| `scripts/verify-rcap-packet-contract.mjs` | `3f4c17b86756a62ad760fb9e6ef4ed169c0d4df3` |
| `scripts/rcap-hosted-acceptance-payment.mjs` | `b9b57e9560298fa3bacca77670c8e2313b51f100` |
| `scripts/rcap-hosted-acceptance-gallery.mjs` | `8a0005e0c2f530a883b2cbaaf27ec8b879af6853` |
| `scripts/verify-rcap-hosted-acceptance-verdicts.mjs` | `e78e85cd6ff99e5dfed4d143d8620aff84964f15` |
| `.github/workflows/rcap-hosted-acceptance-staging.yml` | `fef16fa36e26c8eb3d5aaaafc657bfc5bc71bb15` |
| `.github/workflows/rcap-f1-ephemeral-staging.yml` | `fd2b6fedad39213b553cb5544ffaa670fd02ea3d` |
| `data/rcap-staging-action.json` | `813ae74eccbd45be7f7a19f410a8da56c5595f53` |
| `data/rcap-staging-authorization-readiness.json` | `93d008d78218ad7c827274a6d64126cdf0be0294` |

### Secrets, by step

No secret value appears in this packet. Only the secret's name, whether the workflow declares it required, and which step consumes it.

| Secret | Declared required | Consumed by | Needed for `hosted_migrate` |
|---|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | yes | preflight step 'Prove the credentials and the acceptance project'; migrate step 'Apply the authorized sequence to the acceptance project' | **yes** |
| `VERCEL_TOKEN` | yes | preflight (scope full), Preview resolution, deploy | no — declared required by the reusable workflow even though PREFLIGHT_SCOPE=supabase_only for migrate |
| `VERCEL_ORG_ID` | yes | same as VERCEL_TOKEN | no |
| `VERCEL_PROJECT_ID` | yes | same as VERCEL_TOKEN | no |
| `HOSTED_STRIPE_TEST_SECRET` | no | deploy and payment phases only | no — refused unless it begins sk_test_ |
| `HOSTED_STRIPE_TEST_WEBHOOK_SECRET` | no | deploy and payment phases only | no — refused unless it begins whsec_ |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | no | matrix probes against a Preview protected by Vercel Authentication | no |

### Phase execution contract

| Phase | Deploy | Matrix | Checkout gate |
|---|---|---|---|
| `full` | yes | yes | yes |
| `deploy` | yes | no | no |
| `accept` | no | yes | no |
| `payment` | yes | yes | no |
| `checkout_gate` | no | no | yes |
| `migrate` | no | no | no |
| `preflight` | no | no | no |
| `vercel_audit` | no | no | no |
| anythingElse | FAIL CLOSED | | |

`hosted_migrate` therefore performs **no deploy, no matrix and no checkout gate**. It writes to the acceptance Supabase project and nowhere else.

---

## 3. The authorized migration sequence

The request named migrations 50–54. **The sequence the workflow applies is 49–55 — seven files.** All seven are analysed below; 49 and 55 are marked as outside the named range.

| Seq | File | Bytes | Lines | Git blob SHA | SHA-256 | Present at `tools_sha` | Matches both authorization records |
|---|---|---|---|---|---|---|---|
| 49 | `supabase/phase-49-rcap-packet-render-jobs.sql` | 19813 | 499 | `4a23b3df3a4b953ade5732a4af3e29ef64445483` | `2ad3726d8c2c02058a0545b940d84865b30de95b8a367a081a08cf709a7bc2d6` | yes, identical blob | yes |
| 50 | `supabase/phase-50-rcap-packet-delivery-hardening.sql` | 52974 | 1308 | `047864ef7993fd5eb9a326caae7b79516df023b0` | `84facd03b1362679898ba599db4247c2bafe6e675ee1691c37181adbde9e9057` | yes, identical blob | yes |
| 51 | `supabase/phase-51-rcap-consumer-payment-gate.sql` | 13771 | 330 | `544c39ee48e252267c0879a4264e65091080f72c` | `3c3e971c1fdb3382f4caef3e14c683d237033dc3949518a144b01d23b908e1ba` | yes, identical blob | yes |
| 52 | `supabase/phase-52-rcap-consumer-payment-authority.sql` | 36326 | 856 | `30265d311167cdb2bd138350c49700c23e98775b` | `c906068f7800df7dd9a34baff5830269f50bab3ddc7224b72f2e7369ff256bd3` | yes, identical blob | yes |
| 53 | `supabase/phase-53-rcap-consumer-job-binding.sql` | 10072 | 221 | `6bd0cf331f1bc402f133ba88fac33f3131cdd9d1` | `469ece83b54ef840f8571d90f0fbeed3ee16f246e906f0e44cc82ecac899b22f` | yes, identical blob | yes |
| 54 | `supabase/phase-54-rcap-person-namespace-hardening.sql` | 9115 | 211 | `7aff681cc4ab7dfe09d899c0ba1fd686a88ccc91` | `3114c1d26ad6f70a0eb78331c2729e035a53b4f9af9ab9cb36feb3a5fb2becac` | yes, identical blob | yes |
| 55 | `supabase/phase-55-expungement-matter-payment-binding.sql` | 28578 | 688 | `49eb1ef02dd5daab744f443e7b6254a2502451e2` | `ed16e56e17882b79a494fe60779101031bfb706211930ac49b9cdc7059bc17a3` | yes, identical blob | yes |

Every file is present at `tools_sha` with the identical git blob, and every SHA-256 recomputed from disk matches both `data/rcap-staging-action.json` and `data/rcap-staging-authorization-readiness.json`. The migrate script's hash gate would pass.

### Phase 49 — `phase-49-rcap-packet-render-jobs.sql`

**Purpose.** Creates packet_render_jobs and its state machine. Included here because the workflow's authorized sequence is 49 through 55, not 50 through 54: it is the base every later phase alters.

- **Tables affected:** public.packet_render_jobs (created)
- **Columns affected:** the phase-49 base column set, including status, renderer_kind, source_sha256 NOT NULL, output_sha256, normalized_output_sha256, output_storage_path
- **Functions / triggers:** the phase-49 enqueue/claim/finalize set, superseded in 50-53
- **RLS / policies / grants:** packet_render_jobs_service_role_all (FOR ALL) — dropped again by phase 50
- **Storage or auth effects:** none
- **Additive:** yes
- **Destructive:** no
- **Idempotent:** no
- **Prerequisite:** the pre-49 baseline schema (partner_records, rcap_persons, rcap_document_packets, consumer_briefcase_items, screening_sessions, partner_entitlement)
- **Rollback / compensating action:** drop the phase-49 objects; on the acceptance project the compensating action is to delete and recreate the project, which holds no production data by construction
- **Why the hosted flow audit requires it:** Without packet_render_jobs no packet can be enqueued, so no paid or sponsored terminal in the flow manifest can be exercised end to end.
- **Authorization id on record:** `auth-2026-08-10-phase-49-packet-render-jobs`

### Phase 50 — `phase-50-rcap-packet-delivery-hardening.sql`

**Purpose.** Packet delivery hardening: fencing tokens, retry exhaustion with terminal dispositions, the atomic finalization transaction, delivery events, and packet accounting re-keyed from the mutable partner_slug onto immutable database IDs.

- **Tables affected:** public.packet_render_jobs (altered); public.partner_packet_entitlement (created); public.packet_credit_ledger (created); public.packet_delivery_events (created); public.rcap_packet_credit_consumptions (DROPPED); public.rcap_partner_packet_allocation (DROPPED)
- **Columns affected:** packet_render_jobs +renderer_version, +briefcase_item_id, +partner_id, +person_id, +matter_id, +max_attempts, +next_attempt_at, +claim_expires_at, +fencing_token, +failure_disposition, +last_error_detail, +manual_requeue_authorized_by, +output_byte_count, +container_digest, +delivery_eligibility, +accounting_result, +credit_ledger_id (17 added); packet_render_jobs.source_sha256 ALTER COLUMN DROP NOT NULL, compensated by packet_render_jobs_source_presence_check (null legal only for renderer_kind = 'packet_document_v1')
- **Functions / triggers:** functions (19): rcap_packet_mutation_authority, set_partner_packet_entitlement_updated_at, guard_packet_render_job_insert, guard_packet_render_job_transition, guard_packet_render_job_delete, guard_packet_credit_ledger, guard_packet_delivery_events, enqueue_packet_render_job, claim_packet_render_job, assert_packet_render_job_fencing, start_packet_render, start_packet_validation, fail_packet_render_job, release_expired_packet_render_claims, requeue_retryable_packet_render_jobs, requeue_packet_render_job_manual, finalize_packet_render_job, record_packet_delivery_event, packet_entitlement_balance; triggers (6): set_partner_packet_entitlement_updated_at, guard_packet_render_job_insert, guard_packet_render_job_transition, guard_packet_render_job_delete, guard_packet_credit_ledger, guard_packet_delivery_events; drops the phase-49 packet_render_jobs_guard_transition() function and the 2-argument claim_packet_render_job, and drops consume_rcap_packet_credit(text, text, uuid)
- **RLS / policies / grants:** DROP POLICY packet_render_jobs_service_role_all — direct DML for runtime roles is exactly what the boundary forbids; ENABLE ROW LEVEL SECURITY on partner_packet_entitlement, packet_credit_ledger, packet_delivery_events, with NO permissive policy for any runtime role; revokes ALL on all four protected tables from public, anon, authenticated, rcap_render_worker, rcap_packet_delivery and from service_role, then re-grants service_role SELECT only (plus INSERT/UPDATE on partner_packet_entitlement, which is configuration rather than accounting evidence)
- **Storage or auth effects:** storage: creates or updates the private bucket rcap-packet-artifacts-private (public=false, 50 MiB limit, application/pdf only), guarded by to_regclass('storage.buckets'); auth: none; roles: creates anon, authenticated, rcap_render_worker, rcap_packet_delivery if absent (nologin)
- **Additive:** no
- **Destructive:** yes — DROP TABLE rcap_packet_credit_consumptions and rcap_partner_packet_allocation, DROP FUNCTION consume_rcap_packet_credit. Both tables are unapplied everywhere and empty by construction, and the drop happens inside the same transaction that creates their replacements. It is still a DROP TABLE and is named as one here.
- **Idempotent:** no — Mostly guarded (create table if not exists, add column if not exists, create index if not exists, drop constraint if exists before add), but CREATE TRIGGER is unconditional after DROP TRIGGER IF EXISTS, so a re-run raises a duplicate-object error rather than a no-op. The migrate script treats a duplicate-object code as 'objects already present, adopted' and records it as such.
- **Prerequisite:** phase 49
- **Rollback / compensating action:** no down migration exists. On the acceptance project the compensating action is to delete and recreate the project; the ledger table rcap_acceptance_migration_ledger then no longer records the phase and the sequence reapplies from the baseline.
- **Why the hosted flow audit requires it:** delivery_eligibility and accounting_result are the columns the runtime checkout guard reads. Without phase 50 the guard has nothing to refuse on, so the audit cannot distinguish 'the product refused' from 'the column does not exist'.
- **Authorization id on record:** `auth-2026-08-10-phase-50-packet-delivery-hardening`

### Phase 51 — `phase-51-rcap-consumer-payment-gate.sql`

**Purpose.** Closes the consumer payment gate. Before it, an unsponsored job was given accounting_result 'zero_charge' and delivery_eligibility 'eligible' — meaning any job with no partner sponsor became deliverable on the strength of having no sponsor.

- **Tables affected:** public.packet_render_jobs (constraint only)
- **Columns affected:** none added; packet_render_jobs_accounting_result_check widened to admit 'consumer_payment_required'
- **Functions / triggers:** functions (2): consumer_packet_payment_valid(uuid) created; finalize_packet_render_job replaced forward; triggers: none
- **RLS / policies / grants:** no policy change; revokes EXECUTE on consumer_packet_payment_valid(uuid) from public and anon
- **Storage or auth effects:** auth: reads consumer_briefcase_items, which references auth.users; the probe resolves that table dynamically so an absent table answers 'cannot prove payment' rather than erroring
- **Additive:** yes
- **Destructive:** no
- **Idempotent:** yes — create or replace function plus drop-constraint-then-add. A re-run converges on the same end state.
- **Prerequisite:** phases 49, 50
- **Rollback / compensating action:** replace finalize_packet_render_job with the phase-50 body and narrow the accounting_result constraint. Not scripted; the acceptance-project compensating action is delete and recreate.
- **Why the hosted flow audit requires it:** The flow manifest classifies 284 pathways as paid_packet_intended. Without phase 51 an unpaid consumer job is deliverable, so every paid terminal the audit exercises would pass for the wrong reason.
- **Authorization id on record:** `auth-2026-08-10-phase-51-consumer-payment-gate`

### Phase 52 — `phase-52-rcap-consumer-payment-authority.sql`

**Purpose.** Consumer payment authority. Closes four proven bypasses (G1/G1b: a participant wrote payment_status='paid' on their own row; G11: one paid item authorized unlimited matters because the consumption unit hashed the render job id; G12: participant B's paid item authorized a job for participant A).

- **Tables affected:** public.consumer_briefcase_items (altered); public.packet_render_jobs (altered); public.consumer_packet_payment_consumption (created)
- **Columns affected:** consumer_briefcase_items +currency, +provider_event_id, +payment_authority, +payment_recorded_at, +payment_recorded_by (5 added); packet_render_jobs +consumer_briefcase_item_id, +consumer_auth_user_id (2 added); constraints: consumer_briefcase_items_currency_check, consumer_briefcase_items_payment_authority_check, consumer_briefcase_items_paid_requires_server_evidence, unique index consumer_briefcase_items_provider_event_uk; packet_render_jobs_accounting_result_check re-stated
- **Functions / triggers:** functions (4): record_consumer_packet_payment (SECURITY DEFINER, server-role only), consumer_packet_payment_authority(uuid, uuid), packet_render_jobs_consumer_binding_immutable, finalize_packet_render_job replaced forward; triggers (1): packet_render_jobs_consumer_binding_immutable_trg on packet_render_jobs
- **RLS / policies / grants:** revokes INSERT and UPDATE on consumer_briefcase_items from anon and authenticated at table level, then re-grants authenticated column-level INSERT/UPDATE on the safe columns only and SELECT on the table. RLS keeps deciding WHICH ROW; column grants now decide WHICH FIELDS, and payment is not among them.; ENABLE ROW LEVEL SECURITY on consumer_packet_payment_consumption with ALL revoked from anon and authenticated; revokes EXECUTE on record_consumer_packet_payment and consumer_packet_payment_authority from public and anon
- **Storage or auth effects:** auth: this is the phase that removes an authenticated participant's ability to self-declare payment on their own auth.users-owned row. It changes no Supabase Auth setting, no JWT, and no session logic — only table and column privileges in the public schema.
- **Additive:** yes
- **Destructive:** no — No object is dropped. It does WITHDRAW privileges (INSERT/UPDATE on consumer_briefcase_items from anon and authenticated) — reversible, but a behaviour change for any client that wrote those columns directly.
- **Idempotent:** yes — Guarded throughout (add column if not exists, create table if not exists, create unique index if not exists, drop-then-add constraints, create or replace function, drop trigger if exists before create trigger).
- **Prerequisite:** phases 26, 27, 28, 49, 50, 51
- **Rollback / compensating action:** re-grant the withdrawn table privileges and restore the phase-51 finalize body. Not scripted; acceptance-project compensating action is delete and recreate.
- **Why the hosted flow audit requires it:** The audit's negative control is exactly G1: prove a participant cannot set payment_status='paid'. Without phase 52 that control fails and no payment finding from the hosted run would be trustworthy.
- **Authorization id on record:** `auth-2026-08-11-phase-52-consumer-payment-authority`

### Phase 53 — `phase-53-rcap-consumer-job-binding.sql`

**Purpose.** Binds consumer identity inside the original insert. After phase 52 the gate was correct but unreachable through the sanctioned path: enqueue had no parameter for the consumer binding and service_role cannot UPDATE packet_render_jobs after the insert, so every legitimate paid consumer job was created with consumer_auth_user_id null and correctly returned consumer_payment_required.

- **Tables affected:** none altered
- **Columns affected:** none
- **Functions / triggers:** DROPS the 13-argument enqueue_packet_render_job(uuid, text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, integer); creates one 15-argument successor adding p_consumer_briefcase_item_id and p_expected_consumer_auth_user_id, with no defaults, so a 13-argument call resolves to no function at all; the successor carries two modes decided by p_partner_id, each rejecting the other's shape; triggers: none
- **RLS / policies / grants:** no policy change; the phase-50 grant block does not carry to a changed signature, so EXECUTE is revoked from public, anon, authenticated, rcap_render_worker and rcap_packet_delivery and granted to service_role only
- **Storage or auth effects:** auth: reads consumer_briefcase_items (references auth.users), resolved dynamically
- **Additive:** no
- **Destructive:** yes — DROP FUNCTION of the 13-argument enqueue. Deliberate: kept alongside, it would remain a service-role path that creates a job with null consumer bindings. Any caller still passing 13 arguments breaks at the call site rather than silently creating an unbound job.
- **Idempotent:** yes — drop function if exists plus create or replace function.
- **Prerequisite:** phases 26, 27, 28, 49, 50, 51, 52
- **Rollback / compensating action:** recreate the 13-argument signature from the phase-50 file. Doing so reopens the unbound-job window and should not be done on an environment serving a participant.
- **Why the hosted flow audit requires it:** This is the phase that makes a paid consumer packet reachable at all. Without it the hosted matrix would record consumer_payment_required for every consumer journey, which the audit would have to report as a product defect when it is a schema gap.
- **Authorization id on record:** `auth-2026-08-11-phase-53-consumer-job-binding`

### Phase 54 — `phase-54-rcap-person-namespace-hardening.sql`

**Purpose.** rcap_persons hardening and reserved-namespace enforcement. rcap_persons had no row-level security, no policies and no explicit grants anywhere in supabase/, so it inherited whatever the project's default privileges hand anon and authenticated — on a stock Supabase project, full table access. Phase 53's consumer binding put consumer identities into that table.

- **Tables affected:** public.rcap_persons (RLS, policy, grants, check constraint); public.partner_records (trigger only)
- **Columns affected:** none added; adds check constraint rcap_persons_reserved_namespace_shape binding partner_slug = 'expungement-ai-consumer' to match_key ~ '^consumer:[0-9a-f]{64}$' and forbidding a consumer-shaped match_key in any other namespace
- **Functions / triggers:** functions (2): rcap_consumer_person_namespace(), rcap_guard_reserved_partner_slug(); triggers (1): rcap_guard_reserved_partner_slug_trg BEFORE INSERT OR UPDATE OF partner_slug ON public.partner_records
- **RLS / policies / grants:** ENABLE ROW LEVEL SECURITY on rcap_persons; CREATE POLICY rcap_persons_service_role_all FOR ALL TO service_role USING (true) WITH CHECK (true); REVOKE ALL on rcap_persons from anon and from authenticated; GRANT SELECT, INSERT, UPDATE, DELETE to service_role; the revoke and the policy are both applied because a later `alter default privileges` would otherwise undo the revoke alone
- **Storage or auth effects:** storage: none. auth: none — no Supabase Auth setting, JWT claim or session rule is touched; this is public-schema table privilege only.
- **Additive:** yes
- **Destructive:** no — No object dropped, no column dropped, no row rewritten. It WITHDRAWS anon and authenticated privileges on rcap_persons. Every existing caller already uses the service-role client, so the revoke removes no access anything relies on — but if a client did read rcap_persons with the anon key, it stops working here.
- **Idempotent:** yes — Every block is guarded by to_regclass and pg_roles existence checks, with drop-then-create for the policy, trigger and constraint.
- **Prerequisite:** phases 26, 27, 28, 49, 50, 51, 52, 53
- **Rollback / compensating action:** drop the constraint, the trigger, the policy, disable RLS and re-grant. Doing so restores a table with no row-level security holding consumer identities.
- **Why the hosted flow audit requires it:** The hosted audit writes a person row for every consumer journey. Without phase 54 those rows sit in a table an anon key can read, which would make the hosted environment itself a finding before any flow was measured.
- **Authorization id on record:** `auth-2026-08-11-phase-54-person-namespace-hardening`

### Phase 55 — `phase-55-expungement-matter-payment-binding.sql`

**Purpose.** Expungement matter payment binding. Present in the workflow's authorized sequence and applied by it, though outside the 50-54 range named in the request.

- **Tables affected:** see the file; analysed here only to the extent of proving it is in the sequence the workflow will apply
- **Columns affected:** not analysed in this packet
- **Functions / triggers:** not analysed in this packet
- **RLS / policies / grants:** not analysed in this packet
- **Storage or auth effects:** not analysed in this packet
- **Additive:** not analysed
- **Destructive:** not analysed
- **Idempotent:** not analysed
- **Prerequisite:** phases 49-54
- **Rollback / compensating action:** not analysed in this packet
- **Why the hosted flow audit requires it:** FLAGGED FOR THE OWNER: the request named migrations 50-54. The sequence the workflow actually applies is 49-55 (seven files). Phase 55 is applied twice by construction — once in the baseline pass, because the baseline filter excludes only /^phase-(49|50|51|52|53|54)-/, and again as the last entry of the authorized sequence, where the duplicate-object codes make it record as 'adopted'. This is not a data risk but it is not what the file header describes, and the owner should know before authorizing.
- **Authorization id on record:** `auth-2026-08-16-pr101-release-integration`

---

## 4. Safety proof — what aborts before anything is written

| # | Guard | Where | What it proves | Aborts before | Skippable? |
|---|---|---|---|---|---|
| G-01 | Pinned-input refusal | .github/workflows/rcap-hosted-acceptance-staging.yml, step 'Refuse any input that is not the authorized pinned value' (first step of the preflight job, before checkout) | application_sha, worker_source_sha, worker_digest and supabase_project_ref must each equal the AUTHORIZED_* constant in the workflow file; tools_sha must match ^[0-9a-f]{40}$; preview_deployment_id must match ^dpl_[A-Za-z0-9]+$ and preview_hostname ^[A-Za-z0-9.-]+\.vercel\.app$ when supplied. | the repository is even checked out | no — it is unconditional, has no `if:`, and runs under `set -euo pipefail` |
| G-02 | Ancestry and image-input equivalence | same job, step 'Verify ancestry and image-input equivalence of every pinned SHA' | each of application_sha, worker_source_sha and tools_sha resolves to a commit AND is an ancestor of origin/main; tools_sha is byte-identical to application_sha across the application byte paths and to worker_source_sha across the worker image-input paths. Then `git checkout --detach tools_sha`, so every later step runs the pinned tools. | any credential is read | no — unconditional |
| G-03 | Acceptance-project identity and emptiness proof | scripts/rcap-hosted-acceptance-preflight.mjs, run as 'Prove the credentials and the acceptance project' (PREFLIGHT_SCOPE=supabase_only for the migrate phase) | the project ref matches ^[a-z]{20}$; identity is confirmed through the Supabase Management API; every participant-witness table is absent or has zero rows (acceptance_project_carries_no_production_data — any nonzero count is fatal); the ref is disjoint from the Vercel production configuration (acceptance_ref_disjoint_from_vercel_production) and absent from every production-target value (acceptance_ref_absent_from_every_production_value). The only SQL it runs is `select current_database() as db, version() as version`. The production Supabase URL is hashed for comparison and never printed. | the migrate step, which is explicitly commented as guarded by it | not for any phase except vercel_audit, which performs no writes |
| G-04 | Two-record migration hash gate | scripts/rcap-hosted-acceptance-migrate.mjs section 1 | every file in the authorized sequence is re-hashed from the checked-out disk and must match BOTH data/rcap-staging-action.json AND the independently maintained data/rcap-staging-authorization-readiness.json. One mismatch anywhere writes migrate.json with passed:false and exits 1 with nothing applied. | the first write of the sequence | no |
| G-05 | Environment marker stamped before the first write | migrate script section 1b | rcap_acceptance_environment_marker names the project ref it was stamped on, so a copy of the row in any other database identifies the wrong project and is refused by the preflight. It is the mechanism that lets a one-time emptiness proof keep meaning something on later runs. The table is revoked from anon and authenticated and has RLS enabled. | n/a — this is the record, not a gate | no |
| G-06 | Required-baseline-tables stop | migrate script section 2 | after the baseline pass, partner_records, rcap_document_packets, rcap_persons, consumer_briefcase_items, screening_sessions and partner_entitlement must all exist. A missing table exits 1 with the message that phases 49-54 were NOT applied. Individual baseline file failures are recorded but non-blocking; the baseline is judged on its result. | the authorized sequence | no |
| G-07 | Migration ledger with per-phase hash | migrate script section 3, table rcap_acceptance_migration_ledger | each phase is applied once and recorded against the exact SHA-256 applied. A later run skips a phase whose recorded hash matches disk. A phase whose recorded hash DIFFERS is never silently re-applied, because G-04 has already refused the run. A duplicate-object error is recorded as 'objects_already_present_adopted' rather than counted as work done. | a second destructive apply on an already-built environment | no |
| G-08 | Indivisible sequence | migrate script section 3 loop | the loop breaks on the first failure and the case authorized_sequence_applied_in_order fails, with the recorded reason that the sequence is indivisible and an environment that stops mid-way must not serve a participant. An environment that stopped at 51 would reintroduce RCAP-SEC-001 by construction. | any claim of a usable environment | no |
| G-09 | Live negative control (RCAP-SEC-001) | migrate script section 4 readback | a throwaway auth.users identity and an unpaid consumer_briefcase_items row are created, `set local role authenticated` attempts the exact forgery `update ... set payment_status='paid'`, and the block raises if it took effect. Both probe rows are deleted on every path. This is a live test of the boundary, not a catalog assertion that a policy exists. | the environment being declared usable | no |
| G-10 | Deploy-side production refusal | scripts/rcap-hosted-acceptance-deploy.mjs (phases full, deploy, payment only — never migrate) | the deployment is asserted `d.target !== 'production'`; cases deployed_to_preview_not_production, production_aliases_unchanged and production_environment_variables_unchanged are required; no `--prod` flag and no alias command is issued; a Stripe secret not beginning sk_test_ and a webhook secret not beginning whsec_ are refused outright. | any Vercel production surface can be touched | not applicable to hosted_migrate, which per the workflow's own phase contract performs no deploy, no matrix and no gate |

### Backup, snapshot and rollback position

**A named backup or snapshot step exists: no.**

There is no backup, snapshot or point-in-time-restore step anywhere in the workflow, and no down migration exists for any phase in the sequence. The safety model is 'the target is provably empty of production data before the first write' (G-03) plus 'the target is not production' (G-01, G-03, G-10), not 'the write can be undone'.

**Compensating rollback.** Delete and recreate the acceptance Supabase project. That is safe precisely because G-03 proved it carries no production data, and it resets rcap_acceptance_migration_ledger so the sequence reapplies from the baseline. It requires Supabase administrative access and is the owner's action, not the workflow's.

**What no compensating action undoes automatically:**

- phase 50 DROP TABLE rcap_packet_credit_consumptions and rcap_partner_packet_allocation (empty by construction, but a DROP TABLE)
- phase 50 DROP FUNCTION consume_rcap_packet_credit(text, text, uuid)
- phase 53 DROP FUNCTION of the 13-argument enqueue_packet_render_job
- phase 52 withdrawal of INSERT/UPDATE on consumer_briefcase_items from anon and authenticated
- phase 54 withdrawal of all privileges on rcap_persons from anon and authenticated

---

## 5. Phase 1B reconciliation

### 5.1 The 51-jurisdiction matrix

| # | Juris | Rendered terminal | Packet-ready | Payment | Classification | Exact reason | `waiting_rule_id`s that reach packet-ready |
|---|---|---|---|---|---|---|---|
| 1 | **AK** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 2 | **AL** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 3 | **AR** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 4 | **AZ** | `not_yet` | **no** | **no** | `technical_reachability_defect` | technically defective | 10 |
| 5 | **CA** | `needs_review` | **no** | **no** | `unresolved_reachability` | fixture-limited | 0 |
| 6 | **CO** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 7 | **CT** | `not_yet` | **no** | **no** | `technical_reachability_defect` | technically defective | 7 |
| 8 | **DC** | `not_yet` | **no** | **no** | `technical_reachability_defect` | technically defective | 7 |
| 9 | **DE** | `packet_ready` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 10 | **FL** | `not_yet` | **no** | **no** | `technical_reachability_defect` | technically defective | 13 |
| 11 | **GA** | `not_yet` | **no** | **no** | `technical_reachability_defect` | technically defective | 7 |
| 12 | **HI** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 13 | **IA** | `not_yet` | **no** | **no** | `technical_reachability_defect` | technically defective | 3 |
| 14 | **ID** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 15 | **IL** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 16 | **IN** | `needs_more_info` | **no** | **no** | `unresolved_reachability` | fixture-limited | 0 |
| 17 | **KS** | `not_yet` | **no** | **no** | `waiting_rule_not_executable` | technically defective | 0 |
| 18 | **KY** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 19 | **LA** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 20 | **MA** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 21 | **MD** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 22 | **ME** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 23 | **MI** | `not_yet` | **no** | **no** | `technical_reachability_defect` | technically defective | 13 |
| 24 | **MN** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 25 | **MO** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 26 | **MS** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 27 | **MT** | `not_yet` | **no** | **no** | `technical_reachability_defect` | technically defective | 5 |
| 28 | **NC** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 29 | **ND** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 30 | **NE** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 31 | **NH** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 32 | **NJ** | `not_yet` | **no** | **no** | `waiting_rule_not_executable` | technically defective | 0 |
| 33 | **NM** | `not_yet` | **no** | **no** | `technical_reachability_defect` | technically defective | 9 |
| 34 | **NV** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 35 | **NY** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 36 | **OH** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 37 | **OK** | `not_yet` | **no** | **no** | `technical_reachability_defect` | technically defective | 5 |
| 38 | **OR** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 39 | **PA** | `needs_more_info` | **no** | **no** | `technical_reachability_defect` | technically defective | 13 |
| 40 | **RI** | `needs_more_info` | **no** | **no** | `waiting_rule_not_executable` | technically defective | 0 |
| 41 | **SC** | `not_yet` | **no** | **no** | `technical_reachability_defect` | technically defective | 13 |
| 42 | **SD** | `not_yet` | **no** | **no** | `technical_reachability_defect` | technically defective | 10 |
| 43 | **TN** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 44 | **TX** | `packet_ready_with_caution` | yes | **no** | `payment_clamp_not_reachability` | operationally held | 0 |
| 45 | **UT** | `needs_more_info` | **no** | **no** | `waiting_rule_not_executable` | technically defective | 0 |
| 46 | **VA** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 47 | **VT** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 48 | **WA** | `packet_ready_with_caution` | yes | **no** | `payment_clamp_not_reachability` | operationally held | 0 |
| 49 | **WI** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |
| 50 | **WV** | `packet_ready_with_caution` | yes | **no** | `payment_clamp_not_reachability` | operationally held | 0 |
| 51 | **WY** | `packet_ready_with_caution` | yes | yes | `intentional_launch_hold` | operationally held | 0 |

Totals: 19 cannot reach packet-ready, 22 cannot reach payment, 3 reach packet-ready but not payment. Classification counts: `intentional_launch_hold` 29, `technical_reachability_defect` 13, `unresolved_reachability` 2, `waiting_rule_not_executable` 4, `payment_clamp_not_reachability` 3. `operationallySellable` is **0 for all 51** and every jurisdiction carries a launch hold, so "operationally held" is true of every row as a second-order fact; the column above names each row's *most specific* blocker.

### 5.2 Why the lifecycle attribution was wrong for 17 of 19

Phase 1 concluded that 19 jurisdictions could not reach a packet-ready outcome because required facts were classified postpay and therefore never rendered as screens. Four experiments falsified that for 17 of them:

- **E1** — rendered screens only: 19 fail. This is the Phase 1 observation and it is correct as an observation.
- **E2** — plus the six shared postpay facts: moved nothing. The postpay lifecycle classification is *not* what closes these.
- **E3** — plus every timing and completion gate field answered the clearing way: moved nothing.
- **E4** — plus one `waiting_rule_id` the state's own published profile already contains: **13 of the 19 reach `packet_ready_with_caution`**, most with payment allowed.

The real cause is in `bestWaitingRuleForPathway`. It drops every candidate whose duration `parseDurationFromText` cannot parse — the regex recognises "no waiting period" but not "No ordinary waiting period", which is DC's actual-innocence wording — and then keeps only candidates sharing a 5+-character token with the pathway's own prose. When the surviving set is empty, `evaluateCompiledTiming` returns `needs_review` / `waiting_rule_not_executed` with the message "We need one more detail before we can prepare the right packet." No detail is missing. Supplying a rule id the profile already publishes bypasses the selection and the pathway evaluates.

Lifecycle classification was a real finding about which screens render. It was the wrong explanation for unreachability.

### 5.3 Why only 13 are technical

`technical_reachability_defect` (13): AZ, CT, DC, FL, GA, IA, MI, MT, NM, OK, PA, SC, SD. Each has at least one `waiting_rule_id` in its own profile that reaches `packet_ready_with_caution`, so the pathway is evaluable and only the selection step fails. That is one shared code defect, fixable once for all 13.

`waiting_rule_not_executable` (4): KS, NJ, RI, UT. For these, **no** rule id in the profile reaches packet-ready. The evaluator's own case-outcome relevance branch rejects every remaining candidate after parsing and text-relevance have both left survivors, so the fix is a per-state legal answer naming an executable period — not the shared code change.

| Juris | Pathway | Candidate rules | With a parseable duration | Also text-relevant | Example of non-executable prose |
|---|---|---|---|---|---|
| **KS** | `conviction-or-diversion-216614` | 5 | 3 | 3 | "The form provides offense-dependent one-, three-, five-, or ten-year periods after diversion completion, sentence satisfaction, or discharge from supervision." |
| **NJ** | `regular-expungement-under-n-j-s-a-2c-52-2-2c-52-3` | 37 | 34 | 26 | "sealed and shouldn't be lumped into the regular waiting-period analysis." |
| **RI** | `path-a-first-offender-conviction-expungement` | 34 | 32 | 20 | "Wilma should calculate the waiting period from completion of sentence, not from arrest or conviction date. (" |
| **UT** | `path-d-petition-based-expungement-with-a-bci-certificate-of-eligibility` | 54 | 54 | 24 | *(every candidate parsed; the relevance branch rejected them)* |

In all four, `emptiedBy` records the same thing: neither the duration-parse filter nor the text-relevance filter emptied the candidate set, so the evaluator's own case-outcome relevance branch rejected the remainder. UT is the sharpest case — all 54 candidates parse and 24 are text-relevant, and none is executable for the pathway.

### 5.4 CA, IN, KS, NJ, RI, UT

- **CA** — `unresolved_reachability` (fixture-limited). Neither the rendered screens nor the unrendered facts produce a packet-ready terminal; the bounded search settles on needs_review (ca.source_fact_unknown).
- **IN** — `unresolved_reachability` (fixture-limited). Neither the rendered screens nor the unrendered facts produce a packet-ready terminal; the bounded search settles on needs_more_info (in.compiled_rule_match.rule-03-because-the-supplied-packet-does-not-state-every-statut).
- **KS** — `waiting_rule_not_executable` (technically defective). Even with every timing and completion fact answered the clearing way, and with every waiting rule in the profile named explicitly, the evaluator cannot execute a waiting period for conviction-or-diversion-216614. neither filter emptied the set in this mirror; the evaluator's own case-outcome relevance branch must have rejected the remainder
- **NJ** — `waiting_rule_not_executable` (technically defective). Even with every timing and completion fact answered the clearing way, and with every waiting rule in the profile named explicitly, the evaluator cannot execute a waiting period for regular-expungement-under-n-j-s-a-2c-52-2-2c-52-3. neither filter emptied the set in this mirror; the evaluator's own case-outcome relevance branch must have rejected the remainder
- **RI** — `waiting_rule_not_executable` (technically defective). Even with every timing and completion fact answered the clearing way, and with every waiting rule in the profile named explicitly, the evaluator cannot execute a waiting period for path-a-first-offender-conviction-expungement. neither filter emptied the set in this mirror; the evaluator's own case-outcome relevance branch must have rejected the remainder
- **UT** — `waiting_rule_not_executable` (technically defective). Even with every timing and completion fact answered the clearing way, and with every waiting rule in the profile named explicitly, the evaluator cannot execute a waiting period for path-d-petition-based-expungement-with-a-bci-certificate-of-eligibility. neither filter emptied the set in this mirror; the evaluator's own case-outcome relevance branch must have rejected the remainder

CA and IN are the only two the audit does **not** resolve. Neither is called resolved here: CA settles on `needs_review (ca.source_fact_unknown)` and IN on `needs_more_info (in.compiled_rule_match rule-03 — the supplied packet does not state every statutory element)`. Both need a hosted run or a state-pack reading to settle; the honest status is *unresolved*, not *defective* and not *correct*.

### 5.5 TX, WA, WV — the 22 versus 19

Reachability and payment are two different gates and the second is strictly narrower. Every jurisdiction that cannot reach packet-ready also cannot reach payment, because payment is only ever offered on a packet-ready terminal. The extra jurisdictions in the payment set are the ones that DO reach packet-ready and are then closed by the evaluator's own payment clamp in evaluateAgainstProfile: paymentAllowed additionally requires route.deterministic, a packet plan, routeIsRatifiedDeployable, a court-filed petition or administrative application route, and isPacketPlanFulfillmentReady. A route can satisfy every eligibility rule, return packet_ready_with_caution, and still be handed paymentAllowed false by that clamp.

| Juris | Terminal reached | Pathway | Classification |
|---|---|---|---|
| **TX** | `packet_ready_with_caution` | `expunction-for-arrest-with-no-charge-filed-after-the-limitations-period` | `payment_clamp_not_reachability` |
| **WA** | `packet_ready_with_caution` | `victim-survivor-conviction-vacation-route` | `payment_clamp_not_reachability` |
| **WV** | `packet_ready_with_caution` | `juvenile-record-relief` | `payment_clamp_not_reachability` |

These three are **not** reachability failures. They reach packet-ready and are then closed by the payment clamp in `evaluateAgainstProfile`. Counting them as unreachable is what produced 22 where the reachability answer is 19.

### 5.6 The 42 distinct question IDs with category counts totalling 45

42 distinct ids; per-bucket distinct counts sum to 45; surplus 3, accounted for by exactly 3 ids.

Bucketing is per jurisdiction-node, not per question id. A question id that is served-but-not-rendered in several jurisdictions can earn a different bucket in each. 42 distinct ids across 1,824 nodes therefore produce 45 (id, bucket) pairs; the surplus of 3 is exactly the three ids below.

| Question ID | Buckets | Jurisdictions per bucket |
|---|---|---|
| `county` | `lifecycle_misclassified` + `intentionally_post_entitlement` | `lifecycle_misclassified` (11): CA, FL, GA, IA, ID, IN, KS, KY, MD, MT, NE<br>`intentionally_post_entitlement` (2): OR, WV |
| `criminal_history` | `lifecycle_misclassified` + `intentionally_post_entitlement` | `lifecycle_misclassified` (14): AK, AZ, CA, FL, GA, LA, ME, MN, MT, NE, NY, SC, TN, WI<br>`intentionally_post_entitlement` (1): NV |
| `disposition_date` | `lifecycle_misclassified` + `dead_or_unreachable` | `lifecycle_misclassified` (38): AK, AL, AR, AZ, CT, DC, FL, GA, HI, ID, IL, LA, ME, MN, MO, MT, NC, ND, NE, NH, NM, NV, NY, OH, OK, OR, PA, RI, SC, SD, TN, TX, UT, VA, VT, WI, WV, WY<br>`dead_or_unreachable` (12): CA, CO, DE, IA, IN, KS, KY, MA, MD, MI, NJ, WA |

### 5.7 The 332 captures versus the 321 retained

`332 - 29 + 18 = 321` — 332 captures in the Phase 1 committed run, 29 absent from the Phase 1B re-capture, 18 present only in it, leaving 321.

- Both runs are internally hash-unique (yes): 332/332 and 321/321 distinct SHA-256. Content-hash de-duplication at capture time is therefore proven, not assumed.
- All 121 terminal captures are present in **both** runs at the same slots — terminal slots only in Phase 1: none; only in Phase 1B: none. **Every one of the 11 net files is an intermediate question screen.** No terminal evidence was lost.
- Of the 29 removed, 13 are byte-identical duplicates retained under another flow's slot, and 16 were suppressed because the re-capture's render of that screen collided with a capture already taken in that run.

**Every removed capture:**

| Slot | SHA-256 (first 12) | Disposition | Retained instead as |
|---|---|---|---|
| `EXPAI-MS-0804ce0ddd · desktop-1440x1000 · question-1` | `f635d99f29b7` | de-duplicated | `EXPAI-MS-9243c35cd3 · desktop-1440x1000 · question-1` |
| `EXPAI-AR-dac222f72b · mobile-390x844 · question-1` | `a4dcc62a5f74` | suppressed by re-capture hash collision | — |
| `EXPAI-AR-dac222f72b · mobile-390x844 · question-4` | `b665cfe7c766` | suppressed by re-capture hash collision | — |
| `EXPAI-AR-dac222f72b · desktop-1440x1000 · question-1` | `ea73946f5172` | suppressed by re-capture hash collision | — |
| `EXPAI-AR-dac222f72b · desktop-1440x1000 · question-4` | `e0c23f36b13d` | suppressed by re-capture hash collision | — |
| `EXPAI-CA-820d8cab8d · desktop-1440x1000 · question-4` | `cfe56d079260` | suppressed by re-capture hash collision | — |
| `EXPAI-CA-c36b60d263 · desktop-1440x1000 · question-1` | `2e0cf4b7b5a0` | de-duplicated | `EXPAI-CA-e7b9a19891 · desktop-1440x1000 · question-1` |
| `EXPAI-CO-74448de51a · desktop-1440x1000 · question-4` | `b9587ee5e600` | suppressed by re-capture hash collision | — |
| `EXPAI-FL-1d9f631139 · desktop-1440x1000 · question-4` | `8b1dc4cd55a0` | suppressed by re-capture hash collision | — |
| `EXPAI-GA-6436c5488c · desktop-1440x1000 · question-4` | `307f244e5b2e` | de-duplicated | `EXPAI-GA-6711cdbae8 · desktop-1440x1000 · question-4` |
| `EXPAI-HI-485c161246 · desktop-1440x1000 · question-4` | `79625f52666e` | de-duplicated | `EXPAI-HI-8254aa0343 · desktop-1440x1000 · question-4` |
| `EXPAI-IL-35b2281e6d · desktop-1440x1000 · question-4` | `d23201c7ecde` | de-duplicated | `EXPAI-IL-0e77f4fd92 · desktop-1440x1000 · question-4` |
| `EXPAI-IL-ba54c2b39b · desktop-1440x1000 · question-4` | `cbc66d1bdb32` | suppressed by re-capture hash collision | — |
| `EXPAI-KY-df375a3e1d · desktop-1440x1000 · question-1` | `bbb308a5699e` | de-duplicated | `EXPAI-KY-cb8bd49135 · desktop-1440x1000 · question-1` |
| `EXPAI-LA-33f66b2e01 · desktop-1440x1000 · question-1` | `5725e28cc48b` | de-duplicated | `EXPAI-LA-b7c0dca2fa · desktop-1440x1000 · question-1` |
| `EXPAI-LA-33f66b2e01 · desktop-1440x1000 · question-4` | `1a7ab1733dc5` | suppressed by re-capture hash collision | — |
| `EXPAI-MD-d3001d6a11 · desktop-1440x1000 · question-1` | `b1bf6c47d154` | suppressed by re-capture hash collision | — |
| `EXPAI-ME-0bfd05f617 · desktop-1440x1000 · question-1` | `05f369491b4e` | de-duplicated | `EXPAI-ME-24e6dc20d7 · desktop-1440x1000 · question-1` |
| `EXPAI-NC-11b467a489 · desktop-1440x1000 · question-4` | `8991905ce3e7` | suppressed by re-capture hash collision | — |
| `EXPAI-ND-86e4047faf · desktop-1440x1000 · question-1` | `23b6af87db8e` | de-duplicated | `EXPAI-ND-a3bfb554d3 · desktop-1440x1000 · question-1` |
| `EXPAI-NE-111d7342bc · desktop-1440x1000 · question-1` | `67cd5576172c` | de-duplicated | `EXPAI-NE-9ce3fce7f7 · desktop-1440x1000 · question-1` |
| `EXPAI-NV-378a0b27a0 · desktop-1440x1000 · question-4` | `6eadde0a25c4` | suppressed by re-capture hash collision | — |
| `EXPAI-OK-c68549e816 · desktop-1440x1000 · question-4` | `0fda589b6b7f` | suppressed by re-capture hash collision | — |
| `EXPAI-PA-c27ec3c395 · desktop-1440x1000 · question-4` | `402d391b32d8` | suppressed by re-capture hash collision | — |
| `EXPAI-RI-45c6d64fb9 · desktop-1440x1000 · question-4` | `33d7fd2f2e2d` | de-duplicated | `EXPAI-RI-7db4cf78a4 · desktop-1440x1000 · question-4` |
| `EXPAI-TN-47481a623e · desktop-1440x1000 · question-4` | `05e02bb28dec` | de-duplicated | `EXPAI-TN-15724d2022 · desktop-1440x1000 · question-4` |
| `EXPAI-VT-58f04b2b10 · desktop-1440x1000 · question-4` | `cb48bee99e2e` | suppressed by re-capture hash collision | — |
| `EXPAI-VT-844787ebc0 · desktop-1440x1000 · question-1` | `c8c0fa1aa25a` | suppressed by re-capture hash collision | — |
| `EXPAI-WI-bdf32f73ec · desktop-1440x1000 · question-1` | `07ba89fc087f` | de-duplicated | `EXPAI-WI-2829fbd370 · desktop-1440x1000 · question-1` |

**Every capture present only in the Phase 1B run:**

| Slot | SHA-256 (first 12) | Same bytes existed in Phase 1 |
|---|---|---|
| `EXPAI-AZ-5e0e8690a4 · desktop-1440x1000 · question-4` | `2f9483bfd6b3` | no |
| `EXPAI-CO-df429ebcb6 · desktop-1440x1000 · question-4` | `e43aebaed0a5` | no |
| `EXPAI-DC-c46f78751c · desktop-1440x1000 · question-4` | `26b9fdfe9b4a` | yes |
| `EXPAI-DE-17e8aad244 · desktop-1440x1000 · question-4` | `c9ad7b019c69` | no |
| `EXPAI-HI-485c161246 · desktop-1440x1000 · question-1` | `98e092ac896d` | no |
| `EXPAI-ID-514e009b5f · desktop-1440x1000 · question-4` | `8ba5739b18a6` | yes |
| `EXPAI-KY-df375a3e1d · desktop-1440x1000 · question-4` | `12de7a501f2f` | no |
| `EXPAI-MA-f235419311 · desktop-1440x1000 · question-1` | `1d9f23abe445` | yes |
| `EXPAI-MA-f235419311 · desktop-1440x1000 · question-4` | `220b143ddd79` | no |
| `EXPAI-MI-8efbd03060 · desktop-1440x1000 · question-4` | `80b8bad255cd` | no |
| `EXPAI-MN-a45aa520e9 · desktop-1440x1000 · question-4` | `fee3aa6fde70` | no |
| `EXPAI-MO-ce5f2d8dd9 · desktop-1440x1000 · question-4` | `6d4bc93dabda` | no |
| `EXPAI-MT-ba226325e2 · desktop-1440x1000 · question-4` | `50cd0d64ada0` | no |
| `EXPAI-NE-111d7342bc · desktop-1440x1000 · question-4` | `5a480012bc62` | no |
| `EXPAI-NH-2d30a8ab53 · desktop-1440x1000 · question-4` | `057deb96cb42` | no |
| `EXPAI-SC-3d93a2d9d3 · desktop-1440x1000 · question-4` | `f17773a49ef2` | yes |
| `EXPAI-VT-844787ebc0 · desktop-1440x1000 · question-4` | `e242ca7bcf92` | no |
| `EXPAI-WA-24a861f8e0 · desktop-1440x1000 · question-4` | `577685976f91` | no |

---

## 6. Proposed execution sequence

Nothing below has been run. This is the plan for Roger to authorize or refuse.

| Step | Action | Workflow phase | Expected artifact | Stop condition | Rollback / cleanup |
|---|---|---|---|---|---|
| 1 | Re-run hosted_preflight with the four pinned inputs | `preflight (dispatched as mode: hosted_preflight)` | rcap-hosted-preflight-<runId> — preflight.json with all required cases passing, PREFLIGHT_SCOPE=full | any preflight case fails, or acceptance_project_carries_no_production_data reports a nonzero row count | none — the phase writes nothing |
| 2 | Run hosted_migrate | `migrate — no deploy, no matrix, no gate` | migrate.json with authorized_hashes_agree_across_both_records, baseline_schema_present, authorized_sequence_applied_in_order, render_jobs_table_secured, person_namespace_hardened, payment_authority_functions_present, legacy_enqueue_signature_dropped, consumption_unit_keyed_on_item and participant_cannot_self_declare_payment all passing | hash drift (nothing applied), a missing required baseline table (sequence not applied), any phase failing mid-sequence, or the negative control reproducing RCAP-SEC-001 | delete and recreate the acceptance project; there is no down migration |
| 3 | Read the migrate evidence and reconcile it against this packet | `none — local artifact review` | a diff of migrate.json's authorizedSequence dispositions against the seven phases named here, including the phase-55 double-apply this packet flags | any phase records a disposition this packet did not predict | none |
| 4 | Run hosted_deploy to publish the frozen application to a Vercel Preview | `deploy — deploy only` | deploy.json with deployed_to_preview_not_production, production_aliases_unchanged and production_environment_variables_unchanged passing, plus the resolved Preview hostname | d.target === 'production', any production alias or environment variable observed changed, or a Stripe secret failing its sk_test_/whsec_ prefix check | a Preview deployment is disposable; delete it in Vercel. No alias is ever moved, so production is untouched by construction |
| 5 | Point the flow-audit crawler at the Preview hostname and re-capture the 51-jurisdiction baseline | `none — tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs against the Preview origin, mutation gate left unset` | a hosted capture set comparable to the 321 retained local captures, with the 121 terminal captures as the comparison key | the crawler's production-origin refusal fires, or hosted terminals disagree with local terminals for any jurisdiction | none — the crawl is read-only without EXPAI_FLOW_AUDIT_ALLOW_MUTATION |
| 6 | Run hosted_accept to execute the golden-journey matrix against the Preview | `accept — matrix only, no deploy` | the hosted acceptance evidence bundle including the matrix verdicts and verify-rcap-hosted-acceptance-verdicts.mjs output | any required matrix step did not run, or the verdict verifier reports evidence that does not earn its verdict | none — the matrix writes only to the acceptance project |
| 7 | Confirm the correction contract's E4 finding on the hosted stack for the 13 technical_reachability_defect jurisdictions | `none — audit scripts against the hosted evidence` | a hosted-side reachability reconciliation reproducing 13 of 19 reaching packet_ready_with_caution once a waiting_rule_id the profile already contains is supplied | the hosted stack disagrees with the local finding for any of the 13, which would mean the local harness and the deployed runtime differ | none |
| 8 | Only if Roger separately authorizes a payment journey: run hosted_payment | `payment — deploy + matrix, Stripe sandbox keys only` | the payment journey evidence with the sandbox Checkout session and the packet delivery record | any key failing its sk_test_ prefix, any webhook secret failing whsec_, or PREVIOUS_STRIPE_WEBHOOK_HOST resolving to a host other than the one this run deployed | a sandbox Checkout session creates no live charge; refund handling is not exercised. This step is OUT OF SCOPE of ENV-007 and is listed only so the sequence is complete. |

---

## Discrepancies the owner should resolve before authorizing

### ENV-007-D1 — must be resolved before hosted_migrate

The authorized migration sequence is SEVEN files (phases 49-55), not the five named in the request. data/rcap-staging-action.json at both the audit HEAD and tools_sha lists 49, 50, 51, 52, 53, 54 and 55, and the migrate script iterates that list.

- Evidence: data/rcap-staging-action.json .migrationsInApplyOrder — 7 entries; data/rcap-staging-authorization-readiness.json carries phase-49 through phase-55 hashes
- Decision needed: confirm that authorizing 'migrations 50-54' authorizes 49 and 55 as well, or amend the action file

### ENV-007-D2 — should be understood before hosted_migrate

Phase 55 is applied twice. The baseline pass filters out only /^phase-(49|50|51|52|53|54)-/, the hardening phase 56 and partner-seed-demo.sql, so phase-55 is applied in the baseline; the authorized-sequence loop then applies it again and records 'objects_already_present_adopted' on the duplicate-object error.

- Evidence: scripts/rcap-hosted-acceptance-migrate.mjs section 2 filter versus the 7-entry sequence in section 3
- Decision needed: accept the double-apply as benign, or extend the baseline filter to 55

### ENV-007-D3 — informational, blocks nothing for hosted_migrate

The workflow's AUTHORIZED_WORKER_DIGEST (sha256:4e5b58e4…, source 5ac0d8d6…) and the worker publication recorded in data/rcap-staging-action.json at the audit HEAD (sha256:2656abeb…, source 57318c20…, run 32599252817) are different images. The workflow refuses anything but 4e5b58e4…, so the newer publication cannot be supplied.

- Evidence: git diff 6d9e8792 HEAD -- data/rcap-staging-action.json
- Decision needed: none for hosted_migrate, which never pulls the worker image. It must be resolved before hosted_full, whose matrix does.

### ENV-007-D4 — informational

The phase-53 file header says 'Its two successors are appended WITHOUT defaults'. There is one successor: a single 15-argument enqueue_packet_render_job with two modes decided by p_partner_id.

- Evidence: supabase/phase-53-rcap-consumer-job-binding.sql — one `create or replace function public.enqueue_packet_render_job`
- Decision needed: none; the comment is inaccurate, the code is not

### ENV-007-D5 — must be understood before authorizing

There is no GitHub Environment. No job in either workflow declares an `environment:` key, so 'rcap-acceptance' carries no required reviewers, no wait timer and no environment-scoped secrets. Authorization is enforced only by the pinned-value refusal step and by who can press Run workflow.

- Evidence: no `environment:` key in .github/workflows/rcap-f1-ephemeral-staging.yml or .github/workflows/rcap-hosted-acceptance-staging.yml
- Decision needed: accept, or create a protected GitHub Environment before authorizing

