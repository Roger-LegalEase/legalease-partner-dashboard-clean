import type { NextRequest } from "next/server";
import { ClinicValidationError } from "@/lib/clinic-mode/validation";
import { legalAidErrorResponse, legalAidJson, participantActor, readJson, str, uuidOrThrow } from "@/lib/legal-aid/api";
import { INTAKE_STATEMENTS, type StatementKey } from "@/lib/legal-aid/intake-schema";
import { signIntakeStatement, submitIntake, withdrawIntake } from "@/lib/legal-aid/intake-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Participant-only actions on their own application: sign a statement,
// submit, withdraw. Signing binds the statement version and the current
// answer hash, so a later material edit supersedes it.
export async function POST(request: NextRequest, { params }: { params: Promise<{ intakeId: string }> }) {
  try {
    const actor = await participantActor(request);
    if (!actor.ok) return actor.response;
    const { intakeId: raw } = await params;
    const intakeId = uuidOrThrow(raw, "Application");
    const body = await readJson(request, 128 * 1024);
    const action = str(body, "action", 40);

    if (action === "sign") {
      const statementKey = str(body, "statementKey", 60);
      if (!INTAKE_STATEMENTS.some((statement) => statement.key === statementKey)) throw new ClinicValidationError("Choose a statement to sign.");
      const signatureMethod = str(body, "signatureMethod", 10);
      if (signatureMethod !== "typed" && signatureMethod !== "drawn") throw new ClinicValidationError("Choose how to sign.");
      const signatureData = typeof body.signatureData === "string" && body.signatureData.startsWith("data:image/png;base64,") ? body.signatureData : null;
      const signatureId = await signIntakeStatement({ intakeId, userId: actor.userId, statementKey: statementKey as StatementKey, signerName: str(body, "signerName", 160), signatureMethod, signatureData });
      return legalAidJson({ success: true, signatureId });
    }
    if (action === "submit") {
      const result = await submitIntake({ intakeId, userId: actor.userId });
      if (result.outcome === "submitted" || result.outcome === "already_submitted") return legalAidJson({ success: true, outcome: result.outcome });
      if (result.outcome === "not_found") return legalAidJson({ success: false, outcome: result.outcome, error: "Application was not found." }, 404);
      if (result.outcome === "forbidden") return legalAidJson({ success: false, outcome: result.outcome, error: "Only the applicant can submit." }, 403);
      return legalAidJson({ success: false, outcome: result.outcome, missing: result.missing ?? [], errors: result.errors ?? {}, statementKey: result.statementKey ?? null, error: submitMessage(result.outcome) }, 409);
    }
    if (action === "withdraw") {
      const outcome = await withdrawIntake({ intakeId, userId: actor.userId });
      if (outcome === "forbidden") return legalAidJson({ success: false, error: "Only the applicant can withdraw." }, 403);
      if (outcome === "not_found") return legalAidJson({ success: false, error: "Application was not found." }, 404);
      return legalAidJson({ success: true, outcome });
    }
    throw new ClinicValidationError("Unknown action.");
  } catch (error) {
    return legalAidErrorResponse(error);
  }
}

function submitMessage(outcome: string): string {
  if (outcome === "validation_failed") return "Some required answers are missing or need a correction.";
  if (outcome === "ssn_required") return "Enter your Social Security number in the protected step before submitting.";
  if (outcome === "signature_required") return "Sign each statement that applies to you before submitting.";
  if (outcome === "answers_required") return "Answer the questions before submitting.";
  if (outcome === "withdrawn") return "This application was withdrawn.";
  return "The application could not be submitted.";
}
