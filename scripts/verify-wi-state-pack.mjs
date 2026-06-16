import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Wisconsin is one of the NARROWEST expungement states. Adult conviction
// expungement (Wis. Stat. § 973.015) usually must be ordered AT SENTENCING and only
// removes the court record (it does not vacate the conviction); execution uses a
// certificate of discharge or CR-266/CR-267. Other routes: mandatory youthful
// invasion-of-privacy expungement (§ 942.08), trafficking-victim prostitution relief
// (§ 973.015(2m); § 944.30), DOJ-CIB arrest fingerprint removal (§ 165.84), juvenile
// adjudication expungement (§ 938.355(4m)), and a non-expungement pardon route. This
// verifier proves the Wisconsin STATE PACK was built from the Nationwide source and
// remains shadow-only research: NOT wired to any renderer, NOT in the live
// jurisdiction selector, and NOT verified_replacement. The overlay/config is
// intentionally deferred (see report), so this verifier consumes the state pack
// directly.
//
// SOURCE NOTE: the missing-official-forms audit flagged Wisconsin needs_web_research
// for collecting blank official PDFs. CR-266 and CR-267 ARE present locally; JD-1780,
// DJ-LE-250B, and DJ-LE-247 are documented by number but not present as local blank
// PDFs. That official-PDF gap is recorded in official-forms.ts and does not affect
// this shadow-only research pack, which is built from the counsel-researched Wilma
// reference.

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

registerTypeScriptHook();

const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const wiPackPath = path.join(rootDir, "src/lib/rcap/state-packs/wisconsin/index.ts");

// --- Step 1: WI state pack exists ---

if (!fs.existsSync(wiPackPath)) {
  failures.push("WI state pack index not found at src/lib/rcap/state-packs/wisconsin/index.ts.");
  process.exit(reportAndExit());
}
const wiPack = require(wiPackPath);

const expectedPackExports = [
  "wiEligibilityRules",
  "wiWaitingPeriodNotes",
  "wiFilingInstructions",
  "wiDisqualifyingOffenseNotes",
  "wiPlainLanguage",
  "wiSafetyDisclaimer",
  "wiFeeNotes",
  "wiPathways",
  "wiPathwayLabels",
  "wiRequiredFields",
  "wiFieldLabels",
  "wiDocumentTypes",
  "wiOfficialForms",
  "wiSampleDocumentInputs"
];
for (const name of expectedPackExports) {
  if (!(name in wiPack)) failures.push(`WI state pack missing export: ${name}.`);
}

// --- Step 2: State-pack content is consumed and internally consistent ---

if (Array.isArray(wiPack.wiPathways)) {
  const pathwayIds = wiPack.wiPathways.map((p) => p.pathway);
  const requiredPathways = [
    "adult_conviction_expungement_at_sentencing",
    "youthful_invasion_of_privacy_mandatory_expungement",
    "trafficking_victim_prostitution_relief",
    "non_conviction_arrest_fingerprint_removal",
    "juvenile_adjudication_expungement",
    "pardon_rights_restoration"
  ];
  for (const id of requiredPathways) {
    if (!pathwayIds.includes(id)) failures.push(`WI pathways missing required pathway: ${id}.`);
  }
  for (const p of wiPack.wiPathways) {
    if (!p.citation || !/Wis\. Stat\.|DOJ/.test(p.citation)) {
      failures.push(`WI pathway '${p.pathway}' is missing a Wis. Stat. (or DOJ-process) citation.`);
    }
  }
  for (const id of pathwayIds) {
    if (!(id in wiPack.wiRequiredFields)) {
      failures.push(`wiRequiredFields missing entry for pathway '${id}'.`);
    }
  }
}

const allPackText = JSON.stringify(wiPack);
const requiredCitations = [
  "Wis. Stat.",
  "§ 973.015",
  "973.015(2m)",
  "§ 938.355(4m)",
  "§ 165.84",
  "§ 942.08",
  "§ 944.30"
];
for (const cite of requiredCitations) {
  if (!allPackText.includes(cite)) failures.push(`WI state pack is missing required citation: ${cite}.`);
}

// Wisconsin's defining structure and vocabulary.
const requiredVocabulary = [
  "expungement",
  "at sentencing",
  "successful completion",
  "certificate of discharge",
  "DOJ-CIB",
  "CCAP"
];
for (const term of requiredVocabulary) {
  if (!new RegExp(term, "i").test(allPackText)) {
    failures.push(`WI state pack must use Wisconsin vocabulary: "${term}".`);
  }
}
if (!/only the court record/i.test(allPackText)) {
  failures.push("WI state pack must capture that expungement removes only the court record.");
}
if (!/not vacate the conviction/i.test(allPackText)) {
  failures.push("WI state pack must capture that expungement does not vacate the conviction or set it aside.");
}
if (!/narrow/i.test(allPackText)) {
  failures.push("WI state pack must capture that Wisconsin is one of the narrowest expungement states.");
}

// Forms catalog must include the core Wisconsin expungement forms (CR-266/CR-267
// present locally; JD-1780/DJ-LE-250B documented).
if (Array.isArray(wiPack.wiOfficialForms)) {
  const names = wiPack.wiOfficialForms.map((f) => `${f.formId || ""} ${f.officialName}`).join(" | ");
  for (const needle of ["CR-266", "CR-267", "JD-1780", "DJ-LE-250B"]) {
    if (!names.includes(needle)) failures.push(`WI official-forms catalog missing: ${needle}.`);
  }
  // The local-blank-PDF source flag must be honest: CR-266/CR-267 present, the
  // DOJ/juvenile forms documented-but-not-local.
  const cr266 = wiPack.wiOfficialForms.find((f) => f.formId === "CR-266");
  if (cr266 && cr266.blankPdfInSource !== true) {
    failures.push("WI official-forms: CR-266 should be marked blankPdfInSource true (present locally).");
  }
  const jd1780 = wiPack.wiOfficialForms.find((f) => f.formId === "JD-1780");
  if (jd1780 && jd1780.blankPdfInSource !== false) {
    failures.push("WI official-forms: JD-1780 should be marked blankPdfInSource false (documented, not local).");
  }
}

// --- Step 3: No seals / logos and no other-state boilerplate leaked ---

if (/\[seal\]/i.test(allPackText) || /\[logo\]/i.test(allPackText)) {
  failures.push("WI state pack must not contain [seal] or [logo] markers.");
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
  // Sibling new-state signatures (WI must not leak into/from UT, VT, WA, WV).
  "Utah Code",
  "BCI",
  "V.S.A.",
  "VCIC",
  "RCW ",
  "CrRLJ",
  "W. Va. Code",
  "SCA-C"
];
for (const term of otherStateLeakTerms) {
  if (allPackText.includes(term)) failures.push(`WI state pack must not contain other-state content: "${term}".`);
}
// Must not borrow other states' relief vocabulary. Wisconsin legitimately uses
// "expungement", "vacate" (trafficking route), and "set it aside" (explaining what
// expungement does NOT do); only clearly non-Wisconsin relief labels are banned.
for (const term of ["annulment", "record restriction", "Certificate of Eligibility", "Clean Slate"]) {
  if (new RegExp(term, "i").test(allPackText)) {
    failures.push(`WI state pack must not use non-Wisconsin relief vocabulary: "${term}".`);
  }
}

// --- Step 4: Shadow-only — WI not wired to a renderer or the live selector ---

if (fs.existsSync(path.join(rootDir, "src/lib/record-clearing/wisconsin-config.ts"))) {
  failures.push(
    "wisconsin-config.ts exists: Wisconsin uses official Wisconsin Court System/DOJ-CIB forms; the renderer/field-map/config is deferred until per-form review + a Nationwide fidelity check are approved (and the JD-1780/DJ-LE official PDFs are still being collected)."
  );
}
for (const name of Object.keys(recordClearing)) {
  if (/^wi[A-Z]/.test(name) && /Config$/.test(name)) {
    failures.push(`Unexpected Wisconsin config exported from record-clearing index: ${name} (must stay deferred).`);
  }
}
const wiLive = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "WI")
  : false;
if (wiLive) failures.push("Wisconsin must not appear in the live recordClearingJurisdictions selector.");
if (/verified_replacement/.test(allPackText)) {
  failures.push("WI state pack must not declare verified_replacement lifecycle.");
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

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/wisconsin");
fs.mkdirSync(outputDir, { recursive: true });
const artifact = {
  state: "WI",
  tier: "Tier 2 (Wilma reference + official Wisconsin CR-266/CR-267 forms -> structured state pack; JD-1780/DJ-LE-250B/DJ-LE-247 official PDFs documented but not yet collected)",
  lifecycle: "shadow_only",
  verifiedReplacement: false,
  liveRouted: false,
  rendererStrategy:
    "official_pdf_form_filling / overlay (deferred, per-form): Wisconsin adult expungement CR-266 petition / CR-267 order; juvenile JD-1780; DOJ-CIB DJ-LE-250B fingerprint removal and DJ-LE-247 record challenge; adult expungement turns on the at-sentencing order; config deferred",
  pathways: Array.isArray(wiPack.wiPathways) ? wiPack.wiPathways.map((p) => p.pathway) : [],
  officialForms: Array.isArray(wiPack.wiOfficialForms)
    ? wiPack.wiOfficialForms.map((f) => `${f.formId}${f.blankPdfInSource ? "(local)" : "(documented)"}`)
    : [],
  sourceFlags: [
    "CR-266 and CR-267 present locally as blank official PDFs.",
    "JD-1780, DJ-LE-250B, and DJ-LE-247 documented by form number but not present as local blank PDFs (audit needs_web_research for the live/overlay stage)."
  ],
  siblingVerifiers: siblingResults
};
fs.writeFileSync(path.join(outputDir, "wi-state-pack-summary.json"), `${JSON.stringify(artifact, null, 2)}\n`);

// --- Report ---

if (failures.length > 0) {
  console.error("Wisconsin state-pack verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Wisconsin state-pack verification PASSED.");
console.log(`  WI state pack exists:          yes`);
console.log(`  Pack exports present:          ${expectedPackExports.length}`);
console.log(`  Pathways:                      ${artifact.pathways.length}`);
console.log(`  Official forms cataloged:      ${artifact.officialForms.length}`);
console.log(`  Renderer strategy:             official_pdf/overlay (config deferred)`);
console.log(`  At-sentencing framing:         enforced`);
console.log(`  Court-record-only (not vacate):enforced`);
console.log(`  Wisconsin config wired:        no (deferred)`);
console.log(`  Live-routed (selector):        no`);
console.log(`  Lifecycle verified_replacement:no`);
console.log(`  Seals / logos in pack:         no`);
console.log(`  Other-state leakage:           no`);
console.log(`  Mississippi new-engine:        no`);
console.log(`  Forbidden files changed:       no`);
console.log(`  Source flag:                   CR-266/CR-267 local; JD-1780/DJ-LE-250B/DJ-LE-247 documented (needs_web_research for live stage)`);
for (const r of siblingResults) console.log(`  Sibling ${r.script.padEnd(28)} ${r.ok ? "PASS" : "FAIL"}`);
console.log(`  Shadow summary:                ${path.join(outputDir, "wi-state-pack-summary.json")}`);

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("Wisconsin state-pack verification FAILED.");
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
