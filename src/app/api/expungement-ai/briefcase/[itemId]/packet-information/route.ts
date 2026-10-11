import { mcicIdentifierAuthority, packetAnswersForOwnerEditing, requiresMcicIdentifierAuthority } from "@/lib/expungement-ai/sensitive-packet-facts";
import { NextResponse } from "next/server";

import { getRcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";
import { getBriefcaseItem } from "@/lib/expungement-ai/briefcase";
import {
  decorateBriefcaseItemForPresentation,
  protectedPacketVerificationSeedFromTrustedSource,
  readTrustedBriefcasePresentationSource
} from "@/lib/expungement-ai/briefcase-presentation-authority";
import {
  packetInformationPatch,
  packetDraftStopReason,
  protectedPacketInformationModelFor
} from "@/lib/expungement-ai/packet-information";
import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";
import { packetScreensFor, packetNavigationDestination, type PacketNavigationIntent } from "@/lib/expungement-ai/packet-navigation";
import { sameAnswer } from "@/lib/expungement-ai/packet-save-contract";
import { questionAnswerState } from "@/lib/expungement-ai/question-answer-state";
import {
  persistProtectedPacketVerification,
  readProtectedPacketVerification
} from "@/lib/expungement-ai/verification-cas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxPayloadBytes = 60_000;

/** Owner-only recovery read. It never merges a stale browser draft or verifies it. */
export async function GET(request: Request, context: { params: Promise<{ itemId: string }> }) {
  const auth = await getRcapBriefcaseAuthState();
  if (!auth.isAuthenticated || !auth.userId) return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  if (auth.isVerified !== true) return NextResponse.json({ ok: false, error: "verified_account_required" }, { status: 403 });
  const { itemId } = await context.params;
  const item = await getBriefcaseItem(auth.userId, itemId);
  if (!item) return NextResponse.json({ ok: false, error: "matter_not_found" }, { status: 404 });
  const authority = await readProtectedPacketVerification({ consumerAuthUserId: auth.userId, briefcaseItemId: item.id });
  if (!authority.ok) return NextResponse.json({ ok: false, error: "protected_verification_unavailable" }, { status: 503 });
  const model = protectedPacketInformationModelFor(authority.value);
  if (!model) return NextResponse.json({ ok: false, error: "packet_information_unavailable" }, { status: 409 });
  return NextResponse.json({
    ok: true, revision: authority.value.revision, answers: packetAnswersForOwnerEditing(model.stateCode, model.pathwayId, model.initialAnswers, new Date().toISOString(), new URL(request.url).searchParams.get("editingFact") === "social_security_number" && model.questions.some((question) => question.id === "social_security_number")),
    questions: model.builderQuestions, reviewQuestions: model.questions, sections: model.builderSections,
    missingInputIds: model.missingInputIds, pendingDerivations: model.pendingDerivations,
    resumeSectionId: item.packetResumeSectionId ?? null,
    reviewPath: `/briefcase/${encodeURIComponent(item.id)}/review`,
    readyToGenerate: model.stage === "ready_to_generate", reviewReason: model.reviewSafety.reason,
    nextAction: !model.packetPlan || packetDraftStopReason(model) ? "open_matter" : model.missingInputIds.length || model.pendingDerivations.length ? "continue_packet" : "review_packet"
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  const auth = await getRcapBriefcaseAuthState();
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  }
  if (auth.isVerified !== true) {
    return NextResponse.json({ ok: false, error: "verified_account_required" }, { status: 403 });
  }

  const { itemId } = await context.params;
  const item = await getBriefcaseItem(auth.userId, itemId);
  if (!item) {
    return NextResponse.json({ ok: false, error: "matter_not_found" }, { status: 404 });
  }

  const parsed = await readBody(request);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  let protectedRead = await readProtectedPacketVerification({
    consumerAuthUserId: auth.userId,
    briefcaseItemId: item.id
  });
  if (!protectedRead.ok && protectedRead.reason === "protected_verification_authority_missing") {
    const trusted = await readTrustedBriefcasePresentationSource({
      consumerAuthUserId: auth.userId,
      item
    });
    const seeded = trusted.ok ? protectedPacketVerificationSeedFromTrustedSource(trusted.value) : null;
    if (seeded) protectedRead = { ok: true, value: seeded.verification };
  }
  if (!protectedRead.ok) {
    return NextResponse.json({ ok: false, error: "protected_verification_unavailable" }, { status: 503 });
  }
  if (parsed.expectedRevision === null) {
    return NextResponse.json({ ok: false, error: "expected_revision_required" }, { status: 428 });
  }
  if (parsed.expectedRevision !== protectedRead.value.revision) {
    return NextResponse.json({ ok: false, error: "revision_conflict" }, { status: 409 });
  }
  const protectedModel = protectedPacketInformationModelFor(protectedRead.value);
  if (!protectedModel?.packetPlan) {
    return NextResponse.json({ ok: false, error: "packet_information_unavailable" }, { status: 403 });
  }
  const sensitiveRoute = requiresMcicIdentifierAuthority(protectedModel.stateCode, protectedModel.pathwayId);
  if (sensitiveRoute && "social_security_number" in parsed.answers
    && !mcicIdentifierAuthority({ ...protectedModel.initialAnswers, ...parsed.answers }, new Date().toISOString()).safe) {
    return NextResponse.json({ ok: false, error: "sensitive_identifier_prerequisite_required", invalidFactIds: ["mcic_identifier_delivery_method", "mcic_identifier_method_confirmation_source"] }, { status: 422 });
  }
  if (sensitiveRoute && "social_security_number_last_four" in parsed.answers
    && !sameAnswer(parsed.answers.social_security_number_last_four, protectedModel.initialAnswers.social_security_number_last_four)) {
    return NextResponse.json({ ok: false, error: "derived_identifier_read_only", invalidFactIds: ["social_security_number"] }, { status: 422 });
  }
  const editableIds = new Set(protectedModel.requiredInputIds.filter((id) => !(id in protectedModel.serverFacts)));
  const questionById = new Map(protectedModel.questions.map((question) => [question.id, question]));
  const invalidFactIds = Object.entries(parsed.answers).filter(([id, value]) => {
    if (!editableIds.has(id)) return !sameAnswer(value, protectedModel.initialAnswers[id] ?? protectedModel.serverFacts[id]);
    const question = questionById.get(id);
    // Incomplete calendar/text drafts are saved for recovery; contradictory
    // categorical sets are rejected by this boundary as well as the control.
    return question && ["multi_select", "single_choice", "yes_no_unsure", "yes_no_prefer_not_to_say"].includes(question.type)
      && questionAnswerState(question, value) === "invalid";
  }).map(([id]) => id);
  if (invalidFactIds.length) {
    return NextResponse.json({ ok: false, error: "invalid_packet_answers", invalidFactIds }, { status: 422 });
  }

  const update = packetInformationPatch({
    existingItem: item,
    answers: parsed.answers,
    verify: parsed.verify,
    protectedVerification: protectedRead.value
  });
  if (!update) {
    return NextResponse.json({ ok: false, error: "packet_plan_unavailable" }, { status: 409 });
  }
  const nextModel = protectedPacketInformationModelFor(update.protectedTransition.nextVerification);
  const requestedResume = parsed.resumeSectionId ?? item.packetResumeSectionId ?? null;
  const nextScreens = nextModel ? packetScreensFor(nextModel.builderQuestions, nextModel.builderSections) : [];
  const oldScreens = packetScreensFor(protectedModel.builderQuestions, protectedModel.builderSections);
  const validRequested = requestedResume === "review" || oldScreens.some((screen) => screen.id === requestedResume);
  const preserved = item.packetResumeSectionId === "review" || oldScreens.some((screen) => screen.id === item.packetResumeSectionId) ? item.packetResumeSectionId! : null;
  const resumeSectionId = packetNavigationDestination(oldScreens, nextScreens, validRequested ? requestedResume : preserved, parsed.navigationIntent, nextModel?.initialAnswers ?? {});
  update.protectedTransition.packetInformationMetadata.resumeSectionId = resumeSectionId;

  const saved = await persistProtectedPacketVerification({
    consumerAuthUserId: auth.userId,
    briefcaseItemId: item.id,
    transition: update.protectedTransition
  });
  if (!saved.ok) {
    const conflict = saved.reason === "protected_verification_transition_refused";
    return NextResponse.json({ ok: false, error: conflict ? "revision_conflict" : "save_unavailable" }, { status: conflict ? 409 : 503 });
  }
  const canonical = protectedPacketInformationModelFor(saved.value);
  if (!canonical) return NextResponse.json({ ok: false, error: "saved_state_unavailable" }, { status: 503 });
  const presentation = await decorateBriefcaseItemForPresentation({ consumerAuthUserId: auth.userId, item });
  return NextResponse.json({
    ok: true,
    commercialActions: presentation.commercialActions,
    itemId: item.id,
    revision: saved.value.revision,
    answers: packetAnswersForOwnerEditing(canonical.stateCode, canonical.pathwayId, canonical.initialAnswers, new Date().toISOString(), parsed.editingSensitiveIdentifier && canonical.questions.some((question) => question.id === "social_security_number")),
    questions: canonical.builderQuestions,
    reviewQuestions: canonical.questions,
    sections: canonical.builderSections,
    pendingDerivations: canonical.pendingDerivations,
    resumeSectionId,
    readyToGenerate: update.readyToGenerate,
    reviewReason: packetDraftStopReason(canonical) ?? update.reviewReason,
    nextAction: !canonical.packetPlan || canonical.pathwayId !== protectedModel.pathwayId || packetDraftStopReason(canonical)
      ? "open_matter" : canonical.missingInputIds.length || canonical.pendingDerivations.length ? "continue_packet" : "review_packet",
    missingInputIds: canonical.missingInputIds,
    reviewPath: `/briefcase/${encodeURIComponent(item.id)}/review`
  }, { headers: { "Cache-Control": "private, no-store" } });
}

async function readBody(request: Request): Promise<
  { ok: true; answers: Record<string, AnswerValue>; verify: boolean; expectedRevision: number | null; resumeSectionId: string | null; navigationIntent: PacketNavigationIntent; editingSensitiveIdentifier: boolean }
  | { ok: false }
> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxPayloadBytes) return { ok: false };
  const text = await request.text().catch(() => "");
  if (new TextEncoder().encode(text).length > maxPayloadBytes) return { ok: false };
  try {
    const body = JSON.parse(text) as { answers?: unknown; verify?: unknown; expectedRevision?: unknown; resumeSectionId?: unknown; navigationIntent?: unknown; editingFact?: unknown };
    if (!body.answers || typeof body.answers !== "object" || Array.isArray(body.answers)) return { ok: false };
    if (Object.keys(body.answers).some((id) => !/^[a-z][a-z0-9_]*$/.test(id))) return { ok: false };
    if (!Object.values(body.answers).every(validDraftValue)) return { ok: false };
    return {
      ok: true,
      answers: body.answers as Record<string, AnswerValue>,
      verify: body.verify === true,
      editingSensitiveIdentifier: body.editingFact === "social_security_number",
      expectedRevision: typeof body.expectedRevision === "number" && Number.isSafeInteger(body.expectedRevision) && body.expectedRevision >= 0 ? body.expectedRevision : null,
      resumeSectionId: typeof body.resumeSectionId === "string" ? body.resumeSectionId : null,
      navigationIntent: body.navigationIntent === "next" || body.navigationIntent === "previous" ? body.navigationIntent : "stay"
    };
  } catch {
    return { ok: false };
  }
}

function validDraftValue(value: unknown): boolean {
  if (value === null) return true;
  if (typeof value === "string") return value.length <= 20_000;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length <= 200 && value.every((entry) => typeof entry === "string" && entry.length <= 2_000);
  if (!value || typeof value !== "object") return false;
  const fields = value as Record<string, unknown>;
  return Object.keys(fields).every((key) => key === "value" || key === "unknown")
    && (fields.unknown === undefined || typeof fields.unknown === "boolean")
    && (fields.value === undefined || fields.value === null || (typeof fields.value === "string" && fields.value.length <= 20_000) || (typeof fields.value === "number" && Number.isFinite(fields.value)));
}
