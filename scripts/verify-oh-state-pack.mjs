import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Ohio has BOTH sealing and (narrower, stronger) expungement. Adult convictions
// route through Ohio Rev. Code § 2953.32; non-convictions through § 2953.33;
// special routes include marijuana/hashish (§ 2953.321), trafficking-survivor
// (§§ 2953.36, 2953.521), firearm/carry (§ 2953.35), prosecutor low-level
// controlled substance (§ 2953.39), and juvenile (§§ 2151.356, 2151.358). The
// § 2953.61 multiple-charge trap is a key gate. This verifier proves the Ohio
// STATE PACK was built from the Nationwide source and remains shadow-only
// research: NOT wired to any renderer, NOT in the live jurisdiction selector, and
// NOT verified_replacement. The overlay/config is intentionally deferred (see
// report), so this verifier consumes the state pack directly.

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

registerTypeScriptHook();

const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const ohPackPath = path.join(rootDir, "src/lib/rcap/state-packs/ohio/index.ts");

// --- Step 1: OH state pack exists ---

if (!fs.existsSync(ohPackPath)) {
  failures.push("OH state pack index not found at src/lib/rcap/state-packs/ohio/index.ts.");
  process.exit(reportAndExit());
}
const ohPack = require(ohPackPath);

const expectedPackExports = [
  "ohEligibilityRules",
  "ohWaitingPeriodNotes",
  "ohFilingInstructions",
  "ohDisqualifyingOffenseNotes",
  "ohPlainLanguage",
  "ohSafetyDisclaimer",
  "ohFeeNotes",
  "ohPathways",
  "ohPathwayLabels",
  "ohRequiredFields",
  "ohFieldLabels",
  "ohDocumentTypes",
  "ohSourceForms",
  "ohGenericFormNames",
  "ohSampleDocumentInputs"
];
for (const name of expectedPackExports) {
  if (!(name in ohPack)) failures.push(`OH state pack missing export: ${name}.`);
}

// --- Step 2: State-pack content is consumed and internally consistent ---

if (Array.isArray(ohPack.ohPathways)) {
  const pathwayIds = ohPack.ohPathways.map((p) => p.pathway);
  const requiredPathways = [
    "adult_conviction_sealing_expungement",
    "non_conviction_sealing_expungement",
    "marijuana_hashish_expungement",
    "trafficking_survivor_conviction_expungement",
    "trafficking_survivor_non_conviction_expungement",
    "firearm_carry_expungement",
    "prosecutor_low_level_controlled_substance",
    "juvenile_sealing_expungement"
  ];
  for (const id of requiredPathways) {
    if (!pathwayIds.includes(id)) failures.push(`OH pathways missing required pathway: ${id}.`);
  }
  for (const p of ohPack.ohPathways) {
    if (!p.citation || !/Ohio Rev\. Code/.test(p.citation)) {
      failures.push(`OH pathway '${p.pathway}' is missing an Ohio Rev. Code citation.`);
    }
  }
  for (const id of pathwayIds) {
    if (!(id in ohPack.ohRequiredFields)) {
      failures.push(`ohRequiredFields missing entry for pathway '${id}'.`);
    }
  }
}

const allPackText = JSON.stringify(ohPack);
const requiredCitations = [
  "§ 2953.32",
  "§ 2953.33",
  "§ 2953.321",
  "§ 2953.35",
  "§ 2953.36",
  "§ 2953.39",
  "§ 2953.521",
  "§ 2953.61",
  "§ 2151.356",
  "§ 2151.358"
];
for (const cite of requiredCitations) {
  if (!allPackText.includes(cite)) failures.push(`OH state pack is missing required citation: ${cite}.`);
}

// Ohio's defining structure: sealing AND expungement, with the multiple-charge trap.
if (!/2953\.32/.test(allPackText)) failures.push("OH state pack must center on § 2953.32.");
if (!/sealing/i.test(allPackText)) failures.push("OH state pack must use 'sealing' vocabulary.");
if (!/expungement/i.test(allPackText)) failures.push("OH state pack must capture the expungement remedy.");
if (!/destroy.{0,3}delete.{0,3}(and )?erase|destroy\/delete\/erase/i.test(allPackText)) {
  failures.push("OH state pack must capture the destroy/delete/erase expungement definition (§ 2953.31).");
}
if (!/BCI/.test(allPackText)) {
  failures.push("OH state pack must capture the BCI record / order-processing role.");
}
if (!/final discharge/i.test(allPackText)) {
  failures.push("OH state pack must capture the final-discharge waiting-period clock.");
}
if (!/2953\.61/.test(allPackText)) {
  failures.push("OH state pack must capture the § 2953.61 multiple-charge trap.");
}

// Source-forms catalog must include the core documents.
if (Array.isArray(ohPack.ohSourceForms)) {
  const names = ohPack.ohSourceForms.map((f) => f.officialName).join(" | ");
  for (const needle of ["Instructions", "BCI", "EXAMPLE"]) {
    if (!names.includes(needle)) failures.push(`OH source-forms catalog missing: ${needle}.`);
  }
}

// --- Step 3: No seals / logos and no other-state boilerplate leaked ---

if (/\[seal\]/i.test(allPackText) || /\[logo\]/i.test(allPackText)) {
  failures.push("OH state pack must not contain [seal] or [logo] markers.");
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
  "Montana",
  "New Hampshire",
  "FDLE",
  "Nebraska",
  "RSMo",
  "NRS ",
  "NMSA",
  "M.R.S.",
  "M.G.L.",
  "Mont. Code Ann.",
  "RSA ",
  "Crim. Proc.",
  "610.140",
  "29-3A"
];
for (const term of otherStateLeakTerms) {
  if (allPackText.includes(term)) failures.push(`OH state pack must not contain other-state content: "${term}".`);
}
// Must not borrow other states' relief vocabulary (Ohio uses sealing + expungement).
for (const term of ["annulment", "Clean Slate", "record restriction", "Certificate of Eligibility", "set aside", "set-aside", "redesignation"]) {
  if (new RegExp(term, "i").test(allPackText)) {
    failures.push(`OH state pack must not use non-Ohio relief vocabulary: "${term}".`);
  }
}

// --- Step 4: Shadow-only — OH not wired to a renderer or the live selector ---

if (fs.existsSync(path.join(rootDir, "src/lib/record-clearing/ohio-config.ts"))) {
  failures.push(
    "ohio-config.ts exists: Ohio uses court-specific forms; the renderer/field-map/config is deferred until per-court form review + a Nationwide fidelity check are approved."
  );
}
for (const name of Object.keys(recordClearing)) {
  if (/^oh[A-Z]/.test(name) && /Config$/.test(name)) {
    failures.push(`Unexpected Ohio config exported from record-clearing index: ${name} (must stay deferred).`);
  }
}
const ohLive = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "OH")
  : false;
if (ohLive) failures.push("Ohio must not appear in the live recordClearingJurisdictions selector.");
if (/verified_replacement/.test(allPackText)) {
  failures.push("OH state pack must not declare verified_replacement lifecycle.");
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

// --- Step 7: Sibling verifiers still pass (15 established) ---

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
  "verify-ma-state-pack.mjs"
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

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/ohio");
fs.mkdirSync(outputDir, { recursive: true });
const artifact = {
  state: "OH",
  tier: "Tier 2/hybrid (Wilma RTF + court application/instructions/BCI-request PDFs -> structured state pack)",
  lifecycle: "shadow_only",
  verifiedReplacement: false,
  liveRouted: false,
  rendererStrategy:
    "official_pdf_form_filling / overlay (deferred, per-court): Ohio has no single mandatory statewide packet; courts provide their own applications + BCI request form; config deferred pending per-court form review",
  pathways: Array.isArray(ohPack.ohPathways) ? ohPack.ohPathways.map((p) => p.pathway) : [],
  sourceForms: Array.isArray(ohPack.ohSourceForms)
    ? ohPack.ohSourceForms.map((f) => f.officialName)
    : [],
  siblingVerifiers: siblingResults
};
fs.writeFileSync(path.join(outputDir, "oh-state-pack-summary.json"), `${JSON.stringify(artifact, null, 2)}\n`);

// --- Report ---

if (failures.length > 0) {
  console.error("Ohio state-pack verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Ohio state-pack verification PASSED.");
console.log(`  OH state pack exists:          yes`);
console.log(`  Pack exports present:          ${expectedPackExports.length}`);
console.log(`  Pathways:                      ${artifact.pathways.length}`);
console.log(`  Source forms cataloged:        ${artifact.sourceForms.length}`);
console.log(`  Renderer strategy:             official_pdf/overlay (config deferred)`);
console.log(`  Sealing+expungement framing:   enforced`);
console.log(`  Ohio config wired:             no (deferred)`);
console.log(`  Live-routed (selector):        no`);
console.log(`  Lifecycle verified_replacement:no`);
console.log(`  Seals / logos in pack:         no`);
console.log(`  Other-state leakage:           no`);
console.log(`  Mississippi new-engine:        no`);
console.log(`  Forbidden files changed:       no`);
for (const r of siblingResults) console.log(`  Sibling ${r.script.padEnd(28)} ${r.ok ? "PASS" : "FAIL"}`);
console.log(`  Shadow summary:                ${path.join(outputDir, "oh-state-pack-summary.json")}`);

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("Ohio state-pack verification FAILED.");
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
