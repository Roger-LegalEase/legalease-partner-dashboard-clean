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
  }
};

const { buildPartnerImplementationPresentation } = loadTsModule(
  path.join(
    rootDir,
    "src/lib/partners/onboarding/implementation-presentation.ts"
  )
);
const { Phase1OnboardingHome } = loadTsModule(
  path.join(rootDir, "src/app/partner/onboarding/Phase1OnboardingHome.tsx")
);

const SECTION_KEYS = [
  "organization_contacts",
  "program_goals",
  "geography_audience_language_accessibility",
  "access_sponsorship_capacity",
  "brand_public_page",
  "staff_dashboard_plan",
  "support_referrals_reporting",
  "review_authorization"
];

const submittedInput = {
  workspaceStatus: "ready_for_review",
  completionPercentage: 100,
  commercialGateStatus: "cleared_by_authorized_internal_override",
  commercialGateChangedAt: "2026-08-13T11:51:14.729Z",
  submittedAt: "2026-08-13T12:36:56.170Z",
  internalApprovedAt: null,
  launchedAt: null,
  pausedAt: null,
  closedAt: null,
  lastMeaningfulActivityAt: "2026-08-13T12:36:56.170Z",
  targetLaunchDate: null,
  blockerCopy: "LegalEase review is pending.",
  nextActionCopy: "LegalEase will review the submitted setup package.",
  nextActionOwner: "legalease",
  defaultActionHref: "/partner/onboarding/review",
  defaultActionLabel: "View submitted setup",
  currentRole: "partner_admin",
  canEdit: false,
  sections: SECTION_KEYS.map((key) => ({
    key,
    title: titleFor(key),
    status: "submitted",
    missingSummary: null,
    hasPendingPrefill: false,
    changeRequestStatus: null,
    submittedAt: "2026-08-13T12:36:56.170Z",
    approvedAt: null,
    updatedAt: "2026-08-13T12:36:56.170Z"
  })),
  teamMembers: [
    {
      requestedRole: "partner_administrator",
      trainingStatus: "not_started",
      trainingCompletedAt: null,
      invitationStatus: "released",
      membershipStatus: "active",
      updatedAt: "2026-08-13T11:55:00.000Z"
    }
  ],
  readiness: {
    ready: false,
    blockingFailures: 3,
    primaryNextAction: {
      label: "Complete staff training",
      owner: "partner",
      action: "Confirm the team roster and training plan."
    }
  },
  coBrandedPageArtifact: {
    available: true,
    approvalStatus: "draft",
    partnerReviewStatus: "awaiting_partner"
  }
};

const submitted = buildPartnerImplementationPresentation(submittedInput);

assert.equal(submitted.setupInformation.label, "100% complete");
assert.equal(submitted.legalEaseReview.label, "In progress");
assert.equal(submitted.launchReadiness.label, "Not ready");
assert.equal(submitted.publication.label, "Private");
assert.equal(submitted.programActivation.label, "Inactive");
assert.notEqual(
  submitted.overall.label,
  submitted.setupInformation.label,
  "Setup completion must never become the overall implementation state."
);
assert.match(submitted.overall.label, /LegalEase review in progress/);

const approvedButNotReady = buildPartnerImplementationPresentation({
  ...submittedInput,
  workspaceStatus: "ready_to_launch",
  internalApprovedAt: "2026-08-13T12:53:41.100Z",
  sections: submittedInput.sections.map((section) => ({
    ...section,
    status: "approved",
    approvedAt: "2026-08-13T12:53:41.100Z"
  }))
});
assert.equal(approvedButNotReady.legalEaseReview.label, "Approved");
assert.equal(approvedButNotReady.launchReadiness.label, "Not ready");
assert.equal(approvedButNotReady.publication.label, "Private");
assert.equal(approvedButNotReady.programActivation.label, "Inactive");

const readyButPrivate = buildPartnerImplementationPresentation({
  ...submittedInput,
  workspaceStatus: "ready_to_launch",
  internalApprovedAt: "2026-08-13T12:53:41.100Z",
  readiness: { ready: true, blockingFailures: 0, primaryNextAction: null }
});
assert.equal(readyButPrivate.launchReadiness.label, "Ready");
assert.equal(readyButPrivate.publication.label, "Private");
assert.equal(readyButPrivate.programActivation.label, "Inactive");

const legalEaseOnlyPreviewApproval = buildPartnerImplementationPresentation({
  ...submittedInput,
  coBrandedPageArtifact: {
    available: true,
    approvalStatus: "approved",
    partnerReviewStatus: "awaiting_partner"
  }
});
assert.notEqual(
  legalEaseOnlyPreviewApproval.milestones.find(
    (milestone) => milestone.key === "brand_participant_page"
  ).state.label,
  "Private preview approved"
);

const liveButPrivate = buildPartnerImplementationPresentation({
  ...submittedInput,
  workspaceStatus: "live",
  internalApprovedAt: "2026-08-13T12:53:41.100Z",
  launchedAt: "2026-09-15T14:00:00.000Z",
  readiness: { ready: true, blockingFailures: 0, primaryNextAction: null }
});
assert.equal(liveButPrivate.publication.label, "Private");
assert.equal(liveButPrivate.programActivation.label, "Live");

assert.notEqual(submitted.setupInformation.key, submitted.legalEaseReview.key);
assert.notEqual(approvedButNotReady.legalEaseReview.key, approvedButNotReady.launchReadiness.key);
assert.notEqual(readyButPrivate.launchReadiness.key, readyButPrivate.publication.key);
assert.notEqual(liveButPrivate.publication.key, liveButPrivate.programActivation.key);
assert.doesNotMatch(partnerFacingCopy(submitted), /\bLive\b/);

for (const status of ["paused", "closed"]) {
  const terminal = buildPartnerImplementationPresentation({
    ...submittedInput,
    workspaceStatus: status,
    internalApprovedAt: "2026-08-13T12:53:41.100Z",
    pausedAt: status === "paused" ? "2026-10-01T12:00:00.000Z" : null,
    closedAt: status === "closed" ? "2026-10-01T12:00:00.000Z" : null
  });
  const copy = partnerFacingCopy(terminal);
  assert.equal(terminal.setupInformation.label, "100% recorded");
  assert.doesNotMatch(copy, /setup (?:information )?is complete/i);
  assert.doesNotMatch(copy, /100% complete/i);
}

const html = renderToStaticMarkup(
  React.createElement(Phase1OnboardingHome, {
    organizationName: "Rythm Labs",
    programName: "Rythm Labs RCAP Acceptance",
    implementationOwner: null,
    presentation: submitted,
    isPartnerStaff: false,
    hasPendingPrefill: false,
    commercial: {
      label: "Cleared for setup",
      blocked: false,
      detail: "Synthetic local acceptance clearance."
    },
    agreements: [],
    activity: [],
    support: {
      email: "partners@legalease.com",
      mailtoHref: "mailto:partners@legalease.com",
      label: "partners@legalease.com",
      accessibleName: "Email LegalEase partner support at partners@legalease.com",
      configured: false
    },
    supportHref: "mailto:partners@legalease.com"
  })
);

for (const milestone of [
  "Program terms",
  "Administrator access",
  "Program configuration",
  "Brand and participant page",
  "Team and training",
  "Launch readiness",
  "Go-live"
]) {
  assert.match(html, new RegExp(escapeRegExp(milestone)));
}
assert.equal(count(html, /data-primary-next-action="true"/g), 1);
assert.equal(count(html, /data-next-action-owner="true"/g), 1);
assert.equal(count(html, /data-current-milestone="true"/g), 1);
assert.equal(count(html, /data-schedule-state="not-scheduled"/g), 6);
assert.match(html, /Ask LegalEase to schedule the implementation kickoff/);
assert.match(html, /Confirm an orientation date with LegalEase/);
assert.match(html, /ask LegalEase to schedule training/i);
assert.match(html, /Schedule leadership review after LegalEase completes configuration review/);
assert.match(html, /Schedule a rehearsal after the launch readiness checks are clear/);
assert.match(html, /Set a target launch date with LegalEase after readiness review/);
assert.match(html, /LegalEase review[\s\S]*In progress/);
assert.match(html, /Launch readiness[\s\S]*Not ready/);
assert.match(html, /Publication[\s\S]*Private/);
assert.match(html, /Program activation[\s\S]*Inactive/);
assert.doesNotMatch(textContent(html), /ready_for_review|not_ready|cleared_by_/);
assert.doesNotMatch(textContent(html), /Ready For Review|Not Ready For Review/);

const homeSource = fs.readFileSync(
  path.join(rootDir, "src/app/partner/onboarding/Phase1OnboardingHome.tsx"),
  "utf8"
);
assert.doesNotMatch(homeSource, /\.split\("_"\)/);
assert.doesNotMatch(homeSource, /replace\([^\n]*_/);

console.log("RCAP implementation center verifier passed: 10 behavioral guarantees.");

function partnerFacingCopy(value) {
  const parts = [];
  walk(value, null, parts);
  return parts.join("\n");
}

function walk(value, key, parts) {
  if (typeof value === "string") {
    if (
      !["key", "href", "tone", "date", "lastStateAt", "targetLaunchDate"].includes(
        key
      )
    ) {
      parts.push(value);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) walk(entry, key, parts);
    return;
  }
  if (value && typeof value === "object") {
    for (const [nextKey, entry] of Object.entries(value)) {
      walk(entry, nextKey, parts);
    }
  }
}

function titleFor(key) {
  return {
    organization_contacts: "Organization and contacts",
    program_goals: "Program goals",
    geography_audience_language_accessibility: "Geography, audience, language, and accessibility",
    access_sponsorship_capacity: "Access, sponsorship, and capacity",
    brand_public_page: "Brand and participant page",
    staff_dashboard_plan: "Staff dashboard plan",
    support_referrals_reporting: "Support, referrals, and reporting",
    review_authorization: "Review and authorization"
  }[key];
}

function textContent(markup) {
  return markup
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

function count(value, pattern) {
  return value.match(pattern)?.length ?? 0;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
