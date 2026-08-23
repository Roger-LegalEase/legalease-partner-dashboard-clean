#!/usr/bin/env node
// ENV-007 owner authorization packet.
//
// READ-ONLY. This script executes nothing against any environment: it reads
// committed repository state, the Phase 1B audit artifacts and git object
// metadata, and emits one JSON record plus one Markdown packet for Roger to
// authorize (or refuse) the hosted_migrate / hosted_full execution.
//
// It never opens a network connection, never reads an environment file, and
// never prints a secret. Where a value is a secret, only its SOURCE is named.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const DATA_DIR = path.join(rootDir, "data/expungement-ai/flow-audit");
const DOCS_DIR = path.join(rootDir, "docs/expungement-ai/flow-audit");

const git = (...args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8" }).trim();
const gitBytes = (...args) => execFileSync("git", args, { cwd: rootDir, maxBuffer: 1 << 28 });
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

const REQUIRED_HEAD = "d32267b8135ee18d33fdf6d4178ea87127138efe";
const APPLICATION_SHA = "f7ed0ad3a8f37a0c1446b62760b1a36fb163c926";
const WORKER_SOURCE_SHA = "5ac0d8d6910aec3dc6259b2d4da6931abc5af7e8";
const WORKER_DIGEST = "sha256:4e5b58e4492289446bcbdd100bb39dcd13dd4512916679fa2a252e4532ab9530";
const TOOLS_SHA = "6d9e8792b8c68671220cac5f294562e3b3ba1b25";
const ACCEPTANCE_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";

const head = git("rev-parse", "HEAD");
const branch = git("rev-parse", "--abbrev-ref", "HEAD");

// --- git-derived proof -------------------------------------------------------

const tryGit = (fn, fallback = null) => { try { return fn(); } catch { return fallback; } };

const isAncestorOfMain = (sha) => {
  try { execFileSync("git", ["merge-base", "--is-ancestor", sha, "origin/main"], { cwd: rootDir }); return true; }
  catch { return false; }
};
const pathSetIdentical = (a, b, paths) => {
  try { execFileSync("git", ["diff", "--quiet", a, b, "--", ...paths], { cwd: rootDir }); return true; }
  catch { return false; }
};

const APPLICATION_BYTE_PATHS = [
  "src", "package.json", "package-lock.json", "tsconfig.json",
  "next.config.ts", "public", "docs/record-clearing/field-map-drafts"
];
const WORKER_IMAGE_INPUT_PATHS = [
  "package.json", "package-lock.json", "tsconfig.json",
  "scripts/rcap-render-worker.mjs", "deploy/rcap-render-worker/Dockerfile",
  "scripts/lib", "src"
];

// --- section 3 : the authorized migration sequence ---------------------------

const MIGRATION_ANALYSIS = {
  49: {
    purpose: "Creates packet_render_jobs and its state machine. Included here because the workflow's authorized sequence is 49 through 55, not 50 through 54: it is the base every later phase alters.",
    tables: ["public.packet_render_jobs (created)"],
    columns: ["the phase-49 base column set, including status, renderer_kind, source_sha256 NOT NULL, output_sha256, normalized_output_sha256, output_storage_path"],
    functionsAndTriggers: ["the phase-49 enqueue/claim/finalize set, superseded in 50-53"],
    rlsPolicies: ["packet_render_jobs_service_role_all (FOR ALL) — dropped again by phase 50"],
    storageOrAuth: ["none"],
    additive: true,
    destructive: false,
    idempotent: false,
    prerequisite: "the pre-49 baseline schema (partner_records, rcap_persons, rcap_document_packets, consumer_briefcase_items, screening_sessions, partner_entitlement)",
    rollback: "drop the phase-49 objects; on the acceptance project the compensating action is to delete and recreate the project, which holds no production data by construction",
    whyTheFlowAuditNeedsIt: "Without packet_render_jobs no packet can be enqueued, so no paid or sponsored terminal in the flow manifest can be exercised end to end."
  },
  50: {
    purpose: "Packet delivery hardening: fencing tokens, retry exhaustion with terminal dispositions, the atomic finalization transaction, delivery events, and packet accounting re-keyed from the mutable partner_slug onto immutable database IDs.",
    tables: [
      "public.packet_render_jobs (altered)",
      "public.partner_packet_entitlement (created)",
      "public.packet_credit_ledger (created)",
      "public.packet_delivery_events (created)",
      "public.rcap_packet_credit_consumptions (DROPPED)",
      "public.rcap_partner_packet_allocation (DROPPED)"
    ],
    columns: [
      "packet_render_jobs +renderer_version, +briefcase_item_id, +partner_id, +person_id, +matter_id, +max_attempts, +next_attempt_at, +claim_expires_at, +fencing_token, +failure_disposition, +last_error_detail, +manual_requeue_authorized_by, +output_byte_count, +container_digest, +delivery_eligibility, +accounting_result, +credit_ledger_id (17 added)",
      "packet_render_jobs.source_sha256 ALTER COLUMN DROP NOT NULL, compensated by packet_render_jobs_source_presence_check (null legal only for renderer_kind = 'packet_document_v1')"
    ],
    functionsAndTriggers: [
      "functions (19): rcap_packet_mutation_authority, set_partner_packet_entitlement_updated_at, guard_packet_render_job_insert, guard_packet_render_job_transition, guard_packet_render_job_delete, guard_packet_credit_ledger, guard_packet_delivery_events, enqueue_packet_render_job, claim_packet_render_job, assert_packet_render_job_fencing, start_packet_render, start_packet_validation, fail_packet_render_job, release_expired_packet_render_claims, requeue_retryable_packet_render_jobs, requeue_packet_render_job_manual, finalize_packet_render_job, record_packet_delivery_event, packet_entitlement_balance",
      "triggers (6): set_partner_packet_entitlement_updated_at, guard_packet_render_job_insert, guard_packet_render_job_transition, guard_packet_render_job_delete, guard_packet_credit_ledger, guard_packet_delivery_events",
      "drops the phase-49 packet_render_jobs_guard_transition() function and the 2-argument claim_packet_render_job, and drops consume_rcap_packet_credit(text, text, uuid)"
    ],
    rlsPolicies: [
      "DROP POLICY packet_render_jobs_service_role_all — direct DML for runtime roles is exactly what the boundary forbids",
      "ENABLE ROW LEVEL SECURITY on partner_packet_entitlement, packet_credit_ledger, packet_delivery_events, with NO permissive policy for any runtime role",
      "revokes ALL on all four protected tables from public, anon, authenticated, rcap_render_worker, rcap_packet_delivery and from service_role, then re-grants service_role SELECT only (plus INSERT/UPDATE on partner_packet_entitlement, which is configuration rather than accounting evidence)"
    ],
    storageOrAuth: [
      "storage: creates or updates the private bucket rcap-packet-artifacts-private (public=false, 50 MiB limit, application/pdf only), guarded by to_regclass('storage.buckets')",
      "auth: none",
      "roles: creates anon, authenticated, rcap_render_worker, rcap_packet_delivery if absent (nologin)"
    ],
    additive: false,
    destructive: true,
    destructiveDetail: "DROP TABLE rcap_packet_credit_consumptions and rcap_partner_packet_allocation, DROP FUNCTION consume_rcap_packet_credit. Both tables are unapplied everywhere and empty by construction, and the drop happens inside the same transaction that creates their replacements. It is still a DROP TABLE and is named as one here.",
    idempotent: false,
    idempotencyDetail: "Mostly guarded (create table if not exists, add column if not exists, create index if not exists, drop constraint if exists before add), but CREATE TRIGGER is unconditional after DROP TRIGGER IF EXISTS, so a re-run raises a duplicate-object error rather than a no-op. The migrate script treats a duplicate-object code as 'objects already present, adopted' and records it as such.",
    prerequisite: "phase 49",
    rollback: "no down migration exists. On the acceptance project the compensating action is to delete and recreate the project; the ledger table rcap_acceptance_migration_ledger then no longer records the phase and the sequence reapplies from the baseline.",
    whyTheFlowAuditNeedsIt: "delivery_eligibility and accounting_result are the columns the runtime checkout guard reads. Without phase 50 the guard has nothing to refuse on, so the audit cannot distinguish 'the product refused' from 'the column does not exist'."
  },
  51: {
    purpose: "Closes the consumer payment gate. Before it, an unsponsored job was given accounting_result 'zero_charge' and delivery_eligibility 'eligible' — meaning any job with no partner sponsor became deliverable on the strength of having no sponsor.",
    tables: ["public.packet_render_jobs (constraint only)"],
    columns: ["none added; packet_render_jobs_accounting_result_check widened to admit 'consumer_payment_required'"],
    functionsAndTriggers: [
      "functions (2): consumer_packet_payment_valid(uuid) created; finalize_packet_render_job replaced forward",
      "triggers: none"
    ],
    rlsPolicies: ["no policy change; revokes EXECUTE on consumer_packet_payment_valid(uuid) from public and anon"],
    storageOrAuth: ["auth: reads consumer_briefcase_items, which references auth.users; the probe resolves that table dynamically so an absent table answers 'cannot prove payment' rather than erroring"],
    additive: true,
    destructive: false,
    idempotent: true,
    idempotencyDetail: "create or replace function plus drop-constraint-then-add. A re-run converges on the same end state.",
    prerequisite: "phases 49, 50",
    rollback: "replace finalize_packet_render_job with the phase-50 body and narrow the accounting_result constraint. Not scripted; the acceptance-project compensating action is delete and recreate.",
    whyTheFlowAuditNeedsIt: "The flow manifest classifies 284 pathways as paid_packet_intended. Without phase 51 an unpaid consumer job is deliverable, so every paid terminal the audit exercises would pass for the wrong reason."
  },
  52: {
    purpose: "Consumer payment authority. Closes four proven bypasses (G1/G1b: a participant wrote payment_status='paid' on their own row; G11: one paid item authorized unlimited matters because the consumption unit hashed the render job id; G12: participant B's paid item authorized a job for participant A).",
    tables: [
      "public.consumer_briefcase_items (altered)",
      "public.packet_render_jobs (altered)",
      "public.consumer_packet_payment_consumption (created)"
    ],
    columns: [
      "consumer_briefcase_items +currency, +provider_event_id, +payment_authority, +payment_recorded_at, +payment_recorded_by (5 added)",
      "packet_render_jobs +consumer_briefcase_item_id, +consumer_auth_user_id (2 added)",
      "constraints: consumer_briefcase_items_currency_check, consumer_briefcase_items_payment_authority_check, consumer_briefcase_items_paid_requires_server_evidence, unique index consumer_briefcase_items_provider_event_uk; packet_render_jobs_accounting_result_check re-stated"
    ],
    functionsAndTriggers: [
      "functions (4): record_consumer_packet_payment (SECURITY DEFINER, server-role only), consumer_packet_payment_authority(uuid, uuid), packet_render_jobs_consumer_binding_immutable, finalize_packet_render_job replaced forward",
      "triggers (1): packet_render_jobs_consumer_binding_immutable_trg on packet_render_jobs"
    ],
    rlsPolicies: [
      "revokes INSERT and UPDATE on consumer_briefcase_items from anon and authenticated at table level, then re-grants authenticated column-level INSERT/UPDATE on the safe columns only and SELECT on the table. RLS keeps deciding WHICH ROW; column grants now decide WHICH FIELDS, and payment is not among them.",
      "ENABLE ROW LEVEL SECURITY on consumer_packet_payment_consumption with ALL revoked from anon and authenticated",
      "revokes EXECUTE on record_consumer_packet_payment and consumer_packet_payment_authority from public and anon"
    ],
    storageOrAuth: ["auth: this is the phase that removes an authenticated participant's ability to self-declare payment on their own auth.users-owned row. It changes no Supabase Auth setting, no JWT, and no session logic — only table and column privileges in the public schema."],
    additive: true,
    destructive: false,
    destructiveDetail: "No object is dropped. It does WITHDRAW privileges (INSERT/UPDATE on consumer_briefcase_items from anon and authenticated) — reversible, but a behaviour change for any client that wrote those columns directly.",
    idempotent: true,
    idempotencyDetail: "Guarded throughout (add column if not exists, create table if not exists, create unique index if not exists, drop-then-add constraints, create or replace function, drop trigger if exists before create trigger).",
    prerequisite: "phases 26, 27, 28, 49, 50, 51",
    rollback: "re-grant the withdrawn table privileges and restore the phase-51 finalize body. Not scripted; acceptance-project compensating action is delete and recreate.",
    whyTheFlowAuditNeedsIt: "The audit's negative control is exactly G1: prove a participant cannot set payment_status='paid'. Without phase 52 that control fails and no payment finding from the hosted run would be trustworthy."
  },
  53: {
    purpose: "Binds consumer identity inside the original insert. After phase 52 the gate was correct but unreachable through the sanctioned path: enqueue had no parameter for the consumer binding and service_role cannot UPDATE packet_render_jobs after the insert, so every legitimate paid consumer job was created with consumer_auth_user_id null and correctly returned consumer_payment_required.",
    tables: ["none altered"],
    columns: ["none"],
    functionsAndTriggers: [
      "DROPS the 13-argument enqueue_packet_render_job(uuid, text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, integer)",
      "creates one 15-argument successor adding p_consumer_briefcase_item_id and p_expected_consumer_auth_user_id, with no defaults, so a 13-argument call resolves to no function at all",
      "the successor carries two modes decided by p_partner_id, each rejecting the other's shape",
      "triggers: none"
    ],
    rlsPolicies: ["no policy change; the phase-50 grant block does not carry to a changed signature, so EXECUTE is revoked from public, anon, authenticated, rcap_render_worker and rcap_packet_delivery and granted to service_role only"],
    storageOrAuth: ["auth: reads consumer_briefcase_items (references auth.users), resolved dynamically"],
    additive: false,
    destructive: true,
    destructiveDetail: "DROP FUNCTION of the 13-argument enqueue. Deliberate: kept alongside, it would remain a service-role path that creates a job with null consumer bindings. Any caller still passing 13 arguments breaks at the call site rather than silently creating an unbound job.",
    idempotent: true,
    idempotencyDetail: "drop function if exists plus create or replace function.",
    prerequisite: "phases 26, 27, 28, 49, 50, 51, 52",
    rollback: "recreate the 13-argument signature from the phase-50 file. Doing so reopens the unbound-job window and should not be done on an environment serving a participant.",
    whyTheFlowAuditNeedsIt: "This is the phase that makes a paid consumer packet reachable at all. Without it the hosted matrix would record consumer_payment_required for every consumer journey, which the audit would have to report as a product defect when it is a schema gap."
  },
  54: {
    purpose: "rcap_persons hardening and reserved-namespace enforcement. rcap_persons had no row-level security, no policies and no explicit grants anywhere in supabase/, so it inherited whatever the project's default privileges hand anon and authenticated — on a stock Supabase project, full table access. Phase 53's consumer binding put consumer identities into that table.",
    tables: ["public.rcap_persons (RLS, policy, grants, check constraint)", "public.partner_records (trigger only)"],
    columns: ["none added; adds check constraint rcap_persons_reserved_namespace_shape binding partner_slug = 'expungement-ai-consumer' to match_key ~ '^consumer:[0-9a-f]{64}$' and forbidding a consumer-shaped match_key in any other namespace"],
    functionsAndTriggers: [
      "functions (2): rcap_consumer_person_namespace(), rcap_guard_reserved_partner_slug()",
      "triggers (1): rcap_guard_reserved_partner_slug_trg BEFORE INSERT OR UPDATE OF partner_slug ON public.partner_records"
    ],
    rlsPolicies: [
      "ENABLE ROW LEVEL SECURITY on rcap_persons",
      "CREATE POLICY rcap_persons_service_role_all FOR ALL TO service_role USING (true) WITH CHECK (true)",
      "REVOKE ALL on rcap_persons from anon and from authenticated; GRANT SELECT, INSERT, UPDATE, DELETE to service_role",
      "the revoke and the policy are both applied because a later `alter default privileges` would otherwise undo the revoke alone"
    ],
    storageOrAuth: ["storage: none. auth: none — no Supabase Auth setting, JWT claim or session rule is touched; this is public-schema table privilege only."],
    additive: true,
    destructive: false,
    destructiveDetail: "No object dropped, no column dropped, no row rewritten. It WITHDRAWS anon and authenticated privileges on rcap_persons. Every existing caller already uses the service-role client, so the revoke removes no access anything relies on — but if a client did read rcap_persons with the anon key, it stops working here.",
    idempotent: true,
    idempotencyDetail: "Every block is guarded by to_regclass and pg_roles existence checks, with drop-then-create for the policy, trigger and constraint.",
    prerequisite: "phases 26, 27, 28, 49, 50, 51, 52, 53",
    rollback: "drop the constraint, the trigger, the policy, disable RLS and re-grant. Doing so restores a table with no row-level security holding consumer identities.",
    whyTheFlowAuditNeedsIt: "The hosted audit writes a person row for every consumer journey. Without phase 54 those rows sit in a table an anon key can read, which would make the hosted environment itself a finding before any flow was measured."
  },
  55: {
    purpose: "Expungement matter payment binding. Present in the workflow's authorized sequence and applied by it, though outside the 50-54 range named in the request.",
    tables: ["see the file; analysed here only to the extent of proving it is in the sequence the workflow will apply"],
    columns: ["not analysed in this packet"],
    functionsAndTriggers: ["not analysed in this packet"],
    rlsPolicies: ["not analysed in this packet"],
    storageOrAuth: ["not analysed in this packet"],
    additive: null,
    destructive: null,
    idempotent: null,
    prerequisite: "phases 49-54",
    rollback: "not analysed in this packet",
    whyTheFlowAuditNeedsIt: "FLAGGED FOR THE OWNER: the request named migrations 50-54. The sequence the workflow actually applies is 49-55 (seven files). Phase 55 is applied twice by construction — once in the baseline pass, because the baseline filter excludes only /^phase-(49|50|51|52|53|54)-/, and again as the last entry of the authorized sequence, where the duplicate-object codes make it record as 'adopted'. This is not a data risk but it is not what the file header describes, and the owner should know before authorizing."
  }
};

const SEQUENCE_PHASES = [49, 50, 51, 52, 53, 54, 55];

// --- section 4 : the pre-execution guards -----------------------------------

const SAFETY_GUARDS = [
  {
    id: "G-01",
    name: "Pinned-input refusal",
    where: ".github/workflows/rcap-hosted-acceptance-staging.yml, step 'Refuse any input that is not the authorized pinned value' (first step of the preflight job, before checkout)",
    proves: "application_sha, worker_source_sha, worker_digest and supabase_project_ref must each equal the AUTHORIZED_* constant in the workflow file; tools_sha must match ^[0-9a-f]{40}$; preview_deployment_id must match ^dpl_[A-Za-z0-9]+$ and preview_hostname ^[A-Za-z0-9.-]+\\.vercel\\.app$ when supplied.",
    abortsBefore: "the repository is even checked out",
    canBeSkipped: "no — it is unconditional, has no `if:`, and runs under `set -euo pipefail`"
  },
  {
    id: "G-02",
    name: "Ancestry and image-input equivalence",
    where: "same job, step 'Verify ancestry and image-input equivalence of every pinned SHA'",
    proves: "each of application_sha, worker_source_sha and tools_sha resolves to a commit AND is an ancestor of origin/main; tools_sha is byte-identical to application_sha across the application byte paths and to worker_source_sha across the worker image-input paths. Then `git checkout --detach tools_sha`, so every later step runs the pinned tools.",
    abortsBefore: "any credential is read",
    canBeSkipped: "no — unconditional"
  },
  {
    id: "G-03",
    name: "Acceptance-project identity and emptiness proof",
    where: "scripts/rcap-hosted-acceptance-preflight.mjs, run as 'Prove the credentials and the acceptance project' (PREFLIGHT_SCOPE=supabase_only for the migrate phase)",
    proves: "the project ref matches ^[a-z]{20}$; identity is confirmed through the Supabase Management API; every participant-witness table is absent or has zero rows (acceptance_project_carries_no_production_data — any nonzero count is fatal); the ref is disjoint from the Vercel production configuration (acceptance_ref_disjoint_from_vercel_production) and absent from every production-target value (acceptance_ref_absent_from_every_production_value). The only SQL it runs is `select current_database() as db, version() as version`. The production Supabase URL is hashed for comparison and never printed.",
    abortsBefore: "the migrate step, which is explicitly commented as guarded by it",
    canBeSkipped: "not for any phase except vercel_audit, which performs no writes"
  },
  {
    id: "G-04",
    name: "Two-record migration hash gate",
    where: "scripts/rcap-hosted-acceptance-migrate.mjs section 1",
    proves: "every file in the authorized sequence is re-hashed from the checked-out disk and must match BOTH data/rcap-staging-action.json AND the independently maintained data/rcap-staging-authorization-readiness.json. One mismatch anywhere writes migrate.json with passed:false and exits 1 with nothing applied.",
    abortsBefore: "the first write of the sequence",
    canBeSkipped: "no"
  },
  {
    id: "G-05",
    name: "Environment marker stamped before the first write",
    where: "migrate script section 1b",
    proves: "rcap_acceptance_environment_marker names the project ref it was stamped on, so a copy of the row in any other database identifies the wrong project and is refused by the preflight. It is the mechanism that lets a one-time emptiness proof keep meaning something on later runs. The table is revoked from anon and authenticated and has RLS enabled.",
    abortsBefore: "n/a — this is the record, not a gate",
    canBeSkipped: "no"
  },
  {
    id: "G-06",
    name: "Required-baseline-tables stop",
    where: "migrate script section 2",
    proves: "after the baseline pass, partner_records, rcap_document_packets, rcap_persons, consumer_briefcase_items, screening_sessions and partner_entitlement must all exist. A missing table exits 1 with the message that phases 49-54 were NOT applied. Individual baseline file failures are recorded but non-blocking; the baseline is judged on its result.",
    abortsBefore: "the authorized sequence",
    canBeSkipped: "no"
  },
  {
    id: "G-07",
    name: "Migration ledger with per-phase hash",
    where: "migrate script section 3, table rcap_acceptance_migration_ledger",
    proves: "each phase is applied once and recorded against the exact SHA-256 applied. A later run skips a phase whose recorded hash matches disk. A phase whose recorded hash DIFFERS is never silently re-applied, because G-04 has already refused the run. A duplicate-object error is recorded as 'objects_already_present_adopted' rather than counted as work done.",
    abortsBefore: "a second destructive apply on an already-built environment",
    canBeSkipped: "no"
  },
  {
    id: "G-08",
    name: "Indivisible sequence",
    where: "migrate script section 3 loop",
    proves: "the loop breaks on the first failure and the case authorized_sequence_applied_in_order fails, with the recorded reason that the sequence is indivisible and an environment that stops mid-way must not serve a participant. An environment that stopped at 51 would reintroduce RCAP-SEC-001 by construction.",
    abortsBefore: "any claim of a usable environment",
    canBeSkipped: "no"
  },
  {
    id: "G-09",
    name: "Live negative control (RCAP-SEC-001)",
    where: "migrate script section 4 readback",
    proves: "a throwaway auth.users identity and an unpaid consumer_briefcase_items row are created, `set local role authenticated` attempts the exact forgery `update ... set payment_status='paid'`, and the block raises if it took effect. Both probe rows are deleted on every path. This is a live test of the boundary, not a catalog assertion that a policy exists.",
    abortsBefore: "the environment being declared usable",
    canBeSkipped: "no"
  },
  {
    id: "G-10",
    name: "Deploy-side production refusal",
    where: "scripts/rcap-hosted-acceptance-deploy.mjs (phases full, deploy, payment only — never migrate)",
    proves: "the deployment is asserted `d.target !== 'production'`; cases deployed_to_preview_not_production, production_aliases_unchanged and production_environment_variables_unchanged are required; no `--prod` flag and no alias command is issued; a Stripe secret not beginning sk_test_ and a webhook secret not beginning whsec_ are refused outright.",
    abortsBefore: "any Vercel production surface can be touched",
    canBeSkipped: "not applicable to hosted_migrate, which per the workflow's own phase contract performs no deploy, no matrix and no gate"
  }
];

const BACKUP_POSITION = {
  namedBackupOrSnapshotStep: false,
  detail: "There is no backup, snapshot or point-in-time-restore step anywhere in the workflow, and no down migration exists for any phase in the sequence. The safety model is 'the target is provably empty of production data before the first write' (G-03) plus 'the target is not production' (G-01, G-03, G-10), not 'the write can be undone'.",
  compensatingRollback: "Delete and recreate the acceptance Supabase project. That is safe precisely because G-03 proved it carries no production data, and it resets rcap_acceptance_migration_ledger so the sequence reapplies from the baseline. It requires Supabase administrative access and is the owner's action, not the workflow's.",
  whatCannotBeUndoneAutomatically: [
    "phase 50 DROP TABLE rcap_packet_credit_consumptions and rcap_partner_packet_allocation (empty by construction, but a DROP TABLE)",
    "phase 50 DROP FUNCTION consume_rcap_packet_credit(text, text, uuid)",
    "phase 53 DROP FUNCTION of the 13-argument enqueue_packet_render_job",
    "phase 52 withdrawal of INSERT/UPDATE on consumer_briefcase_items from anon and authenticated",
    "phase 54 withdrawal of all privileges on rcap_persons from anon and authenticated"
  ]
};

// --- section 6 : the proposed execution sequence -----------------------------

const EXECUTION_PLAN = [
  {
    step: 1,
    action: "Re-run hosted_preflight with the four pinned inputs",
    workflowPhase: "preflight (dispatched as mode: hosted_preflight)",
    expectedArtifact: "rcap-hosted-preflight-<runId> — preflight.json with all required cases passing, PREFLIGHT_SCOPE=full",
    stopCondition: "any preflight case fails, or acceptance_project_carries_no_production_data reports a nonzero row count",
    rollbackOrCleanup: "none — the phase writes nothing"
  },
  {
    step: 2,
    action: "Run hosted_migrate",
    workflowPhase: "migrate — no deploy, no matrix, no gate",
    expectedArtifact: "migrate.json with authorized_hashes_agree_across_both_records, baseline_schema_present, authorized_sequence_applied_in_order, render_jobs_table_secured, person_namespace_hardened, payment_authority_functions_present, legacy_enqueue_signature_dropped, consumption_unit_keyed_on_item and participant_cannot_self_declare_payment all passing",
    stopCondition: "hash drift (nothing applied), a missing required baseline table (sequence not applied), any phase failing mid-sequence, or the negative control reproducing RCAP-SEC-001",
    rollbackOrCleanup: "delete and recreate the acceptance project; there is no down migration"
  },
  {
    step: 3,
    action: "Read the migrate evidence and reconcile it against this packet",
    workflowPhase: "none — local artifact review",
    expectedArtifact: "a diff of migrate.json's authorizedSequence dispositions against the seven phases named here, including the phase-55 double-apply this packet flags",
    stopCondition: "any phase records a disposition this packet did not predict",
    rollbackOrCleanup: "none"
  },
  {
    step: 4,
    action: "Run hosted_deploy to publish the frozen application to a Vercel Preview",
    workflowPhase: "deploy — deploy only",
    expectedArtifact: "deploy.json with deployed_to_preview_not_production, production_aliases_unchanged and production_environment_variables_unchanged passing, plus the resolved Preview hostname",
    stopCondition: "d.target === 'production', any production alias or environment variable observed changed, or a Stripe secret failing its sk_test_/whsec_ prefix check",
    rollbackOrCleanup: "a Preview deployment is disposable; delete it in Vercel. No alias is ever moved, so production is untouched by construction"
  },
  {
    step: 5,
    action: "Point the flow-audit crawler at the Preview hostname and re-capture the 51-jurisdiction baseline",
    workflowPhase: "none — tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs against the Preview origin, mutation gate left unset",
    expectedArtifact: "a hosted capture set comparable to the 321 retained local captures, with the 121 terminal captures as the comparison key",
    stopCondition: "the crawler's production-origin refusal fires, or hosted terminals disagree with local terminals for any jurisdiction",
    rollbackOrCleanup: "none — the crawl is read-only without EXPAI_FLOW_AUDIT_ALLOW_MUTATION"
  },
  {
    step: 6,
    action: "Run hosted_accept to execute the golden-journey matrix against the Preview",
    workflowPhase: "accept — matrix only, no deploy",
    expectedArtifact: "the hosted acceptance evidence bundle including the matrix verdicts and verify-rcap-hosted-acceptance-verdicts.mjs output",
    stopCondition: "any required matrix step did not run, or the verdict verifier reports evidence that does not earn its verdict",
    rollbackOrCleanup: "none — the matrix writes only to the acceptance project"
  },
  {
    step: 7,
    action: "Confirm the correction contract's E4 finding on the hosted stack for the 13 technical_reachability_defect jurisdictions",
    workflowPhase: "none — audit scripts against the hosted evidence",
    expectedArtifact: "a hosted-side reachability reconciliation reproducing 13 of 19 reaching packet_ready_with_caution once a waiting_rule_id the profile already contains is supplied",
    stopCondition: "the hosted stack disagrees with the local finding for any of the 13, which would mean the local harness and the deployed runtime differ",
    rollbackOrCleanup: "none"
  },
  {
    step: 8,
    action: "Only if Roger separately authorizes a payment journey: run hosted_payment",
    workflowPhase: "payment — deploy + matrix, Stripe sandbox keys only",
    expectedArtifact: "the payment journey evidence with the sandbox Checkout session and the packet delivery record",
    stopCondition: "any key failing its sk_test_ prefix, any webhook secret failing whsec_, or PREVIOUS_STRIPE_WEBHOOK_HOST resolving to a host other than the one this run deployed",
    rollbackOrCleanup: "a sandbox Checkout session creates no live charge; refund handling is not exercised. This step is OUT OF SCOPE of ENV-007 and is listed only so the sequence is complete."
  }
];

// =============================================================================
// build
// =============================================================================

const recon = readJson("data/expungement-ai/flow-audit/reachability-reconciliation.json");
const qnodes = readJson("data/expungement-ai/flow-audit/question-node-reconciliation.json");
const retention = readJson("data/expungement-ai/flow-audit/evidence-retention.json");
const action = readJson("data/rcap-staging-action.json");
const readiness = readJson("data/rcap-staging-authorization-readiness.json");

// --- section 3 facts ---------------------------------------------------------

const secondOpinion = readiness.blockers?.find((b) => b.id === "RCAP-SEC-001")?.resolution?.migrationSha256 ?? {};
const migrations = SEQUENCE_PHASES.map((phase) => {
  const entry = action.migrationsInApplyOrder.find((e) => e.phase === phase);
  const rel = entry.path;
  const bytes = gitBytes("show", `HEAD:${rel}`);
  const atTools = tryGit(() => gitBytes("show", `${TOOLS_SHA}:${rel}`), null);
  const blobHead = tryGit(() => git("rev-parse", `HEAD:${rel}`), "MISSING");
  const blobTools = tryGit(() => git("rev-parse", `${TOOLS_SHA}:${rel}`), "MISSING");
  const digest = sha256(bytes);
  return {
    sequenceNumber: phase,
    repositoryFilename: rel,
    byteLength: bytes.length,
    lineCount: bytes.toString("utf8").split("\n").length - 1,
    gitBlobShaAtAuditHead: blobHead,
    gitBlobShaAtToolsSha: blobTools,
    blobIdenticalAtToolsSha: blobHead === blobTools && blobHead !== "MISSING",
    sha256: digest,
    sha256AtToolsSha: atTools ? sha256(atTools) : null,
    presentAtToolsSha: atTools !== null,
    matchesStagingActionRecord: digest === entry.sha256,
    matchesAuthorizationReadinessRecord: secondOpinion[`phase-${phase}`] === digest,
    authorizationId: entry.authorizationId ?? null,
    ...MIGRATION_ANALYSIS[phase]
  };
});

// --- section 5 facts ---------------------------------------------------------

const REASON_BY_CLASSIFICATION = {
  technical_reachability_defect: "technically defective",
  waiting_rule_not_executable: "technically defective",
  unresolved_reachability: "fixture-limited",
  payment_clamp_not_reachability: "operationally held",
  intentional_launch_hold: "operationally held"
};

const matrix = recon.jurisdictions.map((row) => ({
  jurisdiction: row.jurisdiction,
  name: row.name,
  renderedTerminalReached: row.renderedTerminalReached,
  packetReadyReachable: row.packetReadyReachable,
  paymentReachable: row.paymentReachable,
  classification: row.classification,
  exactReason: REASON_BY_CLASSIFICATION[row.classification] ?? "unclassified",
  exactReasonDetail: row.classificationBasis,
  waitingRuleIdsThatReachPacketReady: row.experiments?.e4_namingAWaitingRuleTheProfileAlreadyContains?.waitingRuleIdsThatReachPacketReady ?? null,
  operationallySellable: row.operationallySellable,
  unmetOperationalGates: row.unmetOperationalGates,
  intentionalLaunchHold: row.intentionalLaunchHold,
  issueIds: row.issueIds
}));

// question-id bucket overlap
const perBucket = qnodes.totals.distinctQuestionIdsPerBucket;
const bucketsById = {};
for (const [bucket, ids] of Object.entries(perBucket)) for (const id of ids) (bucketsById[id] ??= []).push(bucket);
const overlappingIds = Object.entries(bucketsById).filter(([, b]) => b.length > 1);
const overlapDetail = overlappingIds.map(([id, buckets]) => {
  const byBucket = {};
  for (const node of qnodes.nodes) {
    if (node.questionId !== id) continue;
    (byBucket[node.bucket] ??= []).push(node.jurisdiction);
  }
  return { questionId: id, buckets, jurisdictionsByBucket: byBucket };
});

// capture reconciliation
const captureKey = (x) => `${x.flowId}|${x.viewport}|${x.label}`;
const phase1 = [...retention.committedCaptures, ...retention.prunedFromTheCommittedRun];
const phase1b = retention.retainedRawCaptures;
const p1Keys = new Set(phase1.map(captureKey));
const p1bKeys = new Set(phase1b.map(captureKey));
const p1bByHash = new Map();
for (const c of phase1b) { if (!p1bByHash.has(c.sha256)) p1bByHash.set(c.sha256, []); p1bByHash.get(c.sha256).push(c); }
const p1Hashes = new Set(phase1.map((c) => c.sha256));

const removedCaptures = phase1.filter((c) => !p1bKeys.has(captureKey(c))).map((c) => {
  const identical = p1bByHash.get(c.sha256) ?? [];
  return {
    slot: captureKey(c),
    sha256: c.sha256,
    disposition: identical.length > 0 ? "deduplicated" : "suppressed_by_content_hash_collision_in_the_recapture",
    retainedInsteadAs: identical.map(captureKey),
    terminalPreserved: true
  };
});
const addedCaptures = phase1b.filter((c) => !p1Keys.has(captureKey(c))).map((c) => ({
  slot: captureKey(c),
  sha256: c.sha256,
  hashAlreadyPresentInPhase1: p1Hashes.has(c.sha256)
}));

const terminalSlots = (set) => new Set(set.filter((c) => c.label === "terminal").map((c) => `${c.flowId}|${c.viewport}`));
const t1 = terminalSlots(phase1);
const t1b = terminalSlots(phase1b);

const captureReconciliation = {
  phase1RunCaptures: phase1.length,
  phase1bRetainedCaptures: phase1b.length,
  arithmetic: `${phase1.length} - ${removedCaptures.length} + ${addedCaptures.length} = ${phase1.length - removedCaptures.length + addedCaptures.length}`,
  removedCount: removedCaptures.length,
  addedCount: addedCaptures.length,
  deduplicatedCount: removedCaptures.filter((r) => r.disposition === "deduplicated").length,
  suppressedByRecaptureCollisionCount: removedCaptures.filter((r) => r.disposition !== "deduplicated").length,
  bothRunsAreInternallyHashUnique: new Set(phase1.map((c) => c.sha256)).size === phase1.length
    && new Set(phase1b.map((c) => c.sha256)).size === phase1b.length,
  terminalCapturesPhase1: t1.size,
  terminalCapturesPhase1b: t1b.size,
  terminalSlotsOnlyInPhase1: [...t1].filter((k) => !t1b.has(k)),
  terminalSlotsOnlyInPhase1b: [...t1b].filter((k) => !t1.has(k)),
  everyDeltaIsAnIntermediateQuestionScreen: [...t1].every((k) => t1b.has(k)) && [...t1b].every((k) => t1.has(k)),
  removedCaptures,
  addedCaptures
};

// --- section 1 and 2 ---------------------------------------------------------

const environmentIdentity = {
  GITHUB_ENVIRONMENT_NAME: {
    value: "rcap-acceptance",
    source: "env.STAGING_ENVIRONMENT_NAME in .github/workflows/rcap-hosted-acceptance-staging.yml:103 and .github/workflows/rcap-f1-ephemeral-staging.yml:81",
    isProduction: false,
    honestQualifier: "This is a plain workflow environment variable. NO job in either workflow declares a GitHub `environment:` key, so there is no GitHub Environment carrying protection rules, required reviewers or environment secrets. An authorization cannot be bound to it; it is a label in evidence, not a gate."
  },
  SUPABASE_PROJECT_REF: {
    value: ACCEPTANCE_PROJECT_REF,
    source: "env.AUTHORIZED_ACCEPTANCE_PROJECT_REF in .github/workflows/rcap-hosted-acceptance-staging.yml:100; enforced by the step 'Refuse any input that is not the authorized pinned value'",
    isProduction: false
  },
  SUPABASE_PROJECT_HOST: {
    value: `${ACCEPTANCE_PROJECT_REF}.supabase.co`,
    source: "derived by scripts/rcap-hosted-acceptance-preflight.mjs as https://<ref>.supabase.co; the Management API is addressed as https://api.supabase.com/v1/projects/<ref>/…",
    isProduction: false
  },
  SUPABASE_ENVIRONMENT_CLASS: {
    value: "acceptance / non-production",
    source: "proven per run by the preflight cases acceptance_project_carries_no_production_data, acceptance_ref_disjoint_from_vercel_production and acceptance_ref_absent_from_every_production_value",
    isProduction: false,
    proof: "identity via the Supabase Management API; emptiness via participant-witness table row counts where any nonzero count is fatal; disjointness by hash comparison against the production Supabase URL plus an exhaustive absence sweep of the acceptance ref across every production-target value. The production URL is hashed, never printed."
  },
  VERCEL_ORG_ID_OR_SLUG: {
    value: null,
    source: "GitHub Actions secret VERCEL_ORG_ID, forwarded by .github/workflows/rcap-f1-ephemeral-staging.yml to the reusable workflow's `secrets:` block",
    isProduction: false,
    honestQualifier: "SECRET — the value is not printed here. Only its source field is named, as instructed."
  },
  VERCEL_PROJECT_ID_OR_SLUG: {
    value: null,
    source: "GitHub Actions secret VERCEL_PROJECT_ID, forwarded the same way",
    isProduction: false,
    honestQualifier: "SECRET — the value is not printed here. Only its source field is named, as instructed."
  },
  VERCEL_ENVIRONMENT_CLASS: {
    value: "Preview",
    source: "scripts/rcap-hosted-acceptance-deploy.mjs asserts d.target !== 'production' and requires the cases deployed_to_preview_not_production, production_aliases_unchanged and production_environment_variables_unchanged; no --prod flag and no alias command appears anywhere in the workflow",
    isProduction: false,
    honestQualifier: "The Vercel PROJECT is the same project that serves production; the TARGET is Preview. Isolation is by deployment target and by the three assertions above, not by a separate Vercel project."
  }
};

const workflowInputs = [
  { input: "mode", value: "hosted_migrate or hosted_full", provenance: "workflow_dispatch choice on .github/workflows/rcap-f1-ephemeral-staging.yml (the dispatch entry point, because GitHub lists workflow_dispatch only for default-branch files)", pinned: false, validation: "restricted to the declared `options:` list; mapped to the reusable workflow's `phase` input by a nested conditional" },
  { input: "phase", value: "migrate or full", provenance: "derived by the F1 caller from `mode`; not typed by a human", pinned: false, validation: "the step 'Normalize the execution contract for this phase' fails closed on any unrecognised phase" },
  { input: "application_sha", value: APPLICATION_SHA, provenance: "env.AUTHORIZED_APPLICATION_SHA in both workflow files", pinned: true, validation: "string equality against AUTHORIZED_APPLICATION_SHA; must resolve; must be an ancestor of origin/main" },
  { input: "worker_source_sha", value: WORKER_SOURCE_SHA, provenance: "env.AUTHORIZED_WORKER_SOURCE_SHA in both workflow files", pinned: true, validation: "string equality against AUTHORIZED_WORKER_SOURCE_SHA; must resolve; must be an ancestor of origin/main", additionalPinnedInput: true },
  { input: "worker_digest", value: WORKER_DIGEST, provenance: "env.AUTHORIZED_WORKER_DIGEST in both workflow files", pinned: true, validation: "string equality against AUTHORIZED_WORKER_DIGEST. The image itself is NOT pulled for the migrate phase, which performs no deploy, no matrix and no gate.", additionalPinnedInput: true },
  { input: "tools_sha", value: TOOLS_SHA, provenance: "derived once, below, and stated as a fixed 40-character SHA — never as a branch name", pinned: true, validation: "^[0-9a-f]{40}$; resolves; ancestor of origin/main; byte-identical to application_sha across the application byte paths and to worker_source_sha across the worker image-input paths; then `git checkout --detach`", additionalPinnedInput: true },
  { input: "supabase_project_ref", value: ACCEPTANCE_PROJECT_REF, provenance: "env.AUTHORIZED_ACCEPTANCE_PROJECT_REF in the hosted workflow", pinned: true, validation: "string equality against AUTHORIZED_ACCEPTANCE_PROJECT_REF, then ^[a-z]{20}$ in the preflight and migrate scripts", additionalPinnedInput: true },
  { input: "preview_hostname", value: "(empty)", provenance: "operator-supplied; leave empty for hosted_migrate", pinned: false, validation: "when non-empty must match ^[A-Za-z0-9.-]+\\.vercel\\.app$" },
  { input: "preview_deployment_id", value: "(empty)", provenance: "operator-supplied; leave empty for hosted_migrate", pinned: false, validation: "when non-empty must match ^dpl_[A-Za-z0-9]+$; required only for checkout_gate" },
  { input: "contradiction_job_id", value: "(empty)", provenance: "operator-supplied; hosted_worker_contract only", pinned: false, validation: "not validated for other phases" }
];

const secretsUsed = [
  { secret: "SUPABASE_ACCESS_TOKEN", required: true, usedBy: "preflight step 'Prove the credentials and the acceptance project'; migrate step 'Apply the authorized sequence to the acceptance project'", neededForMigrate: true },
  { secret: "VERCEL_TOKEN", required: true, usedBy: "preflight (scope full), Preview resolution, deploy", neededForMigrate: false, note: "declared required by the reusable workflow even though PREFLIGHT_SCOPE=supabase_only for migrate" },
  { secret: "VERCEL_ORG_ID", required: true, usedBy: "same as VERCEL_TOKEN", neededForMigrate: false },
  { secret: "VERCEL_PROJECT_ID", required: true, usedBy: "same as VERCEL_TOKEN", neededForMigrate: false },
  { secret: "HOSTED_STRIPE_TEST_SECRET", required: false, usedBy: "deploy and payment phases only", neededForMigrate: false, note: "refused unless it begins sk_test_" },
  { secret: "HOSTED_STRIPE_TEST_WEBHOOK_SECRET", required: false, usedBy: "deploy and payment phases only", neededForMigrate: false, note: "refused unless it begins whsec_" },
  { secret: "VERCEL_AUTOMATION_BYPASS_SECRET", required: false, usedBy: "matrix probes against a Preview protected by Vercel Authentication", neededForMigrate: false }
];

const toolsShaProof = {
  TOOLS_SHA,
  TOOLS_SHA_DERIVATION: "Fixed, not derived from a moving branch at execution time. 6d9e8792b8c68671220cac5f294562e3b3ba1b25 is the commit 'Let the worker see the packet the application already wrote (#126)', dated 2026-08-20. It is the newest commit reachable from origin/main that satisfies all four gates the workflow applies, and it is stated here as a literal 40-character SHA so the run cannot drift with main.",
  shapeValid: /^[0-9a-f]{40}$/.test(TOOLS_SHA),
  resolvesToACommit: tryGit(() => git("cat-file", "-t", TOOLS_SHA), null) === "commit",
  isAncestorOfCanonicalMain: isAncestorOfMain(TOOLS_SHA),
  applicationByteEquivalentToApplicationSha: pathSetIdentical(APPLICATION_SHA, TOOLS_SHA, APPLICATION_BYTE_PATHS),
  workerImageInputEquivalentToWorkerSourceSha: pathSetIdentical(WORKER_SOURCE_SHA, TOOLS_SHA, WORKER_IMAGE_INPUT_PATHS),
  originMainHeadAtPacketTime: tryGit(() => git("rev-parse", "origin/main"), null),
  TOOLS_SHA_CONTAINS_REQUIRED_SCRIPTS: null,
  requiredScripts: []
};

const REQUIRED_SCRIPTS = [
  "scripts/verify-rcap-vercel-failure-audit.mjs",
  "scripts/rcap-hosted-acceptance-preflight.mjs",
  "scripts/rcap-vercel-failure-audit.mjs",
  "scripts/rcap-hosted-acceptance-migrate.mjs",
  "scripts/verify-rcap-hosted-checkout-gate.mjs",
  "scripts/rcap-hosted-resolve-preview.mjs",
  "scripts/rcap-hosted-acceptance-deploy.mjs",
  "scripts/rcap-hosted-acceptance-auth-config.mjs",
  "scripts/rcap-worker-contract-contradiction.mjs",
  "scripts/rcap-hosted-checkout-gate.mjs",
  "scripts/rcap-hosted-acceptance-matrix.mjs",
  "scripts/verify-rcap-target-worker-journey.mjs",
  "scripts/verify-rcap-target-replay-scope.mjs",
  "scripts/verify-rcap-immutable-image-preflight.mjs",
  "scripts/verify-rcap-hosted-job-read-columns.mjs",
  "scripts/verify-rcap-packet-contract.mjs",
  "scripts/rcap-hosted-acceptance-payment.mjs",
  "scripts/rcap-hosted-acceptance-gallery.mjs",
  "scripts/verify-rcap-hosted-acceptance-verdicts.mjs",
  ".github/workflows/rcap-hosted-acceptance-staging.yml",
  ".github/workflows/rcap-f1-ephemeral-staging.yml",
  "data/rcap-staging-action.json",
  "data/rcap-staging-authorization-readiness.json"
];
toolsShaProof.requiredScripts = REQUIRED_SCRIPTS.map((rel) => ({
  path: rel,
  blobShaAtToolsSha: tryGit(() => git("rev-parse", `${TOOLS_SHA}:${rel}`), null),
  present: tryGit(() => git("rev-parse", `${TOOLS_SHA}:${rel}`), null) !== null
}));
toolsShaProof.TOOLS_SHA_CONTAINS_REQUIRED_SCRIPTS = toolsShaProof.requiredScripts.every((s) => s.present);

const workflowFilesIdenticalOnMain = pathSetIdentical(TOOLS_SHA, "origin/main", [
  ".github/workflows/rcap-f1-ephemeral-staging.yml",
  ".github/workflows/rcap-hosted-acceptance-staging.yml"
]);

const discrepancies = [
  {
    id: "ENV-007-D1",
    severity: "must be resolved before hosted_migrate",
    finding: "The authorized migration sequence is SEVEN files (phases 49-55), not the five named in the request. data/rcap-staging-action.json at both the audit HEAD and tools_sha lists 49, 50, 51, 52, 53, 54 and 55, and the migrate script iterates that list.",
    evidence: "data/rcap-staging-action.json .migrationsInApplyOrder — 7 entries; data/rcap-staging-authorization-readiness.json carries phase-49 through phase-55 hashes",
    ownerDecision: "confirm that authorizing 'migrations 50-54' authorizes 49 and 55 as well, or amend the action file"
  },
  {
    id: "ENV-007-D2",
    severity: "should be understood before hosted_migrate",
    finding: "Phase 55 is applied twice. The baseline pass filters out only /^phase-(49|50|51|52|53|54)-/, the hardening phase 56 and partner-seed-demo.sql, so phase-55 is applied in the baseline; the authorized-sequence loop then applies it again and records 'objects_already_present_adopted' on the duplicate-object error.",
    evidence: "scripts/rcap-hosted-acceptance-migrate.mjs section 2 filter versus the 7-entry sequence in section 3",
    ownerDecision: "accept the double-apply as benign, or extend the baseline filter to 55"
  },
  {
    id: "ENV-007-D3",
    severity: "informational, blocks nothing for hosted_migrate",
    finding: "The workflow's AUTHORIZED_WORKER_DIGEST (sha256:4e5b58e4…, source 5ac0d8d6…) and the worker publication recorded in data/rcap-staging-action.json at the audit HEAD (sha256:2656abeb…, source 57318c20…, run 32599252817) are different images. The workflow refuses anything but 4e5b58e4…, so the newer publication cannot be supplied.",
    evidence: "git diff 6d9e8792 HEAD -- data/rcap-staging-action.json",
    ownerDecision: "none for hosted_migrate, which never pulls the worker image. It must be resolved before hosted_full, whose matrix does."
  },
  {
    id: "ENV-007-D4",
    severity: "informational",
    finding: "The phase-53 file header says 'Its two successors are appended WITHOUT defaults'. There is one successor: a single 15-argument enqueue_packet_render_job with two modes decided by p_partner_id.",
    evidence: "supabase/phase-53-rcap-consumer-job-binding.sql — one `create or replace function public.enqueue_packet_render_job`",
    ownerDecision: "none; the comment is inaccurate, the code is not"
  },
  {
    id: "ENV-007-D5",
    severity: "must be understood before authorizing",
    finding: "There is no GitHub Environment. No job in either workflow declares an `environment:` key, so 'rcap-acceptance' carries no required reviewers, no wait timer and no environment-scoped secrets. Authorization is enforced only by the pinned-value refusal step and by who can press Run workflow.",
    evidence: "no `environment:` key in .github/workflows/rcap-f1-ephemeral-staging.yml or .github/workflows/rcap-hosted-acceptance-staging.yml",
    ownerDecision: "accept, or create a protected GitHub Environment before authorizing"
  }
];

const packet = {
  schemaVersion: "expai-env007-owner-authorization/v1",
  generatedBy: "scripts/expungement-ai/flow-audit/build-env007-authorization-packet.mjs",
  readOnly: true,
  nothingExecuted: true,
  branch,
  auditHead: head,
  requiredHead: REQUIRED_HEAD,
  headMatchesRequired: head === REQUIRED_HEAD,
  changesNoProductBehavior: true,
  section1_environmentIdentity: environmentIdentity,
  section2_workflowInputs: {
    dispatchEntryPoint: ".github/workflows/rcap-f1-ephemeral-staging.yml (workflow_dispatch), which calls .github/workflows/rcap-hosted-acceptance-staging.yml (workflow_call only)",
    dispatchRefNote: "The reusable workflow resolves from the ref the dispatch runs on, so the AUTHORIZED_* constants that gate the run come from the workflow file on that ref, while the scripts and migrations come from the tools_sha checkout. Both workflow files are byte-identical between tools_sha and origin/main, so dispatching on main applies exactly the pins recorded here.",
    workflowFilesIdenticalBetweenToolsShaAndMain: workflowFilesIdenticalOnMain,
    SOURCE_SHA: APPLICATION_SHA,
    ...toolsShaProof,
    OTHER_PINNED_INPUTS: ["worker_source_sha", "worker_digest", "tools_sha", "supabase_project_ref"],
    inputs: workflowInputs,
    secrets: secretsUsed,
    phaseContract: {
      full: { deploy: true, matrix: true, checkoutGate: true },
      deploy: { deploy: true, matrix: false, checkoutGate: false },
      accept: { deploy: false, matrix: true, checkoutGate: false },
      payment: { deploy: true, matrix: true, checkoutGate: false },
      checkout_gate: { deploy: false, matrix: false, checkoutGate: true },
      migrate: { deploy: false, matrix: false, checkoutGate: false },
      preflight: { deploy: false, matrix: false, checkoutGate: false },
      vercel_audit: { deploy: false, matrix: false, checkoutGate: false },
      anythingElse: "FAIL CLOSED"
    }
  },
  section3_migrations: migrations,
  section4_safety: { guards: SAFETY_GUARDS, backupPosition: BACKUP_POSITION },
  section5_phase1bReconciliation: {
    totals: recon.totals,
    matrix,
    whyLifecycleWasWrongFor17: recon.differenceBetween19And22.explanation,
    differenceBetween19And22: recon.differenceBetween19And22,
    technicalReachabilityDefects: recon.totals.technicalReachabilityDefects,
    waitingRuleNotExecutable: recon.totals.waitingRuleNotExecutable,
    waitingRuleNotExecutableDetail: recon.totals.waitingRuleNotExecutable.map((j) => {
      const row = recon.jurisdictions.find((x) => x.jurisdiction === j);
      const d = row.waitingRuleDiagnosis ?? {};
      return {
        jurisdiction: j,
        pathwayId: d.pathwayId ?? null,
        candidateRules: d.candidateRules ?? null,
        candidatesWithAParseableDuration: d.candidatesWithAParseableDuration ?? null,
        candidatesAlsoTextRelevantToThePathway: d.candidatesAlsoTextRelevantToThePathway ?? null,
        emptiedBy: d.emptiedBy ?? null,
        exampleOfNonExecutableProse: (d.examplesOfUnparseableProse ?? [])[0]?.text ?? null
      };
    }),
    questionIdOverlap: {
      distinctQuestionIds: qnodes.totals.distinctQuestionIds,
      sumOfPerBucketDistinctCounts: Object.values(perBucket).reduce((a, b) => a + b.length, 0),
      overlapCount: overlappingIds.length,
      overlaps: overlapDetail,
      explanation: "Bucketing is per jurisdiction-node, not per question id. A question id that is served-but-not-rendered in several jurisdictions can earn a different bucket in each. 42 distinct ids across 1,824 nodes therefore produce 45 (id, bucket) pairs; the surplus of 3 is exactly the three ids below."
    },
    captureReconciliation
  },
  section6_executionPlan: EXECUTION_PLAN,
  discrepanciesForTheOwner: discrepancies
};

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(DOCS_DIR, { recursive: true });
fs.writeFileSync(path.join(DATA_DIR, "env007-owner-authorization.json"), `${JSON.stringify(packet, null, 2)}\n`);
console.log(`wrote data/expungement-ai/flow-audit/env007-owner-authorization.json`);
console.log(`  head matches required: ${packet.headMatchesRequired}`);
console.log(`  tools_sha gates: shape=${toolsShaProof.shapeValid} commit=${toolsShaProof.resolvesToACommit} ancestor=${toolsShaProof.isAncestorOfCanonicalMain} appEquiv=${toolsShaProof.applicationByteEquivalentToApplicationSha} workerEquiv=${toolsShaProof.workerImageInputEquivalentToWorkerSourceSha} scripts=${toolsShaProof.TOOLS_SHA_CONTAINS_REQUIRED_SCRIPTS}`);
console.log(`  migrations analysed: ${migrations.length}`);
console.log(`  matrix rows: ${matrix.length}`);
console.log(`  question-id overlaps: ${overlappingIds.length}`);
console.log(`  captures: ${captureReconciliation.arithmetic}`);
