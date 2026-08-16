import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Retired client-result persistence boundary.
 *
 * The former request accepted browser-supplied result and payment fields. It
 * must never receive the service-role route-identity writer introduced for
 * Phase 55. Current DTC and RCAP flows persist stored screening inputs through
 * `/screening/pending/claim`, where the server re-evaluates them first.
 */
export async function POST() {
  return NextResponse.json(
    { ok: false, error: "screening_save_result_retired", retry: "repeat_server_verified_claim" },
    { status: 410 }
  );
}
