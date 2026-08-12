// OfficialPdfRenderer and its three strategies.
//
// The renderer preserves the official source document in every case. It never
// substitutes a different form, never falls back to another jurisdiction's
// source, and never rewrites fixed legal language unless the packet manifest
// carries a separately recorded approval for that exact transformation.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PDFCheckBox, PDFDocument, PDFDropdown, PDFRadioGroup, PDFTextField, StandardFonts, rgb } from "pdf-lib";
import { acroMappingsFor, overlayPlacementsFor } from "@/lib/rcap/packets/registry";
import { wrapText } from "@/lib/rcap/packets/engines/pdf-layout";
import {
  PacketRenderError,
  type PacketRenderer,
  type RenderInput,
  type RenderResult
} from "@/lib/rcap/packets/engines/types";

const ACROFORM_VERSION = "acroform-fill/1.0.0";
const OVERLAY_VERSION = "coordinate-overlay/1.0.0";
const UNSUPPORTED_VERSION = "unsupported-pdf/1.0.0";

type LoadedSource = { bytes: Uint8Array; sha256: string; absolutePath: string };

/**
 * Loads the exact registered source and verifies its hash before anything is
 * drawn on it. A changed source must fail here rather than produce a document
 * built on an unverified form.
 */
function loadVerifiedSource(input: RenderInput): LoadedSource {
  const { component } = input;
  if (!component.sourcePath || !component.sourceSha256) {
    throw new PacketRenderError("source_missing", "This component declares no official source document.", {
      componentId: component.componentId
    });
  }

  const absolutePath = path.join(input.rootDir, component.sourcePath);
  if (!fs.existsSync(absolutePath)) {
    throw new PacketRenderError("source_missing", "The official source document is not available.", {
      componentId: component.componentId,
      sourcePath: component.sourcePath
    });
  }

  const bytes = new Uint8Array(fs.readFileSync(absolutePath));
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== component.sourceSha256) {
    throw new PacketRenderError("source_hash_mismatch", "The official source document does not match its recorded hash.", {
      componentId: component.componentId,
      expected: component.sourceSha256,
      actual: sha256
    });
  }

  return { bytes, sha256, absolutePath };
}

function assertProcessable(bytes: Uint8Array, componentId: string): void {
  const latin = Buffer.from(bytes).toString("latin1");
  if (/\/XFA\b/.test(latin)) {
    throw new PacketRenderError("unsupported_source_format", "The source is an XFA form and cannot be processed.", {
      componentId,
      format: "xfa"
    });
  }
  if (/\/Encrypt\b/.test(latin)) {
    throw new PacketRenderError("unsupported_source_format", "The source is encrypted and cannot be processed.", {
      componentId,
      format: "encrypted"
    });
  }
}

async function reopen(bytes: Uint8Array, componentId: string): Promise<number> {
  try {
    return (await PDFDocument.load(bytes)).getPageCount();
  } catch (error) {
    throw new PacketRenderError("invalid_pdf_output", "The rendered document could not be reopened as a PDF.", {
      componentId,
      reason: String((error as Error)?.message ?? "").slice(0, 120)
    });
  }
}

// ---------------------------------------------------------------------------
// AcroFormFillStrategy
// ---------------------------------------------------------------------------

export const AcroFormFillStrategy: PacketRenderer = {
  strategy: "acroform_fill",
  version: ACROFORM_VERSION,

  async render(input: RenderInput): Promise<RenderResult> {
    const { component } = input;
    const source = loadVerifiedSource(input);
    assertProcessable(source.bytes, component.componentId);

    const mappings = acroMappingsFor(component.componentId);
    if (mappings.length === 0) {
      throw new PacketRenderError("mapping_missing", "No field mapping is registered for this component.", {
        componentId: component.componentId
      });
    }

    let doc: PDFDocument;
    try {
      doc = await PDFDocument.load(source.bytes);
    } catch (error) {
      throw new PacketRenderError("source_unreadable", "The official source document could not be parsed.", {
        componentId: component.componentId,
        reason: String((error as Error)?.message ?? "").slice(0, 120)
      });
    }

    const form = doc.getForm();
    const warnings: string[] = [];

    for (const mapping of mappings) {
      const raw = input.facts[mapping.fieldKey];
      if (raw === undefined || raw === null || String(raw).trim() === "") {
        warnings.push(`No value supplied for ${mapping.fieldKey}; field left blank.`);
        continue;
      }

      let field;
      try {
        field = form.getField(mapping.pdfFieldName);
      } catch {
        // A mapping naming a field the source does not contain is a mapping
        // defect, not a missing value, and must not pass silently.
        throw new PacketRenderError("field_not_found", "A mapped field is not present in the official source.", {
          componentId: component.componentId,
          pdfFieldName: mapping.pdfFieldName
        });
      }

      if (field instanceof PDFTextField) {
        const value = String(raw);
        if (mapping.multiline) field.enableMultiline();

        // A field's own maxLength is a hard constraint set by the issuing
        // court. Exceeding it is a mapping defect, and silently truncating a
        // legal value is worse than refusing: the Iowa PAULA form's 01.03 is a
        // four-character year, not a date, and only this check surfaces that.
        const maxLength = field.getMaxLength();
        if (typeof maxLength === "number" && maxLength > 0 && value.length > maxLength) {
          throw new PacketRenderError(
            "content_overflow",
            "A value is longer than the official field permits.",
            {
              componentId: component.componentId,
              pdfFieldName: mapping.pdfFieldName,
              maxLength,
              actualLength: value.length
            }
          );
        }

        field.setText(value);

        // Overflow detection: compare the rendered width against the widget.
        const widgets = field.acroField.getWidgets();
        const width = widgets[0]?.getRectangle()?.width ?? 0;
        if (width > 0 && !mapping.multiline) {
          const font = await doc.embedFont(StandardFonts.Helvetica);
          if (font.widthOfTextAtSize(value, 10) > width - 4) {
            warnings.push(`Value for ${mapping.fieldKey} may overflow its field width.`);
          }
        }
      } else if (field instanceof PDFCheckBox) {
        if (truthy(raw)) field.check();
        else field.uncheck();
      } else if (field instanceof PDFRadioGroup) {
        const options = field.getOptions();
        const value = String(raw);
        if (!options.includes(value)) {
          warnings.push(`Radio value ${value} is not an option for ${mapping.fieldKey}; left unset.`);
        } else {
          field.select(value);
        }
      } else if (field instanceof PDFDropdown) {
        const options = field.getOptions();
        const value = String(raw);
        if (!options.includes(value)) {
          warnings.push(`Dropdown value ${value} is not an option for ${mapping.fieldKey}; left unset.`);
        } else {
          field.select(value);
        }
      } else {
        warnings.push(`Field ${mapping.pdfFieldName} has an unsupported type; skipped.`);
      }
    }

    // Regenerate appearances so values are visible in every viewer, not just
    // those that render field values themselves.
    form.updateFieldAppearances();

    if (component.flatten === true) {
      form.flatten();
    }

    const bytes = await doc.save();
    const pageCount = await reopen(bytes, component.componentId);

    return {
      bytes,
      mimeType: "application/pdf",
      fileName: `${component.componentId}.pdf`,
      pageCount,
      sourceIdentity: component.sourcePath as string,
      sourceSha256: source.sha256,
      rendererStrategy: "acroform_fill",
      rendererVersion: ACROFORM_VERSION,
      warnings,
      validation: { parsed: true, pageCount, byteLength: bytes.byteLength, issues: warnings },
      metadata: {
        sourcePath: component.sourcePath as string,
        sourceSha256: source.sha256,
        mappedFields: mappings.length,
        flattened: component.flatten === true,
        jurisdiction: input.jurisdiction,
        componentRole: component.role
      }
    };
  }
};

// ---------------------------------------------------------------------------
// CoordinateOverlayStrategy
// ---------------------------------------------------------------------------

export const CoordinateOverlayStrategy: PacketRenderer = {
  strategy: "coordinate_overlay",
  version: OVERLAY_VERSION,

  async render(input: RenderInput): Promise<RenderResult> {
    const { component } = input;
    const source = loadVerifiedSource(input);
    assertProcessable(source.bytes, component.componentId);

    const placements = overlayPlacementsFor(component.componentId);
    if (placements.length === 0) {
      throw new PacketRenderError("mapping_missing", "No overlay placements are registered for this component.", {
        componentId: component.componentId
      });
    }

    // Placeholder coordinates must never reach a participant document. The
    // nationwide draft corpus is full of unconfirmed anchors; this is the gate
    // that stops one being promoted by accident.
    const unconfirmed = placements.filter((placement) => !placement.confirmed);
    if (unconfirmed.length > 0) {
      throw new PacketRenderError("mapping_unconfirmed", "Overlay placements have not been visually confirmed.", {
        componentId: component.componentId,
        unconfirmedFields: unconfirmed.map((p) => p.fieldKey).join(",")
      });
    }

    // Covering fixed legal language requires its own recorded approval. Absent
    // that, the overlay may only write into blanks.
    const approvedTransformations = component.approvedTextTransformations ?? [];
    if (component.redactionRegions && approvedTransformations.length === 0) {
      throw new PacketRenderError(
        "unapproved_text_transformation",
        "This component asks to overwrite fixed language without a recorded approval.",
        { componentId: component.componentId }
      );
    }

    let doc: PDFDocument;
    try {
      doc = await PDFDocument.load(source.bytes);
    } catch (error) {
      throw new PacketRenderError("source_unreadable", "The official source document could not be parsed.", {
        componentId: component.componentId,
        reason: String((error as Error)?.message ?? "").slice(0, 120)
      });
    }

    const font = await doc.embedFont(StandardFonts.Helvetica);
    const warnings: string[] = [];
    const pages = doc.getPages();

    for (const placement of placements) {
      const raw = input.facts[placement.fieldKey];
      if (raw === undefined || raw === null || String(raw).trim() === "") {
        warnings.push(`No value supplied for ${placement.fieldKey}; blank left as printed.`);
        continue;
      }

      const page = pages[placement.page - 1];
      if (!page) {
        throw new PacketRenderError("mapping_missing", "An overlay placement names a page the source does not have.", {
          componentId: component.componentId,
          page: placement.page
        });
      }

      if (placement.kind === "checkbox") {
        if (truthy(raw)) {
          page.drawText("X", { x: placement.x, y: placement.y, size: placement.size, font, color: rgb(0, 0, 0) });
        }
        continue;
      }

      const value = String(raw);
      const maxWidth = placement.maxWidth ?? 200;
      const lines = wrapText(value, font, placement.size, maxWidth);
      if (lines.length > 1) {
        warnings.push(`Value for ${placement.fieldKey} wrapped onto ${lines.length} lines.`);
      }
      lines.forEach((line, index) => {
        page.drawText(line, {
          x: placement.x,
          y: placement.y - index * (placement.size + 2),
          size: placement.size,
          font,
          color: rgb(0, 0, 0)
        });
      });
    }

    const bytes = await doc.save();
    const pageCount = await reopen(bytes, component.componentId);

    return {
      bytes,
      mimeType: "application/pdf",
      fileName: `${component.componentId}.pdf`,
      pageCount,
      sourceIdentity: component.sourcePath as string,
      sourceSha256: source.sha256,
      rendererStrategy: "coordinate_overlay",
      rendererVersion: OVERLAY_VERSION,
      warnings,
      validation: { parsed: true, pageCount, byteLength: bytes.byteLength, issues: warnings },
      metadata: {
        sourcePath: component.sourcePath as string,
        sourceSha256: source.sha256,
        placements: placements.length,
        jurisdiction: input.jurisdiction,
        componentRole: component.role
      }
    };
  }
};

// ---------------------------------------------------------------------------
// UnsupportedPdfStrategy
// ---------------------------------------------------------------------------

/**
 * Terminal, typed, and deliberately incapable of producing a document. Every
 * path throws, because the alternative — quietly substituting another form or
 * renderer — is the defect this whole lane exists to prevent.
 */
export const UnsupportedPdfStrategy: PacketRenderer = {
  strategy: "unsupported_pending_conversion",
  version: UNSUPPORTED_VERSION,

  async render(input: RenderInput): Promise<RenderResult> {
    const { component } = input;

    if (!component.sourcePath || !component.sourceSha256) {
      throw new PacketRenderError("source_missing", "This component has no official source and cannot be rendered.", {
        componentId: component.componentId
      });
    }

    const absolutePath = path.join(input.rootDir, component.sourcePath);
    if (!fs.existsSync(absolutePath)) {
      throw new PacketRenderError("source_missing", "The official source document is absent.", {
        componentId: component.componentId,
        sourcePath: component.sourcePath
      });
    }

    const bytes = new Uint8Array(fs.readFileSync(absolutePath));
    const latin = Buffer.from(bytes).toString("latin1");
    const format = /\/XFA\b/.test(latin) ? "xfa" : /\/Encrypt\b/.test(latin) ? "encrypted" : "unreadable";

    throw new PacketRenderError(
      "unsupported_source_format",
      "This official source requires conversion before it can be used.",
      { componentId: component.componentId, format }
    );
  }
};

// ---------------------------------------------------------------------------
// OfficialPdfRenderer — dispatch
// ---------------------------------------------------------------------------

export const OfficialPdfRenderer = {
  strategy: "official_pdf_fill" as const,
  version: "official-pdf/1.0.0",

  strategyFor(component: RenderInput["component"]): PacketRenderer {
    switch (component.rendererStrategy) {
      case "acroform_fill":
        return AcroFormFillStrategy;
      case "coordinate_overlay":
        return CoordinateOverlayStrategy;
      default:
        return UnsupportedPdfStrategy;
    }
  },

  async render(input: RenderInput): Promise<RenderResult> {
    return this.strategyFor(input.component).render(input);
  }
};

function truthy(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "true" || normalized === "yes" || normalized === "1" || normalized === "on";
}
