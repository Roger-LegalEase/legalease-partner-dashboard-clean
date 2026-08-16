import { NextResponse } from "next/server";
import type { ScreeningEvaluationRequest } from "@/lib/rcap-engine/contracts";
import { forbiddenRouteIdentityFields } from "@/lib/rcap-engine/composed-route-selector";
import { evaluateAuthoritativeScreeningResult } from "@/lib/expungement-ai/authoritative-screening-result";
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

  // Route and treatment identity are server-owned. A body that asserts them is
  // rejected rather than sanitised, so a client cannot discover which fields
  // move payment by watching which ones are silently dropped.
  const asserted = forbiddenRouteIdentityFields(body);
  if (asserted.length > 0) {
    return NextResponse.json({ error: "route_identity_is_server_owned", fields: asserted }, { status: 400 });
  }

  // Only the four client-supplied fields survive into the engine.
  const clientInput: ScreeningEvaluationRequest = {
    jurisdiction: body.jurisdiction,
    profileVersion: body.profileVersion,
    matterId: body.matterId,
    answers: body.answers
  };

  try {
    return NextResponse.json(evaluateAuthoritativeScreeningResult(clientInput).evaluation);
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
