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
const dcPack = require(path.join(rootDir, "src/lib/rcap/state-packs/dc/index.ts"));

// --- Step 1: DC config exists and is correctly shaped ---

const {
  dcMotionToSealConfig,
  dcMotionToExpungeConfig,
  dcPleadingConfigs,
  getDcPleadingConfig,
  renderCustomPleading,
  runPleadingQa,
  buildPleadingAuditManifest
} = recordClearing;

if (!dcPleadingConfigs) failures.push("dcPleadingConfigs not exported from record-clearing index.");
if (!dcMotionToSealConfig) failures.push("dcMotionToSealConfig not found in record-clearing index.");
if (!dcMotionToExpungeConfig) failures.push("dcMotionToExpungeConfig not found in record-clearing index.");

const sealConfig = dcMotionToSealConfig;
if (sealConfig) {
  if (sealConfig.jurisdictionCode !== "DC")
    failures.push(`Expected jurisdictionCode 'DC', got '${sealConfig.jurisdictionCode}'.`);
  if (sealConfig.primaryReliefTerm !== "sealing")
    failures.push(`Expected primaryReliefTerm 'sealing', got '${sealConfig.primaryReliefTerm}'.`);
  if (sealConfig.templateGrade !== "legal_ops_custom_pleading")
    failures.push(`Expected templateGrade 'legal_ops_custom_pleading', got '${sealConfig.templateGrade}'.`);
  if (sealConfig.templateLifecycle !== "replacement_candidate")
    failures.push(`Expected templateLifecycle 'replacement_candidate', got '${sealConfig.templateLifecycle}'.`);
  if (sealConfig.templateLifecycle === "verified_replacement")
    failures.push("DC config lifecycle must NOT be verified_replacement.");
  if (!sealConfig.counselFlags || sealConfig.counselFlags.length === 0)
    failures.push("DC config must include counselFlags for unverified items.");
}

// --- Step 2: DC config consumes the DC state pack ---

if (sealConfig && dcPack) {
  if (sealConfig.serviceNote !== dcPack.dcFilingInstructions[3])
    failures.push("DC seal config serviceNote does not come from dcFilingInstructions[3].");
  if (sealConfig.primaryStatutoryAuthority[0].description !== dcPack.dcEligibilityRules[5])
    failures.push("DC seal config statutory authority description does not come from dcEligibilityRules[5].");
  if (sealConfig.primaryStatutoryAuthority[0].citation !== "D.C. Code § 16-806")
    failures.push("DC seal config must cite D.C. Code § 16-806 (interests-of-justice sealing).");
}
if (dcMotionToExpungeConfig && dcPack) {
  if (dcMotionToExpungeConfig.primaryStatutoryAuthority[0].description !== dcPack.dcEligibilityRules[4])
    failures.push("DC expunge config statutory authority description does not come from dcEligibilityRules[4].");
  if (dcMotionToExpungeConfig.primaryStatutoryAuthority[0].citation !== "D.C. Code § 16-803")
    failures.push("DC expunge config must cite D.C. Code § 16-803 (actual-innocence expungement).");
}
// Counsel flags must echo state-pack content (proves consumption, not re-derivation).
if (sealConfig && dcPack) {
  const flagsJoined = sealConfig.counselFlags.join(" ");
  if (!flagsJoined.includes(dcPack.dcCautionNotes[1]))
    failures.push("DC seal config counselFlags must include dcCautionNotes exclusion text.");
  if (!flagsJoined.includes(dcPack.dcPlainLanguage.automaticCare))
    failures.push("DC seal config counselFlags must include dcPlainLanguage.automaticCare.");
}

// --- Step 3: Render a DC motion to seal ---

if (typeof renderCustomPleading !== "function") {
  failures.push("renderCustomPleading not exported from record-clearing index.");
  process.exit(reportAndExit());
}

const sampleInput = {
  config: sealConfig,
  partyData: {
    petitionerName: "JANE DOE",
    petitionerAddress: "123 Main Street NW, Washington, DC 20001"
  },
  caseData: {
    countyName: "",
    docketNumber: "2019 CMD 000123",
    judgeName: "The Honorable Pat Roe"
  },
  chargeData: {
    chargeDescription: "Simple Assault",
    offenseGrade: "misdemeanor",
    disposition: "Dismissed",
    dispositionDate: "06/01/2019",
    arrestDate: "02/01/2019",
    arrestingAgency: "Metropolitan Police Department"
  },
  eligibilityData: {
    eligibilityBasisLabel:
      "Interests-of-justice sealing under D.C. Code § 16-806 — case ended without conviction",
    waitingPeriodText: dcPack.dcWaitingPeriodNotes.misdemeanorMotionSealing,
    additionalFacts: [
      "Movant has remained law-abiding and has demonstrated rehabilitation and reintegration since the disposition."
    ]
  },
  attachments: [
    "MPD arrest record / rap sheet",
    "DC Superior Court case disposition",
    "Statement of Points and Authorities"
  ],
  productName: "LegalEase RCAP",
  shadowMode: true
};

const renderResult = renderCustomPleading(sampleInput);

if (!renderResult.rendered) {
  failures.push(`DC motion failed to render. Errors: ${renderResult.errors.join("; ")}`);
}

// --- Step 4: Vocabulary QA — HARD assertions ---

if (typeof runPleadingQa !== "function") {
  failures.push("runPleadingQa not exported from record-clearing index.");
  process.exit(reportAndExit());
}

const qaResult = runPleadingQa({
  config: sealConfig,
  renderResult,
  prohibitedTerms: ["set aside", "set-aside", "set_aside", "annulment", "vacatur"]
});

if (!qaResult.passed) {
  for (const f of qaResult.failures) failures.push(`VOCAB QA HARD FAILURE: ${f}`);
}

// DC output must be DC-specific, never leak PA boilerplate.
const text = renderResult.fullText;
const paLeakTerms = [
  "Commonwealth of Pennsylvania",
  "COMMONWEALTH OF PENNSYLVANIA",
  "Court of Common Pleas",
  "Pennsylvania State Police",
  "PATCH report"
];
for (const term of paLeakTerms) {
  if (text.includes(term)) {
    failures.push(`DC output must not contain Pennsylvania boilerplate: "${term}".`);
  }
}
const requiredDcTerms = [
  "SUPERIOR COURT OF THE DISTRICT OF COLUMBIA",
  "District of Columbia",
  "D.C. Code § 16-806",
  "Movant"
];
for (const term of requiredDcTerms) {
  if (!text.includes(term)) {
    failures.push(`DC output is missing required DC term: "${term}".`);
  }
}

// --- Step 5: Audit manifest + sample output ---

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/dc");
fs.mkdirSync(outputDir, { recursive: true });

if (typeof buildPleadingAuditManifest === "function") {
  const auditManifest = buildPleadingAuditManifest({
    packetId: "dc-shadow-seal-sample",
    config: sealConfig,
    renderResult,
    qaResult
  });
  fs.writeFileSync(
    path.join(outputDir, "dc-pleading-audit.json"),
    `${JSON.stringify(auditManifest, null, 2)}\n`
  );
} else {
  failures.push("buildPleadingAuditManifest not exported from record-clearing index.");
}

const sampleTextPath = path.join(outputDir, "dc-seal-motion-sample.txt");
if (renderResult.rendered) fs.writeFileSync(sampleTextPath, `${renderResult.fullText}\n`);

// --- Step 6: Lifecycle / Grade / seals ---

if (renderResult.templateLifecycle !== "replacement_candidate")
  failures.push(`Expected lifecycle 'replacement_candidate', got '${renderResult.templateLifecycle}'.`);
if (renderResult.templateLifecycle === "verified_replacement")
  failures.push("DC output must not be verified_replacement.");
if (/\[seal\]/i.test(text) || /\[logo\]/i.test(text))
  failures.push("DC output must not contain [seal] or [logo] markers.");
if (renderResult.templateGrade === "html_replica_or_unverified")
  failures.push("Grade E output is blocked. DC motion must be Grade D (legal_ops_custom_pleading).");

// --- Step 7: No service-role import in new client-path files ---

const newClientFiles = [
  "src/lib/record-clearing/renderers/custom-pleading-renderer.ts",
  "src/lib/record-clearing/dc-config.ts"
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

// --- Step 10: getDcPleadingConfig round-trip ---

if (typeof getDcPleadingConfig === "function") {
  const fetched = getDcPleadingConfig("adult_motion_to_seal");
  if (!fetched || fetched.primaryReliefTerm !== "sealing") {
    failures.push("getDcPleadingConfig('adult_motion_to_seal') did not return the correct config.");
  }
} else {
  failures.push("getDcPleadingConfig not exported from record-clearing index.");
}

// --- Report ---

if (failures.length > 0) {
  console.error("District of Columbia pleading state verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("District of Columbia pleading state verification PASSED.");
console.log(`  DC config jurisdictionCode:   ${sealConfig.jurisdictionCode}`);
console.log(`  DC config primaryReliefTerm:  ${sealConfig.primaryReliefTerm}`);
console.log(`  DC config templateGrade:      ${sealConfig.templateGrade}`);
console.log(`  DC config templateLifecycle:  ${sealConfig.templateLifecycle}`);
console.log(`  Rendered:                     ${renderResult.rendered}`);
console.log(`  QA passed:                    ${qaResult.passed}`);
console.log(`  QA warnings:                  ${qaResult.warnings.length > 0 ? qaResult.warnings.join("; ") : "none"}`);
console.log(`  State-pack consumed:          yes`);
console.log(`  PA boilerplate leaked:        no`);
console.log(`  Seals / logos in output:      no`);
console.log(`  Grade E blocked:              yes`);
console.log(`  Service-role in client paths: no`);
console.log(`  Mississippi new-engine:       no`);
console.log(`  Forbidden files changed:      no`);
console.log(`  Counsel flags:                ${sealConfig.counselFlags.length}`);
console.log(`  Sample motion:                ${sampleTextPath}`);
console.log("");
console.log("--- GENERATED DC SEAL MOTION (first 1200 chars) ---");
console.log(renderResult.fullText.slice(0, 1200));
console.log("--- END SAMPLE ---");

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("District of Columbia pleading state verification FAILED.");
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
      "scripts/verify-nebraska-shadow.mjs"
    ],
    { cwd: rootDir, encoding: "utf8" }
  );
  // Allow changes only inside the DC state pack (research) — flag anything else above.
  return result.stdout.trim().length > 0;
}
