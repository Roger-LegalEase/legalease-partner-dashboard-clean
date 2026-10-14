import { msExactTimingQuestionIds } from "@/lib/rcap-engine/mississippi-exact-timing";
import { readProtectedPacketVerification } from "@/lib/expungement-ai/verification-cas";
import { CA_PROP64_CLARIFICATION_COPY } from "@/lib/expungement-ai/ca-prop64-choices";
import { packetDisplayCopy, packetMatterTitleCopy } from "@/lib/expungement-ai/packet-display-copy";
import { LocalizedCopy, LocalizedRuntimeText } from "@/components/expungement-ai/LocalizationProvider";
import Link from "next/link";
import { redirect } from "next/navigation";
import { editablePacketInputIds, factualPathwayCorrectionIds, heldPacketCorrectionInputIds, isNebraskaNonconvictionGuidanceCorrection, isLouisianaAutomationStatusGuidanceCorrection, packetAccountEmailSuggestion, caProp64ClarificationModelFor } from "@/lib/expungement-ai/packet-information";

import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { MatterStatusBadge } from "@/components/expungement-ai/BriefcaseViews";
import { packetAnswersForOwnerEditing, requiresMcicIdentifierAuthority } from "@/lib/expungement-ai/sensitive-packet-facts";
import { PacketInformationBuilder } from "@/components/expungement-ai/PacketInformationBuilder";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem } from "@/lib/expungement-ai/briefcase";
import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";
import { protectedPacketVerificationSeedFromTrustedSource, readTrustedBriefcasePresentationSource } from "@/lib/expungement-ai/briefcase-presentation-authority";

import { gaPardonPreparationModelFor } from "@/lib/expungement-ai/packet-information";

export const dynamic = "force-dynamic";

export default async function PacketInformationPage({
  params,
  searchParams
}: {
  params: Promise<{ packetId: string }>;
  searchParams: Promise<{ edit?: string; preparation?: string }>;
}) {
  const { packetId } = await params;
  const auth = await requireConsumerBriefcaseSession(`/briefcase/${packetId}/packet-information`);
  const storedItem = await getBriefcaseItem(auth.userId, packetId);
  const item = storedItem ? await decorateBriefcaseItemForPresentation({
    consumerAuthUserId: auth.userId,
    item: storedItem
  }) : null;
  const search = await searchParams;
  const preparing = search.preparation === "ga-pardon";
  let preparationModel = null;
  if (preparing && storedItem) {
    let read = await readProtectedPacketVerification({ consumerAuthUserId: auth.userId, briefcaseItemId: storedItem.id });
    if (!read.ok && read.reason === "protected_verification_authority_missing") {
      const source = await readTrustedBriefcasePresentationSource({ consumerAuthUserId: auth.userId, item: storedItem });
      const seed = source.ok ? protectedPacketVerificationSeedFromTrustedSource(source.value) : null;
      if (seed) read = { ok: true, value: seed.verification };
    }
    preparationModel = read.ok ? gaPardonPreparationModelFor(read.value) : null;
  }
  const savedCaseGuidanceCorrection = item?.authorityStatus === "protected_draft"
    && item.jurisdiction && item.packetDraft.status === "available"
    && (isNebraskaNonconvictionGuidanceCorrection({ ...item.packetDraft, stateCode: item.jurisdiction, pathwayId: item.pathwayId }, item.resultCode)
      || isLouisianaAutomationStatusGuidanceCorrection({ ...item.packetDraft, stateCode: item.jurisdiction, pathwayId: item.pathwayId }, item.resultCode));
  const eligibilityCorrection = Boolean(savedCaseGuidanceCorrection) || ["NY", "CA", "IL", "GA"].includes(item?.jurisdiction ?? "")
    || item?.packetDraft.status === "available" && (msExactTimingQuestionIds(item.jurisdiction ?? "", item.pathwayId, item.packetDraft.initialAnswers).length > 0
      || factualPathwayCorrectionIds(item.jurisdiction ?? "", item.pathwayId, item.packetDraft.initialAnswers).length > 0
      || (item.packetDraft.heldFactualCorrectionIds?.length ?? 0) > 0);
  const sponsored = item?.paymentState === "sponsored";
  const packetResult = item?.authorityStatus !== "unavailable"
    && (item?.resultCode === "packet_ready" || item?.resultCode === "packet_ready_with_caution");
  const correctionIds = item?.authorityStatus === "protected_draft"
    && item.jurisdiction && item.packetDraft.status === "available"
    ? heldPacketCorrectionInputIds({ ...item.packetDraft, stateCode: item.jurisdiction, pathwayId: item.pathwayId }, item.resultCode) : new Set<string>();
  const correctingCompletion = !preparing && !packetResult && correctionIds.size > 0;
  // These protected NE and LA correction surfaces return to the current matter, even
  // when an explicit uncertainty truthfully leaves its legal route unresolved.
  const savedCaseMatterCorrection = correctingCompletion && item?.authorityStatus === "protected_draft"
    && item.packetDraft.status === "available"
    && (item.jurisdiction === "NE" && (item.pathwayId === "automatic-nonconviction-sealing"
      || item.pathwayId === null && (item.packetDraft.heldFactualCorrectionIds?.length ?? 0) > 0)
      || item.jurisdiction === "LA" && (item.pathwayId === "automated-expungement-status-verification-art-985-2"
        || item.pathwayId === null && item.packetDraft.heldFactualCorrectionIds?.includes("case_outcome")));
  const model = preparing ? preparationModel : (correctingCompletion || packetResult && item?.paymentState !== "unavailable") && item?.packetDraft.status === "available"
    ? item.packetDraft
    : null;
  const protectedRead = !model && storedItem ? await readProtectedPacketVerification({ consumerAuthUserId: auth.userId, briefcaseItemId: storedItem.id }) : null;
  const clarification = protectedRead?.ok ? caProp64ClarificationModelFor(protectedRead.value) : null;
  const requestedEdit = search.edit?.trim();
  const editId = requestedEdit === "social_security_number_last_four" && requiresMcicIdentifierAuthority(item?.jurisdiction ?? "", item?.pathwayId) ? "social_security_number" : requestedEdit;
  if (model && item && editId && !(correctingCompletion ? correctionIds : editablePacketInputIds({ ...model, stateCode: item.jurisdiction ?? "", pathwayId: item.pathwayId })).has(editId)) {
    redirect(preparing ? `/briefcase/${encodeURIComponent(item.id)}/packet-information?preparation=ga-pardon` : `/briefcase/${encodeURIComponent(item.id)}/review`);
  }
  const displayedQuestions = model && correctingCompletion
    ? model.questions.filter((question) => correctionIds.has(question.id) && (!editId || question.id === editId)) : model
    ? editId ? model.questions.filter((question) => question.id === editId
      || editId === "social_security_number" && question.id.startsWith("mcic_identifier_")
      || editId === "contact_information" && ["mailing_address", "phone_number", "email_address"].includes(question.id)) : model.builderQuestions
    : [];
  // Sections group the ordinary builder. A single-question edit from the review
  // page is one question on its own screen, exactly as it has always been, so
  // it deliberately carries no section.
  const displayedSections = model && editId === "social_security_number" ? [{
    id: "sensitive_identifier", heading: "Confidential identifier", description: "Confirm the existing court-approved delivery authority before entering the identifier.",
    translations: { es: { heading: "Identificador confidencial", description: "Confirme la autorización de entrega existente aprobada por el tribunal antes de ingresar el identificador." } },
    questionIds: ["mcic_identifier_delivery_method", "mcic_identifier_method_confirmation_source", "social_security_number"].filter((id) => displayedQuestions.some((question) => question.id === id))
  }] : model && editId === "contact_information" ? [{
    id: "contact_review", heading: "Review your saved contact details", description: "Complete or correct the separate contact details first.",
    translations: { es: { heading: "Revise sus datos de contacto guardados", description: "Primero complete o corrija los datos de contacto por separado." } },
    questionIds: ["mailing_address", "phone_number", "email_address", "contact_information"].filter((id) => displayedQuestions.some((question) => question.id === id))
  }] : model && !editId && !correctingCompletion ? model.builderSections ?? [] : [];
  const savedSection = storedItem?.packetResumeSectionId;
  // The builder validates the destination against its effective screens and
  // explains recovery when a previously saved section no longer exists.
  const resumeSectionId = typeof savedSection === "string" ? savedSection : null;

  return (
    <BriefcaseShell
      userEmail={auth.userEmail}
      caseState={item?.jurisdiction ?? undefined}
      briefcaseItemId={item?.id}
      activeNav="matters"
      breadcrumb={item ? <><Link href="/briefcase/matters"><LocalizedRuntimeText text={"My matters"} /></Link> / <Link href={`/briefcase/${item.id}`}><LocalizedCopy {...packetMatterTitleCopy(item)} /></Link> / <b><LocalizedRuntimeText text={"Packet information"} /></b></> : <b><LocalizedRuntimeText text={"Packet information"} /></b>}
    >
      {clarification && storedItem ? (
        <section data-ca-prop64-clarification>
          <h1 className="text-[26px] font-extrabold text-[#0B1320]"><LocalizedCopy {...CA_PROP64_CLARIFICATION_COPY.legacy_heading} /></h1>
          <PacketInformationBuilder itemId={storedItem.id} stateCode={clarification.stateCode} pathwayId={clarification.pathwayId}
            questions={clarification.builderQuestions} initialAnswers={clarification.initialAnswers} initiallyMissing={clarification.missingInputIds}
            initialRevision={clarification.revision} initialCaProp64Clarification />
        </section>
      ) : item && item.jurisdiction && model ? (
        <section>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#08786F]">{item.jurisdiction}</p>
              <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.02em] text-[#0B1320]">{preparing ? <LocalizedCopy en="Prepare your petition information" es="Prepare la información para su petición" /> : correctingCompletion
                ? <LocalizedCopy en={savedCaseGuidanceCorrection ? "Review saved case answers" : eligibilityCorrection ? "Review saved eligibility answers" : "Review saved completion answers"} es={savedCaseGuidanceCorrection ? "Revise las respuestas guardadas sobre el caso" : eligibilityCorrection ? "Revise las respuestas guardadas sobre la elegibilidad" : "Revise las respuestas guardadas sobre el cumplimiento"} />
                : <LocalizedRuntimeText text={"Complete packet information"} />}</h1>
              {item.pathwayLabel ? <p className="mt-2 text-sm font-semibold text-[#475A6E]"><LocalizedCopy {...packetDisplayCopy("route_label", item.jurisdiction, item.pathwayId, item.pathwayLabel)} /></p> : null}
            </div>
            <MatterStatusBadge item={item} />
          </div>

          <div className="my-6 rounded-[14px] bg-[#F7F3EC] px-5 py-4 text-sm leading-6 text-[#5A6275]">
            {preparing ? <p><LocalizedCopy en="Choose a detail to save or correct. Describe the harm to you using your own facts. The court decides the petition. You can save your progress; a packet is not yet available to download." es="Elija un dato para guardarlo o corregirlo. Describa el perjuicio que ha sufrido usando sus propios hechos. El tribunal decide la petición. Puede guardar su progreso; el paquete aún no está disponible para descargar." /></p> : savedCaseGuidanceCorrection ? (
              <p><LocalizedCopy en={item.jurisdiction === "LA" ? "You can correct the saved case answers used for this guidance. Saving an answer does not verify your facts, submit an automated expungement request, or make a court packet available." : "You can correct the saved case answers used for this guidance. Saving an answer does not verify your facts, confirm that your record is sealed, or make a court packet available."} es={item.jurisdiction === "LA" ? "Puede corregir las respuestas guardadas sobre el caso que se usan para esta orientación. Guardar una respuesta no verifica sus datos, no presenta una solicitud de eliminación automatizada ni habilita un paquete judicial." : "Puede corregir las respuestas guardadas sobre el caso que se usan para esta orientación. Guardar una respuesta no verifica sus datos, no confirma que su expediente esté sellado ni habilita un paquete judicial."} /></p>
            ) : correctingCompletion ? (
              <p><LocalizedCopy en="You can correct these saved answers. Your current result remains on hold, and correcting an answer does not complete final verification." es="Puede corregir estas respuestas guardadas. Su resultado actual sigue pendiente y corregir una respuesta no completa la verificación final." /></p>
            ) : sponsored ? (
              <p><LocalizedRuntimeText text={"Your packet is covered through your partner program. Complete the information below without a consumer payment."} /></p>
            ) : (
              <p><LocalizedRuntimeText text={"Your Briefcase is free. Complete your packet information and pay only when you're ready to generate your packet."} /></p>
            )}
            {!correctingCompletion && !preparing ? <p className="mt-2"><LocalizedRuntimeText text={"Complete the remaining details for this packet. Review what's already here, add anything that is missing, and save your progress anytime."} /></p> : null}
          </div>

          {correctingCompletion && eligibilityCorrection ? <nav className="mb-6 grid gap-2" aria-labelledby="eligibility-correction-heading">
            <p id="eligibility-correction-heading" className="font-semibold"><LocalizedCopy en="Choose an answer to correct" es="Elija una respuesta para corregir" /></p>
            {model.questions.filter(question => correctionIds.has(question.id)).map(question => <Link
              key={question.id} className="inline-flex min-h-11 items-center underline"
              href={`/briefcase/${encodeURIComponent(item.id)}/packet-information?edit=${encodeURIComponent(question.id)}`}>
              {question.translations?.es?.prompt
                ? <LocalizedCopy en={question.prompt} es={question.translations.es.prompt} />
                : <LocalizedRuntimeText text={question.prompt} />}
            </Link>)}
          </nav> : null}
          {preparing ? <nav className="mb-6 grid gap-2" aria-labelledby="ga-preparation-choices">
            <p id="ga-preparation-choices" className="font-semibold"><LocalizedCopy en="Choose a petition detail" es="Elija un dato de la petición" /></p>
            {model.questions.map(question => <Link key={question.id} className="inline-flex min-h-11 items-center underline" href={`/briefcase/${encodeURIComponent(item.id)}/packet-information?preparation=ga-pardon&edit=${encodeURIComponent(question.id)}`}>
              {question.translations?.es?.prompt ? <LocalizedCopy en={question.prompt} es={question.translations.es.prompt} /> : <LocalizedRuntimeText text={question.prompt} />}
            </Link>)}
          </nav> : null}
          {!preparing || editId ? <PacketInformationBuilder
            key={`${item.id}:${editId ?? "all"}:${preparing ? "preparation" : "ordinary"}`}
            itemId={item.id}
            stateCode={item.jurisdiction}
            questions={displayedQuestions}
            pathwayId={item.pathwayId}
            initialAnswers={packetAnswersForOwnerEditing(item.jurisdiction, item.pathwayId, model.initialAnswers, new Date().toISOString(), displayedQuestions.some((question) => question.id === "social_security_number"))}
            sections={displayedSections}
            initiallyMissing={model.missingInputIds}
            initialRevision={model.revision}
            initialResumeSectionId={resumeSectionId}
            initialPendingDerivations={model.pendingDerivations}
            initialContactReconciliation={model.contactReconciliation}
            initialRecordClarificationIds={model.recordClarificationIds}
            initialCourtRecordConflict={model.courtRecordConflict}
            initialAccountEmailSuggestion={packetAccountEmailSuggestion({ ...model, stateCode: item.jurisdiction, pathwayId: item.pathwayId ?? null }, auth.userEmail)}
            initialRouteChanged={correctingCompletion && !savedCaseMatterCorrection}
            returnToMatterAfterCorrection={preparing || Boolean(savedCaseMatterCorrection)}
            gaPardonPreparation={preparing}
            editingFromReview={Boolean(editId) || correctingCompletion}
          /> : null}
        </section>
      ) : (
        <section className="rounded-[16px] border border-[#ECEFF4] bg-white p-6" role="status" aria-live="polite">
          <h1 className="text-2xl font-extrabold text-[#0B1320]"><LocalizedRuntimeText text={"Packet information is not available for this matter."} /></h1>
          <p className="mt-3 text-sm leading-6 text-[#5A6275]"><LocalizedRuntimeText text={"Open the saved matter to review its result and next steps."} /></p>
          <Link className="mt-5 inline-flex min-h-11 items-center rounded-[10px] bg-[#0B1320] px-5 text-sm font-bold text-white" href={item ? `/briefcase/${item.id}` : "/briefcase"}><LocalizedRuntimeText text={"Open matter"} /></Link>
        </section>
      )}
    </BriefcaseShell>
  );
}
