import { NextResponse } from "next/server";
import { getRcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";
import { resolveSessionPartner } from "@/lib/partners/session-partner";
import { getRcapDocumentPacket } from "@/lib/rcap/documents/source-repository";
import {
  getStoredPacketArtifact,
  readStoredPacketArtifactBytes,
  PacketFulfillmentError
} from "@/lib/rcap/documents/artifact-service";
import { isPacketArtifactKind } from "@/lib/rcap/documents/artifact-storage";

// Serves a previously stored packet document.
//
// Two things changed here and both matter.
//
// Authorization: this route previously had none. Any packet identifier returned
// a document built from that participant's identity and criminal-record
// details. It now requires either the owning participant's session or a
// partner-scoped session for the sponsoring partner.
//
// Stored bytes: this route previously rendered a PDF on every request, so a
// packet could offer a download for a document that had never been produced. It
// now reads only what was durably stored. When no artifact exists the honest
// answer is "not ready", not a freshly improvised document.
//
// No response carries an internal path, bucket name, signed URL, participant
// value or stack trace.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ packetId: string; pdfType: string }> }
) {
  const { packetId, pdfType } = await params;

  if (!isPacketArtifactKind(pdfType)) {
    return problem(400, "unsupported_packet_type", "Unsupported PDF packet type.");
  }

  const packet = await getRcapDocumentPacket(packetId);
  if (!packet) {
    return problem(404, "packet_not_found", "Document packet not found.");
  }

  if (!(await isAuthorized(packet.userId ?? null, packet.partnerSlug))) {
    // Deliberately identical to packet_not_found so an unauthorized caller
    // cannot use the status to discover which packet identifiers exist.
    return problem(404, "packet_not_found", "Document packet not found.");
  }

  let artifact;
  try {
    artifact = await getStoredPacketArtifact({ packetId, kind: pdfType });
  } catch (error) {
    const unavailable =
      error instanceof PacketFulfillmentError && error.code === "storage_unavailable";
    return problem(
      503,
      "storage_unavailable",
      unavailable
        ? "Document storage is temporarily unavailable. Please try again shortly."
        : "The document could not be retrieved right now."
    );
  }

  if (!artifact) {
    if (packet.status === "document_failed") {
      return problem(
        409,
        "document_generation_failed",
        "This document could not be prepared. You can request it again."
      );
    }
    if (packet.status === "document_generating") {
      return problem(409, "document_not_ready", "This document is still being prepared.");
    }
    return problem(409, "document_not_ready", "This document has not been prepared yet.");
  }

  let bytes: Uint8Array;
  try {
    bytes = await readStoredPacketArtifactBytes(artifact);
  } catch {
    return problem(503, "storage_unavailable", "The stored document could not be read.");
  }

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-length": String(bytes.byteLength),
      "content-disposition": `attachment; filename="${safeFilename(artifact.jurisdiction, pdfType)}"`,
      "cache-control": "no-store"
    }
  });
}

/**
 * The owning participant, or a partner-scoped session for the sponsoring
 * partner. Internal administrators reach partner data through their own partner
 * session, so no separate branch is needed here.
 */
async function isAuthorized(
  packetUserId: string | null,
  packetPartnerSlug: string
): Promise<boolean> {
  try {
    const auth = await getRcapBriefcaseAuthState();
    if (auth.isAuthenticated && auth.userId && packetUserId && auth.userId === packetUserId) {
      return true;
    }
  } catch {
    // An unreadable consumer session is not authorization.
  }

  try {
    const partner = await resolveSessionPartner();
    if (partner.kind === "partner" && partner.partnerSlug === packetPartnerSlug) return true;
  } catch {
    // A missing or invalid partner session is not authorization, and its reason
    // is never surfaced to the caller.
  }

  return false;
}

function problem(status: number, code: string, message: string) {
  return NextResponse.json({ error: code, message }, { status });
}

function safeFilename(jurisdiction: string, kind: string): string {
  const base = `${jurisdiction}-${kind}-packet`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "packet"}.pdf`;
}
