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
const outputDir = process.env.OFFICIAL_PDF_SHADOW_BATCH_OUT
  ? path.resolve(process.env.OFFICIAL_PDF_SHADOW_BATCH_OUT)
  : path.join(rootDir, "tmp/official-pdf-shadow-batch");
const draftPaths = process.argv.slice(2);

registerTypeScriptHook();

const batch = require(path.join(rootDir, "src/lib/record-clearing/official-pdf-shadow-batch.ts"));
const summary = await batch.renderOfficialPdfShadowBatch({
  rootDir,
  sourceDir,
  outputDir,
  draftPaths: draftPaths.length > 0 ? draftPaths : undefined
});

console.log("Official PDF shadow batch render complete.");
console.log(`Approved drafts: ${summary.approvedDraftCount}`);
console.log(`Rendered: ${summary.renderedCount}`);
console.log(`Blocked: ${summary.blockedCount}`);
console.log(`Output directory: ${path.relative(rootDir, summary.outputDir)}`);
console.log(`Manifest: ${path.relative(rootDir, summary.manifestPath)}`);
for (const result of summary.results) {
  const rendered = result.outputPath ? path.relative(rootDir, result.outputPath) : "blocked";
  console.log(`${result.jurisdiction} ${result.formSlug}: ${rendered}${result.blockedReason ? ` (${result.blockedReason})` : ""}`);
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
