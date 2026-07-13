import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { denyUnlessContentCapability } from "@/lib/content/auth";
import { hasBlockingIssue, sniffImageMimeType, validateMediaUpload } from "@/lib/content/media";
import { jsonError, requireSupabase, storageFailure, type RouteContext } from "@/lib/content/route-support";
import { MAX_MEDIA_BYTES, isAllowedMediaMimeType, isMediaPermission } from "@/lib/content/types";
import { recordAudit } from "@/lib/content/workflow";
import { getSafeRequestId, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/internal/content/media";
const BUCKET = "content-media";

const MEDIA_SELECT =
  "media_id, storage_path, public_url, mime_type, byte_size, width, height, alt_text, caption, credit, source_info, permission_status, archived, uploaded_by, created_at, updated_at";

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};

/** Browsers occasionally send image/jpg. Normalize before comparing against the sniffed type. */
function normalizeDeclaredType(raw: string): string {
  const value = raw.toLowerCase().split(";")[0]?.trim() ?? "";
  return value === "image/jpg" ? "image/jpeg" : value;
}

function formString(form: FormData, key: string): string | null {
  const value = form.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function formInt(form: FormData, key: string): number | null {
  const value = formString(form, key);
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(request: Request) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  const gate = await denyUnlessContentCapability("content.read", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  const { client, response } = requireSupabase(context);
  if (!client) return response;

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim();
  const includeArchived = url.searchParams.get("archived") === "true";

  let query = client.from("content_media").select(MEDIA_SELECT).order("created_at", { ascending: false }).limit(200);

  if (!includeArchived) {
    query = query.eq("archived", false);
  }

  if (search) {
    // Escape the PostgREST or() delimiters so a crafted search string cannot alter the filter tree.
    const safe = search.replace(/[,()\\]/g, " ").trim();
    if (safe) {
      query = query.or(`alt_text.ilike.%${safe}%,caption.ilike.%${safe}%,credit.ilike.%${safe}%`);
    }
  }

  const { data, error } = await query;
  if (error) return storageFailure(context, "content media list failed", error);

  return NextResponse.json({ success: true, media: data ?? [] });
}

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  const gate = await denyUnlessContentCapability("media.upload", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "Expected a multipart upload.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError(400, "A file field is required.");
  }

  // Refuse oversized files before buffering them into memory.
  if (file.size > MAX_MEDIA_BYTES) {
    return jsonError(422, "The file is larger than the 12 MB limit.", {
      issues: [{ severity: "block", code: "too_large", message: "The file is larger than the 12 MB limit." }]
    });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const byteSize = bytes.byteLength;

  // THE CHECK THAT MATTERS: the browser-supplied Content-Type is attacker-controlled, so the real
  // type is decided by the file's magic bytes. A declared image/png carrying an SVG or an HTML
  // payload is rejected here, before a single byte reaches storage.
  const sniffed = sniffImageMimeType(bytes);
  if (!sniffed || !isAllowedMediaMimeType(sniffed)) {
    logSecurityWarn({ event: "content media upload rejected", route: ROUTE, outcome: "unrecognized_bytes", requestId });
    return jsonError(422, "The file's contents are not a supported image (JPEG, PNG, WebP, or GIF).", {
      issues: [{ severity: "block", code: "unsupported_bytes", message: "The file's contents are not a supported image." }]
    });
  }

  const declared = normalizeDeclaredType(file.type ?? "");
  if (declared && declared !== sniffed) {
    logSecurityWarn({ event: "content media upload rejected", route: ROUTE, outcome: "mime_mismatch", requestId });
    return jsonError(422, `The file claims to be ${declared} but its contents are ${sniffed}.`, {
      issues: [
        {
          severity: "block",
          code: "mime_mismatch",
          message: `The file claims to be ${declared} but its contents are ${sniffed}.`
        }
      ]
    });
  }

  const width = formInt(form, "width");
  const height = formInt(form, "height");

  // Everything downstream uses the SNIFFED type, never the declared one.
  const issues = validateMediaUpload({ mimeType: sniffed, byteSize, width, height });
  if (hasBlockingIssue(issues)) {
    logSecurityWarn({ event: "content media upload rejected", route: ROUTE, outcome: "invalid_upload", requestId });
    return jsonError(422, "This file cannot be accepted.", { issues });
  }

  const permissionRaw = formString(form, "permissionStatus");
  if (permissionRaw && !isMediaPermission(permissionRaw)) {
    return jsonError(400, "Unknown permission status.");
  }

  const { client, response } = requireSupabase(context);
  if (!client) return response;

  const now = new Date();
  const storagePath = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${EXTENSION[sniffed]}`;

  const upload = await client.storage.from(BUCKET).upload(storagePath, bytes, {
    contentType: sniffed,
    cacheControl: "31536000",
    upsert: false
  });

  if (upload.error) {
    return storageFailure(context, "content media storage upload failed", upload.error);
  }

  const publicUrl = client.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl ?? null;

  const { data, error } = await client
    .from("content_media")
    .insert({
      storage_path: storagePath,
      public_url: publicUrl,
      mime_type: sniffed,
      byte_size: byteSize,
      width,
      height,
      alt_text: formString(form, "altText"),
      caption: formString(form, "caption"),
      credit: formString(form, "credit"),
      source_info: formString(form, "sourceInfo"),
      permission_status: permissionRaw ?? "unknown",
      uploaded_by: gate.session.userId
    })
    .select(MEDIA_SELECT)
    .limit(1);

  if (error) {
    // Do not leave an orphaned object behind if the row could not be written.
    await client.storage.from(BUCKET).remove([storagePath]);
    return storageFailure(context, "content media insert failed", error);
  }

  const media = (data?.[0] ?? null) as { media_id?: string } | null;

  await recordAudit({
    actorId: gate.session.userId,
    actorRole: gate.session.role,
    action: "media_uploaded",
    entityType: "content_media",
    entityId: media?.media_id ?? null,
    detail: { mime_type: sniffed, byte_size: byteSize }
  });

  logSecurityInfo({
    event: "content media uploaded",
    route: ROUTE,
    outcome: "ok",
    requestId,
    metadata: { row_id: media?.media_id ?? null }
  });

  return NextResponse.json({ success: true, media, issues }, { status: 201 });
}
