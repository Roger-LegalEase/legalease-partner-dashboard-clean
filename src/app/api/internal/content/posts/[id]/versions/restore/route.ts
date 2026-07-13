import { NextResponse } from "next/server";
import { z } from "zod";

import { denyUnlessContentCapability } from "@/lib/content/auth";
import { restoreVersion } from "@/lib/content/repository";
import { jsonError, readJsonBody, requireSupabase, UUID_PATTERN, type RouteContext } from "@/lib/content/route-support";
import { recordAudit } from "@/lib/content/workflow";
import { getSafeRequestId, logSecurityInfo } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/internal/content/posts/[id]/versions/restore";

const restoreSchema = z.strictObject({
  version: z.number().int().positive()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  const gate = await denyUnlessContentCapability("content.restore_version", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return jsonError(400, "Invalid post id.");

  const parsed = await readJsonBody(request, restoreSchema, context);
  if (!parsed.ok) return parsed.response;

  // Fail fast (and honestly) when storage is absent, rather than through the repository's generic error.
  const { client, response } = requireSupabase(context);
  if (!client) return response;

  // Restoring writes a NEW version rather than rewinding the counter, so history stays append-only.
  const result = await restoreVersion({
    postId: id,
    version: parsed.data.version,
    actorId: gate.session.userId
  });

  if (!result.ok) {
    return jsonError(result.error === "That version does not exist." ? 404 : 500, result.error);
  }

  await recordAudit({
    actorId: gate.session.userId,
    actorRole: gate.session.role,
    action: "version_restored",
    entityType: "content_post",
    entityId: id,
    detail: { restored_from: parsed.data.version, new_version: result.version }
  });

  logSecurityInfo({ event: "content version restored", route: ROUTE, outcome: "ok", requestId, metadata: { row_id: id } });

  return NextResponse.json({ success: true, restoredFrom: parsed.data.version, version: result.version });
}
