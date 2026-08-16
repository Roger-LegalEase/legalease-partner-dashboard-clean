import { NextRequest, NextResponse } from "next/server";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import {
  ConsumerPacketNotAllowedError,
  ConsumerPacketNotFoundError,
  ConsumerPacketNotReadyError,
  ConsumerPacketPaymentRequiredError,
  getConsumerPacketDownload
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
    const packet = await getConsumerPacketDownload({ userId: auth.userId, briefcaseItemId });
    return new NextResponse(packet.body, {
      headers: {
        "content-type": `${packet.contentType}; charset=utf-8`,
        "content-disposition": `attachment; filename="${packet.fileName.replaceAll('"', "")}"`
      }
    });
  } catch (error) {
    if (error instanceof ConsumerPacketNotFoundError) {
      return NextResponse.json({ error: "We couldn’t find this case. Return to your Briefcase and try again. Contact support if the problem continues." }, { status: 404 });
    }
    if (error instanceof ConsumerPacketPaymentRequiredError) {
      return NextResponse.json({ error: "Payment confirmation is required before packet download." }, { status: 402 });
    }
    if (error instanceof ConsumerPacketNotAllowedError) {
      return NextResponse.json({ error: "This packet isn’t available to download. Your information is still saved. Return to your Briefcase or contact support." }, { status: 403 });
    }
    if (error instanceof ConsumerPacketNotReadyError) {
      return NextResponse.json({ error: "Your packet is still being prepared. Your information is saved. Return to your Briefcase and try again in a few minutes." }, { status: 409 });
    }
    throw error;
  }
}
