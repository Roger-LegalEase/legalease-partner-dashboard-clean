import { NextResponse } from "next/server";
import { z } from "zod";

import { denyUnlessContentCapability } from "@/lib/content/auth";
import { jsonError, readJsonBody, requireSupabase, storageFailure, UUID_PATTERN, type RouteContext } from "@/lib/content/route-support";
import { MEDIA_PERMISSION_STATES } from "@/lib/content/types";
import { recordAudit } from "@/lib/content/workflow";
import { getSafeRequestId, logSecurityInfo } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/internal/content/media/[id]";

const MEDIA_SELECT =
  "media_id, storage_path, public_url, mime_type, byte_size, width, height, alt_text, caption, credit, source_info, permission_status, archived, uploaded_by, created_at, updated_at";

const patchSchema = z.strictObject({
  altText: z.string().trim().max(500).nullish(),
  caption: z.string().trim().max(1000).nullish(),
  credit: z.string().trim().max(300).nullish(),
  sourceInfo: z.string().trim().max(1000).nullish(),
  permissionStatus: z.enum(MEDIA_PERMISSION_STATES).optional(),
  archived: z.boolean().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  const gate = await denyUnlessContentCapability("media.manage", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return jsonError(400, "Invalid media id.");

  const parsed = await readJsonBody(request, patchSchema, context);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  const patch: Record<string, unknown> = {};
  if (input.altText !== undefined) patch.alt_text = input.altText ?? null;
  if (input.caption !== undefined) patch.caption = input.caption ?? null;
  if (input.credit !== undefined) patch.credit = input.credit ?? null;
  if (input.sourceInfo !== undefined) patch.source_info = input.sourceInfo ?? null;
  if (input.permissionStatus !== undefined) patch.permission_status = input.permissionStatus;
  if (input.archived !== undefined) patch.archived = input.archived;

  if (!Object.keys(patch).length) {
    return jsonError(400, "No media fields were supplied.");
  }

  const { client, response } = requireSupabase(context);
  if (!client) return response;

  const { data, error } = await client
    .from("content_media")
    .update(patch)
    .eq("media_id", id)
    .select(MEDIA_SELECT)
    .limit(1);

  if (error) return storageFailure(context, "content media update failed", error);
  if (!data || !data.length) return jsonError(404, "Media not found.");

  if (input.archived === true) {
    await recordAudit({
      actorId: gate.session.userId,
      actorRole: gate.session.role,
      action: "media_archived",
      entityType: "content_media",
      entityId: id,
      detail: {}
    });
  }

  logSecurityInfo({ event: "content media updated", route: ROUTE, outcome: "ok", requestId, metadata: { row_id: id } });

  return NextResponse.json({ success: true, media: data[0] });
}
