import fs from "node:fs";
import path from "node:path";
import { isFieldMapComplete } from "../field-maps";
import type { MappingMode, RenderInput, RenderResult } from "../types";
import { renderAcroformShadow } from "./acroform-renderer";
import { renderOverlayShadow } from "./overlay-renderer";
import { detectXfaInPdfFile } from "./xfa-detector";
import { hashFile, safeOutputFileName } from "./render-utils";

export function chooseRendererMode(pdfClassification: string, recommendedMappingMode: MappingMode): MappingMode {
  if (pdfClassification === "acroform_dirty") return "hybrid";
  if (pdfClassification === "flat_pdf") return "overlay";
  if (pdfClassification === "acroform_clean") return "acroform";
  return recommendedMappingMode;
}

export function renderOfficialPdfShadow(input: RenderInput): RenderResult {
  const blockReason = getRenderBlockReason(input);
  if (blockReason) {
    return {
      rendered: false,
      status: "blocked",
      generationMethod: input.fieldMap.mappingMode,
      outputPath: null,
      blankSourceHash: input.template.blankSourceHash,
      outputHash: null,
      warnings: [],
      errors: [blockReason]
    };
  }

  if (input.fieldMap.mappingMode === "acroform") return renderAcroformShadow(input);
  if (input.fieldMap.mappingMode === "overlay") return renderOverlayShadow(input);
  if (input.fieldMap.mappingMode === "hybrid") return renderHybridShadow(input);

  return {
    rendered: false,
    status: "blocked",
    generationMethod: input.fieldMap.mappingMode,
    outputPath: null,
    blankSourceHash: input.template.blankSourceHash,
    outputHash: null,
    warnings: [],
    errors: ["Manual-review PDFs are blocked from auto-generation."]
  };
}

function renderHybridShadow(input: RenderInput): RenderResult {
  const outputPath = path.join(input.outputDirectory, safeOutputFileName(input.template, "hybrid-shadow"));
  fs.mkdirSync(input.outputDirectory, { recursive: true });
  fs.copyFileSync(input.sourcePdfPath, outputPath);

  return {
    rendered: true,
    status: isFieldMapComplete(input.fieldMap) ? "shadow_rendered" : "field_mapping_needed",
    generationMethod: "hybrid",
    outputPath,
    blankSourceHash: input.template.blankSourceHash,
    outputHash: hashFile(outputPath),
    warnings: isFieldMapComplete(input.fieldMap) ? [] : ["Hybrid field map is draft and has no AcroForm fields or overlay coordinates."],
    errors: []
  };
}

function getRenderBlockReason(input: RenderInput): string | null {
  if (!input.shadowMode) return "Official PDF renderer is shadow-only for this vertical slice.";
  if (input.purpose === "final_filing") return "Final filing output is blocked for replacement-candidate templates.";
  if (input.template.templateGrade === "html_replica_or_unverified") return "Grade E templates are blocked from new-engine final filing output.";
  if (input.template.templateLifecycle !== "replacement_candidate") return "Nebraska templates must remain replacement_candidate in this task.";
  if (input.template.pdfClassification === "encrypted_or_locked") return "Encrypted or locked PDFs are blocked from auto-generation.";
  if (input.template.pdfClassification === "xfa_pdf") return "XFA PDFs are blocked from AcroForm fill.";
  if (input.template.pdfClassification === "scanned_pdf") return "Scanned PDFs are blocked from auto-generation.";
  if (input.template.pdfClassification === "manual_review") return "Manual-review PDFs are blocked from auto-generation.";
  const xfaStatus = detectXfaInPdfFile(input.sourcePdfPath);
  if (xfaStatus === true) return "XFA key detected in source PDF; AcroForm fill is blocked.";
  if (xfaStatus === "unknown") return "XFA status is unknown; renderer will not default unknown XFA to false.";
  return null;
}
