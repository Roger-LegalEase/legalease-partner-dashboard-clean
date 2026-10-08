import "server-only";

import { NextResponse } from "next/server";
import { resolveSessionPartner, SessionPartnerError } from "@/lib/partners/session-partner";

/** Authenticate and scope exports before any privileged read or rendering. */
export async function unavailablePartnerReport(request: Request, kind: "weekly" | "final") {
  let session;
  try {
    session = await resolveSessionPartner();
  } catch (error) {
    if (error instanceof SessionPartnerError) {
      return NextResponse.json({ error: error.code === "unauthenticated" ? "Authentication required." : "Report access denied." },
        { status: error.code === "unauthenticated" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Report authorization unavailable." }, { status: 503 });
  }
  if (session.kind === "partner" && session.role !== "partner_admin") {
    return NextResponse.json({ error: "Report access denied." }, { status: 403 });
  }
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid report request." }, { status: 400 });
  }
  const target = body && typeof body === "object" && "partnerId" in body ? body.partnerId : undefined;
  if (typeof target !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(target)) {
    return NextResponse.json({ error: "A specific partner is required." }, { status: 400 });
  }
  if (session.kind === "partner" && target !== session.partnerSlug) {
    return NextResponse.json({ error: "Report access denied." }, { status: 403 });
  }
  // Internal admins may request one explicit tenant; aggregation is not enabled.
  // Neither legacy export has complete measured definitions and source receipts.
  // Keep the legitimate live loader intact, but never distribute estimated or
  // unconnected metrics as an actual program report.
  return NextResponse.json({
    error: `${kind === "weekly" ? "Weekly" : "Final impact"} export is not yet available.`,
    sourceStatus: "unavailable",
    asOf: new Date().toISOString()
  }, { status: 503, headers: { "cache-control": "no-store" } });
}
