// Shared output contract. Every engine returns this shape, so the lifecycle
// treats a filled official form, a generated pleading and a guidance artifact
// identically once produced.

import type { PacketComponent, RendererStrategy } from "@/lib/rcap/packets/types";

export type TechnicalValidation = {
  /** Bytes parsed successfully as the declared MIME type. */
  parsed: boolean;
  pageCount: number | null;
  byteLength: number;
  /** Non-fatal problems: truncation, unmapped field, missing optional value. */
  issues: readonly string[];
};

export type RenderResult = {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
  pageCount: number | null;
  /** Official source path or approved template identity. */
  sourceIdentity: string;
  /** Hash of the official source, or null for generated documents. */
  sourceSha256: string | null;
  rendererStrategy: RendererStrategy;
  rendererVersion: string;
  warnings: readonly string[];
  validation: TechnicalValidation;
  metadata: Record<string, string | number | boolean | null>;
};

export type RenderInput = {
  component: PacketComponent;
  jurisdiction: string;
  geography: string | null;
  /** Participant facts. Never logged. */
  facts: Record<string, unknown>;
  /** Repository root, for resolving official source paths. */
  rootDir: string;
};

export type PacketRenderFailureCode =
  | "source_missing"
  | "source_hash_mismatch"
  | "source_unreadable"
  | "unsupported_source_format"
  | "mapping_missing"
  | "mapping_unconfirmed"
  | "unapproved_text_transformation"
  | "field_not_found"
  | "content_overflow"
  | "invalid_pdf_output"
  | "template_missing";

export class PacketRenderError extends Error {
  constructor(
    readonly code: PacketRenderFailureCode,
    message: string,
    readonly detail: Record<string, string | number | boolean | null> = {}
  ) {
    super(message);
    this.name = "PacketRenderError";
  }
}

export interface PacketRenderer {
  readonly strategy: RendererStrategy;
  readonly version: string;
  render(input: RenderInput): Promise<RenderResult>;
}
