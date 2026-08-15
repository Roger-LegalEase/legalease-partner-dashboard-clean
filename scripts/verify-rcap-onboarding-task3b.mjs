import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire, register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(rootDir, relativePath), "utf8");

const guided = await import("../src/lib/partners/onboarding/guided-substeps.ts");
const generator = await import("../src/lib/partners/onboarding/artifact-generator.ts");
const presentation = await import(
  "../src/lib/partners/onboarding/brand-page-presentation.ts"
);
const { CoBrandedPageView } = await import(
  "../src/components/partners/onboarding/CoBrandedPageView.tsx"
);
const { artifactSourceFixture } = await import(
  "./lib/rcap-onboarding-artifact-fixture.mjs"
);

let passed = 0;
function check(name, assertion) {
  assertion();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const brand = guided.getGuidedSection("brand_public_page");
const source = artifactSourceFixture();
const authoritative =
  generator.renderCoBrandedPageConfiguration(source).pagePreview;
assert.ok(authoritative);
const locallyEdited = presentation.applyBrandEditorPreview(
  authoritative,
  {
    ...source.data.brand_public_page,
    program_headline: "A current locally edited headline"
  },
  source.assets
);
const desktop = renderToStaticMarkup(
  React.createElement(CoBrandedPageView, {
    preview: locallyEdited,
    variant: "desktop",
    logoSrc: "/api/partners/onboarding/assets/synthetic-logo"
  })
);
const mobile = renderToStaticMarkup(
  React.createElement(CoBrandedPageView, {
    preview: locallyEdited,
    variant: "mobile",
    logoSrc: "/api/partners/onboarding/assets/synthetic-logo"
  })
);
const ownershipReview = renderToStaticMarkup(
  React.createElement(CoBrandedPageView, {
    preview: locallyEdited,
    variant: "desktop",
    logoSrc: "/api/internal/partners/onboarding/phase1/demo/assets/synthetic-logo",
    ownershipReview: true
  })
);

check("Brand and public page remains one canonical section", () => {
  assert.equal(
    guided.GUIDED_ONBOARDING_SECTIONS.filter(
      (section) => section.sectionKey === "brand_public_page"
    ).length,
    1
  );
});

check("all six brand tasks remain ordered and stable", () => {
  assert.deepEqual(
    brand.substeps.map((step) => step.id),
    [
      "reused-public-identity",
      "approved-public-copy",
      "participant-support-copy",
      "privacy-accessibility-links",
      "private-assets",
      "private-preview-approval"
    ]
  );
});

check("desktop and mobile render the same authoritative edited values", () => {
  for (const html of [desktop, mobile]) {
    assert.match(html, /A current locally edited headline/);
    assert.match(html, /Demo Justice Access Partner × RCAP by LegalEase/);
    assert.match(html, /Powered by Expungement\.ai/);
  }
});

check("preview editing has no publication side effect", () => {
  assertPublicationFloor(
    [
      read(
        "src/app/partner/onboarding/[sectionKey]/OnboardingSectionEditor.tsx"
      ),
      read("src/lib/partners/onboarding/brand-page-presentation.ts"),
      read("src/components/partners/onboarding/CoBrandedPageView.tsx")
    ].join("\n")
  );
});

check("saving and assets have no activation or publication write", () => {
  assertPublicationFloor(
    [
      read("src/lib/partners/onboarding/assets.ts"),
      read(
        "src/app/api/partners/onboarding/sections/[sectionKey]/route.ts"
      ),
      read("src/app/api/partners/onboarding/assets/route.ts")
    ].join("\n")
  );
});

check("partner approval remains separate from LegalEase approval", () => {
  const states = presentation.buildBrandApprovalPresentation({
    partnerReviewStatus: "approved",
    legalEaseApprovalStatus: "changes_requested",
    sourceFreshness: "current",
    invalidatedApprovals: { partner: false, legalease: false },
    workspaceStatus: "setup_in_progress",
    targetLaunchDate: null,
    launchedAt: null,
    pausedAt: null,
    closedAt: null
  });
  assert.equal(states.partnerApproval, "Approved");
  assert.equal(states.legalEaseApproval, "Changes requested");
  assert.equal(states.publication, "Private");
  assert.equal(states.activation, "Inactive");
});

check("partner approval is invalidated by a later partner edit", () => {
  const states = presentation.buildBrandApprovalPresentation({
    partnerReviewStatus: "approved",
    legalEaseApprovalStatus: "approved",
    sourceFreshness: "stale",
    invalidatedApprovals: { partner: true, legalease: true },
    workspaceStatus: "setup_in_progress",
    targetLaunchDate: null,
    launchedAt: null,
    pausedAt: null,
    closedAt: null
  });
  assert.equal(states.partnerApproval, "Changes requested");
  assert.equal(states.legalEaseApproval, "Changes requested");
  assert.match(states.approvalNote, /prior partner and LegalEase approvals/);
});

check("default participant preview contains no ownership debugger output", () => {
  assertDefaultPreview(desktop);
  assertDefaultPreview(mobile);
});

check("content ownership review is opt-in and grouped", () => {
  assert.match(ownershipReview, /Content ownership review/);
  assert.match(ownershipReview, /Partner supplied/);
  assert.match(ownershipReview, /LegalEase controlled/);
  assert.match(ownershipReview, /System derived/);
  assert.equal((ownershipReview.match(/data-content-source=/g) ?? []).length, 3);
});

check("ownership review is available only inside internal review", () => {
  const internal = read(
    "src/app/internal/partners/onboarding/[partnerSlug]/CoBrandedPagePanel.tsx"
  );
  const partnerEditor = read(
    "src/app/partner/onboarding/[sectionKey]/OnboardingSectionEditor.tsx"
  );
  const publicPage = read("src/app/p/[partnerSlug]/page.tsx");
  assert.match(internal, /ownershipReview/);
  assert.doesNotMatch(partnerEditor, /ownershipReview=/);
  assert.doesNotMatch(publicPage, /ownershipReview/);
});

check("the participant composition carries privacy and accessibility links", () => {
  assert.match(desktop, />Privacy</);
  assert.match(desktop, />Accessibility</);
  assert.match(desktop, /https:\/\/demo\.test\/privacy/);
  assert.match(desktop, /https:\/\/demo\.test\/accessibility/);
});

check("the participant composition has one primary participant action", () => {
  assert.equal(
    (desktop.match(/See if you qualify/g) ?? []).length,
    1
  );
});

check("asset controls expose progress, details, replace, remove, and recovery", () => {
  const editor = [
    read(
      "src/app/partner/onboarding/[sectionKey]/OnboardingSectionEditor.tsx"
    ),
    read("src/lib/partners/onboarding/brand-page-presentation.ts")
  ].join("\n");
  for (const required of [
    "Drop an approved file here",
    "Upload progress",
    "File type",
    "File size",
    "Dimensions",
    "Transparency",
    "Replace file",
    "Remove",
    "Download private file",
    "Upload was interrupted",
    "The file could not be previewed",
    "The private download is no longer available"
  ]) {
    assert.ok(editor.includes(required), `missing asset behavior: ${required}`);
  }
});

check("failed upload cannot display success", () => {
  const editor = read(
    "src/app/partner/onboarding/[sectionKey]/OnboardingSectionEditor.tsx"
  );
  assert.match(
    editor,
    /if \(response\.status < 200 \|\| response\.status >= 300 \|\| payload\?\.success !== true\)/
  );
  const uploadFunction = editor.match(
    /async function uploadAsset[\s\S]*?\n  async function deleteAsset/
  )?.[0];
  assert.ok(uploadFunction);
  assert.ok(
    uploadFunction.lastIndexOf("setAssetSuccess") >
      uploadFunction.indexOf("payload?.success !== true")
  );
});

check("staff and tenant asset permissions remain fail closed", () => {
  assertAssetPermissionFloor(read("src/lib/partners/onboarding/assets.ts"));
  const context = read("src/lib/partners/onboarding/auth-context.ts");
  assert.match(context, /options\.write && session\.role !== "partner_admin"/);
});

check("asset downloads remain tenant scoped and hide signed URLs", () => {
  const service = read("src/lib/partners/onboarding/assets.ts");
  assert.match(service, /\.eq\("workspace_id", portal\.workspace\.id\)/);
  const editor = read(
    "src/app/partner/onboarding/[sectionKey]/OnboardingSectionEditor.tsx"
  );
  assert.match(editor, /response\.blob\(\)/);
  assert.doesNotMatch(editor, /signedUrl|service_role/);
});

check("recovery presentations answer every required question", () => {
  for (const code of [
    "invitation_expired",
    "invitation_revoked",
    "invitation_already_used",
    "wrong_signed_in_email",
    "account_already_connected",
    "session_expired",
    "private_preview_unavailable",
    "asset_upload_failed",
    "asset_preview_failed",
    "private_asset_unavailable",
    "brand_save_failed",
    "approval_invalidated"
  ]) {
    const recovery = presentation.partnerRecoveryPresentation(code);
    for (const value of [
      recovery.heading,
      recovery.happened,
      recovery.safe,
      recovery.next,
      recovery.returnLabel,
      recovery.returnHref
    ]) {
      assert.ok(value.length > 3, `${code} has an incomplete recovery value`);
      assert.doesNotMatch(value, /token|database|storage bucket|stack trace|json/i);
    }
  }
});

check("the account setup failure renders a designed generic recovery", () => {
  const page = read("src/app/auth/set-password/page.tsx");
  assert.match(page, /PartnerRecoveryState/);
  assert.match(page, /invitation_unavailable/);
});

check("the private preview notice stays outside participant composition", () => {
  const editor = read(
    "src/app/partner/onboarding/[sectionKey]/OnboardingSectionEditor.tsx"
  );
  assert.match(
    editor,
    /This page is not published and participant intake is inactive/
  );
  assert.doesNotMatch(
    read("src/components/partners/onboarding/CoBrandedPageView.tsx"),
    /Private preview/
  );
});

check("the public eligibility gate remains untouched and fail closed", () => {
  const route = read("src/app/p/[partnerSlug]/page.tsx");
  assert.match(route, /getAuthoritativelyPublicPartnerRecord/);
  assert.match(route, /if \(!partner\) \{[\s\S]*notFound\(\)/);
});

check("Task 1 status dimensions remain independent", () => {
  const implementation = read(
    "src/lib/partners/onboarding/implementation-presentation.ts"
  );
  for (const dimension of [
    "setupInformation",
    "legalEaseReview",
    "launchReadiness",
    "publication",
    "programActivation"
  ]) {
    assert.match(implementation, new RegExp(`\\b${dimension}\\b`));
  }
});

check("Task 2 guided save, navigation, review, and staff contracts remain", () => {
  const editor = read(
    "src/app/partner/onboarding/[sectionKey]/OnboardingSectionEditor.tsx"
  );
  for (const contract of [
    'addEventListener("popstate"',
    "history.pushState",
    "history.replaceState",
    "Save and Continue",
    'aria-live="polite"',
    "OnboardingStaffSectionSummary"
  ]) {
    assert.ok(editor.includes(contract), `Task 2 contract missing: ${contract}`);
  }
});

check("Task 3A invitation and provisioning remain separate", () => {
  const provisioning = [
    read("src/lib/partners/first-admin-provisioning-presentation.ts"),
    read(
      "src/app/internal/partners/provisioning/[partnerSlug]/FirstAdminAccessPanel.tsx"
    )
  ].join("\n");
  for (const label of [
    "Administrator access",
    "Auth account",
    "Tenant membership",
    "Program configuration",
    "Publication",
    "Program activation"
  ]) {
    assert.ok(provisioning.includes(label));
  }
});

check("publication mutation is killed by the focused guard", () => {
  assert.throws(() =>
    assertPublicationFloor("publishPartnerPage(currentPartner)")
  );
});

check("ownership authorization mutation is killed by the focused guard", () => {
  assert.throws(() => assertDefaultPreview(ownershipReview));
});

check("asset permission mutation is killed by the focused guard", () => {
  const service = read("src/lib/partners/onboarding/assets.ts");
  assert.throws(() =>
    assertAssetPermissionFloor(
      service.replaceAll(
        'context.role !== "partner_admin"',
        'false && context.role !== "partner_admin"'
      )
    )
  );
});

function assertPublicationFloor(sourceText) {
  for (const forbidden of [
    "publishPartnerPage(",
    "activateProgram(",
    "markLandingPageReady(",
    "setPageActive("
  ]) {
    assert.ok(
      !sourceText.includes(forbidden),
      `publication side effect introduced: ${forbidden}`
    );
  }
}

function assertDefaultPreview(html) {
  assert.doesNotMatch(html, /data-content-source=/);
  assert.doesNotMatch(html, /data-content-ownership-review=/);
  assert.doesNotMatch(html, /Partner supplied|LegalEase controlled|System derived/);
}

function assertAssetPermissionFloor(serviceSource) {
  assert.match(
    serviceSource,
    /if \(context\.role !== "partner_admin"/,
    "asset mutation must require partner_admin"
  );
}

console.log(
  `\nRCAP Task 3B verifier passed: ${passed}/${passed} behavioral guarantees.`
);
