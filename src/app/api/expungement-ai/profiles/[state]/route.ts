import { NextResponse } from "next/server";
import { getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import { projectPublicProfile } from "@/lib/rcap-engine/public-profile-projection";

export async function GET(_request: Request, { params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const profile = getProfileByJurisdiction(state);
  if (!profile) {
    return NextResponse.json({
      error: "unsupported_jurisdiction",
      message: "No Expungement.ai profile is registered for that jurisdiction.",
      jurisdiction: state
    }, { status: 404 });
  }

  return NextResponse.json(projectPublicProfile(profile), {
    headers: {
      "Cache-Control": "private, max-age=300"
    }
  });
}
