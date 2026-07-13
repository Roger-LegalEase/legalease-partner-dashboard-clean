import { NextResponse } from "next/server";

import { denyUnlessContentCapability } from "@/lib/content/auth";
import { jsonError, requireSupabase, storageFailure, UUID_PATTERN, type RouteContext } from "@/lib/content/route-support";
import { getSafeRequestId } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/internal/content/posts/[id]/versions";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  const gate = await denyUnlessContentCapability("content.read", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return jsonError(400, "Invalid post id.");

  const { client, response } = requireSupabase(context);
  if (!client) return response;

  // The doc itself is not returned in the list — it is large, and the CMS only needs the timeline.
  const { data, error } = await client
    .from("content_post_versions")
    .select("version_id, post_id, version, title, subtitle, status, note, created_by, created_at")
    .eq("post_id", id)
    .order("version", { ascending: false })
    .limit(100);

  if (error) return storageFailure(context, "content versions list failed", error);

  return NextResponse.json({ success: true, versions: data ?? [] });
}
