import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Louisiana is a STATUTORY-FORM expungement state: the remedy is EXPUNGEMENT
// (removal from public access, not destruction), filed as a "Motion for
// Expungement" under La. Code Crim. Proc. tit. XXXIV (arts. 971-999.1). Routes
// span no-conviction (arts. 976-977), misdemeanor (art. 977: 894(B) set-aside or
// 5-year), felony (art. 978: 893(E) set-aside, 10-year, first-offender pardon,
// 978(E) violent exception), first-offense marijuana (art. 998), interim
// expungement (arts. 994-995), redaction, trafficking-victim, automated
// (art. 985.2), and immediate after program (art. 985.3). This verifier proves
// the Louisiana STATE PACK was built from the Nationwide source and remains
// shadow-only research: NOT wired to any renderer, NOT in the live jurisdiction
// selector, and NOT verified_replacement. The overlay/config is intentionally
// deferred (see report), so this verifier consumes the state pack directly.

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

registerTypeScriptHook();

const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const laPackPath = path.join(rootDir, "src/lib/rcap/state-packs/louisiana/index.ts");

// --- Step 1: LA state pack exists ---

if (!fs.existsSync(laPackPath)) {
  failures.push("LA state pack index not found at src/lib/rcap/state-packs/louisiana/index.ts.");
  process.exit(reportAndExit());
}
const laPack = require(laPackPath);

const expectedPackExports = [
  "laEligibilityRules",
  "laWaitingPeriodNotes",
  "laFilingInstructions",
  "laDisqualifyingOffenseNotes",
  "laPlainLanguage",
  "laSafetyDisclaimer",
  "laFeeNotes",
  "laPathways",
  "laPathwayLabels",
  "laRequiredFields",
  "laFieldLabels",
  "laDocumentTypes",
  "laOfficialForms",
  "laStatutorySourceFiles",
  "laSampleDocumentInputs"
];
for (const name of expectedPackExports) {
  if (!(name in laPack)) failures.push(`LA state pack missing export: ${name}.`);
}

// --- Step 2: State-pack content is consumed and internally consistent ---

if (Array.isArray(laPack.laPathways)) {
  const pathwayIds = laPack.laPathways.map((p) => p.pathway);
  const requiredPathways = [
    "no_conviction_expungement",
    "misdemeanor_conviction_expungement",
    "felony_conviction_expungement",
    "first_offense_marijuana_expungement",
    "interim_expungement",
    "expungement_by_redaction",
    "human_trafficking_victim",
    "automated_expungement",
    "immediate_expungement_after_program"
  ];
  for (const id of requiredPathways) {
    if (!pathwayIds.includes(id)) failures.push(`LA pathways missing required pathway: ${id}.`);
  }
  for (const p of laPack.laPathways) {
    if (!p.citation || !/Crim\. Proc\./.test(p.citation)) {
      failures.push(`LA pathway '${p.pathway}' is missing a La. Code Crim. Proc. citation.`);
    }
  }
  for (const id of pathwayIds) {
    if (!(id in laPack.laRequiredFields)) {
      failures.push(`laRequiredFields missing entry for pathway '${id}'.`);
    }
  }
}

const allPackText = JSON.stringify(laPack);
const requiredCitations = [
  "art. 977",
  "art. 978",
  "art. 998",
  "arts. 994-995",
  "art. 985.2",
  "art. 985.3",
  "art. 893",
  "art. 894",
  "art. 989",
  "tit. XXXIV"
];
for (const cite of requiredCitations) {
  if (!allPackText.includes(cite)) failures.push(`LA state pack is missing required citation: ${cite}.`);
}

// Louisiana's defining structure and vocabulary: motion-based expungement.
if (!/Motion for Expungement/i.test(allPackText)) {
  failures.push("LA state pack must center on the 'Motion for Expungement' (art. 989).");
}
if (!/expungement/i.test(allPackText)) failures.push("LA state pack must use 'expungement'.");
if (!/public access/i.test(allPackText)) {
  failures.push("LA state pack must capture the removal-from-public-access concept.");
}
if (!/first[- ]offender pardon/i.test(allPackText)) {
  failures.push("LA state pack must capture the first-offender-pardon felony route.");
}
if (!/\$550/.test(allPackText)) failures.push("LA state pack must capture the $550 standard fee cap.");

// Forms catalog must include the core statutory expungement forms.
if (Array.isArray(laPack.laOfficialForms)) {
  const names = laPack.laOfficialForms.map((f) => `${f.article || ""} ${f.officialName}`).join(" | ");
  for (const needle of ["Art. 989", "Art. 987", "Art. 998"]) {
    if (!names.includes(needle)) failures.push(`LA official-forms catalog missing: ${needle}.`);
  }
}

// --- Step 3: No seals / logos and no other-state boilerplate leaked ---

if (/\[seal\]/i.test(allPackText) || /\[logo\]/i.test(allPackText)) {
  failures.push("LA state pack must not contain [seal] or [logo] markers.");
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
  "Maine",
  "Massachusetts",
  "FDLE",
  "Nebraska",
  "RSMo",
  "NRS ",
  "NMSA",
  "M.R.S.",
  "M.G.L.",
  "610.140",
  "29-3A"
];
for (const term of otherStateLeakTerms) {
  if (allPackText.includes(term)) failures.push(`LA state pack must not contain other-state content: "${term}".`);
}
// Must not borrow other states' relief vocabulary (Louisiana legitimately uses
// "set aside" under arts. 893/894, so that is NOT banned here).
for (const term of ["Clean Slate", "record restriction", "annulment", "Certificate of Eligibility", "record sealing"]) {
  if (new RegExp(term, "i").test(allPackText)) {
    failures.push(`LA state pack must not use non-Louisiana relief vocabulary: "${term}".`);
  }
}

// --- Step 4: Shadow-only — LA not wired to a renderer or the live selector ---

if (fs.existsSync(path.join(rootDir, "src/lib/record-clearing/louisiana-config.ts"))) {
  failures.push(
    "louisiana-config.ts exists: Louisiana uses statutory codal forms; the renderer/field-map/config is deferred until per-article form review + a Nationwide fidelity check are approved."
  );
}
for (const name of Object.keys(recordClearing)) {
  if (/^la[A-Z]/.test(name) && /Config$/.test(name)) {
    failures.push(`Unexpected Louisiana config exported from record-clearing index: ${name} (must stay deferred).`);
  }
}
const laLive = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "LA")
  : false;
if (laLive) failures.push("Louisiana must not appear in the live recordClearingJurisdictions selector.");
if (/verified_replacement/.test(allPackText)) {
  failures.push("LA state pack must not declare verified_replacement lifecycle.");
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

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/louisiana");
fs.mkdirSync(outputDir, { recursive: true });
const artifact = {
  state: "LA",
  tier: "Tier 2/hybrid (statewide agent RTF + Louisiana Laws HTML statutes / codal forms -> structured state pack)",
  lifecycle: "shadow_only",
  verifiedReplacement: false,
  liveRouted: false,
  rendererStrategy:
    "official_pdf_form_filling / overlay (deferred, per-article): Louisiana forms are statutory (arts. 987-995, 998, 999.1); Motion for Expungement (art. 989) + orders; config deferred pending codal-form review",
  pathways: Array.isArray(laPack.laPathways) ? laPack.laPathways.map((p) => p.pathway) : [],
  officialForms: Array.isArray(laPack.laOfficialForms)
    ? laPack.laOfficialForms.map((f) => f.article || f.officialName)
    : [],
  siblingVerifiers: siblingResults
};
fs.writeFileSync(path.join(outputDir, "la-state-pack-summary.json"), `${JSON.stringify(artifact, null, 2)}\n`);

// --- Report ---

if (failures.length > 0) {
  console.error("Louisiana state-pack verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Louisiana state-pack verification PASSED.");
console.log(`  LA state pack exists:          yes`);
console.log(`  Pack exports present:          ${expectedPackExports.length}`);
console.log(`  Pathways:                      ${artifact.pathways.length}`);
console.log(`  Official forms cataloged:      ${artifact.officialForms.length}`);
console.log(`  Renderer strategy:             official_pdf/overlay (config deferred)`);
console.log(`  Removal-not-destruction framing:enforced`);
console.log(`  Louisiana config wired:        no (deferred)`);
console.log(`  Live-routed (selector):        no`);
console.log(`  Lifecycle verified_replacement:no`);
console.log(`  Seals / logos in pack:         no`);
console.log(`  Other-state leakage:           no`);
console.log(`  Mississippi new-engine:        no`);
console.log(`  Forbidden files changed:       no`);
for (const r of siblingResults) console.log(`  Sibling ${r.script.padEnd(28)} ${r.ok ? "PASS" : "FAIL"}`);
console.log(`  Shadow summary:                ${path.join(outputDir, "la-state-pack-summary.json")}`);

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("Louisiana state-pack verification FAILED.");
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
