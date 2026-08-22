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

/* ---------------------------------------- reproposal after a value has been applied */

// The lifecycle used to deadlock here: an applied row counted as the field's active
// suggestion, so nothing could be proposed for it again, and an applied row is not
// reviewable, so it could not be superseded either. Applied is history; only proposed,
// approved and conflict are anyone's to act on.
const reproposal = read(
  "supabase/migrations/20260822180000_rcap_prefill_reproposal.sql"
);
// The vocabulary lives in the domain module, which a client component may import; pulling
// it from the service would drag server-only code into the browser bundle.
const domain = read("src/lib/partners/onboarding/prefill-domain.ts");
assert.match(domain, /export const ACTIONABLE_REVIEW_STATUSES = \[\s*"proposed",\s*"approved",\s*"conflict"\s*\]/);
assert.match(domain, /export const HISTORY_REVIEW_STATUSES = \[\s*"applied",\s*"rejected",\s*"superseded"\s*\]/);
assert.match(service, /ACTIONABLE_REVIEW_STATUSES/);
assert.doesNotMatch(
  service,
  /\["proposed", "approved", "applied", "conflict"\]/,
  "an applied suggestion must no longer count as the field's active suggestion"
);
assert.match(reproposal, /partner_onboarding_prefill_values_actionable_field_unique/);
assert.match(reproposal, /partner_onboarding_prefill_values_applied_field_unique/);
assert.match(reproposal, /drop index if exists public\.partner_onboarding_prefill_values_active_field_unique/);
assert.doesNotMatch(reproposal, /drop table|drop column|truncate/i);

// The new suggestion names the applied preparation it follows, and an applied row is never
// rewritten into something else.
assert.match(reproposal, /add column if not exists supersedes_value_id uuid/);
assert.match(reproposal, /supersedes_value_id is null or supersedes_value_id <> id/);
assert.match(service, /supersedes_value_id: priorApplied\.id/);
assert.match(service, /\.eq\("review_status", "applied"\)/);
assert.doesNotMatch(
  service,
  /review_status: "proposed"[\s\S]{0,200}applied/,
  "an applied row must never be converted back into a proposal"
);

// Retiring the earlier applied row keeps it applied, with its value, hashes and timestamps.
assert.match(reproposal, /set superseded_at = now\(\)/);
assert.doesNotMatch(reproposal, /set\s+review_status\s*=\s*'superseded'/);
assert.match(reproposal, /security invoker/);
assert.match(reproposal, /set search_path = ''/);
assert.match(reproposal, /revoke execute on function public\.rcap_onboarding_prefill_supersede_prior_applied\(\)\s*\n\s*from public, anon, authenticated/);

// A partner edit made after LegalEase applied a value is the reason an operator sees.
assert.match(service, /partnerChangedSinceApplied/);
assert.match(
  service,
  /The partner changed this answer after LegalEase applied the earlier preparation\./
);

/* -------------------------------------------------- the explicit override boundary */

// The ordinary apply already refuses to write over a value the partner has changed: it
// compares the partner's current answer with the value each suggestion was raised against.
// Replacing that answer is a separate act, and these are the conditions it carries.
assert.match(service, /export async function overridePrefillConflict/);
assert.match(service, /reason\.length < 10 \|\| reason\.length > 500/);
assert.match(service, /acknowledgePartnerValueReplaced !== true/);
assert.match(service, /expectedSectionRevision/);
assert.match(service, /expectedBatchVersion/);
assert.match(service, /override_partner_value_hash: partnerValueHash/);
assert.match(service, /event_type: "prefill_conflict_override_recorded"/);
assert.match(reproposal, /prefill_conflict_override_recorded/);
assert.match(reproposal, /char_length\(override_reason\) between 10 and 500/);
// The override records a decision and re-bases the suggestion. The write to partner data
// stays with the guarded apply, which keeps its own version checks.
const overrideBody = service.slice(
  service.indexOf("export async function overridePrefillConflict"),
  service.indexOf("export async function applyOnboardingPrefill")
);
assert.doesNotMatch(
  overrideBody,
  /partner_onboarding_sections|partner_onboarding_contacts|response_data/,
  "the override must not write partner data itself"
);
assert.match(route, /action === "override_conflict"/);
assert.match(route, /acknowledgePartnerValueReplaced/);

console.log(
  "RCAP onboarding prefill service verification passed: typed import/review/apply/confirm boundaries, CAS, conflicts, idempotency, applied-suggestion reproposal lineage, the explicit override boundary, and no external extraction."
);
