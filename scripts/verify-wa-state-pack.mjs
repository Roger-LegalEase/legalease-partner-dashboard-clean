import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Washington is a VACATION state, not a normal expungement state. Adult convictions
// are vacated (RCW 9.96.060 misdemeanor/gross misdemeanor; RCW 9.94A.640 felony),
// non-conviction data is deleted (RCW 10.97.060), juvenile records are sealed (RCW
// 13.50.260), simple drug-possession convictions are vacated under State v. Blake,
// and victim/survivor routes use RCW 9.96.080 / RCW 9.94A.648. This verifier proves
// the Washington STATE PACK was built from the Nationwide source and remains
// shadow-only research: NOT wired to any renderer, NOT in the live jurisdiction
// selector, and NOT verified_replacement. The overlay/config is intentionally
// deferred (see report), so this verifier consumes the state pack directly.

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

registerTypeScriptHook();

const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const waPackPath = path.join(rootDir, "src/lib/rcap/state-packs/washington/index.ts");

// --- Step 1: WA state pack exists ---

if (!fs.existsSync(waPackPath)) {
  failures.push("WA state pack index not found at src/lib/rcap/state-packs/washington/index.ts.");
  process.exit(reportAndExit());
}
const waPack = require(waPackPath);

const expectedPackExports = [
  "waEligibilityRules",
  "waWaitingPeriodNotes",
  "waFilingInstructions",
  "waDisqualifyingOffenseNotes",
  "waPlainLanguage",
  "waSafetyDisclaimer",
  "waFeeNotes",
  "waPathways",
  "waPathwayLabels",
  "waRequiredFields",
  "waFieldLabels",
  "waDocumentTypes",
  "waOfficialForms",
  "waSampleDocumentInputs"
];
for (const name of expectedPackExports) {
  if (!(name in waPack)) failures.push(`WA state pack missing export: ${name}.`);
}

// --- Step 2: State-pack content is consumed and internally consistent ---

if (Array.isArray(waPack.waPathways)) {
  const pathwayIds = waPack.waPathways.map((p) => p.pathway);
  const requiredPathways = [
    "misdemeanor_gross_misdemeanor_vacation",
    "felony_vacation",
    "non_conviction_deletion",
    "blake_drug_possession_vacatur",
    "cannabis_misdemeanor_vacation",
    "victim_survivor_vacation",
    "juvenile_sealing",
    "treaty_indian_fishing_vacation"
  ];
  for (const id of requiredPathways) {
    if (!pathwayIds.includes(id)) failures.push(`WA pathways missing required pathway: ${id}.`);
  }
  for (const p of waPack.waPathways) {
    if (!p.citation || !/RCW|Blake/.test(p.citation)) {
      failures.push(`WA pathway '${p.pathway}' is missing an RCW (or Blake) citation.`);
    }
  }
  for (const id of pathwayIds) {
    if (!(id in waPack.waRequiredFields)) {
      failures.push(`waRequiredFields missing entry for pathway '${id}'.`);
    }
  }
}

const allPackText = JSON.stringify(waPack);
const requiredCitations = [
  "RCW",
  "9.96.060",
  "9.94A.640",
  "10.97.060",
  "13.50.260",
  "9.96.080",
  "9.94A.648"
];
for (const cite of requiredCitations) {
  if (!allPackText.includes(cite)) failures.push(`WA state pack is missing required citation: ${cite}.`);
}

// Washington's defining structure and vocabulary.
const requiredVocabulary = ["vacate", "vacation", "sealing", "deletion", "Blake"];
for (const term of requiredVocabulary) {
  if (!new RegExp(term, "i").test(allPackText)) {
    failures.push(`WA state pack must use Washington vocabulary: "${term}".`);
  }
}
if (!/not expunge/i.test(allPackText)) {
  failures.push("WA state pack must capture that adult relief is vacation, not expungement.");
}
if (!/restore firearm rights/i.test(allPackText)) {
  failures.push("WA state pack must capture that vacation does not automatically restore firearm rights.");
}

// Forms catalog must include the core Washington Courts vacation/sealing forms.
if (Array.isArray(waPack.waOfficialForms)) {
  const names = waPack.waOfficialForms.map((f) => `${f.formId || ""} ${f.officialName}`).join(" | ");
  for (const needle of ["CrRLJ 09.0100", "CrRLJ 09.0200", "CR 08.0900", "JU 10.0320"]) {
    if (!names.includes(needle)) failures.push(`WA official-forms catalog missing: ${needle}.`);
  }
}

// --- Step 3: No seals / logos and no other-state boilerplate leaked ---

if (/\[seal\]/i.test(allPackText) || /\[logo\]/i.test(allPackText)) {
  failures.push("WA state pack must not contain [seal] or [logo] markers.");
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
  "New Hampshire",
  "Ohio",
  "FDLE",
  "Nebraska",
  "Mississippi",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "SDCL",
  "RSMo",
  "NRS ",
  "NMSA",
  "M.R.S.",
  "M.G.L.",
  "RSA ",
  "Ohio Rev. Code",
  "610.140",
  "Mont. Code Ann.",
  "Montana",
  // Sibling new-state signatures (WA must not leak into/from UT, VT, WV, WI).
  "Utah Code",
  "BCI",
  "V.S.A.",
  "VCIC",
  "W. Va. Code",
  "SCA-C",
  "Wis. Stat.",
  "DOJ-CIB",
  "CR-266"
];
for (const term of otherStateLeakTerms) {
  if (allPackText.includes(term)) failures.push(`WA state pack must not contain other-state content: "${term}".`);
}
// Must not borrow other states' relief vocabulary. Washington legitimately uses
// "vacate/vacation", "sealing" (juvenile), "deletion" (non-conviction), "set aside
// the verdict", and even "expungement" when explaining what vacation is NOT; only
// clearly non-Washington relief labels are banned.
for (const term of ["annulment", "record restriction", "Certificate of Eligibility", "Clean Slate"]) {
  if (new RegExp(term, "i").test(allPackText)) {
    failures.push(`WA state pack must not use non-Washington relief vocabulary: "${term}".`);
  }
}

// --- Step 4: Shadow-only — WA not wired to a renderer or the live selector ---

if (fs.existsSync(path.join(rootDir, "src/lib/record-clearing/washington-config.ts"))) {
  failures.push(
    "washington-config.ts exists: Washington uses official Washington Courts/WSP forms; the renderer/field-map/config is deferred until per-form review + a Nationwide fidelity check are approved."
  );
}
for (const name of Object.keys(recordClearing)) {
  if (/^wa[A-Z]/.test(name) && /Config$/.test(name)) {
    failures.push(`Unexpected Washington config exported from record-clearing index: ${name} (must stay deferred).`);
  }
}
const waLive = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "WA")
  : false;
if (waLive) failures.push("Washington must not appear in the live recordClearingJurisdictions selector.");
if (/verified_replacement/.test(allPackText)) {
  failures.push("WA state pack must not declare verified_replacement lifecycle.");
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

// --- Step 7: Sibling verifiers still pass (21 established baseline) ---

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
  "verify-ma-state-pack.mjs",
  "verify-mt-state-pack.mjs",
  "verify-nh-state-pack.mjs",
  "verify-oh-state-pack.mjs",
  "verify-ri-state-pack.mjs",
  "verify-sc-state-pack.mjs",
  "verify-sd-state-pack.mjs"
];
const siblingResults = [];
// Recursion guard. When this verifier is itself spawned by another verifier it
// runs with RCAP_VERIFIER_CHILD=1; in that case it still performs all of its own
// real checks above but MUST NOT re-run its own sibling loop -- otherwise each
// sibling would recursively spawn its own siblings and fan out exponentially. A
// top-level run (flag unset) spawns each sibling exactly once, passing the flag
// down, so the child's own sibling loop is skipped.
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

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/washington");
fs.mkdirSync(outputDir, { recursive: true });
const artifact = {
  state: "WA",
  tier: "Tier 2 / guardrail-pleading (Wilma reference + official Washington Courts CrRLJ/CR/JU vacation & sealing forms -> structured state pack)",
  lifecycle: "shadow_only",
  verifiedReplacement: false,
  liveRouted: false,
  rendererStrategy:
    "official_pdf_form_filling / overlay (deferred, per-form): Washington Courts misdemeanor (CrRLJ 09.0100/09.0200), felony (CR 08.0900/08.0920), cannabis (CrRLJ 09.0800/09.0870), juvenile sealing (JU 10.0300/10.0320), and treaty-fishing forms; Blake vacatur and WSP non-conviction deletion are agency/court processes; local county rules may add documents; config deferred",
  pathways: Array.isArray(waPack.waPathways) ? waPack.waPathways.map((p) => p.pathway) : [],
  officialForms: Array.isArray(waPack.waOfficialForms)
    ? waPack.waOfficialForms.map((f) => f.formId || f.officialName)
    : [],
  siblingVerifiers: siblingResults
};
fs.writeFileSync(path.join(outputDir, "wa-state-pack-summary.json"), `${JSON.stringify(artifact, null, 2)}\n`);

// --- Report ---

if (failures.length > 0) {
  console.error("Washington state-pack verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Washington state-pack verification PASSED.");
console.log(`  WA state pack exists:          yes`);
console.log(`  Pack exports present:          ${expectedPackExports.length}`);
console.log(`  Pathways:                      ${artifact.pathways.length}`);
console.log(`  Official forms cataloged:      ${artifact.officialForms.length}`);
console.log(`  Renderer strategy:             official_pdf/overlay (config deferred)`);
console.log(`  Vacation-not-expungement framing:enforced`);
console.log(`  Firearm-rights caveat:         enforced`);
console.log(`  Washington config wired:       no (deferred)`);
console.log(`  Live-routed (selector):        no`);
console.log(`  Lifecycle verified_replacement:no`);
console.log(`  Seals / logos in pack:         no`);
console.log(`  Other-state leakage:           no`);
console.log(`  Mississippi new-engine:        no`);
console.log(`  Forbidden files changed:       no`);
for (const r of siblingResults) console.log(`  Sibling ${r.script.padEnd(28)} ${r.ok ? "PASS" : "FAIL"}`);
console.log(`  Shadow summary:                ${path.join(outputDir, "wa-state-pack-summary.json")}`);

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("Washington state-pack verification FAILED.");
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
