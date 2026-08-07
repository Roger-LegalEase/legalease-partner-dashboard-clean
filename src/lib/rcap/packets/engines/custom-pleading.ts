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
      writer.captionRow(leftLines[i] ?? "", rightLines[i] ?? "");
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
        // A heading alone at the foot of a page, with the section it names
        // starting overleaf, reads as a heading for whatever the reader sees
        // next. The heading, the gap under it and the first line of the section
        // move together, so a heading is never the last thing on a page.
        //
        // One line, not the whole first paragraph: reserving a long paragraph
        // would push headings forward for no reason and could leave most of a
        // page empty. Measured, not padded — an oversized reservation is
        // declined by keepTogether and left to ordinary pagination, which is why
        // this cannot produce a blank page.
        const headingText = fill(section.heading);
        const headingHeight = writer.measureTextHeight(headingText, {
          font: "bold",
          size: 11
        });
        writer.keepTogether(headingHeight + LINE_HEIGHT / 2 + LINE_HEIGHT);
        writer.write(headingText, { font: "bold", size: 11 });
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
    // The execution block is one unit. A signature rule stranded at the foot of
    // a page, with the printed-name and capacity lines that identify the signer
    // overleaf, reads as a complete signature line for the wrong document — so
    // the rule and every line under it move together rather than the rule alone.
    //
    // Measured, not padded: an oversized block is left to ordinary pagination by
    // keepTogether, which is why nothing here can produce a blank page.
    const signatureLines = template.signatureBlock.map((line) => fill(line));
    const executionBlockHeight =
      (template.signatureLabel !== null ? LINE_HEIGHT * 2 : 0) +
      signatureLines.reduce(
        (total, line) => total + writer.measureTextHeight(line, { size: 10 }),
        0
      );
    if (executionBlockHeight > 0) writer.keepTogether(executionBlockHeight);

    // A proposed order is signed by the court, not the petitioner. Emitting a
    // participant signature rule on one would invite the wrong person to sign.
    if (template.signatureLabel !== null) {
      writer.signatureLine(template.signatureLabel ?? "Signature");
    }
    for (const line of signatureLines) {
      writer.write(line, { size: 10 });
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
