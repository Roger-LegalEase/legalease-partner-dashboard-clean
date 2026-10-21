import type { NextRequest } from "next/server";
import { ClinicValidationError } from "@/lib/clinic-mode/validation";
import { legalAidErrorResponse, legalAidJson, nullableIso, nullableStr, readJson, staffActor, str, uuidOrThrow } from "@/lib/legal-aid/api";
import { exportCaseFile } from "@/lib/legal-aid/case-file-export";
import {
  createDocumentTask, listApplicantRenderJobs, recordDecision, replaceDocumentArtifact, requestInformation, revealSsn, saveNextStep,
  setAttorneyReview, setExternalCaseReference, startReview, transitionDocumentTask, withdrawInformationRequest
} from "@/lib/legal-aid/intake-service";
import { sendParticipantMessage } from "@/lib/legal-aid/notifications";
import type { DocumentTaskStatus, NextStep, ReviewDecision } from "@/lib/legal-aid/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Staff actions on one application. Authority is decided per action by the
// legal-aid predicates (the actor's approved event-staff permissions), not by
// this route. Each action's outcome is returned plainly.

const DECISION_TYPES: ReviewDecision["decisionType"][] = ["program_eligibility", "attorney_review", "conflict_engagement"];
const DECISION_OUTCOMES: Record<ReviewDecision["decisionType"], string[]> = {
  program_eligibility: ["needs_information", "approved", "declined_for_program", "referred"],
  attorney_review: ["needs_information", "reviewed"],
  conflict_engagement: ["accepted", "not_accepted"]
};
const TASK_STATUSES: DocumentTaskStatus[] = ["draft", "attorney_reviewed", "ready_for_execution", "signature_or_notary_pending", "executed_copy_received", "execution_reviewed", "ready_to_file", "filed"];
const SIGNERS = ["applicant", "attorney", "notary", "clerk", "applicant_and_notary"];
const METHODS = ["wet_signature", "notary_acknowledgment", "notary_jurat", "clerk_verification", "no_signature_required"];
const STEP_STATUSES: NextStep["status"][] = ["pending", "done", "cancelled"];

export async function GET(request: NextRequest, { params }: { params: Promise<{ intakeId: string }> }) {
  try {
    const actor = await staffActor(request, { mutation: false });
    const { intakeId } = await params;
    const jobs = await listApplicantRenderJobs(uuidOrThrow(intakeId, "Application"), actor.authUserId);
    return legalAidJson({ success: true, renderJobs: jobs });
  } catch (error) {
    return legalAidErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ intakeId: string }> }) {
  try {
    const actor = await staffActor(request);
    const { intakeId: raw } = await params;
    const intakeId = uuidOrThrow(raw, "Application");
    const body = await readJson(request, 32 * 1024);
    const action = str(body, "action", 40);
    const actorUserId = actor.authUserId;

    switch (action) {
      case "request_information": {
        const text = str(body, "requestText", 2000);
        if (text.length < 3) throw new ClinicValidationError("Describe what the applicant needs to provide.");
        return legalAidJson({ success: true, requestId: await requestInformation(intakeId, actorUserId, text) });
      }
      case "withdraw_request":
        return legalAidJson({ success: true, outcome: await withdrawInformationRequest(uuidOrThrow(body.requestId, "Request"), actorUserId) });
      case "start_review":
        return legalAidJson({ success: true, outcome: await startReview(intakeId, actorUserId) });
      case "set_attorney_review": {
        const status = str(body, "status", 20);
        if (status !== "assigned" && status !== "in_review") throw new ClinicValidationError("Choose an attorney review status.");
        return legalAidJson({ success: true, outcome: await setAttorneyReview(intakeId, actorUserId, status) });
      }
      case "record_decision": {
        const decisionType = str(body, "decisionType", 40) as ReviewDecision["decisionType"];
        if (!DECISION_TYPES.includes(decisionType)) throw new ClinicValidationError("Choose a decision type.");
        const outcome = str(body, "outcome", 40);
        if (!DECISION_OUTCOMES[decisionType].includes(outcome)) throw new ClinicValidationError("Choose an outcome for this decision type.");
        const rationale = str(body, "rationale", 4000);
        if (rationale.length < 10) throw new ClinicValidationError("Write the reason for the decision (at least 10 characters).");
        const evidence = body.evidence && typeof body.evidence === "object" && !Array.isArray(body.evidence) ? (body.evidence as Record<string, unknown>) : {};
        return legalAidJson({ success: true, decisionId: await recordDecision({ intakeId, actorUserId, decisionType, outcome, rationale, policyBasis: nullableStr(body, "policyBasis", 600), evidence }) });
      }
      case "reveal_ssn": {
        const purpose = str(body, "purpose", 300);
        if (purpose.length < 5) throw new ClinicValidationError("State the purpose for viewing the protected value.");
        const value = await revealSsn(intakeId, actorUserId, purpose);
        return legalAidJson({ success: true, value });
      }
      case "create_document_task": {
        const requiredSigner = str(body, "requiredSigner", 40);
        const executionMethod = str(body, "executionMethod", 40);
        if (!SIGNERS.includes(requiredSigner)) throw new ClinicValidationError("Choose who signs this document.");
        if (!METHODS.includes(executionMethod)) throw new ClinicValidationError("Choose how this document is executed.");
        const title = str(body, "title", 200);
        if (title.length < 3) throw new ClinicValidationError("Give the document a title.");
        const documentKey = str(body, "documentKey", 80);
        if (!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(documentKey)) throw new ClinicValidationError("The document key must be lowercase letters, numbers, dashes or underscores.");
        const renderJobId = typeof body.unsignedRenderJobId === "string" && body.unsignedRenderJobId ? uuidOrThrow(body.unsignedRenderJobId, "Packet") : null;
        const sha = typeof body.unsignedArtifactSha256 === "string" && /^[0-9a-f]{64}$/i.test(body.unsignedArtifactSha256) ? body.unsignedArtifactSha256.toLowerCase() : null;
        const taskId = await createDocumentTask({ intakeId, actorUserId, documentKey, title, requiredSigner, executionMethod, authorityNote: nullableStr(body, "authorityNote", 600), templateVersion: nullableStr(body, "templateVersion", 80), unsignedRenderJobId: renderJobId, unsignedArtifactSha256: sha });
        return legalAidJson({ success: true, taskId }, 201);
      }
      case "transition_document_task": {
        const status = str(body, "status", 40) as DocumentTaskStatus;
        if (!TASK_STATUSES.includes(status)) throw new ClinicValidationError("Choose a document status.");
        const executedDocumentId = typeof body.executedDocumentId === "string" && body.executedDocumentId ? uuidOrThrow(body.executedDocumentId, "Executed copy") : null;
        return legalAidJson({ success: true, outcome: await transitionDocumentTask({ taskId: uuidOrThrow(body.taskId, "Document task"), actorUserId, status, executedDocumentId, note: nullableStr(body, "note", 600) }) });
      }
      case "replace_document_artifact": {
        const sha = typeof body.unsignedArtifactSha256 === "string" && /^[0-9a-f]{64}$/i.test(body.unsignedArtifactSha256) ? body.unsignedArtifactSha256.toLowerCase() : "";
        if (!sha) throw new ClinicValidationError("Choose the prepared packet to attach.");
        const renderJobId = typeof body.unsignedRenderJobId === "string" && body.unsignedRenderJobId ? uuidOrThrow(body.unsignedRenderJobId, "Packet") : null;
        return legalAidJson({ success: true, outcome: await replaceDocumentArtifact({ taskId: uuidOrThrow(body.taskId, "Document task"), actorUserId, unsignedRenderJobId: renderJobId, unsignedArtifactSha256: sha }) });
      }
      case "save_next_step": {
        const title = str(body, "title", 200);
        if (title.length < 3) throw new ClinicValidationError("Give the next step a title.");
        const status = (str(body, "status", 20) || "pending") as NextStep["status"];
        if (!STEP_STATUSES.includes(status)) throw new ClinicValidationError("Choose a next-step status.");
        const nextStepId = typeof body.nextStepId === "string" && body.nextStepId ? uuidOrThrow(body.nextStepId, "Next step") : null;
        const ownerEventStaffId = typeof body.ownerEventStaffId === "string" && body.ownerEventStaffId ? uuidOrThrow(body.ownerEventStaffId, "Owner") : null;
        return legalAidJson({ success: true, nextStepId: await saveNextStep({ nextStepId, intakeId, actorUserId, title, detail: nullableStr(body, "detail", 2000), dueAt: nullableIso(body.dueAt, "Due date"), ownerEventStaffId, status }) });
      }
      case "send_message": {
        const ownerEventStaffId = typeof body.ownerEventStaffId === "string" && body.ownerEventStaffId ? uuidOrThrow(body.ownerEventStaffId, "Owner") : null;
        const result = await sendParticipantMessage({ intakeId, actorUserId, participantSafeMessage: str(body, "participantSafeMessage", 1200), internalNotes: nullableStr(body, "internalNotes", 2000), dueAt: nullableIso(body.dueAt, "Due date"), ownerEventStaffId });
        return legalAidJson({ success: true, ...result });
      }
      case "set_external_reference":
        return legalAidJson({ success: true, outcome: await setExternalCaseReference(intakeId, actorUserId, nullableStr(body, "reference", 120)) });
      case "export_case_file": {
        const result = await exportCaseFile({ intakeId, actorUserId, includeRestricted: body.includeRestricted === true, recipientNote: nullableStr(body, "recipientNote", 600) });
        return legalAidJson({ success: true, ...result }, 201);
      }
      default:
        throw new ClinicValidationError("Unknown action.");
    }
  } catch (error) {
    return legalAidErrorResponse(error);
  }
}
