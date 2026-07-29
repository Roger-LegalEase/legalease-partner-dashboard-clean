import assert from "node:assert/strict";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const domain = await import("../src/lib/partners/onboarding/artifact-domain.ts");
const generator = await import("../src/lib/partners/onboarding/artifact-generator.ts");
const feature = await import("../src/lib/partners/onboarding/feature.ts");

const {
  ARTIFACT_TYPES,
  ARTIFACT_TYPE_CONSUMERS,
  ARTIFACT_TYPE_LABELS,
  GENERATABLE_ARTIFACT_TYPES,
  IMPLEMENTATION_BRIEF_GENERATOR_VERSION,
  LEGALEASE_ONLY_PROJECTION_KEYS,
  buildArtifactProvenance,
  detectArtifactDrift,
  hashArtifactSnapshot,
  isGeneratableArtifactType,
  projectArtifactSource,
  stableArtifactJson
} = domain;

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

// --- registration -----------------------------------------------------------

check("all six artifact types are registered", () => {
  assert.deepEqual(ARTIFACT_TYPES, [
    "implementation_brief",
    "operations_escalation_plan",
    "dashboard_user_reporting_matrix",
    "staff_quick_start_guide",
    "partner_launch_kit",
    "co_branded_page_configuration"
  ]);
});

check("only the implementation brief has a generator in this release", () => {
  assert.deepEqual(GENERATABLE_ARTIFACT_TYPES, ["implementation_brief"]);
  assert.equal(isGeneratableArtifactType("implementation_brief"), true);
  // Deferred to Lane B2 by an explicit scope decision, not an oversight.
  assert.equal(isGeneratableArtifactType("operations_escalation_plan"), false);
  for (const type of ARTIFACT_TYPES) {
    assert.ok(ARTIFACT_TYPE_LABELS[type], `${type} must have a human label`);
    assert.ok(
      ARTIFACT_TYPE_CONSUMERS[type].length > 0,
      `${type} must map onto the Phase 1 consumer taxonomy`
    );
  }
});

/**
 * Pinned deliberately. Changing IMPLEMENTATION_BRIEF_GENERATOR_VERSION marks
 * every approved Implementation Brief for every partner stale at once, so a
 * bump must be made consciously in the same commit as this assertion rather
 * than riding along in a refactor.
 */
check("the generator version is a pinned hand-maintained constant", () => {
  assert.equal(IMPLEMENTATION_BRIEF_GENERATOR_VERSION, "implementation_brief_v1");
  assert.match(IMPLEMENTATION_BRIEF_GENERATOR_VERSION, /^[a-z0-9_]+$/);
});

check("the launch-prep flag is default-off and depends on the Phase 1 flag", () => {
  assert.equal(feature.isRcapOnboardingLaunchPrepEnabled({}), false);
  assert.equal(
    feature.isRcapOnboardingLaunchPrepEnabled({
      RCAP_ONBOARDING_LAUNCH_PREP_ENABLED: "true"
    }),
    false,
    "it must not enable while the Phase 1 onboarding flag is off"
  );
  assert.equal(
    feature.isRcapOnboardingLaunchPrepEnabled({
      RCAP_PARTNER_ONBOARDING_ENABLED: "true",
      RCAP_ONBOARDING_LAUNCH_PREP_ENABLED: "TRUE "
    }),
    true
  );
  for (const value of ["1", "yes", "on", "", "false"]) {
    assert.equal(
      feature.isRcapOnboardingLaunchPrepEnabled({
        RCAP_PARTNER_ONBOARDING_ENABLED: "true",
        RCAP_ONBOARDING_LAUNCH_PREP_ENABLED: value
      }),
      false,
      `${JSON.stringify(value)} must not enable the flag`
    );
  }
});

// --- fixture ----------------------------------------------------------------

function baseInput() {
  return {
    workspace: {
      id: "w1",
      partnerSlug: "demo",
      aggregateVersion: 7,
      status: "ready_for_review",
      targetLaunchDate: "2026-09-15",
      commercialGateStatus: "cleared_by_paid_invoice",
      publicDisplayName: "Demo Org",
      publicHeadline: "Headline",
      publicSubheadline: "Subheadline",
      supportInstructions: null,
      showPartnerLogo: true,
      showPoweredBy: true
    },
    partnerRecord: {
      organizationName: "Demo Org",
      programName: "Demo Program",
      accessMode: "optional_code"
    },
    data: {
      organization_contacts: {
        legal_organization_name: "Demo Org, Inc.",
        public_organization_name: "Demo Org",
        organization_type: "nonprofit",
        website: "https://demo.test",
        primary_address: "1 Main Street",
        main_phone: "555-010-1234",
        public_program_name: "Demo Program",
        contacts: [
          {
            stable_row_id: "c1",
            role: "program_operator",
            name: "Dana Ruiz",
            title: "Manager",
            work_email: "dana@demo.test",
            phone: "555-010-9999"
          }
        ]
      },
      program_goals: {
        primary_goal: "Clear records",
        definition_of_success: "500 cleared",
        target_population: "Residents",
        program_model: "year_round",
        program_start_date: "2026-09-15",
        ongoing: true,
        outreach_channels: ["events"],
        current_workflow: "Walk-in clinic",
        known_barriers: ["transport"]
      },
      geography_audience_language_accessibility: {
        jurisdictions: ["MS"],
        service_area_description: "Statewide",
        primary_language: "English",
        enable_spanish: true,
        accessibility_accommodations: "On request",
        population_restrictions: "Adults only"
      },
      access_sponsorship_capacity: { participant_access_model: "optional_code" },
      support_referrals_reporting: {
        legal_services_referral_organization: "Legal Aid",
        referral_intake_method: "email",
        referral_intake_details: "referrals@demo.test",
        contested_matter_procedure: "Refer to Legal Aid"
      }
    },
    readOnlyValues: {
      sponsored_screening_scope: "500 sponsored screenings",
      sponsored_packet_scope: "200 packets"
    },
    assets: [
      {
        id: "a1",
        category: "transparent_logo",
        sha256Hex: "ab".repeat(32),
        lifecycleStatus: "active",
        reviewStatus: "approved"
      }
    ],
    sectionRevisions: { organization_contacts: 3, program_goals: 2 },
    collectionRevisions: { contacts: { c1: 1 }, plannedUsers: {}, reportRecipients: {} }
  };
}

const version = IMPLEMENTATION_BRIEF_GENERATOR_VERSION;
function drift(before, after, generatorVersion = version) {
  return detectArtifactDrift({
    storedSnapshot: before.values,
    storedGeneratorVersion: version,
    current: after,
    currentGeneratorVersion: generatorVersion
  });
}

// --- projection and hashing -------------------------------------------------

check("projection is deterministic and order independent", () => {
  const a = projectArtifactSource("implementation_brief", baseInput());
  const b = projectArtifactSource("implementation_brief", baseInput());
  assert.equal(a.hash, b.hash);
  assert.equal(
    hashArtifactSnapshot({ x: 1, y: 2 }),
    hashArtifactSnapshot({ y: 2, x: 1 }),
    "key order must not change the hash"
  );
  assert.equal(stableArtifactJson({ b: 1, a: 2 }), '{"a":2,"b":1}');
});

check("projection includes only fields this artifact type consumes", () => {
  const projection = projectArtifactSource("implementation_brief", baseInput());
  // A dashboard-plan field belongs to other artifact types, never the brief.
  assert.ok(
    !("staff_dashboard_plan.access_review_frequency" in projection.values),
    "the brief must not project fields it never renders"
  );
  assert.ok("organization_contacts.public_organization_name" in projection.values);
  assert.ok("workspace.target_launch_date" in projection.values);
});

check("provenance records the exact source revisions", () => {
  const provenance = buildArtifactProvenance(baseInput());
  assert.equal(provenance.sourceWorkspaceVersion, 7);
  assert.equal(provenance.sourceSectionRevisions.organization_contacts, 3);
  assert.equal(
    provenance.sourceAssetVersions.transparent_logo,
    `a1:${"ab".repeat(32)}`
  );
});

// --- materiality ------------------------------------------------------------

check("an identical projection is not stale", () => {
  const before = projectArtifactSource("implementation_brief", baseInput());
  const after = projectArtifactSource("implementation_brief", baseInput());
  const result = drift(before, after);
  assert.equal(result.stale, false);
  assert.deepEqual(result.changedKeys, []);
});

check("a whitespace-only re-save is non-material", () => {
  const before = projectArtifactSource("implementation_brief", baseInput());
  const input = baseInput();
  input.data.organization_contacts.legal_organization_name =
    "   Demo Org,   Inc.   ";
  const after = projectArtifactSource("implementation_brief", input);
  assert.equal(
    drift(before, after).stale,
    false,
    "normalization must absorb whitespace-only differences"
  );
});

check("an email case-only change is non-material", () => {
  const before = projectArtifactSource("implementation_brief", baseInput());
  const input = baseInput();
  input.data.support_referrals_reporting.referral_intake_details =
    "referrals@demo.test";
  const after = projectArtifactSource("implementation_brief", input);
  assert.equal(drift(before, after).stale, false);
});

/**
 * Acceptance step 5. target_launch_date has no schema-registry home: it lives
 * on partner_onboarding and is writable only by LegalEase, but it renders in
 * the partner-visible document, so it invalidates both approvals.
 */
check("a target launch date change is material and invalidates both approvals", () => {
  const before = projectArtifactSource("implementation_brief", baseInput());
  const input = baseInput();
  input.workspace.targetLaunchDate = "2026-11-02";
  const after = projectArtifactSource("implementation_brief", input);
  const result = drift(before, after);
  assert.equal(result.stale, true);
  assert.deepEqual(result.changedKeys, ["workspace.target_launch_date"]);
  assert.equal(result.invalidatesLegalEaseApproval, true);
  assert.equal(result.invalidatesPartnerApproval, true);
});

check("a jurisdiction change is material", () => {
  const before = projectArtifactSource("implementation_brief", baseInput());
  const input = baseInput();
  input.data.geography_audience_language_accessibility.jurisdictions = ["MS", "AL"];
  const after = projectArtifactSource("implementation_brief", input);
  assert.deepEqual(drift(before, after).changedKeys, [
    "geography_audience_language_accessibility.jurisdictions"
  ]);
});

check("a contested-matter procedure change is material", () => {
  const before = projectArtifactSource("implementation_brief", baseInput());
  const input = baseInput();
  input.data.support_referrals_reporting.contested_matter_procedure =
    "Refer to a different organization";
  const after = projectArtifactSource("implementation_brief", input);
  assert.deepEqual(drift(before, after).changedKeys, [
    "support_referrals_reporting.contested_matter_procedure"
  ]);
});

check("a sponsored-scope change outside the workspace aggregate is detected", () => {
  const before = projectArtifactSource("implementation_brief", baseInput());
  const input = baseInput();
  // Entitlement and package values bump no revision counter, so only a value
  // comparison can catch this.
  input.readOnlyValues.sponsored_screening_scope = "250 sponsored screenings";
  const after = projectArtifactSource("implementation_brief", input);
  assert.equal(drift(before, after).stale, true);
  assert.deepEqual(drift(before, after).changedKeys, [
    "access_sponsorship_capacity.sponsored_screening_scope"
  ]);
});

check("a logo replacement is detected by the asset identity tuple", () => {
  const before = projectArtifactSource("implementation_brief", baseInput());
  const input = baseInput();
  input.assets[0].id = "a2";
  const after = projectArtifactSource("implementation_brief", input);
  assert.deepEqual(drift(before, after).changedKeys, ["asset.transparent_logo"]);
});

check("a support contact phone change is material for the brief", () => {
  const before = projectArtifactSource("implementation_brief", baseInput());
  const input = baseInput();
  input.data.organization_contacts.contacts[0].phone = "555-010-1111";
  const after = projectArtifactSource("implementation_brief", input);
  assert.equal(drift(before, after).stale, true);
  assert.equal(drift(before, after).invalidatesPartnerApproval, true);
});

check("a LegalEase-only change spares the partner approval", () => {
  const before = projectArtifactSource("implementation_brief", baseInput());
  const input = baseInput();
  input.workspace.publicHeadline = "A new LegalEase headline";
  const after = projectArtifactSource("implementation_brief", input);
  const result = drift(before, after);
  assert.equal(result.stale, true);
  assert.equal(result.invalidatesLegalEaseApproval, true);
  assert.equal(
    result.invalidatesPartnerApproval,
    false,
    "the partner never controlled this value, so its attestation still stands"
  );
  assert.ok(LEGALEASE_ONLY_PROJECTION_KEYS.has("workspace.public_headline"));
});

check("a generator version bump is material on its own", () => {
  const projection = projectArtifactSource("implementation_brief", baseInput());
  const result = detectArtifactDrift({
    storedSnapshot: projection.values,
    storedGeneratorVersion: "implementation_brief_v0",
    current: projection,
    currentGeneratorVersion: "implementation_brief_v1"
  });
  assert.equal(result.stale, true);
  assert.deepEqual(result.changedKeys, ["generator_version"]);
  assert.equal(result.invalidatesPartnerApproval, true);
});

// --- generator --------------------------------------------------------------

check("the brief renders canonical data, not a form dump", () => {
  const document = generator.renderImplementationBrief(baseInput());
  assert.equal(document.documentTitle, "Implementation Brief");
  assert.equal(document.organizationName, "Demo Org");
  assert.equal(document.generatorVersion, IMPLEMENTATION_BRIEF_GENERATOR_VERSION);
  assert.ok(document.sections.length >= 8);

  const keys = document.sections.map((section) => section.key);
  for (const required of [
    "identity",
    "objective",
    "audience",
    "access",
    "journey",
    "support",
    "responsibilities",
    "launch"
  ]) {
    assert.ok(keys.includes(required), `missing section ${required}`);
  }

  const text = JSON.stringify(document);
  assert.ok(text.includes("Demo Org, Inc."), "renders the partner's real data");
  assert.ok(
    text.includes("leave the self-help path"),
    "preserves the existing product boundary for contested matters"
  );
  // Raw database vocabulary must not surface in a partner document.
  assert.ok(!text.includes("response_data"));
  assert.ok(!text.includes("partner_onboarding_sections"));
});

check("a missing canonical value renders a named gap, not a placeholder", () => {
  const input = baseInput();
  delete input.data.program_goals.primary_goal;
  const document = generator.renderImplementationBrief(input);
  const gaps = document.sections
    .flatMap((section) => section.blocks)
    .filter((block) => block.kind === "gap");
  assert.ok(gaps.length > 0);
  const goalGap = gaps.find((gap) => gap.fieldKey === "program_goals.primary_goal");
  assert.ok(goalGap, "the gap must name the missing field");
  assert.match(goalGap.whereToSet, /Program setup/);
  assert.equal(document.gapCount, gaps.length);
  const text = JSON.stringify(document);
  assert.ok(!text.includes("Lorem"), "no invented placeholder content");
  assert.ok(!text.includes("TBD"), "no invented placeholder content");
});

check("a missing target launch date is reported against its real location", () => {
  const input = baseInput();
  input.workspace.targetLaunchDate = null;
  const document = generator.renderImplementationBrief(input);
  const gap = document.sections
    .flatMap((section) => section.blocks)
    .find((block) => block.kind === "gap" && block.fieldKey === "workspace.target_launch_date");
  assert.ok(gap, "the launch-date gap must be reported");
  assert.match(gap.whereToSet, /Internal onboarding review/);
});

check("rendering is deterministic for identical source data", () => {
  assert.equal(
    JSON.stringify(generator.renderImplementationBrief(baseInput())),
    JSON.stringify(generator.renderImplementationBrief(baseInput())),
    "identical source must produce byte-identical output"
  );
});

console.log(`\nRCAP onboarding artifact domain: ${passed}/${passed} checks passed.`);
