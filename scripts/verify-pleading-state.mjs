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

// --- Step 1: PA config exists and is correctly shaped ---

const { pennsylvaniaExpungementConfig, pennsylvaniaPleadingConfigs, getPaPleadingConfig } =
  recordClearing;

if (!pennsylvaniaPleadingConfigs) {
  failures.push("pennsylvaniaPleadingConfigs not exported from record-clearing index.");
}

const paConfig = pennsylvaniaExpungementConfig;
if (!paConfig) {
  failures.push("pennsylvaniaExpungementConfig not found in record-clearing index.");
}

if (paConfig) {
  if (paConfig.jurisdictionCode !== "PA")
    failures.push(`Expected jurisdictionCode 'PA', got '${paConfig.jurisdictionCode}'.`);
  if (paConfig.primaryReliefTerm !== "expungement")
    failures.push(`Expected primaryReliefTerm 'expungement', got '${paConfig.primaryReliefTerm}'.`);
  if (paConfig.templateGrade !== "legal_ops_custom_pleading")
    failures.push(`Expected templateGrade 'legal_ops_custom_pleading', got '${paConfig.templateGrade}'.`);
  if (paConfig.templateLifecycle !== "replacement_candidate")
    failures.push(`Expected templateLifecycle 'replacement_candidate', got '${paConfig.templateLifecycle}'.`);
  if (paConfig.templateLifecycle === "verified_replacement")
    failures.push("PA config lifecycle must NOT be verified_replacement.");
  if (!paConfig.counselFlags || paConfig.counselFlags.length === 0)
    failures.push("PA config must include counselFlags for unverified citations.");
}

// --- Step 2: Render a PA expungement pleading ---

const { renderCustomPleading } = recordClearing;
if (typeof renderCustomPleading !== "function") {
  failures.push("renderCustomPleading not exported from record-clearing index.");
  process.exit(reportAndExit());
}

const sampleInput = {
  config: paConfig,
  partyData: {
    petitionerName: "JANE DOE",
    petitionerAddress: "123 Main Street, Philadelphia, PA 19103"
  },
  caseData: {
    countyName: "Philadelphia",
    judicialDistrict: "First Judicial District",
    docketNumber: "CP-51-CR-0000001-2020",
    otn: "T123456789",
    judgeName: "The Honorable Jane Smith",
    judgeAddress: "1301 Filbert Street, Philadelphia, PA 19107"
  },
  chargeData: {
    chargeDescription: "Disorderly Conduct",
    offenseGrade: "summary",
    disposition: "Dismissed - Nolle Prosequi",
    dispositionDate: "03/15/2020",
    arrestDate: "01/15/2020",
    complaintDate: "01/16/2020",
    arrestingAgency: "Philadelphia Police Department",
    affiantName: "Officer John Smith",
    affiantAddress: "100 Police HQ Drive, Philadelphia, PA 19105"
  },
  eligibilityData: {
    eligibilityBasisLabel:
      "Non-conviction record under 18 Pa.C.S. § 9122 — charges dismissed / Nolle Prosequi",
    restitutionText: "No victim restitution owed in this matter.",
    patchText: "PATCH report present; confirm it was obtained within 60 days before filing.",
    waitingPeriodText: "Non-conviction expungement: no waiting period."
  },
  attachments: ["Docket sheet", "PATCH report"],
  productName: "LegalEase RCAP",
  shadowMode: true
};

const renderResult = renderCustomPleading(sampleInput);

if (!renderResult.rendered) {
  failures.push(`PA pleading failed to render. Errors: ${renderResult.errors.join("; ")}`);
}

// --- Step 3: Vocabulary QA — HARD assertions ---

const { runPleadingQa, buildPleadingAuditManifest } = recordClearing;
if (typeof runPleadingQa !== "function") {
  failures.push("runPleadingQa not exported from record-clearing index.");
  process.exit(reportAndExit());
}

// Prohibited terms for the PA expungement track:
//   "set aside" / "set-aside" — Nebraska's vocabulary, must never appear in PA expungement output
//   "annulment" / "vacatur" — other states' relief terms, not PA
const qaResult = runPleadingQa({
  config: paConfig,
  renderResult,
  prohibitedTerms: ["set aside", "set-aside", "set_aside", "annulment", "vacatur"]
});

if (!qaResult.passed) {
  for (const f of qaResult.failures) failures.push(`VOCAB QA HARD FAILURE: ${f}`);
}

// --- Step 4: Audit manifest (JSON object) ---

const outputDir = path.join(rootDir, "tmp/record-clearing-shadow/pennsylvania");
fs.mkdirSync(outputDir, { recursive: true });

const auditManifest = buildPleadingAuditManifest({
  packetId: "pa-shadow-expungement-sample",
  config: paConfig,
  renderResult,
  qaResult
});

const auditPath = path.join(outputDir, "pennsylvania-pleading-audit.json");
fs.writeFileSync(auditPath, `${JSON.stringify(auditManifest, null, 2)}\n`);

const pleadingTextPath = path.join(outputDir, "pennsylvania-expungement-pleading-sample.txt");
if (renderResult.rendered) {
  fs.writeFileSync(pleadingTextPath, `${renderResult.fullText}\n`);
}

// --- Step 5: Lifecycle check ---

if (renderResult.templateLifecycle !== "replacement_candidate") {
  failures.push(
    `Expected templateLifecycle 'replacement_candidate', got '${renderResult.templateLifecycle}'.`
  );
}

// --- Step 6: No seals in output ---

if (/\[seal\]/i.test(renderResult.fullText) || /\[logo\]/i.test(renderResult.fullText)) {
  failures.push("PA pleading output must not contain [seal] or [logo] markers.");
}

// --- Step 7: Grade E blocked ---

if (renderResult.templateGrade === "html_replica_or_unverified") {
  failures.push(
    "Grade E (html_replica_or_unverified) output is blocked. PA pleading must be Grade D (legal_ops_custom_pleading)."
  );
}

// --- Step 8: No service-role import in new client-path files ---

const newClientFiles = [
  "src/lib/record-clearing/renderers/custom-pleading-renderer.ts",
  "src/lib/record-clearing/pennsylvania-config.ts",
  "src/lib/record-clearing/pleading-qa.ts"
];
for (const relPath of newClientFiles) {
  const fullPath = path.join(rootDir, relPath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf8");
    if (/service.role|serviceRole|SUPABASE_SERVICE_ROLE/i.test(content)) {
      failures.push(`Service-role reference found in client-path file: ${relPath}`);
    }
  } else {
    failures.push(`Expected new file not found: ${relPath}`);
  }
}

// --- Step 9: MS not enabled in new engine ---

const msEnabled = Array.isArray(recordClearing.recordClearingJurisdictions)
  ? recordClearing.recordClearingJurisdictions.some((j) => j.jurisdictionCode === "MS")
  : false;
if (msEnabled) {
  failures.push("Mississippi must remain excluded from the new shadow engine.");
}

// --- Step 10: No live route or legacy generator changes ---

if (hasLiveRouteChanges()) {
  failures.push("Live RCAP route or legacy generator files were modified.");
}

// --- Step 11: getPaPleadingConfig round-trip ---

if (typeof getPaPleadingConfig === "function") {
  const fetched = getPaPleadingConfig("adult_expungement");
  if (!fetched || fetched.primaryReliefTerm !== "expungement") {
    failures.push("getPaPleadingConfig('adult_expungement') did not return the correct config.");
  }
} else {
  failures.push("getPaPleadingConfig not exported from record-clearing index.");
}

// --- Report ---

if (failures.length > 0) {
  console.error("Pennsylvania pleading state verification FAILED.");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Pennsylvania pleading state verification PASSED.");
console.log(`  PA config jurisdictionCode:   ${paConfig.jurisdictionCode}`);
console.log(`  PA config primaryReliefTerm:  ${paConfig.primaryReliefTerm}`);
console.log(`  PA config templateGrade:      ${paConfig.templateGrade}`);
console.log(`  PA config templateLifecycle:  ${paConfig.templateLifecycle}`);
console.log(`  Rendered:                     ${renderResult.rendered}`);
console.log(`  QA passed:                    ${qaResult.passed}`);
console.log(`  QA warnings:                  ${qaResult.warnings.length > 0 ? qaResult.warnings.join("; ") : "none"}`);
console.log(`  Lifecycle:                    ${renderResult.templateLifecycle} (expected: replacement_candidate)`);
console.log(`  Seals / logos in output:      no`);
console.log(`  Grade E blocked:              yes`);
console.log(`  Service-role in client paths: no`);
console.log(`  Mississippi new-engine:       no`);
console.log(`  Live RCAP routes modified:    no`);
console.log(`  Counsel flags:                ${paConfig.counselFlags.length}`);
console.log(`  Audit manifest:               ${auditPath}`);
if (renderResult.rendered) console.log(`  Sample pleading:              ${pleadingTextPath}`);
console.log("");
console.log("--- GENERATED PA EXPUNGEMENT PLEADING (first 1200 chars) ---");
console.log(renderResult.fullText.slice(0, 1200));
console.log("--- END SAMPLE ---");

// --- Helpers ---

function reportAndExit() {
  if (failures.length > 0) {
    console.error("Pennsylvania pleading state verification FAILED.");
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

function hasLiveRouteChanges() {
  const result = spawnSync(
    "git",
    [
      "status",
      "--short",
      "--",
      "src/app",
      "src/lib/rcap-intake",
      "src/lib/documents",
      "src/lib/document-generation",
      "src/lib/reports",
      "supabase"
    ],
    { cwd: rootDir, encoding: "utf8" }
  );
  return result.stdout.trim().length > 0;
}
