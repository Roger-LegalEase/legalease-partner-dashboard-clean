import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { startEphemeralPg } from './lib/rcap-ephemeral-pg.mjs';

// Real migration function in a disposable PostgreSQL cluster. The minimal
// relations isolate CAS behavior; authenticated RLS is tested separately.
const db = startEphemeralPg(), rows = [];
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
const owner = randomUUID(), other = randomUUID();
const snapshot = { schemaVersion: 'expungement-ai/protected-packet-draft/v1', dependencies: {}, packetAnswers: {} };
const migration = fs.readFileSync(new URL('../supabase/migrations/20261012231220_packet_initial_save_revision.sql', import.meta.url), 'utf8');
const oldMigration = fs.readFileSync(new URL('../supabase/migrations/20261011235900_packet_identifier_summary_projection.sql', import.meta.url), 'utf8');
const oldFunction = oldMigration.slice(oldMigration.indexOf('create or replace function'), oldMigration.indexOf('$persist$;') + '$persist$;'.length);
function check(name, actual, expected) { rows.push({ name, actual, expected, pass: actual === expected }); assert.equal(actual, expected, name); }
function call(id, revision, delta, draft, actor = owner) {
  return db.scalar(`select revision from public.persist_consumer_packet_verification(${quote(actor)}::uuid,${quote(id)}::uuid,null,${revision},${quote(JSON.stringify(delta))}::jsonb,'{}'::jsonb,${quote('a'.repeat(64))},${quote(JSON.stringify(draft))}::jsonb,'unverified','synthetic regression',null,null,null);`);
}
function matter() { const id = randomUUID(); db.sql(`insert into public.consumer_briefcase_items(id,user_id) values(${quote(id)},${quote(owner)});`); return id; }
try {
  db.sql(`create table public.consumer_briefcase_items(id uuid primary key,user_id uuid,summary_json jsonb,packet_status text,updated_at timestamptz);
    create table public.consumer_packet_verifications(briefcase_item_id uuid primary key,consumer_auth_user_id uuid,matter_id uuid,status text,reason text,verification_hash text,verification_snapshot jsonb,draft_hash text,draft_snapshot jsonb,revision integer,invalidated_at timestamptz,updated_at timestamptz);
    create function public.consumer_matter_id_for_briefcase_item(uuid) returns uuid language sql as 'select $1';`);
  db.sql(oldFunction);
  const baseline = matter();
  check('actual baseline first empty-delta save leaves revision zero', call(baseline, 0, {}, snapshot), '0');
  check('actual baseline permits stale seed overwrite', call(baseline, 0, {}, { ...snapshot, dependencies: { overwritten: true } }), '1');
  db.sql(migration);
  for (const [name, delta, draft] of [
    ['answer edit', { name: 'Synthetic' }, { ...snapshot, packetAnswers: { name: 'Synthetic' } }],
    ['explicit custody retirement with no answer delta', {}, { ...snapshot, dependencies: { semanticAnswerHistory: [{ factId: 'release_date', value: '2011-01-01' }] } }],
    ['record confirmation with no answer delta', {}, { ...snapshot, dependencies: { recordFactConfirmations: { charge: { status: 'confirmed' } } } }],
    ['first unchanged saved seed', {}, snapshot]
  ]) {
    const id = matter();
    check(name + ' consumes seed revision', call(id, 0, delta, draft), '1');
    check(name + ' stale seed refused', call(id, 0, {}, { ...draft, dependencies: { overwritten: true } }), '');
    check(name + ' other owner refused', call(id, 1, {}, draft, other), '');
    check(name + ' unchanged replay preserves revision', call(id, 1, {}, draft), '1');
    check(name + ' next change advances revision', call(id, 1, {}, { ...draft, dependencies: { changed: true } }), '2');
  }
  console.log(JSON.stringify({ checks: rows.length, rows, layer: 'disposable PostgreSQL CAS regression; no RLS or external approval claim' }));
} finally { db.stop(); }
