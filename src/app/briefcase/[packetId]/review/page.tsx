import Link from "next/link";
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
import { decorateConsumerBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-consumer-presentation";

export const dynamic = "force-dynamic";

export default async function PacketAccuracyReviewPage({
  params
}: {
  params: Promise<{ packetId: string }>;
}) {
  const { packetId } = await params;
  const auth = await requireConsumerBriefcaseSession(`/briefcase/${packetId}/review`);
  const storedItem = await getBriefcaseItem(auth.userId, packetId);
  const item = storedItem ? await decorateConsumerBriefcaseItemForPresentation({
    consumerAuthUserId: auth.userId,
    item: storedItem
  }) : null;
  const authorityAvailable = item?.authorityStatus !== "unavailable";
  const sponsored = item?.paymentState === "sponsored";
  const packetMatter = authorityAvailable && (item?.resultCode === "packet_ready" || item?.resultCode === "packet_ready_with_caution");
  const model = packetMatter && item?.packetDraft.status === "available" ? item.packetDraft : null;
  const reviewSafety = model?.reviewSafety ?? { safe: false, reason: "matter_missing" };
  const initiallyVerified = item?.verificationStatus === "verified" && reviewSafety.safe;
  const summary = item && model ? verificationSummary({
    ...model,
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
      breadcrumb={item ? <><Link href="/briefcase/matters">My matters</Link> / <Link href={`/briefcase/${item.id}`}>{item.title}</Link> / <b>Final verification</b></> : <b>Final verification</b>}
    >
      {item && model && summary ? (
        <section data-accuracy-review="true">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#00A99D]">Packet facts</p>
              <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.02em] text-[#0B1320]">Review and verify your packet facts</h1>
              <p className="mt-2 text-sm leading-6 text-[#475A6E]">
                {sponsored
                  ? "Check each answer before covered generation. Editable packet facts are marked below."
                  : item.paymentState === "paid"
                    ? "Check each answer before preparing the packet. Editable packet facts are marked below."
                    : "Check each answer before final verification. Editable packet facts are marked below."}
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
              <h2 className="text-base font-bold text-[#0B1320]">Who completes each part</h2>
              <ul className="mt-4 grid gap-2 text-sm leading-6 text-[#475A6E] sm:grid-cols-2">
                <li><strong>Prefilled by LegalEase</strong> - facts already collected during screening.</li>
                <li><strong>Confirmed from the participant’s records</strong> - court, case, charge, date, agency, and service facts.</li>
                <li><strong>Completed by the participant when signing or serving</strong> - signatures, service method, and service dates.</li>
                <li><strong>Reserved for the prosecutor or court</strong> - approval, findings, entry date, and judicial signature.</li>
              </ul>
            </div>
          ) : null}

          <div className="mt-6">
            <ReviewCard title="Read-only matter and system details" icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}>
              <p className="text-sm leading-6 text-[#475A6E]" id="verification-context-description">
                These saved details determine the packet route and verification record. They cannot be edited on this page.
              </p>
              <dl aria-describedby="verification-context-description" className="mt-4 grid gap-3 text-sm">
                {summary.context.map((entry) => <SummaryLine key={entry.key} label={entry.label} value={entry.value} />)}
              </dl>
            </ReviewCard>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <ReviewCard title="Expected packet components" icon={<FileText className="h-5 w-5" aria-hidden="true" />}>
              <ul className="space-y-2">
                {model.expectedComponents.map((component) => (
                  <li className="flex gap-2 text-sm leading-6 text-[#475A6E]" key={component}>
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#00A99D]" aria-hidden="true" /> {component}
                  </li>
                ))}
              </ul>
            </ReviewCard>

            <ReviewCard title="Filing limitations" icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-[#475A6E]">
                <li>Expungement.ai prepares self-help documents. It does not file them for you.</li>
                <li>Court, agency, service, record, and filing fees are separate.</li>
                <li>The court or agency makes the final decision. Approval is not guaranteed.</li>
                <li>Review names, dates, court information, and charges against your records before filing.</li>
                {mississippiClinicPacket ? <li>Stop and get legal help for an ambiguous docket entry, unclear venue, diversion or nonadjudication, a related pending matter, prosecutor refusal, or an immigration concern.</li> : null}
              </ul>
            </ReviewCard>
          </div>

          <ReviewCard title="Your packet" icon={<FileText className="h-5 w-5" aria-hidden="true" />}>
            <dl className="grid gap-3 text-sm">
              <SummaryLine label="Result" value={reviewSafety.safe ? "A packet path remains available based on these answers." : "These answers need review before final verification."} />
              <SummaryLine label="Coverage" value={sponsored ? "Covered by your partner program" : "This packet belongs to your private Briefcase matter."} />
              {!sponsored ? <SummaryLine label="Cost" value={item.paymentState === "paid" ? "Already paid for this matter" : "$50 one time after final verification"} /> : null}
            </dl>
          </ReviewCard>

          <div className="mt-5 rounded-[16px] border border-[#ECEFF4] bg-white p-6">
            <h2 className="text-base font-bold text-[#0B1320]">Details to check</h2>
            {model.missingInputIds.length > 0 ? (
              <ul className="mt-3 grid gap-2 text-sm text-[#B42318]">
                {model.missingInputIds.map((id) => <li key={id}>{model.questions.find((question) => question.id === id)?.prompt ?? id}</li>)}
              </ul>
            ) : (
              <p className="mt-2 text-sm leading-6 text-[#475A6E]">All required information is here. Review the saved answers one more time before continuing.</p>
            )}
            <Link className="mt-4 inline-flex min-h-10 items-center rounded-[10px] border border-[#D9DEE8] px-4 text-sm font-bold text-[#0B1320]" href={`/briefcase/${item.id}/packet-information`}>
              Edit packet information
            </Link>
          </div>

          <PacketVerificationAction
            itemId={item.id}
            verificationAnswers={model.initialAnswers}
            initiallyVerified={initiallyVerified}
            canVerify={summary.complete && model.missingInputIds.length === 0 && reviewSafety.safe}
            packetReady={item.artifact.status === "ready"}
            mode={sponsored ? "sponsored" : item.paymentState === "paid" ? "paid" : "consumer"}
          />
        </section>
      ) : (
        <section className="rounded-[16px] border border-[#ECEFF4] bg-white p-6" role="status" aria-live="polite">
          <h1 className="text-2xl font-extrabold text-[#0B1320]">Final verification is not available for this matter.</h1>
          <Link className="mt-5 inline-flex min-h-11 items-center rounded-[10px] bg-[#0B1320] px-5 text-sm font-bold text-white" href={item ? `/briefcase/${item.id}` : "/briefcase"}>Open matter</Link>
        </section>
      )}
    </BriefcaseShell>
  );
}

function ReviewCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[16px] border border-[#ECEFF4] bg-white p-6">
      <h2 className="flex items-center gap-2 text-base font-bold text-[#0B1320]">{icon}{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function AnswerSection({ title, itemId, rows }: { title: string; itemId: string; rows: VerificationSummaryRow[] }) {
  return (
    <section className="rounded-[16px] border border-[#ECEFF4] bg-white p-6">
      <h2 className="text-lg font-extrabold text-[#0B1320]">{title}</h2>
      <dl className="mt-4 divide-y divide-[#ECEFF4]">
        {rows.map((entry) => (
          <div className="grid gap-2 py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center" key={entry.key}>
            <dt className="text-sm font-bold text-[#334155]">{entry.label}</dt>
            <dd className={entry.value === "Missing" ? "text-sm font-semibold text-[#B42318]" : "text-sm text-[#475A6E]"}>{entry.value}</dd>
            {entry.editId ? (
              <dd><Link className="inline-flex min-h-10 items-center rounded-[10px] border border-[#D9DEE8] px-4 text-sm font-bold text-[#0B1320]" href={`/briefcase/${itemId}/packet-information?edit=${encodeURIComponent(entry.editId)}`}>Edit</Link></dd>
            ) : null}
          </div>
        ))}
      </dl>
    </section>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 sm:grid-cols-[12rem_1fr]"><dt className="font-bold text-[#334155]">{label}</dt><dd className="break-words text-[#475A6E]">{value}</dd></div>;
}
