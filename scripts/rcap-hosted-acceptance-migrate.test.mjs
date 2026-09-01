import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(rootDir, "scripts/rcap-hosted-acceptance-migrate.mjs"), "utf8");
const f1Source = fs.readFileSync(path.join(rootDir, "scripts/f1-ephemeral-staging-stack.mjs"), "utf8");
const f1Workflow = fs.readFileSync(path.join(rootDir, ".github/workflows/rcap-f1-ephemeral-staging.yml"), "utf8");
const action = JSON.parse(fs.readFileSync(path.join(rootDir, "data/rcap-staging-action.json"), "utf8"));

test("baseline exclusions derive from the authorized action sequence, which includes phase 55", () => {
  assert.ok(
    action.migrationsInApplyOrder.some((entry) => entry.phase === 55),
    "the current authorized action must include phase 55"
  );
  assert.match(
    source,
    /const authorizedMigrationPaths = new Set\(sequence\.map\(\(entry\) => entry\.path\)\)/,
    "baseline exclusions must derive from every path in the authorized action"
  );
  assert.match(
    source,
    /\.filter\(\(name\) => !authorizedMigrationPaths\.has\(`supabase\/\$\{name\}`\)\)/,
    "an authorized migration must never enter the best-effort baseline"
  );
  assert.doesNotMatch(source, /\^phase-\(49\|50\|51\|52\|53\|54\|55\)-/);
});

test("authorized sequence reporting derives its phase range and count from the ledger sequence", () => {
  assert.match(
    source,
    /const authorizedPhaseLabel = sequence\.map\(\(entry\) => entry\.phase\)\.join\(" -> "\)/,
    "phase reporting must derive from the hash-gated sequence"
  );
  assert.match(
    source,
    /const authorizedPhaseCount = sequence\.length/,
    "authorized count must derive from the hash-gated sequence"
  );
  assert.doesNotMatch(source, /49 -> 50 -> 51 -> 52 -> 53 -> 54 are all present/);
  assert.doesNotMatch(source, /49-54 are applied and enforcing/);
});

test("phase 55 matter, product, and person binding has a mandatory hosted readback verdict", () => {
  assert.match(source, /"matter_payment_binding_enforced"/);
  assert.match(source, /consumer_briefcase_items_paid_requires_server_evidence/);
  assert.match(source, /payment_product_id/);
  assert.match(source, /payment_person_id/);
  assert.match(source, /payment_matter_id/);
  assert.match(source, /expungement_packet_product_id\(\)/);
  assert.match(source, /consumer_matter_id_for_briefcase_item\(uuid\)/);
  assert.match(source, /consumer_packet_payment_authority\(uuid,uuid,text,uuid,uuid\)/);
  assert.match(source, /product_mismatch/);
  assert.match(source, /person_mismatch/);
  assert.match(source, /matter_mismatch/);
  assert.match(source, /packet_render_jobs_paid_matter_(?:insert|finalize)_trg/);
  assert.match(source, /evidence\.readback\.matterPaymentBinding/);
  assert.match(source, /phase55Status: "unproven"/);
  assert.match(
    source,
    /evidence\.phase55Status = pass \? "authenticated_readback_confirmed" : "unproven"/
  );
});

test("remote migration is pinned to the acceptance Supabase project", () => {
  assert.match(source, /const EXPECTED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia"/);
  assert.match(source, /PROJECT_REF !== EXPECTED_PROJECT_REF/);
});

test("disposable-stack evidence derives the complete phase 49-through-55 label", () => {
  assert.match(
    f1Source,
    /const authorizedPhaseLabel = action\.migrationsInApplyOrder\.map\(\(entry\) => entry\.phase\)\.join\(" -> "\)/
  );
  assert.match(f1Source, /`\$\{authorizedPhaseLabel\} applied in order/);
  assert.doesNotMatch(f1Source, /six-migration|49 -> 54|phases 49-54|phase 49-54/i);
  assert.doesNotMatch(f1Workflow, /six-migration/i);
  assert.match(f1Source, /applicationSha: ENV\("F1_APPLICATION_SHA"\)/);
  assert.match(f1Workflow, /F1_APPLICATION_SHA: \$\{\{ inputs\.application_sha \}\}/);
  assert.doesNotMatch(f1Workflow, /export F1_APPLICATION_SHA="\$APPLICATION_SHA_INPUT"/);
  assert.doesNotMatch(f1Source, /ENV\("AUTHORIZED_APPLICATION_SHA"\)/);
});
