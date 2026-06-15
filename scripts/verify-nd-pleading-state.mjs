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
const ndPackPath = path.join(rootDir, "src/lib/rcap/state-packs/north-dakota/index.ts");

// --- Step 1: ND state pack exists ---

if (!fs.existsSync(ndPackPath)) {
  failures.push("ND state pack index not found at src/lib/rcap/state-packs/north-dakota/index.ts.");
  process.exit(reportAndExit());
}
const ndPack = require(ndPackPath);

const expectedPackExports = [
  "ndEligibilityRules",
  "ndWaitingPeriodNotes",
  "ndFilingInstructions",
  "ndDisqualifyingOffenseNotes",
  "ndPlainLanguage",
  "ndSafetyDisclaimer",
  "ndFeeNotes",
  "ndPathwayLabels",
  "ndRequiredFields",
  "ndDocumentTypes"
];
for (const name of expectedPackExports) {
  if (!(name in ndPack)) failures.push(`ND state pack missing export: ${name}.`);
}

// --- Step 2: ND config exists and consumes the ND state pack ---

const {
  ndConvictionSealingConfig,
  ndDuiSealingConfig,
  ndPleadingConfigs,
  getNdPleadingConfig,
  renderCustomPleading,
  runPleadingQa,
  buildPleadingAuditManifest
} = recordClearing;

if (!ndPleadingConfigs) failures.push("ndPleadingConfigs not exported from record-clearing index.");
if (!ndConvictionSealingConfig)
  failures.push("ndConvictionSealingConfig not found in record-clearing index.");
if (!ndDuiSealingConfig) failures.push("ndDuiSealingConfig not found in record-clearing index.");

const sealConfig = ndConvictionSealingConfig;
if (sealConfig) {
  if (sealConfig.jurisdictionCode !== "ND")
    failures.push(`Expected jurisdictionCode 'ND', got '${sealConfig.jurisdictionCode}'.`);
  if (sealConfig.primaryReliefTerm !== "sealing")
    failures.push(`Expected primaryReliefTerm 'sealing', got '${sealConfig.primaryReliefTerm}'.`);
  if (sealConfig.templateGrade !== "legal_ops_custom_pleading")
    failures.push(`Expected templateGrade 'legal_ops_custom_pleading', got '${sealConfig.templateGrade}'.`);
  if (sealConfig.templateLifecycle !== "replacement_candidate")
    failures.push(`Expected templateLifecycle 'replacement_candidate', got '${sealConfig.templateLifecycle}'.`);
  if (sealConfig.templateLifecycle === "verified_replacement")
    failures.push("ND config lifecycle must NOT be verified_replacement.");
  if (!sealConfig.counselFlags || sealConfig.counselFlags.length === 0)
    failures.push("ND config must include counselFlags for unverified items.");
}

// Consumption checks: config values must come from the ND state pack.
if (sealConfig && ndPack) {
  if (sealConfig.serviceNote !== ndPack.ndFilingInstructions[3])
    failures.push("ND seal config serviceNote does not come from ndFilingInstructions[3].");
  if (sealConfig.primaryStatutoryAuthority[0].description !== ndPack.ndEligibilityRules[1])
    failures.push("ND seal config statutory authority[0] description does not come from ndEligibilityRules[1].");
  if (sealConfig.primaryStatutoryAuthority[1].description !== ndPack.ndEligibilityRules[8])
    failures.push("ND seal config statutory authority[1] description does not come from ndEligibilityRules[8].");
  const flagsJoined = sealConfig.counselFlags.join(" ");
  if (!flagsJoined.includes(ndPack.ndPlainLanguage.sealingNotExpungement))
    failures.push("ND seal config counselFlags must include ndPlainLanguage.sealingNotExpungement.");
  if (!flagsJoined.includes(ndPack.ndDisqualifyingOffenseNotes[4]))
    failures.push("ND seal config counselFlags must include ndDisqualifyingOffenseNotes agency-scope text.");
}
if (sealConfig) {
  const cites = sealConfig.primaryStatutoryAuthority.map((s) => s.citation);
  if (!cites.includes("N.D.C.C. Chapter 12-60.1"))
    failures.push("ND seal config must cite N.D.C.C. Chapter 12-60.1.");
  if (!cites.includes("N.D.C.C. § 12-60.1-02"))
    failures.push("ND seal config must cite N.D.C.C. § 12-60.1-02.");
}
if (ndDuiSealingConfig) {
  if (ndDuiSealingConfig.primaryStatutoryAuthority[0].citation !== "N.D.C.C. § 39-08-01.6")
    failures.push("ND DUI config must cite N.D.C.C. § 39-08-01.6.");
}

// --- Step 3: Render an ND conviction-sealing petition ---

if (typeof renderCustomPleading !== "function") {
  failures.push("renderCustomPleading not exported from record-clearing index.");
  process.exit(reportAndExit());
}

const sampleInput = {
  config: sealConfig,
  partyData: {
    petitionerName: "JOHN DOE",
    petitionerAddress: "123 Main Street, Bismarck, ND 58501",
    otherNamesUsed: "John Q. Doe"
  },
  caseData: {
    countyName: "Burleigh",
    judicialDistrict: "South Central Judicial District",
    docketNumber: "08-2018-CR-00123"
  },
  chargeData: {
    chargeDescription: "Theft of property",
    offenseGrade: "Class A misdemeanor",
    disposition: "Convicted (guilty plea)",
    dispositionDate: "06/01/2018",
    arrestDate: "02/01/2018",
    arrestingAgency: "Bismarck Police Department"
  },
  eligibilityData: {
    eligibilityBasisLabel:
      "Misdemeanor conviction sealing under N.D.C.C. Chapter 12-60.1 — no new conviction for at least 3 years before filing",
    waitingPeriodText: ndPack.ndWaitingPeriodNotes.misdemeanorConvictionSealing,
    additionalFacts: [
      "All terms of imprisonment and probation are complete and all restitution has been paid.",
      "Petitioner must prove the sealing factors by clear and convincing evidence."
    ]
  },
  attachments: ["Proposed Order to Seal Criminal Records", "Proof of Service on the prosecuting attorney"],
  productName: "LegalEase RCAP",
  shadowMode: true
};

const renderResult = renderCustomPleading(sampleInput);
if (!renderResult.rendered) {
  failures.push(`ND petition failed to render. Errors: ${renderResult.errors.join("; ")}`);
}

// --- Step 4: Vocabulary QA — HARD assertions (sealing-first; no expungement/vacatur/set-aside) ---

if (typeof runPleadingQa !== "function") {
  failures.push("runPleadingQa not exported from record-clearing index.");
  process.exit(reportAndExit());
}

const qaResult = runPleadingQa({
  config: sealConfig,
  renderResult,
  prohibitedTerms: ["expungement", "expunge", "set aside", "set-aside", "annulment", "vacatur"]
});
if (!qaResult.passed) {
  for (const f of qaResult.failures) failures.push(`VOCAB QA HARD FAILURE: ${f}`);
}

const text = renderResult.fullText;
const paLeakTerms = [
  "Commonwealth of Pennsylvania",
  "Court of Common Pleas",
  "Pennsylvania State Police",
  "District of Columbia",
  "Superior Court of the District of Columbia"
];
for (const term of paLeakTerms) {
  if (text.includes(term)) failures.push(`ND output must not contain other-state boilerplate: "${term}".`);
}
const requiredNdTerms = [
  "STATE OF NORTH DAKOTA",
  "North Dakota",
  "N.D.C.C. Chapter 12-60.1",
  "Burleigh County",
  "court and prosecution records"
];
for (const term of requiredNdTerms) {
  if (!text.includes(term)) failures.push(`ND output is missing required ND term: "${term}".`);
}

// --- Step 5: Audit manifest + sample output ---

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/north-dakota");
fs.mkdirSync(outputDir, { recursive: true });

if (typeof buildPleadingAuditManifest === "function") {
  const auditManifest = buildPleadingAuditManifest({
    packetId: "nd-shadow-conviction-sealing-sample",
    config: sealConfig,
    renderResult,
    qaResult
  });
  fs.writeFileSync(
    path.join(outputDir, "nd-pleading-audit.json"),
    `${JSON.stringify(auditManifest, null, 2)}\n`
  );
} else {
  failures.push("buildPleadingAuditManifest not exported from record-clearing index.");
}

const sampleTextPath = path.join(outputDir, "nd-conviction-sealing-petition-sample.txt");
if (renderResult.rendered) fs.writeFileSync(sampleTextPath, `${renderResult.fullText}\n`);

// --- Step 6: Lifecycle / Grade / seals ---

if (renderResult.templateLifecycle !== "replacement_candidate")
  failures.push(`Expected lifecycle 'replacement_candidate', got '${renderResult.templateLifecycle}'.`);
if (renderResult.templateLifecycle === "verified_replacement")
  failures.push("ND output must not be verified_replacement.");
if (/\[seal\]/i.test(text) || /\[logo\]/i.test(text))
  failures.push("ND output must not contain [seal] or [logo] markers.");
if (renderResult.templateGrade === "html_replica_or_unverified")
  failures.push("Grade E output is blocked. ND petition must be Grade D (legal_ops_custom_pleading).");

// --- Step 7: No service-role import in new client-path files ---

const newClientFiles = [
  "src/lib/record-clearing/renderers/custom-pleading-renderer.ts",
  "src/lib/record-clearing/north-dakota-config.ts"
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

// --- Step 10: getNdPleadingConfig round-trip ---

if (typeof getNdPleadingConfig === "function") {
  const fetched = getNdPleadingConfig("adult_conviction_sealing");
  if (!fetched || fetched.primaryReliefTerm !== "sealing") {
    failures.push("getNdPleadingConfig('adult_conviction_sealing') did not return the correct config.");
  }
} else {
  failures.push("getNdPleadingConfig not exported from record-clearing index.");
}

// --- Report ---

if (failures.length > 0) {
  console.error("North Dakota pleading state verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("North Dakota pleading state verification PASSED.");
console.log(`  ND config jurisdictionCode:   ${sealConfig.jurisdictionCode}`);
console.log(`  ND config primaryReliefTerm:  ${sealConfig.primaryReliefTerm}`);
console.log(`  ND config templateGrade:      ${sealConfig.templateGrade}`);
console.log(`  ND config templateLifecycle:  ${sealConfig.templateLifecycle}`);
console.log(`  Rendered:                     ${renderResult.rendered}`);
console.log(`  QA passed:                    ${qaResult.passed}`);
console.log(`  QA warnings:                  ${qaResult.warnings.length > 0 ? qaResult.warnings.join("; ") : "none"}`);
console.log(`  State-pack consumed:          yes`);
console.log(`  Other-state boilerplate leak: no`);
console.log(`  Sealing-first vocab enforced: yes (expungement/vacatur/set-aside blocked)`);
console.log(`  Seals / logos in output:      no`);
console.log(`  Grade E blocked:              yes`);
console.log(`  Service-role in client paths: no`);
console.log(`  Mississippi new-engine:       no`);
console.log(`  Forbidden files changed:      no`);
console.log(`  Counsel flags:                ${sealConfig.counselFlags.length}`);
console.log(`  Sample petition:              ${sampleTextPath}`);
console.log("");
console.log("--- GENERATED ND CONVICTION-SEALING PETITION (first 1300 chars) ---");
console.log(renderResult.fullText.slice(0, 1300));
console.log("--- END SAMPLE ---");

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("North Dakota pleading state verification FAILED.");
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
