// The co-branded page configuration.
//
// It must map partner data and assets correctly, accept no arbitrary URL or
// routing input, keep LegalEase-controlled language out of partner hands, carry
// B1's asymmetric invalidation exactly, and reach no publication path at all.
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

const domain = await import("../src/lib/partners/onboarding/artifact-domain.ts");
const generator = await import("../src/lib/partners/onboarding/artifact-generator.ts");
const schema = await import("../src/lib/partners/onboarding/schema.ts");
const validation = await import("../src/lib/partners/onboarding/validation.ts");

const TYPE = "co_branded_page_configuration";
const VERSION = domain.CO_BRANDED_PAGE_CONFIGURATION_GENERATOR_VERSION;

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

function previewOf(input = artifactSourceFixture()) {
  const document = generator.renderCoBrandedPageConfiguration(input);
  assert.ok(document.pagePreview, "the configuration must carry a preview model");
  return document.pagePreview;
}

function driftBetween(mutate) {
  const before = domain.projectArtifactSource(TYPE, artifactSourceFixture());
  const input = artifactSourceFixture();
  mutate(input);
  const after = domain.projectArtifactSource(TYPE, input);
  return domain.detectArtifactDrift({
    storedSnapshot: before.values,
    storedGeneratorVersion: VERSION,
    current: after,
    currentGeneratorVersion: VERSION
  });
}

// --- mapping -----------------------------------------------------------------

check("the preview is built from the partner's own fields and assets", () => {
  const preview = previewOf();
  assert.equal(preview.publicName.value, "Demo Justice Access Partner");
  assert.equal(preview.headline.value, "Clear your record, for free");
  assert.equal(
    preview.subheadline.value,
    "We help you prepare and file your own paperwork."
  );
  assert.equal(
    preview.organizationDescription.value,
    "Demo Justice Access Partner helps neighbors clear old records."
  );
  assert.equal(
    preview.serviceArea.value,
    "Statewide, with clinics in two counties."
  );
  assert.equal(preview.languageAvailability.value, "English, Spanish, Vietnamese");
  assert.equal(preview.supportEmail.value, "help@demo.test");
  assert.equal(preview.primaryActionLabel.value, "See if you qualify");
  assert.equal(
    preview.logo.assetId,
    "a1000000-0000-4000-8000-000000000001",
    "the logo must come from the transparent_logo asset"
  );
  assert.equal(preview.heroImage.assetId, "a1000000-0000-4000-8000-000000000002");
});

check("partner-provided slots are marked partner-editable", () => {
  const preview = previewOf();
  for (const field of [
    preview.organizationDescription,
    preview.serviceArea,
    preview.supportEmail,
    preview.primaryActionLabel,
    preview.headline
  ]) {
    assert.equal(
      field.ownership,
      "partner_editable",
      `${field.key} is partner content`
    );
    assert.match(field.whereToSet, /Program setup/);
  }
});

check("a LegalEase-configured slot flips to LegalEase ownership", () => {
  const input = artifactSourceFixture();
  input.workspace.publicHeadline = "A LegalEase-approved headline";
  const preview = previewOf(input);
  assert.equal(preview.headline.value, "A LegalEase-approved headline");
  assert.equal(preview.headline.ownership, "legalease_controlled");
  assert.match(preview.headline.whereToSet, /Internal onboarding review/);
});

check("all seven LegalEase-controlled categories are on the page", () => {
  const preview = previewOf();
  assert.deepEqual(
    preview.legalBlocks.map((block) => block.category).sort(),
    [...schema.LEGALEASE_CONTROLLED_PUBLIC_PAGE_CONTENT].sort(),
    "the schema list is the authority, not a second hand-written list"
  );
  for (const block of preview.legalBlocks) {
    assert.ok(block.heading.length > 0);
    assert.ok(block.body.length > 20);
  }
});

// --- missing fields and assets ----------------------------------------------

check("a removed logo names the asset and where it is uploaded", () => {
  const input = artifactSourceFixture();
  input.assets = input.assets.filter(
    (asset) => asset.category !== "transparent_logo"
  );
  const preview = previewOf(input);
  assert.equal(preview.logo.assetId, null);
  const missing = preview.missing.find(
    (item) => item.label === "Transparent logo"
  );
  assert.ok(missing, "a removed logo must be named, not silently dropped");
  assert.match(missing.whereToSet, /organizational assets/i);
});

check("a page configured without a logo does not report one as missing", () => {
  const input = artifactSourceFixture();
  input.assets = input.assets.filter(
    (asset) => asset.category !== "transparent_logo"
  );
  input.workspace.showPartnerLogo = false;
  assert.ok(
    !previewOf(input).missing.some((item) => item.label === "Transparent logo")
  );
});

check("a missing partner field is named with where it is set", () => {
  const input = artifactSourceFixture();
  delete input.data.brand_public_page.approved_organization_description;
  const preview = previewOf(input);
  assert.equal(preview.organizationDescription.value, null);
  const missing = preview.missing.find((item) =>
    /organization description/i.test(item.label)
  );
  assert.ok(missing);
  assert.match(missing.whereToSet, /Brand and public-page content/);
});

check("nothing is invented for a missing value", () => {
  const input = artifactSourceFixture();
  input.data.brand_public_page = {};
  const text = JSON.stringify(
    generator.renderCoBrandedPageConfiguration(input)
  );
  for (const placeholder of ["Lorem", "TBD", "TODO", "Sample", "placeholder"]) {
    assert.ok(!text.includes(placeholder), `invented ${placeholder}`);
  }
});

// --- invalidation asymmetry --------------------------------------------------

/**
 * The partner attested to its own facts. When one of them changes, that
 * attestation is false and LegalEase approved a document that no longer matches
 * source, so both approvals die.
 */
check("a partner-owned change invalidates both approvals", () => {
  const drift = driftBetween((input) => {
    input.data.brand_public_page.approved_organization_description =
      "A different description of this organization.";
  });
  assert.equal(drift.stale, true);
  assert.deepEqual(drift.changedKeys, [
    "brand_public_page.approved_organization_description"
  ]);
  assert.equal(drift.invalidatesLegalEaseApproval, true);
  assert.equal(drift.invalidatesPartnerApproval, true);
});

/**
 * The partner never controlled this value and never attested to it, so its
 * approval of partner-owned content still stands.
 */
check("a LegalEase-only change invalidates only the LegalEase approval", () => {
  const drift = driftBetween((input) => {
    input.workspace.supportInstructions =
      "LegalEase routes participants to screening before document preparation.";
  });
  assert.equal(drift.stale, true);
  assert.deepEqual(drift.changedKeys, ["workspace.support_instructions"]);
  assert.equal(drift.invalidatesLegalEaseApproval, true);
  assert.equal(
    drift.invalidatesPartnerApproval,
    false,
    "the partner's attestation about partner-owned content still stands"
  );
});

check("every LegalEase page value is registered as LegalEase-only", () => {
  for (const key of [
    "workspace.public_display_name",
    "workspace.public_headline",
    "workspace.public_subheadline",
    "workspace.support_instructions",
    "workspace.show_partner_logo",
    "workspace.show_powered_by",
    ...domain.LEGALEASE_PUBLIC_PAGE_PROJECTION_KEYS
  ]) {
    assert.ok(
      domain.LEGALEASE_ONLY_PROJECTION_KEYS.has(key),
      `${key} must spare the partner approval`
    );
  }
});

check("editing a LegalEase disclaimer spares the partner approval", () => {
  const projection = domain.projectArtifactSource(TYPE, artifactSourceFixture());
  const edited = {
    ...projection,
    values: {
      ...projection.values,
      "legalease_public_page.legal_disclaimers":
        "Legal disclaimer: revised platform language."
    }
  };
  const drift = domain.detectArtifactDrift({
    storedSnapshot: projection.values,
    storedGeneratorVersion: VERSION,
    current: edited,
    currentGeneratorVersion: VERSION
  });
  assert.deepEqual(drift.changedKeys, [
    "legalease_public_page.legal_disclaimers"
  ]);
  assert.equal(drift.invalidatesLegalEaseApproval, true);
  assert.equal(drift.invalidatesPartnerApproval, false);
});

check("the logo tuple change is material for the page", () => {
  const drift = driftBetween((input) => {
    input.assets[0].id = "a1000000-0000-4000-8000-0000000000aa";
  });
  assert.deepEqual(drift.changedKeys, ["asset.transparent_logo"]);
  assert.equal(drift.invalidatesPartnerApproval, true);
});

// --- partner cannot edit LegalEase language ---------------------------------

check("the partner cannot write a LegalEase page value through the portal", () => {
  for (const field of [
    "public_display_name",
    "public_headline",
    "public_subheadline",
    "support_instructions",
    "show_partner_logo",
    "show_powered_by"
  ]) {
    const result = validation.validateOnboardingSection(
      "brand_public_page",
      { [field]: "partner attempt" },
      "draft_save"
    );
    assert.equal(result.success, false, `${field} must be rejected`);
    assert.ok(
      result.issues.some((issue) => issue.code === "unknown_field"),
      `${field} is not part of the partner's section`
    );
  }
});

check("the LegalEase page action is internal-only and narrowly shaped", () => {
  const route = read(
    "src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/artifacts/route.ts"
  );
  assert.ok(route.includes('action === "configure_public_page_language"'));
  assert.ok(
    route.includes("requireInternalOnboardingContext(partnerSlug)"),
    "only an internal administrator may set LegalEase language"
  );
  const partnerRoute = read("src/app/api/partners/onboarding/artifacts/route.ts");
  assert.ok(
    !partnerRoute.includes("configure_public_page_language"),
    "no partner path may reach LegalEase-controlled language"
  );
  assert.ok(
    partnerRoute.includes('action !== "approve" && action !== "request_correction"'),
    "the partner surface stays approve-or-correct only"
  );

  const service = read("src/lib/partners/onboarding/artifact-service.ts");
  const fn = service.match(
    /export async function updateLegalEasePublicPageConfiguration[\s\S]*?\n}\n/
  )?.[0];
  assert.ok(fn, "the write must be one named function");
  // A fixed six-column shape, not a patch of whatever arrives.
  for (const column of [
    "public_display_name",
    "public_headline",
    "public_subheadline",
    "support_instructions",
    "show_partner_logo",
    "show_powered_by"
  ]) {
    assert.ok(fn.includes(`${column}:`), `${column} must be named explicitly`);
  }
  assert.ok(
    fn.includes('.eq("partner_slug", context.partnerSlug)'),
    "the row must be chosen by the authorized partner slug"
  );
  assert.ok(fn.includes("boundedText("), "every value must be length-bounded");
});

// --- bounded links, no routing input, no publication ------------------------

check("no arbitrary URL or routing input reaches the page configuration", () => {
  const source = read("src/lib/partners/onboarding/artifact-generator.ts");
  const fn = source.match(
    /export function renderCoBrandedPageConfiguration[\s\S]*?\n}\n/
  )?.[0];
  assert.ok(fn);
  for (const forbidden of ["redirect", "href", "window.location", "new URL("]) {
    assert.ok(
      !fn.includes(forbidden),
      `the configuration must not accept ${forbidden}`
    );
  }
  const preview = previewOf();
  assert.equal(
    preview.partnerPrivacyUrl.value,
    "https://demo.test/privacy",
    "only the canonical partner privacy link reaches the participant preview"
  );
  assert.equal(
    preview.accessibilityUrl.value,
    "https://demo.test/accessibility",
    "only the canonical accessibility link reaches the participant preview"
  );
  for (const field of [preview.partnerPrivacyUrl, preview.accessibilityUrl]) {
    assert.match(field.value, /^https:\/\//);
    assert.equal(field.ownership, "partner_editable");
    assert.match(field.whereToSet, /Program setup/);
  }
});

check("no publication or activation path exists in this lane", () => {
  const files = [
    "src/lib/partners/onboarding/artifact-generator.ts",
    "src/lib/partners/onboarding/artifact-service.ts",
    "src/components/partners/onboarding/CoBrandedPageView.tsx",
    "src/app/internal/partners/onboarding/[partnerSlug]/CoBrandedPagePanel.tsx",
    "src/app/internal/partners/onboarding/[partnerSlug]/LegalEasePublicPageLanguagePanel.tsx",
    "src/app/partner/onboarding/artifacts/PartnerArtifactsClient.tsx",
    "src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/artifacts/route.ts"
  ];
  for (const file of files) {
    const source = read(file);
    // Code shapes, not prose: the documents and panels say in words that
    // nothing is published, which is the point.
    for (const forbidden of [
      "publishPartnerPage",
      "markLandingPageReady",
      "setPageActive",
      "activateProgram",
      "landing_page_ready",
      "page_active",
      "partner_page_status"
    ]) {
      assert.ok(
        !source.includes(forbidden),
        `${file} must not offer ${forbidden}`
      );
    }
    // No control anywhere on these screens is labelled publish or activate.
    for (const match of source.matchAll(/>\s*([A-Z][^<>{}]{2,60}?)\s*</g)) {
      assert.ok(
        !/\b(publish|activate|go live)\b/i.test(match[1]) ||
          /not publish|does not publish|Not published|nothing is published/i.test(
            match[1]
          ),
        `${file} shows a control or label offering "${match[1].trim()}"`
      );
    }
  }

  // partner_records carries the live page state. This lane only reads it.
  const service = read("src/lib/partners/onboarding/artifact-service.ts");
  assert.ok(
    !/from\("partner_records"\)[\s\S]{0,200}\.(update|insert|upsert|delete)\(/.test(
      service
    ),
    "this lane must never write the live partner record"
  );
});

check("the co-branded area offers preparing and approving only", () => {
  const panel = read(
    "src/app/internal/partners/onboarding/[partnerSlug]/CoBrandedPagePanel.tsx"
  );
  // The prepare action is written as a ternary, so every action name the file
  // mentions is collected rather than only the direct call sites.
  const mentioned = new Set(
    [...panel.matchAll(/"([a-z_]{4,})"/g)]
      .map((match) => match[1])
      .filter((value) =>
        [
          "generate",
          "regenerate",
          "approve",
          "request_changes",
          "request_correction",
          "supersede",
          "configure_public_page_language"
        ].includes(value)
      )
  );
  assert.deepEqual(
    [...mentioned].sort(),
    ["approve", "generate", "regenerate"],
    "the co-branded page area prepares and approves, nothing else"
  );
  assert.ok(panel.includes("Not published"));
});

check("the rendered document states the publication boundary", () => {
  const document = generator.renderCoBrandedPageConfiguration(
    artifactSourceFixture()
  );
  const boundary = document.sections.find(
    (section) => section.key === "page_boundary"
  );
  assert.ok(boundary, "the document must carry the boundary in writing");
  const text = JSON.stringify(boundary);
  assert.ok(
    text.includes(
      "Nothing here publishes the page, activates the program, releases an access code"
    ),
    "the boundary must be stated in the document itself"
  );
});

// --- preview surfaces --------------------------------------------------------

check("the preview renders at desktop and at 390x844, in both surfaces", () => {
  const view = read("src/components/partners/onboarding/CoBrandedPageView.tsx");
  assert.ok(view.includes('w-[390px]'), "the mobile frame must be 390 wide");
  assert.ok(view.includes('h-[844px]'), "the mobile frame must be 844 tall");
  assert.ok(
    view.includes("ownershipReview = false"),
    "ownership review must default off"
  );
  assert.ok(
    view.includes('"data-content-ownership-review": "enabled"'),
    "the internal overlay must be opt-in"
  );
  assert.ok(
    view.includes("Powered by Expungement.ai"),
    "the participant product endorsement must be accurate"
  );
  assert.ok(
    !view.includes("LegalEase-controlled · not partner-editable"),
    "debug ownership labels must not be participant content"
  );

  const internal = read(
    "src/app/internal/partners/onboarding/[partnerSlug]/CoBrandedPagePanel.tsx"
  );
  assert.ok(internal.includes("previewVariant"));
  assert.ok(internal.includes('"desktop", "mobile"'));
  const partner = read(
    "src/app/partner/onboarding/artifacts/PartnerArtifactsClient.tsx"
  );
  assert.ok(partner.includes('variant="desktop"'), "partner desktop preview");
  assert.ok(partner.includes('variant="mobile"'), "partner mobile preview");
});

/**
 * The asymmetry has to be legible to the person deciding, not only correct in
 * the drift result, so both internal areas say which approval died.
 */
check("both internal areas say which approval the drift invalidated", () => {
  const panel = read(
    "src/app/internal/partners/onboarding/[partnerSlug]/Phase2AArtifactsPanel.tsx"
  );
  assert.ok(
    panel.includes(
      "The LegalEase approval is invalidated. The partner approval still stands."
    ),
    "a LegalEase-only change must be reported as sparing the partner"
  );
  assert.ok(
    panel.includes(
      "Both the LegalEase approval and the partner approval are invalidated."
    ),
    "a partner-owned change must be reported as killing both"
  );
  for (const file of [
    "src/app/internal/partners/onboarding/[partnerSlug]/Phase2AArtifactsPanel.tsx",
    "src/app/internal/partners/onboarding/[partnerSlug]/CoBrandedPagePanel.tsx"
  ]) {
    assert.ok(
      read(file).includes("invalidationSummary(entry.invalidatedApprovals)"),
      `${file} must render the invalidation summary`
    );
  }
  const service = read("src/lib/partners/onboarding/artifact-service.ts");
  assert.ok(
    service.includes("legalease: drift.invalidatesLegalEaseApproval") &&
      service.includes("partner: drift.invalidatesPartnerApproval"),
    "the board must carry the computed asymmetry, not re-derive it in the browser"
  );
});

check("the preview shows the real logo through a tenant-scoped route", () => {
  const internal = read(
    "src/app/internal/partners/onboarding/[partnerSlug]/CoBrandedPagePanel.tsx"
  );
  assert.ok(
    internal.includes("/api/internal/partners/onboarding/phase1/"),
    "the internal preview must use the internal asset route"
  );
  const partner = read(
    "src/app/partner/onboarding/artifacts/PartnerArtifactsClient.tsx"
  );
  assert.ok(
    partner.includes("/api/partners/onboarding/assets/"),
    "the partner preview must use the existing partner asset route"
  );
  const route = read(
    "src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/assets/[assetId]/route.ts"
  );
  assert.ok(route.includes("export async function GET"));
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    assert.ok(
      !route.includes(`export async function ${method}`),
      `the asset route must not expose ${method}`
    );
  }
  const service = read("src/lib/partners/onboarding/artifact-service.ts");
  const fn = service.match(
    /export async function loadInternalOnboardingAssetUrl[\s\S]*?\n}\n/
  )?.[0];
  assert.ok(fn);
  assert.ok(
    fn.includes('.eq("workspace_id", workspaceId)'),
    "an asset must be resolved inside the authorized workspace"
  );
  assert.ok(fn.includes("assertLaunchPrepEnabled()"));
});

console.log(
  `\nRCAP onboarding page configuration: ${passed}/${passed} checks passed.`
);
