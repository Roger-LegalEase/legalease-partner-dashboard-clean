import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Minnesota is an overlay / official-form state: relief is "expungement"
// (statutorily, SEALING from public view) under Minn. Stat. Chapter 609A, using
// the mandatory statewide EXP forms (EXP102 petition + EXP105/106/107 orders),
// with several non-petition automatic routes (Clean Slate § 609A.015, cannabis,
// mistaken identity). This verifier proves the Minnesota STATE PACK was built
// from the Nationwide source and remains shadow-only research: NOT wired to any
// renderer, NOT in the live jurisdiction selector, and NOT verified_replacement.
// The overlay renderer/field-map/config is intentionally deferred (see report),
// so this verifier consumes the state pack directly.

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

registerTypeScriptHook();

const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const mnPackPath = path.join(rootDir, "src/lib/rcap/state-packs/minnesota/index.ts");

// --- Step 1: MN state pack exists ---

if (!fs.existsSync(mnPackPath)) {
  failures.push("MN state pack index not found at src/lib/rcap/state-packs/minnesota/index.ts.");
  process.exit(reportAndExit());
}
const mnPack = require(mnPackPath);

const expectedPackExports = [
  "mnEligibilityRules",
  "mnWaitingPeriodNotes",
  "mnFilingInstructions",
  "mnDisqualifyingOffenseNotes",
  "mnPlainLanguage",
  "mnSafetyDisclaimer",
  "mnFeeNotes",
  "mnPathways",
  "mnPathwayLabels",
  "mnRequiredFields",
  "mnFieldLabels",
  "mnDocumentTypes",
  "mnOfficialForms",
  "mnOrderFormSelection",
  "mnSampleDocumentInputs"
];
for (const name of expectedPackExports) {
  if (!(name in mnPack)) failures.push(`MN state pack missing export: ${name}.`);
}

// --- Step 2: State-pack content is consumed and internally consistent ---

if (Array.isArray(mnPack.mnPathways)) {
  const pathwayIds = mnPack.mnPathways.map((p) => p.pathway);
  const requiredPathways = [
    "arrest_record_destruction",
    "mistaken_identity_automatic",
    "automatic_clean_slate",
    "cannabis_automatic",
    "cannabis_board_review",
    "prosecutor_agreement",
    "petition_based_expungement"
  ];
  for (const id of requiredPathways) {
    if (!pathwayIds.includes(id)) failures.push(`MN pathways missing required pathway: ${id}.`);
  }
  for (const p of mnPack.mnPathways) {
    if (p.pathway === "needs_review") continue;
    if (!p.citation || !/§/.test(p.citation)) {
      failures.push(`MN pathway '${p.pathway}' is missing a statutory citation.`);
    }
  }
  for (const id of pathwayIds) {
    if (!(id in mnPack.mnRequiredFields)) {
      failures.push(`mnRequiredFields missing entry for pathway '${id}'.`);
    }
  }
}

const allPackText = JSON.stringify(mnPack);
const requiredCitations = [
  "609A.015",
  "609A.017",
  "609A.02",
  "609A.03",
  "609A.055",
  "609A.06",
  "609A.025",
  "299C.11",
  "243.166",
  "152.025"
];
for (const cite of requiredCitations) {
  if (!allPackText.includes(cite)) failures.push(`MN state pack is missing required citation: § ${cite}.`);
}

// Minnesota's defining structure and vocabulary.
if (!/Chapter 609A|ch\. 609A|609A/.test(allPackText)) {
  failures.push("MN state pack must reference Minn. Stat. Chapter 609A.");
}
if (!/expungement/i.test(allPackText)) failures.push("MN state pack must use 'expungement'.");
if (!/seal/i.test(allPackText)) failures.push("MN state pack must describe sealing.");
if (!/BCA|Bureau of Criminal Apprehension/.test(allPackText)) {
  failures.push("MN state pack must reference the BCA.");
}
if (!/Clean Slate/i.test(allPackText)) {
  failures.push("MN state pack must capture the automatic Clean Slate pathway.");
}
// Seal-not-destroy discipline must be present.
if (!/does not (?:erase or )?destroy|not the same as deleting|seals|sealing the record/i.test(allPackText)) {
  failures.push("MN state pack must state expungement seals (does not destroy) the record.");
}

// Forms catalog must include the mandatory EXP petition + order forms.
if (Array.isArray(mnPack.mnOfficialForms)) {
  const formNumbers = mnPack.mnOfficialForms.map((f) => f.formNumber).join(" ");
  for (const form of ["EXP102", "EXP105", "EXP106", "EXP107"]) {
    if (!formNumbers.includes(form)) failures.push(`MN official-forms catalog missing form: ${form}.`);
  }
}

// --- Step 3: No seals / logos and no other-state boilerplate leaked ---

if (/\[seal\]/i.test(allPackText) || /\[logo\]/i.test(allPackText)) {
  failures.push("MN state pack must not contain [seal] or [logo] markers.");
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
  "FDLE",
  "Nebraska"
];
for (const term of otherStateLeakTerms) {
  if (allPackText.includes(term)) failures.push(`MN state pack must not contain other-state content: "${term}".`);
}
// Must not borrow other states' relief vocabulary.
for (const term of ["set aside", "set-aside", "annulment", "record restriction", "Certificate of Eligibility"]) {
  if (new RegExp(term, "i").test(allPackText)) {
    failures.push(`MN state pack must not use non-Minnesota relief vocabulary: "${term}".`);
  }
}

// --- Step 4: Shadow-only — MN not wired to a renderer or the live selector ---

if (fs.existsSync(path.join(rootDir, "src/lib/record-clearing/minnesota-config.ts"))) {
  failures.push(
    "minnesota-config.ts exists: Minnesota is an overlay/official-form state; the renderer/field-map/config is deferred to the overlay track until a visual field-map review + Nationwide fidelity check are approved."
  );
}
for (const name of Object.keys(recordClearing)) {
  if (/^mn[A-Z]/.test(name) && /Config$/.test(name)) {
    failures.push(`Unexpected Minnesota config exported from record-clearing index: ${name} (must stay deferred).`);
  }
}
const mnLive = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "MN")
  : false;
if (mnLive) failures.push("Minnesota must not appear in the live recordClearingJurisdictions selector.");
if (/verified_replacement/.test(allPackText)) {
  failures.push("MN state pack must not declare verified_replacement lifecycle.");
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

// --- Step 7: Sibling verifiers still pass (PA, DC, ND, OK, WY, MD, GA, FL) ---

const siblingVerifiers = [
  "verify-pleading-state.mjs",
  "verify-dc-pleading-state.mjs",
  "verify-nd-pleading-state.mjs",
  "verify-ok-pleading-state.mjs",
  "verify-wy-pleading-state.mjs",
  "verify-md-state-pack.mjs",
  "verify-ga-state-pack.mjs",
  "verify-fl-state-pack.mjs"
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

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/minnesota");
fs.mkdirSync(outputDir, { recursive: true });
const artifact = {
  state: "MN",
  tier: "Tier 2/overlay (Wilma RTF + official EXP forms -> structured state pack)",
  lifecycle: "shadow_only",
  verifiedReplacement: false,
  liveRouted: false,
  rendererStrategy:
    "official_pdf_form_filling / overlay (deferred to overlay track): EXP102 petition + EXP105/106/107 orders; automatic routes need no document",
  pathways: Array.isArray(mnPack.mnPathways) ? mnPack.mnPathways.map((p) => p.pathway) : [],
  officialForms: Array.isArray(mnPack.mnOfficialForms) ? mnPack.mnOfficialForms.map((f) => f.formNumber) : [],
  siblingVerifiers: siblingResults
};
fs.writeFileSync(path.join(outputDir, "mn-state-pack-summary.json"), `${JSON.stringify(artifact, null, 2)}\n`);

// --- Report ---

if (failures.length > 0) {
  console.error("Minnesota state-pack verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Minnesota state-pack verification PASSED.");
console.log(`  MN state pack exists:          yes`);
console.log(`  Pack exports present:          ${expectedPackExports.length}`);
console.log(`  Pathways:                      ${artifact.pathways.length}`);
console.log(`  Official forms cataloged:      ${artifact.officialForms.length}`);
console.log(`  Renderer strategy:             official_pdf/overlay (config deferred)`);
console.log(`  Seal-not-destroy framing:      enforced`);
console.log(`  Minnesota config wired:        no (deferred)`);
console.log(`  Live-routed (selector):        no`);
console.log(`  Lifecycle verified_replacement:no`);
console.log(`  Seals / logos in pack:         no`);
console.log(`  Other-state leakage:           no`);
console.log(`  Mississippi new-engine:        no`);
console.log(`  Forbidden files changed:       no`);
for (const r of siblingResults) console.log(`  Sibling ${r.script.padEnd(28)} ${r.ok ? "PASS" : "FAIL"}`);
console.log(`  Shadow summary:                ${path.join(outputDir, "mn-state-pack-summary.json")}`);

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("Minnesota state-pack verification FAILED.");
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
