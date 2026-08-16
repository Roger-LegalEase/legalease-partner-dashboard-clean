// Proves the partner-facing onboarding status vocabulary is one curated source of truth.
//
// Behavioral where it can be: the label functions are loaded and called. The two structural
// assertions at the end exist because the defect being locked out is precisely a *duplicate
// definition* reappearing in a surface file — that is a property of the source, not of a
// return value, so there is nothing to call.

import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();

const checks = [];
function check(name, fn) {
  fn();
  checks.push(name);
}

const labels = loadTsModule(
  path.join(rootDir, "src/lib/partners/onboarding/partner-labels.ts")
);

// The status domains below are the authoritative ones: the first two come from
// src/lib/partners/onboarding/types.ts, the third from the
// partner_onboarding_agreements_status_check constraint in
// supabase/phase-43-rcap-partner-onboarding-phase1.sql.
const WORKSPACE_STATUSES = [
  "draft",
  "commercially_blocked",
  "setup_in_progress",
  "waiting_on_partner",
  "ready_for_review",
  "ready_to_launch",
  "live",
  "paused",
  "closed"
];
const SECTION_STATUSES = [
  "not_started",
  "in_progress",
  "submitted",
  "needs_changes",
  "approved",
  "waived",
  "not_applicable"
];
const AGREEMENT_STATUSES = [
  "not_required",
  "not_started",
  "requested",
  "under_review",
  "finalized",
  "executed",
  "approved",
  "waived"
];

check("every status in every authoritative domain has a curated label", () => {
  for (const status of WORKSPACE_STATUSES) {
    const label = labels.workspaceStatusLabel(status);
    assert.ok(label && label !== "Program setup", `workspace status ${status} fell through to the fallback`);
  }
  for (const status of SECTION_STATUSES) {
    const label = labels.sectionStatusLabel(status);
    assert.ok(label && label !== "Pending", `section status ${status} fell through to the fallback`);
  }
  for (const status of AGREEMENT_STATUSES) {
    const label = labels.agreementStatusLabel(status);
    assert.ok(label && label !== "Pending", `agreement status ${status} fell through to the fallback`);
  }
});

check("no partner-facing label leaks machine vocabulary", () => {
  const every = [
    ...WORKSPACE_STATUSES.map(labels.workspaceStatusLabel),
    ...SECTION_STATUSES.map(labels.sectionStatusLabel),
    ...AGREEMENT_STATUSES.map(labels.agreementStatusLabel),
    ...["partner", "legalease", "none"].map(labels.nextActionOwnerLabel)
  ];
  for (const label of every) {
    assert.ok(!label.includes("_"), `label "${label}" still contains a raw enum separator`);
  }
});

check("an unknown status degrades to a partner-safe phrase, never a prettified enum", () => {
  // The regression this locks out: a status added to the database but not here reaching a
  // partner as "Some New Status" via an underscore-to-Title-Case transform.
  for (const [fn, expected] of [
    [labels.workspaceStatusLabel, "Program setup"],
    [labels.sectionStatusLabel, "Pending"],
    [labels.agreementStatusLabel, "Pending"]
  ]) {
    assert.equal(fn("some_new_status_from_a_later_migration"), expected);
  }
});

check("agreement wording names who owes the next step", () => {
  // "Requested" and "Under review" on their own do not answer "who owns the next action".
  assert.match(labels.agreementStatusLabel("requested"), /your organization/i);
  assert.match(labels.agreementStatusLabel("under_review"), /LegalEase/i);
});

check("a change request is described as LegalEase's, not as a bare defect", () => {
  assert.match(labels.sectionStatusLabel("needs_changes"), /LegalEase requested changes/);
});

check("next-action owner reads as a party, not a code", () => {
  assert.equal(labels.nextActionOwnerLabel("partner"), "Your organization");
  assert.equal(labels.nextActionOwnerLabel("legalease"), "LegalEase");
  assert.equal(labels.nextActionOwnerLabel("none"), "No action needed");
});

check("the four partner surfaces read the shared vocabulary and define none of their own", () => {
  const surfaces = [
    "src/app/partner/onboarding/page.tsx",
    "src/app/partner/onboarding/review/page.tsx",
    "src/app/partner/onboarding/[sectionKey]/OnboardingSectionEditor.tsx",
    "src/app/partner/dashboard/page.tsx"
  ];
  for (const surface of surfaces) {
    const source = fs.readFileSync(path.join(rootDir, surface), "utf8");
    assert.match(
      source,
      /from "@\/lib\/partners\/onboarding\/partner-labels"/,
      `${surface} does not read the shared vocabulary`
    );
    // The mechanical transform that caused the original divergence.
    assert.doesNotMatch(
      source,
      /\.split\("_"\)[\s\S]{0,160}?toUpperCase\(\)/,
      `${surface} still prettifies a raw enum for display`
    );
  }
});

check("paused and closed programs are not told their setup is complete", () => {
  // The defect: all four compact states shared one body that asserted completion, so a
  // closed program read "Your program setup is complete" and an approved configuration.
  for (const status of ["paused", "closed"]) {
    const body = labels.setupHistoryBody(status);
    assert.doesNotMatch(
      body,
      /setup is complete/i,
      `a ${status} program is still told its setup is complete`
    );
    assert.notEqual(
      labels.setupHistoryHeading(status),
      "Your setup history",
      `a ${status} program still shares the generic history heading`
    );
  }
  assert.match(labels.setupHistoryBody("paused"), /nothing new is being processed/);
  assert.match(labels.setupHistoryBody("closed"), /remain available here as a record/);
});

check("live and ready-to-launch programs keep an accurate completed story", () => {
  assert.match(labels.setupHistoryBody("live"), /setup is complete/i);
  assert.match(labels.setupHistoryBody("ready_to_launch"), /Launch preparation is underway/);
  assert.equal(labels.setupHistoryHeading("live"), "Your setup history");
});

check("setup history copy is case- and whitespace-insensitive on status", () => {
  // The card lowercases before calling, but the helper must not depend on that.
  assert.equal(labels.setupHistoryHeading("  CLOSED "), "Your program is closed");
});

check("the onboarding home shows the partner-safe agreement detail it fetches", () => {
  const page = fs.readFileSync(
    path.join(rootDir, "src/app/partner/onboarding/page.tsx"),
    "utf8"
  );
  const home = fs.readFileSync(
    path.join(rootDir, "src/app/partner/onboarding/Phase1OnboardingHome.tsx"),
    "utf8"
  );
  assert.match(page, /detail: agreement\.partnerSafeDetail/);
  assert.match(home, /agreement\.detail \?/);
});

console.log(`RCAP onboarding partner labels: ${checks.length}/${checks.length} checks passed.`);
for (const name of checks) console.log(`  - ${name}`);

function loadTsModule(filename) {
  const resolved = path.resolve(filename);
  const cached = moduleCache.get(resolved);
  if (cached) return cached.exports;

  const source = fs.readFileSync(resolved, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  const mod = new Module(resolved);
  const compiledFilename = `${resolved}.cjs`;
  mod.filename = compiledFilename;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  moduleCache.set(resolved, mod);
  mod.require = (request) => {
    const nextFile = resolveTsRequest(request, path.dirname(resolved));
    return nextFile ? loadTsModule(nextFile) : require(request);
  };
  mod._compile(transpiled, compiledFilename);
  return mod.exports;
}

function resolveTsRequest(request, basedir) {
  if (request.startsWith("@/")) {
    return path.join(rootDir, "src", `${request.slice(2)}.ts`);
  }
  if (request.startsWith(".")) {
    const candidate = path.resolve(basedir, request);
    for (const extension of [".ts", ".tsx", ".js"]) {
      if (fs.existsSync(`${candidate}${extension}`)) return `${candidate}${extension}`;
    }
  }
  return null;
}
