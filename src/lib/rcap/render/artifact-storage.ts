import "server-only";

// Private, content-addressed, tamper-evident artifact storage.
//
// The guarantee, stated exactly: the bucket is not public, has no browser-role
// policy, and is reached only through the server's storage client. Objects are
// written at a server-derived path binding the owner IDs, the job id and the
// output hash; the adapter refuses to overwrite (upsert: false); and every
// delivery re-reads the object and verifies its hash before serving a byte, so
// altered bytes fail closed. This is TAMPER EVIDENCE, not immutability: the
// service-role credential bypasses Storage RLS and could rewrite an object,
// which is why no read is ever trusted without re-verification, and why the
// worker deployment specification calls for a least-privilege storage
// credential (insert plus verification reads only) before staging. A
// storage_path column value is never evidence.

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { PACKET_ARTIFACT_BUCKET } from "@/lib/rcap/render/job-contract";

export type PacketArtifactStorage = {
  /** Write once at the adapter level. Overwriting is an error, never an upsert. */
  upload(path: string, bytes: Buffer): Promise<{ ok: true } | { ok: false; reason: string }>;
  /** Read the exact stored bytes back, or null when the object is missing. */
  read(path: string): Promise<Buffer | null>;
};

/** The production storage backend. Null when Supabase is unconfigured. */
export function getPacketArtifactStorage(): PacketArtifactStorage | null {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  return {
    async upload(path, bytes) {
      const result = await supabase.storage.from(PACKET_ARTIFACT_BUCKET).upload(path, bytes, {
        contentType: "application/pdf",
        // Immutability: an existing object is a hard failure, not a replace.
        upsert: false
      });
      if (result.error) return { ok: false, reason: result.error.message };
      return { ok: true };
    },
    async read(path) {
      const result = await supabase.storage.from(PACKET_ARTIFACT_BUCKET).download(path);
      if (result.error || !result.data) return null;
      return Buffer.from(await result.data.arrayBuffer());
    }
  };
}
