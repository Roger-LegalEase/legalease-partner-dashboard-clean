import { NextResponse } from "next/server";
import { updatePilotRequestStatusForInternalAdmin } from "@/lib/partners/pilot-requests";
import { isPilotRequestStatus } from "@/lib/partners/pilot-request-status";
import { SessionPartnerError } from "@/lib/partners/session-partner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }

    const payload = body as Record<string, unknown>;
    const id = typeof payload.id === "string" ? payload.id.trim() : "";
    const status = payload.status;

    if (!id || !isPilotRequestStatus(status)) {
      return NextResponse.json({ ok: false, error: "Invalid pilot request status update." }, { status: 400 });
    }

    await updatePilotRequestStatusForInternalAdmin(id, status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SessionPartnerError) {
      if (error.code === "unauthenticated") {
        return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
      }

      return NextResponse.json({ ok: false, error: "Internal admin access required." }, { status: 403 });
    }

    return NextResponse.json({ ok: false, error: "Unable to update pilot request." }, { status: 500 });
  }
}
