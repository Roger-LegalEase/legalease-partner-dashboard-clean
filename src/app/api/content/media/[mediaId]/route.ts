import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { logSecurityWarn, getSafeRequestId } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "content-media";

/**
 * Public media route — the ONLY way bytes leave the content-media bucket.
 *
 * The bucket is PRIVATE. An earlier revision made it public and let anon enumerate content_media,
 * which meant an asset attached to an unannounced draft was both discoverable and fetchable. "The
 * filename is hard to guess" is not an access control.
 *
 * So: the caller asks for a media id, and the database decides. content_media_is_public() is true
 * only when the asset is actually referenced by published content (a published post's body, its
 * featured/OG image, a published state-resource page, or an approved testimonial). If it says no,
 * this route 404s — it does not leak the difference between "does not exist" and "not published
 * yet". If it says yes, we mint a short-lived signed URL and redirect.
 *
 * Redirecting rather than proxying keeps the bytes on Supabase's CDN path; the signed URL expires,
 * so a link copied out of the page stops working rather than becoming a permanent public handle.
 */

const SIGNED_URL_TTL_SECONDS = 60 * 10;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const requestId = getSafeRequestId(request);
  const { mediaId } = await params;

  if (!UUID.test(mediaId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "storage_unconfigured", message: "Content media storage is not configured." },
      { status: 503 }
    );
  }

  // The publication check lives in the database, not here, so it cannot drift from the view that
  // decides what content_public_media exposes.
  const { data: isPublic, error: checkError } = await supabase.rpc("content_media_is_public", {
    p_media_id: mediaId
  });

  if (checkError) {
    logSecurityWarn({
      event: "content media publication check failed",
      route: "/api/content/media/[mediaId]",
      outcome: "error",
      requestId,
      error: checkError
    });
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  if (isPublic !== true) {
    // Deliberately indistinguishable from a missing asset: an embargoed image must not be
    // detectable by probing this endpoint.
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: rows, error: readError } = await supabase
    .from("content_media")
    .select("storage_path, mime_type")
    .eq("media_id", mediaId)
    .limit(1);

  if (readError || !rows?.length) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { storage_path: storagePath } = rows[0] as { storage_path: string; mime_type: string };

  const signed = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (signed.error || !signed.data?.signedUrl) {
    logSecurityWarn({
      event: "content media signing failed",
      route: "/api/content/media/[mediaId]",
      outcome: "error",
      requestId,
      error: signed.error ?? new Error("no signed url")
    });
    // A missing bucket surfaces here as a clear, actionable failure rather than a broken image.
    return NextResponse.json(
      {
        error: "media_unavailable",
        message:
          "Could not sign the media URL. Confirm the private 'content-media' storage bucket exists (created by supabase/phase-43-content-platform.sql)."
      },
      { status: 503 }
    );
  }

  return NextResponse.redirect(signed.data.signedUrl, {
    status: 307,
    headers: {
      // Cacheable, but for less than the signature's lifetime so a cached redirect never outlives
      // the URL it points at.
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60"
    }
  });
}
