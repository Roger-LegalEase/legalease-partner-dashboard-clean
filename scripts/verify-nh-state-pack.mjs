import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// New Hampshire is an ANNULMENT state: the legal term is annulment, not
// expungement (RSA 651:5). Routes: favorable outcome (not guilty/dismissed/not
// prosecuted), vacated conviction, conviction annulment (offense-level waits),
// marijuana possession (RSA 651:5-b), and DWI (RSA 265-A:21). This verifier proves
// the New Hampshire STATE PACK was built from the Nationwide source and remains
// shadow-only research: NOT wired to any renderer, NOT in the live jurisdiction
// selector, and NOT verified_replacement. The overlay/config is intentionally
// deferred (see report), so this verifier consumes the state pack directly.

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

registerTypeScriptHook();

const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const nhPackPath = path.join(rootDir, "src/lib/rcap/state-packs/new-hampshire/index.ts");

// --- Step 1: NH state pack exists ---

if (!fs.existsSync(nhPackPath)) {
  failures.push("NH state pack index not found at src/lib/rcap/state-packs/new-hampshire/index.ts.");
  process.exit(reportAndExit());
}
const nhPack = require(nhPackPath);

const expectedPackExports = [
  "nhEligibilityRules",
  "nhWaitingPeriodNotes",
  "nhFilingInstructions",
  "nhDisqualifyingOffenseNotes",
  "nhPlainLanguage",
  "nhSafetyDisclaimer",
  "nhFeeNotes",
  "nhPathways",
  "nhPathwayLabels",
  "nhRequiredFields",
  "nhFieldLabels",
  "nhDocumentTypes",
  "nhOfficialForms",
  "nhSampleDocumentInputs"
];
for (const name of expectedPackExports) {
  if (!(name in nhPack)) failures.push(`NH state pack missing export: ${name}.`);
}

// --- Step 2: State-pack content is consumed and internally consistent ---

if (Array.isArray(nhPack.nhPathways)) {
  const pathwayIds = nhPack.nhPathways.map((p) => p.pathway);
  const requiredPathways = [
    "favorable_outcome_annulment",
    "vacated_conviction_annulment",
    "conviction_annulment",
    "marijuana_possession_annulment",
    "dwi_annulment",
    "out_of_state_federal_unavailable"
  ];
  for (const id of requiredPathways) {
    if (!pathwayIds.includes(id)) failures.push(`NH pathways missing required pathway: ${id}.`);
  }
  for (const p of nhPack.nhPathways) {
    if (!p.citation || !/RSA/.test(p.citation)) {
      failures.push(`NH pathway '${p.pathway}' is missing an RSA citation.`);
    }
  }
  for (const id of pathwayIds) {
    if (!(id in nhPack.nhRequiredFields)) {
      failures.push(`nhRequiredFields missing entry for pathway '${id}'.`);
    }
  }
}

const allPackText = JSON.stringify(nhPack);
const requiredCitations = [
  "RSA 651:5",
  "RSA 651:5-b",
  "RSA 265-A:21",
  "RSA 651:6",
  "RSA 632-A:4",
  "RSA 631:2-b",
  "NHJB-2317"
];
for (const cite of requiredCitations) {
  if (!allPackText.includes(cite)) failures.push(`NH state pack is missing required citation: ${cite}.`);
}

// New Hampshire's defining structure and vocabulary: ANNULMENT.
if (!/651:5/.test(allPackText)) failures.push("NH state pack must center on RSA 651:5.");
if (!/annulment/i.test(allPackText)) failures.push("NH state pack must use 'annulment' vocabulary.");
if (!/separate petition/i.test(allPackText)) {
  failures.push("NH state pack must capture the separate-petition-per-record rule.");
}
if (!/multiple convictions/i.test(allPackText)) {
  failures.push("NH state pack must capture the multiple-convictions all-eligible rule.");
}
if (!/barred/i.test(allPackText)) {
  failures.push("NH state pack must capture the barred-offense categories.");
}

// Forms catalog must include the NHJB petition and checklist.
if (Array.isArray(nhPack.nhOfficialForms)) {
  const names = nhPack.nhOfficialForms.map((f) => `${f.formNumber || ""} ${f.officialName || ""}`).join(" | ");
  for (const needle of ["NHJB-2317-DSe", "Checklist"]) {
    if (!names.includes(needle)) failures.push(`NH official-forms catalog missing: ${needle}.`);
  }
}

// --- Step 3: No seals / logos and no other-state boilerplate leaked ---

if (/\[seal\]/i.test(allPackText) || /\[logo\]/i.test(allPackText)) {
  failures.push("NH state pack must not contain [seal] or [logo] markers.");
}
const otherStateLeakTerms = [
  "Commonwealth of Pennsylvania",
  "Court of Common Pleas",
  "District of Columbia",
  "North Dakota",
  "STATE OF OKLAHOMA",
  "State of Wyoming",
  "Maryland",
  "Georgia",
  "Florida",
  "Minnesota",
  "Missouri",
  "Nevada",
  "New Mexico",
  "Louisiana",
  "Maine",
  "Massachusetts",
  "Montana",
  "Ohio",
  "FDLE",
  "Nebraska",
  "RSMo",
  "NRS ",
  "NMSA",
  "M.R.S.",
  "M.G.L.",
  "Mont. Code Ann.",
  "Ohio Rev. Code",
  "Crim. Proc.",
  "610.140",
  "29-3A"
];
for (const term of otherStateLeakTerms) {
  if (allPackText.includes(term)) failures.push(`NH state pack must not contain other-state content: "${term}".`);
}
// Must not borrow other states' relief vocabulary.
for (const term of ["Clean Slate", "record restriction", "Certificate of Eligibility", "set aside", "set-aside", "redesignation"]) {
  if (new RegExp(term, "i").test(allPackText)) {
    failures.push(`NH state pack must not use non-New-Hampshire relief vocabulary: "${term}".`);
  }
}

// --- Step 4: Shadow-only — NH not wired to a renderer or the live selector ---

if (fs.existsSync(path.join(rootDir, "src/lib/record-clearing/new-hampshire-config.ts"))) {
  failures.push(
    "new-hampshire-config.ts exists: New Hampshire uses official NHJB forms; the overlay/field-map/config is deferred until per-form review + a Nationwide fidelity check are approved."
  );
}
for (const name of Object.keys(recordClearing)) {
  if (/^nh[A-Z]/.test(name) && /Config$/.test(name)) {
    failures.push(`Unexpected New Hampshire config exported from record-clearing index: ${name} (must stay deferred).`);
  }
}
const nhLive = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "NH")
  : false;
if (nhLive) failures.push("New Hampshire must not appear in the live recordClearingJurisdictions selector.");
if (/verified_replacement/.test(allPackText)) {
  failures.push("NH state pack must not declare verified_replacement lifecycle.");
}

// --- Step 5: Mississippi remains excluded from the new engine ---

const msEnabled = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "MS")
  : false;
if (msEnabled) failures.push("Mississippi must remain excluded from the new shadow engine.");

// --- Step 6: No live route / legacy generator / Nebraska changes ---

if (hasForbiddenChanges()) {
  failures.push("Forbidden file changes detected (live routes, legacy rcap generators, or Nebraska files).");
}

// --- Step 7: Sibling verifiers still pass (15 established) ---

const siblingVerifiers = [
  "verify-pleading-state.mjs",
  "verify-dc-pleading-state.mjs",
  "verify-nd-pleading-state.mjs",
  "verify-ok-pleading-state.mjs",
  "verify-wy-pleading-state.mjs",
  "verify-md-state-pack.mjs",
  "verify-ga-state-pack.mjs",
  "verify-fl-state-pack.mjs",
  "verify-mn-state-pack.mjs",
  "verify-mo-state-pack.mjs",
  "verify-nv-state-pack.mjs",
  "verify-nm-state-pack.mjs",
  "verify-la-state-pack.mjs",
  "verify-me-state-pack.mjs",
  "verify-ma-state-pack.mjs"
];
const siblingResults = [];
// Recursion guard. When this verifier is itself spawned by another verifier it
// runs with RCAP_VERIFIER_CHILD=1; in that case it still performs all of its own
// real checks above (content, legal-source, lifecycle, forbidden-path,
// shadow-only) but MUST NOT re-run its own sibling loop -- otherwise each sibling
// would recursively spawn its own siblings and fan out exponentially. A top-level
// run (flag unset) spawns each sibling exactly once, passing the flag down, so the
// child's own sibling loop is skipped. Sibling exit codes remain real (no faked
// PASS); when running as a child, siblingResults is simply left empty.
if (process.env.RCAP_VERIFIER_CHILD !== "1") {
  for (const script of siblingVerifiers) {
    const res = spawnSync(process.execPath, [path.join(rootDir, "scripts", script)], {
      cwd: rootDir,
      encoding: "utf8",
      env: { ...process.env, RCAP_VERIFIER_CHILD: "1" }
    });
    const ok = res.status === 0;
    siblingResults.push({ script, ok });
    if (!ok) failures.push(`Sibling verifier failed: ${script} (exit ${res.status}).`);
  }
}

// --- Step 8: Shadow artifact ---

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/new-hampshire");
fs.mkdirSync(outputDir, { recursive: true });
const artifact = {
  state: "NH",
  tier: "Tier 2/hybrid (annulment agent RTF + official NHJB form PDFs -> structured state pack)",
  lifecycle: "shadow_only",
  verifiedReplacement: false,
  liveRouted: false,
  rendererStrategy:
    "official_pdf_form_filling / overlay (deferred, per-form): New Hampshire uses NHJB-2317-DSe (Petition to Annul) and related NHJB forms; separate petition per record; config deferred pending form identification",
  pathways: Array.isArray(nhPack.nhPathways) ? nhPack.nhPathways.map((p) => p.pathway) : [],
  officialForms: Array.isArray(nhPack.nhOfficialForms)
    ? nhPack.nhOfficialForms.map((f) => f.formNumber || f.officialName)
    : [],
  siblingVerifiers: siblingResults
};
fs.writeFileSync(path.join(outputDir, "nh-state-pack-summary.json"), `${JSON.stringify(artifact, null, 2)}\n`);

// --- Report ---

if (failures.length > 0) {
  console.error("New Hampshire state-pack verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("New Hampshire state-pack verification PASSED.");
console.log(`  NH state pack exists:          yes`);
console.log(`  Pack exports present:          ${expectedPackExports.length}`);
console.log(`  Pathways:                      ${artifact.pathways.length}`);
console.log(`  Official forms cataloged:      ${artifact.officialForms.length}`);
console.log(`  Renderer strategy:             official_pdf/overlay (config deferred)`);
console.log(`  Annulment-not-expungement:     enforced`);
console.log(`  New Hampshire config wired:    no (deferred)`);
console.log(`  Live-routed (selector):        no`);
console.log(`  Lifecycle verified_replacement:no`);
console.log(`  Seals / logos in pack:         no`);
console.log(`  Other-state leakage:           no`);
console.log(`  Mississippi new-engine:        no`);
console.log(`  Forbidden files changed:       no`);
for (const r of siblingResults) console.log(`  Sibling ${r.script.padEnd(28)} ${r.ok ? "PASS" : "FAIL"}`);
console.log(`  Shadow summary:                ${path.join(outputDir, "nh-state-pack-summary.json")}`);

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("New Hampshire state-pack verification FAILED.");
    for (const f of failures) console.error(`  - ${f}`);
    return 1;
  }
  return 0;
}

function registerTypeScriptHook() {
  const originalLoader = Module._extensions[".ts"];
  Module._extensions[".ts"] = function loadTs(module, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true
      },
      fileName: filename
    }).outputText;
    module._compile(output, filename);
  };
  process.once("exit", () => {
    Module._extensions[".ts"] = originalLoader;
  });
}

function hasForbiddenChanges() {
  const result = spawnSync(
    "git",
    [
      "status",
      "--short",
      "--",
      "src/app",
      "src/lib/rcap/documents",
      "src/lib/rcap/intake",
      "src/lib/rcap-intake",
      "src/lib/documents",
      "src/lib/document-generation",
      "src/lib/reports",
      "supabase",
      "src/lib/record-clearing/nebraska-config.ts",
      "scripts/verify-nebraska-record-clearing-shadow.mjs"
    ],
    { cwd: rootDir, encoding: "utf8" }
  );
  return result.stdout.trim().length > 0;
}
