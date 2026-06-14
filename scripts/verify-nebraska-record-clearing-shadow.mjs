import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = process.env.OFFICIAL_FORMS_SOURCE_DIR;
const failures = [];

if (!sourceDir) {
  console.error("OFFICIAL_FORMS_SOURCE_DIR is required.");
  process.exit(1);
}

const reportPath = path.join(rootDir, "data/record-clearing/pdf-inspection/latest-report.json");
if (!fs.existsSync(reportPath)) {
  console.error("Missing inspection report. Run npm run rcap:forms:inspect-local first.");
  process.exit(1);
}

registerTypeScriptHook();

const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const nebraskaInspectionRows = report.pdfs.filter((pdf) => pdf.jurisdictionCode === "NE");
const outputDirectory = path.join(rootDir, "tmp/record-clearing-shadow/nebraska");
fs.mkdirSync(outputDirectory, { recursive: true });

const nebraskaConfig = recordClearing.getJurisdictionConfig("NE");
if (nebraskaConfig.productionReady !== false) failures.push("Nebraska config must not be productionReady.");

const mississippiEnabled = recordClearing.recordClearingJurisdictions.some((jurisdiction) => jurisdiction.jurisdictionCode === "MS");
if (mississippiEnabled) failures.push("Mississippi must remain excluded from the new shadow engine.");

for (const template of recordClearing.nebraskaOfficialPdfTemplates) {
  if (template.templateLifecycle !== "replacement_candidate") failures.push(`${template.formId} must remain replacement_candidate.`);
  if (template.productionReady !== false) failures.push(`${template.formId} must not be productionReady.`);
  const inspected = nebraskaInspectionRows.find((row) => row.relativePath === template.relativePath);
  if (!inspected) {
    failures.push(`Missing Nebraska inspection metadata for ${template.relativePath}.`);
    continue;
  }
  if (inspected.sha256 !== template.blankSourceHash) failures.push(`${template.formId} blank source hash does not match inspection report.`);
}

const packetPlan = recordClearing.planNebraskaPacket("adult_set_aside_conviction");
const sampleData = {
  petitionerName: "Test Petitioner",
  caseNumber: "CR 00-0000",
  county: "Lancaster"
};
const templates = packetPlan.requiredForms.map((form) => recordClearing.getNebraskaTemplateByFormId(form.formId));
const fieldMaps = templates.map((template) => recordClearing.getFieldMap(template.formId));
const renderResults = [];
const selectedModes = [];

for (const template of templates) {
  const inspection = nebraskaInspectionRows.find((row) => row.relativePath === template.relativePath);
  const fieldMap = recordClearing.getFieldMap(template.formId);
  if (!inspection || !fieldMap) continue;

  const selectedMode = recordClearing.chooseRendererMode(inspection.classification, inspection.recommendedMappingMode);
  selectedModes.push({
    formId: template.formId,
    formNumber: template.formNumber,
    classification: inspection.classification,
    selectedMode
  });

  const renderResult = recordClearing.renderOfficialPdfShadow({
    template: {
      ...template,
      pdfClassification: inspection.classification,
      recommendedMappingMode: inspection.recommendedMappingMode
    },
    fieldMap: {
      ...fieldMap,
      mappingMode: selectedMode
    },
    sourcePdfPath: path.join(sourceDir, template.relativePath),
    outputDirectory,
    purpose: "shadow_verification",
    shadowMode: true,
    sampleData
  });
  renderResults.push(renderResult);
}

const qaResult = recordClearing.runRecordClearingQa({
  packetPlan,
  templates,
  fieldMaps,
  renderResults,
  purpose: "shadow_verification",
  shadowMode: true,
  outputTextSamples: templates.map((template) => `${template.formNumber} ${template.courtFacingTitle}`)
});

if (!qaResult.passed) failures.push(...qaResult.failures);

const auditManifest = recordClearing.buildAuditManifest({
  packetId: "ne-shadow-set-aside-sample",
  jurisdictionCode: "NE",
  reliefTrack: "adult_set_aside_conviction",
  workflowVersion: "record-clearing-shadow-ne-v1",
  templates,
  renderResults,
  qaResult
});

const auditPath = path.join(outputDirectory, "nebraska-shadow-audit.json");
fs.writeFileSync(auditPath, `${JSON.stringify(auditManifest, null, 2)}\n`);

if (hasLiveRouteChanges()) failures.push("Live RCAP route or legacy generator files were modified.");
if (renderResults.some((result) => result.outputHash && result.outputHash === result.blankSourceHash && result.status === "shadow_rendered")) {
  failures.push("A rendered output was marked shadow_rendered even though it matches the blank source hash.");
}

const generatedPdfPaths = renderResults.map((result) => result.outputPath).filter(Boolean);
const blocked = renderResults.filter((result) => result.status === "blocked").length;
const fieldMappingNeeded = renderResults.some((result) => result.status === "field_mapping_needed");
const shadowRenderable = generatedPdfPaths.length > 0 && blocked === 0;
const nebraskaStatus = blocked > 0
  ? "blocked_by_pdf_quality"
  : fieldMappingNeeded
    ? "ready_for_human_visual_mapping"
    : "shadow_renderable";

if (failures.length > 0) {
  console.error("Nebraska record-clearing shadow verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Nebraska record-clearing shadow verification passed.");
console.log(`Nebraska productionReady: ${nebraskaConfig.productionReady}`);
console.log(`Nebraska shadow status: ${nebraskaStatus}`);
console.log(`Shadow renderable: ${shadowRenderable ? "yes" : "no"}`);
console.log(`Field mapping needed: ${fieldMappingNeeded ? "yes" : "no"}`);
console.log(`Blocked by PDF quality: ${blocked > 0 ? "yes" : "no"}`);
console.log(`Selected renderer modes: ${JSON.stringify(selectedModes)}`);
console.log(`Generated PDF paths: ${generatedPdfPaths.length > 0 ? generatedPdfPaths.join(", ") : "none"}`);
console.log(`QA passed: ${qaResult.passed}`);
console.log(`QA warnings: ${qaResult.warnings.length > 0 ? qaResult.warnings.join("; ") : "none"}`);
console.log(`Audit manifest: ${auditPath}`);
console.log("Mississippi new-engine enabled: no");
console.log("Live RCAP routes modified: no");

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
