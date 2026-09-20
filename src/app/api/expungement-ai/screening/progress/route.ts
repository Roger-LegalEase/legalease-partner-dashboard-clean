import { NextResponse } from "next/server";

import type { ScreeningAnswerValue } from "@/lib/rcap-engine/contracts";
import { getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import { projectPublicProfile } from "@/lib/rcap-engine/public-profile-projection";
import { selectScreeningQuestionIds } from "@/lib/rcap-engine/screening-question-selection";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    jurisdiction?: unknown;
    profileVersion?: unknown;
    answers?: unknown;
  } | null;
  if (!body || typeof body.jurisdiction !== "string" || typeof body.profileVersion !== "string"
    || !body.answers || typeof body.answers !== "object" || Array.isArray(body.answers)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const profile = getProfileByJurisdiction(body.jurisdiction);
  if (!profile) return NextResponse.json({ error: "unsupported_jurisdiction" }, { status: 404 });
  if (profile.profileVersion !== body.profileVersion) {
    return NextResponse.json({ error: "profile_version_mismatch", currentProfileVersion: profile.profileVersion }, { status: 409 });
  }
  try {
    return NextResponse.json({
      jurisdiction: profile.jurisdiction.code,
      profileVersion: profile.profileVersion,
      questionIds: selectScreeningQuestionIds(
        profile,
        projectPublicProfile(profile),
        body.answers as Record<string, ScreeningAnswerValue>
      )
    });
  } catch {
    return NextResponse.json({ error: "question_lifecycle_metadata_invalid" }, { status: 409 });
  }
}
