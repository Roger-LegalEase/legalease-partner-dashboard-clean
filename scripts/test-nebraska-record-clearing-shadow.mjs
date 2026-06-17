import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ne-record-clearing-shadow-test-"));

registerTypeScriptHook();
const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));

try {
  assertNebraskaConfigExists();
  assertMississippiExcluded();
  assertVocabularyHardFails();
  assertLifecycleRules();
  await assertPdfQualityBlocks();
  assertAuditManifestCreated();
  assertNoLiveRoutesModified();
  assertNoRawPdfsCommitted();
  assertGitignoreSafety();
  console.log("Nebraska record-clearing shadow tests passed.");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function assertNebraskaConfigExists() {
  const nebraska = recordClearing.getJurisdictionConfig("NE");
  assert.equal(nebraska.productionReady, false);
  assert.equal(nebraska.enabledReliefTracks.includes("adult_set_aside_conviction"), true);
  assert.equal(nebraska.enabledReliefTracks.includes("adult_record_sealing"), true);
  assert.equal(recordClearing.nebraskaOfficialPdfTemplates.length, 3);
  assert.equal(recordClearing.nebraskaOfficialPdfTemplates.every((template) => template.templateLifecycle === "shadow_only"), true);
  assert.equal(recordClearing.getNebraskaTemplateByFormId("ne_cc_6_11_petition_set_aside_conviction").fieldMapStatus, "visual_review_required");
}

function assertMississippiExcluded() {
  assert.equal(recordClearing.recordClearingJurisdictions.some((jurisdiction) => jurisdiction.jurisdictionCode === "MS"), false);
}

function assertVocabularyHardFails() {
  const plan = recordClearing.planNebraskaPacket("adult_set_aside_conviction");
  const template = recordClearing.getNebraskaTemplateByFormId("ne_cc_6_11_petition_set_aside_conviction");
  const fieldMap = recordClearing.getFieldMap(template.formId);
  const qa = recordClearing.runRecordClearingQa({
    packetPlan: {
      ...plan,
      title: "Nebraska Adult Expungement Packet"
    },
    templates: [template],
    fieldMaps: [fieldMap],
    renderResults: [],
    purpose: "shadow_verification",
    shadowMode: true,
    outputTextSamples: ["Generic expungement output"]
  });
  assert.equal(qa.passed, false);
  assert.equal(qa.failures.some((failure) => /expungement terminology/i.test(failure)), true);

  const sealingPlan = recordClearing.planNebraskaPacket("adult_record_sealing");
  const sealingTemplate = recordClearing.getNebraskaTemplateByFormId("ne_cc_6_12_motion_seal_adult_record");
  const collapsed = recordClearing.runRecordClearingQa({
    packetPlan: sealingPlan,
    templates: [template, sealingTemplate],
    fieldMaps: [fieldMap, recordClearing.getFieldMap(sealingTemplate.formId)],
    renderResults: [],
    purpose: "shadow_verification",
    shadowMode: true,
    outputTextSamples: []
  });
  assert.equal(collapsed.passed, false);
  assert.equal(collapsed.failures.some((failure) => /cannot be collapsed/i.test(failure)), true);
}

function assertLifecycleRules() {
  const template = recordClearing.getNebraskaTemplateByFormId("ne_cc_6_11_petition_set_aside_conviction");
  assert.equal(recordClearing.isTemplateAllowedForShadowVerification(template), true);
  assert.equal(recordClearing.isTemplateAllowedForNewEngineFinalFiling(template, true), false);
  assert.equal(recordClearing.isTemplateAllowedForNewEngineFinalFiling({ ...template, templateLifecycle: "verified_replacement" }, true), true);
  assert.equal(recordClearing.isTemplateAllowedForNewEngineFinalFiling({ ...template, templateGrade: "html_replica_or_unverified", templateLifecycle: "verified_replacement" }, true), false);
}

async function assertPdfQualityBlocks() {
  const sourcePdfPath = path.join(tempRoot, "source.pdf");
  fs.writeFileSync(sourcePdfPath, "%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n");
  const template = recordClearing.getNebraskaTemplateByFormId("ne_cc_6_11_petition_set_aside_conviction");
  const fieldMap = recordClearing.getFieldMap(template.formId);
  for (const classification of ["scanned_pdf", "encrypted_or_locked", "xfa_pdf", "manual_review"]) {
    const result = await recordClearing.renderOfficialPdfShadow({
      template: { ...template, pdfClassification: classification },
      fieldMap,
      sourcePdfPath,
      outputDirectory: tempRoot,
      purpose: "shadow_verification",
      shadowMode: true,
      sampleData: {}
    });
    assert.equal(result.status, "blocked");
  }
}

function assertAuditManifestCreated() {
  const template = recordClearing.getNebraskaTemplateByFormId("ne_cc_6_11_petition_set_aside_conviction");
  const qaResult = { passed: true, failures: [], warnings: ["field mapping needed"] };
  const manifest = recordClearing.buildAuditManifest({
    packetId: "test-packet",
    jurisdictionCode: "NE",
    reliefTrack: "adult_set_aside_conviction",
    workflowVersion: "test",
    templates: [template],
    renderResults: [{
      rendered: true,
      status: "field_mapping_needed",
      generationMethod: "hybrid",
      outputPath: null,
      blankSourceHash: template.blankSourceHash,
      outputHash: null,
      warnings: [],
      errors: []
    }],
    qaResult,
    createdAt: "2026-06-14T00:00:00.000Z"
  });
  assert.equal(manifest.packetId, "test-packet");
  assert.equal(manifest.templateLifecycles[template.formId], "shadow_only");
  assert.equal(manifest.qaResult.passed, true);
}

function assertNoLiveRoutesModified() {
  const status = spawnSync("git", ["status", "--short", "--", "src/app", "src/lib/rcap-intake", "supabase"], {
    cwd: rootDir,
    encoding: "utf8"
  }).stdout;
  const liveRouteStatus = status
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.includes("src/app/internal/record-clearing/"))
    .filter((line) => !line.includes("src/app/expungement-ai/"))
    .filter((line) => !line.includes("src/app/briefcase/"))
    .filter((line) => !line.includes("supabase/phase-26-consumer-briefcase-items.sql"))
    .join("\n");
  assert.equal(liveRouteStatus.trim(), "");
}

function assertNoRawPdfsCommitted() {
  const trackedPrivate = spawnSync("git", ["ls-files", "private", "*.zip"], {
    cwd: rootDir,
    encoding: "utf8"
  }).stdout.trim();
  assert.equal(trackedPrivate, "");
}

function assertGitignoreSafety() {
  const gitignore = fs.readFileSync(path.join(rootDir, ".gitignore"), "utf8");
  const lines = gitignore.split(/\r?\n/).map((line) => line.trim());
  assert.equal(lines.includes("private/"), true);
  assert.equal(lines.includes("*.zip"), true);
}

function registerTypeScriptHook() {
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
}
