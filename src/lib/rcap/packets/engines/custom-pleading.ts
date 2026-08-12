// CustomPleadingRenderer.
//
// Builds a jurisdiction-specific pleading from an approved template populated
// with participant facts. Caption, court line, numbered allegations, prayer,
// verification, signature block and certificate of service are all template
// properties, so two jurisdictions produce genuinely different documents rather
// than one national petition with the state name swapped.

import { PDFDocument } from "pdf-lib";
import {
  createDocument,
  fillTemplate,
  FlowWriter,
  LINE_HEIGHT
} from "@/lib/rcap/packets/engines/pdf-layout";
import { pleadingTemplate } from "@/lib/rcap/packets/engines/pleading-templates";
import {
  PacketRenderError,
  type PacketRenderer,
  type RenderInput,
  type RenderResult
} from "@/lib/rcap/packets/engines/types";

const VERSION = "custom-pleading/1.0.0";

export const CustomPleadingRenderer: PacketRenderer = {
  strategy: "custom_pleading",
  version: VERSION,

  async render(input: RenderInput): Promise<RenderResult> {
    const template = pleadingTemplate(input.component.templateId);
    if (!template) {
      throw new PacketRenderError(
        "template_missing",
        "No approved pleading template is registered for this component.",
        { componentId: input.component.componentId, templateId: input.component.templateId }
      );
    }

    const warnings: string[] = [];
    const missingKeys = new Set<string>();
    const fill = (text: string) => {
      const result = fillTemplate(text, input.facts);
      result.missing.forEach((key) => missingKeys.add(key));
      return result.text;
    };

    const { doc, fonts } = await createDocument();
    const writer = new FlowWriter(doc, fonts);

    if (template.technicalFixture && template.fixtureBanner) {
      writer.write(template.fixtureBanner, { font: "bold", size: 9, align: "center" });
      writer.rule();
      writer.gap(LINE_HEIGHT / 2);
    }

    // Caption
    writer.write(fill(template.caption.courtLine), { font: "bold", size: 11, align: "center" });
    writer.gap();

    const leftLines = template.caption.partyBlockLeft.map(fill);
    const rightLines = template.caption.partyBlockRight.map(fill);
    const rows = Math.max(leftLines.length, rightLines.length);
    for (let i = 0; i < rows; i += 1) {
      const left = leftLines[i] ?? "";
      const right = rightLines[i] ?? "";
      // Two-column caption rendered as one padded line keeps the block intact
      // through pagination without a table abstraction.
      writer.write(left.padEnd(46).slice(0, 46) + right, { size: 10 });
    }
    writer.gap();

    writer.write(fill(template.title), { font: "bold", size: 12, align: "center" });
    writer.gap();

    if (template.preamble) {
      writer.write(fill(template.preamble), { font: "italic", size: 10 });
      writer.gap();
    }

    for (const section of template.sections) {
      if (section.heading) {
        writer.write(fill(section.heading), { font: "bold", size: 11 });
        writer.gap(LINE_HEIGHT / 2);
      }
      let index = 1;
      for (const paragraph of section.paragraphs) {
        const body = fill(paragraph);
        if (section.numbered) {
          writer.write(`${index}.    ${body}`, { size: 11, indent: 18 });
          index += 1;
        } else {
          writer.write(body, { size: 11 });
        }
        writer.gap(LINE_HEIGHT / 2);
      }
      writer.gap(LINE_HEIGHT / 2);
    }

    if (template.prayer.length > 0) {
      for (const line of template.prayer) {
        writer.write(fill(line), { size: 11 });
        writer.gap(LINE_HEIGHT / 2);
      }
      writer.gap();
    }

    if (template.verification) {
      writer.write("VERIFICATION", { font: "bold", size: 11 });
      writer.gap(LINE_HEIGHT / 2);
      writer.write(fill(template.verification), { size: 11 });
      writer.gap();
    }

    writer.gap();
    writer.signatureLine("Signature");
    for (const line of template.signatureBlock) {
      writer.write(fill(line), { size: 10 });
    }

    if (template.certificateOfService && template.certificateOfService.length > 0) {
      writer.gap();
      writer.write("CERTIFICATE OF SERVICE", { font: "bold", size: 11 });
      writer.gap(LINE_HEIGHT / 2);
      for (const line of template.certificateOfService) {
        writer.write(fill(line), { size: 11 });
      }
    }

    if (missingKeys.size > 0) {
      warnings.push(
        `Rendered blank lines for absent values: ${[...missingKeys].sort().join(", ")}.`
      );
    }
    warnings.push(...writer.warnings);

    const bytes = await doc.save();

    // Reopen what was produced. A renderer that emits unopenable bytes must not
    // be able to report success.
    let pageCount = 0;
    try {
      pageCount = (await PDFDocument.load(bytes)).getPageCount();
    } catch (error) {
      throw new PacketRenderError(
        "invalid_pdf_output",
        "The generated pleading could not be reopened as a PDF.",
        { componentId: input.component.componentId, reason: String((error as Error)?.message ?? "").slice(0, 120) }
      );
    }

    return {
      bytes,
      mimeType: "application/pdf",
      fileName: `${input.component.componentId}.pdf`,
      pageCount,
      sourceIdentity: template.templateId,
      sourceSha256: null,
      rendererStrategy: "custom_pleading",
      rendererVersion: VERSION,
      warnings,
      validation: { parsed: true, pageCount, byteLength: bytes.byteLength, issues: warnings },
      metadata: {
        templateId: template.templateId,
        templateVersion: template.version,
        technicalFixture: template.technicalFixture,
        jurisdiction: input.jurisdiction,
        geography: input.geography,
        componentRole: input.component.role
      }
    };
  }
};
