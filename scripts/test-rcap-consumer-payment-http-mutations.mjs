#!/usr/bin/env node
// Mutation harness for the application payment and enqueue path.
//
// Two guarantees are deliberately NOT mutated here, because in both cases the
// application layer is the second or third line of defence and removing it
// alone changes no observable behaviour. A mutation that cannot go red is
// decoration, so they are named instead of faked:
//
//   * A 'paid' record requires a provider receipt. Phase 52 enforces it in the
//     database, no application path can supply an event with no id, and the
//     phase-52 verifier's G11 turns red when it is removed.
//   * No browser-supplied identity becomes authoritative. Feeding the request's
//     `userId` into the route still fails, because the Briefcase lookup runs
//     under the participant's own RLS-scoped client — a session for one user
//     cannot read another's row whatever the body claims — and because Phase 53
//     independently compares the item's canonical owner to the expected user
//     (the audit's G6). The route deriving the id from the session is real and
//     required, but it is the third lock on that door.
//
// The P1-P18 suite passes. That alone does not tell us it would fail if the
// defences were removed — a suite that never goes red is a description, not a
// test. Each mutation below removes exactly one guarantee and expects the suite
// to notice.
//
//   node scripts/test-rcap-consumer-payment-http-mutations.mjs

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { registerMutationRestore } from './lib/mutation-restore-guard.mjs';
import { registerTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

// Signal-safe restoration. A `finally` block does not survive SIGTERM, and two
// interrupted runs left tracked mutations behind. The journal this writes is
// recovered by the next repository command even if this process is killed.
registerTrackedMutation("test-rcap-consumer-payment-http-mutations.mjs", ["src/lib/expungement-ai/consumer-payment-authority.ts", "src/lib/expungement-ai/checkout-reconciliation.ts", "src/app/api/expungement-ai/checkout/route.ts", "src/lib/expungement-ai/payment-adapter.ts"]);


const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verifier = path.join(rootDir, 'scripts/verify-expungement-consumer-payment-http.mjs');

const RECONCILE = path.join(rootDir, 'src/lib/expungement-ai/checkout-reconciliation.ts');
const CONTROL = path.join(rootDir, 'src/lib/rcap/render/consumer-delivery-control.ts');
const RENDER = path.join(rootDir, 'src/lib/expungement-ai/consumer-render-request.ts');
const AUTHORITY = path.join(rootDir, 'src/lib/expungement-ai/consumer-payment-authority.ts');

function verifierIsRed() {
  try {
    execFileSync('node', [verifier], { cwd: rootDir, stdio: 'pipe' });
    return false;
  } catch {
    return true;
  }
}

const MUTATIONS = [
  ['the webhook stops checking the charged amount', RECONCILE, (s) =>
    s.replace('if (session.amount_total !== consumerPacketPriceCents) {', 'if (false) {')],

  ['the webhook stops checking the currency', RECONCILE, (s) =>
    s.replace(
      'if ((session.currency ?? "").toLowerCase() !== CONSUMER_PACKET_CURRENCY) {',
      'if (false) {')],

  ['the webhook stops checking the reviewed packet-input hash', RECONCILE, (s) =>
    s.replace(
      'if (!session.metadata.reviewed_input_hash || session.metadata.reviewed_input_hash !== reviewedPacketInputHash(item)) {',
      'if (false) {')],

  ['the payment writer stops requiring a server authority', AUTHORITY, (s) =>
    s.replace('p_authority: input.authority,', "p_authority: 'self_asserted',")],

  ['the delivery control defaults to enabled when unset', CONTROL, (s) =>
    s.replace(
      '  if (!KNOWN_STATES.has(raw as ConsumerDeliveryRouteState)) return "disabled";',
      '  if (!KNOWN_STATES.has(raw as ConsumerDeliveryRouteState)) return "live";')],

  ['the staging scope admits callers outside it', CONTROL, (s) =>
    s.replace('if (!subjectId || !scope.includes(subjectId)) {', 'if (false) {')],

  ['the enqueue route stops requiring a recorded payment', RENDER, (s) =>
    s.replace(
      'if (!authority.valid) return { status: "payment_required", reason: authority.reason };',
      '')],

  ['the matter stops being derived from the item', RENDER, (s) =>
    s.replace(
      'const matterId = consumerMatterIdForItem(item.id);',
      'const matterId = consumerMatterIdForItem(`${item.id}:${Math.random()}`);')]
];

let caught = 0;
const survived = [];
const originals = new Map();
for (const [, file] of MUTATIONS) {
  if (!originals.has(file)) originals.set(file, fs.readFileSync(file, 'utf8'));
}

function restoreAll() {
  for (const [file, text] of originals) fs.writeFileSync(file, text);
}

// `finally` does not run on a signal. Without this, a step timeout leaves the
// deleted payment-authority check sitting in tracked source.
registerMutationRestore(restoreAll);

try {
  for (const [name, file, mutate] of MUTATIONS) {
    const original = originals.get(file);
    const mutated = mutate(original);
    if (mutated === original) {
      console.error(`  ERROR    ${name}`);
      console.error('           the mutation matched nothing; the defence it targets has moved or been renamed.');
      survived.push(`${name} (no-op mutation)`);
      continue;
    }
    fs.writeFileSync(file, mutated);

    if (verifierIsRed()) { caught += 1; console.log(`  caught   ${name}`); }
    else { survived.push(name); console.log(`  SURVIVED ${name}`); }
    fs.writeFileSync(file, original);
  }
} finally {
  restoreAll();
}

console.log('');
if (survived.length > 0) {
  console.error(`test-rcap-consumer-payment-http-mutations FAILED: ${survived.length} mutation(s) left the suite green.`);
  for (const s of survived) console.error(`  - ${s}`);
  process.exit(1);
}
console.log(`test-rcap-consumer-payment-http-mutations passed: ${caught}/${MUTATIONS.length} mutations red, sources restored.`);
