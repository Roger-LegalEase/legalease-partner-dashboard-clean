import { packetDisplayCopy } from "@/lib/expungement-ai/packet-display-copy";
import { COURT_RECORD_CONFLICT_COPY } from "@/lib/expungement-ai/record-fact-copy";
import { SponsorCapacityNotice } from "@/components/expungement-ai/SponsorCapacityNotice";
import Link from "next/link";
import { LocalizedCopy, LocalizedRuntimeText } from "@/components/expungement-ai/LocalizationProvider";
import { CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { MatterStatusBadge } from "@/components/expungement-ai/BriefcaseViews";
import { PacketVerificationAction } from "@/components/expungement-ai/PacketVerificationAction";
import {
  verificationSummary,
  type VerificationSummaryRow
} from "@/components/expungement-ai/verification-summary";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem } from "@/lib/expungement-ai/briefcase";
import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";
import { reviewEditablePacketInputIds } from "@/lib/expungement-ai/packet-information";
import { getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import { projectPublicProfile } from "@/lib/rcap-engine/public-profile-projection";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";

export const dynamic = "force-dynamic";

export default async function PacketAccuracyReviewPage({
  params
}: {
  params: Promise<{ packetId: string }>;
}) {
  const { packetId } = await params;
  const auth = await requireConsumerBriefcaseSession(`/briefcase/${packetId}/review`);
  const storedItem = await getBriefcaseItem(auth.userId, packetId);
  const item = storedItem ? await decorateBriefcaseItemForPresentation({
    consumerAuthUserId: auth.userId,
    item: storedItem
  }) : null;
  const authorityAvailable = item?.authorityStatus !== "unavailable";
  const sponsored = item?.paymentState === "sponsored";
  const packetMatter = authorityAvailable && (item?.resultCode === "packet_ready" || item?.resultCode === "packet_ready_with_caution");
  const model = packetMatter && item?.packetDraft.status === "available" ? item.packetDraft : null;
  const reviewSafety = model?.reviewSafety ?? { safe: false, reason: "matter_missing" };
  const initiallyVerified = item?.verificationStatus === "verified" && reviewSafety.safe;
  const profile = item?.jurisdiction ? getProfileByJurisdiction(item.jurisdiction) : null;
  const reviewQuestions = [...new Map([...(profile ? projectPublicProfile(profile).questions : []), ...(model?.questions ?? [])]
    .map((question) => [question.id, { ...question, options: Array.isArray(question.options)
      && question.options.every((option): option is string => typeof option === "string") ? question.options : null }])).values()];
  const summary = item && model ? verificationSummary({
    ...model,
    editableInputIds: [...reviewEditablePacketInputIds({ ...model, stateCode: item.jurisdiction ?? "", pathwayId: item.pathwayId })],
    questions: reviewQuestions,
    stateCode: item.jurisdiction ?? "",
    pathwayId: item.pathwayId
  }) : null;
  const mississippiClinicPacket = sponsored
    && item?.jurisdiction === "MS"
    && item.pathwayId === "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";

  return (
    <BriefcaseShell
      userEmail={auth.userEmail}
      caseState={item?.jurisdiction ?? undefined}
      briefcaseItemId={item?.id}
      activeNav="matters"
      breadcrumb={item ? <><Link href="/briefcase/matters"><LocalizedRuntimeText text={"My matters"} /></Link> / <Link href={`/briefcase/${item.id}`}>{item.title}</Link> / <b><LocalizedRuntimeText text={"Review and confirm"} /></b></> : <b><LocalizedRuntimeText text={"Review and confirm"} /></b>}
    >
      {item && model && summary ? (
        <section data-accuracy-review="true">
          {item.sponsorCapacityExhausted ? <SponsorCapacityNotice paid={item.paymentState === "paid"} /> : null}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#08786F]"><LocalizedRuntimeText text={"Packet facts"} /></p>
              <h1 id="packet-review-heading" tabIndex={-1} className="mt-2 text-[26px] font-extrabold tracking-[-0.02em] text-[#0B1320] focus-visible:outline focus-visible:outline-2"><LocalizedRuntimeText text={"Review and verify your packet facts"} /></h1>
              <p className="mt-2 text-sm leading-6 text-[#475A6E]">
                <LocalizedRuntimeText text={sponsored
                  ? "Check each answer before covered generation. Editable packet facts are marked below."
                  : item.paymentState === "paid"
                    ? "Check each answer before preparing the packet. Editable packet facts are marked below."
                    : "Check each answer before final verification. Editable packet facts are marked below."} />
              </p>
            </div>
            <MatterStatusBadge item={item} />
          </div>

          <div className="mt-6 grid gap-5">
            {summary.screeningAnswers.length > 0 ? (
              <AnswerSection title="Free screening answers" itemId={item.id} rows={summary.screeningAnswers} />
            ) : null}
            {summary.packetAnswers.length > 0 ? (
              <AnswerSection title="Packet and verified record information" itemId={item.id} rows={summary.packetAnswers} />
            ) : null}
          </div>

          {mississippiClinicPacket ? (
            <div className="mt-6 rounded-[16px] border border-[#CFE4DD] bg-[#F3F8F5] p-6">
              <h2 className="text-base font-bold text-[#0B1320]"><LocalizedRuntimeText text={"Who completes each part"} /></h2>
              <ul className="mt-4 grid gap-2 text-sm leading-6 text-[#475A6E] sm:grid-cols-2">
                <li><strong><LocalizedRuntimeText text={"Prefilled by LegalEase"} /></strong>{" "}<LocalizedRuntimeText text={"- facts already collected during screening."} /></li>
                <li><strong><LocalizedRuntimeText text={"Confirmed from the participant’s records"} /></strong>{" "}<LocalizedRuntimeText text={"- court, case, charge, date, agency, and service facts."} /></li>
                <li><strong><LocalizedRuntimeText text={"Completed by the participant when signing or serving"} /></strong>{" "}<LocalizedRuntimeText text={"- signatures, service method, and service dates."} /></li>
                <li><strong><LocalizedRuntimeText text={"Reserved for the prosecutor or court"} /></strong>{" "}<LocalizedRuntimeText text={"- approval, findings, entry date, and judicial signature."} /></li>
              </ul>
            </div>
          ) : null}

          <div className="mt-6">
            <ReviewCard title="Details we already have" icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}>
              <p className="text-sm leading-6 text-[#475A6E]" id="verification-context-description"><LocalizedRuntimeText text={"These identify the saved case you are reviewing. Your answers above determine the packet and its requirements."} /></p>
              <dl aria-describedby="verification-context-description" className="mt-4 grid gap-3 text-sm">
                <SummaryLine label="Jurisdiction" value={item.jurisdiction ?? "Unavailable"} translateValue={!item.jurisdiction} />
                <SummaryLine label="Packet pathway" value={item.pathwayLabel ? <LocalizedCopy {...packetDisplayCopy("route_label", item.jurisdiction, item.pathwayId, item.pathwayLabel)} /> : "Saved packet pathway"} />
              </dl>
            </ReviewCard>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <ReviewCard title="Expected packet components" icon={<FileText className="h-5 w-5" aria-hidden="true" />}>
              <ul className="space-y-2">
                {model.expectedComponents.map((component) => (
                  <li className="flex gap-2 text-sm leading-6 text-[#475A6E]" key={component}>
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#00A99D]" aria-hidden="true" /> <LocalizedCopy {...packetDisplayCopy("expected_packet_component", item.jurisdiction, item.pathwayId, component)} />
                  </li>
                ))}
              </ul>
            </ReviewCard>

            <ReviewCard title="Filing limitations" icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-[#475A6E]">
                <li><LocalizedRuntimeText text={"Expungement.ai prepares self-help documents. It does not file them for you."} /></li>
                <li><LocalizedRuntimeText text={"Court, agency, service, record, and filing fees are separate."} /></li>
                <li><LocalizedRuntimeText text={"The court or agency makes the final decision. Approval is not guaranteed."} /></li>
                <li><LocalizedRuntimeText text={"Review names, dates, court information, and charges against your records before filing."} /></li>
                {mississippiClinicPacket ? <li><LocalizedRuntimeText text={"Stop and get legal help for an ambiguous docket entry, unclear venue, diversion or nonadjudication, a related pending matter, prosecutor refusal, or an immigration concern."} /></li> : null}
              </ul>
            </ReviewCard>
          </div>

          <ReviewCard title="Your packet" icon={<FileText className="h-5 w-5" aria-hidden="true" />}>
            <dl className="grid gap-3 text-sm">
              <SummaryLine label="Result" value={!item.commercialActions.fulfillmentAvailable ? "Your eligibility result is saved. A packet is not available for this route yet." : reviewSafety.safe ? "Your answers still match this packet route. Confirm the facts before continuing." : "Check these answers before you continue."} />
              <SummaryLine label="Coverage" value={sponsored ? "Covered by your partner program" : "This packet belongs to your private Briefcase matter."} />
              {!sponsored ? <SummaryLine label="Cost" value={item.paymentState === "paid" ? "Already paid for this matter" : item.commercialActions.fulfillmentAvailable ? "$50 one time, after you confirm your information" : "No payment available"} /> : null}
            </dl>
          </ReviewCard>

          <div className="mt-5 rounded-[16px] border border-[#ECEFF4] bg-white p-6">
            <h2 className="text-base font-bold text-[#0B1320]"><LocalizedRuntimeText text={"Details to check"} /></h2>
            {model.nyCaseIssues?.map(issue => <p key={issue.code} className="mt-3 text-sm text-[#B42318]" role="status"><LocalizedCopy en={issue.en} es={issue.es} /></p>)}
            {model.courtRecordConflict ? <p data-court-record-conflict className="mt-3 text-sm text-[#B42318]" role="status"><LocalizedCopy {...COURT_RECORD_CONFLICT_COPY} /></p> : null}
            {model.missingInputIds.length > 0 || model.pendingDerivations.length > 0 ? (
              <ul className="mt-3 grid gap-2 text-sm text-[#B42318]">
                {model.missingInputIds.map((id) => <li key={id}><QuestionPrompt question={model.questions.find((question) => question.id === id)} /></li>)}
                {model.pendingDerivations.map((fact) => <li key={`derived-${fact.factId}`}><LocalizedRuntimeText text={"Check the source answers before this packet detail can be calculated:"} />{" "}{fact.inputFactIds.map((id, index) => <span key={id}>{index > 0 ? "; " : ""}<QuestionPrompt question={model.questions.find((question) => question.id === id)} /></span>)}</li>)}
              </ul>
            ) : !model.courtRecordConflict && (
              <p className="mt-2 text-sm leading-6 text-[#475A6E]"><LocalizedRuntimeText text={"All required information is here. Review the saved answers one more time before continuing."} /></p>
            )}
            <Link className="mt-4 inline-flex min-h-10 items-center rounded-[10px] border border-[#D9DEE8] px-4 text-sm font-bold text-[#0B1320]" href={`/briefcase/${item.id}/packet-information`}><LocalizedRuntimeText text={"Edit packet information"} /></Link>
          </div>

          <PacketVerificationAction
            key={`${item.paymentState}:${item.verificationStatus}:${item.commercialActions.fulfillmentAvailable}:${item.commercialActions.checkoutAllowed}:${item.commercialActions.generationAllowed}`}
            itemId={item.id}
            expectedRevision={model.revision}
            commercialActions={item.commercialActions}
            verificationAnswers={{}}
            initiallyVerified={initiallyVerified}
            canVerify={summary.complete && model.missingInputIds.length === 0 && model.pendingDerivations.length === 0 && reviewSafety.safe}
            packetReady={item.artifact.status === "ready"}
            mode={sponsored ? "sponsored" : item.paymentState === "paid" ? "paid" : "consumer"}
          />
        </section>
      ) : (
        <section
          className="rounded-[16px] border border-[#ECEFF4] bg-white p-6"
          role="status"
          aria-live="polite"
          data-review-branch="unavailable"
          data-authority-status={item ? item.authorityStatus : "no_item"}
          data-result-code={item?.resultCode ?? ""}
          data-packet-draft-status={item?.packetDraft.status ?? ""}
          data-verification-summary={model ? (summary ? "present" : "null") : "no_model"}
        >
          <h1 className="text-2xl font-extrabold text-[#0B1320]"><LocalizedRuntimeText text={"We can’t review this matter yet."} /></h1>
          <Link className="mt-5 inline-flex min-h-11 items-center rounded-[10px] bg-[#0B1320] px-5 text-sm font-bold text-white" href={item ? `/briefcase/${item.id}` : "/briefcase"}><LocalizedRuntimeText text={"Open matter"} /></Link>
        </section>
      )}
    </BriefcaseShell>
  );
}

function ReviewCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[16px] border border-[#ECEFF4] bg-white p-6">
      <h2 className="flex items-center gap-2 text-base font-bold text-[#0B1320]">{icon}<LocalizedRuntimeText text={title} /></h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function AnswerSection({ title, itemId, rows }: { title: string; itemId: string; rows: VerificationSummaryRow[] }) {
  return (
    <section className="rounded-[16px] border border-[#ECEFF4] bg-white p-6">
      <h2 className="text-lg font-extrabold text-[#0B1320]"><LocalizedRuntimeText text={title} /></h2>
      <dl className="mt-4 divide-y divide-[#ECEFF4]">
        {rows.map((entry) => (
          <div className="grid gap-2 py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center" key={entry.key}>
            <dt className="text-sm font-bold text-[#334155]"><LocalizedCopy en={entry.label} es={entry.labelEs} /></dt>
            <dd className={`whitespace-pre-wrap break-words ${entry.value === "Missing" ? "text-sm font-semibold text-[#B42318]" : "text-sm text-[#475A6E]"}`}><LocalizedCopy en={entry.value} es={entry.valueEs} /></dd>
            {entry.editId ? (
              <dd><Link className="inline-flex min-h-10 items-center rounded-[10px] border border-[#D9DEE8] px-4 text-sm font-bold text-[#0B1320]" href={`/briefcase/${itemId}/packet-information?edit=${encodeURIComponent(entry.editId)}`}><LocalizedRuntimeText text={"Edit"} /></Link></dd>
            ) : null}
          </div>
        ))}
      </dl>
    </section>
  );
}

function SummaryLine({ label, value, translateValue = true }: { label: string; value: ReactNode; translateValue?: boolean }) {
  return <div className="grid gap-1 sm:grid-cols-[12rem_1fr]"><dt className="font-bold text-[#334155]"><LocalizedRuntimeText text={label} /></dt><dd className="break-words text-[#475A6E]">{translateValue && typeof value === "string" ? <LocalizedRuntimeText text={value} /> : value}</dd></div>;
}

function QuestionPrompt({ question }: { question?: ProfileQuestion }) {
  return question ? <LocalizedCopy en={question.prompt} es={question.translations?.es?.prompt} /> : <LocalizedRuntimeText text="Source answer" />;
}
