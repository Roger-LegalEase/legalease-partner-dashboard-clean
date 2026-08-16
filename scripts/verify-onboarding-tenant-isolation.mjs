// Proves RLS tenant isolation against a real database.
//
// No source-text verifier can establish this. A policy can be present, syntactically valid,
// and still not isolate anything — the only proof is connecting as one tenant's user and
// failing to reach another tenant's rows. That is what this does.
//
// It talks to the database through psql rather than adding a driver dependency, and it
// creates only synthetic organizations and users. It refuses to run against anything that
// looks like production.
//
// Setup (local, no Supabase project needed):
//   scripts/local-onboarding-db.sh up      # initdb, start, apply every migration in order
//   RCAP_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/rcap \
//     node scripts/verify-onboarding-tenant-isolation.mjs
//
// Against an isolated staging project, point RCAP_TEST_DATABASE_URL at it. Never production.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const url = process.env.RCAP_TEST_DATABASE_URL;
if (!url) {
  console.error(
    "RCAP_TEST_DATABASE_URL is not set.\n" +
      "This verifier needs a database. Bring one up with:\n" +
      "  scripts/local-onboarding-db.sh up\n" +
      "then re-run with RCAP_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/rcap"
  );
  process.exit(78); // EX_CONFIG: unmet precondition, not a failed assertion.
}

// A destructive seed against a production database would be unforgivable, so refuse loudly
// rather than trusting the caller to have pointed somewhere safe.
for (const marker of ["prod", "production"]) {
  if (url.toLowerCase().includes(marker)) {
    console.error(`Refusing to run: RCAP_TEST_DATABASE_URL contains "${marker}".`);
    process.exit(1);
  }
}

const ALPHA = "11111111-1111-4111-8111-111111111111";
const BETA = "22222222-2222-4222-8222-222222222222";

function sql(statements, { role = null, asUser = null } = {}) {
  const prelude = [];
  if (role) prelude.push(`set role ${role};`);
  if (asUser) {
    prelude.push(`select set_config('request.jwt.claim.sub','${asUser}', false);`);
    prelude.push(`select set_config('request.jwt.claim.role','authenticated', false);`);
  }
  const script = `${prelude.join("\n")}\n${statements}`;
  const result = spawnSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-tA", "-q"], {
    input: script,
    encoding: "utf8"
  });
  return {
    ok: result.status === 0,
    out: (result.stdout ?? "").trim(),
    err: (result.stderr ?? "").trim()
  };
}

// Only the value of the final select, so prelude set_config echoes do not pollute results.
function value(statements, opts) {
  const r = sql(statements, opts);
  assert.ok(r.ok, `query failed: ${r.err || r.out}`);
  const lines = r.out.split("\n").filter(Boolean);
  return lines[lines.length - 1] ?? "";
}

const checks = [];
function check(name, fn) {
  fn();
  checks.push(name);
}

console.log("Seeding two synthetic tenants...");
const seed = sql(`
  insert into partner_records (partner_id, partner_slug, partner_name, program_tier)
  values ('synthetic-alpha','synthetic-alpha','Synthetic Alpha','pilot'),
         ('synthetic-beta','synthetic-beta','Synthetic Beta','pilot')
  on conflict do nothing;
  insert into auth.users (id, email) values
    ('${ALPHA}','admin-a@synthetic.test'), ('${BETA}','admin-b@synthetic.test')
  on conflict (id) do nothing;
  insert into partner_users (auth_user_id, partner_slug, role, status, invited_email)
  values ('${ALPHA}','synthetic-alpha','partner_admin','active','admin-a@synthetic.test'),
         ('${BETA}','synthetic-beta','partner_admin','active','admin-b@synthetic.test')
  on conflict do nothing;
  insert into partner_onboarding (partner_slug, status)
  select v.slug, 'setup_in_progress' from (values ('synthetic-alpha'),('synthetic-beta')) v(slug)
  where not exists (select 1 from partner_onboarding po where po.partner_slug = v.slug);
  insert into partner_onboarding_sections (workspace_id, section_key)
  select po.id, 'organization_contacts' from partner_onboarding po
  where po.partner_slug like 'synthetic-%'
    and not exists (select 1 from partner_onboarding_sections s
                    where s.workspace_id = po.id and s.section_key = 'organization_contacts');
  grant usage on schema public to authenticated;
  grant select, insert, update, delete on all tables in schema public to authenticated;
  select 'seeded';
`);
assert.ok(seed.ok, `seed failed: ${seed.err}`);

check("a partner admin sees exactly their own workspace", () => {
  assert.equal(
    value("select coalesce(string_agg(partner_slug, ','), 'NONE') from partner_onboarding;", {
      role: "authenticated",
      asUser: ALPHA
    }),
    "synthetic-alpha"
  );
  assert.equal(
    value("select coalesce(string_agg(partner_slug, ','), 'NONE') from partner_onboarding;", {
      role: "authenticated",
      asUser: BETA
    }),
    "synthetic-beta"
  );
});

check("a session with no identity sees nothing at all", () => {
  // The failure mode this guards: a policy written so that a null auth.uid() matches rows.
  assert.equal(
    value("select coalesce(string_agg(partner_slug, ','), 'NONE') from partner_onboarding;", {
      role: "authenticated"
    }),
    "NONE"
  );
});

check("one tenant cannot read another tenant's sections", () => {
  assert.equal(
    value(
      `select count(*) from partner_onboarding_sections s
       join partner_onboarding p on p.id = s.workspace_id
       where p.partner_slug = 'synthetic-beta';`,
      { role: "authenticated", asUser: ALPHA }
    ),
    "0"
  );
});

check("one tenant cannot update another tenant's workspace", () => {
  sql("update partner_onboarding set status='live' where partner_slug='synthetic-beta';", {
    role: "authenticated",
    asUser: ALPHA
  });
  // Read back with full privilege: the write must not have landed.
  assert.equal(
    value("select status from partner_onboarding where partner_slug='synthetic-beta';"),
    "setup_in_progress",
    "a cross-tenant update changed another tenant's row"
  );
});

check("one tenant cannot insert into another tenant's workspace", () => {
  sql(
    `insert into partner_onboarding_sections (workspace_id, section_key)
     select id, 'program_goals' from partner_onboarding where partner_slug='synthetic-beta';`,
    { role: "authenticated", asUser: ALPHA }
  );
  assert.equal(
    value(
      `select count(*) from partner_onboarding_sections s
       join partner_onboarding p on p.id = s.workspace_id
       where p.partner_slug='synthetic-beta' and s.section_key='program_goals';`
    ),
    "0",
    "a cross-tenant insert created a row in another tenant's workspace"
  );
});

check("one tenant cannot delete another tenant's rows", () => {
  const before = value(
    "select count(*) from partner_onboarding_sections s join partner_onboarding p on p.id=s.workspace_id where p.partner_slug='synthetic-beta';"
  );
  sql(
    `delete from partner_onboarding_sections s
     using partner_onboarding p
     where p.id = s.workspace_id and p.partner_slug='synthetic-beta';`,
    { role: "authenticated", asUser: ALPHA }
  );
  assert.equal(
    value(
      "select count(*) from partner_onboarding_sections s join partner_onboarding p on p.id=s.workspace_id where p.partner_slug='synthetic-beta';"
    ),
    before,
    "a cross-tenant delete removed another tenant's rows"
  );
});

check("every onboarding table has row level security enabled", () => {
  // A new table added without RLS is the quietest way to lose isolation.
  const unprotected = value(`
    select coalesce(string_agg(c.relname, ','), 'NONE')
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relkind='r'
      and c.relname like 'partner_onboarding%' and c.relrowsecurity = false;
  `);
  assert.equal(unprotected, "NONE", `onboarding tables without RLS: ${unprotected}`);
});

check("a disabled membership grants no access", () => {
  // Disabling a partner user must actually revoke reach, not just hide a UI affordance.
  // partner_users.status is constrained to active|disabled. An earlier draft of this check
  // wrote 'revoked', which violated that constraint, left the row active, and made the
  // check pass for the wrong reason — so the state change is asserted before it is trusted.
  const disabled = sql(
    `update partner_users set status='disabled' where auth_user_id='${ALPHA}';
     select status from partner_users where auth_user_id='${ALPHA}';`
  );
  assert.ok(disabled.ok, `could not disable the membership: ${disabled.err}`);
  assert.ok(
    disabled.out.split("\n").filter(Boolean).pop() === "disabled",
    "the membership was not actually disabled, so this check would prove nothing"
  );

  const visible = value(
    "select coalesce(string_agg(partner_slug, ','), 'NONE') from partner_onboarding;",
    { role: "authenticated", asUser: ALPHA }
  );
  sql(`update partner_users set status='active' where auth_user_id='${ALPHA}';`);
  assert.equal(visible, "NONE", "a disabled partner user could still read the workspace");
});

console.log(`\nRCAP onboarding tenant isolation: ${checks.length}/${checks.length} checks passed.`);
for (const name of checks) console.log(`  - ${name}`);
