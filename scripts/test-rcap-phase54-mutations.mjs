#!/usr/bin/env node
// Mutation harness for Phase 54.
//
// Phase 54 takes privileges away and adds two guards. A suite that passes both
// before and after those changes would be describing the schema, not testing
// it. Each mutation removes exactly one of the four defences and expects the
// namespace proof to go red.
//
//   node scripts/test-rcap-phase54-mutations.mjs

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { registerMutationRestore } from './lib/mutation-restore-guard.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(rootDir, 'supabase/phase-54-rcap-person-namespace-hardening.sql');
const verifier = path.join(rootDir, 'scripts/verify-rcap-consumer-person-namespace.mjs');
const original = fs.readFileSync(target, 'utf8');

// A signal bypasses `finally`; a killed run must not leave the migration mutated.
registerMutationRestore(() => fs.writeFileSync(target, original));

function verifierIsRed() {
  try {
    execFileSync('node', [verifier], { cwd: rootDir, stdio: 'pipe' });
    return false;
  } catch {
    return true;
  }
}

const MUTATIONS = [
  ['Phase 54 is omitted entirely', () => null],

  ['row-level security is not enabled', (s) =>
    s.replace(
      "  execute 'alter table public.rcap_persons enable row level security';",
      '  -- mutated: RLS not enabled')],

  ['the browser-role revokes are dropped', (s) =>
    s
      .replace("    execute 'revoke all on public.rcap_persons from anon';", '    null;')
      .replace("    execute 'revoke all on public.rcap_persons from authenticated';", '    null;')],

  ['the reserved slug can be registered as a partner', (s) =>
    s.replace(
      '  if new.partner_slug = public.rcap_consumer_person_namespace() then',
      '  if false then')],

  ['the namespace shape constraint stops discriminating', (s) =>
    s.replace(
      "        (partner_slug = 'expungement-ai-consumer' and match_key ~ '^consumer:[0-9a-f]{64}$')",
      "        (true)")]
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

    if (verifierIsRed()) { caught += 1; console.log(`  caught   ${name}`); }
    else { survived.push(name); console.log(`  SURVIVED ${name}`); }
    fs.writeFileSync(target, original);
  }
} finally {
  fs.writeFileSync(target, original);
}

console.log('');
if (survived.length > 0) {
  console.error(`test-rcap-phase54-mutations FAILED: ${survived.length} mutation(s) left the suite green.`);
  for (const s of survived) console.error(`  - ${s}`);
  process.exit(1);
}
console.log(`test-rcap-phase54-mutations passed: ${caught}/${MUTATIONS.length} mutations red, migration restored.`);
