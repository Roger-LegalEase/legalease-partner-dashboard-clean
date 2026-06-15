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
const okPackPath = path.join(rootDir, "src/lib/rcap/state-packs/oklahoma/index.ts");

// --- Step 1: OK state pack exists ---

if (!fs.existsSync(okPackPath)) {
  failures.push("OK state pack index not found at src/lib/rcap/state-packs/oklahoma/index.ts.");
  process.exit(reportAndExit());
}
const okPack = require(okPackPath);

const expectedPackExports = [
  "okEligibilityRules",
  "okWaitingPeriodNotes",
  "okFilingInstructions",
  "okDisqualifyingOffenseNotes",
  "okPlainLanguage",
  "okSafetyDisclaimer",
  "okFeeNotes",
  "okPathwayLabels",
  "okRequiredFields",
  "okDocumentTypes"
];
for (const name of expectedPackExports) {
  if (!(name in okPack)) failures.push(`OK state pack missing export: ${name}.`);
}

// --- Step 2: OK config exists and consumes the OK state pack ---

const {
  okSection1819ExpungementConfig,
  ok991cDeferredExpungementConfig,
  okPleadingConfigs,
  getOkPleadingConfig,
  renderCustomPleading,
  runPleadingQa,
  buildPleadingAuditManifest
} = recordClearing;

if (!okPleadingConfigs) failures.push("okPleadingConfigs not exported from record-clearing index.");
if (!okSection1819ExpungementConfig)
  failures.push("okSection1819ExpungementConfig not found in record-clearing index.");
if (!ok991cDeferredExpungementConfig)
  failures.push("ok991cDeferredExpungementConfig not found in record-clearing index.");

const expungeConfig = okSection1819ExpungementConfig;
if (expungeConfig) {
  if (expungeConfig.jurisdictionCode !== "OK")
    failures.push(`Expected jurisdictionCode 'OK', got '${expungeConfig.jurisdictionCode}'.`);
  if (expungeConfig.primaryReliefTerm !== "expungement")
    failures.push(`Expected primaryReliefTerm 'expungement', got '${expungeConfig.primaryReliefTerm}'.`);
  if (expungeConfig.templateGrade !== "legal_ops_custom_pleading")
    failures.push(`Expected templateGrade 'legal_ops_custom_pleading', got '${expungeConfig.templateGrade}'.`);
  if (expungeConfig.templateLifecycle !== "replacement_candidate")
    failures.push(`Expected templateLifecycle 'replacement_candidate', got '${expungeConfig.templateLifecycle}'.`);
  if (expungeConfig.templateLifecycle === "verified_replacement")
    failures.push("OK config lifecycle must NOT be verified_replacement.");
  if (!expungeConfig.counselFlags || expungeConfig.counselFlags.length === 0)
    failures.push("OK config must include counselFlags for unverified items.");
}

// Consumption checks: config values must come from the OK state pack.
if (expungeConfig && okPack) {
  if (expungeConfig.serviceNote !== okPack.okFilingInstructions[3])
    failures.push("OK expunge config serviceNote does not come from okFilingInstructions[3].");
  if (expungeConfig.primaryStatutoryAuthority[0].description !== okPack.okEligibilityRules[1])
    failures.push("OK expunge config statutory authority[0] description does not come from okEligibilityRules[1].");
  if (expungeConfig.primaryStatutoryAuthority[1].description !== okPack.okEligibilityRules[4])
    failures.push("OK expunge config statutory authority[1] description does not come from okEligibilityRules[4].");
  const flagsJoined = expungeConfig.counselFlags.join(" ");
  if (!flagsJoined.includes(okPack.okPlainLanguage.expungementMeansSealing))
    failures.push("OK expunge config counselFlags must include okPlainLanguage.expungementMeansSealing.");
  if (!flagsJoined.includes(okPack.okDisqualifyingOffenseNotes[4]))
    failures.push("OK expunge config counselFlags must include okDisqualifyingOffenseNotes scope-limits text.");
}
if (expungeConfig) {
  const cites = expungeConfig.primaryStatutoryAuthority.map((s) => s.citation);
  if (!cites.includes("22 O.S. §§ 18-19"))
    failures.push("OK expunge config must cite 22 O.S. §§ 18-19.");
  if (!cites.includes("22 O.S. § 19"))
    failures.push("OK expunge config must cite 22 O.S. § 19.");
}
if (ok991cDeferredExpungementConfig) {
  if (ok991cDeferredExpungementConfig.primaryStatutoryAuthority[0].citation !== "22 O.S. § 991c")
    failures.push("OK 991(c) config must cite 22 O.S. § 991c.");
}

// --- Step 3: Render an OK Section 18/19 expungement petition ---

if (typeof renderCustomPleading !== "function") {
  failures.push("renderCustomPleading not exported from record-clearing index.");
  process.exit(reportAndExit());
}

const sampleInput = {
  config: expungeConfig,
  partyData: {
    petitionerName: "JANE ROE",
    petitionerAddress: "456 Reno Ave, Oklahoma City, OK 73102"
  },
  caseData: {
    countyName: "Oklahoma",
    docketNumber: "CF-2017-1234"
  },
  chargeData: {
    chargeDescription: "Possession of a controlled substance (nonviolent felony)",
    offenseGrade: "felony",
    disposition: "Dismissed after successful completion of deferred judgment",
    dispositionDate: "06/01/2019",
    arrestDate: "02/01/2017",
    arrestingAgency: "Oklahoma City Police Department"
  },
  eligibilityData: {
    eligibilityBasisLabel:
      "Nonviolent felony deferred dismissal under 22 O.S. §§ 18-19 — at least 5 years since dismissal",
    waitingPeriodText: okPack.okWaitingPeriodNotes.nonviolentFelonyDeferredDismissal,
    additionalFacts: [
      "Petitioner has not been convicted of a felony and has no misdemeanor or felony charges pending.",
      "The harm to Petitioner's privacy or danger of unwarranted adverse consequences outweighs the public interest in retaining the records."
    ]
  },
  attachments: [
    "Order Setting Hearing",
    "Proposed Order to Expunge Records Pursuant to 22 O.S. §§ 18 and 19",
    "Certified docket / disposition"
  ],
  productName: "LegalEase RCAP",
  shadowMode: true
};

const renderResult = renderCustomPleading(sampleInput);
if (!renderResult.rendered) {
  failures.push(`OK petition failed to render. Errors: ${renderResult.errors.join("; ")}`);
}

// --- Step 4: Vocabulary QA — HARD assertions ---
// OK's statutory word IS "expungement" (meaning sealing), so it is NOT prohibited.
// Prohibit other states' relief vocabulary and any promise of destruction.

if (typeof runPleadingQa !== "function") {
  failures.push("runPleadingQa not exported from record-clearing index.");
  process.exit(reportAndExit());
}

const qaResult = runPleadingQa({
  config: expungeConfig,
  renderResult,
  prohibitedTerms: ["set aside", "set-aside", "set_aside", "annulment", "vacatur", "physically destroyed"]
});
if (!qaResult.passed) {
  for (const f of qaResult.failures) failures.push(`VOCAB QA HARD FAILURE: ${f}`);
}

const text = renderResult.fullText;
const otherStateLeakTerms = [
  "Commonwealth of Pennsylvania",
  "Court of Common Pleas",
  "Pennsylvania State Police",
  "District of Columbia",
  "North Dakota"
];
for (const term of otherStateLeakTerms) {
  if (text.includes(term)) failures.push(`OK output must not contain other-state boilerplate: "${term}".`);
}
const requiredOkTerms = [
  "THE STATE OF OKLAHOMA",
  "State of Oklahoma",
  "22 O.S.",
  "Oklahoma County",
  "expungement"
];
for (const term of requiredOkTerms) {
  if (!text.includes(term)) failures.push(`OK output is missing required OK term: "${term}".`);
}
// Movant-first caption: "JANE ROE," and "Petitioner," must precede "THE STATE OF OKLAHOMA,".
const movantIdx = text.indexOf("JANE ROE,");
const stateIdx = text.indexOf("THE STATE OF OKLAHOMA,");
if (movantIdx === -1 || stateIdx === -1 || movantIdx > stateIdx) {
  failures.push("OK caption must list the Petitioner first and THE STATE OF OKLAHOMA second.");
}
// Declaration under penalty of perjury (statutory verification form).
if (!text.includes("declare under penalty of perjury")) {
  failures.push("OK verification must declare under penalty of perjury (statutory form).");
}

// --- Step 5: Audit manifest + sample output ---

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/oklahoma");
fs.mkdirSync(outputDir, { recursive: true });

if (typeof buildPleadingAuditManifest === "function") {
  const auditManifest = buildPleadingAuditManifest({
    packetId: "ok-shadow-section-18-19-sample",
    config: expungeConfig,
    renderResult,
    qaResult
  });
  fs.writeFileSync(
    path.join(outputDir, "ok-pleading-audit.json"),
    `${JSON.stringify(auditManifest, null, 2)}\n`
  );
} else {
  failures.push("buildPleadingAuditManifest not exported from record-clearing index.");
}

const sampleTextPath = path.join(outputDir, "ok-section-18-19-expungement-petition-sample.txt");
if (renderResult.rendered) fs.writeFileSync(sampleTextPath, `${renderResult.fullText}\n`);

// --- Step 6: Lifecycle / Grade / seals ---

if (renderResult.templateLifecycle !== "replacement_candidate")
  failures.push(`Expected lifecycle 'replacement_candidate', got '${renderResult.templateLifecycle}'.`);
if (renderResult.templateLifecycle === "verified_replacement")
  failures.push("OK output must not be verified_replacement.");
if (/\[seal\]/i.test(text) || /\[logo\]/i.test(text))
  failures.push("OK output must not contain [seal] or [logo] markers.");
if (renderResult.templateGrade === "html_replica_or_unverified")
  failures.push("Grade E output is blocked. OK petition must be Grade D (legal_ops_custom_pleading).");

// --- Step 7: No service-role import in new client-path files ---

const newClientFiles = [
  "src/lib/record-clearing/renderers/custom-pleading-renderer.ts",
  "src/lib/record-clearing/oklahoma-config.ts"
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

// --- Step 10: getOkPleadingConfig round-trip ---

if (typeof getOkPleadingConfig === "function") {
  const fetched = getOkPleadingConfig("adult_section_18_19_expungement");
  if (!fetched || fetched.primaryReliefTerm !== "expungement") {
    failures.push("getOkPleadingConfig('adult_section_18_19_expungement') did not return the correct config.");
  }
} else {
  failures.push("getOkPleadingConfig not exported from record-clearing index.");
}

// --- Report ---

if (failures.length > 0) {
  console.error("Oklahoma pleading state verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Oklahoma pleading state verification PASSED.");
console.log(`  OK config jurisdictionCode:   ${expungeConfig.jurisdictionCode}`);
console.log(`  OK config primaryReliefTerm:  ${expungeConfig.primaryReliefTerm}`);
console.log(`  OK config templateGrade:      ${expungeConfig.templateGrade}`);
console.log(`  OK config templateLifecycle:  ${expungeConfig.templateLifecycle}`);
console.log(`  Rendered:                     ${renderResult.rendered}`);
console.log(`  QA passed:                    ${qaResult.passed}`);
console.log(`  QA warnings:                  ${qaResult.warnings.length > 0 ? qaResult.warnings.join("; ") : "none"}`);
console.log(`  State-pack consumed:          yes`);
console.log(`  Other-state boilerplate leak: no`);
console.log(`  Movant-first OK caption:      yes`);
console.log(`  Declaration under perjury:    yes`);
console.log(`  Seals / logos in output:      no`);
console.log(`  Grade E blocked:              yes`);
console.log(`  Service-role in client paths: no`);
console.log(`  Mississippi new-engine:       no`);
console.log(`  Forbidden files changed:      no`);
console.log(`  Counsel flags:                ${expungeConfig.counselFlags.length}`);
console.log(`  Sample petition:              ${sampleTextPath}`);
console.log("");
console.log("--- GENERATED OK SECTION 18/19 EXPUNGEMENT PETITION (first 1300 chars) ---");
console.log(renderResult.fullText.slice(0, 1300));
console.log("--- END SAMPLE ---");

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("Oklahoma pleading state verification FAILED.");
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
