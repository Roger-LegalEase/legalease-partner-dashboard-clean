import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// New Mexico is an OFFICIAL-FORM state: the Criminal Record Expungement Act
// (NMSA 1978 §§ 29-3A-1 to 29-3A-9) is implemented through mandatory statewide
// Rules of Court forms (4-951 identity theft, 4-952 release-without-conviction,
// 4-953 conviction, plus 4-955/4-958/4-959/4-960.x supporting forms), with a
// separate cannabis AOC process (§ 29-3A-8/§ 29-3A-9) and DNA route (§ 29-16-10).
// This verifier proves the New Mexico STATE PACK was built from the Nationwide
// source and remains shadow-only research: NOT wired to any renderer, NOT in the
// live jurisdiction selector, and NOT verified_replacement. The overlay/config is
// intentionally deferred (see report), so this verifier consumes the state pack
// directly.

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

registerTypeScriptHook();

const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const nmPackPath = path.join(rootDir, "src/lib/rcap/state-packs/new-mexico/index.ts");

// --- Step 1: NM state pack exists ---

if (!fs.existsSync(nmPackPath)) {
  failures.push("NM state pack index not found at src/lib/rcap/state-packs/new-mexico/index.ts.");
  process.exit(reportAndExit());
}
const nmPack = require(nmPackPath);

const expectedPackExports = [
  "nmEligibilityRules",
  "nmWaitingPeriodNotes",
  "nmFilingInstructions",
  "nmDisqualifyingOffenseNotes",
  "nmPlainLanguage",
  "nmSafetyDisclaimer",
  "nmFeeNotes",
  "nmPathways",
  "nmPathwayLabels",
  "nmRequiredFields",
  "nmFieldLabels",
  "nmDocumentTypes",
  "nmOfficialForms",
  "nmPetitionSelection",
  "nmSampleDocumentInputs"
];
for (const name of expectedPackExports) {
  if (!(name in nmPack)) failures.push(`NM state pack missing export: ${name}.`);
}

// --- Step 2: State-pack content is consumed and internally consistent ---

if (Array.isArray(nmPack.nmPathways)) {
  const pathwayIds = nmPack.nmPathways.map((p) => p.pathway);
  const requiredPathways = [
    "identity_theft",
    "release_without_conviction",
    "conviction_expungement",
    "cannabis_automatic",
    "cannabis_sentence_dismissal",
    "dna_expungement"
  ];
  for (const id of requiredPathways) {
    if (!pathwayIds.includes(id)) failures.push(`NM pathways missing required pathway: ${id}.`);
  }
  for (const p of nmPack.nmPathways) {
    if (p.pathway === "needs_review") continue;
    if (!p.citation || !/29-3A|29-16-10/.test(p.citation)) {
      failures.push(`NM pathway '${p.pathway}' is missing an NMSA citation.`);
    }
  }
  for (const id of pathwayIds) {
    if (!(id in nmPack.nmRequiredFields)) {
      failures.push(`nmRequiredFields missing entry for pathway '${id}'.`);
    }
  }
}

const allPackText = JSON.stringify(nmPack);
const requiredCitations = [
  "29-3A-3",
  "29-3A-4",
  "29-3A-5",
  "29-3A-7",
  "29-3A-8",
  "29-3A-9",
  "29-16-10",
  "30-3-5(B)",
  "29-11A-3",
  "30-16-8",
  "4-951",
  "4-952",
  "4-953"
];
for (const cite of requiredCitations) {
  if (!allPackText.includes(cite)) failures.push(`NM state pack is missing required citation: ${cite}.`);
}

// New Mexico's defining structure and vocabulary.
if (!/29-3A-5/.test(allPackText)) failures.push("NM state pack must include the § 29-3A-5 conviction route.");
if (!/expungement/i.test(allPackText)) failures.push("NM state pack must use 'expungement'.");
if (!/public access/i.test(allPackText)) {
  failures.push("NM state pack must capture the removal-from-public-access concept.");
}
if (!/justice will be served/i.test(allPackText)) {
  failures.push("NM state pack must capture the § 29-3A-5 'justice will be served' discretion.");
}
if (!/cannabis/i.test(allPackText)) {
  failures.push("NM state pack must capture the cannabis automatic/AOC route.");
}
// DWI is excluded from conviction expungement — must be captured.
if (!/DWI|DUI/.test(allPackText)) {
  failures.push("NM state pack must capture the DWI/DUI conviction exclusion.");
}

// Official-forms catalog must include the three statewide petition forms.
if (Array.isArray(nmPack.nmOfficialForms)) {
  const names = nmPack.nmOfficialForms.map((f) => `${f.formNumber || ""} ${f.officialName}`).join(" | ");
  for (const needle of ["4-951", "4-952", "4-953"]) {
    if (!names.includes(needle)) failures.push(`NM official-forms catalog missing: ${needle}.`);
  }
}

// --- Step 3: No seals / logos and no other-state boilerplate leaked ---

if (/\[seal\]/i.test(allPackText) || /\[logo\]/i.test(allPackText)) {
  failures.push("NM state pack must not contain [seal] or [logo] markers.");
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
  "FDLE",
  "Nebraska",
  "RSMo",
  "NRS ",
  "§ 610.140",
  "179.245"
];
for (const term of otherStateLeakTerms) {
  if (allPackText.includes(term)) failures.push(`NM state pack must not contain other-state content: "${term}".`);
}
// Must not borrow other states' relief vocabulary.
for (const term of ["Clean Slate", "record restriction", "annulment", "Certificate of Eligibility", "set-aside"]) {
  if (new RegExp(term, "i").test(allPackText)) {
    failures.push(`NM state pack must not use non-New-Mexico relief vocabulary: "${term}".`);
  }
}

// --- Step 4: Shadow-only — NM not wired to a renderer or the live selector ---

if (fs.existsSync(path.join(rootDir, "src/lib/record-clearing/new-mexico-config.ts"))) {
  failures.push(
    "new-mexico-config.ts exists: New Mexico is a mandatory official-form state; the overlay/field-map/config is deferred until per-form review + a Nationwide fidelity check are approved."
  );
}
for (const name of Object.keys(recordClearing)) {
  if (/^nm[A-Z]/.test(name) && /Config$/.test(name)) {
    failures.push(`Unexpected New Mexico config exported from record-clearing index: ${name} (must stay deferred).`);
  }
}
const nmLive = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "NM")
  : false;
if (nmLive) failures.push("New Mexico must not appear in the live recordClearingJurisdictions selector.");
if (/verified_replacement/.test(allPackText)) {
  failures.push("NM state pack must not declare verified_replacement lifecycle.");
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
// Only the established sibling verifiers are run here. MO/NV are sibling state
// packs but are intentionally NOT cross-run to avoid redundant nested execution;
// each new-state verifier is run independently by the QA suite.

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

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/new-mexico");
fs.mkdirSync(outputDir, { recursive: true });
const artifact = {
  state: "NM",
  tier: "Tier 2/hybrid (Wilma RTF + official 4-95x Rules of Court forms -> structured state pack)",
  lifecycle: "shadow_only",
  verifiedReplacement: false,
  liveRouted: false,
  rendererStrategy:
    "official_pdf_form_filling / overlay (deferred, per-form): § 29-3A petitions on statewide 4-951/4-952/4-953 forms; cannabis (§ 29-3A-8) via AOC process, DNA (§ 29-16-10) separate request",
  pathways: Array.isArray(nmPack.nmPathways) ? nmPack.nmPathways.map((p) => p.pathway) : [],
  officialForms: Array.isArray(nmPack.nmOfficialForms)
    ? nmPack.nmOfficialForms.map((f) => f.formNumber || f.officialName)
    : [],
  siblingVerifiers: siblingResults
};
fs.writeFileSync(path.join(outputDir, "nm-state-pack-summary.json"), `${JSON.stringify(artifact, null, 2)}\n`);

// --- Report ---

if (failures.length > 0) {
  console.error("New Mexico state-pack verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("New Mexico state-pack verification PASSED.");
console.log(`  NM state pack exists:          yes`);
console.log(`  Pack exports present:          ${expectedPackExports.length}`);
console.log(`  Pathways:                      ${artifact.pathways.length}`);
console.log(`  Official forms cataloged:      ${artifact.officialForms.length}`);
console.log(`  Renderer strategy:             official_pdf/overlay (config deferred)`);
console.log(`  Removal-not-destruction framing:enforced`);
console.log(`  New Mexico config wired:       no (deferred)`);
console.log(`  Live-routed (selector):        no`);
console.log(`  Lifecycle verified_replacement:no`);
console.log(`  Seals / logos in pack:         no`);
console.log(`  Other-state leakage:           no`);
console.log(`  Mississippi new-engine:        no`);
console.log(`  Forbidden files changed:       no`);
for (const r of siblingResults) console.log(`  Sibling ${r.script.padEnd(28)} ${r.ok ? "PASS" : "FAIL"}`);
console.log(`  Shadow summary:                ${path.join(outputDir, "nm-state-pack-summary.json")}`);

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("New Mexico state-pack verification FAILED.");
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
