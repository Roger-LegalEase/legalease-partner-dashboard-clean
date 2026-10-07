import assert from "node:assert/strict";
import { register } from "node:module";
import { artifactSourceFixture } from "./lib/rcap-onboarding-artifact-fixture.mjs";

register("./lib/ts-esm-loader.mjs", import.meta.url);
const { validateOnboardingSection } = await import("../src/lib/partners/onboarding/validation.ts");
const domain = await import("../src/lib/partners/onboarding/artifact-domain.ts");
const generator = await import("../src/lib/partners/onboarding/artifact-generator.ts");
const { evaluateLaunchReadiness } = await import("../src/lib/partners/onboarding/launch-readiness.ts");
const baselineHashes = {
  implementation_brief: "325c1529926b4de19a6acb7c81a0e1b2db9cbad8c437c0728d32b3ee2c8469a3",
  operations_escalation_plan: "549975be200c9a877e2de945c5cff07bdda7021a931e96aa1acee0e79376ff8a",
  dashboard_user_reporting_matrix: "3ea498c7d0d1fbb663aa2ff558da7d04992094d0354b84f28a7b4409aeea5e06",
  staff_quick_start_guide: "7ad51a2ad2fdf7d8e31b515818ad4458c4cef9c7bf3d4b457a11685b54a82869",
  partner_launch_kit: "5dc2355809add9374b48d02442d1a4bcfb35c24c539d9645bb89d397a09f1632",
  co_branded_page_configuration: "4908d3908f4909609a0a661c2959603710e0ebc7e6fc83848df95ead04c696f3"
};
// Captured by executing the accepted BASE_SHA checkout, not reconstructed
// from the candidate. Optional policy must not revoke legacy approvals.
for (const [type, hash] of Object.entries(baselineHashes)) {
  assert.equal(domain.projectArtifactSource(type, artifactSourceFixture()).hash, hash);
}
const key = "support_referrals_reporting";
function validSourceFixture() {
  const source = artifactSourceFixture();
  source.data[key].report_recipients.forEach((row, i) => { row.stable_row_id = `a1000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`; });
  return source;
}
function validate(source) {
  return validateOnboardingSection(key, source.data[key], "section_complete", { allSections: source.data });
}
assert.equal(validate(validSourceFixture()).success, true);
for (const mode of ["established_organization", "general_resources", "no_referrals"]) {
  const source = validSourceFixture();
  const support = source.data[key];
  support.referral_arrangement = mode;
  support.contested_matter_procedure += " Staff notify the participant and inform the internal program lead.";
  if (mode !== "established_organization") delete support.legal_services_referral_organization;
  if (mode === "no_referrals") {
    delete support.referral_intake_method;
    delete support.referral_intake_details;
    delete support.referral_response_expectation;
  }
  assert.equal(validate(source).success, true, JSON.stringify(validate(source).issues));
  assert.equal(validateOnboardingSection(key, support, "draft_save", { allSections: source.data }).data.referral_arrangement, mode);
  if (mode === "established_organization" || mode === "general_resources") {
    const missing = structuredClone(source);
    delete missing.data[key].referral_intake_details;
    assert.equal(validate(missing).success, false, "Applicable intake details are required");
  }
  const stopped = structuredClone(source);
  stopped.data[key].contested_matter_procedure = "Continue preparing documents through a contested hearing.";
  assert.equal(validate(stopped).success, false, "Every policy retains the self-help stop");
  const noOwner = structuredClone(source);
  delete noOwner.data[key].urgent_escalation_contact_id;
  assert.equal(validate(noOwner).success, false, "Internal escalation owner remains required");
  // Retained historical values must neither leak nor create missing gaps.
  if (mode !== "established_organization") support.legal_services_referral_organization = "Obsolete Provider Must Not Leak";
  if (mode === "no_referrals") {
    support.referral_intake_method = "Obsolete Intake Must Not Leak";
    support.referral_intake_details = "Obsolete Details Must Not Leak";
    support.referral_response_expectation = "Obsolete Promise Must Not Leak";
  }
  for (const render of [generator.renderImplementationBrief, generator.renderOperationsEscalationPlan, generator.renderStaffQuickStartGuide]) {
    const rendered = JSON.stringify(render(source));
    assert.equal(rendered.includes("Obsolete"), false);
    if (mode === "no_referrals") assert.ok(rendered.includes("no outside legal referrals"));
    if (mode === "general_resources") assert.ok(rendered.includes("no standing referral relationship"));
  }
  const kit = JSON.stringify(generator.renderPartnerLaunchKit(source, { targetUrl: "http://127.0.0.1:3139/p/demo-partner", qrSvg: "<svg></svg>", qrDataUrl: "data:image/png;base64,AAAA", published: false }));
  assert.equal(kit.includes("Obsolete"), false);
  if (mode !== "established_organization") assert.equal(kit.includes("our legal-services partner"), false, "Launch kit must not invent a provider");
  assert.equal(JSON.stringify(generator.renderCoBrandedPageConfiguration(source)).includes("Obsolete"), false);
  const check = evaluateLaunchReadiness({ source, artifacts: [], recorded: [] }).checks.find(c => c.key === "support_and_referral_contacts_configured");
  assert.equal(check.status, "passing");
  for (const type of ["implementation_brief", "operations_escalation_plan", "staff_quick_start_guide", "partner_launch_kit", "co_branded_page_configuration"]) {
    const previous = domain.projectArtifactSource(type, artifactSourceFixture());
    const current = domain.projectArtifactSource(type, source);
    const drift = domain.detectArtifactDrift({ storedSnapshot: previous.values, storedGeneratorVersion: domain.ARTIFACT_GENERATOR_VERSIONS[type], current, currentGeneratorVersion: domain.ARTIFACT_GENERATOR_VERSIONS[type] });
    assert.equal(drift.invalidatesLegalEaseApproval, true);
    assert.ok(drift.changedKeys.includes(`${key}.referral_arrangement`));
    if (mode !== "established_organization") assert.equal(Object.values(current.values).some(v => String(v).includes("Obsolete")), false);
  }
}
assert.equal(validateOnboardingSection(key, { referral_arrangement: "invented_policy" }).success, false);
console.log("Referral modes: legacy baseline hashes preserved, explicit policy validation, stop/owner requirements, effective outputs, readiness and approval invalidation PASS");
