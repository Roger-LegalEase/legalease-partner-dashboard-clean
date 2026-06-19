import { NextResponse } from "next/server";
import type { ScreeningEvaluationRequest } from "@/lib/rcap-engine/contracts";
import { evaluateExpungementAiMatter } from "@/lib/rcap-engine/expungement-ai-adapter";
import { InvalidAnswerError, ProfileVersionMismatchError, UnsupportedJurisdictionError } from "@/lib/rcap-engine/evaluator";

export async function POST(request: Request) {
  let body: ScreeningEvaluationRequest;
  try {
    body = await request.json() as ScreeningEvaluationRequest;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body.jurisdiction !== "string" || typeof body.profileVersion !== "string" || typeof body.matterId !== "string" || !body.answers || typeof body.answers !== "object") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    return NextResponse.json(evaluateExpungementAiMatter(body));
  } catch (error) {
    if (error instanceof UnsupportedJurisdictionError) {
      return NextResponse.json({ error: "unsupported_jurisdiction", jurisdiction: error.jurisdiction }, { status: 404 });
    }
    if (error instanceof ProfileVersionMismatchError) {
      return NextResponse.json({
        error: "profile_version_mismatch",
        currentProfileVersion: error.currentProfileVersion
      }, { status: 409 });
    }
    if (error instanceof InvalidAnswerError) {
      return NextResponse.json({
        error: "invalid_question_ids",
        invalidQuestionIds: error.invalidQuestionIds
      }, { status: 400 });
    }
    throw error;
  }
}
