import { mdJuvenileProtectedDocumentPreparation } from "@/lib/expungement-ai/md-juvenile-document-preparation";
import { ND_FIRST_OFFENSE_FACT_IDS } from "@/lib/rcap-engine/north-dakota-first-offense-facts";
import { MT_DEFERRED_DOCUMENT_QUESTION_IDS } from "@/lib/expungement-ai/mt-deferred-document-questions";
import { ny16059CustodyRemovalAvailable } from "@/lib/expungement-ai/ny-custody-correction";
import { ny16059ProtectedDocumentPreparation } from "@/lib/expungement-ai/ny-16059-document-preparation";
import { ny16059OwnedCompletionDiagnostic } from "@/lib/expungement-ai/ny-16059-owned-completion";
import { NY_16059_ROUTE } from "@/lib/rcap-engine/new-york-16059-facts";
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
  factualPathwayCorrectionIds,
  caProp64ClarificationModelFor,
  caProp64ClarificationPatch,
  packetAccountEmailSuggestion,
  editablePacketInputIds,
  heldPacketCorrectionInputIds,
  packetDraftStopReason,
  protectedPacketInformationModelFor,
  montanaDeferredPreparationModelFor,
  caProp64JuvenilePreparationModelFor,
  gaPardonPreparationModelFor,
  mdJuvenilePreparationModelFor
} from "@/lib/expungement-ai/packet-information";
import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";
import { packetScreensFor, packetNavigationDestination, type PacketNavigationIntent } from "@/lib/expungement-ai/packet-navigation";
import { sameAnswer } from "@/lib/expungement-ai/packet-save-contract";
import { answerValueIsKnown, questionAnswerState } from "@/lib/expungement-ai/question-answer-state";
import {
  persistProtectedPacketVerification,
  readProtectedPacketVerification
} from "@/lib/expungement-ai/verification-cas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxPayloadBytes = 60_000;

function ownerEditingModelFor(record: Parameters<typeof protectedPacketInformationModelFor>[0], preparation: string | null = null) {
  if (preparation === "md-juvenile") return mdJuvenilePreparationModelFor(record);
  if (preparation === "ca-prop64-juvenile") return caProp64JuvenilePreparationModelFor(record);
  if (preparation === "mt-deferred") return montanaDeferredPreparationModelFor(record);
  if (preparation === "ga-pardon") return gaPardonPreparationModelFor(record);
  const model = protectedPacketInformationModelFor(record);
  return model?.packetPlan ? model : caProp64ClarificationModelFor(record) ?? model;
}

/** An exact held juvenile draft has no offered correction editor. Machine-only
 * context saves remain available; their recovery action returns to the matter.
 * This does not retire the source-defined juvenile petition or its future venue. */
function isMdJuvenileHeldMatterOnly(
  record: Parameters<typeof protectedPacketInformationModelFor>[0],
  model: NonNullable<ReturnType<typeof ownerEditingModelFor>>
): boolean {
  const draft = record.draftSnapshot;
  return ["unverified", "invalidated"].includes(record.status) && record.hash == null && record.snapshot == null
    && draft?.schemaVersion === "expungement-ai/protected-packet-draft/v1"
    && draft.jurisdiction === "MD" && draft.pathwayId === "juvenile-expungement"
    && draft.profileVersion === "2026-06-19-source-conversion-1"
    && draft.profileSourceFingerprint === "a88bc998d56cda93130e6f3db92e2545c7a98f87bd4940975c85b68ec664f64c"
    && draft.profileAuthorityFingerprint === "1d793bff0dd23998a3644752fc1f9cca01072caaa69b05dfaec6f0de70628e07"
    && draft.resultCode === "not_covered_yet" && draft.paymentAllowed === false
    && model.stateCode === "MD" && model.pathwayId === draft.pathwayId
    && model.resultCode === "not_covered_yet" && model.reviewSafety.safe === false
    && !model.caProp64Clarification && !model.gaPardonPreparationAvailable
    && !model.mtDeferredPreparationAvailable && !model.caJuvenilePreparationAvailable
    && !model.gaPardonPreparationFactIds && !model.mtDeferredPreparationFactIds
    && !model.caJuvenilePreparationFactIds && !model.heldFactualCorrectionIds?.length
    && heldPacketCorrectionInputIds(model, model.resultCode).size === 0;
}

/** Exact current juvenile general-guidance draft: preserve source obligations and
 * machine saves while returning to the only offered matter view. */
function isOhJuvenileHeldMatterOnly(
  record: Parameters<typeof protectedPacketInformationModelFor>[0],
  model: NonNullable<ReturnType<typeof ownerEditingModelFor>>
): boolean {
  const draft = record.draftSnapshot;
  return ["unverified", "invalidated"].includes(record.status) && record.hash == null && record.snapshot == null
    && draft?.schemaVersion === "expungement-ai/protected-packet-draft/v1"
    && draft.jurisdiction === "OH" && draft.pathwayId === "juvenile-sealing-and-expungement"
    && draft.profileVersion === "2026-06-19-source-conversion-1"
    && draft.profileSourceFingerprint === "0109b1358bbee282e159113ced5f86734a6c0cf281c51aca4c3703dedb4552e7"
    && draft.profileAuthorityFingerprint === "ac5c89aed9ec935710e83d43c1e2896cd2b7bda498a1752e8f92a4c40952f97a"
    && draft.resultCode === "guidance_only" && draft.paymentAllowed === false
    && draft.packetType === "guidance_packet" && draft.selectedTrackId === null
    && sameAnswer(draft.serverFacts, { jurisdiction: "OH", pathway_id: "juvenile-sealing-and-expungement" })
    && sameAnswer(draft.packetFamilyIdentifiers, { mode: "state_specific_custom_packet_from_source_rules", sourceFormIds: [] })
    && sameAnswer(draft.packetPlan, model.packetPlan)
    && model.stateCode === "OH" && model.pathwayId === draft.pathwayId
    && model.resultCode === "guidance_only" && model.reviewSafety.safe === false
    && model.reviewSafety.reason === "authoritative_route_changed" && model.stage === "in_progress"
    && !model.caProp64Clarification && !model.gaPardonPreparationAvailable
    && !model.mtDeferredPreparationAvailable && !model.caJuvenilePreparationAvailable
    && !model.gaPardonPreparationFactIds && !model.mtDeferredPreparationFactIds
    && !model.caJuvenilePreparationFactIds && !model.heldFactualCorrectionIds?.length
    && heldPacketCorrectionInputIds(model, model.resultCode).size === 0;
}

/** Owner-only recovery read. It never merges a stale browser draft or verifies it. */
export async function GET(request: Request, context: { params: Promise<{ itemId: string }> }) {
  const auth = await getRcapBriefcaseAuthState();
  if (!auth.isAuthenticated || !auth.userId) return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  if (auth.isVerified !== true) return NextResponse.json({ ok: false, error: "verified_account_required" }, { status: 403 });
  const { itemId } = await context.params;
  const item = await getBriefcaseItem(auth.userId, itemId);
  if (!item) return NextResponse.json({ ok: false, error: "matter_not_found" }, { status: 404 });
  let authority = await readProtectedPacketVerification({ consumerAuthUserId: auth.userId, briefcaseItemId: item.id });
  // A newly claimed matter has a trusted server-owned source but no saved
  // verification row yet. Use the same unverified revision-zero recovery as
  // POST; a read neither creates a verification nor accepts client answers.
  if (!authority.ok && authority.reason === "protected_verification_authority_missing") {
    const trusted = await readTrustedBriefcasePresentationSource({ consumerAuthUserId: auth.userId, item });
    const seeded = trusted.ok ? protectedPacketVerificationSeedFromTrustedSource(trusted.value) : null;
    if (seeded) authority = { ok: true, value: seeded.verification };
  }
  if (!authority.ok) return NextResponse.json({ ok: false, error: "protected_verification_unavailable" }, { status: 503 });
  const model = ownerEditingModelFor(authority.value, new URL(request.url).searchParams.get("preparation"));
  if (!model) return NextResponse.json({ ok: false, error: "packet_information_unavailable" }, { status: 409 });
  return NextResponse.json({
    ok: true, revision: authority.value.revision, answers: packetAnswersForOwnerEditing(model.stateCode, model.pathwayId, model.initialAnswers, new Date().toISOString(), new URL(request.url).searchParams.get("editingFact") === "social_security_number" && model.questions.some((question) => question.id === "social_security_number")),
    questions: model.builderQuestions, reviewQuestions: model.questions, sections: model.builderSections,
    missingInputIds: model.missingInputIds, pendingDerivations: model.pendingDerivations,
    contactReconciliation: model.contactReconciliation ?? null,
    recordClarificationIds: model.recordClarificationIds ?? [],
    courtRecordConflict: model.courtRecordConflict ?? false,
    nyCaseIssues: model.nyCaseIssues ?? [],
    accountEmailSuggestion: packetAccountEmailSuggestion(model, auth.userEmail),
    resumeSectionId: item.packetResumeSectionId ?? null,
    reviewPath: `/briefcase/${encodeURIComponent(item.id)}/review`,
    caProp64Clarification: model.caProp64Clarification ?? false,
    ...(new URL(request.url).searchParams.get("preparation") === "md-juvenile" ? { mdJuvenilePreparation: mdJuvenileProtectedDocumentPreparation(authority.value) } : {}),
    ny16059Preparation: ny16059ProtectedDocumentPreparation(authority.value),
    ny16059Completion: ny16059OwnedCompletionDiagnostic(item.id, authority.value),
    readyToGenerate: model.stage === "ready_to_generate", reviewReason: model.reviewSafety.reason,
    nextAction: model.caProp64Clarification ? "continue_packet" : !model.packetPlan || packetDraftStopReason(model) || isMdJuvenileHeldMatterOnly(authority.value, model) || isOhJuvenileHeldMatterOnly(authority.value, model) ? "open_matter" : model.missingInputIds.length || model.pendingDerivations.length ? "continue_packet" : "review_packet"
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
    return NextResponse.json({ ok: false, error: parsed.tooLarge ? "packet_save_too_large" : "invalid_request", ...(parsed.tooLarge ? { maximumBytes: maxPayloadBytes } : {}) }, { status: parsed.tooLarge ? 413 : 400 });
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
  const preparation = new URL(request.url).searchParams.get("preparation");
  const protectedModel = ownerEditingModelFor(protectedRead.value, preparation);
  if (!protectedModel) return NextResponse.json({ ok: false, error: "packet_information_unavailable" }, { status: 403 });
  if (["ga-pardon", "mt-deferred", "ca-prop64-juvenile", "md-juvenile"].includes(preparation ?? "") && parsed.verify) return NextResponse.json({ ok: false, error: "preparation_only" }, { status: 422 });
  // Match the page's validated successor instead of the historical draft result.
  // This controls owner corrections only; verification and commercial holds remain.
  const savedResult = protectedModel.resultCode;
  const factualCorrectionIds = protectedModel ? [...factualPathwayCorrectionIds(protectedModel.stateCode, protectedModel.pathwayId, protectedModel.initialAnswers), ...(protectedModel.heldFactualCorrectionIds ?? [])].filter(id => protectedModel.stateCode !== "VA" || protectedModel.questions.some(question => question.id === id)) : [];
  const financialCorrection = protectedModel && heldPacketCorrectionInputIds(protectedModel, savedResult ?? null).has("financial_obligations");
  if (!protectedModel?.packetPlan && !protectedModel?.caProp64Clarification && !protectedModel?.caJuvenilePreparationFactIds && !protectedModel?.mdJuvenilePreparationFactIds
    && !financialCorrection && !factualCorrectionIds.length
    && !(protectedModel?.stateCode === "NY" && protectedModel.pathwayId === NY_16059_ROUTE)) {
    return NextResponse.json({ ok: false, error: "packet_information_unavailable" }, { status: 403 });
  }
  if (!protectedModel.packetPlan && factualCorrectionIds.length && parsed.verify) return NextResponse.json({ ok: false, error: "invalid_packet_answers", invalidFactIds: factualCorrectionIds }, { status: 422 });
  if (protectedModel.caProp64Clarification && parsed.verify) return NextResponse.json({ ok: false, error: "invalid_packet_answers", invalidFactIds: protectedModel.requiredInputIds }, { status: 422 });
  if (!protectedModel.packetPlan && financialCorrection && parsed.verify) return NextResponse.json({ ok: false, error: "invalid_packet_answers", invalidFactIds: ["financial_obligations"] }, { status: 422 });
  if (parsed.clearInactiveCustodyFacts && (!ny16059CustodyRemovalAvailable(protectedModel.stateCode, protectedModel.pathwayId, protectedModel.initialAnswers)
    || parsed.verify || Object.keys(parsed.answers).length)) return NextResponse.json({ ok: false, error: "custody_correction_not_available" }, { status: 422 });
  const sensitiveRoute = requiresMcicIdentifierAuthority(protectedModel.stateCode, protectedModel.pathwayId);
  if (sensitiveRoute && "social_security_number" in parsed.answers
    && !mcicIdentifierAuthority({ ...protectedModel.initialAnswers, ...parsed.answers }, new Date().toISOString()).safe) {
    return NextResponse.json({ ok: false, error: "sensitive_identifier_prerequisite_required", invalidFactIds: ["mcic_identifier_delivery_method", "mcic_identifier_method_confirmation_source"] }, { status: 422 });
  }
  if (sensitiveRoute && "social_security_number_last_four" in parsed.answers
    && !sameAnswer(parsed.answers.social_security_number_last_four, protectedModel.initialAnswers.social_security_number_last_four)) {
    return NextResponse.json({ ok: false, error: "derived_identifier_read_only", invalidFactIds: ["social_security_number"] }, { status: 422 });
  }
  // A coupled condition/detail patch can retain the participant's draft even
  // while the detail is inactive. Ownership and readiness remain independent.
  const editableIds = editablePacketInputIds(protectedModel, true);
  const questionById = new Map(protectedModel.questions.map((question) => [question.id, question]));
  const accountEmail = parsed.useAccountEmail ? packetAccountEmailSuggestion(protectedModel, auth.userEmail) : null;
  if (parsed.useAccountEmail && (!accountEmail || !editableIds.has("email_address")
    || !sameAnswer(parsed.answers.email_address ?? protectedModel.initialAnswers.email_address, accountEmail))) {
    return NextResponse.json({ ok: false, error: "account_email_suggestion_changed", invalidFactIds: ["email_address"] }, { status: 422 });
  }
  const invalidConfirmationIds = parsed.confirmRecordFacts.filter((id) => !protectedModel.recordClarificationIds?.includes(id)
    || !questionById.has(id) || questionAnswerState(questionById.get(id)!, { ...protectedModel.initialAnswers, ...parsed.answers }[id]) !== "known_valid"
    || !answerValueIsKnown({ ...protectedModel.initialAnswers, ...parsed.answers }[id]));
  if (invalidConfirmationIds.length) return NextResponse.json({ ok: false, error: "record_confirmation_not_available", invalidFactIds: invalidConfirmationIds }, { status: 422 });
  if (parsed.useContactComponents) {
    const proposed = { ...protectedModel.initialAnswers, ...parsed.answers };
    const invalidContactIds = ["mailing_address", "phone_number", "email_address"].filter((id) => {
      const question = questionById.get(id);
      return !question || questionAnswerState(question, proposed[id]) !== "known_valid";
    });
    if (!protectedModel.contactReconciliation || invalidContactIds.length) return NextResponse.json({ ok: false,
      error: "contact_reconciliation_not_available", invalidFactIds: invalidContactIds.length ? invalidContactIds : ["contact_information"] }, { status: 422 });
  }
  const invalidFactIds = Object.entries(parsed.answers).filter(([id, value]) => {
    if (!editableIds.has(id)) return !sameAnswer(value, protectedModel.initialAnswers[id] ?? protectedModel.serverFacts[id]);
    const question = questionById.get(id);
    // Incomplete calendar/text drafts are saved for recovery; contradictory
    // categorical sets are rejected by this boundary as well as the control.
    return question && ["multi_select", "single_choice", "yes_no_unsure", "yes_no_prefer_not_to_say"].includes(question.type)
      && questionAnswerState(question, value) === "invalid"
      && !(protectedModel.caProp64Clarification && sameAnswer(value, protectedModel.initialAnswers[id]));
  }).map(([id]) => id);
  if (invalidFactIds.length) {
    return NextResponse.json({ ok: false, error: "invalid_packet_answers", invalidFactIds }, { status: 422 });
  }

  const update = protectedModel.caProp64Clarification ? caProp64ClarificationPatch({ protectedVerification: protectedRead.value, answers: parsed.answers, verify: parsed.verify }) : packetInformationPatch({
    existingItem: item,
    answers: parsed.answers,
    verify: parsed.verify,
    mdJuvenilePreparation: preparation === "md-juvenile",
    gaPardonPreparation: preparation === "ga-pardon",
    caJuvenilePreparation: preparation === "ca-prop64-juvenile",
    mtDeferredPreparation: preparation === "mt-deferred",
    useContactComponents: parsed.useContactComponents,
    clearInactiveCustodyFacts: parsed.clearInactiveCustodyFacts,
    confirmRecordFacts: parsed.confirmRecordFacts,
    accountEmailSource: accountEmail ?? undefined,
    protectedVerification: protectedRead.value
  });
  if (!update) {
    return NextResponse.json({ ok: false, error: "packet_plan_unavailable" }, { status: 409 });
  }
  const nextModel = ownerEditingModelFor(update.protectedTransition.nextVerification, preparation) ?? ownerEditingModelFor(update.protectedTransition.nextVerification);
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
  const canonical = ownerEditingModelFor(saved.value, preparation) ?? ownerEditingModelFor(saved.value);
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
    contactReconciliation: canonical.contactReconciliation ?? null,
    recordClarificationIds: canonical.recordClarificationIds ?? [],
    courtRecordConflict: canonical.courtRecordConflict ?? false,
    nyCaseIssues: canonical.nyCaseIssues ?? [],
    accountEmailSuggestion: packetAccountEmailSuggestion(canonical, auth.userEmail),
    resumeSectionId,
    caProp64Clarification: canonical.caProp64Clarification ?? false,
    readyToGenerate: update.readyToGenerate,
    reviewReason: packetDraftStopReason(canonical) ?? update.reviewReason,
    nextAction: canonical.caProp64Clarification ? "continue_packet" : !canonical.packetPlan || canonical.pathwayId !== protectedModel.pathwayId || packetDraftStopReason(canonical) || isMdJuvenileHeldMatterOnly(saved.value, canonical) || isOhJuvenileHeldMatterOnly(saved.value, canonical)
      ? "open_matter" : canonical.missingInputIds.length || canonical.pendingDerivations.length ? "continue_packet" : "review_packet",
    missingInputIds: canonical.missingInputIds,
    reviewPath: `/briefcase/${encodeURIComponent(item.id)}/review`
  }, { headers: { "Cache-Control": "private, no-store" } });
}

async function readBody(request: Request): Promise<
  { ok: true; answers: Record<string, AnswerValue>; verify: boolean; useContactComponents: boolean; clearInactiveCustodyFacts: boolean; useAccountEmail: boolean; confirmRecordFacts: string[]; expectedRevision: number | null; resumeSectionId: string | null; navigationIntent: PacketNavigationIntent; editingSensitiveIdentifier: boolean }
  | { ok: false; tooLarge?: boolean }
> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxPayloadBytes) return { ok: false, tooLarge: true };
  const text = await request.text().catch(() => "");
  if (new TextEncoder().encode(text).length > maxPayloadBytes) return { ok: false, tooLarge: true };
  try {
    const body = JSON.parse(text) as { answers?: unknown; verify?: unknown; useContactComponents?: unknown; clearInactiveCustodyFacts?: unknown; useAccountEmail?: unknown; confirmRecordFacts?: unknown; expectedRevision?: unknown; resumeSectionId?: unknown; navigationIntent?: unknown; editingFact?: unknown };
    if (body.clearInactiveCustodyFacts !== undefined && typeof body.clearInactiveCustodyFacts !== "boolean") return { ok: false };
    if (body.useAccountEmail !== undefined && typeof body.useAccountEmail !== "boolean") return { ok: false };
    if (body.confirmRecordFacts !== undefined && (!Array.isArray(body.confirmRecordFacts) || body.confirmRecordFacts.length > 5 || body.confirmRecordFacts.some((id) => typeof id !== "string") || new Set(body.confirmRecordFacts).size !== body.confirmRecordFacts.length)) return { ok: false };
    if (!body.answers || typeof body.answers !== "object" || Array.isArray(body.answers)) return { ok: false };
    // The adopted MT composed contract has exact camelCase fact IDs. Accept
    // only that finite namespace on its explicit preparation request; the
    // protected owner model and editable-ID checks still decide every write.
    // The six retained ND statutory IDs use camelCase too; only this finite
    // namespace passes parsing, never an arbitrary source or participant key.
    const mtPreparation = new URL(request.url).searchParams.get("preparation") === "mt-deferred";
    if (Object.keys(body.answers).some((id) => !/^[a-z][a-z0-9_]*$/.test(id)
      && !(mtPreparation && MT_DEFERRED_DOCUMENT_QUESTION_IDS.includes(id))
      && !ND_FIRST_OFFENSE_FACT_IDS.includes(id))) return { ok: false };
    if (!Object.values(body.answers).every(validDraftValue)) return { ok: false };
    return {
      ok: true,
      answers: body.answers as Record<string, AnswerValue>,
      verify: body.verify === true,
      useContactComponents: body.useContactComponents === true,
      clearInactiveCustodyFacts: body.clearInactiveCustodyFacts === true,
      useAccountEmail: body.useAccountEmail === true,
      confirmRecordFacts: (body.confirmRecordFacts as string[] | undefined) ?? [],
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
  if (typeof value === "string") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((entry) => typeof entry === "string");
  if (!value || typeof value !== "object") return false;
  const fields = value as Record<string, unknown>;
  return Object.keys(fields).every((key) => key === "value" || key === "unknown")
    && (fields.unknown === undefined || typeof fields.unknown === "boolean")
    && (fields.value === undefined || fields.value === null || typeof fields.value === "string" || (typeof fields.value === "number" && Number.isFinite(fields.value)));
}
