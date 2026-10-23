import { VA_RECORD_CONTEXT_IDS } from "@/lib/expungement-ai/virginia-record-context";
import { isMsTimingDisplayText } from "@/lib/expungement-ai/reviewed-result-copy";
import { msExactTimingQuestionIds } from "@/lib/rcap-engine/mississippi-exact-timing";
import { readProtectedPacketVerification } from "@/lib/expungement-ai/verification-cas";
import { caProp64ClarificationModelFor, mdJuvenilePreparationModelFor, factualPathwayCorrectionIds, heldPacketCorrectionInputIds, isNebraskaNonconvictionGuidanceCorrection, isLouisianaAutomationStatusGuidanceCorrection, isMaineNonconvictionGuidanceCorrection, isMissouriClosureGuidanceCorrection, isMissouriMarijuanaGuidanceCorrection, isTexasNondisclosureGuidanceCorrection, isMontanaDeferredGuidanceCorrection } from "@/lib/expungement-ai/packet-information";
import { CA_PROP64_CLARIFICATION_COPY } from "@/lib/expungement-ai/ca-prop64-choices";
import { packetDisplayCopy, packetMatterTitleCopy, packetMatterSummaryCopy } from "@/lib/expungement-ai/packet-display-copy";
import { SponsorCapacityNotice } from "@/components/expungement-ai/SponsorCapacityNotice";
import Link from "next/link";
import { Download, MessageCircle } from "lucide-react";

import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { MatterStatusBadge, MatterStepper } from "@/components/expungement-ai/BriefcaseViews";
import { LocalizedCopy, LocalizedRuntimeText } from "@/components/expungement-ai/LocalizationProvider";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem } from "@/lib/expungement-ai/briefcase";
import {
  decorateBriefcaseItemForPresentation,
  type BriefcasePresentationArtifact,
  type BriefcasePresentationItem
} from "@/lib/expungement-ai/briefcase-presentation-authority";
import { humanMatterState } from "@/lib/expungement-ai/frontend/briefcase-presentation";
import { getConsumerPacketStatus } from "@/lib/expungement-ai/packet-generation";
import { PacketGenerateButton } from "@/components/expungement-ai/PacketGenerateButton";

export const dynamic = "force-dynamic";

export default async function BriefcasePacketPage({
  params
}: {
  params: Promise<{ packetId: string }>;
}) {
  const { packetId } = await params;
  const auth = await requireConsumerBriefcaseSession();
  const storedItem = await getBriefcaseItem(auth.userId, packetId);
  const item = storedItem ? await decorateBriefcaseItemForPresentation({
    consumerAuthUserId: auth.userId,
    item: storedItem
  }) : null;
  const clarificationRead = storedItem?.state === "CA" && (item?.authorityStatus === "unavailable" || item?.resultCode === "needs_review")
    ? await readProtectedPacketVerification({ consumerAuthUserId: auth.userId, briefcaseItemId: storedItem.id }) : null;
  const clarification = clarificationRead?.ok ? caProp64ClarificationModelFor(clarificationRead.value) : null;
  const mdPreparationRead = item?.jurisdiction === "MD" && item.pathwayId === "juvenile-expungement" && item.authorityStatus === "protected_draft"
    ? await readProtectedPacketVerification({ consumerAuthUserId: auth.userId, briefcaseItemId: item.id }) : null;
  const mdPreparation = mdPreparationRead?.ok ? mdJuvenilePreparationModelFor(mdPreparationRead.value) : null;
  const msTimingSummary = item?.jurisdiction === "MS" && isMsTimingDisplayText(item.summary ?? "");
  const available = item?.authorityStatus !== "unavailable";
  const eligibilityCorrection = ["NY", "CA", "IL", "GA"].includes(item?.jurisdiction ?? "")
    || item?.packetDraft.status === "available" && (msExactTimingQuestionIds(item.jurisdiction ?? "", item.pathwayId, item.packetDraft.initialAnswers).length > 0
      || factualPathwayCorrectionIds(item.jurisdiction ?? "", item.pathwayId, item.packetDraft.initialAnswers).length > 0
      || (item.packetDraft.heldFactualCorrectionIds?.length ?? 0) > 0);
  const sponsored = item?.paymentState === "sponsored";
  const packetMatter = available && (item?.resultCode === "packet_ready" || item?.resultCode === "packet_ready_with_caution");
  const factsVerified = item?.verificationStatus === "verified";
  const packetDraftAvailable = item?.packetDraft.status === "available";
  const vaFollowUp = item?.jurisdiction === "VA" && item.packetDraft.status === "available"
    ? item.packetDraft.vaPardonTypeHeldContext?.followUp : null;
  const completionCorrectionAvailable = item?.authorityStatus === "protected_draft"
    && item.jurisdiction && item.packetDraft.status === "available"
    && heldPacketCorrectionInputIds({ ...item.packetDraft, stateCode: item.jurisdiction, pathwayId: item.pathwayId }, item.resultCode).size > 0;
  const vaOptionalContext = completionCorrectionAvailable && item?.jurisdiction === "VA" && item.paymentState === "unavailable"
    && item.packetDraft.status === "available" && VA_RECORD_CONTEXT_IDS.every(id => item.packetDraft.status === "available" && item.packetDraft.questions.some(q => q.id === id && q.contextOnly));
  const savedCaseGuidanceCorrection = completionCorrectionAvailable && item?.jurisdiction && item.packetDraft.status === "available"
    && (isNebraskaNonconvictionGuidanceCorrection({ ...item.packetDraft, stateCode: item.jurisdiction, pathwayId: item.pathwayId }, item.resultCode)
      || isLouisianaAutomationStatusGuidanceCorrection({ ...item.packetDraft, stateCode: item.jurisdiction, pathwayId: item.pathwayId }, item.resultCode)
      || isMaineNonconvictionGuidanceCorrection({ ...item.packetDraft, stateCode: item.jurisdiction, pathwayId: item.pathwayId }, item.resultCode)
      || isMissouriClosureGuidanceCorrection({ ...item.packetDraft, stateCode: item.jurisdiction, pathwayId: item.pathwayId }, item.resultCode)
      || isMissouriMarijuanaGuidanceCorrection({ ...item.packetDraft, stateCode: item.jurisdiction, pathwayId: item.pathwayId }, item.resultCode)
      || isTexasNondisclosureGuidanceCorrection({ ...item.packetDraft, stateCode: item.jurisdiction, pathwayId: item.pathwayId }, item.resultCode)
      || isMontanaDeferredGuidanceCorrection({ ...item.packetDraft, stateCode: item.jurisdiction, pathwayId: item.pathwayId }, item.resultCode));
  const artifact = item?.artifact.status === "ready" ? item.artifact : null;
  const paidPreparation = item?.paymentState === "paid" && factsVerified && !artifact && item.commercialActions.generationAllowed
    ? await getConsumerPacketStatus({ userId: auth.userId, briefcaseItemId: item.id }).catch(() => null)
    : null;
  const mississippiClinicPacket = sponsored
    && item?.jurisdiction === "MS"
    && item.pathwayId === "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
  const packetComponents = item?.packetDraft.status === "available"
    ? item.packetDraft.expectedComponents
    : item?.checklist ?? [];

  return (
    <BriefcaseShell
      userEmail={auth.userEmail}
      caseState={item?.jurisdiction ?? undefined}
      briefcaseItemId={item?.id}
      activeNav="matters"
      breadcrumb={item ? <><Link href="/briefcase/matters" className="hover:text-[#1A1D26]"><LocalizedRuntimeText text={"My matters"} /></Link> / <b className="text-[#1A1D26]"><LocalizedCopy {...packetMatterTitleCopy(item)} /></b></> : <b className="text-[#1A1D26]"><LocalizedRuntimeText text={"Matter"} /></b>}
    >
      {clarification && storedItem && !completionCorrectionAvailable ? <p className="mb-5 rounded border border-amber-300 p-4">
        <Link className="inline-flex min-h-11 items-center font-semibold underline" href={`/briefcase/${storedItem.id}/packet-information`}><LocalizedCopy {...CA_PROP64_CLARIFICATION_COPY.legacy_heading} /></Link>
      </p> : null}
      {completionCorrectionAvailable && item ? <p className="mb-5 rounded border border-amber-300 p-4">
        <Link className="inline-flex min-h-11 items-center font-semibold underline" href={`/briefcase/${item.id}/packet-information`}><LocalizedCopy en={vaOptionalContext ? "Review optional record context" : savedCaseGuidanceCorrection ? "Review saved case answers" : eligibilityCorrection ? "Review saved eligibility answers" : "Review saved completion answers"} es={vaOptionalContext ? "Revise el contexto opcional del expediente" : savedCaseGuidanceCorrection ? "Revise las respuestas guardadas sobre el caso" : eligibilityCorrection ? "Revise las respuestas guardadas sobre la elegibilidad" : "Revise las respuestas guardadas sobre el cumplimiento"} /></Link>
      </p> : null}
      {item?.packetDraft.status === "available" && item.packetDraft.gaPardonPreparationAvailable ? <p className="mb-5 rounded border border-slate-300 p-4">
        <Link className="inline-flex min-h-11 items-center font-semibold underline" href={`/briefcase/${item.id}/packet-information?preparation=ga-pardon`}><LocalizedCopy en="Prepare your petition information" es="Prepare la información para su petición" /></Link>
        <span className="block text-sm"><LocalizedCopy en="Save your case details and your own account of how the record has affected you. The court decides the petition; document generation is not available yet." es="Guarde los datos de su caso y su propio relato de cómo le ha afectado el expediente. El tribunal decide la petición; la generación de documentos aún no está disponible." /></span>
      </p> : null}
      {item?.packetDraft.status === "available" && item.packetDraft.caJuvenilePreparationAvailable ? <p className="mb-5 rounded border border-slate-300 p-4">
        <LocalizedCopy en="You can save the details for your juvenile court request. Each additional finding needs its own conduct date and court record. Saving these details does not sign or file forms; a packet is not available to download." es="Puede guardar los datos de su solicitud al tribunal de menores. Cada determinación adicional necesita su propia fecha de los hechos y expediente judicial. Guardar estos datos no firma ni presenta formularios; no hay un paquete disponible para descargar." />{" "}
        <Link className="underline" href={`/briefcase/${encodeURIComponent(item.id)}/packet-information?preparation=ca-prop64-juvenile`}><LocalizedCopy en="Prepare juvenile court details" es="Preparar los datos del tribunal de menores" /></Link>
      </p> : null}
      {mdPreparation && item ? <p className="mb-5 rounded border border-slate-300 p-4">
        <Link className="inline-flex min-h-11 items-center font-semibold underline" href={`/briefcase/${encodeURIComponent(item.id)}/packet-information?preparation=md-juvenile`}><LocalizedCopy en="Prepare juvenile court details" es="Preparar los datos del tribunal de menores" /></Link>
        <span className="block text-sm"><LocalizedCopy en="Save details from your juvenile case records. Saving does not verify eligibility, sign or file a form, or make a packet available to download." es="Guarde los datos de los expedientes de su caso de menores. Guardar no verifica la elegibilidad, no firma ni presenta un formulario y no habilita un paquete para descargar." /></span>
      </p> : null}
      {item?.packetDraft.status === "available" && item.packetDraft.mtDeferredPreparationAvailable ? <p className="mb-5 rounded border border-slate-300 p-4">
        <Link className="inline-flex min-h-11 items-center font-semibold underline" href={`/briefcase/${item.id}/packet-information?preparation=mt-deferred`}><LocalizedCopy en="Prepare your deferred-sentence document details" es="Prepare los datos de sus documentos de sentencia aplazada" /></Link>
        <span className="block text-sm"><LocalizedCopy en="Save facts from your case records for the appropriate court or DOJ step. Saving does not establish relief or authorize document generation, signing or filing." es="Guarde los datos de los expedientes de su caso para el paso correspondiente ante el tribunal o el Departamento de Justicia. Guardar no establece que se haya concedido una medida ni autoriza generar, firmar o presentar documentos." /></span>
      </p> : null}
      {item && item.authorityStatus !== "unavailable" ? (
        <section data-briefcase-matter-id={item.id}>
          {item.sponsorCapacityExhausted ? <SponsorCapacityNotice paid={item.paymentState === "paid"} /> : null}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#08786F]">{item.jurisdiction}</p>
              <h1 className="mt-2 text-[24px] font-extrabold tracking-[-0.02em] text-[#0B1320]"><LocalizedCopy {...packetMatterTitleCopy(item)} /></h1>
              <p className="mt-2 text-[13px] leading-6 text-[#5A6275]">{msTimingSummary ? <LocalizedCopy {...packetMatterSummaryCopy(item)} /> : <LocalizedRuntimeText text={item.summary ?? ""} />}</p>
            </div>
            <MatterStatusBadge item={item} />
          </div>

          {packetMatter ? <MatterStepper item={item} className="mt-6 max-w-[680px]" /> : null}

          {vaFollowUp ? <details className="mt-6 rounded border border-slate-300 p-4" data-va-pardon-follow-up="true">
            <summary className="min-h-11 cursor-pointer font-semibold"><LocalizedCopy {...vaFollowUp.title} /></summary>
            {vaFollowUp.sections.map(section => <section key={section.heading.en} className="mt-4">
              <h2 className="font-semibold"><LocalizedCopy {...section.heading} /></h2>
              {section.paragraphs.map(paragraph => <p key={paragraph.en} className="mt-2 text-sm leading-6"><LocalizedCopy {...paragraph} /></p>)}
            </section>)}
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
              {vaFollowUp.checklist.map(entry => <li key={entry.id} data-va-checklist-id={entry.id}><LocalizedCopy {...entry} /></li>)}
            </ul>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
              {vaFollowUp.sources.map(source => <li key={source.href}><a className="underline" href={source.href}><LocalizedCopy {...source} /></a></li>)}
            </ol>
          </details> : null}

          {!packetMatter ? (
            <SavedResultValue item={item} />
          ) : (
            <>
              <div className="mt-6 rounded-[16px] border border-[#ECEFF4] bg-white p-6">
                <h2 className="text-lg font-extrabold text-[#0B1320]">
                  <LocalizedRuntimeText text={mississippiClinicPacket ? "Your Mississippi clinic packet" : humanMatterState(item)} />
                </h2>
                {!item.commercialActions.fulfillmentAvailable ? (
                  <p className="mt-2 text-sm leading-6 text-[#5A6275]" role="status"><LocalizedRuntimeText text="A packet is not available for this route yet. Your eligibility result and saved information remain available." /></p>
                ) : sponsored ? (
                  <p className="mt-2 text-sm leading-6 text-[#5A6275]"><LocalizedRuntimeText text={"Your packet is covered through your partner program. Complete the packet information and review it before generation."} /></p>
                ) : (
                  <>
                    <p className="mt-2 text-sm leading-6 text-[#5A6275]"><LocalizedRuntimeText text={item.paymentState === "paid" ? "Your payment is confirmed for this matter. Preparing or retrying this packet does not require another purchase." : "Your Briefcase is free. Complete your packet information and pay only when you're ready to generate your packet."} /></p>
                    {item.paymentState !== "paid" ? <p className="mt-3 text-sm font-bold text-[#0B1320]"><LocalizedRuntimeText text={"$50 one time when you are ready to generate this packet"} /></p> : null}
                  </>
                )}

                <ul className="mt-5 grid gap-2 text-sm leading-6 text-[#475A6E]">
                  {packetComponents.map((component, index) => <li key={`${component}-${index}`}>• <LocalizedCopy {...packetDisplayCopy("expected_packet_component", item.jurisdiction, item.pathwayId, component)} /></li>)}
                </ul>

                {!artifact && !packetDraftAvailable ? (
                  <p className="mt-5 rounded-[10px] bg-[#F7F3EC] px-4 py-3 text-sm text-[#5A6275]" role="status" aria-live="polite">
                    <LocalizedRuntimeText text={"Packet information is temporarily unavailable. Refresh this matter before continuing."} />
                  </p>
                ) : null}

                <div className="mt-6 flex flex-wrap gap-3">
                  {item.paymentState === "paid" && factsVerified && !artifact && item.commercialActions.generationAllowed ? <PacketGenerateButton briefcaseItemId={item.id} mode="paid_durable" initiallyPreparing={paidPreparation?.packetStatus === "pending"} initiallyFailed={paidPreparation?.packetStatus === "failed"} initiallyRetryable={paidPreparation?.retryable === true} label="Prepare my packet" /> : null}
                  {!artifact && packetDraftAvailable && item.packetProgress === "not_started" ? (
                    <Link className="inline-flex min-h-11 items-center rounded-[10px] bg-[#C2350A] px-5 text-sm font-bold text-white" href={`/briefcase/${item.id}/packet-information`}>
                      <LocalizedRuntimeText text={mississippiClinicPacket ? "Continue my Mississippi clinic packet" : "Complete packet information"} />
                    </Link>
                  ) : null}
                  {!artifact && packetDraftAvailable && item.packetProgress === "in_progress" ? (
                    <Link className="inline-flex min-h-11 items-center rounded-[10px] bg-[#C2350A] px-5 text-sm font-bold text-white" href={`/briefcase/${item.id}/packet-information`}>
                      <LocalizedRuntimeText text={mississippiClinicPacket ? "Continue my Mississippi clinic packet" : "Resume packet information"} />
                    </Link>
                  ) : null}
                  {!artifact && packetDraftAvailable && item.packetProgress === "facts_complete" ? (
                    <Link className="inline-flex min-h-11 items-center rounded-[10px] bg-[#C2350A] px-5 text-sm font-bold text-white" href={`/briefcase/${item.id}/review`}>
                      <LocalizedRuntimeText text={"Review packet facts"} />
                    </Link>
                  ) : null}
                  {!artifact && packetDraftAvailable && item.packetProgress === "verified" && factsVerified ? (
                    <Link className="inline-flex min-h-11 items-center rounded-[10px] bg-[#C2350A] px-5 text-sm font-bold text-white" href={`/briefcase/${item.id}/review`}>
                      <LocalizedRuntimeText text={"Review verified facts"} />
                    </Link>
                  ) : null}
                  <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[#D9DEE8] px-5 text-sm font-bold text-[#0B1320]" href="#ask-wilma">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" /> <LocalizedRuntimeText text={"Ask Wilma about next steps"} />
                  </Link>
                </div>
              </div>

              {artifact ? <ReadyPacket itemId={item.id} artifact={artifact} nextSteps={item.nextSteps} mississippiClinicPacket={mississippiClinicPacket} /> : null}
            </>
          )}
        </section>
      ) : item ? (
        <section className="rounded-[16px] border border-[#ECEFF4] bg-white p-6" role="status" aria-live="polite">
          <p className="text-xs font-bold uppercase text-[#5E687A]"><LocalizedRuntimeText text={"Details unavailable"} /></p>
          <h1 className="mt-3 text-2xl font-extrabold text-[#0B1320]"><LocalizedRuntimeText text={"We could not verify this matter's saved details."} /></h1>
          <p className="mt-3 text-sm leading-6 text-[#5A6275]"><LocalizedRuntimeText text={"Refresh the page to try again. No packet, payment, or filing status is shown until the saved authority can be verified."} /></p>
          <Link className="mt-6 inline-flex min-h-11 items-center rounded-[10px] bg-[#0B1320] px-5 text-sm font-bold text-white" href="/briefcase"><LocalizedRuntimeText text={"Back to Briefcase"} /></Link>
        </section>
      ) : (
        <section className="rounded-[16px] border border-[#ECEFF4] bg-white p-6">
          <p className="text-xs font-bold uppercase text-[#E0A93B]"><LocalizedRuntimeText text={"Not found"} /></p>
          <h1 className="mt-3 text-2xl font-extrabold text-[#0B1320]"><LocalizedRuntimeText text={"We couldn't find that matter"} /></h1>
          <p className="mt-3 text-sm leading-6 text-[#5A6275]"><LocalizedRuntimeText text={"This matter is not in your Briefcase."} /></p>
          <Link className="mt-6 inline-flex min-h-11 items-center rounded-[10px] bg-[#0B1320] px-5 text-sm font-bold text-white" href="/briefcase"><LocalizedRuntimeText text={"Open Briefcase"} /></Link>
        </section>
      )}
    </BriefcaseShell>
  );
}

function SavedResultValue({ item }: { item: BriefcasePresentationItem }) {
  return (
    <div className="mt-6 rounded-[16px] border border-[#ECEFF4] bg-white p-6" data-briefcase-guidance-state={humanMatterState(item)}>
      <h2 className="text-lg font-extrabold text-[#0B1320]"><LocalizedRuntimeText text={humanMatterState(item)} /></h2>
      <p className="mt-2 text-sm leading-6 text-[#5A6275]"><LocalizedRuntimeText text={"We saved this result and its state-specific next steps in your free Briefcase. You can return anytime as you gather information or follow the guidance below."} /></p>
      <h3 className="mt-5 text-sm font-bold text-[#0B1320]"><LocalizedRuntimeText text={"Your next steps"} /></h3>
      <ol className="mt-3 space-y-3">
        {item.nextSteps.map((step, index) => (
          <li className="flex gap-3 text-sm leading-6 text-[#5A6275]" key={`${step}-${index}`}>
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-[#00A99D] text-xs font-bold text-[#08786F]">{index + 1}</span>
            <LocalizedRuntimeText text={step} />
          </li>
        ))}
      </ol>
      <Link className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[#D9DEE8] px-5 text-sm font-bold text-[#0B1320]" href={`/expungement-ai/support?briefcaseItemId=${encodeURIComponent(item.id)}`}>
        <MessageCircle className="h-4 w-4" aria-hidden="true" /> <LocalizedRuntimeText text={"Ask Wilma to explain this"} />
      </Link>
    </div>
  );
}

function ReadyPacket({
  itemId,
  artifact,
  nextSteps,
  mississippiClinicPacket
}: {
  itemId: string;
  artifact: Extract<BriefcasePresentationArtifact, { status: "ready" }>;
  nextSteps: string[];
  mississippiClinicPacket: boolean;
}) {
  return (
    <>
      <div className="mt-6 rounded-[16px] border border-[#ECEFF4] bg-white p-6" data-packet-ready="true">
        <h2 className="text-lg font-extrabold text-[#0B1320]"><LocalizedRuntimeText text={"Packet ready"} /></h2>
        <p className="mt-2 text-sm leading-6 text-[#5A6275]">
          <LocalizedRuntimeText text={"Your private PDF is ready to download and reopen from this matter."} />
          {artifact.pageCount ? <>{" "}<LocalizedRuntimeText text={artifact.pageCount === 1 ? "{count} page." : "{count} pages."} vars={{ count: artifact.pageCount }} /></> : ""}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {artifact.documents.map((document) => (
            <a href={document.downloadPath} className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[#0B1320] px-5 text-sm font-bold text-white" key={`${document.kind}:${document.downloadPath}`}>
              <Download className="h-4 w-4" aria-hidden="true" /> <LocalizedRuntimeText text={mississippiClinicPacket ? "Download Mississippi non-conviction expungement packet" : "Download {fileName}"} vars={{ fileName: document.fileName }} />
            </a>
          ))}
        </div>
        <Link href={`/briefcase/${itemId}/review`} className="ml-3 mt-5 inline-flex min-h-11 items-center rounded-[10px] border border-[#D9DEE8] px-5 text-sm font-bold text-[#0B1320]"><LocalizedRuntimeText text={"Review packet information"} /></Link>
      </div>
      {nextSteps.length > 0 ? (
        <div className="mt-6 rounded-[16px] border border-[#ECEFF4] bg-white p-6">
          <h2 className="text-lg font-extrabold text-[#0B1320]"><LocalizedRuntimeText text={"Filing next steps"} /></h2>
          <ol className="mt-4 space-y-3">
            {nextSteps.map((step, index) => <li className="text-sm leading-6 text-[#5A6275]" key={`${step}-${index}`}>{index + 1}. <LocalizedRuntimeText text={step} /></li>)}
          </ol>
        </div>
      ) : null}
    </>
  );
}
