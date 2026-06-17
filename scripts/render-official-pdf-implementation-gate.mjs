import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = process.env.OFFICIAL_FORMS_SOURCE_DIR
  ?? "/workspaces/legalease-partner-dashboard-clean/private/Nationwide Record Clearing";
const outputDir = process.env.OFFICIAL_PDF_IMPLEMENTATION_GATE_OUT
  ? path.resolve(process.env.OFFICIAL_PDF_IMPLEMENTATION_GATE_OUT)
  : path.join(rootDir, "tmp/official-pdf-implementation-gate");
const shadowOutputDir = path.join(rootDir, "tmp/official-pdf-shadow-batch");

registerTypeScriptHook();

const gate = require(path.join(rootDir, "src/lib/record-clearing/official-pdf-implementation-gate.ts"));
const report = await gate.evaluateOfficialPdfImplementationGate({
  rootDir,
  sourceDir,
  outputDir,
  shadowOutputDir
});

console.log("Official PDF implementation-gate evaluation complete.");
console.log(`Approved drafts evaluated: ${report.evaluatedCount}`);
console.log(`Shadow rendered: ${report.shadow.rendered} | blocked: ${report.shadow.blocked}`);
console.log("Status counts:");
for (const [status, count] of Object.entries(report.statusCounts)) {
  console.log(`  ${status}: ${count}`);
}
console.log("Top implementation-gate-pass candidates:");
for (const candidate of report.topImplementationGatePassCandidates) {
  console.log(`  - ${candidate}`);
}
console.log(`Report: ${path.relative(rootDir, path.join(outputDir, "official-pdf-implementation-gate-report.json"))}`);
for (const result of report.results) {
  console.log(`${result.jurisdiction} ${result.formSlug}: ${result.primaryStatus}`);
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
