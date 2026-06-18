import { NextRequest, NextResponse } from "next/server";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import {
  ConsumerPacketGenerationError,
  ConsumerPacketNotAllowedError,
  ConsumerPacketNotFoundError,
  ConsumerPacketPaymentRequiredError,
  generatePaidConsumerPacket
} from "@/lib/expungement-ai/packet-generation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireConsumerBriefcaseSession();
  const body = await request.json().catch(() => null) as { briefcaseItemId?: string; dryRunMode?: boolean } | null;
  const briefcaseItemId = body?.briefcaseItemId?.trim();

  if (!briefcaseItemId) {
    return NextResponse.json({ error: "briefcaseItemId is required." }, { status: 400 });
  }

  try {
    const packet = await generatePaidConsumerPacket({
      userId: auth.userId,
      briefcaseItemId,
      dryRunMode: body?.dryRunMode === true
    });

    return NextResponse.json({
      packetStatus: packet.packetStatus,
      canDownload: packet.canDownload,
      artifact: packet.artifactRefs ? safeArtifact(packet.artifactRefs) : undefined,
      briefcaseItemId
    });
  } catch (error) {
    return packetErrorResponse(error);
  }
}

function safeArtifact(artifact: { fileName: string; generatedAt: string; downloadPath: string; source: string }) {
  return {
    fileName: artifact.fileName,
    generatedAt: artifact.generatedAt,
    downloadPath: artifact.downloadPath,
    source: artifact.source
  };
}

function packetErrorResponse(error: unknown) {
  if (error instanceof ConsumerPacketNotFoundError) {
    return NextResponse.json({ error: "Briefcase item not found." }, { status: 404 });
  }
  if (error instanceof ConsumerPacketPaymentRequiredError) {
    return NextResponse.json({ error: "Payment confirmation is required before packet generation." }, { status: 402 });
  }
  if (error instanceof ConsumerPacketNotAllowedError) {
    return NextResponse.json({ error: "Packet generation is not available for this result.", resultCode: error.resultCode }, { status: 403 });
  }
  if (error instanceof ConsumerPacketGenerationError) {
    return NextResponse.json({ error: "Your payment was confirmed, but we need to regenerate your packet. Try again or contact support." }, { status: 502 });
  }
  throw error;
}
