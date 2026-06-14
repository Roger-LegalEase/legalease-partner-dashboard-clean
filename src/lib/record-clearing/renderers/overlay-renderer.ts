import fs from "node:fs";
import path from "node:path";
import type { RenderInput, RenderResult } from "../types";
import { hashFile, safeOutputFileName } from "./render-utils";

export function renderOverlayShadow(input: RenderInput): RenderResult {
  const outputPath = path.join(input.outputDirectory, safeOutputFileName(input.template, "overlay-shadow"));
  fs.mkdirSync(input.outputDirectory, { recursive: true });
  fs.copyFileSync(input.sourcePdfPath, outputPath);

  return {
    rendered: true,
    status: (input.fieldMap.overlays?.length ?? 0) > 0 ? "shadow_rendered" : "field_mapping_needed",
    generationMethod: "overlay",
    outputPath,
    blankSourceHash: input.template.blankSourceHash,
    outputHash: hashFile(outputPath),
    warnings: (input.fieldMap.overlays?.length ?? 0) > 0 ? [] : ["Overlay field map is draft and has no coordinates."],
    errors: []
  };
}
