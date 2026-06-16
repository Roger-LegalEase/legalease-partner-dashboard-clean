import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Maine is a SEALING state: the adult remedy is record SEALING, not expungement
// (Maine does not erase adult records). Routes: general adult conviction sealing
// (15 M.R.S. §§ 2261-2264; CR-218), former Class E engaging-in-prostitution
// sealing (§ 2262-A; CR-289), sex-trafficking/exploitation survivor sealing
// (§ 2262-B; PL 2025 ch. 513), non-conviction confidentiality (16 M.R.S.
// §§ 703, 705), pardon confidentiality, and juvenile sealing (automatic +
// petition under § 3308-C; JV-043). This verifier proves the Maine STATE PACK
// was built from the Nationwide source and remains shadow-only research: NOT
// wired to any renderer, NOT in the live jurisdiction selector, and NOT
// verified_replacement. The overlay/config is intentionally deferred (see
// report), so this verifier consumes the state pack directly.

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

registerTypeScriptHook();

const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const mePackPath = path.join(rootDir, "src/lib/rcap/state-packs/maine/index.ts");

// --- Step 1: ME state pack exists ---

if (!fs.existsSync(mePackPath)) {
  failures.push("ME state pack index not found at src/lib/rcap/state-packs/maine/index.ts.");
  process.exit(reportAndExit());
}
const mePack = require(mePackPath);

const expectedPackExports = [
  "meEligibilityRules",
  "meWaitingPeriodNotes",
  "meFilingInstructions",
  "meDisqualifyingOffenseNotes",
  "mePlainLanguage",
  "meSafetyDisclaimer",
  "meFeeNotes",
  "mePathways",
  "mePathwayLabels",
  "meRequiredFields",
  "meFieldLabels",
  "meDocumentTypes",
  "meOfficialForms",
  "meSampleDocumentInputs"
];
for (const name of expectedPackExports) {
  if (!(name in mePack)) failures.push(`ME state pack missing export: ${name}.`);
}

// --- Step 2: State-pack content is consumed and internally consistent ---

if (Array.isArray(mePack.mePathways)) {
  const pathwayIds = mePack.mePathways.map((p) => p.pathway);
  const requiredPathways = [
    "general_adult_conviction_sealing",
    "engaging_in_prostitution_sealing",
    "trafficking_survivor_sealing",
    "non_conviction_confidentiality",
    "pardon_confidentiality",
    "juvenile_automatic_sealing",
    "juvenile_petition_sealing"
  ];
  for (const id of requiredPathways) {
    if (!pathwayIds.includes(id)) failures.push(`ME pathways missing required pathway: ${id}.`);
  }
  for (const p of mePack.mePathways) {
    if (!p.citation || !/M\.R\.S\./.test(p.citation)) {
      failures.push(`ME pathway '${p.pathway}' is missing an M.R.S. citation.`);
    }
  }
  for (const id of pathwayIds) {
    if (!(id in mePack.meRequiredFields)) {
      failures.push(`meRequiredFields missing entry for pathway '${id}'.`);
    }
  }
}

const allPackText = JSON.stringify(mePack);
const requiredCitations = [
  "15 M.R.S. §§ 2261-2264",
  "§ 2262-A",
  "§ 2262-B",
  "§ 3308-C",
  "16 M.R.S.",
  "CR-218",
  "CR-289",
  "JV-043"
];
for (const cite of requiredCitations) {
  if (!allPackText.includes(cite)) failures.push(`ME state pack is missing required citation: ${cite}.`);
}

// Maine's defining structure and vocabulary: SEALING, not expungement.
if (!/CR-218/.test(allPackText)) failures.push("ME state pack must center on the CR-218 sealing motion.");
if (!/seal(?:ing|ed|s)?/i.test(allPackText)) failures.push("ME state pack must use 'sealing' vocabulary.");
if (!/not expungement|does not (?:erase|have)|not (?:erase|expunge)/i.test(allPackText)) {
  failures.push("ME state pack must state the remedy is sealing, not expungement.");
}
if (!/confidential criminal[- ]history/i.test(allPackText)) {
  failures.push("ME state pack must capture the confidential-criminal-history framing.");
}
if (!/4 years|four[- ]year/i.test(allPackText)) {
  failures.push("ME state pack must capture the general 4-year clean period.");
}
if (!/Class E/.test(allPackText)) {
  failures.push("ME state pack must capture the Class E eligibility limit.");
}

// Forms catalog must include the core Maine Judicial Branch forms.
if (Array.isArray(mePack.meOfficialForms)) {
  const names = mePack.meOfficialForms.map((f) => `${f.formNumber || ""} ${f.officialName}`).join(" | ");
  for (const needle of ["CR-218", "CR-289", "JV-043"]) {
    if (!names.includes(needle)) failures.push(`ME official-forms catalog missing: ${needle}.`);
  }
}

// --- Step 3: No seals / logos and no other-state boilerplate leaked ---

if (/\[seal\]/i.test(allPackText) || /\[logo\]/i.test(allPackText)) {
  failures.push("ME state pack must not contain [seal] or [logo] markers.");
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
  "Massachusetts",
  "FDLE",
  "Nebraska",
  "RSMo",
  "NRS ",
  "NMSA",
  "M.G.L.",
  "Crim. Proc.",
  "610.140",
  "29-3A"
];
for (const term of otherStateLeakTerms) {
  if (allPackText.includes(term)) failures.push(`ME state pack must not contain other-state content: "${term}".`);
}
// Must not borrow other states' relief vocabulary.
for (const term of ["Clean Slate", "record restriction", "annulment", "Certificate of Eligibility", "set aside", "set-aside"]) {
  if (new RegExp(term, "i").test(allPackText)) {
    failures.push(`ME state pack must not use non-Maine relief vocabulary: "${term}".`);
  }
}

// --- Step 4: Shadow-only — ME not wired to a renderer or the live selector ---

if (fs.existsSync(path.join(rootDir, "src/lib/record-clearing/maine-config.ts"))) {
  failures.push(
    "maine-config.ts exists: Maine is a mandatory official-form sealing state; the overlay/field-map/config is deferred until per-form review + a Nationwide fidelity check are approved."
  );
}
for (const name of Object.keys(recordClearing)) {
  if (/^me[A-Z]/.test(name) && /Config$/.test(name)) {
    failures.push(`Unexpected Maine config exported from record-clearing index: ${name} (must stay deferred).`);
  }
}
const meLive = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "ME")
  : false;
if (meLive) failures.push("Maine must not appear in the live recordClearingJurisdictions selector.");
if (/verified_replacement/.test(allPackText)) {
  failures.push("ME state pack must not declare verified_replacement lifecycle.");
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

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/maine");
fs.mkdirSync(outputDir, { recursive: true });
const artifact = {
  state: "ME",
  tier: "Tier 2/hybrid (statewide agent RTF + official MJB form PDFs -> structured state pack)",
  lifecycle: "shadow_only",
  verifiedReplacement: false,
  liveRouted: false,
  rendererStrategy:
    "official_pdf_form_filling / overlay (deferred, per-form): Maine uses statewide CR-218/CR-289/JV-043 forms; non-conviction is a confidential-criminal-history route, not CR-218; config deferred pending form review",
  pathways: Array.isArray(mePack.mePathways) ? mePack.mePathways.map((p) => p.pathway) : [],
  officialForms: Array.isArray(mePack.meOfficialForms)
    ? mePack.meOfficialForms.map((f) => f.formNumber || f.officialName)
    : [],
  siblingVerifiers: siblingResults
};
fs.writeFileSync(path.join(outputDir, "me-state-pack-summary.json"), `${JSON.stringify(artifact, null, 2)}\n`);

// --- Report ---

if (failures.length > 0) {
  console.error("Maine state-pack verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Maine state-pack verification PASSED.");
console.log(`  ME state pack exists:          yes`);
console.log(`  Pack exports present:          ${expectedPackExports.length}`);
console.log(`  Pathways:                      ${artifact.pathways.length}`);
console.log(`  Official forms cataloged:      ${artifact.officialForms.length}`);
console.log(`  Renderer strategy:             official_pdf/overlay (config deferred)`);
console.log(`  Sealing-not-expungement framing:enforced`);
console.log(`  Maine config wired:            no (deferred)`);
console.log(`  Live-routed (selector):        no`);
console.log(`  Lifecycle verified_replacement:no`);
console.log(`  Seals / logos in pack:         no`);
console.log(`  Other-state leakage:           no`);
console.log(`  Mississippi new-engine:        no`);
console.log(`  Forbidden files changed:       no`);
for (const r of siblingResults) console.log(`  Sibling ${r.script.padEnd(28)} ${r.ok ? "PASS" : "FAIL"}`);
console.log(`  Shadow summary:                ${path.join(outputDir, "me-state-pack-summary.json")}`);

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("Maine state-pack verification FAILED.");
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
