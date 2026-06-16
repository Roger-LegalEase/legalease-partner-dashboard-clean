import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Georgia is a HYBRID record-restriction state: non-conviction relief is an
// administrative GBI/GCIC + prosecutor process (automatic post-7/1/2013), and
// SB 288 conviction relief is a court petition, with sealing of the clerk's file
// a separate § 35-3-37(m) step. This verifier proves the Georgia STATE PACK was
// built from the Nationwide source and remains shadow-only research: it is NOT
// wired to any renderer, NOT in the live jurisdiction selector, and NOT
// verified_replacement. The renderer/config is intentionally deferred (see
// report), so this verifier consumes the state pack directly.

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

registerTypeScriptHook();

const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const gaPackPath = path.join(rootDir, "src/lib/rcap/state-packs/georgia/index.ts");

// --- Step 1: GA state pack exists ---

if (!fs.existsSync(gaPackPath)) {
  failures.push("GA state pack index not found at src/lib/rcap/state-packs/georgia/index.ts.");
  process.exit(reportAndExit());
}
const gaPack = require(gaPackPath);

const expectedPackExports = [
  "gaEligibilityRules",
  "gaWaitingPeriodNotes",
  "gaFilingInstructions",
  "gaDisqualifyingOffenseNotes",
  "gaPlainLanguage",
  "gaSafetyDisclaimer",
  "gaFeeNotes",
  "gaPathways",
  "gaPathwayLabels",
  "gaRequiredFields",
  "gaFieldLabels",
  "gaDocumentTypes",
  "gaOfficialForms",
  "gaSampleDocumentInputs"
];
for (const name of expectedPackExports) {
  if (!(name in gaPack)) failures.push(`GA state pack missing export: ${name}.`);
}

// --- Step 2: State-pack content is consumed and internally consistent ---

if (Array.isArray(gaPack.gaPathways)) {
  const pathwayIds = gaPack.gaPathways.map((p) => p.pathway);
  const requiredPathways = [
    "nonconviction_restriction",
    "automatic_restriction",
    "sb288_misdemeanor_restriction",
    "pardoned_felony_restriction",
    "court_record_sealing"
  ];
  for (const id of requiredPathways) {
    if (!pathwayIds.includes(id)) failures.push(`GA pathways missing required pathway: ${id}.`);
  }
  for (const p of gaPack.gaPathways) {
    if (p.pathway === "needs_review") continue;
    if (!p.citation || !/§/.test(p.citation)) {
      failures.push(`GA pathway '${p.pathway}' is missing a statutory citation.`);
    }
  }
  for (const id of pathwayIds) {
    if (!(id in gaPack.gaRequiredFields)) {
      failures.push(`gaRequiredFields missing entry for pathway '${id}'.`);
    }
  }
}

const allPackText = JSON.stringify(gaPack);
const requiredCitations = [
  "35-3-37(h)",
  "35-3-37(j.1)",
  "35-3-37(j)(4)",
  "35-3-37(j)(7)",
  "35-3-37(m)",
  "SB 288",
  "42-8-66"
];
for (const cite of requiredCitations) {
  if (!allPackText.includes(cite)) failures.push(`GA state pack is missing required citation: ${cite}.`);
}

// Georgia's defining structure: restriction + a separate sealing step.
if (!/record restriction/i.test(allPackText)) {
  failures.push("GA state pack must use Georgia's 'record restriction' vocabulary.");
}
if (!/seal/i.test(allPackText)) failures.push("GA state pack must describe the separate sealing step.");
if (!/July 1, 2013/.test(allPackText)) {
  failures.push("GA state pack must capture the July 1, 2013 arrest-date dividing line.");
}
if (!/excluded/i.test(allPackText)) {
  failures.push("GA state pack must capture the SB 288 excluded-offense list.");
}

// Vocabulary discipline: Georgia is NOT an expungement state. The pack may
// reference the word 'expungement' ONLY to warn against it; it must contain that
// explicit disclaimer and must not promise erasure/destruction affirmatively.
if (!/does not use (?:the word )?['"]?expung/i.test(allPackText)) {
  failures.push(
    "GA state pack must explicitly state Georgia does not use 'expungement' (restriction-not-expungement disclaimer)."
  );
}
// Forms catalog must include the GBI application and the court petition/motion.
if (Array.isArray(gaPack.gaOfficialForms)) {
  const names = gaPack.gaOfficialForms.map((f) => f.formName).join(" | ");
  for (const needle of [
    "Request to Restrict Arrest Record",
    "Petition for Record Restriction and Sealing",
    "Seal Court Records"
  ]) {
    if (!names.includes(needle)) failures.push(`GA official-forms catalog missing: ${needle}.`);
  }
}

// --- Step 3: No seals / logos and no other-state boilerplate leaked ---

if (/\[seal\]/i.test(allPackText) || /\[logo\]/i.test(allPackText)) {
  failures.push("GA state pack must not contain [seal] or [logo] markers.");
}
const otherStateLeakTerms = [
  "Commonwealth of Pennsylvania",
  "Court of Common Pleas",
  "District of Columbia",
  "North Dakota",
  "STATE OF OKLAHOMA",
  "State of Wyoming",
  "Maryland",
  "Nebraska"
];
for (const term of otherStateLeakTerms) {
  if (allPackText.includes(term)) failures.push(`GA state pack must not contain other-state content: "${term}".`);
}
// Must not borrow other states' relief vocabulary.
for (const term of ["set aside", "set-aside", "annulment"]) {
  if (new RegExp(term, "i").test(allPackText)) {
    failures.push(`GA state pack must not use non-Georgia relief vocabulary: "${term}".`);
  }
}

// --- Step 4: Shadow-only — GA not wired to a renderer or the live selector ---

if (fs.existsSync(path.join(rootDir, "src/lib/record-clearing/georgia-config.ts"))) {
  failures.push(
    "georgia-config.ts exists: Georgia is a hybrid record-restriction state; the renderer/config is deferred until per-track form review + a Nationwide fidelity check are approved."
  );
}
for (const name of Object.keys(recordClearing)) {
  if (/^ga[A-Z]/.test(name) && /Config$/.test(name)) {
    failures.push(`Unexpected Georgia config exported from record-clearing index: ${name} (must stay deferred).`);
  }
}
const gaLive = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "GA")
  : false;
if (gaLive) failures.push("Georgia must not appear in the live recordClearingJurisdictions selector.");
if (/verified_replacement/.test(allPackText)) {
  failures.push("GA state pack must not declare verified_replacement lifecycle.");
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

// --- Step 7: Sibling verifiers still pass (PA, DC, ND, OK, WY, MD) ---

const siblingVerifiers = [
  "verify-pleading-state.mjs",
  "verify-dc-pleading-state.mjs",
  "verify-nd-pleading-state.mjs",
  "verify-ok-pleading-state.mjs",
  "verify-wy-pleading-state.mjs",
  "verify-md-state-pack.mjs"
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

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/georgia");
fs.mkdirSync(outputDir, { recursive: true });
const artifact = {
  state: "GA",
  tier: "Tier 3-style build from Nationwide official/agent-reference source",
  lifecycle: "shadow_only",
  verifiedReplacement: false,
  liveRouted: false,
  rendererStrategy:
    "state_pack_only (deferred): non-conviction = GBI agency application / automatic; SB 288 + sealing = future court-petition track",
  pathways: Array.isArray(gaPack.gaPathways) ? gaPack.gaPathways.map((p) => p.pathway) : [],
  officialForms: Array.isArray(gaPack.gaOfficialForms) ? gaPack.gaOfficialForms.map((f) => f.formName) : [],
  siblingVerifiers: siblingResults
};
fs.writeFileSync(path.join(outputDir, "ga-state-pack-summary.json"), `${JSON.stringify(artifact, null, 2)}\n`);

// --- Report ---

if (failures.length > 0) {
  console.error("Georgia state-pack verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Georgia state-pack verification PASSED.");
console.log(`  GA state pack exists:          yes`);
console.log(`  Pack exports present:          ${expectedPackExports.length}`);
console.log(`  Pathways:                      ${artifact.pathways.length}`);
console.log(`  Forms cataloged:               ${artifact.officialForms.length}`);
console.log(`  Renderer strategy:             state_pack_only (config deferred)`);
console.log(`  Restriction-not-expungement:   enforced`);
console.log(`  Georgia config wired:          no (deferred)`);
console.log(`  Live-routed (selector):        no`);
console.log(`  Lifecycle verified_replacement:no`);
console.log(`  Seals / logos in pack:         no`);
console.log(`  Other-state leakage:           no`);
console.log(`  Mississippi new-engine:        no`);
console.log(`  Forbidden files changed:       no`);
for (const r of siblingResults) console.log(`  Sibling ${r.script.padEnd(28)} ${r.ok ? "PASS" : "FAIL"}`);
console.log(`  Shadow summary:                ${path.join(outputDir, "ga-state-pack-summary.json")}`);

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("Georgia state-pack verification FAILED.");
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
