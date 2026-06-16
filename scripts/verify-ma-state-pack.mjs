import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Massachusetts is a SEALING-PRIMARY state with NARROW EXPUNGEMENT. Adult relief
// is mostly sealing (§ 100A conviction, § 100C non-conviction, § 100B juvenile);
// expungement is permanent erasure (§ 100E) and limited to time-based under-21
// routes (§§ 100F-100J) and non-time-based grounds (§ 100K), plus marijuana-only
// expungement. This verifier proves the Massachusetts STATE PACK was built from
// the Nationwide source and remains shadow-only research: NOT wired to any
// renderer, NOT in the live jurisdiction selector, and NOT verified_replacement.
// The overlay/config is intentionally deferred (see report), so this verifier
// consumes the state pack directly.

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

registerTypeScriptHook();

const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const maPackPath = path.join(rootDir, "src/lib/rcap/state-packs/massachusetts/index.ts");

// --- Step 1: MA state pack exists ---

if (!fs.existsSync(maPackPath)) {
  failures.push("MA state pack index not found at src/lib/rcap/state-packs/massachusetts/index.ts.");
  process.exit(reportAndExit());
}
const maPack = require(maPackPath);

const expectedPackExports = [
  "maEligibilityRules",
  "maWaitingPeriodNotes",
  "maFilingInstructions",
  "maDisqualifyingOffenseNotes",
  "maPlainLanguage",
  "maSafetyDisclaimer",
  "maFeeNotes",
  "maPathways",
  "maPathwayLabels",
  "maRequiredFields",
  "maFieldLabels",
  "maDocumentTypes",
  "maOfficialForms",
  "maSampleDocumentInputs"
];
for (const name of expectedPackExports) {
  if (!(name in maPack)) failures.push(`MA state pack missing export: ${name}.`);
}

// --- Step 2: State-pack content is consumed and internally consistent ---

if (Array.isArray(maPack.maPathways)) {
  const pathwayIds = maPack.maPathways.map((p) => p.pathway);
  const requiredPathways = [
    "adult_conviction_sealing",
    "non_conviction_sealing",
    "juvenile_sealing",
    "time_based_expungement",
    "non_time_based_expungement",
    "marijuana_expungement"
  ];
  for (const id of requiredPathways) {
    if (!pathwayIds.includes(id)) failures.push(`MA pathways missing required pathway: ${id}.`);
  }
  for (const p of maPack.maPathways) {
    if (!p.citation || !/M\.G\.L\. c\. 276/.test(p.citation)) {
      failures.push(`MA pathway '${p.pathway}' is missing an M.G.L. c. 276 citation.`);
    }
  }
  for (const id of pathwayIds) {
    if (!(id in maPack.maRequiredFields)) {
      failures.push(`maRequiredFields missing entry for pathway '${id}'.`);
    }
  }
}

const allPackText = JSON.stringify(maPack);
const requiredCitations = [
  "§ 100A",
  "§ 100B",
  "§ 100C",
  "§ 100E",
  "100F-100J",
  "§ 100I",
  "§ 100J",
  "§ 100K"
];
for (const cite of requiredCitations) {
  if (!allPackText.includes(cite)) failures.push(`MA state pack is missing required citation: ${cite}.`);
}

// Massachusetts's defining structure: sealing primary + narrow expungement.
if (!/sealing/i.test(allPackText)) failures.push("MA state pack must use 'sealing' vocabulary.");
if (!/expungement/i.test(allPackText)) failures.push("MA state pack must capture the narrow expungement remedy.");
if (!/permanent erasure/i.test(allPackText)) {
  failures.push("MA state pack must capture the § 100E permanent-erasure definition of expungement.");
}
if (!/substantial justice/i.test(allPackText)) {
  failures.push("MA state pack must capture the § 100C substantial-justice standard.");
}
if (!/3[- ]year|three[- ]year/i.test(allPackText) || !/7[- ]year|seven[- ]year/i.test(allPackText)) {
  failures.push("MA state pack must capture the 3-year misdemeanor / 7-year felony sealing waits.");
}
if (!/CORI/.test(allPackText)) failures.push("MA state pack must capture the CORI record-request baseline.");

// Forms catalog must include the core Trial Court petitions.
if (Array.isArray(maPack.maOfficialForms)) {
  const names = maPack.maOfficialForms.map((f) => f.officialName).join(" | ");
  for (const needle of ["Petition to Seal", "Petition for Expungement", "Nolle Prosequi or Dismissal"]) {
    if (!names.includes(needle)) failures.push(`MA official-forms catalog missing: ${needle}.`);
  }
}

// --- Step 3: No seals / logos and no other-state boilerplate leaked ---

if (/\[seal\]/i.test(allPackText) || /\[logo\]/i.test(allPackText)) {
  failures.push("MA state pack must not contain [seal] or [logo] markers.");
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
  "FDLE",
  "Nebraska",
  "RSMo",
  "NRS ",
  "NMSA",
  "M.R.S.",
  "Crim. Proc.",
  "610.140",
  "29-3A"
];
for (const term of otherStateLeakTerms) {
  if (allPackText.includes(term)) failures.push(`MA state pack must not contain other-state content: "${term}".`);
}
// Must not borrow other states' relief vocabulary.
for (const term of ["Clean Slate", "record restriction", "annulment", "Certificate of Eligibility", "set aside", "set-aside"]) {
  if (new RegExp(term, "i").test(allPackText)) {
    failures.push(`MA state pack must not use non-Massachusetts relief vocabulary: "${term}".`);
  }
}

// --- Step 4: Shadow-only — MA not wired to a renderer or the live selector ---

if (fs.existsSync(path.join(rootDir, "src/lib/record-clearing/massachusetts-config.ts"))) {
  failures.push(
    "massachusetts-config.ts exists: Massachusetts is a mandatory official-form state; the overlay/field-map/config is deferred until per-form review + a Nationwide fidelity check are approved."
  );
}
for (const name of Object.keys(recordClearing)) {
  if (/^ma[A-Z]/.test(name) && /Config$/.test(name)) {
    failures.push(`Unexpected Massachusetts config exported from record-clearing index: ${name} (must stay deferred).`);
  }
}
const maLive = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "MA")
  : false;
if (maLive) failures.push("Massachusetts must not appear in the live recordClearingJurisdictions selector.");
if (/verified_replacement/.test(allPackText)) {
  failures.push("MA state pack must not declare verified_replacement lifecycle.");
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

// --- Step 7: Sibling verifiers still pass (PA/DC/ND/OK/WY/MD/GA/FL/MN/MO/NV/NM) ---

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
  "verify-nm-state-pack.mjs"
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

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/massachusetts");
fs.mkdirSync(outputDir, { recursive: true });
const artifact = {
  state: "MA",
  tier: "Tier 2/hybrid (Wilma RTF + official Trial Court petition PDFs -> structured state pack)",
  lifecycle: "shadow_only",
  verifiedReplacement: false,
  liveRouted: false,
  rendererStrategy:
    "official_pdf_form_filling / overlay (deferred, per-form): Massachusetts uses Trial Court / Probation Service petitions (seal conviction, seal nolle/dismissal, expunge, marijuana expunge); config deferred pending form review",
  pathways: Array.isArray(maPack.maPathways) ? maPack.maPathways.map((p) => p.pathway) : [],
  officialForms: Array.isArray(maPack.maOfficialForms)
    ? maPack.maOfficialForms.map((f) => f.officialName)
    : [],
  siblingVerifiers: siblingResults
};
fs.writeFileSync(path.join(outputDir, "ma-state-pack-summary.json"), `${JSON.stringify(artifact, null, 2)}\n`);

// --- Report ---

if (failures.length > 0) {
  console.error("Massachusetts state-pack verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Massachusetts state-pack verification PASSED.");
console.log(`  MA state pack exists:          yes`);
console.log(`  Pack exports present:          ${expectedPackExports.length}`);
console.log(`  Pathways:                      ${artifact.pathways.length}`);
console.log(`  Official forms cataloged:      ${artifact.officialForms.length}`);
console.log(`  Renderer strategy:             official_pdf/overlay (config deferred)`);
console.log(`  Sealing+narrow-expungement:    enforced`);
console.log(`  Massachusetts config wired:    no (deferred)`);
console.log(`  Live-routed (selector):        no`);
console.log(`  Lifecycle verified_replacement:no`);
console.log(`  Seals / logos in pack:         no`);
console.log(`  Other-state leakage:           no`);
console.log(`  Mississippi new-engine:        no`);
console.log(`  Forbidden files changed:       no`);
for (const r of siblingResults) console.log(`  Sibling ${r.script.padEnd(28)} ${r.ok ? "PASS" : "FAIL"}`);
console.log(`  Shadow summary:                ${path.join(outputDir, "ma-state-pack-summary.json")}`);

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("Massachusetts state-pack verification FAILED.");
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
