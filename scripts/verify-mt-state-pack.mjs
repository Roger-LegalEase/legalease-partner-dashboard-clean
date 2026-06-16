import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Montana is a MULTI-PATHWAY state: misdemeanor conviction expungement (Mont.
// Code Ann. Title 46, ch. 18, part 11; § 46-18-1104; 5-year, once-in-a-lifetime),
// non-conviction removal via CRISS (§ 44-5-202), deferred-sentence dismissal /
// confidentiality (§ 46-18-204), and marijuana relief under the MMRTA
// (§ 16-12-113). This verifier proves the Montana STATE PACK was built from the
// Nationwide source and remains shadow-only research: NOT wired to any renderer,
// NOT in the live jurisdiction selector, and NOT verified_replacement. The
// overlay/config is intentionally deferred (see report), so this verifier
// consumes the state pack directly.

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

registerTypeScriptHook();

const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const mtPackPath = path.join(rootDir, "src/lib/rcap/state-packs/montana/index.ts");

// --- Step 1: MT state pack exists ---

if (!fs.existsSync(mtPackPath)) {
  failures.push("MT state pack index not found at src/lib/rcap/state-packs/montana/index.ts.");
  process.exit(reportAndExit());
}
const mtPack = require(mtPackPath);

const expectedPackExports = [
  "mtEligibilityRules",
  "mtWaitingPeriodNotes",
  "mtFilingInstructions",
  "mtDisqualifyingOffenseNotes",
  "mtPlainLanguage",
  "mtSafetyDisclaimer",
  "mtFeeNotes",
  "mtPathways",
  "mtPathwayLabels",
  "mtRequiredFields",
  "mtFieldLabels",
  "mtDocumentTypes",
  "mtOfficialForms",
  "mtSampleDocumentInputs"
];
for (const name of expectedPackExports) {
  if (!(name in mtPack)) failures.push(`MT state pack missing export: ${name}.`);
}

// --- Step 2: State-pack content is consumed and internally consistent ---

if (Array.isArray(mtPack.mtPathways)) {
  const pathwayIds = mtPack.mtPathways.map((p) => p.pathway);
  const requiredPathways = [
    "misdemeanor_conviction_expungement",
    "non_conviction_removal",
    "deferred_sentence_dismissal",
    "marijuana_relief",
    "felony_non_marijuana_unavailable"
  ];
  for (const id of requiredPathways) {
    if (!pathwayIds.includes(id)) failures.push(`MT pathways missing required pathway: ${id}.`);
  }
  for (const p of mtPack.mtPathways) {
    if (!p.citation || !/Mont\. Code Ann\./.test(p.citation)) {
      failures.push(`MT pathway '${p.pathway}' is missing a Mont. Code Ann. citation.`);
    }
  }
  for (const id of pathwayIds) {
    if (!(id in mtPack.mtRequiredFields)) {
      failures.push(`mtRequiredFields missing entry for pathway '${id}'.`);
    }
  }
}

const allPackText = JSON.stringify(mtPack);
const requiredCitations = [
  "§ 46-18-1104",
  "§ 44-5-202",
  "§ 46-18-204",
  "§ 16-12-113",
  "§ 46-18-1107",
  "§ 46-18-1108",
  "Title 46",
  "§ 45-5-201"
];
for (const cite of requiredCitations) {
  if (!allPackText.includes(cite)) failures.push(`MT state pack is missing required citation: ${cite}.`);
}

// Montana's defining structure and vocabulary.
if (!/46-18-1104/.test(allPackText)) failures.push("MT state pack must center on § 46-18-1104.");
if (!/expungement/i.test(allPackText)) failures.push("MT state pack must use 'expungement'.");
if (!/once[- ]in[- ]a[- ]lifetime|once in a lifetime/i.test(allPackText)) {
  failures.push("MT state pack must capture the once-in-a-lifetime misdemeanor expungement rule.");
}
if (!/CRISS/.test(allPackText)) {
  failures.push("MT state pack must capture the DOJ/CRISS non-conviction removal route.");
}
if (!/marijuana|MMRTA/i.test(allPackText)) {
  failures.push("MT state pack must capture the MMRTA marijuana route.");
}
if (!/five[- ]year|5 years/i.test(allPackText)) {
  failures.push("MT state pack must capture the five-year clean period.");
}

// Forms catalog must include the misdemeanor packet and MMRTA forms.
if (Array.isArray(mtPack.mtOfficialForms)) {
  const names = mtPack.mtOfficialForms.map((f) => `${f.formId || ""} ${f.officialName}`).join(" | ");
  for (const needle of ["srmisexp2025", "MMRTA Form A", "MMRTA Form B"]) {
    if (!names.includes(needle)) failures.push(`MT official-forms catalog missing: ${needle}.`);
  }
}

// --- Step 3: No seals / logos and no other-state boilerplate leaked ---

if (/\[seal\]/i.test(allPackText) || /\[logo\]/i.test(allPackText)) {
  failures.push("MT state pack must not contain [seal] or [logo] markers.");
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
  "RSMo",
  "NRS ",
  "NMSA",
  "M.R.S.",
  "M.G.L.",
  "RSA ",
  "Ohio Rev. Code",
  "Crim. Proc.",
  "610.140",
  "29-3A"
];
for (const term of otherStateLeakTerms) {
  if (allPackText.includes(term)) failures.push(`MT state pack must not contain other-state content: "${term}".`);
}
// Must not borrow other states' relief vocabulary (Montana legitimately uses
// "sealing", "redesignation", and "resentencing", so those are NOT banned here).
for (const term of ["annulment", "Clean Slate", "record restriction", "Certificate of Eligibility"]) {
  if (new RegExp(term, "i").test(allPackText)) {
    failures.push(`MT state pack must not use non-Montana relief vocabulary: "${term}".`);
  }
}

// --- Step 4: Shadow-only — MT not wired to a renderer or the live selector ---

if (fs.existsSync(path.join(rootDir, "src/lib/record-clearing/montana-config.ts"))) {
  failures.push(
    "montana-config.ts exists: Montana uses official court packets; the renderer/field-map/config is deferred until per-form review + a Nationwide fidelity check are approved."
  );
}
for (const name of Object.keys(recordClearing)) {
  if (/^mt[A-Z]/.test(name) && /Config$/.test(name)) {
    failures.push(`Unexpected Montana config exported from record-clearing index: ${name} (must stay deferred).`);
  }
}
const mtLive = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "MT")
  : false;
if (mtLive) failures.push("Montana must not appear in the live recordClearingJurisdictions selector.");
if (/verified_replacement/.test(allPackText)) {
  failures.push("MT state pack must not declare verified_replacement lifecycle.");
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

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/montana");
fs.mkdirSync(outputDir, { recursive: true });
const artifact = {
  state: "MT",
  tier: "Tier 2/hybrid (Wilma RTF + official court packet/forms -> structured state pack)",
  lifecycle: "shadow_only",
  verifiedReplacement: false,
  liveRouted: false,
  rendererStrategy:
    "official_pdf_form_filling / overlay (deferred, per-form): Montana misdemeanor packet (srmisexp2025) + MMRTA Form A/B + DOJ removal request; CRISS non-conviction removal is an agency route; config deferred",
  pathways: Array.isArray(mtPack.mtPathways) ? mtPack.mtPathways.map((p) => p.pathway) : [],
  officialForms: Array.isArray(mtPack.mtOfficialForms)
    ? mtPack.mtOfficialForms.map((f) => f.formId || f.officialName)
    : [],
  siblingVerifiers: siblingResults
};
fs.writeFileSync(path.join(outputDir, "mt-state-pack-summary.json"), `${JSON.stringify(artifact, null, 2)}\n`);

// --- Report ---

if (failures.length > 0) {
  console.error("Montana state-pack verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Montana state-pack verification PASSED.");
console.log(`  MT state pack exists:          yes`);
console.log(`  Pack exports present:          ${expectedPackExports.length}`);
console.log(`  Pathways:                      ${artifact.pathways.length}`);
console.log(`  Official forms cataloged:      ${artifact.officialForms.length}`);
console.log(`  Renderer strategy:             official_pdf/overlay (config deferred)`);
console.log(`  Once-in-a-lifetime framing:    enforced`);
console.log(`  Montana config wired:          no (deferred)`);
console.log(`  Live-routed (selector):        no`);
console.log(`  Lifecycle verified_replacement:no`);
console.log(`  Seals / logos in pack:         no`);
console.log(`  Other-state leakage:           no`);
console.log(`  Mississippi new-engine:        no`);
console.log(`  Forbidden files changed:       no`);
for (const r of siblingResults) console.log(`  Sibling ${r.script.padEnd(28)} ${r.ok ? "PASS" : "FAIL"}`);
console.log(`  Shadow summary:                ${path.join(outputDir, "mt-state-pack-summary.json")}`);

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("Montana state-pack verification FAILED.");
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
