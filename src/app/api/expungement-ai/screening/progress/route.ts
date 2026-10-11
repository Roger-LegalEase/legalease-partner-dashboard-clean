import { NextRequest, NextResponse } from "next/server";
import { isDeepStrictEqual } from "node:util";
import { createHash } from "node:crypto";
import { RCAP_DRAFT_COOKIE, authorizedRcapDraft, sealRcapDraft, rcapDraftCookieOptions } from "@/lib/expungement-ai/rcap-screening-draft";
import { assertSameOrigin, readBoundedJson, ONBOARDING_PRIVATE_RESPONSE_HEADERS } from "@/lib/partners/onboarding/request-security";
import { deserializeScreeningAnswers, serializeScreeningAnswers } from "@/lib/expungement-ai/screening-session-persistence";
import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";
import { toScreeningAnswers } from "@/components/expungement-ai/screening/answers";

import type { ScreeningAnswerValue } from "@/lib/rcap-engine/contracts";
import { getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import { projectPublicProfile } from "@/lib/rcap-engine/public-profile-projection";
import { selectScreeningQuestionIds } from "@/lib/rcap-engine/screening-question-selection";

export const dynamic = "force-dynamic";
const privateHeaders = ONBOARDING_PRIVATE_RESPONSE_HEADERS;
// Resume-email metadata and completion telemetry do not conflict with the
// participant's answers. Bind the editable draft itself, not unrelated columns.
const draftVersion = (row: {answers: unknown; current_question_id: unknown}) =>
  createHash("sha256").update(JSON.stringify([row.answers, row.current_question_id])).digest("hex");


export async function GET(request: NextRequest) {
  try {
    const draft = await authorizedRcapDraft(request.cookies.get(RCAP_DRAFT_COOKIE)?.value, request.nextUrl.searchParams.get("session") ?? "");
    if (!draft) return NextResponse.json({available: false}, {status: 403, headers: privateHeaders});
    return NextResponse.json({available: true, answers: deserializeScreeningAnswers(draft.row.answers ?? {}),
      currentQuestionId: draft.row.current_question_id, version: draftVersion(draft.row)}, {headers: privateHeaders});
  } catch { return NextResponse.json({error: "Temporary screening progress could not be loaded. Please retry."}, {status: 503, headers: privateHeaders}); }
}

export async function PUT(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await readBoundedJson(request, 40_000);
    const draft = await authorizedRcapDraft(request.cookies.get(RCAP_DRAFT_COOKIE)?.value, typeof body.sessionId === "string" ? body.sessionId : "");
    if (!draft) return NextResponse.json({error: "This temporary screening session expired or is no longer available. Your answers remain on this page."}, {status: 403, headers: privateHeaders});
    const profile = getProfileByJurisdiction(draft.row.jurisdiction);
    if (!profile || body.profileVersion !== profile.profileVersion || !body.answers || typeof body.answers !== "object" || Array.isArray(body.answers))
      return NextResponse.json({error: "The screening questions changed. Reload before continuing."}, {status: 409, headers: privateHeaders});
    const answers = serializeScreeningAnswers(body.answers as Record<string, AnswerValue>);
    const ids = selectScreeningQuestionIds(profile, projectPublicProfile(profile), toScreeningAnswers(deserializeScreeningAnswers(answers)));
    if (typeof body.currentQuestionId !== "string" || !ids.includes(body.currentQuestionId) || Object.keys(answers).some(id => !ids.includes(id)))
      return NextResponse.json({error: "The saved answers do not match these screening questions."}, {status: 400, headers: privateHeaders});
    // An exact retry is a read, including a lost-response retry. A different
    // tab's update cannot silently overwrite the saved draft.
    let version = draftVersion(draft.row);
    if (!isDeepStrictEqual(answers, draft.row.answers) || body.currentQuestionId !== draft.row.current_question_id) {
      if (body.version !== version) return NextResponse.json({error: "This screening changed in another tab. Your answers remain here; reload to use the saved progress."}, {status: 409, headers: privateHeaders});
      const saved = await draft.db.from("screening_sessions").update({answers, current_question_id: body.currentQuestionId, updated_at: new Date().toISOString()})
        .eq("session_id", draft.row.session_id).eq("updated_at", draft.row.updated_at).select("answers,current_question_id").maybeSingle();
      if (saved.error) throw new Error("storage_unavailable");
      if (!saved.data) return NextResponse.json({error: "This screening changed in another tab. Your answers remain here; reload to use the saved progress."}, {status: 409, headers: privateHeaders});
      version = draftVersion(saved.data);
    }
    const response = NextResponse.json({version}, {headers: privateHeaders});
    response.cookies.set(RCAP_DRAFT_COOKIE, sealRcapDraft(draft.row.session_id), rcapDraftCookieOptions);
    return response;
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : 503;
    return NextResponse.json({error: "Your answers could not be saved. They remain on this page; please retry Continue."}, {status, headers: privateHeaders});
  }
}

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
