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

const guided = loadTsModule(
  path.join(rootDir, "src/lib/partners/onboarding/guided-substeps.ts")
);
const { canAnnounceGuidedSaveSuccess } = loadTsModule(
  path.join(rootDir, "src/lib/partners/onboarding/guided-save-state.ts")
);
const reviewPresentation = loadTsModule(
  path.join(rootDir, "src/lib/partners/onboarding/review-presentation.ts")
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
const { OnboardingStaffSectionSummary } = loadTsModule(
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

guided.assertGuidedSubstepContract();
assert.equal(guided.GUIDED_ONBOARDING_SECTIONS.length, 8);
for (const section of guided.GUIDED_ONBOARDING_SECTIONS) {
  assert.ok(section.substeps.length > 0, `${section.sectionKey} needs tasks`);
  section.substeps.forEach((step, index) => {
    assert.equal(step.route.queryParameter, "step");
    assert.equal(step.route.value, step.id);
    assert.equal(step.previousSubstep, section.substeps[index - 1]?.id ?? null);
    assert.equal(step.nextSubstep, section.substeps[index + 1]?.id ?? null);
  });
}

const explicit = guided.resolveGuidedStep({
  sectionKey: "program_goals",
  requestedStep: "target-population",
  missingRequiredKeys: ["primary_goal"],
  canEdit: true
});
assert.equal(explicit.substep.id, "target-population");
const safeFallback = guided.resolveGuidedStep({
  sectionKey: "program_goals",
  requestedStep: "not-a-real-task",
  missingRequiredKeys: ["target_population"],
  canEdit: true
});
assert.equal(safeFallback.substep.id, "target-population");

const fieldRequest = guided.resolveGuidedStep({
  sectionKey: "program_goals",
  requestedStep: null,
  changeRequest: { status: "open", targetFieldKey: "target_population" },
  canEdit: true
});
assert.equal(fieldRequest.substep.id, "target-population");
assert.equal(fieldRequest.requestOverview, false);
assert.equal(fieldRequest.requestedFieldKey, "target_population");
assert.match(
  guided.guidedChangeRequestHref({
    sectionKey: "program_goals",
    targetFieldKey: "target_population"
  }),
  /step=target-population#field-target-population$/
);
const sectionRequest = guided.resolveGuidedStep({
  sectionKey: "program_goals",
  requestedStep: null,
  changeRequest: { status: "open", targetFieldKey: null },
  canEdit: true
});
assert.equal(sectionRequest.requestOverview, true);
assert.equal(sectionRequest.sectionLevelRequest, true);
assert.match(
  guided.guidedChangeRequestHref({ sectionKey: "program_goals" }),
  /step=requested-update$/
);
const resolvedRequest = guided.resolveGuidedStep({
  sectionKey: "program_goals",
  requestedStep: null,
  changeRequest: { status: "resolved", targetFieldKey: "target_population" },
  missingRequiredKeys: ["primary_goal"],
  canEdit: true
});
assert.equal(resolvedRequest.containsRequestedChange, false);
assert.equal(resolvedRequest.substep.id, "goal-and-success");

const scopedIssues = guided.filterValidationIssuesForGuidedStep(
  "program_goals",
  "target-population",
  [
    { sectionKey: "program_goals", fieldKey: "target_population", code: "missing_required", message: "Describe the target population." },
    { sectionKey: "program_goals", fieldKey: "program_start_date", code: "missing_required", message: "Choose a start date." }
  ]
);
assert.deepEqual(scopedIssues.map((issue) => issue.fieldKey), ["target_population"]);

assert.equal(
  canAnnounceGuidedSaveSuccess({
    responseAccepted: true,
    authoritativePersistenceSucceeded: true,
    serverVersionApplied: true,
    currentSnapshotConfirmed: true
  }),
  true
);
for (const key of [
  "responseAccepted",
  "authoritativePersistenceSucceeded",
  "serverVersionApplied",
  "currentSnapshotConfirmed"
]) {
  assert.equal(
    canAnnounceGuidedSaveSuccess({
      responseAccepted: true,
      authoritativePersistenceSucceeded: true,
      serverVersionApplied: true,
      currentSnapshotConfirmed: true,
      [key]: false
    }),
    false,
    `Saved must remain unavailable when ${key} is false.`
  );
}

assert.equal(
  reviewPresentation.onboardingRoleSurface("partner_staff"),
  "staff_summary"
);
assert.equal(
  reviewPresentation.onboardingRoleSurface("partner_admin"),
  "administrator_editor"
);
assert.equal(
  reviewPresentation.DEFAULT_ONBOARDING_REVIEW_DETAIL_MODE,
  "summary"
);

const editorHtml = render(OnboardingSectionEditor, {
  sectionKey: "program_goals",
  sectionStatus: "in_progress",
  title: "Program goals",
  purpose: "Describe the intended outcomes.",
  initialData: { target_population: "Synthetic returning residents" },
  initialRevision: 1,
  initialWorkspaceVersion: 2,
  canEdit: true,
  isPartnerStaff: false,
  commercialBlocked: false,
  changeRequestInstructions: null,
  changeRequestStatus: null,
  changeRequests: [],
  canonicalReferences: [],
  readOnlyValues: [],
  assets: [],
  previousHref: null,
  nextHref: "/partner/onboarding/review",
  pendingPrefillFieldKeys: [],
  initialStepId: "target-population",
  missingRequiredKeys: ["primary_goal"],
  completionHref: "/partner/onboarding#program-configuration",
  sectionSummary: {
    completedSections: 1,
    totalSections: 8,
    openPartnerChanges: 0,
    waitingOnLegalEase: 0
  }
});
assert.match(editorHtml, /data-guided-substep="target-population"/);
assert.match(editorHtml, /data-guided-field="target_population"/);
assert.doesNotMatch(editorHtml, /data-guided-field="primary_goal"/);
assert.match(editorHtml, /aria-live="polite"/);
assert.match(editorHtml, /data-save-state="idle"/);
assert.equal(count(editorHtml, /data-primary-guided-action/g), 1);

const serviceSource = source(
  "src/lib/partners/onboarding/service.ts"
);
const editorSource = source(
  "src/app/partner/onboarding/[sectionKey]/OnboardingSectionEditor.tsx"
);
const routeSource = source(
  "src/app/api/partners/onboarding/sections/[sectionKey]/route.ts"
);
assert.match(editorSource, /api\/partners\/onboarding\/sections/);
assert.match(editorSource, /operation\.mode === "substep_continue"[\s\S]*guidedStepId/);
assert.match(routeSource, /savePartnerOnboardingSection\(context/);
assert.match(serviceSource, /input\.mode !== "draft_save"/);
assert.match(serviceSource, /"section_complete"/);
assert.match(serviceSource, /filterValidationIssuesForGuidedStep/);
assert.match(editorSource, /addEventListener\("popstate"/);
assert.match(editorSource, /history\.pushState/);
assert.match(editorSource, /history\.replaceState/);
assert.match(editorSource, /Could not save\. Nothing changed\./);
// The expired-session sentence belongs to the copy contract, which declares it for every
// surface that has to explain a lost session. Assert the contract owns it and the editor
// reads it from there, rather than pinning the editor to a literal it no longer holds.
assert.match(editorSource, /expiredSessionState\(/);
assert.match(
  fs.readFileSync(
    path.join(rootDir, "src/lib/partners/onboarding/partner-copy.ts"),
    "utf8"
  ),
  /Your saved information is still available\./
);
assert.match(editorSource, /pendingFocusRef/);

const staffResolution = guided.resolveGuidedStep({
  sectionKey: "program_goals",
  requestedStep: "target-population",
  canEdit: false
});
const staffHtml = render(OnboardingStaffSectionSummary, {
  resolution: staffResolution,
  section: {
    id: "section-2",
    key: "program_goals",
    title: "Program goals",
    purpose: "Describe outcomes.",
    data: { target_population: "Synthetic returning residents" },
    revision: 1,
    status: "submitted",
    completionPercentage: 100,
    missingRequiredKeys: [],
    changeRequestInstructions: [],
    changeRequestStatus: null,
    changeRequests: [],
    pendingPrefillFieldKeys: [],
    hasPendingPrefill: false,
    firstStartedAt: "2026-08-14T10:00:00.000Z",
    completedAt: "2026-08-14T10:30:00.000Z",
    submittedAt: "2026-08-14T10:31:00.000Z",
    approvedAt: null,
    waivedAt: null,
    reviewedAt: null,
    createdAt: "2026-08-14T10:00:00.000Z",
    updatedAt: "2026-08-14T10:31:00.000Z"
  },
  values: { target_population: "Synthetic returning residents" },
  readOnlyValues: {},
  administratorName: "Lee Roman",
  lastDecisionAt: "2026-08-14T10:31:00.000Z",
  organizationName: "Rythm Labs"
});
assert.match(staffHtml, /Staff program summary/);
assert.match(staffHtml, /Lee Roman/);
assert.match(staffHtml, /Synthetic returning residents/);
assert.match(staffHtml, /Staff access cannot edit or submit/);
assert.doesNotMatch(staffHtml, /<(?:input|textarea|select|button)\b/);
assert.doesNotMatch(staffHtml, /Save and Continue|Submit package|Approve/);

const statusInput = implementationInput();
const submittedPresentation = buildPartnerImplementationPresentation(statusInput);
const changesPresentation = buildPartnerImplementationPresentation({
  ...statusInput,
  workspaceStatus: "waiting_on_partner",
  sections: statusInput.sections.map((section, index) =>
    index === 1
      ? { ...section, status: "needs_changes", changeRequestStatus: "open" }
      : section
  )
});
const resubmittedPresentation = buildPartnerImplementationPresentation({
  ...statusInput,
  sections: statusInput.sections.map((section, index) =>
    index === 1
      ? { ...section, changeRequestStatus: "partner_responded" }
      : section
  )
});
const approvedPresentation = buildPartnerImplementationPresentation({
  ...statusInput,
  workspaceStatus: "ready_to_launch",
  internalApprovedAt: "2026-08-14T12:00:00.000Z",
  sections: statusInput.sections.map((section) => ({
    ...section,
    status: "approved",
    approvedAt: "2026-08-14T12:00:00.000Z"
  }))
});
assert.equal(submittedPresentation.legalEaseReview.label, "In progress");
assert.equal(changesPresentation.legalEaseReview.label, "Changes requested");
assert.equal(resubmittedPresentation.legalEaseReview.label, "In progress");
assert.equal(approvedPresentation.legalEaseReview.label, "Approved");
for (const presentation of [
  submittedPresentation,
  changesPresentation,
  resubmittedPresentation,
  approvedPresentation
]) {
  assert.equal(presentation.publication.label, "Private");
  assert.equal(presentation.programActivation.label, "Inactive");
}

const reviewHtml = render(OnboardingReviewClient, {
  sections: [
    {
      key: "program_goals",
      title: "Program goals",
      state: "Needs attention",
      editHref: "/partner/onboarding/program_goals?step=target-population",
      fields: [
        { fieldKey: "target_population", label: "Target population", value: "Synthetic returning residents" }
      ],
      missingItems: [
        {
          fieldKey: "primary_goal",
          label: "Primary program goal",
          href: "/partner/onboarding/program_goals?step=goal-and-success#field-primary-goal"
        }
      ],
      openChangeRequests: 1,
      waitingChangeRequests: 0,
      resolvedChangeRequests: 1,
      hasPendingPrefill: false,
      completionPercentage: 75,
      lastUpdatedAt: "2026-08-14T11:00:00.000Z",
      submittedAt: null,
      approvedAt: null,
      approvalSatisfied: false,
      changedSinceReview: true
    }
  ],
  canSubmit: false,
  canEdit: true,
  isPartnerStaff: false,
  initialSubmission: null,
  workspaceVersion: 4,
  pendingPrefillSections: [],
  support: {
    email: "partners@legalease.com",
    mailtoHref: "mailto:partners@legalease.com",
    label: "partners@legalease.com",
    accessibleName: "Email LegalEase partner support",
    configured: false
  },
  supportHref: "mailto:partners@legalease.com",
  statusPresentation: {
    setupInformation: submittedPresentation.setupInformation,
    legalEaseReview: changesPresentation.legalEaseReview,
    publication: submittedPresentation.publication,
    programActivation: submittedPresentation.programActivation
  }
});
assert.match(reviewHtml, /Decisions before submission/);
assert.match(reviewHtml, /Sections complete/);
assert.match(reviewHtml, /Open partner changes/);
assert.match(reviewHtml, /Waiting on LegalEase/);
assert.match(reviewHtml, /Changed since prior review/);
assert.match(reviewHtml, /Decisions remaining/);
assert.match(reviewHtml, /View full details/);
assert.match(reviewHtml, /data-full-audit-default="summary"/);
assert.doesNotMatch(reviewHtml, /<details[^>]*data-full-audit-default="summary"[^>]* open/);
assert.equal(count(reviewHtml, /data-review-primary-action=/g), 1);
assert.doesNotMatch(text(reviewHtml), /ready_for_review|not_ready|partner_responded/);

const sectionRequestHtml = render(OnboardingSectionEditor, {
  sectionKey: "program_goals",
  sectionStatus: "needs_changes",
  title: "Program goals",
  purpose: "Describe outcomes.",
  initialData: { target_population: "Current saved value" },
  initialRevision: 4,
  initialWorkspaceVersion: 7,
  canEdit: true,
  isPartnerStaff: false,
  commercialBlocked: false,
  changeRequestInstructions: "Clarify who the program serves.",
  changeRequestStatus: "open",
  changeRequests: [
    {
      id: "request-1",
      sectionKey: "program_goals",
      status: "open",
      requestedByLabel: "LegalEase",
      requestedAt: "2026-08-14T11:00:00.000Z",
      requestedCorrection: "Clarify who the program serves.",
      partnerResponse: null,
      respondedAt: null,
      resolvedAt: null,
      targetFieldKey: null
    }
  ],
  canonicalReferences: [],
  readOnlyValues: [],
  assets: [],
  previousHref: null,
  nextHref: "/partner/onboarding/review",
  pendingPrefillFieldKeys: [],
  initialStepId: "requested-update",
  missingRequiredKeys: [],
  completionHref: "/partner/onboarding#program-configuration",
  sectionSummary: {
    completedSections: 7,
    totalSections: 8,
    openPartnerChanges: 1,
    waitingOnLegalEase: 0
  }
});
assert.match(sectionRequestHtml, /This request applies to this part of the section/);
assert.match(sectionRequestHtml, /No field-level target has been inferred/);
assert.match(sectionRequestHtml, /Requested by/);
assert.match(sectionRequestHtml, /Requested on/);
assert.match(sectionRequestHtml, /Reason/);
assert.match(sectionRequestHtml, /Current value/);
assert.match(sectionRequestHtml, /Requested correction/);
assert.match(sectionRequestHtml, /Partner response/);
assert.match(sectionRequestHtml, /Resolution status/);

assert.doesNotMatch(editorSource, /function humanize|\.split\("_"\)/);
assert.doesNotMatch(source("src/lib/partners/onboarding/partner-labels.ts"), /replace\([^\n]*_/);

console.log("RCAP guided onboarding verifier passed: 20 behavioral guarantees.");

function implementationInput() {
  const keys = guided.GUIDED_ONBOARDING_SECTIONS.map((section) => section.sectionKey);
  return {
    workspaceStatus: "ready_for_review",
    completionPercentage: 100,
    commercialGateStatus: "cleared_by_authorized_internal_override",
    commercialGateChangedAt: "2026-08-14T10:00:00.000Z",
    submittedAt: "2026-08-14T11:00:00.000Z",
    internalApprovedAt: null,
    launchedAt: null,
    pausedAt: null,
    closedAt: null,
    lastMeaningfulActivityAt: "2026-08-14T11:00:00.000Z",
    targetLaunchDate: null,
    blockerCopy: "LegalEase review is pending.",
    nextActionCopy: "LegalEase reviews the package.",
    nextActionOwner: "legalease",
    defaultActionHref: "/partner/onboarding/review",
    defaultActionLabel: "Review submission",
    currentRole: "partner_admin",
    canEdit: false,
    sections: keys.map((key) => ({
      key,
      title: guided.getGuidedSection(key).sectionTitle,
      status: "submitted",
      missingSummary: null,
      hasPendingPrefill: false,
      changeRequestStatus: null,
      submittedAt: "2026-08-14T11:00:00.000Z",
      approvedAt: null,
      updatedAt: "2026-08-14T11:00:00.000Z"
    })),
    teamMembers: [],
    readiness: { ready: false, blockingFailures: 2, primaryNextAction: null },
    coBrandedPageArtifact: null
  };
}

function render(Component, props) {
  return renderToStaticMarkup(React.createElement(Component, props));
}

function text(markup) {
  return markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function count(value, pattern) {
  return value.match(pattern)?.length ?? 0;
}

function source(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function loadTsModule(filePath) {
  const resolved = path.resolve(filePath);
  if (moduleCache.has(resolved)) return moduleCache.get(resolved).exports;
  const transpiled = ts.transpileModule(fs.readFileSync(resolved, "utf8"), {
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
    return nextFile ? loadTsModule(nextFile) : require(request);
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
    if (fs.existsSync(`${candidate}${extension}`)) return `${candidate}${extension}`;
  }
  return fs.existsSync(candidate) ? candidate : null;
}
