import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Rhode Island is a MULTI-PATHWAY state that uses BOTH expungement and sealing:
// first-offender conviction expungement (R.I. Gen. Laws ch. 12-1.3; § 12-1.3-2;
// 5 yr misdemeanor / 10 yr felony from completion of sentence), multiple-
// misdemeanor expungement (§ 12-1.3-3), deferred-sentence expungement
// (§ 12-19-19 / § 12-1.3-2(e)), non-conviction sealing/destruction (§ 12-1-12
// and § 12-1-12.1; Rule 48(a) automatic sealing on/after Jan. 1, 2023), filed-
// complaint expungement (§ 12-10-12), marijuana possession-only automatic
// expungement (§ 12-1.3-5), decriminalized-offense expungement, and commercial-
// sexual-activity relief (§ 11-34.1-5), plus a crime-of-violence bar. This
// verifier proves the Rhode Island STATE PACK was built from the Nationwide
// source and remains shadow-only research: NOT wired to any renderer, NOT in the
// live jurisdiction selector, and NOT verified_replacement. The overlay/config
// is intentionally deferred (see report), so this verifier consumes the state
// pack directly.

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

registerTypeScriptHook();

const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const riPackPath = path.join(rootDir, "src/lib/rcap/state-packs/rhode-island/index.ts");

// --- Step 1: RI state pack exists ---

if (!fs.existsSync(riPackPath)) {
  failures.push("RI state pack index not found at src/lib/rcap/state-packs/rhode-island/index.ts.");
  process.exit(reportAndExit());
}
const riPack = require(riPackPath);

const expectedPackExports = [
  "riEligibilityRules",
  "riWaitingPeriodNotes",
  "riFilingInstructions",
  "riDisqualifyingOffenseNotes",
  "riPlainLanguage",
  "riSafetyDisclaimer",
  "riFeeNotes",
  "riPathways",
  "riPathwayLabels",
  "riRequiredFields",
  "riFieldLabels",
  "riDocumentTypes",
  "riOfficialForms",
  "riSampleDocumentInputs"
];
for (const name of expectedPackExports) {
  if (!(name in riPack)) failures.push(`RI state pack missing export: ${name}.`);
}

// --- Step 2: State-pack content is consumed and internally consistent ---

if (Array.isArray(riPack.riPathways)) {
  const pathwayIds = riPack.riPathways.map((p) => p.pathway);
  const requiredPathways = [
    "first_offender_conviction_expungement",
    "multiple_misdemeanor_expungement",
    "deferred_sentence_expungement",
    "non_conviction_sealing",
    "filed_complaint_expungement",
    "marijuana_possession_automatic_expungement",
    "decriminalized_offense_expungement",
    "commercial_sexual_activity_relief",
    "crime_of_violence_bar"
  ];
  for (const id of requiredPathways) {
    if (!pathwayIds.includes(id)) failures.push(`RI pathways missing required pathway: ${id}.`);
  }
  for (const p of riPack.riPathways) {
    if (!p.citation || !/R\.I\. Gen\. Laws/.test(p.citation)) {
      failures.push(`RI pathway '${p.pathway}' is missing an R.I. Gen. Laws citation.`);
    }
  }
  for (const id of pathwayIds) {
    if (!(id in riPack.riRequiredFields)) {
      failures.push(`riRequiredFields missing entry for pathway '${id}'.`);
    }
  }
}

const allPackText = JSON.stringify(riPack);
const requiredCitations = [
  "R.I. Gen. Laws",
  "12-1.3",
  "§ 12-1-12",
  "§ 12-19-19",
  "§ 12-1.3-5",
  "§ 12-10-12",
  "§ 11-34.1-5",
  "§ 12-1.3-2",
  "§ 12-1.3-3"
];
for (const cite of requiredCitations) {
  if (!allPackText.includes(cite)) failures.push(`RI state pack is missing required citation: ${cite}.`);
}

// Rhode Island's defining structure and vocabulary.
if (!/12-1\.3/.test(allPackText)) failures.push("RI state pack must center on ch. 12-1.3 expungement.");
if (!/expungement/i.test(allPackText)) failures.push("RI state pack must use 'expungement'.");
if (!/sealing/i.test(allPackText)) failures.push("RI state pack must use 'sealing'.");
if (!/first offender/i.test(allPackText)) failures.push("RI state pack must use 'first offender'.");
if (!/crime of violence/i.test(allPackText)) failures.push("RI state pack must use 'crime of violence'.");
if (!/\bBCI\b/.test(allPackText)) failures.push("RI state pack must reference the BCI (Bureau of Criminal Identification).");
if (!/5 years|five[- ]year/i.test(allPackText)) {
  failures.push("RI state pack must capture the 5-year first-offender misdemeanor wait.");
}
if (!/10 years|ten[- ]year/i.test(allPackText)) {
  failures.push("RI state pack must capture the 10-year felony / multiple-misdemeanor wait.");
}
if (!/Attorney General/i.test(allPackText) || !/10 days|ten days/i.test(allPackText)) {
  failures.push("RI state pack must capture the Attorney General / 10-day notice requirement.");
}
if (!/Rule 48\(a\)/.test(allPackText)) {
  failures.push("RI state pack must capture the Rule 48(a) non-conviction sealing rule.");
}

// Forms catalog must include the DC-33 and Superior-55 court forms.
if (Array.isArray(riPack.riOfficialForms)) {
  const names = riPack.riOfficialForms.map((f) => `${f.formId || ""} ${f.officialName}`).join(" | ");
  for (const needle of ["DC-33", "Superior-55"]) {
    if (!names.includes(needle)) failures.push(`RI official-forms catalog missing: ${needle}.`);
  }
}

// --- Step 3: No seals / logos and no other-state boilerplate leaked ---

if (/\[seal\]/i.test(allPackText) || /\[logo\]/i.test(allPackText)) {
  failures.push("RI state pack must not contain [seal] or [logo] markers.");
}
// Other-state leak terms: COPIED from Montana's list (Rhode Island uses none of
// these), with the Montana tokens added because Montana is now a sibling. Rhode
// Island legitimately uses "sealing", "expungement", "first offender", "crime of
// violence", and "BCI", so those are NOT banned here.
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
  "New Hampshire",
  "Ohio",
  "FDLE",
  "Nebraska",
  "Montana",
  "Mont. Code Ann.",
  "MMRTA",
  "CRISS",
  "RSMo",
  "NRS ",
  "NMSA",
  "M.R.S.",
  "M.G.L.",
  "RSA ",
  "Ohio Rev. Code",
  "Crim. Proc.",
  "610.140",
  "29-3A"
];
for (const term of otherStateLeakTerms) {
  if (allPackText.includes(term)) failures.push(`RI state pack must not contain other-state content: "${term}".`);
}
// Must not borrow other states' relief vocabulary (Rhode Island legitimately
// uses "expungement" and "sealing", so those are NOT banned here).
for (const term of ["annulment", "Clean Slate", "record restriction", "Certificate of Eligibility", "redesignation", "resentencing"]) {
  if (new RegExp(term, "i").test(allPackText)) {
    failures.push(`RI state pack must not use non-Rhode-Island relief vocabulary: "${term}".`);
  }
}

// --- Step 4: Shadow-only — RI not wired to a renderer or the live selector ---

if (fs.existsSync(path.join(rootDir, "src/lib/record-clearing/rhode-island-config.ts"))) {
  failures.push(
    "rhode-island-config.ts exists: Rhode Island uses official court Motion/Affidavit forms; the renderer/field-map/config is deferred until per-form review + a Nationwide fidelity check are approved."
  );
}
for (const name of Object.keys(recordClearing)) {
  if (/^ri[A-Z]/.test(name) && /Config$/.test(name)) {
    failures.push(`Unexpected Rhode Island config exported from record-clearing index: ${name} (must stay deferred).`);
  }
}
const riLive = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "RI")
  : false;
if (riLive) failures.push("Rhode Island must not appear in the live recordClearingJurisdictions selector.");
if (/verified_replacement/.test(allPackText)) {
  failures.push("RI state pack must not declare verified_replacement lifecycle.");
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

// --- Step 7: Sibling verifiers still pass (18 established) ---

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
  "verify-ma-state-pack.mjs",
  "verify-mt-state-pack.mjs",
  "verify-nh-state-pack.mjs",
  "verify-oh-state-pack.mjs"
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

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/rhode-island");
fs.mkdirSync(outputDir, { recursive: true });
const artifact = {
  state: "RI",
  tier: "Tier 2/hybrid (Wilma RTF + official court Motion/Affidavit forms -> structured state pack)",
  lifecycle: "shadow_only",
  verifiedReplacement: false,
  liveRouted: false,
  rendererStrategy:
    "official_pdf_form_filling / overlay (deferred, per-form): Rhode Island court Motion to Expunge or Seal Record / Affidavit forms (District Court DC-33, Superior Court felony Superior-55, Superior Court misdemeanor motion, Family Court misdemeanor motion; revised Feb. 2025); Rule 48(a) automatic sealing and § 12-1.3-5 marijuana expungement are automatic/agency routes; config deferred",
  pathways: Array.isArray(riPack.riPathways) ? riPack.riPathways.map((p) => p.pathway) : [],
  officialForms: Array.isArray(riPack.riOfficialForms)
    ? riPack.riOfficialForms.map((f) => f.formId || f.officialName)
    : [],
  siblingVerifiers: siblingResults
};
fs.writeFileSync(path.join(outputDir, "ri-state-pack-summary.json"), `${JSON.stringify(artifact, null, 2)}\n`);

// --- Report ---

if (failures.length > 0) {
  console.error("Rhode Island state-pack verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Rhode Island state-pack verification PASSED.");
console.log(`  RI state pack exists:          yes`);
console.log(`  Pack exports present:          ${expectedPackExports.length}`);
console.log(`  Pathways:                      ${artifact.pathways.length}`);
console.log(`  Official forms cataloged:      ${artifact.officialForms.length}`);
console.log(`  Renderer strategy:             official_pdf/overlay (config deferred)`);
console.log(`  Expungement + sealing framing: enforced`);
console.log(`  Rhode Island config wired:     no (deferred)`);
console.log(`  Live-routed (selector):        no`);
console.log(`  Lifecycle verified_replacement:no`);
console.log(`  Seals / logos in pack:         no`);
console.log(`  Other-state leakage:           no`);
console.log(`  Mississippi new-engine:        no`);
console.log(`  Forbidden files changed:       no`);
for (const r of siblingResults) console.log(`  Sibling ${r.script.padEnd(28)} ${r.ok ? "PASS" : "FAIL"}`);
console.log(`  Shadow summary:                ${path.join(outputDir, "ri-state-pack-summary.json")}`);

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("Rhode Island state-pack verification FAILED.");
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
