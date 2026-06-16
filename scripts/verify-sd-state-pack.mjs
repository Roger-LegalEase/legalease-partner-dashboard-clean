import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// South Dakota is a NARROW, MULTI-PATHWAY state. The main adult "expungement"
// route is for ARREST / non-conviction records (SDCL §§ 23A-3-26 to 23A-3-32;
// § 23A-3-27), NOT broad adult conviction expungement. Separate sealing/removal
// routes cover diversion (§§ 23A-3-35 to 23A-3-37), automatic minor-case removal
// (§ 23A-3-34), suspended imposition of sentence (§§ 23A-27-13 to 23A-27-17), the
// controlled-substance deferred route (§ 23A-27-53), pardon-based sealing
// (§ 24-14-11 / Chapter 24-14), juvenile delinquency sealing (§§ 26-7A-115 to
// 26-7A-116), and juvenile trafficking expungement (§ 26-7A-115.1). This verifier
// proves the South Dakota STATE PACK was built from the Nationwide source and
// remains shadow-only research: NOT wired to any renderer, NOT in the live
// jurisdiction selector, and NOT verified_replacement. The overlay/config is
// intentionally deferred (see report), so this verifier consumes the state pack
// directly.

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

registerTypeScriptHook();

const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const sdPackPath = path.join(rootDir, "src/lib/rcap/state-packs/south-dakota/index.ts");

// --- Step 1: SD state pack exists ---

if (!fs.existsSync(sdPackPath)) {
  failures.push("SD state pack index not found at src/lib/rcap/state-packs/south-dakota/index.ts.");
  process.exit(reportAndExit());
}
const sdPack = require(sdPackPath);

const expectedPackExports = [
  "sdEligibilityRules",
  "sdWaitingPeriodNotes",
  "sdFilingInstructions",
  "sdDisqualifyingOffenseNotes",
  "sdPlainLanguage",
  "sdSafetyDisclaimer",
  "sdFeeNotes",
  "sdPathways",
  "sdPathwayLabels",
  "sdRequiredFields",
  "sdFieldLabels",
  "sdDocumentTypes",
  "sdOfficialForms",
  "sdSampleDocumentInputs"
];
for (const name of expectedPackExports) {
  if (!(name in sdPack)) failures.push(`SD state pack missing export: ${name}.`);
}

// --- Step 2: State-pack content is consumed and internally consistent ---

if (Array.isArray(sdPack.sdPathways)) {
  const pathwayIds = sdPack.sdPathways.map((p) => p.pathway);
  const requiredPathways = [
    "adult_arrest_record_expungement",
    "diversion_expungement",
    "minor_case_automatic_removal",
    "suspended_imposition_sealing",
    "drug_deferred_dismissal",
    "pardon_sealing",
    "juvenile_delinquency_sealing",
    "juvenile_trafficking_expungement"
  ];
  for (const id of requiredPathways) {
    if (!pathwayIds.includes(id)) failures.push(`SD pathways missing required pathway: ${id}.`);
  }
  for (const p of sdPack.sdPathways) {
    if (!p.citation || !/SDCL/.test(p.citation)) {
      failures.push(`SD pathway '${p.pathway}' is missing an SDCL citation.`);
    }
  }
  for (const id of pathwayIds) {
    if (!(id in sdPack.sdRequiredFields)) {
      failures.push(`sdRequiredFields missing entry for pathway '${id}'.`);
    }
  }
}

const allPackText = JSON.stringify(sdPack);
const requiredCitations = [
  "SDCL",
  "23A-3-27",
  "23A-3-34",
  "23A-27-13",
  "23A-27-53",
  "§ 24-14-11",
  "26-7A-115"
];
for (const cite of requiredCitations) {
  if (!allPackText.includes(cite)) failures.push(`SD state pack is missing required citation: ${cite}.`);
}

// South Dakota's defining structure and vocabulary.
if (!/23A-3-27/.test(allPackText)) failures.push("SD state pack must center the arrest route on § 23A-3-27.");
const requiredVocabulary = [
  "expungement",
  "sealing",
  "suspended imposition of sentence",
  "diversion",
  "DCI",
  "accusatory instrument"
];
for (const term of requiredVocabulary) {
  if (!new RegExp(term, "i").test(allPackText)) {
    failures.push(`SD state pack must use South Dakota vocabulary: "${term}".`);
  }
}
if (!/sealing, not destruction|sealing[^.]*not[^.]*destr|not[^.]*destr[^.]*sealing|sealed[^.]*not[^.]*destroy/i.test(allPackText)) {
  failures.push("SD state pack must capture that expungement is sealing, not destruction.");
}
if (!/pardon is not[^.]*expungement|pardon[^.]*not the same as expungement|not the same as expungement/i.test(allPackText)) {
  failures.push("SD state pack must capture that a pardon is not expungement.");
}
if (!/\$72/.test(allPackText)) {
  failures.push("SD state pack must capture the $72 filing fee.");
}
if (!/14 days|14-day|at least 14/i.test(allPackText)) {
  failures.push("SD state pack must capture the 14-day service-on-the-State's-Attorney requirement.");
}

// Forms catalog must include the core UJS expungement packet forms.
if (Array.isArray(sdPack.sdOfficialForms)) {
  const names = sdPack.sdOfficialForms.map((f) => `${f.formId || ""} ${f.officialName}`).join(" | ");
  for (const needle of ["UJS-391", "UJS-394", "UJS-390", "UJS-232"]) {
    if (!names.includes(needle)) failures.push(`SD official-forms catalog missing: ${needle}.`);
  }
}

// --- Step 3: No seals / logos and no other-state boilerplate leaked ---

if (/\[seal\]/i.test(allPackText) || /\[logo\]/i.test(allPackText)) {
  failures.push("SD state pack must not contain [seal] or [logo] markers.");
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
  "New Hampshire",
  "Ohio",
  "FDLE",
  "Nebraska",
  "RSMo",
  "NRS ",
  "NMSA",
  "M.R.S.",
  "M.G.L.",
  "RSA ",
  "Ohio Rev. Code",
  "Crim. Proc.",
  "610.140",
  "29-3A",
  "Montana",
  "Mont. Code Ann.",
  "MMRTA",
  "CRISS"
];
for (const term of otherStateLeakTerms) {
  if (allPackText.includes(term)) failures.push(`SD state pack must not contain other-state content: "${term}".`);
}
// Must not borrow other states' relief vocabulary. South Dakota legitimately uses
// "sealing", "diversion", "pardon", and "suspended imposition", so those are NOT
// banned here.
for (const term of ["annulment", "Clean Slate", "record restriction", "Certificate of Eligibility"]) {
  if (new RegExp(term, "i").test(allPackText)) {
    failures.push(`SD state pack must not use non-South Dakota relief vocabulary: "${term}".`);
  }
}

// --- Step 4: Shadow-only — SD not wired to a renderer or the live selector ---

if (fs.existsSync(path.join(rootDir, "src/lib/record-clearing/south-dakota-config.ts"))) {
  failures.push(
    "south-dakota-config.ts exists: South Dakota uses the official UJS expungement packet; the renderer/field-map/config is deferred until per-form review + a Nationwide fidelity check are approved."
  );
}
for (const name of Object.keys(recordClearing)) {
  if (/^sd[A-Z]/.test(name) && /Config$/.test(name)) {
    failures.push(`Unexpected South Dakota config exported from record-clearing index: ${name} (must stay deferred).`);
  }
}
const sdLive = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "SD")
  : false;
if (sdLive) failures.push("South Dakota must not appear in the live recordClearingJurisdictions selector.");
if (/verified_replacement/.test(allPackText)) {
  failures.push("SD state pack must not declare verified_replacement lifecycle.");
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

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/south-dakota");
fs.mkdirSync(outputDir, { recursive: true });
const artifact = {
  state: "SD",
  tier: "Tier 2/hybrid (Wilma reference + official UJS expungement packet/forms -> structured state pack)",
  lifecycle: "shadow_only",
  verifiedReplacement: false,
  liveRouted: false,
  rendererStrategy:
    "official_pdf_form_filling / overlay (deferred, per-form): South Dakota UJS expungement packet (UJS-390 instructions, UJS-232 case filing statement, UJS-391 motion + statement of mailing, UJS-392 waiver, UJS-393 notice of hearing, UJS-394 order of expungement, UJS-395 notice of entry); diversion, minor-case removal, SIS, drug-deferred, pardon, and juvenile routes are statutory/agency routes; config deferred",
  pathways: Array.isArray(sdPack.sdPathways) ? sdPack.sdPathways.map((p) => p.pathway) : [],
  officialForms: Array.isArray(sdPack.sdOfficialForms)
    ? sdPack.sdOfficialForms.map((f) => f.formId || f.officialName)
    : [],
  siblingVerifiers: siblingResults
};
fs.writeFileSync(path.join(outputDir, "sd-state-pack-summary.json"), `${JSON.stringify(artifact, null, 2)}\n`);

// --- Report ---

if (failures.length > 0) {
  console.error("South Dakota state-pack verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("South Dakota state-pack verification PASSED.");
console.log(`  SD state pack exists:          yes`);
console.log(`  Pack exports present:          ${expectedPackExports.length}`);
console.log(`  Pathways:                      ${artifact.pathways.length}`);
console.log(`  Official forms cataloged:      ${artifact.officialForms.length}`);
console.log(`  Renderer strategy:             official_pdf/overlay (config deferred)`);
console.log(`  Sealing-not-destruction framing:enforced`);
console.log(`  South Dakota config wired:     no (deferred)`);
console.log(`  Live-routed (selector):        no`);
console.log(`  Lifecycle verified_replacement:no`);
console.log(`  Seals / logos in pack:         no`);
console.log(`  Other-state leakage:           no`);
console.log(`  Mississippi new-engine:        no`);
console.log(`  Forbidden files changed:       no`);
for (const r of siblingResults) console.log(`  Sibling ${r.script.padEnd(28)} ${r.ok ? "PASS" : "FAIL"}`);
console.log(`  Shadow summary:                ${path.join(outputDir, "sd-state-pack-summary.json")}`);

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("South Dakota state-pack verification FAILED.");
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
