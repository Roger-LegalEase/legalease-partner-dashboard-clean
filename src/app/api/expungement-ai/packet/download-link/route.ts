import { NextRequest, NextResponse } from "next/server";

import { requireConsumerBriefcaseApiSession } from "@/lib/expungement-ai/privacy/api-session";
import { issueConsumerArtifactDownloadGrant } from "@/lib/expungement-ai/private-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await requireConsumerBriefcaseApiSession();
  if (!session.ok) return session.response;
  const body = await request.json().catch(() => null) as { briefcaseItemId?: unknown } | null;
  const briefcaseItemId = typeof body?.briefcaseItemId === "string" ? body.briefcaseItemId.trim() : "";
  const grant = await createGrant(session.userId, briefcaseItemId);
  if (!grant) return unavailable();
  return NextResponse.json({
    ok: true,
    expiresAt: grant.expiresAt,
    downloadUrl: `/api/expungement-ai/packet/artifacts/${encodeURIComponent(briefcaseItemId)}?grant=${encodeURIComponent(grant.token)}`
  }, { headers: privateHeaders() });
}

/** Browser-facing Briefcase links use GET, then receive only an opaque,
 * short-lived same-origin redirect. POST remains available for fetch clients. */
export async function GET(request: NextRequest) {
  const session = await requireConsumerBriefcaseApiSession();
  if (!session.ok) return session.response;
  const briefcaseItemId = request.nextUrl.searchParams.get("briefcaseItemId")?.trim() ?? "";
  const grant = await createGrant(session.userId, briefcaseItemId);
  if (!grant) return unavailable();
  const location = new URL(
    `/api/expungement-ai/packet/artifacts/${encodeURIComponent(briefcaseItemId)}?grant=${encodeURIComponent(grant.token)}`,
    request.nextUrl.origin
  );
  return new NextResponse(null, { status: 303, headers: { ...privateHeaders(), location: location.toString() } });
}

async function createGrant(userId: string, briefcaseItemId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(briefcaseItemId)) return null;
  return issueConsumerArtifactDownloadGrant({ userId, briefcaseItemId });
}

function unavailable() {
  return NextResponse.json({ ok: false, error: "artifact_unavailable" }, { status: 404, headers: privateHeaders() });
}

function privateHeaders() {
  return { "cache-control": "private, no-store, max-age=0", pragma: "no-cache" };
}
