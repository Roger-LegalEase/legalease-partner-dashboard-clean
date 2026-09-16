// The exact Legal Aid Clinic Mode migration contract shared by the acceptance
// and Production controls. One file, one hash, one source commit. Anything
// the database must show after the apply is enumerated here so the readback
// is a comparison against a frozen list, never a discovery.
//
// This directory is deliberately outside scripts/lib: scripts/lib is a render
// worker image input, and release tooling must not change the worker.

import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

export const LEGAL_AID_MIGRATION = Object.freeze({
  path: "supabase/migrations/20260916120000_legal_aid_clinic_mode.sql",
  sha256: "0f179d5835c7bfdba4da0ea320122e0d846b8dea1693e18ee1d94304244786ac",
  sourceSha: "7dc8df2341c99c44d7646578505eed170daa5c8d"
});

export const ACCEPTANCE_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";
export const PRODUCTION_PROJECT_REF = "wwtwtsmywnckfkdaqqeg";

// Prerequisites: the Clinic Mode structure the migration alters and references.
export const PREREQUISITE_CLINIC_TABLES = Object.freeze([
  "clinic_events", "clinic_event_staff", "clinic_event_access_codes", "clinic_event_access_redemptions",
  "clinic_assisted_sessions", "clinic_cases", "clinic_follow_ups", "clinic_incidents", "clinic_event_audit", "clinic_packet_reservations"
]);
export const PREREQUISITE_BASELINE_TABLES = Object.freeze(["partner_records", "partner_users", "consumer_briefcase_items", "packet_render_jobs"]);
export const PREREQUISITE_FUNCTIONS = Object.freeze(["clinic_actor_can_event", "clinic_upsert_event_follow_up", "clinic_set_event_status", "clinic_set_event_staff"]);

// What the migration creates.
export const LEGAL_AID_TABLES = Object.freeze([
  "clinic_registrations", "legal_aid_policy_profiles", "legal_aid_intakes", "legal_aid_restricted_fields", "legal_aid_intake_signatures",
  "legal_aid_documents", "legal_aid_information_requests", "legal_aid_review_decisions", "legal_aid_document_tasks", "legal_aid_next_steps",
  "legal_aid_case_exports", "legal_aid_access_audit"
]);
export const LEGAL_AID_FUNCTIONS = Object.freeze([
  "legal_aid_actor_can_intake", "legal_aid_actor_permissions", "legal_aid_approve_policy_profile", "legal_aid_audit", "legal_aid_can_review_intake",
  "legal_aid_configure_event", "legal_aid_create_document_task", "legal_aid_guard_event_publication", "legal_aid_is_intake_participant",
  "legal_aid_prepare_policy_profile", "legal_aid_record_access", "legal_aid_record_decision", "legal_aid_record_document", "legal_aid_record_export",
  "legal_aid_record_intake_view", "legal_aid_register", "legal_aid_remove_document", "legal_aid_replace_document_artifact",
  "legal_aid_request_information", "legal_aid_reveal_restricted_field", "legal_aid_save_intake_draft", "legal_aid_save_next_step",
  "legal_aid_set_attorney_review", "legal_aid_set_external_case_reference", "legal_aid_set_registration_status", "legal_aid_set_restricted_field",
  "legal_aid_sign_intake", "legal_aid_start_review", "legal_aid_submit_intake", "legal_aid_transition_document_task",
  "legal_aid_withdraw_information_request", "legal_aid_withdraw_intake"
]);
export const LEGAL_AID_EVENT_COLUMNS = Object.freeze([
  "experience", "policy_profile_id", "registration_opens_at", "registration_closes_at", "appointment_policy", "participant_cost_note", "public_description"
]);
export const LEGAL_AID_BUCKET = "rcap-legal-aid-private";
// Service-role-only entry points whose grants are read back explicitly.
export const SERVICE_ONLY_SIGNATURES = Object.freeze([
  "public.legal_aid_register(uuid,uuid,text,text,text,text,text,text,text,text,text,uuid)",
  "public.legal_aid_set_restricted_field(uuid,uuid,text,text,text,text)",
  "public.legal_aid_reveal_restricted_field(uuid,uuid,text,text)",
  "public.legal_aid_submit_intake(uuid,uuid,text[])",
  "public.legal_aid_record_export(uuid,uuid,text,text,boolean,text)"
]);

export function sqlNames(values) {
  return values.map((value) => `'${String(value).replaceAll("'", "''")}'`).join(",");
}

export function postgresArray(value) {
  if (Array.isArray(value)) return value.map(String);
  if (value === null || value === undefined || value === "{}") return [];
  if (typeof value !== "string" || !value.startsWith("{") || !value.endsWith("}")) return [];
  const items = [];
  let token = "";
  let quoted = false;
  let escaped = false;
  for (const character of value.slice(1, -1)) {
    if (escaped) { token += character; escaped = false; }
    else if (character === "\\") escaped = true;
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { items.push(token); token = ""; }
    else token += character;
  }
  items.push(token);
  return items;
}

export function truthy(value) {
  return value === true || value === "true" || value === "t";
}

export function equalLists(actual, expected) {
  const sort = (values) => [...values].map(String).sort((a, b) => a.localeCompare(b));
  return JSON.stringify(sort(actual)) === JSON.stringify(sort(expected));
}

/** The migration bytes as committed at the given SHA, refused unless they hash to the authorized value. */
export function frozenMigrationSql(rootDir, sourceSha) {
  const result = spawnSync("git", ["show", `${sourceSha}:${LEGAL_AID_MIGRATION.path}`], { cwd: rootDir, encoding: null, maxBuffer: 20 * 1024 * 1024 });
  if (result.status !== 0 || !Buffer.isBuffer(result.stdout)) throw new Error(`frozen migration unavailable at ${sourceSha}`);
  const hash = crypto.createHash("sha256").update(result.stdout).digest("hex");
  if (hash !== LEGAL_AID_MIGRATION.sha256) throw new Error(`frozen migration hash ${hash} does not equal the authorized ${LEGAL_AID_MIGRATION.sha256}`);
  return result.stdout.toString("utf8");
}

/** One catalog query describing the prerequisites and the Legal Aid state; read-only. */
export function readbackQuery() {
  return `
    select
      array(select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relkind='r' and c.relname in (${sqlNames(PREREQUISITE_CLINIC_TABLES)}) order by c.relname) as clinic_tables,
      array(select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relkind='r' and c.relname in (${sqlNames(PREREQUISITE_BASELINE_TABLES)}) order by c.relname) as baseline_tables,
      array(select distinct p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='public' and p.proname in (${sqlNames(PREREQUISITE_FUNCTIONS)}) order by p.proname) as clinic_functions,
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='clinic_events' and column_name='jurisdiction') as jurisdiction_column_present,
      to_regclass('storage.buckets') is not null as storage_catalog_present,
      array(select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relkind='r' and c.relname in (${sqlNames(LEGAL_AID_TABLES)}) order by c.relname) as legal_aid_tables,
      array(select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relkind='r' and c.relrowsecurity and c.relname in (${sqlNames(LEGAL_AID_TABLES)}) order by c.relname) as legal_aid_rls_tables,
      array(select distinct p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='public' and p.proname in (${sqlNames(LEGAL_AID_FUNCTIONS)}) order by p.proname) as legal_aid_functions,
      array(select column_name::text from information_schema.columns
        where table_schema='public' and table_name='clinic_events' and column_name in (${sqlNames(LEGAL_AID_EVENT_COLUMNS)}) order by column_name) as event_columns,
      exists(select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relname='clinic_events' and t.tgname='legal_aid_guard_event_publication' and not t.tgisinternal) as publication_guard_present,
      exists(select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relname='legal_aid_access_audit' and t.tgname='legal_aid_access_audit_append_only' and not t.tgisinternal) as audit_append_only_present,
      exists(select 1 from pg_constraint where conrelid=to_regclass('public.clinic_event_staff') and conname='clinic_event_staff_permissions_check'
        and pg_get_constraintdef(oid) like '%coordinator%' and pg_get_constraintdef(oid) like '%notary%' and pg_get_constraintdef(oid) like '%assist%') as staff_permissions_widened,
      exists(select 1 from pg_constraint where conrelid=to_regclass('public.legal_aid_access_audit') and pg_get_constraintdef(oid) like '%unsigned_copy_opened%') as audit_actions_current,
      (select coalesce(bool_and(not public), false) from storage.buckets where id='${LEGAL_AID_BUCKET}') as bucket_private,
      (select count(*)::int from storage.buckets where id='${LEGAL_AID_BUCKET}') as bucket_count,
      not exists(select 1 from information_schema.role_table_grants g where g.table_schema='public' and g.grantee in ('PUBLIC','anon','authenticated')
        and g.table_name in (${sqlNames(LEGAL_AID_TABLES)}) and g.privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER')) as no_browser_writes,
      not exists(select 1 from information_schema.role_table_grants g where g.table_schema='public' and g.grantee in ('PUBLIC','anon','authenticated')
        and g.table_name='legal_aid_restricted_fields') as restricted_fields_unreadable_by_browser,
      not exists(select 1 from pg_policy where polrelid=to_regclass('public.legal_aid_restricted_fields')) as restricted_fields_policyless,
      (${SERVICE_ONLY_SIGNATURES.map((signature) => `coalesce(has_function_privilege('service_role',to_regprocedure('${signature}'),'EXECUTE'),false)
        and not coalesce(has_function_privilege('anon',to_regprocedure('${signature}'),'EXECUTE'),false)
        and not coalesce(has_function_privilege('authenticated',to_regprocedure('${signature}'),'EXECUTE'),false)`).join(" and ")}) as service_only_grants_tight
  `;
}

export function summarizeReadback(row) {
  const clinicTables = postgresArray(row.clinic_tables);
  const baselineTables = postgresArray(row.baseline_tables);
  const clinicFunctions = postgresArray(row.clinic_functions);
  const tables = postgresArray(row.legal_aid_tables);
  const rlsTables = postgresArray(row.legal_aid_rls_tables);
  const functions = postgresArray(row.legal_aid_functions);
  const eventColumns = postgresArray(row.event_columns);
  const prerequisitesExact = equalLists(clinicTables, PREREQUISITE_CLINIC_TABLES)
    && equalLists(baselineTables, PREREQUISITE_BASELINE_TABLES)
    && equalLists(clinicFunctions, PREREQUISITE_FUNCTIONS)
    && truthy(row.jurisdiction_column_present)
    && truthy(row.storage_catalog_present);
  const empty = tables.length === 0 && functions.length === 0 && eventColumns.length === 0 && Number(row.bucket_count ?? 0) === 0;
  const complete = equalLists(tables, LEGAL_AID_TABLES)
    && equalLists(rlsTables, LEGAL_AID_TABLES)
    && equalLists(functions, LEGAL_AID_FUNCTIONS)
    && equalLists(eventColumns, LEGAL_AID_EVENT_COLUMNS)
    && truthy(row.publication_guard_present)
    && truthy(row.audit_append_only_present)
    && truthy(row.staff_permissions_widened)
    && truthy(row.audit_actions_current)
    && Number(row.bucket_count ?? 0) === 1
    && truthy(row.bucket_private)
    && truthy(row.no_browser_writes)
    && truthy(row.restricted_fields_unreadable_by_browser)
    && truthy(row.restricted_fields_policyless)
    && truthy(row.service_only_grants_tight);
  return {
    prerequisitesExact,
    prerequisites: {
      clinicTableCount: clinicTables.length, baselineTableCount: baselineTables.length, clinicFunctionCount: clinicFunctions.length,
      jurisdictionColumnPresent: truthy(row.jurisdiction_column_present), storageCatalogPresent: truthy(row.storage_catalog_present)
    },
    empty,
    complete,
    legalAid: {
      tableCount: tables.length, rlsTableCount: rlsTables.length, functionCount: functions.length, eventColumnCount: eventColumns.length,
      publicationGuard: truthy(row.publication_guard_present), auditAppendOnly: truthy(row.audit_append_only_present),
      staffPermissionsWidened: truthy(row.staff_permissions_widened), auditActionsCurrent: truthy(row.audit_actions_current),
      bucketCount: Number(row.bucket_count ?? 0), bucketPrivate: truthy(row.bucket_private),
      noBrowserWrites: truthy(row.no_browser_writes), restrictedFieldsUnreadableByBrowser: truthy(row.restricted_fields_unreadable_by_browser),
      restrictedFieldsPolicyless: truthy(row.restricted_fields_policyless), serviceOnlyGrantsTight: truthy(row.service_only_grants_tight)
    }
  };
}
