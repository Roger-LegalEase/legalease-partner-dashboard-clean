// Pre-write and post-write schema snapshots for the hosted acceptance project.
//
// A migration run that cannot say what the database looked like before it wrote
// is not evidence, it is an assertion. This module captures the same shape
// twice — once immediately before the first write of a run, once after the last
// — so the diff between them IS the run's effect.
//
// It records STRUCTURE only. No row of participant data is read, no secret is
// read, and no production identifier is recorded: the project ref is the
// acceptance ref the workflow already pins and prints, and everything else is
// catalog metadata.

const CATALOG_QUERIES = {
  schemas: `
    select nspname as schema_name
      from pg_namespace
     where nspname not like 'pg\\_%' and nspname <> 'information_schema'
     order by nspname`,

  extensions: `
    select e.extname as name, e.extversion as version, n.nspname as schema_name
      from pg_extension e join pg_namespace n on n.oid = e.extnamespace
     order by e.extname`,

  tables: `
    select c.relname as table_name, n.nspname as schema_name,
           c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced,
           c.relkind as kind
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname in ('public','storage') and c.relkind in ('r','p','v','m')
     order by n.nspname, c.relname`,

  columns: `
    select table_schema as schema_name, table_name, column_name, data_type,
           is_nullable, column_default
      from information_schema.columns
     where table_schema in ('public','storage')
     order by table_schema, table_name, ordinal_position`,

  constraints: `
    select n.nspname as schema_name, rel.relname as table_name,
           con.conname as constraint_name, con.contype as constraint_type,
           pg_get_constraintdef(con.oid) as definition
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace n on n.oid = rel.relnamespace
     where n.nspname in ('public','storage')
     order by n.nspname, rel.relname, con.conname`,

  indexes: `
    select schemaname as schema_name, tablename as table_name, indexname as index_name, indexdef as definition
      from pg_indexes
     where schemaname in ('public','storage')
     order by schemaname, tablename, indexname`,

  functions: `
    select n.nspname as schema_name, p.proname as function_name,
           pg_get_function_identity_arguments(p.oid) as arguments,
           p.prosecdef as security_definer, l.lanname as language
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      join pg_language l on l.oid = p.prolang
     where n.nspname = 'public'
     order by p.proname, pg_get_function_identity_arguments(p.oid)`,

  triggers: `
    select n.nspname as schema_name, c.relname as table_name, t.tgname as trigger_name,
           pg_get_triggerdef(t.oid) as definition
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname in ('public','storage') and not t.tgisinternal
     order by n.nspname, c.relname, t.tgname`,

  tableGrants: `
    select table_schema as schema_name, table_name, grantee, privilege_type
      from information_schema.role_table_grants
     where table_schema in ('public','storage')
     order by table_schema, table_name, grantee, privilege_type`,

  routineGrants: `
    select routine_schema as schema_name, routine_name, grantee, privilege_type
      from information_schema.role_routine_grants
     where routine_schema = 'public'
     order by routine_name, grantee, privilege_type`,

  rlsPolicies: `
    select schemaname as schema_name, tablename as table_name, policyname as policy_name,
           permissive, roles::text as roles, cmd, qual, with_check
      from pg_policies
     where schemaname in ('public','storage')
     order by schemaname, tablename, policyname`,

  defaultPrivileges: `
    select n.nspname as schema_name, pg_get_userbyid(d.defaclrole) as owner_role,
           d.defaclobjtype as object_type, d.defaclacl::text as acl
      from pg_default_acl d
      left join pg_namespace n on n.oid = d.defaclnamespace
     order by n.nspname, d.defaclobjtype`,

  storageBuckets: `
    select id, name, public, file_size_limit, allowed_mime_types::text as allowed_mime_types
      from storage.buckets
     order by id`,

  migrationLedger: `
    select phase, sha256, authorization_id, applied_by, applied_at
      from public.rcap_acceptance_migration_ledger
     order by phase`,

  environmentMarker: `
    select project_ref, application_sha, note, stamped_at
      from public.rcap_acceptance_environment_marker
     order by project_ref`
};

// Relations that may legitimately not exist yet on a pre-write snapshot.
const OPTIONAL_SOURCES = new Set(["migrationLedger", "environmentMarker", "storageBuckets"]);

/**
 * @param {object} opts
 * @param {(sql: string) => Promise<{ok: boolean, json: any, text: string, status: number}>} opts.query
 * @param {string} opts.label            "pre_write" | "post_write"
 * @param {string} opts.projectRef       the pinned acceptance ref
 * @param {object} opts.context          { sourceSha, toolsSha, migrationManifestHash }
 */
export async function captureSchemaSnapshot({ query, label, projectRef, context }) {
  const snapshot = {
    schemaVersion: "rcap-acceptance-schema-snapshot/v1",
    label,
    // The acceptance ref only. A production identifier never reaches this file
    // because the runner is addressed by the pinned ref and holds no other.
    acceptanceProjectRef: projectRef,
    sourceSha: context?.sourceSha ?? null,
    toolsSha: context?.toolsSha ?? null,
    migrationManifestHash: context?.migrationManifestHash ?? null,
    captured: {},
    unavailable: [],
    counts: {}
  };

  for (const [key, sql] of Object.entries(CATALOG_QUERIES)) {
    const r = await query(sql);
    if (!r.ok || !Array.isArray(r.json)) {
      snapshot.unavailable.push({
        source: key,
        optional: OPTIONAL_SOURCES.has(key),
        // Truncated hard: a database error can echo a statement.
        reason: String(r.json?.message ?? r.text ?? "unavailable").slice(0, 200)
      });
      snapshot.captured[key] = null;
      snapshot.counts[key] = null;
      continue;
    }
    snapshot.captured[key] = r.json;
    snapshot.counts[key] = r.json.length;
  }

  return snapshot;
}

/** A structural diff of two snapshots, for the evidence file and the recovery decision. */
export function diffSnapshots(before, after) {
  const keys = Object.keys(CATALOG_QUERIES);
  const delta = {};
  for (const key of keys) {
    const b = before?.counts?.[key];
    const a = after?.counts?.[key];
    delta[key] = { before: b ?? null, after: a ?? null, change: typeof b === "number" && typeof a === "number" ? a - b : null };
  }
  const nameOf = {
    tables: (r) => `${r.schema_name}.${r.table_name}`,
    functions: (r) => `${r.schema_name}.${r.function_name}(${r.arguments})`,
    triggers: (r) => `${r.schema_name}.${r.table_name}.${r.trigger_name}`,
    rlsPolicies: (r) => `${r.schema_name}.${r.table_name}.${r.policy_name}`
  };
  const added = {};
  const removed = {};
  for (const [key, name] of Object.entries(nameOf)) {
    const b = new Set((before?.captured?.[key] ?? []).map(name));
    const a = new Set((after?.captured?.[key] ?? []).map(name));
    added[key] = [...a].filter((x) => !b.has(x)).sort();
    removed[key] = [...b].filter((x) => !a.has(x)).sort();
  }
  return { counts: delta, added, removed };
}

export const SNAPSHOT_SOURCES = Object.keys(CATALOG_QUERIES);
