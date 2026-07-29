// Phase 2A registry extension.
//
// The Operations and Escalation Plan named a media contact, a privacy route, a
// security route, a program pause route, a capacity escalation procedure, and an
// owner and response expectation per route. None had a schema home. This proves
// each new field is projected, consumed by the artifact types that declare it,
// rendered in a document, reachable in the onboarding portal, and that adding
// them changed no existing field's projection or hash.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "node:module";

import { artifactSourceFixture } from "./lib/rcap-onboarding-artifact-fixture.mjs";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(rootDir, relativePath), "utf8");

const schema = await import("../src/lib/partners/onboarding/schema.ts");
const domain = await import("../src/lib/partners/onboarding/artifact-domain.ts");
const generator = await import("../src/lib/partners/onboarding/artifact-generator.ts");
const validation = await import("../src/lib/partners/onboarding/validation.ts");

const {
  CONTACT_ROLES,
  LEGALEASE_CONTROLLED_PUBLIC_PAGE_CONTENT,
  ONBOARDING_SCHEMA_REGISTRY
} = schema;

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

/**
 * The fields this lane added, with the section that holds them. Capacity
 * escalation sits with the capacity plan it describes rather than in the
 * support section, because the cap and its approver already live there.
 */
const NEW_FIELDS = [
  ["support_referrals_reporting", "participant_support_response_expectation"],
  ["support_referrals_reporting", "referral_response_expectation"],
  ["support_referrals_reporting", "contested_matter_response_expectation"],
  ["support_referrals_reporting", "privacy_request_route"],
  ["support_referrals_reporting", "privacy_request_owner_contact_id"],
  ["support_referrals_reporting", "privacy_request_response_expectation"],
  ["support_referrals_reporting", "security_concern_route"],
  ["support_referrals_reporting", "security_concern_response_expectation"],
  ["support_referrals_reporting", "media_inquiry_response_expectation"],
  ["support_referrals_reporting", "program_pause_route"],
  ["support_referrals_reporting", "program_pause_authority_contact_id"],
  ["support_referrals_reporting", "program_pause_response_expectation"],
  ["access_sponsorship_capacity", "capacity_escalation_procedure"],
  ["access_sponsorship_capacity", "capacity_escalation_response_expectation"]
];

function definitionFor(sectionKey, dataKey) {
  return ONBOARDING_SCHEMA_REGISTRY.find(
    (field) =>
      field.sectionKey === sectionKey &&
      field.dataKey === dataKey &&
      !field.parentCollection
  );
}

// --- registration ------------------------------------------------------------

check("the media role is its own contact role, not an overloaded one", () => {
  assert.ok(
    CONTACT_ROLES.includes("media_contact"),
    "a press contact must be nameable"
  );
  assert.ok(
    CONTACT_ROLES.includes("communications_lead"),
    "the program-communications role must survive unchanged"
  );
  assert.equal(new Set(CONTACT_ROLES).size, CONTACT_ROLES.length);
});

check("every new field is registered and partner-editable", () => {
  for (const [sectionKey, dataKey] of NEW_FIELDS) {
    const definition = definitionFor(sectionKey, dataKey);
    assert.ok(definition, `${sectionKey}.${dataKey} must be in the registry`);
    assert.equal(
      definition.ownership,
      "partner_editable",
      `${dataKey} is an operational fact the partner owns`
    );
    assert.ok(definition.label.length > 0, `${dataKey} must carry a label`);
    assert.ok(
      definition.consumers.includes("operations_plan"),
      `${dataKey} must declare the Operations and Escalation Plan as a consumer`
    );
    // Optional with zero weight: adding these must not move any existing
    // partner's completion percentage.
    assert.equal(definition.requirement, "optional", `${dataKey} requirement`);
    assert.equal(definition.completionWeight, 0, `${dataKey} weight`);
  }
});

check("none of the new fields is LegalEase-controlled page language", () => {
  for (const [, dataKey] of NEW_FIELDS) {
    assert.ok(
      !LEGALEASE_CONTROLLED_PUBLIC_PAGE_CONTENT.includes(dataKey),
      `${dataKey} is a partner operational fact, not LegalEase page language`
    );
  }
  assert.equal(LEGALEASE_CONTROLLED_PUBLIC_PAGE_CONTENT.length, 7);
});

// --- projection --------------------------------------------------------------

check("every new field is projected into the plan's value set", () => {
  const projection = domain.projectArtifactSource(
    "operations_escalation_plan",
    artifactSourceFixture()
  );
  for (const [sectionKey, dataKey] of NEW_FIELDS) {
    const key = `${sectionKey}.${dataKey}`;
    assert.ok(key in projection.values, `${key} must be projected`);
    assert.notEqual(
      projection.values[key],
      null,
      `${key} must carry the fixture's value`
    );
  }
});

check("a new field changing makes the plan stale and invalidates both approvals", () => {
  const before = domain.projectArtifactSource(
    "operations_escalation_plan",
    artifactSourceFixture()
  );
  const input = artifactSourceFixture();
  input.data.support_referrals_reporting.privacy_request_response_expectation =
    "Five business days";
  const after = domain.projectArtifactSource("operations_escalation_plan", input);
  const drift = domain.detectArtifactDrift({
    storedSnapshot: before.values,
    storedGeneratorVersion: domain.OPERATIONS_ESCALATION_PLAN_GENERATOR_VERSION,
    current: after,
    currentGeneratorVersion: domain.OPERATIONS_ESCALATION_PLAN_GENERATOR_VERSION
  });
  assert.equal(drift.stale, true);
  assert.deepEqual(drift.changedKeys, [
    "support_referrals_reporting.privacy_request_response_expectation"
  ]);
  // The partner owns this value, so its own attestation is now false too.
  assert.equal(drift.invalidatesPartnerApproval, true);
  assert.equal(drift.invalidatesLegalEaseApproval, true);
});

/**
 * The regression that matters most: a registry addition must not silently
 * re-hash every approved Implementation Brief in the fleet.
 */
check("no existing artifact's projection or hash changed", () => {
  const input = artifactSourceFixture();
  const brief = domain.projectArtifactSource("implementation_brief", input);
  for (const [sectionKey, dataKey] of NEW_FIELDS) {
    assert.ok(
      !(`${sectionKey}.${dataKey}` in brief.values),
      `${dataKey} must not enter the Implementation Brief projection`
    );
  }

  // Blanking every new field must leave the brief's hash identical.
  const without = artifactSourceFixture();
  for (const [sectionKey, dataKey] of NEW_FIELDS) {
    delete without.data[sectionKey][dataKey];
  }
  assert.equal(
    domain.projectArtifactSource("implementation_brief", without).hash,
    brief.hash,
    "the brief's hash must not depend on fields it never renders"
  );
});

// --- rendering ---------------------------------------------------------------

check("every new field is rendered by the document that consumes it", () => {
  const rendered = JSON.stringify(
    generator.renderOperationsEscalationPlan(artifactSourceFixture())
  );
  const fixture = artifactSourceFixture();
  for (const [sectionKey, dataKey] of NEW_FIELDS) {
    const value = fixture.data[sectionKey][dataKey];
    if (typeof value !== "string" || dataKey.endsWith("_contact_id")) continue;
    assert.ok(
      rendered.includes(value.slice(0, 40)),
      `${dataKey} is registered but never reaches the plan`
    );
  }
  // A contact reference renders as the person, never as the row id.
  assert.ok(rendered.includes("Sam Okafor"), "the privacy owner must be named");
  assert.ok(rendered.includes("Priya Raman"), "the media contact must be named");
  assert.ok(
    !rendered.includes("c1000000-0000-4000-8000-000000000002"),
    "a row id must never reach a partner document"
  );
});

// --- portal reachability -----------------------------------------------------

/**
 * A registry entry with no input is a failure, not a scope boundary. The portal
 * renders fields by key, so the key appearing in the editor is what proves a
 * human can actually enter the value.
 */
check("every new field has an input in the onboarding portal", () => {
  const editor = read(
    "src/app/partner/onboarding/[sectionKey]/OnboardingSectionEditor.tsx"
  );
  for (const [, dataKey] of NEW_FIELDS) {
    assert.ok(
      editor.includes(`fieldKey="${dataKey}"`),
      `${dataKey} has no input in the onboarding portal`
    );
  }
});

check("both new contact references get a chooser derived from the registry", () => {
  const page = read("src/app/partner/onboarding/[sectionKey]/page.tsx");
  assert.ok(
    page.includes('field.dataType === "contact_reference"'),
    "the chooser list must be derived from the registry, not hand-listed"
  );
  const referenceFields = ONBOARDING_SCHEMA_REGISTRY.filter(
    (field) => field.dataType === "contact_reference" && !field.parentCollection
  ).map((field) => field.dataKey);
  assert.ok(referenceFields.includes("privacy_request_owner_contact_id"));
  assert.ok(referenceFields.includes("program_pause_authority_contact_id"));
});

// --- validation --------------------------------------------------------------

check("the new fields validate, normalize, and reject over-long input", () => {
  const result = validation.validateOnboardingSection(
    "support_referrals_reporting",
    {
      privacy_request_route: "  Privacy requests   go to the IT director.  ",
      privacy_request_response_expectation: "Ten business days",
      media_inquiry_response_expectation: "One business day"
    },
    "draft_save"
  );
  assert.equal(result.success, true, JSON.stringify(result.issues ?? []));
  assert.equal(
    result.data.privacy_request_route,
    "Privacy requests go to the IT director."
  );

  const tooLong = validation.validateOnboardingSection(
    "support_referrals_reporting",
    { media_inquiry_response_expectation: "x".repeat(501) },
    "draft_save"
  );
  assert.equal(tooLong.success, false);
});

check("a contact reference must name a contact that exists", () => {
  const result = validation.validateOnboardingSection(
    "support_referrals_reporting",
    { privacy_request_owner_contact_id: "c1000000-0000-4000-8000-0000000000ff" },
    "draft_save",
    {
      allSections: {
        organization_contacts: {
          contacts: [{ stable_row_id: "c1000000-0000-4000-8000-000000000001" }]
        }
      }
    }
  );
  assert.equal(result.success, false);
  assert.ok(
    result.issues.some(
      (issue) =>
        issue.fieldKey === "privacy_request_owner_contact_id" &&
        issue.code === "invalid_reference"
    ),
    "a dangling privacy owner reference must be rejected"
  );
});

check("the partner still cannot write a LegalEase-controlled value", () => {
  const result = validation.validateOnboardingSection(
    "support_referrals_reporting",
    { legalease_technical_support_route: "We answer instantly" },
    "draft_save"
  );
  assert.equal(result.success, false);
  assert.ok(
    result.issues.some((issue) => issue.code === "read_only_field"),
    "a system-derived value must stay read-only"
  );
});

console.log(
  `\nRCAP onboarding registry extension: ${passed}/${passed} checks passed.`
);
