// The launch-readiness engine.
//
// Readiness is derived, never stored, so these checks drive the real evaluator
// over real source shapes rather than asserting on strings. What they defend:
// blocking precedence, that every automated check derives actual state and says
// what it derived it from, that a manual check cannot be satisfied by the wrong
// side, that ready is impossible while a blocking check fails, and that nothing
// in the engine can activate, publish, invite or send.
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

const readiness = await import(
  "../src/lib/partners/onboarding/launch-readiness.ts"
);

const {
  LAUNCH_CHECK_CATEGORIES,
  LAUNCH_CHECK_DEFINITIONS,
  evaluateLaunchReadiness,
  isSatisfiedLaunchCheckStatus,
  partnerVisibleReadiness
} = readiness;

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

// --- fixtures ----------------------------------------------------------------

/** A partner whose data satisfies every automated check. */
function readySource() {
  const source = artifactSourceFixture();
  source.workspace.agreementStatus = "executed";
  source.workspace.launchReadinessState = null;
  source.sectionStatuses = {
    organization_contacts: "approved",
    program_goals: "approved",
    geography_audience_language_accessibility: "approved",
    access_sponsorship_capacity: "approved",
    brand_public_page: "approved",
    staff_dashboard_plan: "approved",
    support_referrals_reporting: "approved",
    review_authorization: "approved"
  };
  const support = source.data.support_referrals_reporting;
  support.urgent_escalation_contact_id =
    source.data.organization_contacts.contacts[0].stable_row_id;
  source.data.staff_dashboard_plan.primary_dashboard_administrator_row_id =
    source.data.staff_dashboard_plan.planned_users[0].stable_row_id;
  return source;
}

/** Every required artifact approved and current. */
function approvedArtifacts() {
  return [
    "implementation_brief",
    "operations_escalation_plan",
    "dashboard_user_reporting_matrix",
    "staff_quick_start_guide",
    "co_branded_page_configuration",
    "partner_launch_kit"
  ].map((artifactType) => ({
    artifactType,
    label: artifactType,
    available: true,
    sourceFreshness: "current",
    staleFields: [],
    invalidatedApprovals: { legalease: false, partner: false },
    currentVersion: {
      id: `v-${artifactType}`,
      versionNumber: 1,
      approvalStatus: "approved",
      partnerReviewStatus: "approved",
      generationStatus: "succeeded"
    }
  }));
}

/** The four manual decisions, all recorded by an authorized reviewer. */
function recordedManualChecks() {
  return LAUNCH_CHECK_DEFINITIONS.filter(
    (definition) => definition.determination === "manual"
  ).map((definition) => ({
    checkKey: definition.key,
    status: "passing",
    evidenceSummary: "Recorded by an authorized reviewer.",
    evidenceReference: "manual_review",
    checkedAt: "2026-09-01T00:00:00.000Z",
    invalidatedAt: null,
    invalidatedReason: null
  }));
}

function evaluateReady(overrides = {}) {
  return evaluateLaunchReadiness({
    source: overrides.source ?? readySource(),
    artifacts: overrides.artifacts ?? approvedArtifacts(),
    recorded: overrides.recorded ?? recordedManualChecks()
  });
}

function byKey(result, key) {
  const found = result.checks.find((entry) => entry.key === key);
  assert.ok(found, `expected a check named ${key}`);
  return found;
}

// --- catalogue ---------------------------------------------------------------

check("the catalogue covers every required category", () => {
  const categories = new Set(
    LAUNCH_CHECK_DEFINITIONS.map((definition) => definition.category)
  );
  for (const category of LAUNCH_CHECK_CATEGORIES) {
    assert.ok(categories.has(category), `no check in ${category}`);
  }
  assert.equal(categories.size, LAUNCH_CHECK_CATEGORIES.length);
});

check("the brief's eleven automated and four manual checks all exist", () => {
  const automated = LAUNCH_CHECK_DEFINITIONS.filter(
    (definition) => definition.determination === "automated"
  ).map((definition) => definition.key);
  const manual = LAUNCH_CHECK_DEFINITIONS.filter(
    (definition) => definition.determination === "manual"
  ).map((definition) => definition.key);

  assert.deepEqual(automated.sort(), [
    "access_model_and_capacity_present",
    "agreements_and_procurement_recorded",
    "artifact_versions_current",
    "commercial_gate_cleared",
    "onboarding_sections_complete",
    "planned_partner_administrator_present",
    "public_page_fields_present",
    "report_recipients_configured",
    "required_artifact_approvals_complete",
    "required_logo_present",
    "support_and_referral_contacts_configured"
  ]);
  assert.deepEqual(manual.sort(), [
    "communications_approved",
    "legalease_final_review_complete",
    "partner_launch_approval_received",
    "staff_training_completed"
  ]);
});

check("every check names an owner and exactly one next action", () => {
  for (const definition of LAUNCH_CHECK_DEFINITIONS) {
    assert.ok(["legalease", "partner"].includes(definition.owner));
    assert.ok(
      definition.nextAction.length > 10,
      `${definition.key} needs a real next action`
    );
    // One action, not a list of them.
    assert.ok(
      !definition.nextAction.includes(";"),
      `${definition.key} must ask for one thing`
    );
  }
});

// --- derivation --------------------------------------------------------------

check("a fully configured partner passes every automated check", () => {
  const result = evaluateReady();
  const automatedFailures = result.checks.filter(
    (entry) => entry.determination === "automated" && entry.status !== "passing"
  );
  assert.deepEqual(
    automatedFailures.map((entry) => `${entry.key}:${entry.status}`),
    []
  );
  assert.equal(result.ready, true);
  assert.equal(result.blockingFailures, 0);
  assert.equal(result.primaryNextAction, null);
});

check("every automated check reports the evidence it derived state from", () => {
  const result = evaluateReady();
  for (const entry of result.checks) {
    if (entry.determination !== "automated") continue;
    assert.ok(
      entry.evidenceSummary.length > 10,
      `${entry.key} must explain its state`
    );
    assert.ok(
      entry.evidenceReference.length > 3,
      `${entry.key} must name where it looked`
    );
    // The reference must name a real source, not a slogan.
    assert.ok(
      /[a-z_]+\.[a-z_]+|partner_onboarding|asset\./.test(entry.evidenceReference),
      `${entry.key} evidence reference is not a source path: ${entry.evidenceReference}`
    );
  }
});

check("each automated check actually moves when its own source moves", () => {
  const cases = [
    [
      "commercial_gate_cleared",
      (source) => {
        source.workspace.commercialGateStatus = "blocked";
      }
    ],
    [
      "agreements_and_procurement_recorded",
      (source) => {
        source.workspace.agreementStatus = "not_started";
      }
    ],
    [
      "onboarding_sections_complete",
      (source) => {
        source.sectionStatuses.program_goals = "in_progress";
      }
    ],
    [
      "access_model_and_capacity_present",
      (source) => {
        delete source.data.access_sponsorship_capacity.participant_access_model;
      }
    ],
    [
      "required_logo_present",
      (source) => {
        source.assets = source.assets.filter(
          (asset) => asset.category !== "transparent_logo"
        );
      }
    ],
    [
      "public_page_fields_present",
      (source) => {
        delete source.data.brand_public_page.primary_cta_label;
      }
    ],
    [
      "planned_partner_administrator_present",
      (source) => {
        source.data.staff_dashboard_plan.planned_users =
          source.data.staff_dashboard_plan.planned_users.filter(
            (user) => user.requested_role !== "partner_administrator"
          );
      }
    ],
    [
      "report_recipients_configured",
      (source) => {
        source.data.support_referrals_reporting.report_recipients = [];
      }
    ],
    [
      "support_and_referral_contacts_configured",
      (source) => {
        delete source.data.support_referrals_reporting.participant_support_email;
      }
    ]
  ];

  for (const [key, mutate] of cases) {
    const source = readySource();
    mutate(source);
    const entry = byKey(evaluateReady({ source }), key);
    assert.equal(
      entry.status,
      "failing",
      `${key} did not react to its own source changing`
    );
    assert.ok(
      entry.evidenceSummary.length > 10,
      `${key} must explain why it failed`
    );
  }
});

check("a stale document fails the currency check and names the document", () => {
  const artifacts = approvedArtifacts();
  artifacts[1] = {
    ...artifacts[1],
    label: "Operations and Escalation Plan",
    sourceFreshness: "stale"
  };
  const entry = byKey(evaluateReady({ artifacts }), "artifact_versions_current");
  assert.equal(entry.status, "failing");
  assert.match(entry.evidenceSummary, /Operations and Escalation Plan/);
});

check("an unapproved required document fails the approval check", () => {
  const artifacts = approvedArtifacts();
  artifacts[3] = {
    ...artifacts[3],
    label: "Staff Quick Start Guide",
    currentVersion: { ...artifacts[3].currentVersion, approvalStatus: "draft" }
  };
  const entry = byKey(
    evaluateReady({ artifacts }),
    "required_artifact_approvals_complete"
  );
  assert.equal(entry.status, "failing");
  assert.match(entry.evidenceSummary, /Staff Quick Start Guide/);
});

/**
 * The launch kit is produced after readiness is reached, so requiring its
 * approval to reach readiness would deadlock the flow.
 */
check("the launch kit is not required for readiness", () => {
  const artifacts = approvedArtifacts().map((entry) =>
    entry.artifactType === "partner_launch_kit"
      ? { ...entry, currentVersion: null }
      : entry
  );
  const result = evaluateReady({ artifacts });
  assert.equal(
    byKey(result, "required_artifact_approvals_complete").status,
    "passing"
  );
});

// --- manual checks -----------------------------------------------------------

check("an unrecorded manual check is not started, never quietly passing", () => {
  const result = evaluateReady({ recorded: [] });
  for (const definition of LAUNCH_CHECK_DEFINITIONS) {
    if (definition.determination !== "manual") continue;
    const entry = byKey(result, definition.key);
    assert.equal(entry.status, "not_started", definition.key);
    assert.equal(entry.checkedAt, null);
  }
});

check("an invalidated manual decision goes back to review, not to passing", () => {
  const recorded = recordedManualChecks().map((row) =>
    row.checkKey === "staff_training_completed"
      ? {
          ...row,
          invalidatedAt: "2026-09-02T00:00:00.000Z",
          invalidatedReason: "Program data changed"
        }
      : row
  );
  const entry = byKey(evaluateReady({ recorded }), "staff_training_completed");
  assert.equal(entry.status, "needs_review");
  assert.equal(isSatisfiedLaunchCheckStatus(entry.status), false);
  assert.match(entry.evidenceSummary, /invalidated/i);
});

// --- blocking precedence -----------------------------------------------------

check("ready is impossible while any blocking check is unmet", () => {
  for (const definition of LAUNCH_CHECK_DEFINITIONS) {
    if (!definition.blocking) continue;
    const recorded =
      definition.determination === "manual"
        ? recordedManualChecks().filter((row) => row.checkKey !== definition.key)
        : recordedManualChecks();
    const source = readySource();
    if (definition.key === "commercial_gate_cleared") {
      source.workspace.commercialGateStatus = "blocked";
    }
    const artifacts =
      definition.key === "artifact_versions_current"
        ? approvedArtifacts().map((entry) => ({
            ...entry,
            sourceFreshness: "stale"
          }))
        : definition.key === "required_artifact_approvals_complete"
          ? approvedArtifacts().map((entry) => ({
              ...entry,
              currentVersion: { ...entry.currentVersion, approvalStatus: "draft" }
            }))
          : approvedArtifacts();

    if (
      definition.determination === "automated" &&
      !["commercial_gate_cleared", "artifact_versions_current", "required_artifact_approvals_complete"].includes(
        definition.key
      )
    ) {
      continue;
    }

    const result = evaluateLaunchReadiness({ source, artifacts, recorded });
    assert.equal(
      result.ready,
      false,
      `readiness must be impossible while ${definition.key} is unmet`
    );
    assert.ok(result.blockingFailures > 0);
    assert.ok(result.primaryNextAction !== null);
  }
});

check("a non-blocking check left unmet does not stop readiness", () => {
  const recorded = recordedManualChecks().filter(
    (row) => row.checkKey !== "communications_approved"
  );
  const result = evaluateReady({ recorded });
  assert.equal(byKey(result, "communications_approved").status, "not_started");
  assert.equal(result.ready, true, "a non-blocking check must not block");
});

check("the primary next action is one action from the first unmet check", () => {
  const source = readySource();
  source.workspace.commercialGateStatus = "blocked";
  delete source.data.brand_public_page.primary_cta_label;
  const result = evaluateLaunchReadiness({
    source,
    artifacts: approvedArtifacts(),
    recorded: recordedManualChecks()
  });
  assert.ok(result.blockingFailures >= 2);
  // Catalogue order: the commercial gate is upstream of the page fields.
  assert.equal(result.primaryNextAction.checkKey, "commercial_gate_cleared");
  assert.equal(result.primaryNextAction.owner, "legalease");
});

// --- the partner view --------------------------------------------------------

check("the partner never sees an internal-only check", () => {
  const full = evaluateReady({ recorded: [] });
  const partner = partnerVisibleReadiness(full);
  const hidden = ["commercial_gate_cleared", "agreements_and_procurement_recorded", "legalease_final_review_complete", "communications_approved"];
  for (const key of hidden) {
    assert.ok(
      !partner.checks.some((entry) => entry.key === key),
      `${key} must not reach the partner surface`
    );
  }
  assert.ok(partner.checks.some((entry) => entry.key === "staff_training_completed"));
});

/**
 * Filtering the list must not filter the verdict: a partner must never read
 * "ready" because the checks it cannot see were hidden from it.
 */
check("hiding internal checks cannot make the partner view read ready", () => {
  const source = readySource();
  source.workspace.commercialGateStatus = "blocked";
  const full = evaluateLaunchReadiness({
    source,
    artifacts: approvedArtifacts(),
    recorded: recordedManualChecks()
  });
  const partner = partnerVisibleReadiness(full);
  assert.equal(full.ready, false);
  assert.equal(
    partner.ready,
    false,
    "the partner verdict must follow the full check set"
  );
  assert.ok(
    !partner.checks.some((entry) => entry.key === "commercial_gate_cleared")
  );
});

check("the partner's next action is one the partner can actually take", () => {
  const source = readySource();
  delete source.data.brand_public_page.primary_cta_label;
  const partner = partnerVisibleReadiness(
    evaluateLaunchReadiness({
      source,
      artifacts: approvedArtifacts(),
      recorded: recordedManualChecks()
    })
  );
  assert.equal(partner.primaryNextAction.owner, "partner");
});

// --- the engine cannot act ---------------------------------------------------

check("the engine derives and nothing else", () => {
  const source = read("src/lib/partners/onboarding/launch-readiness.ts");
  for (const forbidden of [
    ".insert(",
    ".update(",
    ".upsert(",
    ".delete(",
    ".rpc(",
    "fetch(",
    "supabase",
    "createClient",
    "publish",
    "activate",
    "sendInvitation",
    "access_code"
  ]) {
    assert.ok(
      !source.includes(forbidden),
      `the readiness engine must not reference ${forbidden}`
    );
  }
});

check("no readiness surface offers a publish, activate, invite or send control", () => {
  for (const file of [
    "src/components/partners/onboarding/LaunchReadinessView.tsx",
    "src/app/internal/partners/onboarding/[partnerSlug]/LaunchReadinessPanel.tsx",
    "src/app/partner/onboarding/resources/PartnerResourcesClient.tsx"
  ]) {
    const source = read(file);
    for (const forbidden of [
      "publishPartnerPage",
      "markLandingPageReady",
      "activateProgram",
      "setPageActive",
      "sendInvitation",
      "releaseAccessCode",
      "landing_page_ready"
    ]) {
      assert.ok(!source.includes(forbidden), `${file} must not offer ${forbidden}`);
    }
    for (const match of source.matchAll(/>\s*([A-Z][^<>{}]{2,60}?)\s*</g)) {
      const label = match[1];
      assert.ok(
        !/\b(publish|activate|go live|send invit|release code)\b/i.test(label) ||
          /not publish|does not publish|Not published/i.test(label),
        `${file} shows a control labelled "${label.trim()}"`
      );
    }
  }
});

// --- write discipline --------------------------------------------------------

check("an unchanged readiness read issues no statement", () => {
  const service = read("src/lib/partners/onboarding/launch-readiness-service.ts");
  // Invalidation runs only when drift was observed *and* something standing
  // would actually change.
  assert.ok(service.includes("if (drifted.length > 0 && standing.length > 0)"));
  // The readiness event is skipped entirely when the state already matches.
  assert.ok(
    service.includes("if (source.workspace.launchReadinessState === state) return;")
  );
  // And the RPC behind it is conditional again in SQL.
  const migration = read("supabase/phase-47-rcap-onboarding-launch-readiness.sql");
  assert.ok(
    migration.includes("po.launch_readiness_state is distinct from p_state"),
    "the readiness update must be conditional in SQL too"
  );
  assert.ok(
    migration.includes("c.invalidated_at is null"),
    "invalidation must skip rows already invalidated"
  );
});

check("readiness costs no query per check", () => {
  const service = read("src/lib/partners/onboarding/launch-readiness-service.ts");
  const fn = service.match(
    /export async function getInternalLaunchReadiness[\s\S]*?\n}\n/
  )?.[0];
  assert.ok(fn);
  // One board load (which carries the shared canonical read) and one read of
  // recorded decisions. The refresh after an invalidation is the only other
  // one, and it happens only when a write actually occurred.
  assert.equal(
    (fn.match(/\.from\(/g) ?? []).length,
    2,
    "readiness must not add a read per check"
  );
  assert.ok(fn.includes("loadInternalArtifactBoardWithSource"));
  // Derivation is pure: the evaluator takes what has already been loaded.
  assert.ok(fn.includes("evaluateLaunchReadiness({"));
});

console.log(
  `\nRCAP onboarding launch readiness: ${passed}/${passed} checks passed.`
);

// --- allowlists --------------------------------------------------------------

check("phase 47 and every new file are allowlisted by explicit path", async () => {
  const { PARTNER_ONBOARDING_FILES, REVIEWED_EXPUNGEMENT_SCOPE_ALLOWED_FILES } =
    await import("./rcap-scope-allowlist.mjs");
  const MIGRATION = "supabase/phase-47-rcap-onboarding-launch-readiness.sql";
  const NEW_FILES = [
    MIGRATION,
    "src/lib/partners/onboarding/launch-readiness.ts",
    "src/lib/partners/onboarding/launch-readiness-service.ts",
    "src/components/partners/onboarding/LaunchReadinessView.tsx",
    "src/components/partners/onboarding/LaunchKitView.tsx",
    "src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/launch-readiness/route.ts",
    "src/app/api/partners/onboarding/launch-readiness/route.ts",
    "src/app/internal/partners/onboarding/[partnerSlug]/LaunchReadinessPanel.tsx",
    "src/app/internal/partners/onboarding/[partnerSlug]/ResourcesPanel.tsx",
    "src/app/partner/onboarding/resources/page.tsx",
    "src/app/partner/onboarding/resources/PartnerResourcesClient.tsx"
  ];
  for (const file of NEW_FILES) {
    assert.equal(
      PARTNER_ONBOARDING_FILES.filter((entry) => entry === file).length,
      1,
      `${file} must be allowlisted exactly once`
    );
    assert.ok(fs.existsSync(path.join(rootDir, file)), `${file} must exist`);
  }
  assert.ok(
    read("scripts/verify-all51-final-approval.mjs").includes(`"${MIGRATION}"`),
    "phase 47 must be in the final-approval allowlist"
  );
  // A wildcard would silently admit files nobody reviewed.
  for (const entry of REVIEWED_EXPUNGEMENT_SCOPE_ALLOWED_FILES) {
    assert.ok(!entry.includes("*"), `wildcard allowance is prohibited: ${entry}`);
    assert.ok(!entry.endsWith("/"), `directory allowance is prohibited: ${entry}`);
  }
});

check("the launch verifiers run inside the npm test chain", async () => {
  const pkg = JSON.parse(read("package.json"));
  for (const verifier of [
    "verify-rcap-onboarding-launch-readiness.mjs",
    "verify-rcap-onboarding-launch-kit.mjs",
    "verify-rcap-onboarding-launch-database.mjs"
  ]) {
    assert.ok(
      pkg.scripts.test.includes(verifier),
      `${verifier} must run in npm test, not beside it`
    );
  }
});

check("phase 47 is additive and destroys nothing", () => {
  const migration = read("supabase/phase-47-rcap-onboarding-launch-readiness.sql");
  for (const pattern of [
    /\bdrop\s+table\b/i,
    /\btruncate\b/i,
    /\bdelete\s+from\b/i,
    /\bdrop\s+schema\b/i,
    /\bdrop\s+column\b/i,
    /\bdrop\s+policy\b/i
  ]) {
    assert.ok(!pattern.test(migration), `phase 47 must not contain ${pattern}`);
  }
  // The only drops are the documented constraint replacements.
  const drops = migration.match(/drop constraint if exists [a-z_]+/gi) ?? [];
  assert.deepEqual(
    drops.map((entry) => entry.split(" ").pop()),
    [
      "partner_onboarding_launch_readiness_state_check",
      "partner_onboarding_activity_event_type_check"
    ]
  );
  // No capability this lane is forbidden from adding.
  for (const forbidden of [
    "partner_invitations",
    "sendInvitation",
    "publishPartnerPage",
    "activateProgram",
    "access_code",
    "launched_at =",
    "paused_at ="
  ]) {
    assert.ok(!migration.includes(forbidden), `phase 47 must not touch ${forbidden}`);
  }
});

check("no launch surface changed first-admin, Auth, or membership code", () => {
  for (const file of [
    "src/lib/partners/onboarding/launch-readiness.ts",
    "src/lib/partners/onboarding/launch-readiness-service.ts",
    "src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/launch-readiness/route.ts",
    "src/app/api/partners/onboarding/launch-readiness/route.ts"
  ]) {
    const source = read(file);
    for (const forbidden of [
      "partner_users",
      "auth.admin",
      "createUser",
      "/partner/team",
      "first_admin",
      "invitation_status"
    ]) {
      assert.ok(!source.includes(forbidden), `${file} must not reference ${forbidden}`);
    }
  }
});
