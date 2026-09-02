import { NextRequest, NextResponse } from "next/server";

import { getRcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";
import { requestConsumerPacketRender } from "@/lib/expungement-ai/consumer-render-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creates the durable render job for a paid consumer packet.
 *
 * Deliberately a non-redirecting guard: `requireConsumerBriefcaseSession` is
 * right for a page, but an API caller needs a typed 401 rather than a 307 to a
 * sign-in HTML page it cannot use.
 *
 * The body carries `briefcaseItemId` and nothing else that matters. A user id
 * in the request is ignored — not merely distrusted — because the only user id
 * this route can act on comes from the verified session.
 */
export async function POST(request: NextRequest) {
  const auth = await getRcapBriefcaseAuthState();
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }
  if (auth.isVerified !== true) {
    return NextResponse.json({ ok: false, status: "verified_account_required" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { briefcaseItemId?: string } | null;
  const briefcaseItemId = body?.briefcaseItemId?.trim();
  if (!briefcaseItemId) {
    return NextResponse.json({ error: "briefcaseItemId is required." }, { status: 400 });
  }

  const outcome = await requestConsumerPacketRender({
    authUserId: auth.userId,
    briefcaseItemId
  });

  switch (outcome.status) {
    case "queued":
      return NextResponse.json(
        {
          status: "queued",
          jobId: outcome.jobId,
          briefcaseItemId: outcome.briefcaseItemId
        },
        { status: 202 }
      );
    case "route_disabled":
      return NextResponse.json(
        { error: "Packet rendering is not enabled in this environment.", status: outcome.status },
        { status: 503 }
      );
    // The route exists and the participant did nothing wrong; the server could
    // not derive a verifiable job specification for it. 503 rather than 403,
    // because this is ours to fix and the request is worth repeating once it is.
    case "route_contract_unverifiable":
      return NextResponse.json(
        { error: "This packet cannot be prepared right now. Your information is saved.", status: outcome.status, reason: outcome.reason },
        { status: 503 }
      );
    case "unauthenticated":
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    case "item_not_found":
      return NextResponse.json({ error: "We couldn’t find this case. Return to your Briefcase and try again. Contact support if the problem continues." }, { status: 404 });
    case "route_not_renderable":
      return NextResponse.json(
        { error: "This result does not produce a rendered packet.", reason: outcome.reason },
        { status: 403 }
      );
    case "payment_required":
      return NextResponse.json(
        { error: "A recorded payment is required before rendering.", reason: outcome.reason },
        { status: 402 }
      );
    // The Grade-A authority refused the route or the participant. No job was
    // enqueued and no provider saw participant data. The reason is not echoed:
    // it can name a matter or an owner.
    case "commercial_admission_denied":
      return NextResponse.json(
        { error: "This isn’t available yet. Your information is saved in your Briefcase.", status: outcome.status },
        { status: 403 }
      );
    case "identity_unresolved":
    case "enqueue_failed":
      return NextResponse.json(
        { error: "Unable to queue the packet render.", reason: outcome.reason },
        { status: 502 }
      );
  }
}
