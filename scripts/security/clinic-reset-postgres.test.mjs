import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { startEphemeralPg } from '../lib/rcap-ephemeral-pg.mjs';
import { fixture } from './clinic-reset-route-fixture.mjs';
const hash = v => createHash('sha256').update(v).digest('hex');
const quote = v => "'" + String(v).replaceAll("'", "''") + "'";
const owner = '11111111-1111-4111-8111-111111111111', session = '22222222-2222-4222-8222-222222222222', event = '33333333-3333-4333-8333-333333333333';
test('actual reset route + canonical PostgreSQL closure: failed transaction, cookie loss, recovery and one audit', async () => {
  const pg = startEphemeralPg();
  try {
    pg.sql(`create table clinic_events(id uuid,partner_slug text);create table partner_users(id uuid,auth_user_id uuid,status text,partner_slug text);create table clinic_event_staff(event_id uuid,status text,permissions text[],partner_user_id uuid);create table clinic_assisted_sessions(id uuid,event_id uuid,participant_user_id uuid,status text,ended_at timestamptz,ended_reason text,handoff_token_hash text,device_nonce_hash text);create table clinic_event_audit(event_id uuid,actor_user_id uuid,action text,target_type text,target_id uuid,metadata jsonb);`);
    const migration = fs.readFileSync('supabase/migrations/20260825122000_clinic_mode_accounting_reporting.sql', 'utf8');
    const begin = migration.indexOf('create or replace function public.clinic_end_assisted_session(');
    pg.sql(migration.slice(begin, migration.indexOf('create or replace function public.', begin + 1)));
    pg.sql(`insert into clinic_assisted_sessions values('${session}','${event}','${owner}','active',null,null,'${hash('handoff-a')}','${hash('device-a')}');create function fail_reset() returns trigger language plpgsql as $$ begin raise exception 'synthetic closure failure'; end $$;create trigger fail_reset before update on clinic_assisted_sessions for each row execute function fail_reset();`);
    const database = {
      from(table) { assert.equal(table, 'clinic_assisted_sessions'); const filters = []; const query = { select() { return query; }, eq(key, value) { assert.ok(['handoff_token_hash','device_nonce_hash','participant_user_id'].includes(key)); filters.push(`${key}=${quote(value)}`); return query; }, async maybeSingle() { try { return { data: pg.json(`select row_to_json(s) from clinic_assisted_sessions s where ${filters.join(' and ')}`), error: null }; } catch (error) { return { data: null, error }; } } }; return query; },
      async rpc(name, args) { assert.equal(name, 'clinic_end_assisted_session'); try { return { data: pg.scalar(`select clinic_end_assisted_session(${quote(args.p_session_id)},${quote(args.p_actor_user_id)},${quote(args.p_reason)})`), error: null }; } catch (error) { return { data: null, error }; } }
    };
    const f = fixture({ database }); f.state.owner = owner;
    assert.equal((await f.call('prepare')).prepared, true);
    for (let i = 0; i < 2; i++) assert.equal((await f.call('close')).success, false);
    assert.equal(f.jar.has('sb-test'), false); assert.equal(f.jar.has('clinic_session'), false);
    assert.equal(pg.scalar('select status from clinic_assisted_sessions'), 'active'); assert.equal(pg.scalar('select count(*) from clinic_event_audit'), '0');
    pg.sql('drop trigger fail_reset on clinic_assisted_sessions');
    assert.equal((await f.call('close')).success, true); assert.equal((await f.call('close')).success, true); assert.equal((await f.call('complete')).success, true);
    assert.equal(pg.scalar('select status from clinic_assisted_sessions'), 'reset'); assert.equal(pg.scalar('select count(*) from clinic_event_audit'), '1');
  } finally { pg.stop(); }
});
