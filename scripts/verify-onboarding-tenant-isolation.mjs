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
// The LegalEase operator who prepares a workspace, and a staff member inside tenant A.
const OPERATOR = "33333333-3333-4333-8333-333333333333";
const STAFF = "44444444-4444-4444-8444-444444444444";
const PREPARE_SIGNATURE =
  "public.rcap_service_prepare_onboarding_prefill(text,uuid,uuid,uuid,text,text,text,text,jsonb)";

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

const retained = { ledger: "0", workspaces: "0" };
const checks = [];
function check(name, fn) {
  fn();
  checks.push(name);
}

// Read the shipped privilege posture BEFORE the seed below grants table privileges to
// `authenticated`. That grant exists so the checks prove row level security rather than a
// missing GRANT; these three facts record what the migrations actually ship.
const shipped = {
  prepareForAuthenticated: value(
    `select has_function_privilege('authenticated', '${PREPARE_SIGNATURE}', 'execute');`
  ),
  prepareForAnon: value(
    `select has_function_privilege('anon', '${PREPARE_SIGNATURE}', 'execute');`
  ),
  prepareForServiceRole: value(
    `select has_function_privilege('service_role', '${PREPARE_SIGNATURE}', 'execute');`
  )
};

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

/* ------------------------------------------------- prepared onboarding isolation */

// LegalEase prepares a workspace from what it already knows. Everything below is about the
// blast radius of that: who may run it, whose prepared values a tenant can read, and what
// an unauthenticated request is told. Source-text verifiers cannot establish any of it.

console.log("\nSeeding the LegalEase operator and one partner staff member...");
const seedOperator = sql(`
  insert into auth.users (id, email) values
    ('${OPERATOR}','operator@synthetic.test'), ('${STAFF}','staff-a@synthetic.test')
  on conflict (id) do nothing;
  insert into partner_users (auth_user_id, partner_slug, role, status, invited_email)
  values ('${OPERATOR}', null, 'internal_admin', 'active', 'operator@synthetic.test')
  on conflict do nothing;
  insert into partner_users (auth_user_id, partner_slug, role, status, invited_email)
  values ('${STAFF}','synthetic-alpha','partner_staff','active','staff-a@synthetic.test')
  on conflict do nothing;
  select 'seeded';
`);
assert.ok(seedOperator.ok, `operator seed failed: ${seedOperator.err}`);

const alphaWorkspace = value(
  "select id from partner_onboarding where partner_slug='synthetic-alpha';"
);

/** One prepared batch for tenant A, prepared by the operator through the real function. */
function prepareAlpha(actor) {
  return sql(
    `select public.rcap_service_prepare_onboarding_prefill(
       'synthetic-alpha',
       '${actor}'::uuid,
       '${alphaWorkspace}'::uuid,
       gen_random_uuid(),
       repeat('a', 64),
       'Synthetic isolation run: the program record on file',
       'ready_for_review',
       'manual',
       jsonb_build_array(jsonb_build_object(
         'sectionKey', 'organization_contacts',
         'fieldKey', 'public_program_name',
         'proposedValue', to_jsonb('Alpha Record Clearing Program'::text),
         'sourceType', 'partner_record',
         'sourceLabel', 'Program record on file',
         'baseValueHash', repeat('b', 64),
         'proposedValueHash', repeat('c', 64),
         'baseSectionRevision', 1
       ))
     );`,
    { role: "service_role" }
  );
}

check("a LegalEase operator authorized for one organization can prepare it", () => {
  const prepared = prepareAlpha(OPERATOR);
  assert.ok(prepared.ok, `an authorized operator could not prepare tenant A: ${prepared.err}`);
  assert.equal(
    value(
      `select count(*) from partner_onboarding_prefill_values where workspace_id='${alphaWorkspace}';`
    ),
    "1",
    "preparing tenant A recorded no prepared value"
  );
  // The applied row is what a partner is ever allowed to see, so make one exist.
  sql(`
    update partner_onboarding_prefill_values
    set review_status='applied',
        applied_at=now(),
        applied_value_hash=repeat('c', 64),
        applied_section_revision=1,
        applied_workspace_version=1,
        partner_review_status='pending'
    where workspace_id='${alphaWorkspace}';
  `);
});

check("an operator's preparation is refused for an organization it is not authorized for", () => {
  // The same call, made with a tenant member as the actor, must be refused by the
  // function's own internal-actor assertion rather than by the caller's good manners.
  const refused = prepareAlpha(BETA);
  assert.ok(!refused.ok, "a tenant member was accepted as an internal actor");
});

check("a member of another organization cannot read the prepared values", () => {
  assert.equal(
    value(
      "select coalesce(string_agg(field_key, ','), 'NONE') from partner_onboarding_prefill_values;",
      { role: "authenticated", asUser: BETA }
    ),
    "NONE",
    "tenant B could read tenant A's prepared values"
  );
  assert.equal(
    value(
      "select coalesce(string_agg(field_key, ','), 'NONE') from partner_onboarding_prefill_values_safe;",
      { role: "authenticated", asUser: BETA }
    ),
    "NONE",
    "tenant B could read tenant A's prepared values through the partner-facing view"
  );
  assert.equal(
    value(
      "select coalesce(string_agg(source_summary, ','), 'NONE') from partner_onboarding_prefill_batches;",
      { role: "authenticated", asUser: BETA }
    ),
    "NONE",
    "tenant B could read tenant A's preparation source notes"
  );
  // And tenant A's own administrator reads it, so the check above is not passing because
  // the row is invisible to everyone.
  assert.equal(
    value(
      "select coalesce(string_agg(field_key, ','), 'NONE') from partner_onboarding_prefill_values_safe;",
      { role: "authenticated", asUser: ALPHA }
    ),
    "public_program_name",
    "tenant A's own administrator cannot see their prepared field"
  );
});

check("another organization cannot mutate the prepared workspace", () => {
  const before = value(
    `select partner_review_status from partner_onboarding_prefill_values where workspace_id='${alphaWorkspace}';`
  );
  sql(
    `update partner_onboarding_prefill_values set partner_review_status='confirmed'
     where workspace_id='${alphaWorkspace}';`,
    { role: "authenticated", asUser: BETA }
  );
  sql(
    `delete from partner_onboarding_prefill_values where workspace_id='${alphaWorkspace}';`,
    { role: "authenticated", asUser: BETA }
  );
  sql(
    `insert into partner_onboarding_prefill_values
       (batch_id, workspace_id, section_key, field_key, proposed_value, source_type,
        source_label, review_status, proposed_value_hash, base_value_hash,
        base_section_revision, created_by)
     select batch_id, workspace_id, section_key, 'website', to_jsonb('https://intruder.example'::text),
            source_type, source_label, 'proposed', repeat('d', 64), repeat('d', 64), 1, '${BETA}'
     from partner_onboarding_prefill_values where workspace_id='${alphaWorkspace}' limit 1;`,
    { role: "authenticated", asUser: BETA }
  );
  assert.equal(
    value(
      `select partner_review_status from partner_onboarding_prefill_values where workspace_id='${alphaWorkspace}';`
    ),
    before,
    "tenant B changed tenant A's prepared value"
  );
  assert.equal(
    value(
      `select count(*) from partner_onboarding_prefill_values where workspace_id='${alphaWorkspace}';`
    ),
    "1",
    "tenant B added to or removed from tenant A's prepared values"
  );
});

check("a partner administrator cannot invoke the internal prefill preparation", () => {
  assert.equal(
    shipped.prepareForAuthenticated,
    "f",
    "the prefill preparation is executable by every signed-in account"
  );
  const attempt = prepareAlpha(ALPHA);
  assert.ok(!attempt.ok, "a partner administrator prepared a workspace");
  const asPartner = sql(
    `select public.rcap_service_prepare_onboarding_prefill(
       'synthetic-alpha', '${OPERATOR}'::uuid, '${alphaWorkspace}'::uuid, gen_random_uuid(),
       repeat('a', 64), 'attempt', 'draft', 'manual', '[]'::jsonb);`,
    { role: "authenticated", asUser: ALPHA }
  );
  assert.ok(
    !asPartner.ok,
    "a partner administrator session could execute the internal preparation function"
  );
});

check("partner staff cannot invoke the internal prefill preparation", () => {
  const asStaff = sql(
    `select public.rcap_service_prepare_onboarding_prefill(
       'synthetic-alpha', '${OPERATOR}'::uuid, '${alphaWorkspace}'::uuid, gen_random_uuid(),
       repeat('a', 64), 'attempt', 'draft', 'manual', '[]'::jsonb);`,
    { role: "authenticated", asUser: STAFF }
  );
  assert.ok(!asStaff.ok, "partner staff could execute the internal preparation function");
  assert.equal(
    value(
      "select coalesce(string_agg(field_key, ','), 'NONE') from partner_onboarding_prefill_values;",
      { role: "authenticated", asUser: STAFF }
    ),
    "public_program_name",
    "partner staff inside tenant A should read their own applied prepared field and nothing else"
  );
});

check("an unauthenticated request is told nothing about a prepared workspace", () => {
  assert.equal(shipped.prepareForAnon, "f", "the preparation function is executable anonymously");
  for (const [what, query] of [
    ["organization identity", "select coalesce(string_agg(partner_slug, ','), 'NONE') from partner_onboarding;"],
    ["field values", "select coalesce(string_agg(proposed_value::text, ','), 'NONE') from partner_onboarding_prefill_values;"],
    ["source notes", "select coalesce(string_agg(source_label, ','), 'NONE') from partner_onboarding_prefill_values;"],
    ["provenance", "select coalesce(string_agg(source_type, ','), 'NONE') from partner_onboarding_prefill_values;"],
    ["conflicts", "select coalesce(string_agg(review_status, ','), 'NONE') from partner_onboarding_prefill_values;"],
    ["internal ownership", "select coalesce(string_agg(created_by::text, ','), 'NONE') from partner_onboarding_prefill_values;"],
    ["preparation summaries", "select coalesce(string_agg(source_summary, ','), 'NONE') from partner_onboarding_prefill_batches;"]
  ]) {
    for (const role of ["anon", "authenticated"]) {
      const seen = sql(query, { role });
      const disclosed = seen.ok ? seen.out.split("\n").filter(Boolean).pop() : "NONE";
      assert.equal(disclosed, "NONE", `an unauthenticated ${role} request disclosed ${what}`);
    }
  }
});

check("a disabled membership reaches no prepared value", () => {
  const disabled = sql(
    `update partner_users set status='disabled' where auth_user_id='${ALPHA}';
     select status from partner_users where auth_user_id='${ALPHA}';`
  );
  assert.ok(
    disabled.out.split("\n").filter(Boolean).pop() === "disabled",
    "the membership was not actually disabled, so this check would prove nothing"
  );
  const visible = value(
    "select coalesce(string_agg(field_key, ','), 'NONE') from partner_onboarding_prefill_values_safe;",
    { role: "authenticated", asUser: ALPHA }
  );
  sql(`update partner_users set status='active' where auth_user_id='${ALPHA}';`);
  assert.equal(visible, "NONE", "a disabled partner administrator could still read prepared values");
});

/* ------------------------------------- reproposal after a prepared value is applied */

check("a field whose prepared value was applied can be prepared again", () => {
  // Before this, the partial unique index counted an applied row as the field's active
  // suggestion, so this insert was impossible and LegalEase had no way to propose a
  // correction for a value the partner had since edited.
  const applied = value(
    `select id from partner_onboarding_prefill_values where workspace_id='${alphaWorkspace}';`
  );
  const appliedBefore = value(
    `select applied_value_hash || '|' || applied_at::text || '|' || created_by::text
     from partner_onboarding_prefill_values where id='${applied}';`
  );

  const reproposed = prepareAlpha(OPERATOR);
  assert.ok(
    reproposed.ok,
    `an applied preparation still blocks a later proposal for the same field: ${reproposed.err}`
  );

  // The applied row is history and is untouched by the new proposal.
  assert.equal(
    value(
      `select applied_value_hash || '|' || applied_at::text || '|' || created_by::text
       from partner_onboarding_prefill_values where id='${applied}';`
    ),
    appliedBefore,
    "preparing a new suggestion rewrote the applied preparation"
  );
  assert.equal(
    value(`select review_status from partner_onboarding_prefill_values where id='${applied}';`),
    "applied",
    "the applied preparation stopped reading as applied"
  );

  // Exactly one suggestion is actionable for the field, and exactly one is current applied.
  assert.equal(
    value(`
      select count(*) from partner_onboarding_prefill_values
      where workspace_id='${alphaWorkspace}'
        and review_status in ('proposed','approved','conflict')
        and superseded_at is null;
    `),
    "1",
    "more than one suggestion is awaiting a decision for the same field"
  );
  assert.equal(
    value(`
      select count(*) from partner_onboarding_prefill_values
      where workspace_id='${alphaWorkspace}'
        and review_status = 'applied' and superseded_at is null;
    `),
    "1",
    "the field has more than one current applied preparation"
  );

  // The new proposal names the applied preparation it follows.
  const reproposal = value(`
    select id from partner_onboarding_prefill_values
    where workspace_id='${alphaWorkspace}' and review_status='proposed' and superseded_at is null;
  `);
  const linked = sql(
    `update partner_onboarding_prefill_values
     set supersedes_value_id='${applied}' where id='${reproposal}';`
  );
  assert.ok(linked.ok, `the reproposal could not record its lineage: ${linked.err}`);
  assert.equal(
    value(
      `select supersedes_value_id from partner_onboarding_prefill_values where id='${reproposal}';`
    ),
    applied,
    "the reproposal does not name the applied preparation it follows"
  );

  const selfReference = sql(
    `update partner_onboarding_prefill_values
     set supersedes_value_id='${reproposal}' where id='${reproposal}';`
  );
  assert.ok(!selfReference.ok, "a suggestion was allowed to supersede itself");
});

check("a second suggestion awaiting a decision is still refused for the same field", () => {
  const second = prepareAlpha(OPERATOR);
  assert.ok(
    !second.ok,
    "two suggestions can await a decision for one field, so the operator has no single answer to act on"
  );
});

check("applying a newer preparation retires the earlier one instead of duplicating it", () => {
  const reproposal = value(`
    select id from partner_onboarding_prefill_values
    where workspace_id='${alphaWorkspace}' and review_status='proposed' and superseded_at is null;
  `);
  const applied = sql(`
    update partner_onboarding_prefill_values
    set review_status='applied',
        applied_at=now(),
        applied_value_hash=repeat('e', 64),
        applied_section_revision=1,
        applied_workspace_version=1,
        partner_review_status='pending'
    where id='${reproposal}';
  `);
  assert.ok(applied.ok, `a reproposal could not be applied over an earlier one: ${applied.err}`);
  assert.equal(
    value(`
      select count(*) from partner_onboarding_prefill_values
      where workspace_id='${alphaWorkspace}' and review_status='applied' and superseded_at is null;
    `),
    "1",
    "two applied preparations are current for one field"
  );
  // The earlier one is retired, not rewritten: it still reads as applied, with its own
  // value hash and timestamps.
  assert.equal(
    value(`
      select count(*) from partner_onboarding_prefill_values
      where workspace_id='${alphaWorkspace}' and review_status='applied'
        and superseded_at is not null and applied_value_hash is not null;
    `),
    "1",
    "the earlier applied preparation was not preserved as history"
  );
  // And the partner-facing projection shows only the current one.
  assert.equal(
    value(
      `select count(*) from partner_onboarding_prefill_values_safe where workspace_id='${alphaWorkspace}';`
    ),
    "1",
    "the partner-facing projection shows a preparation that has been replaced"
  );
});

check("an overridden partner answer must carry a reason and the operator who decided", () => {
  const reproposal = value(`
    select id from partner_onboarding_prefill_values
    where workspace_id='${alphaWorkspace}' and superseded_at is null and review_status='applied';
  `);
  const withoutReason = sql(
    `update partner_onboarding_prefill_values
     set override_by='${OPERATOR}', override_at=now(), override_partner_value_hash=repeat('f', 64)
     where id='${reproposal}';`
  );
  assert.ok(!withoutReason.ok, "an override was recorded with no reason");
  const tooShort = sql(
    `update partner_onboarding_prefill_values
     set override_reason='too short', override_by='${OPERATOR}', override_at=now(),
         override_partner_value_hash=repeat('f', 64)
     where id='${reproposal}';`
  );
  assert.ok(!tooShort.ok, "an override was recorded with a reason too short to mean anything");
  const complete = sql(
    `update partner_onboarding_prefill_values
     set override_reason='Program name corrected with the partner on a call.',
         override_by='${OPERATOR}', override_at=now(),
         override_partner_value_hash=repeat('f', 64)
     where id='${reproposal}';`
  );
  assert.ok(complete.ok, `a complete override record was refused: ${complete.err}`);
  assert.equal(
    value(
      `select override_partner_value_hash from partner_onboarding_prefill_values where id='${reproposal}';`
    ),
    "f".repeat(64),
    "the override did not record which partner answer it replaced"
  );
});

check("a partner administrator cannot prepare a reproposal either", () => {
  const asPartner = sql(
    `select public.rcap_service_prepare_onboarding_prefill(
       'synthetic-alpha', '${OPERATOR}'::uuid, '${alphaWorkspace}'::uuid, gen_random_uuid(),
       repeat('a', 64), 'attempt', 'draft', 'manual', '[]'::jsonb);`,
    { role: "authenticated", asUser: ALPHA }
  );
  assert.ok(!asPartner.ok, "a partner administrator could prepare a reproposal");
  assert.equal(
    value(
      "select coalesce(string_agg(field_key, ','), 'NONE') from partner_onboarding_prefill_values;",
      { role: "authenticated", asUser: BETA }
    ),
    "NONE",
    "another organization could read the reproposal"
  );
  for (const role of ["anon", "authenticated"]) {
    const seen = sql(
      "select coalesce(string_agg(proposed_value::text, ','), 'NONE') from partner_onboarding_prefill_values;",
      { role }
    );
    const disclosed = seen.ok ? seen.out.split("\n").filter(Boolean).pop() : "NONE";
    assert.equal(disclosed, "NONE", `an unauthenticated ${role} request read a reproposal`);
  }
});

check("every synthetic row the audit trail permits is removed afterwards", () => {
  // partner_onboarding_activity is append-only by design: a BEFORE DELETE trigger refuses
  // every row, and the workspace cascades into it, so a workspace that has been prepared
  // can never be deleted. The run removes everything else and then states exactly what the
  // ledger keeps, rather than claiming a teardown the schema forbids.
  const removal = sql(`
    delete from partner_onboarding_prefill_values
      where workspace_id in (select id from partner_onboarding where partner_slug like 'synthetic-%');
    delete from partner_onboarding_prefill_batches
      where workspace_id in (select id from partner_onboarding where partner_slug like 'synthetic-%');
    delete from partner_onboarding_idempotency
      where workspace_id in (select id from partner_onboarding where partner_slug like 'synthetic-%');
    delete from partner_onboarding_sections
      where workspace_id in (select id from partner_onboarding where partner_slug like 'synthetic-%');
    delete from partner_users where auth_user_id in
      ('${ALPHA}','${BETA}','${OPERATOR}','${STAFF}');
    select 'cleaned';
  `);
  assert.ok(removal.ok, `cleanup failed: ${removal.err}`);

  const removed = value(`
    select
      (select count(*) from partner_onboarding_prefill_values)
      + (select count(*) from partner_onboarding_prefill_batches)
      + (select count(*) from partner_onboarding_sections
           where workspace_id in (select id from partner_onboarding where partner_slug like 'synthetic-%'))
      + (select count(*) from partner_users where auth_user_id in
           ('${ALPHA}','${BETA}','${OPERATOR}','${STAFF}'));
  `);
  assert.equal(removed, "0", `${removed} synthetic prepared, section or membership rows survived`);

  retained.ledger = value(`
    select count(*) from partner_onboarding_activity
    where workspace_id in (select id from partner_onboarding where partner_slug like 'synthetic-%');
  `);
  retained.workspaces = value(
    "select count(*) from partner_onboarding where partner_slug like 'synthetic-%';"
  );
  // Nothing the ledger keeps may name a person: the actor is an id, and the summary codes
  // are internal vocabulary, never a partner value.
  assert.equal(
    value(`
      select count(*) from partner_onboarding_activity
      where workspace_id in (select id from partner_onboarding where partner_slug like 'synthetic-%')
        and (summary_code ilike '%harbor%' or summary_code ilike '%@%');
    `),
    "0",
    "the append-only ledger recorded a value rather than an event code"
  );
});

console.log(`\nRCAP onboarding tenant isolation: ${checks.length}/${checks.length} checks passed.`);
for (const name of checks) console.log(`  - ${name}`);
console.log(`\nDatabase: ${url.replace(/:[^:@/]*@/, ":***@")}`);
console.log(
  `Synthetic organizations, memberships, sections and prepared values removed. ` +
    `Retained by the append-only audit trail: ${retained.ledger} activity rows across ` +
    `${retained.workspaces} synthetic workspace(s), which the schema forbids deleting.`
);
