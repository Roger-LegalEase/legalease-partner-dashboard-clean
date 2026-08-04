// Packet assembly — the one PDF the participant downloads.
//
// A packet set is an ordered set of components, and that is the right internal
// model: a petition, a companion form and a set of instructions are different
// documents with different sources, renderers and approval states. It is the
// wrong thing to hand a person. Someone who has to file at a counter needs one
// file, in the order it goes to the clerk, not a folder to reassemble.
//
// So the components stay separately addressable for debugging and for a future
// UI, and this module binds them into a single PDF in packet order. That
// assembled file is the participant's deliverable. There is no ZIP: a ZIP moves
// the assembly problem onto the person least equipped to solve it.
//
// Three rules this module enforces rather than assumes.
//
// Order is the manifest's. Components are bound in ascending `order`, and a
// duplicate or absent order is refused instead of resolved by sort stability.
//
// Bytes are deterministic. The same components in the same order always produce
// the same file, so the SHA-256 recorded in a review manifest means something.
// pdf-lib otherwise stamps the wall clock into every document.
//
// Filenames carry nothing sensitive. The name is built from the jurisdiction,
// the packet and a case reference, and a value that looks like a date of birth
// or a social security number is refused rather than sanitised, because a
// filename is the one part of a packet that gets mailed, screenshotted and
// left in a downloads folder.

import crypto from "node:crypto";
import { PDFDocument } from "pdf-lib";

/** Matches the renderers, so an assembled packet is byte-identical run to run. */
const DETERMINISTIC_TIMESTAMP = new Date(Date.UTC(2000, 0, 1, 0, 0, 0));

export type AssemblyFailureCode =
  | "no_components"
  | "duplicate_component_order"
  | "component_unreadable"
  | "unsafe_filename_input"
  | "invalid_assembled_output";

export class PacketAssemblyError extends Error {
  constructor(
    readonly code: AssemblyFailureCode,
    message: string,
    readonly detail: Record<string, string | number | boolean | null> = {}
  ) {
    super(message);
    this.name = "PacketAssemblyError";
  }
}

export type AssemblyComponent = {
  componentId: string;
  role: string;
  order: number;
  bytes: Uint8Array;
};

export type AssembledComponentRange = {
  componentId: string;
  role: string;
  order: number;
  /** 1-indexed, inclusive. */
  startPage: number;
  endPage: number;
  pageCount: number;
};

export type AssembledPacket = {
  bytes: Uint8Array;
  mimeType: "application/pdf";
  fileName: string;
  pageCount: number;
  sha256: string;
  byteSize: number;
  componentRanges: readonly AssembledComponentRange[];
};

export type AssemblyRequest = {
  /** Two-letter jurisdiction code. */
  jurisdiction: string;
  /** Human-readable jurisdiction name used in the filename. */
  jurisdictionName: string;
  /** Short packet name used in the filename, e.g. "Second-Chance-Shielding". */
  packetName: string;
  /** Case or matter reference used in the filename. Never an identifier about the person. */
  caseReference: string;
  /** Title written into the PDF metadata. */
  title: string;
  components: readonly AssemblyComponent[];
};

/**
 * Values that must never reach a filename.
 *
 * A social security number and a date of birth are the two the participant is
 * most likely to type into a case-number box by mistake, and the two that do the
 * most damage sitting in a filename. This refuses rather than strips, because
 * silently removing a digit from a case reference would produce a plausible file
 * name for the wrong case.
 */
const SOCIAL_SECURITY_NUMBER = /\b\d{3}-\d{2}-\d{4}\b/;
const NINE_CONSECUTIVE_DIGITS = /\b\d{9}\b/;
const DATE_LIKE = /\b(0?[1-9]|1[0-2])[/-](0?[1-9]|[12]\d|3[01])[/-](19|20)\d{2}\b/;
const ISO_DATE_LIKE = /\b(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/;

export function assertSafeFilenameInput(value: string, field: string): void {
  for (const [pattern, why] of [
    [SOCIAL_SECURITY_NUMBER, "social_security_number"],
    [NINE_CONSECUTIVE_DIGITS, "nine_consecutive_digits"],
    [DATE_LIKE, "date_of_birth"],
    [ISO_DATE_LIKE, "date_of_birth"]
  ] as const) {
    if (pattern.test(value)) {
      throw new PacketAssemblyError(
        "unsafe_filename_input",
        "A packet filename may not carry a value that looks like a date of birth or a social security number.",
        { field, why }
      );
    }
  }
}

/** Reduces a value to the characters a filename may safely carry. */
function slug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function assembledPacketFileName(input: {
  jurisdictionName: string;
  packetName: string;
  caseReference: string;
}): string {
  assertSafeFilenameInput(input.caseReference, "caseReference");
  const parts = [
    "LegalEase",
    slug(input.jurisdictionName),
    slug(input.packetName),
    slug(input.caseReference)
  ].filter(Boolean);
  return `${parts.join("_")}.pdf`;
}

export async function assemblePacketPdf(request: AssemblyRequest): Promise<AssembledPacket> {
  if (request.components.length === 0) {
    throw new PacketAssemblyError("no_components", "A packet cannot be assembled from no components.", {
      jurisdiction: request.jurisdiction
    });
  }

  const orders = new Set<number>();
  for (const component of request.components) {
    if (!Number.isFinite(component.order)) {
      throw new PacketAssemblyError("duplicate_component_order", "A component carries no packet order.", {
        componentId: component.componentId
      });
    }
    if (orders.has(component.order)) {
      // Two components claiming one position means the packet order is decided
      // by whichever happened to be listed first. A filing packet's order is
      // not an implementation detail.
      throw new PacketAssemblyError(
        "duplicate_component_order",
        "Two components claim the same position in the packet.",
        { componentId: component.componentId, order: component.order }
      );
    }
    orders.add(component.order);
  }

  const ordered = [...request.components].sort((left, right) => left.order - right.order);

  const assembled = await PDFDocument.create();
  assembled.setCreationDate(DETERMINISTIC_TIMESTAMP);
  assembled.setModificationDate(DETERMINISTIC_TIMESTAMP);
  assembled.setProducer("LegalEase");
  assembled.setCreator("LegalEase");
  assembled.setTitle(request.title);

  const componentRanges: AssembledComponentRange[] = [];
  for (const component of ordered) {
    let source: PDFDocument;
    try {
      source = await PDFDocument.load(component.bytes);
    } catch (error) {
      throw new PacketAssemblyError("component_unreadable", "A packet component could not be reopened as a PDF.", {
        componentId: component.componentId,
        reason: String((error as Error)?.message ?? "").slice(0, 120)
      });
    }

    const startPage = assembled.getPageCount() + 1;
    const copied = await assembled.copyPages(source, source.getPageIndices());
    for (const page of copied) assembled.addPage(page);
    const endPage = assembled.getPageCount();

    componentRanges.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      startPage,
      endPage,
      pageCount: endPage - startPage + 1
    });
  }

  const bytes = await assembled.save();

  // The assembled file is what the participant actually receives, so it is
  // reopened and confirmed here rather than trusted.
  let pageCount: number;
  try {
    pageCount = (await PDFDocument.load(bytes)).getPageCount();
  } catch (error) {
    throw new PacketAssemblyError("invalid_assembled_output", "The assembled packet could not be reopened as a PDF.", {
      reason: String((error as Error)?.message ?? "").slice(0, 120)
    });
  }

  return {
    bytes,
    mimeType: "application/pdf",
    fileName: assembledPacketFileName(request),
    pageCount,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    byteSize: bytes.byteLength,
    componentRanges
  };
}
