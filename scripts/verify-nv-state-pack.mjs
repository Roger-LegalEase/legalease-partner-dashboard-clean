import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Nevada is a SEALING state: the remedy is record sealing (NRS), not expungement.
// Its routes span conviction sealing (NRS 179.245), no-conviction sealing
// (NRS 179.255), multi-court petitions (NRS 179.2595), deferred judgment
// (NRS 176.211), probation/specialty set-asides (NRS 176A.245/265/295), reentry
// (NRS 179.259), decriminalized offenses (NRS 179.271), controlled-substance
// possession (NRS 453.3365), trafficking-victim vacatur (NRS 179.247), and
// administrative repository removal (NRS 179A.160). This verifier proves the
// Nevada STATE PACK was built from the Nationwide source and remains shadow-only
// research: NOT wired to any renderer, NOT in the live jurisdiction selector, and
// NOT verified_replacement. The renderer/config is intentionally deferred (see
// report), so this verifier consumes the state pack directly.

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

registerTypeScriptHook();

const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const nvPackPath = path.join(rootDir, "src/lib/rcap/state-packs/nevada/index.ts");

// --- Step 1: NV state pack exists ---

if (!fs.existsSync(nvPackPath)) {
  failures.push("NV state pack index not found at src/lib/rcap/state-packs/nevada/index.ts.");
  process.exit(reportAndExit());
}
const nvPack = require(nvPackPath);

const expectedPackExports = [
  "nvEligibilityRules",
  "nvWaitingPeriodNotes",
  "nvFilingInstructions",
  "nvDisqualifyingOffenseNotes",
  "nvPlainLanguage",
  "nvSafetyDisclaimer",
  "nvFeeNotes",
  "nvPathways",
  "nvPathwayLabels",
  "nvSealingPresumption",
  "nvRequiredFields",
  "nvFieldLabels",
  "nvDocumentTypes",
  "nvSourceForms",
  "nvPacketComponents",
  "nvSampleDocumentInputs"
];
for (const name of expectedPackExports) {
  if (!(name in nvPack)) failures.push(`NV state pack missing export: ${name}.`);
}

// --- Step 2: State-pack content is consumed and internally consistent ---

if (Array.isArray(nvPack.nvPathways)) {
  const pathwayIds = nvPack.nvPathways.map((p) => p.pathway);
  const requiredPathways = [
    "conviction_record_sealing",
    "dismissal_declined_acquittal",
    "multiple_records_multiple_courts",
    "deferred_judgment_dismissal",
    "probation_specialty_dismissal",
    "reentry_program_sealing",
    "decriminalized_offense",
    "controlled_substance_possession",
    "trafficking_victim_vacatur",
    "favorable_disposition_repository_removal"
  ];
  for (const id of requiredPathways) {
    if (!pathwayIds.includes(id)) failures.push(`NV pathways missing required pathway: ${id}.`);
  }
  for (const p of nvPack.nvPathways) {
    if (p.pathway === "needs_review") continue;
    if (!p.citation || !/NRS/.test(p.citation)) {
      failures.push(`NV pathway '${p.pathway}' is missing an NRS citation.`);
    }
  }
  for (const id of pathwayIds) {
    if (!(id in nvPack.nvRequiredFields)) {
      failures.push(`nvRequiredFields missing entry for pathway '${id}'.`);
    }
  }
}

const allPackText = JSON.stringify(nvPack);
const requiredCitations = [
  "NRS 179.245",
  "NRS 179.255",
  "NRS 179.2595",
  "NRS 176.211",
  "176A.245",
  "NRS 179.259",
  "NRS 179.271",
  "NRS 453.3365",
  "NRS 179.247",
  "NRS 179A.160",
  "NRS 179.285",
  "NRS 179.301",
  "NRS 179.2445"
];
for (const cite of requiredCitations) {
  if (!allPackText.includes(cite)) failures.push(`NV state pack is missing required citation: ${cite}.`);
}

// Nevada's defining structure and vocabulary: SEALING, not expungement.
if (!/179\.245/.test(allPackText)) failures.push("NV state pack must center on NRS 179.245.");
if (!/seal(?:ing|ed|s)?/i.test(allPackText)) failures.push("NV state pack must use 'sealing' vocabulary.");
if (!/record sealing, not expungement|sealing, not expungement|not expungement/i.test(allPackText)) {
  failures.push("NV state pack must state the remedy is sealing, not expungement.");
}
if (!/presumption/i.test(allPackText)) {
  failures.push("NV state pack must capture the NRS 179.2445 rebuttable presumption.");
}
if (!/firearm/i.test(allPackText)) {
  failures.push("NV state pack must capture that sealing does not restore firearm rights without a pardon.");
}
if (!/Category A|Category B|Category E/i.test(allPackText)) {
  failures.push("NV state pack must capture the NRS 179.245 felony-category waiting periods.");
}

// Source forms catalog must reference the Nevada DPS and court packet PDFs.
if (Array.isArray(nvPack.nvSourceForms)) {
  const names = nvPack.nvSourceForms.map((f) => `${f.formId || ""} ${f.officialName}`).join(" | ");
  for (const needle of ["DPS-006", "District Court", "Justice Court"]) {
    if (!names.includes(needle)) failures.push(`NV source-forms catalog missing: ${needle}.`);
  }
}

// --- Step 3: No seals / logos and no other-state boilerplate leaked ---

if (/\[seal\]/i.test(allPackText) || /\[logo\]/i.test(allPackText)) {
  failures.push("NV state pack must not contain [seal] or [logo] markers.");
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
  "New Mexico",
  "FDLE",
  "Nebraska",
  "RSMo",
  "NMSA",
  "§ 610.140",
  "§ 29-3A"
];
for (const term of otherStateLeakTerms) {
  if (allPackText.includes(term)) failures.push(`NV state pack must not contain other-state content: "${term}".`);
}
// Must not borrow other states' relief vocabulary (Nevada legitimately uses
// "set-aside" and "vacatur", so those are NOT banned here).
for (const term of ["Clean Slate", "record restriction", "annulment", "Certificate of Eligibility"]) {
  if (new RegExp(term, "i").test(allPackText)) {
    failures.push(`NV state pack must not use non-Nevada relief vocabulary: "${term}".`);
  }
}

// --- Step 4: Shadow-only — NV not wired to a renderer or the live selector ---

if (fs.existsSync(path.join(rootDir, "src/lib/record-clearing/nevada-config.ts"))) {
  failures.push(
    "nevada-config.ts exists: Nevada is a county-varying sealing state; the renderer/field-map/config is deferred until per-county form review + a Nationwide fidelity check are approved."
  );
}
for (const name of Object.keys(recordClearing)) {
  if (/^nv[A-Z]/.test(name) && /Config$/.test(name)) {
    failures.push(`Unexpected Nevada config exported from record-clearing index: ${name} (must stay deferred).`);
  }
}
const nvLive = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "NV")
  : false;
if (nvLive) failures.push("Nevada must not appear in the live recordClearingJurisdictions selector.");
if (/verified_replacement/.test(allPackText)) {
  failures.push("NV state pack must not declare verified_replacement lifecycle.");
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
// Only the established sibling verifiers are run here. MO/NM are sibling state
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

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/nevada");
fs.mkdirSync(outputDir, { recursive: true });
const artifact = {
  state: "NV",
  tier: "Tier 2/hybrid (Wilma RTF + county/court sealing form PDFs -> structured state pack)",
  lifecycle: "shadow_only",
  verifiedReplacement: false,
  liveRouted: false,
  rendererStrategy:
    "CustomPleadingRenderer candidate, deferred: Nevada packets are county-varying pleadings (petition/affidavit/stipulation/order), no mandatory statewide numbered form set; renderer deferred pending per-county form review",
  pathways: Array.isArray(nvPack.nvPathways) ? nvPack.nvPathways.map((p) => p.pathway) : [],
  sourceForms: Array.isArray(nvPack.nvSourceForms)
    ? nvPack.nvSourceForms.map((f) => f.formId || f.officialName)
    : [],
  siblingVerifiers: siblingResults
};
fs.writeFileSync(path.join(outputDir, "nv-state-pack-summary.json"), `${JSON.stringify(artifact, null, 2)}\n`);

// --- Report ---

if (failures.length > 0) {
  console.error("Nevada state-pack verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Nevada state-pack verification PASSED.");
console.log(`  NV state pack exists:          yes`);
console.log(`  Pack exports present:          ${expectedPackExports.length}`);
console.log(`  Pathways:                      ${artifact.pathways.length}`);
console.log(`  Source forms cataloged:        ${artifact.sourceForms.length}`);
console.log(`  Renderer strategy:             CustomPleadingRenderer (config deferred)`);
console.log(`  Sealing-not-expungement framing:enforced`);
console.log(`  Nevada config wired:           no (deferred)`);
console.log(`  Live-routed (selector):        no`);
console.log(`  Lifecycle verified_replacement:no`);
console.log(`  Seals / logos in pack:         no`);
console.log(`  Other-state leakage:           no`);
console.log(`  Mississippi new-engine:        no`);
console.log(`  Forbidden files changed:       no`);
for (const r of siblingResults) console.log(`  Sibling ${r.script.padEnd(28)} ${r.ok ? "PASS" : "FAIL"}`);
console.log(`  Shadow summary:                ${path.join(outputDir, "nv-state-pack-summary.json")}`);

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("Nevada state-pack verification FAILED.");
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
