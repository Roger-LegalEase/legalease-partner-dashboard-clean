import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();

const internalDetailPageSource = fs.readFileSync(
  path.join(
    rootDir,
    "src/app/internal/partners/onboarding/[partnerSlug]/page.tsx"
  ),
  "utf8"
);
assert.match(
  internalDetailPageSource,
  /phase1Snapshot\.workspace\s*&&\s*isRcapOnboardingPrefillEnabled\(\)/,
  "A partner without a Phase 1 workspace must still reach the workspace creation control when Prefill is enabled."
);

for (const relativePath of [
  "src/app/partner/onboarding/page.tsx",
  "src/app/partner/onboarding/[sectionKey]/page.tsx",
  "src/app/partner/onboarding/review/page.tsx",
  "src/app/partner/onboarding/artifacts/page.tsx",
  "src/app/partner/onboarding/resources/page.tsx"
]) {
  const source = fs.readFileSync(path.join(rootDir, relativePath), "utf8");
  assert.match(
    source,
    /<main[\s\S]{0,300}?className=\{?[`"]?[\s\S]{0,220}?\bbreak-words\b/,
    `${relativePath} must wrap long organization names, email addresses, and blocker copy without page overflow.`
  );
}
const supportLinkSource = fs.readFileSync(
  path.join(rootDir, "src/app/partner/onboarding/PartnerSupportLink.tsx"),
  "utf8"
);
assert.match(
  supportLinkSource,
  /className=\{`break-all /,
  "The configured support address must wrap even when the mailbox local-part is longer than the mobile viewport."
);
assert.match(
  internalDetailPageSource,
  /phase1Snapshot\.workspace\s*&&\s*isRcapOnboardingLaunchPrepEnabled\(\)/,
  "A partner without a Phase 1 workspace must still reach the workspace creation control when Launch Prep is enabled."
);

const mocks = {
  "next/link": function Link({ children, href, ...props }) {
    return React.createElement("a", { ...props, href: String(href) }, children);
  },
  "next/image": function Image(props) {
    return React.createElement("img", props);
  },
  "next/navigation": {
    useRouter: () => ({ push() {} })
  }
};

const { OnboardingDashboardCard } = loadTsModule(
  path.join(
    rootDir,
    "src/app/partner/onboarding/OnboardingDashboardCard.tsx"
  )
);
const { Phase1OnboardingHome } = loadTsModule(
  path.join(rootDir, "src/app/partner/onboarding/Phase1OnboardingHome.tsx")
);
const { buildPartnerImplementationPresentation } = loadTsModule(
  path.join(
    rootDir,
    "src/lib/partners/onboarding/implementation-presentation.ts"
  )
);
const { OnboardingSectionEditor } = loadTsModule(
  path.join(
    rootDir,
    "src/app/partner/onboarding/[sectionKey]/OnboardingSectionEditor.tsx"
  )
);
const { OnboardingReviewClient } = loadTsModule(
  path.join(
    rootDir,
    "src/app/partner/onboarding/review/OnboardingReviewClient.tsx"
  )
);

const dashboardHtml = render(
  OnboardingDashboardCard,
  {
    completionPercentage: 100,
    status: "setup_in_progress",
    statusLabel: "Setup in progress",
    blockerCopy: "No partner blocker is active.",
    nextActionCopy: "Review and submit the onboarding package.",
    nextActionOwner: "Your organization",
    targetLaunchDate: "2026-09-15",
    href: "/partner/onboarding",
    actionLabel: "Review and submit"
  }
);
assert.match(dashboardHtml, /Next-action owner/);
assert.match(dashboardHtml, /Your organization/);
assert.match(dashboardHtml, />Review and submit</);

const homePresentation = buildPartnerImplementationPresentation({
  workspaceStatus: "ready_for_review",
  completionPercentage: 100,
  commercialGateStatus: "cleared_by_authorized_internal_override",
  commercialGateChangedAt: "2026-07-28T11:00:00.000Z",
  submittedAt: "2026-07-28T12:00:00.000Z",
  internalApprovedAt: null,
  launchedAt: null,
  pausedAt: null,
  closedAt: null,
  lastMeaningfulActivityAt: "2026-07-28T12:00:00.000Z",
  targetLaunchDate: "2026-09-15",
  blockerCopy: "LegalEase review is pending.",
  nextActionCopy: "LegalEase reviews the submitted package.",
  nextActionOwner: "legalease",
  defaultActionHref: "/partner/onboarding/review",
  defaultActionLabel: "View setup",
  currentRole: "partner_staff",
  canEdit: false,
  sections: [],
  teamMembers: [
    {
      requestedRole: "partner_administrator",
      trainingStatus: "not_started",
      trainingCompletedAt: null,
      invitationStatus: "released",
      membershipStatus: "active",
      updatedAt: "2026-07-28T11:00:00.000Z"
    }
  ],
  readiness: { ready: false, blockingFailures: 1, primaryNextAction: null },
  coBrandedPageArtifact: null
});
const homeBase = {
  organizationName: "Synthetic Justice Collaborative",
  programName: "Second Chance Program",
  implementationOwner: null,
  presentation: homePresentation,
  hasPendingPrefill: false,
  commercial: {
    label: "Cleared for setup",
    blocked: false,
    detail: "Synthetic commercial clearance."
  },
  agreements: [],
  activity: [],
  // Resolved on the server in the real page. Required, not optional: a partner-facing
  // screen that renders without a support destination is the defect this prop exists to
  // prevent, so the fixture supplies it rather than the component defaulting it away.
  support: {
    email: "partners@legalease.com",
    mailtoHref: "mailto:partners@legalease.com",
    label: "partners@legalease.com",
    accessibleName: "Email LegalEase partner support at partners@legalease.com",
    configured: false
  },
  supportHref: "mailto:partners@legalease.com"
};
const staffHomeHtml = render(Phase1OnboardingHome, {
  ...homeBase,
  isPartnerStaff: true
});
assert.match(staffHomeHtml, /View only/);
assert.match(staffHomeHtml, /A partner administrator must complete any configuration change/);
assert.match(staffHomeHtml, /Setup information/);
assert.match(staffHomeHtml, /LegalEase review[\s\S]*In progress/);
assert.match(staffHomeHtml, /Program activation[\s\S]*Inactive/);

const lockedAdminHomeHtml = render(Phase1OnboardingHome, {
  ...homeBase,
  isPartnerStaff: false
});
assert.doesNotMatch(lockedAdminHomeHtml, /View only/);
assert.doesNotMatch(
  lockedAdminHomeHtml,
  /A partner administrator must complete any configuration change/
);

const reviewBase = {
  sections: [],
  canSubmit: false,
  canEdit: false,
  isPartnerStaff: false,
  workspaceVersion: 12,
  // These two are required props that the fixture never supplied, so every render below
  // threw before reaching a single assertion. That is why this verifier was never wired
  // into a gate: it could not pass. pendingPrefillSections is read unconditionally in the
  // component body, and support backs the submission-failure route to LegalEase.
  pendingPrefillSections: [],
  support: {
    email: "partners@legalease.com",
    mailtoHref: "mailto:partners@legalease.com",
    label: "partners@legalease.com",
    accessibleName: "Email LegalEase partner support at partners@legalease.com",
    configured: false
  },
  supportHref: "mailto:partners@legalease.com",
  statusPresentation: {
    setupInformation: homePresentation.setupInformation,
    legalEaseReview: homePresentation.legalEaseReview,
    publication: homePresentation.publication,
    programActivation: homePresentation.programActivation
  }
};
const submittedReviewHtml = render(OnboardingReviewClient, {
  ...reviewBase,
  initialSubmission: {
    submittedAt: "2026-07-28T12:00:00.000Z",
    statusLabel: "Awaiting LegalEase review",
    historical: false
  }
});
assert.match(submittedReviewHtml, /Submitted for LegalEase review/);
assert.match(submittedReviewHtml, /Return to implementation center/);
assert.match(submittedReviewHtml, /Decision summary/);
assert.match(submittedReviewHtml, /View full details/);
assert.doesNotMatch(submittedReviewHtml, />Submit for LegalEase review</);
assert.doesNotMatch(
  submittedReviewHtml,
  /A partner administrator must submit this package/
);

const historicalReviewHtml = render(OnboardingReviewClient, {
  ...reviewBase,
  initialSubmission: {
    submittedAt: "2026-07-28T12:00:00.000Z",
    statusLabel: "Live",
    historical: true
  }
});
assert.match(historicalReviewHtml, /program setup history/);
assert.doesNotMatch(historicalReviewHtml, /awaiting LegalEase review/);

const staffReviewHtml = render(OnboardingReviewClient, {
  ...reviewBase,
  isPartnerStaff: true,
  initialSubmission: null
});
assert.match(staffReviewHtml, /read-only summary/);
assert.match(staffReviewHtml, /A partner administrator manages changes and submission/);
assert.doesNotMatch(staffReviewHtml, />Submit for LegalEase review</);

const editorBase = {
  sectionKey: "program_goals",
  sectionStatus: "in_progress",
  title: "Program goals",
  purpose: "Describe the intended program outcomes.",
  initialData: {},
  initialRevision: 1,
  initialWorkspaceVersion: 3,
  commercialBlocked: false,
  changeRequestInstructions: null,
  changeRequestStatus: null,
  canonicalReferences: [],
  readOnlyValues: [],
  assets: [],
  previousHref: "/partner/onboarding/organization_contacts",
  nextHref:
    "/partner/onboarding/geography_audience_language_accessibility",
  // Also required and also never supplied — the editor reads it while deciding which
  // fields still need partner confirmation.
  pendingPrefillFieldKeys: [],
  changeRequests: [],
  initialStepId: "goal-and-success",
  missingRequiredKeys: [],
  completionHref: "/partner/onboarding#program-configuration",
  sectionSummary: {
    completedSections: 0,
    totalSections: 8,
    openPartnerChanges: 0,
    waitingOnLegalEase: 0
  }
};
const staffEditorHtml = render(OnboardingSectionEditor, {
  ...editorBase,
  canEdit: false,
  isPartnerStaff: true
});
assert.match(staffEditorHtml, /Program goal and definition of success/);
assert.match(staffEditorHtml, /Editing is currently locked/);
assert.doesNotMatch(staffEditorHtml, />Save and Continue<\/button>/);

const lockedAdminEditorHtml = render(OnboardingSectionEditor, {
  ...editorBase,
  canEdit: false,
  isPartnerStaff: false
});
assert.match(lockedAdminEditorHtml, /Editing locked/);
assert.doesNotMatch(lockedAdminEditorHtml, /View only/);
assert.doesNotMatch(lockedAdminEditorHtml, />Save and Continue<\/button>/);

const approvedAdminEditorHtml = render(OnboardingSectionEditor, {
  ...editorBase,
  sectionStatus: "approved",
  canEdit: false,
  isPartnerStaff: false
});
assert.match(approvedAdminEditorHtml, />Approved</);
assert.doesNotMatch(approvedAdminEditorHtml, /Editing locked/);

const commerciallyBlockedEditorHtml = render(OnboardingSectionEditor, {
  ...editorBase,
  canEdit: false,
  isPartnerStaff: false,
  commercialBlocked: true
});
assert.match(
  commerciallyBlockedEditorHtml,
  /Editing opens once your program terms are confirmed/
);
assert.doesNotMatch(commerciallyBlockedEditorHtml, /View-only section/);

console.log("RCAP partner onboarding UI verifier passed.");

function render(Component, props) {
  return renderToStaticMarkup(React.createElement(Component, props));
}

function loadTsModule(filePath) {
  const resolved = path.resolve(filePath);
  if (moduleCache.has(resolved)) return moduleCache.get(resolved).exports;

  const source = fs.readFileSync(resolved, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2022
    },
    fileName: resolved
  });
  const mod = new Module(resolved);
  moduleCache.set(resolved, mod);
  mod.filename = resolved;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  mod.require = (request) => {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) {
      return mocks[request];
    }
    const nextFile = resolveTsRequest(request, path.dirname(resolved));
    return nextFile
      ? loadTsModule(nextFile)
      : require(request);
  };
  mod._compile(transpiled.outputText, mod.filename);
  return mod.exports;
}

function resolveTsRequest(request, basedir) {
  if (request.startsWith("@/")) {
    return resolveExisting(path.join(rootDir, "src", request.slice(2)));
  }
  if (request.startsWith(".")) {
    return resolveExisting(path.resolve(basedir, request));
  }
  return null;
}

function resolveExisting(candidate) {
  for (const extension of [".ts", ".tsx", ".js"]) {
    if (fs.existsSync(`${candidate}${extension}`)) {
      return `${candidate}${extension}`;
    }
  }
  return fs.existsSync(candidate) ? candidate : null;
}
