import fs from "node:fs";
import path from "node:path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { MappingMode, RenderInput, RenderResult } from "../types";
import { hashFile, safeOutputFileName } from "./render-utils";

export async function renderOverlayShadow(input: RenderInput): Promise<RenderResult> {
  return renderPdfOverlayShadow(input, "overlay", safeOutputFileName(input.template, "overlay-shadow"));
}

export async function renderPdfOverlayShadow(input: RenderInput, generationMethod: MappingMode, fallbackFileName: string): Promise<RenderResult> {
  const outputPath = path.join(input.outputDirectory, input.outputFileName ?? fallbackFileName);
  fs.mkdirSync(input.outputDirectory, { recursive: true });
  const overlays = input.fieldMap.overlays ?? [];

  if (overlays.length > 0) {
    await renderOverlays(input, outputPath);
  } else {
    fs.copyFileSync(input.sourcePdfPath, outputPath);
  }

  return {
    rendered: true,
    status: overlays.length > 0 ? "shadow_rendered" : "field_mapping_needed",
    generationMethod,
    outputPath,
    blankSourceHash: input.template.blankSourceHash,
    outputHash: hashFile(outputPath),
    warnings: overlays.length > 0 ? [] : ["Overlay field map is draft and has no coordinates."],
    errors: []
  };
}

async function renderOverlays(input: RenderInput, outputPath: string): Promise<void> {
  const sourceBytes = fs.readFileSync(input.sourcePdfPath);
  const document = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  const font = await document.embedFont(StandardFonts.HelveticaBold);
  const pages = document.getPages();

  for (const overlay of input.fieldMap.overlays ?? []) {
    const page = pages[overlay.page - 1];
    const value = input.sampleData[overlay.textKey];
    if (!page || !value) continue;
    page.drawText(value, {
      x: overlay.x,
      y: overlay.y,
      size: overlay.fontSize ?? 10,
      font,
      color: rgb(0.85, 0, 0),
      maxWidth: 260
    });
  }

  const bytes = await document.save({ useObjectStreams: false });
  fs.writeFileSync(outputPath, bytes);
}
