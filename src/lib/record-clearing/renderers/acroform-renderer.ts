import fs from "node:fs";
import path from "node:path";
import type { RenderInput, RenderResult } from "../types";
import { hashFile, safeOutputFileName } from "./render-utils";

export function renderAcroformShadow(input: RenderInput): RenderResult {
  const outputPath = path.join(input.outputDirectory, safeOutputFileName(input.template, "acroform-shadow"));
  fs.mkdirSync(input.outputDirectory, { recursive: true });
  fs.copyFileSync(input.sourcePdfPath, outputPath);

  return {
    rendered: true,
    status: Object.keys(input.fieldMap.fields ?? {}).length > 0 ? "shadow_rendered" : "field_mapping_needed",
    generationMethod: "acroform",
    outputPath,
    blankSourceHash: input.template.blankSourceHash,
    outputHash: hashFile(outputPath),
    warnings: Object.keys(input.fieldMap.fields ?? {}).length > 0 ? [] : ["AcroForm field map is draft and has no mapped fields."],
    errors: []
  };
}
