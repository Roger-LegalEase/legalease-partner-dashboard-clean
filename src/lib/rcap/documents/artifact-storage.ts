import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";

// Private storage for generated packet PDFs. Mirrors the onboarding private
// bucket helper: object paths are server-canonical, never public URLs, and the
// download route streams bytes rather than handing out a signed URL, so a
// packet link cannot be forwarded to someone who is not entitled to it.

export const PACKET_ARTIFACT_BUCKET = "rcap-document-packets-private";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PacketArtifactKind = "court" | "full";

export function isPacketArtifactKind(value: unknown): value is PacketArtifactKind {
  return value === "court" || value === "full";
}

export class PacketArtifactStorageError extends Error {
  constructor(
    readonly code:
      | "storage_unavailable"
      | "invalid_identifier"
      | "storage_write_failed"
      | "artifact_unreadable",
    message: string
  ) {
    super(message);
    this.name = "PacketArtifactStorageError";
  }
}

export function buildPacketObjectPath(input: {
  packetId: string;
  kind: PacketArtifactKind;
}): string {
  assertUuid(input.packetId);
  if (!isPacketArtifactKind(input.kind)) {
    throw new PacketArtifactStorageError(
      "invalid_identifier",
      "A valid packet rendition is required."
    );
  }
  return `packets/${input.packetId}/${input.kind}.pdf`;
}

export async function uploadPacketArtifact(input: {
  objectPath: string;
  bytes: Uint8Array;
}): Promise<void> {
  assertSafeObjectPath(input.objectPath);
  const client = requireStorageClient();
  const { error } = await client.storage
    .from(PACKET_ARTIFACT_BUCKET)
    .upload(input.objectPath, input.bytes, {
      contentType: "application/pdf",
      cacheControl: "0",
      // Overwrite is deliberate: the unique constraint on
      // (document_packet_id, kind) is what prevents duplicate fulfillment, so a
      // retry that re-renders the same rendition should replace the object
      // rather than fail and strand the packet mid-generation.
      upsert: true
    });

  if (error) {
    throw new PacketArtifactStorageError(
      "storage_write_failed",
      "The packet document could not be stored."
    );
  }
}

export async function downloadPacketArtifact(
  objectPath: string
): Promise<Uint8Array> {
  assertSafeObjectPath(objectPath);
  const client = requireStorageClient();
  const { data, error } = await client.storage
    .from(PACKET_ARTIFACT_BUCKET)
    .download(objectPath);

  if (error || !data) {
    throw new PacketArtifactStorageError(
      "artifact_unreadable",
      "The stored packet document could not be read."
    );
  }
  return new Uint8Array(await data.arrayBuffer());
}

function requireStorageClient(): NonNullable<ReturnType<typeof getSupabaseAdminClient>> {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new PacketArtifactStorageError(
      "storage_unavailable",
      "Packet document storage is not configured."
    );
  }
  return client;
}

function assertUuid(value: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw new PacketArtifactStorageError(
      "invalid_identifier",
      "A valid packet identifier is required."
    );
  }
}

function assertSafeObjectPath(value: string): void {
  const parts = value.split("/");
  if (
    parts.length !== 3 ||
    parts[0] !== "packets" ||
    !UUID_PATTERN.test(parts[1] ?? "") ||
    !/^(?:court|full)\.pdf$/.test(parts[2] ?? "") ||
    value.includes("..")
  ) {
    throw new PacketArtifactStorageError(
      "invalid_identifier",
      "The packet object path is not valid."
    );
  }
}
