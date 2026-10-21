#!/usr/bin/env node
// Proves the forward-only Production schema upgrade still does what it claims:
// starting from the recovered Production baseline and applying only the committed
// forward migrations reaches the accepted repository schema exactly, does it the
// same way twice, and never weakens the security posture on the way.
//
// Nothing here connects to Supabase. Every database is local and disposable.
//
//   node scripts/verify-rcap-production-schema-upgrade.mjs
//
// The replay builds three databases on a local PostgreSQL 17 cluster, so a full run
// takes a few minutes. Static checks run first and fail fast.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lab = path.join(root, "scripts", "rcap-schema-upgrade-lab.sh");
const migrationsDir = path.join(root, "supabase", "migrations");

const BASELINE = "20260728213131_remote_schema.sql";
const BASELINE_BYTES = 177_074;
const BASELINE_SHA256 = "3d8695920577a2982ce4748839d091e987fa43baac917c97e2a79ba6a55f2452";

/** Every forward step, in the order they must run. */
const FORWARD_CHAIN = [
  "20260818200000_rcap_upgrade_00_roles.sql",
  "20260818201000_rcap_upgrade_01_tables_and_columns.sql",
  "20260818202000_rcap_upgrade_02_functions.sql",
  "20260818203000_rcap_upgrade_03_constraints_and_indexes.sql",
  "20260818204000_rcap_upgrade_04_views.sql",
  "20260818205000_rcap_upgrade_05_triggers.sql",
  "20260818206000_rcap_upgrade_06_rls_and_policies.sql",
  "20260818207000_rcap_upgrade_07_grants.sql",
  "20260818208000_rcap_upgrade_08_storage_buckets.sql",
  "20260818209000_rcap_upgrade_09_security_hardening.sql",
  "20260819120000_rcap_partner_provisioning.sql",
  "20260822180000_rcap_prefill_reproposal.sql",
  "20260823171000_internal_admin_authority_hardening.sql",
  "20260825120000_clinic_mode_core.sql",
  "20260825121000_clinic_mode_security.sql",
  "20260825122000_clinic_mode_accounting_reporting.sql",
  "20260828100000_shared_pending_result_and_atomic_claim.sql",
  "20260830120000_participant_data_rights.sql",
  "20260901115000_consumer_packet_artifact_provenance.sql",
  "20260901120000_dtc_consumer_launch_rails.sql",
  "20260901130000_consumer_private_delivery.sql",
  "20260901140000_tighten_consumer_artifact_authorization.sql",
  "20260903120000_clinic_event_jurisdiction_lock.sql",
  "20260903130000_atomic_sponsored_packet_finalization.sql",
  "20260906120000_sponsored_route_render_transaction.sql",
  "20260906130000_verified_artifact_regeneration.sql",
];

/** Codified by step 09. Named here so the checks below cannot drift from the intent. */
const HARDENED_RLS_TABLES = [
  "partner_entitlement",
  "rcap_acceptance_environment_marker",
  "rcap_acceptance_migration_ledger",
  "rcap_record_events",
];
const SECURITY_INVOKER_VIEWS = [
  "content_public_authors",
  "content_public_media",
  "content_public_posts",
  "content_public_state_editorial",
  "content_public_testimonials",
];
/** Columns anon must never reach, one per hardened content table. */
const FORBIDDEN_ANON_COLUMNS = [
  ["content_posts", "doc"],
  ["content_posts", "search_text"],
  ["content_media", "storage_path"],
  ["content_media", "permission_status"],
  ["content_authors", "auth_user_id"],
  ["content_testimonials", "consent_status"],
  ["content_state_editorial", "legal_approved_at"],
  ["content_media_usages", "usage_kind"],
];

// A destructive operation is not banned outright — it is banned until somebody has
// written down which statement it is and why it is safe. Each entry pins the exact
// normalized statement, so a new destructive statement cannot hide behind an
// existing disposition.
const REVIEWED_DESTRUCTIVE_DISPOSITIONS = [
  {
    file: "20260818203000_rcap_upgrade_03_constraints_and_indexes.sql",
    statement:
      'alter table "public"."rcap_intake_sessions" drop constraint "rcap_intake_sessions_eligibility_signal_check";',
    why: "re-added in the same step accepting 9 values instead of 5, so no existing row can be rejected",
  },
  {
    file: "20260818203000_rcap_upgrade_03_constraints_and_indexes.sql",
    statement:
      'alter table "public"."rcap_record_events" drop constraint "rcap_record_events_record_type_check";',
    why: "re-added in the same step accepting 5 values instead of 2, so no existing row can be rejected",
  },
  ...[
    "content_authors_anon_public_read on public.content_authors",
    "content_posts_anon_public_read on public.content_posts",
    "content_state_editorial_anon_public_read on public.content_state_editorial",
    "content_testimonials_anon_public_read on public.content_testimonials",
    "content_media_usages_anon_public_read on public.content_media_usages",
    "content_media_anon_public_read on public.content_media",
  ].map((target) => ({
    file: "20260818209000_rcap_upgrade_09_security_hardening.sql",
    statement: `drop policy if exists ${target};`,
    why:
      "makes step 09 re-runnable. The policy is created by the next statement and exists " +
      "in neither the Production baseline nor the pre-remediation schema, so the drop can " +
      "remove nothing that was there before.",
  })),
  // Reviewed 2026-09-06 for the migrations added to FORWARD_CHAIN by DEL-E. Each drop below
  // is either replaced by the next statement of the same file, or re-added inside the same
  // statement, or names an object that exists in neither the recovered Production baseline
  // nor any earlier step of the chain. Where a rule is re-stated it is relaxed or narrowed,
  // never widened, so no row can be removed and no existing row can be rejected. Two further
  // destructive statements in 20260823171000_internal_admin_authority_hardening.sql redefine
  // policies that DO exist in the Production baseline, changing who may read internal safety
  // telemetry and the support queue. That is an authorization decision on live data, so they
  // are deliberately left unreviewed here and referred to the owner.
  {
    file: "20260822180000_rcap_prefill_reproposal.sql",
    statement:
      "drop index if exists public.partner_onboarding_prefill_values_active_field_unique;",
    why:
      "the same step replaces this index with two narrower partial unique indexes over the same " +
      "three columns — one for the actionable statuses, one for applied — so the uniqueness " +
      "rule is split and relaxed, never removed. Dropping an index removes no row, and a " +
      "relaxed rule can reject no row that the old index allowed.",
  },
  {
    file: "20260822180000_rcap_prefill_reproposal.sql",
    statement:
      "drop trigger if exists rcap_onboarding_prefill_supersede_prior_applied_trg on public.partner_onboarding_prefill_values;",
    why:
      "idempotency drop of a trigger the next statement creates on the same table with the same " +
      "function. The name appears in neither the Production baseline nor any earlier step of " +
      "the chain, so the drop can remove nothing that was there before.",
  },
  {
    file: "20260822180000_rcap_prefill_reproposal.sql",
    statement:
      "alter table public.partner_onboarding_activity drop constraint if exists partner_onboarding_activity_event_type_check;",
    why:
      "re-added in the same step accepting 35 event types instead of 34 — it adds " +
      "prefill_conflict_override_recorded and removes none — so no existing row can be " +
      "rejected.",
  },
  {
    file: "20260825122000_clinic_mode_accounting_reporting.sql",
    statement:
      "drop policy if exists clinic_assisted_sessions_scoped_read on public.clinic_assisted_sessions;",
    why:
      "recreated by the next statement. The table and its first policy are both created earlier " +
      "in this same chain (20260825120000 and 20260825121000) and exist in no Production " +
      "baseline, so the drop can only remove what this chain just made. The replacement " +
      "predicate is a strict subset of the one it replaces: the same three branches, with the " +
      "participant and assist-staff branches additionally requiring a live, unexpired session.",
  },
  {
    file: "20260825122000_clinic_mode_accounting_reporting.sql",
    statement:
      "alter table public.clinic_packet_reservations drop constraint if exists clinic_packet_reservations_clinic_case_id_key;",
    why:
      "the implicit unique constraint of `clinic_case_id uuid not null unique` in " +
      "20260825120000, the step that creates this table; the next statement replaces it with a " +
      "partial unique index on the same column limited to status in ('reserved','consumed'), so " +
      "a released reservation can be retried. Uniqueness is relaxed, no row is removed, and no " +
      "existing row can be rejected.",
  },
  {
    file: "20260825122000_clinic_mode_accounting_reporting.sql",
    statement:
      "drop trigger if exists clinic_sync_packet_reservation_after_job on public.packet_render_jobs;",
    why:
      "idempotency drop of a trigger the next statement creates on the same table with the same " +
      "function. The name appears in neither the Production baseline nor any earlier step of " +
      "the chain.",
  },
  {
    file: "20260828100000_shared_pending_result_and_atomic_claim.sql",
    statement:
      "drop trigger if exists participant_claim_events_no_update on public.participant_claim_events;",
    why:
      "idempotency drop of a trigger the next statement creates on " +
      "public.participant_claim_events, a table created earlier in this same file and absent " +
      "from the Production baseline. The append-only guard is never left off.",
  },
  {
    file: "20260830120000_participant_data_rights.sql",
    statement:
      "drop policy if exists \"participant reads own privacy requests\" on public.participant_privacy_requests;",
    why:
      "the table is created earlier in this same file and exists in no Production baseline; the " +
      "next statement recreates the policy with the same select-own-rows predicate. The drop " +
      "can remove nothing that was there before.",
  },
  {
    file: "20260830120000_participant_data_rights.sql",
    statement:
      "drop trigger if exists reject_tombstoned_consumer_briefcase_writes on public.consumer_briefcase_items;",
    why:
      "idempotency drop of a trigger the next statement creates. The name appears in neither " +
      "the Production baseline nor anywhere else in the chain, so the drop can remove nothing; " +
      "the guard on consumer_briefcase_items is established, not withdrawn, by this pair.",
  },
  {
    file: "20260830120000_participant_data_rights.sql",
    statement:
      "alter table public.packet_render_jobs drop constraint if exists packet_render_jobs_error_code_check;",
    why:
      "re-added in the same step accepting 12 error codes instead of 11 — it adds " +
      "participant_deletion_cancelled and removes none — so no existing row can be rejected.",
  },
  {
    file: "20260830120000_participant_data_rights.sql",
    statement:
      "drop trigger if exists consumer_packet_artifact_provenance_immutable on public.consumer_packet_artifact_provenance;",
    why:
      "idempotency drop of a trigger the next statement creates, on a table created earlier in " +
      "this same file and absent from the Production baseline. The before-update immutability " +
      "guard is never left off.",
  },
  {
    file: "20260901115000_consumer_packet_artifact_provenance.sql",
    statement:
      "drop trigger if exists consumer_packet_artifact_provenance_immutable on public.consumer_packet_artifact_provenance;",
    why:
      "this step re-establishes the same provenance prerequisite for the Clinic Preview " +
      "sequence: the table is created with `create table if not exists` earlier in the same " +
      "file, and the next statement recreates the same before-update trigger on it. The name is " +
      "absent from the Production baseline, and the guard is never left off.",
  },
  {
    file: "20260901120000_dtc_consumer_launch_rails.sql",
    statement:
      "alter table public.consumer_pending_screening_results drop constraint if exists consumer_pending_screening_results_claimed_matter_id_fkey;",
    why:
      "this constraint name exists in neither the Production baseline nor anywhere else in the " +
      "chain — 20260828100000 named its foreign key " +
      "consumer_pending_screening_results_claimed_matter_fkey, without the _id_ — so the drop " +
      "can remove nothing; the next statement adds a constraint of this exact name on " +
      "claimed_matter_id.",
  },
  {
    file: "20260901120000_dtc_consumer_launch_rails.sql",
    statement:
      "drop trigger if exists consumer_render_job_verification_guard_trg on public.packet_render_jobs;",
    why:
      "idempotency drop of a trigger the next statement creates on the same table with the same " +
      "function. The name appears in neither the Production baseline nor anywhere else in the " +
      "chain.",
  },
  {
    file: "20260901130000_consumer_private_delivery.sql",
    statement:
      "drop trigger if exists publish_validated_consumer_render_artifact_trg on public.packet_render_jobs;",
    why:
      "idempotency drop of a trigger the next statement creates on the same table with the same " +
      "function. The name appears in neither the Production baseline nor anywhere else in the " +
      "chain.",
  },
  {
    file: "20260906120000_sponsored_route_render_transaction.sql",
    statement:
      "alter table public.packet_render_jobs drop constraint if exists packet_render_jobs_sponsored_verification_hash_check, add constraint packet_render_jobs_sponsored_verification_hash_check check (sponsored_verification_hash is null or sponsored_verification_hash ~ '^[a-f0-9]{64}$');",
    why:
      "one statement that drops and re-adds the same check. The column it constrains, " +
      "sponsored_verification_hash, is added by the immediately preceding statement of this " +
      "same file, so the drop can only match a constraint an earlier run of this same step " +
      "created.",
  },
];

// A browser role gaining access to a table Production already has is the change most
// worth catching, so it is banned unless it is written down here, pinned to the exact
// table, grantee and privilege. RLS is what actually decides which rows that role can
// reach, and every_browser_reachable_table_has_rls proves RLS is still on.
const REVIEWED_BROWSER_GRANTS = [
  {
    table: "rcap_record_events",
    grantee: "authenticated",
    privileges: ["INSERT", "SELECT"],
    why:
      "supabase/phase-28-rcap-record-audit-trail.sql revokes everything from anon and " +
      "authenticated and then grants exactly SELECT and INSERT. The table has row level " +
      "security enabled AND forced with no permissive policy, so the grant exposes no row; " +
      "UPDATE and DELETE are additionally blocked by triggers.",
  },
];

const BANNED = [
  /\bdrop\s+table\b/i,
  /\bdrop\s+schema\b/i,
  /\bdrop\s+database\b/i,
  /\btruncate\b(?!\s*(,|\)|\s+on\b))/i,
  /\bdrop\s+column\b/i,
  /\bdrop\s+policy\b/i,
  /\bdisable\s+row\s+level\s+security\b/i,
  /\bno\s+force\s+row\s+level\s+security\b/i,
  /\bdrop\s+constraint\b/i,
  /\bdrop\s+function\b/i,
  /\bdrop\s+view\b/i,
  /\bdrop\s+trigger\b/i,
  /\bdrop\s+index\b/i,
];

const failures = [];
const check = (name, fn) => {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.log(`  FAIL ${name}`);
    console.log(`         ${error.message.split("\n")[0]}`);
  }
};

const sh = (args, options = {}) =>
  execFileSync("bash", [lab, ...args], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, ...options });

// --- static checks ----------------------------------------------------------

check("recovered_baseline_is_untouched", () => {
  const payload = readFileSync(path.join(migrationsDir, BASELINE));
  assert.equal(payload.byteLength, BASELINE_BYTES, "baseline byte length changed");
  assert.equal(
    createHash("sha256").update(payload).digest("hex"),
    BASELINE_SHA256,
    "baseline payload changed; the upgrade's starting point must stay the validated payload",
  );
});

check("forward_chain_is_exactly_the_committed_migrations", () => {
  const onDisk = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  assert.deepEqual(onDisk, [BASELINE, ...FORWARD_CHAIN].sort(), "migration set changed");
  const versions = FORWARD_CHAIN.map((f) => f.slice(0, 14));
  assert.deepEqual([...versions].sort(), versions, "forward steps are not in ascending version order");
  assert.ok(versions.every((v) => v > "20260728213131"), "a forward step sorts before the baseline");
});

check("no_unreviewed_destructive_operation", () => {
  const normalize = (s) => s.replace(/\s+/g, " ").trim();
  const allowed = new Set(
    REVIEWED_DESTRUCTIVE_DISPOSITIONS.map((d) => `${d.file} ${normalize(d.statement)}`),
  );
  const seen = new Set();
  for (const file of FORWARD_CHAIN) {
    const text = readFileSync(path.join(migrationsDir, file), "utf8");
    const body = text
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");
    for (const raw of body.split(";")) {
      const statement = normalize(raw);
      if (!statement) continue;
      if (!BANNED.some((pattern) => pattern.test(statement))) continue;
      const key = `${file} ${statement};`;
      assert.ok(
        allowed.has(key),
        `destructive statement with no reviewed disposition in ${file}:\n    ${statement.slice(0, 200)}`,
      );
      seen.add(key);
    }
  }
  assert.equal(
    seen.size,
    allowed.size,
    "a reviewed destructive disposition no longer matches any statement; remove the stale entry",
  );
});

if (failures.length) {
  console.error(`\nverify-rcap-production-schema-upgrade FAILED\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}

// --- replay -----------------------------------------------------------------

console.log("  ..   building baseline, target and two upgrade replays (a few minutes)");
sh(["build", "baseline", "verify_base"], { stdio: "pipe" });
sh(["build", "stacked", "verify_target"], { stdio: "pipe" });
sh(["build", "upgrade", "verify_up1"], { stdio: "pipe" });
sh(["build", "upgrade", "verify_up2"], { stdio: "pipe" });

const catalog = (db) => sh(["catalog", db], { stdio: ["pipe", "pipe", "pipe"] });
const digest = (text) => createHash("sha256").update(text).digest("hex");

const baseCatalog = catalog("verify_base");
const targetCatalog = catalog("verify_target");
const up1 = catalog("verify_up1");
const up2 = catalog("verify_up2");

const parse = (text) => {
  const rows = new Map();
  for (const line of text.split("\n")) {
    if (!line) continue;
    const [cls, identity, ...rest] = line.split("\t");
    rows.set(`${cls} ${identity}`, rest.join("\t"));
  }
  return rows;
};
const baseRows = parse(baseCatalog);
const targetRows = parse(targetCatalog);
const upRows = parse(up1);

const firstDifference = (left, right) => {
  for (const [key, value] of left) {
    if (!right.has(key)) return `only in the target: ${key}`;
    if (right.get(key) !== value) return `differs: ${key}`;
  }
  for (const key of right.keys()) {
    if (!left.has(key)) return `only in the upgraded database: ${key}`;
  }
  return null;
};

check("replay_is_deterministic", () => {
  assert.equal(digest(up1), digest(up2), "two replays of the same chain produced different catalogs");
});

check("upgrade_reaches_the_accepted_target_schema", () => {
  const difference = firstDifference(targetRows, upRows);
  assert.equal(
    difference,
    null,
    `baseline plus the forward chain does not equal the accepted repository schema — ${difference}`,
  );
});

const state = (rows, cls) =>
  new Map([...rows].filter(([key]) => key.startsWith(`${cls} `)).map(([key, value]) => [key, value]));

check("rls_stays_enabled_everywhere_it_was", () => {
  for (const [key, value] of state(baseRows, "rls")) {
    const after = upRows.get(key);
    assert.ok(after, `a table lost its RLS record entirely: ${key}`);
    if (value.includes("enabled t")) {
      assert.ok(after.includes("enabled t"), `RLS was disabled on ${key}`);
    }
    if (value.includes("forced t")) {
      assert.ok(after.includes("forced t"), `forced RLS was removed on ${key}`);
    }
  }
});

check("every_browser_reachable_table_has_rls", () => {
  const exposed = new Set();
  for (const key of upRows.keys()) {
    if (!key.startsWith("grant.relation ")) continue;
    const identity = key.split(" ")[1];
    const parts = identity.split(".");
    const grantee = parts[parts.length - 2];
    if (grantee === "anon" || grantee === "authenticated" || grantee === "PUBLIC") {
      exposed.add(parts.slice(0, parts.length - 2).join("."));
    }
  }
  for (const name of exposed) {
    const rls = upRows.get(`rls ${name}`);
    if (rls === undefined) continue; // views and sequences carry no RLS of their own
    assert.ok(
      rls.includes("enabled t"),
      `${name} is reachable by a browser role but has row level security disabled`,
    );
  }
});

check("no_baseline_policy_was_dropped_or_weakened", () => {
  for (const [key, value] of state(baseRows, "policy")) {
    assert.equal(upRows.get(key), value, `policy changed or disappeared: ${key}`);
  }
});

check("no_unreviewed_browser_grant_on_a_table_the_baseline_already_had", () => {
  const baselineTables = new Set(
    [...state(baseRows, "table")].map(([key]) => key.split(" ")[1]),
  );
  const allowed = new Map(
    REVIEWED_BROWSER_GRANTS.map((g) => [`${g.table}.${g.grantee}`, new Set(g.privileges)]),
  );
  const used = new Set();
  for (const key of upRows.keys()) {
    if (!key.startsWith("grant.relation ") || baseRows.has(key)) continue;
    const parts = key.split(" ")[1].split(".");
    const privilege = parts[parts.length - 1];
    const grantee = parts[parts.length - 2];
    const table = parts.slice(0, parts.length - 2).join(".");
    if (!baselineTables.has(table)) continue;
    if (grantee !== "anon" && grantee !== "authenticated" && grantee !== "PUBLIC") continue;
    const disposition = allowed.get(`${table}.${grantee}`);
    assert.ok(
      disposition?.has(privilege),
      `the chain grants ${grantee} ${privilege} on the pre-existing table ${table} with no reviewed disposition`,
    );
    used.add(`${table}.${grantee}`);
  }
  for (const key of allowed.keys()) {
    assert.ok(used.has(key), `reviewed browser grant ${key} no longer happens; remove the stale entry`);
  }
});

check("storage_stays_private", () => {
  for (const [key, value] of state(upRows, "storage.bucket")) {
    assert.ok(value.includes("public false"), `${key} is not private`);
  }
  for (const [key, value] of state(baseRows, "storage.rls")) {
    assert.equal(upRows.get(key), value, `storage RLS state changed on ${key}`);
  }
});

// --- Security Advisor remediation -------------------------------------------

const sql = (db, statements) =>
  sh(["sql", db], { input: statements, stdio: ["pipe", "pipe", "pipe"] });

check("hardening_step_matches_the_canonical_schema_source", () => {
  const phase = readFileSync(
    path.join(root, "supabase", "phase-56-public-view-and-default-privilege-hardening.sql"),
    "utf8",
  );
  const step = readFileSync(
    path.join(migrationsDir, "20260818209000_rcap_upgrade_09_security_hardening.sql"),
    "utf8",
  );
  const body = (text) => {
    const withoutHeader = text.slice(text.indexOf("alter table public.partner_entitlement"));
    return withoutHeader.replace(/^\s*commit;\s*$/m, "").replace(/\s+/g, " ").trim();
  };
  assert.equal(
    body(phase),
    body(step),
    "the canonical schema source and the forward migration have drifted apart",
  );
});

check("five_public_views_are_security_invoker", () => {
  for (const view of SECURITY_INVOKER_VIEWS) {
    const options = upRows.get(`view ${view}`);
    assert.ok(options !== undefined, `${view} is missing from the upgraded schema`);
    assert.ok(
      options.includes("security_invoker=true"),
      `${view} does not run with the querying role's privileges`,
    );
    assert.ok(options.includes("security_barrier=true"), `${view} is not a security barrier`);
  }
});

check("four_named_tables_have_rls_enabled", () => {
  // Two of the four exist in every database this chain touches.
  for (const table of ["partner_entitlement", "rcap_record_events"]) {
    const rls = upRows.get(`rls ${table}`);
    assert.ok(rls?.includes("enabled t"), `${table} has row level security disabled`);
  }
  // The other two exist only in an acceptance environment, so the guard is exercised
  // rather than assumed: create them, re-run the step, read the result back.
  const step = readFileSync(
    path.join(migrationsDir, "20260818209000_rcap_upgrade_09_security_hardening.sql"),
    "utf8",
  );
  const guard = step.slice(step.indexOf("do $$"), step.indexOf("$$;") + 3);
  assert.ok(guard.includes("rcap_acceptance_environment_marker"), "guard block not found in step 09");
  const out = sql(
    "verify_up2",
    `create table public.rcap_acceptance_environment_marker (project_ref text primary key);
     create table public.rcap_acceptance_migration_ledger (phase int primary key);
     ${guard}
     select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and relname like 'rcap_acceptance_%' order by 1;
     drop table public.rcap_acceptance_environment_marker;
     drop table public.rcap_acceptance_migration_ledger;`,
  );
  for (const table of ["rcap_acceptance_environment_marker", "rcap_acceptance_migration_ledger"]) {
    assert.ok(
      out.includes(`${table}|t`),
      `the step 09 guard did not enable row level security on ${table}`,
    );
  }
});

check("anon_cannot_read_unrelated_base_table_columns", () => {
  for (const [table, column] of FORBIDDEN_ANON_COLUMNS) {
    const out = sql("verify_up1", `set role anon; select ${column} from public.${table} limit 1;`);
    assert.ok(
      /permission denied/i.test(out),
      `anon can read ${table}.${column}; expected a permission denial, got: ${out.trim().slice(0, 120)}`,
    );
  }
});

check("future_public_objects_do_not_inherit_browser_privileges", () => {
  const out = sql(
    "verify_up2",
    `create table public.rcap_default_privilege_probe (id int);
     select coalesce(array_to_string(relacl, ' '), '(none)') from pg_class
       where relname = 'rcap_default_privilege_probe';
     drop table public.rcap_default_privilege_probe;`,
  );
  assert.ok(!/\banon=/.test(out), `a new table still inherits anon privileges: ${out.trim()}`);
  assert.ok(
    !/\bauthenticated=/.test(out),
    `a new table still inherits authenticated privileges: ${out.trim()}`,
  );
});

check("public_view_row_sets_are_unchanged_by_the_remediation", () => {
  sh(["build", "stacked-pre", "verify_pre"], { stdio: "pipe" });
  sh(["seed", "verify_pre"], { stdio: "pipe" });
  sh(["seed", "verify_target"], { stdio: "pipe" });
  const read = (db) =>
    sql(
      db,
      `set role anon;
       select 'authors', row_to_json(x)::text from public.content_public_authors x order by 2;
       select 'posts', row_to_json(x)::text from public.content_public_posts x order by 2;
       select 'media', row_to_json(x)::text from public.content_public_media x order by 2;
       select 'state_editorial', row_to_json(x)::text from public.content_public_state_editorial x order by 2;
       select 'testimonials', row_to_json(x)::text from public.content_public_testimonials x order by 2;`,
    );
  const before = read("verify_pre");
  const after = read("verify_target");
  assert.ok(!/permission denied|ERROR/i.test(after), `reading a public view as anon failed: ${after}`);
  assert.equal(
    after,
    before,
    "the remediation changed what an anonymous reader sees through the public views",
  );
  const rows = after.split("\n").filter((line) => line.includes("|"));
  assert.equal(rows.length, 8, `expected the fixture's 8 public rows, got ${rows.length}`);
});

if (failures.length) {
  console.error(`\nverify-rcap-production-schema-upgrade FAILED\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}

console.log(
  `\nverify-rcap-production-schema-upgrade passed: ` +
    `${FORWARD_CHAIN.length} forward steps, ${targetRows.size} catalog definitions matched, ` +
    `replay catalog sha256 ${digest(up1)}`,
);
