// The three Phase 2A part-2 document generators.
//
// Each must render from the canonical snapshot only, name an explicit gap where
// a value is missing rather than inventing one, keep no machine enum or column
// name out of a partner document, and follow B1's versioning, staleness, and
// approval-invalidation rules unchanged.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "node:module";

import {
  artifactSourceFixture,
  FORBIDDEN_MACHINE_VALUES
} from "./lib/rcap-onboarding-artifact-fixture.mjs";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(rootDir, relativePath), "utf8");

const domain = await import("../src/lib/partners/onboarding/artifact-domain.ts");
const generator = await import("../src/lib/partners/onboarding/artifact-generator.ts");

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const GENERATORS = [
  [
    "operations_escalation_plan",
    generator.renderOperationsEscalationPlan,
    "Operations and Escalation Plan",
    domain.OPERATIONS_ESCALATION_PLAN_GENERATOR_VERSION
  ],
  [
    "dashboard_user_reporting_matrix",
    generator.renderDashboardUserReportingMatrix,
    "Dashboard User and Reporting Matrix",
    domain.DASHBOARD_USER_REPORTING_MATRIX_GENERATOR_VERSION
  ],
  [
    "staff_quick_start_guide",
    generator.renderStaffQuickStartGuide,
    "Staff Quick-Start Guide",
    domain.STAFF_QUICK_START_GUIDE_GENERATOR_VERSION
  ]
];

function gapsOf(document) {
  return document.sections
    .flatMap((section) => section.blocks)
    .filter((block) => block.kind === "gap");
}

// --- shared rules ------------------------------------------------------------

check("each document titles itself and carries its own generator version", () => {
  for (const [, render, title, version] of GENERATORS) {
    const document = render(artifactSourceFixture());
    assert.equal(document.documentTitle, title);
    assert.equal(document.generatorVersion, version);
    assert.equal(document.organizationName, "Demo Justice Access Partner");
    assert.ok(document.sections.length >= 4, `${title} is too thin`);
  }
});

check("rendering is deterministic for identical source data", () => {
  for (const [, render, title] of GENERATORS) {
    assert.equal(
      JSON.stringify(render(artifactSourceFixture())),
      JSON.stringify(render(artifactSourceFixture())),
      `${title} must render byte-identically from identical source`
    );
  }
});

check("no raw enum, row id, or column name reaches a partner document", () => {
  for (const [, render, title] of GENERATORS) {
    const text = JSON.stringify(render(artifactSourceFixture()));
    for (const forbidden of FORBIDDEN_MACHINE_VALUES) {
      assert.ok(
        !text.includes(forbidden),
        `${title} leaked the machine value "${forbidden}"`
      );
    }
  }
});

check("a document renders only canonical data, never a browser payload", () => {
  const source = read("src/lib/partners/onboarding/artifact-generator.ts");
  for (const forbidden of [
    "NextRequest",
    "from \"next/",
    "createClient",
    "supabase",
    "fetch(",
    "process.env"
  ]) {
    assert.ok(
      !source.includes(forbidden),
      `the generator must not reach for ${forbidden}`
    );
  }
  // Every exported renderer takes the shared canonical read and nothing else.
  for (const name of [
    "renderOperationsEscalationPlan",
    "renderDashboardUserReportingMatrix",
    "renderStaffQuickStartGuide",
    "renderCoBrandedPageConfiguration"
  ]) {
    assert.ok(
      new RegExp(
        `export function ${name}\\(\\s*input: ArtifactSourceInput\\s*\\)`
      ).test(source),
      `${name} must take only the canonical source input`
    );
  }
});

check("an empty program yields named gaps, never placeholder text", () => {
  const empty = artifactSourceFixture();
  empty.data = { organization_contacts: { contacts: [] } };
  empty.readOnlyValues = {};
  empty.workspace.targetLaunchDate = null;

  for (const [, render, title] of GENERATORS) {
    const document = render(empty);
    const gaps = gapsOf(document);
    assert.ok(gaps.length > 0, `${title} must report its missing values`);
    assert.equal(document.gapCount, gaps.length);
    for (const gap of gaps) {
      assert.ok(gap.label.length > 0, "a gap must name the field");
      assert.ok(
        /Program setup|Internal onboarding review|Organization and contacts/.test(
          gap.whereToSet
        ),
        `a gap must say where the field is set, got "${gap.whereToSet}"`
      );
    }
    const text = JSON.stringify(document);
    for (const placeholder of ["Lorem", "TBD", "TODO", "XXX", "placeholder"]) {
      assert.ok(!text.includes(placeholder), `${title} invented content`);
    }
  }
});

// --- Operations and Escalation Plan ------------------------------------------

const REQUIRED_ROUTES = [
  ["route_participant_support", "General participant support"],
  ["route_technical_support", "LegalEase technical support"],
  ["route_legal_referral", "Legal-services referral"],
  ["route_contested_matter", "Prosecutor objection and contested hearing"],
  ["route_privacy_request", "Privacy requests"],
  ["route_security_concern", "Security concerns"],
  ["route_media", "Media inquiries"],
  ["route_capacity", "Capacity escalation"],
  ["route_program_pause", "Pausing the program"]
];

check("the plan renders every route the brief names", () => {
  const document = generator.renderOperationsEscalationPlan(
    artifactSourceFixture()
  );
  const byKey = new Map(document.sections.map((section) => [section.key, section]));
  for (const [key, heading] of REQUIRED_ROUTES) {
    const section = byKey.get(key);
    assert.ok(section, `the plan is missing the ${heading} route`);
    assert.equal(section.heading, heading);
  }
});

check("every route carries an owner and a response expectation", () => {
  const document = generator.renderOperationsEscalationPlan(
    artifactSourceFixture()
  );
  const byKey = new Map(document.sections.map((section) => [section.key, section]));
  for (const [key, heading] of REQUIRED_ROUTES) {
    const terms = byKey
      .get(key)
      .blocks.filter((block) => block.kind === "definitions")
      .flatMap((block) => block.items.map((item) => item.term));
    assert.ok(terms.includes("Owner"), `${heading} has no owner`);
    assert.ok(
      terms.includes("Response expectation"),
      `${heading} has no response expectation`
    );
  }
});

check("a route with nothing recorded shows a named gap for owner and timing", () => {
  const input = artifactSourceFixture();
  delete input.data.support_referrals_reporting.privacy_request_route;
  delete input.data.support_referrals_reporting.privacy_request_owner_contact_id;
  delete input.data.support_referrals_reporting
    .privacy_request_response_expectation;

  const document = generator.renderOperationsEscalationPlan(input);
  const section = document.sections.find(
    (candidate) => candidate.key === "route_privacy_request"
  );
  const gapKeys = section.blocks
    .filter((block) => block.kind === "gap")
    .map((block) => block.fieldKey);
  assert.deepEqual(gapKeys, [
    "support_referrals_reporting.privacy_request_route",
    "support_referrals_reporting.privacy_request_owner_contact_id",
    "support_referrals_reporting.privacy_request_response_expectation"
  ]);
});

check("a missing media contact names the role and where it is added", () => {
  const input = artifactSourceFixture();
  input.data.organization_contacts.contacts =
    input.data.organization_contacts.contacts.filter(
      (contact) => contact.role !== "media_contact"
    );
  const document = generator.renderOperationsEscalationPlan(input);
  const gap = gapsOf(document).find((entry) => entry.label === "Media contact");
  assert.ok(gap, "the media route must report its missing owner");
  assert.match(gap.whereToSet, /Organization and contacts/);
});

check("the plan preserves the existing product boundary", () => {
  const text = JSON.stringify(
    generator.renderOperationsEscalationPlan(artifactSourceFixture())
  );
  assert.ok(text.includes("leave the self-help path"));
  assert.ok(text.includes("does not provide legal representation"));
});

check("the plan does not pause anything by itself", () => {
  const section = generator
    .renderOperationsEscalationPlan(artifactSourceFixture())
    .sections.find((candidate) => candidate.key === "route_program_pause");
  const text = JSON.stringify(section);
  assert.ok(text.includes("A pause is carried out by LegalEase"));
  assert.ok(text.includes("it does not pause anything by itself"));
});

// --- Dashboard User and Reporting Matrix -------------------------------------

check("the matrix lists users, roles, permissions, recipients, and cadence", () => {
  const text = JSON.stringify(
    generator.renderDashboardUserReportingMatrix(artifactSourceFixture())
  );
  for (const expected of [
    "Dana Ruiz",
    "Jordan Blake",
    "Partner administrator",
    "Program staff",
    "Manage users",
    "View reports",
    "Every quarter",
    "Monthly",
    "dana@demo.test"
  ]) {
    assert.ok(text.includes(expected), `the matrix must show "${expected}"`);
  }
});

/**
 * Three lifecycle enums share the literals `planned`, `complete` and `active`.
 * A single shared label table would mislabel them, so each is asserted against
 * the state it actually describes.
 */
check("training, invitation, and access states render as distinct plain language", () => {
  const text = JSON.stringify(
    generator.renderDashboardUserReportingMatrix(artifactSourceFixture())
  );
  assert.ok(text.includes("Planned, no invitation released"));
  assert.ok(text.includes("Planned, no dashboard access yet"));
  assert.ok(text.includes("Complete"), "a completed training must read as complete");
  assert.ok(text.includes("Scheduled"));
});

check("the matrix sends nothing, invites nobody, and alters no membership", () => {
  const matrix = read("src/lib/partners/onboarding/artifact-generator.ts");
  for (const forbidden of [
    ".insert(",
    ".update(",
    ".upsert(",
    ".delete(",
    ".rpc(",
    "sendMail",
    "sendInvitation",
    "inviteUser"
  ]) {
    assert.ok(
      !matrix.includes(forbidden),
      `the generator module must not call ${forbidden}`
    );
  }
  const service = read("src/lib/partners/onboarding/artifact-service.ts");
  assert.ok(
    !/from\("partner_onboarding_planned_users"\)[\s\S]{0,200}\.(update|insert|upsert|delete)\(/.test(
      service
    ),
    "this lane must never write to the planned-user table"
  );
  assert.ok(
    !service.includes('from("partner_users")'),
    "this lane must never touch memberships"
  );
});

check("the matrix says plainly that it grants nothing", () => {
  const text = JSON.stringify(
    generator.renderDashboardUserReportingMatrix(artifactSourceFixture())
  );
  assert.ok(text.includes("invites nobody"));
  assert.ok(text.includes("Access is released separately by LegalEase"));
});

// --- Staff Quick-Start Guide -------------------------------------------------

check("the guide renders approved referral language and support routes", () => {
  const text = JSON.stringify(
    generator.renderStaffQuickStartGuide(artifactSourceFixture())
  );
  assert.ok(text.includes("Capital Area Legal Aid"));
  assert.ok(text.includes("help@demo.test"));
  assert.ok(text.includes("is not a law firm"));
  assert.ok(text.includes("Email referral form"));
});

check("the guide lists the statements staff must avoid", () => {
  const section = generator
    .renderStaffQuickStartGuide(artifactSourceFixture())
    .sections.find((candidate) => candidate.key === "avoid");
  assert.ok(section, "the guide must carry a what-not-to-say section");
  const items = section.blocks
    .filter((block) => block.kind === "bullets")
    .flatMap((block) => block.items);
  assert.ok(items.length >= 6, "the avoid list must be substantive");
  for (const expected of [
    "Do not say a record will be cleared",
    "Do not give legal advice",
    "Do not describe this program as legal representation"
  ]) {
    assert.ok(
      items.some((item) => item.startsWith(expected)),
      `the avoid list must include "${expected}"`
    );
  }
});

/**
 * The page is not published in this lane, so the guide must not print an
 * address a staff member could hand to a participant.
 */
check("the guide prints no participant page address", () => {
  const text = JSON.stringify(
    generator.renderStaffQuickStartGuide(artifactSourceFixture())
  );
  assert.ok(
    !/https?:\/\/[^"]*\/p\//.test(text),
    "no participant page URL may appear before publication"
  );
  assert.ok(
    text.includes(
      "Confirmed by LegalEase when the co-branded page is approved for launch"
    ),
    "the guide must say the address is not settled yet"
  );
});

// --- staleness and approval rules, unchanged from B1 -------------------------

check("each document is stale only when its own generator version moves", () => {
  for (const [type, , title, version] of GENERATORS) {
    const projection = domain.projectArtifactSource(type, artifactSourceFixture());
    const same = domain.detectArtifactDrift({
      storedSnapshot: projection.values,
      storedGeneratorVersion: version,
      current: projection,
      currentGeneratorVersion: version
    });
    assert.equal(same.stale, false, `${title} must not be stale against itself`);

    const bumped = domain.detectArtifactDrift({
      storedSnapshot: projection.values,
      storedGeneratorVersion: `${version}_old`,
      current: projection,
      currentGeneratorVersion: version
    });
    assert.equal(bumped.stale, true);
    assert.deepEqual(bumped.changedKeys, ["generator_version"]);
    assert.equal(bumped.invalidatesPartnerApproval, true);
  }
});

check("a LegalEase-only value spares the partner approval in the plan too", () => {
  const before = domain.projectArtifactSource(
    "operations_escalation_plan",
    artifactSourceFixture()
  );
  const input = artifactSourceFixture();
  input.readOnlyValues.legalease_technical_support_route =
    "Partner staff contact LegalEase through a new route.";
  const after = domain.projectArtifactSource("operations_escalation_plan", input);
  const drift = domain.detectArtifactDrift({
    storedSnapshot: before.values,
    storedGeneratorVersion: domain.OPERATIONS_ESCALATION_PLAN_GENERATOR_VERSION,
    current: after,
    currentGeneratorVersion: domain.OPERATIONS_ESCALATION_PLAN_GENERATOR_VERSION
  });
  assert.deepEqual(drift.changedKeys, [
    "support_referrals_reporting.legalease_technical_support_route"
  ]);
  assert.equal(drift.invalidatesLegalEaseApproval, true);
  assert.equal(drift.invalidatesPartnerApproval, false);
});

check("a formatting-only re-save is non-material for every new document", () => {
  for (const [type, , title, version] of GENERATORS) {
    const before = domain.projectArtifactSource(type, artifactSourceFixture());
    const input = artifactSourceFixture();
    input.data.organization_contacts.public_organization_name =
      "   Demo Justice   Access Partner   ";
    const after = domain.projectArtifactSource(type, input);
    assert.equal(
      domain.detectArtifactDrift({
        storedSnapshot: before.values,
        storedGeneratorVersion: version,
        current: after,
        currentGeneratorVersion: version
      }).stale,
      false,
      `${title} must absorb whitespace-only differences`
    );
  }
});

check("one shared read still serves every generator", () => {
  const service = read("src/lib/partners/onboarding/artifact-service.ts");
  assert.equal(
    (service.match(/loadArtifactSourceInput\(/g) ?? []).length >= 1,
    true
  );
  assert.ok(
    service.includes("const ARTIFACT_RENDERERS"),
    "renderers must dispatch from one table rather than per-type queries"
  );
  // Nothing may grow per artifact type inside the board build.
  const build = service.match(/async function buildBoard[\s\S]*?\n}\n/)?.[0];
  assert.ok(build);
  assert.ok(
    !/for \(const artifactType of ARTIFACT_TYPES\)[\s\S]*?await client\n?\s*\.from\(/.test(
      build
    ),
    "the per-artifact loop must issue no query"
  );
});

console.log(
  `\nRCAP onboarding document generators: ${passed}/${passed} checks passed.`
);
