import { NextRequest, NextResponse } from "next/server";

import { getBriefcaseItem } from "@/lib/expungement-ai/briefcase";
import { requireConsumerBriefcaseApiSession } from "@/lib/expungement-ai/privacy/api-session";
import { authorizeConsumerArtifactDownload } from "@/lib/expungement-ai/private-delivery";
import { getPacketArtifactStorage } from "@/lib/rcap/render/artifact-storage";
import { getRenderJob, recordDeliveryEvent } from "@/lib/rcap/render/job-queue";
import { authorizePacketDownload, streamAuthorizedPacket, type DeliveryPorts } from "@/lib/rcap/render/packet-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> }
) {
  const session = await requireConsumerBriefcaseApiSession();
  if (!session.ok) return session.response;
  const { itemId } = await context.params;
  const token = request.nextUrl.searchParams.get("grant") ?? "";
  const authority = await authorizeConsumerArtifactDownload({
    userId: session.userId,
    briefcaseItemId: itemId,
    token
  });
  if (!authority?.renderJobId) return unavailable();

  const storage = getPacketArtifactStorage();
  if (!storage) return unavailable();
  const ports: DeliveryPorts = {
    getJob: (id) => getRenderJob(id),
    userOwnsBriefcaseItem: async (userId, briefcaseItemId) => Boolean(await getBriefcaseItem(userId, briefcaseItemId)),
    storage,
    recordEvent: (input) => recordDeliveryEvent(input)
  };
  const decision = await authorizePacketDownload(ports, {
    jobId: authority.renderJobId,
    userId: session.userId
  });
  if (!decision.ok
    || decision.job.consumerBriefcaseItemId !== itemId
    || decision.job.outputStoragePath !== authority.storagePath
    || decision.job.outputSha256 !== authority.expectedSha256) return unavailable();

  const response = await streamAuthorizedPacket(ports, decision, {
    userId: session.userId,
    requestContext: {
      surface: "consumer_briefcase_grant",
      grantId: authority.grantId,
      userAgentClass: /mobile|iphone|android/i.test(request.headers.get("user-agent") ?? "") ? "mobile" : "desktop"
    }
  });
  response.headers.set("cache-control", "private, no-store, max-age=0");
  response.headers.set("pragma", "no-cache");
  response.headers.set("content-disposition", `attachment; filename="${safeFileName(authority.fileName)}"`);
  response.headers.set("x-content-type-options", "nosniff");
  return response;
}

function unavailable() {
  // Ownership mismatch, expiry, revocation, guessed ids and missing objects are
  // intentionally indistinguishable.
  return NextResponse.json({ ok: false, error: "artifact_unavailable" }, { status: 404, headers: privateHeaders() });
}

function safeFileName(value: string) {
  return value.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 120) || "record-clearing-packet.pdf";
}

function privateHeaders() {
  return { "cache-control": "private, no-store, max-age=0", pragma: "no-cache" };
}
