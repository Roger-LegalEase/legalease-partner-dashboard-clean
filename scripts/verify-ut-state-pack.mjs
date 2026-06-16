import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Utah is a MULTI-PATHWAY expungement state under Utah Code Title 77, Chapter 40a.
// It uses BOTH automatic Clean Slate expungement and petition-based expungement;
// most adult petitions require a Utah Bureau of Criminal Identification (BCI)
// Certificate of Eligibility, but traffic and medical-cannabis petitions do not.
// Separate routes cover non-conviction expungement, pardon-based expungement,
// juvenile expungement, and vacatur/human-trafficking expungement (§ 77-40a-402),
// with certificate bars in § 77-40a-303. This verifier proves the Utah STATE PACK
// was built from the Nationwide source and remains shadow-only research: NOT wired
// to any renderer, NOT in the live jurisdiction selector, and NOT
// verified_replacement. The overlay/config is intentionally deferred (see report),
// so this verifier consumes the state pack directly.

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

registerTypeScriptHook();

const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const utPackPath = path.join(rootDir, "src/lib/rcap/state-packs/utah/index.ts");

// --- Step 1: UT state pack exists ---

if (!fs.existsSync(utPackPath)) {
  failures.push("UT state pack index not found at src/lib/rcap/state-packs/utah/index.ts.");
  process.exit(reportAndExit());
}
const utPack = require(utPackPath);

const expectedPackExports = [
  "utEligibilityRules",
  "utWaitingPeriodNotes",
  "utFilingInstructions",
  "utDisqualifyingOffenseNotes",
  "utPlainLanguage",
  "utSafetyDisclaimer",
  "utFeeNotes",
  "utPathways",
  "utPathwayLabels",
  "utRequiredFields",
  "utFieldLabels",
  "utDocumentTypes",
  "utOfficialForms",
  "utSampleDocumentInputs"
];
for (const name of expectedPackExports) {
  if (!(name in utPack)) failures.push(`UT state pack missing export: ${name}.`);
}

// --- Step 2: State-pack content is consumed and internally consistent ---

if (Array.isArray(utPack.utPathways)) {
  const pathwayIds = utPack.utPathways.map((p) => p.pathway);
  const requiredPathways = [
    "automatic_clean_slate_expungement",
    "petition_certificate_conviction_expungement",
    "petition_non_conviction_expungement",
    "traffic_expungement",
    "cannabis_possession_expungement",
    "pardon_based_expungement",
    "juvenile_expungement",
    "vacatur_trafficking_expungement"
  ];
  for (const id of requiredPathways) {
    if (!pathwayIds.includes(id)) failures.push(`UT pathways missing required pathway: ${id}.`);
  }
  for (const p of utPack.utPathways) {
    if (!p.citation || !/Utah Code/.test(p.citation)) {
      failures.push(`UT pathway '${p.pathway}' is missing a Utah Code citation.`);
    }
  }
  for (const id of pathwayIds) {
    if (!(id in utPack.utRequiredFields)) {
      failures.push(`utRequiredFields missing entry for pathway '${id}'.`);
    }
  }
}

const allPackText = JSON.stringify(utPack);
const requiredCitations = [
  "Utah Code",
  "Title 77",
  "Chapter 40a",
  "77-40a",
  "§ 77-40a-303",
  "§ 77-40a-402",
  "41-6a-501",
  "BCI"
];
for (const cite of requiredCitations) {
  if (!allPackText.includes(cite)) failures.push(`UT state pack is missing required citation: ${cite}.`);
}

// Utah's defining structure and vocabulary.
const requiredVocabulary = [
  "expungement",
  "Clean Slate",
  "Certificate of Eligibility",
  "plea in abeyance",
  "vacatur",
  "sealing",
  "automatic"
];
for (const term of requiredVocabulary) {
  if (!new RegExp(term, "i").test(allPackText)) {
    failures.push(`UT state pack must use Utah vocabulary: "${term}".`);
  }
}
if (!/not[^.]*destr/i.test(allPackText)) {
  failures.push("UT state pack must capture that expungement is sealing/restriction, not destruction.");
}
if (!/does not finish the expungement|certificate does not finish/i.test(allPackText)) {
  failures.push("UT state pack must capture that a BCI certificate does not finish the expungement.");
}
if (!/\$65/.test(allPackText)) {
  failures.push("UT state pack must capture the $65 BCI application fee.");
}
if (!/180 days/.test(allPackText)) {
  failures.push("UT state pack must capture the 180-day BCI certificate validity / petition window.");
}

// Forms catalog must include the core local Utah Courts expungement petition/order forms.
if (Array.isArray(utPack.utOfficialForms)) {
  const names = utPack.utOfficialForms.map((f) => `${f.formId || ""} ${f.officialName}`).join(" | ");
  for (const needle of ["1002EX", "1022EX", "1003EX", "1023EX"]) {
    if (!names.includes(needle)) failures.push(`UT official-forms catalog missing: ${needle}.`);
  }
}

// --- Step 3: No seals / logos and no other-state boilerplate leaked ---

if (/\[seal\]/i.test(allPackText) || /\[logo\]/i.test(allPackText)) {
  failures.push("UT state pack must not contain [seal] or [logo] markers.");
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
  // Sibling new-state signatures (UT must not leak into/from VT, WA, WV, WI).
  "V.S.A.",
  "VCIC",
  "RCW ",
  "CrRLJ",
  "W. Va. Code",
  "SCA-C",
  "Wis. Stat.",
  "DOJ-CIB",
  "CR-266"
];
for (const term of otherStateLeakTerms) {
  if (allPackText.includes(term)) failures.push(`UT state pack must not contain other-state content: "${term}".`);
}
// Must not borrow other states' relief vocabulary. Utah legitimately uses
// "expungement", "Clean Slate", "Certificate of Eligibility", "sealing", "vacatur",
// and "pardon", so those are NOT banned here.
for (const term of ["annulment", "record restriction", "set-aside"]) {
  if (new RegExp(term, "i").test(allPackText)) {
    failures.push(`UT state pack must not use non-Utah relief vocabulary: "${term}".`);
  }
}

// --- Step 4: Shadow-only — UT not wired to a renderer or the live selector ---

if (fs.existsSync(path.join(rootDir, "src/lib/record-clearing/utah-config.ts"))) {
  failures.push(
    "utah-config.ts exists: Utah uses official Utah Courts forms and the BCI certificate process; the renderer/field-map/config is deferred until per-form review + a Nationwide fidelity check are approved."
  );
}
for (const name of Object.keys(recordClearing)) {
  if (/^ut[A-Z]/.test(name) && /Config$/.test(name)) {
    failures.push(`Unexpected Utah config exported from record-clearing index: ${name} (must stay deferred).`);
  }
}
const utLive = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "UT")
  : false;
if (utLive) failures.push("Utah must not appear in the live recordClearingJurisdictions selector.");
if (/verified_replacement/.test(allPackText)) {
  failures.push("UT state pack must not declare verified_replacement lifecycle.");
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

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/utah");
fs.mkdirSync(outputDir, { recursive: true });
const artifact = {
  state: "UT",
  tier: "Tier 2 (Wilma reference + official Utah Courts traffic/cannabis forms and BCI process -> structured state pack)",
  lifecycle: "shadow_only",
  verifiedReplacement: false,
  liveRouted: false,
  rendererStrategy:
    "official_pdf_form_filling / overlay (deferred, per-form): Utah Courts traffic (1002EX/1022EX) and cannabis (1003EX/1023EX) petition/order forms plus optional support forms; BCI certificate-based adult petitions, automatic Clean Slate, juvenile, pardon, and vacatur routes are agency/court processes; config deferred",
  pathways: Array.isArray(utPack.utPathways) ? utPack.utPathways.map((p) => p.pathway) : [],
  officialForms: Array.isArray(utPack.utOfficialForms)
    ? utPack.utOfficialForms.map((f) => f.formId || f.officialName)
    : [],
  siblingVerifiers: siblingResults
};
fs.writeFileSync(path.join(outputDir, "ut-state-pack-summary.json"), `${JSON.stringify(artifact, null, 2)}\n`);

// --- Report ---

if (failures.length > 0) {
  console.error("Utah state-pack verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Utah state-pack verification PASSED.");
console.log(`  UT state pack exists:          yes`);
console.log(`  Pack exports present:          ${expectedPackExports.length}`);
console.log(`  Pathways:                      ${artifact.pathways.length}`);
console.log(`  Official forms cataloged:      ${artifact.officialForms.length}`);
console.log(`  Renderer strategy:             official_pdf/overlay (config deferred)`);
console.log(`  Sealing-not-destruction framing:enforced`);
console.log(`  Utah config wired:             no (deferred)`);
console.log(`  Live-routed (selector):        no`);
console.log(`  Lifecycle verified_replacement:no`);
console.log(`  Seals / logos in pack:         no`);
console.log(`  Other-state leakage:           no`);
console.log(`  Mississippi new-engine:        no`);
console.log(`  Forbidden files changed:       no`);
for (const r of siblingResults) console.log(`  Sibling ${r.script.padEnd(28)} ${r.ok ? "PASS" : "FAIL"}`);
console.log(`  Shadow summary:                ${path.join(outputDir, "ut-state-pack-summary.json")}`);

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("Utah state-pack verification FAILED.");
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
