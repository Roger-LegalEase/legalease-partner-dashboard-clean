import { NextRequest, NextResponse } from "next/server";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem, isPartnerSponsoredPacketItem } from "@/lib/expungement-ai/briefcase";
import {
  finalizeSponsoredPacketGeneration,
  resolvePartnerPacketCapDecision
} from "@/lib/expungement-ai/rcap-slot-lifecycle";
import {
  ConsumerPacketGenerationError,
  ConsumerPacketNotAllowedError,
  ConsumerPacketNotFoundError,
  ConsumerPacketPaymentRequiredError,
  generatePaidConsumerPacket
} from "@/lib/expungement-ai/packet-generation";
import { CurrentPacketVerificationRequiredError, requireCurrentPacketVerification } from "@/lib/expungement-ai/packet-information";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireConsumerBriefcaseSession();
  const body = await request.json().catch(() => null) as { briefcaseItemId?: string; dryRunMode?: boolean } | null;
  const briefcaseItemId = body?.briefcaseItemId?.trim();

  if (!briefcaseItemId) {
    return NextResponse.json({ error: "briefcaseItemId is required." }, { status: 400 });
  }

  // Partner cap accounting is isolated from the DTC path: it only runs for
  // items whose source screening session is partner-sponsored.
  const item = await getBriefcaseItem(auth.userId, briefcaseItemId);
  const partnerSessionId = item?.sourceSessionId ?? null;
  const isPartnerSponsored = Boolean(item) && (await isPartnerSponsoredPacketItem(item!));

  // Honor pause_at_cap: do not generate a sponsored packet once the partner is
  // at its cap and has chosen to pause. Route the user to the consumer path.
  if (isPartnerSponsored && partnerSessionId) {
    const decision = await resolvePartnerPacketCapDecision(partnerSessionId);
    if (decision.pausedAtCap) {
      return NextResponse.json(
        {
          error:
            "Sponsored packet capacity is currently unavailable for this organization. You can continue through the standard Expungement.ai experience.",
          sponsoredPaused: true,
          briefcaseItemId
        },
        { status: 409 }
      );
    }
  }

  try {
    const packet = await generatePaidConsumerPacket({
      userId: auth.userId,
      briefcaseItemId,
      dryRunMode: body?.dryRunMode === true
    });

    // A fresh sponsored artifact is only prepared in memory. The atomic RPC
    // consumes credit and attaches Ready together; a refusal returns no Ready
    // response and leaves no accessible artifact.
    if (packet.packetStatus === "generating" && isPartnerSponsored && partnerSessionId && packet.artifactRefs) {
      if (!item) throw new CurrentPacketVerificationRequiredError("verification_item_missing_before_sponsored_finalization");
      const verificationHash = (await requireCurrentPacketVerification(auth.userId, item)).hash;
      const finalization = await finalizeSponsoredPacketGeneration({
        sessionId: partnerSessionId,
        briefcaseItemId,
        expectedVerificationHash: verificationHash,
        artifactRefs: packet.artifactRefs
      });
      if (!finalization.ok) {
        return NextResponse.json(
          { error: "Partner packet coverage could not be finalized for this matter." },
          { status: 409 }
        );
      }
      return NextResponse.json({
        packetStatus: "ready",
        canDownload: true,
        artifact: safeArtifact(packet.artifactRefs),
        briefcaseItemId
      });
    }

    return NextResponse.json({
      packetStatus: packet.packetStatus,
      canDownload: packet.canDownload,
      artifact: packet.artifactRefs ? safeArtifact(packet.artifactRefs) : undefined,
      briefcaseItemId
    });
  } catch (error) {
    return packetErrorResponse(error, isPartnerSponsored);
  }
}

function safeArtifact(artifact: { fileName: string; generatedAt: string; source: string; downloadPath?: string }) {
  if (!artifact.downloadPath) return undefined;
  return {
    fileName: artifact.fileName,
    generatedAt: artifact.generatedAt,
    downloadPath: artifact.downloadPath,
    source: artifact.source
  };
}

function packetErrorResponse(error: unknown, isPartnerSponsored: boolean) {
  if (error instanceof CurrentPacketVerificationRequiredError) {
    return NextResponse.json({ error: "Current final verification is required before packet generation." }, { status: 409 });
  }
  if (error instanceof ConsumerPacketNotFoundError) {
    return NextResponse.json({ error: "We couldn’t find this case. Return to your Briefcase and try again. Contact support if the problem continues." }, { status: 404 });
  }
  if (error instanceof ConsumerPacketPaymentRequiredError) {
    if (isPartnerSponsored) {
      return NextResponse.json(
        { error: "Partner packet coverage could not be confirmed for this matter." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: "Payment confirmation is required before packet generation." }, { status: 402 });
  }
  if (error instanceof ConsumerPacketNotAllowedError) {
    return NextResponse.json({ error: "We can’t prepare a packet for these answers. Your information is still saved. Return to your Briefcase to review the next step." }, { status: 403 });
  }
  if (error instanceof ConsumerPacketGenerationError) {
    if (isPartnerSponsored) {
      return NextResponse.json(
        { error: "We could not prepare your partner-covered packet right now. Try again or contact support." },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: "We couldn’t finish preparing your packet. You haven’t been charged again, and your information is still saved. Try again or contact support." }, { status: 502 });
  }
  throw error;
}
