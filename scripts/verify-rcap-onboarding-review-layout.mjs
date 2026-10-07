// HF-004 / HF-005 / HF-019 (WP-04): partner review-page layout and decision counters, and
// the guided editor's sticky footer. Deterministic and credential-free: the real components
// are server-rendered with synthetic data and the markup, the counter derivation and the
// autosave contract are asserted. Browser geometry (Chromium and WebKit at 390/768/1024/1440
// and 200% text zoom) is captured separately by the hotfix evidence run; this verifier pins
// the structural causes so they cannot silently return.
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
  "next/navigation": { useRouter: () => ({ push() {}, replace() {} }) }
};

const reviewModulePath = "src/app/partner/onboarding/review/OnboardingReviewClient.tsx";
const editorModulePath = "src/app/partner/onboarding/[sectionKey]/OnboardingSectionEditor.tsx";
const { OnboardingReviewClient, deriveReviewCounters, displaySectionState } = loadTsModule(
  path.join(rootDir, reviewModulePath)
);
const { OnboardingSectionEditor } = loadTsModule(path.join(rootDir, editorModulePath));
const reviewSource = fs.readFileSync(path.join(rootDir, reviewModulePath), "utf8");
const editorSource = fs.readFileSync(path.join(rootDir, editorModulePath), "utf8");

let guarantees = 0;
const guarantee = (name, fn) => {
  fn();
  guarantees += 1;
  console.log(`  ok  ${name}`);
};

// ---------------------------------------------------------------------------------------
// Synthetic review fixtures
// ---------------------------------------------------------------------------------------
const titles = [
  "Organization and contacts",
  "Program goals",
  "Geography, audience, language, and accessibility",
  "Access, sponsorship, and capacity",
  "Brand and public page",
  "Staff and dashboard plan",
  "Support, referrals, and reporting",
  "Review and authorization"
];
const keys = [
  "organization_contacts",
  "program_goals",
  "geography_audience_language_accessibility",
  "access_sponsorship_capacity",
  "brand_public_page",
  "staff_dashboard_plan",
  "support_referrals_reporting",
  "review_authorization"
];
function section(i, over = {}) {
  return {
    key: keys[i],
    title: titles[i],
    state: "Waiting on LegalEase",
    editHref: `/partner/onboarding/${keys[i]}`,
    fields: [{ fieldKey: "f", label: "Field", value: "Synthetic value" }],
    missingItems: [],
    openChangeRequests: 0,
    waitingChangeRequests: 0,
    resolvedChangeRequests: 0,
    hasPendingPrefill: false,
    completionPercentage: 100,
    lastUpdatedAt: "2026-10-06T10:00:00.000Z",
    submittedAt: "2026-10-06T10:00:00.000Z",
    approvedAt: null,
    approvalSatisfied: false,
    changedSinceReview: false,
    ...over
  };
}
const eight = (over = () => ({})) => Array.from({ length: 8 }, (_, i) => section(i, over(i)));
const fixtures = {
  // The live screenshot shape: seven complete sections, one incomplete, nothing submitted.
  sevenOfEight: eight((i) =>
    i === 7
      ? {
          state: "Needs attention",
          submittedAt: null,
          completionPercentage: 60,
          missingItems: [{ fieldKey: "authorized_signer", label: "Authorized signer", href: "#" }]
        }
      : {}
  ),
  allCompleteNotSubmitted: eight(),
  submitted: eight(),
  oneCorrection: eight((i) => (i === 2 ? { state: "Needs attention", openChangeRequests: 1 } : {})),
  oneApproved: eight((i) =>
    i === 0 ? { state: "Complete", approvedAt: "2026-10-06T12:00:00.000Z", approvalSatisfied: true } : {}
  ),
  allReviewed: eight(() => ({
    state: "Complete",
    approvedAt: "2026-10-06T12:00:00.000Z",
    approvalSatisfied: true
  }))
};
const statusPresentation = {
  setupInformation: { label: "87% complete", description: "Setup information only." },
  legalEaseReview: { label: "Not submitted", description: "Not yet submitted." },
  publication: { label: "Private", description: "Not published." },
  programActivation: { label: "Inactive", description: "Not active." }
};
const support = {
  email: "partners@example.test",
  mailtoHref: "mailto:partners@example.test",
  label: "partners@example.test",
  accessibleName: "Email LegalEase partner support",
  configured: false
};
function renderReview(sections, { submitted = false, pendingPrefillSections = [] } = {}) {
  return renderToStaticMarkup(
    React.createElement(OnboardingReviewClient, {
      sections,
      canSubmit: true,
      canEdit: true,
      isPartnerStaff: false,
      support,
      supportHref: support.mailtoHref,
      initialSubmission: submitted
        ? { submittedAt: "2026-10-06T13:00:00.000Z", statusLabel: "In LegalEase review", historical: false }
        : null,
      workspaceVersion: 3,
      pendingPrefillSections,
      statusPresentation
    })
  );
}
function metricsOf(html) {
  // Only the decision summary's own cells, not the status dimensions or per-section facts.
  const summary = /<section aria-labelledby="review-summary-heading"[\s\S]*?<\/section>/.exec(html);
  assert.ok(summary, "decision summary section not rendered");
  return Object.fromEntries(
    [...summary[0].matchAll(/<dt[^>]*>([^<]+)<\/dt><dd[^>]*>([^<]+)<\/dd>/g)].map((m) => [m[1].trim(), m[2].trim()])
  );
}
function summariesOf(html) {
  return [...html.matchAll(/<summary\b([^>]*)>/g)].map((m) => m[1]);
}
function reviewRowsOf(html) {
  return [...html.matchAll(/<details\b[^>]*data-review-section="([^"]+)"[^>]*>([\s\S]*?)<\/details>/g)].map(
    (m) => ({ key: m[1], inner: m[2] })
  );
}

console.log("HF-004: review section rows");
guarantee("every summary that suppresses its marker also hides the WebKit marker box, and none is a grid", () => {
  // The nested "decisions remaining" disclosure keeps the native marker on purpose: it is an
  // inline text summary, not a laid-out row. Every summary that opts out of the marker with
  // list-none must also hide ::-webkit-details-marker, because WebKit ignores list-style here.
  const summaries = summariesOf(renderReview(fixtures.sevenOfEight));
  const markerless = summaries.filter((attrs) => /\blist-none\b/.test(attrs));
  assert.equal(markerless.length, 9, `expected the 8 section rows plus the audit disclosure, got ${markerless.length}`);
  for (const attrs of markerless) {
    assert.match(attrs, /\[&amp;::-webkit-details-marker\]:hidden/, `marker not hidden: ${attrs}`);
  }
  for (const attrs of summaries) {
    const classes = /class="([^"]*)"/.exec(attrs)?.[1] ?? "";
    assert.doesNotMatch(classes, /(^|\s)(grid|sm:grid-cols-\[38px[^\s]*)(\s|$)/, `summary is still the grid: ${classes}`);
  }
});
guarantee("each section row keeps marker, number, title and status inside one full-width wrapper", () => {
  const rows = reviewRowsOf(renderReview(fixtures.sevenOfEight));
  assert.equal(rows.length, 8);
  rows.forEach((row, index) => {
    assert.equal(row.key, keys[index]);
    const wrapper = /<span class="([^"]*)" data-review-row(?:="[^"]*")?>/.exec(row.inner);
    assert.ok(wrapper, `row wrapper missing for ${row.key}`);
    for (const cls of ["grid", "w-full", "min-w-0", "sm:grid-cols-[minmax(0,1fr)_auto]"]) {
      assert.ok(wrapper[1].split(/\s+/).includes(cls), `${row.key} wrapper lacks ${cls}`);
    }
    assert.match(row.inner, /group-open:rotate-90/, `${row.key} has no custom open marker`);
    assert.match(row.inner, new RegExp(`data-review-title(?:="[^"]*")?>${titles[index].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<`));
    assert.match(row.inner, /data-review-status(?:="[^"]*")?>/);
    const order = [row.inner.indexOf("group-open:rotate-90"), row.inner.indexOf(`>${String(index + 1).padStart(2, "0")}<`), row.inner.indexOf("data-review-title"), row.inner.indexOf("data-review-status")];
    assert.ok(order.every((v) => v >= 0) && order.every((v, i) => i === 0 || v > order[i - 1]), `${row.key} reading order is marker, number, title, status: ${order.join(",")}`);
  });
});
guarantee("the status column no longer shares the 38px number column", () => {
  assert.doesNotMatch(reviewSource, /sm:grid-cols-\[38px_minmax\(0,1fr\)_auto\]/);
});

console.log("HF-005: decision counters");
guarantee("7 of 8 setup sections complete reads 1 incomplete, 1 decision, 8 reviews outstanding, 0 awaiting review", () => {
  const html = renderReview(fixtures.sevenOfEight);
  assert.deepEqual(metricsOf(html), {
    "Partner setup sections complete": "7 of 8",
    "Partner setup sections incomplete": "1",
    "Partner decisions remaining": "1",
    "Partner corrections requested": "0",
    "Package submission": "Not submitted",
    "Submitted sections awaiting LegalEase review": "0",
    "LegalEase section reviews outstanding": "8 of 8",
    "Changed since prior review": "0"
  });
  assert.doesNotMatch(html, /Open partner changes|>Sections complete<|>Waiting on LegalEase</);
});
guarantee("before submission a completed section is shown as Complete, not Waiting on LegalEase", () => {
  const html = renderReview(fixtures.allCompleteNotSubmitted);
  assert.equal((html.match(/data-review-status(?:="[^"]*")?>Complete</g) ?? []).length, 8);
  assert.doesNotMatch(html, /data-review-status(?:="[^"]*")?>Waiting on LegalEase</);
  assert.match(html, /package not yet submitted/);
  assert.equal(displaySectionState({ state: "Waiting on LegalEase" }, false), "Complete");
  assert.equal(displaySectionState({ state: "Waiting on LegalEase" }, true), "Waiting on LegalEase");
  assert.equal(displaySectionState({ state: "Needs attention" }, false), "Needs attention");
});
guarantee("after submission the same sections are Waiting on LegalEase and counted as awaiting review", () => {
  const html = renderReview(fixtures.submitted, { submitted: true });
  assert.equal((html.match(/data-review-status(?:="[^"]*")?>Waiting on LegalEase</g) ?? []).length, 8);
  const m = metricsOf(html);
  assert.equal(m["Package submission"], "Submitted");
  assert.equal(m["Submitted sections awaiting LegalEase review"], "8");
  assert.equal(m["LegalEase section reviews outstanding"], "8 of 8");
  assert.doesNotMatch(html, /package not yet submitted/);
});
guarantee("a correction counts once as a correction and once in decisions remaining, never as a field", () => {
  const m = metricsOf(renderReview(fixtures.oneCorrection));
  assert.equal(m["Partner corrections requested"], "1");
  assert.equal(m["Partner decisions remaining"], "1");
  assert.equal(m["Partner setup sections complete"], "7 of 8");
});
guarantee("an approved section leaves the review count: 7 of 8 outstanding, then 0 of 8", () => {
  assert.equal(metricsOf(renderReview(fixtures.oneApproved))["LegalEase section reviews outstanding"], "7 of 8");
  const all = metricsOf(renderReview(fixtures.allReviewed, { submitted: true }));
  assert.equal(all["LegalEase section reviews outstanding"], "0 of 8");
  assert.equal(all["Submitted sections awaiting LegalEase review"], "0");
});
guarantee("deriveReviewCounters is the single source for every number", () => {
  const counters = deriveReviewCounters(fixtures.sevenOfEight, { packageSubmitted: false, pendingPrefillSections: 2 });
  assert.deepEqual(counters, {
    total: 8,
    setupComplete: 7,
    setupIncomplete: 1,
    decisionsRemaining: 3,
    correctionsRequested: 0,
    awaitingReview: 0,
    reviewsOutstanding: 8,
    changedSincePriorReview: 0
  });
  const changed = deriveReviewCounters(
    eight((i) => (i < 3 ? { state: "Changed since review", changedSinceReview: true } : {})),
    { packageSubmitted: true, pendingPrefillSections: 0 }
  );
  assert.equal(changed.changedSincePriorReview, 3);
  assert.equal(changed.setupComplete, 8, "a changed section is still a complete setup section");
  assert.equal(changed.awaitingReview, 5);
  assert.equal(deriveReviewCounters([], { packageSubmitted: false, pendingPrefillSections: 0 }).total, 0);
});

// ---------------------------------------------------------------------------------------
// HF-019: the guided editor's sticky footer
// ---------------------------------------------------------------------------------------
function renderEditor({ canEdit = true, initialStepId = "target-population" } = {}) {
  return renderToStaticMarkup(
    React.createElement(OnboardingSectionEditor, {
      sectionKey: "program_goals",
      sectionStatus: "in_progress",
      title: "Program goals",
      purpose: "Describe the intended outcomes.",
      initialData: { target_population: "" },
      initialRevision: 1,
      initialWorkspaceVersion: 2,
      canEdit,
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
      initialStepId,
      missingRequiredKeys: ["primary_goal", "target_population"],
      completionHref: "/partner/onboarding#program-configuration",
      sectionSummary: { completedSections: 1, totalSections: 8, openPartnerChanges: 0, waitingOnLegalEase: 0 },
      brandExperience: null,
      preview: null,
      previewUnavailable: false,
      artifactVersionId: null,
      partnerReviewStatus: null,
      legalEaseApprovalStatus: null,
      sourceFreshness: "no_version",
      invalidatedApprovals: { partner: false, legalease: false },
      canPartnerReview: false,
      workspaceStatus: "in_progress",
      targetLaunchDate: null,
      launchedAt: null
    })
  );
}
function footerOf(html) {
  const m = /<div class="([^"]*)" data-guided-footer(?:="[^"]*")?>([\s\S]*?)<\/div><\/div><\/div>/.exec(html);
  assert.ok(m, "guided footer not rendered");
  return { classes: m[1].split(/\s+/), inner: m[2] };
}
function classesOf(tag) {
  return (/class="([^"]*)"/.exec(tag)?.[1] ?? "").split(/\s+/);
}

console.log("HF-019: guided footer");
guarantee("exactly one sticky footer is rendered per editor view", () => {
  for (const step of ["goal-and-success", "target-population"]) {
    const html = renderEditor({ initialStepId: step });
    assert.equal((html.match(/data-guided-footer/g) ?? []).length, 1, `${step}: footers`);
    assert.equal((html.match(/data-primary-guided-action/g) ?? []).length, 1, `${step}: primary actions`);
    assert.ok(footerOf(html).classes.includes("sticky"));
  }
});
guarantee("the footer row wraps instead of forcing a two-column grid", () => {
  const { inner } = footerOf(renderEditor());
  const row = /<div class="([^"]*)"><div class="([^"]*)"><div aria-atomic/.exec(inner);
  assert.ok(row, "footer row and status region not found");
  const rowClasses = row[1].split(/\s+/);
  const statusClasses = row[2].split(/\s+/);
  for (const cls of ["flex", "flex-wrap", "items-end", "gap-x-6", "gap-y-3"]) assert.ok(rowClasses.includes(cls), `row lacks ${cls}`);
  assert.ok(!rowClasses.some((c) => /grid/.test(c)), `row is still a grid: ${rowClasses.join(" ")}`);
  for (const cls of ["min-w-0", "flex-1", "basis-56", "break-words"]) assert.ok(statusClasses.includes(cls), `status region lacks ${cls}`);
  assert.doesNotMatch(editorSource, /lg:grid-cols-\[minmax\(0,1fr\)_auto\][^\n]*\n[^\n]*SaveState/);
});
guarantee("Back and the primary action are shrink-safe, wrap their labels and stay at least 44px tall", () => {
  for (const [opts, labels] of [
    [{ initialStepId: "target-population" }, ["Back", "Save and Continue"]],
    [{ initialStepId: "goal-and-success" }, ["Implementation center", "Save and Continue"]],
    [{ initialStepId: "target-population", canEdit: false }, ["Back", "Continue"]],
    [{ initialStepId: "partner-measurement", canEdit: false }, ["Back", "Return to implementation center"]]
  ]) {
    const { inner } = footerOf(renderEditor(opts));
    const actions = /<div class="([^"]*)" data-guided-actions(?:="[^"]*")?>([\s\S]*)$/.exec(inner);
    assert.ok(actions, "action group missing");
    for (const cls of ["flex", "flex-wrap", "w-full", "max-w-full", "sm:w-auto"]) assert.ok(actions[1].split(/\s+/).includes(cls), `action group lacks ${cls}`);
    const controls = [...actions[2].matchAll(/<(a|button)\b([^>]*)>([^<]*)</g)];
    assert.deepEqual(controls.map((c) => c[3].trim()), labels, `labels for ${JSON.stringify(opts)}`);
    for (const c of controls) {
      const cls = classesOf(c[2]);
      for (const need of ["w-full", "min-w-0", "whitespace-normal", "text-center", "sm:w-auto", "sm:min-w-32", "min-h-12", "inline-flex"]) {
        assert.ok(cls.includes(need), `${c[3].trim()} lacks ${need}`);
      }
      assert.ok(!cls.some((x) => /whitespace-nowrap|truncate|overflow-hidden/.test(x)), `${c[3].trim()} clips its label`);
    }
  }
});
guarantee("the footer reserves its own height as document scroll padding and restores it on unmount", () => {
  const bar = editorSource.slice(editorSource.indexOf("function GuidedActionBar"), editorSource.indexOf("function SaveState"));
  const effect = /useLayoutEffect\(\(\) => \{([\s\S]*?)\}, \[keepFocusedControlAboveFooter\]\);/.exec(bar);
  assert.ok(effect, "GuidedActionBar layout effect missing");
  assert.match(effect[1], /footerRef\.current/);
  assert.match(effect[1], /const oversized = height > window\.innerHeight \/ 2/);
  assert.match(effect[1], /footer\.style\.position = oversized \? "static" : ""/);
  assert.match(effect[1], /root\.style\.scrollPaddingBottom = `\$\{oversized \? 16 : height \+ 16\}px`/);
  assert.match(effect[1], /ResizeObserver/);
  assert.match(effect[1], /observer\?\.disconnect\(\);\s*window\.removeEventListener\("resize", reserve\);\s*root\.style\.scrollPaddingBottom = previous;/);
  assert.match(editorSource, /^import \{[^}]*useLayoutEffect[^}]*\} from "react";/m);
  // The focused control, and the help or error text it is described by, is brought back
  // above the footer when the footer grows, when focus moves into a control, and after a
  // save-state or validation change has rendered. Scroll only, never a save.
  const keeper = /const keepFocusedControlAboveFooter = useCallback\(\(\) => \{([\s\S]*?)\}, \[\]\);/.exec(bar);
  assert.ok(keeper, "keepFocusedControlAboveFooter missing");
  assert.match(keeper[1], /aria-describedby/);
  assert.match(keeper[1], /footer\.contains\(active\)/);
  assert.match(keeper[1], /lowest\.scrollIntoView\(\{ block: "nearest" \}\)/);
  assert.doesNotMatch(keeper[1], /enqueueSave|fetch\(|setIndicator|setData/);
  assert.match(effect[1], /form\?\.addEventListener\("focusin", onFocusIn\)/);
  assert.match(effect[1], /form\?\.removeEventListener\("focusin", onFocusIn\)/);
  assert.match(bar, /useEffect\(\(\) => \{[\s\S]*?requestAnimationFrame\(keepFocusedControlAboveFooter\)[\s\S]*?\}, \[indicator, issueCount, keepFocusedControlAboveFooter\]\);/);
});
guarantee("recovery links sit inside the status region, never under the Back control", () => {
  const bar = editorSource.slice(editorSource.indexOf("function GuidedActionBar"), editorSource.indexOf("function SaveState"));
  const statusStart = bar.indexOf('className="min-w-0 flex-1 basis-56 break-words"');
  const actionsStart = bar.indexOf("data-guided-actions");
  assert.ok(statusStart > 0 && actionsStart > statusStart);
  const statusRegion = bar.slice(statusStart, actionsStart);
  assert.match(statusRegion, /<SaveState indicator=\{indicator\} \/>/);
  assert.match(statusRegion, /onClick=\{onRetry\}/);
  assert.match(statusRegion, /onClick=\{onReturnToSaved\}/);
  assert.match(statusRegion, /Sign in again/);
  assert.match(statusRegion, /className="mt-2 flex flex-wrap gap-x-4 gap-y-2"/);
});
guarantee("the autosave contract and ordering are untouched by the layout correction", () => {
  // Request body: same keys in the same order; same endpoint; the same 1000 ms draft debounce;
  // the same save queue and the same completing/controlsEnabled derivation.
  assert.match(editorSource, /`\/api\/partners\/onboarding\/sections\/\$\{encodeURIComponent\(sectionKey\)\}`/);
  assert.match(editorSource, /body: JSON\.stringify\(\{\s*requestId: operation\.requestId,\s*expectedRevision: revisionRef\.current,\s*expectedWorkspaceVersion: workspaceVersionRef\.current,\s*mode:/);
  assert.match(editorSource, /\{ guidedStepId: operation\.guidedStepId \}/);
  assert.match(editorSource, /data: operation\.snapshot\s*\}\)/);
  assert.match(editorSource, /void enqueueSave\("draft_save", dataRef\.current\);\s*\}, 1000\);/);
  assert.match(editorSource, /const controlsEnabled = editable && !completing;/);
  assert.match(editorSource, /completingSection \? "section_complete" : "substep_continue"/);
  assert.equal((editorSource.match(/data-save-state=\{indicator\.kind\}/g) ?? []).length, 1);
});

console.log(`RCAP onboarding review layout verifier passed: ${guarantees} guarantees.`);

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
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    const next = request.startsWith("@/")
      ? resolveExisting(path.join(rootDir, "src", request.slice(2)))
      : request.startsWith(".")
        ? resolveExisting(path.resolve(path.dirname(resolved), request))
        : null;
    return next ? loadTsModule(next) : require(request);
  };
  mod._compile(transpiled.outputText, mod.filename);
  return mod.exports;
}

function resolveExisting(candidate) {
  for (const ext of [".ts", ".tsx", ".js"]) if (fs.existsSync(candidate + ext)) return candidate + ext;
  return fs.existsSync(candidate) ? candidate : null;
}
