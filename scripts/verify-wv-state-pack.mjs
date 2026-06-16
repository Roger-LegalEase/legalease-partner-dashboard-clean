import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// West Virginia is a MULTI-ROUTE expungement state under the West Virginia Code.
// Routes: no-conviction expungement (acquittal/dismissal/diversion/deferred
// adjudication, § 61-11-25), misdemeanor and nonviolent-felony conviction
// expungement (§ 61-11-26), the accelerated treatment/job-readiness route
// (§ 61-11-26a), the CDL/DUI limit (§ 61-11-26b), first-offense drug-possession
// conditional discharge (§ 60A-4-407), pardon-based expungement (§ 5-1-16a),
// trafficking-victim vacatur/expungement (§ 61-14-9), and juvenile confidentiality
// (§ 49-5-104). This verifier proves the West Virginia STATE PACK was built from the
// Nationwide source and remains shadow-only research: NOT wired to any renderer,
// NOT in the live jurisdiction selector, and NOT verified_replacement. The overlay/
// config is intentionally deferred (see report), so this verifier consumes the
// state pack directly.

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

registerTypeScriptHook();

const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const wvPackPath = path.join(rootDir, "src/lib/rcap/state-packs/west-virginia/index.ts");

// --- Step 1: WV state pack exists ---

if (!fs.existsSync(wvPackPath)) {
  failures.push("WV state pack index not found at src/lib/rcap/state-packs/west-virginia/index.ts.");
  process.exit(reportAndExit());
}
const wvPack = require(wvPackPath);

const expectedPackExports = [
  "wvEligibilityRules",
  "wvWaitingPeriodNotes",
  "wvFilingInstructions",
  "wvDisqualifyingOffenseNotes",
  "wvPlainLanguage",
  "wvSafetyDisclaimer",
  "wvFeeNotes",
  "wvPathways",
  "wvPathwayLabels",
  "wvRequiredFields",
  "wvFieldLabels",
  "wvDocumentTypes",
  "wvOfficialForms",
  "wvSampleDocumentInputs"
];
for (const name of expectedPackExports) {
  if (!(name in wvPack)) failures.push(`WV state pack missing export: ${name}.`);
}

// --- Step 2: State-pack content is consumed and internally consistent ---

if (Array.isArray(wvPack.wvPathways)) {
  const pathwayIds = wvPack.wvPathways.map((p) => p.pathway);
  const requiredPathways = [
    "non_conviction_acquittal_dismissal_expungement",
    "pretrial_diversion_deferred_expungement",
    "misdemeanor_conviction_expungement",
    "nonviolent_felony_conviction_expungement",
    "accelerated_treatment_job_readiness_expungement",
    "first_offense_drug_possession_conditional_discharge",
    "pardon_based_expungement",
    "trafficking_victim_vacatur_expungement",
    "juvenile_confidentiality_sealing"
  ];
  for (const id of requiredPathways) {
    if (!pathwayIds.includes(id)) failures.push(`WV pathways missing required pathway: ${id}.`);
  }
  for (const p of wvPack.wvPathways) {
    if (!p.citation || !/W\. Va\. Code/.test(p.citation)) {
      failures.push(`WV pathway '${p.pathway}' is missing a W. Va. Code citation.`);
    }
  }
  for (const id of pathwayIds) {
    if (!(id in wvPack.wvRequiredFields)) {
      failures.push(`wvRequiredFields missing entry for pathway '${id}'.`);
    }
  }
}

const allPackText = JSON.stringify(wvPack);
const requiredCitations = [
  "W. Va. Code",
  "§ 61-11-25",
  "§ 61-11-26",
  "§ 61-11-26a",
  "§ 61-11-26b",
  "§ 60A-4-407",
  "§ 5-1-16a",
  "§ 61-14-9",
  "§ 49-5-104"
];
for (const cite of requiredCitations) {
  if (!allPackText.includes(cite)) failures.push(`WV state pack is missing required citation: ${cite}.`);
}

// West Virginia's defining structure and vocabulary.
const requiredVocabulary = [
  "expungement",
  "sealing",
  "pretrial diversion",
  "deferred adjudication",
  "conditional discharge",
  "nonviolent felony",
  "clear and convincing"
];
for (const term of requiredVocabulary) {
  if (!new RegExp(term, "i").test(allPackText)) {
    failures.push(`WV state pack must use West Virginia vocabulary: "${term}".`);
  }
}
if (!/not a magic erase button/i.test(allPackText)) {
  failures.push("WV state pack must capture that expungement is not a 'magic erase button'.");
}
if (!/only obtain expungement relief under[\s\S]{0,80}once/i.test(allPackText)) {
  failures.push("WV state pack must capture the § 61-11-26 / § 61-11-26a one-time-use rule.");
}
if (!/\$100/.test(allPackText)) {
  failures.push("WV state pack must capture the $100 State Police processing fee.");
}

// Forms catalog must include the core West Virginia Judiciary SCA-C expungement forms.
if (Array.isArray(wvPack.wvOfficialForms)) {
  const names = wvPack.wvOfficialForms.map((f) => `${f.formId || ""} ${f.officialName}`).join(" | ");
  for (const needle of ["SCA-C900", "SCA-C903", "SCA-C906", "SCA-C907"]) {
    if (!names.includes(needle)) failures.push(`WV official-forms catalog missing: ${needle}.`);
  }
}

// --- Step 3: No seals / logos and no other-state boilerplate leaked ---

if (/\[seal\]/i.test(allPackText) || /\[logo\]/i.test(allPackText)) {
  failures.push("WV state pack must not contain [seal] or [logo] markers.");
}
// NOTE: "Virginia" is intentionally NOT a banned token because "West Virginia"
// legitimately contains it. Other-state signatures are banned by their distinctive
// citation/agency tokens.
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
  "Mississippi",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "SDCL",
  "RSMo",
  "NRS ",
  "NMSA",
  "M.R.S.",
  "M.G.L.",
  "RSA ",
  "Ohio Rev. Code",
  "610.140",
  "Mont. Code Ann.",
  "Montana",
  // Sibling new-state signatures (WV must not leak into/from UT, VT, WA, WI).
  "Utah Code",
  "BCI",
  "V.S.A.",
  "VCIC",
  "RCW ",
  "CrRLJ",
  "Wis. Stat.",
  "DOJ-CIB",
  "CR-266"
];
for (const term of otherStateLeakTerms) {
  if (allPackText.includes(term)) failures.push(`WV state pack must not contain other-state content: "${term}".`);
}
// Must not borrow other states' relief vocabulary. West Virginia legitimately uses
// "expungement", "sealing", "vacatur" (trafficking), "conditional discharge",
// "deferred adjudication", and "pardon"; only clearly non-WV relief labels are
// banned.
for (const term of ["annulment", "record restriction", "Certificate of Eligibility", "Clean Slate", "set-aside"]) {
  if (new RegExp(term, "i").test(allPackText)) {
    failures.push(`WV state pack must not use non-West-Virginia relief vocabulary: "${term}".`);
  }
}

// --- Step 4: Shadow-only — WV not wired to a renderer or the live selector ---

if (fs.existsSync(path.join(rootDir, "src/lib/record-clearing/west-virginia-config.ts"))) {
  failures.push(
    "west-virginia-config.ts exists: West Virginia uses official West Virginia Judiciary forms; the renderer/field-map/config is deferred until per-form review + a Nationwide fidelity check are approved."
  );
}
for (const name of Object.keys(recordClearing)) {
  if (/^wv[A-Z]/.test(name) && /Config$/.test(name)) {
    failures.push(`Unexpected West Virginia config exported from record-clearing index: ${name} (must stay deferred).`);
  }
}
const wvLive = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "WV")
  : false;
if (wvLive) failures.push("West Virginia must not appear in the live recordClearingJurisdictions selector.");
if (/verified_replacement/.test(allPackText)) {
  failures.push("WV state pack must not declare verified_replacement lifecycle.");
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

// --- Step 7: Sibling verifiers still pass (21 established baseline) ---

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
  "verify-oh-state-pack.mjs",
  "verify-ri-state-pack.mjs",
  "verify-sc-state-pack.mjs",
  "verify-sd-state-pack.mjs"
];
const siblingResults = [];
// Recursion guard. When this verifier is itself spawned by another verifier it
// runs with RCAP_VERIFIER_CHILD=1; in that case it still performs all of its own
// real checks above but MUST NOT re-run its own sibling loop -- otherwise each
// sibling would recursively spawn its own siblings and fan out exponentially. A
// top-level run (flag unset) spawns each sibling exactly once, passing the flag
// down, so the child's own sibling loop is skipped.
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

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/west-virginia");
fs.mkdirSync(outputDir, { recursive: true });
const artifact = {
  state: "WV",
  tier: "Tier 2 (Wilma reference + official West Virginia Judiciary SCA-C expungement forms -> structured state pack)",
  lifecycle: "shadow_only",
  verifiedReplacement: false,
  liveRouted: false,
  rendererStrategy:
    "official_pdf_form_filling / overlay (deferred, per-form): West Virginia Judiciary SCA-C expungement forms (SCA-C900 instructions, SCA-C903 acquittal/dismissal motion, SCA-C906 misdemeanor petition, SCA-C907 felony petition, SCA-C912 victim opposition); accelerated, conditional-discharge, pardon, trafficking-victim, and juvenile routes are statutory/court processes; config deferred",
  pathways: Array.isArray(wvPack.wvPathways) ? wvPack.wvPathways.map((p) => p.pathway) : [],
  officialForms: Array.isArray(wvPack.wvOfficialForms)
    ? wvPack.wvOfficialForms.map((f) => f.formId || f.officialName)
    : [],
  siblingVerifiers: siblingResults
};
fs.writeFileSync(path.join(outputDir, "wv-state-pack-summary.json"), `${JSON.stringify(artifact, null, 2)}\n`);

// --- Report ---

if (failures.length > 0) {
  console.error("West Virginia state-pack verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("West Virginia state-pack verification PASSED.");
console.log(`  WV state pack exists:          yes`);
console.log(`  Pack exports present:          ${expectedPackExports.length}`);
console.log(`  Pathways:                      ${artifact.pathways.length}`);
console.log(`  Official forms cataloged:      ${artifact.officialForms.length}`);
console.log(`  Renderer strategy:             official_pdf/overlay (config deferred)`);
console.log(`  Not-magic-erase framing:       enforced`);
console.log(`  One-time-use rule:             enforced`);
console.log(`  West Virginia config wired:    no (deferred)`);
console.log(`  Live-routed (selector):        no`);
console.log(`  Lifecycle verified_replacement:no`);
console.log(`  Seals / logos in pack:         no`);
console.log(`  Other-state leakage:           no`);
console.log(`  Mississippi new-engine:        no`);
console.log(`  Forbidden files changed:       no`);
for (const r of siblingResults) console.log(`  Sibling ${r.script.padEnd(28)} ${r.ok ? "PASS" : "FAIL"}`);
console.log(`  Shadow summary:                ${path.join(outputDir, "wv-state-pack-summary.json")}`);

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("West Virginia state-pack verification FAILED.");
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
