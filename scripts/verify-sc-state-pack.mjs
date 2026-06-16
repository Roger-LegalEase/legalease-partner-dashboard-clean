import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// South Carolina is a MULTI-PATHWAY, narrow-lane expungement state under the
// Uniform Expungement Act (S.C. Code § 17-22-910 et seq.). Routing is by court
// level + disposition + offense type + prior record + waiting period: summary
// court non-conviction (§ 17-22-950), General Sessions non-conviction (§ 17-1-40),
// diversion completions (PTI § 17-22-150, AEP § 17-22-530, TEP § 17-22-330),
// conditional discharge drug possession (§ 44-53-450), and conviction routes
// (§ 34-11-90(e), § 22-5-910, § 22-5-920 YOA, § 22-5-930 drug, § 56-5-750(F)),
// plus the old-handgun special-deadline route (§ 17-1-65 / SCCA 223C), human-
// trafficking-survivor relief, juvenile expungement (§ 63-19-2050), and a pardon-
// is-not-expungement flag. This verifier proves the South Carolina STATE PACK was
// built from the Nationwide source and remains shadow-only research: NOT wired to
// any renderer, NOT in the live jurisdiction selector, and NOT verified_replacement.
// The overlay/config is intentionally deferred (see report), so this verifier
// consumes the state pack directly.

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

registerTypeScriptHook();

const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const scPackPath = path.join(rootDir, "src/lib/rcap/state-packs/south-carolina/index.ts");

// --- Step 1: SC state pack exists ---

if (!fs.existsSync(scPackPath)) {
  failures.push("SC state pack index not found at src/lib/rcap/state-packs/south-carolina/index.ts.");
  process.exit(reportAndExit());
}
const scPack = require(scPackPath);

const expectedPackExports = [
  "scEligibilityRules",
  "scWaitingPeriodNotes",
  "scFilingInstructions",
  "scDisqualifyingOffenseNotes",
  "scPlainLanguage",
  "scSafetyDisclaimer",
  "scFeeNotes",
  "scPathways",
  "scPathwayLabels",
  "scRequiredFields",
  "scFieldLabels",
  "scDocumentTypes",
  "scOfficialForms",
  "scSampleDocumentInputs"
];
for (const name of expectedPackExports) {
  if (!(name in scPack)) failures.push(`SC state pack missing export: ${name}.`);
}

// --- Step 2: State-pack content is consumed and internally consistent ---

if (Array.isArray(scPack.scPathways)) {
  const pathwayIds = scPack.scPathways.map((p) => p.pathway);
  const requiredPathways = [
    "summary_court_non_conviction",
    "general_sessions_non_conviction",
    "pretrial_intervention_completion",
    "alcohol_education_program",
    "traffic_education_program",
    "conditional_discharge_drug",
    "fraudulent_check_first_offense",
    "first_low_level_conviction",
    "youthful_offender_act",
    "drug_conviction_route",
    "failure_to_stop_blue_light",
    "old_unlawful_handgun_possession",
    "human_trafficking_survivor",
    "juvenile_expungement",
    "pardon_not_expungement"
  ];
  for (const id of requiredPathways) {
    if (!pathwayIds.includes(id)) failures.push(`SC pathways missing required pathway: ${id}.`);
  }
  for (const p of scPack.scPathways) {
    if (!p.citation || !/S\.C\. Code/.test(p.citation)) {
      failures.push(`SC pathway '${p.pathway}' is missing an S.C. Code citation.`);
    }
  }
  for (const id of pathwayIds) {
    if (!(id in scPack.scRequiredFields)) {
      failures.push(`scRequiredFields missing entry for pathway '${id}'.`);
    }
  }
}

const allPackText = JSON.stringify(scPack);
const requiredCitations = [
  "S.C. Code",
  "§ 17-1-40",
  "§ 17-22-950",
  "§ 22-5-910",
  "§ 22-5-920",
  "§ 44-53-450",
  "§ 63-19-2050",
  "§ 17-22-150",
  "§ 34-11-90(e)",
  "§ 56-5-750(F)",
  "§ 17-1-65"
];
for (const cite of requiredCitations) {
  if (!allPackText.includes(cite)) failures.push(`SC state pack is missing required citation: ${cite}.`);
}

// South Carolina's defining structure and vocabulary.
if (!/expungement/i.test(allPackText)) failures.push("SC state pack must use 'expungement'.");
if (!/summary court/i.test(allPackText)) failures.push("SC state pack must use 'summary court' vocabulary.");
if (!/General Sessions/.test(allPackText)) failures.push("SC state pack must use 'General Sessions' vocabulary.");
if (!/Solicitor/.test(allPackText)) failures.push("SC state pack must use 'Solicitor' vocabulary.");
if (!/SLED/.test(allPackText)) failures.push("SC state pack must use 'SLED' vocabulary.");
if (!/nolle pross/i.test(allPackText)) failures.push("SC state pack must use 'nolle prossed' vocabulary.");
if (!/Youthful Offender/i.test(allPackText)) failures.push("SC state pack must capture the Youthful Offender Act route.");
if (!/pardon[^]*?(not|separate)[^]*?expungement|expungement[^]*?(not|separate)[^]*?pardon/i.test(allPackText)) {
  failures.push("SC state pack must capture that a pardon is NOT expungement.");
}
if (!/3[- ]year|three[- ]year/i.test(allPackText)) {
  failures.push("SC state pack must capture the § 22-5-910 three-year waiting period.");
}
if (!/5[- ]year|five[- ]year/i.test(allPackText)) {
  failures.push("SC state pack must capture a five-year waiting period (YOA / DV-3rd).");
}

// Forms catalog must include the SCCA 223E and 223D forms and reference the 223A1 packet.
if (Array.isArray(scPack.scOfficialForms)) {
  const names = scPack.scOfficialForms.map((f) => `${f.formId || ""} ${f.officialName}`).join(" | ");
  for (const needle of ["SCCA 223E", "SCCA 223D", "SCCA 223A1"]) {
    if (!names.includes(needle)) failures.push(`SC official-forms catalog missing: ${needle}.`);
  }
}

// --- Step 3: No seals / logos and no other-state boilerplate leaked ---

if (/\[seal\]/i.test(allPackText) || /\[logo\]/i.test(allPackText)) {
  failures.push("SC state pack must not contain [seal] or [logo] markers.");
}
// Other-state leak list COPIED from the Montana verifier, with the Montana-specific
// tokens (Montana / Mont. Code Ann. / MMRTA / CRISS) ADDED so South Carolina cannot
// borrow Montana boilerplate. No SC-legitimate vocabulary appears in this list, so
// nothing was removed for SC's own sake.
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
  "RSMo",
  "NRS ",
  "NMSA",
  "M.R.S.",
  "M.G.L.",
  "RSA ",
  "Ohio Rev. Code",
  "Crim. Proc.",
  "610.140",
  "29-3A",
  "Montana",
  "Mont. Code Ann.",
  "MMRTA",
  "CRISS"
];
for (const term of otherStateLeakTerms) {
  if (allPackText.includes(term)) failures.push(`SC state pack must not contain other-state content: "${term}".`);
}
// Must not borrow other states' relief vocabulary (South Carolina legitimately uses
// "expungement", "conditional discharge", "pardon", and "noncriminal disposition",
// so those are NOT banned here).
for (const term of ["annulment", "Clean Slate", "record restriction", "Certificate of Eligibility", "redesignation", "set-aside"]) {
  if (new RegExp(term, "i").test(allPackText)) {
    failures.push(`SC state pack must not use non-South-Carolina relief vocabulary: "${term}".`);
  }
}

// --- Step 4: Shadow-only — SC not wired to a renderer or the live selector ---

if (fs.existsSync(path.join(rootDir, "src/lib/record-clearing/south-carolina-config.ts"))) {
  failures.push(
    "south-carolina-config.ts exists: South Carolina uses official SCCA court forms; the renderer/field-map/config is deferred until per-form review + a Nationwide fidelity check are approved."
  );
}
for (const name of Object.keys(recordClearing)) {
  if (/^sc[A-Z]/.test(name) && /Config$/.test(name)) {
    failures.push(`Unexpected South Carolina config exported from record-clearing index: ${name} (must stay deferred).`);
  }
}
const scLive = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "SC")
  : false;
if (scLive) failures.push("South Carolina must not appear in the live recordClearingJurisdictions selector.");
if (/verified_replacement/.test(allPackText)) {
  failures.push("SC state pack must not declare verified_replacement lifecycle.");
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

// --- Step 7: Sibling verifiers still pass (18 established) ---

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
  "verify-oh-state-pack.mjs"
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

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/south-carolina");
fs.mkdirSync(outputDir, { recursive: true });
const artifact = {
  state: "SC",
  tier: "Tier 2/hybrid (Wilma RTF + official SCCA court forms -> structured state pack)",
  lifecycle: "shadow_only",
  verifiedReplacement: false,
  liveRouted: false,
  rendererStrategy:
    "official_pdf_form_filling / overlay (deferred, per-form): South Carolina SCCA expungement forms (SCCA 223A1 application packet, SCCA 223A1(a), SCCA 223B1 order, SCCA 223C old-handgun, SCCA 223D objection, SCCA 223E summary-court not-fingerprinted, SCCA 492); routing through the Solicitor's Office (General Sessions) and summary court (magistrate/municipal); config and field-map overlay deferred pending per-form visual review + Nationwide fidelity check",
  pathways: Array.isArray(scPack.scPathways) ? scPack.scPathways.map((p) => p.pathway) : [],
  officialForms: Array.isArray(scPack.scOfficialForms)
    ? scPack.scOfficialForms.map((f) => f.formId || f.officialName)
    : [],
  siblingVerifiers: siblingResults
};
fs.writeFileSync(path.join(outputDir, "sc-state-pack-summary.json"), `${JSON.stringify(artifact, null, 2)}\n`);

// --- Report ---

if (failures.length > 0) {
  console.error("South Carolina state-pack verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("South Carolina state-pack verification PASSED.");
console.log(`  SC state pack exists:          yes`);
console.log(`  Pack exports present:          ${expectedPackExports.length}`);
console.log(`  Pathways:                      ${artifact.pathways.length}`);
console.log(`  Official forms cataloged:      ${artifact.officialForms.length}`);
console.log(`  Renderer strategy:             official_pdf/overlay (config deferred)`);
console.log(`  Pardon != expungement framing: enforced`);
console.log(`  South Carolina config wired:   no (deferred)`);
console.log(`  Live-routed (selector):        no`);
console.log(`  Lifecycle verified_replacement:no`);
console.log(`  Seals / logos in pack:         no`);
console.log(`  Other-state leakage:           no`);
console.log(`  Mississippi new-engine:        no`);
console.log(`  Forbidden files changed:       no`);
for (const r of siblingResults) console.log(`  Sibling ${r.script.padEnd(28)} ${r.ok ? "PASS" : "FAIL"}`);
console.log(`  Shadow summary:                ${path.join(outputDir, "sc-state-pack-summary.json")}`);

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("South Carolina state-pack verification FAILED.");
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
