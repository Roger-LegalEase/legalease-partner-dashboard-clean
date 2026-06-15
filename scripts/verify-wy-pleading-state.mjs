import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

registerTypeScriptHook();

const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const wyPackPath = path.join(rootDir, "src/lib/rcap/state-packs/wyoming/index.ts");

// --- Step 1: WY state pack exists ---

if (!fs.existsSync(wyPackPath)) {
  failures.push("WY state pack index not found at src/lib/rcap/state-packs/wyoming/index.ts.");
  process.exit(reportAndExit());
}
const wyPack = require(wyPackPath);

const expectedPackExports = [
  "wyEligibilityRules",
  "wyWaitingPeriodNotes",
  "wyFilingInstructions",
  "wyDisqualifyingOffenseNotes",
  "wyPlainLanguage",
  "wySafetyDisclaimer",
  "wyFeeNotes",
  "wyPathwayLabels",
  "wyRequiredFields",
  "wyDocumentTypes"
];
for (const name of expectedPackExports) {
  if (!(name in wyPack)) failures.push(`WY state pack missing export: ${name}.`);
}

// --- Step 2: WY config exists and consumes the WY state pack ---

const {
  wyNonconvictionExpungementConfig,
  wyMisdemeanorConvictionExpungementConfig,
  wyFelonyConvictionExpungementConfig,
  wyPleadingConfigs,
  getWyPleadingConfig,
  renderCustomPleading,
  runPleadingQa,
  buildPleadingAuditManifest
} = recordClearing;

if (!wyPleadingConfigs) failures.push("wyPleadingConfigs not exported from record-clearing index.");
if (!wyNonconvictionExpungementConfig)
  failures.push("wyNonconvictionExpungementConfig not found in record-clearing index.");
if (!wyMisdemeanorConvictionExpungementConfig)
  failures.push("wyMisdemeanorConvictionExpungementConfig not found in record-clearing index.");
if (!wyFelonyConvictionExpungementConfig)
  failures.push("wyFelonyConvictionExpungementConfig not found in record-clearing index.");

const nonConvConfig = wyNonconvictionExpungementConfig;
if (nonConvConfig) {
  if (nonConvConfig.jurisdictionCode !== "WY")
    failures.push(`Expected jurisdictionCode 'WY', got '${nonConvConfig.jurisdictionCode}'.`);
  if (nonConvConfig.primaryReliefTerm !== "expungement")
    failures.push(`Expected primaryReliefTerm 'expungement', got '${nonConvConfig.primaryReliefTerm}'.`);
  if (nonConvConfig.templateGrade !== "legal_ops_custom_pleading")
    failures.push(`Expected templateGrade 'legal_ops_custom_pleading', got '${nonConvConfig.templateGrade}'.`);
  if (nonConvConfig.templateLifecycle !== "replacement_candidate")
    failures.push(`Expected templateLifecycle 'replacement_candidate', got '${nonConvConfig.templateLifecycle}'.`);
  if (nonConvConfig.templateLifecycle === "verified_replacement")
    failures.push("WY config lifecycle must NOT be verified_replacement.");
  if (!nonConvConfig.counselFlags || nonConvConfig.counselFlags.length === 0)
    failures.push("WY config must include counselFlags for unverified items.");
}

// Consumption checks: config values must come from the WY state pack.
if (nonConvConfig && wyPack) {
  if (nonConvConfig.serviceNote !== wyPack.wyFilingInstructions[1])
    failures.push("WY non-conviction config serviceNote does not come from wyFilingInstructions[1].");
  if (nonConvConfig.primaryStatutoryAuthority[0].description !== wyPack.wyEligibilityRules[1])
    failures.push("WY non-conviction config statutory authority description does not come from wyEligibilityRules[1].");
  const flagsJoined = nonConvConfig.counselFlags.join(" ");
  if (!flagsJoined.includes(wyPack.wyPlainLanguage.adultExpungementIsSealing))
    failures.push("WY non-conviction config counselFlags must include wyPlainLanguage.adultExpungementIsSealing.");
  if (!flagsJoined.includes(wyPack.wyDisqualifyingOffenseNotes[5]))
    failures.push("WY non-conviction config counselFlags must include wyDisqualifyingOffenseNotes scope-limits text.");
}
if (nonConvConfig && nonConvConfig.primaryStatutoryAuthority[0].citation !== "Wyo. Stat. § 7-13-1401")
  failures.push("WY non-conviction config must cite Wyo. Stat. § 7-13-1401.");
if (
  wyMisdemeanorConvictionExpungementConfig &&
  wyMisdemeanorConvictionExpungementConfig.primaryStatutoryAuthority[0].citation !== "Wyo. Stat. § 7-13-1501"
)
  failures.push("WY misdemeanor config must cite Wyo. Stat. § 7-13-1501.");
if (
  wyFelonyConvictionExpungementConfig &&
  wyFelonyConvictionExpungementConfig.primaryStatutoryAuthority[0].citation !== "Wyo. Stat. § 7-13-1502"
)
  failures.push("WY felony config must cite Wyo. Stat. § 7-13-1502.");

// --- Step 3: Render a WY non-conviction expungement petition ---

if (typeof renderCustomPleading !== "function") {
  failures.push("renderCustomPleading not exported from record-clearing index.");
  process.exit(reportAndExit());
}

const sampleInput = {
  config: nonConvConfig,
  partyData: {
    petitionerName: "ALEX MORGAN",
    petitionerAddress: "200 W 18th St, Cheyenne, WY 82001"
  },
  caseData: {
    countyName: "Laramie",
    docketNumber: "CR-2022-0123"
  },
  chargeData: {
    chargeDescription: "Possession of a controlled substance",
    disposition: "Dismissed",
    dispositionDate: "03/01/2022",
    arrestDate: "01/10/2022",
    arrestingAgency: "Cheyenne Police Department"
  },
  eligibilityData: {
    eligibilityBasisLabel:
      "Adult non-conviction expungement under W.S. § 7-13-1401 — all charges from the incident ended without conviction",
    waitingPeriodText: wyPack.wyWaitingPeriodNotes.nonConviction,
    additionalFacts: [
      "No formal charges are pending.",
      "No disqualifying deferred disposition under W.S. 7-13-301, 35-7-1037, or former 7-13-203 occurred."
    ]
  },
  attachments: ["Proposed Order for Expungement", "Certified disposition", "Wyoming DCI criminal history"],
  productName: "LegalEase RCAP",
  shadowMode: true
};

const renderResult = renderCustomPleading(sampleInput);
if (!renderResult.rendered) {
  failures.push(`WY petition failed to render. Errors: ${renderResult.errors.join("; ")}`);
}

// --- Step 4: Vocabulary QA — HARD assertions ---
// WY's statutory word IS "expungement" (for adults it means sealing), so it is
// NOT prohibited. Prohibit other states' relief vocabulary and any promise of
// destruction (adult expungement seals from public dissemination, not destroys).

if (typeof runPleadingQa !== "function") {
  failures.push("runPleadingQa not exported from record-clearing index.");
  process.exit(reportAndExit());
}

const qaResult = runPleadingQa({
  config: nonConvConfig,
  renderResult,
  prohibitedTerms: ["set aside", "set-aside", "set_aside", "annulment", "vacatur", "destroyed", "destruction"]
});
if (!qaResult.passed) {
  for (const f of qaResult.failures) failures.push(`VOCAB QA HARD FAILURE: ${f}`);
}

const text = renderResult.fullText;
const otherStateLeakTerms = [
  "Commonwealth of Pennsylvania",
  "Court of Common Pleas",
  "District of Columbia",
  "North Dakota",
  "STATE OF OKLAHOMA"
];
for (const term of otherStateLeakTerms) {
  if (text.includes(term)) failures.push(`WY output must not contain other-state boilerplate: "${term}".`);
}
const requiredWyTerms = [
  "STATE OF WYOMING",
  "State of Wyoming",
  "W.S. § 7-13-1401",
  "Laramie County",
  "public dissemination",
  "expungement"
];
for (const term of requiredWyTerms) {
  if (!text.includes(term)) failures.push(`WY output is missing required WY term: "${term}".`);
}
// Sovereign-first caption: "STATE OF WYOMING," must precede the petitioner name.
const stateIdx = text.indexOf("STATE OF WYOMING,");
const movantIdx = text.indexOf("ALEX MORGAN,");
if (stateIdx === -1 || movantIdx === -1 || stateIdx > movantIdx) {
  failures.push("WY caption must list STATE OF WYOMING first and the Petitioner second.");
}

// --- Step 5: Audit manifest + sample output ---

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/wyoming");
fs.mkdirSync(outputDir, { recursive: true });

if (typeof buildPleadingAuditManifest === "function") {
  const auditManifest = buildPleadingAuditManifest({
    packetId: "wy-shadow-nonconviction-sample",
    config: nonConvConfig,
    renderResult,
    qaResult
  });
  fs.writeFileSync(
    path.join(outputDir, "wy-pleading-audit.json"),
    `${JSON.stringify(auditManifest, null, 2)}\n`
  );
} else {
  failures.push("buildPleadingAuditManifest not exported from record-clearing index.");
}

const sampleTextPath = path.join(outputDir, "wy-nonconviction-expungement-petition-sample.txt");
if (renderResult.rendered) fs.writeFileSync(sampleTextPath, `${renderResult.fullText}\n`);

// --- Step 6: Lifecycle / Grade / seals ---

if (renderResult.templateLifecycle !== "replacement_candidate")
  failures.push(`Expected lifecycle 'replacement_candidate', got '${renderResult.templateLifecycle}'.`);
if (renderResult.templateLifecycle === "verified_replacement")
  failures.push("WY output must not be verified_replacement.");
if (/\[seal\]/i.test(text) || /\[logo\]/i.test(text))
  failures.push("WY output must not contain [seal] or [logo] markers.");
if (renderResult.templateGrade === "html_replica_or_unverified")
  failures.push("Grade E output is blocked. WY petition must be Grade D (legal_ops_custom_pleading).");

// --- Step 7: No service-role import in new client-path files ---

const newClientFiles = [
  "src/lib/record-clearing/renderers/custom-pleading-renderer.ts",
  "src/lib/record-clearing/wyoming-config.ts"
];
for (const relPath of newClientFiles) {
  const fullPath = path.join(rootDir, relPath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf8");
    if (/service.role|serviceRole|SUPABASE_SERVICE_ROLE/i.test(content)) {
      failures.push(`Service-role reference found in client-path file: ${relPath}`);
    }
  } else {
    failures.push(`Expected file not found: ${relPath}`);
  }
}

// --- Step 8: MS not enabled in new engine ---

const msEnabled = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "MS")
  : false;
if (msEnabled) failures.push("Mississippi must remain excluded from the new shadow engine.");

// --- Step 9: No live route / legacy generator / Nebraska changes ---

if (hasForbiddenChanges()) {
  failures.push(
    "Forbidden file changes detected (live routes, legacy rcap generators, or Nebraska files)."
  );
}

// --- Step 10: getWyPleadingConfig round-trip ---

if (typeof getWyPleadingConfig === "function") {
  const fetched = getWyPleadingConfig("adult_nonconviction_expungement");
  if (!fetched || fetched.primaryReliefTerm !== "expungement") {
    failures.push("getWyPleadingConfig('adult_nonconviction_expungement') did not return the correct config.");
  }
} else {
  failures.push("getWyPleadingConfig not exported from record-clearing index.");
}

// --- Report ---

if (failures.length > 0) {
  console.error("Wyoming pleading state verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Wyoming pleading state verification PASSED.");
console.log(`  WY config jurisdictionCode:   ${nonConvConfig.jurisdictionCode}`);
console.log(`  WY config primaryReliefTerm:  ${nonConvConfig.primaryReliefTerm}`);
console.log(`  WY config templateGrade:      ${nonConvConfig.templateGrade}`);
console.log(`  WY config templateLifecycle:  ${nonConvConfig.templateLifecycle}`);
console.log(`  Rendered:                     ${renderResult.rendered}`);
console.log(`  QA passed:                    ${qaResult.passed}`);
console.log(`  QA warnings:                  ${qaResult.warnings.length > 0 ? qaResult.warnings.join("; ") : "none"}`);
console.log(`  State-pack consumed:          yes`);
console.log(`  Other-state boilerplate leak: no`);
console.log(`  Adult sealing (no destroy):   yes`);
console.log(`  Sovereign-first WY caption:   yes`);
console.log(`  Seals / logos in output:      no`);
console.log(`  Grade E blocked:              yes`);
console.log(`  Service-role in client paths: no`);
console.log(`  Mississippi new-engine:       no`);
console.log(`  Forbidden files changed:      no`);
console.log(`  Counsel flags:                ${nonConvConfig.counselFlags.length}`);
console.log(`  Sample petition:              ${sampleTextPath}`);
console.log("");
console.log("--- GENERATED WY NON-CONVICTION EXPUNGEMENT PETITION (first 1300 chars) ---");
console.log(renderResult.fullText.slice(0, 1300));
console.log("--- END SAMPLE ---");

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("Wyoming pleading state verification FAILED.");
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
