import assert from "node:assert/strict";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const domain = await import(
  "../src/lib/partners/onboarding/prefill-domain.ts"
);
const feature = await import(
  "../src/lib/partners/onboarding/feature.ts"
);

const {
  PREFILL_BATCH_STATUSES,
  PREFILL_PROHIBITED_FIELD_KEYS,
  PREFILL_REVIEW_STATUSES,
  PREFILL_SOURCE_TYPES,
  PARTNER_PREFILL_REVIEW_STATUSES,
  classifyPartnerPrefillReview,
  getPrefillEligibleFields,
  hashPrefill: unusedHash,
  isPrefillEligibleField,
  normalizePrefillValue,
  requirePrefillEligibleField,
  stablePrefillJson
} = domain;
void unusedHash;

assert.deepEqual(PREFILL_BATCH_STATUSES, [
  "draft",
  "ready_for_review",
  "approved",
  "partially_applied",
  "applied",
  "rejected",
  "superseded"
]);
assert.deepEqual(PREFILL_REVIEW_STATUSES, [
  "proposed",
  "approved",
  "rejected",
  "applied",
  "conflict",
  "superseded"
]);
assert.deepEqual(PARTNER_PREFILL_REVIEW_STATUSES, [
  "not_applied",
  "pending",
  "confirmed",
  "modified",
  "rejected"
]);
assert.deepEqual(PREFILL_SOURCE_TYPES, [
  "partner_record",
  "contact_record",
  "order_form",
  "agreement",
  "proposal",
  "meeting",
  "email",
  "kickoff",
  "manual",
  "other"
]);

const eligible = getPrefillEligibleFields(undefined, {
  includeCollections: true
});
assert.ok(eligible.length > 0);
assert.equal(
  eligible.some((field) => String(field.key) === "public_organization_name"),
  true
);
assert.equal(
  eligible.some((field) => field.sectionKey === "review_authorization"),
  false
);
assert.equal(
  eligible.some((field) =>
    PREFILL_PROHIBITED_FIELD_KEYS.has(String(field.key))
  ),
  false
);
for (const field of eligible) {
  assert.equal(field.ownership, "partner_editable");
  assert.equal(field.parentCollection, undefined);
  assert.equal(isPrefillEligibleField(field), true);
}

for (const prohibited of [
  "approver_name",
  "authorization_timestamp",
  "dashboard_users_authorized",
  "code_level_capacity",
  "screening_allocation",
  "packet_credits",
  "overage_approver_authorization",
  "contested_matter_procedure"
]) {
  assert.throws(
    () => requirePrefillEligibleField("review_authorization", prohibited),
    /eligible for prefill/i,
    `${prohibited} must be rejected`
  );
}

const normalized = normalizePrefillValue(
  "organization_contacts",
  "public_organization_name",
  "  Community   Justice Partner  ",
  {},
  {}
);
assert.equal(normalized, "Community Justice Partner");
assert.throws(
  () =>
    normalizePrefillValue(
      "organization_contacts",
      "public_organization_name",
      "x".repeat(201),
      {},
      {}
    ),
  /200 characters|invalid/i
);
assert.throws(
  () =>
    normalizePrefillValue(
      "organization_contacts",
      "arbitrary_json_patch",
      { role: "service_role" },
      {},
      {}
    ),
  /eligible for prefill/i
);

assert.equal(
  stablePrefillJson({ b: 2, a: 1 }),
  stablePrefillJson({ a: 1, b: 2 })
);
assert.equal(classifyPartnerPrefillReview("same", "same"), "confirmed");
assert.equal(classifyPartnerPrefillReview("value", "changed"), "modified");
assert.equal(classifyPartnerPrefillReview("value", ""), "rejected");
assert.equal(classifyPartnerPrefillReview(["x"], []), "rejected");

const {
  RCAP_ONBOARDING_PREFILL_FLAG,
  RCAP_PARTNER_ONBOARDING_FLAG,
  isRcapOnboardingPrefillEnabled
} = feature;
assert.equal(isRcapOnboardingPrefillEnabled({}), false);
assert.equal(
  isRcapOnboardingPrefillEnabled({
    [RCAP_ONBOARDING_PREFILL_FLAG]: "true"
  }),
  false
);
assert.equal(
  isRcapOnboardingPrefillEnabled({
    [RCAP_PARTNER_ONBOARDING_FLAG]: "true",
    [RCAP_ONBOARDING_PREFILL_FLAG]: " TRUE "
  }),
  true
);
for (const value of ["1", "yes", "on", "false", "enabled", ""]) {
  assert.equal(
    isRcapOnboardingPrefillEnabled({
      [RCAP_PARTNER_ONBOARDING_FLAG]: "true",
      [RCAP_ONBOARDING_PREFILL_FLAG]: value
    }),
    false
  );
}

console.log(
  "RCAP onboarding prefill domain verification passed: canonical registry, normalization, prohibited fields, statuses, classification, and default-off flag."
);
