import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { startEphemeralPg } from "./lib/rcap-ephemeral-pg.mjs";

test("local onboarding bootstrap supplies digest and the reproposal successor", () => {
  const db = startEphemeralPg();
  const script = path.resolve("scripts/local-onboarding-db.sh");
  const connection = `host=${db.root} port=${db.port} user=postgres dbname=postgres`;
  const run = (body) => spawnSync("bash", ["-c",
    'source "$1"; URL="$2"; ' + body, "local-bootstrap-test", script, connection
  ], { encoding: "utf8", timeout: 120_000 });
  const passed = (result) => assert.equal(result.status, 0, result.stdout + result.stderr);
  try {
    // Exercise exactly the same setup functions/order as `up`, without TCP,
    // privileged cluster management, or any hosted credentials.
    const bootstrap = run("apply_shim; apply_migrations");
    passed(bootstrap);
    const phase55 = bootstrap.stdout.indexOf("phase-55-expungement-matter-payment-binding.sql");
    const successor = bootstrap.stdout.indexOf("20260822180000_rcap_prefill_reproposal.sql");
    assert.ok(phase55 >= 0 && successor > phase55);
    assert.equal(db.scalar("select extnamespace::regnamespace::text from pg_extension where extname='pgcrypto'"), "extensions");
    passed(run("verify_tenant_prerequisites"));

    // Correction-specific operations remain idempotent. Do not replay the
    // historical non-idempotent CREATE TABLE phases as a migration framework.
    passed(run("apply_shim; apply_onboarding_successor; verify_tenant_prerequisites"));

    // Reintroduce the old shim layout. Readiness must fail before repair, and
    // applying the actual shim must repair that local layout without a wrapper.
    db.sql("alter extension pgcrypto set schema public");
    const wrongSchema = run("verify_tenant_prerequisites");
    assert.notEqual(wrongSchema.status, 0);
    assert.match(wrongSchema.stderr, /pgcrypto must be in extensions/);
    passed(run("apply_shim; verify_tenant_prerequisites"));

    // Restore the exact phase-44 index posture that caused the line-494
    // collision. A phase-only environment must never pass the readiness check.
    db.sql(`drop index public.partner_onboarding_prefill_values_actionable_field_unique;
      drop index public.partner_onboarding_prefill_values_applied_field_unique;
      create unique index partner_onboarding_prefill_values_active_field_unique
      on public.partner_onboarding_prefill_values(workspace_id, section_key, field_key)
      where review_status in ('proposed','approved','applied','conflict') and superseded_at is null;`);
    const missingSuccessor = run("verify_tenant_prerequisites");
    assert.notEqual(missingSuccessor.status, 0);
    assert.match(missingSuccessor.stderr, /reproposal indexes are missing or stale/);
    passed(run("apply_onboarding_successor; verify_tenant_prerequisites"));
  } finally {
    db.stop();
  }
});
