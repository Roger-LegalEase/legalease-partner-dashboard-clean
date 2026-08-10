import "server-only";

// Private immutable artifact storage.
//
// The bucket is not public, has no browser-role policy, and is reached only
// through the server's service-role client. Objects are written once at a
// server-derived path that binds the owner IDs, the job id and the output
// hash; a validated object is never overwritten, and the raw path is never
// sent to a browser. A storage_path column value is not evidence — callers
// re-read the object and hash-verify it before trusting it.

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { PACKET_ARTIFACT_BUCKET } from "@/lib/rcap/render/job-contract";

export type PacketArtifactStorage = {
  /** Write once. Overwriting an existing object is an error, never an upsert. */
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
