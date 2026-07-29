import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");
const service = read("src/lib/partners/onboarding/prefill-service.ts");
const route = read(
  "src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/prefill/route.ts"
);
const partnerService = read("src/lib/partners/onboarding/service.ts");
const migration = read("supabase/phase-44-rcap-onboarding-prefill.sql");

for (const operation of [
  "rcap_service_prepare_onboarding_prefill",
  "rcap_service_review_onboarding_prefill",
  "rcap_service_apply_onboarding_prefill",
  "rcap_service_save_onboarding_section_with_prefill"
]) {
  assert.match(service + partnerService, new RegExp(operation));
  assert.match(migration, new RegExp(`function public\\.${operation}`));
}

assert.match(service, /review_status === "approved"/);
assert.match(service, /base_section_revision/);
assert.match(service, /base_value_hash/);
assert.match(service, /expectedWorkspaceVersion/);
assert.match(service, /\["not_started", "in_progress"\]/);
assert.match(service, /isFieldActive/);
assert.match(service, /conflictIds/);
assert.match(service, /requestId/);
assert.match(service, /p_payload_hash: hashPrefill/);
assert.match(partnerService, /portal\.prefill\.pendingCount > 0/);
assert.match(partnerService, /rcap_service_save_onboarding_section_with_prefill/);
assert.match(migration, /then 'confirmed'/);
assert.match(migration, /else 'modified'/);
assert.match(migration, /then 'rejected'/);
assert.match(migration, /v_existing\.payload_hash <> p_payload_hash/);
assert.match(migration, /Idempotency request does not match original mutation/);
assert.match(migration, /Onboarding workspace revision conflict/);
assert.match(migration, /v_section\.revision <> \(v_update->>'expectedRevision'\)::bigint/);
assert.match(migration, /v_value\.review_status <> 'approved'/);
assert.match(migration, /v_value\.partner_review_status <> 'not_applied'/);

assert.match(route, /requireInternalOnboardingContext/);
assert.match(route, /assertSameOrigin/);
assert.match(route, /readBoundedJson/);
assert.match(route, /requireRequestId/);
assert.doesNotMatch(route, /partnerId|workspaceId:\s*payload/);
assert.doesNotMatch(route, /patch|jsonPatch|generic/i);
assert.doesNotMatch(service + route, /createClient\(|SUPABASE_SERVICE_ROLE_KEY/);
assert.doesNotMatch(service, /openai|anthropic|fetch\(/i);

console.log(
  "RCAP onboarding prefill service verification passed: typed import/review/apply/confirm boundaries, CAS, conflicts, idempotency, and no external extraction."
);
