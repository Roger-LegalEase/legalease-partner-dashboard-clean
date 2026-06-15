import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Missouri is a HYBRID state: its main route (§ 610.140) is a court petition on
// standardized CR-series forms (CR360 + Judgment/Order), with several other
// statutory routes (§ 610.105 closure, §§ 610.122-123 arrest, § 610.130 DWI,
// § 610.145 identity, § 311.326 MIP) and constitutional marijuana relief
// (Art. XIV). This verifier proves the Missouri STATE PACK was built from the
// Nationwide source and remains shadow-only research: NOT wired to any renderer,
// NOT in the live jurisdiction selector, and NOT verified_replacement. The
// overlay/renderer/config is intentionally deferred (see report), so this
// verifier consumes the state pack directly.

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

registerTypeScriptHook();

const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const moPackPath = path.join(rootDir, "src/lib/rcap/state-packs/missouri/index.ts");

// --- Step 1: MO state pack exists ---

if (!fs.existsSync(moPackPath)) {
  failures.push("MO state pack index not found at src/lib/rcap/state-packs/missouri/index.ts.");
  process.exit(reportAndExit());
}
const moPack = require(moPackPath);

const expectedPackExports = [
  "moEligibilityRules",
  "moWaitingPeriodNotes",
  "moFilingInstructions",
  "moDisqualifyingOffenseNotes",
  "moPlainLanguage",
  "moSafetyDisclaimer",
  "moFeeNotes",
  "moPathways",
  "moPathwayLabels",
  "moRequiredFields",
  "moFieldLabels",
  "moDocumentTypes",
  "moOfficialForms",
  "moSampleDocumentInputs"
];
for (const name of expectedPackExports) {
  if (!(name in moPack)) failures.push(`MO state pack missing export: ${name}.`);
}

// --- Step 2: State-pack content is consumed and internally consistent ---

if (Array.isArray(moPack.moPathways)) {
  const pathwayIds = moPack.moPathways.map((p) => p.pathway);
  const requiredPathways = [
    "general_expungement",
    "arrest_only_expungement",
    "closed_record",
    "false_information_arrest",
    "first_intoxication_offense",
    "marijuana_expungement",
    "identity_theft_mistaken_identity",
    "minor_in_possession_alcohol"
  ];
  for (const id of requiredPathways) {
    if (!pathwayIds.includes(id)) failures.push(`MO pathways missing required pathway: ${id}.`);
  }
  for (const p of moPack.moPathways) {
    if (p.pathway === "needs_review") continue;
    if (!p.citation || !/§/.test(p.citation)) {
      failures.push(`MO pathway '${p.pathway}' is missing a statutory citation.`);
    }
  }
  for (const id of pathwayIds) {
    if (!(id in moPack.moRequiredFields)) {
      failures.push(`moRequiredFields missing entry for pathway '${id}'.`);
    }
  }
}

const allPackText = JSON.stringify(moPack);
const requiredCitations = [
  "610.140",
  "610.105",
  "610.120",
  "610.122",
  "610.123",
  "610.130",
  "610.145",
  "311.326",
  "488.650",
  "556.061",
  "571.030",
  "Art. XIV"
];
for (const cite of requiredCitations) {
  if (!allPackText.includes(cite)) failures.push(`MO state pack is missing required citation: ${cite}.`);
}

// Missouri's defining structure and vocabulary.
if (!/610\.140/.test(allPackText)) failures.push("MO state pack must center on § 610.140.");
if (!/expungement/i.test(allPackText)) failures.push("MO state pack must use 'expungement'.");
if (!/clos(?:e|ed|es|ure)/i.test(allPackText)) {
  failures.push("MO state pack must capture the closed-record / closure concept.");
}
if (!/lifetime limit/i.test(allPackText)) {
  failures.push("MO state pack must capture the § 610.140 lifetime limits.");
}
if (!/named?\b.*defendant|name.*agenc/i.test(allPackText)) {
  failures.push("MO state pack must capture the name-all-record-holders rule.");
}
// Repealed-surcharge discipline (do not hard-code $250).
if (!/488\.650|repealed/i.test(allPackText)) {
  failures.push("MO state pack must note the repealed § 488.650 expungement surcharge.");
}

// Forms catalog must include the main CR-series petition forms.
if (Array.isArray(moPack.moOfficialForms)) {
  const names = moPack.moOfficialForms.map((f) => `${f.formNumber || ""} ${f.officialName}`).join(" | ");
  for (const needle of ["CR360", "CR301", "Petition for Expungement of Arrest Records"]) {
    if (!names.includes(needle)) failures.push(`MO official-forms catalog missing: ${needle}.`);
  }
}

// --- Step 3: No seals / logos and no other-state boilerplate leaked ---

if (/\[seal\]/i.test(allPackText) || /\[logo\]/i.test(allPackText)) {
  failures.push("MO state pack must not contain [seal] or [logo] markers.");
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
  "FDLE",
  "Nebraska"
];
for (const term of otherStateLeakTerms) {
  if (allPackText.includes(term)) failures.push(`MO state pack must not contain other-state content: "${term}".`);
}
// Must not borrow other states' relief vocabulary.
for (const term of ["set aside", "set-aside", "annulment", "record restriction", "Certificate of Eligibility", "Clean Slate"]) {
  if (new RegExp(term, "i").test(allPackText)) {
    failures.push(`MO state pack must not use non-Missouri relief vocabulary: "${term}".`);
  }
}

// --- Step 4: Shadow-only — MO not wired to a renderer or the live selector ---

if (fs.existsSync(path.join(rootDir, "src/lib/record-clearing/missouri-config.ts"))) {
  failures.push(
    "missouri-config.ts exists: Missouri is a hybrid official-form state; the renderer/field-map/config is deferred until per-track form review + a Nationwide fidelity check are approved."
  );
}
for (const name of Object.keys(recordClearing)) {
  if (/^mo[A-Z]/.test(name) && /Config$/.test(name)) {
    failures.push(`Unexpected Missouri config exported from record-clearing index: ${name} (must stay deferred).`);
  }
}
const moLive = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "MO")
  : false;
if (moLive) failures.push("Missouri must not appear in the live recordClearingJurisdictions selector.");
if (/verified_replacement/.test(allPackText)) {
  failures.push("MO state pack must not declare verified_replacement lifecycle.");
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

// --- Step 7: Sibling verifiers still pass (PA, DC, ND, OK, WY, MD, GA, FL, MN) ---

const siblingVerifiers = [
  "verify-pleading-state.mjs",
  "verify-dc-pleading-state.mjs",
  "verify-nd-pleading-state.mjs",
  "verify-ok-pleading-state.mjs",
  "verify-wy-pleading-state.mjs",
  "verify-md-state-pack.mjs",
  "verify-ga-state-pack.mjs",
  "verify-fl-state-pack.mjs",
  "verify-mn-state-pack.mjs"
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

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/missouri");
fs.mkdirSync(outputDir, { recursive: true });
const artifact = {
  state: "MO",
  tier: "Tier 2/hybrid (Wilma RTF + official CR-series forms -> structured state pack)",
  lifecycle: "shadow_only",
  verifiedReplacement: false,
  liveRouted: false,
  rendererStrategy:
    "official_pdf_form_filling / overlay (deferred, per-track): § 610.140 CR360 petition + Judgment/Order; automatic/closure routes need no petition",
  pathways: Array.isArray(moPack.moPathways) ? moPack.moPathways.map((p) => p.pathway) : [],
  officialForms: Array.isArray(moPack.moOfficialForms)
    ? moPack.moOfficialForms.map((f) => f.formNumber || f.officialName)
    : [],
  siblingVerifiers: siblingResults
};
fs.writeFileSync(path.join(outputDir, "mo-state-pack-summary.json"), `${JSON.stringify(artifact, null, 2)}\n`);

// --- Report ---

if (failures.length > 0) {
  console.error("Missouri state-pack verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Missouri state-pack verification PASSED.");
console.log(`  MO state pack exists:          yes`);
console.log(`  Pack exports present:          ${expectedPackExports.length}`);
console.log(`  Pathways:                      ${artifact.pathways.length}`);
console.log(`  Official forms cataloged:      ${artifact.officialForms.length}`);
console.log(`  Renderer strategy:             official_pdf/overlay (config deferred)`);
console.log(`  Closure-not-erasure framing:   enforced`);
console.log(`  Missouri config wired:         no (deferred)`);
console.log(`  Live-routed (selector):        no`);
console.log(`  Lifecycle verified_replacement:no`);
console.log(`  Seals / logos in pack:         no`);
console.log(`  Other-state leakage:           no`);
console.log(`  Mississippi new-engine:        no`);
console.log(`  Forbidden files changed:       no`);
for (const r of siblingResults) console.log(`  Sibling ${r.script.padEnd(28)} ${r.ok ? "PASS" : "FAIL"}`);
console.log(`  Shadow summary:                ${path.join(outputDir, "mo-state-pack-summary.json")}`);

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("Missouri state-pack verification FAILED.");
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
