import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Florida is a process-heavy CERTIFICATE state: normal court-ordered sealing
// (§ 943.059) and expunction (§ 943.0585) are gated by an FDLE Certificate of
// Eligibility, plus special FDLE routes and automatic sealing. This verifier
// proves the Florida STATE PACK was built from the Nationwide source and remains
// shadow-only research: NOT wired to any renderer, NOT in the live jurisdiction
// selector, and NOT verified_replacement. The renderer/config is intentionally
// deferred (see report), so this verifier consumes the state pack directly.

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

registerTypeScriptHook();

const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const flPackPath = path.join(rootDir, "src/lib/rcap/state-packs/florida/index.ts");

// --- Step 1: FL state pack exists ---

if (!fs.existsSync(flPackPath)) {
  failures.push("FL state pack index not found at src/lib/rcap/state-packs/florida/index.ts.");
  process.exit(reportAndExit());
}
const flPack = require(flPackPath);

const expectedPackExports = [
  "flEligibilityRules",
  "flWaitingPeriodNotes",
  "flFilingInstructions",
  "flDisqualifyingOffenseNotes",
  "flPlainLanguage",
  "flSafetyDisclaimer",
  "flFeeNotes",
  "flPathways",
  "flPathwayLabels",
  "flRequiredFields",
  "flFieldLabels",
  "flDocumentTypes",
  "flOfficialForms",
  "flSampleDocumentInputs"
];
for (const name of expectedPackExports) {
  if (!(name in flPack)) failures.push(`FL state pack missing export: ${name}.`);
}

// --- Step 2: State-pack content is consumed and internally consistent ---

if (Array.isArray(flPack.flPathways)) {
  const pathwayIds = flPack.flPathways.map((p) => p.pathway);
  const requiredPathways = [
    "court_ordered_expunction",
    "court_ordered_sealing",
    "automatic_sealing",
    "human_trafficking_victim_expunction",
    "lawful_self_defense_expunction",
    "juvenile_diversion_expunction",
    "early_juvenile_expunction",
    "administrative_expunction"
  ];
  for (const id of requiredPathways) {
    if (!pathwayIds.includes(id)) failures.push(`FL pathways missing required pathway: ${id}.`);
  }
  for (const p of flPack.flPathways) {
    if (p.pathway === "needs_review") continue;
    if (!p.citation || !/§/.test(p.citation)) {
      failures.push(`FL pathway '${p.pathway}' is missing a statutory citation.`);
    }
  }
  for (const id of pathwayIds) {
    if (!(id in flPack.flRequiredFields)) {
      failures.push(`flRequiredFields missing entry for pathway '${id}'.`);
    }
  }
}

const allPackText = JSON.stringify(flPack);
const requiredCitations = [
  "943.0585",
  "943.059",
  "943.0595",
  "943.0584",
  "943.0583",
  "943.0578",
  "943.0582",
  "943.0515",
  "943.0581"
];
for (const cite of requiredCitations) {
  if (!allPackText.includes(cite)) failures.push(`FL state pack is missing required citation: § ${cite}.`);
}

// Florida's defining gate and vocabulary.
if (!/Certificate of Eligibility/i.test(allPackText)) {
  failures.push("FL state pack must capture the FDLE Certificate of Eligibility gate.");
}
if (!/FDLE/.test(allPackText)) failures.push("FL state pack must reference FDLE.");
if (!/expunction/i.test(allPackText)) {
  failures.push("FL state pack must use Florida's statutory term 'expunction'.");
}
if (!/sealing/i.test(allPackText)) failures.push("FL state pack must address sealing.");
if (!/withhold/i.test(allPackText)) {
  failures.push("FL state pack must capture the withhold-of-adjudication distinction.");
}
if (!/943\.0584/.test(allPackText)) {
  failures.push("FL state pack must capture the § 943.0584 barred-offense list.");
}

// Forms catalog must include the FDLE certificate application and the court petition.
if (Array.isArray(flPack.flOfficialForms)) {
  const names = flPack.flOfficialForms.map((f) => f.formName).join(" | ");
  for (const needle of ["Application for Certificate of Eligibility", "Petition to Seal or Expunge"]) {
    if (!names.includes(needle)) failures.push(`FL official-forms catalog missing: ${needle}.`);
  }
}

// --- Step 3: No seals / logos and no other-state boilerplate leaked ---

if (/\[seal\]/i.test(allPackText) || /\[logo\]/i.test(allPackText)) {
  failures.push("FL state pack must not contain [seal] or [logo] markers.");
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
  "Nebraska"
];
for (const term of otherStateLeakTerms) {
  if (allPackText.includes(term)) failures.push(`FL state pack must not contain other-state content: "${term}".`);
}
// Must not borrow other states' relief vocabulary.
for (const term of ["set aside", "set-aside", "annulment", "record restriction"]) {
  if (new RegExp(term, "i").test(allPackText)) {
    failures.push(`FL state pack must not use non-Florida relief vocabulary: "${term}".`);
  }
}

// --- Step 4: Shadow-only — FL not wired to a renderer or the live selector ---

if (fs.existsSync(path.join(rootDir, "src/lib/record-clearing/florida-config.ts"))) {
  failures.push(
    "florida-config.ts exists: Florida is a certificate/process-guidance state; the renderer/config is deferred until per-track form review + a Nationwide fidelity check are approved."
  );
}
for (const name of Object.keys(recordClearing)) {
  if (/^fl[A-Z]/.test(name) && /Config$/.test(name)) {
    failures.push(`Unexpected Florida config exported from record-clearing index: ${name} (must stay deferred).`);
  }
}
const flLive = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "FL")
  : false;
if (flLive) failures.push("Florida must not appear in the live recordClearingJurisdictions selector.");
if (/verified_replacement/.test(allPackText)) {
  failures.push("FL state pack must not declare verified_replacement lifecycle.");
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

// --- Step 7: Sibling verifiers still pass (PA, DC, ND, OK, WY, MD, GA) ---

const siblingVerifiers = [
  "verify-pleading-state.mjs",
  "verify-dc-pleading-state.mjs",
  "verify-nd-pleading-state.mjs",
  "verify-ok-pleading-state.mjs",
  "verify-wy-pleading-state.mjs",
  "verify-md-state-pack.mjs",
  "verify-ga-state-pack.mjs"
];
const siblingResults = [];
for (const script of siblingVerifiers) {
  const res = spawnSync(process.execPath, [path.join(rootDir, "scripts", script)], {
    cwd: rootDir,
    encoding: "utf8"
  });
  const ok = res.status === 0;
  siblingResults.push({ script, ok });
  if (!ok) failures.push(`Sibling verifier failed: ${script} (exit ${res.status}).`);
}

// --- Step 8: Shadow artifact ---

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/florida");
fs.mkdirSync(outputDir, { recursive: true });
const artifact = {
  state: "FL",
  tier: "Tier 2 (Wilma RTF + official statute/FDLE source -> structured state pack)",
  lifecycle: "shadow_only",
  verifiedReplacement: false,
  liveRouted: false,
  rendererStrategy:
    "state_pack_only (deferred): FDLE Certificate of Eligibility process-guidance gate + future court-petition track",
  pathways: Array.isArray(flPack.flPathways) ? flPack.flPathways.map((p) => p.pathway) : [],
  officialForms: Array.isArray(flPack.flOfficialForms) ? flPack.flOfficialForms.map((f) => f.formName) : [],
  siblingVerifiers: siblingResults
};
fs.writeFileSync(path.join(outputDir, "fl-state-pack-summary.json"), `${JSON.stringify(artifact, null, 2)}\n`);

// --- Report ---

if (failures.length > 0) {
  console.error("Florida state-pack verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Florida state-pack verification PASSED.");
console.log(`  FL state pack exists:          yes`);
console.log(`  Pack exports present:          ${expectedPackExports.length}`);
console.log(`  Pathways:                      ${artifact.pathways.length}`);
console.log(`  Forms cataloged:               ${artifact.officialForms.length}`);
console.log(`  Renderer strategy:             state_pack_only (config deferred)`);
console.log(`  FDLE certificate gate:         captured`);
console.log(`  Florida config wired:          no (deferred)`);
console.log(`  Live-routed (selector):        no`);
console.log(`  Lifecycle verified_replacement:no`);
console.log(`  Seals / logos in pack:         no`);
console.log(`  Other-state leakage:           no`);
console.log(`  Mississippi new-engine:        no`);
console.log(`  Forbidden files changed:       no`);
for (const r of siblingResults) console.log(`  Sibling ${r.script.padEnd(28)} ${r.ok ? "PASS" : "FAIL"}`);
console.log(`  Shadow summary:                ${path.join(outputDir, "fl-state-pack-summary.json")}`);

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("Florida state-pack verification FAILED.");
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
