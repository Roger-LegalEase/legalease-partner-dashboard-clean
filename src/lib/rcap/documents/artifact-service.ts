import "server-only";

import crypto from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  buildPacketObjectPath,
  downloadPacketArtifact,
  PACKET_ARTIFACT_BUCKET,
  PacketArtifactStorageError,
  uploadPacketArtifact,
  type PacketArtifactKind
} from "@/lib/rcap/documents/artifact-storage";
import {
  JurisdictionNotPacketReadyError,
  resolvePacketAsset
} from "@/lib/rcap/jurisdictions/resolve-packet-assets";

// Truthful packet fulfillment.
//
// The single rule this module exists to enforce: a packet is only ready when
// loadable PDF bytes are durably stored. Every earlier path set a "ready" status
// from a status flip and never checked that a document could be produced, which
// is why a Download action could appear for a document that did not exist.
//
// The renderer is injected rather than imported. That keeps this lifecycle
// independent of how a PDF is produced, and means the lifecycle can be proven
// with a synthetic infrastructure fixture while the real renderer is still being
// built against an official source document.

export type PacketRenderResult = {
  bytes: Uint8Array;
  rendererVersion: string;
  /** Which official source document produced this rendition. */
  sourceTemplateId: string;
  mappingId?: string | null;
};

export type PacketRenderer = (input: {
  packetId: string;
  kind: PacketArtifactKind;
  jurisdiction: string;
  county: string | null;
  sourceTemplatePath: string;
  mappingPath: string;
}) => Promise<PacketRenderResult>;

export type StoredPacketArtifact = {
  packetId: string;
  kind: PacketArtifactKind;
  bucket: string;
  objectPath: string;
  byteSize: number;
  checksumSha256: string;
  rendererVersion: string;
  sourceTemplateId: string;
  mappingId: string | null;
  pageCount: number | null;
  jurisdiction: string;
  county: string | null;
  createdAt: string;
};

export type PacketFulfillmentFailureCode =
  | "jurisdiction_not_packet_ready"
  | "source_template_unavailable"
  | "mapping_not_approved"
  | "render_failed"
  | "invalid_pdf_output"
  | "storage_unavailable"
  | "storage_write_failed";

export class PacketFulfillmentError extends Error {
  constructor(
    readonly code: PacketFulfillmentFailureCode,
    message: string
  ) {
    super(message);
    this.name = "PacketFulfillmentError";
  }
}

const ARTIFACT_COLUMNS =
  "document_packet_id, kind, storage_bucket, object_path, byte_size, checksum_sha256, renderer_version, source_template_id, mapping_id, page_count, jurisdiction, county, created_at";

/**
 * Returns the stored artifact for a rendition, or null when none exists.
 *
 * This is the only question the download path should ask. It never renders and
 * never mutates, so a missing artifact reads as "not ready", not as an error.
 */
export async function getStoredPacketArtifact(input: {
  packetId: string;
  kind: PacketArtifactKind;
}): Promise<StoredPacketArtifact | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new PacketFulfillmentError(
      "storage_unavailable",
      "Packet document storage is not configured."
    );
  }

  const { data, error } = await supabase
    .from("rcap_document_artifacts")
    .select(ARTIFACT_COLUMNS)
    .eq("document_packet_id", input.packetId)
    .eq("kind", input.kind)
    .maybeSingle();

  if (error || !data) return null;
  return fromRow(data as Record<string, unknown>);
}

/** Reads the stored bytes for an artifact. Never renders. */
export async function readStoredPacketArtifactBytes(
  artifact: StoredPacketArtifact
): Promise<Uint8Array> {
  return downloadPacketArtifact(artifact.objectPath);
}

/**
 * Produces and durably stores a packet rendition, exactly once.
 *
 * Idempotent at the database level: the unique constraint on
 * (document_packet_id, kind) means a concurrent or retried call returns the
 * artifact that already exists rather than fulfilling a second time. Retries
 * therefore cannot duplicate artifacts, Briefcase items, payment effects or
 * sponsored usage counts.
 */
export async function fulfillPacketArtifact(input: {
  packetId: string;
  kind: PacketArtifactKind;
  jurisdiction: string;
  county?: string | null;
  remedyId?: string | null;
  renderer: PacketRenderer;
}): Promise<StoredPacketArtifact> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new PacketFulfillmentError(
      "storage_unavailable",
      "Packet document storage is not configured."
    );
  }

  // A rendition that already exists is returned untouched. This is checked
  // before any status change so a retry cannot move a ready packet backwards.
  const existing = await getStoredPacketArtifact({
    packetId: input.packetId,
    kind: input.kind
  });
  if (existing) return existing;

  // Resolve before touching status: an unsupported jurisdiction should never
  // put a packet into a generating state it cannot leave.
  let asset;
  try {
    asset = resolvePacketAsset({
      jurisdiction: input.jurisdiction,
      county: input.county ?? null,
      remedyId: input.remedyId ?? null
    });
  } catch (error) {
    if (error instanceof JurisdictionNotPacketReadyError) {
      const code: PacketFulfillmentFailureCode =
        error.reason === "mapping_not_approved"
          ? "mapping_not_approved"
          : "jurisdiction_not_packet_ready";
      await recordFailure(input.packetId, code);
      throw new PacketFulfillmentError(code, error.message);
    }
    throw error;
  }

  await setStatus(input.packetId, "document_generating");

  let rendered: PacketRenderResult;
  try {
    rendered = await input.renderer({
      packetId: input.packetId,
      kind: input.kind,
      jurisdiction: asset.jurisdiction,
      county: asset.county,
      sourceTemplatePath: asset.sourceTemplatePath,
      mappingPath: asset.mappingPath
    });
  } catch {
    // Deliberately does not carry the underlying message: renderer errors can
    // contain file paths and, for a mapping failure, participant values.
    await recordFailure(input.packetId, "render_failed");
    throw new PacketFulfillmentError(
      "render_failed",
      "The packet document could not be produced."
    );
  }

  // Parse what was produced before calling it a document. A renderer that
  // returns empty or malformed bytes must not be able to mark a packet ready.
  let pageCount: number;
  try {
    const parsed = await PDFDocument.load(rendered.bytes, { ignoreEncryption: false });
    pageCount = parsed.getPageCount();
    if (!Number.isInteger(pageCount) || pageCount < 1) throw new Error("no pages");
  } catch {
    await recordFailure(input.packetId, "invalid_pdf_output");
    throw new PacketFulfillmentError(
      "invalid_pdf_output",
      "The generated packet was not a readable PDF."
    );
  }

  const objectPath = buildPacketObjectPath({
    packetId: input.packetId,
    kind: input.kind
  });

  try {
    await uploadPacketArtifact({ objectPath, bytes: rendered.bytes });
  } catch (error) {
    const code: PacketFulfillmentFailureCode =
      error instanceof PacketArtifactStorageError && error.code === "storage_unavailable"
        ? "storage_unavailable"
        : "storage_write_failed";
    await recordFailure(input.packetId, code);
    throw new PacketFulfillmentError(code, "The packet document could not be stored.");
  }

  const checksum = crypto.createHash("sha256").update(rendered.bytes).digest("hex");

  const { data, error } = await supabase
    .from("rcap_document_artifacts")
    .insert({
      document_packet_id: input.packetId,
      kind: input.kind,
      storage_bucket: PACKET_ARTIFACT_BUCKET,
      object_path: objectPath,
      byte_size: rendered.bytes.byteLength,
      checksum_sha256: checksum,
      renderer_version: rendered.rendererVersion,
      source_template_id: rendered.sourceTemplateId,
      mapping_id: rendered.mappingId ?? asset.mappingPath,
      page_count: pageCount,
      jurisdiction: asset.jurisdiction,
      county: asset.county
    })
    .select(ARTIFACT_COLUMNS)
    .maybeSingle();

  if (error || !data) {
    // A unique-constraint conflict means another attempt won the race and has
    // already fulfilled this rendition. That is success, not failure.
    const raced = await getStoredPacketArtifact({
      packetId: input.packetId,
      kind: input.kind
    });
    if (raced) return raced;

    await recordFailure(input.packetId, "storage_write_failed");
    throw new PacketFulfillmentError(
      "storage_write_failed",
      "The packet document could not be recorded."
    );
  }

  // Only now, with stored and parsed bytes recorded, does the packet become
  // ready. Nothing before this point may present a download action.
  await markReady(input.packetId);

  return fromRow(data as Record<string, unknown>);
}

async function setStatus(packetId: string, status: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  await supabase
    .from("rcap_document_packets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", packetId);
}

async function markReady(packetId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  const now = new Date().toISOString();
  await supabase
    .from("rcap_document_packets")
    .update({
      status: "document_ready",
      document_ready_at: now,
      document_failure_code: null,
      updated_at: now
    })
    .eq("id", packetId);
}

async function recordFailure(
  packetId: string,
  code: PacketFulfillmentFailureCode
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  await supabase
    .from("rcap_document_packets")
    .update({
      status: "document_failed",
      document_failure_code: code,
      updated_at: new Date().toISOString()
    })
    .eq("id", packetId);
}

function fromRow(row: Record<string, unknown>): StoredPacketArtifact {
  return {
    packetId: String(row.document_packet_id),
    kind: row.kind as PacketArtifactKind,
    bucket: String(row.storage_bucket),
    objectPath: String(row.object_path),
    byteSize: Number(row.byte_size),
    checksumSha256: String(row.checksum_sha256),
    rendererVersion: String(row.renderer_version),
    sourceTemplateId: String(row.source_template_id),
    mappingId: row.mapping_id == null ? null : String(row.mapping_id),
    pageCount: row.page_count == null ? null : Number(row.page_count),
    jurisdiction: String(row.jurisdiction),
    county: row.county == null ? null : String(row.county),
    createdAt: String(row.created_at)
  };
}
