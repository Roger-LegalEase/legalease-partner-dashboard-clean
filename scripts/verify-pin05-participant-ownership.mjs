#!/usr/bin/env node
// PIN-05 ownership half — prove the migration adds participant ownership
// without breaking anything that exists.
//
// The danger in this migration is the opposite of the privilege one. There the
// risk was revoking too much; here it is CONSTRAINING too much. These tables
// carry the preserved legacy generators (rcap_document_packets.state defaults
// to 'MS'), and all three writers can legitimately insert an unowned row today.
// A NOT NULL column or an INSERT trigger would break the first RCAP intake.
//
// So this asserts the migration is strictly additive.

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const M = read("supabase/migrations/20260828001000_pin05_participant_ownership.sql");
const TABLES = ["rcap_intake_sessions", "rcap_document_packets", "rcap_briefcase_items"];

let failures = 0;
const fail = (m) => { console.error(`  FAIL  ${m}`); failures++; };
const pass = (m) => console.log(`  ok    ${m}`);
const sql = M.replace(/^--.*$/gm, "");           // ignore commentary

console.log("PIN-05 participant ownership\n");

// 1. The missing column is added, nullable, and FK'd to the auth identity.
if (/alter table public\.rcap_intake_sessions\s+add column if not exists user_id uuid references auth\.users \(id\)/s.test(sql))
  pass("rcap_intake_sessions gains user_id referencing auth.users");
else fail("rcap_intake_sessions.user_id not added with an auth.users reference");

// 2. STRICTLY ADDITIVE. None of these may appear.
const forbidden = [
  [/set not null/i, "NOT NULL would fail on legacy rows with no owner"],
  [/create trigger/i, "an INSERT trigger would break writers that insert unowned rows"],
  [/drop column/i, "dropping a column is destructive"],
  [/drop table/i, "dropping a table is destructive"],
  [/\btruncate\b/i, "truncate is destructive"],
  [/delete from/i, "deleting rows is destructive"],
  [/drop policy if exists "rcap_\w+_select_own_partner"/i, "removing the partner policy would break the dashboard"],
  [/drop policy if exists "rcap_\w+_select_internal_admin"/i, "removing the internal-admin policy would break internal tooling"],
];
for (const [re, why] of forbidden) {
  if (re.test(sql)) fail(`migration is not additive: ${why}`);
}
if (!failures) pass("strictly additive: no NOT NULL, trigger, drop, truncate or delete");

// 3. Existing policies survive. The only policies dropped are the new ones
//    being replaced idempotently.
const dropped = [...sql.matchAll(/drop policy if exists "([^"]+)"/g)].map((m) => m[1]);
const created = [...sql.matchAll(/create policy\s+"([^"]+)"/g)].map((m) => m[1]);
const orphanDrops = dropped.filter((d) => !created.includes(d));
if (orphanDrops.length) fail(`drops a policy it does not recreate: ${orphanDrops.join(", ")}`);
else pass(`${dropped.length} policy drops all paired with a recreate (idempotent re-run)`);

// 4. Each table gains a participant read path using the repository's own
//    auth.uid() = user_id pattern.
for (const t of TABLES) {
  const re = new RegExp(`create policy\\s+"${t}_select_own_participant"[\\s\\S]{0,220}?user_id = auth\\.uid\\(\\)`);
  if (re.test(sql)) pass(`${t}: participant may read their own record`);
  else fail(`${t}: no participant-owner select policy`);
}

// 5. Backfill only propagates an owner that already exists; it never invents one.
const updates = [...sql.matchAll(/update public\.(\w+)[\s\S]*?where([\s\S]*?);/g)];
if (!updates.length) fail("no backfill statements found");
for (const u of updates) {
  if (!/\.user_id is not null/.test(u[2])) fail(`backfill into ${u[1]} does not require a source owner`);
  if (!/\.user_id is null/.test(u[2])) fail(`backfill into ${u[1]} could overwrite an existing owner`);
}
if (updates.length && !failures) pass(`${updates.length} backfills: each requires a source owner and only fills nulls`);

// 6. The unowned-records view exists and is not readable by participants or anon.
if (/create or replace view public\.rcap_unowned_participant_records/.test(sql)
    && /revoke all on public\.rcap_unowned_participant_records from authenticated, anon/.test(sql))
  pass("unowned-records view published and restricted from authenticated/anon");
else fail("unowned-records view missing or not access-restricted");

// 7. The privilege migration must still be present and unmodified in intent.
const priv = read("supabase/migrations/20260828000000_pin05_participant_pii_column_privileges.sql");
if (/revoke select \(/.test(priv)) pass("privilege migration (20260828000000) still in place");
else fail("privilege migration missing or altered");

console.log(failures ? `\n${failures} failure(s)` : "\nPIN-05 ownership migration verified as additive");
process.exit(failures ? 1 : 0);
