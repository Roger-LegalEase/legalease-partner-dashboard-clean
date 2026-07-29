import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PARTNER_ONBOARDING_FILES } from "./rcap-scope-allowlist.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");
const migrationPath = "supabase/phase-44-rcap-onboarding-prefill.sql";
const routePath =
  "src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/prefill/route.ts";
const migration = read(migrationPath);
const route = read(routePath);
const partnerService = read("src/lib/partners/onboarding/service.ts");

for (const table of [
  "partner_onboarding_prefill_batches",
  "partner_onboarding_prefill_values"
]) {
  assert.match(
    migration,
    new RegExp(`alter table public\\.${table}\\s+enable row level security`)
  );
  assert.match(
    migration,
    new RegExp(`revoke all on table public\\.${table}[\\s\\S]*authenticated`)
  );
}

assert.match(migration, /public\.current_partner_slug\(\)/);
assert.match(migration, /po\.partner_slug = public\.current_partner_slug\(\)/);
assert.match(migration, /review_status = 'applied'/);
assert.match(
  migration,
  /create policy partner_onboarding_prefill_values_select_applied_partner/
);
assert.doesNotMatch(
  migration.slice(
    migration.indexOf(
      "create or replace view public.partner_onboarding_prefill_values_safe"
    ),
    migration.indexOf("-- 3. Bounded activity")
  ),
  /source_label|source_reference_id|confidence|reviewed_by|proposed_value/
);
assert.match(migration, /security_invoker = true/);

for (const operation of [
  "rcap_service_prepare_onboarding_prefill",
  "rcap_service_review_onboarding_prefill",
  "rcap_service_apply_onboarding_prefill",
  "rcap_service_save_onboarding_section_with_prefill"
]) {
  assert.match(
    migration,
    new RegExp(
      `revoke execute on function public\\.${operation}[\\s\\S]*from public, anon, authenticated`
    )
  );
  assert.match(
    migration,
    new RegExp(
      `grant execute on function public\\.${operation}[\\s\\S]*to service_role`
    )
  );
}
assert.doesNotMatch(migration, /security\s+definer/iu);
assert.doesNotMatch(migration, /grant\s+(insert|update|delete|all)[\s\S]*authenticated/iu);
assert.doesNotMatch(migration, /raw_(email|meeting|note|transcript|proposal)/iu);
assert.doesNotMatch(route + partnerService, /service_role|serviceRoleKey|admin client/iu);
assert.match(route, /requireInternalOnboardingContext\(partnerSlug\)/);
assert.match(partnerService, /createServerSupabaseAuthClient/);
assert.doesNotMatch(partnerService, /browser.*partner|payload.*partner_slug/iu);

for (const file of [migrationPath, routePath]) {
  assert.equal(
    PARTNER_ONBOARDING_FILES.filter((entry) => entry === file).length,
    1,
    `${file} must appear exactly once in the reviewed allowlist`
  );
}
assert.equal(
  PARTNER_ONBOARDING_FILES.some(
    (entry) => entry.includes("*") || entry.endsWith("/")
  ),
  false
);
const finalApproval = read("scripts/verify-all51-final-approval.mjs");
assert.equal(
  finalApproval.split(JSON.stringify(migrationPath)).length - 1,
  1
);

console.log(
  "RCAP onboarding prefill security/RLS verification passed: tenant-bound applied-only partner reads, provenance exclusion, service-only mutation RPCs, and explicit allowlists."
);
