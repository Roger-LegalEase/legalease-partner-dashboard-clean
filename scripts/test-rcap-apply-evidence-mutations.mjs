#!/usr/bin/env node
// The apply-evidence verifier is the read-back that will be trusted after a
// real staging apply. A read-back that cannot fail is decoration, so each
// mutation here breaks one of the six conditions the staging action names and
// requires the verifier to go red.
//
//   node scripts/test-rcap-apply-evidence-mutations.mjs

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { registerTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

// Signal-safe restoration. A `finally` block does not survive SIGTERM, and two
// interrupted runs left tracked mutations behind. The journal this writes is
// recovered by the next repository command even if this process is killed.
registerTrackedMutation("test-rcap-apply-evidence-mutations.mjs", ["supabase/phase-52-rcap-consumer-payment-authority.sql", "data/rcap-staging-action.json", "data/rcap-render/staging-apply-evidence.json"]);


const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verifier = path.join(rootDir, 'scripts/verify-rcap-migration-apply-evidence.mjs');

const FILES = {
  action: path.join(rootDir, 'data/rcap-staging-action.json'),
  phase52: path.join(rootDir, 'supabase/phase-52-rcap-consumer-payment-authority.sql'),
};
const ORIGINAL = Object.fromEntries(Object.entries(FILES).map(([k, p]) => [k, fs.readFileSync(p, 'utf8')]));

function verifierIsRed(extraArgs = []) {
  try {
    execFileSync('node', [verifier, ...extraArgs], { cwd: rootDir, stdio: 'pipe' });
    return false;
  } catch {
    return true;
  }
}

const MUTATIONS = [
  ['Phase 52 is missing from the sequence', () => {
    const a = JSON.parse(ORIGINAL.action);
    a.migrationsInApplyOrder = a.migrationsInApplyOrder.filter((m) => m.phase !== 52);
    fs.writeFileSync(FILES.action, `${JSON.stringify(a, null, 2)}\n`);
  }],

  ['the Phase 52 function body is weakened (owner clause removed)', () => {
    fs.writeFileSync(FILES.phase52, ORIGINAL.phase52.replace(
      '  if v_owner is distinct from p_consumer_auth_user_id then',
      '  if false then'));
  }],

  ['the Phase 52 consumption unit reverts to the job id', () => {
    fs.writeFileSync(FILES.phase52, ORIGINAL.phase52.replace(
      "        'consumer_payment:'\n          || coalesce(v_job.consumer_briefcase_item_id, v_job.briefcase_item_id)::text\n          || ':' || coalesce(v_auth.provider_event_id, '')\n          || ':' || v_job.matter_id::text,",
      "        'zero_charge:' || v_job.id::text,"));
  }],

  ['participant payment grants are restored', () => {
    fs.writeFileSync(FILES.phase52, `${ORIGINAL.phase52.replace(
      /commit;\s*$/,
      "grant insert, update on public.consumer_briefcase_items to authenticated;\n\ncommit;\n")}`);
  }],

  ['the migration order changes (52 before 51)', () => {
    const a = JSON.parse(ORIGINAL.action);
    const m = a.migrationsInApplyOrder;
    [m[2], m[3]] = [m[3], m[2]];
    m.forEach((x, i) => { x.sequencePosition = i + 1; });
    fs.writeFileSync(FILES.action, `${JSON.stringify(a, null, 2)}\n`);
  }],

  ['a migration hash changes', () => {
    const a = JSON.parse(ORIGINAL.action);
    a.migrationsInApplyOrder[3].sha256 = 'f'.repeat(64);
    fs.writeFileSync(FILES.action, `${JSON.stringify(a, null, 2)}\n`);
  }],
];

// The environment check is asserted separately: it only applies to a live
// target, so it is exercised by pointing the verifier at a target whose project
// ref does not match.
const ENV_MUTATION = ['the target environment is not the named staging project', ['--target', 'postgresql://localhost:1/nonexistent', '--project', 'not-the-staging-project']];

let caught = 0;
const survived = [];
try {
  for (const [name, mutate] of MUTATIONS) {
    for (const [k, p] of Object.entries(FILES)) fs.writeFileSync(p, ORIGINAL[k]);
    mutate();
    if (verifierIsRed()) { caught += 1; console.log(`  caught   ${name}`); }
    else { survived.push(name); console.log(`  SURVIVED ${name}`); }
  }
  for (const [k, p] of Object.entries(FILES)) fs.writeFileSync(p, ORIGINAL[k]);

  const [envName, envArgs] = ENV_MUTATION;
  if (verifierIsRed(envArgs)) { caught += 1; console.log(`  caught   ${envName}`); }
  else { survived.push(envName); console.log(`  SURVIVED ${envName}`); }
} finally {
  for (const [k, p] of Object.entries(FILES)) fs.writeFileSync(p, ORIGINAL[k]);
}

console.log('');
if (survived.length > 0) {
  console.error(`test-rcap-apply-evidence-mutations FAILED: ${survived.length} mutation(s) left the read-back green.`);
  for (const s of survived) console.error(`  - ${s}`);
  process.exit(1);
}
console.log(`test-rcap-apply-evidence-mutations passed: ${caught}/${MUTATIONS.length + 1} mutations red, files restored.`);
