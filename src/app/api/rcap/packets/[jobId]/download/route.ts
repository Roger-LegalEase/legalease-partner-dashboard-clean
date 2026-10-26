import { after, NextResponse } from "next/server";
import { requireConsumerBriefcaseApiSession } from "@/lib/expungement-ai/privacy/api-session";
import { getBriefcaseItem } from "@/lib/expungement-ai/briefcase";
import { requireCurrentPacketVerification } from "@/lib/expungement-ai/packet-information";
import { consumerMatterIdForItem } from "@/lib/expungement-ai/consumer-identity";
import { resolveConsumerDeliveryAccess } from "@/lib/rcap/render/consumer-delivery-control";
import { getPacketArtifactStorage } from "@/lib/rcap/render/artifact-storage";
import { getRenderJob, recordDeliveryEvent } from "@/lib/rcap/render/job-queue";
import { authorizePacketDownload, streamAuthorizedPacket, type DeliveryPorts } from "@/lib/rcap/render/packet-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The authenticated packet download. All authorization, integrity and
// streaming semantics live in packet-delivery.ts; this file binds them to the
// repository's session auth and production storage. The browser receives PDF
// bytes and nothing else — never a storage path, never a service credential.

export async function GET(
  request: Request,
  {
    params
  }: {
    params: Promise<{ jobId: string }>;
  }
) {
  try {
    const { jobId } = await params;

    const session = await requireConsumerBriefcaseApiSession();
    if (!session.ok) return session.response;
    const storage = getPacketArtifactStorage();
    if (!storage) {
      return NextResponse.json({ error: "Packet downloads are not available right now." }, { status: 503, headers: privateDownloadHeaders() });
    }

    const ports: DeliveryPorts = {
      getJob: async (id) => {
        const job = await getRenderJob(id);
        if (job?.routeId === "IL:felony-prostitution-relief"
          && !resolveConsumerDeliveryAccess({ subjectId: session.userId }).allowed) return null;
        if (job) {
          ports.getCurrentVerification = async (itemId) => {
            const item = await getBriefcaseItem(session.userId, itemId);
            if (!item) return null;
            try {
              const verification = await requireCurrentPacketVerification(session.userId, item);
              return {
                snapshot: verification.snapshot,
                hash: verification.hash,
                ownerUserId: session.userId,
                matterId: consumerMatterIdForItem(item.id),
                alreadyDownloaded: job.status === "delivered"
              };
            } catch {
              return null;
            }
          };
        }
        return job;
      },
      userOwnsBriefcaseItem: async (userId, briefcaseItemId) => Boolean(await getBriefcaseItem(userId, briefcaseItemId)),
      storage,
      recordEvent: (input) => recordDeliveryEvent(input)
    };

    const decision = await authorizePacketDownload(ports, {
      jobId,
      userId: session.userId
    });

    if (!decision.ok) {
      return NextResponse.json({ error: decision.message, code: decision.code }, { status: decision.status, headers: privateDownloadHeaders() });
    }

    return await streamAuthorizedPacket(ports, decision, {
      waitUntil: after,
      userId: session.userId,
      requestContext: {
        surface: "briefcase_download",
        userAgentClass: /mobile|iphone|android/i.test(request.headers.get("user-agent") ?? "") ? "mobile" : "desktop"
      }
    });
  } catch (error) {
    console.error("[packet-download] unclassified failure", error);
    return NextResponse.json({ error: "Packet downloads are not available right now." }, { status: 500, headers: privateDownloadHeaders() });
  }
}

function privateDownloadHeaders() {
  return { "cache-control": "private, no-store, max-age=0", pragma: "no-cache" };
}
