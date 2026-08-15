import { NextRequest, NextResponse } from "next/server";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import {
  ConsumerPacketNotAllowedError,
  ConsumerPacketNotFoundError,
  ConsumerPacketPaymentRequiredError,
  getConsumerPacketStatus
} from "@/lib/expungement-ai/packet-generation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireConsumerBriefcaseSession();
  const briefcaseItemId = request.nextUrl.searchParams.get("briefcaseItemId")?.trim();

  if (!briefcaseItemId) {
    return NextResponse.json({ error: "briefcaseItemId is required." }, { status: 400 });
  }

  try {
    const status = await getConsumerPacketStatus({ userId: auth.userId, briefcaseItemId });
    return NextResponse.json({
      packetStatus: status.packetStatus,
      canDownload: status.canDownload,
      artifact: status.artifactRefs && "downloadPath" in status.artifactRefs ? {
        fileName: status.artifactRefs.fileName,
        generatedAt: status.artifactRefs.generatedAt,
        downloadPath: status.artifactRefs.downloadPath,
        source: status.artifactRefs.source
      } : undefined,
      briefcaseItemId
    });
  } catch (error) {
    if (error instanceof ConsumerPacketNotFoundError) {
      return NextResponse.json({ error: "We couldn’t find this case. Return to your Briefcase and try again. Contact support if the problem continues." }, { status: 404 });
    }
    if (error instanceof ConsumerPacketPaymentRequiredError) {
      return NextResponse.json({ error: "Payment confirmation is required before packet status is available." }, { status: 402 });
    }
    if (error instanceof ConsumerPacketNotAllowedError) {
      return NextResponse.json({ error: "A packet isn’t available for these answers. Your information is still saved. Return to your Briefcase to review the next step." }, { status: 403 });
    }
    throw error;
  }
}
