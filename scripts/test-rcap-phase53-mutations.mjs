#!/usr/bin/env node
// Mutation harness for Phase 53.
//
// Phase 52's suite cannot substitute for this one: it exercises the gate on
// inputs written directly, so it stays green even when nothing can supply those
// inputs. That is precisely the defect Terminal B found. Every mutation here
// therefore has to be observed through the sanctioned enqueue path.
//
//   node scripts/test-rcap-phase53-mutations.mjs

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { registerMutationRestore } from './lib/mutation-restore-guard.mjs';
import { registerTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

// Signal-safe restoration. A `finally` block does not survive SIGTERM, and two
// interrupted runs left tracked mutations behind. The journal this writes is
// recovered by the next repository command even if this process is killed.
registerTrackedMutation("test-rcap-phase53-mutations.mjs", ["supabase/phase-53-rcap-consumer-job-binding.sql"]);


const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(rootDir, 'supabase/phase-53-rcap-consumer-job-binding.sql');
const verifier = path.join(rootDir, 'scripts/verify-rcap-phase53-consumer-job-binding.mjs');
const original = fs.readFileSync(target, 'utf8');

// A signal bypasses `finally`; a killed run must not leave the migration mutated.
registerMutationRestore(() => fs.writeFileSync(target, original));

function runVerifier() {
  try {
    execFileSync('node', [verifier], { cwd: rootDir, stdio: 'pipe' });
    return 'green';
  } catch (error) {
    const output = `${error.stdout ?? ''}\n${error.stderr ?? ''}`;
    return /"status":"UNAVAILABLE"|\bUNAVAILABLE\b/.test(output) ? 'unavailable' : 'red';
  }
}

const baseline = runVerifier();
if (baseline === 'unavailable') {
  console.error('BASELINE_UNAVAILABLE phase53: zero mutants attempted');
  process.exit(2);
}
if (baseline !== 'green') {
  console.error('BASELINE_NOT_GREEN phase53: zero mutants attempted');
  process.exit(1);
}

const MUTATIONS = [
  ['Phase 53 is omitted entirely', () => null],

  ['the consumer fields are removed from the enqueue INSERT', (s) =>
    s.replace(
      '    consumer_briefcase_item_id, consumer_auth_user_id\n  ) values (',
      '    briefcase_item_id\n  ) values (')
     .replace(
      '    p_consumer_briefcase_item_id, v_canonical_user\n  )\n  returning *;',
      '    v_consumer_item\n  )\n  returning *;')],

  ['the item ownership comparison is removed', (s) =>
    s.replace(
      '    if v_canonical_user is distinct from p_expected_consumer_auth_user_id then',
      '    if false then')],

  ['the caller-supplied user id is stored without comparison', (s) =>
    s.replace(
      '    if v_canonical_user is distinct from p_expected_consumer_auth_user_id then',
      '    v_canonical_user := p_expected_consumer_auth_user_id;\n    if false then')],

  ['the old unbound 13-argument signature is restored', (s) =>
    `${s.replace(/commit;\s*$/, '')}
create or replace function public.enqueue_packet_render_job(
  p_packet_id uuid, p_route_id text, p_renderer_kind text, p_renderer_version text,
  p_source_sha256 text, p_profile_id text, p_profile_version text, p_input_hash text,
  p_briefcase_item_id uuid default null, p_partner_id uuid default null,
  p_person_id uuid default null, p_matter_id uuid default null,
  p_max_attempts integer default 5
) returns setof public.packet_render_jobs language plpgsql security definer set search_path = '' as $legacy$
begin
  perform set_config('rcap.packet_mutation_authority', 'enqueue_packet_render_job', true);
  return query
  insert into public.packet_render_jobs (
    packet_id, route_id, renderer_kind, renderer_version, source_sha256,
    profile_id, profile_version, input_hash, briefcase_item_id,
    partner_id, person_id, matter_id, max_attempts
  ) values (
    p_packet_id, trim(p_route_id), p_renderer_kind, p_renderer_version, p_source_sha256,
    p_profile_id, p_profile_version, p_input_hash, p_briefcase_item_id,
    p_partner_id, p_person_id, p_matter_id, coalesce(p_max_attempts, 5)
  ) returning *;
end;
$legacy$;

commit;
`],

  ['the binding is written after insert rather than during it', (s) =>
    s.replace(
      '    p_consumer_briefcase_item_id, v_canonical_user\n  )\n  returning *;',
      '    null, null\n  )\n  returning *;')],

  ['sponsored mode validation is weakened', (s) =>
    s.replace(
      "      raise exception 'packet_render_jobs: a sponsored job must not carry consumer binding fields';",
      '      null;')],

  ['consumer mode validation is weakened', (s) =>
    s.replace(
      "      raise exception 'packet_render_jobs: an unsponsored consumer job requires a consumer briefcase item';",
      '      null;')],
];

let caught = 0;
const survived = [];
try {
  for (const [name, mutate] of MUTATIONS) {
    const mutated = mutate === null ? null : mutate(original);
    if (mutated === null) {
      fs.rmSync(target);
    } else if (mutated === original) {
      console.error(`  ERROR    ${name}`);
      console.error('           the mutation matched nothing; the defence it targets has moved or been renamed.');
      survived.push(`${name} (no-op mutation)`);
      fs.writeFileSync(target, original);
      continue;
    } else {
      fs.writeFileSync(target, mutated);
    }

    const result = runVerifier();
    if (result === 'unavailable') throw new Error(`BASELINE_UNAVAILABLE during mutation: ${name}`);
    if (result === 'red') { caught += 1; console.log(`  caught   ${name}`); }
    else { survived.push(name); console.log(`  SURVIVED ${name}`); }
    fs.writeFileSync(target, original);
  }
} finally {
  fs.writeFileSync(target, original);
  // Restoring the migration is not enough. Each mutated run rewrote the
  // verifier's evidence artifact to record the failure it was supposed to
  // provoke, so leaving now would strand a committed report claiming a
  // breakage that no longer exists. One clean run puts the artifact back in
  // step with the restored migration.
  if (runVerifier() !== 'green') {
    console.error('\ntest-rcap-phase53-mutations FAILED: the verifier is red against the RESTORED migration.');
    console.error('The evidence artifact was not returned to a truthful state; investigate before trusting it.');
    process.exit(1);
  }
}

console.log('');
if (survived.length > 0) {
  console.error(`test-rcap-phase53-mutations FAILED: ${survived.length} mutation(s) left the suite green.`);
  for (const s of survived) console.error(`  - ${s}`);
  process.exit(1);
}
console.log(`test-rcap-phase53-mutations passed: ${caught}/${MUTATIONS.length} mutations red, migration and evidence artifact restored.`);
