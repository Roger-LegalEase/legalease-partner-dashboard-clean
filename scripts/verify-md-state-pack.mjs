import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Maryland is an official-form state (mandatory CC-DC-CR-072 family, DC-CR-071,
// CC-DC-CR-148). This verifier proves the Maryland Tier 2 STATE PACK was built
// from the Nationwide/Wilma source and remains shadow-only research: it is NOT
// wired to any renderer, NOT in the live jurisdiction selector, and NOT
// verified_replacement. The CustomPleadingRenderer config is intentionally
// deferred (see report), so this verifier consumes the state pack directly.

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

registerTypeScriptHook();

const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const mdPackPath = path.join(rootDir, "src/lib/rcap/state-packs/maryland/index.ts");

// --- Step 1: MD state pack exists ---

if (!fs.existsSync(mdPackPath)) {
  failures.push("MD state pack index not found at src/lib/rcap/state-packs/maryland/index.ts.");
  process.exit(reportAndExit());
}
const mdPack = require(mdPackPath);

const expectedPackExports = [
  "mdEligibilityRules",
  "mdWaitingPeriodNotes",
  "mdFilingInstructions",
  "mdDisqualifyingOffenseNotes",
  "mdPlainLanguage",
  "mdSafetyDisclaimer",
  "mdFeeNotes",
  "mdPathways",
  "mdPathwayLabels",
  "mdRequiredFields",
  "mdFieldLabels",
  "mdDocumentTypes",
  "mdOfficialForms",
  "mdSampleDocumentInputs"
];
for (const name of expectedPackExports) {
  if (!(name in mdPack)) failures.push(`MD state pack missing export: ${name}.`);
}

// --- Step 2: State-pack content is consumed and internally consistent ---

// Pathways cover the core Maryland remedies and carry citations.
if (Array.isArray(mdPack.mdPathways)) {
  const pathwayIds = mdPack.mdPathways.map((p) => p.pathway);
  const requiredPathways = [
    "adult_nonconviction_expungement",
    "automatic_expungement",
    "police_record_expungement",
    "adult_conviction_expungement",
    "cannabis_expungement",
    "second_chance_shielding",
    "juvenile_expungement"
  ];
  for (const id of requiredPathways) {
    if (!pathwayIds.includes(id)) failures.push(`MD pathways missing required pathway: ${id}.`);
  }
  // Every non-needs_review pathway must carry a Maryland statutory citation.
  for (const p of mdPack.mdPathways) {
    if (p.pathway === "needs_review") continue;
    if (!p.citation || !/§/.test(p.citation)) {
      failures.push(`MD pathway '${p.pathway}' is missing a statutory citation.`);
    }
  }
  // mdRequiredFields must have an entry for every pathway.
  for (const id of pathwayIds) {
    if (!(id in mdPack.mdRequiredFields)) {
      failures.push(`mdRequiredFields missing entry for pathway '${id}'.`);
    }
  }
}

// Core Maryland citations from the Nationwide source must be present in the pack.
const allPackText = JSON.stringify(mdPack);
const requiredCitations = ["10-105", "10-105.1", "10-107", "10-110", "10-103", "3-8A-27.1"];
for (const cite of requiredCitations) {
  if (!allPackText.includes(cite)) failures.push(`MD state pack is missing required citation: § ${cite}.`);
}
// The unit rule is Maryland's defining trap and must be represented.
if (!/unit rule/i.test(allPackText)) failures.push("MD state pack must describe the § 10-107 unit rule.");
// Shielding must be distinguished from expungement.
if (!/shielding/i.test(allPackText)) failures.push("MD state pack must address Second Chance Act shielding.");

// Official forms catalog must list the mandatory CC-DC-CR-072 family.
if (Array.isArray(mdPack.mdOfficialForms)) {
  const formNumbers = mdPack.mdOfficialForms.map((f) => f.formNumber).join(" ");
  for (const form of ["CC-DC-CR-072A", "CC-DC-CR-072B", "CC-DC-CR-072C", "CC-DC-CR-072D", "DC-CR-071", "CC-DC-CR-148"]) {
    if (!formNumbers.includes(form)) failures.push(`MD official-forms catalog missing form: ${form}.`);
  }
}

// --- Step 3: No seals / logos and no other-state boilerplate leaked into the pack ---

if (/\[seal\]/i.test(allPackText) || /\[logo\]/i.test(allPackText)) {
  failures.push("MD state pack must not contain [seal] or [logo] markers.");
}
const otherStateLeakTerms = [
  "Commonwealth of Pennsylvania",
  "Court of Common Pleas",
  "District of Columbia",
  "North Dakota",
  "STATE OF OKLAHOMA",
  "State of Wyoming",
  "Nebraska"
];
for (const term of otherStateLeakTerms) {
  if (allPackText.includes(term)) failures.push(`MD state pack must not contain other-state content: "${term}".`);
}
// Maryland's statutory word is "expungement" (and shielding); it must NOT borrow
// other states' relief vocabulary.
for (const term of ["set aside", "set-aside", "annulment", "vacatur of conviction"]) {
  if (new RegExp(term, "i").test(allPackText)) {
    failures.push(`MD state pack must not use non-Maryland relief vocabulary: "${term}".`);
  }
}

// --- Step 4: Shadow-only — MD not wired to a renderer or the live selector ---

// The Maryland renderer/config is intentionally deferred (official-form state),
// so there must be NO Maryland config in the record-clearing module yet.
if (fs.existsSync(path.join(rootDir, "src/lib/record-clearing/maryland-config.ts"))) {
  failures.push(
    "maryland-config.ts exists: Maryland output must stay shadow-only and the renderer/config is deferred until a Nationwide fidelity check + official-form strategy is approved."
  );
}
for (const name of Object.keys(recordClearing)) {
  if (/^md[A-Z]/.test(name) && /Config$/.test(name)) {
    failures.push(`Unexpected Maryland config exported from record-clearing index: ${name} (must stay deferred).`);
  }
}

// MD must NOT be in the live jurisdiction selector.
const mdLive = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "MD")
  : false;
if (mdLive) failures.push("Maryland must not appear in the live recordClearingJurisdictions selector.");

// Lifecycle must NOT be verified_replacement anywhere in the Maryland pack.
if (/verified_replacement/.test(allPackText)) {
  failures.push("MD state pack must not declare verified_replacement lifecycle.");
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

// --- Step 7: Sibling pleading-state verifiers still pass ---

const siblingVerifiers = [
  "verify-pleading-state.mjs",
  "verify-dc-pleading-state.mjs",
  "verify-nd-pleading-state.mjs",
  "verify-ok-pleading-state.mjs",
  "verify-wy-pleading-state.mjs"
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

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/maryland");
fs.mkdirSync(outputDir, { recursive: true });
const artifact = {
  state: "MD",
  tier: "Tier 2 (Wilma RTF → structured state pack)",
  lifecycle: "shadow_only",
  verifiedReplacement: false,
  liveRouted: false,
  rendererStrategy: "official_pdf_form_filling (CustomPleadingRenderer deferred)",
  pathways: Array.isArray(mdPack.mdPathways) ? mdPack.mdPathways.map((p) => p.pathway) : [],
  officialForms: Array.isArray(mdPack.mdOfficialForms)
    ? mdPack.mdOfficialForms.map((f) => f.formNumber)
    : [],
  siblingVerifiers: siblingResults
};
fs.writeFileSync(path.join(outputDir, "md-state-pack-summary.json"), `${JSON.stringify(artifact, null, 2)}\n`);

// --- Report ---

if (failures.length > 0) {
  console.error("Maryland state-pack verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Maryland state-pack verification PASSED.");
console.log(`  MD state pack exists:          yes`);
console.log(`  Pack exports present:          ${expectedPackExports.length}`);
console.log(`  Pathways:                      ${artifact.pathways.length}`);
console.log(`  Official forms cataloged:      ${artifact.officialForms.length}`);
console.log(`  Renderer strategy:             ${artifact.rendererStrategy}`);
console.log(`  Maryland config wired:         no (deferred)`);
console.log(`  Live-routed (selector):        no`);
console.log(`  Lifecycle verified_replacement:no`);
console.log(`  Seals / logos in pack:         no`);
console.log(`  Other-state leakage:           no`);
console.log(`  Mississippi new-engine:        no`);
console.log(`  Forbidden files changed:       no`);
for (const r of siblingResults) console.log(`  Sibling ${r.script.padEnd(28)} ${r.ok ? "PASS" : "FAIL"}`);
console.log(`  Shadow summary:                ${path.join(outputDir, "md-state-pack-summary.json")}`);

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("Maryland state-pack verification FAILED.");
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
