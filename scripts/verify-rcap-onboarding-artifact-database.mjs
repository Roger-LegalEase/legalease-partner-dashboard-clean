import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(rootDir, relativePath), "utf8");

const failures = [];
let passed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function check(name, fn) {
  await fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const ids = {
  partnerA: "11111111-1111-4111-8111-111111111111",
  partnerB: "22222222-2222-4222-8222-222222222222",
  userA: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  userB: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  userInternal: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  workspaceA: "10000000-0000-4000-8000-000000000001",
  workspaceB: "10000000-0000-4000-8000-000000000002"
};

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

const db = new PGlite();

try {
  await preparePostgresStubs();
  await applyMigrations();
  await seedSyntheticTenants();
  await verifySchema();
  await verifyVersioning();
  await verifyFailedGenerationCannotPass();
  await verifyReviewAuthority();
  await verifyInvalidationIsIdempotent();
  await verifyTenantIsolation();
} catch (error) {
  failures.push(error instanceof Error ? error.stack ?? error.message : String(error));
} finally {
  await db.close();
}

if (failures.length > 0) {
  console.error("\nRCAP onboarding artifact database FAILED:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`\nRCAP onboarding artifact database: ${passed}/${passed} checks passed.`);

// --- bootstrap ---------------------------------------------------------------

async function preparePostgresStubs() {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;

    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create or replace function auth.uid()
    returns uuid language sql stable set search_path = '' as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;

    create schema storage;
    create table storage.buckets (
      id text primary key, name text not null, public boolean not null default false,
      file_size_limit bigint, allowed_mime_types text[]
    );
    create table storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text not null references storage.buckets(id),
      name text not null, owner_id uuid, metadata jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (bucket_id, name)
    );
    grant usage on schema storage to anon, authenticated, service_role;
  `);
}

async function applyMigrations() {
  for (const relativePath of [
    "supabase/partner-journey-os.sql",
    "supabase/phase-21-partner-auth-rls-foundation.sql",
    "supabase/phase-28-rcap-record-audit-trail.sql",
    "supabase/phase-35-rcap-partner-entitlement.sql"
  ]) {
    await db.exec(read(relativePath));
  }
  const phase41 = read("supabase/phase-41-rcap-partner-access-codes.sql");
  const boundary = phase41.indexOf("-- 3. partner_access_codes.");
  assert(boundary > 0, "Phase 41 prerequisite boundary must be present.");
  await db.exec(phase41.slice(0, boundary));
  await db.exec(read("supabase/phase-42-partner-onboarding.sql"));
  await db.exec(read("supabase/phase-43-rcap-partner-onboarding-phase1.sql"));
  await db.exec(read("supabase/phase-44-rcap-onboarding-prefill.sql"));
  await db.exec(read("supabase/phase-45-rcap-onboarding-artifacts.sql"));
}

async function seedSyntheticTenants() {
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ids.userA}', 'a@partner.test'),
      ('${ids.userB}', 'b@partner.test'),
      ('${ids.userInternal}', 'internal@legalease.test');

    insert into public.partner_records
      (id, partner_id, partner_slug, partner_name, program_tier, payment_status)
    values
      ('${ids.partnerA}', 'pa', 'partner-a', 'Partner A', 'pilot', 'paid'),
      ('${ids.partnerB}', 'pb', 'partner-b', 'Partner B', 'pilot', 'paid');

    insert into public.partner_users (auth_user_id, partner_slug, role, status) values
      ('${ids.userA}', 'partner-a', 'partner_admin', 'active'),
      ('${ids.userB}', 'partner-b', 'partner_admin', 'active'),
      ('${ids.userInternal}', null, 'internal_admin', 'active');

    insert into public.partner_onboarding (id, partner_slug, partner_record_id, status)
    values
      ('${ids.workspaceA}', 'partner-a', '${ids.partnerA}', 'setup_in_progress'),
      ('${ids.workspaceB}', 'partner-b', '${ids.partnerB}', 'setup_in_progress');
  `);

  await db.exec(`
    select public.rcap_service_ensure_onboarding_artifacts(
      'partner-a', '${ids.workspaceA}', array['implementation_brief']
    );
    select public.rcap_service_ensure_onboarding_artifacts(
      'partner-b', '${ids.workspaceB}', array['implementation_brief']
    );
  `);
}

async function generate(slug, workspaceId, hash, requestId) {
  const result = await db.query(
    `select * from public.rcap_service_generate_onboarding_artifact_version(
      $1, $2, $3, 'implementation_brief', $4, 1, '{}'::jsonb, '{}'::jsonb,
      $5::jsonb, $6, 'implementation_brief_v1', '{"documentTitle":"Implementation Brief"}'::jsonb,
      'succeeded', null
    )`,
    [slug, ids.userInternal, workspaceId, requestId, JSON.stringify({ a: 1 }), hash]
  );
  return result.rows[0];
}

// --- checks ------------------------------------------------------------------

async function verifySchema() {
  await check("all six artifact types are registered per workspace", async () => {
    const result = await db.query(
      `select artifact_type, lifecycle_status from public.partner_onboarding_artifacts
       where workspace_id = $1 order by artifact_type`,
      [ids.workspaceA]
    );
    assert(result.rows.length === 6, "six artifact types must be registered");
    const brief = result.rows.find((r) => r.artifact_type === "implementation_brief");
    assert(brief.lifecycle_status === "not_generated", "the brief is generatable");
    const ops = result.rows.find((r) => r.artifact_type === "operations_escalation_plan");
    assert(
      ops.lifecycle_status === "unavailable_in_release",
      "a type without a generator must be marked unavailable, not broken"
    );
  });

  await check("an unregistered artifact type is rejected", async () => {
    let rejected = false;
    try {
      await db.exec(`
        insert into public.partner_onboarding_artifacts
          (workspace_id, partner_record_id, artifact_type)
        values ('${ids.workspaceA}', '${ids.partnerA}', 'not_a_real_artifact');
      `);
    } catch {
      rejected = true;
    }
    assert(rejected, "the type check constraint must reject unknown types");
  });
}

async function verifyVersioning() {
  await check("version numbers increment per artifact", async () => {
    const first = await generate("partner-a", ids.workspaceA, HASH_A,
      "d0000000-0000-4000-8000-000000000001");
    assert(Number(first.version_number) === 1, "the first version is 1");
    assert(first.duplicate === false, "a new request is not a duplicate");

    const second = await generate("partner-a", ids.workspaceA, HASH_B,
      "d0000000-0000-4000-8000-000000000002");
    assert(Number(second.version_number) === 2, "the second version is 2");
  });

  await check("a duplicate generate request is idempotent", async () => {
    const repeat = await generate("partner-a", ids.workspaceA, HASH_B,
      "d0000000-0000-4000-8000-000000000002");
    assert(repeat.duplicate === true, "the same request id must not create a version");
    assert(Number(repeat.version_number) === 2, "it must return the existing version");
    const count = await db.query(
      `select count(*)::int as n from public.partner_onboarding_artifact_versions
       where workspace_id = $1`,
      [ids.workspaceA]
    );
    assert(count.rows[0].n === 2, "exactly two versions must exist");
  });

  await check("a superseded version stays readable in history", async () => {
    const result = await db.query(
      `select version_number, approval_status, superseded_at, rendered_content
       from public.partner_onboarding_artifact_versions
       where workspace_id = $1 order by version_number`,
      [ids.workspaceA]
    );
    const v1 = result.rows[0];
    assert(v1.approval_status === "superseded", "version 1 is superseded");
    assert(v1.superseded_at !== null, "version 1 records when it was superseded");
    assert(
      v1.rendered_content && Object.keys(v1.rendered_content).length > 0,
      "a superseded version must remain readable, never blanked"
    );
  });
}

async function verifyFailedGenerationCannotPass() {
  await check("a failed generation can never present as approvable", async () => {
    let rejected = false;
    try {
      // generation_status 'failed' with a non-failed approval_status must be
      // impossible at the database level, not merely discouraged in code.
      await db.exec(`
        insert into public.partner_onboarding_artifact_versions (
          artifact_id, workspace_id, version_number, source_workspace_version,
          normalized_snapshot, snapshot_hash, generator_version, rendered_content,
          generation_status, generation_error_code, approval_status, generated_by, request_id
        )
        select id, '${ids.workspaceA}', 99, 1, '{}'::jsonb, '${HASH_A}',
          'implementation_brief_v1', '{}'::jsonb, 'failed', 'render_failed', 'approved',
          '${ids.userInternal}', gen_random_uuid()
        from public.partner_onboarding_artifacts
        where workspace_id = '${ids.workspaceA}' and artifact_type = 'implementation_brief';
      `);
    } catch {
      rejected = true;
    }
    assert(rejected, "a failed generation must not be storable as approved");
  });
}

async function verifyReviewAuthority() {
  await check("LegalEase approval moves the document state", async () => {
    const version = await db.query(
      `select id from public.partner_onboarding_artifact_versions
       where workspace_id = $1 and version_number = 2`,
      [ids.workspaceA]
    );
    const result = await db.query(
      `select * from public.rcap_service_review_onboarding_artifact(
        'partner-a', $1, 'legalease', $2, 'approve', null, null, gen_random_uuid()
      )`,
      [ids.userInternal, version.rows[0].id]
    );
    assert(result.rows[0].approval_status === "approved", "LegalEase approval applies");
    assert(
      result.rows[0].partner_review_status === "awaiting_partner",
      "approval routes the version to the partner"
    );
  });

  await check("a partner review cannot move the LegalEase approval state", async () => {
    const version = await db.query(
      `select id from public.partner_onboarding_artifact_versions
       where workspace_id = $1 and version_number = 2`,
      [ids.workspaceA]
    );
    const result = await db.query(
      `select * from public.rcap_service_review_onboarding_artifact(
        'partner-a', $1, 'partner', $2, 'request_changes', 'Our phone number is wrong.',
        null, gen_random_uuid()
      )`,
      [ids.userA, version.rows[0].id]
    );
    assert(
      result.rows[0].approval_status === "approved",
      "a partner decision must not change LegalEase's approval"
    );
    assert(
      result.rows[0].partner_review_status === "changes_requested",
      "a partner decision moves only the partner review state"
    );
  });

  await check("a change request without a reason is rejected", async () => {
    const version = await db.query(
      `select id from public.partner_onboarding_artifact_versions
       where workspace_id = $1 and version_number = 2`,
      [ids.workspaceA]
    );
    let rejected = false;
    try {
      await db.query(
        `select * from public.rcap_service_review_onboarding_artifact(
          'partner-a', $1, 'legalease', $2, 'request_changes', null, null, gen_random_uuid()
        )`,
        [ids.userInternal, version.rows[0].id]
      );
    } catch {
      rejected = true;
    }
    assert(rejected, "a change request must carry a comment");
  });

  await check("approval history is preserved", async () => {
    const result = await db.query(
      `select reviewer_type, decision, comments
       from public.partner_onboarding_artifact_reviews
       where workspace_id = $1 order by reviewed_at`,
      [ids.workspaceA]
    );
    assert(result.rows.length === 2, "both review decisions are retained");
    assert(result.rows[0].reviewer_type === "legalease");
    assert(result.rows[1].reviewer_type === "partner");
    assert(result.rows[1].comments === "Our phone number is wrong.");
  });
}

async function verifyInvalidationIsIdempotent() {
  await check("invalidation fires once and records the drift", async () => {
    const version = await db.query(
      `select id from public.partner_onboarding_artifact_versions
       where workspace_id = $1 and version_number = 2`,
      [ids.workspaceA]
    );
    const versionId = version.rows[0].id;
    const first = await db.query(
      `select * from public.rcap_service_invalidate_onboarding_artifact_version(
        'partner-a', $1, $2, array['workspace.target_launch_date']
      )`,
      [versionId, HASH_A]
    );
    assert(first.rows[0].invalidated === true, "the first observer invalidates");

    const stored = await db.query(
      `select source_drift_invalidated_at, source_drift_fields, approval_status
       from public.partner_onboarding_artifact_versions where id = $1`,
      [versionId]
    );
    assert(stored.rows[0].source_drift_invalidated_at !== null, "the drift is recorded");
    assert(
      stored.rows[0].source_drift_fields[0] === "workspace.target_launch_date",
      "the changed field is named"
    );
    assert(
      stored.rows[0].approval_status === "approved",
      "the approved version stays readable and is never silently rewritten"
    );
  });

  /**
   * PGlite is single-connection, so two genuinely parallel transactions cannot
   * be run here. What the concurrent case actually depends on is tested
   * instead: the conditional UPDATE no longer matches once the first observer
   * has committed, and the unique partial index makes a second activity event
   * impossible regardless of application code.
   */
  await check("a second observer of the same drift is a no-op", async () => {
    const version = await db.query(
      `select id from public.partner_onboarding_artifact_versions
       where workspace_id = $1 and version_number = 2`,
      [ids.workspaceA]
    );
    const second = await db.query(
      `select * from public.rcap_service_invalidate_onboarding_artifact_version(
        'partner-a', $1, $2, array['workspace.target_launch_date']
      )`,
      [version.rows[0].id, HASH_A]
    );
    assert(second.rows[0].invalidated === false, "the second observer writes nothing");

    const events = await db.query(
      `select count(*)::int as n from public.partner_onboarding_activity
       where artifact_version_id = $1 and event_type = 'artifact_approval_invalidated'`,
      [version.rows[0].id]
    );
    assert(events.rows[0].n === 1, "exactly one invalidation event exists");
  });

  await check("the unique index makes a duplicate event impossible", async () => {
    const version = await db.query(
      `select id from public.partner_onboarding_artifact_versions
       where workspace_id = $1 and version_number = 2`,
      [ids.workspaceA]
    );
    let rejected = false;
    try {
      await db.query(
        `insert into public.partner_onboarding_activity
          (workspace_id, event_type, owner_type, summary_code, artifact_version_id)
         values ($1, 'artifact_approval_invalidated', 'system', 'implementation_brief', $2)`,
        [ids.workspaceA, version.rows[0].id]
      );
    } catch {
      rejected = true;
    }
    assert(rejected, "the unique partial index must reject a second event");
  });

  await check("a stale version cannot be approved", async () => {
    const version = await db.query(
      `select id from public.partner_onboarding_artifact_versions
       where workspace_id = $1 and version_number = 2`,
      [ids.workspaceA]
    );
    let rejected = false;
    try {
      await db.query(
        `select * from public.rcap_service_review_onboarding_artifact(
          'partner-a', $1, 'legalease', $2, 'approve', null, null, gen_random_uuid()
        )`,
        [ids.userInternal, version.rows[0].id]
      );
    } catch (error) {
      rejected = String(error?.message ?? "").includes("artifact_version_stale");
    }
    assert(rejected, "approving a stale version must be refused");
  });
}

async function verifyTenantIsolation() {
  // Partner B has its own artifact so the isolation test compares real rows
  // rather than an empty table.
  await generate("partner-b", ids.workspaceB, HASH_A,
    "e0000000-0000-4000-8000-000000000001");

  await check("a partner reads only its own artifacts under RLS", async () => {
    await db.exec("set role authenticated;");
    await db.exec(
      `select set_config('request.jwt.claim.sub', '${ids.userA}', false);`
    );
    const visible = await db.query(
      `select workspace_id from public.partner_onboarding_artifact_versions`
    );
    assert(visible.rows.length > 0, "partner A must see its own versions");
    assert(
      visible.rows.every((row) => row.workspace_id === ids.workspaceA),
      "partner A must never see partner B's versions"
    );
    await db.exec("reset role;");
  });

  await check("a partner reads only its own reviews", async () => {
    await db.exec("set role authenticated;");
    await db.exec(
      `select set_config('request.jwt.claim.sub', '${ids.userB}', false);`
    );
    const reviews = await db.query(
      `select workspace_id, reviewer_type from public.partner_onboarding_artifact_reviews`
    );
    assert(
      reviews.rows.every(
        (row) => row.workspace_id === ids.workspaceB && row.reviewer_type === "partner"
      ),
      "partner B must see neither partner A's reviews nor any internal review"
    );
    await db.exec("reset role;");
  });

  await check("anonymous access is denied", async () => {
    await db.exec("set role anon;");
    await db.exec(`select set_config('request.jwt.claim.sub', '', false);`);
    const anonRows = await db.query(
      `select count(*)::int as n from public.partner_onboarding_artifacts`
    ).catch(() => ({ rows: [{ n: 0 }] }));
    assert(anonRows.rows[0].n === 0, "anonymous callers must see nothing");
    await db.exec("reset role;");
  });

  await check("a browser role cannot execute a mutation RPC", async () => {
    await db.exec("set role authenticated;");
    await db.exec(
      `select set_config('request.jwt.claim.sub', '${ids.userA}', false);`
    );
    let denied = false;
    try {
      await db.query(
        `select * from public.rcap_service_review_onboarding_artifact(
          'partner-a', $1, 'partner', gen_random_uuid(), 'approve', null, null, gen_random_uuid()
        )`,
        [ids.userA]
      );
    } catch (error) {
      denied = String(error?.message ?? "").toLowerCase().includes("permission denied");
    }
    assert(denied, "execute must be revoked from authenticated");
    await db.exec("reset role;");
  });
}
