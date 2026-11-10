import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Temporary containment: the legacy store has no qualified participant/consent access boundary.
export async function POST() {
  return NextResponse.json(
    { error: "This legacy document endpoint is temporarily unavailable. Open your authenticated Briefcase for saved documents.", code: "legacy_document_access_unavailable" },
    { status: 503, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } }
  );
}
