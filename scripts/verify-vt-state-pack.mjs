import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Vermont is a SEALING-FIRST, expungement-NARROW state after July 1, 2025. Most
// conviction relief is sealing (13 V.S.A. § 7602(c) misdemeanors; § 7602(d) +
// § 7601(4)(B) qualifying felonies; § 7602(e) DUI); adult expungement (§ 7602) is
// limited to conduct that is no longer a crime. Non-conviction sealing, age 18–21
// sealing (§ 7609), under-25 sealing and juvenile sealing (33 V.S.A. § 5119) round
// out the routes. This verifier proves the Vermont STATE PACK was built from the
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
const vtPackPath = path.join(rootDir, "src/lib/rcap/state-packs/vermont/index.ts");

// --- Step 1: VT state pack exists ---

if (!fs.existsSync(vtPackPath)) {
  failures.push("VT state pack index not found at src/lib/rcap/state-packs/vermont/index.ts.");
  process.exit(reportAndExit());
}
const vtPack = require(vtPackPath);

const expectedPackExports = [
  "vtEligibilityRules",
  "vtWaitingPeriodNotes",
  "vtFilingInstructions",
  "vtDisqualifyingOffenseNotes",
  "vtPlainLanguage",
  "vtSafetyDisclaimer",
  "vtFeeNotes",
  "vtPathways",
  "vtPathwayLabels",
  "vtRequiredFields",
  "vtFieldLabels",
  "vtDocumentTypes",
  "vtOfficialForms",
  "vtSampleDocumentInputs"
];
for (const name of expectedPackExports) {
  if (!(name in vtPack)) failures.push(`VT state pack missing export: ${name}.`);
}

// --- Step 2: State-pack content is consumed and internally consistent ---

if (Array.isArray(vtPack.vtPathways)) {
  const pathwayIds = vtPack.vtPathways.map((p) => p.pathway);
  const requiredPathways = [
    "adult_expungement_conduct_no_longer_criminal",
    "misdemeanor_sealing",
    "felony_sealing",
    "dui_sealing",
    "non_conviction_sealing",
    "young_adult_18_21_sealing",
    "under_25_sealing",
    "juvenile_sealing"
  ];
  for (const id of requiredPathways) {
    if (!pathwayIds.includes(id)) failures.push(`VT pathways missing required pathway: ${id}.`);
  }
  for (const p of vtPack.vtPathways) {
    if (!p.citation || !/V\.S\.A\./.test(p.citation)) {
      failures.push(`VT pathway '${p.pathway}' is missing a V.S.A. citation.`);
    }
  }
  for (const id of pathwayIds) {
    if (!(id in vtPack.vtRequiredFields)) {
      failures.push(`vtRequiredFields missing entry for pathway '${id}'.`);
    }
  }
}

const allPackText = JSON.stringify(vtPack);
const requiredCitations = [
  "13 V.S.A.",
  "§ 7601",
  "§ 7602",
  "§ 7609",
  "33 V.S.A.",
  "§ 5119",
  "23 V.S.A."
];
for (const cite of requiredCitations) {
  if (!allPackText.includes(cite)) failures.push(`VT state pack is missing required citation: ${cite}.`);
}

// Vermont's defining structure and vocabulary.
const requiredVocabulary = [
  "sealing",
  "expungement",
  "qualifying crime",
  "interests of justice",
  "stipulate"
];
for (const term of requiredVocabulary) {
  if (!new RegExp(term, "i").test(allPackText)) {
    failures.push(`VT state pack must use Vermont vocabulary: "${term}".`);
  }
}
if (!/sealing-first/i.test(allPackText)) {
  failures.push("VT state pack must capture Vermont's post-2025 sealing-first posture.");
}
if (!/not destroyed/i.test(allPackText)) {
  failures.push("VT state pack must capture that a sealed record is not destroyed.");
}
if (!/July 1, 2025/.test(allPackText)) {
  failures.push("VT state pack must capture the July 1, 2025 law change.");
}
if (!/NO CRIMINAL RECORD EXISTS/.test(allPackText)) {
  failures.push("VT state pack must capture the 'NO CRIMINAL RECORD EXISTS' public-response rule.");
}

// Forms catalog must include the core Vermont Judiciary expungement/sealing forms.
if (Array.isArray(vtPack.vtOfficialForms)) {
  const names = vtPack.vtOfficialForms.map((f) => `${f.formId || ""} ${f.officialName}`).join(" | ");
  for (const needle of ["200-00129", "200-00132", "200-00132A", "400-00171"]) {
    if (!names.includes(needle)) failures.push(`VT official-forms catalog missing: ${needle}.`);
  }
}

// --- Step 3: No seals / logos and no other-state boilerplate leaked ---

if (/\[seal\]/i.test(allPackText) || /\[logo\]/i.test(allPackText)) {
  failures.push("VT state pack must not contain [seal] or [logo] markers.");
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
  // Sibling new-state signatures (VT must not leak into/from UT, WA, WV, WI).
  "Utah Code",
  "BCI",
  "RCW ",
  "CrRLJ",
  "W. Va. Code",
  "SCA-C",
  "Wis. Stat.",
  "DOJ-CIB",
  "CR-266"
];
for (const term of otherStateLeakTerms) {
  if (allPackText.includes(term)) failures.push(`VT state pack must not contain other-state content: "${term}".`);
}
// Must not borrow other states' relief vocabulary. Vermont legitimately uses
// "sealing", "expungement", "annuls/annulment of the record", and "stipulate", so
// those concepts are fine; non-Vermont relief labels are banned.
for (const term of ["set-aside", "record restriction", "Clean Slate", "vacatur", "Certificate of Eligibility"]) {
  if (new RegExp(term, "i").test(allPackText)) {
    failures.push(`VT state pack must not use non-Vermont relief vocabulary: "${term}".`);
  }
}

// --- Step 4: Shadow-only — VT not wired to a renderer or the live selector ---

if (fs.existsSync(path.join(rootDir, "src/lib/record-clearing/vermont-config.ts"))) {
  failures.push(
    "vermont-config.ts exists: Vermont uses official Vermont Judiciary forms; the renderer/field-map/config is deferred until per-form review + a Nationwide fidelity check are approved."
  );
}
for (const name of Object.keys(recordClearing)) {
  if (/^vt[A-Z]/.test(name) && /Config$/.test(name)) {
    failures.push(`Unexpected Vermont config exported from record-clearing index: ${name} (must stay deferred).`);
  }
}
const vtLive = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "VT")
  : false;
if (vtLive) failures.push("Vermont must not appear in the live recordClearingJurisdictions selector.");
if (/verified_replacement/.test(allPackText)) {
  failures.push("VT state pack must not declare verified_replacement lifecycle.");
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

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/vermont");
fs.mkdirSync(outputDir, { recursive: true });
const artifact = {
  state: "VT",
  tier: "Tier 2 (Wilma reference + official Vermont Judiciary expungement/sealing forms -> structured state pack)",
  lifecycle: "shadow_only",
  verifiedReplacement: false,
  liveRouted: false,
  rendererStrategy:
    "official_pdf_form_filling / overlay (deferred, per-form): Vermont Judiciary petition/stipulation/response forms (200-00129 expunge, 200-00130 seal, 200-00132/200-00132A stipulations, 200-00131 response, 200-00631 special index, 400-00171 juvenile diversion); config deferred",
  pathways: Array.isArray(vtPack.vtPathways) ? vtPack.vtPathways.map((p) => p.pathway) : [],
  officialForms: Array.isArray(vtPack.vtOfficialForms)
    ? vtPack.vtOfficialForms.map((f) => f.formId || f.officialName)
    : [],
  siblingVerifiers: siblingResults
};
fs.writeFileSync(path.join(outputDir, "vt-state-pack-summary.json"), `${JSON.stringify(artifact, null, 2)}\n`);

// --- Report ---

if (failures.length > 0) {
  console.error("Vermont state-pack verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Vermont state-pack verification PASSED.");
console.log(`  VT state pack exists:          yes`);
console.log(`  Pack exports present:          ${expectedPackExports.length}`);
console.log(`  Pathways:                      ${artifact.pathways.length}`);
console.log(`  Official forms cataloged:      ${artifact.officialForms.length}`);
console.log(`  Renderer strategy:             official_pdf/overlay (config deferred)`);
console.log(`  Sealing-first (post-2025):     enforced`);
console.log(`  Sealed-not-destroyed framing:  enforced`);
console.log(`  Vermont config wired:          no (deferred)`);
console.log(`  Live-routed (selector):        no`);
console.log(`  Lifecycle verified_replacement:no`);
console.log(`  Seals / logos in pack:         no`);
console.log(`  Other-state leakage:           no`);
console.log(`  Mississippi new-engine:        no`);
console.log(`  Forbidden files changed:       no`);
for (const r of siblingResults) console.log(`  Sibling ${r.script.padEnd(28)} ${r.ok ? "PASS" : "FAIL"}`);
console.log(`  Shadow summary:                ${path.join(outputDir, "vt-state-pack-summary.json")}`);

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("Vermont state-pack verification FAILED.");
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
