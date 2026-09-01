#!/usr/bin/env node
// Mutation harness for Phase 52.
//
// Each mutation reverts one specific defence in the migration and requires the
// Phase 52 verifier to go red. A mutation that leaves it green means that
// defence is not actually load-bearing and the corresponding bypass would
// reopen unnoticed.
//
//   node scripts/test-rcap-phase52-mutations.mjs

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { registerMutationRestore } from "./lib/mutation-restore-guard.mjs";
import { registerTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

// Signal-safe restoration. A `finally` block does not survive SIGTERM, and two
// interrupted runs left tracked mutations behind. The journal this writes is
// recovered by the next repository command even if this process is killed.
registerTrackedMutation("test-rcap-phase52-mutations.mjs", ["supabase/phase-52-rcap-consumer-payment-authority.sql"]);


const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(rootDir, "supabase/phase-52-rcap-consumer-payment-authority.sql");
const verifier = path.join(rootDir, "scripts/verify-rcap-phase52-consumer-payment-authority.mjs");
const original = fs.readFileSync(target, "utf8");

// A signal bypasses `finally`; a killed run must not leave the migration mutated.
registerMutationRestore(() => fs.writeFileSync(target, original));

function runVerifier() {
  try {
    execFileSync("node", [verifier], { cwd: rootDir, stdio: "pipe" });
    return "green";
  } catch (error) {
    const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
    return /"status":"UNAVAILABLE"|\bUNAVAILABLE\b/.test(output) ? "unavailable" : "red";
  }
}

const baseline = runVerifier();
if (baseline === "unavailable") {
  console.error("BASELINE_UNAVAILABLE phase52: zero mutants attempted");
  process.exit(2);
}
if (baseline !== "green") {
  console.error("BASELINE_NOT_GREEN phase52: zero mutants attempted");
  process.exit(1);
}

// Each entry reverts one defence. `find` must appear verbatim in the migration,
// so a refactor that moves the defence fails loudly here instead of silently
// disarming the mutation.
const MUTATIONS = [
  ["G1 reopens: payment columns become grantable again", (s) =>
    s.replace(
      "'payment_status', 'amount_cents', 'currency', 'payment_provider',",
      "'nonexistent_column_a', 'nonexistent_column_b', 'currency', 'payment_provider',")],

  ["G1 reopens: the server-evidence constraint is dropped", (s) =>
    s.replace(
      "add constraint consumer_briefcase_items_paid_requires_server_evidence",
      "add constraint consumer_briefcase_items_paid_requires_server_evidence_disabled")],

  ["G1 reopens: the authority probe stops requiring server evidence", (s) =>
    s.replace(
      "  if v_authority is null or nullif(trim(coalesce(v_event, '')), '') is null then",
      "  if false then")],

  ["G12 reopens: the owner clause is removed from the probe", (s) =>
    s.replace(
      "  if v_owner is distinct from p_consumer_auth_user_id then",
      "  if false then")],

  ["G11 reopens: the consumption unit goes back to hashing the job id", (s) =>
    s.replace(
      "        'consumer_payment:'\n          || coalesce(v_job.consumer_briefcase_item_id, v_job.briefcase_item_id)::text\n          || ':' || coalesce(v_auth.provider_event_id, '')\n          || ':' || v_job.matter_id::text,",
      "        'zero_charge:' || v_job.id::text,")],

  ["G11 reopens: the matter conflict is treated as a pass", (s) =>
    s.replace(
      "          v_result := 'consumer_payment_matter_conflict';\n          v_eligibility := 'accounting_blocked';",
      "          v_result := 'zero_charge';\n          v_eligibility := 'eligible';")],

  ["the item uniqueness key is dropped", (s) =>
    s.replace(
      "create unique index if not exists consumer_packet_payment_consumption_item_uk",
      "create index if not exists consumer_packet_payment_consumption_item_uk")],

  ["the provider receipt uniqueness key is dropped", (s) =>
    s.replace(
      "create unique index if not exists consumer_briefcase_items_provider_event_uk",
      "create index if not exists consumer_briefcase_items_provider_event_uk")],

  ["the payment RPC becomes reachable by authenticated", (s) =>
    s.replace(
      "revoke all on function public.record_consumer_packet_payment(\n  uuid, text, integer, text, text, text, text, text, text, text, text) from authenticated;",
      "grant execute on function public.record_consumer_packet_payment(\n  uuid, text, integer, text, text, text, text, text, text, text, text) to authenticated;")],

  ["the RPC stops enforcing amount and currency", (s) =>
    s.replace(
      "    if p_amount_cents is distinct from 5000\n       or lower(coalesce(p_currency, '')) <> 'usd'\n       or nullif(trim(coalesce(p_provider_event_id, '')), '') is null then",
      "    if false then")],

  ["the consumer binding becomes mutable", (s) =>
    s.replace(
      "      raise exception 'packet_render_jobs: consumer_briefcase_item_id is immutable once set';",
      "      null;")],

  ["a refunded payment stops blocking finalization", (s) =>
    s.replace(
      "  if v_status is distinct from 'paid' then",
      "  if v_status is distinct from 'paid' and v_status is distinct from 'refunded' then")],
];

let caught = 0;
const survived = [];
try {
  for (const [name, mutate] of MUTATIONS) {
    const mutated = mutate(original);
    if (mutated === original) {
      console.error(`  ERROR    ${name}`);
      console.error("           the mutation matched nothing; the defence it targets has moved or been renamed.");
      survived.push(`${name} (no-op mutation)`);
      continue;
    }
    fs.writeFileSync(target, mutated);
    const result = runVerifier();
    if (result === "unavailable") throw new Error(`BASELINE_UNAVAILABLE during mutation: ${name}`);
    if (result === "red") {
      caught += 1;
      console.log(`  caught   ${name}`);
    } else {
      survived.push(name);
      console.log(`  SURVIVED ${name}`);
    }
    fs.writeFileSync(target, original);
  }
} finally {
  fs.writeFileSync(target, original);
  // Restoring the migration is not enough. Each mutated run rewrote the
  // verifier's evidence artifact to record the failure it was supposed to
  // provoke, so leaving now would strand a committed report claiming a
  // breakage that no longer exists. One clean run puts the artifact back in
  // step with the restored migration.
  if (runVerifier() !== "green") {
    console.error("\ntest-rcap-phase52-mutations FAILED: the verifier is red against the RESTORED migration.");
    console.error("The evidence artifact was not returned to a truthful state; investigate before trusting it.");
    process.exit(1);
  }
}

console.log("");
if (survived.length > 0) {
  console.error(`test-rcap-phase52-mutations FAILED: ${survived.length} mutation(s) left the verifier green.`);
  for (const s of survived) console.error(`  - ${s}`);
  process.exit(1);
}
console.log(`test-rcap-phase52-mutations passed: ${caught}/${MUTATIONS.length} mutations red, migration and evidence artifact restored.`);
