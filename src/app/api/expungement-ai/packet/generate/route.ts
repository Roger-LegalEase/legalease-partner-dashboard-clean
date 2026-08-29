import { NextRequest, NextResponse } from "next/server";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem } from "@/lib/expungement-ai/briefcase";
import {
  finalizeSponsoredPacketGeneration,
  resolvePartnerPacketCapDecision
} from "@/lib/expungement-ai/rcap-slot-lifecycle";
import {
  ConsumerPacketGenerationError,
  ConsumerPacketNotAllowedError,
  ConsumerPacketNotFoundError,
  ConsumerPacketPaymentRequiredError,
  ConsumerPacketSponsorshipAuthorityUnavailableError,
  generatePaidConsumerPacket
} from "@/lib/expungement-ai/packet-generation";
import { CurrentPacketVerificationRequiredError, requireCurrentPacketVerification } from "@/lib/expungement-ai/packet-information";
import { consumerMatterIdForItem } from "@/lib/expungement-ai/consumer-identity";
import {
  CommercialAdmissionDeniedError,
  artifactStorageContext,
  commercialAdmissionRefusalBody,
  commercialRouteIdentity,
  entitlementContext,
  finalVerificationSnapshotFrom,
  fulfillmentRequestContext
} from "@/lib/rcap/render/commercial-admission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireConsumerBriefcaseSession();
  const body = await request.json().catch(() => null) as { briefcaseItemId?: string; dryRunMode?: boolean } | null;
  const briefcaseItemId = body?.briefcaseItemId?.trim();

  if (!briefcaseItemId) {
    return NextResponse.json({ error: "briefcaseItemId is required." }, { status: 400 });
  }

  let isPartnerSponsored = false;
  try {
    const packet = await generatePaidConsumerPacket({
      userId: auth.userId,
      briefcaseItemId,
      dryRunMode: body?.dryRunMode === true
    });

    // A fresh sponsored artifact is only prepared in memory. The atomic RPC
    // consumes credit and attaches Ready together; a refusal returns no Ready
    // response and leaves no accessible artifact.
    if (packet.packetStatus === "generating" && packet.protectedSponsorship && packet.artifactRefs) {
      isPartnerSponsored = true;
      const item = await getBriefcaseItem(auth.userId, briefcaseItemId);
      if (!item) throw new CurrentPacketVerificationRequiredError("verification_item_missing_before_sponsored_finalization");
      const sponsoredVerification = await requireCurrentPacketVerification(auth.userId, item);
      const verificationHash = sponsoredVerification.hash;
      if (verificationHash !== packet.protectedSponsorship.expectedVerificationHash) {
        throw new CurrentPacketVerificationRequiredError("verification_changed_before_sponsored_finalization");
      }

      /**
       * The sponsored admission, assembled from server facts only.
       *
       * The same shape a consumer admission uses. The sponsoring session id is
       * the idempotency key, which is what makes a retried finalization resolve
       * to the one credit it already consumed rather than a second one.
       */
      const sponsoredMatterId = consumerMatterIdForItem(item.id);
      const sponsoredIdentity = commercialRouteIdentity({
        jurisdiction: sponsoredVerification.snapshot.jurisdiction,
        pathwayId: sponsoredVerification.snapshot.pathwayId
      });
      const sponsoredContext = fulfillmentRequestContext({
        participantUserId: auth.userId,
        matterId: sponsoredMatterId,
        matterOwnerUserId: auth.userId,
        finalVerification: finalVerificationSnapshotFrom({
          snapshot: sponsoredVerification.snapshot,
          verificationHash,
          matterId: sponsoredMatterId,
          ownerUserId: auth.userId,
          packetFamilyId: sponsoredIdentity.packetFamilyId
        }),
        entitlement: entitlementContext({
          kind: "sponsored_credit",
          idempotencyKey: packet.protectedSponsorship.sourceSessionId,
          alreadyConsumed: false,
          serverVerified: true
        }),
        storage: artifactStorageContext({
          privateStorage: true,
          artifactSha256: "artifactSha256" in packet.artifactRefs && typeof packet.artifactRefs.artifactSha256 === "string"
            ? packet.artifactRefs.artifactSha256
            : null,
          repeatDownload: false
        })
      });
      const sponsoredAdmission = { identity: sponsoredIdentity, context: sponsoredContext };

      const decision = await resolvePartnerPacketCapDecision(
        packet.protectedSponsorship.sourceSessionId,
        sponsoredAdmission
      );
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
      const finalization = await finalizeSponsoredPacketGeneration({
        sessionId: packet.protectedSponsorship.sourceSessionId,
        briefcaseItemId,
        expectedVerificationHash: verificationHash,
        artifactRefs: packet.artifactRefs,
        admission: sponsoredAdmission
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
  // The Grade-A authority refused. One sentence and a denial code; the context
  // denials name matter and owner ids and stay on the server.
  if (error instanceof CommercialAdmissionDeniedError) {
    return NextResponse.json(commercialAdmissionRefusalBody(error), { status: error.httpStatus });
  }
  if (error instanceof CurrentPacketVerificationRequiredError) {
    return NextResponse.json({ error: "Current final verification is required before packet generation." }, { status: 409 });
  }
  if (error instanceof ConsumerPacketNotFoundError) {
    return NextResponse.json({ error: "We couldn’t find this case. Return to your Briefcase and try again. Contact support if the problem continues." }, { status: 404 });
  }
  if (error instanceof ConsumerPacketSponsorshipAuthorityUnavailableError) {
    return NextResponse.json({ error: "Packet sponsorship authority is temporarily unavailable." }, { status: 503 });
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
