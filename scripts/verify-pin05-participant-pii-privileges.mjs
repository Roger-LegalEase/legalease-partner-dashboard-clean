#!/usr/bin/env node
// PIN-05 — prove the participant-PII revocation is both complete and safe.
//
// Two failure modes matter and they pull in opposite directions:
//
//   Revoking too little leaves participant identity readable by any principal
//   holding a partner-tenancy session, which is the exposure itself.
//
//   Revoking too much breaks the partner dashboard, which reads these tables
//   through the RLS path and is entitled to its aggregate program data.
//
// So this checks the migration against two independent sources of truth: the
// committed schema for what the columns are, and the actual consumer code for
// what the dashboard selects. It does not need a database.

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const MIGRATION = "supabase/migrations/20260828000000_pin05_participant_pii_column_privileges.sql";
const SCHEMA = "supabase/migrations/20260728213131_remote_schema.sql";
const RLS_CONSUMER = "src/lib/partners/partner-dashboard-rls-repository.ts";

const TABLES = ["rcap_intake_sessions", "rcap_document_packets", "rcap_briefcase_items"];

// Columns that carry participant identity, their described record, or the
// generated document. Derived by reading the schema, not by pattern-matching
// names, so a rename cannot silently drop one out of scope.
const MUST_REVOKE = {
  rcap_intake_sessions: ["user_first_name", "user_last_name", "user_email", "user_phone",
    "record_type", "charge_or_case_type", "case_outcome", "approximate_case_year",
    "pathway_summary", "suggested_next_step"],
  rcap_document_packets: ["petitioner_first_name", "petitioner_last_name", "petitioner_city",
    "petitioner_county", "cause_number", "charge", "offense_date", "arrest_date",
    "arresting_agency", "agency_case_number", "disposition_date", "conviction_date",
    "sentence_completion_date", "generated_html", "generated_plain_text",
    "filing_instructions", "county_court_instructions", "missing_fields"],
  rcap_briefcase_items: ["title"]
};

let failures = 0;
const fail = (m) => { console.error(`  FAIL  ${m}`); failures++; };
const pass = (m) => console.log(`  ok    ${m}`);

const migration = read(MIGRATION);
const schema = read(SCHEMA);

// Parse what the migration actually revokes, per table.
const revoked = {};
for (const m of migration.matchAll(/revoke select \(([^)]*)\) on table public\.([a-z_]+) from authenticated;/gs)) {
  revoked[m[2]] = m[1].split(",").map((c) => c.trim()).filter(Boolean);
}

console.log("PIN-05 participant PII column privileges\n");

// 1. Every table in scope is addressed.
for (const t of TABLES) {
  if (!revoked[t]) fail(`${t}: no revoke statement`);
  else pass(`${t}: ${revoked[t].length} columns revoked`);
}

// 2. Every column named in the migration actually exists in the schema.
for (const t of TABLES) {
  const block = schema.match(new RegExp(`CREATE TABLE IF NOT EXISTS "public"\\."${t}" \\((.*?)\\n\\);`, "s"));
  if (!block) { fail(`${t}: not found in committed schema`); continue; }
  const cols = new Set([...block[1].matchAll(/^\s+"([a-z_]+)" /gm)].map((m) => m[1]));
  const ghost = (revoked[t] ?? []).filter((c) => !cols.has(c));
  if (ghost.length) fail(`${t}: revokes columns that do not exist -> ${ghost.join(", ")}`);
  else pass(`${t}: every revoked column exists in the schema`);
}

// 3. Nothing carrying participant identity is left readable.
for (const t of TABLES) {
  const missing = MUST_REVOKE[t].filter((c) => !(revoked[t] ?? []).includes(c));
  if (missing.length) fail(`${t}: participant PII still readable -> ${missing.join(", ")}`);
  else pass(`${t}: all ${MUST_REVOKE[t].length} participant-PII columns revoked`);
}

// 4. THE SAFETY PROPERTY. Nothing the partner dashboard selects through the
//    RLS path may be revoked, or the dashboard breaks.
const consumer = read(RLS_CONSUMER);
const selected = {};
for (const m of consumer.matchAll(/\.from\("([a-z_]+)"\)[\s\S]{0,200}?\.select\(\s*"([^"]*)"/g)) {
  if (!TABLES.includes(m[1])) continue;
  selected[m[1]] = (selected[m[1]] ?? []).concat(
    m[2].split(",").map((c) => c.trim()).filter((c) => /^[a-z_]+$/.test(c))
  );
}
if (!Object.keys(selected).length) fail(`could not parse any select from ${RLS_CONSUMER}`);
for (const [t, cols] of Object.entries(selected)) {
  const broken = cols.filter((c) => (revoked[t] ?? []).includes(c));
  if (broken.length) fail(`${t}: dashboard reads revoked columns -> ${broken.join(", ")}`);
  else pass(`${t}: dashboard reads [${cols.join(", ")}] — none revoked`);
}

// 5. The migration must only reduce privilege. No grants, no policy or schema
//    changes, no data modification.
for (const forbidden of [/\bgrant\b/i, /create policy/i, /alter table[^;]*\b(add|drop|alter) column/i,
                         /\b(insert|update|delete|truncate|drop table)\b/i]) {
  if (forbidden.test(migration.replace(/^--.*$/gm, ""))) fail(`migration does more than reduce privilege: ${forbidden}`);
}
pass("migration only revokes; no grant, policy, schema or data change");

console.log(failures ? `\n${failures} failure(s)` : "\nPIN-05 privilege migration verified");
process.exit(failures ? 1 : 0);
