#!/usr/bin/env node
// Hosted acceptance staging — the hash-gated migration apply and readback.
//
// Applies the schema to the NAMED acceptance Supabase project and to nothing
// else. Every statement goes through the Management API's query endpoint, so
// this holds no database password and cannot be pointed at another host by
// changing a connection string: the project ref is the only address it has,
// and the workflow pins that.
//
// Two layers, deliberately different in strictness:
//
//   BASELINE — every supabase/*.sql file before phase 49, in phase order. These
//   are already live in production, carry no staging authorization record, and
//   exist here only so the acceptance project has the schema the application
//   expects. A baseline file that fails is recorded with its error and does not
//   stop the run; what stops the run is a REQUIRED table missing afterwards.
//
//   AUTHORIZED SEQUENCE — phases 49 through 55. Each file's SHA-256 is
//   recomputed from disk and must match its exact-path authorization plus the
//   independent authorization-readiness record before ANY missing phase is
//   applied. Phases 49-54 remain sourced from the prepared staging action;
//   Phase 55 is acceptance-only and is sourced from Roger's byte-pinned PR #101
//   authorization. One mismatch anywhere stops the run with nothing applied.
//
// The readback is not a catalog tour. It ends with a live negative control that
// tries the exact forgery RCAP-SEC-001 described, as the role that would
// attempt it, against this database.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE_DIR = path.join(rootDir, "hosted-acceptance-evidence");
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const PROJECT_REF = process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "";
const AUTHORIZED_ACCEPTANCE_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";

if (!SUPABASE_ACCESS_TOKEN || PROJECT_REF !== AUTHORIZED_ACCEPTANCE_PROJECT_REF) {
  console.error("MIGRATE: SUPABASE_ACCESS_TOKEN and the exact authorized acceptance project ref are required");
  process.exit(1);
}

const verdicts = new Map();
function record(caseId, passed, observed) {
  verdicts.set(caseId, { passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${observed}`);
}

const REQUIRED_CASES = [
  "authorized_hashes_agree_across_both_records",
  "baseline_schema_present",
  "authorized_sequence_applied_in_order",
  "authorized_migration_ledger_exact",
  "matter_payment_binding_hardened",
  "render_jobs_table_secured",
  "person_namespace_hardened",
  "payment_authority_functions_present",
  "legacy_enqueue_signature_dropped",
  "consumption_unit_keyed_on_item",
  "participant_cannot_self_declare_payment"
];

const sha256File = (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, rel))).digest("hex");

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql })
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON surfaces through text */ }
  return { ok: res.status >= 200 && res.status < 300, status: res.status, json, text };
}

/** One scalar out of a single-row single-column result. */
async function scalar(sql) {
  const r = await query(sql);
  if (!r.ok || !Array.isArray(r.json) || r.json.length === 0) return null;
  return Object.values(r.json[0])[0];
}

const evidence = {
  schemaVersion: "rcap-hosted-acceptance-migrate/v1",
  acceptanceProjectRef: PROJECT_REF,
  baseline: [],
  authorizedSequence: [],
  readback: {}
};

function queryFailure(label, response) {
  return `${label} failed (HTTP ${response?.status ?? "unknown"}): ${String(response?.json?.message ?? response?.text ?? "no response").slice(0, 300)}`;
}

async function mustQuery(label, sql, { rows = false } = {}) {
  const response = await query(sql);
  if (!response.ok || (rows && !Array.isArray(response.json))) {
    const message = queryFailure(label, response);
    evidence.fatalError = message;
    fs.writeFileSync(path.join(EVIDENCE_DIR, "migrate.json"), `${JSON.stringify({ ...evidence, passed: false }, null, 2)}\n`);
    throw new Error(message);
  }
  return response;
}

// --- 1. Hash gate: both records must agree, before anything is applied -------
const action = JSON.parse(fs.readFileSync(path.join(rootDir, "data/rcap-staging-action.json"), "utf8"));
const readiness = JSON.parse(fs.readFileSync(path.join(rootDir, "data/rcap-staging-authorization-readiness.json"), "utf8"));
const authorizationQueue = JSON.parse(fs.readFileSync(path.join(rootDir, "data/rcap-authorization-queue.json"), "utf8"));
const PHASE_55_PATH = "supabase/phase-55-expungement-matter-payment-binding.sql";
const PHASE_55_AUTHORIZATION_ID = "auth-2026-08-16-pr101-release-integration";
const baseSequence = action.migrationsInApplyOrder;
const phase55Authorization = (authorizationQueue.entries ?? []).find((entry) => entry.id === PHASE_55_AUTHORIZATION_ID);
const phase55PathIndex = (phase55Authorization?.authorizedPaths ?? []).indexOf(PHASE_55_PATH);
const phase55AuthorizedHash = phase55PathIndex >= 0
  ? phase55Authorization.authorizedSha256?.[phase55PathIndex] ?? null
  : null;
const sequence = [
  ...baseSequence,
  {
    sequencePosition: baseSequence.length + 1,
    phase: 55,
    path: PHASE_55_PATH,
    sha256: phase55AuthorizedHash,
    authorizationId: PHASE_55_AUTHORIZATION_ID,
    authorizationScope: phase55Authorization?.authorizationScope ?? null
  }
];
{
  // The readiness file carries the same six hashes in a second, independently
  // maintained place. Requiring agreement means a single edited record cannot
  // wave a changed migration through.
  const secondOpinion = readiness.blockers?.find((b) => b.id === "RCAP-SEC-001")?.resolution?.migrationSha256 ?? {};
  const expectedPhases = "49,50,51,52,53,54,55";
  const baseShapeExact = baseSequence.map((entry) => entry.phase).join(",") === "49,50,51,52,53,54"
    && baseSequence.every((entry, index) => entry.sequencePosition === index + 1);
  const phase55AuthorizationExact = phase55Authorization?.decision === "approved"
    && phase55Authorization?.authorizationScope === "repository_integration_and_nonproduction_acceptance_only"
    && phase55Authorization?.scopedAuthorization?.acceptance?.startsWith("authorized")
    && !phase55Authorization?.scopedAuthorization?.production?.startsWith("authorized")
    && phase55PathIndex >= 0
    && /^[0-9a-f]{64}$/.test(String(phase55AuthorizedHash ?? ""));
  const sequenceShapeExact = baseShapeExact
    && phase55AuthorizationExact
    && sequence.map((entry) => entry.phase).join(",") === expectedPhases
    && sequence.every((entry, index) => entry.sequencePosition === index + 1);
  const rows = sequence.map((entry) => {
    const onDisk = sha256File(entry.path);
    const fromAction = entry.sha256;
    const fromReadiness = secondOpinion[`phase-${entry.phase}`] ?? null;
    return {
      phase: entry.phase,
      path: entry.path,
      onDisk,
      matchesActionOrExactAuthorization: onDisk === fromAction,
      matchesReadiness: fromReadiness !== null && onDisk === fromReadiness,
      authorizationId: entry.authorizationId
    };
  });
  const bad = rows.filter((row) => !row.matchesActionOrExactAuthorization || !row.matchesReadiness);
  evidence.authorizedSequence = rows;
  record(
    "authorized_hashes_agree_across_both_records",
    sequenceShapeExact && bad.length === 0,
    sequenceShapeExact && bad.length === 0
      ? `all ${rows.length} migrations recomputed from disk match their exact authorization records and the independent authorization readiness record`
      : `AUTHORIZATION OR HASH DRIFT — refusing to apply anything: sequenceExact=${sequenceShapeExact}; ${bad.map((r) => `phase ${r.phase} (authorization=${r.matchesActionOrExactAuthorization}, readiness=${r.matchesReadiness})`).join(", ") || "hashes individually match"}`
  );
  if (!sequenceShapeExact || bad.length > 0) {
    fs.writeFileSync(path.join(EVIDENCE_DIR, "migrate.json"), `${JSON.stringify({ ...evidence, passed: false }, null, 2)}\n`);
    console.error("\nMIGRATE REFUSED — a migration on disk does not match its authorization record. Nothing was applied.");
    process.exit(1);
  }
}

// --- 1b. Stamp the environment before the first write -----------------------
// Written only to the pinned acceptance ref, and it names that ref, so a copy
// of this row in any other database identifies the wrong project and is
// rejected by the preflight. This is what lets the emptiness proof — which is
// necessarily one-time — keep meaning something on every later run.
{
  await mustQuery("create acceptance environment marker", `
    create table if not exists public.rcap_acceptance_environment_marker (
      project_ref text primary key,
      stamped_at timestamptz not null default now(),
      application_sha text not null,
      note text not null
    )
  `);
  await mustQuery("stamp acceptance environment marker", `
    insert into public.rcap_acceptance_environment_marker (project_ref, application_sha, note)
    values (
      '${PROJECT_REF}',
      '${(process.env.HOSTED_APPLICATION_SHA ?? "unrecorded").replace(/[^0-9a-f]/g, "").slice(0, 40) || "unrecorded"}',
      'RCAP acceptance environment. Stamped by the hosted acceptance pipeline immediately before its first write, at which point every production witness table was proven absent or empty. Not a production database.'
    )
    on conflict (project_ref) do update set stamped_at = now(), application_sha = excluded.application_sha
  `);
  // The marker is metadata about the environment, never participant data, so
  // no browser role has any business reading it.
  await mustQuery("protect acceptance environment marker", `revoke all on public.rcap_acceptance_environment_marker from anon, authenticated`);
}

// --- 2. Baseline: everything before phase 49, in phase order ----------------
{
  const REQUIRED_BASELINE_TABLES = [
    "partner_records",
    "rcap_document_packets",
    "rcap_persons",
    "consumer_briefcase_items",
    "consumer_pending_screening_results",
    "screening_sessions",
    "partner_entitlement"
  ];
  const missingBaselineTables = async () => {
    const missing = [];
    for (const table of REQUIRED_BASELINE_TABLES) {
      const present = await scalar(`select to_regclass('public.${table}') is not null as present`);
      if (present !== true && present !== "true" && present !== "t") missing.push(table);
    }
    return missing;
  };
  const missingBefore = await missingBaselineTables();
  const files = fs.readdirSync(path.join(rootDir, "supabase"))
    .filter((name) => name.endsWith(".sql"))
    .filter((name) => !/^phase-(49|50|51|52|53|54|55)-/.test(name))
    // The demo seed is schema-shaping data for a sales demo, not schema. None
    // of the acceptance journeys need it, and applying it is what first put
    // tenant rows into the acceptance project. Schema only.
    .filter((name) => name !== "partner-seed-demo.sql");

  // Deterministic order: the un-numbered schema file first, then phases
  // ascending with their letter suffixes in order.
  const phaseKey = (name) => {
    const m = /^phase-(\d+)([a-z]*)-/.exec(name);
    if (!m) return name === "partner-journey-os.sql" ? [-2, "", name] : [999, "", name];
    return [Number(m[1]), m[2], name];
  };
  const ordered = files.sort((a, b) => {
    const [an, as_, af] = phaseKey(a);
    const [bn, bs, bf] = phaseKey(b);
    return an - bn || as_.localeCompare(bs) || af.localeCompare(bf);
  });

  if (missingBefore.length > 0) {
    for (const name of ordered) {
      const rel = `supabase/${name}`;
      const sql = fs.readFileSync(path.join(rootDir, rel), "utf8");
      let r = await query(sql);
      let elevated = false;

    // On hosted Supabase the Management API executes as `postgres`, which is a
    // MEMBER of supabase_storage_admin but not the owner of storage.objects —
    // so a migration that enables RLS or defines a policy on that table is
    // refused with 42501 even though the same file applies fine on a local
    // stack where postgres owns everything. Retrying once under the role that
    // does own it is the difference between the hosted and local platforms, not
    // a relaxation of anything: the migration file is used byte-for-byte and is
    // never edited, and the elevation is recorded per file.
      if (!r.ok && /42501|must be owner of/i.test(String(r.json?.message ?? r.text))) {
        r = await query(`set role supabase_storage_admin;\n${sql}\nreset role;`);
        elevated = r.ok;
      }

      evidence.baseline.push({
        file: rel,
        sha256: sha256File(rel),
        applied: r.ok,
        appliedUnderStorageAdminRole: elevated,
        // Truncated hard: a database error can echo a statement, and a statement
        // in the seed file can contain values. The full text is never kept.
        error: r.ok ? null : String(r.json?.message ?? r.text).slice(0, 300)
      });
      console.log(`    ${r.ok ? (elevated ? "applied*" : "applied ") : "skipped "} ${rel}${r.ok ? "" : ` — ${String(r.json?.message ?? r.text).slice(0, 160)}`}`);
    }
  } else {
    evidence.baseline.push({ disposition: "already_present_readback_only", requiredTables: REQUIRED_BASELINE_TABLES });
    console.log("    baseline schema already present; no baseline migration was reapplied");
  }

  // The baseline is judged on its RESULT, not on how many files were clean.
  // These are the tables the acceptance journeys and the authorized sequence
  // both need; if one is missing, the baseline failed no matter what applied.
  // Exact relation names as the migrations create them. `screening_sessions`
  // and `partner_entitlement` carry no rcap_ prefix, and an earlier version of
  // this list invented one for each — which failed the run for two tables that
  // had in fact applied cleanly.
  const missing = await missingBaselineTables();
  const failedFiles = evidence.baseline.filter((entry) => !entry.applied);
  record(
    "baseline_schema_present",
    missing.length === 0,
    missing.length === 0
      ? missingBefore.length === 0
        ? `all ${REQUIRED_BASELINE_TABLES.length} required tables already existed; baseline migrations were not reapplied`
        : `${evidence.baseline.length - failedFiles.length}/${evidence.baseline.length} baseline files applied cleanly; all ${REQUIRED_BASELINE_TABLES.length} required tables exist${failedFiles.length > 0 ? ` (non-blocking failures: ${failedFiles.map((f) => path.basename(f.file)).join(", ")})` : ""}`
      : `required baseline table(s) missing after the baseline pass: ${missing.join(", ")}`
  );
  if (missing.length > 0) {
    fs.writeFileSync(path.join(EVIDENCE_DIR, "migrate.json"), `${JSON.stringify({ ...evidence, passed: false }, null, 2)}\n`);
    console.error("\nMIGRATE STOPPED — the baseline did not produce the schema the authorized sequence builds on. Phases 49-55 were NOT applied.");
    process.exit(1);
  }
}

// --- 3. The authorized seven, in order, applying only what is missing --------
{
  // A migration ledger, because "apply the sequence" and "the sequence is
  // applied" are different claims and only the second one matters.
  //
  // Phases 49-54 are not all written to be re-runnable — phase 50 creates a
  // trigger unconditionally — so a second run against an environment that
  // already has them fails on a duplicate object. That is a re-run artifact,
  // not a defect, and treating it as a failure would mean the pipeline could
  // never verify an environment it had already built.
  //
  // So each phase is applied once and recorded against the exact SHA-256 that
  // was applied. A later run skips a phase whose recorded hash matches the file
  // on disk. A phase whose recorded hash DIFFERS is not skipped and not
  // silently re-applied: the hash gate above has already refused the run in
  // that case, because the file no longer matches its authorization record.
  await mustQuery("create acceptance migration ledger", `
    create table if not exists public.rcap_acceptance_migration_ledger (
      phase int primary key,
      sha256 text not null,
      authorization_id text not null,
      applied_at timestamptz not null default now(),
      applied_by text not null
    )
  `);
  await mustQuery("protect acceptance migration ledger", `revoke all on public.rcap_acceptance_migration_ledger from anon, authenticated`);

  const ledgerRows = await mustQuery(
    "read acceptance migration ledger",
    `select phase, sha256, authorization_id, applied_by from public.rcap_acceptance_migration_ledger order by phase`,
    { rows: true }
  );
  const ledger = new Map(
    ledgerRows.json.map((row) => [Number(row.phase), {
      sha256: String(row.sha256),
      authorizationId: String(row.authorization_id),
      appliedBy: String(row.applied_by)
    }])
  );

  // Phase 55 was present before the hosted ledger knew about it because the old
  // baseline filter accidentally treated every phase after 54 as baseline. A
  // rerun must not rewrite that already-satisfied schema merely to add a ledger
  // row. Adoption is allowed only if the current catalog and binding data are
  // an exact fixed point of the hash-authorized migration. Named
  // IF-NOT-EXISTS columns/indexes receive explicit shape checks because a wrong
  // object with the right name would otherwise survive a replay unchanged.
  const phase55StructurePresent = async () => {
    const present = await scalar(`select
      to_regprocedure('public.expungement_packet_product_id()') is not null
      and to_regprocedure('public.consumer_matter_id_for_briefcase_item(uuid)') is not null
      and to_regprocedure('public.record_consumer_packet_payment(uuid,text,integer,text,text,text,text,text,text,text,text,text,uuid,uuid)') is not null
      and to_regprocedure('public.record_consumer_packet_payment(uuid,text,integer,text,text,text,text,text,text,text,text)') is null
      and to_regprocedure('public.consumer_packet_payment_authority(uuid,uuid,text,uuid,uuid)') is not null
      and to_regprocedure('public.consumer_packet_payment_authority(uuid,uuid)') is not null
      and to_regprocedure('public.packet_render_jobs_paid_matter_guard()') is not null
      and to_regprocedure('public.consumer_payment_consumption_binding_guard()') is not null
      and public.expungement_packet_product_id() = 'expungement_packet'
      and public.consumer_matter_id_for_briefcase_item(null) is null
      and public.consumer_matter_id_for_briefcase_item('11111111-1111-4111-8111-111111111111'::uuid) = '5fec74d7-65fa-4dc4-b31b-291d8ac8fdb3'::uuid
      and (select count(*) = 3 and bool_and(
        (column_name = 'payment_product_id' and data_type = 'text' and is_nullable = 'YES')
        or (column_name in ('payment_person_id','payment_matter_id') and data_type = 'uuid' and is_nullable = 'YES')
      ) from information_schema.columns where table_schema = 'public' and table_name = 'consumer_briefcase_items' and column_name in ('payment_product_id','payment_person_id','payment_matter_id'))
      and (select count(*) = 4 and bool_and(
        (column_name in ('product_id','checkout_session_id','currency') and data_type = 'text' and is_nullable = 'NO')
        or (column_name = 'amount_cents' and data_type = 'integer' and is_nullable = 'NO')
      ) from information_schema.columns where table_schema = 'public' and table_name = 'consumer_packet_payment_consumption' and column_name in ('product_id','checkout_session_id','amount_cents','currency'))
      and (select count(*) = 2 and bool_and(
        i.indisunique and i.indisvalid and i.indisready
        and i.indnkeyatts = case idx.relname when 'consumer_briefcase_items_checkout_session_uk' then 1 else 2 end
        and regexp_replace(lower(pg_get_indexdef(i.indexrelid, 1, false)), '[^a-z0-9_]+', '', 'g') = case idx.relname when 'consumer_briefcase_items_checkout_session_uk' then 'checkout_session_id' else 'user_id' end
        and (idx.relname = 'consumer_briefcase_items_checkout_session_uk' or regexp_replace(lower(pg_get_indexdef(i.indexrelid, 2, false)), '[^a-z0-9_]+', '', 'g') = 'source_session_id')
        and regexp_replace(lower(coalesce(pg_get_expr(i.indpred, i.indrelid), '')), '[^a-z0-9_]+', '', 'g') = case idx.relname when 'consumer_briefcase_items_checkout_session_uk' then 'checkout_session_idisnotnull' else 'source_session_idisnotnull' end
      ) from pg_index i join pg_class idx on idx.oid = i.indexrelid join pg_class tbl on tbl.oid = i.indrelid join pg_namespace n on n.oid = tbl.relnamespace where n.nspname = 'public' and tbl.relname = 'consumer_briefcase_items' and idx.relname in ('consumer_briefcase_items_checkout_session_uk','consumer_briefcase_items_user_source_session_uk'))
    `);
    return present === true || present === "true" || present === "t";
  };

  // The remaining exactness proof and ledger write are added below. They run
  // under one lock-holding transaction so no concurrent participant write can
  // race the before/after signature or the adoption row.
  const phase55SignatureSql = `select encode(extensions.digest(convert_to(jsonb_build_object(
    'functions', coalesce((select jsonb_agg(jsonb_build_object(
      'identity', p.oid::regprocedure::text, 'definition', pg_get_functiondef(p.oid),
      'owner', pg_get_userbyid(p.proowner), 'acl', coalesce(p.proacl::text, ''),
      'security_definer', p.prosecdef, 'volatility', p.provolatile,
      'config', coalesce(to_jsonb(p.proconfig), 'null'::jsonb)
    ) order by p.oid::regprocedure::text) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.oid in (
        to_regprocedure('public.expungement_packet_product_id()'),
        to_regprocedure('public.consumer_matter_id_for_briefcase_item(uuid)'),
        to_regprocedure('public.record_consumer_packet_payment(uuid,text,integer,text,text,text,text,text,text,text,text,text,uuid,uuid)'),
        to_regprocedure('public.consumer_packet_payment_authority(uuid,uuid,text,uuid,uuid)'),
        to_regprocedure('public.consumer_packet_payment_authority(uuid,uuid)'),
        to_regprocedure('public.packet_render_jobs_paid_matter_guard()'),
        to_regprocedure('public.consumer_payment_consumption_binding_guard()')
      )), '[]'::jsonb),
    'old_writer_present', to_regprocedure('public.record_consumer_packet_payment(uuid,text,integer,text,text,text,text,text,text,text,text)') is not null,
    'triggers', coalesce((select jsonb_agg(jsonb_build_object(
      'table', c.oid::regclass::text, 'name', t.tgname, 'definition', pg_get_triggerdef(t.oid, false),
      'enabled', t.tgenabled, 'function', t.tgfoid::regprocedure::text
    ) order by c.oid::regclass::text, t.tgname) from pg_trigger t join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal
      and t.tgname in ('packet_render_jobs_paid_matter_insert_trg','packet_render_jobs_paid_matter_finalize_trg','consumer_payment_consumption_binding_trg')), '[]'::jsonb),
    'constraints', coalesce((select jsonb_agg(jsonb_build_object(
      'table', c.conrelid::regclass::text, 'name', c.conname, 'type', c.contype,
      'validated', c.convalidated, 'definition', pg_get_constraintdef(c.oid, false)
    ) order by c.conrelid::regclass::text, c.conname) from pg_constraint c where c.conname in (
      'consumer_briefcase_items_payment_product_check','consumer_briefcase_items_paid_requires_server_evidence',
      'consumer_payment_consumption_product_check','consumer_payment_consumption_amount_check','consumer_payment_consumption_currency_check'
    )), '[]'::jsonb),
    'indexes', coalesce((select jsonb_agg(jsonb_build_object(
      'table', i.indrelid::regclass::text, 'name', idx.relname, 'definition', pg_get_indexdef(i.indexrelid, 0, false),
      'unique', i.indisunique, 'valid', i.indisvalid, 'ready', i.indisready
    ) order by idx.relname) from pg_index i join pg_class idx on idx.oid = i.indexrelid
      where idx.relname in ('consumer_briefcase_items_checkout_session_uk','consumer_briefcase_items_user_source_session_uk')), '[]'::jsonb),
    'columns', coalesce((select jsonb_agg(jsonb_build_object(
      'table', table_name, 'name', column_name, 'type', data_type, 'nullable', is_nullable,
      'default', column_default, 'comment', col_description((quote_ident(table_schema)||'.'||quote_ident(table_name))::regclass, ordinal_position)
    ) order by table_name, ordinal_position) from information_schema.columns where table_schema = 'public' and (
      (table_name = 'consumer_briefcase_items' and column_name in ('payment_product_id','payment_person_id','payment_matter_id'))
      or (table_name = 'consumer_packet_payment_consumption' and column_name in ('product_id','checkout_session_id','amount_cents','currency'))
    )), '[]'::jsonb),
    'function_privileges', (select jsonb_agg(jsonb_build_object(
      'role', role_name, 'writer', has_function_privilege(role_name, 'public.record_consumer_packet_payment(uuid,text,integer,text,text,text,text,text,text,text,text,text,uuid,uuid)', 'EXECUTE'),
      'authority_exact', has_function_privilege(role_name, 'public.consumer_packet_payment_authority(uuid,uuid,text,uuid,uuid)', 'EXECUTE'),
      'authority_compat', has_function_privilege(role_name, 'public.consumer_packet_payment_authority(uuid,uuid)', 'EXECUTE')
    ) order by role_name) from (values ('public'),('anon'),('authenticated'),('service_role')) roles(role_name)),
    'column_privileges', (select jsonb_agg(jsonb_build_object(
      'role', role_name, 'column', column_name,
      'insert', has_column_privilege(role_name, 'public.consumer_briefcase_items', column_name, 'INSERT'),
      'update', has_column_privilege(role_name, 'public.consumer_briefcase_items', column_name, 'UPDATE')
    ) order by role_name, column_name) from (values ('anon'),('authenticated')) roles(role_name)
      cross join (values ('payment_product_id'),('payment_person_id'),('payment_matter_id'),('payment_allowed'),('item_type'),('jurisdiction'),('pathway_label'),('result_code'),('packet_type'),('source_session_id')) columns(column_name)),
    'paid_items', coalesce((select jsonb_agg(to_jsonb(x) order by x.id) from (
      select id::text, user_id::text, payment_status, payment_product_id,
             payment_person_id::text, payment_matter_id::text, checkout_session_id,
             amount_cents, currency, provider_event_id
        from public.consumer_briefcase_items where payment_status = 'paid'
    ) x), '[]'::jsonb),
    'consumer_persons', coalesce((select jsonb_agg(to_jsonb(x) order by x.id) from (
      select id::text, partner_slug, match_key from public.rcap_persons
       where partner_slug = 'expungement-ai-consumer'
    ) x), '[]'::jsonb),
    'consumptions', coalesce((select jsonb_agg(to_jsonb(x) order by x.consumer_briefcase_item_id) from (
      select consumer_briefcase_item_id::text, consumer_auth_user_id::text,
             person_id::text, matter_id::text, product_id, checkout_session_id,
             amount_cents, currency, provider_event_id
        from public.consumer_packet_payment_consumption
    ) x), '[]'::jsonb)
  )::text, 'UTF8'), 'sha256'), 'hex')`;

  const phase55Sql = fs.readFileSync(path.join(rootDir, PHASE_55_PATH), "utf8");
  const phase55Wrapped = /^(?<prefix>[\s\S]*?\n)begin;\n(?<body>[\s\S]*?)\ncommit;(?<newline>\n?)$/.exec(phase55Sql);
  if (!phase55Wrapped?.groups) throw new Error("Phase 55 authorized SQL does not have the expected single top-level transaction wrapper");
  const phase55Body = phase55Wrapped.groups.body;
  const phase55Reconstituted = `${phase55Wrapped.groups.prefix}begin;\n${phase55Body}\ncommit;${phase55Wrapped.groups.newline}`;
  if (phase55Reconstituted !== phase55Sql || /(^|\n)\s*(begin|commit)\s*;/i.test(phase55Body)) {
    throw new Error("Phase 55 transaction-wrapper extraction was not byte-exact or found a nested transaction control");
  }

  const phase55ExactFunctionAttributes = async () => {
    const exact = await scalar(`select count(*) = 7 and bool_and(
      pg_get_userbyid(p.proowner) = 'postgres'
      and array_to_string(coalesce(p.proconfig, array[]::text[]), ',') like '%search_path=%'
      and p.prosecdef = (p.proname not in ('expungement_packet_product_id','consumer_matter_id_for_briefcase_item'))
      and p.provolatile = case
        when p.proname in ('expungement_packet_product_id','consumer_matter_id_for_briefcase_item') then 'i'::"char"
        when p.proname = 'consumer_packet_payment_authority' then 's'::"char"
        else 'v'::"char" end
    ) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.oid in (
      to_regprocedure('public.expungement_packet_product_id()'),
      to_regprocedure('public.consumer_matter_id_for_briefcase_item(uuid)'),
      to_regprocedure('public.record_consumer_packet_payment(uuid,text,integer,text,text,text,text,text,text,text,text,text,uuid,uuid)'),
      to_regprocedure('public.consumer_packet_payment_authority(uuid,uuid,text,uuid,uuid)'),
      to_regprocedure('public.consumer_packet_payment_authority(uuid,uuid)'),
      to_regprocedure('public.packet_render_jobs_paid_matter_guard()'),
      to_regprocedure('public.consumer_payment_consumption_binding_guard()')
    )`);
    return exact === true || exact === "true" || exact === "t";
  };

  const phase55AdoptionTransaction = async (entry, onDisk) => {
    if (!await phase55StructurePresent() || !await phase55ExactFunctionAttributes()) return { ok: false, reason: "exact_preconditions_absent" };
    const response = await query(`
      begin;
      set local lock_timeout = '15s';
      set local statement_timeout = '120s';
      lock table public.consumer_briefcase_items, public.rcap_persons, public.packet_render_jobs,
                 public.consumer_packet_payment_consumption in access exclusive mode;
      lock table public.screening_sessions in share mode;
      lock table public.rcap_acceptance_migration_ledger in access exclusive mode;
      create or replace function pg_temp.rcap_phase55_signature()
      returns text language sql stable as $signature$ ${phase55SignatureSql} $signature$;
      create temporary table rcap_phase55_signature_before on commit drop as
        select pg_temp.rcap_phase55_signature() as signature;
      savepoint phase55_probe;
      ${phase55Body}
      do $fixed_point$
      begin
        if (select signature from rcap_phase55_signature_before) is distinct from pg_temp.rcap_phase55_signature() then
          raise exception 'phase-55 catalog or binding data is not an exact fixed point of the authorized migration';
        end if;
      end
      $fixed_point$;
      rollback to savepoint phase55_probe;
      do $restored$
      begin
        if (select signature from rcap_phase55_signature_before) is distinct from pg_temp.rcap_phase55_signature() then
          raise exception 'phase-55 rollback did not restore the pre-probe signature';
        end if;
      end
      $restored$;
      insert into public.rcap_acceptance_migration_ledger (phase, sha256, authorization_id, applied_by)
      values (55, '${onDisk}', '${entry.authorizationId}', 'adopted_exact_authorized_fixed_point')
      on conflict (phase) do nothing;
      do $ledger_exact$
      begin
        if not exists (
          select 1 from public.rcap_acceptance_migration_ledger
           where phase = 55 and sha256 = '${onDisk}' and authorization_id = '${entry.authorizationId}'
        ) or (select count(*) from public.rcap_acceptance_migration_ledger where phase = 55) <> 1 then
          raise exception 'phase-55 ledger row is not exact after adoption';
        end if;
      end
      $ledger_exact$;
      commit;
      select phase, sha256, authorization_id, applied_by
        from public.rcap_acceptance_migration_ledger where phase = 55;
    `);
    const rows = response.ok && Array.isArray(response.json) ? response.json : [];
    const exact = rows.length === 1 && Number(rows[0].phase) === 55
      && rows[0].sha256 === onDisk && rows[0].authorization_id === entry.authorizationId;
    return exact ? { ok: true, row: rows[0] } : { ok: false, reason: queryFailure("Phase 55 fixed-point adoption", response) };
  };

  const writeLedgerRow = async (entry, onDisk, appliedBy) => {
    const insert = await query(`
      insert into public.rcap_acceptance_migration_ledger (phase, sha256, authorization_id, applied_by)
      values (${entry.phase}, '${onDisk}', '${entry.authorizationId}', '${appliedBy}')
      on conflict (phase) do nothing
      returning phase, sha256, authorization_id
    `);
    if (!insert.ok) return { ok: false, error: queryFailure(`record phase ${entry.phase} in ledger`, insert) };
    const readback = await query(`select phase, sha256, authorization_id, applied_by from public.rcap_acceptance_migration_ledger where phase = ${entry.phase}`);
    const rows = readback.ok && Array.isArray(readback.json) ? readback.json : [];
    const exact = rows.length === 1 && Number(rows[0].phase) === entry.phase
      && rows[0].sha256 === onDisk && rows[0].authorization_id === entry.authorizationId;
    return exact ? { ok: true, row: rows[0] } : {
      ok: false,
      error: readback.ok ? `phase ${entry.phase} ledger readback was not exact` : queryFailure(`read back phase ${entry.phase} ledger row`, readback)
    };
  };

  let satisfied = 0;
  let failure = null;
  for (const entry of sequence) {
    const row = evidence.authorizedSequence.find((candidate) => candidate.phase === entry.phase);
    const onDisk = row.onDisk;

    const ledgerEntry = ledger.get(entry.phase);
    if (ledgerEntry && (ledgerEntry.sha256 !== onDisk || ledgerEntry.authorizationId !== entry.authorizationId)) {
      row.applied = false;
      row.disposition = "ledger_hash_or_authorization_mismatch_refused";
      failure = `phase ${entry.phase} ledger row (${ledgerEntry.sha256}, ${ledgerEntry.authorizationId}) does not match the authorized on-disk row (${onDisk}, ${entry.authorizationId}); refusing to overwrite migration history`;
      break;
    }

    if (ledgerEntry?.sha256 === onDisk && ledgerEntry.authorizationId === entry.authorizationId) {
      row.applied = true;
      row.disposition = "already_applied_at_this_hash";
      satisfied += 1;
      console.log(`    phase ${entry.phase} already applied at ${onDisk.slice(0, 12)}… (ledger)`);
      continue;
    }

    if (entry.phase === 55) {
      const adopted = await phase55AdoptionTransaction(entry, onDisk);
      if (adopted.ok) {
        row.applied = true;
        row.disposition = "exact_authorized_fixed_point_adopted_without_reapply";
        satisfied += 1;
        console.log("    phase 55 adopted without reapply (catalog and binding data are an exact fixed point of the authorized bytes)");
        continue;
      }
    }

    const sql = fs.readFileSync(path.join(rootDir, entry.path), "utf8");
    const r = await query(sql);
    if (!r.ok) {
      row.applied = false;
      row.error = String(r.json?.message ?? r.text).slice(0, 400);
      failure = `phase ${entry.phase} failed: ${row.error}`;
      break;
    }

    const written = entry.phase === 55
      ? await phase55AdoptionTransaction(entry, onDisk)
      : await writeLedgerRow(entry, onDisk, "hosted_acceptance_pipeline");
    if (!written.ok) {
      row.applied = false;
      row.disposition = entry.phase === 55 ? "post_apply_fixed_point_or_ledger_failed" : "ledger_write_or_readback_failed";
      failure = written.error ?? written.reason ?? `phase ${entry.phase} exact ledger readback failed`;
      break;
    }
    row.applied = true;
    row.disposition = "applied_by_this_run";
    satisfied += 1;
    console.log(`    phase ${entry.phase} applied (${entry.authorizationId})`);
  }

  record(
    "authorized_sequence_applied_in_order",
    satisfied === sequence.length,
    satisfied === sequence.length
      ? `49 -> 50 -> 51 -> 52 -> 53 -> 54 -> 55 are all present on ${PROJECT_REF} at their authorized hashes (${satisfied}/${sequence.length}: ${evidence.authorizedSequence.map((r) => `${r.phase}=${r.disposition}`).join(", ")}). The readback below is what proves they took effect.`
      : `${failure} — satisfied ${satisfied}/${sequence.length}; the sequence is indivisible, so this environment must not serve a participant`
  );

  const finalLedgerResponse = await query(`select phase, sha256, authorization_id from public.rcap_acceptance_migration_ledger where phase between 49 and 55 order by phase`);
  const finalLedgerRows = finalLedgerResponse.ok && Array.isArray(finalLedgerResponse.json) ? finalLedgerResponse.json : [];
  const finalLedgerExact = finalLedgerRows.length === sequence.length && sequence.every((entry, index) => {
    const ledgerRow = finalLedgerRows[index];
    const authorizedRow = evidence.authorizedSequence.find((candidate) => candidate.phase === entry.phase);
    return Number(ledgerRow?.phase) === entry.phase
      && ledgerRow?.sha256 === authorizedRow?.onDisk
      && ledgerRow?.authorization_id === entry.authorizationId;
  });
  record(
    "authorized_migration_ledger_exact",
    finalLedgerExact,
    finalLedgerExact
      ? "ledger readback contains exactly phases 49-55 with each authorized hash and authorization id"
      : `ledger readback failed or drifted: HTTP ${finalLedgerResponse.status}; rows=${finalLedgerRows.length}`
  );

  const phase55Entry = sequence.find((entry) => entry.phase === 55);
  const phase55AuthorizedRow = evidence.authorizedSequence.find((entry) => entry.phase === 55);
  const phase55FinalProof = finalLedgerExact
    ? await phase55AdoptionTransaction(phase55Entry, phase55AuthorizedRow.onDisk)
    : { ok: false };
  const phase55Readback = finalLedgerExact && phase55FinalProof.ok;
  record(
    "matter_payment_binding_hardened",
    phase55Readback,
    phase55Readback
      ? "phase 55 exact ledger, functions, columns and IF-NOT-EXISTS index shapes are present; fixed-point adoption proved the remaining catalog, grants and binding data"
      : "phase 55 exact ledger or structural readback is incomplete; the acceptance environment must remain dark"
  );
  evidence.readback.phase55 = {
    exactLedgerAndStructure: phase55Readback,
    fixedPointProbeRolledBack: phase55FinalProof.ok
  };
}

// --- 4. Readback -------------------------------------------------------------
{
  const rlsOn = async (table) => scalar(
    `select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = '${table}'`
  );
  const truthy = (value) => value === true || value === "true" || value === "t";

  {
    const exists = await scalar(`select to_regclass('public.packet_render_jobs') is not null`);
    const rls = await rlsOn("packet_render_jobs");
    const browserGrants = await scalar(
      `select count(*)::int from information_schema.role_table_grants
       where table_schema = 'public' and table_name = 'packet_render_jobs' and grantee in ('anon','authenticated')`
    );
    const pass = truthy(exists) && truthy(rls) && Number(browserGrants) === 0;
    record(
      "render_jobs_table_secured",
      pass,
      `packet_render_jobs exists=${truthy(exists)}, rowsecurity=${truthy(rls)}, anon/authenticated table grants=${browserGrants} (must be 0)`
    );
    evidence.readback.renderJobs = { exists: truthy(exists), rls: truthy(rls), browserGrants: Number(browserGrants) };
  }

  {
    const rls = await rlsOn("rcap_persons");
    const browserGrants = await scalar(
      `select count(*)::int from information_schema.role_table_grants
       where table_schema = 'public' and table_name = 'rcap_persons' and grantee in ('anon','authenticated')`
    );
    const trigger = await scalar(
      `select count(*)::int from pg_trigger t join pg_class c on c.oid = t.tgrelid
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = 'partner_records' and not t.tgisinternal`
    );
    const pass = truthy(rls) && Number(browserGrants) === 0 && Number(trigger) > 0;
    record(
      "person_namespace_hardened",
      pass,
      `phase 54 on the hosted project: rcap_persons rowsecurity=${truthy(rls)}, anon/authenticated grants=${browserGrants} (must be 0), partner_records guard triggers=${trigger} (must be > 0)`
    );
    evidence.readback.personNamespace = { rls: truthy(rls), browserGrants: Number(browserGrants), triggers: Number(trigger) };
  }

  {
    const rows = await query(
      `select p.proname, p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname in ('record_consumer_packet_payment','finalize_packet_render_job','enqueue_packet_render_job')`
    );
    const found = Array.isArray(rows.json) ? rows.json : [];
    const byName = (name) => found.filter((r) => r.proname === name);
    const definer = (name) => byName(name).every((r) => truthy(r.prosecdef)) && byName(name).length > 0;
    const pass = definer("record_consumer_packet_payment") && definer("finalize_packet_render_job") && byName("enqueue_packet_render_job").length > 0;
    record(
      "payment_authority_functions_present",
      pass,
      `record_consumer_packet_payment=${byName("record_consumer_packet_payment").length} (security definer ${definer("record_consumer_packet_payment")}), finalize_packet_render_job=${byName("finalize_packet_render_job").length} (security definer ${definer("finalize_packet_render_job")}), enqueue_packet_render_job=${byName("enqueue_packet_render_job").length}`
    );
    evidence.readback.functions = found;
  }

  {
    // Phase 53 drops the 13-argument enqueue. Its survival would mean the gate
    // is bound to a signature phase 52 no longer authorizes.
    const thirteen = await scalar(
      `select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'enqueue_packet_render_job' and p.pronargs = 13`
    );
    record(
      "legacy_enqueue_signature_dropped",
      Number(thirteen) === 0,
      `13-argument enqueue_packet_render_job overloads remaining: ${thirteen} (phase 53 must leave 0)`
    );
    evidence.readback.legacyEnqueueOverloads = Number(thirteen);
  }

  {
    // G11: the consumption unit must be keyed on the item/receipt/matter, not
    // on the job id — otherwise one $50 purchase authorizes unlimited packets.
    const indexes = await query(
      `select indexname, indexdef from pg_indexes
       where schemaname = 'public' and indexdef ilike '%unique%'
         and (tablename ilike '%consumption%' or tablename ilike '%payment%' or tablename ilike '%ledger%')`
    );
    const defs = Array.isArray(indexes.json) ? indexes.json : [];
    const keyedOnItem = defs.some((row) => /item_id|receipt|matter/i.test(String(row.indexdef)));
    const keyedOnJobOnly = defs.some((row) => /\(\s*job_id\s*\)/i.test(String(row.indexdef)));
    record(
      "consumption_unit_keyed_on_item",
      keyedOnItem && !keyedOnJobOnly,
      keyedOnItem && !keyedOnJobOnly
        ? `a unique consumption-unit index keyed on the item/receipt/matter is present and no job-id-only unique index remains (${defs.length} unique index(es) inspected)`
        : `G11 shape not confirmed on the hosted project: keyedOnItem=${keyedOnItem}, jobIdOnlyIndexPresent=${keyedOnJobOnly}, indexes=${defs.map((d) => d.indexname).join(", ") || "none"}`
    );
    evidence.readback.consumptionUnitIndexes = defs.map((d) => ({ name: d.indexname, def: String(d.indexdef).slice(0, 240) }));
  }

  {
    // The live negative control. This is the exact forgery RCAP-SEC-001
    // described, attempted as the role that would attempt it, against this
    // database. A catalog assertion can be satisfied by a policy that does not
    // bite; this cannot.
    const probe = await query(`
      do $$
      declare
        probe_user uuid := gen_random_uuid();
        probe_item uuid;
        forged boolean := false;
      begin
        -- consumer_briefcase_items.user_id references auth.users, so the probe
        -- needs a real identity. It is created here, used for one statement,
        -- and removed in the same block whatever the outcome.
        insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
        values (probe_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
                'negative-control-' || probe_user || '@rcap-acceptance.test', '', now(), now(), now());

        insert into public.consumer_briefcase_items
          (user_id, item_type, jurisdiction, status, summary_json, payment_status)
        values
          (probe_user, 'result', 'MS', 'guidance_saved',
           '{"note":"hosted acceptance negative control"}'::jsonb, 'unpaid')
        returning id into probe_item;

        begin
          set local role authenticated;
          update public.consumer_briefcase_items set payment_status = 'paid' where id = probe_item;
          if found then forged := true; end if;
        exception when others then
          forged := false;
        end;
        reset role;

        if forged or exists (select 1 from public.consumer_briefcase_items where id = probe_item and payment_status = 'paid') then
          delete from public.consumer_briefcase_items where id = probe_item;
          delete from auth.users where id = probe_user;
          raise exception 'RCAP-SEC-001 REPRODUCED ON THE HOSTED ACCEPTANCE PROJECT';
        end if;

        delete from public.consumer_briefcase_items where id = probe_item;
        delete from auth.users where id = probe_user;
      end $$;
    `);
    const reproduced = !probe.ok && /RCAP-SEC-001 REPRODUCED/.test(String(probe.json?.message ?? probe.text));
    record(
      "participant_cannot_self_declare_payment",
      probe.ok,
      probe.ok
        ? "a row was inserted unpaid, the authenticated role's attempt to set payment_status='paid' on it did not take effect, and the probe row was removed — the RCAP-SEC-001 forgery does not reproduce here"
        : reproduced
          ? "CRITICAL: the forgery SUCCEEDED against the hosted acceptance project"
          : `the negative control could not be executed: ${String(probe.json?.message ?? probe.text).slice(0, 300)}`
    );
    evidence.readback.negativeControl = { executed: probe.ok, reproduced };
  }
}

// --- verdict -----------------------------------------------------------------
{
  const missing = REQUIRED_CASES.filter((caseId) => !verdicts.has(caseId));
  const failed = [...verdicts.entries()].filter(([, v]) => !v.passed).map(([caseId]) => caseId);
  evidence.requiredCases = REQUIRED_CASES;
  evidence.missingCases = missing;
  evidence.failedCases = failed;
  evidence.passed = missing.length === 0 && failed.length === 0;
  fs.writeFileSync(path.join(EVIDENCE_DIR, "migrate.json"), `${JSON.stringify(evidence, null, 2)}\n`);

  console.log("");
  if (missing.length > 0) console.error(`MIGRATE INCOMPLETE — no verdict registered for: ${missing.join(", ")}`);
  if (failed.length > 0) console.error(`MIGRATE FAILED — ${failed.join(", ")}`);
  if (evidence.passed) console.log(`MIGRATE PASSED — ${REQUIRED_CASES.length}/${REQUIRED_CASES.length} cases; 49-55 are applied and enforcing on ${PROJECT_REF}.`);
  process.exit(evidence.passed ? 0 : 1);
}
