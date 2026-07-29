// Phase 47 against a real Postgres.
//
// The interesting claims about launch readiness are database claims: a partner
// cannot waive, a partner cannot record a LegalEase decision, a satisfied check
// must name its reviewer, invalidation is conditional, and neither tenant can
// see the other's rows. Each is exercised here rather than asserted about.
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

const db = new PGlite();

/** Runs a statement as a browser role with a partner session, under RLS. */
async function asPartner(userId, partnerSlug, sql) {
  await db.exec("begin");
  try {
    await db.exec(`set local role authenticated`);
    await db.exec(
      `set local request.jwt.claim.sub = '${userId}';
       set local request.jwt.claims = '{"sub":"${userId}"}';`
    );
    void partnerSlug;
    const result = await db.query(sql);
    await db.exec("commit");
    return result;
  } catch (error) {
    await db.exec("rollback");
    throw error;
  }
}

async function expectRejected(promise, label) {
  let rejected = false;
  try {
    await promise;
  } catch {
    rejected = true;
  }
  assert(rejected, label);
}

try {
  await preparePostgresStubs();
  await applyMigrations();
  await seed();
  await verifySchema();
  await verifyReviewerRules();
  await verifyInvalidation();
  await verifyReadinessTransition();
  await verifyTenantIsolation();
} catch (error) {
  failures.push(error instanceof Error ? error.stack ?? error.message : String(error));
} finally {
  await db.close();
}

if (failures.length > 0) {
  console.error("\nRCAP onboarding launch database FAILED:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`\nRCAP onboarding launch database: ${passed}/${passed} checks passed.`);

// --- harness -----------------------------------------------------------------

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
  await db.exec(read("supabase/phase-46-rcap-onboarding-media-contact-role.sql"));
  await db.exec(read("supabase/phase-47-rcap-onboarding-launch-readiness.sql"));
}

async function seed() {
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
}

// --- checks ------------------------------------------------------------------

async function verifySchema() {
  await check("both launch tables exist with row level security on", async () => {
    const result = await db.query(`
      select relname, relrowsecurity
      from pg_class
      where relname in (
        'partner_onboarding_launch_checks',
        'partner_onboarding_launch_approvals'
      )
      order by relname
    `);
    assert(result.rows.length === 2, "both tables must exist");
    for (const row of result.rows) {
      assert(row.relrowsecurity === true, `${row.relname} must enable RLS`);
    }
  });

  await check("the readiness column is constrained to two states", async () => {
    await expectRejected(
      db.exec(
        `update public.partner_onboarding set launch_readiness_state = 'launched'
         where id = '${ids.workspaceA}'`
      ),
      "an arbitrary readiness state must be rejected"
    );
    await db.exec(
      `update public.partner_onboarding set launch_readiness_state = 'ready'
       where id = '${ids.workspaceA}'`
    );
    await db.exec(
      `update public.partner_onboarding set launch_readiness_state = null
       where id = '${ids.workspaceA}'`
    );
  });

  await check("a satisfied check cannot exist without a reviewer", async () => {
    await expectRejected(
      db.exec(`
        insert into public.partner_onboarding_launch_checks (
          workspace_id, partner_record_id, check_key, category, owner_type,
          determination, blocking, status, request_id
        ) values (
          '${ids.workspaceA}', '${ids.partnerA}', 'staff_training_completed',
          'training_and_resources', 'partner', 'manual', true, 'passing',
          gen_random_uuid()
        )
      `),
      "a passing check with no reviewer must be rejected"
    );
  });

  await check("an approval must match the side that owns it", async () => {
    await expectRejected(
      db.exec(`
        insert into public.partner_onboarding_launch_approvals (
          workspace_id, approval_type, reviewer_type, reviewer_user_id,
          decision, request_id
        ) values (
          '${ids.workspaceA}', 'legalease_final_review', 'partner',
          '${ids.userA}', 'approve', gen_random_uuid()
        )
      `),
      "a partner must not be able to record a LegalEase final review"
    );
  });
}

async function verifyReviewerRules() {
  await check("a partner can record its own manual check", async () => {
    const result = await db.query(`
      select * from public.rcap_service_record_onboarding_launch_check(
        'partner-a', '${ids.userA}', 'partner', '${ids.workspaceA}',
        'staff_training_completed', 'training_and_resources', 'partner', true,
        'passing', 'Training completed.', gen_random_uuid()
      )
    `);
    assert(result.rows[0].check_status === "passing", "the check must be recorded");
    const stored = await db.query(`
      select checked_by, checked_at, determination
      from public.partner_onboarding_launch_checks
      where workspace_id = '${ids.workspaceA}'
        and check_key = 'staff_training_completed'
    `);
    assert(stored.rows[0].checked_by === ids.userA, "the reviewer must be recorded");
    assert(stored.rows[0].checked_at !== null, "the moment must be recorded");
  });

  await check("a partner cannot waive anything", async () => {
    await expectRejected(
      db.query(`
        select * from public.rcap_service_record_onboarding_launch_check(
          'partner-a', '${ids.userA}', 'partner', '${ids.workspaceA}',
          'staff_training_completed', 'training_and_resources', 'partner', true,
          'waived', 'Skip it.', gen_random_uuid()
        )
      `),
      "a partner waiver must be refused"
    );
  });

  await check("a partner cannot record a LegalEase-owned check", async () => {
    await expectRejected(
      db.query(`
        select * from public.rcap_service_record_onboarding_launch_check(
          'partner-a', '${ids.userA}', 'partner', '${ids.workspaceA}',
          'legalease_final_review_complete', 'approvals', 'legalease', true,
          'passing', 'Done.', gen_random_uuid()
        )
      `),
      "a partner must not record a LegalEase check"
    );
  });

  await check("LegalEase can waive, and the waiver names its reviewer", async () => {
    await db.query(`
      select * from public.rcap_service_record_onboarding_launch_check(
        'partner-a', '${ids.userInternal}', 'legalease', '${ids.workspaceA}',
        'communications_approved', 'training_and_resources', 'legalease', false,
        'waived', 'Not needed for this program.', gen_random_uuid()
      )
    `);
    const stored = await db.query(`
      select status, checked_by from public.partner_onboarding_launch_checks
      where workspace_id = '${ids.workspaceA}' and check_key = 'communications_approved'
    `);
    assert(stored.rows[0].status === "waived");
    assert(stored.rows[0].checked_by === ids.userInternal);
  });

  await check("a repeated request id is idempotent", async () => {
    const requestId = "44444444-4444-4444-8444-444444444444";
    const first = await db.query(`
      select * from public.rcap_service_record_onboarding_launch_approval(
        'partner-a', '${ids.userA}', 'partner', '${ids.workspaceA}',
        'partner_launch_approval', 'approve', null, '${requestId}'
      )
    `);
    const second = await db.query(`
      select * from public.rcap_service_record_onboarding_launch_approval(
        'partner-a', '${ids.userA}', 'partner', '${ids.workspaceA}',
        'partner_launch_approval', 'approve', null, '${requestId}'
      )
    `);
    assert(first.rows[0].duplicate === false);
    assert(second.rows[0].duplicate === true, "the replay must not create a second row");
    const count = await db.query(`
      select count(*)::int as total from public.partner_onboarding_launch_approvals
      where workspace_id = '${ids.workspaceA}'
    `);
    assert(count.rows[0].total === 1, "exactly one approval row");
  });

  await check("recording an approval also satisfies its check", async () => {
    const stored = await db.query(`
      select status, owner_type, blocking
      from public.partner_onboarding_launch_checks
      where workspace_id = '${ids.workspaceA}'
        and check_key = 'partner_launch_approval_received'
    `);
    assert(stored.rows[0].status === "passing");
    assert(stored.rows[0].owner_type === "partner");
    assert(stored.rows[0].blocking === true);
  });
}

async function verifyInvalidation() {
  await check("a LegalEase-only change spares the partner's decisions", async () => {
    const result = await db.query(`
      select * from public.rcap_service_invalidate_onboarding_launch_checks(
        'partner-a', '${ids.workspaceA}', false, 'A LegalEase value changed'
      )
    `);
    assert(result.rows[0].invalidated_count === 1, "only the LegalEase check");
    const partnerOwned = await db.query(`
      select invalidated_at from public.partner_onboarding_launch_checks
      where workspace_id = '${ids.workspaceA}' and owner_type = 'partner'
    `);
    for (const row of partnerOwned.rows) {
      assert(
        row.invalidated_at === null,
        "a partner decision must survive a LegalEase-only change"
      );
    }
  });

  await check("a second observer of the same drift writes nothing", async () => {
    const before = await db.query(`
      select count(*)::int as total from public.partner_onboarding_activity
      where workspace_id = '${ids.workspaceA}'
        and event_type = 'launch_check_invalidated'
    `);
    const repeat = await db.query(`
      select * from public.rcap_service_invalidate_onboarding_launch_checks(
        'partner-a', '${ids.workspaceA}', false, 'A LegalEase value changed'
      )
    `);
    assert(repeat.rows[0].invalidated_count === 0, "nothing left to invalidate");
    const after = await db.query(`
      select count(*)::int as total from public.partner_onboarding_activity
      where workspace_id = '${ids.workspaceA}'
        and event_type = 'launch_check_invalidated'
    `);
    assert(
      before.rows[0].total === after.rows[0].total,
      "a no-op invalidation must emit no event"
    );
  });

  await check("a partner-owned change invalidates both sides", async () => {
    const result = await db.query(`
      select * from public.rcap_service_invalidate_onboarding_launch_checks(
        'partner-a', '${ids.workspaceA}', true, 'A partner value changed'
      )
    `);
    assert(result.rows[0].invalidated_count >= 2, "the partner decisions too");
    const standing = await db.query(`
      select count(*)::int as total from public.partner_onboarding_launch_checks
      where workspace_id = '${ids.workspaceA}' and invalidated_at is null
        and status in ('passing', 'waived', 'not_applicable')
    `);
    assert(standing.rows[0].total === 0, "no satisfied decision may still stand");
  });

  await check("an invalidation must say why", async () => {
    await expectRejected(
      db.query(`
        select * from public.rcap_service_invalidate_onboarding_launch_checks(
          'partner-a', '${ids.workspaceA}', true, '   '
        )
      `),
      "an empty reason must be refused"
    );
  });
}

async function verifyReadinessTransition() {
  await check("a readiness transition is recorded once, then not again", async () => {
    const first = await db.query(`
      select * from public.rcap_service_record_onboarding_launch_readiness(
        'partner-a', '${ids.workspaceA}', 'ready'
      )
    `);
    assert(first.rows[0].changed === true);
    const second = await db.query(`
      select * from public.rcap_service_record_onboarding_launch_readiness(
        'partner-a', '${ids.workspaceA}', 'ready'
      )
    `);
    assert(second.rows[0].changed === false, "an unchanged state must be a no-op");

    const events = await db.query(`
      select count(*)::int as total from public.partner_onboarding_activity
      where workspace_id = '${ids.workspaceA}'
        and event_type = 'launch_readiness_achieved'
    `);
    assert(events.rows[0].total === 1, "exactly one achieved event");

    const lost = await db.query(`
      select * from public.rcap_service_record_onboarding_launch_readiness(
        'partner-a', '${ids.workspaceA}', 'not_ready'
      )
    `);
    assert(lost.rows[0].changed === true);
    const lostEvents = await db.query(`
      select count(*)::int as total from public.partner_onboarding_activity
      where workspace_id = '${ids.workspaceA}'
        and event_type = 'launch_readiness_lost'
    `);
    assert(lostEvents.rows[0].total === 1, "exactly one lost event");
  });

  await check("readiness events carry no participant or contact detail", async () => {
    const rows = await db.query(`
      select summary_code, status_code from public.partner_onboarding_activity
      where workspace_id = '${ids.workspaceA}'
        and event_type in (
          'launch_readiness_achieved', 'launch_readiness_lost',
          'launch_check_recorded', 'launch_check_invalidated',
          'launch_approval_recorded'
        )
    `);
    assert(rows.rows.length > 0, "events must exist to inspect");
    for (const row of rows.rows) {
      const payload = `${row.summary_code} ${row.status_code}`;
      assert(!payload.includes("@"), "no email may appear in an event");
      assert(
        !/[0-9a-f]{8}-[0-9a-f]{4}/.test(payload),
        "no identifier may appear in an event"
      );
    }
  });
}

async function verifyTenantIsolation() {
  await db.exec(`
    select * from public.rcap_service_record_onboarding_launch_check(
      'partner-b', '${ids.userB}', 'partner', '${ids.workspaceB}',
      'staff_training_completed', 'training_and_resources', 'partner', true,
      'passing', 'Training completed.', gen_random_uuid()
    )
  `);

  await check("a partner reads only its own checks", async () => {
    const result = await asPartner(
      ids.userA,
      "partner-a",
      `select workspace_id, check_key from public.partner_onboarding_launch_checks`
    );
    assert(result.rows.length > 0, "partner A must see its own rows");
    for (const row of result.rows) {
      assert(
        row.workspace_id === ids.workspaceA,
        "partner A must never see partner B's checks"
      );
    }
  });

  await check("a partner never reads an internal-only check", async () => {
    const result = await asPartner(
      ids.userA,
      "partner-a",
      `select owner_type from public.partner_onboarding_launch_checks`
    );
    for (const row of result.rows) {
      assert(
        row.owner_type === "partner",
        "a LegalEase-owned check must not reach the partner"
      );
    }
  });

  await check("a partner cannot write a check directly", async () => {
    await expectRejected(
      asPartner(
        ids.userA,
        "partner-a",
        `update public.partner_onboarding_launch_checks
         set status = 'passing' where workspace_id = '${ids.workspaceA}'`
      ),
      "a browser role must hold no write privilege on launch checks"
    );
  });

  await check("a browser role cannot execute a launch mutation function", async () => {
    await expectRejected(
      asPartner(
        ids.userA,
        "partner-a",
        `select * from public.rcap_service_invalidate_onboarding_launch_checks(
          'partner-a', '${ids.workspaceA}', true, 'attempt'
        )`
      ),
      "the invalidation RPC must be revoked from browser roles"
    );
    await expectRejected(
      asPartner(
        ids.userA,
        "partner-a",
        `select * from public.rcap_service_record_onboarding_launch_readiness(
          'partner-a', '${ids.workspaceA}', 'ready'
        )`
      ),
      "the readiness RPC must be revoked from browser roles"
    );
  });

  await check("anonymous access is denied outright", async () => {
    await expectRejected(
      (async () => {
        await db.exec("begin");
        try {
          await db.exec("set local role anon");
          const result = await db.query(
            `select count(*) from public.partner_onboarding_launch_checks`
          );
          await db.exec("commit");
          return result;
        } catch (error) {
          await db.exec("rollback");
          throw error;
        }
      })(),
      "anon must hold no privilege on launch checks"
    );
  });
}
